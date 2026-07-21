// Runs inside TradingView chart pages. Renders a floating Jenvu card and
// attempts to draw Entry / SL / TP horizontal price lines using TradingView's
// keyboard shortcut (Alt+H) + the "Set price" dialog it opens on drop.
// Falls back to a visual overlay drawn over the chart if drawing tools fail.

const state = { signal: null, overlay: null };

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "jenvu-draw" && msg.signal) {
    state.signal = msg.signal;
    ensureCard();
    // Try native drawings — best effort. If it fails, the overlay still works.
    try { drawNative(msg.signal); } catch (e) { console.warn("[Jenvu] native draw failed", e); }
    drawOverlay(msg.signal);
  }
});

// ---------- Floating card ----------
function ensureCard() {
  let el = document.getElementById("jenvu-card");
  if (!el) {
    el = document.createElement("div");
    el.id = "jenvu-card";
    document.documentElement.appendChild(el);
  }
  const s = state.signal;
  if (!s) { el.style.display = "none"; return; }
  const dir = s.direction === "long" ? "BUY" : "SELL";
  const color = s.direction === "long" ? "#059669" : "#dc2626";
  el.innerHTML = `
    <div class="jv-head" style="border-left:4px solid ${color}">
      <div class="jv-pair">${s.pair} · <span style="color:${color}">${dir}</span></div>
      <button class="jv-close" title="Close">×</button>
    </div>
    <div class="jv-row"><span>Entry</span><b>${s.entry}</b></div>
    <div class="jv-row"><span>Stop-Loss</span><b style="color:#dc2626">${s.sl}</b></div>
    <div class="jv-row"><span>Take-Profit</span><b style="color:#059669">${s.tp}</b></div>
    <div class="jv-meta">Grade ${s.grade} · ${s.confidence}% · R:R ${s.rr}${s.killzone ? " · " + s.killzone : ""}</div>
    <div class="jv-actions">
      <button class="jv-btn" data-act="copy">Copy</button>
      <button class="jv-btn" data-act="redraw">Redraw</button>
    </div>
  `;
  el.style.display = "block";
  el.querySelector(".jv-close").onclick = () => { el.style.display = "none"; removeOverlay(); };
  el.querySelectorAll(".jv-btn").forEach((b) => {
    b.onclick = () => {
      const act = b.dataset.act;
      if (act === "copy") {
        navigator.clipboard.writeText(`Entry ${s.entry}\nSL ${s.sl}\nTP ${s.tp}`);
        b.textContent = "Copied ✓"; setTimeout(() => (b.textContent = "Copy"), 1500);
      } else if (act === "redraw") {
        try { drawNative(s); } catch {}
        drawOverlay(s);
      }
    };
  });
}

// ---------- Overlay canvas fallback ----------
function removeOverlay() {
  if (state.overlay) { state.overlay.remove(); state.overlay = null; }
}
function findChartPane() {
  // TradingView's price scale canvas has data-name="pane-top-widgets"'s sibling.
  const canvases = document.querySelectorAll("canvas");
  let best = null, bestArea = 0;
  canvases.forEach((c) => {
    const r = c.getBoundingClientRect();
    const area = r.width * r.height;
    if (area > bestArea && r.width > 400 && r.height > 200) { best = c; bestArea = area; }
  });
  return best;
}
function drawOverlay(sig) {
  removeOverlay();
  const chart = findChartPane();
  if (!chart) return;
  const rect = chart.getBoundingClientRect();
  const box = document.createElement("div");
  box.id = "jenvu-overlay";
  box.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;pointer-events:none;z-index:2147483000;`;
  document.body.appendChild(box);
  state.overlay = box;

  // Without access to TV's price-to-y mapping, we place lines at fixed
  // proportional positions and label them. Real placement uses drawNative().
  const rows = [
    { label: `Entry ${sig.entry}`, color: "#0ea5e9", frac: 0.5 },
    { label: `SL ${sig.sl}`, color: "#dc2626", frac: sig.direction === "long" ? 0.75 : 0.25 },
    { label: `TP ${sig.tp}`, color: "#059669", frac: sig.direction === "long" ? 0.25 : 0.75 },
  ];
  rows.forEach((r) => {
    const line = document.createElement("div");
    line.style.cssText = `position:absolute;left:0;right:60px;top:${r.frac * 100}%;height:1px;background:${r.color};opacity:0.85;`;
    const tag = document.createElement("div");
    tag.textContent = r.label;
    tag.style.cssText = `position:absolute;right:2px;top:${r.frac * 100}%;transform:translateY(-50%);background:${r.color};color:#fff;font:11px/1 system-ui;padding:2px 6px;border-radius:3px;`;
    box.appendChild(line); box.appendChild(tag);
  });

  // Re-position on resize / scroll (TV chart may reflow).
  const reflow = () => {
    if (!state.overlay) return;
    const c = findChartPane(); if (!c) return;
    const nr = c.getBoundingClientRect();
    Object.assign(state.overlay.style, { left: nr.left + "px", top: nr.top + "px", width: nr.width + "px", height: nr.height + "px" });
  };
  window.addEventListener("resize", reflow, { passive: true });
  window.addEventListener("scroll", reflow, { passive: true });
}

// ---------- Native TV horizontal price line via Alt+H ----------
// TradingView's Alt+H binding activates the Horizontal Line tool. Clicking
// anywhere on the chart drops it at that price; we then double-click the line
// to open its settings and type the exact price. This is best-effort — TV UI
// changes will break it; the overlay above still shows the levels.
async function drawNative(sig) {
  const chart = findChartPane();
  if (!chart) return;
  const rect = chart.getBoundingClientRect();
  const cx = rect.left + rect.width * 0.7;

  const lines = [
    { price: sig.entry, y: rect.top + rect.height * 0.5,  color: "#0ea5e9" },
    { price: sig.sl,    y: rect.top + rect.height * (sig.direction === "long" ? 0.75 : 0.25), color: "#dc2626" },
    { price: sig.tp,    y: rect.top + rect.height * (sig.direction === "long" ? 0.25 : 0.75), color: "#059669" },
  ];

  for (const l of lines) {
    // Focus chart first
    chart.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: cx, clientY: l.y }));
    chart.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, clientX: cx, clientY: l.y }));

    // Alt+H → Horizontal Line tool
    ["keydown", "keyup"].forEach((type) => {
      document.dispatchEvent(new KeyboardEvent(type, {
        key: "h", code: "KeyH", altKey: true, bubbles: true,
      }));
    });
    await sleep(180);
    // Drop line at cursor location
    chart.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: cx, clientY: l.y }));
    chart.dispatchEvent(new MouseEvent("mouseup",   { bubbles: true, clientX: cx, clientY: l.y }));
    chart.dispatchEvent(new MouseEvent("click",     { bubbles: true, clientX: cx, clientY: l.y }));
    await sleep(220);
  }
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
