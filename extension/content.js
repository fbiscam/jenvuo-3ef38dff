// Jenvu content script for TradingView charts.
//
// Progressive ICT/SMC walkthrough — like a 25-year pro trader would mark up
// a chart, one element at a time, with a narration bar syncing to each draw:
//   1. HTF bias / dealing range (premium/discount)
//   2. HTF structure (BOS / CHoCH)
//   3. HTF zones (OB / FVG)
//   4. LTF structure (BOS / CHoCH)
//   5. LTF zones (FVG / OB / breaker / inverted FVG)
//   6. Liquidity pools (EQH / EQL / sweeps)
//   7. Entry, Stop-Loss, Take-Profit (dashed, last)
//
// Price → screen-Y mapping is derived from TradingView's DOM price axis
// (best-effort); if the axis can't be scraped, falls back to a proportional
// mapping across the visible chart area so the walkthrough still runs.

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
    const el =
      q('[data-name="legend-source-item"]')?.closest("table") ||
      q(".chart-container") ||
      q(".layout__area--center") ||
      document.body;
    const r = el.getBoundingClientRect();
    return {
      left: r.left + 40,
      top: r.top + 40,
      right: r.right - 80,
      bottom: r.bottom - 60,
      width: Math.max(200, r.width - 120),
      height: Math.max(200, r.height - 100),
    };
  }

  function buildPriceMap(prices) {
    const rect = chartRect();
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
      points.sort((a, b) => a.price - b.price);
      const lo = points[0];
      const hi = points[points.length - 1];
      const slope = (lo.y - hi.y) / (hi.price - lo.price);
      const priceToY = (p) => hi.y + (hi.price - p) * slope;
      return { priceToY, rect, source: "axis" };
    }
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

  // Rich palette per SMC concept — matches the walkthrough legend.
  function colorFor(m, dir) {
    const kind = String(m.kind || "").toLowerCase();
    switch (m.type) {
      case "entry": return "#3b82f6";
      case "sl": return "#ef4444";
      case "tp": return "#10b981";
      case "bos": return kind === "bullish" ? "#22c55e" : "#f97316";
      case "choch": return kind === "bullish" ? "#a3e635" : "#fb923c";
      case "fvg": return kind === "bullish" ? "#60a5fa" : "#f472b6";
      case "orderBlock":
      case "zone":
        return kind === "demand" || kind === "bullish" ? "#22c55e" : "#ef4444";
      case "breaker": return kind === "bullish" ? "#14b8a6" : "#e11d48";
      case "liquidity":
      case "eqh":
      case "eql": return "#eab308";
      case "premiumZone": return "#f97316";
      case "discountZone": return "#38bdf8";
      case "oteZone": return kind === "bullish" ? "#a78bfa" : "#c084fc";
      default: return dir === "long" ? "#22c55e" : "#ef4444";
    }
  }

  // Priority: draw HTF context first, LTF next, entry/SL/TP last.
  function stepPriority(m) {
    const tf = m.tf === "htf" ? 0 : 10;
    const typeOrder = {
      premiumZone: 1, discountZone: 1, oteZone: 2,
      bos: 3, choch: 3,
      orderBlock: 4, zone: 4, breaker: 4,
      fvg: 5,
      liquidity: 6, eqh: 6, eql: 6,
      entry: 20, sl: 21, tp: 22,
    };
    return tf + (typeOrder[m.type] ?? 15);
  }

  function drawLine(svg, y, color, label, rect, dashed = false, emphasis = false) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(rect.left));
    line.setAttribute("x2", String(rect.right));
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    line.setAttribute("stroke", color);
    if (dashed) line.setAttribute("stroke-dasharray", "7 5");
    line.classList.add("line");
    if (emphasis) line.classList.add("emphasis");
    svg.appendChild(line);

    // pill background for the label
    const pill = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const padX = 6, padY = 3;
    const approxW = Math.max(60, label.length * 6.2);
    pill.setAttribute("x", String(rect.right - approxW - padX * 2 - 2));
    pill.setAttribute("y", String(y - 15));
    pill.setAttribute("width", String(approxW + padX * 2));
    pill.setAttribute("height", "16");
    pill.setAttribute("rx", "4");
    pill.setAttribute("fill", color);
    pill.setAttribute("fill-opacity", "0.9");
    pill.classList.add("tag-pill");
    svg.appendChild(pill);

    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", String(rect.right - padX - 2));
    t.setAttribute("y", String(y - 3));
    t.setAttribute("text-anchor", "end");
    t.setAttribute("fill", "#0b1220");
    t.setAttribute("stroke", "transparent");
    t.classList.add("label");
    t.textContent = label;
    svg.appendChild(t);
    return [line, pill, t];
  }

  function drawZone(svg, yHi, yLo, color, label, rect, emphasis = false) {
    const rectEl = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rectEl.setAttribute("x", String(rect.left));
    rectEl.setAttribute("y", String(Math.min(yHi, yLo)));
    rectEl.setAttribute("width", String(rect.right - rect.left));
    rectEl.setAttribute("height", String(Math.max(6, Math.abs(yLo - yHi))));
    rectEl.setAttribute("fill", color);
    rectEl.setAttribute("stroke", color);
    rectEl.setAttribute("stroke-width", "1.2");
    rectEl.classList.add("zone");
    if (emphasis) rectEl.classList.add("emphasis");
    svg.appendChild(rectEl);

    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", String(rect.left + 10));
    t.setAttribute("y", String(Math.min(yHi, yLo) + 13));
    t.setAttribute("fill", "#f9fafb");
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

  // Human-readable narration fallback per marking type.
  function fallbackSay(m) {
    const t = (m.tf || "").toUpperCase();
    const k = String(m.kind || "").toLowerCase();
    switch (m.type) {
      case "premiumZone": return `Price sitting in the premium half of the ${t || "HTF"} dealing range — sellers get a discount to enter.`;
      case "discountZone": return `Price in the discount half of the ${t || "HTF"} range — buyers get institutional discount.`;
      case "oteZone": return `${k === "bullish" ? "Bullish" : "Bearish"} OTE (62–79%) pocket — optimal trade entry window.`;
      case "bos": return `${k === "bullish" ? "Bullish" : "Bearish"} Break of Structure on ${t === "HTF" ? "1H" : "15M"} — directional intent confirmed.`;
      case "choch": return `${k === "bullish" ? "Bullish" : "Bearish"} Change of Character on ${t === "HTF" ? "1H" : "15M"} — trend shift signature.`;
      case "orderBlock":
      case "zone":
        return `${t === "HTF" ? "HTF" : "LTF"} ${k === "demand" || k === "bullish" ? "demand" : "supply"} order block — institutional footprint left behind.`;
      case "breaker": return `${k === "bullish" ? "Bullish" : "Bearish"} Breaker Block — failed OB flipped, powerful reaction zone.`;
      case "fvg": return `${t === "HTF" ? "HTF" : "LTF"} ${k === "bullish" ? "bullish" : "bearish"} Fair Value Gap — imbalance the algorithm will revisit.`;
      case "liquidity": return `Liquidity pool tagged — smart money hunts stops here.`;
      case "eqh": return `Equal Highs — buy-side liquidity resting above, likely sweep target.`;
      case "eql": return `Equal Lows — sell-side liquidity resting below, likely sweep target.`;
      case "entry": return `Entry ${m.price} — trigger armed at the mitigation.`;
      case "sl": return `Stop-Loss ${m.price} — invalidation beyond the structure.`;
      case "tp": return `Take-Profit ${m.price} — targeting the opposing liquidity pool.`;
      default: return m.label || m.type;
    }
  }

  function renderCard(sig) {
    document.getElementById(CARD_ID)?.remove();
    const card = document.createElement("div");
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
      navigator.clipboard.writeText(`${sig.pair} ${isLong ? "BUY" : "SELL"}\nEntry ${sig.entry}\nSL ${sig.sl}\nTP ${sig.tp}\nR:R ${sig.rr}`);
      card.querySelector("#jenvu-copy").textContent = "Copied ✓";
    };
    card.querySelector("#jenvu-replay").onclick = () => render(sig);
  }

  function ensureNarr() {
    document.getElementById(NARR_ID)?.remove();
    const bar = document.createElement("div");
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

    const markings = Array.isArray(sig.markings) ? sig.markings.slice(0, 40) : [];
    const narration = Array.isArray(sig.narration) ? sig.narration : [];

    const hasType = (t) => markings.some((m) => m.type === t);
    if (sig.entry != null && !hasType("entry"))
      markings.push({ type: "entry", tf: "ltf", price: Number(sig.entry), label: `Entry ${sig.entry}` });
    if (sig.sl != null && !hasType("sl"))
      markings.push({ type: "sl", tf: "ltf", price: Number(sig.sl), label: `SL ${sig.sl}` });
    if (sig.tp != null && !hasType("tp"))
      markings.push({ type: "tp", tf: "ltf", price: Number(sig.tp), label: `TP ${sig.tp}` });

    // Sort into a pro walkthrough order.
    const ordered = markings
      .map((m, originalIndex) => ({ m, originalIndex, prio: stepPriority(m) }))
      .sort((a, b) => a.prio - b.prio);

    const allPrices = [];
    for (const { m } of ordered) {
      if (m.price != null) allPrices.push(Number(m.price));
      if (m.priceLow != null) allPrices.push(Number(m.priceLow));
      if (m.priceHigh != null) allPrices.push(Number(m.priceHigh));
    }
    const { priceToY, rect } = buildPriceMap(allPrices);

    const onResize = () => {
      svg.setAttribute("width", String(window.innerWidth));
      svg.setAttribute("height", String(window.innerHeight));
    };
    window.addEventListener("resize", onResize);
    onResize();

    const steps = [];
    // Intro narration lines not tied to a marking → first steps.
    for (const n of narration) {
      if (n.markingIndex == null && n.say) {
        steps.push({ els: [], say: String(n.say) });
      }
    }

    for (const { m, originalIndex } of ordered) {
      const color = colorFor(m, sig.direction);
      const label = priceLabelFor(m);
      const emphasis = m.type === "entry" || m.type === "sl" || m.type === "tp";
      let els = [];
      if (m.price != null) {
        const y = priceToY(Number(m.price));
        const dashed = m.type === "sl" || m.type === "tp" || m.type === "eqh" || m.type === "eql" || m.type === "liquidity";
        els = drawLine(svg, y, color, label, rect, dashed, emphasis);
      } else if (m.priceLow != null && m.priceHigh != null) {
        const yLo = priceToY(Number(m.priceLow));
        const yHi = priceToY(Number(m.priceHigh));
        els = drawZone(svg, yHi, yLo, color, label, rect, emphasis);
      } else {
        continue;
      }
      const aiSay = narration.find((n) => n.markingIndex === originalIndex)?.say;
      steps.push({ els, say: aiSay || fallbackSay(m) });
    }

    if (steps.length === 0) {
      narr.querySelector(".say").textContent = "No markings returned.";
      return;
    }

    // 7-8 second total budget, min 380 ms per step so viewers can read.
    const totalMs = Math.min(8500, Math.max(3200, steps.length * 620));
    const per = Math.max(380, Math.floor(totalMs / steps.length));

    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      narr.querySelector(".step").textContent = `${i + 1}/${steps.length}`;
      narr.querySelector(".say").textContent = s.say;
      for (const el of s.els) el.classList.add("show");
      await sleep(per);
    }
    const isLong = sig.direction === "long" || sig.direction === "BUY";
    narr.querySelector(".say").textContent =
      `${sig.pair} ${isLong ? "BUY" : "SELL"} · Entry ${sig.entry} · SL ${sig.sl} · TP ${sig.tp} · Grade ${sig.grade ?? "—"} · ${sig.confidence ?? "—"}%`;
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
})();
