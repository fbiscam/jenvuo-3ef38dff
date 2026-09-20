# Add image and voice chat to the AI Desk

## What will change
- Add an image button beside the message box so users can attach one chart screenshot, preview it, remove it, and send it with a question.
- Add a microphone button that records speech, transcribes it securely, and places the transcript into the message box for review or sending.
- Show attached chart images inside the conversation and pass them to the AI’s chart review.
- Keep text-only chat and the existing gold analysis behavior unchanged.

## Safety and feedback
- Accept only supported image/audio formats with clear size limits.
- Show recording, transcription, upload, and AI errors in the panel instead of silently failing.
- Keep microphone and AI credentials on the secure server side.

## Technical details
- Reuse the installed AI Elements prompt and message primitives.
- Add authenticated server functions for chart-image analysis and streaming speech transcription.
- Capture a complete browser recording as WAV-compatible audio rather than uploading incomplete recorder chunks.
- Resolve the reported utility return-type diagnostic and verify TypeScript, lint, and the live terminal flow on desktop and mobile.
