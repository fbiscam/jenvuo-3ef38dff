// Polls Jenvu every 20 s, opens/updates TradingView chart, and asks the
// content script to draw Entry/SL/TP whenever a new signal id appears.

const POLL_ALARM = "jenvu-poll";

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(POLL_ALARM, { periodInMinutes: 0.34 }); // ~20s
});
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(POLL_ALARM, { periodInMinutes: 0.34 });
});

chrome.alarms.onAlarm.addListener((a) => { if (a.name === POLL_ALARM) poll(); });

chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
  if (msg?.type === "poll-now") { poll().then(() => respond({ ok: true })); return true; }
  if (msg?.type === "open-tv" && msg.signal) { openAndDraw(msg.signal); respond({ ok: true }); return; }
});

async function poll() {
  const { endpoint, customEndpoint, token, lastSignalId, autoOpen } = await chrome.storage.local.get([
    "endpoint", "customEndpoint", "token", "lastSignalId", "autoOpen",
  ]);
  if (!token) return;
  const base = (endpoint === "custom" ? customEndpoint : endpoint) || "https://jenvu.com";
  try {
    const res = await fetch(`${base}/api/public/extension/latest-signal`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({ ok: false, error: "bad_json" }));
    await chrome.storage.local.set({ lastResult: data });

    if (!data?.ok) return;
    const sig = data.signal;
    if (!sig || !sig.id) return;
    if (sig.id === lastSignalId) return;

    await chrome.storage.local.set({ lastSignalId: sig.id });

    // notification
    try {
      chrome.notifications.create(`jenvu-${sig.id}`, {
        type: "basic",
        iconUrl: "icon.png",
        title: `Jenvu · ${sig.pair} ${sig.direction === "long" ? "BUY" : "SELL"} · Grade ${sig.grade}`,
        message: `Entry ${sig.entry} · SL ${sig.sl} · TP ${sig.tp} (${sig.confidence}%)`,
        priority: 2,
      });
    } catch {}

    if (autoOpen !== false) openAndDraw(sig);
  } catch (e) {
    await chrome.storage.local.set({ lastResult: { ok: false, error: String(e?.message || e) } });
  }
}

function tvSymbol(pair) {
  // XAUUSD → OANDA:XAUUSD (works for gold cross pairs)
  const p = String(pair).toUpperCase().replace("/", "");
  return `OANDA:${p}`;
}
function tvUrl(pair) { return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol(pair))}`; }

async function openAndDraw(sig) {
  const url = tvUrl(sig.pair);
  const tabs = await chrome.tabs.query({ url: ["https://www.tradingview.com/chart/*"] });
  let tab = tabs[0];
  if (tab) {
    await chrome.tabs.update(tab.id, { url, active: true });
  } else {
    tab = await chrome.tabs.create({ url });
  }
  // Wait for the tab to finish loading, then send draw command.
  const send = () => chrome.tabs.sendMessage(tab.id, { type: "jenvu-draw", signal: sig })
    .catch(() => setTimeout(send, 1200));
  setTimeout(send, 4500);
}
