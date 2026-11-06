#!/usr/bin/env python3
"""Convert the season sheet of the community xlsx into src/data/weapons.json.

Usage: python3 scripts/xlsx_to_weapons.py [path/to/data.xlsx] [out.json]

English names come from scripts/names_en.json; untranslated names are reported.

Stdlib only (the sheet's styles break openpyxl). The workbook is saved without
cached formula results, so the formulas used by the sheet (TTK, DPS, magazine
damage, tolerance, TTM, rank) are evaluated here. Numeric cells keep their value;
text cells such as ranges ("0.62~0.72"), "/" or "待测" are reduced to a
representative number (or null) and the original text is kept in `raw`.

Season changes come from the sheet itself: the name cell's fill gives the overall
verdict (red = buff, green = nerf, blue = new) and coloured value cells mark the
fields that changed; their previous values are read from the previous-season sheet.
Verified source corrections live in data_corrections.json and require matching inputs.
"""
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

SHEET = '31赛季初'
PREV_SHEET = '30赛季末'
NS = {
    'm': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
}

# column index (1-based) -> (group, key)
COLUMNS = {
    5: ('dmg', 'chest'), 6: ('dmg', 'legMul'), 7: ('dmg', 'leg'), 8: ('dmg', 'headMul'), 9: ('dmg', 'head'),
    10: ('bullets', 'white'), 11: ('bullets', 'blue'), 12: ('bullets', 'purple'), 13: ('bullets', 'red'),
    14: (None, 'rpm'),
    15: ('ttk', 'white'), 16: ('ttk', 'blue'), 17: ('ttk', 'purple'), 18: ('ttk', 'red'),
    19: (None, 'dps'),
    20: ('mag', 'none'), 21: ('mag', 'white'), 22: ('mag', 'blue'), 23: ('mag', 'purple'),
    24: (None, 'magDmg'), 25: (None, 'tolerance'), 26: (None, 'ttm'),
    27: (None, 'reloadEmpty'), 28: (None, 'reloadTac'),
    29: ('speed', 'run'), 30: ('speed', 'hip'), 31: ('speed', 'ads'),
    32: (None, 'recoil'), 33: (None, 'hipAcc'), 34: (None, 'handling'),
    35: ('time', 'draw'), 36: ('time', 'holster'), 37: ('time', 'sprint'), 38: ('time', 'ads'),
}
NOTE_COL = 39

# Cell fills used by the sheet author
FILL_BUFF = 'FFFFC9C7'
FILL_NERF = 'FFC3EAD5'
FILL_NEW = 'FFDDEBF7'
FILL_FIX = 'FFFFFF00'  # value re-measured / recalculated this season
VERDICT = {FILL_BUFF: 'buff', FILL_NERF: 'nerf', FILL_NEW: 'new'}

# Current-sheet name -> previous-sheet name, for entries renamed between seasons
RENAMED = {
    '双持莫桑比克[进空投]': '双持莫桑比克[紫枪栓]',
    'EVA-8[干扰器][紫枪栓]': 'EVA-8[双发][紫枪栓]',
    'C.A.R冲锋枪': 'C.A.R冲锋枪[出空投]',
    'L-STAR[出空投]': 'L-star[空投]',
    '小帮手[单持]': '小帮手',
    '赫姆洛克[三连发]': '赫姆洛克',
    'G7侦查枪[单发]': 'G7侦查枪[出空投][单发]',
    '3030连发枪[空投]': '3030连发枪[进空投]',
    '3030连发枪[空投][首发满蓄力]': '3030连发枪[进空投][首发满蓄力]',
    '3030连发枪[空投][腰射粉碎帽]': '3030连发枪[进空投][腰射粉碎帽]',
}

# Blank cells in the current sheet that keep the previous season's value: (name, column)
CARRY_OVER = [
    ('G7侦查枪[单发][受损快速枪托]', 21),  # white magazine
]

# Note segments that only document earlier values or sheet corrections (dropped from auto summaries)
HISTORY = re.compile(r'S30|原表|原值|数据修正|不是 ?S31|对比普通')


def col_to_n(letters):
    n = 0
    for ch in letters:
        n = n * 26 + ord(ch) - 64
    return n


class Sheet:
    """Cells of one worksheet with formulas evaluated and fill colours resolved."""

    def __init__(self, z, target, shared, fill_of_style):
        self.cells = {}
        self.fills = {}
        for c in ET.fromstring(z.read(target)).iter('{%s}c' % NS['m']):
            ref = c.get('r')
            self.fills[ref] = fill_of_style(c.get('s'))
            f, v, t = c.find('m:f', NS), c.find('m:v', NS), c.get('t')
            if f is not None and f.text:
                self.cells[ref] = ('f', f.text)
            elif t == 'inlineStr':
                self.cells[ref] = ('v', ''.join(x.text or '' for x in c.iter('{%s}t' % NS['m'])))
            elif v is None:
                continue
            elif t == 's':
                self.cells[ref] = ('v', shared[int(v.text)])
            elif t in ('str', 'e', 'b'):
                self.cells[ref] = ('v', v.text)
            else:
                self.cells[ref] = ('v', float(v.text))
        self.cache = {}

    def value(self, ref):
        if ref not in self.cache:
            self.cache[ref] = None  # guards against cycles
            self.cache[ref] = self._eval(ref)
        return self.cache[ref]

    def _eval(self, ref):
        kind, body = self.cells.get(ref, (None, None))
        if kind != 'f':
            return body
        expr = body.replace('$', '')
        m = re.fullmatch(r'ROW\(([A-Z]+)(\d+)\)-(\d+)', expr)
        if m:
            return float(int(m.group(2)) - int(m.group(3)))

        def sub(mm):
            x = self.value(mm.group(0))
            if not isinstance(x, (int, float)):
                raise ValueError(f'{ref}: {mm.group(0)} is not numeric')
            return repr(float(x))

        try:
            py = re.sub(r'\b[A-Z]{1,2}\d+\b', sub, expr).replace('100%', '1').replace('ROUND', 'round')
            if not re.fullmatch(r'[\d.+\-*/() ,round]+', py):
                raise ValueError(f'{ref}: unsupported formula {body!r}')
            return float(eval(py, {'__builtins__': {}, 'round': round}))
        except (ValueError, ZeroDivisionError):
            return None

    def rows(self):
        out = {}
        for ref in self.cells:
            m = re.match(r'([A-Z]+)(\d+)', ref)
            out.setdefault(int(m.group(2)), {})[col_to_n(m.group(1))] = self.value(ref)
        return out

    def fill(self, col, row):
        letters = ''
        while col:
            col, r = divmod(col - 1, 26)
            letters = chr(65 + r) + letters
        return self.fills.get(f'{letters}{row}')


def open_book(path):
    z = zipfile.ZipFile(path)
    shared = []
    if 'xl/sharedStrings.xml' in z.namelist():
        for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', NS):
            shared.append(''.join(t.text or '' for t in si.iter('{%s}t' % NS['m'])))
    styles = ET.fromstring(z.read('xl/styles.xml'))
    fills = []
    for f in styles.find('m:fills', NS):
        p = f.find('m:patternFill', NS)
        c = p.find('m:fgColor', NS) if p is not None else None
        fills.append(c.get('rgb') if c is not None else None)
    xf_fill = [int(x.get('fillId', 0)) for x in styles.find('m:cellXfs', NS)]

    def fill_of_style(s):
        return fills[xf_fill[int(s)]] if s is not None else None

    rels = {r.get('Id'): r.get('Target') for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
    targets = {}
    for s in ET.fromstring(z.read('xl/workbook.xml')).find('m:sheets', NS):
        t = rels[s.get('{%s}id' % NS['r'])].lstrip('/')
        targets[s.get('name')] = t if t.startswith('xl/') else 'xl/' + t

    def sheet(name):
        if name not in targets:
            sys.exit(f'sheet {name!r} not found')
        return Sheet(z, targets[name], shared, fill_of_style)

    return sheet


NUM = re.compile(r'-?\d+(?:\.\d+)?')


def parse(v):
    """Return (number | None, raw text | None)."""
    if v is None:
        return None, None
    if isinstance(v, float):
        return (int(v) if v == int(v) else round(v, 4)), None
    s = str(v).strip()
    if s in ('', '/'):
        return None, None
    if s == '待测':
        return None, s
    first = s.split('\n')[0]
    nums = [float(x) for x in NUM.findall(first)]
    if not nums or 's/发' in s:
        return None, s
    pct = '%' in first
    if '~' in first and len(nums) >= 2:
        n = (nums[0] + nums[1]) / 2
    else:
        n = nums[0]
    if pct:
        n /= 100
    n = round(n, 4)
    if re.fullmatch(r'[\d.]+x', s):  # plain multiplier, no need to keep the text
        return (int(n) if n == int(n) else n), None
    return (int(n) if n == int(n) else n), s.replace('\n', ' ')


def split_name(name):
    """'专注轻机枪[有涡轮][冷启动]' -> ('专注轻机枪', '有涡轮；冷启动')."""
    m = re.fullmatch(r'([^\[]+)((?:\[[^\]]*\])*)', name.strip())
    if not m:
        return name.strip(), ''
    return m.group(1).strip(), '；'.join(re.findall(r'\[([^\]]*)\]', m.group(2)))


def slug(*parts):
    """Stable, readable id from the English name (sheet row numbers change between updates)."""
    text = ' '.join(p for p in parts if p).lower()
    return re.sub(r'[^a-z0-9]+', '-', text).strip('-')


def translate(table, text, missing):
    """Translate a name; compound states ("A；B") are translated part by part."""
    if not text:
        return ''
    if text in table:
        return table[text]
    parts = text.split('；')
    if len(parts) > 1 and all(p in table for p in parts):
        return '; '.join(table[p] for p in parts)
    missing.add(text)
    return text


def segments(text):
    """Split a note on '；' / newlines, but not inside （…） or (…)."""
    out, buf, depth = [], '', 0
    for ch in text:
        depth += ch in '（(' and 1 or 0
        depth -= ch in '）)' and 1 or 0
        if depth <= 0 and ch in '；\n':
            out.append(buf.strip())
            buf, depth = '', 0
        else:
            buf += ch
    out.append(buf.strip())
    return [s for s in out if s]


def split_note(note):
    """Separate the season summary from segments that only record old values (deduplicated)."""
    main, history = [], []
    for seg in segments(note):
        bucket = history if HISTORY.search(seg) else main
        if seg not in bucket:
            bucket.append(seg)
    return main, history


def translate_note(table, parts, missing):
    out = []
    for p in parts:
        if p in table:
            out.append(table[p])
        else:
            missing.add(p)
            out.append(p)
    return '; '.join(x for x in out if x)


def apply_corrections(weapons, corrections):
    """Apply reviewed source corrections; stop if a later sheet changes their inputs."""
    by_key = {w['key']: w for w in weapons}
    for correction in corrections:
        key = correction['key']
        if key not in by_key:
            raise ValueError(f'data correction target missing: {key}')
        w = by_key[key]
        for path, expected in correction['expected'].items():
            actual = w
            for part in path.split('.'):
                actual = actual.get(part) if isinstance(actual, dict) else None
            if path in w.get('raw', {}) or actual != expected:
                raise ValueError(f'data correction conflict: {key}.{path}: expected {expected!r}, got {actual!r}')
        w[correction['field']] = correction['value']


def season_meta(banner, prev_banner):
    season = re.search(r'APEX ?(\d+)', banner)
    date = re.search(r'(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日', banner)
    year = date.group(1) if date and date.group(1) else None
    if date and not year:  # "11月4日": take the year from the previous sheet's banner
        prev = re.search(r'(\d{4})年(\d{1,2})月', prev_banner)
        year = int(prev.group(1)) + (int(date.group(2)) < int(prev.group(2))) if prev else None
    split = 2 if re.search(r'下半|赛季末', banner) else 1
    return {
        'season': int(season.group(1)) if season else None,
        'split': split,
        'updated': '%s-%02d-%02d' % (year, int(date.group(2)), int(date.group(3))) if date and year else '',
    }


def path_of(col):
    group, key = COLUMNS[col]
    return f'{group}.{key}' if group else key


def main():
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('老葛你又在打电动-APEX枪械数据.xlsx')
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else Path('src/data/weapons.json')
    names_en = json.loads((Path(__file__).parent / 'names_en.json').read_text(encoding='utf-8'))
    notes = json.loads((Path(__file__).parent / 'notes.json').read_text(encoding='utf-8'))
    missing = set()
    book = open_book(src)
    cur = book(SHEET)
    prev = book(PREV_SHEET)
    rows, prev_rows = cur.rows(), prev.rows()
    prev_by_name = {str(r[4]).strip(): r for n, r in prev_rows.items() if n > 5 and r.get(4)}

    meta = season_meta(str(rows.get(2, {}).get(1, '')) + str(rows.get(1, {}).get(1, '')),
                       str(prev_rows.get(2, {}).get(1, '')))

    weapons = []
    for r in sorted(rows):
        row = rows[r]
        if r < 6 or not isinstance(row.get(1), float) or not row.get(4):
            continue
        sheet_name = str(row[4]).strip()
        old = prev_by_name.get(RENAMED.get(sheet_name, sheet_name))
        for name, col in CARRY_OVER:
            if name == sheet_name and row.get(col) in (None, '') and old:
                row[col] = old.get(col)
        base, state = split_name(sheet_name)
        w = {
            'id': int(row[1]),
            'ammo': row.get(2, ''),
            'cls': row.get(3, ''),
            'name': {
                'zh': [base, state],
                'en': [translate(names_en['base'], base, missing), translate(names_en['state'], state, missing)],
            },
        }
        raw = {}
        for col, (group, key) in COLUMNS.items():
            n, text = parse(row.get(col))
            target = w.setdefault(group, {}) if group else w
            target[key] = n
            if text is not None and not isinstance(row.get(col), float):
                raw[path_of(col)] = text

        # season change: verdict from the name cell, changed fields from coloured value cells
        verdict = VERDICT.get(cur.fill(4, r))
        changed = any(cur.fill(c, r) in (FILL_BUFF, FILL_NERF, FILL_NEW, FILL_FIX) for c in COLUMNS)
        if verdict or changed:
            change = {'type': verdict or 'fix'}
            if verdict != 'new' and old:
                # every field that differs from the previous sheet (derived columns such as
                # purple TTK are not always coloured, and the rest of the row is unchanged)
                prev_vals = {}
                for c in COLUMNS:
                    pv, cv = parse(old.get(c)), parse(row.get(c))
                    if pv != cv and pv != (None, None):  # newly filled cells are not changes
                        prev_vals[path_of(c)] = pv[1] if pv[1] is not None else pv[0]
                if prev_vals:
                    change['prev'] = prev_vals
            w['change'] = change

        note = row.get(NOTE_COL)
        if note:
            note = str(note).strip()
            if sheet_name in notes:  # curated summary (null = no summary)
                if notes[sheet_name]:
                    w['note'] = notes[sheet_name]
            else:
                main_text, _ = split_note(note)
                if main_text:
                    w['note'] = {'zh': '；'.join(main_text), 'en': translate_note(names_en['note'], main_text, missing)}
            w['history'] = note.replace('\n', '；')  # the sheet's full note (Chinese)
        if raw:
            w['raw'] = raw
        en_base, en_state = w['name']['en']
        key = slug(en_base, en_state)
        while any(x['key'] == key for x in weapons):
            key += '-2'
        weapons.append({'key': key, **w})

    corrections = json.loads((Path(__file__).parent / 'data_corrections.json').read_text(encoding='utf-8'))
    apply_corrections(weapons, corrections)

    # One weapon per line keeps diffs readable when the sheet changes
    body = ',\n'.join('    ' + json.dumps(w, ensure_ascii=False, separators=(',', ':')) for w in weapons)
    out.write_text('{\n  "meta": %s,\n  "weapons": [\n%s\n  ]\n}\n' % (json.dumps(meta, ensure_ascii=False), body), encoding='utf-8')
    print(f'{len(weapons)} weapons -> {out}  meta={meta}')
    if missing:
        print('untranslated (add to scripts/names_en.json):\n  ' + '\n  '.join(sorted(missing)), file=sys.stderr)


if __name__ == '__main__':
    main()
