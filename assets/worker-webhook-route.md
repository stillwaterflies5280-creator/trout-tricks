# Square → Worker `/webhook` → Apps Script — SHIP-READY (review before deploy)

Task **#17**. Square posts a webhook on payment completion → Worker verifies + normalizes → Apps Script updates (or **creates**, ghost-order safety-net) the row in `Orders/Fulfillment` + mirrors to `Master Customers`.

**Don't deploy yet. Review and confirm.**

---

## What changed from the prior draft (c760e8a)

- Sheet tab name: `Orders/Fulfillment` (slash literal in the constant)
- `MASTER_SHEET_ID` constant removed → uses `SpreadsheetApp.getActiveSpreadsheet()` since the Apps Script is sheet-bound
- Both paths (existing-row update AND ghost-order create) now call `writeToMasterCustomers(body, 'Order')` to mirror to Master Customers — matches the `handleOrder()` pattern
- Notification email switched from `thomas@trouttricks.com` to `stillwaterflies5280@gmail.com` (matches where Square already sends receipts)
- Amount writes to the existing `revenue` column, NOT a new `order_total` column (your current schema already has revenue)
- No `source` column required — ghost-order tagging is embedded in the `details` column instead, since your schema doesn't have a `source` field

---

## 1) WORKER `/webhook` HANDLER (unchanged from prior draft)

Same as before — drop-in route + helpers to merge into your existing Worker.

### A. Routing change

```javascript
if (url.pathname === '/webhook' && request.method === 'POST') {
  return handleSquareWebhook(request, env, ctx);
}
```

### B. Functions to add

```javascript
// ---- Square webhook receiver ---------------------------------------------
async function handleSquareWebhook(request, env, ctx) {
  const rawBody = await request.text();

  const signatureHeader = request.headers.get('x-square-hmacsha256-signature');
  const notificationUrl = env.SQUARE_WEBHOOK_NOTIFICATION_URL;

  if (!signatureHeader || !notificationUrl) {
    return new Response('Missing signature header or notification URL config', { status: 400 });
  }

  const valid = await verifySquareSignature(
    notificationUrl + rawBody,
    signatureHeader,
    env.SQUARE_WEBHOOK_SIGNATURE_KEY
  );

  if (!valid) {
    console.warn('[webhook] Invalid Square signature — rejecting');
    return new Response('Invalid signature', { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (e) {
    return new Response('Bad JSON', { status: 400 });
  }

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

  ctx.waitUntil(
    fetch(env.APPS_SCRIPT_WEBHOOK_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
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

## 2) APPS SCRIPT BRANCH (revised — getActiveSpreadsheet, writeToMasterCustomers on both paths)

Add this branch to your existing `doPost`. The only thing to edit is `ORDERS_TAB_NAME` if your tab name differs from `'Orders/Fulfillment'`.

```javascript
// ============================================================
// SQUARE PAYMENT WEBHOOK HANDLER
// Triggered by: Cloudflare Worker /webhook -> POST to Apps Script.
// On existing-row match: flip payment_status to Paid, log Square metadata.
// On no-match: insert a ghost-order row + alert Thomas to reconcile manually.
// Both paths mirror to Master Customers via writeToMasterCustomers().
// ============================================================
const ORDERS_TAB_NAME = 'Orders/Fulfillment';
const NOTIFY_EMAIL    = 'stillwaterflies5280@gmail.com';

function doPost(e) {
  let data = {};
  try {
    data = JSON.parse(e.postData.contents || '{}');
  } catch (err) {
    return ContentService.createTextOutput('Bad JSON');
  }

  // ... your existing branches stay above this ...

  if (data.submission_type === 'square_payment_completed') {
    return handleSquarePaymentCompleted(data);
  }

  return ContentService.createTextOutput('OK');
}

function handleSquarePaymentCompleted(data) {
  // Apps Script is bound to the right sheet — use getActiveSpreadsheet()
  // for consistency with the other handlers (handleOrder, handleSticker, etc).
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(ORDERS_TAB_NAME);
  if (!sheet) {
    Logger.log('[square webhook] Tab not found: ' + ORDERS_TAB_NAME);
    return ContentService.createTextOutput('Sheet not found');
  }

  const lastRow = sheet.getLastRow();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Case-insensitive header → 1-based column index lookup
  function col(needle) {
    needle = String(needle).toLowerCase();
    for (let i = 0; i < headers.length; i++) {
      if (String(headers[i]).toLowerCase() === needle) return i + 1;
    }
    return -1;
  }

  // Existing columns (per your current schema)
  const EMAIL_COL        = col('email');
  const FIRST_NAME_COL   = col('firstName');
  const LAST_NAME_COL    = col('lastName');
  const PHONE_COL        = col('phone');
  const ORDER_DATE_COL   = col('orderDate');
  const DETAILS_COL      = col('details');
  const FULFILLMENT_COL  = col('fulfillment');
  const STATUS_COL       = col('status');           // fulfillment status — separate from payment_status
  const REVENUE_COL      = col('revenue');
  // Heuristic for matching: most order_number values land in details
  // (since current schema has no dedicated order_number column).
  // If you have an order_number column, swap this lookup.
  const ORDER_NUM_COL    = col('order_number');     // -1 if missing — fall back to details search

  // NEW columns (add manually before deploy — see §3)
  const PAYMENT_STATUS_COL = col('payment_status');
  const PAYMENT_ID_COL     = col('square_payment_id');
  const RECEIPT_COL        = col('receipt_url');
  const COMPLETED_COL      = col('payment_completed_at');

  // ---- 1. Try to match the existing row by reference_id ----
  let matchedRow = -1;
  if (lastRow >= 2 && data.reference_id) {
    if (ORDER_NUM_COL > 0) {
      // Dedicated order_number column — exact match
      const range = sheet.getRange(2, ORDER_NUM_COL, lastRow - 1, 1).getValues();
      for (let i = 0; i < range.length; i++) {
        if (String(range[i][0]).trim() === String(data.reference_id).trim()) {
          matchedRow = i + 2;
          break;
        }
      }
    } else if (DETAILS_COL > 0) {
      // Fallback: substring search in the details column (order number is often
      // embedded in the details text — your pickup-order handler writes it there)
      const range = sheet.getRange(2, DETAILS_COL, lastRow - 1, 1).getValues();
      const needle = String(data.reference_id).trim();
      for (let i = 0; i < range.length; i++) {
        if (String(range[i][0]).indexOf(needle) !== -1) {
          matchedRow = i + 2;
          break;
        }
      }
    }
  }

  if (matchedRow > 0) {
    // Found — flip payment status + log Square metadata. Leave fulfillment
    // status untouched (it's a separate axis from payment).
    if (PAYMENT_STATUS_COL > 0) sheet.getRange(matchedRow, PAYMENT_STATUS_COL).setValue('Paid');
    if (PAYMENT_ID_COL > 0)     sheet.getRange(matchedRow, PAYMENT_ID_COL).setValue(data.payment_id);
    if (RECEIPT_COL > 0)        sheet.getRange(matchedRow, RECEIPT_COL).setValue(data.receipt_url || '');
    if (COMPLETED_COL > 0)      sheet.getRange(matchedRow, COMPLETED_COL).setValue(data.completed_at || new Date().toISOString());

    // Mirror to Master Customers (matches handleOrder() pattern)
    writeToMasterCustomers(buildCustomersBody(data, sheet, matchedRow), 'Order');

    notifyThomas('💰 Square payment received', data, matchedRow, /*ghost=*/false);
    return ContentService.createTextOutput('Updated row ' + matchedRow);
  }

  // ---- 2. GHOST-ORDER SAFETY-NET ----
  // Square reports a payment but no row in Orders/Fulfillment matches the
  // reference_id. Pre-payment write must have failed (network blip, tab
  // closed, Apps Script timeout). Create a new row + flag for manual reconcile.
  const newRow = new Array(headers.length).fill('');
  function set(c, v) { if (c > 0) newRow[c - 1] = v; }

  const fallbackOrderNum = data.reference_id ||
    ('SQUARE-' + (data.payment_id || '').slice(0, 8));

  set(EMAIL_COL,           data.customer_email || '');
  set(ORDER_DATE_COL,      new Date());
  // Source-tag the ghost order in details since the schema has no `source` column
  set(DETAILS_COL,         '⚠️ GHOST ORDER — Square Direct (manual reconcile). Ref: ' + fallbackOrderNum);
  set(STATUS_COL,          'Pending');             // fulfillment pending — Thomas must reconcile
  set(REVENUE_COL,         data.amount_cents ? (data.amount_cents / 100).toFixed(2) : '');
  set(PAYMENT_STATUS_COL,  'Paid');
  set(PAYMENT_ID_COL,      data.payment_id);
  set(RECEIPT_COL,         data.receipt_url || '');
  set(COMPLETED_COL,       data.completed_at || new Date().toISOString());
  // If you add an order_number column later, this will populate automatically
  set(ORDER_NUM_COL,       fallbackOrderNum);

  sheet.appendRow(newRow);
  const newRowNum = sheet.getLastRow();

  // Mirror to Master Customers — same pattern as the matched-row path
  writeToMasterCustomers(buildCustomersBody(data, sheet, newRowNum), 'Order');

  notifyThomas('🚨 Ghost order paid — manual reconcile needed', data, newRowNum, /*ghost=*/true);
  return ContentService.createTextOutput('Ghost row created at row ' + newRowNum);
}

// Build a body that matches what handleOrder() typically passes to
// writeToMasterCustomers. Square webhook only gives us email + amount; other
// fields stay blank and writeToMasterCustomers should treat missing values
// as no-ops (matches the existing function's behavior for partial data).
function buildCustomersBody(data, sheet, rowNum) {
  // Pull whatever customer info we have from the matched row (for the existing-
  // row path, this lets writeToMasterCustomers see the pre-payment data too)
  const row = sheet.getRange(rowNum, 1, 1, sheet.getLastColumn()).getValues()[0];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  function cell(name) {
    const i = headers.findIndex(h => String(h).toLowerCase() === String(name).toLowerCase());
    return i >= 0 ? row[i] : '';
  }
  return {
    email:      data.customer_email || cell('email') || '',
    firstName:  cell('firstName') || '',
    lastName:   cell('lastName')  || '',
    phone:      cell('phone')     || '',
    order_total: data.amount_cents ? (data.amount_cents / 100).toFixed(2) : (cell('revenue') || ''),
    order_items: cell('details') || '',
    payment_method: 'square',
    fulfillment: cell('fulfillment') || '',
    receipt_url: data.receipt_url || '',
    square_payment_id: data.payment_id || '',
  };
}

function notifyThomas(subject, data, rowNum, isGhost) {
  const amount = data.amount_cents ? '$' + (data.amount_cents / 100).toFixed(2) : 'unknown';
  const lines = [];
  if (isGhost) {
    lines.push('⚠️  GHOST ORDER — Square reports a payment with no matching row in ' + ORDERS_TAB_NAME + '.');
    lines.push('   A new row was inserted with payment_status=Paid + a "Square Direct" tag in details.');
    lines.push('   Fulfillment status is "Pending" — reconcile manually.');
    lines.push('');
  }
  lines.push('Row:             ' + rowNum);
  lines.push('Reference ID:    ' + (data.reference_id || '(missing)'));
  lines.push('Payment ID:      ' + data.payment_id);
  lines.push('Amount:          ' + amount + ' ' + (data.currency || 'USD'));
  lines.push('Customer email:  ' + (data.customer_email || '(missing)'));
  lines.push('Receipt:         ' + (data.receipt_url || '(none)'));
  lines.push('Completed:       ' + (data.completed_at || ''));

  try {
    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: subject + ' — ' + (data.reference_id || data.payment_id),
      body: lines.join('\n'),
    });
  } catch (err) {
    Logger.log('[square webhook] notification email failed: ' + err);
  }
}
```

---

## 3) MASTER SHEET — ADD COLUMNS MANUALLY BEFORE DEPLOY

**Your current Orders/Fulfillment schema (10 columns):**

`email · firstName · lastName · phone · orderDate · details · fulfillment · status · (blank) · revenue`

**Add these 4 NEW columns to the right of `revenue`** (use exact lowercase + underscore spelling — the `col()` lookup is case-insensitive but matches the full header text):

| Position | Header | Type |
|---|---|---|
| 11 | `payment_status` | text — `Paid` / `refunded` (blank for pre-payment rows) |
| 12 | `square_payment_id` | text — Square's payment ID (for refund reconciliation) |
| 13 | `receipt_url` | URL — Square's customer-facing receipt |
| 14 | `payment_completed_at` | ISO timestamp |

### Why manual add and not code self-heal

The handler reads positions dynamically via `col(headerName)` — it doesn't care WHERE the new columns sit, only that they exist with the right names. But the code intentionally does NOT add missing columns automatically because:

1. **You have implicit conventions in the existing schema** (e.g., the blank column 9 — I don't know if that's a spacer or a deprecated field; auto-creating columns next to it could break things you do manually).
2. **Auto-create would re-fire on every webhook** unless gated by a "did I already check?" flag, which adds complexity.
3. **Manual add is 30 seconds** (right-click column 11 → Insert 4 columns → name them).

If you'd rather have the code self-heal anyway (e.g., for a future fresh-start sheet), say the word and I'll add a one-time `ensureHeaders()` helper that runs lazily on first webhook.

### Where ghost-order metadata lands without a `source` column

Your schema has no `source` column. For ghost orders, the source tag is embedded in `details` as:

> `⚠️ GHOST ORDER — Square Direct (manual reconcile). Ref: SQUARE-abc12345`

Same info, no schema change. If you'd rather have a dedicated `source` column added (column 15), tell me — it's a 1-line code change.

---

## 4) WRANGLER COMMANDS — set the 3 env vars (unchanged)

```bash
wrangler secret put SQUARE_WEBHOOK_SIGNATURE_KEY
# → paste the Signature Key from Square Dashboard → Developer → Apps → Webhooks → subscription → Signature Key

wrangler secret put SQUARE_WEBHOOK_NOTIFICATION_URL
# → paste: https://trouttricks-checkout.stillwaterflies5280.workers.dev/webhook

wrangler secret put APPS_SCRIPT_WEBHOOK_URL
# → paste your existing Apps Script /exec URL (same one the rest of the site uses)
```

Verify after:

```bash
wrangler secret list
```

---

## REVIEW CHECKLIST

Before you green-light deploy:

- [ ] **Orders/Fulfillment** tab exists in the sheet the Apps Script is bound to (confirm tab name is the literal string `Orders/Fulfillment` — slash and all)
- [ ] **4 new columns added manually** at positions 11–14 with exact lowercase/underscore spelling
- [ ] **`writeToMasterCustomers` exists** in your Apps Script project. If it's not in your script library, the call will fail. Worth doing `Find` for `function writeToMasterCustomers` in the Apps Script editor before deploy.
- [ ] **`order_number` lookup behavior.** The code falls back to substring-searching `details` for the reference_id because your schema has no dedicated `order_number` column. If your pickup-order handler writes the order number to details (it does, based on what I saw in `pickupCardCheckout`'s `shipping_address` field), this will work. Quick test: open a recent pickup order row and confirm the order number appears somewhere in the `details` column.
- [ ] **Existing `doPost` branches.** Confirm the new `submission_type === 'square_payment_completed'` branch doesn't collide with any current value you've used.
- [ ] **Worker `/webhook` route ordering.** Add the new if-branch BEFORE the catch-all 404, ideally right after the existing `/checkout` branch.
- [ ] **Square dashboard.** Subscription URL exactly matches `SQUARE_WEBHOOK_NOTIFICATION_URL`. Event types include `payment.updated`. Signature key copied into the wrangler secret.

---

## DEPLOY SEQUENCE

1. **Add the 4 column headers** to `Orders/Fulfillment` manually.
2. `wrangler secret put` × 3.
3. Paste the Worker code into your local Worker repo. Save.
4. `wrangler deploy`.
5. Open the Apps Script editor → paste the new branch + helpers → Save.
6. Apps Script: **Manage Deployments → existing web-app deployment → Pencil icon → New Version → Deploy → "Update"**. Don't create a new deployment — the `/exec` URL must stay the same since it's baked into the Worker env var.
7. Register the webhook subscription in Square Dashboard with the URL from §4.
8. Square Dashboard → your subscription → **Send Test Event** → check Cloudflare Live Tail + Apps Script Executions log. Test events will exercise the ghost-order branch since the test reference_id won't match anything.
9. Real $1 test order via the site → watch the existing-row-match path flip the existing row.

Standing by.
