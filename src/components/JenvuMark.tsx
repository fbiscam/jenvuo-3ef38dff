/** Geometric Jenvu "J" mark. Uses the current text colour: black on the white theme, white on the black theme. */
export default function JenvuMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      {/* top bar */}
      <polygon points="9.2,1.5 22.6,1.5 21.4,4.9 8,4.9" />
      {/* stem with foot */}
      <polygon points="15.5,4.9 19.5,4.9 13.6,22.5 2.6,22.5 3.9,18.9 10.9,18.9" />
      {/* accent slash */}
      <polygon points="3.6,9.4 7.4,9.4 5.7,14.6 1.9,14.6" />
    </svg>
  );
}
