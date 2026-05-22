// === DAILY RECONCILIATION (#55) ===
// Runs once a day at 06:00 MT. Pulls Square's last-24h payment activity
// (production endpoint) and compares to the Orders/Fulfillment tab.
// Emails thomas@trouttricks.com on any mismatch:
//   - Square payment_id not found in any sheet row's Details cell
//     (PRIMARY failure mode: webhook didn't fire → unpaid-tracked order).
//   - Sheet row in last 24h whose payment_id Square doesn't know about
//     (usually test / manual drift — quieter signal).
// Wider 48h Square fetch is used for join-side matching so Sheet rows
// at the 24h-window edge don't false-alarm.
// Top-level try/catch — on any unhandled failure emails a FAILED report
// so silent breakage can't hide.
//
// Setup before first run:
//   1. Apps Script → Project Settings (gear) → Script Properties →
//      add SQUARE_ACCESS_TOKEN = <Square production access token>.
//      If you already stored it under a different name, edit
//      SQUARE_TOKEN_PROP below before running.
//   2. Save Code.gs (with this block appended), run
//      installDailyReconciliationTrigger() once from the editor,
//      approve UrlFetch + MailApp scopes on first run.
//   3. Manually verify with dailyReconciliation() — zero mismatches is
//      silent by design (clean = no email). View → Execution log shows
//      [recon] lines. To exercise the email path, temporarily widen
//      dayAgo to 7 days for one test run.
//
// NOTE: this file is a staged drop-in for Code.gs. It expects the
// existing constants ORDERS_SHEET and COL_DETAILS to already be defined
// at the top of Code.gs — don't duplicate them here. Paste the block
// below at the bottom of Code.gs (or wherever you keep new functions).

const SQUARE_TOKEN_PROP        = 'SQUARE_ACCESS_TOKEN';
const SQUARE_BASE              = 'https://connect.squareup.com';
const SQUARE_API_VERSION       = '2024-10-17';
const RECON_ALERT_RECIPIENT    = 'thomas@trouttricks.com';

function dailyReconciliation() {
  try {
    Logger.log('[recon] start ' + new Date().toISOString());

    const now = new Date();
    const dayAgo      = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo  = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // 1. Pull Square payments — last 48h (wider so sheet rows at the 24h
    //    edge have a fair chance of matching; alert window stays 24h)
    const sqPayments = fetchSquarePayments_(twoDaysAgo.toISOString(), now.toISOString());
    Logger.log('[recon] fetched ' + sqPayments.length + ' Square payments (48h window)');

    const sqLast24 = sqPayments.filter(function(p){
      return new Date(p.created_at) >= dayAgo;
    });
    Logger.log('[recon] of those, ' + sqLast24.length + ' fall in the 24h alert window');

    const sqById = {};
    for (let i = 0; i < sqPayments.length; i++) sqById[sqPayments[i].id] = sqPayments[i];

    // 2. Read Orders/Fulfillment
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(ORDERS_SHEET);
    if (!sheet) throw new Error('Sheet tab not found: ' + ORDERS_SHEET);

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      Logger.log('[recon] sheet has no data rows');
      if (sqLast24.length > 0) {
        sendReconAlert_(sqLast24, [], 'Orders/Fulfillment tab is empty but Square has payments.');
      }
      return;
    }

    const rows = sheet.getRange(2, 1, lastRow - 1, 15).getValues();

    // Sheet rows in last 24h, with payment_id parsed from Details
    const sheetRows24h = [];
    for (let i = 0; i < rows.length; i++) {
      const od = rows[i][4];  // col E = orderDate
      const rowDate = (od instanceof Date) ? od : (od ? new Date(od) : null);
      if (!rowDate || isNaN(rowDate.getTime()) || rowDate < dayAgo) continue;
      sheetRows24h.push({
        rowNum:    i + 2,
        email:     rows[i][0],
        firstName: rows[i][1],
        orderDate: rowDate,
        details:   String(rows[i][5] || ''),
        revenue:   rows[i][9],
        paymentId: extractPaymentId_(String(rows[i][5] || ''))
      });
    }
    Logger.log('[recon] ' + sheetRows24h.length + ' sheet rows in last 24h');

    // Wider check: any payment_id anywhere in Details column (covers
    // late-night Sheet rows whose webhook lands the next morning)
    const allDetails = sheet.getRange(2, COL_DETAILS, lastRow - 1, 1).getValues();
    const allSheetPaymentIds = {};
    for (let i = 0; i < allDetails.length; i++) {
      const pid = extractPaymentId_(String(allDetails[i][0] || ''));
      if (pid) allSheetPaymentIds[pid] = true;
    }

    // 3. Direction 1: Square payments missing from sheet (PRIMARY ALARM)
    const squareMissing = [];
    for (let i = 0; i < sqLast24.length; i++) {
      if (!allSheetPaymentIds[sqLast24[i].id]) squareMissing.push(sqLast24[i]);
    }

    // 4. Direction 2: sheet rows w/ payment_id Square doesn't know
    const sheetOrphans = [];
    for (let i = 0; i < sheetRows24h.length; i++) {
      const r = sheetRows24h[i];
      if (r.paymentId && !sqById[r.paymentId]) sheetOrphans.push(r);
    }

    Logger.log('[recon] direction1 (square→no sheet): ' + squareMissing.length);
    Logger.log('[recon] direction2 (sheet→no square): ' + sheetOrphans.length);

    if (squareMissing.length === 0 && sheetOrphans.length === 0) {
      Logger.log('[recon] clean — no email sent');
      return;
    }

    sendReconAlert_(squareMissing, sheetOrphans, null);

  } catch (err) {
    Logger.log('[recon] FAILED: ' + err.toString());
    Logger.log('[recon] stack:\n' + (err.stack || 'no stack'));
    try {
      MailApp.sendEmail({
        to: RECON_ALERT_RECIPIENT,
        subject: '⚠️ Trout Tricks reconciliation FAILED',
        body: [
          'dailyReconciliation() threw before completing.',
          '',
          'Error: ' + err.toString(),
          '',
          'Stack:',
          err.stack || 'no stack',
          '',
          '— top-level catch in dailyReconciliation (#55)'
        ].join('\n')
      });
    } catch (mailErr) {
      Logger.log('[recon] failure-email also failed: ' + mailErr.toString());
    }
  }
}

// Pulls Square payments between begin_time and end_time (ISO 8601 UTC),
// following Square's cursor pagination. Returns the full payment array.
function fetchSquarePayments_(beginIso, endIso) {
  const token = PropertiesService.getScriptProperties().getProperty(SQUARE_TOKEN_PROP);
  if (!token) {
    throw new Error('Script Property ' + SQUARE_TOKEN_PROP + ' not set');
  }
  const collected = [];
  let cursor = null;
  let pageNum = 0;
  while (pageNum < 50) {
    pageNum++;
    let url = SQUARE_BASE + '/v2/payments' +
      '?begin_time=' + encodeURIComponent(beginIso) +
      '&end_time='   + encodeURIComponent(endIso) +
      '&limit=100';
    if (cursor) url += '&cursor=' + encodeURIComponent(cursor);

    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: {
        'Authorization':  'Bearer ' + token,
        'Square-Version': SQUARE_API_VERSION,
        'Accept':         'application/json'
      },
      muteHttpExceptions: true
    });
    const status = response.getResponseCode();
    if (status !== 200) {
      throw new Error('Square /v2/payments HTTP ' + status + ': ' + response.getContentText().substring(0, 500));
    }
    const data = JSON.parse(response.getContentText());
    const payments = data.payments || [];
    for (let i = 0; i < payments.length; i++) collected.push(payments[i]);
    cursor = data.cursor || null;
    if (!cursor) break;
  }
  Logger.log('[recon] Square fetch completed across ' + pageNum + ' page(s)');
  return collected;
}

// Extract Square payment_id from a Details cell. handleSquarePaymentCompleted
// writes "💰 Square Payment: <id>" on every paid row (matched + ghost path).
function extractPaymentId_(detailsText) {
  if (!detailsText) return null;
  const m = String(detailsText).match(/Square Payment:\s*([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

// Build + send the mismatch alert email.
function sendReconAlert_(squareMissing, sheetOrphans, contextNote) {
  const mtNow = Utilities.formatDate(new Date(), 'America/Denver', 'yyyy-MM-dd HH:mm');
  const n = squareMissing.length + sheetOrphans.length;
  const lines = [
    'Trout Tricks reconciliation report — ' + mtNow + ' MT',
    'Window: last 24 hours',
    ''
  ];

  if (contextNote) { lines.push(contextNote, ''); }

  if (squareMissing.length > 0) {
    lines.push('🚨 Square payments with NO matching sheet row (' + squareMissing.length + ')');
    lines.push('   (PRIMARY failure mode: webhook did not fire.)');
    lines.push('');
    for (let i = 0; i < squareMissing.length; i++) {
      const p = squareMissing[i];
      const amount = p.amount_money ? '$' + (p.amount_money.amount / 100).toFixed(2) : '?';
      const ts = p.created_at || '?';
      lines.push('  • ' + (p.id || '?') +
                 '  ' + amount +
                 '  ' + ts +
                 '  status=' + (p.status || '?') +
                 (p.order_id ? '  order_id=' + p.order_id : ''));
    }
    lines.push('');
  }

  if (sheetOrphans.length > 0) {
    lines.push('⚠️ Sheet rows with payment_id Square does NOT know (' + sheetOrphans.length + ')');
    lines.push('   (Usually test / manual drift — investigate if unexpected.)');
    lines.push('');
    for (let i = 0; i < sheetOrphans.length; i++) {
      const r = sheetOrphans[i];
      const ts = Utilities.formatDate(r.orderDate, 'America/Denver', 'yyyy-MM-dd HH:mm');
      lines.push('  • Row ' + r.rowNum +
                 '  payment_id=' + r.paymentId +
                 '  ' + (r.revenue || '?') +
                 '  ' + ts +
                 (r.email ? '  ' + r.email : ''));
    }
    lines.push('');
  }

  lines.push('— sent by dailyReconciliation (#55)');

  MailApp.sendEmail({
    to: RECON_ALERT_RECIPIENT,
    subject: 'Trout Tricks reconciliation: ' + n + ' mismatch' + (n === 1 ? '' : 'es'),
    body: lines.join('\n')
  });
  Logger.log('[recon] alert email sent (' + n + ' mismatches)');
}

// One-time trigger setup. Deletes any existing trigger pointing to
// dailyReconciliation (so re-running this never duplicates), then
// schedules at 06:00 Mountain Time (script timezone is America/Denver).
function installDailyReconciliationTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  let removed = 0;
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'dailyReconciliation') {
      ScriptApp.deleteTrigger(triggers[i]);
      removed++;
    }
  }
  ScriptApp.newTrigger('dailyReconciliation')
    .timeBased()
    .atHour(6)
    .everyDays(1)
    .create();
  Logger.log('[recon] daily 6:00 MT trigger installed (removed ' + removed + ' existing duplicate(s))');
}
