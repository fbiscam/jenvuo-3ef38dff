/**
 * DOM mutation guard.
 *
 * Google Translate, ad scripts (AdSense auto ads) and some browser extensions
 * move or wrap nodes that React owns. When React later updates that part of
 * the page it calls `removeChild` / `insertBefore` on a node that is no longer
 * where React left it, the browser throws, and the whole page falls into the
 * error screen — the visitor has to refresh to get the site back.
 *
 * This is the widely used workaround (facebook/react#11538): if the node is
 * not actually a child of the parent, skip the call instead of throwing.
 * Normal DOM calls are untouched.
 */
let installed = false;

export function installDomGuard(): void {
  if (installed || typeof window === "undefined" || typeof Node === "undefined") return;
  installed = true;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) {
      if (child.parentNode) child.parentNode.removeChild(child);
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(
    this: Node,
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      return originalInsertBefore.call(this, newNode, null) as T;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}
