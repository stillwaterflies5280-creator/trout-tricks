# Session handoff

Multi-thread parked work. Each section is independently resumable.

---

## Thread A: MacBook → Mini SSH (Tailscale)

**Mini side: ✅ COMPLETE (2026-05-14)**

- macOS Remote Login enabled (System Settings → General → Sharing → Remote Login)
- `sshd` listening on port 22, reachable over Tailscale at `100.119.145.98`
- Verified: `ssh -o BatchMode=yes thomasfrankmacbookair@100.119.145.98` returns `Permission denied (publickey,password,keyboard-interactive)` — auth methods advertised, just no creds presented. SSH server up, Tailscale routing works.
- **tmux 3.6a installed** (`/usr/local/bin/tmux`) and persistence-verified: a detached `tmux new -d -s ...` session survives the spawning shell's exit and remains reattachable. That's the same daemonization mechanism that keeps a `tt` session alive across an SSH disconnect from the MacBook.

**Why Remote Login instead of Tailscale SSH:** The original plan was `sudo tailscale set --ssh` (no key management, Tailscale-identity auth). Blocked by the **App Store Tailscale build's sandbox** — `RunSSH` can't be flipped on that build. Switching would require uninstalling the App Store version and reinstalling from `tailscale.com/download` (or Homebrew). Deferred — went with macOS Remote Login for now.

**MacBook side: PENDING (resume on MacBook)**

1. `ssh-keygen -t ed25519 -C "macbook-pro→mini"` (skip passphrase if you want unattended `tt` over SSH)
2. `ssh-copy-id thomasfrankmacbookair@100.119.145.98` — prompts for Mini password once, installs pubkey into `~/.ssh/authorized_keys` on the Mini
3. Verify passwordless: `ssh thomasfrankmacbookair@100.119.145.98 'hostname'` — should return `mac-mini` with no prompt
4. Optional polish: add to MacBook's `~/.ssh/config`:
   ```
   Host mini
     HostName 100.119.145.98
     User thomasfrankmacbookair
   ```
   Then `ssh mini` works.

**Working workflow once MacBook side is set up:** From the MacBook, `ssh mini` → on the Mini shell, `tmux new -s tt` → run `tt` inside that tmux → `Ctrl-b d` to detach when stepping away → close laptop / disconnect SSH freely → next time, `ssh mini` and `tmux attach -t tt` to resume the same session. tmux is on the Mini already (verified 2026-05-14); the MacBook only needs the system `ssh` client.

---

## Thread B: Square post-payment webhook (#17)

**STATUS (end-of-night 2026-05-15):** Steps 1–6 ✅ complete. **Step 7 BLOCKED** on Apps Script `doPost` failure for `submission_type=square_payment_completed`. End-to-end signature chain proven; failure is downstream of the Worker, inside Apps Script.

---

## What's shipped

### ✅ Worker `/webhook` route deployed
- Deployed via Cloudflare API (not web editor) on **2026-05-15 06:59:41 UTC**
- `deployment_id`: `fcc4c58cc0854bbfb90e6fdd9d195f66`
- Worker now routes: `OPTIONS` → CORS preflight; `POST /webhook` → `handleSquareWebhook(request, env, ctx)`; other POST → `handleCheckout(request, env)`; else 405
- `handleSquareWebhook` order: read raw body → header check → HMAC-SHA256 verify against `SQUARE_WEBHOOK_NOTIFICATION_URL + rawBody` → JSON parse → filter to `payment.updated` + `COMPLETED` → normalize → `ctx.waitUntil` forward to Apps Script → 200
- Local source-of-truth copy: `/tmp/worker.js` (this session) — Worker repo itself is **not** in `~/trout-tricks`, so re-pull via `GET /workers/scripts/trouttricks-checkout` to edit next time

### ✅ Cloudflare secrets (all 4 verified via `/bindings` API)

| Secret | Value |
|---|---|
| `SQUARE_ACCESS_TOKEN` | existing |
| `SQUARE_WEBHOOK_NOTIFICATION_URL` | `https://trouttricks-checkout.stillwaterflies5280.workers.dev/webhook` |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | **real key — placeholder replaced** |
| `APPS_SCRIPT_WEBHOOK_URL` | `…/macros/s/AKfycbwc5JR5yo76y8-H81D3Dh4e-pc6kqha8rLO2Yu90ZtFV_s-3Hm__YI52WoaW54zXOqBdw/exec` |

### ✅ Square webhook subscription
- Subscription `wbhk_d84f91111b…` enabled
- Event type: `payment.updated`
- Notification URL byte-matches `SQUARE_WEBHOOK_NOTIFICATION_URL`

### ✅ Signature chain proven
Square Dashboard → **Send Test Event** → Worker returned **200 OK at 01:35:54 UTC**. The HMAC verify path works end-to-end. Whatever's failing is *downstream* of the Worker's signature gate, inside Apps Script `doPost`.

### ✅ Apps Script schema migration
`ensureHeaders()` successfully appended the 4 webhook columns to `Orders/Fulfillment`: `payment_status`, `square_payment_id`, `receipt_url`, `payment_completed_at`.

---

## ⏸️ BLOCKER — Step 7 Apps Script `doPost` Failed

After the Worker returned 200, Apps Script Executions logged a **Failed** row at **2026-05-15 01:35:57 UTC** for `doPost`. Couldn't open the row to read the actual error message — clicking on the timestamp, duration column, or "Failed" text didn't expand the log panel.

Working theory from earlier in the session was a stale-deployment artifact: `handleSquarePaymentCompleted` was patched in the editor (null-`reference_id` early return + flat-field reads in `buildCustomersBody`/`notifyThomas`), and `doget alive 12` was redeployed via the **pencil icon → New Version → Deploy** flow (not "+ New deployment"). Re-test still Failed. So either (a) the redeploy didn't actually republish the code, (b) the error is in a different code path than we patched, or (c) there's a runtime exception we haven't seen the stack trace for.

Current Apps Script editor state for the relevant functions is the version pasted into this session — all flat-field reads, no nested `data.data.object.payment.*` anywhere.

### Tomorrow's first moves (in order)

1. **Get the actual error message** from the 01:35:57 UTC Failed `doPost` execution. Three approaches to try:
   - Right-click the Failed row in Executions → **Open in new tab** (sometimes the side panel only renders in a fresh tab)
   - Hover the row for a **View Logs / View Details** link that may appear inline
   - Fastest fallback: in the Apps Script editor, open `handleSquarePaymentCompleted` → **Run** with a manual sample payload to reproduce the exception locally and see the stack trace in the IDE console. Sample payload to paste into a one-off `function _testSquare() { handleSquarePaymentCompleted({...}); }`:
     ```js
     {
       submission_type: "square_payment_completed",
       event_id: "test-evt",
       payment_id: "test-pay-abc12345",
       reference_id: null,              // mirrors a Square test event
       amount_cents: 100,
       currency: "USD",
       receipt_url: "https://example/receipt",
       customer_email: "test@example.com",
       completed_at: "2026-05-15T01:35:54Z"
     }
     ```
     If this reproduces the error, you'll get a line-numbered stack trace in the IDE log panel.
2. **Patch + redeploy** — once the error is identified, patch and redeploy via the **`doget alive 12`** deployment only: Manage Deployments → ✏️ pencil on `doget alive 12` → Version: **New version** → Deploy. **Do not click "+ New deployment"** — that mints a fresh `/exec` URL and Cloudflare is hardcoded to the current one (`…ZxOqBdw/exec`).
3. **Re-test** with Square Send Test Event → expect `200 OK` + body `{"success":true,"skipped":"no_reference_id"}` + Apps Script log line `[square webhook] No reference_id (likely Square test event) — skipping. payment_id=… event_id=…` + no new row in Orders/Fulfillment + no alert email.
4. **Real $1 order** via the live checkout → confirms the matched-row path: `payment_status` flips to `Paid`, Square metadata logged, 💰 email to `stillwaterflies5280@gmail.com`.
5. **Refund the $1 test transaction** in the Square dashboard (Transactions → find the test charge → Refund).
6. **Apps Script deployment cleanup.** Current deployment list has 8+ entries: `doget alive 12`, `the drop41`, `doget alive 1`, `doget alive`, `the drop3`, `the drop2`, `the drop1`, `the drop`. Archive everything except `doget alive 12`. Verify the `/exec` URL of `doget alive 12` matches `APPS_SCRIPT_WEBHOOK_URL` byte-for-byte before archiving any others.
7. **Revoke the Cloudflare API token** used in this session (`cfut_K20QN4Gs…`) if not already done — Cloudflare dashboard → My Profile → API Tokens → Roll/Delete. Worker is fully deployed; no further API access from this machine needed.

---

## Configuration locked

| Thing | Value |
|---|---|
| Apps Script `/exec` URL | `…/AKfycbwc5JR5yo76y8-H81D3Dh4e-pc6kqha8rLO2Yu90ZtFV_s-3Hm__YI52WoaW54zXOqBdw/exec` |
| Apps Script deployment to update | **`doget alive 12`** — pencil ✏️, NOT "+ New deployment" |
| Worker URL | `https://trouttricks-checkout.stillwaterflies5280.workers.dev` |
| Webhook path | `/webhook` |
| Worker deployment_id (last good) | `fcc4c58cc0854bbfb90e6fdd9d195f66` (2026-05-15 06:59:41 UTC) |
| Square subscription | `wbhk_d84f91111b…` (`payment.updated`) |
| Notification email | `stillwaterflies5280@gmail.com` (both 💰 receipts and 🚨 ghost alerts) |
| Orders tab name | `Orders/Fulfillment` |
| Ghost order_number fallback | `SQUARE-<first-8-chars-of-payment-id>` |
| New columns | Auto-created on first webhook via `ensureHeaders()` — already ran successfully |

---

## Worker payload contract (for Apps Script-side debugging)

The Worker forwards this **flat** shape to `APPS_SCRIPT_WEBHOOK_URL` (no nested `data.object.payment.*`):

```js
{
  submission_type: "square_payment_completed",
  event_id:        string | null,
  payment_id:      string | null,
  reference_id:    string | null,   // null on Square test events — Apps Script must early-return
  amount_cents:    number | null,
  currency:        string | null,
  receipt_url:     string | null,
  customer_email:  string | null,
  completed_at:    string | null,
}
```

---

## Queued for after #17 lands

**Project 2** — branded HTML order confirmation email + Klaviyo flow. Triggered by the same matched-row event in `handleSquarePaymentCompleted` once Step 7 is green.
