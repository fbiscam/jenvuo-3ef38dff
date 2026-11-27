//+------------------------------------------------------------------+
//| Jenvu EA.mq5 - JX Bot H1 swing-to-swing Expert Advisor (MT5)      |
//| Closed-candle rules aligned with the Terminal (volume ignored). |
//| Fresh swing + settled price action OR strong held sweep -> entry.|
//| PA waits 3 reaction closes, sweep waits its 5-candle hold.        |
//| Entry uses the current quote, NEVER a backdated Candle-1 price.  |
//| SL stays on the original swing wick; no trailing or fixed TP.     |
//|  - Exit only at SL or when the next opposite swing confirms.      |
//|  - No portfolio cap; one trade per symbol, no queued entry. |
//|  - High-impact news: no entries 60 min before -> 60 min after;    |
//|    from 60 min before, winners close, losers close at +2 pips.    |
//|  - Friday >= 20:00 UTC (not BTC): same as news, no new trades.    |
//|  - Daily circuit breaker 4.5% of day start balance: close all.    |
//| Attach one copy to XAUUSD, EURUSD and BTCUSD H1 charts.           |
//| Source is readable; distribute owner-tested EX5 to customers.    |
//| Native predicate checks are NOT a compiled MT5 performance test. |
//+------------------------------------------------------------------+
#property copyright "Jenvu"
#property link      "https://jenvu.com"
#property version   "5.12"
#property description "JX Bot H1 - swing-to-swing, wick stop loss, one trade per symbol, news/Friday guard, 4.5% daily breaker."
#include <Trade\Trade.mqh>

input string MyIP = ""; // Registered PC/VPS IP; only public input
const double Lots = 0;
const bool UseNews = true, UseFriday = true;
const double BreakerPct = 4.5;
const long Magic = 509001;

// hidden service settings (not inputs)
const int    SwingLeft     = 7;
const int    NewsWindowMin = 60;
const double BreakevenPips = 2.0;
const int    FridayCutoff  = 20;
string LicenseUrl = "https://jenvu.com/api/public/licenses/validate";
string ReportUrl  = "https://jenvu.com/api/public/licenses/report";

CTrade   trade;
bool     g_licensed = false;
datetime g_lastBar = 0, g_lastNewsLoad = 0, g_lastLicense = 0;
datetime g_news[];
bool     g_guard = false;        // waiting for +BreakevenPips on a losing trade
double   g_targetPct = 0;        // paid plan daily target from validated license
double   g_targetUsd = 0;        // Free plan fixed daily target
const double TesterTargetPct = 2.0; // offline tester explicitly models Pro
ulong g_pendingClose=0;
bool g_newsReady=false;
string g_licenseWhy="";

//--- helpers -------------------------------------------------------
bool IsBtc()  { return StringFind(_Symbol, "BTC") >= 0; }
bool IsGold() { return StringFind(_Symbol, "XAU") >= 0 || StringFind(_Symbol, "GOLD") >= 0; }
double Pip()
  {
   if(IsGold()) return 0.1;
   if(IsBtc())  return 1.0;
   int d = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
   return (d == 3 || d == 5) ? _Point * 10.0 : _Point;
  }
double LotSize()
  {
   double l = Lots;
   if(l <= 0) l = DefaultLots(IsGold(),IsBtc());
   double step = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP), mn = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN), mx = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   if(step > 0) l = MathFloor(l / step + 1e-9) * step;
   return MathMax(mn, MathMin(mx, l));
  }
datetime NowUtc() { return MQLInfoInteger(MQL_TESTER) ? TimeCurrent() - (TimeTradeServer() - TimeGMT()) : TimeGMT(); }
string DayKey() { MqlDateTime d; TimeToStruct(NowUtc(), d); return StringFormat("%04d%02d%02d", d.year, d.mon, d.day); }
string GvStart() { return "JXH1_START_" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + "_" + DayKey(); }
string GvLock()  { return "JXH1_LOCK_"  + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + "_" + DayKey(); }
double DayStart()
  {
   if(!GlobalVariableCheck(GvStart())) GlobalVariableSet(GvStart(), AccountInfoDouble(ACCOUNT_BALANCE));
   return GlobalVariableGet(GvStart());
  }
bool DayLocked() { return GlobalVariableCheck(GvLock()); }

int OpenCount()
  {
   int n = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     { ulong t = PositionGetTicket(i); if(t > 0 && PositionGetInteger(POSITION_MAGIC) == Magic) n++; }
   return n;
  }
bool MyPosition(ulong &ticket, int &dir, double &openPx, double &profit)
  {
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong t = PositionGetTicket(i);
      if(t == 0 || PositionGetInteger(POSITION_MAGIC) != Magic || PositionGetString(POSITION_SYMBOL) != _Symbol) continue;
      ticket = t; dir = PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY ? 1 : -1;
      openPx = PositionGetDouble(POSITION_PRICE_OPEN); profit = PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);
      return true;
     }
   return false;
  }
void CloseAllMine()
  {
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     { ulong t = PositionGetTicket(i); if(t > 0 && PositionGetInteger(POSITION_MAGIC) == Magic) { trade.SetTypeFillingBySymbol(PositionGetString(POSITION_SYMBOL)); trade.PositionClose(t); } }
   trade.SetTypeFillingBySymbol(_Symbol);
  }

// Pure closed-candle predicates; also compiled by native parity tests.
// Rates are chronological. n is the count of CLOSED candles (no forming bar).
double Clamp(double x) { return MathMax(0.0, MathMin(1.0, x)); }
double LocalAtr(const MqlRates &r[], int i)
{
 double sum=0; int count=0;
 for(int k=MathMax(1,i-13); k<=i; k++) { sum+=MathMax(r[k].high-r[k].low,MathMax(MathAbs(r[k].high-r[k-1].close),MathAbs(r[k].low-r[k-1].close))); count++; }
 return count>0 ? sum/count : r[i].high-r[i].low;
}
int FreshPivot(const MqlRates &r[], int n, bool high)
{
 int best=-1;
 for(int i=MathMax(7,n-7); i<n; i++)
   if(best<0 || (high ? r[i].high>=r[best].high : r[i].low<=r[best].low)) best=i;
 if(best<7 || best+1>=n) return -1;
 if(high ? !(r[best+1].close<r[best+1].open && r[best+1].close<r[best].close) : !(r[best+1].close>r[best+1].open && r[best+1].close>r[best].close)) return -1;
 for(int k=best-7; k<best; k++) if(high ? r[k].high>r[best].high : r[k].low<r[best].low) return -1;
 return best;
}
// Same reversal-pressure calculation as Terminal with useVolume=false.
int BuyerPressure(const MqlRates &r[], int n, int i, bool high)
{
 double range=r[i].high-r[i].low; if(range<=0) return 50;
 double atr=LocalAtr(r,i), wick=high?r[i].high-MathMax(r[i].open,r[i].close):MathMin(r[i].open,r[i].close)-r[i].low;
 double loc=(r[i].close-r[i].low)/range;
 double reject=Clamp(0.6*wick/range+0.4*(high?1-loc:loc)), rejection=high?1-reject:reject;
 int end=MathMin(n-1,i+7), bars=end-i, streak=0,maxStreak=0,away=0;
 double fb=0,fw=0,far=high?1e100:-1e100,delta=0,dirVolume=0,totalVolume=0,path=0,prior=r[i].close;
 for(int k=i+1;k<=end;k++) {
   double rng=r[k].high-r[k].low; if(rng<=0) continue;
   double body=(r[k].close-r[k].open)/rng;
   fb+=rng*Clamp(0.6*(r[k].close-r[k].low)/rng+0.4*(0.5+body/2)); fw+=rng; delta+=body; dirVolume+=body; totalVolume++;
   path+=MathAbs(r[k].close-prior); prior=r[k].close;
   int dir=r[k].close>r[k].open?1:r[k].close<r[k].open?-1:0;
   if(dir!=0) { streak=dir==(high?-1:1)?streak+1:0; maxStreak=MathMax(maxStreak,streak); }
   if(high?r[k].close<(r[i].high+r[i].low)/2:r[k].close>(r[i].high+r[i].low)/2) away++;
   far=high?MathMin(far,r[k].close):MathMax(far,r[k].close);
 }
 double evidence=MathMin(1.0,bars/7.0),flow=fw>0?fb/fw:0.5,move=bars>0&&atr>0?Clamp((high?r[i].high-far:far-r[i].low)/(2*atr)):0;
 double disp=high?0.5-move/2:0.5+move/2,deltaNorm=bars>0?Clamp(0.5+delta/(bars*2)):0.5,streakNorm=Clamp(maxStreak/3.0);
 double wr=0.3+0.3*(1-evidence),wf=0.3*evidence,wd=0.2*evidence,wm=0.2*evidence;
 double buy=(rejection*wr+flow*wf+disp*wd+(0.6*deltaNorm+0.4*streakNorm)*wm)/(wr+wf+wd+wm);
 buy=0.5+(buy-0.5)*(1+0.5*evidence);
 double agree=high?0.5-buy:buy-0.5,sweep=0;
 int look=MathMax(0,i-20);
 if(i-look>=5) { double level=high?-1e100:1e100; for(int k=look;k<i;k++) level=high?MathMax(level,r[k].high):MathMin(level,r[k].low);
   bool took=high?r[i].high>level:r[i].low<level,back=high?r[i].close<level:r[i].close>level; if(took) sweep=back?1:0.4; }
 double aa=0,ab=0; int na=0,nb=0;
 for(int k=MathMax(0,i-3);k<i;k++) {aa+=MathAbs(r[k].close-r[k].open);na++;}
 for(int k=MathMax(0,i-6);k<MathMax(0,i-3);k++) {ab+=MathAbs(r[k].close-r[k].open);nb++;}
 aa=na>0?aa/na:0;ab=nb>0?ab/nb:0;
 double exhaust=ab>0?Clamp(1-aa/ab):0,engulf=0,bos=0,defended=0,two=0;
 if(i+1<n) { bool rev=high?r[i+1].close<r[i+1].open:r[i+1].close>r[i+1].open;
   if(rev && MathMin(r[i+1].open,r[i+1].close)<=MathMin(r[i].open,r[i].close) && MathMax(r[i+1].open,r[i+1].close)>=MathMax(r[i].open,r[i].close)) engulf=1; }
 if(na>0) {double leg=high?1e100:-1e100;for(int k=MathMax(0,i-3);k<i;k++)leg=high?MathMin(leg,r[k].low):MathMax(leg,r[k].high);
   for(int k=i+1;k<=end;k++)if(high?r[k].close<leg:r[k].close>leg) {bos=1;break;}}
 if(atr>0)for(int k=i+2;k<=end;k++)if((high?MathAbs(r[i].high-r[k].high)<=0.3*atr:MathAbs(r[k].low-r[i].low)<=0.3*atr) && (high?r[k].close<r[i].high:r[k].close>r[i].low)) {defended=1;break;}
 double trigger=high?MathMin(r[i].open,r[i].close):MathMax(r[i].open,r[i].close);
 for(int k=i+1;k<end;k++) {
   if(!(high?r[k].close<trigger:r[k].close>trigger))continue;
   double tol=MathMax(atr*0.2,r[i].close*0.00002);
   if((high?r[k+1].high>=trigger-tol:r[k+1].low<=trigger+tol) && (high?r[k+1].close<trigger:r[k+1].close>trigger) && (high?r[k+1].close<r[k+1].open:r[k+1].close>r[k+1].open)) {two=1;break;}
 }
 double efficiency=path>0?Clamp(MathAbs(r[end].close-r[i].close)/path):0,persistence=bars>0?Clamp(away/(double)bars):0;
 double vb=totalVolume>0?Clamp(0.5+dirVolume/(2*totalVolume)):0.5,bias=high?1-vb:vb;
 double footprint=MathMax(sweep,exhaust),conf=MathMax(MathMax(0.55*engulf,0.7*bos),MathMax(0.6*defended,two));
 double follow=0.4*efficiency+0.35*persistence+0.25*bias;
 int first=MathMax(0,i-50);double rh=-1e100,rl=1e100;
 for(int k=first;k<=i;k++) {rh=MathMax(rh,r[k].high);rl=MathMin(rl,r[k].low);}
 double pos=rh>rl?((high?r[i].high:r[i].low)-rl)/(rh-rl):0.5,context=high?pos:1-pos;
 bool invalid=false;for(int k=i+1;k<=end;k++)if(high?r[k].close>r[i].high:r[k].close<r[i].low) {invalid=true;break;}
 int families=(footprint>=0.55?1:0)+(conf>=0.55?1:0)+(follow>=0.55?1:0);
 double weakest=MathMin(footprint,MathMin(conf,follow)),weighted=0.24*footprint+0.31*conf+0.29*follow+0.1*move+0.06*streakNorm;
 double chop=evidence>=0.3?0.55*(1-efficiency)+0.45*(1-persistence):0;
 double strength=0.025+0.22*MathMax(0.0,agree)+0.08*move+0.19*weighted+0.08*weakest-0.1*Clamp((0.5-bias)*2)-0.055*chop;
 bool hasContext=i-first+1>=20;if(hasContext)strength+=0.04*(context-0.5);
 double cap=families==3?0.46:families==2?0.34:families==1?0.24:0.17;
 if(families==3&&hasContext&&context<0.55)cap=0.4;
 strength=MathMin(strength,MathMin(cap,0.2+0.26*evidence));if(invalid)strength=MathMin(strength,0.08);strength=MathMax(0.03,MathMin(0.46,strength));
 buy=high?0.5-strength:0.5+strength;
 double against=high?r[end].close-r[i].close:r[i].close-r[end].close;
 if(invalid||(against>0&&agree<=0)) {double a=atr>0?Clamp(against/(2*atr)):0,counter=MathMin(0.2,0.04+0.14*a+(invalid?0.04:0));buy=high?0.5+counter:0.5-counter;}
 return (int)MathFloor(Clamp(buy)*100+0.5);
}
bool PriceActionOk(const MqlRates &r[], int n, int i, bool high)
{
 if(i<0 || i+3>=n) return false;
 double atr=LocalAtr(r,i),range=r[i].high-r[i].low,body=MathAbs(r[i].close-r[i].open);
 double wick=high?r[i].high-MathMax(r[i].open,r[i].close):MathMin(r[i].open,r[i].close)-r[i].low;
 int pattern=range>0&&wick>=2*body&&wick>=0.5*range?1:0;
 bool engulf=high?r[i+1].close<r[i+1].open&&r[i+1].close<MathMin(r[i].open,r[i].close)&&r[i+1].open>=MathMax(r[i].open,r[i].close)-0.1*atr:r[i+1].close>r[i+1].open&&r[i+1].close>MathMax(r[i].open,r[i].close)&&r[i+1].open<=MathMin(r[i].open,r[i].close)+0.1*atr;
 if(pattern==0&&engulf&&MathAbs(r[i+1].close-r[i+1].open)>=body)pattern=2;
 bool followed=pattern==2,retaken=false;
 for(int k=i+1;k<=i+3;k++) {
   if(pattern==0&&(high?r[k].close<r[i].low-0.3*atr:r[k].close>r[i].high+0.3*atr)) {pattern=3;followed=true;}
   if(high?r[k].close>r[i].high:r[k].close<r[i].low)retaken=true;
   if(high?r[k].close<MathMin(r[i].open,r[i].close):r[k].close>MathMax(r[i].open,r[i].close))followed=true;
 }
 int buyer=BuyerPressure(r,n,i,high),share=high?100-buyer:buyer;
 return pattern>0 && followed && !retaken && share>=60;
}
bool SweepOk(const MqlRates &r[], int n, int i, bool high)
{
 if(i<10||i+5>=n)return false;
 double level=high?-1e100:1e100,avg=0;
 for(int k=i-10;k<i;k++){level=high?MathMax(level,r[k].high):MathMin(level,r[k].low);avg+=r[k].high-r[k].low;}avg/=10;
 double depth=high?r[i].high-level:level-r[i].low;
 if(depth<=0||depth<avg*0.1 || !(high?r[i].close<level:r[i].close>level))return false;
 double wick=high?r[i].high-MathMax(r[i].open,r[i].close):MathMin(r[i].open,r[i].close)-r[i].low;
 if(wick<MathMax(MathAbs(r[i].close-r[i].open),avg*0.05)*1.5)return false;
 bool move=false;double edge=high?MathMin(r[i].open,r[i].close):MathMax(r[i].open,r[i].close);
 for(int k=i+1;k<=i+5;k++) {
   if(!(high?r[k].close<level:r[k].close>level))return false;
   if(k<=i+2 && (high?edge-r[k].close:r[k].close-edge)>=avg*0.1 && MathAbs(r[k].close-r[k].open)>=avg*0.3)move=true;
 }
 return move;
}
bool CanEnter(bool tester, bool licensed, bool hasIp) { return tester || (licensed && hasIp); }
bool EntryAllowed(bool pa, bool sweep) { return pa || sweep; }
double DefaultLots(bool gold, bool btc) { return gold ? 0.02 : btc ? 0.05 : 0.35; }
bool NewsBlockedAt(long now, long release) { return now>=release-3600 && now<=release+3600; }
bool FridayBlocked(int day, int hour, bool btc) { return !btc && ((day==5 && hour>=20) || day==6); }
bool MustBreak(double start, double equity) { return start>0 && equity-start<=-start*4.5/100; }
double DailyTargetAmount(double start, double pct, double usd) { return start>0 ? (usd>0 ? usd : start*pct/100.0) : 0; }
bool MustTakeProfit(double start, double equity, double pct, double usd)
{
 double target=DailyTargetAmount(start,pct,usd);
 return target>0 && equity-start>=target;
}
// END PURE PREDICATES

bool ConfigureDailyTarget(string txt)
{
 g_targetPct=0; g_targetUsd=0;
 if(StringFind(txt,"\"plan\":\"pro\"")>=0)g_targetPct=2.0;
 else if(StringFind(txt,"\"plan\":\"elite\"")>=0)g_targetPct=4.0;
 else if(StringFind(txt,"\"plan\":\"ultra\"")>=0)g_targetPct=6.0;
 else if(StringFind(txt,"\"plan\":\"free\"")>=0)g_targetUsd=10.0;
 else return false;
 return true;
}

// Persistent account/day lock is set BEFORE attempting closes. Failed closes
// retry on every tick across all charts; the target cannot reopen entries.
bool EnforceDailyLimits(double start, double equity)
{
 if(DayLocked()) { CloseAllMine(); return true; }
 bool loss=MustBreak(start,equity);
 bool target=MustTakeProfit(start,equity,g_targetPct,g_targetUsd);
 if(!loss && !target)return false;
 GlobalVariableSet(GvLock(),1);
 CloseAllMine();
 Print(loss ? "Jenvu EA: daily circuit breaker reached." : "Jenvu EA: closed + floating daily target reached.");
 return true;
}
// END DAILY LIMIT ENFORCEMENT

// Candidate detection uses closed bars only, never the forming bar.
datetime g_seenHigh=0,g_seenLow=0,g_entryHigh=0,g_entryLow=0;
int ReadSignals(double &sl, int &exitDir)
{
 MqlRates r[]; ArraySetAsSeries(r,false);
 int n=CopyRates(_Symbol,PERIOD_H1,1,400,r); if(n<20)return 0;
 exitDir=0;int entry=0;
 for(int side=0;side<2;side++) {
   bool high=side==0; int i=FreshPivot(r,n,high);if(i<0)continue;
   datetime seen=high?g_seenHigh:g_seenLow;
   if(r[i].time>seen) {exitDir=high?-1:1;if(high)g_seenHigh=r[i].time;else g_seenLow=r[i].time;}
   datetime entered=high?g_entryHigh:g_entryLow;
   if(r[i].time<=entered)continue;
   bool pa=PriceActionOk(r,n,i,high),sw=SweepOk(r,n,i,high);
   if(!EntryAllowed(pa,sw))continue;
   // Consume immediately, including blocked or failed orders: no chasing.
   if(high)g_entryHigh=r[i].time;else g_entryLow=r[i].time;
   entry=high?-1:1;sl=high?r[i].high:r[i].low;
 }
 return entry;
}

//--- news ------------------------------------------------------------
void LoadNews()
  {
   ArrayResize(g_news, 0); g_lastNewsLoad = TimeCurrent();
   if(MQLInfoInteger(MQL_TESTER) || !UseNews) { g_newsReady=true; return; }
   g_newsReady=true;
   string cur[] = {"USD", "EUR"};
   datetime from = TimeTradeServer() - 6 * 3600, to = TimeTradeServer() + 2 * 86400;
   for(int c = 0; c < 2; c++)
     {
      MqlCalendarValue v[];
      int found=CalendarValueHistory(v, from, to, NULL, cur[c]);
      if(found<0) {g_newsReady=false;continue;}
      if(found==0)continue;
      for(int i = 0; i < ArraySize(v); i++)
        {
         MqlCalendarEvent ev; if(!CalendarEventById(v[i].event_id, ev)) {g_newsReady=false;continue;}
         if(ev.importance != CALENDAR_IMPORTANCE_HIGH) continue;
         int k = ArraySize(g_news); ArrayResize(g_news, k + 1); g_news[k] = v[i].time; // server time
        }
     }
  }
bool NewsBlocksEntry() { if(!g_newsReady)return true; datetime n = TimeTradeServer(); for(int i = 0; i < ArraySize(g_news); i++) if(NewsBlockedAt((long)n,(long)g_news[i])) return true; return false; }
bool PreNews()         { datetime n = TimeTradeServer(); for(int i = 0; i < ArraySize(g_news); i++) if(n >= g_news[i] - NewsWindowMin * 60 && n <= g_news[i]) return true; return false; }
bool FridayCut()
  {
   if(!UseFriday || IsBtc()) return false;
   MqlDateTime d; TimeToStruct(NowUtc(), d);
   return FridayBlocked(d.day_of_week,d.hour,IsBtc());
  }

//--- license (server checks the caller IP; info stays hidden) ----------
bool CheckLicense()
  {
   if(MQLInfoInteger(MQL_TESTER) || MQLInfoInteger(MQL_OPTIMIZATION)) { g_targetPct=TesterTargetPct; g_targetUsd=0; Print("Jenvu EA: offline Strategy Tester uses Pro 2% daily target; license check skipped."); return true; }
   if(StringLen(MyIP)<7 || StringFind(MyIP,"\"")>=0 || StringFind(MyIP,"\\")>=0) return false;
   g_lastLicense=TimeCurrent();
   string acc = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   string body = "{\"ip\":\"" + MyIP + "\",\"mt5_account\":\"" + acc + "\"}";
   char post[], res[]; string hdr;
   StringToCharArray(body, post, 0, StringLen(body), CP_UTF8);
   ResetLastError();
   int code = WebRequest("POST", LicenseUrl, "Content-Type: application/json\r\n", 8000, post, res, hdr);
   if(code == -1) { g_licenseWhy="WebRequest blocked: add https://jenvu.com in Tools > Options > Expert Advisors."; Print("JX Bot: license server not reachable. Add https://jenvu.com in Tools > Options > Expert Advisors > Allow WebRequest."); return false; }
   string txt = CharArrayToString(res, 0, WHOLE_ARRAY, CP_UTF8);
   g_licenseWhy="IP not registered on jenvu.com or plan inactive.";
   bool ok = code==200 && StringFind(txt, "\"valid\":true") >= 0;
   if(ok)ok=ConfigureDailyTarget(txt);
   Print("JX Bot license: ", ok ? "VALID" : "INVALID", " (MT5 account ", acc, ")");
   if(!ok)
     {
      if(StringFind(txt, "account_mismatch") >= 0) { g_licenseWhy="IP already used by another MT5 account."; Print("JX Bot: this IP is already used by another MT5 account. One IP = one account."); }
      else if(StringFind(txt, "ip_mismatch") >= 0) { g_licenseWhy="MyIP does not match this PC/VPS real IP."; Print("JX Bot: MyIP does not match this PC/RDP real IP. Update it on jenvu.com."); }
      else if(StringFind(txt, "expired") >= 0) { g_licenseWhy="plan expired."; Print("JX Bot: your license has expired. Renew it at jenvu.com."); }
      else if(StringFind(txt, "not_found") >= 0 || StringFind(txt, "malformed") >= 0) Print("JX Bot: IP not registered. Add this IP on jenvu.com > JX Bot and type it in MyIP.");
      else Print("JX Bot: license check failed (HTTP ", code, ").");
     }
   g_lastLicense = TimeCurrent();
   return ok;
  }
void ReportStatus(string event = "", string reason = "")
  {
   if(MQLInfoInteger(MQL_TESTER) || MQLInfoInteger(MQL_OPTIMIZATION)) return;
   string acc = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   int open = 0; double lots = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--) { ulong t = PositionGetTicket(i); if(t > 0 && PositionGetInteger(POSITION_MAGIC) == Magic) { open++; lots += PositionGetDouble(POSITION_VOLUME); } }
   double today = AccountInfoDouble(ACCOUNT_BALANCE) - DayStart();
   string body = StringFormat("{\"ip\":\"%s\",\"mt5_account\":\"%s\",\"symbol\":\"%s\",\"balance\":%.2f,\"equity\":%.2f,\"today_profit\":%.2f,\"trades_today\":0,\"open_trades\":%d,\"open_lots\":%.2f,\"target_hit\":%s,\"event\":\"%s\",\"reason\":\"%s\"}",
      MyIP, acc, _Symbol, AccountInfoDouble(ACCOUNT_BALANCE), AccountInfoDouble(ACCOUNT_EQUITY), today, open, lots, DayLocked() ? "true" : "false", event, reason);
   char post[], res[]; string hdr;
   StringToCharArray(body, post, 0, StringLen(body), CP_UTF8);
   if(WebRequest("POST", ReportUrl, "Content-Type: application/json\r\n", 8000, post, res, hdr) == -1) return;
   string txt = CharArrayToString(res, 0, WHOLE_ARRAY, CP_UTF8);
   if(StringFind(txt, "\"valid\":false") >= 0) { g_licensed = false; ShowLicense(false); }
   if(StringFind(txt, "\"stop\":true") >= 0 && !DayLocked()) { GlobalVariableSet(GvLock(), 1); CloseAllMine(); }
  }

void ShowLicense(bool ok)
  {
   string n="JXH1_LIC";
   if(ObjectFind(0,n)<0) ObjectCreate(0,n,OBJ_LABEL,0,0,0);
   ObjectSetInteger(0,n,OBJPROP_CORNER,CORNER_LEFT_UPPER);
   ObjectSetInteger(0,n,OBJPROP_XDISTANCE,12); ObjectSetInteger(0,n,OBJPROP_YDISTANCE,24);
   ObjectSetInteger(0,n,OBJPROP_FONTSIZE,10);
   ObjectSetInteger(0,n,OBJPROP_COLOR,ok?clrLime:clrRed);
   ObjectSetString(0,n,OBJPROP_TEXT,"JENVU EA | "+_Symbol+" | License: "+(ok?"ACTIVE (IP verified)":"INVALID - trading off"));
   ChartRedraw();
  }

//--- events ----------------------------------------------------------
int OnInit()
  {
   if(_Period != PERIOD_H1) { Print("JX Bot: attach to an H1 chart."); return INIT_PARAMETERS_INCORRECT; }
   if(!IsGold() && !IsBtc() && StringFind(_Symbol,"EURUSD")<0) return INIT_PARAMETERS_INCORRECT;
   trade.SetExpertMagicNumber(Magic);
   trade.SetTypeFillingBySymbol(_Symbol);
   bool tester=(bool)MQLInfoInteger(MQL_TESTER);
   if(!tester && StringLen(MyIP)<7) { Alert("JX Bot: enter your registered PC/VPS IP in MyIP (jenvu.com > JX Bot)."); ShowLicense(false); return INIT_PARAMETERS_INCORRECT; }
   g_licensed = CheckLicense();
   ShowLicense(g_licensed);
   if(!CanEnter(tester,g_licensed,StringLen(MyIP)>=7)) { Alert("JX Bot: IP NOT VERIFIED - "+g_licenseWhy+" Bot removed."); return INIT_FAILED; }
   if(!tester) Alert("JX Bot: IP VERIFIED ("+MyIP+") - license ACTIVE on "+_Symbol+" H1.");
   LoadNews();
   double dummy=0;int ex=0;ReadSignals(dummy,ex); // consume pre-attach signals
   g_entryHigh=g_seenHigh;g_entryLow=g_seenLow; // also discard pre-attach unsettled swings
   if(MQLInfoInteger(MQL_TESTER))Print("Jenvu EA: offline tester; news is NOT verified. Use historical calendar replay before comparing full-rule performance.");
   g_lastBar = iTime(_Symbol, PERIOD_H1, 0);   // no entry on the candle the bot was attached
   EventSetTimer(60);
   ReportStatus("start");
   return INIT_SUCCEEDED;
  }
void OnDeinit(const int reason) { EventKillTimer(); ObjectDelete(0,"JXH1_LIC"); ReportStatus("stop", IntegerToString(reason)); }
void OnTimer()
  {
   ReportStatus();
   if(TimeCurrent() - g_lastNewsLoad > 3600) LoadNews();
   if(TimeCurrent() - g_lastLicense > 6 * 3600) g_licensed = CheckLicense();
  }

void OnTick()
  {
   // Read and consume signals even while locked, unlicensed or closing.
   // A blocked signal must never be queued for later entry.
   datetime bar = iTime(_Symbol, PERIOD_H1, 0);
   bool freshBar=bar!=g_lastBar;
   double sl=0;int exitDir=0,sig=0;
   if(freshBar) {g_lastBar=bar;sig=ReadSignals(sl,exitDir);}
   // Account equity includes closed + floating P/L. Check on EVERY tick,
   // before any per-position close retry or hourly-entry early return.
   double start = DayStart();
   if(EnforceDailyLimits(start,AccountInfoDouble(ACCOUNT_EQUITY)))return;
   if(g_pendingClose>0) { if(!PositionSelectByTicket(g_pendingClose))g_pendingClose=0;else {trade.PositionClose(g_pendingClose);return;} }
   if(MQLInfoInteger(MQL_TESTER) && TimeCurrent() - g_lastNewsLoad > 3600) g_lastNewsLoad = TimeCurrent();

   // 2) news / Friday guard on this symbol's open trade
   ulong tk = 0; int dir = 0; double px = 0, profit = 0;
   bool has = MyPosition(tk, dir, px, profit);
   bool guardNow = (UseNews && PreNews()) || FridayCut();
   if(has && (guardNow || g_guard))
     {
      double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID), ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double pips = dir == 1 ? (bid - px) / Pip() : (px - ask) / Pip();
      if(profit > 0 && (guardNow || pips >= BreakevenPips)) { g_pendingClose=tk; trade.PositionClose(tk); if(PositionSelectByTicket(tk))return; g_pendingClose=0; g_guard = false; has = false; }
      else g_guard = true;
     }
   if(!has) g_guard = false;

   // 3) once per closed H1 bar: opposite swing exit, then entry
   if(!freshBar) return;
   if(has && exitDir!=0 && dir!=exitDir) { g_pendingClose=tk;trade.PositionClose(tk);if(PositionSelectByTicket(tk))return;g_pendingClose=0;has=false;g_guard=false; }
   if(sig==0 || has || DayLocked()) return;               // dropped, never queued
   // Invalid licensing blocks new orders, not safety exits on existing ones.
   if(!CanEnter((bool)MQLInfoInteger(MQL_TESTER),g_licensed,StringLen(MyIP)>=7)) return;
   if((UseNews && NewsBlocksEntry()) || FridayCut()) return;
   // Respect any existing position on this symbol, including manual/netting positions.
   if(PositionSelect(_Symbol))return;
   double price = sig == 1 ? SymbolInfoDouble(_Symbol, SYMBOL_ASK) : SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double minDist = (double)SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * _Point;
   if((sig == 1 && price - sl <= minDist) || (sig == -1 && sl - price <= minDist)) { Print("JX Bot: swing SL too close / already passed, signal skipped."); return; }
   sl = NormalizeDouble(sl, (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS));
   bool ok = sig == 1 ? trade.Buy(LotSize(), _Symbol, 0, sl, 0, "JX H1 swing") : trade.Sell(LotSize(), _Symbol, 0, sl, 0, "JX H1 swing");
   if(!ok) Print("JX Bot: order failed ", trade.ResultRetcode());
  }
//+------------------------------------------------------------------+

// Actual MT5 tester statistics, not website estimates.
double OnTester()
{
 double count=TesterStatistics(STAT_TRADES),profit=TesterStatistics(STAT_PROFIT),dd=TesterStatistics(STAT_EQUITY_DD);
 PrintFormat("Jenvu EA TEST: trades %.0f | wins %.1f%% | net %.2f | equity drawdown %.2f | Pro 2%% equity daily target | historical news NOT replayed",count,count>0?100*TesterStatistics(STAT_PROFIT_TRADES)/count:0,profit,dd);
 return dd>0?profit/dd:profit;
}
