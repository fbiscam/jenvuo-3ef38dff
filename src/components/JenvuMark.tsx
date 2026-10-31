const MARK_POLYGONS = [
  "9.2,1.5 22.6,1.5 21.4,4.9 8,4.9", // top bar
  "15.5,4.9 19.5,4.9 13.6,22.5 2.6,22.5 3.9,18.9 10.9,18.9", // stem with foot
  "3.6,9.4 7.4,9.4 5.7,14.6 1.9,14.6", // accent slash
];

/** Same mark as an SVG data URL, for CSS masks (e.g. the Ask Jenvu "thinking" ring). */
export const JENVU_MARK_URL = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#000">${MARK_POLYGONS.map((p) => `<polygon points="${p}"/>`).join("")}</svg>`,
)}`;

/** Geometric Jenvu "J" mark. Uses the current text colour: black on the white theme, white on the black theme. */
export default function JenvuMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      {MARK_POLYGONS.map((p) => (
        <polygon key={p} points={p} />
      ))}
    </svg>
  );
}
