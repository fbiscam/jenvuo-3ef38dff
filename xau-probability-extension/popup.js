"use strict";
(() => {
  const root = document.getElementById("root");
  const tf = document.getElementById("tf");
  async function load() {
    root.innerHTML = '<div class="nc-loading"><span class="nc-spin"></span>Computing ICT/SMC probability…</div>';
    try {
      const data = await JenvuProbability.analyze(tf.value);
      root.innerHTML = JenvuUI.render(data);
      JenvuUI.startClock(root);
      root.querySelector("[data-refresh]")?.addEventListener("click", load);
    } catch (error) {
      root.innerHTML = `<div class="nc-error">${String(error?.message || error)}</div>`;
    }
  }
  chrome.storage.local.get(["jenvu-theme", "jenvu-tf"], saved => {
    if (saved["jenvu-theme"] === "light") document.body.classList.add("nc-light");
    if (["5m","15m","1h","4h"].includes(saved["jenvu-tf"])) tf.value = saved["jenvu-tf"];
    load();
  });
  tf.addEventListener("change", () => { chrome.storage.local.set({ "jenvu-tf": tf.value }); load(); });
  document.getElementById("theme").addEventListener("click", () => {
    document.body.classList.toggle("nc-light");
    chrome.storage.local.set({ "jenvu-theme": document.body.classList.contains("nc-light") ? "light" : "dark" });
  });
})();