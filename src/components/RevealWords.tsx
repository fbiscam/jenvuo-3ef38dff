import * as React from "react";

/**
 * x.ai-style heading entrance: words appear together with a near-instant soft
 * blur the first time the heading scrolls into view. Words are split in
 * React render (never by touching the DOM afterwards) so ads/translate guards
 * stay happy. Reduced-motion visitors see the text straight away (CSS).
 */
export function RevealWords({
  children,
  delay = 0,
  step = 10,
}: {
  children: React.ReactNode;
  /** ms before the first word starts. */
  delay?: number;
  /** ms between words. */
  step?: number;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        // Also reveal headings the visitor already scrolled past quickly.
        if (entries.some((e) => e.isIntersecting || e.boundingClientRect.top < 0)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px 0px 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  let index = 0;
  const unit = (node: React.ReactNode, key: string) => {
    const i = index++;
    return (
      <span
        key={key}
        className="reveal-word"
        style={{ "--rw-delay": `${delay + i * step}ms` } as React.CSSProperties}
      >
        {node}
      </span>
    );
  };

  const parts: React.ReactNode[] = [];
  React.Children.toArray(children).forEach((child, ci) => {
    if (typeof child === "string" || typeof child === "number") {
      const tokens = String(child).split(/(\s+)/);
      tokens.forEach((tok, ti) => {
        if (!tok) return;
        if (/^\s+$/.test(tok)) parts.push(" ");
        else parts.push(unit(tok, `w${ci}-${ti}`));
      });
    } else if (React.isValidElement(child) && child.type === "br") {
      parts.push(child);
    } else {
      parts.push(unit(child, `e${ci}`));
    }
  });

  return (
    <span ref={ref} className="reveal-words" data-reveal={shown ? "shown" : "idle"}>
      {parts}
    </span>
  );
}
