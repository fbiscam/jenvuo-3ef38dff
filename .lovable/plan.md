# Gemini-style Jenvu AI home

## Goal
Rebuild the signed-in `/app` screen in the supplied reference style while keeping Jenvu branding and the existing working voice and XAU/USD analysis actions.

## Changes
- Replace the current header/orb layout with a full-height workspace: collapsible left sidebar, compact top actions, and centered AI start area.
- Use a pale light-blue main canvas, bright/light Jenvu logo treatment, and Google Sans typography matching the reference.
- Add working New chat, search, terminal, saved signals, billing, download, settings, and sign-out navigation.
- Compose the prompt box from the installed AI Elements input primitives, with quick XAU/USD prompts, model label, microphone, and send states.
- Show submitted questions and replies with AI Elements conversation/message primitives instead of a detached voice-only result.
- Preserve current authentication, credit charging, speech, signal generation, and Gold-only safeguards.
- Check desktop and mobile rendering, then run the project checks.

## Technical details
- Limit changes to `src/routes/app.tsx` and semantic theme tokens in `src/styles.css` if required.
- Use existing app routes and Button controls; no new backend behavior or database changes.
