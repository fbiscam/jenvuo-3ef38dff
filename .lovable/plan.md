# Fix extension chart visibility and analysis replies

## Goal
Keep the live chart visible while chatting and make every clear analysis request return either a usable result or a visible, specific error.

## Changes
- Stop hiding the market/chart panel after the first message.
- Expand analysis intent recognition for common Roman Urdu phrases such as “analysis karo/kro” and “analyze karo/kro”.
- Validate the response before rendering so an empty server answer cannot leave a blank AI message.
- Keep the pending message visible until a final answer or error replaces it.
- Update the extension release package and download label.

## Verification
- Confirm the chart stays visible after sending a message.
- Confirm “chart analysis kro” enters the ICT/SMC analysis path.
- Confirm successful, empty, and failed responses all produce visible feedback.
- Run extension syntax checks, signal regressions, and the project TypeScript check.
