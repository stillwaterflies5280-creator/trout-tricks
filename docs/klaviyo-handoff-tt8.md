# Klaviyo handoff brief — tt8 / Move 6

Brief for a fresh chat-Claude session that will plan/build Klaviyo flows for Trout Tricks. This document is the full context dump — no need to ask follow-up "what's the codebase?" questions before proposing flow architecture. Gaps and open questions are flagged at the bottom.

Repo: `~/trout-tricks` (static HTML, no build step; reusable JS in `/js/`).
Live site: `https://www.trouttricks.com`

---

## 1. #49 sender swap — DONE, sidestepped, not blocking

**Status:** Closed 2026-05-16 (see `TASKS.md` line for #49 in the Closed log).

**The actual blocker:** The original plan was to authenticate a dedicated `send.trouttricks.com` sending subdomain so Klaviyo could send from a `noreply@send.trouttricks.com` style address with SPF/DKIM/DMARC chained through that zone. DNS / domain-auth setup on the `send.trouttricks.com` subdomain didn't get resolved in the working window.

**The sidestep:** Instead of pushing through the subdomain auth, Thomas switched the Klaviyo sender to `thomas@trouttricks.com` — the apex-domain mailbox he already uses. That inherits the existing apex-domain SPF/DKIM/DMARC config and unblocks all flows immediately.

**Implication for the new chat-Claude:** All Klaviyo flow emails should configure `From:` as `thomas@trouttricks.com`, friendly name `Thomas — Trout Tricks` (or `Thomas Frank` if Thomas prefers his full name in friendly-name slots — confirm with him). Reply-to also `thomas@trouttricks.com` so real responses land in his inbox, not a black-hole noreply. No further DNS work needed; the apex auth is already in place and proven.

**Note:** `TASKS.md` line 18 (Drop sprint #52) still references the old "Step 0 BLOCKER: Klaviyo sender-domain auth (`send.trouttricks.com` zone — see #49)" — that note is stale post-#49 and should be ignored when planning Drop flows. The `send.trouttricks.com` zone is no longer in the picture.

---

## 2. Klaviyo flows — current state

**Honest answer: largely blank slate, with one drafted-but-unbuilt flow on disk and several mentioned-but-not-yet-built flows.**

What I can confirm from the repo (cannot confirm Klaviyo dashboard state — chat-Claude should ask Thomas to spot-check live flows before proposing duplicates):

### Drafted on disk, not confirmed live
- **Drop launch follow-up flow** — full 2-email spec at `assets/drop-launch-email-followup-flow.md`. Trigger: "Active on Site — visited /the-drop.html" with filter "has NOT triggered Drop Waitlist Signup". Email 1 at 48 hr (objection-handler), Email 2 at 7 d (last call). **Prerequisites called out in the doc itself:** (a) Klaviyo Pixel must be installed on `trouttricks.com` for "Active on Site" tracking to fire — unknown if installed; (b) custom event `Drop Waitlist Signup` must be defined and verified firing.

### Implied / referenced but no spec on disk
- **Welcome flow with WELCOME10 discount** — `index.html` line 4811 comment says "Discount delivery (WELCOME10) is handled inside Klaviyo via flows — the popup still reveals the code on screen for immediate use." So a Welcome flow that delivers `WELCOME10` is **expected to exist** in the Klaviyo dashboard. Chat-Claude should confirm with Thomas whether this flow is built/live, and if so, what its structure is. If not built, this is the first one to spec.
- **Drop Waitlist welcome** — `the-drop.html` triggers a separate list (`S5XAFW`, "The Drop Waitlist") with custom_source `"The Drop Waitlist"` or `"The Drop Waitlist (founding interest)"`. A welcome flow for this list — confirming the spot, setting expectations on opening at 25 signups, segmenting by `drop_founding_interest=true|false` — is implied but not specced.
- **Sticker Round 1 recovery email** — one-shot at `assets/sticker-r1-recovery-email.md` for an orphan segment (people who filled the sticker form after the 15-cap closed because the form-close bug failed). Apology + 10% off code + Round 2 first-dibs promise. **Not yet sent — code placeholder `TKTKTK` still in the body.** This is a manual one-off send, not a triggered flow.
- **Order confirmation flow** — `SESSION_HANDOFF.md` line 148 ("Queued for after #17 lands") lists a "branded HTML order confirmation email + Klaviyo flow, triggered by the same matched-row event in `handleSquarePaymentCompleted` once Step 7 is green." Square→Apps Script webhook (#17) is now closed and live (closed 2026-05-16); so the trigger event source exists, but the Klaviyo side of the flow is not yet built. Currently the only order confirmation a customer sees is Square's generic receipt.
- **Abandoned cart flow** — explicitly listed in `TASKS.md` as `#18` (Open queue): "Klaviyo flows — abandoned cart + post-purchase review request." No spec or trigger event wiring exists yet; this is greenfield.
- **Post-purchase review request** — same `#18`, blocked behind cart event wiring.

### Lists in use (confirmed from code)
| List ID | Name (inferred) | Source pages |
|---|---|---|
| `SUpRkF` | Main / Trout Tricks newsletter (the "Crew") | Popup signup, footer signup, contact form (opt-in only), pickup checkout, sticker campaign, sticker waitlist, community page |
| `S5XAFW` | The Drop Waitlist | `/the-drop.html` form only |

Company ID: `RyxZFj` (single account).

---

## 3. Events firing from cart/site to Klaviyo today

**Critical limitation: only one type of Klaviyo event fires from the site — `client/subscriptions/` POSTs (list subscribe / profile create+update).** No `track` events (Placed Order, Active on Site, Started Checkout, Viewed Product) are firing from the cart or site code. The Klaviyo Pixel may or may not be installed — chat-Claude should verify with Thomas. If not installed, any "Active on Site" or "Viewed Product" trigger needs the pixel added first.

### The subscription POST shape (canonical — same shape from all 7 entry points)

Endpoint: `POST https://a.klaviyo.com/client/subscriptions/?company_id=RyxZFj`
Headers: `Content-Type: application/json`, `revision: 2024-10-15`

```js
{
  data: {
    type: 'subscription',
    attributes: {
      custom_source: <string per entry point — see table>,
      profile: {
        data: {
          type: 'profile',
          attributes: {
            email: <string>,
            // optional below:
            first_name: <string>,
            last_name: <string>,
            phone_number: '+1' + <10 digits>,  // E.164
            location: { address1, address2, city, region, zip, country: 'US' },
            properties: {
              acquisition_source: <string>,
              // entry-point-specific flags, e.g.:
              drop_founding_interest: <bool>,
              sticker_campaign_signup: <bool>,
              contact_form_submission: <bool>,
              contact_reason: <string>,
              last_contact_message: <string>,
              last_contact_at: <ISO timestamp>,
              campaign_signup_date: <ISO timestamp>
            }
          }
        }
      }
    },
    relationships: { list: { data: { type: 'list', id: <list ID> } } }
  }
}
```

### Entry points and their `custom_source` / list assignments

| Entry point | File:line | `custom_source` | List | `acquisition_source` property |
|---|---|---|---|---|
| Email popup | `index.html:4866` (`submitPopupEmail`) → `submitEmailSignup(_, 'popup_signup')` line 4813 | `"Website Popup"` | `SUpRkF` | — |
| Footer signup | same `submitEmailSignup(_, 'footer_signup')` line 4813 | `"Website Footer"` | `SUpRkF` | — |
| Pickup checkout (fire-and-forget before Square redirect) | `index.html:4688` `pickupCardCheckout` → `submitEmailSignup(_, 'Pickup Order')` | `"Pickup Order"` | `SUpRkF` | — |
| Contact form (only if newsletterOptIn checked) | `contact.html:2803` → `sendContactToKlaviyo` line 2833 | `"Contact Form"` | `SUpRkF` | — (sets `contact_form_submission: true`, `contact_reason`, `last_contact_message`, `last_contact_at`) |
| Free sticker campaign | `free-sticker.html:3193` `sendStickerToKlaviyo` | `"Free Sticker Campaign"` | `SUpRkF` | `"free_sticker_campaign"` |
| Sticker waitlist (when 15/15 cap hit) | `free-sticker.html:3359` `sendWaitlistToKlaviyo` | `"Sticker Waitlist Round 1"` | `SUpRkF` | `"sticker_waitlist_round1"` |
| Community page newsletter | `community.html:2204` `sendToKlaviyo` | (uses list `SUpRkF`, custom_source likely `"Community"` — read full file to confirm) | `SUpRkF` | — |
| The Drop waitlist | `the-drop.html:1591` `submitDropWaitlist` | `"The Drop Waitlist"` or `"The Drop Waitlist (founding interest)"` | `S5XAFW` | `"the_drop_waitlist"` (also sets `drop_founding_interest: true|false`) |

### Cart → Worker → Square checkout payload (relevant for future events)

`index.html:4560` `checkoutWithSquare` POSTs to the Cloudflare Worker (`https://trouttricks-checkout.stillwaterflies5280.workers.dev`). **Klaviyo is not in this path** — the function does not fire a `Started Checkout` or similar event to Klaviyo. Worker returns a Square Hosted Checkout URL; user redirects to Square; Square handles payment; Square webhook fires back to Worker → Apps Script (see #17 in TASKS.md). Apps Script writes to Sheets but **does not currently relay to Klaviyo** — the order-confirmation Klaviyo flow described above would need a new outbound POST in `Code.gs` after the matched-row update.

**Implication for chat-Claude:** Any "post-purchase" Klaviyo trigger has to either (a) come from Apps Script after the Square webhook lands, posting a custom event like `Placed Order` to Klaviyo's `/client/events/` endpoint, or (b) ride on a Klaviyo Pixel page-view on `/thank-you.html` (which exists per the `tt_last_fulfillment` localStorage write at `index.html:4617`).

---

## 4. Brand voice anchors

**Sender identity:**
- From: `Thomas` at `thomas@trouttricks.com`
- Signature pattern (see all email assets):
  ```
  Tight lines,
  Thomas
  Trout Tricks · Fairmount, CO
  ```

**Voice rules (from TASKS.md #52):**
- Real-angler first-person.
- **No corporate slop** — banned phrases: "premium quality", "industry-leading", "experience the difference".
- **"Tier" not "shop"**, **"patterns" not "products"**, **"tying bench" not "workshop"**.
- **Spawn timing yes, spawn locations no** (ethics framing for The Drop — discuss when fish spawn, never where).

**Tonal anchors — read these three files before drafting any email:**
1. `assets/drop-launch-email-followup-flow.md` — best example of the full Trout Tricks email voice. Direct, first-person, soft objection-handling ("Honest answer: probably not yet…"), no fake urgency, ends every email with explicit permission to opt out ("If not, all good. I'll stop nudging.").
2. `assets/sticker-r1-recovery-email.md` — apology / make-good voice. Real accountability ("That's on me"), specific about what went wrong, concrete remedy. No PR-speak.
3. `assets/drop-launch-meta-ads-brief.md`, `assets/drop-launch-instagram.md`, `assets/drop-launch-tiktok.md`, `assets/drop-launch-dm-script.md` — same voice across organic/paid channels; useful for consistency checks.

**Recurring lexicon:**
- "The Crew" = free newsletter subscribers (list `SUpRkF`)
- "The Drop" = paid mastermind ($20/mo founding capped at 10 / $35/mo standard)
- "Tier" (not "shop" / "store") for the catalog
- "Patterns" (not "flies" exclusively — both work, "patterns" preferred in copy)
- "Tying bench" (not "workshop" / "studio")
- "Stillwaters" as one word for CO lake fishing
- Specific lake names freely: Antero, Spinney, Eleven Mile, Delaney, Lake John
- Specific techniques: balanced leeches, chironomids, indicator drift, depth column

**Footer/Tagline pattern (site-wide):**
> Hand-tied in the USA · All patterns tied to order · These flies slap.

---

## 5. Product mix + fulfillment timing

**Catalog (per `js/catalog.js`, generated 20 per-fly pages under `/flies/`):**
- 12 fly patterns (hand-tied to order)
- 6 sticker designs
- 2 bundles
- The Drop subscription (Square Subscriptions — `#46` blocked, not yet live; founding $20/mo and standard $35/mo plans planned in Square Dashboard)

**Fulfillment timing — GAP, not documented in repo.**

What the site says publicly: "All patterns tied to order" (footer copy on all pages). That implies tie-then-ship, no inventory, but **does not state explicit ship-by SLA**. I could not find a "ships in N days" line anywhere in `index.html`, `the-drop.html`, `stickers.html`, or the cart copy. Chat-Claude should ask Thomas directly:
- Typical tie-and-ship lead time for a 6-fly order (days from payment → drop in mailbox)?
- Sticker fulfillment timing (likely faster — already-printed sticker packs)?
- Any "rush" or "in-stock" SKUs that ship same-day?
- Carrier (USPS First-Class envelope likely, given the price points)?

Without those numbers, the order-confirmation flow can't honestly tell a buyer "your flies ship in X–Y business days." Pulling a placeholder like "1–2 weeks" without Thomas confirming risks setting expectations the bench can't meet.

**Klaviyo segmenting opportunities once flows exist:**
- Customers who bought flies vs stickers vs both (different post-purchase paths — fly buyers get tying content + lake reports; sticker-only buyers stay on a lighter cadence until they buy flies).
- Geographic: `location.region` is captured on sticker signups; could segment CO residents vs OOS for local-stillwater-relevant sends.
- Acquisition source: `acquisition_source` profile property distinguishes Crew/popup/footer/sticker/drop entry — useful for re-engagement flows that match the original promise.

---

## 6. Klaviyo plan / tier — GAP

**Not derivable from the repo.** Chat-Claude needs to ask Thomas directly. Relevant for flow design because:
- Free tier caps at 250 profiles / 500 sends/mo — flow ambition must match.
- Email + SMS tiers vs Email-only changes whether SMS steps can be designed into flows.
- "Advanced" features (predictive analytics, A/B testing on flows, multivariate, AI subject lines) only on higher tiers.
- Send rate limits differ by tier — matters for the Sticker R1 recovery email batching plan (see `assets/sticker-r1-recovery-email.md` notes section, line 51: "queue in batches of 25 spaced 10 min" was a guess against unknown throttles).

Profile count to ask about: total subscribed across `SUpRkF` + `S5XAFW`, plus suppressed/unsubscribed counts. Drives both pricing tier and segmentation feasibility.

---

## 7. Repo notes on email strategy to respect

Pulled from `TASKS.md`, `SESSION_HANDOFF.md`, and the `assets/` email specs:

**Active queue (TASKS.md):**
- **#18** — Klaviyo flows (abandoned cart + post-purchase review request). The big greenfield work. Chat-Claude's primary mandate.
- **#21–24** — Blocked behind #13/#14 (wholesale outreach). When they unblock: free chironomid cheat sheet PDF + `/free-guide` landing page + homepage popup copy lead with cheat sheet + reusable lead-magnet CTA at end of blog posts. **Klaviyo will need a Lead Magnet Delivery flow** for this — triggered on signup with `acquisition_source = "chironomid_cheat_sheet"` (or similar), delivers the PDF, then 3–5 email nurture sequence into Crew newsletter cadence.
- **#52** — Drop sprint. Stage 1 includes a Klaviyo blast to 25 Crew subs with two drafted variants (Founding-10 urgency / Mastermind story). UTM convention is locked: `?utm_source=klaviyo&utm_medium=email&utm_campaign=drop-launch&utm_content={asset}`.
- **#47** (Blocked) — Apps Script handler updates for The Drop. Includes Square webhook handlers for `subscription.created` / `subscription.canceled` / `invoice.payment_failed` — these are the natural triggers for Drop member lifecycle Klaviyo flows (welcome, payment-failure recovery, cancellation win-back) once the webhooks are wired.

**Closed but relevant:**
- **#17** (closed 2026-05-16) — Square post-payment webhook → Apps Script. Live and verified. This is the bridge that lets Apps Script post `Placed Order` events to Klaviyo when chat-Claude builds the order-confirmation flow.
- **#57 / #57b** (closed 2026-05-17) — Square shipping address now flows end-to-end into Sheets. Means buyer name + address are available in `Code.gs` at post-payment time — usable for personalized order-confirmation copy.

**Brand-level constraints (TASKS.md #52 voice rules — repeated for emphasis):**
- One step at a time, ask before jumping.
- Diffs before code edits.
- Wait for confirmation before next step.
- Ask vs guess — chat-Claude should default to asking Thomas when ambiguous, not assuming.

**Compliance posture (visible in `contact.html:1942` + `contact.html:2796–2803` comment block):**
- Implicit-opt-in via contact submission is explicitly avoided as "not GDPR/CCPA-clean."
- Newsletter subscribe is checkbox-gated; Klaviyo only fires when checked.
- Translate to flows: any flow that emails outside the trigger context (e.g., re-engagement, cross-sell across lists) must respect that the user only opted into the originating list. Don't cross-pollinate without a fresh opt-in moment.

---

## 8. Gaps to flag with Thomas before flow build starts

Chat-Claude should ask these up front, in roughly this order. Don't propose flow architecture until at least 1–5 are answered.

1. **Klaviyo plan/tier + current profile count** (drives feasibility — see Section 6).
2. **Live-flow inventory** — log in to Klaviyo dashboard, list all flows that currently have status = Live (not draft), with their trigger and last-sent date. Goal: don't propose flows that already exist.
3. **Welcome flow / WELCOME10** — does the Welcome flow that delivers `WELCOME10` actually exist and fire? `index.html:4811` says it does, but unconfirmed from outside. If yes: get a screenshot of the flow steps. If no: this is the first flow to build.
4. **Klaviyo Pixel install** — is the pixel installed and firing on `trouttricks.com`? Without it, no "Active on Site" / "Viewed Product" triggers work, which kills the drafted Drop follow-up flow and any future browse-abandonment flow.
5. **Fulfillment timing numbers** — explicit days for flies / stickers / mixed orders (see Section 5).
6. **Sticker R1 recovery email** — does Thomas still want this sent? The orphan list is documented at `assets/sticker-r1-orphans.md` (not yet read by this brief). If yes: needs a discount code chosen (placeholder `TKTKTK` in the draft) and a send window picked.
7. **Drop subscription lifecycle plans** — `#47` is blocked, but chat-Claude can pre-design the Klaviyo side of: welcome on `subscription.created`, payment-failure on `invoice.payment_failed`, cancellation win-back on `subscription.canceled`. Confirm Thomas wants these specced now or after #46/#47 ship.
8. **Friendly name preference on From: line** — `Thomas`, `Thomas Frank`, or `Thomas — Trout Tricks`. Trivial but easy to lock now.

---

## Quick-reference appendix

**Files chat-Claude will want to read first (in order):**
1. `TASKS.md` — full task tracker; ground truth for what's open/blocked/closed.
2. `assets/drop-launch-email-followup-flow.md` — best voice example.
3. `assets/sticker-r1-recovery-email.md` — apology voice example.
4. `index.html:4809–4854` — `submitEmailSignup` canonical client-subscription POST.
5. `the-drop.html:1591–1673` — `submitDropWaitlist`, second list wiring.
6. `free-sticker.html:3193–3226` (sticker) + `3359–3382` (waitlist) — fullest property payloads.
7. `SESSION_HANDOFF.md` — context on Square webhook plumbing.

**Hard-coded values to lock in flow build:**
- Company ID: `RyxZFj`
- List `SUpRkF` = Crew newsletter (main)
- List `S5XAFW` = The Drop Waitlist
- API revision header: `2024-10-15` (only if chat-Claude proposes any new client-side POST shape changes — don't drift)
- Apps Script webhook URL (if posting custom events from server side): `https://script.google.com/macros/s/AKfycbwc5JR5yo76y8-H81D3Dh4e-pc6kqha8rLO2Yu90ZtFV_s-3Hm__YI52WoaW54zXOqBdw/exec`
- Cloudflare Worker URL: `https://trouttricks-checkout.stillwaterflies5280.workers.dev`
- Sender: `thomas@trouttricks.com`
- UTM template: `?utm_source=klaviyo&utm_medium=email&utm_campaign={campaign}&utm_content={asset}`
