// Polls Jenvu every 20 s, opens/updates TradingView, and pushes signals +
// SMC markings to the content script for guided step-by-step drawing.

const POLL_ALARM = "jenvu-poll";

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(POLL_ALARM, { periodInMinutes: 0.34 });
});
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(POLL_ALARM, { periodInMinutes: 0.34 });
});

chrome.alarms.onAlarm.addListener((a) => { if (a.name === POLL_ALARM) poll(); });

chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
  if (msg?.type === "poll-now") { poll().then(() => respond({ ok: true })); return true; }
  if (msg?.type === "open-tv" && msg.signal) { openAndDraw(msg.signal); respond({ ok: true }); return; }
  if (msg?.type === "analyze-now") { analyzeNow(msg.pair).then(respond); return true; }
});

async function baseAndToken() {
  const { endpoint, customEndpoint, token } = await chrome.storage.local.get([
    "endpoint", "customEndpoint", "token",
  ]);
  const base = (endpoint === "custom" ? customEndpoint : endpoint) || "https://jenvu.com";
  return { base, token };
}

async function poll() {
  const { base, token } = await baseAndToken();
  const { lastSignalId, autoOpen } = await chrome.storage.local.get(["lastSignalId", "autoOpen"]);
  if (!token) return;
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

async function analyzeNow(pair) {
  const { base, token } = await baseAndToken();
  if (!token) return { ok: false, error: "no_token" };
  try {
    const res = await fetch(`${base}/api/public/extension/analyze`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ pair }),
    });
    const data = await res.json().catch(() => ({ ok: false, error: "bad_json" }));
    await chrome.storage.local.set({ lastAnalyze: data });
    if (data?.ok && data.plan) {
      // Normalize to the same shape openAndDraw expects.
      const p = data.plan;
      openAndDraw({
        id: data.scan_id,
        pair: p.pair,
        direction: p.direction === "BUY" ? "long" : p.direction === "SELL" ? "short" : p.direction,
        entry: p.entry,
        sl: p.sl,
        tp: p.tp,
        rr: p.rr,
        confidence: p.confidence,
        grade: p.grade,
        killzone: p.killzone,
        htf_bias: p.htf_bias,
        markings: p.markings,
        narration: p.narration,
        structure: p.structure,
      });
    }
    return data;
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

function tvSymbol(pair) {
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
  const send = (attempt = 0) => {
    chrome.tabs.sendMessage(tab.id, { type: "jenvu-draw", signal: sig }).catch(() => {
      if (attempt < 6) setTimeout(() => send(attempt + 1), 1500);
    });
  };
  setTimeout(() => send(0), 4500);
}
