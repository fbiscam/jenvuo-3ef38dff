import { JxFace } from "@/components/jxbot/JxBotFeatures";

/**
 * Heavy product marks for Jenvu Terminal, JX Bot and the API Platform: a solid
 * rounded tile in the ink colour with a bold symbol cut out in the page colour.
 */
type Props = { className?: string };

const tile = "inline-flex shrink-0 items-center justify-center rounded-[28%] bg-foreground text-background";

export function TerminalLogo({ className = "h-10 w-10" }: Props) {
  return (
    <span className={`${tile} ${className}`} aria-hidden>
      <svg viewBox="0 0 24 24" className="h-[62%] w-[62%]" fill="currentColor">
        <rect x="4.6" y="2.5" width="1.9" height="19" rx="0.95" />
        <rect x="2.8" y="7" width="5.5" height="9" rx="1.4" />
        <rect x="11.05" y="1" width="1.9" height="15" rx="0.95" />
        <rect x="9.25" y="3.5" width="5.5" height="8" rx="1.4" />
        <rect x="17.5" y="6" width="1.9" height="17" rx="0.95" />
        <rect x="15.7" y="10" width="5.5" height="9.5" rx="1.4" />
      </svg>
    </span>
  );
}

export function JxBotLogo({ className = "h-10 w-10" }: Props) {
  return (
    <span className={`${tile} ${className}`} aria-hidden>
      <JxFace className="h-[60%] w-[60%] bg-background" eyes="bg-foreground" />
    </span>
  );
}

export function PlatformLogo({ className = "h-10 w-10" }: Props) {
  return (
    <span className={`${tile} ${className}`} aria-hidden>
      <svg viewBox="0 0 24 24" className="h-[64%] w-[64%]" fill="currentColor">
        <path d="M12 1.8 22.2 7 12 12.2 1.8 7Z" />
        <path d="m4.6 10.9 7.4 3.8 7.4-3.8 2.8 1.4L12 17.5 1.8 12.3Z" opacity=".8" />
        <path d="m4.6 16.1 7.4 3.8 7.4-3.8 2.8 1.4L12 22.7 1.8 17.5Z" opacity=".6" />
      </svg>
    </span>
  );
}
