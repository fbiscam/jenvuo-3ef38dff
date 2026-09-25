# Workspace Migration Checklist

Is file ka maqsad: project kisi doosre workspace me shift karne par sab kuch pehle jaisa chale.
Secrets ki **values** yahan kabhi mat likhna — sirf naam list hain. Values naye workspace me
Settings → Secrets se dobara add karni hongi.

## 1. Backend (Lovable Cloud / database)
- Backend instance project ke saath move hota hai — schema, tables, RLS policies, migrations (`supabase/migrations/`) intact rehte hain.
- Move ke baad verify: auth login, `signal_paper_trades`, `auto_scan_runs`, `user_notifications`, `user_roles` readable hain.
- Auth providers: Email/Password + Google. Naye workspace me Google provider dobara configure karna pad sakta hai.

## 2. Secrets (dobara add karne hain)
Yeh list code se verify ki gayi hai (jo naam code me `process.env` se padhe jaate hain).

Trading / AI:
- BLUESMIND_API_KEY, BLUESMIND_API_URL (primary AI)
- CUSTOM_AI_API_KEY, CUSTOM_AI_BASE_URL (OmniRoute)
- UNOROUTER_API_KEY (insight cover images), GOOGLE_AI_API_KEY (image fallback)
- LOVABLE_API_KEY (managed — auto provision hoti hai, manually add na karein)

Alerts:
- WHATSAPP_API_TOKEN, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID
- TELEGRAM_BOT_TOKEN, TELEGRAM_API_KEY, TELEGRAM_CHAT_ID, TELEGRAM_CHAT_IDS

Admin / ops / cron:
- ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_SESSION_SECRET
- OPS_CONSOLE_ID, OPS_CONSOLE_PASS, OPS_CONSOLE_SESSION_SECRET
- CRON_SECRET, LOVABLE_CRON_SECRET, LOVABLE_CRON_SECRET_PREVIOUS

Payments / misc:
- CRYPTO_ADDR_BEP20, CRYPTO_ADDR_ERC20, CRYPTO_ADDR_TRC20, ETHERSCAN_API_KEY
- APOLLO_API_KEY, FIRECRAWL_API_KEY, GOOGLE_MAPS_API_KEY, GOOGLE_SEARCH_CONSOLE_API_KEY (connectors se aate hain)
- PUBLIC_APP_URL, LOVABLE_SEND_URL

Backend auto (add na karein): SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY.

Abhi project me saved sab secrets (sab dobara add karein, taake kuch na toote):
ADMIN_PASSWORD, ADMIN_SESSION_SECRET, ADMIN_USERNAME, AGENTROUTER_API_KEY, AGENTROUTER_BASE_URL,
BLACKBOX_API_KEY, BLUESMINDS_API_KEY, BLUESMIND_API_KEY, BROWSER_USE_API_KEY, BROWSER_USE_API_KEY_2,
BROWSER_USE_API_KEY_3, BUG_NOTIFY_SECRET, BYNARA_API_KEY, CLOUDFLARE_API_TOKEN, CRON_SECRET,
CUSTOM_AI_API_KEY, CUSTOM_AI_BASE_URL, DEEPSEEK_API_KEY, EVOLINK_API_KEY, GPT56_API_KEY,
JUSTWOKER_API_KEY, NVIDIA_API_KEY, OPENAI_API_KEY, OPS_CONSOLE_ID, OPS_CONSOLE_PASS,
OPS_CONSOLE_SESSION_SECRET, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_IDS, TG_SELFTEST_TOKEN,
TOOLS_SESSION_SECRET, TUKENKU_API_KEY, UNIKEY_API_KEY, UNOROUTER_API_KEY, WHATSAPP_API_TOKEN,
WHATSAPP_PHONE_NUMBER_ID. Connectors: Apollo, Firecrawl, Google Analytics, Google Maps, Google Search Console.

Scheduled jobs (cron) ka password database ke andar private jagah (`internal.scheduler_credential`) me hai,
isliye woh backend ke saath khud move hota hai. Move ke baad check karein ke scheduled jobs chal rahe hain
(auto-scan, news alerts, insight generation) — agar 401 aaye to cron credential dobara rotate karein.

## 3. Connectors (naye workspace me dobara connect karne hain)
- Apollo.io
- Firecrawl
- Google Maps Platform (env: `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`, `..._TRACKING_ID`)
- Google Search Console

## 4. Domains
Custom domains dobara point/verify karne honge:
- jenvu.com, www.jenvu.com, dash.jenvu.com, leads.jenvu.com, support.jenvu.com, blogs.jenvu.com
- Email infra: notify.jenvu.com (SPF/DKIM/DMARC + webhook dobara verify karein)
- `dash.jenvu.com` dashboard mount karta hai aur upar domain badge dikhata hai.

## 5. Signal engine settings (current, in code — inhe change na karein)
- Global minimum confidence: **70%**
- Senior review gate: fail hone par trade plan hide, score max 49
- Max broadcasts: 2 per day
- Chase allowance: `max(static cap, 3×ATR)`, hard cap 2% of price (`src/lib/analysis/engine.ts`)
- Live workstation: 1s price ticks, 15s chart series, 45s ICT/SMC narration
- Rolling 30-day per-session/factor calibration on `signal_paper_trades`
- Auto-scan scheduler: har 5 minutes

## 6. Move ke baad smoke test
1. Login (email + Google)
2. `/app` manual scan — 11/11 steps complete hon, real confidence aaye (21% jaisa fixed fallback nahi)
3. `/signals-live` graph aur signals list load ho
4. WhatsApp/Telegram test alert (recipient Settings me verified hona chahiye)
5. Publish karke production URL par dobara wahi test
