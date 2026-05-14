# Square → Worker `/webhook` → Apps Script — SHIP-READY (review before deploy)

Task **#17**. Square posts a webhook on payment completion → Worker verifies + normalizes → Apps Script updates (or **creates**, see safety-net) the row.

**This is for review. Don't deploy yet.** When you give the nod I'll walk you through the rollout sequence.

---

## 1) WORKER `/webhook` HANDLER

I don't have your current `/checkout` handler source, so this is **a clean self-contained route + helpers** to merge into your existing Worker. Add the new route alongside `/checkout` — don't replace anything you already have.

### A. Routing change (where your current `fetch` handler is)

If your existing handler is the modern `export default { fetch }` style:

```javascript
// In your existing fetch() handler, BEFORE the catch-all 404, add:

if (url.pathname === '/webhook' && request.method === 'POST') {
  return handleSquareWebhook(request, env, ctx);
}
```

If you're still on the older `addEventListener('fetch', …)` style, the same `if`-branch goes inside your event handler — same conditional, just adapt `event.respondWith()` to the existing pattern.

### B. Drop these functions in the same file

```javascript
// ---- Square webhook receiver ---------------------------------------------
// 1. Verify the HMAC-SHA256 signature against the RAW request body.
// 2. Filter to payment.updated events with status COMPLETED.
// 3. Forward a normalized payload to Apps Script via ctx.waitUntil
//    so we ACK Square in <1s even if Apps Script cold-starts.
async function handleSquareWebhook(request, env, ctx) {
  // Read raw body once — needed for both signature check AND JSON parse.
  const rawBody = await request.text();

  const signatureHeader = request.headers.get('x-square-hmacsha256-signature');
  const notificationUrl = env.SQUARE_WEBHOOK_NOTIFICATION_URL;

  if (!signatureHeader || !notificationUrl) {
    return new Response('Missing signature header or notification URL config', { status: 400 });
  }

  // Square signs (notificationUrl + rawBody) — the URL must match exactly
  // (protocol, host, path, no trailing slash) what you registered in Square.
  const valid = await verifySquareSignature(
    notificationUrl + rawBody,
    signatureHeader,
    env.SQUARE_WEBHOOK_SIGNATURE_KEY
  );

  if (!valid) {
    console.warn('[webhook] Invalid Square signature — rejecting');
    return new Response('Invalid signature', { status: 401 });
  }

  // Parse
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (e) {
    return new Response('Bad JSON', { status: 400 });
  }

  // Only act on completed payments
  if (event.type !== 'payment.updated') {
    return new Response('Ignored: not payment.updated', { status: 200 });
  }
  const payment = event.data?.object?.payment;
  if (!payment) {
    return new Response('Ignored: no payment object', { status: 200 });
  }
  if (payment.status !== 'COMPLETED') {
    return new Response('Ignored: status=' + payment.status, { status: 200 });
  }

  // Normalized payload. reference_id is the order_number index.html generates
  // and passes into the Square checkout link — Apps Script uses it to find
  // the row to flip (or creates one if it's a ghost order, see safety-net).
  const payload = {
    submission_type: 'square_payment_completed',
    event_id: event.event_id || null,
    payment_id: payment.id,
    order_id: payment.order_id || null,
    reference_id: payment.reference_id || null,
    amount_cents: payment.amount_money?.amount || 0,
    currency: payment.amount_money?.currency || 'USD',
    receipt_url: payment.receipt_url || null,
    customer_email: payment.buyer_email_address || null,
    completed_at: payment.updated_at || new Date().toISOString(),
  };

  // Fire-and-forget. ACK Square fast; Apps Script processing happens in
  // background. Failures are logged but don't bounce the webhook (Square
  // would retry 3x over 72h on non-2xx — we don't want that for downstream
  // glitches).
  ctx.waitUntil(
    fetch(env.APPS_SCRIPT_WEBHOOK_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      // NO Content-Type header — Apps Script doPost can't handle the CORS
      // preflight from application/json. Matches the "simple request" pattern
      // the rest of the site uses (sticker form, drop waitlist, etc).
    }).then(async (r) => {
      if (!r.ok) {
        const txt = await r.text().catch(() => '');
        console.error('[webhook] Apps Script returned', r.status, txt.slice(0, 200));
      }
    }).catch((err) => console.error('[webhook] Apps Script fetch failed:', err))
  );

  return new Response('OK', { status: 200 });
}

// ---- HMAC-SHA256 signature verification ----------------------------------
async function verifySquareSignature(stringToSign, signatureHeader, signingKey) {
  if (!signatureHeader || !signingKey) return false;
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(signingKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(stringToSign));
  // Square uses base64-encoded signatures.
  const computed = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return timingSafeEqual(computed, signatureHeader);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
```

---

## 2) APPS SCRIPT `doPost` BRANCH (with ghost-order safety-net)

Add this branch to your existing `doPost`. **Edit `ORDERS_TAB_NAME` at the top to match your actual sheet tab name.**

```javascript
// ============================================================
// SQUARE PAYMENT WEBHOOK HANDLER
// Triggered by: Cloudflare Worker /webhook -> POST to Apps Script.
// Payload shape: see Worker code, search "submission_type"
// ============================================================
const ORDERS_TAB_NAME = 'Orders';          // <-- EDIT if your tab name differs
const MASTER_SHEET_ID = '<<<PASTE_SHEET_ID>>>'; // <-- EDIT to your Master sheet ID

function doPost(e) {
  let data = {};
  try {
    data = JSON.parse(e.postData.contents || '{}');
  } catch (err) {
    return ContentService.createTextOutput('Bad JSON');
  }

  // ... your existing branches (sticker campaign, drop waitlist, pickup
  //     order, contact form, etc.) stay above this ...

  if (data.submission_type === 'square_payment_completed') {
    return handleSquarePaymentCompleted(data);
  }

  return ContentService.createTextOutput('OK');
}

function handleSquarePaymentCompleted(data) {
  const ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
  const sheet = ss.getSheetByName(ORDERS_TAB_NAME);
  if (!sheet) {
    Logger.log('[square webhook] Orders tab not found: ' + ORDERS_TAB_NAME);
    return ContentService.createTextOutput('Sheet not found');
  }

  const lastRow = sheet.getLastRow();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Header-name → 1-based column index. Case-insensitive substring match
  // so minor header drift doesn't break the handler.
  function col(needle) {
    needle = String(needle).toLowerCase();
    for (let i = 0; i < headers.length; i++) {
      if (String(headers[i]).toLowerCase() === needle) return i + 1;
    }
    return -1;
  }

  const ORDER_NUM_COL    = col('order_number');
  const STATUS_COL       = col('payment_status');
  const PAYMENT_ID_COL   = col('square_payment_id');
  const RECEIPT_COL      = col('receipt_url');
  const COMPLETED_COL    = col('payment_completed_at');
  const SOURCE_COL       = col('source');
  const CUSTOMER_EMAIL_COL = col('customer_email');
  const AMOUNT_COL       = col('order_total');

  // ---- 1. Try to find an existing row by reference_id (= order_number) ----
  if (lastRow >= 2 && data.reference_id && ORDER_NUM_COL > 0) {
    const range = sheet.getRange(2, ORDER_NUM_COL, lastRow - 1, 1).getValues();
    for (let i = 0; i < range.length; i++) {
      if (String(range[i][0]).trim() === String(data.reference_id).trim()) {
        const rowNum = i + 2;
        if (STATUS_COL > 0)     sheet.getRange(rowNum, STATUS_COL).setValue('Paid');
        if (PAYMENT_ID_COL > 0) sheet.getRange(rowNum, PAYMENT_ID_COL).setValue(data.payment_id);
        if (RECEIPT_COL > 0)    sheet.getRange(rowNum, RECEIPT_COL).setValue(data.receipt_url || '');
        if (COMPLETED_COL > 0)  sheet.getRange(rowNum, COMPLETED_COL).setValue(data.completed_at || new Date().toISOString());

        notifyThomas('💰 Square payment received', data, rowNum, /*ghost=*/false);
        return ContentService.createTextOutput('Updated row ' + rowNum);
      }
    }
  }

  // ---- 2. SAFETY NET: ghost order ----
  // Square reports a payment but no row in our sheet matches the reference_id.
  // Root cause is usually a pre-payment write that never fired (network blip,
  // Apps Script cold-start timeout, user closed the tab between submit and
  // Square redirect). Marion case = real example we built this for.
  //
  // Create a new row with status='Paid' + source='Square Direct' so Thomas
  // sees it and can reconcile fulfillment manually instead of the order
  // silently disappearing.
  const newRow = new Array(headers.length).fill('');
  function set(c, v) { if (c > 0) newRow[c - 1] = v; }

  set(ORDER_NUM_COL,      data.reference_id || ('SQUARE-' + (data.payment_id || '').slice(0, 8)));
  set(STATUS_COL,         'Paid');
  set(SOURCE_COL,         'Square Direct');
  set(PAYMENT_ID_COL,     data.payment_id);
  set(RECEIPT_COL,        data.receipt_url || '');
  set(COMPLETED_COL,      data.completed_at || new Date().toISOString());
  set(CUSTOMER_EMAIL_COL, data.customer_email || '');
  set(AMOUNT_COL,         data.amount_cents ? (data.amount_cents / 100).toFixed(2) : '');

  // Tolerant insert — appendRow with same column count as headers.
  sheet.appendRow(newRow);
  const newRowNum = sheet.getLastRow();

  notifyThomas('🚨 Ghost order paid — manual reconcile needed', data, newRowNum, /*ghost=*/true);
  return ContentService.createTextOutput('Ghost row created at row ' + newRowNum);
}

function notifyThomas(subject, data, rowNum, isGhost) {
  const amount = data.amount_cents ? '$' + (data.amount_cents / 100).toFixed(2) : 'unknown';
  const body = [
    isGhost ? '⚠️  GHOST ORDER — Square reports a payment with no matching row in ' + ORDERS_TAB_NAME + '.\n' +
              '   A new row was inserted with status=Paid + source=Square Direct.\n' +
              '   Reconcile fulfillment manually.\n' : '',
    'Row:             ' + rowNum,
    'Reference ID:    ' + (data.reference_id || '(missing)'),
    'Payment ID:      ' + data.payment_id,
    'Amount:          ' + amount + ' ' + (data.currency || 'USD'),
    'Customer email:  ' + (data.customer_email || '(missing)'),
    'Receipt:         ' + (data.receipt_url || '(none)'),
    'Completed:       ' + (data.completed_at || ''),
  ].filter(Boolean).join('\n');

  try {
    MailApp.sendEmail({
      to: 'thomas@trouttricks.com',
      subject: subject + ' — ' + (data.reference_id || data.payment_id),
      body: body,
    });
  } catch (err) {
    Logger.log('[square webhook] notification email failed: ' + err);
  }
}
```

### Why the ghost-order branch matters

The Marion case (and any other "Square has the payment but my sheet doesn't") happens when something in the pre-payment write path fails — `pickupCardCheckout` fires a fetch to Apps Script BEFORE handing off to Square, and that fetch is fire-and-forget with no retry. If it fails (network blip, Apps Script slow start, browser closed the tab), the row never gets written. Customer pays Square anyway. You'd never know until they emailed asking where their flies are.

This safety-net catches every one of those: Square's webhook arrives, no matching row, Apps Script creates a `source='Square Direct'` row + emails you with the 🚨 subject so it can't get lost in the inbox.

---

## 3) MASTER SHEET COLUMN HEADERS TO ADD

Add these to the `Orders` tab (or whatever you've named it — match `ORDERS_TAB_NAME` above). Existing columns stay; just append these at the right:

| Header (exact spelling) | Type | Notes |
|---|---|---|
| `payment_status` | text | `pending` / `Paid` / `refunded` |
| `square_payment_id` | text | Square's payment ID — needed for refund reconciliation |
| `receipt_url` | URL | Square's customer-facing receipt URL |
| `payment_completed_at` | ISO timestamp | When Square confirmed the payment |

If you don't already have a `source` column (used for tagging the ghost-order rows with `Square Direct`), add that too. Same for `order_total` if not present.

The `col()` lookup in the Apps Script handler is case-insensitive **but matches the exact header text**, so spelling/spaces matter. Use lowercase + underscores to match what the code expects.

---

## 4) WRANGLER COMMANDS — set the 3 env vars

Run these from your Worker's local repo (the one with `wrangler.toml`). Each one prompts you for the value — paste, hit Enter.

```bash
# Square webhook signing key (from Square Dashboard → Developer → Apps → your app
# → Webhooks → subscription → Signature Key)
wrangler secret put SQUARE_WEBHOOK_SIGNATURE_KEY

# The EXACT URL you registered in Square (no trailing slash, https, full path).
# This must match the URL Square thinks it's hitting, byte-for-byte, or signature
# verification fails silently on every event.
wrangler secret put SQUARE_WEBHOOK_NOTIFICATION_URL
# When prompted, paste: https://trouttricks-checkout.stillwaterflies5280.workers.dev/webhook

# Your Apps Script web app /exec URL (the same one used by the rest of the
# site for form submissions).
wrangler secret put APPS_SCRIPT_WEBHOOK_URL
# When prompted, paste: https://script.google.com/macros/s/AKfycbw...../exec
```

To verify they're set after the fact (won't show values, just names):

```bash
wrangler secret list
```

---

## REVIEW CHECKLIST

Before you green-light deploy, confirm these:

- [ ] **Sheet tab name.** Update `ORDERS_TAB_NAME` in the Apps Script to match your actual tab. (My draft uses `'Orders'` — change if yours is `'Master Customers'` or similar.)
- [ ] **MASTER_SHEET_ID.** Paste your sheet ID into the Apps Script constant.
- [ ] **Sheet columns added.** All 4 new columns + `source` + `order_total` exist with the exact header names from §3.
- [ ] **Existing `doPost` branches.** Confirm the new branch doesn't conflict with any existing `submission_type` value you've already used.
- [ ] **Worker `/checkout` route.** Confirm the new `/webhook` branch was added BEFORE the catch-all 404 and AFTER the existing `/checkout` branch — order matters for routing.
- [ ] **Square dashboard.** Webhook subscription URL exactly matches `SQUARE_WEBHOOK_NOTIFICATION_URL`. Event types include `payment.updated`. Signature key copied into the wrangler secret.
- [ ] **Ghost-order email.** `thomas@trouttricks.com` is the right inbox. Maybe pre-filter the 🚨 subject to a "Trout Tricks Alerts" Gmail label so it pops.
- [ ] **Dry-run plan.** Square's "Send Test Event" first → confirm Worker logs show signature valid → confirm Apps Script Executions log shows the ghost branch fired (test event won't have a matching reference_id, so it'll exercise the safety-net specifically). Then a real $1 order via `/free-sticker` or a $5 sticker.

---

## DEPLOY SEQUENCE (when you give the nod)

1. `wrangler secret put` × 3 — env vars first.
2. Paste the Worker code into your local Worker repo's source file. Save.
3. `wrangler deploy`.
4. Add the Apps Script branch + helper functions. Save in the Apps Script editor.
5. **Apps Script: New Version → Deploy → "Update" the existing web-app deployment.** Critical: pick "Update" not "New deployment" so the existing `/exec` URL keeps working.
6. Add the 4 (or 6) new column headers to the Orders tab.
7. Register the webhook subscription in Square Dashboard with the URL from §4.
8. Square Dashboard → your subscription → "Send Test Event" → check Cloudflare Live Tail + Apps Script Executions log.
9. Real $1 sticker order → watch the sheet row flip live.

Standing by for review notes.
