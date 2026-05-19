const ORDERS_SHEET  = 'Orders/Fulfillment';
const CONTACT_SHEET = 'Contact Submissions';
const STICKER_SHEET = 'Sticker Campaign';
const STICKER_WAITLIST_SHEET = 'Sticker Waitlist';
const MASTER_CUSTOMERS_SHEET = 'Master Customers';
const DROP_WAITLIST_SHEET = 'Drop Waitlist';
const STICKER_MAX   = 15;

// Orders/Fulfillment column positions (1-indexed for getRange)
const COL_EMAIL = 1;
const COL_PHONE = 4;
const COL_DETAILS = 6;
const COL_STATUS = 8;
const COL_NOTES = 9;
const COL_ACQUISITION_SOURCE = 11;
const COL_STREET = 12;
const COL_CITY = 13;
const COL_STATE = 14;
const COL_ZIP = 15;

function doPost(e) {

  try {
    const body = JSON.parse(e.postData.contents);
    logWebhook(e, body, 'incoming');

    // Honeypot filter — bots fill hidden fields, real users don't
    if (body.website && String(body.website).trim() !== '') {
      return ContentService
        .createTextOutput(JSON.stringify({ success: true, filtered: 'honeypot' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // === Square webhook routing (Cloudflare Worker forwards flat payload here) ===
    // Detected by explicit submission_type OR presence of Square-specific fields.
    if (body.submission_type === 'square_payment_completed' ||
        body.payment_id || body.event_id) {
      return handleSquarePaymentCompleted(body);
    }

    // Form submission routing
    if (body.submission_type === 'contact_form')     return handleContactForm(body);
    if (body.submission_type === 'sticker_campaign') return handleStickerCampaign(body);
    if (body.submission_type === 'sticker_waitlist') return handleStickerWaitlist(body);
    if (body.submission_type === 'drop_waitlist')    return handleDropWaitlist(body);

    // Default — order webhook from main site
    return handleOrder(body);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleContactForm(body) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONTACT_SHEET);

  if (!sheet) {
    sheet = ss.insertSheet(CONTACT_SHEET);
    sheet.appendRow([
      'Timestamp', 'First Name', 'Last Name', 'Email',
      'Phone', 'Reason', 'Message', 'Newsletter Opt-in'
    ]);
    sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  const timestamp = Utilities.formatDate(
    new Date(), 'America/Denver', 'yyyy-MM-dd HH:mm:ss'
  );

  sheet.appendRow([
    timestamp,
    body.customer_first_name || body.first_name || '',
    body.customer_last_name || body.last_name || '',
    body.customer_email || body.email || '',
    body.customer_phone || body.phone || '',
    body.contact_reason || body.reason || '',
    body.contact_message || body.message || '',
    (body.newsletter_optin === 'Yes' || body.newsletter_opt_in === true) ? 'YES' : 'no'
  ]);

  writeToMasterCustomers(body, 'Contact');

  return ContentService
    .createTextOutput(JSON.stringify({ success: true, type: 'contact_form' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleStickerCampaign(body) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(STICKER_SHEET);

  if (!sheet) {
    sheet = ss.insertSheet(STICKER_SHEET);
    sheet.appendRow([
      'Timestamp', 'First Name', 'Last Name', 'Email', 'Phone',
      'Address Line 1', 'Address Line 2', 'City', 'State', 'Zip',
      'Shipped Date', 'Tracking', 'UGC Posted?', 'Notes'
    ]);
    sheet.getRange(1, 1, 1, 14).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  const timestamp = Utilities.formatDate(
    new Date(), 'America/Denver', 'yyyy-MM-dd HH:mm:ss'
  );

  sheet.appendRow([
    timestamp,
    body.customer_first_name || body.first_name || '',
    body.customer_last_name || body.last_name || '',
    body.customer_email || body.email || '',
    body.customer_phone || body.phone || '',
    body.address_line1 || '',
    body.address_line2 || '',
    body.city || '',
    body.state || '',
    body.zip || '',
    '',
    '',
    '',
    ''
  ]);

  writeToMasterCustomers(body, 'Sticker Campaign');

  return ContentService
    .createTextOutput(JSON.stringify({ success: true, type: 'sticker_campaign' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleStickerWaitlist(body) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(STICKER_WAITLIST_SHEET);

  if (!sheet) {
    sheet = ss.insertSheet(STICKER_WAITLIST_SHEET);
    sheet.appendRow([
      'Timestamp', 'First Name', 'Email',
      'Acquisition Source', 'Round 2 Notified?', 'Notes'
    ]);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  const timestamp = Utilities.formatDate(
    new Date(), 'America/Denver', 'yyyy-MM-dd HH:mm:ss'
  );

  sheet.appendRow([
    timestamp,
    body.customer_first_name || body.first_name || '',
    body.customer_email || body.email || '',
    body.acquisition_source || 'sticker_waitlist_round1',
    '',
    ''
  ]);

  writeToMasterCustomers(body, 'Sticker Waitlist');

  return ContentService
    .createTextOutput(JSON.stringify({ success: true, type: 'sticker_waitlist' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleDropWaitlist(body) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(DROP_WAITLIST_SHEET);

  if (!sheet) {
    sheet = ss.insertSheet(DROP_WAITLIST_SHEET);
    sheet.appendRow([
      'Timestamp', 'First Name', 'Email',
      'Source', 'Founding Interest', 'Notes'
    ]);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  const timestamp = Utilities.formatDate(
    new Date(), 'America/Denver', 'yyyy-MM-dd HH:mm:ss'
  );

  sheet.appendRow([
    timestamp,
    body.customer_first_name || body.first_name || body.name || '',
    body.customer_email || body.email || '',
    body.source || 'the-drop-landing',
    body.founding_interest === true ? 'YES' : 'no',
    body.notes || ''
  ]);

  writeToMasterCustomers(body, 'Drop Waitlist');

  return ContentService
    .createTextOutput(JSON.stringify({ success: true, type: 'drop_waitlist' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleOrder(body) {
  const email = body.customer_email || '';
  const firstName = body.customer_first_name || '';
  const lastName = body.customer_last_name || '';
  const phone = body.customer_phone || '';
  const orderDate = body.order_date || Utilities.formatDate(new Date(), 'America/Denver', 'yyyy-MM-dd HH:mm:ss');
  const items = body.order_items || '';
  const orderNum = body.order_number || '';
  const promo = (body.promo_code && body.promo_code !== 'none') ? body.promo_code : '';
  const discount = Number(body.discount_amount) || 0;
  const total = Number(body.order_total) || 0;
  const shipAddr = body.shipping_address || '';
  const fulfillRaw = (body.fulfillment || 'pickup').toLowerCase();
  const fulfillment = fulfillRaw === 'pickup' ? 'Local pickup' :
                      fulfillRaw === 'ship' ? 'Ship' :
                      body.fulfillment;
  const status = 'Ordered';

  let details = '';
  if (orderNum) details += orderNum + '\n';
  details += items;
  if (fulfillRaw === 'ship' && shipAddr) details += '\n\nShip to:\n' + shipAddr;
  details += '\n\nFulfillment: ' + fulfillment.toUpperCase();
  if (promo) details += '\nPromo ' + promo + ': -$' + discount.toFixed(2);
  details += '\nTOTAL: $' + total.toFixed(2);

  const revenue = '$' + total.toFixed(2);

  // Structured address — backwards compatible with old single-string shipping_address
  const street = body.address_line1 || body.street || '';
  const city = body.city || '';
  const state = body.state || '';
  const zip = body.zip || body.postal_code || '';

  const acquisitionSource = body.acquisition_source || body.referrer || '';

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ORDERS_SHEET);
  if (!sheet) throw new Error('Sheet not found: ' + ORDERS_SHEET);

  sheet.appendRow([
    email, firstName, lastName, phone,
    orderDate, details, fulfillment,
    status, '', revenue,
    acquisitionSource,
    street, city, state, zip
  ]);

  writeToMasterCustomers(body, 'Order');

  return ContentService
    .createTextOutput(JSON.stringify({ success: true, order: orderNum, status: status }))
    .setMimeType(ContentService.MimeType.JSON);
}

// === SQUARE PAYMENT WEBHOOK HANDLER ===
// Receives flat payload forwarded from Cloudflare Worker after signature verification.
// Pickup orders: matches an 'Ordered' row by reference_id and fills missing
//   customer + shipping fields (status stays 'Ordered'; daily reconciliation
//   distinguishes paid from abandoned later — see #55).
// Ship orders: appends a ghost row (status 'Ordered', notes '(ghost)').
// #57:  writes Square-collected phone (col D) and shipping address (cols L-O).
// #57b: guards on payment_id instead of reference_id — ship orders have null
//       reference_id, but always have a payment_id.
// #60:  status taxonomy collapsed to 'Ordered' for both paths; payment_id
//       dedup on both ghost AND matched-row paths (Square fires
//       payment.updated 5-7 times per payment — first fire wins on both paths).
function handleSquarePaymentCompleted(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(ORDERS_SHEET);
  if (!sheet) {
    Logger.log('[square] Tab not found: ' + ORDERS_SHEET);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'sheet_not_found' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Real payments always carry a payment_id. Square "Send Test Event" payloads
  // do not. Guarding on payment_id (instead of reference_id) lets real ship
  // orders through — they have null reference_id but a real payment_id.
  if (!data || !data.payment_id) {
    Logger.log('[square] No payment_id (likely test event) — skipping. event_id=' +
               (data && data.event_id));
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, skipped: 'no_payment_id' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Orders/Fulfillment columns: A=Email, B=First, C=Last, D=Phone, E=OrderDate,
  //                             F=Details, G=Fulfillment, H=Status, I=Notes/Tracking, J=Revenue,
  //                             K=Acquisition Source, L=Street, M=City, N=State, O=Zip

  // Read the details column once — used for both reference_id matching
  // (pickup orders) and payment_id dedup (ghost-path ship orders, #60).
  const lastRow = sheet.getLastRow();
  const details = lastRow >= 2 ?
    sheet.getRange(2, COL_DETAILS, lastRow - 1, 1).getValues() : [];

  // Try to match an existing order by reference_id. Only runs when
  // reference_id is present (typically pickup orders that went through
  // the cart). Ship orders have null reference_id and fall through.
  let matchedRow = -1;
  if (data.reference_id) {
    const needle = String(data.reference_id).trim();
    for (let i = 0; i < details.length; i++) {
      const cellText = String(details[i][0] || '');
      if (cellText.indexOf(needle) !== -1) {
        matchedRow = i + 2;
        break;
      }
    }
  }

  if (matchedRow > 0) {
    // Existing order — fill missing customer fields, then append payment info.
    // Status stays 'Ordered' (set by handleOrder pre-payment); daily
    // reconciliation distinguishes paid from abandoned later (#55).

    // Read details once — used for both dedup check AND the payment-info append below.
    const existingDetails = String(sheet.getRange(matchedRow, COL_DETAILS).getValue() || '');

    // Dedup (#60): Square fires payment.updated 5-7 times per payment.
    // First fire wins — if this payment_id is already in the matched row's
    // details, skip the entire update (no re-append, no Master Customers dupe).
    if (existingDetails.indexOf(String(data.payment_id)) !== -1) {
      Logger.log('[square] Duplicate matched-row update suppressed — payment_id=' +
                 data.payment_id + ' already at row ' + matchedRow);
      return ContentService
        .createTextOutput(JSON.stringify({
          success: true,
          skipped: 'duplicate_payment_id_matched',
          existing_row: matchedRow
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Fill missing email (col A) and phone (col D) — only if currently blank.
    // Preserves the cart-collected email so Klaviyo identity stays stable.
    const existingEmail = String(sheet.getRange(matchedRow, COL_EMAIL).getValue() || '').trim();
    if (!existingEmail && data.customer_email) {
      sheet.getRange(matchedRow, COL_EMAIL).setValue(data.customer_email);
    }
    const existingPhone = String(sheet.getRange(matchedRow, COL_PHONE).getValue() || '').trim();
    if (!existingPhone && data.customer_phone) {
      sheet.getRange(matchedRow, COL_PHONE).setValue(data.customer_phone);
    }

    // Address (cols L-O): always overwrite when Worker forwarded an address.
    // Square-collected shipping address is the source of truth.
    if (data.address_line1) {
      sheet.getRange(matchedRow, COL_STREET).setValue(data.address_line1);
      sheet.getRange(matchedRow, COL_CITY).setValue(data.city || '');
      sheet.getRange(matchedRow, COL_STATE).setValue(data.state || '');
      sheet.getRange(matchedRow, COL_ZIP).setValue(data.zip || '');
    }

    // Append Square payment info to details
    const paymentNote = '\n\n💰 Square Payment: ' + (data.payment_id || '') +
                        (data.receipt_url ? '\nReceipt: ' + data.receipt_url : '') +
                        '\nCompleted: ' + (data.completed_at || new Date().toISOString());
    sheet.getRange(matchedRow, COL_DETAILS).setValue(existingDetails + paymentNote);

    const rowData = sheet.getRange(matchedRow, 1, 1, 10).getValues()[0];
    writeToMasterCustomers({
      customer_email: rowData[0],
      customer_first_name: rowData[1],
      order_number: data.reference_id,
      fulfillment: rowData[6],
      order_total: data.amount_cents ? (data.amount_cents / 100).toFixed(2) : ''
    }, 'Order Paid');

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, updated_row: matchedRow }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Ghost order — paid via Square but no matching row in our sheet.
  // For ship orders this is the normal path (no pre-payment row exists).

  // Dedup (#60): Square fires payment.updated 5-7 times per payment in
  // production. First fire wins — if this payment_id is already in the
  // details column, skip the append.
  const paymentIdNeedle = String(data.payment_id);
  for (let i = 0; i < details.length; i++) {
    const cellText = String(details[i][0] || '');
    if (cellText.indexOf(paymentIdNeedle) !== -1) {
      Logger.log('[square] Duplicate ghost suppressed — payment_id=' +
                 paymentIdNeedle + ' already at row ' + (i + 2));
      return ContentService
        .createTextOutput(JSON.stringify({
          success: true,
          skipped: 'duplicate_payment_id',
          existing_row: i + 2
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  const refLabel = data.reference_id || ('Payment ' + data.payment_id);
  const revenue = data.amount_cents ? '$' + (data.amount_cents / 100).toFixed(2) : '';
  const ghostDetails = refLabel + '\n' +
    '⚠️ GHOST ORDER — Square Direct (needs manual reconcile)\n' +
    'Payment ID: ' + (data.payment_id || '') + '\n' +
    (data.receipt_url ? 'Receipt: ' + data.receipt_url + '\n' : '') +
    'Completed: ' + (data.completed_at || new Date().toISOString());

  sheet.appendRow([
    data.customer_email || '',           // A: Email
    '',                                   // B: First Name
    '',                                   // C: Last Name
    data.customer_phone || '',            // D: Phone
    new Date(),                           // E: Order Date
    ghostDetails,                         // F: Details
    '',                                   // G: Fulfillment
    'Ordered',                            // H: Status
    '(ghost)',                            // I: Notes/Tracking
    revenue,                              // J: Revenue
    '',                                   // K: Acquisition Source (Square doesn't carry it)
    data.address_line1 || '',             // L: Street
    data.city || '',                      // M: City
    data.state || '',                     // N: State
    data.zip || ''                        // O: Zip
  ]);

  const newRowNum = sheet.getLastRow();

  writeToMasterCustomers({
    customer_email: data.customer_email || '',
    customer_first_name: '',
    order_number: data.reference_id || data.payment_id || '',
    order_total: data.amount_cents ? (data.amount_cents / 100).toFixed(2) : ''
  }, 'Order Paid (Ghost)');

  return ContentService
    .createTextOutput(JSON.stringify({ success: true, ghost_row: newRowNum }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Run this from the editor to test handleSquarePaymentCompleted without webhook traffic
function testHandleSquarePaymentCompleted_real() {
  const samplePayload = {
    submission_type: 'square_payment_completed',
    event_id: 'TEST-EVT-' + Date.now(),
    payment_id: 'TEST-PAY-' + Date.now(),
    reference_id: null,
    amount_cents: 650,
    currency: 'USD',
    receipt_url: 'https://squareup.com/receipt/preview/TEST',
    customer_email: 'test@trouttricks.com',
    completed_at: new Date().toISOString(),
    customer_name: 'Test Customer',
    customer_phone: '+13035551234',
    address_line1: '123 Test St',
    city: 'Denver',
    state: 'CO',
    zip: '80202'
  };

  try {
    const result = handleSquarePaymentCompleted(samplePayload);
    Logger.log('✅ SUCCESS: ' + result.getContent());
  } catch (err) {
    Logger.log('❌ ERROR: ' + err.toString());
    Logger.log('📍 STACK:\n' + (err.stack || 'no stack'));
  }
}

function writeToMasterCustomers(body, source) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(MASTER_CUSTOMERS_SHEET);
    if (!sheet) {
      sheet = ss.insertSheet(MASTER_CUSTOMERS_SHEET);
      sheet.appendRow(['Timestamp', 'First Name', 'Email', 'Source', 'Notes', 'Acquisition Source']);
      sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    const firstName = body.customer_first_name || body.first_name || body.name || '';
    const email = body.customer_email || body.email || '';

    let notes = '';
    if (source === 'Order' || source === 'Order Paid' || source === 'Order Paid (Ghost)') {
      notes = 'Order #' + (body.order_number || '?') +
              (body.fulfillment ? ' · ' + body.fulfillment : '') +
              (body.order_total ? ' · $' + body.order_total : '');
      if (source === 'Order Paid')        notes += ' · paid';
      if (source === 'Order Paid (Ghost)') notes += ' · paid (ghost)';
    } else if (source === 'Contact') {
      notes = (body.contact_reason || body.reason || 'general') +
              (body.newsletter_optin === 'Yes' ? ' · newsletter opt-in' : '');
    } else if (source === 'Sticker Campaign') {
      notes = 'Shipped to ' + (body.city || '?') + ', ' + (body.state || '?');
    } else if (source === 'Sticker Waitlist') {
      notes = (body.acquisition_source || 'round1') + ' waitlist signup';
    } else if (source === 'Drop Waitlist') {
      notes = body.founding_interest === true ?
        'The Drop waitlist · founding interest' :
        'The Drop waitlist signup';
    }

    const timestamp = Utilities.formatDate(
      new Date(), 'America/Denver', 'yyyy-MM-dd HH:mm:ss'
    );

    const acquisitionSource = body.acquisition_source || body.referrer || '';
    sheet.appendRow([timestamp, firstName, email, source, notes, acquisitionSource]);
  } catch (err) {
    Logger.log('Master Customers write failed: ' + err.toString());
  }
}

function backfillMasterCustomers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let master = ss.getSheetByName(MASTER_CUSTOMERS_SHEET);
  if (!master) {
    master = ss.insertSheet(MASTER_CUSTOMERS_SHEET);
    master.appendRow(['Timestamp', 'First Name', 'Email', 'Source', 'Notes']);
    master.getRange(1, 1, 1, 5).setFontWeight('bold');
    master.setFrozenRows(1);
  } else {
    const lastRow = master.getLastRow();
    if (lastRow > 1) {
      master.deleteRows(2, lastRow - 1);
    }
  }

  const rowsToAdd = [];

  const orders = ss.getSheetByName(ORDERS_SHEET);
  if (orders && orders.getLastRow() > 1) {
    const data = orders.getRange(2, 1, orders.getLastRow() - 1, 10).getValues();
    data.forEach(row => {
      const email = row[0];
      if (!email) return;
      const firstName = row[1] || '';
      const orderDate = row[4] || '';
      const details = String(row[5] || '');
      const fulfillment = row[6] || '';
      const revenue = row[9] || '';

      const orderNum = (details.split('\n')[0] || '?').trim();

      const notes = 'Order ' + orderNum +
                    (fulfillment ? ' · ' + fulfillment : '') +
                    (revenue ? ' · ' + revenue : '');

      rowsToAdd.push([orderDate, firstName, email, 'Order', notes]);
    });
  }

  const contact = ss.getSheetByName(CONTACT_SHEET);
  if (contact && contact.getLastRow() > 1) {
    const data = contact.getRange(2, 1, contact.getLastRow() - 1, 8).getValues();
    data.forEach(row => {
      const timestamp = row[0] || '';
      const firstName = row[1] || '';
      const email = row[3] || '';
      if (!email) return;
      const reason = row[5] || 'general';
      const optin = row[7] || '';

      const notes = reason + (optin === 'YES' ? ' · newsletter opt-in' : '');

      rowsToAdd.push([timestamp, firstName, email, 'Contact', notes]);
    });
  }

  const stickers = ss.getSheetByName(STICKER_SHEET);
  if (stickers && stickers.getLastRow() > 1) {
    const data = stickers.getRange(2, 1, stickers.getLastRow() - 1, 14).getValues();
    data.forEach(row => {
      const timestamp = row[0] || '';
      const firstName = row[1] || '';
      const email = row[3] || '';
      if (!email) return;
      const city = row[7] || '?';
      const state = row[8] || '?';

      const notes = 'Shipped to ' + city + ', ' + state;

      rowsToAdd.push([timestamp, firstName, email, 'Sticker Campaign', notes]);
    });
  }

  const waitlist = ss.getSheetByName(STICKER_WAITLIST_SHEET);
  if (waitlist && waitlist.getLastRow() > 1) {
    const data = waitlist.getRange(2, 1, waitlist.getLastRow() - 1, 6).getValues();
    data.forEach(row => {
      const timestamp = row[0] || '';
      const firstName = row[1] || '';
      const email = row[2] || '';
      if (!email) return;
      const source = row[3] || 'round1';

      const notes = source + ' waitlist signup';

      rowsToAdd.push([timestamp, firstName, email, 'Sticker Waitlist', notes]);
    });
  }

  const dropWaitlist = ss.getSheetByName(DROP_WAITLIST_SHEET);
  if (dropWaitlist && dropWaitlist.getLastRow() > 1) {
    const data = dropWaitlist.getRange(2, 1, dropWaitlist.getLastRow() - 1, 6).getValues();
    data.forEach(row => {
      const timestamp = row[0] || '';
      const firstName = row[1] || '';
      const email = row[2] || '';
      if (!email) return;
      const founding = row[4] || '';

      const notes = founding === 'YES' ?
        'The Drop waitlist · founding interest' :
        'The Drop waitlist signup';

      rowsToAdd.push([timestamp, firstName, email, 'Drop Waitlist', notes]);
    });
  }

  rowsToAdd.sort((a, b) => {
    const ta = new Date(a[0]).getTime();
    const tb = new Date(b[0]).getTime();
    return ta - tb;
  });

  if (rowsToAdd.length > 0) {
    master.getRange(2, 1, rowsToAdd.length, 5).setValues(rowsToAdd);
  }

  Logger.log('Backfilled ' + rowsToAdd.length + ' rows to Master Customers');
  return rowsToAdd.length;
}

function doGet(e) {
  const action = e && e.parameter && e.parameter.action;

  if (action === 'stickerCount') {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(STICKER_SHEET);

    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ count: 0, max: STICKER_MAX, available: STICKER_MAX }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const count = Math.max(0, sheet.getLastRow() - 1);
    const available = Math.max(0, STICKER_MAX - count);

    return ContentService
      .createTextOutput(JSON.stringify({ count: count, max: STICKER_MAX, available: available }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService
    .createTextOutput('Trout Tricks order + contact + sticker + drop_waitlist + square webhook is alive.')
    .setMimeType(ContentService.MimeType.TEXT);
}

// ============================================================
// WEBHOOK LOG — captures every incoming webhook to a sheet tab
// so we can see exactly what arrived without digging through
// Apps Script Executions. Never throws, never blocks doPost.
// ============================================================
function logWebhook(e, parsedBody, note) {
  try {
    var SHEET_ID = '1xWB17PN1YKdUAmPGYmpdQdkg71NsHwyDKV5QgWWNcV8';
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName('Webhook Log');

    // Auto-create the tab on first run
    if (!sheet) {
      sheet = ss.insertSheet('Webhook Log');
      sheet.appendRow([
        'Timestamp', 'Source', 'Event Type',
        'Customer Name', 'Customer Email', 'Order Number',
        'Note', 'Raw Payload'
      ]);
      sheet.getRange(1, 1, 1, 8)
        .setFontWeight('bold')
        .setBackground('#1a1a1a')
        .setFontColor('#ffffff');
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(8, 600);
    }

    var body = parsedBody || {};
    var rawText = (e && e.postData) ? (e.postData.contents || '') : '';
    var eventType = body.type || body.event_type ||
                    (body.data && body.data.type) || 'unknown';
    var source = (body.merchant_id || body.location_id ||
                  body.event_id) ? 'square' : 'cart';
    var customerName = body.customer_name ||
      ((body.customer_first_name || '') + ' ' +
       (body.customer_last_name || '')).trim();
    var customerEmail = body.customer_email || body.client_email || '';
    var orderNumber = body.order_number || '';

    sheet.appendRow([
      new Date(), source, eventType,
      customerName, customerEmail, orderNumber,
      note || '', rawText.substring(0, 5000)
    ]);

  } catch (err) {
    console.error('[logWebhook] failed:', err);
  }
}