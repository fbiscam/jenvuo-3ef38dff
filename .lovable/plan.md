## Goal

Turn JENVU AI into a real native mobile app (iOS + Android) using Capacitor, while keeping the existing TanStack Start web app as the single source of truth. The native shell loads the same UI, but adds proper mic permissions, push notifications, splash screen, app icon, and haptics.

## Approach

Use **Capacitor 6** as the native wrapper. The web bundle (Vite `dist/`) is copied into native iOS/Android projects, which are then opened in Xcode / Android Studio to produce the final `.ipa` / `.aab` for the App Store and Play Store.

Two run modes will be supported:
1. **Dev mode** — Capacitor `server.url` points to the live Lovable preview / `jenvu.com`, so you see changes instantly on a real device without rebuilding.
2. **Release mode** — bundles the built web assets inside the app for store submission.

## What gets added to the project

```text
capacitor.config.ts              ← app id, name, splash, plugin config
android/                         ← native Android project (generated)
ios/                             ← native iOS project (generated)
src/lib/native/
  platform.ts                    ← isNative() helper
  mic.ts                         ← native mic permission wrapper
  haptics.ts                     ← tap + signal-fire haptics
  push.ts                        ← FCM/APNs register + token upload
src/routes/api/public/
  push-register.ts               ← stores device token (Lovable Cloud)
  push-send.ts                   ← server fn to fire alerts on A+ setups
supabase migration               ← device_tokens table + RLS + GRANTs
```

## Implementation steps

1. **Install Capacitor + plugins**
   `@capacitor/core @capacitor/cli @capacitor/ios @capacitor/android @capacitor/splash-screen @capacitor/haptics @capacitor/push-notifications @capacitor/status-bar @capacitor/app`

2. **Configure `capacitor.config.ts`**
   - `appId: "com.jenvu.ai"`, `appName: "JENVU AI"`
   - `webDir: "dist"`
   - SplashScreen: 2s, black background, white JENVU logo, no spinner
   - StatusBar: dark style on black background
   - `server.url` toggle controlled by `VITE_CAP_LIVE_RELOAD`

3. **Native mic for the voice agent**
   - In `useSpeech.ts`, when `isNative()`, request mic via `@capacitor/core` permissions and use native flow; fall back to Web Speech API on the web.
   - Add `NSMicrophoneUsageDescription` and `NSSpeechRecognitionUsageDescription` to iOS `Info.plist`, and `RECORD_AUDIO` to Android `AndroidManifest.xml`.

4. **Push notifications for signal alerts**
   - On app launch (native only), register for push, get FCM/APNs token, POST it to `/api/public/push-register` with the user id.
   - New `device_tokens` table (user_id, token, platform, created_at) with RLS, GRANTs, and `service_role` write.
   - Server function `sendSignalAlert(userId, signal)` called when an A+ setup fires; uses FCM HTTP v1 (Android) and APNs (iOS) via stored credentials.
   - Required secrets (requested via `add_secret` only after you confirm): `FCM_SERVICE_ACCOUNT_JSON`, `APNS_KEY_P8`, `APNS_KEY_ID`, `APNS_TEAM_ID`.

5. **Splash + app icon**
   - Generate 1024×1024 JENVU logo (black bg, white wordmark).
   - Use `@capacitor/assets` to auto-generate every iOS/Android icon + splash size.

6. **Haptics**
   - Light impact on button taps in `/app` composer and Send button.
   - Medium impact when a new A+ signal renders on `/signal`.
   - Success notification haptic when a TP is hit.

7. **Routing + safe areas**
   - Add `env(safe-area-inset-*)` padding to the header and bottom composer so notches / home indicator don't overlap.
   - Lock orientation to portrait on phones; allow both on tablets.

8. **Build scripts** (added to `package.json`)
   ```
   "cap:sync": "vite build && cap sync"
   "cap:ios": "vite build && cap sync ios && cap open ios"
   "cap:android": "vite build && cap sync android && cap open android"
   ```

## What you'll need to do locally (Lovable sandbox can't do this)

- **iOS build**: a Mac with Xcode 15+, Apple Developer account ($99/yr), then `npm run cap:ios` → Archive → upload to App Store Connect.
- **Android build**: Android Studio, Google Play Console account ($25 one-time), then `npm run cap:android` → Generate Signed Bundle → upload `.aab` to Play Console.
- I'll write a short `MOBILE_BUILD.md` with the exact click-by-click steps for both.

## Out of scope (ask separately if you want them)

- Native in-app purchases / subscriptions
- Background trading bots (mobile OSes kill background JS)
- Apple Sign-In (required by Apple if you ship social login — easy add later)
- TradingView native SDK (we'll keep the existing `lightweight-charts` which already works fine in WebView)

## Risks / honest caveats

- **Web Speech API doesn't exist in iOS WKWebView** — the voice agent currently relies on it. We'll swap to native speech-to-text (already supported in this project via Lovable AI Gateway STT) when running on iOS, otherwise the mic button does nothing on iPhone.
- Apple review will scrutinize a "trading signals" app; we'll add a clear disclaimer screen on first launch (reusing `/disclaimer` content) to pass review.
- Push delivery on iOS requires APNs auth key + correct bundle id — first-time setup takes ~30 min in Apple Developer portal.
