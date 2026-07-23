// Injected on TradingView chart pages.
// Shows a floating Jenvu signal panel with Entry/SL/TP for the current pair.
// Phase 1: read-only overlay (no chart drawing DOM hacks yet).

(function () {
  if (window.__jenvuInjected) return;
  window.__jenvuInjected = true;

  const PAIRS = ["XAUUSD", "XAUEUR", "XAUGBP", "XAUJPY", "XAUAUD", "XAUCHF"];

  function detectPair() {
    const href = location.href.toUpperCase();
    for (const p of PAIRS) if (href.includes(p)) return p;
    return null;
  }

  function fetchLatest(pair) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "jenvu:fetch-latest", pair }, (res) => resolve(res?.signal ?? null));
    });
  }

  function createOverlay() {
    const wrap = document.createElement("div");
    wrap.id = "jenvu-overlay";
    wrap.innerHTML = `
      <div class="jenvu-hdr">
        <span>Jenvu Signal</span>
        <div>
          <button data-act="refresh" title="Refresh">↻</button>
          <button data-act="close" title="Hide">×</button>
        </div>
      </div>
      <div class="jenvu-body" id="jenvu-body">Loading…</div>
    `;
    document.body.appendChild(wrap);

    // Drag
    const hdr = wrap.querySelector(".jenvu-hdr");
    let dx = 0, dy = 0, dragging = false;
    hdr.addEventListener("mousedown", (e) => {
      if (e.target.tagName === "BUTTON") return;
      dragging = true;
      const r = wrap.getBoundingClientRect();
      dx = e.clientX - r.left; dy = e.clientY - r.top;
      e.preventDefault();
    });
    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      wrap.style.left = (e.clientX - dx) + "px";
      wrap.style.top = (e.clientY - dy) + "px";
      wrap.style.right = "auto";
    });
    window.addEventListener("mouseup", () => (dragging = false));

    wrap.querySelector('[data-act="close"]').addEventListener("click", () => wrap.remove());
    wrap.querySelector('[data-act="refresh"]').addEventListener("click", loadAndRender);

    return wrap;
  }

  function render(sig) {
    const body = document.getElementById("jenvu-body");
    if (!body) return;
    if (!sig) {
      body.innerHTML = '<div style="color:#888">No recent signal for this pair.</div>';
      return;
    }
    const dir = String(sig.direction || "").toLowerCase();
    const dirCls = dir === "buy" ? "jenvu-buy" : "jenvu-sell";
    body.innerHTML = `
      <div class="jenvu-row"><span class="${dirCls} jenvu-val">${(sig.direction || "").toUpperCase()} ${sig.pair}</span><span class="jenvu-muted">Grade ${sig.grade || "-"} · ${Math.round(sig.confidence || 0)}%</span></div>
      <div class="jenvu-row"><span class="jenvu-lbl">Entry</span><span class="jenvu-val">${sig.entry ?? "-"}</span></div>
      <div class="jenvu-row"><span class="jenvu-lbl">SL</span><span class="jenvu-val" style="color:#c31a1a">${sig.sl ?? "-"}</span></div>
      <div class="jenvu-row"><span class="jenvu-lbl">TP</span><span class="jenvu-val" style="color:#0a7d0a">${sig.tp ?? "-"}</span></div>
      <div class="jenvu-row"><span class="jenvu-lbl">R:R</span><span class="jenvu-val">${sig.rr ?? "-"}</span></div>
      <div class="jenvu-muted">${sig.killzone || sig.session || ""} · ${new Date(sig.fired_at).toLocaleString()}</div>
      <div class="jenvu-actions">
        <button data-copy="${sig.entry ?? ""}">Copy Entry</button>
        <button data-copy="${sig.sl ?? ""}">Copy SL</button>
        <button data-copy="${sig.tp ?? ""}">Copy TP</button>
      </div>
    `;
    body.querySelectorAll("button[data-copy]").forEach((b) => {
      b.addEventListener("click", () => {
        navigator.clipboard.writeText(b.dataset.copy || "");
        b.textContent = "Copied";
        setTimeout(() => (b.textContent = b.getAttribute("data-copy") && b.textContent === "Copied"
          ? b.textContent : b.textContent), 900);
      });
    });
  }

  async function loadAndRender() {
    const pair = detectPair();
    const body = document.getElementById("jenvu-body");
    if (body) body.textContent = "Loading…";
    const sig = await fetchLatest(pair);
    render(sig);
  }

  // Wait for TV shell
  const start = () => { createOverlay(); loadAndRender(); };
  if (document.readyState === "complete") setTimeout(start, 800);
  else window.addEventListener("load", () => setTimeout(start, 800));

  // Re-check when URL changes (TV is SPA)
  let lastHref = location.href;
  setInterval(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      loadAndRender();
    }
  }, 1500);
})();
