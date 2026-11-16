import type * as React from "react";
import { Terminal } from "lucide-react";
import { JxFace } from "@/components/jxbot/JxBotFeatures";

/**
 * Product marks for Jenvu Terminal, JX Bot and the API Platform: plain ink symbols
 * on the page colour (no filled tile). The Terminal mark is the same icon the
 * dashboard menu uses. `framed` adds a light outlined white tile around the symbol.
 */
type Props = { className?: string; framed?: boolean };

function Frame({ framed, className, children }: { framed?: boolean; className: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center text-foreground ${framed ? "rounded-[28%] border border-gc-line bg-background" : ""} ${className}`}
      aria-hidden
    >
      {children}
    </span>
  );
}

export function TerminalLogo({ className = "h-4 w-4", framed }: Props) {
  return (
    <Frame framed={framed} className={className}>
      <Terminal className={framed ? "h-[52%] w-[52%]" : "h-full w-full"} strokeWidth={2.25} />
    </Frame>
  );
}

export function JxBotLogo({ className = "h-4 w-4", framed }: Props) {
  return (
    <Frame framed={framed} className={className}>
      <JxFace className={`${framed ? "h-[50%] w-[50%]" : "h-[88%] w-[88%]"} bg-foreground`} eyes="bg-background" />
    </Frame>
  );
}

export function PlatformLogo({ className = "h-4 w-4", framed }: Props) {
  return (
    <Frame framed={framed} className={className}>
      <svg viewBox="0 0 24 24" className={framed ? "h-[54%] w-[54%]" : "h-full w-full"} fill="currentColor">
        <path d="M12 1.8 22.2 7 12 12.2 1.8 7Z" />
        <path d="m4.6 10.9 7.4 3.8 7.4-3.8 2.8 1.4L12 17.5 1.8 12.3Z" opacity=".8" />
        <path d="m4.6 16.1 7.4 3.8 7.4-3.8 2.8 1.4L12 22.7 1.8 17.5Z" opacity=".6" />
      </svg>
    </Frame>
  );
}

/** News Trading mark: a folded newspaper with a headline, text lines and an up arrow cut out. */
export function NewsLogo({ className = "h-4 w-4", framed }: Props) {
  return (
    <Frame framed={framed} className={className}>
      <svg viewBox="0 0 24 24" className={framed ? "h-[54%] w-[54%]" : "h-full w-full"} fill="currentColor">
        <path
          fillRule="evenodd"
          d="M4.5 3h12A1.5 1.5 0 0 1 18 4.5v14a2.5 2.5 0 0 0 2.5 2.5h-15A2.5 2.5 0 0 1 3 18.5v-14A1.5 1.5 0 0 1 4.5 3ZM6 6.5h9v3H6Zm0 5h9v1.6H6Zm0 3.3h4.5v1.6H6Zm5.8 1.6 1.8-2.8 1.8 2.8Z"
        />
        <path d="M19 8h1.5A1.5 1.5 0 0 1 22 9.5v9a2.5 2.5 0 0 1-1.4 2.25A2.4 2.4 0 0 1 19 18.5Z" opacity=".7" />
      </svg>
    </Frame>
  );
}
