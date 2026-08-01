## Goal

Teen naye tool pages banane hain, Leads tool ko login + credits system ke saath gate karna hai, Ops Console se bina dobara login ke access dena hai, aur header me Tools/Resources submenus add karne hain. Sab kuch `#FAFAFA` background pe.

---

## 1. Tool pages

| Page | URL | Access |
|---|---|---|
| Leads Generation | `/tools/leads` | Login required (ID/PASS) |
| Scam Detector | `/tools/scam-detector` | Free / public |
| Image Enhancer | `/tools/image-enhancer` | Free / public |
| Tools landing | `/tools` | Public, teeno cards |

Sab pages site header + iOS-card style + `#FAFAFA` background use karenge.

### Leads Generation Tool
- Input: search query (e.g. "dentists in Dubai"), radius/limit.
- Google Places API (Text Search + Place Details) se rows: **Name, Phone, Email, Address, Rating, Reviews count, Website, Google Maps URL**.
- Google Maps se email nahi milta — jahan website ho, wahan Apollo API se enrichment (company/contact email, title, LinkedIn) hoga.
- Features: results table with select-all, CSV export, saved search history, dedupe, per-search credit deduction.
- Har search user ke credits se cut hoga (default 1 credit per 10 leads — admin console se rate badla ja sakega).

### Scam Detector Tool
- 3 tabs: **Link**, **Text**, **Image**.
- Link: domain age/heuristics + AI verdict. Text: phishing/scam-pattern analysis. Image: screenshot/fake-invoice detection (vision model).
- Bluesmind gateway (`BLUESMINDS_API_KEY`) ka available model use karega, existing `src/lib/ai-gateway.ts` priority chain ke through; fallback Lovable AI.
- Output: Risk score 0–100, verdict badge (Safe / Suspicious / Scam), reasons list.

### Image Enhancer Tool
- Upload → upscale/sharpen/denoise, before-after slider, download.
- Client-side canvas pipeline (no server cost) + optional AI upscale via gateway agar model available ho.

---

## 2. Leads login + admin-managed users

Naya table `tool_users`:
- `id`, `username` (unique), `password_hash`, `display_name`, `credits` (numeric), `active`, `created_at`, `last_login_at`.
- Plus `tool_user_credit_log` (delta, reason, balance_after) aur `tool_lead_searches` (query, results_count, credits_spent, created_at).
- RLS: locked down; sab access server functions ke through (admin/ops verified).

Login flow:
- `/tools/leads` pe apna login card (username + password), Ops Console jaisa design.
- Server function password verify karega (PBKDF2/SHA-256 via Web Crypto — Worker-safe, ops-gate wale pattern jaisa), encrypted session cookie `jenvu-tools` set karega.
- Session valid hone tak leads dashboard khulega; credits balance top-right pe.

Ops Console me naya tile **"Leads Tool Users"**:
- User add karo (username + password + starting credits), credits add/deduct, enable/disable, delete, search history dekho.
- Ops session unlocked ho to `/tools/leads` **direct khulega** (koi ID/PASS prompt nahi) — bilkul waise hi jaise baaki admin pages.
- Hub me teeno tools ke tiles bhi add honge.

---

## 3. Header navigation

Nav items ab yeh honge:

```
Signal Engine · Signals Live · [Tools ▾] · [Resources ▾] · Founding · Contact
   Tools ▾      → Leads Generation, Scam Detector, Image Enhancer
   Resources ▾  → AI Engine, Broadcasts, Market Insights
```

Ek shared `SiteHeader` component banega aur `index.tsx`, `PageShell.tsx`, `signals-live`, `pricing`, `contact`, `download`, `insights` pages me reuse hoga (abhi nav 7 jagah duplicate hai). Mobile menu me bhi collapsible groups.

---

## 4. Background color

`#FAFAFA` uniformly: naye tool pages, `PageShell`, dashboard shell aur uske andar ke pages jahan abhi white/off-white mismatch hai.

---

## Technical notes

- Routes: `src/routes/tools.tsx` (layout) + `tools.index.tsx`, `tools.leads.tsx`, `tools.scam-detector.tsx`, `tools.image-enhancer.tsx`. Har ek ka apna `head()` (title/description/og).
- Server logic: `src/lib/tools-auth.functions.ts`, `src/lib/leads.functions.ts`, `src/lib/scam-detect.functions.ts`, `src/lib/tool-admin.functions.ts` (ops/admin gated).
- Secrets chahiye honge: `GOOGLE_PLACES_API_KEY`, `APOLLO_API_KEY`, plus main `TOOLS_SESSION_SECRET` generate karunga.
- Migration me `tool_users`, `tool_user_credit_log`, `tool_lead_searches` + GRANTs + RLS.

## Leads page credentials

Build ke waqt main pehla admin account bana kar aapko ID/PASS chat me dunga (aap baad me Ops Console se change/naye users bana sakte hain). Planned default: **ID `haseeb`** — password build ke time generate karke bataunga.
