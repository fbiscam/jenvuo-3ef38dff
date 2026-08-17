# Plan - Enforce Killzone Restriction for Automated Signals

The user reported that signals outside of designated "Killzones" (London, NY, etc.) are often inaccurate ("false signals"). We will update the system to block automated broadcasts that occur outside these windows.

## User Review Required

> [!IMPORTANT]
> This change only affects **automated** signals and **admin broadcasts**. Manual scans in the Signal Desk will still show analysis results outside killzones, but the automated alerting system will skip them.

## Proposed Changes

### Core Logic

#### [src/lib/signals/qualification.ts]
- Update `QualifyInput` to include `inKillzone: boolean`.
- Modify `qualifySignal` to enforce the killzone gate. 
- A signal will be rejected if `inKillzone` is false, **unless** it is a high-conviction setup (≥85% confidence). This allows exceptional setups to fire even in slower sessions.

### Automated Scanning

#### [src/routes/api/public/hooks/auto-scan.ts]
- Re-enable the Killzone gate that was previously disabled.
- Use the updated `qualifySignal` logic or inline check to skip broadcasting if the `inKillzone` flag is false.
- Manual scans triggered via service-role (if any) will still respect this unless we add a bypass, but since this hook is primarily for automated flows, it aligns with the user's request to stop "false signals" from the automated system.

### Admin Broadcasts

#### [src/lib/broadcast-alert.functions.ts]
- Add a check in `broadcastCurrentSignal` to verify if the signal is within a killzone.
- If not, return an error to the admin (or allow an override if we add one, but for now, we'll enforce the user's "no signals outside killzone" rule).

## Technical Details

- **Killzone Definition**: The project currently uses `killzoneOf` in `src/lib/analysis/engine.ts` which defines:
    - **London**: 07:00 - 10:00 UTC
    - **NY AM**: 12:00 - 15:00 UTC
    - **NY PM**: 17:00 - 20:00 UTC
    - **Asia**: 00:00 - 04:00 UTC
- We will use the `inKillzone` property returned by the analysis engine to gate the broadcasts.
- **Exception**: Setups with confidence ≥ 85% will still be allowed to broadcast even outside killzones to ensure "A+" setups aren't missed.
