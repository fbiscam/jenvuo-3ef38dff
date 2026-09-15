# Complete the ChatGPT-style chat workspace

## What will change
- Keep the existing dashboard sidebar for normal dashboard pages, but replace it with a dedicated chat sidebar after the user opens Chat.
- Match the supplied reference: compact Jenvu header, New chat action, recent conversations, account area, spacious chat canvas, centered welcome composer, and conversation view.
- Preserve existing working features: Auto/manual model selection, image attachment, one-frame screen sharing, XAU/USD ICT/SMC analysis, local browser conversation history, and thread URLs.
- Build the visible chat area from AI Elements conversation, message, prompt-input, and loading primitives, styled to the reference.
- Make the dedicated chat workspace responsive, including a recoverable mobile sidebar.

## Technical details
- Update the dashboard shell to detect `/dashboard/chat/*` and render chat pages without the normal dashboard navigation frame.
- Refactor `ChatWorkspace` around installed AI Elements while retaining the current authenticated server call and billing behavior.
- Keep assistant messages unboxed and user messages in a high-contrast semantic bubble.
- Add accessible icon controls and model selection using existing design-system components.
- Verify the current `src/lib/utils.ts` diagnostic with the full TypeScript check; it is presently a stale report because the file has only six valid lines and the check passes.
- Validate the final page in the browser at desktop and mobile widths, then run lint/type checks.
