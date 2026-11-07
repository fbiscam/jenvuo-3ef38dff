/** Hidden browser tabs skip timed refreshes; callers refresh again on focus/visibility. */
export function shouldPoll(visibility: DocumentVisibilityState | string | undefined) {
  return visibility !== "hidden";
}

/** setInterval that only runs while the tab is visible. Returns a cleanup function. */
export function pollWhileVisible(fn: () => void, ms: number): () => void {
  const id = window.setInterval(() => {
    if (shouldPoll(document.visibilityState)) fn();
  }, ms);
  return () => window.clearInterval(id);
}
