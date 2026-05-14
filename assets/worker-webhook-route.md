# Square → Worker `/webhook` → Apps Script — drop-in route

Closes the loop on task **#17** ("Phase 3 Square post-payment webhook → Apps Script auto-flip status"). Square posts a webhook when a payment completes. The Worker verifies the signature, normalizes the payload, and forwards to Apps Script. Apps Script flips the order row from `square_pending` → `paid`.

---

## The Worker route (drop into your existing Worker at `trouttricks-checkout.stillwaterflies5280.workers.dev`)

This is the modern ES-module style. If your existing Worker still uses the `addEventListener('fetch', …)` pattern, you can either keep the same style (everything in this code translates directly) or migrate the whole file to modules in one go.

```javascript
// trouttricks-checkout Worker — adds /webhook route alongside the existing /checkout route.
//
// Square sends POST /webhook on payment.updated. We:
//   1. Verify Square's HMAC-SHA256 signature against the raw request body.
//   2. Filter for payment.updated events with status COMPLETED.
//   3. Forward a normalized payload to the Apps Script /exec endpoint.
//   4. Return 200 fast so Square doesn't retry — actual sheet update is async via ctx.waitUntil.

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Existing checkout route stays untouched
    if (url.pathname === '/checkout' && request.method === 'POST') {
      return handleCheckout(request, env);
    }

    // NEW: Square webhook receiver
    if (url.pathname === '/webhook' && request.method === 'POST') {
      return handleSquareWebhook(request, env, ctx);
    }

    return new Response('Not found', { status: 404 });
  },
};

async function handleSquareWebhook(request, env, ctx) {
  // Read raw body once — we need it for signature verification AND for JSON parse.
  // request.text() consumes the body so we can't call it twice.
  const rawBody = await request.text();

  // Verify signature. Square signs the concatenation of (notification URL) + (raw body).
  // The notification URL is whatever you configured in Square Dashboard — must match exactly.
  const signature = request.headers.get('x-square-hmacsha256-signature');
  const notificationUrl = env.SQUARE_WEBHOOK_NOTIFICATION_URL; // e.g. https://trouttricks-checkout.stillwaterflies5280.workers.dev/webhook

  if (!signature || !notificationUrl) {
    return new Response('Missing signature or notification URL config', { status: 400 });
  }

  const valid = await verifySquareSignature(
    notificationUrl + rawBody,
    signature,
    env.SQUARE_WEBHOOK_SIGNATURE_KEY
  );

  if (!valid) {
    console.warn('[webhook] Invalid Square signature');
    return new Response('Invalid signature', { status: 401 });
  }

  // Parse the event
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (e) {
    return new Response('Bad JSON', { status: 400 });
  }

  // Filter — only act on completed payments
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

  // Build normalized payload for Apps Script.
  // reference_id is the order_number that index.html generates and passes into
  // the Square checkout link — that's how Apps Script will find the row to flip.
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

  // Forward to Apps Script. NO Content-Type header — Apps Script's doPost can't handle
  // the CORS preflight from application/json. Sticking with the "simple request" pattern
  // the rest of the site uses.
  // Fire-and-forget via ctx.waitUntil so we return 200 to Square in <1s even if
  // Apps Script is cold-starting (which can take 2-5s).
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
  // Square uses base64-encoded signatures
  const computed = btoa(String.fromCharCode(...new Uint8Array(sig)));
  // Constant-time compare to mitigate timing-attack risk (paranoid but cheap)
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

// === stub for the existing checkout handler — keep your real implementation ===
async function handleCheckout(request, env) {
  // ... your existing /checkout implementation stays here unchanged ...
  return new Response('checkout', { status: 200 });
}
```

---

## Environment variables to set in Cloudflare Workers dashboard

Settings → Variables → **Add variable** (mark all three as **encrypted**):

| Variable | Value | Where to find |
|---|---|---|
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | Square's webhook signing key | Square Dashboard → Developer → Apps → your app → Webhooks → Signature Key |
| `SQUARE_WEBHOOK_NOTIFICATION_URL` | The exact URL you'll register in Square | `https://trouttricks-checkout.stillwaterflies5280.workers.dev/webhook` |
| `APPS_SCRIPT_WEBHOOK_URL` | The Apps Script `/exec` URL | Same one used elsewhere on the site (e.g. in `pickupCardCheckout`) — already in your records |

**Important:** the `SQUARE_WEBHOOK_NOTIFICATION_URL` value must match what you register in Square **exactly** — protocol, host, path, no trailing slash. If they differ, every signature verification fails silently.

---

## Square dashboard setup

1. **Square Dashboard → Developer → Apps → [your Trout Tricks app] → Webhooks → Add Subscription**
2. **Notification URL:** `https://trouttricks-checkout.stillwaterflies5280.workers.dev/webhook`
3. **Event types to subscribe to** (minimum):
   - ✅ `payment.updated` — the event the Worker handles
   - ✅ `payment.created` — useful for logging even if Worker only acts on `updated`
   - Optional: `refund.updated` (future-proofing for refund handling)
4. **API Version:** stick with whatever your existing Worker uses for the `/checkout` endpoint to keep payloads consistent.
5. **Save**, then copy the **Signature Key** that Square generates → paste into Cloudflare as `SQUARE_WEBHOOK_SIGNATURE_KEY`.

---

## Apps Script side — what to add to the handler

When the Worker forwards the normalized payload, your existing Apps Script `doPost` needs a new branch for `submission_type === 'square_payment_completed'`. Sketch:

```javascript
function doPost(e) {
  const data = JSON.parse(e.postData.contents || '{}');

  // ... existing branches (sticker campaign, drop waitlist, pickup order, etc.) ...

  if (data.submission_type === 'square_payment_completed') {
    return handleSquarePaymentCompleted(data);
  }

  return ContentService.createTextOutput('OK');
}

function handleSquarePaymentCompleted(data) {
  // Find the row in Master sheet by reference_id (= order_number from index.html)
  const ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
  const sheet = ss.getSheetByName('Master Customers');
  if (!sheet) return ContentService.createTextOutput('Sheet not found');

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return ContentService.createTextOutput('Empty');

  // Header row gives us column indexes
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  function col(name) { return headers.findIndex(h => String(h).toLowerCase() === name.toLowerCase()) + 1; }

  const ORDER_NUM_COL = col('order_number');
  const STATUS_COL    = col('payment_status');
  const PAYMENT_ID_COL = col('square_payment_id');
  const RECEIPT_COL    = col('receipt_url');
  const COMPLETED_COL  = col('payment_completed_at');

  // Search for the row matching reference_id
  const range = sheet.getRange(2, ORDER_NUM_COL, lastRow - 1, 1).getValues();
  for (let i = 0; i < range.length; i++) {
    if (String(range[i][0]).trim() === String(data.reference_id).trim()) {
      const rowNum = i + 2;
      // Flip status + log the metadata
      if (STATUS_COL)    sheet.getRange(rowNum, STATUS_COL).setValue('paid');
      if (PAYMENT_ID_COL) sheet.getRange(rowNum, PAYMENT_ID_COL).setValue(data.payment_id);
      if (RECEIPT_COL)    sheet.getRange(rowNum, RECEIPT_COL).setValue(data.receipt_url);
      if (COMPLETED_COL)  sheet.getRange(rowNum, COMPLETED_COL).setValue(data.completed_at);

      // Optional: email Thomas a "💰 Payment received" notification
      MailApp.sendEmail({
        to: 'thomas@trouttricks.com',
        subject: '💰 Square payment received — order ' + data.reference_id,
        body: 'Order: ' + data.reference_id + '\n' +
              'Amount: $' + (data.amount_cents / 100).toFixed(2) + ' ' + data.currency + '\n' +
              'Receipt: ' + (data.receipt_url || 'n/a') + '\n' +
              'Customer email: ' + (data.customer_email || 'n/a'),
      });

      return ContentService.createTextOutput('Updated row ' + rowNum);
    }
  }

  // No matching row — could be a manual Square sale not from the site. Log it.
  Logger.log('[square webhook] no row matched reference_id ' + data.reference_id);
  return ContentService.createTextOutput('No matching row');
}
```

**Master sheet schema additions** (add these columns to "Master Customers" if not already present):
- `payment_status` — pending / paid / refunded
- `square_payment_id` — Square's payment ID (useful for refund reconciliation)
- `receipt_url` — customer-facing receipt URL from Square
- `payment_completed_at` — ISO timestamp

---

## Testing the wiring (before relying on real customers)

1. **Square Dashboard → Webhooks → your subscription → "Send Test Event"** — sends a fake `payment.updated` to your Worker.
2. **Cloudflare Workers → your Worker → Logs (Live Tail)** — open this in another tab. You should see the request hit, signature validate, and the Apps Script forward fire.
3. **Apps Script → Executions log** — confirm the new branch ran and updated the sheet row (or logged "no matching row" for the test event since its `reference_id` won't match anything).
4. **Real-world dry run:** place a $1 test order via your live site → Square checkout → pay → watch the Worker logs + sheet flip in real time.

---

## Failure modes to plan for

- **Signature verification fails** → Worker returns 401. Square will retry the webhook up to ~3 times over 72 hrs. If it keeps failing, the signature key is wrong OR `SQUARE_WEBHOOK_NOTIFICATION_URL` doesn't match what Square thinks it's calling.
- **Apps Script is slow / down** → the Worker returns 200 to Square anyway (the `ctx.waitUntil` is fire-and-forget). The sheet just doesn't update until the next manual reconciliation. Won't cause Square retry storms.
- **Reference_id missing** → falls through to the "no matching row" branch and gets logged. Probably means the Square checkout was created without `referenceId` set — check your `/checkout` handler is passing it.
- **Idempotency** — Square may deliver the same event twice. If you want strict once-only processing, store seen `event_id`s in a Workers KV namespace and short-circuit duplicates. Not critical for this volume but worth adding later.

---

## Deploy

```bash
# from your Worker repo (separate from trouttricks-website)
wrangler deploy
```

Then test via the Square dashboard's "Send Test Event" button before flipping `ENABLE_DROP_APPSSCRIPT` or relying on it for real orders.
