const API_BASE = "https://jenvu.com";

const TV_SYMBOL = {
  XAUUSD: "OANDA:XAUUSD",
  XAUEUR: "OANDA:XAUEUR",
  XAUGBP: "OANDA:XAUGBP",
  XAUJPY: "OANDA:XAUJPY",
  XAUAUD: "OANDA:XAUAUD",
  XAUCHF: "OANDA:XAUCHF",
};

async function fetchLatest(pair) {
  const url = pair
    ? `${API_BASE}/api/public/latest-signal?pair=${encodeURIComponent(pair)}`
    : `${API_BASE}/api/public/latest-signal`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("fetch failed");
  const d = await r.json();
  return d.signal;
}

function render(sig) {
  const el = document.getElementById("signal");
  if (!sig) {
    el.innerHTML = '<div class="empty">No recent signal.</div>';
    return;
  }
  const dir = String(sig.direction || "").toLowerCase();
  const dirCls = dir === "buy" ? "buy" : "sell";
  el.innerHTML = `
    <div><span class="${dirCls}">${(sig.direction || "").toUpperCase()}</span> ${sig.pair} · Grade ${sig.grade || "-"} · ${Math.round(sig.confidence || 0)}%</div>
    <div style="margin-top:6px"><span class="lbl">Entry</span><span class="val">${sig.entry ?? "-"}</span></div>
    <div><span class="lbl">SL</span><span class="val">${sig.sl ?? "-"}</span></div>
    <div><span class="lbl">TP</span><span class="val">${sig.tp ?? "-"}</span></div>
    <div><span class="lbl">R:R</span><span class="val">${sig.rr ?? "-"}</span></div>
    <div class="muted" style="margin-top:6px">${sig.killzone || sig.session || ""} · ${new Date(sig.fired_at).toLocaleTimeString()}</div>
  `;
}

async function openTradingView(pair) {
  const sig = await fetchLatest(pair).catch(() => null);
  const symbol = TV_SYMBOL[pair] || pair;
  const url = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`;
  const payload = sig ? { pair, symbol, signal: sig, ts: Date.now() } : null;
  if (payload) await chrome.storage.local.set({ [`jenvu:signal:${pair}`]: payload, "jenvu:last": payload });
  chrome.tabs.create({ url });
}

document.querySelectorAll("button[data-pair]").forEach((b) => {
  b.addEventListener("click", () => openTradingView(b.dataset.pair));
});

fetchLatest().then(render).catch(() => render(null));
