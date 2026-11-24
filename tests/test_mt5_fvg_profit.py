"""Run actual v4.08 MQL guard code with deterministic quotes/history/storage.
Native simulation is not a MetaEditor compilation or an MT5 backtest.
"""
import pathlib
import re
import shutil
import subprocess
import tempfile
import unittest
from test_mt5_pivots import extract

SOURCE = pathlib.Path(__file__).resolve().parents[1] / 'resources/mt5/Jenvu EA.mq5'

class FvgProfitGuard(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        source = SOURCE.read_text()
        cls.temp = tempfile.TemporaryDirectory()
        cls.binary = pathlib.Path(cls.temp.name) / 'guard'
        compiler = shutil.which('g++') or shutil.which('clang++')
        if compiler is None:
            raise RuntimeError('Native compiler required')
        settings = '\n'.join(re.search(r'(?:bool|double|int)\s+' + name + r'\s*=\s*[^;]+;', source).group(0)
            for name in ['takeprofit', 'FvgNearATR', 'ShieldNearATR', 'ShieldMinGapATR', 'ShieldLookback',
                         'UseFvgProfitGuard', 'FvgGuardTrigPips', 'FvgGuardLockPips'])
        harness = r'''
#include <string>
#include <vector>
#include <map>
#include <cmath>
#include <cstdlib>
using string = std::string;
using ENUM_POSITION_TYPE = int;
const int POSITION_TYPE_BUY = 1, POSITION_TYPE_SELL = -1;
const int _Symbol=0, PERIOD_M15=15, SYMBOL_BID=1, SYMBOL_ASK=2, hM15ATR=0;
struct FvgGuardState { string key; double previousQuote=0; bool armed=false; bool pending=false; };
double quote=1.1000, atr=0.001;
std::vector<double> highs(24,1.10), lows(24,1.10), closes(24,1.10);
std::map<string,double> storage;
string identity="position-1";
bool GlobalVariableCheck(string k) { return storage.count(k)>0; }
double GlobalVariableGet(string k) { return storage[k]; }
void GlobalVariableSet(string k, double v) { storage[k]=v; }
void GlobalVariableDel(string k) { storage.erase(k); }
string FvgGuardKey(int) { return identity; }
double SymbolInfoDouble(int,int) { return quote; }
double PU() { return 0.0001; }
int CopyBuffer(int,int,int,int,double a[]) { a[0]=atr; return 1; }
int Bars(int,int) { return static_cast<int>(highs.size()); }
double iHigh(int,int,int i) { return highs.at(i); }
double iLow(int,int,int i) { return lows.at(i); }
double iClose(int,int,int i) { return closes.at(i); }
string DoubleToString(double,int) { return ""; }
template<typename... T> void Print(T...) {}
'''
        functions = '\n'.join(extract(source, sig) for sig in [
            'bool ZoneBlocksEntry(', 'bool ZoneStillActive(', 'bool OpposingFvgTouched(',
            'bool FvgGuardCanArm(', 'bool FvgGuardMustClose(', 'bool ActiveOpposingFvgTouch(',
            'void ResetFvgGuard(', 'bool UpdateFvgGuard('])
        cases = r'''
void sellFvg() { highs[3]=1.0995; lows[1]=1.09965; }
void buyFvg() { highs[1]=1.10035; lows[3]=1.1005; }
int main(int argc,char**argv) {
 if(argc!=2) return 2;
 bool ok=false; FvgGuardState state, restarted;
 switch(std::atoi(argv[1])) {
 case 1: // Actual universal TP parameter / runtime predicate: 5 pips, not 7.
   ok=takeprofit==5.0 && 4.9*PU()<takeprofit*PU() && 5.1*PU()>=takeprofit*PU(); break;
 case 2: // 0.2 ATR FVG boundary, supply/demand still 1 ATR.
   ok=FvgNearATR==0.2 && ShieldNearATR==1.0
     && ZoneBlocksEntry(-1,1.10019,1.0995,1.1000,atr,FvgNearATR)
     && !ZoneBlocksEntry(-1,1.10021,1.0995,1.1000,atr,FvgNearATR)
     && ZoneBlocksEntry(1,1.09981,1.1000,1.1005,atr,FvgNearATR)
     && !ZoneBlocksEntry(1,1.09979,1.1000,1.1005,atr,FvgNearATR); break;
 case 3: sellFvg(); quote=1.09965;
   ok=!UpdateFvgGuard(state,POSITION_TYPE_SELL,1.1000,0.00035) && state.armed;
   quote=1.09981;
   ok=ok && UpdateFvgGuard(state,POSITION_TYPE_SELL,1.1000,0.00019) && state.pending; break;
 case 4: buyFvg(); quote=1.10035;
   ok=!UpdateFvgGuard(state,POSITION_TYPE_BUY,1.1000,0.00035) && state.armed;
   quote=1.10019;
   ok=ok && UpdateFvgGuard(state,POSITION_TYPE_BUY,1.1000,0.00019); break;
 case 5: // Touch below +3.5 never arms; ordinary bounce never closes.
   sellFvg(); quote=1.09965;
   ok=!UpdateFvgGuard(state,-1,1.09990,0.00025) && !state.armed;
   quote=1.09989;
   ok=ok && !UpdateFvgGuard(state,-1,1.09990,0.00001); break;
 case 6: // No FVG, including supply/demand-only scenario: no guard.
   quote=1.09960;
   ok=!UpdateFvgGuard(state,-1,1.1000,0.00040) && !state.armed; break;
 case 7: sellFvg(); quote=1.09965;
   UpdateFvgGuard(state,-1,1.1000,0.00035);
   quote=1.09949;
   ok=!UpdateFvgGuard(state,-1,1.1000,0.00051) && state.armed
     && 0.00051>=takeprofit*PU(); break;
 case 8: // Armed persistence across restart.
   sellFvg(); quote=1.09965; UpdateFvgGuard(state,-1,1.1000,0.00035);
   quote=1.09981;
   ok=UpdateFvgGuard(restarted,-1,1.1000,0.00019); break;
 case 9: // Failed close remains pending even if price recovers after restart.
   storage[identity]=2; quote=1.09960;
   ok=UpdateFvgGuard(state,-1,1.1000,0.00040) && state.pending; break;
 case 10: // New position cannot inherit an old armed guard.
   storage[identity]=1; quote=1.09970;
   UpdateFvgGuard(state,-1,1.1000,0.00030);
   identity="position-2"; quote=1.1000;
   ok=!UpdateFvgGuard(state,-1,1.1000,0) && !state.armed && storage.count("position-1")==0; break;
 case 11: // Wrong side and FVG invalidated by closed candle excluded.
   highs[4]=1.0995; lows[2]=1.09965; closes[1]=1.099;
   ok=!ActiveOpposingFvgTouch(false,1.1000,1.09965);
   highs.assign(24,1.0994); lows.assign(24,1.0994); closes.assign(24,1.0994);
   highs[1]=1.1000; lows[1]=1.09965; highs[2]=1.0998; lows[2]=1.0995;
   ok=ok && !ActiveOpposingFvgTouch(true,1.0990,1.1000); break;
 case 12: // Gap across approach edge triggers; zone behind quote never does.
   ok=OpposingFvgTouched(false,1.1000,1.0990,1.0995,1.09965)
     && OpposingFvgTouched(true,1.1000,1.1010,1.10035,1.1005)
     && !OpposingFvgTouched(false,1.0990,1.0989,1.0995,1.09965); break;
 case 13: // Clearing closed basket removes persisted guard.
   state.key=identity; state.armed=true; storage[identity]=1;
   ResetFvgGuard(state);
   ok=state.key=="" && !state.armed && storage.empty(); break;
 case 14: // Missing ATR and tiny FVG must not arm.
   sellFvg(); atr=0;
   ok=!ActiveOpposingFvgTouch(false,1.1000,1.09965);
   atr=0.001; lows[1]=1.09951;
   ok=ok && !ActiveOpposingFvgTouch(false,1.1000,1.09951); break;
 case 15: // Exact guard thresholds, invalid config and negative move.
   ok=FvgGuardTrigPips==3.5 && FvgGuardLockPips==2.0
     && FvgGuardCanArm(true,3.5,FvgGuardTrigPips,FvgGuardLockPips)
     && !FvgGuardCanArm(true,3.49,FvgGuardTrigPips,FvgGuardLockPips)
     && !FvgGuardCanArm(true,-1,3.5,2)
     && !FvgGuardCanArm(true,4,2,3.5)
     && FvgGuardMustClose(true,false,2.0,2.0)
     && !FvgGuardMustClose(true,false,2.01,2.0); break;
 }
 return ok ? 0 : 1;
}
'''
        cpp=pathlib.Path(cls.temp.name)/'guard.cpp'
        cpp.write_text(harness+'\n'+settings+'\n'+functions+'\n'+cases)
        subprocess.run([compiler,'-std=c++17','-Wall','-Wextra','-Werror',str(cpp),'-o',str(cls.binary)],check=True)

    @classmethod
    def tearDownClass(cls): cls.temp.cleanup()

    def test_five_pip_tp_for_every_basket(self): self.run_case(1)
    def test_fvg_point_two_atr_only(self): self.run_case(2)
    def test_sell_touch_arm_and_pullback(self): self.run_case(3)
    def test_buy_touch_arm_and_pullback(self): self.run_case(4)
    def test_small_profit_touch_does_not_arm(self): self.run_case(5)
    def test_no_fvg_no_new_exit(self): self.run_case(6)
    def test_breakthrough_still_reaches_tp(self): self.run_case(7)
    def test_restart_keeps_armed_floor(self): self.run_case(8)
    def test_pending_close_retries_after_restart(self): self.run_case(9)
    def test_new_position_resets_guard(self): self.run_case(10)
    def test_invalidated_and_wrong_side_fvgs_excluded(self): self.run_case(11)
    def test_tick_gaps_and_zones_behind_trade(self): self.run_case(12)
    def test_closed_position_cleans_state(self): self.run_case(13)
    def test_missing_history_and_tiny_gaps(self): self.run_case(14)
    def test_thresholds(self): self.run_case(15)
    def run_case(self,case): subprocess.run([str(self.binary),str(case)],check=True)

if __name__=='__main__': unittest.main()
