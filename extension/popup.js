const $ = (id) => document.getElementById(id);

async function load() {
  const s = await chrome.storage.local.get(["endpoint", "customEndpoint", "token", "lastStatus"]);
  const ep = s.endpoint ?? "https://jenvu.com";
  $("endpoint").value = ep === "custom" ? "custom" : ep;
  $("customEndpoint").value = s.customEndpoint ?? "";
  $("customEndpoint").style.display = ep === "custom" ? "block" : "none";
  $("token").value = s.token ?? "";
  if (s.lastStatus) setStatus(s.lastStatus.text, s.lastStatus.tone);
  renderSignal();
}
load();

$("endpoint").addEventListener("change", (e) => {
  $("customEndpoint").style.display = e.target.value === "custom" ? "block" : "none";
});

function setStatus(text, tone) {
  const el = $("status");
  el.textContent = text;
  el.className = "status" + (tone ? " " + tone : "");
  chrome.storage.local.set({ lastStatus: { text, tone } });
}

async function resolveEndpoint() {
  const sel = $("endpoint").value;
  return sel === "custom" ? $("customEndpoint").value.trim().replace(/\/+$/, "") : sel;
}

$("save").addEventListener("click", async () => {
  const endpoint = await resolveEndpoint();
  const token = $("token").value.trim();
  if (!endpoint || !token) return setStatus("Endpoint and token required.", "err");
  await chrome.storage.local.set({
    endpoint: $("endpoint").value, customEndpoint: $("customEndpoint").value.trim(), token,
  });
  setStatus("Saved. Testing…", null);
  chrome.runtime.sendMessage({ type: "poll-now" });
  setTimeout(async () => {
    const { lastResult } = await chrome.storage.local.get("lastResult");
    if (lastResult?.ok) setStatus(`Connected · ${lastResult.plan ?? "no plan"}${lastResult.alerts_enabled === false ? " · alerts off" : ""}`, "ok");
    else setStatus(lastResult?.error ?? "No response yet.", "err");
    renderSignal();
  }, 1200);
});

$("test").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "poll-now" });
  setStatus("Fetching…", null);
  setTimeout(renderSignal, 900);
});

async function renderSignal() {
  const { lastResult } = await chrome.storage.local.get("lastResult");
  const box = $("signal");
  const s = lastResult?.signal;
  if (!s) { box.style.display = "none"; return; }
  box.style.display = "block";
  const dir = s.direction === "long" ? "▲ BUY" : "▼ SELL";
  const color = s.direction === "long" ? "#059669" : "#dc2626";
  box.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center">
      <b>${s.pair}</b>
      <span style="color:${color};font-weight:600">${dir} · Grade ${s.grade}</span>
    </div>
    <div class="row2"><span>Entry</span><b>${s.entry}</b></div>
    <div class="row2"><span>Stop-Loss</span><b>${s.sl}</b></div>
    <div class="row2"><span>Take-Profit</span><b>${s.tp}</b></div>
    <div class="row2"><span class="muted">${s.confidence}% · R:R ${s.rr} · ${s.killzone ?? "—"}</span></div>
    <button id="copy" class="secondary" style="margin-top:8px">Copy Entry / SL / TP</button>
    <button id="open" style="margin-top:6px">Open on TradingView</button>
  `;
  $("copy").onclick = () => {
    navigator.clipboard.writeText(`Entry ${s.entry}\nSL ${s.sl}\nTP ${s.tp}`);
    $("copy").textContent = "Copied ✓";
  };
  $("open").onclick = () => chrome.runtime.sendMessage({ type: "open-tv", signal: s });
}
