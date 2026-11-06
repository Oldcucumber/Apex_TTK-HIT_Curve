import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('xlsx_to_weapons', ROOT / 'scripts/xlsx_to_weapons.py')
converter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(converter)
CORRECTIONS = json.loads((ROOT / 'scripts/data_corrections.json').read_text(encoding='utf-8'))
WEAPONS = json.loads((ROOT / 'src/data/weapons.json').read_text(encoding='utf-8'))['weapons']
BY_KEY = {w['key']: w for w in WEAPONS}


class DataTests(unittest.TestCase):
    def source_weapon(self, correction):
        return {'key': correction['key'], 'dps': 178.5, 'dmg': {'chest': 20}, 'rpm': 600}

    def test_reviewed_corrections(self):
        weapons = [self.source_weapon(c) for c in CORRECTIONS]
        converter.apply_corrections(weapons, CORRECTIONS)
        for w in weapons:
            self.assertEqual(w['dps'], 200)
            self.assertEqual(w['dps'], w['dmg']['chest'] * w['rpm'] / 60)

    def test_changed_source_rejects_stale_correction(self):
        c = CORRECTIONS[0]
        for path, value in [('dps', 200), ('rpm', 620), ('dmg.chest', 21)]:
            with self.subTest(path=path):
                w = self.source_weapon(c)
                target = w['dmg'] if path.startswith('dmg.') else w
                target[path.split('.')[-1]] = value
                with self.assertRaisesRegex(ValueError, 'correction conflict'):
                    converter.apply_corrections([w], [c])

    def test_missing_or_annotated_source_rejects_correction(self):
        c = CORRECTIONS[0]
        with self.assertRaisesRegex(ValueError, 'target missing'):
            converter.apply_corrections([], [c])
        for path in c['expected']:
            w = self.source_weapon(c)
            w['raw'] = {path: 'uncertain source value'}
            with self.assertRaisesRegex(ValueError, 'correction conflict'):
                converter.apply_corrections([w], [c])

    def test_ranges_and_conditional_values_keep_existing_policy(self):
        self.assertEqual(converter.parse('9~10'), (9.5, '9~10'))
        self.assertEqual(converter.parse('408~900'), (654, '408~900'))
        self.assertEqual(converter.parse('打甲23\n打肉26'), (23, '打甲23 打肉26'))

    def test_workbook_export_is_reproducible(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'weapons.json'
            subprocess.run([sys.executable, '-B', '-X', 'utf8', str(ROOT / 'scripts/xlsx_to_weapons.py'),
                            str(ROOT / '老葛你又在打电动-APEX枪械数据.xlsx'), str(output)],
                           check=True, capture_output=True, text=True, encoding='utf-8')
            self.assertEqual(output.read_bytes(), (ROOT / 'src/data/weapons.json').read_bytes())


class SeasonSheetTests(unittest.TestCase):
    def test_bracket_names(self):
        self.assertEqual(converter.split_name('专注轻机枪[有涡轮][冷启动]'), ('专注轻机枪', '有涡轮；冷启动'))
        self.assertEqual(converter.split_name('R-99'), ('R-99', ''))

    def test_formulas_are_evaluated(self):
        flatline = BY_KEY['vk-47-flatline']
        self.assertEqual(flatline['dps'], 200)  # data_corrections.json
        self.assertEqual(flatline['ttk']['purple'], 0.9)  # (L-1)*60/N
        self.assertEqual(flatline['magDmg'], flatline['dmg']['chest'] * flatline['mag']['purple'])
        self.assertEqual([w['id'] for w in WEAPONS], list(range(1, len(WEAPONS) + 1)))  # ROW()-5

    def test_season_changes(self):
        self.assertEqual(BY_KEY['wingman-single']['change']['type'], 'nerf')
        self.assertEqual(BY_KEY['wingman-single']['change']['prev']['dmg.chest'], 50)
        self.assertEqual(BY_KEY['peacekeeper-purple-bolt']['change']['type'], 'buff')
        self.assertEqual(BY_KEY['dual-wingman-2-round-burst']['change'], {'type': 'new'})
        self.assertNotIn('change', BY_KEY['r-99-smg'])

    def test_sheet_values_kept_as_published(self):
        self.assertEqual(BY_KEY['re-45-auto']['ttk']['purple'], 0.96)  # 3-round burst, measured
        g7 = BY_KEY['g7-scout-single-fire-damaged-sniper-stock']
        self.assertEqual(g7['mag']['white'], 12)  # blank in S31, carried over from S30

    def test_every_name_translated(self):
        for w in WEAPONS:
            self.assertNotRegex(''.join(w['name']['en']), r'[\u4e00-\u9fff]', w['key'])
            if 'note' in w:
                self.assertNotRegex(w['note']['en'], r'[\u4e00-\u9fff]', w['key'])


if __name__ == '__main__':
    unittest.main()
