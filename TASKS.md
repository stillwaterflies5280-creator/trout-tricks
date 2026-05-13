# Trout Tricks — Task Tracker

Persistent source of truth for active, blocked, and closed work. All adds/closes/edits happen here.

## Open (active queue)

- **#13** Avidmax wholesale walk-in prep — Nick contact
- **#14** Umpqua signature pattern submission — needs Matt Winkler input first
- **#15** Local fly shop wholesale — South Park / North Park / Estes / Carter Lake corridors
- **#17** Phase 3 Square post-payment webhook → Apps Script auto-flip status
- **#18** Klaviyo flows — abandoned cart + post-purchase review request
- **#20** UTM social bio links via Bit.ly + GA4
- **#30** Tying expertise blog posts — needs photo shoot session first, then write
- **#31** SEO P3 (ongoing) — backlinks from tier-adjacent sites
<!-- #33a + #33b shipped 2026-05-12 — see Closed section below -->
- *(former #33 PATH A — split into #33a + #33b and shipped, see Closed log)*
- **#50** Cart extraction to shared `/js/cart.js` + `/css/cart.css` — second phase of PATH A. Currently the cart code (~600 lines JS + ~150 lines CSS + cart panel HTML) is duplicated across 12 inline-style pages, AND per-fly `/flies/<slug>.html` pages get a stripped-down "Quick Add" that writes to the shared `tt_cart` localStorage but lacks the full slide-in cart panel. Extracting cart to shared files unblocks: (1) full cart panel on per-fly pages (Add to Cart → panel slides in, edit qty / remove items / proceed to checkout without leaving the page); (2) one source of truth for cart bug fixes; (3) lighter pages. ~2 hr careful refactor + checkout test. Touch checkout flow — schedule when there's time to test the full Square Worker handoff.
- **#51** Apps Script pickup-order notification — verify whether you receive an email when a Local Pickup checkout fires (function `pickupCardCheckout` in `index.html` line 4346 POSTs full customer info to the Apps Script webhook with `fulfillment: 'pickup'`). If no notification arrives, open the Apps Script editor (script.google.com → Trout Tricks project), paste the handler code into a chat, and I'll add a `MailApp.sendEmail()` call so you get "🎣 New pickup order from [name]" pinged to your inbox the moment a customer submits.
- **#35** Verify GBP listing reflects tier positioning (Manufacturer + remove charters / clothing / fishing store) — may be blocked until video verification; pending backend check
- **#38** Free sticker with fly order — gift-with-purchase mechanic
- **#40** Stillwater money-keyword SEO sprint — keyword domination on Antero / Spinney / Eleven Mile / Delaney+Lake John posts
  - ~~**Wave 1** (surgical fixes): leech links on Delaney/Lake John; title + H1 rewrites on Spinney/Delaney/Eleven Mile; Eleven Mile dual-spelling fix~~ ✓ *shipped 2026-05-11 (b86b614)*
  - **Wave 2A** (deep anchors — mechanical, ~5 commits): add `id="fly-N"` to catalog render in `index.html`; add post-render hash-scroll fallback if needed; rewrite all `../index.html#catalog` anchors across 4 lake posts + balanced-leech post + chironomid-patterns post to deep-link per fly. Target ship: ~2026-05-16
  - **Wave 2B** (content expansion — skeleton + tactical fill, 1 commit per post): Antero (~458w → ~1,300w) + Spinney (~593w → ~1,400w) + Delaney/Lake John (~450w → ~1,300w). Eleven Mile already 1,339w, no expansion. Target ship: by 2026-05-25 to stay inside Wave 1 GSC attribution window
  - **Wave 2C** (cross-linking + comparison H2 — 1 commit): inline lake-to-lake links across all 4 posts with money-keyword anchors; `Related Stillwaters` section per post; new `Eleven Mile vs Spinney vs Antero — Which to Pick` H2 in Eleven Mile post; link Antero news posts → Antero chironomid-patterns post; link balanced-leech blog post wherever leeches mentioned. Ship after 2B
  - **Wave 3** (schema + media): add FAQPage + BreadcrumbList JSON-LD to all 4 posts; add inline pattern images with lake-specific alt text
- **#45** The Drop — Phase 1 landing + waitlist validation (Square Subscriptions path, premium tier above free Crew newsletter)
  - `/the-drop.html` shipped 2026-05-12 with Klaviyo client-subscription wiring (list `SUpRkF`, custom_source `"The Drop Waitlist"`, profile property `drop_founding_interest`). Apps Script POST gated behind `ENABLE_DROP_APPSSCRIPT` flag in `the-drop.html` — flip to `true` after #47 ships.
  - **GATE to #46:** 25+ waitlist signups. If 4 weeks pass without 25 (≈ 2026-06-09), rethink positioning/pricing rather than lowering the gate.
  - **Drive traffic:** email blast to Crew list; FB group soft-posts (Colorado Stillwater Anglers / Front Range Fly Fishing / Colorado Fly Fishing) framed as "thinking about starting this, who'd join?" not a hard pitch; Round 2 sticker shipping email P.S.; short IG/TikTok clips with "join the waitlist" CTA.
  - **Locked decisions (2026-05-12):** founding $20/mo cap 10 lifetime / standard $35/mo / member discount 20% (code `DROP`) / bi-weekly Wed 7:00–8:30 PM MT / member chat tentatively Facebook (was Discord) / video platform TBD (Zoom or Meet) / ethics framing = spawn TIMING + closures + conditions, NOT locations.

## Blocked

**Release when #13 and #14 wrap:**
- **#21** Free Chironomid Cheat Sheet PDF
- **#22** `/free-guide` landing page
- **#23** Homepage popup copy — lead with cheat sheet
- **#24** Reusable lead-magnet CTA block at end of blog posts

**Release when #45 hits 25+ waitlist signups:**
- **#46** The Drop — Square Subscriptions setup + soft launch. Create founding ($20/mo, no end) + standard ($35/mo, no end) plans in Square Dashboard (test with $1/mo plan first). Generate checkout links. Replace waitlist form on `/the-drop.html` with two CTAs ("Claim founding spot — $20" / "Join standard — $35"); add manual spot counter ("X of 10 founding spots remaining"); disable founding CTA when 10 sold. Create Square discount code `DROP` 20% off, no expiry, members-only.
- **#47** The Drop — Apps Script handler updates: branch on `submission_type === 'drop_waitlist'` → "Drop Waitlist" tab (cols: timestamp, email, name, source, founding_interest, notes); extend `writeToMasterCustomers` to accept `source = "The Drop Waitlist"` and `"The Drop"`; new "Drop Members" tab (cols: timestamp_joined, name, email, plan_type, square_subscription_id, status, zoom_added, discord_added, founding_lock_date, last_status_change, notes); handle Square webhook events `subscription.created` / `subscription.canceled` / `invoice.payment_failed` (email Thomas on each for manual Zoom/group invites). After deploy: flip `ENABLE_DROP_APPSSCRIPT = true` in `the-drop.html`.
- **#48** The Drop — member onboarding workflow + chat platform setup. Chat platform: Facebook private group (current lean per 2026-05-12); fallback Discord. Video platform decision Zoom vs Meet. Recurring bi-weekly Wednesday 7:00 PM MT meeting with cloud recording → member-only Google Drive folder. Welcome email template (next call date, archive link, discount code `DROP`, group invite, expectations). Cancellation workflow (remove from recurring invite + group).

**Klaviyo hosted-zone provisioning required:**
- **#49** Klaviyo sender swap to `thomas@trouttricks.com` — blocked on Klaviyo provisioning `send.trouttricks.com` hosted zone. DNS diagnostic 2026-05-08: Namecheap delegates correctly to `ns1-ns4.klaviyo.com`; Klaviyo NS servers return REFUSED. Open Klaviyo support ticket. After auth verifies: set Klaviyo default sender → `thomas@trouttricks.com`, update Welcome flow sender, test From: header. Verify with `dig @ns1.klaviyo.com send.trouttricks.com SOA` returning NOERROR + SOA.

## Closed (running log)

- **#33b** Per-fly static pages — generated 20 landing pages at `/flies/<slug>.html` (12 fly patterns + 6 stickers + 2 bundles) via `scripts/generate-fly-pages.py`. Each carries unique `<title>` / meta description / OpenGraph / Twitter cards / Product JSON-LD / BreadcrumbList JSON-LD. Sitemap.xml updated with all 20 entries. Homepage catalog cards now show a "View Details →" link below price (per option-a decision — clicking the photo still expands the lightbox). The in-page share button now shares the per-fly URL (`/flies/balanced-leech.html`) instead of the homepage hash, so iMessage/FB/X finally render a real preview card with the fly name + price + image. Re-run the generator after adding any new fly. — *closed 2026-05-12*
- **#33a** PATH A refactor — extracted `flies[]` + `FLY_IMAGES` + `slugifyFlyName` from 12 separate HTML files into a single canonical `/js/catalog.js`. fish.html had drifted (missing stickers, empty FLY_IMAGES); now unified. Cart functions intentionally left duplicated (lower risk). Prereq for #33b. — *closed 2026-05-12*
- **#39** GBP video walkthrough verification — *in process 2026-05-12* (submitted for Google review; tracking moved off queue)
- **#44** Fish gallery WebP variants — converted 111 v2fish JPGs to WebP @ q=80 via cwebp; wrapped each `<img>` in `<picture>` with WebP source + JPG fallback. WebP-capable browsers (95%+ market) get ~5.7 MB total instead of 12 MB; legacy browsers fall back to JPG. Combined with #42 (resize) + #43 (pagination), initial gallery load is ~30 imgs × ~50 KB WebP avg = ~1.5 MB. Down from original 46 MB unpaginated. — *closed 2026-05-12*
- **#43** Fish gallery pagination — initial 30 imgs render; rest carry `hidden` attr until "Show more" button reveals next batch of 30. Combined with lazy-loading, initial gallery page-weight drops to just the visible 30 imgs (~3 MB) instead of all 111 (~12 MB) — *closed 2026-05-12*
- **#42** Fish gallery — resize all 111 v2fish JPGs from source res (1200–1600px) to 600px wide via sips; updated width/height attrs in fish.html accordingly — *closed 2026-05-12* (46 MB → 12 MB total, ~4× lighter)
- **#41** Sticker campaign Apps Script field-name fix — *closed 2026-05-11* (free-sticker.html: `address_line_1` / `address_line_2` → `address_line1` / `address_line2` to match what `handleStickerCampaign()` reads. Round 1 lost addresses due to underscore-before-digit mismatch. **Manual TODO for Thomas:** retype "Address Line 1" header into column F of the Sticker Campaign tab in the Master sheet — header was missing on the sheet side, separate from the payload bug.)
- **#12** GBP photos + video upload — *closed 2026-05-11* (photos uploaded; more added incrementally as available)
