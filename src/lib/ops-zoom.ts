/**
 * Ops Console sizing.
 *
 * The console shell (sidebar + Overview) uses the dashboard's own scale.
 * Tools open inside an iframe that is narrower than the screen, so their
 * width-based zoom would come out smaller than the dashboard. The hub passes
 * the zoom for the whole screen (`z` URL param, plus postMessage on resize)
 * and embedded pages apply it, a bit larger than the dashboard.
 */

/** Same steps as `.jenvu-zoom-dashboard` in styles.css (min width -> zoom). */
const DASH_STEPS: [number, number][] = [
  [1920, 1.482],
  [1680, 1.388],
  [1600, 1.316],
  [1500, 1.195],
  [1360, 1.099],
  [1200, 1.005],
  [1024, 0.909],
];

/** Embedded console pages are this much larger than the dashboard. */
export const OPS_INNER_BOOST = 1.12;

export function dashboardZoomFor(screenWidth: number): number {
  for (const [min, z] of DASH_STEPS) if (screenWidth >= min) return z;
  return 1;
}

/** Zoom for a tool page shown inside the console, from the full screen width. */
export function opsInnerZoomFor(screenWidth: number): number {
  if (screenWidth < 1024) return 1;
  return Math.round(dashboardZoomFor(screenWidth) * OPS_INNER_BOOST * 1000) / 1000;
}

/** Accepts only a sane zoom value from the URL/message. */
export function parseOpsZoom(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n < 0.75 || n > 2) return null;
  return n;
}

export const OPS_ZOOM_MESSAGE = "jenvu-ops-zoom";

/**
 * Runs before paint in every page: inside a console iframe (`embed=1&z=`),
 * apply the hub's zoom and follow later updates from the hub.
 */
export const OPS_EMBED_ZOOM_BOOT_SCRIPT = `(function(){try{var q=new URLSearchParams(location.search);if(q.get("embed")!=="1")return;var d=document.documentElement;function s(v){var n=Number(v);if(!isFinite(n)||n<0.75||n>2)return;d.style.setProperty("--ops-inner-zoom",String(n));d.setAttribute("data-ops-z","1");}s(q.get("z"));window.addEventListener("message",function(e){if(window.parent===window||e.source!==window.parent)return;if(e.origin!==location.origin&&!/^https:\\/\\/([a-z0-9-]+\\.)*jenvu\\.com$/.test(e.origin))return;var m=e.data;if(m&&m.type==="${OPS_ZOOM_MESSAGE}")s(m.z);});}catch(e){}})();`;
