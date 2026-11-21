"""Execute the EA's pure MQL/C++ predicates; this is not an MT5 backtest."""
import pathlib
import shutil
import subprocess
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / "resources/mt5/Jenvu EA.mq5"


def function(source, name):
    start = source.index("bool " + name + "(")
    body = source.index("{", start)
    depth = 1
    end = body + 1
    while depth:
        if source[end] == "{":
            depth += 1
        elif source[end] == "}":
            depth -= 1
        end += 1
    return source[start:end]


class BotRules(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = SOURCE.read_text()
        cls.temp = tempfile.TemporaryDirectory()
        compiler = shutil.which("g++") or shutil.which("clang++")
        if compiler is None:
            raise RuntimeError("A native compiler is required for the EA predicate tests")
        cpp = pathlib.Path(cls.temp.name) / "rules.cpp"
        cls.binary = pathlib.Path(cls.temp.name) / "rules"
        cpp.write_text(
            "#include <cstdlib>\n"
            + function(cls.source, "CanStartBasket") + "\n"
            + function(cls.source, "ConfirmedStructureBreak") + "\n"
            + function(cls.source, "ConfirmedSwingPivot") + "\n"
            + """
int main(int argc, char** argv) {
  if(argc != 2) return 2;
  int test = std::atoi(argv[1]);
  bool ok = false;
  switch(test) {
    case 1: // Only the initial cluster; even one remaining position blocks adds.
      ok = CanStartBasket(0, false, false)
        && !CanStartBasket(1, false, false)
        && !CanStartBasket(3, false, false)
        && !CanStartBasket(6, false, false); break;
    case 2: // Never reopen during a pending close or on the invalidation bar.
      ok = !CanStartBasket(0, true, false)
        && !CanStartBasket(0, false, true); break;
    case 3: // Confirmed bearish break exits buys.
      ok = ConfirmedStructureBreak(true, 1.102, 1.099, 1.102, 1.098,
                                    1.100, 0.002, 50, 0.2); break;
    case 4: // Confirmed bullish break exits sells.
      ok = ConfirmedStructureBreak(false, 1.098, 1.101, 1.102, 1.098,
                                    1.100, 0.002, 50, 0.2); break;
    case 5: // Wick below swing, but close inside structure: hold.
      ok = !ConfirmedStructureBreak(true, 1.102, 1.101, 1.103, 1.098,
                                     1.100, 0.002, 50, 0.2); break;
    case 6: // Body less than 50%: hold despite a close beyond swing.
      ok = !ConfirmedStructureBreak(true, 1.100, 1.099, 1.102, 1.098,
                                     1.100, 0.002, 50, 0.2); break;
    case 7: // Less than 0.2 ATR displacement: hold.
      ok = !ConfirmedStructureBreak(true, 1.101, 1.0998, 1.101, 1.0998,
                                     1.100, 0.002, 50, 0.2); break;
    case 8: // Confirmed swing break exits without waiting for EMA50.
      ok = ConfirmedStructureBreak(true, 1.102, 1.099, 1.102, 1.098,
                                     1.100, 0.002, 50, 0.2); break;
    case 9: // Missing ATR / zero-range data cannot trigger exit.
      ok = !ConfirmedStructureBreak(true, 1.102, 1.099, 1.102, 1.098,
                                     1.100, 0, 50, 0.2)
        && !ConfirmedStructureBreak(true, 1.1, 1.1, 1.1, 1.1,
                                    1.100, 0.002, 50, 0.2); break;
    case 10: // Profitable and losing entry prices share the same exit predicate.
      for(double entry : {1.098, 1.104}) {
        double profit = 1.099 - entry;
        (void)profit; // P&L must never gate confirmation.
        if(!ConfirmedStructureBreak(true, 1.102, 1.099, 1.102, 1.098,
                                     1.100, 0.002, 50, 0.2)) return 1;
      }
      ok = true; break;
  }
  return ok ? 0 : 1;
}
""")
        # initializer-list support for the profit/loss entry scenarios.
        cpp.write_text("#include <initializer_list>\n" + cpp.read_text())
        subprocess.run([compiler, "-std=c++17", "-Wall", "-Wextra", "-Werror",
                        str(cpp), "-o", str(cls.binary)], check=True)

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def run_case(self, case):
        subprocess.run([str(self.binary), str(case)], check=True)

    def test_no_level_two_or_partial_refill(self): self.run_case(1)
    def test_no_reentry_during_pending_exit_or_same_bar(self): self.run_case(2)
    def test_buy_invalidation(self): self.run_case(3)
    def test_sell_invalidation(self): self.run_case(4)
    def test_wick_is_not_invalidation(self): self.run_case(5)
    def test_body_must_be_at_least_fifty_percent(self): self.run_case(6)
    def test_displacement_must_be_point_two_atr(self): self.run_case(7)
    def test_no_ema_exit_delay(self): self.run_case(8)
    def test_missing_data_does_not_force_exit(self): self.run_case(9)
    def test_confirmation_applies_in_profit_and_loss(self): self.run_case(10)

    def test_runtime_uses_unconditional_confirmation_and_no_recovery(self):
        manage = self.source.split("void ManageSide(", 1)[1].split("bool LossCutHit(", 1)[0]
        self.assertIn("if(UseStructureExit && StructureBrokenAgainst(isBuy, FirstOpenTime(type)))", manage)
        self.assertIn("if(!CanStartBasket(b.count", manage)
        self.assertNotIn("GridDistance(", manage)
        self.assertNotIn("NextLot(", manage)
        self.assertNotIn("ReversalAgainst(", manage)
        self.assertNotIn("TrendAgainst(", manage)

    def test_pre_entry_pivot_is_not_a_rolling_extreme(self):
        anchor = self.source.split("double PreEntrySwing(", 1)[1].split("bool StructureBrokenAgainst(", 1)[0]
        self.assertIn("iBarShift(_Symbol, PERIOD_M15, entryTime, false)", anchor)
        self.assertIn("int first = entryShift + 3", anchor)
        self.assertIn("ConfirmedSwingPivot(isBuy, pivot, n1, n2, o1, o2)", anchor)
        self.assertNotIn("iLowest", anchor)
        self.assertNotIn("iHighest", anchor)

    def test_total_exposure_consolidated_not_tripled(self):
        manage = self.source.split("void ManageSide(", 1)[1].split("bool LossCutHit(", 1)[0]
        self.assertIn("double lot = NormLot(3.0 * BaseLot());", manage)
        self.assertIn("const int ClusterSize  = 1", self.source)

    def test_exit_has_no_profit_or_ema_gate(self):
        rule = self.source.split("bool StructureBrokenAgainst(", 1)[1].split("void ManageSide(", 1)[0]
        self.assertNotIn("hM15Slow", rule)
        self.assertNotIn("profit", rule)
        self.assertIn("PreEntrySwing(isBuy, entryTime)", rule)

    def test_approved_existing_settings_unchanged(self):
        for setting in ["ClusterSize  = 1", "takeprofit      = 7.0",
                        "lotSize         = 0.05", "DailyDrawdownPct = 4.7",
                        'londonBlockUTC  = "6:15-7:30"', 'nyBlockUTC      = "12:00-23:00"',
                        "UseAutoBE       = false", "UseTrailStep    = false", "UsePreSessionBE  = false"]:
            with self.subTest(setting=setting):
                self.assertIn(setting, self.source)


if __name__ == "__main__":
    unittest.main()