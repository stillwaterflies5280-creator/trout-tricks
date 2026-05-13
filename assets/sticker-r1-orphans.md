# Sticker Round 1 — orphan submissions list

People who submitted to `/free-sticker.html` AFTER Round 1 hit the 15-sticker cap but BEFORE the fail-open bug was fixed in commit `906d860`. These visitors entered their address expecting a free sticker that doesn't exist in the inventory.

**Source:** Master sheet, "Sticker Campaign" tab, row 16 and onward.

**Format per line:** `{first_name} <{email}> — submitted {timestamp}`

---

## Orphans (paste below)

> **CANNOT PULL FROM HERE.** Claude Code doesn't have Google Sheets access from this session — the Apps Script webhook only handles writes from the site forms. Either paste the rows in manually OR run the snippet below in the Apps Script editor to dump them.

<!-- BEGIN paste-in block -->

<!-- END paste-in block -->

---

## Apps Script snippet (run once to populate)

1. Open the Trout Tricks Apps Script project: `script.google.com` → select project.
2. New file → name it `dumpStickerOrphans` (or paste into the existing script and call it once).
3. Paste this code:

```javascript
function dumpStickerOrphans() {
  // Edit these to match your Master sheet
  var SHEET_ID = '<<<PASTE_MASTER_SHEET_ID_HERE>>>';
  var TAB_NAME = 'Sticker Campaign';

  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(TAB_NAME);
  if (!sheet) { Logger.log('Tab not found: ' + TAB_NAME); return; }

  // Adjust column letters/indexes to match your sheet's actual layout.
  // Assumes header row is row 1, so data starts at row 2. Orphans = row 17+
  // (Round 1's 15 stickers = rows 2-16, orphans start at row 17).
  // If your sheet is laid out differently, count by hand and adjust.
  var ORPHAN_START_ROW = 17;
  var lastRow = sheet.getLastRow();
  if (lastRow < ORPHAN_START_ROW) { Logger.log('No orphan rows.'); return; }

  // Read all relevant columns at once (one batched read = fast).
  // Header positions are GUESSES -- look at your actual sheet header row
  // and find the column letters for timestamp / first_name / email.
  // Default guess: A=timestamp, B=first_name, C=email.
  var range = sheet.getRange(ORPHAN_START_ROW, 1, lastRow - ORPHAN_START_ROW + 1, sheet.getLastColumn());
  var values = range.getValues();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Find column indexes by header name (case-insensitive substring match).
  function colIdx(needle) {
    needle = needle.toLowerCase();
    for (var i = 0; i < headers.length; i++) {
      if (String(headers[i]).toLowerCase().indexOf(needle) !== -1) return i;
    }
    return -1;
  }
  var tsIdx    = colIdx('timestamp');
  var nameIdx  = colIdx('first');     // matches "first name", "first_name"
  var emailIdx = colIdx('email');

  if (tsIdx < 0 || nameIdx < 0 || emailIdx < 0) {
    Logger.log('Header mismatch — headers found: ' + headers.join(' | '));
    Logger.log('Update the colIdx() needles to match.');
    return;
  }

  var lines = [];
  for (var r = 0; r < values.length; r++) {
    var name  = values[r][nameIdx];
    var email = values[r][emailIdx];
    var ts    = values[r][tsIdx];
    if (!email) continue;
    if (ts instanceof Date) ts = Utilities.formatDate(ts, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
    lines.push((name || 'angler') + ' <' + email + '> — submitted ' + ts);
  }

  Logger.log('Found ' + lines.length + ' orphan rows:');
  Logger.log(lines.join('\n'));

  // Also email it to yourself for easy paste:
  MailApp.sendEmail({
    to: Session.getActiveUser().getEmail(),
    subject: 'Sticker R1 orphan list (' + lines.length + ' rows)',
    body: lines.join('\n')
  });
}
```

4. Save → click "Run" once. Grant permissions when prompted.
5. Check the Apps Script Logger output OR your inbox — the list will be there.
6. Paste the lines into the BEGIN/END paste-in block above. Commit and tell me the count.

**If the script throws "Header mismatch"** — open your Master sheet, look at row 1 of the Sticker Campaign tab, and tell me the actual column header names. I'll adjust the `colIdx()` lookups to match.

**If ORPHAN_START_ROW = 17 is wrong** — check the sheet manually. Round 1 stickers = the first 15 successful submissions. Whatever row number the 16th submission is in, that's the start.
