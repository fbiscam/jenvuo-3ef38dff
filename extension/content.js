// Jenvu content script for TradingView charts.
//
// Renders:
//  1. A floating summary card (Entry/SL/TP/Grade/R:R)
//  2. An SVG overlay that draws BOS/CHoCH, FVG, order blocks, liquidity and
//     Entry/SL/TP lines one-by-one over ~5 seconds — Claude-style.
//  3. A narration bar at the bottom, syncing text to each drawn marking.
//
// Price → screen-Y mapping is derived from TradingView's DOM price axis
// (best-effort; if the axis can't be scraped we fall back to a proportional
// mapping across the visible chart area so the walkthrough still runs).

(() => {
  const CARD_ID = "jenvu-card";
  const SVG_ID = "jenvu-svg";
  const NARR_ID = "jenvu-narr";

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "jenvu-draw" && msg.signal) {
      try { render(msg.signal); } catch (e) { console.warn("[Jenvu]", e); }
    }
  });

  function q(sel, root = document) { return root.querySelector(sel); }

  function chartRect() {
    // TradingView's main chart canvas has this classy container.
    const el =
      q('[data-name="legend-source-item"]')?.closest("table") ||
      q(".chart-container") ||
      q(".layout__area--center") ||
      document.body;
    const r = el.getBoundingClientRect();
    return {
      left: r.left + 40,
      top: r.top + 40,
      right: r.right - 80, // leave room for the right price axis
      bottom: r.bottom - 60,
      width: Math.max(200, r.width - 120),
      height: Math.max(200, r.height - 100),
    };
  }

  // Scrape visible price scale labels ("4072.5" text nodes on the right axis)
  // to map price → Y. Fallback: use markings' price range across chart height.
  function buildPriceMap(prices) {
    const rect = chartRect();
    // Attempt: read numeric labels on right price axis.
    const labels = Array.from(
      document.querySelectorAll('[data-name="price-axis"] div, .price-axis__labels, .price-axis'),
    ).flatMap((n) => Array.from(n.querySelectorAll("*")));
    const points = [];
    for (const n of labels) {
      const txt = (n.textContent || "").replace(/,/g, "").trim();
      if (!/^\d{1,3}(\.\d+)?$|^\d{4,7}(\.\d+)?$/.test(txt)) continue;
      const v = Number(txt);
      if (!isFinite(v) || v <= 0) continue;
      const r = n.getBoundingClientRect();
      if (r.top < rect.top - 20 || r.bottom > rect.bottom + 20) continue;
      points.push({ y: (r.top + r.bottom) / 2, price: v });
    }
    if (points.length >= 2) {
      // Use extremes for a linear map.
      points.sort((a, b) => a.price - b.price);
      const lo = points[0];
      const hi = points[points.length - 1];
      const slope = (lo.y - hi.y) / (hi.price - lo.price);
      const priceToY = (p) => hi.y + (hi.price - p) * slope;
      return { priceToY, rect, source: "axis" };
    }
    // Fallback: derive from marking price range.
    const nums = prices.filter((p) => isFinite(p) && p > 0);
    if (nums.length < 2) {
      return { priceToY: () => rect.top + rect.height / 2, rect, source: "flat" };
    }
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const pad = (max - min) * 0.25 || max * 0.001;
    const lo = min - pad;
    const hi = max + pad;
    const priceToY = (p) => {
      if (!isFinite(p)) return rect.top + rect.height / 2;
      const t = (p - lo) / (hi - lo);
      return rect.top + (1 - t) * rect.height;
    };
    return { priceToY, rect, source: "fallback" };
  }

  function ensureSvg() {
    let svg = document.getElementById(SVG_ID);
    if (svg) svg.remove();
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.id = SVG_ID;
    svg.classList.add("jenvu-svg");
    svg.setAttribute("width", String(window.innerWidth));
    svg.setAttribute("height", String(window.innerHeight));
    document.body.appendChild(svg);
    return svg;
  }

  function colorFor(m, dir) {
    const kind = String(m.kind || "").toLowerCase();
    if (m.type === "entry") return "#3b82f6";
    if (m.type === "sl") return "#ef4444";
    if (m.type === "tp") return "#10b981";
    if (m.type === "bos" || m.type === "choch") return kind === "bullish" ? "#22c55e" : "#f97316";
    if (m.type === "fvg") return kind === "bullish" ? "#60a5fa" : "#f472b6";
    if (m.type === "orderBlock" || m.type === "zone" || m.type === "breaker") {
      return kind === "demand" || kind === "bullish" ? "#22c55e" : "#ef4444";
    }
    if (m.type === "liquidity" || m.type === "eqh" || m.type === "eql") return "#eab308";
    if (m.type === "premiumZone") return "#f97316";
    if (m.type === "discountZone") return "#38bdf8";
    return dir === "long" ? "#22c55e" : "#ef4444";
  }

  function drawLine(svg, y, color, label, rect, dashed = false) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(rect.left));
    line.setAttribute("x2", String(rect.right));
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    line.setAttribute("stroke", color);
    if (dashed) line.setAttribute("stroke-dasharray", "6 5");
    line.classList.add("line");
    svg.appendChild(line);
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", String(rect.right - 4));
    t.setAttribute("y", String(y - 4));
    t.setAttribute("text-anchor", "end");
    t.classList.add("label");
    t.textContent = label;
    svg.appendChild(t);
    return [line, t];
  }

  function drawZone(svg, yHi, yLo, color, label, rect) {
    const rectEl = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rectEl.setAttribute("x", String(rect.left));
    rectEl.setAttribute("y", String(Math.min(yHi, yLo)));
    rectEl.setAttribute("width", String(rect.right - rect.left));
    rectEl.setAttribute("height", String(Math.abs(yLo - yHi) || 6));
    rectEl.setAttribute("fill", color);
    rectEl.setAttribute("stroke", color);
    rectEl.setAttribute("stroke-width", "1");
    rectEl.classList.add("zone");
    svg.appendChild(rectEl);
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", String(rect.left + 8));
    t.setAttribute("y", String(Math.min(yHi, yLo) + 12));
    t.classList.add("label");
    t.textContent = label;
    svg.appendChild(t);
    return [rectEl, t];
  }

  function priceLabelFor(m) {
    if (m.price != null) return `${m.label || m.type} · ${Number(m.price).toFixed(2)}`;
    if (m.priceLow != null && m.priceHigh != null) {
      return `${m.label || m.type} · ${Number(m.priceLow).toFixed(2)}–${Number(m.priceHigh).toFixed(2)}`;
    }
    return m.label || m.type;
  }

  function renderCard(sig) {
    let card = document.getElementById(CARD_ID);
    if (card) card.remove();
    card = document.createElement("div");
    card.id = CARD_ID;
    card.className = "jenvu-card";
    const isLong = sig.direction === "long" || sig.direction === "BUY";
    card.innerHTML = `
      <button class="close" aria-label="close">×</button>
      <h3>
        <span>${sig.pair} <span class="${isLong ? "buy" : "sell"}">${isLong ? "▲ BUY" : "▼ SELL"}</span></span>
        <span class="tag">Grade ${sig.grade ?? "—"}</span>
      </h3>
      <div class="row"><span>Entry</span><b>${sig.entry ?? "—"}</b></div>
      <div class="row"><span>Stop-Loss</span><b>${sig.sl ?? "—"}</b></div>
      <div class="row"><span>Take-Profit</span><b>${sig.tp ?? "—"}</b></div>
      <div class="row"><span>R:R</span><b>${sig.rr ?? "—"}</b></div>
      <div class="row"><span>Confidence</span><b>${sig.confidence ?? "—"}%</b></div>
      <div class="muted">${sig.killzone ?? "—"} · HTF ${sig.htf_bias ?? "—"}</div>
      <div class="btns">
        <button id="jenvu-copy">Copy levels</button>
        <button id="jenvu-replay" class="primary">Replay</button>
      </div>
    `;
    document.body.appendChild(card);
    card.querySelector(".close").onclick = () => teardown();
    card.querySelector("#jenvu-copy").onclick = () => {
      navigator.clipboard.writeText(`Entry ${sig.entry}\nSL ${sig.sl}\nTP ${sig.tp}`);
      card.querySelector("#jenvu-copy").textContent = "Copied ✓";
    };
    card.querySelector("#jenvu-replay").onclick = () => render(sig);
  }

  function ensureNarr() {
    let bar = document.getElementById(NARR_ID);
    if (bar) bar.remove();
    bar = document.createElement("div");
    bar.id = NARR_ID;
    bar.className = "jenvu-narr";
    bar.innerHTML = `<span class="dot"></span><span class="step">1/1</span><span class="say">Preparing analysis…</span>`;
    document.body.appendChild(bar);
    return bar;
  }

  function teardown() {
    document.getElementById(CARD_ID)?.remove();
    document.getElementById(SVG_ID)?.remove();
    document.getElementById(NARR_ID)?.remove();
  }

  async function render(sig) {
    teardown();
    renderCard(sig);
    const narr = ensureNarr();
    const svg = ensureSvg();

    const markings = Array.isArray(sig.markings) ? sig.markings.slice(0, 30) : [];
    const narration = Array.isArray(sig.narration) ? sig.narration : [];

    // Ensure Entry/SL/TP lines exist even if backend didn't include them.
    const hasType = (t) => markings.some((m) => m.type === t);
    if (sig.entry != null && !hasType("entry"))
      markings.push({ type: "entry", price: Number(sig.entry), label: `Entry ${sig.entry}` });
    if (sig.sl != null && !hasType("sl"))
      markings.push({ type: "sl", price: Number(sig.sl), label: `SL ${sig.sl}` });
    if (sig.tp != null && !hasType("tp"))
      markings.push({ type: "tp", price: Number(sig.tp), label: `TP ${sig.tp}` });

    // Collect all prices to build the fallback map.
    const allPrices = [];
    for (const m of markings) {
      if (m.price != null) allPrices.push(Number(m.price));
      if (m.priceLow != null) allPrices.push(Number(m.priceLow));
      if (m.priceHigh != null) allPrices.push(Number(m.priceHigh));
    }
    const { priceToY, rect } = buildPriceMap(allPrices);

    // Redraw on resize / TV layout changes.
    const onResize = () => {
      svg.setAttribute("width", String(window.innerWidth));
      svg.setAttribute("height", String(window.innerHeight));
    };
    window.addEventListener("resize", onResize);
    onResize();

    // Timeline: 6s total budget across N steps, min 350ms per step.
    const steps = [];
    for (let i = 0; i < markings.length; i++) {
      const m = markings[i];
      const color = colorFor(m, sig.direction);
      const label = priceLabelFor(m);
      let els = [];
      if (m.price != null) {
        const y = priceToY(Number(m.price));
        const dashed = m.type === "sl" || m.type === "tp";
        els = drawLine(svg, y, color, label, rect, dashed);
      } else if (m.priceLow != null && m.priceHigh != null) {
        const yLo = priceToY(Number(m.priceLow));
        const yHi = priceToY(Number(m.priceHigh));
        els = drawZone(svg, yHi, yLo, color, label, rect);
      } else {
        continue;
      }
      const narrHit = narration.find((n) => n.markingIndex === i);
      steps.push({ els, say: narrHit?.say || label });
    }

    // Prepend any narration entries not tied to a marking (e.g. bias intro).
    for (const n of narration) {
      if (n.markingIndex == null) steps.unshift({ els: [], say: n.say });
    }

    if (steps.length === 0) {
      narr.querySelector(".say").textContent = "No markings returned.";
      return;
    }

    const totalMs = Math.min(6500, Math.max(2200, steps.length * 550));
    const per = Math.max(320, Math.floor(totalMs / steps.length));

    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      narr.querySelector(".step").textContent = `${i + 1}/${steps.length}`;
      narr.querySelector(".say").textContent = s.say;
      for (const el of s.els) el.classList.add("show");
      await sleep(per);
    }
    // Final line: always leave a call-to-action.
    narr.querySelector(".say").textContent =
      `Setup ready · ${sig.pair} · Entry ${sig.entry} · SL ${sig.sl} · TP ${sig.tp}`;
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
})();
