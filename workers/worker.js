// Trout Tricks — Square Hosted Checkout Worker
// POST { items, shipping_cost, fulfillment_type, promo_code, discount_amount, order_number? } -> { checkout_url, order_id }
// POST /webhook -> Square payment.updated webhook receiver -> forwards to Apps Script
//
// order_number (optional): cart-side TT-XXXXX identifier. Forwarded to Square
// as order.reference_id at checkout creation. Square does NOT echo this on
// payment.updated webhooks (payment.reference_id stays null), so the webhook
// handler re-fetches the order and pulls order.reference_id from there. Apps
// Script then matches the originating Sheets row deterministically (#58).
//
// This file is a LOCAL MIRROR of the deployed Cloudflare Worker (trouttricks-checkout).
// Live source-of-truth still lives in Cloudflare's editor; this mirror tracks it for git history.
// Deploy by copy-pasting back into the editor and saving.

const SQUARE_API = "https://connect.squareup.com/v2/online-checkout/payment-links";
const SQUARE_LOCATION = "L2Q4AVBV1CP9V";
const SQUARE_VERSION = "2024-12-18";
const REDIRECT_URL = "https://www.trouttricks.com/thank-you.html";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
    if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

    const url = new URL(request.url);
    if (url.pathname === "/webhook") {
      return handleSquareWebhook(request, env, ctx);
    }
    return handleCheckout(request, env);
  },
};

async function handleCheckout(request, env) {
  let payload;
  try { payload = await request.json(); }
  catch (e) { return jsonResponse({ error: "Invalid JSON" }, 400); }

  const items = Array.isArray(payload.items) ? payload.items : [];
  const shippingCost = Number(payload.shipping_cost) || 0;
  const fulfillmentType = payload.fulfillment_type === "pickup" ? "pickup" : "ship";
  const promoCode = payload.promo_code ? String(payload.promo_code).slice(0, 50) : null;
  const discountAmount = Number(payload.discount_amount) || 0;
  const orderNumber = payload.order_number ? String(payload.order_number).slice(0, 40) : null;

  // Customer info forwarded from the cart for pickup orders. Used to
  // pre-populate Square's checkout fields so customers don't re-enter (#61).
  const customerEmail = payload.customer_email ? String(payload.customer_email).slice(0, 255).trim() : null;
  const customerPhoneRaw = payload.customer_phone ? String(payload.customer_phone).slice(0, 30).trim() : null;
  // Square requires E.164 format (+CCNNN...) for buyer_phone_number.
  let customerPhone = null;
  if (customerPhoneRaw) {
    const digits = customerPhoneRaw.replace(/\D/g, "");
    if (digits.length === 10) customerPhone = "+1" + digits;
    else if (digits.length === 11 && digits.startsWith("1")) customerPhone = "+" + digits;
    else if (customerPhoneRaw.startsWith("+")) customerPhone = "+" + digits;
  }

  if (items.length === 0) return jsonResponse({ error: "No items in cart" }, 400);

  const lineItems = items.map((it) => {
    const li = {
      name: String(it.name || "Fly Pattern"),
      quantity: String(it.quantity || 1),
      base_price_money: { amount: Math.round(Number(it.price || 0) * 100), currency: "USD" }
    };
    if (it.note) li.note = String(it.note).slice(0, 500);
    return li;
  });

  if (shippingCost > 0) {
    lineItems.push({
      name: "Shipping",
      quantity: "1",
      base_price_money: { amount: Math.round(shippingCost * 100), currency: "USD" },
    });
  }

  // Build order — conditionally add the discount only if both fields are valid
  const orderObj = {
    location_id: SQUARE_LOCATION,
    line_items: lineItems
  };

  // Attach cart-side order number as Square reference_id so the payment.updated
  // webhook handler can pull it off the order and match the originating Sheets
  // row deterministically (#58). Omit entirely when missing to keep backward
  // compat with any non-cart callers of this endpoint.
  if (orderNumber) orderObj.reference_id = orderNumber;

  if (promoCode && discountAmount > 0) {
    orderObj.discounts = [{
      uid: "promo-discount",
      name: promoCode,
      amount_money: {
        amount: Math.round(discountAmount * 100),
        currency: "USD"
      },
      scope: "ORDER"
    }];
  }

  const idempotencyKey = crypto.randomUUID();
  let squareData;
  try {
    const squareResp = await fetch(SQUARE_API, {
      method: "POST",
      headers: {
        "Square-Version": SQUARE_VERSION,
        "Authorization": `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idempotency_key: idempotencyKey,
        order: orderObj,
        checkout_options: {
          redirect_url: REDIRECT_URL,
          ask_for_shipping_address: fulfillmentType === "ship",
        },
        // Pre-populate buyer email + phone on Square's checkout page if the
        // cart forwarded them (pickup orders, #61). First/last name skipped —
        // Square's pre_populated_data doesn't reliably honor those fields.
        ...(customerEmail || customerPhone ? {
          pre_populated_data: {
            ...(customerEmail ? { buyer_email: customerEmail } : {}),
            ...(customerPhone ? { buyer_phone_number: customerPhone } : {}),
          }
        } : {}),
      }),
    });
    squareData = await squareResp.json();
    if (!squareResp.ok || !squareData.payment_link) {
      return jsonResponse({ error: "Square API error", details: squareData.errors || squareData }, 500);
    }
  } catch (err) {
    return jsonResponse({ error: "Worker fetch failed", message: String(err) }, 500);
  }

  return jsonResponse({
    checkout_url: squareData.payment_link.url,
    order_id: squareData.payment_link.order_id,
  });
}

async function handleSquareWebhook(request, env, ctx) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("x-square-hmacsha256-signature");

  if (!signatureHeader) {
    return jsonResponse({ error: "Missing signature header" }, 400);
  }

  const stringToSign = env.SQUARE_WEBHOOK_NOTIFICATION_URL + rawBody;
  const valid = await verifySquareSignature(stringToSign, signatureHeader, env.SQUARE_WEBHOOK_SIGNATURE_KEY);
  if (!valid) {
    return jsonResponse({ error: "Invalid signature" }, 401);
  }

  let event;
  try { event = JSON.parse(rawBody); }
  catch (e) { return jsonResponse({ error: "Invalid JSON" }, 400); }

  const payment = event && event.data && event.data.object && event.data.object.payment;
  if (event.type !== "payment.updated" || !payment || payment.status !== "COMPLETED") {
    return jsonResponse({ status: "Ignored" }, 200);
  }

  const amountMoney = payment.amount_money || {};
  const normalized = {
    submission_type: "square_payment_completed",
    event_id: event.event_id || null,
    payment_id: payment.id || null,
    reference_id: payment.reference_id || null,
    amount_cents: typeof amountMoney.amount === "number" ? amountMoney.amount : null,
    currency: amountMoney.currency || null,
    receipt_url: payment.receipt_url || null,
    customer_email: (payment.buyer_email_address) || null,
    completed_at: payment.updated_at || payment.created_at || null,
    fulfillment_type: null,
    order_items: null,
    customer_name: null,
    customer_phone: null,
    address_line1: null,
    city: null,
    state: null,
    zip: null,
  };

  // Square attaches buyer-collected shipping info to the ORDER, not the payment.
  // Fetch the order and pull recipient + address from its SHIPMENT fulfillment.
  if (payment.order_id) {
    try {
      const orderResp = await fetch(`https://connect.squareup.com/v2/orders/${payment.order_id}`, {
        method: "GET",
        headers: {
          "Square-Version": SQUARE_VERSION,
          "Authorization": `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
        },
      });
      if (orderResp.ok) {
        const orderData = await orderResp.json();

        // Fallback: Square's Payment object and Order object have SEPARATE
        // reference_id fields. We set it on the Order at checkout creation,
        // but payment.reference_id arrives null on the webhook. Pull from the
        // order here so matched-row update can fire (#58).
        if (!normalized.reference_id && orderData.order && orderData.order.reference_id) {
          normalized.reference_id = orderData.order.reference_id;
        }

        const fulfillments = (orderData.order && orderData.order.fulfillments) || [];
        const shipment = fulfillments.find((f) => f.type === "SHIPMENT");
        const pickup = fulfillments.find((f) => f.type === "PICKUP");

        if (shipment) {
          normalized.fulfillment_type = "ship";
          const recipient = shipment.shipment_details && shipment.shipment_details.recipient;
          const addr = recipient && recipient.address;
          if (recipient) {
            normalized.customer_name = recipient.display_name || null;
            normalized.customer_phone = recipient.phone_number || null;
            if (!normalized.customer_email && recipient.email_address) {
              normalized.customer_email = recipient.email_address;
            }
          }
          if (addr) {
            normalized.address_line1 = addr.address_line_1 || null;
            normalized.city = addr.locality || null;
            normalized.state = addr.administrative_district_level_1 || null;
            normalized.zip = addr.postal_code || null;
          }
        } else if (pickup) {
          normalized.fulfillment_type = "pickup";
          const recipient = pickup.pickup_details && pickup.pickup_details.recipient;
          if (recipient) {
            normalized.customer_name = recipient.display_name || null;
            normalized.customer_phone = recipient.phone_number || null;
            if (!normalized.customer_email && recipient.email_address) {
              normalized.customer_email = recipient.email_address;
            }
          }
          // No address — Square doesn't collect a shipping address for pickup orders.
        }

        // Format line items so Apps Script can populate the Details column on
        // ghost rows. Skip the "Shipping" pseudo-item that handleCheckout adds
        // for ship orders — it's not a fly to tie.
        const orderLineItems = (orderData.order && orderData.order.line_items) || [];
        const itemLines = orderLineItems
          .filter((li) => li.name !== "Shipping")
          .map((li) => {
            let s = (li.quantity || "1") + "x " + (li.name || "Item");
            if (li.note) s += " (" + li.note + ")";
            return s;
          });
        if (itemLines.length > 0) {
          normalized.order_items = itemLines.join("\n");
        }
      }
    } catch (_err) {
      // Order fetch failure shouldn't block payment-completion forwarding to Apps Script.
    }
  }

  ctx.waitUntil(
    fetch(env.APPS_SCRIPT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalized),
    })
  );

  return jsonResponse({ status: "ok" }, 200);
}

async function verifySquareSignature(stringToSign, signatureHeader, signingKey) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(signingKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(stringToSign));
  const bytes = new Uint8Array(sigBuf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const computed = btoa(bin);
  return timingSafeEqual(computed, signatureHeader);
}

function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}