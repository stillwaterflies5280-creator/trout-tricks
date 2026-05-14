# Session handoff — Square webhook deploy

Paused mid-deploy of task **#17** (Square post-payment webhook → Apps Script auto-flip status). System is in a safe paused state — no new traffic flows anywhere. Existing site endpoints (sticker form, drop waitlist, pickup orders, /checkout) all unchanged.

Full code + walkthrough lives at `assets/worker-webhook-route.md` (commit `ebf2504`).

---

## What's shipped

### ✅ Step 1 — Apps Script branch deployed
- New `handleSquarePaymentCompleted` + `ensureHeaders` + `buildCustomersBody` + `notifyThomas` helpers added to the Apps Script project.
- New `doPost` branch for `submission_type === 'square_payment_completed'`.
- Deployment **updated in place** (not a new deployment), so the `/exec` URL is unchanged.
- URL ends in **`...ZxOqBdw/exec`** — same one the rest of the site uses.

### ✅ Step 2 — Cloudflare secrets set
Via Cloudflare dashboard (Option A — Worker repo isn't on this Mini; see fallback note below).

3 secrets on the `trouttricks-checkout` Worker:

| Secret | Value |
|---|---|
| `APPS_SCRIPT_WEBHOOK_URL` | The `/exec` URL ending `…ZxOqBdw/exec` |
| `SQUARE_WEBHOOK_NOTIFICATION_URL` | `https://trouttricks-checkout.stillwaterflies5280.workers.dev/webhook` |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | `PLACEHOLDER_REPLACE_IN_STEP_5` |

Worker saved and re-deployed after secrets landed.

---

## What's remaining

### ⏸️ Step 3 — Deploy Worker code (RESUME HERE)
Paste the `/webhook` handler from `assets/worker-webhook-route.md` §1 into the Worker source and deploy.

**Worker repo not on this Mini.** No `wrangler.toml` found on the filesystem. Fallback path: edit directly in the **Cloudflare web editor** (Workers & Pages → `trouttricks-checkout` → Edit Code → paste the new functions + add the `/webhook` if-branch in the fetch handler → Save and deploy).

### ⏸️ Step 4 — Register Square webhook subscription
Square Dashboard → Developer → Apps → [your app] → Webhooks → Add subscription:
- Notification URL: `https://trouttricks-checkout.stillwaterflies5280.workers.dev/webhook`
- Event type: `payment.updated` (minimum)
- Save → **copy the generated Signature Key**

### ⏸️ Step 5 — Replace signature key placeholder
Set the real signing key (from Step 4) as `SQUARE_WEBHOOK_SIGNATURE_KEY` via Cloudflare dashboard. Save and deploy. The Worker code stays the same — secret update propagates within seconds.

### ⏸️ Step 6 — Send Test Event from Square
Square Dashboard → webhook subscription → **Send Test Event**.

What to expect:
- Cloudflare Live Tail: signature valid, payload normalized, Apps Script POST fires
- Apps Script Executions: `handleSquarePaymentCompleted` runs, `ensureHeaders` auto-creates the 4 webhook columns (payment_status, square_payment_id, receipt_url, payment_completed_at) in the `Orders/Fulfillment` tab on first event
- Test events have no matching reference_id → exercises the **ghost-order safety-net** path → a row gets inserted with `payment_status='Paid'` + ghost tag in `details`
- Email lands in `stillwaterflies5280@gmail.com` with the 🚨 subject

### ⏸️ Step 7 — Real $1 dry-run
Place a real $1 sticker order via the site → Square checkout → pay → confirm the matched-row path flips the existing row's `payment_status` to `Paid` and logs Square metadata. Email arrives with the 💰 subject.

---

## Configuration locked

| Thing | Value |
|---|---|
| Apps Script `/exec` URL | `…ZxOqBdw/exec` |
| Worker URL | `https://trouttricks-checkout.stillwaterflies5280.workers.dev` |
| Webhook path | `/webhook` |
| Notification email | `stillwaterflies5280@gmail.com` (both 💰 receipts and 🚨 ghost alerts) |
| Orders tab name | `Orders/Fulfillment` |
| Ghost order_number fallback | `SQUARE-<first-8-chars-of-payment-id>` |
| New columns | Auto-created on first webhook via `ensureHeaders()` — no manual sheet work needed |

---

## Resume point tomorrow

**Step 3** — deploy the Worker code via the Cloudflare web editor (Worker repo isn't on this Mini).

The exact code to paste is at `assets/worker-webhook-route.md` §1.B "Functions to add" — that's the `handleSquarePaymentCompleted` + `verifySquareSignature` + `timingSafeEqual` block. The if-branch routing change is at §1.A.
