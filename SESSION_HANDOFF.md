# Session Handoff Log

Multi-thread parked work. Each section is independently resumable.

## 2026-06-03 — TT16 (Customer map + Drop funnel + Drop Waitlist webhook)

### ✅ Shipped to `main`

| Commit | What |
|---|---|
| `d67f421` | Removed size **#18** from Muskie Buzzer + Top Secret Winged Cone (catalog.js + both fly pages) |
| `9d0e9e4` | **Auto-updating customer map** — Apps Script `orderMap` endpoint + frontend fetch-with-fallback |
| `afefa4a` | Order map: include **sticker shipments** + recognize **Canadian provinces** |
| `891e414` | Order map: **city dedupe** (`mapKey_`) + **EXTRAS** array for off-sheet customers |
| `e97fa52` | Build `/apply.html` — FB ad funnel for The Drop (prior session's base) |
| `1e4f919` | apply.html: **Meta Pixel** + **real Google reviews** + **founding $20 hook** |
| `e282314` | apply.html: **crop face** out of solution-section image |

---

### Thread 1: Auto-updating customer map — ✅ COMPLETE & DEPLOYED

**Goal:** ship an order → map updates next page load, zero manual edits.

#### What's live
- **`GET …/exec?action=orderMap`** → `handleOrderMap()` in `apps-script/Code.gs`.
  - Reads **Orders/Fulfillment** (city col **L/12**, state col **M/13**, fulfillment col **G/7**) — *all* rows, no status filter.
  - **Local pickup** orders stack at HQ as `"Fairmount, CO (Local Pickup)"` (lat 39.7686 / lng -105.1447, never geocoded).
  - **Ship** orders grouped by normalized `"City, ST"`, geocoded once via `Maps.newGeocoder()`, cached in hidden **GeoCache** tab (`city_state, lat, lng, last_updated`).
  - Also folds in **Sticker Campaign** sheet (city col **H/8**, state col **I/9**) — all mailed, no pickup.
  - **EXTRAS** array (top of `handleOrderMap`) for off-sheet gifts — currently seeded with `Saskatoon, SK` (Thomas's buddy).
  - `mapKey_()` normalizes city→Title Case, state→UPPER so casing variants collapse to one pin.
  - Returns `[{city,lat,lng,count}]` (same shape as static `TT_ORDERS`); returns `{error:…}` on lock timeout / missing sheet / nothing mappable.
- **Frontend** (`index.html` mini-map + `about.html#flymap`): `fetch(orderMap)` → on success render live data, on **any** failure fall back to static `/js/order-map-data.js`. Static file kept intact as fallback.
- **Counter parser** on both pages recognizes Canadian province codes **and** full names → counts as Canada + province. Strips trailing `"(…)"` tags before parsing.

#### Status
- ✅ Merged to `main`, **Apps Script redeployed** by Thomas (verified working).
- The Saskatchewan pin (was a sticker shipment) is restored via the Sticker sheet + EXTRAS.

#### Notes / carry-forward
- **Stale GeoCache rows:** earlier deploys may have left non-normalized keys in the GeoCache tab. Harmless (never matched again). To start clean, delete the hidden **GeoCache** tab — it rebuilds on next endpoint hit.
- Adding future off-sheet sends = add a line to `EXTRAS` in `handleOrderMap()` + redeploy.

---

### Thread 2: The Drop FB funnel (`apply.html`) — ✅ MERGED to `main`

Built on `feature/drop-funnel` (now merged + local branch deleted; **`origin/feature/drop-funnel` still exists on GitHub**, harmless).

#### Edits live
1. **Meta Pixel** installed in `<head>`, ID **`1630431118063509`** (PageView + noscript). The `fbq('track','Lead')` on form submit (guarded by `typeof fbq==='function'`) now fires for real.
2. **Testimonials** — 5 fake quotes → **3 real 5.0★ Google reviews** (Dustin H., Peter F., Tanner P.), each tagged "Google Review". New header "Real reviews from Trout Tricks anglers" + 5.0★ subhead + "See all reviews on Google →" → `https://share.google/q3H0I3myXr0Y4OrTZ`.
3. **Founding pricing hook** (Urgency section) — "Founding members — 10 spots, **$20/mo locked for life**", 3-paragraph body ($20 founding vs $35 standard, both tiers equal, waitlist opens founding 10 at 25 signups). Placeholder `[N of 10 founding spots claimed]` line, `id="foundingSpots"`.
4. **FAQ** "How much does it cost?" → $20 founding / $35 standard / fit-call copy.
5. **Solution image face-crop** — `.solution-photo img { object-position: center 80%; }`. Image is 700×525 (4:3) in a 16:9 frame; 80% crops the top ~20% (face) and shows hands+fish. Verified via simulated crop. (OPTION A succeeded; no image swap needed.)

#### Ghosting verified (all PASS)
- **Nav/footer:** no `href` to `/apply` anywhere; only 3 self-references inside apply.html (comments + Klaviyo source string).
- **Sitemap:** `apply` absent from `sitemap.xml`.
- **Robots meta:** `apply.html:9` has `<meta name="robots" content="noindex, nofollow">`.
- **robots.txt:** only `User-agent: * / Allow: / / Sitemap:…` — no explicit `/apply` rule. Discovery limited to people sent the ad link (the intent).

#### Carry-forward
- **founding-spots counter** is a static placeholder — wire to `the-drop.html`'s `TT_DROP_STATE` later if reusable.
- **`founding_interest` field** not yet in the apply.html form (webhook defaults it to `'unknown'`).

---

### Thread 3: Drop Waitlist webhook — ⏸️ BUILT, NOT DEPLOYED, NOT MERGED

Branch **`feature/drop-waitlist-sheet`** (tip `f1c6525`), pushed to origin. **Pending Thomas review before deploy.**

#### What's in the branch
- **`handleDropWaitlistSignup(body)`** in `Code.gs` for `submission_type === 'drop_waitlist_signup'` (apply.html FB-funnel mirror).
  - ⚠️ **Named distinctly on purpose.** A `handleDropWaitlist` (the-drop.html flow, type `drop_waitlist`) **already exists**; a second same-named function would silently override it in Apps Script and break that flow. Both write to the same **Drop Waitlist** tab.
  - LockService-protected; **email dedup** on column C → appends a flagged `RESUBMIT —` row instead of a clean duplicate; calls `logWebhook(null, body, 'drop_waitlist_signup')`.
  - Defaults: Source `drop_funnel_fb`, Founding Interest `unknown`.
- **Router** (Code.gs ~line 54): `if (body.submission_type === 'drop_waitlist_signup') return handleDropWaitlistSignup(body);`
- **apply.html** (after the Klaviyo POST): fire-and-forget `fetch()` POST mirroring the signup to the sheet. Klaviyo (list **S5XAFW**) unchanged.

#### Open decisions for Thomas (flagged at delivery)
1. **Double-logging:** `doPost` already logs every request as `'incoming'`, so each signup produces two Webhook Log rows (one `incoming`, one `drop_waitlist_signup`). Keep or drop the typed one?
2. **No Master Customers write:** the sibling `handleDropWaitlist` calls `writeToMasterCustomers()`; the new one doesn't (not in spec). Add for parity?
3. **Extra field:** the POST body includes `customer_first_name` (beyond the spec's 3 fields) so the First Name column fills.

#### Deploy path (when approved)
1. Merge `feature/drop-waitlist-sheet` → `main`.
2. `git show main:apps-script/Code.gs | pbcopy` → paste into Apps Script editor → Save.
3. **Deploy → Manage deployments → ✏️ on `doget alive 12` → Version: New version → Deploy.** (NEVER "+ New deployment" — mints a new `/exec` URL; Cloudflare + all frontends are hardcoded to the current one.)
4. Test with `"submission_type":"drop_waitlist_signup"` (a retry should produce a **RESUBMIT** row, not a clean dupe).

---

### 🧹 Cleanup owed
- **Delete 2 test rows** `test-deploy-check@trouttricks.com` (2026-06-03 23:25:54 + 23:26:55) from **Drop Waitlist**, plus the matching **Master Customers** and **Webhook Log** entries. (Verification POSTs to the existing no-dedup `drop_waitlist` handler; both wrote rows.)
- **Stale remote branches** on GitHub: `origin/feature/auto-map`, `origin/feature/drop-funnel` (both merged). Delete with `git push origin --delete <branch>` when convenient.

---

### 🔍 Verification finding (deployment health)
- `GET …/exec` → **200** + alive text → deployment live & current.
- POST testing via **curl is unreliable** for Apps Script: POST→302→`googleusercontent.com` echo URL serves the response only via GET, so the terminal sees a "Sorry, unable to open the file" / 405 page even when the script ran fine. **A browser `fetch()` (apply.html's real call) handles this correctly.** Verify POSTs by checking the sheet, not the curl response.
- Confirmed via Drive read: the deployed `handleDropWaitlist` (`drop_waitlist`) works. The **new** `handleDropWaitlistSignup` is **not deployed yet** (Thread 3).

---

### Configuration locked

| Thing | Value |
|---|---|
| Apps Script `/exec` URL | `…/AKfycbwc5JR5yo76y8-H81D3Dh4e-pc6kqha8rLO2Yu90ZtFV_s-3Hm__YI52WoaW54zXOqBdw/exec` |
| Deployment to update | **`doget alive 12`** — pencil ✏️ → New version, NOT "+ New deployment" |
| Master Tracker Sheet ID | `1xWB17PN1YKdUAmPGYmpdQdkg71NsHwyDKV5QgWWNcV8` |
| Meta Pixel ID (apply.html) | `1630431118063509` |
| Klaviyo (apply.html) | company `RyxZFj`, Drop Waitlist list `S5XAFW` |
| Google reviews link | `https://share.google/q3H0I3myXr0Y4OrTZ` |
| Order map endpoint | `…/exec?action=orderMap` (GET) |
| New sheet tabs | `GeoCache` (hidden, auto-created), `Drop Waitlist` (existing) |
| Order map cols | Orders/Fulfillment: city L/12, state M/13, fulfillment G/7 · Sticker Campaign: city H/8, state I/9 |

---

## TT15 — 2026-06-01

### ✅ Major wins
- **GSC redirect stubs deployed** — `/files/*` → `/flies/*` (plus `flash-scud` → `bling-scud`)
- **Tax collection live** — Worker `LINE_ITEM` scope + Apps Script tax column **P**
- **Column reorder complete** — address now **K–N**, **Revenue → O**, **Tax → P** (was J=Revenue, K–O=acq/address)
- **17 historical rows migrated** — `migrateColumnOrder()` run once against the live sheet
- **Dynamic totals** — revenue + tax sum formulas now in **O1 / P1**
- **Row 1 protected** + **data validation re-added in warning mode** ("Show warning", not "Reject")

### 📝 Lessons learned
- **Strict data validation breaks `setValues()`** — always use **"Show warning"**, not **"Reject"**, on any column automation writes to. A "Reject" rule silently aborts the whole `setValues()` call.
- **Sheet migration runbook:** (1) back up the sheet first, (2) remove validation, (3) run the migration, (4) restore formulas, (5) re-add validation in warning mode.
- **Reference column positions with formulas dynamically** — the totals formula moved from **J1 → O1** when Revenue moved; keep formulas pointing at the column by header/position, not a hard-coded letter.

### ⏭️ Still pending (carry to TT16)
- **Priority 1a:** CDOR (Colorado Dept. of Revenue) Revenue Online — *call when they open*
- **Priority 2:** Chironomid Cheat Sheet PDF — ready to design; organic distribution first
- **Priority 2a:** Reviews infrastructure decision — **deadline June 10, 2026**

### 🗑️ Removed from list
- **FortiGuard cleanup** — low impact at current scale

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
