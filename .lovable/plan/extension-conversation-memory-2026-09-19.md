# Extension conversation memory

## Goal
Let Jenvu read the earlier messages in the currently opened saved chat, so follow-up questions retain context after closing or reopening the extension.

## Changes
- Keep each conversation stored locally and restore the selected conversation when the extension opens.
- Send a larger, bounded window of recent user and Jenvu messages with each new request.
- Exclude transient errors and cap message lengths to keep requests reliable.
- Release a new extension package and update its displayed download version.

## Verification
- Confirm JavaScript and TypeScript checks pass.
- Confirm a reopened conversation restores its messages and sends prior turns with the next request.
- Confirm the extension ZIP is valid and downloadable.
