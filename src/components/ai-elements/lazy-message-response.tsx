import * as React from "react";
import type { MessageResponseProps } from "./message";

/*
 * Chat-reply renderer loaded on demand. The full renderer pulls in diagram,
 * math and code-highlighting libraries (~1.5 MB), so pages that only show a
 * reply after the visitor asks something (header search, Ask Jenvu, the
 * dashboard top bar) must not ship it in their first download.
 */
const RealMessageResponse = React.lazy(() =>
  import("./message").then((m) => ({ default: m.MessageResponse })),
);

/** Start downloading the renderer early (e.g. when a chat box opens). */
export function preloadMessageResponse() {
  void import("./message");
}

export function MessageResponse(props: MessageResponseProps) {
  return (
    <React.Suspense
      fallback={<div className="size-full whitespace-pre-wrap">{props.children}</div>}
    >
      <RealMessageResponse {...props} />
    </React.Suspense>
  );
}
