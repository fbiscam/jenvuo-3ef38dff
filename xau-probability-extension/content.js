"use strict";
(() => {
  if (document.getElementById("nc-panel")) return;
  const panel = document.createElement("aside");
  panel.id = "nc-panel";
  panel.innerHTML = `<header class="nc-bar"><span class="nc-title"><img class="nc-logo" src="${chrome.runtime.getURL("icon.png")}" alt="Jenvu"><span class="nc-dot"></span>Jenvu Probability</span><button class="nc-min" title="Collapse">−</button></header><div class="nc-controls"><input value="XAUUSD" disabled><select aria-label="Timeframe"><option value="5m">5m</option><option value="15m">15m</option><option value="1h">1h</option><option value="4h">4h</option></select></div><div class="nc-root"><div class="nc-loading"><span class="nc-spin"></span>Computing Gold probability…</div></div>`;
  document.body.appendChild(panel);
  const root = panel.querySelector(".nc-root"), tf = panel.querySelector("select");
  async function load() {
    root.innerHTML = '<div class="nc-loading"><span class="nc-spin"></span>Computing ICT/SMC probability…</div>';
    try {
      const data = await JenvuProbability.analyze(tf.value);
      root.innerHTML = JenvuUI.render(data);
      JenvuUI.startClock(root);
      root.querySelector("[data-refresh]")?.addEventListener("click", load);
    } catch (error) { root.innerHTML = `<div class="nc-error">${String(error?.message || error)}</div>`; }
  }
  panel.querySelector(".nc-min").addEventListener("click", () => panel.classList.toggle("nc-collapsed"));
  tf.addEventListener("change", load);
  let drag = null;
  panel.querySelector(".nc-bar").addEventListener("pointerdown", event => { if (event.target.closest("button")) return; drag = { x:event.clientX, y:event.clientY, top:panel.offsetTop, left:panel.offsetLeft }; panel.setPointerCapture(event.pointerId); });
  panel.querySelector(".nc-bar").addEventListener("pointermove", event => { if (!drag) return; panel.style.left = `${Math.max(0, drag.left + event.clientX - drag.x)}px`; panel.style.top = `${Math.max(0, drag.top + event.clientY - drag.y)}px`; panel.style.right = "auto"; });
  panel.querySelector(".nc-bar").addEventListener("pointerup", () => { drag = null; });
  load();
})();