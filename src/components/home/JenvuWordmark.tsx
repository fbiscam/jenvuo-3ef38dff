const LETTERS: { ch: string; cls: string }[] = [
  { ch: "J", cls: "text-gc-blue" },
  { ch: "e", cls: "text-gc-red" },
  { ch: "n", cls: "text-gc-yellow" },
  { ch: "v", cls: "text-gc-blue" },
  { ch: "u", cls: "text-gc-green" },
];

/** Google-style multicolour "Jenvu" wordmark followed by "AI" in ink. */
export function JenvuWordmark({ className = "text-[22px]" }: { className?: string }) {
  return (
    <span
      className={`truncate leading-none tracking-tight ${className}`}
      style={{ fontFamily: "\"Google Sans\", \"Product Sans\", \"DM Sans\", system-ui, sans-serif", fontWeight: 500 }}
      aria-label="Jenvu AI"
    >
      {LETTERS.map((l, i) => (
        <span key={i} className={l.cls}>{l.ch}</span>
      ))}
      <span className="ml-1.5 text-gc-ink">AI</span>
    </span>
  );
}
