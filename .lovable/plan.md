# Fix duplicate Terminal AI replies

## Changes
- Add an immediate send lock so Enter/click events cannot start the same request twice before the loading state updates.
- Ignore an identical assistant message when it arrives directly after the same assistant message.
- Release the lock after success or failure so the next question works normally.

## Verification
- Check the Terminal with one submitted question and confirm one user message, one request, and one AI reply.
- Confirm a second question can be sent after the first completes.
