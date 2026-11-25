/** TradingView-style drawing-tool icons (thin 1.2px strokes, round end handles). */
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { className?: string };
const base = (p: P) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...p,
});

export const TvCross = (p: P) => (<svg {...base(p)}><path d="M12 3v7M12 14v7M3 12h7M14 12h7" /></svg>);
export const TvTrend = (p: P) => (<svg {...base(p)}><path d="M6.5 17.5 17.5 6.5" /><circle cx="5" cy="19" r="1.8" /><circle cx="19" cy="5" r="1.8" /></svg>);
export const TvRay = (p: P) => (<svg {...base(p)}><path d="M6.5 17.5 21 3" /><circle cx="5" cy="19" r="1.8" /></svg>);
export const TvArrow = (p: P) => (<svg {...base(p)}><path d="M5 19 18 6M11 6h7v7" /></svg>);
export const TvHLine = (p: P) => (<svg {...base(p)}><path d="M2 12h8M14 12h8" /><circle cx="12" cy="12" r="1.8" /></svg>);
export const TvVLine = (p: P) => (<svg {...base(p)}><path d="M12 2v8M12 14v8" /><circle cx="12" cy="12" r="1.8" /></svg>);
export const TvRect = (p: P) => (<svg {...base(p)}><path d="M6.8 5h10.4M6.8 19h10.4M5 6.8v10.4M19 6.8v10.4" /><circle cx="5" cy="5" r="1.6" /><circle cx="19" cy="5" r="1.6" /><circle cx="5" cy="19" r="1.6" /><circle cx="19" cy="19" r="1.6" /></svg>);
export const TvCircle = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="7.5" /><circle cx="12" cy="12" r="1.4" /></svg>);
export const TvFib = (p: P) => (<svg {...base(p)}><path d="M3 5h18M3 9.5h18M3 14.5h18M3 19h18" /><circle cx="6" cy="19" r="1.6" /><circle cx="18" cy="5" r="1.6" /></svg>);
export const TvText = (p: P) => (<svg {...base(p)}><path d="M5 6V4.5h14V6M12 4.5v15M9 19.5h6" /></svg>);
export const TvMagnet = (p: P) => (<svg {...base(p)}><path d="M6 4h4v8a2 2 0 0 0 4 0V4h4v8a6 6 0 0 1-12 0V4ZM6 8h4M14 8h4" /></svg>);
export const TvEye = (p: P) => (<svg {...base(p)}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></svg>);
export const TvEyeOff = (p: P) => (<svg {...base(p)}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /><path d="M4 20 20 4" /></svg>);
export const TvTrash = (p: P) => (<svg {...base(p)}><path d="M4 6.5h16M9.5 6.5V4h5v2.5M6.5 6.5l1 13.5h9l1-13.5M10 10v7M14 10v7" /></svg>);
