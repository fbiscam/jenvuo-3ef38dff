/**
 * Faint Pakistan flag watermark for the footer brand column (Blackbox-style
 * flag-in-the-gap). Drawn in currentColor so it follows the site theme.
 */
export default function PakistanFlagMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 100" className={className} role="img" aria-label="Pakistan flag">
      <defs>
        <mask id="pk-flag-field">
          <rect x="37.5" y="0" width="112.5" height="100" fill="white" />
          {/* Crescent: outer circle cut out, inner circle restored */}
          <circle cx="93.75" cy="50" r="30" fill="black" />
          <circle cx="102" cy="43" r="26.5" fill="white" />
          {/* Five-pointed star */}
          <polygon
            points="103.6,28.3 109.7,32.0 115.3,27.5 113.7,34.5 119.7,38.4 112.6,39.1 110.7,46.0 107.9,39.4 100.7,39.7 106.1,35.0"
            fill="black"
          />
        </mask>
      </defs>
      {/* White hoist bar (1/4 width) */}
      <rect x="0" y="0" width="37.5" height="100" fill="currentColor" opacity="0.4" />
      {/* Green field with crescent and star */}
      <rect x="37.5" y="0" width="112.5" height="100" fill="currentColor" mask="url(#pk-flag-field)" />
    </svg>
  );
}
