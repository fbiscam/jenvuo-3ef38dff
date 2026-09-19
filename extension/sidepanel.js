const ENDPOINTS =
  location.protocol === "chrome-extension:"
    ? [
        "https://jenvu.com/api/public/gold",
        "https://project--06cd4260-299b-4286-8096-c43f2f596dee.lovable.app/api/public/gold",
        "https://project--06cd4260-299b-4286-8096-c43f2f596dee-dev.lovable.app/api/public/gold",
      ]
    : ["/api/public/gold"];
let API = ENDPOINTS[0];

/* ---------- Jenvu API key ---------- */
const KEY_STORE = "jenvu_api_key_v1";
let apiKey = null;

function readKey() {
  return new Promise((resolve) => {
    try {
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        chrome.storage.local.get(KEY_STORE, (r) => resolve(r?.[KEY_STORE] || null));
      } else {
        resolve(localStorage.getItem(KEY_STORE));
      }
    } catch {
      resolve(null);
    }
  });
}

function writeKey(value) {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local)
      chrome.storage.local.set({ [KEY_STORE]: value });
    else localStorage.setItem(KEY_STORE, value);
  } catch {
    /* ignore */
  }
}

function showKeyGate(show, message) {
  const gate = document.getElementById("keyGate");
  if (!gate) return;
  gate.classList.toggle("hidden", !show);
  const err = document.getElementById("keyErr");
  if (err) err.textContent = message || "";
}

const TIMEFRAMES = ["5m", "15m", "1h", "4h", "1d"];
const QUICKS = [
  { label: "Next 15m candle", text: "Forecast the next 15 minute candle for the selected market." },
  { label: "Read screen", text: "Read the chart on my screen using ICT/SMC concepts." },
  { label: "Trade plan", text: "Give me a trade plan now: bias, entry (POI), stop, TP1/TP2, RR." },
  {
    label: "Liquidity",
    text: "Where is liquidity resting and where should I expect the next sweep?",
  },
];
const CANDLE_FORECAST_INTENT = /\b(?:next|upcoming|agli|agla|agali|aglay)\s+(?:(?:15\s*(?:m|min|minute)s?)\s+)?candle\b|\b15\s*(?:m|min|minute)s?\s+(?:next\s+)?candle\b|\bcandle\s+(?:konsi|kaunsi|kesa|kaisa)\s+(?:banegi|bnegi|banay\s+gi|hog[ai])\b|\b(?:bullish|bearish)\s+(?:next|agli|agla|agali|aglay)\s+candle\b/i;
const ACTIONABLE_ANALYSIS_INTENT = [
  /\b(?:give|show|make|create|need|want|tell)\s+(?:me\s+)?(?:a\s+|the\s+|my\s+)?(?:live\s+|current\s+)?(?:signal|setup|trade\s*plan|entry|stop\s*loss|take\s*profit|tp\d?|sl)\b|\b(?:signal|setup|trade\s*plan|entry|stop\s*loss|take\s*profit|tp\d?|sl)\s+(?:now|please|batao|do|chahiye)\b|\b(?:buy\s*(?:or|\/)?\s*sell|long\s*(?:or|\/)?\s*short|should\s+i\s+(?:buy|sell|take\s+(?:the\s+)?trade)|where\s+is\s+liquidity|next\s+sweep)\b/i,
  /\b(analy[sz]e?|review|read|check|scan|inspect|mark)\b[\s\S]{0,60}\b(chart|screen|market|price|xau(?:\/usd)?|gold|setup|structure|liquidity|bias)\b/i,
  /\b(chart|screen|market|price|xau(?:\/usd)?|gold|setup|structure|liquidity|bias)\b[\s\S]{0,60}\b(analy[sz]e?|review|read|check|scan|inspect|mark)\b/i,
  /\b(?:tajzia|tajziya)\s+(?:karo|kro|do)\b|\b(?:signal|setup|trade\s*plan|entry|sl|tp\d?)\s+(?:batao|do|chahiye)\b|\b(?:kharidun|bechun|buy\s+karun|sell\s+karun)\b|\b(?:chart|market)\s*(?:dekho|check|dikhao)\b/i,
];

function requestsActionableAnalysis(text) {
  if (
    /\b(?:what\s+(?:is|are|does)|why\s+(?:is|does)|how\s+(?:does|do|to)|explain|define|meaning\s+of|means?|difference\s+between|teach\s+me|learn\s+about|understand)\b/i.test(
      text,
    )
  )
    return false;
  return ACTIONABLE_ANALYSIS_INTENT.some((pattern) => pattern.test(text));
}

function requestsCandleForecast(text) {
  return CANDLE_FORECAST_INTENT.test(text);
}

const $ = (id) => document.getElementById(id);

let timeframe = "15m";
let symbol = "XAUUSD";
let chartImage = null;
let stream = null;
let watchTimer = null;
let busy = false;
let controller = null;
const SEND_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 7-7 7 7M12 19V5"/></svg>';
const STOP_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none"/></svg>';
let history = [];

function setReviewStatus(text, state) {
  const el = $("reviewStatus");
  if (!el) return;
  el.textContent = text;
  el.className = "review-status" + (state ? " " + state : "");
}

/* ---------- chat threads (new chat + history) ---------- */

const STORE_KEY = "jenvu_threads_v1";
const SNAPSHOT_KEY = "jenvu_market_snapshot_v1";

const store = {
  get() {
    return new Promise((resolve) => {
      try {
        if (typeof chrome !== "undefined" && chrome.storage?.local) {
          chrome.storage.local.get(STORE_KEY, (r) =>
            resolve(r[STORE_KEY] || { threads: [], activeId: null }),
          );
        } else {
          resolve(
            JSON.parse(localStorage.getItem(STORE_KEY) || "null") || {
              threads: [],
              activeId: null,
            },
          );
        }
      } catch {
        resolve({ threads: [], activeId: null });
      }
    });
  },
  set(data) {
    try {
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        chrome.storage.local.set({ [STORE_KEY]: data });
      } else {
        localStorage.setItem(STORE_KEY, JSON.stringify(data));
      }
    } catch {
      /* quota — ignore */
    }
  },
};

let threads = []; // [{ id, title, updatedAt, messages: [{cls, text}] }]
let activeId = null;

function persist() {
  store.set({ threads, activeId });
}

function activeThread() {
  return threads.find((t) => t.id === activeId) || null;
}

function newChat() {
  activeId = null;
  history = [];
  chartImage = null;
  $("file").value = "";
  $("attached").classList.add("hidden");
  emptyState();
  updateQuickVisibility();
  $("historyPanel").classList.add("hidden");
  box.focus();
}

function loadThread(id) {
  const t = threads.find((x) => x.id === id);
  if (!t) return;
  activeId = id;
  history = t.messages.map((m) => ({
    role: m.cls === "user" ? "user" : "assistant",
    text: m.text,
  }));
  const el = $("thread");
  el.innerHTML = "";
  if (!t.messages.length) emptyState();
  t.messages.forEach((m) => addMsg(m.cls, m.text));
  updateQuickVisibility();
  $("historyPanel").classList.add("hidden");
  persist();
}

function saveMessage(cls, text) {
  if (cls === "err") return;
  let t = activeThread();
  if (!t) {
    t = {
      id: "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: "",
      updatedAt: Date.now(),
      messages: [],
    };
    threads.unshift(t);
    activeId = t.id;
  }
  t.messages.push({ cls, text });
  t.updatedAt = Date.now();
  if (!t.title && cls === "user") t.title = text.slice(0, 48) || "Chart analysis";
  threads.sort((a, b) => b.updatedAt - a.updatedAt);
  persist();
}

function deleteThread(id) {
  threads = threads.filter((t) => t.id !== id);
  if (activeId === id) {
    newChat();
  }
  persist();
  renderHistoryList();
}

function renderHistoryList() {
  const c = $("historyList");
  c.innerHTML = "";
  if (!threads.length) {
    c.innerHTML =
      '<div class="history-empty">No past chats yet.<br>Start a new chat — it will be saved here.</div>';
    return;
  }
  threads.forEach((t) => {
    const row = document.createElement("div");
    row.className = "history-item";
    const title = document.createElement("span");
    title.className = "htitle";
    title.textContent = t.title || "Chat";
    const date = document.createElement("span");
    date.className = "hdate";
    date.textContent = new Date(t.updatedAt).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
    });
    const del = document.createElement("button");
    del.className = "hdel";
    del.textContent = "✕";
    del.title = "Delete chat";
    del.onclick = (e) => {
      e.stopPropagation();
      deleteThread(t.id);
    };
    row.append(title, date, del);
    row.onclick = () => loadThread(t.id);
    c.appendChild(row);
  });
}

$("newchat").onclick = () => newChat();
if ($("newchat2")) $("newchat2").onclick = () => newChat();
$("historybtn").onclick = () => {
  const p = $("historyPanel");
  if (p.classList.contains("hidden")) {
    renderHistoryList();
    p.classList.remove("hidden");
  } else p.classList.add("hidden");
};
$("historyClose").onclick = () => $("historyPanel").classList.add("hidden");

function renderQuick() {
  const c = $("quick");
  c.innerHTML = "";
  QUICKS.forEach((q) => {
    const b = document.createElement("button");
    b.textContent = q.label;
    b.onclick = () => send(q.text);
    c.appendChild(b);
  });
}

function emptyState() {
  const t = $("thread");
  t.classList.add("has-empty");
  t.innerHTML =
    '<div class="empty">Your ICT/SMC gold analyst is ready.<br>' +
    "Share your chart and I’ll read structure, liquidity, FVGs and entries in real time.</div>";
  updateQuickVisibility();
}

function updateQuickVisibility() {
  const hasMessages = !!$("thread").querySelector(".msg");
  const hasContext = !!chartImage || !!stream;
  $("quick").classList.toggle("hidden", hasMessages || hasContext);
  const market = document.querySelector(".market");
  if (market) market.classList.toggle("hidden", hasMessages);
}

function scrollThread(force = false) {
  // The real scrolling element is the .content wrapper, not #thread.
  const t = document.querySelector(".content") || $("thread");
  if (!t) return;
  // ChatGPT-style: auto-scroll to latest, but don't yank the user down if
  // they scrolled up to read older messages (unless it's their own message).
  const nearBottom = t.scrollHeight - t.scrollTop - t.clientHeight < 160;
  if (!force && !nearBottom) return;
  const go = () => {
    t.scrollTop = t.scrollHeight;
  };
  requestAnimationFrame(() => {
    go();
    setTimeout(go, 60);
    setTimeout(go, 250);
  });
}

const ICONS = {
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 5.5A1.5 1.5 0 0 0 13.5 4H6a2 2 0 0 0-2 2v7.5A1.5 1.5 0 0 0 5.5 15"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 20h4l10-10a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5 4 20z"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M7 22V10l4-8a2 2 0 0 1 2 2v4h5a2 2 0 0 1 2 2.4l-1.5 8A2 2 0 0 1 16.5 22H7z"/><path d="M3 22h4V10H3z"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M17 2v12l-4 8a2 2 0 0 1-2-2v-4H6a2 2 0 0 1-2-2.4l1.5-8A2 2 0 0 1 7.5 2H17z"/><path d="M21 2h-4v12h4z"/></svg>',
};

function msgActions(text) {
  const bar = document.createElement("div");
  bar.className = "msg-actions";
  const mk = (name, title, html) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "act act-" + name;
    b.title = title;
    b.setAttribute("aria-label", title);
    b.innerHTML = html;
    bar.appendChild(b);
    return b;
  };
  const copy = mk("copy", "Copy", ICONS.copy);
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    copy.classList.add("done");
    setTimeout(() => copy.classList.remove("done"), 1200);
  });
  const edit = mk("edit", "Edit last prompt", ICONS.edit);
  edit.addEventListener("click", () => {
    const users = Array.from(document.querySelectorAll("#thread .msg.user"));
    const last = users[users.length - 1];
    const box = $("q");
    if (last && box) {
      box.value = last.textContent.trim();
      box.focus();
      box.dispatchEvent(new Event("input"));
    }
  });
  const up = mk("up", "Good response", ICONS.up);
  const down = mk("down", "Bad response", ICONS.down);
  up.addEventListener("click", () => {
    down.classList.remove("on");
    up.classList.toggle("on");
  });
  down.addEventListener("click", () => {
    up.classList.remove("on");
    down.classList.toggle("on");
  });
  return bar;
}

function addMsg(cls, text, shot) {
  const t = $("thread");
  const ownMessage = cls === "user";
  const d = document.createElement("div");
  d.className = "msg " + cls;
  if (shot) {
    const img = document.createElement("img");
    img.src = shot;
    img.className = "shot";
    img.addEventListener("load", () => scrollThread(true));
    d.appendChild(img);
  }
  const body = document.createElement("div");
  if (cls === "ai") {
    const inline = (s) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>")
        .replace(/(^|[^_])_([^_\n]+)_(?!_)/g, "$1<em>$2</em>");
    const tableCells = (line) =>
      line
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => cell.trim());
    const lines = text.split("\n");
    let list = null;
    let codeBlock = null;
    const closeList = () => {
      list = null;
    };
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const l = line.trim();
      if (l.startsWith("```")) {
        closeList();
        if (codeBlock) {
          body.appendChild(codeBlock);
          codeBlock = null;
        } else {
          codeBlock = document.createElement("pre");
          codeBlock.className = "md-code-block";
          const language = l.slice(3).trim();
          if (language) codeBlock.dataset.language = language;
        }
        continue;
      }
      if (codeBlock) {
        codeBlock.textContent += (codeBlock.textContent ? "\n" : "") + line;
        continue;
      }
      if (!l) {
        closeList();
        continue;
      }
      const next = (lines[index + 1] || "").trim();
      const isTableHeader =
        l.includes("|") && /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(next);
      if (isTableHeader) {
        closeList();
        const wrapper = document.createElement("div");
        wrapper.className = "md-table-wrap";
        const table = document.createElement("table");
        table.className = "md-table";
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        tableCells(l).forEach((cell) => {
          const th = document.createElement("th");
          th.innerHTML = inline(cell);
          headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        const tbody = document.createElement("tbody");
        index += 2;
        while (index < lines.length && lines[index].trim().includes("|")) {
          const row = document.createElement("tr");
          tableCells(lines[index]).forEach((cell) => {
            const td = document.createElement("td");
            td.innerHTML = inline(cell);
            row.appendChild(td);
          });
          tbody.appendChild(row);
          index += 1;
        }
        index -= 1;
        table.appendChild(tbody);
        wrapper.appendChild(table);
        body.appendChild(wrapper);
        continue;
      }
      const tradeRe =
        /^(?:[-*•]\s*)?(?:\*\*)?\s*(decision|verdict|pair|symbol|asset|direction|bias|side|type|order|entry(?:\s*(?:price|zone))?|buy(?:\s*limit|\s*stop)?|sell(?:\s*limit|\s*stop)?|sl|stop\s*loss|stoploss|tp\s*\d*|take\s*profit\s*\d*|target\s*\d*|r\s*[:/]\s*r|risk\s*[:/-]?\s*reward|rr|lot(?:\s*size)?|risk|timeframe|time\s*frame|tf|confidence|validity|why|reasons?)\s*(?:\*\*)?\s*[:\-–]\s*(.+)$/i;
      const tradeMatch = l.match(tradeRe);
      if (tradeMatch) {
        closeList();
        const card = document.createElement("div");
        card.className = "trade-card";
        const head = document.createElement("div");
        head.className = "trade-card-title";
        head.textContent = "Trade Plan";
        card.appendChild(head);
        const grid = document.createElement("div");
        grid.className = "trade-grid";
        let m = tradeMatch;
        while (m) {
          const label = m[1].replace(/\s+/g, " ").trim();
          const key = label.toLowerCase().replace(/[\s:/-]/g, "");
          const row = document.createElement("div");
          row.className = "trade-row";
          if (/^(sl|stoploss)$/.test(key)) row.classList.add("is-sl");
          else if (/^(tp\d*|takeprofit\d*|target\d*)$/.test(key)) row.classList.add("is-tp");
          else if (
            /^(entry|entryprice|entryzone|buy|buylimit|buystop|sell|selllimit|sellstop)$/.test(key)
          )
            row.classList.add("is-entry");
          const k = document.createElement("span");
          k.className = "trade-key";
          k.textContent = label.toUpperCase();
          const v = document.createElement("span");
          v.className = "trade-val";
          v.innerHTML = inline(m[2].replace(/\*\*/g, "").trim());
          row.appendChild(k);
          row.appendChild(v);
          grid.appendChild(row);
          index += 1;
          const nextLine = (lines[index] || "").trim();
          m = nextLine ? nextLine.match(tradeRe) : null;
          if (!m) {
            index -= 1;
            break;
          }
        }
        card.appendChild(grid);
        body.appendChild(card);
        continue;
      }
      const heading = l.match(/^#{1,6}\s*(.+)$/);
      const num = l.match(/^(\d+)[.)]\s+(.+)$/);
      const bullet = l.match(/^[-*•]\s+(.+)$/);

      if (heading) {
        closeList();
        const headingText = heading[1].replace(/\*\*/g, "").replace(/:$/, "").trim();
        const nextLine = (lines[index + 1] || "").trim();
        if (/^trade\s*plan$/i.test(headingText) && tradeRe.test(nextLine)) continue;
        const h = document.createElement("h4");
        h.innerHTML = inline(headingText);
        body.appendChild(h);
      } else if (num) {
        if (!list || list.tagName !== "OL") {
          list = document.createElement("ol");
          list.className = "md-list";
          body.appendChild(list);
        }
        const li = document.createElement("li");
        li.innerHTML = inline(num[2]);
        list.appendChild(li);
      } else if (bullet) {
        if (!list || list.tagName !== "UL") {
          list = document.createElement("ul");
          list.className = "md-list";
          body.appendChild(list);
        }
        const li = document.createElement("li");
        li.innerHTML = inline(bullet[1]);
        list.appendChild(li);
      } else {
        closeList();
        const p = document.createElement("p");
        p.className = "md-p";
        p.innerHTML = inline(l);
        body.appendChild(p);
      }
    }
    if (codeBlock) body.appendChild(codeBlock);
  } else {
    body.textContent = text;
  }

  d.appendChild(body);
  if (cls === "ai" && text) d.appendChild(msgActions(text));
  if (t.querySelector(".empty")) {
    t.innerHTML = "";
    t.classList.remove("has-empty");
  }
  t.appendChild(d);
  updateQuickVisibility();
  scrollThread(ownMessage);
  return d;
}

const REQUEST_DEADLINE_MS = 240000;

async function post(body, signal) {
  const requestId =
    "ext_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
  let lastErr;
  let authErr;
  for (const url of [API, ...ENDPOINTS.filter((u) => u !== API)]) {
    const requestController = new AbortController();
    const abortFromUser = () => requestController.abort();
    signal?.addEventListener("abort", abortFromUser, { once: true });
    // Safety net: a backend that accepts the request but never answers must
    // not leave the panel stuck on "analyzing" forever.
    let timedOut = false;
    const deadlineTimer = setTimeout(() => {
      timedOut = true;
      requestController.abort();
    }, REQUEST_DEADLINE_MS);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
          "x-request-id": requestId,
        },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: requestController.signal,
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401 || (res.status === 403 && json.code !== "FEATURE_LOCKED")) {
        const error = new Error(json.error || "Sign in with your Jenvu API key.");
        error.tryNextEndpoint = true;
        authErr = error;
        throw error;
      }
      if (res.status === 403 && json.code === "FEATURE_LOCKED") {
        throw new Error(
          json.error || "This feature is not included in your current plan. Upgrade to unlock it.",
        );
      }
      if (res.status === 402 || json.code === "LOW_BALANCE") {
        throw new Error(json.error || "Low balance. Top up your Jenvu wallet to continue.");
      }
      if (!res.ok) {
        const error = new Error(json.error || `Request failed (${res.status})`);
        throw error;
      }
      API = url;
      return json;
    } catch (e) {
      if (e && e.name === "AbortError") {
        if (signal?.aborted) throw e;
        if (timedOut) {
          throw new Error("That took too long. Please try again in a moment.");
        }
      }
      // Only move to another site address when the current address cannot be
      // reached. Replaying a completed 5xx analysis request against every
      // address duplicated the same primary + senior work and caused 5-minute
      // waits even though all addresses serve the same backend.
      if (e instanceof TypeError) e.tryNextEndpoint = true;
      lastErr = e;
      if (!e.retryable && !e.tryNextEndpoint) break;
    } finally {
      clearTimeout(deadlineTimer);
      signal?.removeEventListener("abort", abortFromUser);
    }
  }
  if (authErr) {
    showKeyGate(true, authErr.message || "Your API key is invalid or revoked.");
    throw authErr;
  }
  throw lastErr || new Error("Network error");
}

function cleanSymbol(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
}

async function detectChartSymbol() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab?.id || !String(tab.url || "").includes("tradingview.com")) {
      const label = $("detectedMarket");
      if (label) label.textContent = "Open TradingView";
      return false;
    }
    let pageContext = "";
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const candidates = [
            document.title,
            location.href,
            ...Array.from(document.querySelectorAll('[data-symbol-short], [data-name="legend-source-title"], [class*="symbolTitle"]'))
              .slice(0, 20)
              .map((node) => `${node.getAttribute("data-symbol-short") || ""} ${node.textContent || ""}`),
          ];
          const intervalNode = Array.from(
            document.querySelectorAll(
              '[data-name="interval-dialog-button"], [data-name="header-toolbar-intervals"] button, button[aria-label*="interval" i]',
            ),
          ).find((node) => {
            const rect = node.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });
          const interval = intervalNode
            ? `${intervalNode.getAttribute("data-value") || ""} ${intervalNode.getAttribute("aria-label") || ""} ${intervalNode.textContent || ""}`
            : "";
          return { context: candidates.join(" "), interval };
        },
      });
      const result = results?.[0]?.result;
      pageContext = String(result?.context || "");
      const intervalText = String(result?.interval || "").toUpperCase();
      const intervalMatch = intervalText.match(/(?:^|\s)(5M?|15M?|1H|60|4H|240|1D|D)(?:\s|$)/);
      const detectedTimeframe = intervalMatch?.[1];
      const normalizedTimeframe = detectedTimeframe === "5" || detectedTimeframe === "5M"
        ? "5m"
        : detectedTimeframe === "15" || detectedTimeframe === "15M"
          ? "15m"
          : detectedTimeframe === "1H" || detectedTimeframe === "60"
            ? "1h"
            : detectedTimeframe === "4H" || detectedTimeframe === "240"
              ? "4h"
              : detectedTimeframe === "1D" || detectedTimeframe === "D"
                ? "1d"
                : null;
      if (normalizedTimeframe) timeframe = normalizedTimeframe;
    } catch {
      pageContext = "";
    }
    const source = `${tab.title || ""} ${tab.url || ""} ${pageContext}`.toUpperCase();
    const compact = source.replace(/[^A-Z0-9]/g, "");
    const supported = ["XAUUSD", "XAGUSD", "EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "NZDUSD", "USDCAD", "USDCHF", "EURJPY", "GBPJPY", "BTCUSD", "ETHUSD", "SOLUSD", "NAS100", "SPX500", "US30", "USOIL"];
    const detected = supported.find((candidate) => compact.includes(candidate));
    const known = detected || (/GOLD/.test(source) ? "XAUUSD" : null);
    if (known) {
      const changed = symbol !== known;
      symbol = known;
      const label = $("detectedMarket");
      if (label) label.textContent = symbol;
      if (changed) lastPrice = null;
      return true;
    }
    const label = $("detectedMarket");
    if (label) label.textContent = "Pair not detected";
    return false;
  } catch {
    const label = $("detectedMarket");
    if (label) label.textContent = "Pair not detected";
    return false;
  }
}

/* ---------- price chart ---------- */

function drawChart(points) {
  const canvas = $("chart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const cleanPoints = Array.isArray(points)
    ? points.filter((point) => Number.isFinite(Number(point?.c)))
    : [];
  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.max(260, Math.round(rect.width || 300));
  const cssHeight = 132;
  const scale = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const pixelWidth = Math.round(cssWidth * scale);
  const pixelHeight = Math.round(cssHeight * scale);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  if (cleanPoints.length < 2) {
    ctx.fillStyle = "#5f6368";
    ctx.font = '11px "Poppins", system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("Loading chart…", cssWidth / 2, cssHeight / 2);
    return;
  }
  const labelGutter = 52;
  const W = cssWidth;
  const H = cssHeight;
  const plotW = Math.max(120, W - labelGutter);
  const pad = 10;
  const vals = cleanPoints.map((p) => Number(p.c));
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (max === min) {
    max += 1;
    min -= 1;
  }
  const span = max - min;
  const x = (i) => (i / (cleanPoints.length - 1)) * plotW;
  const y = (v) => pad + (1 - (v - min) / span) * (H - pad * 2);
  const up = vals[vals.length - 1] >= vals[0];
  const stroke = up ? "#c9a227" : "#c0553f";
  const lastY = y(vals[vals.length - 1]);

  ctx.strokeStyle = "rgba(0, 0, 0, 0.07)";
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.moveTo(0, H / 2);
  ctx.lineTo(plotW, H / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  const trace = new Path2D();
  cleanPoints.forEach((p, i) => {
    const px = x(i);
    const py = y(Number(p.c));
    if (i === 0) trace.moveTo(px, py);
    else trace.lineTo(px, py);
  });
  const area = new Path2D();
  area.addPath(trace);
  area.lineTo(plotW, H);
  area.lineTo(0, H);
  area.closePath();
  const fill = ctx.createLinearGradient(0, 0, 0, H);
  fill.addColorStop(0, up ? "rgba(201, 162, 39, 0.28)" : "rgba(192, 85, 63, 0.28)");
  fill.addColorStop(1, up ? "rgba(201, 162, 39, 0)" : "rgba(192, 85, 63, 0)");
  ctx.fillStyle = fill;
  ctx.fill(area);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.6;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke(trace);
  ctx.fillStyle = stroke;
  ctx.beginPath();
  ctx.arc(plotW - 2.6, lastY, 2.6, 0, Math.PI * 2);
  ctx.fill();
}

let lastPrice = null;

function updateCandleClock() {
  const el = $("candleClock");
  if (!el) return;
  const now = Date.now();
  const close = (Math.floor(now / 900000) + 1) * 900000;
  const seconds = Math.max(0, Math.ceil((close - now) / 1000));
  const minutes = Math.floor(seconds / 60);
  el.textContent = `15m closes in ${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function renderSnapshot(d) {
  const price = Number(d?.ticker?.price);
  const changePercent = Number(d?.ticker?.changePercent);
  if (!Number.isFinite(price) || !Array.isArray(d?.chart) || d.chart.length < 2) {
    throw new Error("Invalid live graph data");
  }
  const el = $("price");
  el.textContent = price.toFixed(2);
  if (lastPrice !== null && price !== lastPrice) {
    el.classList.remove("tick-up", "tick-down");
    void el.offsetWidth;
    el.classList.add(price > lastPrice ? "tick-up" : "tick-down");
  }
  lastPrice = price;
  const safeChange = Number.isFinite(changePercent) ? changePercent : 0;
  const up = safeChange >= 0;
  const ch = $("change");
  ch.textContent = `${up ? "▲" : "▼"} ${safeChange.toFixed(2)}%`;
  ch.className = "hchange " + (up ? "bull" : "bear");
  const trend = $("trend");
  if (trend) {
    const bias = String(d.technicals?.trend || d.indicators?.trend || (up ? "Bullish" : "Bearish"));
    trend.textContent = bias.toUpperCase();
    trend.className =
      "trend " + (/bull|up/i.test(bias) ? "bull" : /bear|down/i.test(bias) ? "bear" : "");
  }
  drawChart(d.chart);
}

async function loadSnapshot() {
  try {
    const d = await post({ action: "snapshot", timeframe, symbol });
    renderSnapshot(d);
    try {
      chrome.storage?.local?.set({ [SNAPSHOT_KEY]: { ...d, timeframe, symbol } });
    } catch {
      /* cache is optional */
    }
  } catch (e) {
    console.warn("market pulse failed", e);
    const trend = $("trend");
    if (lastPrice === null) {
      drawChart([]);
      if (trend) {
        trend.textContent = "RECONNECTING";
        trend.className = "trend";
      }
    }
  }
}

/* ---------- screen sharing ---------- */

function frameFromSource(source, sourceWidth, sourceHeight) {
  if (!sourceWidth || !sourceHeight) return null;
  const cv = $("cv");
  const w = Math.min(1600, sourceWidth);
  cv.width = w;
  cv.height = Math.max(1, Math.round((sourceHeight / sourceWidth) * w));
  const ctx = cv.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, cv.width, cv.height);
  const image = cv.toDataURL("image/jpeg", 0.82);
  return image.length > 1000 ? image : null;
}

function grabVideoFrame() {
  if (!stream) return null;
  const v = $("vid");
  if (v.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !v.videoWidth || !v.videoHeight)
    return null;
  return frameFromSource(v, v.videoWidth, v.videoHeight);
}

async function grabFrame() {
  const activeStream = stream;
  const track = activeStream?.getVideoTracks?.()[0];
  if (!track || track.readyState !== "live") return null;

  // ImageCapture reads from the MediaStreamTrack directly. This remains
  // reliable when Chrome throttles the hidden side-panel video element.
  if (typeof ImageCapture === "function") {
    try {
      const bitmap = await new ImageCapture(track).grabFrame();
      try {
        if (stream !== activeStream || track.readyState !== "live") return null;
        return frameFromSource(bitmap, bitmap.width, bitmap.height);
      } finally {
        bitmap.close?.();
      }
    } catch {
      /* Fall back to the video element below. */
    }
  }

  return stream === activeStream ? grabVideoFrame() : null;
}

function waitForVideoFrame(video, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
      resolve();
      return;
    }
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("The shared screen did not produce a visible frame."));
    }, timeoutMs);
    const cleanup = () => {
      clearTimeout(timeout);
      video.removeEventListener("loadeddata", ready);
      video.removeEventListener("playing", ready);
      video.removeEventListener("error", failed);
    };
    const ready = () => {
      if (!video.videoWidth) return;
      cleanup();
      if (typeof video.requestVideoFrameCallback === "function") {
        video.requestVideoFrameCallback(() => resolve());
      } else {
        requestAnimationFrame(() => resolve());
      }
    };
    const failed = () => {
      cleanup();
      reject(new Error("Chrome could not read the shared screen."));
    };
    video.addEventListener("loadeddata", ready);
    video.addEventListener("playing", ready);
    video.addEventListener("error", failed);
  });
}

function resetVideoEl() {
  const video = $("vid");
  if (!video) return null;
  try {
    video.pause();
  } catch {
    /* ignore */
  }
  try {
    video.srcObject = null;
  } catch {
    /* ignore */
  }
  return video;
}

function stopShare() {
  if (stream) {
    try {
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      /* ignore */
    }
  }
  stream = null;
  resetVideoEl();
  $("share").classList.remove("on");
  $("share").title = "Share screen";
  updateQuickVisibility();
}

let sharePending = false;

async function startShare() {
  // Always start from a clean video element so a second share works.
  if (stream) {
    try {
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      /* ignore */
    }
    stream = null;
  }
  const video = resetVideoEl();
  if (!video) throw new Error("Screen preview is not ready. Reopen the panel and try again.");

  const nextStream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: { ideal: 2, max: 5 }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    audio: false,
  });
  const track = nextStream.getVideoTracks()[0];
  if (!track) {
    nextStream.getTracks().forEach((t) => t.stop());
    throw new Error("Chrome did not provide a screen video track.");
  }

  video.srcObject = nextStream;
  video.muted = true;
  stream = nextStream;
  track.addEventListener(
    "ended",
    () => {
      if (stream === nextStream) stopShare();
    },
    { once: true },
  );

  try {
    await video.play();
  } catch {
    /* autoplay of a muted stream rarely fails; frame wait below is the real check */
  }
  await waitForVideoFrame(video, 12000).catch(() => {
    // ImageCapture can still read a live track when the hidden preview element
    // is delayed, so do not tear down an otherwise valid share here.
  });

  let shot = await grabFrame();
  for (let i = 0; i < 8 && !shot && track.readyState === "live"; i++) {
    await new Promise((r) => setTimeout(r, 250));
    shot = await grabFrame();
  }
  if (!shot && track.readyState !== "live") {
    throw new Error("Chrome stopped the screen share before it was ready.");
  }
}

$("share").onclick = async () => {
  if (sharePending) return;
  if (stream) return stopShare();
  sharePending = true;
  try {
    await startShare();
    $("share").classList.add("on");
    $("share").title = "Stop sharing";
  } catch (e) {
    stopShare();
    const msg = String(e?.name || "") === "NotAllowedError"
      ? "Screen share cancelled. Click the share button again and pick your chart tab or window."
      : e?.message ||
        "Screen sharing start nahi ho saki. Chrome prompt mein chart tab ya window select karein.";
    addMsg("ai err", msg);
  } finally {
    sharePending = false;
  }
  updateQuickVisibility();
};

/* ---------- chat ---------- */

$("attach").onclick = () => $("file").click();
$("file").onchange = (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  if (!/^(image\/png|image\/jpeg|image\/webp)$/i.test(f.type) || f.size > 3_300_000) {
    e.target.value = "";
    addMsg("ai err", "Please attach a PNG, JPEG, or WebP image under 3 MB.");
    return;
  }
  const r = new FileReader();
  r.onload = () => {
    chartImage = String(r.result);
    $("attached").classList.remove("hidden");
    updateQuickVisibility();
  };
  r.readAsDataURL(f);
};
$("clear").onclick = () => {
  chartImage = null;
  $("file").value = "";
  $("attached").classList.add("hidden");
  updateQuickVisibility();
};

const box = $("q");
box.addEventListener("input", () => {
  box.style.height = "auto";
  box.style.height = Math.min(box.scrollHeight, 110) + "px";
  updateSendState();
});
box.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});
function updateSendState() {
  const s = $("send");
  if (!s) return;
  if (busy) {
    s.disabled = false;
    s.classList.add("active", "stop");
    s.title = "Stop";
    s.setAttribute("aria-label", "Stop generating");
    if (s.dataset.mode !== "stop") {
      s.innerHTML = STOP_ICON;
      s.dataset.mode = "stop";
    }
    return;
  }
  s.classList.remove("stop");
  s.title = "Send";
  s.setAttribute("aria-label", "Send message");
  if (s.dataset.mode !== "send") {
    s.innerHTML = SEND_ICON;
    s.dataset.mode = "send";
  }
  const hasText = box.value.trim().length > 0;
  s.classList.toggle("active", hasText && !s.disabled);
}

function stopRequest() {
  if (controller) {
    try {
      controller.abort();
    } catch {
      /* already aborted */
    }
  }
}
updateSendState();
$("send").onclick = () => {
  if (busy) stopRequest();
  else send();
};

/* ---------- TradingView chart markings overlay ---------- */

const MARK_INTENT =
  /\b(mark|draw|show|highlight|overlay|nishan)\b|mark\s*kro|draw\s*kro|dikha\s*do/i;
const MARK_TOPIC =
  /\b(fvg|ob|order block|bos|choch|liquidity|liq|bsl|ssl|sweep|killzone|kill zone|price action|smc|imbalance|structure)\b/i;

function requestedMarkTopics(text) {
  const topics = new Set();
  if (/\b(fvg|fair value gap|imbalance)\b/i.test(text)) topics.add("fvg");
  if (/\b(ob|order block)\b/i.test(text)) topics.add("ob");
  if (/\b(bos|choch|ch\.o\.ch|break of structure|change of character|structure)\b/i.test(text))
    topics.add("structure");
  if (/\b(liquidity|liq|bsl|ssl)\b/i.test(text)) topics.add("liquidity");
  if (/\b(sweep|stop raid)\b/i.test(text)) topics.add("sweep");
  if (/\b(smc|ict|everything|all|sab|sari|saari)\b/i.test(text)) topics.add("all");
  return topics;
}

function markMatchesTopic(mark, topics) {
  if (topics.has("all")) return true;
  const label = String(mark.label || "").toLowerCase();
  if (topics.has("fvg") && label.includes("fvg")) return true;
  if (topics.has("ob") && label === "ob") return true;
  if (topics.has("structure") && mark.kind === "event") return true;
  if (topics.has("liquidity") && mark.kind === "line" && /^(bsl|ssl)$/.test(label)) return true;
  if (topics.has("sweep") && mark.kind === "sweep") return true;
  return false;
}

async function markOnPage(text, signal) {
  const d = await post({ action: "snapshot", timeframe, symbol }, signal);
  const availableMarks =
    Array.isArray(d.overlayMarks) && d.overlayMarks.length ? d.overlayMarks : d.marks || [];
  const topics = requestedMarkTopics(text);
  const marks = availableMarks.filter((mark) => markMatchesTopic(mark, topics));
  if (!marks.length) throw new Error("Requested marking ka koi valid live level abhi nahi mila.");
  const pts = (d.chart || [])
    .map((c) => (typeof c === "number" ? c : (c.close ?? c.c ?? 0)))
    .filter(Boolean);
  const levels = marks.flatMap((m) => (m.kind === "zone" ? [m.from, m.to] : [m.level]));
  const all = pts.concat(levels).filter((n) => Number.isFinite(n));
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = (hi - lo) * 0.08 || 1;

  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) throw new Error("Koi active tab nahi mila.");
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
  await chrome.tabs.sendMessage(tab.id, {
    type: "JENVU_MARK",
    marks,
    lo: lo - pad,
    hi: hi + pad,
    bias:
      topics.has("all") || topics.has("structure")
        ? (d.marksBias ?? d.technicals?.smc?.structure?.bias ?? null)
        : null,
    showSession: topics.has("all"),
  });
  return { count: marks.length, names: [...topics].filter((topic) => topic !== "all") };
}

async function applyLiveMarksToPage(d) {
  const marks = Array.isArray(d?.overlayMarks) ? d.overlayMarks : [];
  const pts = (d?.chart || []).map((c) => Number(c?.close ?? c?.c)).filter(Number.isFinite);
  const levels = marks
    .flatMap((m) => (m.kind === "zone" ? [Number(m.from), Number(m.to)] : [Number(m.level)]))
    .filter(Number.isFinite);
  if (!marks.length || !pts.length || !levels.length || typeof chrome === "undefined") return;
  const all = pts.concat(levels);
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = (hi - lo) * 0.08 || 1;
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id || !/tradingview\.com/i.test(tab.url || "")) return;
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
  await chrome.tabs.sendMessage(tab.id, {
    type: "JENVU_MARK",
    marks,
    lo: lo - pad,
    hi: hi + pad,
    bias: d.marksBias || null,
    showSession: true,
  });
}

async function send(preset, silentUser) {
  if (busy) return;
  const text = (preset ?? box.value).trim();
  if (!text && !chartImage && !stream) return;
  busy = true;
  // A running screen share supplies context only when the user asks for live
  // analysis. It must not turn every ordinary message into a trade plan.
  const candleForecastRequest = requestsCandleForecast(text);
  const analysisRequest = !candleForecastRequest && requestsActionableAnalysis(text);
  setReviewStatus(
    candleForecastRequest
      ? "15m candle forecast · calibrating…"
      : analysisRequest
        ? "ICT analysis · OmniRoute review…"
        : "Chat mode",
    analysisRequest || candleForecastRequest ? "checking" : "",
  );
  controller = new AbortController();
  $("send").disabled = false;
  updateSendState();
  if (!preset) {
    box.value = "";
    box.style.height = "auto";
  }

  if (text && MARK_INTENT.test(text) && MARK_TOPIC.test(text)) {
    if (!silentUser) {
      addMsg("user", text);
      saveMessage("user", text);
    }
    const p = addMsg("ai", "Chart par markings laga raha hoon…");
    try {
      const result = await markOnPage(text, controller.signal);
      p.remove();
      const names = result.names.length
        ? result.names.map((name) => name.toUpperCase()).join(", ")
        : "requested ICT/SMC";
      const msg = `Aapke chart par sirf ${names} ki ${result.count} marking${result.count === 1 ? "" : "s"} laga di hain. Levels approximate hain \u2014 overlay ke toolbar se \u25b2\u25bc aur \uff0b\uff0d se align kar sakte hain, \u2715 se hata dein.`;
      addMsg("ai", msg);
      saveMessage("ai", msg);
    } catch (e) {
      p.remove();
      addMsg(
        "ai err",
        e && e.name === "AbortError" ? "Request stopped." : e.message || "Markings nahi lag sakin.",
      );
    }
    busy = false;
    controller = null;
    $("send").disabled = false;
    updateSendState();
    return;
  }

  await detectChartSymbol();

  // Whenever a screen share is live the current frame travels with every
  // message, so plain questions like "can you see my screen?" are answered
  // from the actual picture instead of a blind "I cannot see it".
  let shot = stream ? await grabFrame() : null;
  if (!shot && stream) {
    for (let i = 0; i < 12 && !shot; i++) {
      await new Promise((r) => setTimeout(r, 250));
      shot = await grabFrame();
    }
  }
  if (!shot && stream && analysisRequest) {
    busy = false;
    controller = null;
    $("send").disabled = false;
    updateSendState();
    addMsg(
      "ai err",
      "Shared frame black ya unreadable hai. Share dobara start krka Chrome prompt mein chart tab/window select karein; minimized ya protected window select na karein.",
    );
    return;
  }
  if (!silentUser) {
    addMsg("user", text, chartImage || shot || undefined);
    saveMessage("user", text);
  }

  const pend = addMsg("ai", "");
  pend.textContent = "Thinking...";

  try {
    const d = await post(
      {
        action: "chat",
        timeframe,
        symbol,
        question: text,
        history: history.slice(-8),
        screenImage: shot || undefined,
        chartImage: chartImage || undefined,
      },
      controller.signal,
    );
    pend.remove();
    addMsg("ai", d.text);
    saveMessage("ai", d.text);
    history.push({ role: "user", text }, { role: "assistant", text: d.text });
    if (d.ticker) {
      $("price").textContent = d.ticker.price.toFixed(2);
    }
    if (d.mode === "conversation") {
      setReviewStatus("Chat mode", "");
    } else if (d.mode === "candle_forecast") {
      setReviewStatus("15m forecast · primary model reviewed", "verified");
    } else {
      setReviewStatus("Multi-timeframe ICT analysis complete", "verified");
    }
    if (Array.isArray(d.chart) && d.chart.length) renderSnapshot(d);
  } catch (e) {
    pend.remove();
    if (e && e.name === "AbortError") addMsg("ai err", "Request stopped.");
    else addMsg("ai err", e.message);
    if (analysisRequest) setReviewStatus("Analysis could not complete · retry", "failed");
    else setReviewStatus("Chat mode", "");
  } finally {
    busy = false;
    controller = null;
    $("send").disabled = false;
    updateSendState();
  }
}

renderQuick();
emptyState();
try {
  chrome.storage?.local?.get(SNAPSHOT_KEY, (saved) => {
    const snapshot = saved?.[SNAPSHOT_KEY];
    if (snapshot?.timeframe === timeframe && snapshot?.symbol === symbol) {
      try {
        renderSnapshot(snapshot);
      } catch {
        /* wait for live data */
      }
    }
  });
} catch {
  /* extension storage is unavailable in web preview */
}
(async () => {
  apiKey = await readKey();
  await detectChartSymbol();
  showKeyGate(!apiKey, "");
  const save = document.getElementById("keySave");
  const input = document.getElementById("keyInput");
  if (save && input) {
    save.onclick = async () => {
      const value = (input.value || "").trim();
      if (!value.startsWith("jenvu_ext_")) {
        showKeyGate(true, "Key must start with jenvu_ext_");
        return;
      }
      save.disabled = true;
      apiKey = value;
      try {
        await post({ action: "snapshot", timeframe, symbol });
        writeKey(value);
        input.value = "";
        showKeyGate(false, "");
        loadSnapshot();
      } catch (e) {
        apiKey = null;
        showKeyGate(true, e.message || "Could not connect.");
      } finally {
        save.disabled = false;
      }
    };
  }
  if (apiKey) loadSnapshot();
})();
setInterval(() => {
  detectChartSymbol().then((detected) => {
    if (apiKey && detected) loadSnapshot();
  });
}, 5000);
updateCandleClock();
setInterval(updateCandleClock, 1000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    detectChartSymbol().then((detected) => {
      if (apiKey && detected) loadSnapshot();
    });
  }
});

// Restore last active chat (or start fresh)
store.get().then((data) => {
  threads = data.threads || [];
  activeId = data.activeId || null;
  const t = activeThread();
  if (t && t.messages.length) {
    const el = $("thread");
    el.innerHTML = "";
    t.messages.forEach((m) => addMsg(m.cls, m.text));
    history = t.messages.map((m) => ({
      role: m.cls === "user" ? "user" : "assistant",
      text: m.text,
    }));
  }
  box.focus();
});

if ($("closebtn")) $("closebtn").onclick = () => window.close();
