"""Execute the real pre-entry pivot lookup against deterministic OHLC history."""
import pathlib
import shutil
import subprocess
import tempfile
import unittest

SOURCE = pathlib.Path(__file__).resolve().parents[1] / 'resources/mt5/Jenvu EA.mq5'


def extract(source, signature):
    start = source.index(signature)
    body = source.index('{', start)
    depth, end = 1, body + 1
    while depth:
        depth += (source[end] == '{') - (source[end] == '}')
        end += 1
    return source[start:end]


class PreEntryPivots(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        source = SOURCE.read_text()
        compiler = shutil.which('g++') or shutil.which('clang++')
        if compiler is None:
            raise RuntimeError('Native compiler required')
        cls.temp = tempfile.TemporaryDirectory()
        cpp = pathlib.Path(cls.temp.name) / 'pivots.cpp'
        cls.binary = pathlib.Path(cls.temp.name) / 'pivots'
        cpp.write_text('''
#include <vector>
#include <algorithm>
#include <cstdlib>
using datetime = long;
const int _Symbol = 0, PERIOD_M15 = 15;
int StructLookback = 50, entryShift = 1;
std::vector<double> lows(65, 1.10), highs(65, 1.20);
int iBarShift(int, int, datetime, bool) { return entryShift; }
int Bars(int, int) { return static_cast<int>(lows.size()); }
int MathMin(int a, int b) { return std::min(a, b); }
int MathMax(int a, int b) { return std::max(a, b); }
double iLow(int, int, int p) { return lows.at(p); }
double iHigh(int, int, int p) { return highs.at(p); }
''' + extract(source, 'bool ConfirmedSwingPivot(') + '\n'
            + extract(source, 'double PreEntrySwing(') + '''
int main(int argc, char** argv) {
  if(argc != 2) return 2;
  bool ok = false;
  switch(std::atoi(argv[1])) {
    case 1: // True confirmed pre-entry low and high.
      lows[5] = 1.09; highs[5] = 1.21;
      ok = PreEntrySwing(true, 900) == 1.09 && PreEntrySwing(false, 900) == 1.21;
      break;
    case 2: // A pivot needing the entry candle for confirmation is excluded.
      lows[3] = 1.08; highs[3] = 1.22;
      ok = PreEntrySwing(true, 900) == 0 && PreEntrySwing(false, 900) == 0;
      break;
    case 3: // Entry and post-entry lows do not replace the anchor.
      lows[5] = 1.09; highs[5] = 1.21;
      lows[0] = 1.01; lows[1] = 1.02; highs[0] = 1.30; highs[1] = 1.29;
      ok = PreEntrySwing(true, 900) == 1.09 && PreEntrySwing(false, 900) == 1.21;
      break;
    case 4: // Anchor stays fixed when two subsequent bars are inserted.
      lows[5] = 1.09; highs[5] = 1.21;
      lows.insert(lows.begin(), 2, 1.01); highs.insert(highs.begin(), 2, 1.30);
      entryShift += 2;
      ok = PreEntrySwing(true, 900) == 1.09 && PreEntrySwing(false, 900) == 1.21;
      break;
    case 5: // Missing history is safe, not an invented structure level.
      lows.resize(4); highs.resize(4);
      ok = PreEntrySwing(true, 900) == 0 && PreEntrySwing(false, 900) == 0;
      break;
    case 6: // Newest confirmed pivot wins, not the most extreme older low.
      lows[5] = 1.09; lows[10] = 1.05;
      ok = PreEntrySwing(true, 900) == 1.09;
      break;
    case 7: // Tied lows / highs do not qualify as strict pivots.
      lows[5] = 1.09; lows[6] = 1.09;
      highs[5] = 1.21; highs[6] = 1.21;
      ok = PreEntrySwing(true, 900) == 0 && PreEntrySwing(false, 900) == 0;
      break;
    case 8: // An unavailable entry bar cannot produce an anchor.
      entryShift = -1;
      ok = PreEntrySwing(true, 900) == 0 && PreEntrySwing(false, 900) == 0;
      break;
  }
  return ok ? 0 : 1;
}
''')
        subprocess.run([compiler, '-std=c++17', '-Wall', '-Wextra', '-Werror',
                        str(cpp), '-o', str(cls.binary)], check=True)

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def run_case(self, case):
        subprocess.run([str(self.binary), str(case)], check=True)

    def test_buy_and_sell_confirmed_pivots(self): self.run_case(1)
    def test_two_confirmation_candles_must_precede_entry(self): self.run_case(2)
    def test_post_entry_extremes_do_not_move_anchor(self): self.run_case(3)
    def test_anchor_stays_fixed_as_time_advances(self): self.run_case(4)
    def test_missing_history_does_not_invent_a_level(self): self.run_case(5)
    def test_newest_pivot_not_oldest_extreme(self): self.run_case(6)
    def test_tied_extremes_are_not_confirmed(self): self.run_case(7)
    def test_missing_entry_bar_is_safe(self): self.run_case(8)


if __name__ == '__main__':
    unittest.main()