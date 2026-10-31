/** Geometric Jenvu mark. Uses the current text colour: black on the white theme, white on the black theme. */
export default function JenvuMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <polygon points="8.6,2 23,2 21.7,5.4 7.3,5.4" />
      <polygon points="15.4,5.4 19.9,5.4 13.1,22 8.6,22" />
      <polygon points="3.6,14.2 8.1,14.2 5.1,22 0.6,22" />
    </svg>
  );
}
