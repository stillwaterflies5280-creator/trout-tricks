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
- **#33** PATH A — extract `flies[]` + cart functions to shared `/js/catalog.js`
- **#35** Verify GBP listing reflects tier positioning (Manufacturer + remove charters / clothing / fishing store) — may be blocked until video verification; pending backend check
- **#38** Free sticker with fly order — gift-with-purchase mechanic
- **#40** Stillwater money-keyword SEO sprint — keyword domination on Antero / Spinney / Eleven Mile / Delaney+Lake John posts
  - ~~**Wave 1** (surgical fixes): leech links on Delaney/Lake John; title + H1 rewrites on Spinney/Delaney/Eleven Mile; Eleven Mile dual-spelling fix~~ ✓ *shipped 2026-05-11 (b86b614)*
  - **Wave 2A** (deep anchors — mechanical, ~5 commits): add `id="fly-N"` to catalog render in `index.html`; add post-render hash-scroll fallback if needed; rewrite all `../index.html#catalog` anchors across 4 lake posts + balanced-leech post + chironomid-patterns post to deep-link per fly. Target ship: ~2026-05-16
  - **Wave 2B** (content expansion — skeleton + tactical fill, 1 commit per post): Antero (~458w → ~1,300w) + Spinney (~593w → ~1,400w) + Delaney/Lake John (~450w → ~1,300w). Eleven Mile already 1,339w, no expansion. Target ship: by 2026-05-25 to stay inside Wave 1 GSC attribution window
  - **Wave 2C** (cross-linking + comparison H2 — 1 commit): inline lake-to-lake links across all 4 posts with money-keyword anchors; `Related Stillwaters` section per post; new `Eleven Mile vs Spinney vs Antero — Which to Pick` H2 in Eleven Mile post; link Antero news posts → Antero chironomid-patterns post; link balanced-leech blog post wherever leeches mentioned. Ship after 2B
  - **Wave 3** (schema + media): add FAQPage + BreadcrumbList JSON-LD to all 4 posts; add inline pattern images with lake-specific alt text

## Blocked

**Release when #13 and #14 wrap:**
- **#21** Free Chironomid Cheat Sheet PDF
- **#22** `/free-guide` landing page
- **#23** Homepage popup copy — lead with cheat sheet
- **#24** Reusable lead-magnet CTA block at end of blog posts

**Office visit required (McIntyre St, Golden CO):**
- **#39** Verify GBP listing via Google video walkthrough — required before public listing goes live

## Closed (running log)

- **#41** Sticker campaign Apps Script field-name fix — *closed 2026-05-11* (free-sticker.html: `address_line_1` / `address_line_2` → `address_line1` / `address_line2` to match what `handleStickerCampaign()` reads. Round 1 lost addresses due to underscore-before-digit mismatch. **Manual TODO for Thomas:** retype "Address Line 1" header into column F of the Sticker Campaign tab in the Master sheet — header was missing on the sheet side, separate from the payload bug.)
- **#12** GBP photos + video upload — *closed 2026-05-11* (photos uploaded; more added incrementally as available)
