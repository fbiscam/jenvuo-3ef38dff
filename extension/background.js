// Background service worker — passes messages between popup, content script, and API.
const API_BASE = "https://jenvu.com";

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "jenvu:fetch-latest") {
    const pair = msg.pair;
    const url = pair
      ? `${API_BASE}/api/public/latest-signal?pair=${encodeURIComponent(pair)}`
      : `${API_BASE}/api/public/latest-signal`;
    fetch(url, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => sendResponse({ ok: true, signal: d?.signal ?? null }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true; // async
  }
});
