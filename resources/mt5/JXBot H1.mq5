//+------------------------------------------------------------------+
//| JXBot H1.mq5 - JX Bot H1 swing-to-swing Expert Advisor (MT5)      |
//| Same rules as src/lib/chart/swing-bot.ts (website 7-day test):    |
//|  - Swing high: bar[2] high beats the 7 bars before it and bar[1], |
//|    Candle 1 (bar[1]) closes bearish below bar[2] close -> SELL.   |
//|    Swing low mirrors it -> BUY. SL = swing candle wick.           |
//|  - Exit only at SL or when the next opposite swing confirms.      |
//|  - Max 2 open trades (all charts), 1 per symbol, no queued entry. |
//|  - High-impact news: no entries 60 min before -> 60 min after;    |
//|    from 60 min before, winners close, losers close at +2 pips.    |
//|  - Friday >= 20:00 UTC (not BTC): same as news, no new trades.    |
//|  - Daily circuit breaker 4.5% of day start balance: close all.    |
//| Attach one copy to XAUUSD, EURUSD and BTCUSD H1 charts.           |
//+------------------------------------------------------------------+
#property copyright "Jenvu"
#property link      "https://jenvu.com"
#property version   "5.00"
#property description "JX Bot H1 - swing-to-swing, wick stop loss, max 2 trades, news/Friday guard, 4.5% daily breaker."
#include <Trade\Trade.mqh>

input string MyIP        = "";     // License: your PC/RDP IP (same as added on jenvu.com)
input double Lots        = 0;      // Lot size (0 = default: XAUUSD 0.02, EURUSD 0.35, BTCUSD 0.05)
input int    MaxOpen     = 2;      // Max open trades across all charts
input bool   UseNews     = true;   // High-impact news guard (live only; MT5 tester has no calendar)
input bool   UseFriday   = true;   // Friday 20:00 UTC guard (XAUUSD / EURUSD)
input double BreakerPct  = 4.5;    // Daily circuit breaker, % of day start balance
input long   Magic       = 509001; // Magic number

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
double   g_targetPct = 0;        // plan daily target from jenvu.com (0 = none)
string   g_dayKey = "";

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
   if(l <= 0) l = IsGold() ? 0.02 : (IsBtc() ? 0.05 : 0.35);
   double step = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP), mn = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN), mx = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   if(step > 0) l = MathFloor(l / step) * step;
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
     { ulong t = PositionGetTicket(i); if(t > 0 && PositionGetInteger(POSITION_MAGIC) == Magic) trade.PositionClose(t); }
  }

//--- swing confirmed at the last closed bar (Candle 1 = bar 1, swing = bar 2)
int ConfirmedSwing(double &sl)
  {
   MqlRates r[]; ArraySetAsSeries(r, true);
   if(CopyRates(_Symbol, PERIOD_H1, 0, SwingLeft + 3, r) < SwingLeft + 3) return 0;
   bool hi = r[1].high <= r[2].high && r[1].close < r[1].open && r[1].close < r[2].close;
   bool lo = r[1].low  >= r[2].low  && r[1].close > r[1].open && r[1].close > r[2].close;
   for(int k = 3; k < SwingLeft + 3; k++)
     {
      if(r[k].high >= r[2].high) hi = false;
      if(r[k].low  <= r[2].low)  lo = false;
     }
   if(hi) { sl = r[2].high; return -1; }
   if(lo) { sl = r[2].low;  return 1; }
   return 0;
  }

//--- news ------------------------------------------------------------
void LoadNews()
  {
   ArrayResize(g_news, 0); g_lastNewsLoad = TimeCurrent();
   if(MQLInfoInteger(MQL_TESTER) || !UseNews) return;
   string cur[] = {"USD", "EUR"};
   datetime from = TimeTradeServer() - 6 * 3600, to = TimeTradeServer() + 2 * 86400;
   for(int c = 0; c < 2; c++)
     {
      MqlCalendarValue v[];
      if(CalendarValueHistory(v, from, to, NULL, cur[c]) <= 0) continue;
      for(int i = 0; i < ArraySize(v); i++)
        {
         MqlCalendarEvent ev; if(!CalendarEventById(v[i].event_id, ev)) continue;
         if(ev.importance != CALENDAR_IMPORTANCE_HIGH) continue;
         int k = ArraySize(g_news); ArrayResize(g_news, k + 1); g_news[k] = v[i].time; // server time
        }
     }
  }
bool NewsBlocksEntry() { datetime n = TimeTradeServer(); for(int i = 0; i < ArraySize(g_news); i++) if(n >= g_news[i] - NewsWindowMin * 60 && n <= g_news[i] + NewsWindowMin * 60) return true; return false; }
bool PreNews()         { datetime n = TimeTradeServer(); for(int i = 0; i < ArraySize(g_news); i++) if(n >= g_news[i] - NewsWindowMin * 60 && n <= g_news[i]) return true; return false; }
bool FridayCut()
  {
   if(!UseFriday || IsBtc()) return false;
   MqlDateTime d; TimeToStruct(NowUtc(), d);
   return (d.day_of_week == 5 && d.hour >= FridayCutoff) || d.day_of_week == 6;
  }

//--- license (server checks the caller IP; info stays hidden) ----------
bool CheckLicense()
  {
   if(MQLInfoInteger(MQL_TESTER) || MQLInfoInteger(MQL_OPTIMIZATION)) { Print("JX Bot: Strategy Tester - license check skipped"); return true; }
   string acc = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   string body = "{\"ip\":\"" + MyIP + "\",\"mt5_account\":\"" + acc + "\"}";
   char post[], res[]; string hdr;
   StringToCharArray(body, post, 0, StringLen(body), CP_UTF8);
   ResetLastError();
   int code = WebRequest("POST", LicenseUrl, "Content-Type: application/json\r\n", 8000, post, res, hdr);
   if(code == -1) { Print("JX Bot: license server not reachable. Add https://jenvu.com in Tools > Options > Expert Advisors > Allow WebRequest."); return false; }
   string txt = CharArrayToString(res, 0, WHOLE_ARRAY, CP_UTF8);
   bool ok = StringFind(txt, "\"valid\":true") >= 0;
   if(ok)
     {
      if(StringFind(txt, "\"plan\":\"pro\"") >= 0) g_targetPct = 2.0;
      else if(StringFind(txt, "\"plan\":\"elite\"") >= 0) g_targetPct = 4.0;
      else if(StringFind(txt, "\"plan\":\"ultra\"") >= 0) g_targetPct = 6.0;
      else g_targetPct = 0;
     }
   Print("JX Bot license: ", ok ? "VALID" : "INVALID", " (MT5 account ", acc, ")");
   if(!ok)
     {
      if(StringFind(txt, "account_mismatch") >= 0) Print("JX Bot: this IP is already used by another MT5 account. One IP = one account.");
      else if(StringFind(txt, "ip_mismatch") >= 0) Print("JX Bot: MyIP does not match this PC/RDP real IP. Update it on jenvu.com.");
      else if(StringFind(txt, "expired") >= 0) Print("JX Bot: your license has expired. Renew it at jenvu.com.");
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
   if(StringFind(txt, "\"valid\":false") >= 0) g_licensed = false;
   if(StringFind(txt, "\"stop\":true") >= 0 && !DayLocked()) { GlobalVariableSet(GvLock(), 1); CloseAllMine(); }
  }

//--- events ----------------------------------------------------------
int OnInit()
  {
   if(_Period != PERIOD_H1) { Print("JX Bot: attach to an H1 chart."); return INIT_PARAMETERS_INCORRECT; }
   trade.SetExpertMagicNumber(Magic);
   g_licensed = CheckLicense();
   if(!g_licensed) return INIT_FAILED;
   LoadNews();
   g_lastBar = iTime(_Symbol, PERIOD_H1, 0);   // no entry on the candle the bot was attached
   EventSetTimer(60);
   ReportStatus("start");
   return INIT_SUCCEEDED;
  }
void OnDeinit(const int reason) { EventKillTimer(); ReportStatus("stop", IntegerToString(reason)); }
void OnTimer()
  {
   ReportStatus();
   if(TimeCurrent() - g_lastNewsLoad > 3600) LoadNews();
   if(TimeCurrent() - g_lastLicense > 6 * 3600) g_licensed = CheckLicense();
  }

void OnTick()
  {
   if(!g_licensed) return;
   if(MQLInfoInteger(MQL_TESTER) && TimeCurrent() - g_lastNewsLoad > 3600) g_lastNewsLoad = TimeCurrent();
   double start = DayStart();

   // 1) daily circuit breaker (closed + floating, all JX Bot trades)
   double dayPnl = AccountInfoDouble(ACCOUNT_EQUITY) - start;
   if(!DayLocked() && dayPnl <= -start * BreakerPct / 100.0)
     { GlobalVariableSet(GvLock(), 1); CloseAllMine(); Print("JX Bot: daily circuit breaker hit, trading stopped for today."); return; }
   // plan daily target (set by jenvu.com)
   if(!DayLocked() && g_targetPct > 0 && AccountInfoDouble(ACCOUNT_BALANCE) - start >= start * g_targetPct / 100.0)
     { GlobalVariableSet(GvLock(), 1); CloseAllMine(); Print("JX Bot: plan daily target reached."); return; }

   // 2) news / Friday guard on this symbol's open trade
   ulong tk = 0; int dir = 0; double px = 0, profit = 0;
   bool has = MyPosition(tk, dir, px, profit);
   bool guardNow = (UseNews && PreNews()) || FridayCut();
   if(has && (guardNow || g_guard))
     {
      double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID), ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double pips = dir == 1 ? (bid - px) / Pip() : (px - ask) / Pip();
      if(profit > 0 && (guardNow || pips >= BreakevenPips)) { trade.PositionClose(tk); g_guard = false; has = false; }
      else g_guard = true;
     }
   if(!has) g_guard = false;

   // 3) once per closed H1 bar: opposite swing exit, then entry
   datetime bar = iTime(_Symbol, PERIOD_H1, 0);
   if(bar == g_lastBar) return;
   g_lastBar = bar;
   double sl = 0; int sig = ConfirmedSwing(sl);
   if(sig == 0) return;
   if(has && dir != sig) { trade.PositionClose(tk); has = false; g_guard = false; }
   if(has || DayLocked() || OpenCount() >= MaxOpen) return;               // dropped, never queued
   if((UseNews && NewsBlocksEntry()) || FridayCut()) return;
   double price = sig == 1 ? SymbolInfoDouble(_Symbol, SYMBOL_ASK) : SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double minDist = (double)SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * _Point;
   if((sig == 1 && price - sl <= minDist) || (sig == -1 && sl - price <= minDist)) { Print("JX Bot: swing SL too close / already passed, signal skipped."); return; }
   sl = NormalizeDouble(sl, (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS));
   bool ok = sig == 1 ? trade.Buy(LotSize(), _Symbol, 0, sl, 0, "JX H1 swing") : trade.Sell(LotSize(), _Symbol, 0, sl, 0, "JX H1 swing");
   if(!ok) Print("JX Bot: order failed ", trade.ResultRetcode());
  }
//+------------------------------------------------------------------+
