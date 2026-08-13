# Crypto Top-Up Payments + Promo Codes

Add a crypto payment page for users, auto-verification of on-chain transactions, an Ops Console approval screen, promo codes, and email notifications on approve/reject.

## 1. User payment page (`/dashboard/billing/pay`)

- User picks an amount (presets $10 / $25 / $50 / $100 + custom) and a network:
  - USDT TRC20 (Tron)
  - USDT BEP20 (BNB Smart Chain)
  - USDT ERC20 / ETH (Ethereum)
- Binance-style checkout panel appears: deposit address, QR code, copy button, exact USDT amount (with a unique cents suffix so each payment is distinguishable), and a **5-minute countdown**.
- Optional promo code field applied before payment (shows live "you pay $X, you receive $Y").
- After sending, the user submits the **Transaction ID (hash)**. Status becomes "Verifying".
- Order status card: Pending → Verifying → Approved / Rejected / Expired, with live updates.

## 2. Auto verification

On TX submit, a server function checks the hash against the public explorer API for the chosen chain:
- Tron: TronGrid, BSC: BscScan, Ethereum: Etherscan.
Checks: TX exists, confirmed, recipient == our deposit address, token == USDT contract, amount >= expected (small tolerance), TX hash not already used.
- All checks pass → auto-approve, credit the wallet instantly, send email.
- Any check fails or API unavailable → order goes to **Needs review** for the Ops Console; never auto-rejected silently.

Explorer API keys are stored as secrets (I will request them). TronGrid works without a key at low volume; BscScan/Etherscan need free keys.

## 3. Ops Console page — Payments

New section in the Ops hub (`/ops-x9k2-7m4n/payments`):
- Table of all orders: user email, amount, promo code, bonus, network, TX hash (explorer link), auto-verify result, status, timestamps.
- Filters: Needs review / Pending / Approved / Rejected / All.
- **Approve** → credits the user wallet (base + bonus) and sends an approval email.
- **Reject** → requires a short reason, no credit, sends a rejection email with the reason.
- Manual credit adjust field for edge cases.
- Second tab: **Promo codes** manager — create/edit/disable codes.

## 4. Promo codes

Four types supported:
- **Percentage bonus** — e.g. `GOLD10` = +10% credit.
- **Flat bonus** — e.g. `EXTRA5` = +$5 credit on any top-up (min spend configurable). This will ship pre-created.
- **Discount** — pay less, receive full value (e.g. pay $45, get $50).
- **Fixed free credit** — redeemable without payment, e.g. $5 free, one per account.

Each code has: min top-up, max bonus cap, total usage limit, per-user limit, expiry date, active toggle. Validation runs server-side at both quote time and credit time so codes can't be tampered with client-side.

## 5. Emails

Transactional emails via the existing system mail setup (billing@ sender):
- Payment received / verifying
- Payment approved — amount credited, bonus, new balance
- Payment rejected — reason + support link
- Promo bonus applied confirmation

## Technical notes

- New tables: `payment_orders`, `promo_codes`, `promo_redemptions`, plus a unique index on TX hash to block reuse. All with RLS (users see only their own orders; ops writes run through service-role server functions) and explicit GRANTs.
- Crediting reuses the existing `credit_balances` / `credit_ledger` flow so top-ups appear in billing history with reason `topup_crypto` / `promo_bonus`.
- Deposit addresses are stored as server secrets/config, editable from the Ops console — never hardcoded in client code.
- Expiry job: orders past the 5-minute window with no TX submitted are auto-expired; submitted TXs stay open for review.
- Amounts are USD-denominated; USDT is treated 1:1.

## What I need from you

- The three deposit addresses (TRC20, BEP20, ERC20) — you can paste them or add them from the Ops console after build.
- BscScan and Etherscan free API keys for auto-verification (I will prompt for them securely).
