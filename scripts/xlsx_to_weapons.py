#!/usr/bin/env python3
"""Convert the "数据表2.0" sheet of the community xlsx into src/data/weapons.json.

Usage: python3 scripts/xlsx_to_weapons.py [path/to/data.xlsx] [out.json]

English names come from scripts/names_en.json; untranslated names are reported.

Stdlib only (the sheet's styles break openpyxl). Numeric cells keep their value;
text cells such as ranges ("0.62~0.72"), "/" or "待测" are reduced to a
representative number (or null) and the original text is kept in `raw`.
Verified source corrections live in data_corrections.json and require matching inputs.
"""
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

SHEET = '数据表2.0'
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
}


def col_to_n(letters):
    n = 0
    for ch in letters:
        n = n * 26 + ord(ch) - 64
    return n


def read_sheet(path, sheet):
    z = zipfile.ZipFile(path)
    shared = []
    if 'xl/sharedStrings.xml' in z.namelist():
        for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', NS):
            shared.append(''.join(t.text or '' for t in si.iter('{%s}t' % NS['m'])))
    rels = {r.get('Id'): r.get('Target') for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
    wb = ET.fromstring(z.read('xl/workbook.xml'))
    target = None
    for s in wb.find('m:sheets', NS):
        if s.get('name') == sheet:
            target = rels[s.get('{%s}id' % NS['r'])].lstrip('/')
    if target is None:
        sys.exit(f'sheet {sheet!r} not found')
    target = target if target.startswith('xl/') else 'xl/' + target
    rows = {}
    for c in ET.fromstring(z.read(target)).iter('{%s}c' % NS['m']):
        m = re.match(r'([A-Z]+)(\d+)', c.get('r'))
        v = c.find('m:v', NS)
        t = c.get('t')
        if t == 'inlineStr':
            val = ''.join(x.text or '' for x in c.iter('{%s}t' % NS['m']))
        elif v is None:
            continue
        elif t == 's':
            val = shared[int(v.text)]
        elif t in ('str', 'e', 'b'):
            val = v.text
        else:
            val = float(v.text)
        rows.setdefault(int(m.group(2)), {})[col_to_n(m.group(1))] = val
    return rows


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
    i = name.find('（')
    if i > 0 and name.endswith('）'):
        return name[:i], name[i + 1:-1]
    return name, ''


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


def main():
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('老葛你又在打电动-APEX枪械数据.xlsx')
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else Path('src/data/weapons.json')
    names_en = json.loads((Path(__file__).parent / 'names_en.json').read_text(encoding='utf-8'))
    missing = set()
    rows = read_sheet(src, SHEET)

    banner = rows.get(2, {}).get(1, '')
    season = re.search(r'APEX(\d+)([上下])半赛季', banner)
    date = re.search(r'(\d{4})年(\d{1,2})月(\d{1,2})日', banner)
    meta = {
        'season': int(season.group(1)) if season else None,
        'split': (1 if season.group(2) == '上' else 2) if season else None,
        'updated': '%s-%02d-%02d' % (date.group(1), int(date.group(2)), int(date.group(3))) if date else '',
    }

    weapons = []
    for r in sorted(rows):
        if r < 6:
            continue
        row = rows[r]
        if not isinstance(row.get(1), float) or not row.get(4):
            continue
        base, state = split_name(str(row[4]).strip())
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
            if text is not None and not (isinstance(row.get(col), float)):
                raw[f'{group}.{key}' if group else key] = text
        note = row.get(35)
        if note:
            note = str(note).replace('\n', ' ')
            w['note'] = {'zh': note, 'en': translate(names_en['note'], note, missing)}
        if raw:
            w['raw'] = raw
        en_base, en_state = w['name']['en']
        key = slug(en_base, en_state)
        while any(x['key'] == key for x in weapons):
            key += '-2'
        w = {'key': key, **w}
        weapons.append(w)

    corrections = json.loads((Path(__file__).parent / 'data_corrections.json').read_text(encoding='utf-8'))
    apply_corrections(weapons, corrections)

    # One weapon per line keeps diffs readable when the sheet changes
    body = ',\n'.join('    ' + json.dumps(w, ensure_ascii=False, separators=(',', ':')) for w in weapons)
    out.write_text('{\n  "meta": %s,\n  "weapons": [\n%s\n  ]\n}\n' % (json.dumps(meta, ensure_ascii=False), body), encoding='utf-8')
    print(f'{len(weapons)} weapons -> {out}  meta={meta}')
    if missing:
        print('untranslated (add to scripts/names_en.json):', ', '.join(sorted(missing)), file=sys.stderr)


if __name__ == '__main__':
    main()
