// Phase 2: floating Jenvu panel + chart overlay drawing (Entry / SL / TP / OB / FVG).
// Draws by mapping prices → pixels using TradingView's visible price-axis labels.

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

  // ---------- Floating panel ----------
  function createOverlay() {
    const wrap = document.createElement("div");
    wrap.id = "jenvu-overlay";
    wrap.innerHTML = `
      <div class="jenvu-hdr">
        <span>Jenvu Signal</span>
        <div>
          <button data-act="draw" title="Draw on chart">✎</button>
          <button data-act="refresh" title="Refresh">↻</button>
          <button data-act="close" title="Hide">×</button>
        </div>
      </div>
      <div class="jenvu-body" id="jenvu-body">Loading…</div>
    `;
    document.body.appendChild(wrap);

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

    wrap.querySelector('[data-act="close"]').addEventListener("click", () => {
      wrap.remove();
      removeChartOverlay();
    });
    wrap.querySelector('[data-act="refresh"]').addEventListener("click", loadAndRender);
    wrap.querySelector('[data-act="draw"]').addEventListener("click", () => {
      currentDrawEnabled = !currentDrawEnabled;
      if (!currentDrawEnabled) removeChartOverlay();
      else drawChartOverlay(currentSignal);
    });

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
      <div class="jenvu-muted">${sig.killzone || sig.session || ""} · ${sig.fired_at ? new Date(sig.fired_at).toLocaleString() : ""}</div>
      <div class="jenvu-actions">
        <button data-copy="${sig.entry ?? ""}">Entry</button>
        <button data-copy="${sig.sl ?? ""}">SL</button>
        <button data-copy="${sig.tp ?? ""}">TP</button>
      </div>
    `;
    body.querySelectorAll("button[data-copy]").forEach((b) => {
      b.addEventListener("click", () => {
        navigator.clipboard.writeText(b.dataset.copy || "");
        const t = b.textContent;
        b.textContent = "✓";
        setTimeout(() => (b.textContent = t), 900);
      });
    });
  }

  // ---------- Chart overlay (Phase 2) ----------
  let currentSignal = null;
  let currentDrawEnabled = true;

  function findChartRoot() {
    // Best-effort selectors across TradingView layouts (advanced chart, main site, symbols).
    return (
      document.querySelector('table.chart-markup-table') ||
      document.querySelector('div.chart-container') ||
      document.querySelector('div[class*="chart-container"]') ||
      document.querySelector('div.chart-widget') ||
      null
    );
  }

  function findPriceAxis(root) {
    // Price axis contains value labels we can parse.
    const cand = root.querySelectorAll('td.price-axis, div[class*="priceAxis"], canvas');
    // We only need bounding rect + labels; try axis cell first
    const axis = root.querySelector('td.price-axis') || root.querySelector('div[class*="priceAxis"]');
    return axis;
  }

  // Read visible price labels from the axis to build price→y mapping.
  function readPriceLabels(axis) {
    if (!axis) return [];
    const nodes = axis.querySelectorAll('div, span');
    const out = [];
    nodes.forEach((n) => {
      const txt = (n.textContent || '').trim().replace(/[, ]/g, '');
      if (!/^-?\d+(\.\d+)?$/.test(txt)) return;
      const rect = n.getBoundingClientRect();
      if (rect.height < 6 || rect.height > 40) return;
      const price = parseFloat(txt);
      if (!isFinite(price)) return;
      out.push({ price, y: rect.top + rect.height / 2 });
    });
    // dedupe by y
    const seen = new Set();
    return out.filter((p) => {
      const k = Math.round(p.y);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).sort((a, b) => a.y - b.y);
  }

  function buildMapper(labels) {
    if (labels.length < 2) return null;
    // linear fit: y = m*price + b using extremes
    const a = labels[0], b = labels[labels.length - 1];
    if (a.price === b.price) return null;
    const m = (b.y - a.y) / (b.price - a.price);
    const c = a.y - m * a.price;
    return (price) => m * price + c;
  }

  function removeChartOverlay() {
    const el = document.getElementById('jenvu-chart-svg');
    if (el) el.remove();
  }

  function drawChartOverlay(sig) {
    removeChartOverlay();
    if (!sig || !currentDrawEnabled) return;
    const root = findChartRoot();
    if (!root) return;
    const axis = findPriceAxis(root);
    const labels = readPriceLabels(axis || root);
    const mapY = buildMapper(labels);
    if (!mapY) return;

    const rect = root.getBoundingClientRect();
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('id', 'jenvu-chart-svg');
    Object.assign(svg.style, {
      position: 'fixed',
      left: rect.left + 'px',
      top: rect.top + 'px',
      width: rect.width + 'px',
      height: rect.height + 'px',
      pointerEvents: 'none',
      zIndex: '2147483646',
    });

    const line = (price, color, label, dash) => {
      if (price == null) return;
      const y = mapY(Number(price)) - rect.top;
      if (!isFinite(y) || y < 0 || y > rect.height) return;
      const l = document.createElementNS(svgNS, 'line');
      l.setAttribute('x1', 0); l.setAttribute('x2', rect.width);
      l.setAttribute('y1', y); l.setAttribute('y2', y);
      l.setAttribute('stroke', color);
      l.setAttribute('stroke-width', '1.5');
      if (dash) l.setAttribute('stroke-dasharray', dash);
      svg.appendChild(l);

      const bg = document.createElementNS(svgNS, 'rect');
      const txt = `${label} ${price}`;
      const w = txt.length * 6.5 + 12;
      bg.setAttribute('x', 8);
      bg.setAttribute('y', y - 9);
      bg.setAttribute('width', w);
      bg.setAttribute('height', 16);
      bg.setAttribute('fill', color);
      bg.setAttribute('rx', 3);
      svg.appendChild(bg);

      const t = document.createElementNS(svgNS, 'text');
      t.setAttribute('x', 14);
      t.setAttribute('y', y + 3);
      t.setAttribute('fill', '#fff');
      t.setAttribute('font-family', 'Google Sans, -apple-system, Segoe UI, Roboto, sans-serif');
      t.setAttribute('font-size', '11');
      t.setAttribute('font-weight', '700');
      t.textContent = txt;
      svg.appendChild(t);
    };

    line(sig.entry, '#2563eb', 'ENTRY');
    line(sig.sl, '#c31a1a', 'SL', '4,3');
    line(sig.tp, '#0a7d0a', 'TP', '4,3');

    // Optional ICT zones from backend (order block / FVG). Expect { high, low }.
    const zone = (z, color, label) => {
      if (!z || z.high == null || z.low == null) return;
      const yH = mapY(Number(z.high)) - rect.top;
      const yL = mapY(Number(z.low)) - rect.top;
      const top = Math.min(yH, yL), h = Math.abs(yH - yL);
      if (!isFinite(top) || h < 1) return;
      const r = document.createElementNS(svgNS, 'rect');
      r.setAttribute('x', 0); r.setAttribute('y', top);
      r.setAttribute('width', rect.width); r.setAttribute('height', h);
      r.setAttribute('fill', color); r.setAttribute('opacity', '0.15');
      svg.appendChild(r);
      const t = document.createElementNS(svgNS, 'text');
      t.setAttribute('x', rect.width - 60); t.setAttribute('y', top + 12);
      t.setAttribute('fill', color); t.setAttribute('font-size', '10');
      t.setAttribute('font-weight', '700');
      t.textContent = label;
      svg.appendChild(t);
    };
    zone(sig.order_block, '#f59e0b', 'OB');
    zone(sig.fvg, '#8b5cf6', 'FVG');

    document.body.appendChild(svg);
  }

  // Redraw on resize/scroll/DOM churn
  const scheduleRedraw = (() => {
    let t = null;
    return () => {
      if (t) return;
      t = setTimeout(() => { t = null; drawChartOverlay(currentSignal); }, 120);
    };
  })();
  window.addEventListener('resize', scheduleRedraw);
  window.addEventListener('scroll', scheduleRedraw, true);
  new MutationObserver(scheduleRedraw).observe(document.body, { childList: true, subtree: true });

  async function loadAndRender() {
    const pair = detectPair();
    const body = document.getElementById("jenvu-body");
    if (body) body.textContent = "Loading…";
    const sig = await fetchLatest(pair);
    currentSignal = sig;
    render(sig);
    drawChartOverlay(sig);
  }

  const start = () => { createOverlay(); loadAndRender(); };
  if (document.readyState === "complete") setTimeout(start, 800);
  else window.addEventListener("load", () => setTimeout(start, 800));

  // Auto-refresh every 45s + on URL change
  setInterval(loadAndRender, 45000);
  let lastHref = location.href;
  setInterval(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      loadAndRender();
    }
  }, 1500);
})();
