// Proxies market-data requests so content scripts can read feeds that
// do not send CORS headers (Yahoo gold feed).
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.type !== "jenvu-fetch" || typeof msg.url !== "string") return;
  const ok =
    msg.url.startsWith("https://api.binance.com/") ||
    msg.url.startsWith("https://query1.finance.yahoo.com/");
  if (!ok) {
    sendResponse({ ok: false, error: "blocked" });
    return;
  }
  fetch(msg.url)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
    .then((data) => sendResponse({ ok: true, data }))
    .catch((e) => sendResponse({ ok: false, error: String(e && e.message ? e.message : e) }));
  return true; // async response
});
