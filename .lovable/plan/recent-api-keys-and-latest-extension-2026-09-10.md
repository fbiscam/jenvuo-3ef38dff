# Recent API Keys and Latest Extension

## Goal
Make the Extension page clearly show the newest API keys and the current extension release.

## Changes
- Keep API keys sorted newest-first and show only the latest four.
- Present each key prefix in a code-style field with its name, created date, status, and copy/revoke controls.
- Label the section “Recent API keys” and make the newest key visually identifiable.
- Present the current v1.8.1 extension as the latest release with its direct download button and package details.
- Improve the table layout on small screens without changing key security: full keys remain visible only once after creation.

## Validation
- Confirm key ordering and four-item limit.
- Confirm download and key controls still work.
- Run the project type check and verify the current `utils.ts` diagnostic.
