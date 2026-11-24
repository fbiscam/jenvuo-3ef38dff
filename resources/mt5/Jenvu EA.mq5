//+------------------------------------------------------------------+
//| Jenvu EA.mq5 - Jenvu V3 Expert Advisor for MT5                 |
//| Input layout follows the ClevrFX V3 presets so the same .set      |
//| files load directly. Adds Jenvu license check (account-bound)     |
//| and a built-in daily drawdown guard. Single file, no DLLs.        |
//+------------------------------------------------------------------+
#property copyright "Jenvu"
#property link      "https://jenvu.com"
#property version   "4.08"
#property description "Jenvu EA - single-cluster entries, confirmed M15 invalidation and daily drawdown guard."
#include <Trade\Trade.mqh>

//--- enums ----------------------------------------------------------
enum ENUM_JV_STRAT  { STRAT_RSI = 0, STRAT_MA = 1, STRAT_RSI_MA = 2, STRAT_SEMI = 3 };
// lot sizing: always auto — lot scales with account balance
enum ENUM_JV_LCUT   { LC_NONE = 0, LC_MONEY = 1, LC_PERCENT = 2 };

//--- Jenvu license & daily drawdown --------------------------------
//string LICENSE         = "======= JENVU LICENSE =======";
input string MyIP            = "";     // License: your PC/RDP IP (same as added on jenvu.com)
const double DailyDrawdownPct = 4.7;   // Daily drawdown % (of the day's peak closed balance: start + closed profit)
double DailyTargetPct = 0.0;  // LOCKED: set from plan by jenvu.com (Pro 2%, Elite 4%, Ultra 6%)
const bool   UsePlanDailyTarget = true; // LOCKED: stop for the day when plan daily target is reached (server-enforced)
const int ClusterSize  = 1;    // One consolidated order per signal; no recovery
string LicenseUrl      = "https://jenvu.com/api/public/licenses/validate"; // License server URL
string ReportUrl       = "https://jenvu.com/api/public/licenses/report";   // Bot usage report URL

//--- general --------------------------------------------------------
bool         allowBuy  = true;      // Allow buy
bool         allowSell = true;      // Allow sell
ENUM_JV_STRAT strattype = (ENUM_JV_STRAT)1; // Strategy (0 RSI, 1 MA, 2 RSI+MA, 3 Semi auto)

//string ORDER           = "======= ORDER SETTINGS ======";
input double lotSize         = 0.05;     // Auto lot per 1000 balance (0.05 per $1,000)
bool   WaitFreshCandleOnAttach = true; // No entry on the candle the bot was attached
double takeprofit      = 5.0;       // Every basket: EA-managed take profit in EURUSD pips from average price
double lotMul          = 1.2;       // Grid lot multiplier
double lotMax          = 0.0;       // Max lot per trade (0 = no limit)
int    mulSkip         = 3;         // Trades before multiplier starts
double dist2           = 20.0;      // Distance for 2nd trade (points)
double dist3           = 1.5;       // Distance multiplier from 3rd trade
double dist4           = 2.0;       // Distance multiplier from 4th trade on

//string PROFIT_PROTECT  = "===== PROFIT PROTECTION =====";
bool   UseProfitLock     = true;  // Lock profit once the basket reaches LockStartMoney
double LockStartMoney    = 20.0;  // Start locking at this basket profit ($)
double LockKeepMoney     = 15.0;  // Never let a locked basket fall below this profit ($)
double LockTrailPct      = 30.0;  // Close if profit gives back this % of its peak
bool   UseDynamicLock    = true;  // Lock start = LockTargetPct of today's plan target (any account size)
double LockTargetPct     = 60.0;  // Start locking at this % of the daily target
double LockKeepPct       = 45.0;  // Never let a locked basket fall below this % of the daily target
bool   UseReversalClose  = false;  // Close a profitable basket on a closed opposite engulfing candle
bool   UseTrendFlipClose = false;  // Close a profitable basket when the H1 trend turns against it
double MinCloseMoney     = 3.0;   // Reversal / trend-flip close only if basket profit >= this ($)

//string RISK_MANAGEMENT = "====== RISK MANAGEMENT =====";
bool   oneTradePerCandle = true;    // One trade per candle
bool   allowHedge      = true;      // Allow buy and sell baskets together
double maxspread       = 20.0;      // Max spread in points (20 = 2 pips on 5-digit EURUSD, 0 = off)
int    tradeLimit      = 3;        // Max trades per basket (0 = no limit)
int    maxPairs        = 0;         // Max symbols trading at once (0 = no limit)

//string LOSS_CUT        = "========= LOSS CUT =========";
ENUM_JV_LCUT lossCutType = (ENUM_JV_LCUT)2; // Loss cut (0 off, 1 money, 2 % of balance)
double lcvalue         = 10.0;    // Loss cut value

//string DD_RECOVERY     = "======== DD RECOVERY ========";
bool   ddRecovery      = false;      // Enable drawdown recovery
int    ddrCount        = 3;         // Start recovery after this many grid levels (1 level = ClusterSize trades)
double ddrProfit       = 1.0;       // Close basket at this profit (money) in recovery

//string RSI_            = "======= RSI SETTINGS ========";
int    rsiperiod       = 15;         // RSI period
int    rsiprice        = 0;         // RSI price (0 close,1 open,2 high,3 low,4 median,5 typical,6 weighted)
double roverbought     = 80.0;      // RSI overbought
double roversold       = 20.0;      // RSI oversold

//string MA_             = "======== MA SETTINGS ========";
int    ma1period       = 10;         // MA period
int    ma1shift        = 0;         // MA shift
int    ma1method       = 0;         // MA method (0 SMA,1 EMA,2 SMMA,3 LWMA)
int    ma1price        = 0;         // MA price (0 close ... 6 weighted)

//string TREND_FILTER    = "====== FAKEOUT FILTER ======";
bool   UseH1TrendFilter   = true;  // Only trade in the direction of the H1 200 EMA
int    h1EmaPeriod        = 200;   // H1 trend EMA period
bool   UseRsiMomentumGate = true;  // Buy only if RSI > 50, sell only if RSI < 50 (on the trend timeframe)
bool   UseH1FastEma       = true;  // H1 lock: price must also be on the trade side of the H1 50 EMA
int    h1FastEmaPeriod    = 50;    // H1 fast EMA period
double RsiDeadZone        = 2.0;   // H1 RSI neutral zone around 50 (2 = no trades between 48 and 52)
bool   UseM15EmaAlign     = true;  // M15 trap guard: EMA21 and EMA50 must line up with the trade
int    m15FastEma         = 21;    // M15 fast EMA
int    m15SlowEma         = 50;    // M15 baseline EMA

//string ENTRY_QUALITY   = "====== ENTRY QUALITY ======";
bool   UseStretchFilter   = true;  // Skip entries when price is stretched too far from the MA
double MaxStretchATR      = 1.5;   // Max distance from MA, in ATR(14) multiples
bool   UseWickFilter      = true;  // Skip entries when the last candle shows a strong rejection wick against the trade
double MaxWickPct         = 60.0;  // Rejection wick size (% of candle range) that blocks the entry
bool   UseBodyConfirm     = true;  // Signal candle must close in the trade direction with a real body
double MinBodyPct         = 35.0;  // Min candle body (% of candle range) for the signal candle
bool   UseSpikeGuard      = true;  // Skip entries right after an abnormal spike candle
double MaxSpikeATR        = 2.5;   // Spike = last candle range bigger than this many ATR(14)

//string TIME_MANAGEMNET = "====== TIME MANAGEMENT ======";
bool   use_date        = true;      // Use trading hours
string startTime       = "0:00";    // Start time (server) - trading hours are set by the UTC windows below
string endTime         = "24:00";   // End time (server) - trading hours are set by the UTC windows below
string fridayEndTime   = "13:00";   // Friday: no new trades after this (server)
bool   blockKillzones  = true;      // Block new entries at London/NY open (UTC)
string londonBlockUTC  = "6:15-7:30";   // No new trades 06:15-07:30 UTC (11:15 AM-12:30 PM PKT, London pre-open trap)
string nyBlockUTC      = "12:00-23:00"; // No new trades 12:00-23:00 UTC (5:00 PM-4:00 AM PKT, New York session OFF, Asia starts 4:00 AM PKT)
bool   UsePreSessionBE  = false;         // v4.06: legacy break-even also OFF
double PreSessionBEPips = 1.0;           // Break-even buffer kept above the basket average (pips, covers spread)
string preSessionBEUTC = "6:15-9:00";   // Pre-session break-even window (UTC), same as before v4.02
//string AUTO_BE       = "===== AUTO BREAK-EVEN (all day) =====";
bool   UseAutoBE       = false;         // All-day break-even stays OFF; basket TP is 5 pips
double AutoBETrigPips  = 2.0;           // Arm when price is this many pips beyond the basket average (spread already paid)
double AutoBELockPips  = 0.5;           // Then close the basket if price comes back to average + this many pips
bool   UseTrailStep    = false;         // v4.04: OFF together with auto break-even
double TrailStepTrigPips = 3.5;         // Step 2 arms when price is this many pips beyond the basket average
double TrailStepLockPips = 2.0;         // Then close the basket if price comes back to average + this many pips
//string STRUCT_EXIT   = "===== M15 STRUCTURE EXIT =====";
const bool UseStructureExit = true;     // Same confirmed exit in profit OR loss
int    StructLookback   = 50;           // Search up to 50 pre-entry M15 pivot candidates, newest first
double StructMinBodyPct = 50.0;         // Break candle needs a real body (% of its range): wicks and sweeps never count
double StructDispATR    = 0.2;          // v4.04 stronger: break candle must CLOSE at least this many M15 ATR(14) beyond the swing (was 0.5)
bool   StructH1Confirm  = false;        // v4.04 stronger: no H1 wait - the M15 break alone cuts the losing basket
// v4.07 Layer 1: Trap Shield - never SELL into active bullish FVG / demand, never BUY into active bearish FVG / supply
bool   UseTrapShield    = true;
int    ShieldLookback   = 20;           // Closed M15 candles scanned for FVGs and zones
double ShieldNearATR    = 1.0;          // Block when price is inside the zone or within this many M15 ATR of it
double FvgNearATR       = 0.2;          // v4.08: tighter FVG-only buffer; supply/demand keeps ShieldNearATR
double ShieldMinGapATR  = 0.1;          // Ignore tiny FVGs smaller than this many ATR
double ZoneImpulseATR   = 1.0;          // Demand/supply needs an impulse candle body of at least this many ATR
bool   UseFvgProfitGuard = true;        // Only an opposing active FVG touch can arm this exit
double FvgGuardTrigPips  = 3.5;         // Minimum executable-quote profit at FVG touch
double FvgGuardLockPips  = 2.0;         // Virtual floor after arming; not a guaranteed fill price
// v4.07 Layer 2: local verified invalidation - anchor = extreme of the 5 closed M15 candles before entry
bool   UseLocalInvalidation = true;
int    LocalAnchorBars  = 5;
double LocalDispATR     = 0.1;          // Break candle must CLOSE this many ATR beyond the local anchor (wicks never count)
bool   UseSessionProfitLock = true;      // Close green baskets 15 min before London (06:00) and NY (12:00) open
string londonLockUTC   = "5:45-6:15";  // Pre-London profit lock window (UTC)
string nyLockUTC       = "11:45-12:15"; // Pre-NY profit lock window (UTC)
double SessionLockMinMoney = 0.5;       // Basket must be at least this much in profit ($) to be closed
bool   UseFridayProfitClose = true;      // Friday: book green baskets from this UTC time (weekend gap guard)
string fridayCloseUTC  = "18:00";       // Friday green-basket close time (UTC)
bool   UseNewsProfitLock = true;         // Book a green basket when a high-impact news window starts

//string DAY_MANAGEMNET  = "======= DAY MANAGEMENT =======";
bool   monday          = true;
bool   tuesday         = true;
bool   wednesday       = true;
bool   thursday        = true;
bool   friday          = true; 

//string OTHER           = "======= OTHER SETTINGS ======";
bool   highRes         = false;     // Check signals every tick (false = new candle only)
int    dbtype          = 0;         // Dashboard type (0 full, 1 compact)
bool   showCandleProf  = true;      // Show basket profit on chart
input long   magic           = 9244;      // Magic number

//string NEWS            = "======== NEWS ========";
int    closeBefore     = 15;        // Stop new trades minutes before news
int    startAfter      = 30;        // Resume minutes after news
string currencies      = "USD,EUR"; // News currencies

//string NEWS_IMPACT     = "======= IMPACT =======";
bool   highImpact      = true;      // Filter high impact news
bool   medImpact       = false;     // Filter medium impact news
bool   lowImpact       = false;     // Filter low impact news

//string NEWS_COLORS     = "======= COLORS ========";
color  clrHighNews     = (color)255;    // High news color
color  clrMedNews      = (color)42495; // Medium news color
color  clrLowNews      = (color)65535; // Low news color

//string NEWS_BOX        = "====== NEWS BOX ======";
bool   showNewsBox     = false;      // Show news box
bool   showBg          = true;      // Create background box
color  bgcolor         = (color)16777215;  // Background color
string panelFont       = "Poppins"; // Panel font (install Poppins font on your PC)
int    panelTop        = 130;       // Panel distance from chart top (pixels)
int    newsCount       = 5;         // Number of news


//string NEWS_LINES      = "====== NEWS LINES ======";
bool   showNewsLines   = true;      // Show news lines on chart
bool   showText        = false;      // Show news text on lines

//+------------------------------------------------------------------+
//| Daily drawdown guard                                             |
//+------------------------------------------------------------------+
class CJenvuDailyDD
  {
private:
   CTrade m_trade;
   string m_gvStart, m_gvDay, m_gvLocked, m_gvDone, m_gvPeak;
public:
   double DailyTarget;   // set from license server (plan monthly / 20)
private:
   long   DayKey(datetime t) { MqlDateTime d; TimeToStruct(t, d); return d.year*10000 + d.mon*100 + d.day; }
public:
   void Init()
     {
      string acc = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
      m_gvStart  = "JENVU_DD_START_"  + acc;
      m_gvDay    = "JENVU_DD_DAY_"    + acc;
      m_gvLocked = "JENVU_DD_LOCKED_" + acc;
      m_gvDone   = "JENVU_TGT_DONE_"  + acc;
      m_gvPeak   = "JENVU_DD_PEAK_"   + acc;
      Update();
     }
   double StartBalance() { return GlobalVariableGet(m_gvStart); }
   // Drawdown reference: highest closed balance today (start + profit already closed), never below start
   double PeakBalance()  { return MathMax(StartBalance(), GlobalVariableGet(m_gvPeak)); }
   double LimitAmount()  { return PeakBalance() * DailyDrawdownPct / 100.0; }
   double FloorEquity()  { return PeakBalance() - LimitAmount(); }
   bool   IsLocked()     { return GlobalVariableGet(m_gvLocked) > 0.5 || TargetDone(); }
   bool   TargetDone()   { return GlobalVariableGet(m_gvDone) > 0.5; }
   double PctTarget()    { return DailyTargetPct > 0 ? StartBalance() * DailyTargetPct / 100.0 : 0; }
   double EffTarget()    { double a = (UsePlanDailyTarget ? DailyTarget : 0), b = PctTarget(); if(a > 0 && b > 0) return MathMin(a, b); return MathMax(a, b); }
   double TodayProfit()  { return AccountInfoDouble(ACCOUNT_EQUITY) - StartBalance(); }
   void CloseAll()
     {
      for(int i = PositionsTotal() - 1; i >= 0; i--)
        { ulong t = PositionGetTicket(i); if(t > 0) m_trade.PositionClose(t); }
     }
   void Update()
     {
      long today = DayKey(TimeTradeServer());
      if(!GlobalVariableCheck(m_gvDay) || (long)GlobalVariableGet(m_gvDay) != today)
        {
         GlobalVariableSet(m_gvDay, (double)today);
         GlobalVariableSet(m_gvStart, AccountInfoDouble(ACCOUNT_BALANCE));
         GlobalVariableSet(m_gvPeak, AccountInfoDouble(ACCOUNT_BALANCE));
         GlobalVariableSet(m_gvLocked, 0);
         GlobalVariableSet(m_gvDone, 0);
         Print("Jenvu DD: new day, start balance ", DoubleToString(StartBalance(), 2),
               ", limit ", DoubleToString(LimitAmount(), 2));
        }
      double bal = AccountInfoDouble(ACCOUNT_BALANCE);
      if(!GlobalVariableCheck(m_gvPeak) || bal > GlobalVariableGet(m_gvPeak))
         GlobalVariableSet(m_gvPeak, MathMax(bal, StartBalance()));
      if(IsLocked()) { if(PositionsTotal() > 0) CloseAll(); return; }
      if(EffTarget() > 0 && StartBalance() > 0 && TodayProfit() >= EffTarget())
        {
         GlobalVariableSet(m_gvDone, 1);
         CloseAll();
         Print("Jenvu: daily profit target ", DoubleToString(EffTarget(), 2), " reached (", DoubleToString(TodayProfit(), 2), "). Trading stopped until next day.");
         return;
        }
      if(DailyDrawdownPct <= 0) return;
      double loss = PeakBalance() - AccountInfoDouble(ACCOUNT_EQUITY);
      if(StartBalance() > 0 && loss >= LimitAmount())
        {
         GlobalVariableSet(m_gvLocked, 1);
         CloseAll();
         Print("Jenvu DD: daily limit hit (", DoubleToString(loss, 2), " below today's peak balance ", DoubleToString(PeakBalance(), 2), "). Trading stopped until next day.");
        }
     }
   bool CanTrade() { Update(); return !IsLocked(); }
   // Daily drawdown reached on jenvu.com's numbers (same peak-balance rule): lock for the day
   void ServerLock()
     {
      if(GlobalVariableGet(m_gvLocked) > 0.5) return;
      GlobalVariableSet(m_gvLocked, 1);
      CloseAll();
      Print("Jenvu DD: daily limit reached (jenvu.com). Trading stopped until next day.");
     }
   // Shared plan target reached across all of this user's accounts (told by jenvu.com)
   void SharedStop()
     {
      if(TargetDone()) return;
      GlobalVariableSet(m_gvDone, 1);
      CloseAll();
      Print("Jenvu: plan daily target reached across all your accounts. Trading stopped until next day.");
     }
  };

//--- globals --------------------------------------------------------
CTrade        trade;
CJenvuDailyDD dd;
int      hRSI = INVALID_HANDLE, hMA = INVALID_HANDLE, hH1EMA = INVALID_HANDLE, hH1RSI = INVALID_HANDLE, hATR = INVALID_HANDLE,
         hH1Fast = INVALID_HANDLE, hM15Fast = INVALID_HANDLE, hM15Slow = INVALID_HANDLE;
bool     g_licensed = false;
datetime g_lastReport = 0;
datetime g_lastCheck = 0, g_lastBuyBar = 0, g_lastSellBar = 0, g_lastNewsLoad = 0;
bool     g_beBuy = false, g_beSell = false;   // pre-session break-even lock armed per side
bool     g_aeBuy = false, g_aeSell = false;   // all-day auto break-even armed per side
bool     g_tsBuy = false, g_tsSell = false;   // trailing step lock (+3.5 -> +2.0 pips) armed per side
bool g_exitBuy = false, g_exitSell = false; // latch invalidation until every owned position is closed
struct FvgGuardState { string key; double previousQuote; bool armed; bool pending; };
FvgGuardState g_fvgBuy, g_fvgSell;
int      hM15ATR = INVALID_HANDLE;            // M15 ATR(14) for the structure exit
string   g_status = "";
const string PFX = "JENVU_";

struct NewsItem { datetime time; string cur; string name; int imp; };
NewsItem g_news[];

//+------------------------------------------------------------------+
//| Helpers                                                          |
//+------------------------------------------------------------------+
ENUM_APPLIED_PRICE MapPrice(int v)
  {
   switch(v)
     {
      case 1: return PRICE_OPEN;   case 2: return PRICE_HIGH;    case 3: return PRICE_LOW;
      case 4: return PRICE_MEDIAN; case 5: return PRICE_TYPICAL; case 6: return PRICE_WEIGHTED;
     }
   return PRICE_CLOSE;
  }
ENUM_MA_METHOD MapMethod(int v)
  {
   switch(v) { case 1: return MODE_EMA; case 2: return MODE_SMMA; case 3: return MODE_LWMA; }
   return MODE_SMA;
  }
int ParseMinutes(string s)
  {
   string p[]; if(StringSplit(s, ':', p) < 1) return 0;
   int h = (int)StringToInteger(p[0]); int m = ArraySize(p) > 1 ? (int)StringToInteger(p[1]) : 0;
   return h * 60 + m;
  }

bool CheckLicense()
  {
   if(MQLInfoInteger(MQL_TESTER) || MQLInfoInteger(MQL_OPTIMIZATION)) { Print("Jenvu: Strategy Tester - license check skipped"); return true; }
   string acc  = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   string body = "{\"ip\":\"" + MyIP + "\",\"mt5_account\":\"" + acc + "\"}";
   char post[], res[]; string hdr;
   StringToCharArray(body, post, 0, StringLen(body), CP_UTF8);
   ResetLastError();
   int code = WebRequest("POST", LicenseUrl, "Content-Type: application/json\r\n", 8000, post, res, hdr);
   if(code == -1)
     { Print("Jenvu: license server not reachable (", GetLastError(), "). Add https://jenvu.com in Tools > Options > Expert Advisors > Allow WebRequest."); return false; }
   string txt = CharArrayToString(res, 0, WHOLE_ARRAY, CP_UTF8);
   bool ok = StringFind(txt, "\"valid\":true") >= 0;
   if(ok)
     {
      int k = StringFind(txt, "\"daily_target\":");
      if(k >= 0) dd.DailyTarget = StringToDouble(StringSubstr(txt, k + 15, 20));
      dd.DailyTarget = 0; // plan $ target replaced by fixed plan % of balance
      if(StringFind(txt, "\"plan\":\"pro\"") >= 0)        DailyTargetPct = 2.0;
      else if(StringFind(txt, "\"plan\":\"elite\"") >= 0) DailyTargetPct = 4.0;
      else if(StringFind(txt, "\"plan\":\"ultra\"") >= 0) DailyTargetPct = 6.0;
      else DailyTargetPct = 2.0;
      Print("Jenvu plan daily profit target: ", DoubleToString(DailyTargetPct, 1), "% of start-of-day balance");
     }
   Print("Jenvu license: ", ok ? "VALID" : "INVALID", " (MT5 account ", acc, ")");
   if(!ok)
     {
      if(StringFind(txt, "account_mismatch") >= 0) Print("Jenvu: this IP is already used by another MT5 account. One IP = one account.");
      else if(StringFind(txt, "ip_mismatch") >= 0) Print("Jenvu: MyIP does not match this PC/RDP real IP. Check whatismyip.com and update it on jenvu.com.");
      else if(StringFind(txt, "expired") >= 0) Print("Jenvu: your license has expired. Renew it at jenvu.com.");
      else if(StringFind(txt, "revoked") >= 0) Print("Jenvu: this license is disabled. Contact support at jenvu.com.");
      else if(StringFind(txt, "not_found") >= 0 || StringFind(txt, "malformed") >= 0) Print("Jenvu: IP not registered. Add this IP on jenvu.com > JX Bot and type it in MyIP.");
      else Print("Jenvu: license check failed (HTTP ", code, "). Try again later.");
     }
   return ok;
  }

//--- send balance / profit / trades to jenvu.com (Bot Usage page + shared daily target)
int TradesToday()
  {
   MqlDateTime d; TimeToStruct(TimeTradeServer(), d); d.hour = 0; d.min = 0; d.sec = 0;
   if(!HistorySelect(StructToTime(d), TimeTradeServer() + 60)) return 0;
   int n = 0;
   for(int i = HistoryDealsTotal() - 1; i >= 0; i--)
     {
      ulong t = HistoryDealGetTicket(i);
      if(t > 0 && HistoryDealGetInteger(t, DEAL_MAGIC) == magic && HistoryDealGetInteger(t, DEAL_ENTRY) == DEAL_ENTRY_IN) n++;
     }
   return n;
  }
string DeinitName(int r)
  {
   switch(r)
     {
      case REASON_REMOVE: return "remove";      case REASON_RECOMPILE: return "recompile";
      case REASON_CHARTCHANGE: return "chartchange"; case REASON_CHARTCLOSE: return "chartclose";
      case REASON_PARAMETERS: return "parameters"; case REASON_ACCOUNT: return "account";
      case REASON_TEMPLATE: return "template";  case REASON_INITFAILED: return "initfailed";
      case REASON_CLOSE: return "close";
     }
   return "program";
  }
void ReportStatus(string event = "", string reason = "")
  {
   if(MQLInfoInteger(MQL_TESTER) || MQLInfoInteger(MQL_OPTIMIZATION)) return;   // no web reports in tester
   string acc = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   int open = 0; double lots = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     { ulong t = PositionGetTicket(i); if(t > 0) { open++; lots += PositionGetDouble(POSITION_VOLUME); } }
   string body = StringFormat("{\"ip\":\"%s\",\"mt5_account\":\"%s\",\"symbol\":\"%s\",\"balance\":%.2f,\"equity\":%.2f,\"today_profit\":%.2f,\"trades_today\":%d,\"open_trades\":%d,\"open_lots\":%.2f,\"target_hit\":%s,\"event\":\"%s\",\"reason\":\"%s\"}",
      MyIP, acc, _Symbol, AccountInfoDouble(ACCOUNT_BALANCE), AccountInfoDouble(ACCOUNT_EQUITY), dd.TodayProfit(),
      TradesToday(), open, lots, dd.TargetDone() ? "true" : "false", event, reason);
   char post[], res[]; string hdr;
   StringToCharArray(body, post, 0, StringLen(body), CP_UTF8);
   if(WebRequest("POST", ReportUrl, "Content-Type: application/json\r\n", 8000, post, res, hdr) == -1) return;
   string txt = CharArrayToString(res, 0, WHOLE_ARRAY, CP_UTF8);
   if(event == "stop") return;
   if(StringFind(txt, "\"valid\":false") >= 0) { g_licensed = false; return; }
   int k = StringFind(txt, "\"daily_target\":");
   if(k >= 0) dd.DailyTarget = 0; // fixed plan % target only
   if(StringFind(txt, "\"stop\":true") >= 0)
     {
      if(StringFind(txt, "\"stop_reason\":\"drawdown\"") >= 0) dd.ServerLock();
      else if(UsePlanDailyTarget) dd.SharedStop();
     }
  }

//--- basket info for one side ---------------------------------------
struct Basket { int count; int levels; double lots; double wsum; double profit; double lastPrice; double lastLot; };

void GetBasket(ENUM_POSITION_TYPE type, Basket &b)
  {
   b.count = 0; b.levels = 0; b.lots = 0; b.wsum = 0; b.profit = 0; b.lastPrice = 0; b.lastLot = 0;
   datetime last = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong t = PositionGetTicket(i); if(t == 0) continue;
      if(PositionGetInteger(POSITION_MAGIC) != magic || PositionGetString(POSITION_SYMBOL) != _Symbol) continue;
      if((ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE) != type) continue;
      double v = PositionGetDouble(POSITION_VOLUME), p = PositionGetDouble(POSITION_PRICE_OPEN);
      b.count++; b.lots += v; b.wsum += v * p;
      b.profit += PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);
      datetime ot = (datetime)PositionGetInteger(POSITION_TIME);
      if(ot >= last) { last = ot; b.lastPrice = p; b.lastLot = v; }
     }
  }

void CloseSide(ENUM_POSITION_TYPE type)
  {
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong t = PositionGetTicket(i); if(t == 0) continue;
      if(PositionGetInteger(POSITION_MAGIC) != magic || PositionGetString(POSITION_SYMBOL) != _Symbol) continue;
      if((ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE) == type)
        {
         if(!trade.PositionClose(t) || (trade.ResultRetcode() != TRADE_RETCODE_DONE && trade.ResultRetcode() != TRADE_RETCODE_DONE_PARTIAL))
            Print("Jenvu: close not completed, ticket ", t, " retcode ", trade.ResultRetcode(), " ", trade.ResultRetcodeDescription());
        }
     }
  }

int ActiveSymbols()
  {
   string seen = ";";
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      if(PositionGetTicket(i) == 0 || PositionGetInteger(POSITION_MAGIC) != magic) continue;
      string s = PositionGetString(POSITION_SYMBOL);
      if(StringFind(seen, ";" + s + ";") < 0) seen += s + ";";
     }
   string p[]; return MathMax(0, StringSplit(seen, ';', p) - 2);
  }

double NormLot(double lot)
  {
   double step = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   double mn = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN), mx = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   if(lotMax > 0) mx = MathMin(mx, lotMax);
   lot = MathFloor(lot / step + 1e-9) * step;
   return NormalizeDouble(MathMax(mn, MathMin(mx, lot)), 2);
  }

double BaseLot()
  {
   // Always auto: lot scales with balance, clamped to broker min/max by NormLot()
   return NormLot(lotSize * AccountInfoDouble(ACCOUNT_BALANCE) / 1000.0);
  }

// price unit for TP / grid: 1 point on 2-digit gold, 10 points on 3/5-digit quotes (Exness XAUUSD)
double PU() { int d = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS); return (d == 3 || d == 5) ? _Point * 10.0 : _Point; }

int Levels(const Basket &b) { int c = MathMax(1, ClusterSize); return (b.count + c - 1) / c; }

double NextLot(const Basket &b)
  {
   if(b.count == 0) return BaseLot();
   if(Levels(b) < mulSkip) return NormLot(b.lastLot);
   return NormLot(b.lastLot * lotMul);
  }

// distance (price) required before adding trade number n+1
double GridDistance(int count)
  {
   double d = dist2;
   if(count >= 2) d *= dist3;
   if(count >= 3) d *= MathPow(dist4, count - 2);
   return d * PU();
  }

//--- filters ---------------------------------------------------------
bool InBlockUTC(string range, int now)
  {
   string parts[]; if(StringSplit(range, '-', parts) != 2) return false;
   int s = ParseMinutes(parts[0]), e = ParseMinutes(parts[1]);
   if(s <= e) return now >= s && now < e;
   return now >= s || now < e;
  }

bool TimeAllowed()
  {
   // Weekend: market is closed Saturday and Sunday - never open new trades (server time and UTC)
   MqlDateTime ws; TimeToStruct(TimeTradeServer(), ws);
   MqlDateTime wg; TimeToStruct(TimeGMT(), wg);
   if(ws.day_of_week == 0 || ws.day_of_week == 6 || wg.day_of_week == 0 || wg.day_of_week == 6) return false;
   if(blockKillzones)
     {
      MqlDateTime g; TimeToStruct(TimeGMT(), g);
      int gnow = g.hour * 60 + g.min;
      if(InBlockUTC(londonBlockUTC, gnow) || InBlockUTC(nyBlockUTC, gnow)) return false;
     }
   MqlDateTime t; TimeToStruct(TimeTradeServer(), t);
   bool day = (t.day_of_week == 1 && monday) || (t.day_of_week == 2 && tuesday) || (t.day_of_week == 3 && wednesday) ||
              (t.day_of_week == 4 && thursday) || (t.day_of_week == 5 && friday);
   if(!day) return false;
   if(!use_date) return true;
   int now = t.hour * 60 + t.min, s = ParseMinutes(startTime), e = ParseMinutes(endTime);
   if(t.day_of_week == 5 && fridayEndTime != "") { int fe = ParseMinutes(fridayEndTime); if(fe < e || s > e) e = fe; if(s <= e && now >= fe) return false; }
   if(s <= e) return now >= s && now < e;
   return now >= s || now < e;   // overnight window, e.g. 23:00 - 10:00
  }

bool ImpactOn(int imp) { return (imp == 3 && highImpact) || (imp == 2 && medImpact) || (imp == 1 && lowImpact); }

void LoadNews()
  {
   ArrayResize(g_news, 0);
   if(MQLInfoInteger(MQL_TESTER)) return;   // calendar not available in tester
   datetime from = TimeTradeServer() - 6 * 3600, to = TimeTradeServer() + 3 * 86400;
   string cur[]; int n = StringSplit(currencies, ',', cur);
   for(int c = 0; c < n; c++)
     {
      StringTrimLeft(cur[c]); StringTrimRight(cur[c]);
      MqlCalendarValue vals[];
      if(CalendarValueHistory(vals, from, to, NULL, cur[c]) <= 0) continue;
      for(int i = 0; i < ArraySize(vals); i++)
        {
         MqlCalendarEvent ev; if(!CalendarEventById(vals[i].event_id, ev)) continue;
         int imp = (int)ev.importance; // 1 low, 2 moderate, 3 high
         if(!ImpactOn(imp)) continue;
         int k = ArraySize(g_news); ArrayResize(g_news, k + 1);
         g_news[k].time = vals[i].time; g_news[k].cur = cur[c]; g_news[k].name = ev.name; g_news[k].imp = imp;
        }
     }
   // sort by time
   for(int a = 0; a < ArraySize(g_news) - 1; a++)
      for(int b = a + 1; b < ArraySize(g_news); b++)
         if(g_news[b].time < g_news[a].time) { NewsItem tmp = g_news[a]; g_news[a] = g_news[b]; g_news[b] = tmp; }
   g_lastNewsLoad = TimeCurrent();
  }

bool NewsBlocked(string &why)
  {
   datetime now = TimeTradeServer();
   for(int i = 0; i < ArraySize(g_news); i++)
      if(now >= g_news[i].time - closeBefore * 60 && now <= g_news[i].time + startAfter * 60)
        { why = g_news[i].cur + " " + g_news[i].name; return true; }
   return false;
  }

color ImpColor(int imp) { return imp == 3 ? clrHighNews : (imp == 2 ? clrMedNews : clrLowNews); }

//--- chart drawing ----------------------------------------------------
void Label(string name, int x, int y, string text, color c, int size = 9)
  {
   string n = PFX + name;
   if(ObjectFind(0, n) < 0)
     {
      ObjectCreate(0, n, OBJ_LABEL, 0, 0, 0);
      ObjectSetInteger(0, n, OBJPROP_CORNER, CORNER_LEFT_UPPER);
      ObjectSetString(0, n, OBJPROP_FONT, panelFont);
      ObjectSetInteger(0, n, OBJPROP_SELECTABLE, false);
     }
   ObjectSetInteger(0, n, OBJPROP_XDISTANCE, x); ObjectSetInteger(0, n, OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0, n, OBJPROP_FONTSIZE, size); ObjectSetInteger(0, n, OBJPROP_COLOR, c);
   ObjectSetString(0, n, OBJPROP_TEXT, text);
  }

void Panel(int x, int y, int w, int h)
  {
   string n = PFX + "BG";
   if(!showBg) { ObjectDelete(0, n); return; }
   if(ObjectFind(0, n) < 0)
     {
      ObjectCreate(0, n, OBJ_RECTANGLE_LABEL, 0, 0, 0);
      ObjectSetInteger(0, n, OBJPROP_BORDER_TYPE, BORDER_FLAT);
      ObjectSetInteger(0, n, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, n, OBJPROP_BACK, false);
     }
   ObjectSetInteger(0, n, OBJPROP_XDISTANCE, x); ObjectSetInteger(0, n, OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0, n, OBJPROP_XSIZE, w); ObjectSetInteger(0, n, OBJPROP_YSIZE, h);
   ObjectSetInteger(0, n, OBJPROP_BGCOLOR, bgcolor); ObjectSetInteger(0, n, OBJPROP_COLOR, clrSilver);
  }

void DrawNewsLines()
  {
   ObjectsDeleteAll(0, PFX + "NL_");
   if(!showNewsLines) return;
   for(int i = 0; i < ArraySize(g_news); i++)
     {
      string n = PFX + "NL_" + IntegerToString(i);
      ObjectCreate(0, n, OBJ_VLINE, 0, g_news[i].time, 0);
      ObjectSetInteger(0, n, OBJPROP_COLOR, ImpColor(g_news[i].imp));
      ObjectSetInteger(0, n, OBJPROP_STYLE, STYLE_DOT);
      ObjectSetInteger(0, n, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, n, OBJPROP_BACK, true);
      if(showText) ObjectSetString(0, n, OBJPROP_TEXT, g_news[i].cur + " " + g_news[i].name);
     }
  }

void DrawDashboard(const Basket &buy, const Basket &sell)
  {
   int x = 12, y = panelTop, line = 16, row = 0;

   bool compact = (dbtype == 1);
   int rows = compact ? 5 : 9;
   int shown = 0;
   if(showNewsBox) shown = MathMin(newsCount, ArraySize(g_news));
   int h = (rows + (showNewsBox ? shown + 1 : 0)) * line + 16;
   Panel(x - 6, y - 8, 330, h);

   Label("T0", x, y + line * row++, "JENVU EA  |  " + _Symbol, clrRoyalBlue, 10);
   Label("T1", x, y + line * row++, "License: " + (g_licensed ? "ACTIVE" : "INVALID"), g_licensed ? clrGreen : clrRed);
   Label("T2", x, y + line * row++, "Status: " + g_status, clrBlack);
   string ddTxt = dd.TargetDone() ? "Daily target reached - resumes tomorrow" : dd.IsLocked() ? "LOCKED until next day" :
                  StringFormat("%.1f%% of peak %.2f (cut at %.2f)", DailyDrawdownPct, dd.PeakBalance(), dd.FloorEquity());
   Label("T3", x, y + line * row++, "Daily DD: " + ddTxt, dd.TargetDone() ? clrGreen : dd.IsLocked() ? clrRed : clrDimGray);
   Label("T8", x, y + line * row++, StringFormat("Daily target: %.2f  Today: %.2f", dd.EffTarget(), dd.TodayProfit()), clrRoyalBlue);
   if(!compact)
     {
      Label("T4", x, y + line * row++, StringFormat("Buy: %d trades  %.2f lots  %.2f", buy.count, buy.lots, buy.profit), clrDimGray);
      Label("T5", x, y + line * row++, StringFormat("Sell: %d trades  %.2f lots  %.2f", sell.count, sell.lots, sell.profit), clrDimGray);
      Label("T6", x, y + line * row++, StringFormat("Balance: %.2f  Equity: %.2f", AccountInfoDouble(ACCOUNT_BALANCE), AccountInfoDouble(ACCOUNT_EQUITY)), clrDimGray);
      Label("T7", x, y + line * row++, showCandleProf ? StringFormat("Open profit: %.2f", buy.profit + sell.profit) : " ", clrDarkOrange);
     }
   else { ObjectsDeleteAll(0, PFX + "T4"); ObjectsDeleteAll(0, PFX + "T5"); ObjectsDeleteAll(0, PFX + "T6"); ObjectsDeleteAll(0, PFX + "T7"); }

   ObjectsDeleteAll(0, PFX + "N_");
   if(showNewsBox)
     {
      Label("N_H", x, y + line * row++, shown > 0 ? "Upcoming news:" : "No filtered news", clrBlack);
      for(int i = 0; i < shown; i++)
         Label("N_" + IntegerToString(i), x, y + line * row++,
               TimeToString(g_news[i].time, TIME_DATE | TIME_MINUTES) + "  " + g_news[i].cur + "  " + g_news[i].name,
               ImpColor(g_news[i].imp), 8);
     }
   ChartRedraw();
  }

//--- signals ----------------------------------------------------------
// returns +1 buy, -1 sell, 0 none
int RawSignal();
// Fakeout filter: blocks signals against the H1 trend / momentum
bool TrendAllows(int dir)
  {
   if(dir == 0) return false;
   if(UseH1TrendFilter)
     {
      double e[1]; if(CopyBuffer(hH1EMA, 0, 1, 1, e) < 1) return false;
      double c = iClose(_Symbol, PERIOD_H1, 1);
      if(dir > 0 && c <= e[0]) return false;
      if(dir < 0 && c >= e[0]) return false;
     }
   if(UseRsiMomentumGate)
     {
      double q[1]; if(CopyBuffer(hH1RSI, 0, 1, 1, q) < 1) return false;
      double dz = MathMax(0.0, RsiDeadZone);
      if(dir > 0 && q[0] <= 50.0 + dz) return false;
      if(dir < 0 && q[0] >= 50.0 - dz) return false;
     }
   if(UseH1FastEma)
     {
      double f[1]; if(CopyBuffer(hH1Fast, 0, 1, 1, f) < 1) return false;
      double c = iClose(_Symbol, PERIOD_H1, 1);
      if(dir > 0 && c <= f[0]) return false;
      if(dir < 0 && c >= f[0]) return false;
     }
   if(UseM15EmaAlign)
     {
      double a[1], b[1];
      if(CopyBuffer(hM15Fast, 0, 1, 1, a) < 1 || CopyBuffer(hM15Slow, 0, 1, 1, b) < 1) return false;
      double c = iClose(_Symbol, PERIOD_M15, 1);
      if(dir > 0 && !(a[0] > b[0] && c > b[0])) return false;
      if(dir < 0 && !(a[0] < b[0] && c < b[0])) return false;
     }
   return true;
  }

// Light entry-quality check: only skips stretched or rejected candles, keeps normal entries
bool EntryQualityOk(int dir)
  {
   double h = iHigh(_Symbol, PERIOD_CURRENT, 1), l = iLow(_Symbol, PERIOD_CURRENT, 1);
   double o = iOpen(_Symbol, PERIOD_CURRENT, 1), c = iClose(_Symbol, PERIOD_CURRENT, 1);
   if(UseStretchFilter)
     {
      double a[1], m[1];
      if(CopyBuffer(hATR, 0, 1, 1, a) == 1 && CopyBuffer(hMA, 0, 1, 1, m) == 1 && a[0] > 0)
        {
         if(dir > 0 && c - m[0] > MaxStretchATR * a[0]) return false;
         if(dir < 0 && m[0] - c > MaxStretchATR * a[0]) return false;
        }
     }
   if(UseWickFilter)
     {
      double rng = h - l;
      if(rng > 0)
        {
         double upper = h - MathMax(o, c), lower = MathMin(o, c) - l;
         if(dir > 0 && upper / rng * 100.0 >= MaxWickPct) return false;
         if(dir < 0 && lower / rng * 100.0 >= MaxWickPct) return false;
        }
     }
   if(UseBodyConfirm)
     {
      double rng = h - l;
      if(rng <= 0) return false;
      if(dir > 0 && c <= o) return false;
      if(dir < 0 && c >= o) return false;
      if(MathAbs(c - o) / rng * 100.0 < MinBodyPct) return false;
     }
   if(UseSpikeGuard)
     {
      double a[1];
      if(CopyBuffer(hATR, 0, 1, 1, a) == 1 && a[0] > 0 && (h - l) > MaxSpikeATR * a[0]) return false;
     }
   return true;
  }

// Pure: is a trade in direction dir walking into an opposing zone [zLow, zHigh]?
// SELL is blocked by a bullish FVG / demand at or just below price; BUY by a bearish FVG / supply at or just above.
bool ZoneBlocksEntry(int dir, double price, double zLow, double zHigh, double atr, double nearATR)
  {
   if(atr <= 0 || zHigh <= zLow || price <= 0) return false;
   if(dir < 0) return price >= zLow && price - zHigh <= nearATR * atr;
   if(dir > 0) return price <= zHigh && zLow - price <= nearATR * atr;
   return false;
  }

// Zone stays active until a closed candle newer than shift `newest` closes through its far edge.
bool ZoneStillActive(bool bullish, double zLow, double zHigh, int newest)
  {
   for(int j = newest - 1; j >= 1; j--)
     {
      double c = iClose(_Symbol, PERIOD_M15, j);
      if(bullish && c < zLow) return false;
      if(!bullish && c > zHigh) return false;
     }
   return true;
  }

bool TrapShieldBlocks(int dir)
  {
   if(!UseTrapShield || dir == 0) return false;
   double a[1];
   if(CopyBuffer(hM15ATR, 0, 1, 1, a) != 1 || a[0] <= 0) return false;
   double atr = a[0];
   double price = dir < 0 ? SymbolInfoDouble(_Symbol, SYMBOL_BID) : SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   bool bull = dir < 0;   // sells look for bullish zones, buys for bearish zones
   int total = Bars(_Symbol, PERIOD_M15);
   for(int i = 1; i <= ShieldLookback && i + 2 < total; i++)
     {
      double hi0 = iHigh(_Symbol, PERIOD_M15, i), lo0 = iLow(_Symbol, PERIOD_M15, i);
      double hi2 = iHigh(_Symbol, PERIOD_M15, i + 2), lo2 = iLow(_Symbol, PERIOD_M15, i + 2);
      // FVG (3 candles: i+2 oldest, i newest)
      double zl = 0, zh = 0;
      if(bull && lo0 > hi2 && lo0 - hi2 >= ShieldMinGapATR * atr) { zl = hi2; zh = lo0; }
      if(!bull && hi0 < lo2 && lo2 - hi0 >= ShieldMinGapATR * atr) { zl = hi0; zh = lo2; }
      if(zh > zl && ZoneStillActive(bull, zl, zh, i) && ZoneBlocksEntry(dir, price, zl, zh, atr, FvgNearATR))
        { Print("Jenvu shield: ", dir < 0 ? "SELL blocked by bullish FVG " : "BUY blocked by bearish FVG ", DoubleToString(zl, _Digits), "-", DoubleToString(zh, _Digits)); return true; }
      // Demand / supply: opposite base candle (i+1) followed by an impulse candle (i) that closes beyond it
      double o0 = iOpen(_Symbol, PERIOD_M15, i), c0 = iClose(_Symbol, PERIOD_M15, i);
      double o1 = iOpen(_Symbol, PERIOD_M15, i + 1), c1 = iClose(_Symbol, PERIOD_M15, i + 1);
      double h1 = iHigh(_Symbol, PERIOD_M15, i + 1), l1 = iLow(_Symbol, PERIOD_M15, i + 1);
      bool impulse = MathAbs(c0 - o0) >= ZoneImpulseATR * atr;
      bool zone = bull ? (c1 < o1 && c0 > o0 && c0 > h1 && impulse) : (c1 > o1 && c0 < o0 && c0 < l1 && impulse);
      if(zone && ZoneStillActive(bull, l1, h1, i) && ZoneBlocksEntry(dir, price, l1, h1, atr, ShieldNearATR))
        { Print("Jenvu shield: ", dir < 0 ? "SELL blocked by demand zone " : "BUY blocked by supply zone ", DoubleToString(l1, _Digits), "-", DoubleToString(h1, _Digits)); return true; }
     }
   return false;
  }

// Executable quote touches/crosses the approach edge, or is inside the FVG.
// Zones already behind the trade do not arm it; a gap across the edge does.
bool OpposingFvgTouched(bool isBuy, double previous, double quote, double zl, double zh)
  {
   if(previous <= 0 || quote <= 0 || zl <= 0 || zh <= zl) return false;
   if(quote >= zl && quote <= zh) return true;
   return isBuy ? (previous <= zl && quote >= zl) : (previous >= zh && quote <= zh);
  }

bool FvgGuardCanArm(bool touched, double movePips, double triggerPips, double lockPips)
  {
   return touched && lockPips > 0 && triggerPips > lockPips && movePips >= triggerPips;
  }

bool FvgGuardMustClose(bool armed, bool pending, double movePips, double lockPips)
  {
   return pending || (armed && movePips <= lockPips);
  }

bool ActiveOpposingFvgTouch(bool isBuy, double previous, double quote)
  {
   double a[1];
   if(CopyBuffer(hM15ATR, 0, 1, 1, a) != 1 || a[0] <= 0) return false;
   int total = Bars(_Symbol, PERIOD_M15);
   for(int i = 1; i <= ShieldLookback && i + 2 < total; i++)
     {
      double zl = isBuy ? iHigh(_Symbol, PERIOD_M15, i) : iHigh(_Symbol, PERIOD_M15, i + 2);
      double zh = isBuy ? iLow(_Symbol, PERIOD_M15, i + 2) : iLow(_Symbol, PERIOD_M15, i);
      if(zh <= zl || zh - zl < ShieldMinGapATR * a[0]) continue;
      if(ZoneStillActive(!isBuy, zl, zh, i) && OpposingFvgTouched(isBuy, previous, quote, zl, zh)) return true;
     }
   return false;
  }

void ResetFvgGuard(FvgGuardState &state)
  {
   if(state.key != "") GlobalVariableDel(state.key);
   state.key = ""; state.previousQuote = 0; state.armed = false; state.pending = false;
  }

// Stable POSITION_IDENTIFIER survives broker ticket changes; scope prevents cross-account sharing.
string FvgGuardKey(ENUM_POSITION_TYPE type)
  {
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      if(PositionGetTicket(i) == 0) continue;
      if(PositionGetInteger(POSITION_MAGIC) != magic || PositionGetString(POSITION_SYMBOL) != _Symbol) continue;
      if((ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE) != type) continue;
      return "JVF_" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + "_" + _Symbol + "_" +
             IntegerToString(magic) + "_" + IntegerToString(PositionGetInteger(POSITION_IDENTIFIER));
     }
   return "";
  }

bool UpdateFvgGuard(FvgGuardState &state, ENUM_POSITION_TYPE type, double avg, double move)
  {
   string key = FvgGuardKey(type);
   if(key == "") { ResetFvgGuard(state); return false; }
   if(state.key != key)
     {
      ResetFvgGuard(state); state.key = key; state.previousQuote = avg;
      double saved = GlobalVariableCheck(key) ? GlobalVariableGet(key) : 0;
      state.armed = saved >= 1; state.pending = saved >= 2;
     }
   bool isBuy = type == POSITION_TYPE_BUY;
   double quote = SymbolInfoDouble(_Symbol, isBuy ? SYMBOL_BID : SYMBOL_ASK);
   double pips = move / PU();
   if(!state.armed && UseFvgProfitGuard && FvgGuardCanArm(
      ActiveOpposingFvgTouch(isBuy, state.previousQuote, quote), pips, FvgGuardTrigPips, FvgGuardLockPips))
     {
      state.armed = true; GlobalVariableSet(key, 1);
      Print("Jenvu: opposing FVG profit guard armed (", isBuy ? "buy" : "sell", ", +", DoubleToString(pips, 1), " pips)");
     }
   state.previousQuote = quote;
   if(!FvgGuardMustClose(state.armed, state.pending, pips, FvgGuardLockPips)) return false;
   state.pending = true; GlobalVariableSet(key, 2);
   return true;
  }

int Signal()
  {
   int d = RawSignal();
   if(!TrendAllows(d)) return 0;
   if(!EntryQualityOk(d)) return 0;
   if(TrapShieldBlocks(d)) return 0;   // v4.07 Layer 1: only removes trap entries, never creates new ones
   return d;
  }

int RawSignal()
  {
   if(strattype == STRAT_SEMI) return 0;   // semi auto: you open the first trade, EA manages the grid
   double r[1], m[1];
   bool rsiBuy = false, rsiSell = false, maBuy = false, maSell = false;
   if(strattype != STRAT_MA)
     {
      if(CopyBuffer(hRSI, 0, 1, 1, r) < 1) return 0;
      rsiBuy = r[0] < roversold; rsiSell = r[0] > roverbought;
     }
   if(strattype != STRAT_RSI)
     {
      if(CopyBuffer(hMA, 0, 1, 1, m) < 1) return 0;
      double c = iClose(_Symbol, PERIOD_CURRENT, 1);
      maBuy = c > m[0]; maSell = c < m[0];
     }
   if(strattype == STRAT_RSI)    return rsiBuy ? 1 : (rsiSell ? -1 : 0);
   if(strattype == STRAT_MA)     return maBuy  ? 1 : (maSell  ? -1 : 0);
   return (rsiBuy && maBuy) ? 1 : ((rsiSell && maSell) ? -1 : 0);
  }

double g_peakBuy = 0, g_peakSell = 0;

// closed candle 1 engulfs candle 2 against the basket
bool ReversalAgainst(bool isBuy)
  {
   double o1 = iOpen(_Symbol, PERIOD_CURRENT, 1), c1 = iClose(_Symbol, PERIOD_CURRENT, 1);
   double o2 = iOpen(_Symbol, PERIOD_CURRENT, 2), c2 = iClose(_Symbol, PERIOD_CURRENT, 2);
   if(isBuy)  return c1 < o1 && c2 > o2 && c1 < o2 && o1 >= c2;   // bearish engulfing
   return c1 > o1 && c2 < o2 && c1 > o2 && o1 <= c2;              // bullish engulfing
  }

bool TrendAgainst(bool isBuy)
  {
   double e[1]; if(CopyBuffer(hH1EMA, 0, 1, 1, e) < 1) return false;
   double c = iClose(_Symbol, PERIOD_H1, 1);
   return isBuy ? c < e[0] : c > e[0];
  }

bool HasManual(ENUM_POSITION_TYPE type, double &price, double &lot)
  {
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong t = PositionGetTicket(i); if(t == 0) continue;
      if(PositionGetInteger(POSITION_MAGIC) != 0 || PositionGetString(POSITION_SYMBOL) != _Symbol) continue;
      if((ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE) != type) continue;
      price = PositionGetDouble(POSITION_PRICE_OPEN); lot = PositionGetDouble(POSITION_VOLUME); return true;
     }
   return false;
  }

// London pre-session (preSessionBEUTC window, 06:15-09:00 UTC): a basket that is already
// green gets a break-even lock; if price comes back to average + buffer the basket is closed.
bool InLondonPreSession()
  {
   MqlDateTime g; TimeToStruct(TimeGMT(), g);
   return InBlockUTC(preSessionBEUTC, g.hour * 60 + g.min);
  }

// earliest open time of this side's basket
datetime FirstOpenTime(ENUM_POSITION_TYPE type)
  {
   datetime first = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong t = PositionGetTicket(i); if(t == 0) continue;
      if(PositionGetInteger(POSITION_MAGIC) != magic || PositionGetString(POSITION_SYMBOL) != _Symbol) continue;
      if((ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE) != type) continue;
      datetime ot = (datetime)PositionGetInteger(POSITION_TIME);
      if(first == 0 || ot < first) first = ot;
     }
   return first;
  }

// Pure predicates are also executed by the native regression tests.
bool CanStartBasket(int count, bool pendingExit, bool sameBar)
  {
   return count == 0 && !pendingExit && !sameBar;
  }

bool ConfirmedStructureBreak(bool isBuy, double o, double c, double h, double l,
                             double swing, double atr,
                             double minBodyPct, double dispATR)
  {
   double range = h - l;
   if(range <= 0 || atr <= 0 || swing <= 0) return false;
   if(o < l || o > h || c < l || c > h) return false;
   double body = c > o ? c - o : o - c;
   if(body / range * 100.0 < minBodyPct) return false;
   if(isBuy) return c < o && c < swing && swing - c >= dispATR * atr;
   return c > o && c > swing && c - swing >= dispATR * atr;
  }

// A confirmed pivot has TWO completed candles on each side before entry.
bool ConfirmedSwingPivot(bool isBuy, double pivot, double newer1, double newer2,
                        double older1, double older2)
  {
   if(pivot <= 0 || newer1 <= 0 || newer2 <= 0 || older1 <= 0 || older2 <= 0) return false;
   if(isBuy) return pivot < newer1 && pivot < newer2 && pivot < older1 && pivot < older2;
   return pivot > newer1 && pivot > newer2 && pivot > older1 && pivot > older2;
  }

// Anchor to the most recent CONFIRMED pre-entry pivot, not a rolling swing.
// Entry-bar and post-entry candles never define or move this level.
double PreEntrySwing(bool isBuy, datetime entryTime)
  {
   int entryShift = iBarShift(_Symbol, PERIOD_M15, entryTime, false);
   if(entryShift < 0) return 0;
   int first = entryShift + 3; // two newer candles fully closed before entry
   int total = Bars(_Symbol, PERIOD_M15);
   int end = MathMin(first + MathMax(1, StructLookback), total - 2);
   for(int p = first; p < end; p++)
     {
      double pivot = isBuy ? iLow(_Symbol, PERIOD_M15, p) : iHigh(_Symbol, PERIOD_M15, p);
      double n1 = isBuy ? iLow(_Symbol, PERIOD_M15, p - 1) : iHigh(_Symbol, PERIOD_M15, p - 1);
      double n2 = isBuy ? iLow(_Symbol, PERIOD_M15, p - 2) : iHigh(_Symbol, PERIOD_M15, p - 2);
      double o1 = isBuy ? iLow(_Symbol, PERIOD_M15, p + 1) : iHigh(_Symbol, PERIOD_M15, p + 1);
      double o2 = isBuy ? iLow(_Symbol, PERIOD_M15, p + 2) : iHigh(_Symbol, PERIOD_M15, p + 2);
      if(ConfirmedSwingPivot(isBuy, pivot, n1, n2, o1, o2)) return pivot;
     }
   return 0; // missing history / no confirmed pivot: never invent a level
  }

// Last CLOSED M15 candle only, including the entry candle once it closes.
// Opposite body >=50%, close >=0.2 ATR beyond the fixed pre-entry pivot.
// EMA50 remains an ENTRY filter only; it never delays this exit.
// No profit threshold: identical confirmation for green and red baskets.
bool StructureBrokenAgainst(bool isBuy, datetime entryTime)
  {
   if(entryTime == 0) return false;
   datetime t1 = iTime(_Symbol, PERIOD_M15, 1);
   long ps = PeriodSeconds(PERIOD_M15);
   if(t1 == 0 || ps <= 0) return false;
   datetime entryBar = (datetime)((long)entryTime - ((long)entryTime % ps));
   if(t1 < entryBar) return false;
   double swing = PreEntrySwing(isBuy, entryTime);
   if(swing <= 0) return false;
   double a[1];
   if(CopyBuffer(hM15ATR, 0, 1, 1, a) != 1) return false;
   return ConfirmedStructureBreak(isBuy, iOpen(_Symbol, PERIOD_M15, 1), iClose(_Symbol, PERIOD_M15, 1),
                                  iHigh(_Symbol, PERIOD_M15, 1), iLow(_Symbol, PERIOD_M15, 1),
                                  swing, a[0], StructMinBodyPct, StructDispATR);
  }

// v4.07 Layer 2: local anchor = extreme of the LocalAnchorBars closed M15 candles just before entry.
double LocalAnchor(bool isBuy, datetime entryTime)
  {
   int entryShift = iBarShift(_Symbol, PERIOD_M15, entryTime, false);
   if(entryShift < 0 || LocalAnchorBars < 1) return 0;
   if(entryShift + LocalAnchorBars >= Bars(_Symbol, PERIOD_M15)) return 0;
   double v = 0;
   for(int k = entryShift + 1; k <= entryShift + LocalAnchorBars; k++)
     {
      double x = isBuy ? iLow(_Symbol, PERIOD_M15, k) : iHigh(_Symbol, PERIOD_M15, k);
      if(x <= 0) return 0;
      if(v == 0 || (isBuy ? x < v : x > v)) v = x;
     }
   return v;
  }

// Same closed-candle rules (>=50% body, close beyond level) - only the level is closer than the old swing.
bool LocalInvalidation(bool isBuy, datetime entryTime)
  {
   if(!UseLocalInvalidation || entryTime == 0) return false;
   datetime t1 = iTime(_Symbol, PERIOD_M15, 1);
   long ps = PeriodSeconds(PERIOD_M15);
   if(t1 == 0 || ps <= 0) return false;
   datetime entryBar = (datetime)((long)entryTime - ((long)entryTime % ps));
   if(t1 < entryBar) return false;
   double anchor = LocalAnchor(isBuy, entryTime);
   if(anchor <= 0) return false;
   double a[1];
   if(CopyBuffer(hM15ATR, 0, 1, 1, a) != 1) return false;
   return ConfirmedStructureBreak(isBuy, iOpen(_Symbol, PERIOD_M15, 1), iClose(_Symbol, PERIOD_M15, 1),
                                  iHigh(_Symbol, PERIOD_M15, 1), iLow(_Symbol, PERIOD_M15, 1),
                                  anchor, a[0], StructMinBodyPct, LocalDispATR);
  }

//--- basket management ------------------------------------------------
void ManageSide(ENUM_POSITION_TYPE type, int sig, bool canOpen)
  {
   Basket b; GetBasket(type, b);
   bool isBuy = (type == POSITION_TYPE_BUY);
   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK), bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   if(b.count == 0) { if(isBuy) ResetFvgGuard(g_fvgBuy); else ResetFvgGuard(g_fvgSell); }

   // Retry a confirmed invalidation on EVERY tick until all owned positions close.
   bool pendingExit = isBuy ? g_exitBuy : g_exitSell;
   if(pendingExit)
     {
      if(b.count > 0) { CloseSide(type); return; }
      if(isBuy) g_exitBuy = false; else g_exitSell = false;
     }

   // take profit / existing safety exits
   if(b.count > 0)
     {
      double avg = b.wsum / b.lots;
      double move = isBuy ? (bid - avg) : (avg - ask);
      if(move >= takeprofit * PU()) { CloseSide(type); Print("Jenvu: basket TP hit"); return; }

      bool fvgClose = isBuy ? UpdateFvgGuard(g_fvgBuy, type, avg, move) : UpdateFvgGuard(g_fvgSell, type, avg, move);
      if(fvgClose)
        {
         if(isBuy) { g_exitBuy = true; g_lastBuyBar = iTime(_Symbol, PERIOD_CURRENT, 0); }
         else { g_exitSell = true; g_lastSellBar = iTime(_Symbol, PERIOD_CURRENT, 0); }
         Print("Jenvu: FVG virtual profit floor triggered; requesting close at +", DoubleToString(move / PU(), 1), " pips");
         CloseSide(type); return;
        }

      // profit protection: lock gains, exit on reversal / trend flip
      double peak = isBuy ? g_peakBuy : g_peakSell;
      if(b.profit > peak) peak = b.profit;
      if(isBuy) g_peakBuy = peak; else g_peakSell = peak;
      double lockStart = LockStartMoney, lockKeep = LockKeepMoney;
      double dynTarget = dd.EffTarget();
      if(UseDynamicLock && dynTarget > 0)
        { lockStart = dynTarget * LockTargetPct / 100.0; lockKeep = dynTarget * LockKeepPct / 100.0; }
      if(UseProfitLock && lockStart > 0 && peak >= lockStart)
        {
         double lockFloor = MathMax(lockKeep, peak * (1.0 - LockTrailPct / 100.0));
         if(b.profit <= lockFloor) { CloseSide(type); Print("Jenvu: profit lock close at ", DoubleToString(b.profit, 2)); return; }
        }
      // session profit lock: green basket is booked before London / NY open (exits only)
      if(UseSessionProfitLock && b.profit >= SessionLockMinMoney)
        {
         MqlDateTime sg; TimeToStruct(TimeGMT(), sg); int snow = sg.hour * 60 + sg.min;
         if(InBlockUTC(londonLockUTC, snow) || InBlockUTC(nyLockUTC, snow))
           { CloseSide(type); Print("Jenvu: session profit lock close at ", DoubleToString(b.profit, 2)); return; }
        }
      // Friday weekend guard: green basket is booked before the weekend gap (exits only)
      if(UseFridayProfitClose && b.profit >= SessionLockMinMoney)
        {
         MqlDateTime fg; TimeToStruct(TimeGMT(), fg);
         if(fg.day_of_week == 5 && fg.hour * 60 + fg.min >= ParseMinutes(fridayCloseUTC))
           { CloseSide(type); Print("Jenvu: Friday profit close at ", DoubleToString(b.profit, 2)); return; }
        }
      // news guard: green basket is booked when a high-impact news window starts (exits only)
      if(UseNewsProfitLock && b.profit >= SessionLockMinMoney)
        {
         string nwhy = "";
         if(NewsBlocked(nwhy)) { CloseSide(type); Print("Jenvu: news profit lock close (", nwhy, ") at ", DoubleToString(b.profit, 2)); return; }
        }
      // pre-session break-even guard (exits only, never opens trades)
      if(UsePreSessionBE)
        {
         double beBuf = PreSessionBEPips * PU();
         bool armed = isBuy ? g_beBuy : g_beSell;
         if(!armed && InLondonPreSession() && move > beBuf)
           {
            armed = true; if(isBuy) g_beBuy = true; else g_beSell = true;
            Print("Jenvu: pre-session break-even lock armed (", isBuy ? "buy" : "sell", " basket)");
           }
         if(armed && move <= beBuf) { CloseSide(type); Print("Jenvu: pre-session break-even close"); return; }
        }
      // Safety 1 - all-day auto break-even (exits only, never opens trades)
      if(UseAutoBE)
        {
         double aeTrig = AutoBETrigPips * PU(), aeLock = AutoBELockPips * PU();
         bool aeArmed = isBuy ? g_aeBuy : g_aeSell;
         if(!aeArmed && move >= aeTrig)
           {
            aeArmed = true; if(isBuy) g_aeBuy = true; else g_aeSell = true;
            Print("Jenvu: auto break-even armed (", isBuy ? "buy" : "sell", " basket, +", DoubleToString(move / PU(), 1), " pips)");
           }
         if(aeArmed && move <= aeLock) { CloseSide(type); Print("Jenvu: auto break-even close at ", DoubleToString(b.profit, 2)); return; }
        }
      // Safety 1b - trailing step lock (exits only): after +TrailStepTrigPips keep at least +TrailStepLockPips
      if(UseTrailStep && TrailStepLockPips < TrailStepTrigPips)
        {
         double tsTrig = TrailStepTrigPips * PU(), tsLock = TrailStepLockPips * PU();
         bool tsArmed = isBuy ? g_tsBuy : g_tsSell;
         if(!tsArmed && move >= tsTrig)
           {
            tsArmed = true; if(isBuy) g_tsBuy = true; else g_tsSell = true;
            Print("Jenvu: trailing step lock armed (", isBuy ? "buy" : "sell", " basket, +", DoubleToString(move / PU(), 1), " pips)");
           }
         if(tsArmed && move <= tsLock) { CloseSide(type); Print("Jenvu: trailing step lock close at ", DoubleToString(b.profit, 2)); return; }
        }
      // Same strict reversal confirmation regardless of current basket profit.
      if(UseStructureExit && (StructureBrokenAgainst(isBuy, FirstOpenTime(type)) || LocalInvalidation(isBuy, FirstOpenTime(type))))
        {
         if(isBuy) { g_exitBuy = true; g_lastBuyBar = iTime(_Symbol, PERIOD_CURRENT, 0); }
         else { g_exitSell = true; g_lastSellBar = iTime(_Symbol, PERIOD_CURRENT, 0); }
         Print("Jenvu: confirmed M15 invalidation, basket profit ", DoubleToString(b.profit, 2));
         CloseSide(type);
         return;
        }
     }
   else { if(isBuy) { g_peakBuy = 0; g_beBuy = false; g_aeBuy = false; g_tsBuy = false; } else { g_peakSell = 0; g_beSell = false; g_aeSell = false; g_tsSell = false; } }

   if(!canOpen) return;
   if(isBuy && !allowBuy) return;
   if(!isBuy && !allowSell) return;
   if(tradeLimit > 0 && b.count >= tradeLimit) return;

   datetime bar = iTime(_Symbol, PERIOD_CURRENT, 0);
   if(oneTradePerCandle && bar == (isBuy ? g_lastBuyBar : g_lastSellBar)) return;

   // NO Level 2, averaging, recovery or partial-cluster refill, in any mode.
   if(!CanStartBasket(b.count, isBuy ? g_exitBuy : g_exitSell,
                      bar == (isBuy ? g_lastBuyBar : g_lastSellBar))) return;
   if(strattype == STRAT_SEMI) return; // no recovery orders from manual trades
   if(!allowHedge)
     {
      Basket opposite; GetBasket(isBuy ? POSITION_TYPE_SELL : POSITION_TYPE_BUY, opposite);
      if(opposite.count > 0) return;
     }
   if(maxPairs > 0 && ActiveSymbols() >= maxPairs) return;
   if(!((isBuy && sig == 1) || (!isBuy && sig == -1))) return;
   // Preserve the former THREE BaseLot orders' total exposure in ONE order.
   // Broker per-order maximum may cap it; never split into extra orders.
   double lot = NormLot(3.0 * BaseLot());
   // No broker SL/TP: existing EA exits and daily guard remain unchanged.
   int n = MathMax(1, ClusterSize);
   if(tradeLimit > 0) n = MathMin(n, tradeLimit - b.count);
   bool ok = false;
   for(int k = 0; k < n; k++)
     {
      double pa = SymbolInfoDouble(_Symbol, SYMBOL_ASK), pb = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      if(isBuy ? trade.Buy(lot, _Symbol, pa, 0, 0, "Jenvu EA") : trade.Sell(lot, _Symbol, pb, 0, 0, "Jenvu EA")) ok = true;
         else Print("Jenvu: order failed - ", trade.ResultRetcode(), " ", trade.ResultRetcodeDescription(), " (lot ", DoubleToString(lot, 2), ")");
     }
   if(ok) { if(isBuy) g_lastBuyBar = bar; else g_lastSellBar = bar; }
  }

bool LossCutHit(double floating)
  {
   if(lossCutType == LC_NONE || floating >= 0) return false;
   double limit = (lossCutType == LC_MONEY) ? lcvalue : AccountInfoDouble(ACCOUNT_BALANCE) * lcvalue / 100.0;
   return -floating >= limit;
  }

//+------------------------------------------------------------------+
//| Events                                                           |
//+------------------------------------------------------------------+
bool IsEurUsdSymbol()
  {
   string s = _Symbol; StringToUpper(s);
   return (StringFind(s, "EURUSD") >= 0);
  }

datetime g_attachBar = 0;
int OnInit()
  {
   g_attachBar = MQLInfoInteger(MQL_TESTER) ? 0 : iTime(_Symbol, PERIOD_CURRENT, 0);
   if(_Period != PERIOD_M15) { Alert("Jenvu: attach this bot to an M15 chart."); return INIT_PARAMETERS_INCORRECT; }
   if(!IsEurUsdSymbol()) { Alert("Jenvu: This bot only trades EUR/USD. Please attach it to a EURUSD chart."); return INIT_FAILED; }
   if(!MQLInfoInteger(MQL_TESTER) && StringLen(MyIP) < 7) { Alert("Jenvu: please enter your PC/RDP IP address in MyIP."); return INIT_PARAMETERS_INCORRECT; }
   g_licensed = CheckLicense(); g_lastCheck = TimeCurrent();
   if(!g_licensed) { Alert("Jenvu: IP not registered, IP mismatch, plan expired, or IP already used by another MT5 account."); return INIT_FAILED; }

   hRSI = iRSI(_Symbol, PERIOD_CURRENT, rsiperiod, MapPrice(rsiprice));
   hMA  = iMA(_Symbol, PERIOD_CURRENT, ma1period, ma1shift, MapMethod(ma1method), MapPrice(ma1price));
   if(hRSI == INVALID_HANDLE || hMA == INVALID_HANDLE) return INIT_FAILED;
   hH1EMA = iMA(_Symbol, PERIOD_H1, h1EmaPeriod, 0, MODE_EMA, PRICE_CLOSE);
   hH1RSI = iRSI(_Symbol, PERIOD_H1, 14, PRICE_CLOSE);
   hATR = iATR(_Symbol, PERIOD_CURRENT, 14);
   hH1Fast  = iMA(_Symbol, PERIOD_H1,  h1FastEmaPeriod, 0, MODE_EMA, PRICE_CLOSE);
   hM15Fast = iMA(_Symbol, PERIOD_M15, m15FastEma, 0, MODE_EMA, PRICE_CLOSE);
   hM15Slow = iMA(_Symbol, PERIOD_M15, m15SlowEma, 0, MODE_EMA, PRICE_CLOSE);
   hM15ATR  = iATR(_Symbol, PERIOD_M15, 14);
   if(hM15ATR == INVALID_HANDLE) return INIT_FAILED;
   if(hH1Fast == INVALID_HANDLE || hM15Fast == INVALID_HANDLE || hM15Slow == INVALID_HANDLE) return INIT_FAILED;
   if(hH1EMA == INVALID_HANDLE || hH1RSI == INVALID_HANDLE || hATR == INVALID_HANDLE) return INIT_FAILED;

   trade.SetExpertMagicNumber(magic);
   trade.SetTypeFillingBySymbol(_Symbol);   // works with Exness and other brokers
   trade.SetDeviationInPoints(50);
   dd.Init();
   LoadNews(); DrawNewsLines();
   EventSetTimer(5);
   ReportStatus("start"); g_lastReport = TimeCurrent();
   return INIT_SUCCEEDED;
  }

void OnDeinit(const int reason)
  {
   EventKillTimer();
   if(g_licensed) ReportStatus("stop", DeinitName(reason));
   if(hRSI != INVALID_HANDLE) IndicatorRelease(hRSI);
   if(hMA  != INVALID_HANDLE) IndicatorRelease(hMA);
   if(hH1EMA != INVALID_HANDLE) IndicatorRelease(hH1EMA);
   if(hH1RSI != INVALID_HANDLE) IndicatorRelease(hH1RSI);
   if(hATR != INVALID_HANDLE) IndicatorRelease(hATR);
   if(hH1Fast  != INVALID_HANDLE) IndicatorRelease(hH1Fast);
   if(hM15Fast != INVALID_HANDLE) IndicatorRelease(hM15Fast);
   if(hM15Slow != INVALID_HANDLE) IndicatorRelease(hM15Slow);
   if(hM15ATR  != INVALID_HANDLE) IndicatorRelease(hM15ATR);
   ObjectsDeleteAll(0, PFX);
  }

void OnTimer()
  {
   dd.Update();
   if(g_licensed && TimeCurrent() - g_lastReport >= 60) { g_lastReport = TimeCurrent(); ReportStatus(); }
   if(TimeCurrent() - g_lastNewsLoad > 3600) { LoadNews(); DrawNewsLines(); }
  }

void OnTick()
  {
   dd.Update();
   if(TimeCurrent() - g_lastCheck > 6 * 3600)
     {
      bool was = g_licensed; g_licensed = CheckLicense(); g_lastCheck = TimeCurrent();
      if(was && !g_licensed) ReportStatus("stop", "license");
     }

   Basket buy, sell; GetBasket(POSITION_TYPE_BUY, buy); GetBasket(POSITION_TYPE_SELL, sell);

   if(!g_licensed) { g_status = "License invalid - trading off"; DrawDashboard(buy, sell); return; }

   // loss cut on this symbol's baskets
   if(LossCutHit(buy.profit + sell.profit))
     {
      CloseSide(POSITION_TYPE_BUY); CloseSide(POSITION_TYPE_SELL);
      Print("Jenvu: loss cut hit, all baskets closed");
     }

   bool canOpen = true; string why = "";
   if(!dd.CanTrade())                      { canOpen = false; g_status = dd.TargetDone() ? "Daily profit target reached - paused" : "Daily drawdown hit - paused"; }
   else if(!TimeAllowed())                 { canOpen = false; g_status = "Outside trading time"; }
   else if(NewsBlocked(why))               { canOpen = false; g_status = "News: " + why; }
   else if(maxspread > 0 && SymbolInfoInteger(_Symbol, SYMBOL_SPREAD) > maxspread) { canOpen = false; g_status = "Spread too high"; }
   else g_status = strattype == STRAT_SEMI ? "Semi auto - waiting for your trade" : "Trading";

   // new entries only after the drawdown lock is clear; grid exits always run
   // signal is read once per candle and kept for the whole candle,
   // so a missed first tick (spread, news, requote) can still enter later
   static datetime lastSigBar = 0;
   static int      barSig = 0;
   datetime bar = iTime(_Symbol, PERIOD_CURRENT, 0);
   if(highRes || bar != lastSigBar) { barSig = Signal(); lastSigBar = bar; }
   int sig = barSig;

   bool launchWait = WaitFreshCandleOnAttach && g_attachBar != 0 && bar == g_attachBar;
   if(launchWait) { canOpen = false; g_status = "Waiting for fresh M15 candle"; }
   if(!dd.IsLocked())
     {
      ManageSide(POSITION_TYPE_BUY,  sig, canOpen);
      ManageSide(POSITION_TYPE_SELL, sig, canOpen);
     }
   GetBasket(POSITION_TYPE_BUY, buy); GetBasket(POSITION_TYPE_SELL, sell);
   DrawDashboard(buy, sell);
  }
//+------------------------------------------------------------------+

//--- Strategy Tester (backtest) report --------------------------------
// Runs only in the MT5 Strategy Tester. Prints a summary in the Journal and
// returns Net profit / Max equity drawdown so "Custom max" optimisation
// prefers settings that earn more for less drawdown.
double OnTester()
  {
   double profit  = TesterStatistics(STAT_PROFIT);
   double ddMoney = TesterStatistics(STAT_EQUITY_DD);
   double ddPct   = TesterStatistics(STAT_EQUITYDD_PERCENT);
   double trades  = TesterStatistics(STAT_TRADES);
   double winPct  = trades > 0 ? TesterStatistics(STAT_PROFIT_TRADES) * 100.0 / trades : 0;
   double pf      = TesterStatistics(STAT_PROFIT_FACTOR);
   double start   = TesterStatistics(STAT_INITIAL_DEPOSIT);
   PrintFormat("Jenvu BACKTEST: deposit %.2f | net profit %.2f (%.1f%%) | trades %.0f | win %.1f%% | profit factor %.2f | max equity DD %.2f (%.1f%%)",
               start, profit, start > 0 ? profit * 100.0 / start : 0, trades, winPct, pf, ddMoney, ddPct);
   if(ddMoney <= 0) return profit;
   return profit / ddMoney;
  }
