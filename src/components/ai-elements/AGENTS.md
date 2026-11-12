# AI elements

- Anything rendered on every page (site header search, Ask Jenvu widget, dashboard top bar) imports `MessageResponse` from `lazy-message-response.tsx`, never from `message.tsx` directly: the real renderer bundles diagram/math/code-highlight libraries (~1.5 MB) that would otherwise load on every page open. Route-level chat pages may import `message.tsx` directly.
