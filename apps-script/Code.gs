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
    if (body.submission_type === 'crew_signup')      return handleCrewSignup(body);

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

  const firstName = body.customer_first_name || body.first_name || '';
  const lastName  = body.customer_last_name || body.last_name || '';
  const email     = body.customer_email || body.email || '';
  const phone     = body.customer_phone || body.phone || '';
  const reason    = body.contact_reason || body.reason || '';
  const message   = body.contact_message || body.message || '';
  const optInRaw  = (body.newsletter_optin === 'Yes' || body.newsletter_opt_in === true) ? 'YES' : 'no';

  sheet.appendRow([
    timestamp, firstName, lastName, email, phone, reason, message, optInRaw
  ]);

  writeToMasterCustomers(body, 'Contact');

  // Email Thomas every contact form submission. EmailJS leg from the client
  // (template_7wna2ba) was silently failing — MailApp is the reliable path
  // since it runs on Google infra and we own the recipient address in code.
  try {
    MailApp.sendEmail({
      to: 'thomas@trouttricks.com',
      replyTo: email || undefined,
      subject: '📬 Trout Tricks contact: ' + (reason || 'no reason') + ' — ' + (firstName || 'unknown'),
      body: [
        'New contact form submission · ' + timestamp + ' MT',
        '',
        'Name:    ' + (firstName + ' ' + lastName).trim(),
        'Email:   ' + email,
        'Phone:   ' + phone,
        'Reason:  ' + reason,
        'Newsletter opt-in: ' + optInRaw,
        '',
        'Message:',
        '--------',
        message,
        '',
        '— sent by handleContactForm (Apps Script)'
      ].join('\n')
    });
  } catch (mailErr) {
    // Don't fail the whole submission if email send hiccups (over quota,
    // service hiccup, etc) — sheet row + Master Customers write already
    // succeeded, so the data is captured even if the ping doesn't go out.
    logWebhook({}, { error: String(mailErr), context: 'contact_form_mail' }, 'mail_error');
  }

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

function handleCrewSignup(body) {
  // Email signups from the homepage popup/footer. Klaviyo is the source of
  // truth for newsletter delivery; we mirror to Master Customers so the CRM
  // has every contact (#62).
  writeToMasterCustomers(body, body.acquisition_source || 'Crew');

  return ContentService
    .createTextOutput(JSON.stringify({ success: true, type: 'crew_signup' }))
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

  // #67: Serialize the dedup → write critical section. Square fires
  // payment.updated 5-7 times per payment, sometimes within ~100ms. Without
  // a lock, two concurrent executions can both read details, both miss each
  // other's payment_id, and both append duplicate rows.
  const lock = LockService.getDocumentLock();
  try {
    lock.waitLock(10000);
  } catch (lockErr) {
    Logger.log('[square] Document lock timeout (10s) — payment_id=' +
               data.payment_id + ' err=' + lockErr.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'lock_timeout' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    // Orders/Fulfillment columns: A=Email, B=First, C=Last, D=Phone, E=OrderDate,
    //                             F=Details, G=Fulfillment, H=Status, I=Notes/Tracking, J=Revenue,
    //                             K=Acquisition Source, L=Street, M=City, N=State, O=Zip

    // Read the details column once — used for reference_id matching AND payment_id dedup.
    const lastRow = sheet.getLastRow();
    const details = lastRow >= 2 ?
      sheet.getRange(2, COL_DETAILS, lastRow - 1, 1).getValues() : [];

    // Try to match an existing row by reference_id. Pre-write was retired post-#60+,
    // so this branch mostly handles legacy pre-write rows still floating around.
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
      // Existing row — fill missing customer fields, append payment info.
      const existingDetails = String(sheet.getRange(matchedRow, COL_DETAILS).getValue() || '');

      // Dedup: Square fires payment.updated 5-7 times per payment. First fire wins.
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

      const existingEmail = String(sheet.getRange(matchedRow, COL_EMAIL).getValue() || '').trim();
      if (!existingEmail && data.customer_email) {
        sheet.getRange(matchedRow, COL_EMAIL).setValue(data.customer_email);
      }
      const existingPhone = String(sheet.getRange(matchedRow, COL_PHONE).getValue() || '').trim();
      if (!existingPhone && data.customer_phone) {
        sheet.getRange(matchedRow, COL_PHONE).setValue(data.customer_phone);
      }

      if (data.address_line1) {
        sheet.getRange(matchedRow, COL_STREET).setValue(data.address_line1);
        sheet.getRange(matchedRow, COL_CITY).setValue(data.city || '');
        sheet.getRange(matchedRow, COL_STATE).setValue(data.state || '');
        sheet.getRange(matchedRow, COL_ZIP).setValue(data.zip || '');
      }

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

    // New paid order — no pre-existing row to match.
    // After the cart-side pre-write was retired (#60+), ALL cart orders land here.

    // Dedup: first webhook fire wins, suppress duplicates by payment_id.
    const paymentIdNeedle = String(data.payment_id);
    for (let i = 0; i < details.length; i++) {
      const cellText = String(details[i][0] || '');
      if (cellText.indexOf(paymentIdNeedle) !== -1) {
        Logger.log('[square] Duplicate suppressed — payment_id=' +
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

    // Cart orders carry a TT-XXXXX reference_id. Truly external Square sales
    // (POS, Invoice) don't — those still need the "manual reconcile" flag.
    const isCartOrder = !!data.reference_id;

    // Human label for column G — matches what handleOrder used to write.
    const fulfillmentLabel = data.fulfillment_type === 'pickup' ? 'Local pickup' :
                             data.fulfillment_type === 'ship' ? 'Ship' :
                             '';

    // Parse first/last from Worker's combined customer_name.
    let firstName = '', lastName = '';
    if (data.customer_name) {
      const nameParts = String(data.customer_name).trim().split(/\s+/);
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }

    // Build Details column. Mirrors the pre-#60 handleOrder format:
    // ref number, items list, fulfillment, total, then payment trailer.
    const detailsLines = [refLabel];
    if (data.order_items) detailsLines.push(data.order_items);
    if (!isCartOrder) detailsLines.push('⚠️ EXTERNAL ORDER — needs manual reconcile');
    if (fulfillmentLabel) detailsLines.push('\nFulfillment: ' + fulfillmentLabel.toUpperCase());
    if (revenue) detailsLines.push('TOTAL: ' + revenue);
    detailsLines.push('\n💰 Square Payment: ' + (data.payment_id || ''));
    if (data.receipt_url) detailsLines.push('Receipt: ' + data.receipt_url);
    detailsLines.push('Completed: ' + (data.completed_at || new Date().toISOString()));
    const detailsText = detailsLines.join('\n');

    sheet.appendRow([
      data.customer_email || '',           // A: Email
      firstName,                            // B: First Name
      lastName,                             // C: Last Name
      data.customer_phone || '',            // D: Phone
      new Date(),                           // E: Order Date
      detailsText,                          // F: Details
      fulfillmentLabel,                     // G: Fulfillment
      'Ordered',                            // H: Status
      isCartOrder ? '' : '(external)',      // I: Notes/Tracking
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
      customer_first_name: firstName,
      order_number: data.reference_id || data.payment_id || '',
      fulfillment: fulfillmentLabel,
      order_total: data.amount_cents ? (data.amount_cents / 100).toFixed(2) : ''
    }, isCartOrder ? 'Order Paid' : 'Order Paid (Ghost)');

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        row: newRowNum,
        cart_order: isCartOrder
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
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
    } else if (source === 'Website Popup' || source === 'Website Footer' || source === 'Crew') {
      notes = 'Newsletter signup';
    } else if (source === 'Pickup Order') {
      // Pre-checkout pickup signup (cart panel, Guides Choice card path, or
      // legacy form). Threaded from submitEmailSignup(email, source, extra) — #65.
      const lastName = body.customer_last_name || '';
      const phone    = body.customer_phone    || '';
      const parts = ['Pickup pre-checkout'];
      if (lastName) parts.push('LastName: ' + lastName);
      if (phone)    parts.push('Phone: ' + phone);
      notes = parts.join(' · ');
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

// #70 — one-shot reconciliation: pull Klaviyo profiles for list SUpRkF (Crew +
// Drop Waitlist — both lists merged into one Klaviyo list, distinguished by
// custom_source on subscription), diff against Master Customers by email,
// append the missing ones with Source = 'Klaviyo Backfill' and Klaviyo's
// `created` as the timestamp. Idempotent — safe to re-run.
//
// Setup before first run:
//   1. Klaviyo → Account → Settings → API Keys → Create Private API Key
//      with read access to "Profiles" + "Lists". Copy the pk_… value.
//   2. Apps Script → Project Settings (gear icon) → Script Properties →
//      Add row: KLAVIYO_PRIVATE_API_KEY = <the pk_… value>.
//   3. Save Code.gs, select this function from the dropdown, click Run,
//      approve UrlFetch + Spreadsheet permissions on first run.
//
// Check Execution log for counts (fetched / added / skipped). After this
// runs once, going-forward integrity is maintained by #62's crew_signup
// wiring — Klaviyo and Master Customers stay in sync automatically.
function backfillKlaviyoToMasterCustomers() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('KLAVIYO_PRIVATE_API_KEY');
  if (!apiKey) {
    throw new Error('KLAVIYO_PRIVATE_API_KEY not set in Script Properties. See function docstring for setup.');
  }

  const LIST_ID = 'SUpRkF';
  const REVISION = '2024-10-15';

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let master = ss.getSheetByName(MASTER_CUSTOMERS_SHEET);
  if (!master) {
    master = ss.insertSheet(MASTER_CUSTOMERS_SHEET);
    master.appendRow(['Timestamp', 'First Name', 'Email', 'Source', 'Notes', 'Acquisition Source']);
    master.getRange(1, 1, 1, 6).setFontWeight('bold');
    master.setFrozenRows(1);
  }

  // Build set of existing emails (col C, lowercased + trimmed for dedup)
  const existingEmails = {};
  const lastRow = master.getLastRow();
  if (lastRow >= 2) {
    const emails = master.getRange(2, 3, lastRow - 1, 1).getValues();
    for (let i = 0; i < emails.length; i++) {
      const e = String(emails[i][0] || '').trim().toLowerCase();
      if (e) existingEmails[e] = true;
    }
  }
  Logger.log('[klaviyo backfill] Master Customers has ' + Object.keys(existingEmails).length + ' unique emails');

  // Paginate through Klaviyo list profiles
  const profiles = [];
  let nextUrl = 'https://a.klaviyo.com/api/lists/' + LIST_ID + '/profiles/?page%5Bsize%5D=100';
  let pageNum = 0;
  while (nextUrl) {
    pageNum++;
    const response = UrlFetchApp.fetch(nextUrl, {
      method: 'get',
      headers: {
        'Authorization': 'Klaviyo-API-Key ' + apiKey,
        'accept': 'application/json',
        'revision': REVISION
      },
      muteHttpExceptions: true
    });
    const status = response.getResponseCode();
    if (status !== 200) {
      throw new Error('Klaviyo API error ' + status + ' on page ' + pageNum + ': ' +
                      response.getContentText().substring(0, 500));
    }
    const data = JSON.parse(response.getContentText());
    if (data.data && data.data.length) {
      for (let i = 0; i < data.data.length; i++) profiles.push(data.data[i]);
    }
    nextUrl = (data.links && data.links.next) ? data.links.next : null;
    if (pageNum > 100) {
      Logger.log('[klaviyo backfill] safety stop at 100 pages');
      break;
    }
  }
  Logger.log('[klaviyo backfill] fetched ' + profiles.length + ' Klaviyo profiles across ' + pageNum + ' page(s)');

  // Append missing profiles to Master Customers
  const rowsToAdd = [];
  let skippedAlreadyPresent = 0, skippedNoEmail = 0;
  for (let i = 0; i < profiles.length; i++) {
    const attrs = profiles[i].attributes || {};
    const rawEmail = String(attrs.email || '').trim();
    if (!rawEmail) { skippedNoEmail++; continue; }
    const emailKey = rawEmail.toLowerCase();
    if (existingEmails[emailKey]) { skippedAlreadyPresent++; continue; }

    let timestamp = '';
    if (attrs.created) {
      try {
        timestamp = Utilities.formatDate(new Date(attrs.created), 'America/Denver', 'yyyy-MM-dd HH:mm:ss');
      } catch (e) {
        timestamp = String(attrs.created);
      }
    } else {
      timestamp = Utilities.formatDate(new Date(), 'America/Denver', 'yyyy-MM-dd HH:mm:ss');
    }

    rowsToAdd.push([
      timestamp,
      attrs.first_name || '',
      rawEmail,
      'Klaviyo Backfill',
      'Klaviyo profile backfill' + (attrs.created ? ' (created: ' + attrs.created + ')' : ''),
      ''
    ]);
    existingEmails[emailKey] = true;
  }

  Logger.log('[klaviyo backfill] skipped (already in MC): ' + skippedAlreadyPresent);
  Logger.log('[klaviyo backfill] skipped (no email on profile): ' + skippedNoEmail);
  Logger.log('[klaviyo backfill] new rows to add: ' + rowsToAdd.length);

  if (rowsToAdd.length > 0) {
    master.getRange(master.getLastRow() + 1, 1, rowsToAdd.length, 6).setValues(rowsToAdd);
  }

  return {
    fetched: profiles.length,
    added: rowsToAdd.length,
    skipped_already_present: skippedAlreadyPresent,
    skipped_no_email: skippedNoEmail
  };
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