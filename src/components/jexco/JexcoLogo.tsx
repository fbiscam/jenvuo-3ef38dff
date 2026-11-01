/** Jexco mark: a geometric "J" between code brackets on a rounded tile. */
export function JexcoLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <rect width="48" height="48" rx="12" fill="currentColor" />
      <g fill="none" stroke="var(--background)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 15 L8.5 24 L14 33" />
        <path d="M34 15 L39.5 24 L34 33" />
        <path d="M27.5 13 V27.5 a5.5 5.5 0 0 1 -11 0" />
      </g>
      <circle cx="27.5" cy="13" r="2.2" fill="var(--background)" />
    </svg>
  );
}
