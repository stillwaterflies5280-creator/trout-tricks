---
render_with_liquid: false
---

# Email Design Handoff — May 2026 What's New Round-up

**For:** Klaviyo campaign builder (or freelance email designer)
**From:** Thomas Frank · Trout Tricks
**Drafted:** 2026-05-19
**Reference HTML:** `docs/email-drafts/2026-05-19-whats-new-roundup.html` (use as content/structure reference; rebuild in Klaviyo's drag-and-drop editor for cleaner output)

---

## 1. Campaign goal

Catch the Crew list up on the last ~2 weeks of additions and drive shop traffic. Three things happening at once:
1. **2 new fly patterns** launched 2026-05-13 (Jersey Boy + Secret Bloodworm)
2. **3 new stickers** launched 2026-05-13 (brown-trout themed)
3. **New auto-applied promo** launched 2026-05-19 (free sticker with any pack, Buy 5 Get 1 Free on packs)

Plus surface the freshest blog post (May chironomid timing — peak relevance for current season).

Single CTA per section. No hero offer — this is a round-up, not a sales push.

## 2. Audience

| | |
|---|---|
| List | **Crew** (Klaviyo list ID: `SUpRkF`) |
| Roughly | General newsletter audience — anglers who opted in via popup, footer, or sticker campaign |
| Tone they expect | First-person from Thomas, real-angler voice, no marketing sheen |
| Suppression | Default Klaviyo suppression filters; no extra excludes |

## 3. Subject + sender metadata

| Field | Value |
|---|---|
| **Subject** | `New patterns, new stickers, and Buy-5-Get-1-Free is live` |
| **Preview text** | `The Jersey Boy & Secret Bloodworm just hit the catalog · 3 brown-trout stickers · May chironomid timing` |
| **From name** | `Thomas at Trout Tricks` |
| **From email** | `thomas@trouttricks.com` |
| **Reply-to** | Same as From (Thomas reads every reply) |
| **Internal campaign name** | `May 2026 — What's New Round-up` |

## 4. Send timing

- **Send today or tomorrow** — the promo just launched today; freshness matters.
- Suggested window: Tue/Wed 10am MT or 5pm MT (matches when Crew audience reads email).
- Avoid weekends (engagement drops on this audience).

---

## 5. Layout — section by section

**Container:** 600px max-width, centered, white card on warm off-white background (`#f7f4ee`).

### Block 1 — Header bar (dark)
- Background: `#1a1a1a` (near-black)
- Centered: `TROUT TRICKS` wordmark (white, uppercase, letter-spaced)
- Subtext below: `Stillwater Patterns · Colorado-Tied` in gold (`#d4af37`)
- Wordmark links to homepage (UTM-tracked — see Link Map)

### Block 2 — Intro copy
**Headline (h1):** `A lot has changed at the vise.`

**Body (2 paragraphs):**
> Wanted to send a quick update — new patterns hit the catalog, three new brown-trout stickers dropped, and we just rolled out a volume reward that gets you a free pack on bigger orders. Plus a fresh blog on dialing May chironomid timing in Colorado.
>
> Here's everything in one place.

### Block 3 — Promo banner (green, eye-catching)
- Background: `#2ecc71` (green) with rounded corners
- White text, centered
- **Eyebrow (small):** `🎁 NEW AUTO-APPLIED PROMOS`
- **Main (bold, 18px):**
  > FREE Surprise Sticker with any fly pack
  > Buy 5 packs · 1 FREE pack
- **Footnote (small):** `No code needed — applies automatically at checkout`

### Block 4 — New Fly Patterns
- **Eyebrow:** `NEW FLY PATTERNS` (red `#E74C3C`, uppercase, letter-spaced)
- **Headline:** `Just hit the catalog`
- **2-column grid below** — image on top, copy below each:

| | Left card | Right card |
|---|---|---|
| Image | `images/jersey-boy.jpg` | `images/bloodworm1.png` |
| Badge | Guide Pattern | Top Secret |
| Name | The Jersey Boy | Secret Bloodworm |
| Description | `Collab pattern with Ryan "Jito" Garcia. Built for technical eats — translates straight to Colorado stillwater.` | `Purple-hued color shift gets trophy trout to commit when standard reds get refused.` |
| Price | $21 / 5-pack | $21 / 5-pack |
| Links to | `/flies/the-jersey-boy.html` | `/flies/secret-bloodworm.html` |

- **CTA button below grid:** `Shop All Patterns →` (red background `#E74C3C`, white text, centered, links to homepage `#catalog` anchor)

### Block 5 — New Stickers
- **Eyebrow:** `NEW STICKERS`
- **Headline:** `3 brown-trout designs`
- **Copy:** `Die-cut weatherproof vinyl. $5 each — or grab the **Browns 2-Pack** for $8 (save $2). Slap 'em on your vise, boat, or Yeti.`
- **3-column grid:** image + name only (no description — keep tight)

| | Col 1 | Col 2 | Col 3 |
|---|---|---|---|
| Image | `images/brown1.png` | `images/brown2.png` | `images/brown3.png` |
| Name | Brown Town | Butter Brown | Drop It Like It's Hot |
| Links to | `/flies/brown-town-sticker.html` | `/flies/butter-brown-sticker.html` | `/flies/drop-it-like-its-hot-sticker.html` |

- **CTA button:** `Shop All Stickers →` (dark/black background `#1a1a1a`, white text, links to `/stickers.html`)

### Block 6 — Fresh on the Blog
- **Eyebrow:** `FRESH ON THE BLOG`
- **Headline:** `May chironomid timing — read it before your next session`
- **Copy:** `Water temperature is the single best predictor of when chironomid hatches actually pop on Colorado stillwaters. Here's how to read it from shore, what windows matter in May, and how to time your day around the bug — not the clock.`
- **Primary link (bold red):** `Read: May Chironomid Hatch Timing →` → `/blog/may-chironomid-hatch-timing-water-temperature.html`
- **Smaller secondary line:**
  > Also new: [Antero Closed 2026 — 4 Lakes to Fish Instead] · [Colorado Drought 2026 & Stillwater]

### Block 7 — Closer
- **Body:**
  > Hit reply with what you want to see next — patterns, water, write-ups, all of it. I read every one.
- **Signoff:**
  > Tight lines,
  > **Thomas**

### Block 8 — Footer (dark)
- Background: `#1a1a1a`
- Centered, small text, light gray (`#999`)
- Social row (gold `#d4af37` links): `Instagram · TikTok · trouttricks.com`
- Address line: `Trout Tricks · Fairmount, Colorado · thomas@trouttricks.com`
- Unsubscribe: `You're getting this because you joined the Trout Tricks Crew. [Unsubscribe]` (use Klaviyo's `{% raw %}{% unsubscribe %}{% endraw %}` tag for the link)

---

## 6. Asset reference

All images live at `https://www.trouttricks.com/images/`. Use absolute URLs in email so they render.

| Asset | URL | Alt text | Suggested display size |
|---|---|---|---|
| Jersey Boy | `https://www.trouttricks.com/images/jersey-boy.jpg` | `The Jersey Boy chironomid` | ~260px wide |
| Secret Bloodworm | `https://www.trouttricks.com/images/bloodworm1.png` | `Secret Bloodworm` | ~260px wide |
| Brown Town sticker | `https://www.trouttricks.com/images/brown1.png` | `Brown Town Sticker` | ~170px wide |
| Butter Brown sticker | `https://www.trouttricks.com/images/brown2.png` | `Butter Brown Sticker` | ~170px wide |
| Drop It Like It's Hot sticker | `https://www.trouttricks.com/images/brown3.png` | `Drop It Like It's Hot Sticker` | ~170px wide |

## 7. Link map (every link UTM-tagged)

All links append: `?utm_source=klaviyo&utm_medium=email&utm_campaign=may-2026-roundup&utm_content=<section>`

| Where | Destination | utm_content |
|---|---|---|
| Header logo | `https://www.trouttricks.com/` | `header-logo` |
| Jersey Boy card | `https://www.trouttricks.com/flies/the-jersey-boy.html` | `jersey-boy` |
| Secret Bloodworm card | `https://www.trouttricks.com/flies/secret-bloodworm.html` | `bloodworm` |
| Shop All Patterns CTA | `https://www.trouttricks.com/#catalog` | `shop-flies` |
| Brown Town sticker | `https://www.trouttricks.com/flies/brown-town-sticker.html` | `brown-town` |
| Butter Brown sticker | `https://www.trouttricks.com/flies/butter-brown-sticker.html` | `butter-brown` |
| Drop It Like It's Hot | `https://www.trouttricks.com/flies/drop-it-like-its-hot-sticker.html` | `drop-it` |
| Shop All Stickers CTA | `https://www.trouttricks.com/stickers.html` | `shop-stickers` |
| Primary blog link | `https://www.trouttricks.com/blog/may-chironomid-hatch-timing-water-temperature.html` | `may-chironomid-post` |
| Antero secondary link | `https://www.trouttricks.com/blog/antero-replacement-playbook.html` | `antero-replacement` |
| Drought secondary link | `https://www.trouttricks.com/blog/colorado-drought-stillwater-2026.html` | `drought-post` |
| Instagram | `https://www.instagram.com/trouttricks` | — |
| TikTok | `https://www.tiktok.com/@trouttricks` | — |

## 8. Visual style guide

**Colors:**
- Brand red: `#E74C3C` — accents, eyebrow labels, primary CTA, blog link
- Brand gold: `#d4af37` — subtle highlights, social links in footer
- Dark: `#1a1a1a` — header bar, footer, secondary CTA
- Promo green: `#2ecc71` — the promo banner only
- Body text: `#222` on white card
- Card background: `#ffffff`
- Page background: `#f7f4ee` (warm off-white — softer than pure gray)
- Borders/dividers: `#e8e2d6`
- Muted text (footer, secondary): `#999`

**Typography:**
- Use Arial/Helvetica fallback stack (web fonts are unreliable in email)
- H1: 24px, weight 700
- H2: 22px, weight 700
- Body: 14–15px, line-height 1.55–1.6
- Eyebrow labels: 11px, uppercase, letter-spaced 0.2em
- Footer: 12px

**Spacing:**
- Outer card padding: 32px horizontal, 24–32px vertical between sections
- Section dividers: 1px line in `#e8e2d6`, centered between major sections (between blocks 4/5, 5/6)

## 9. Voice / copy notes (IMPORTANT — Trout Tricks brand rules)

- **First-person from Thomas** — never corporate "we" speak
- **Real-angler language** — written like a fishing buddy, not a marketer
- **Banned phrases:** "premium quality," "industry-leading," "experience the difference," "shop our collection"
- **Preferred terminology:**
  - "patterns" not "products"
  - "tier" not "shop"
  - "tying bench" not "workshop"
- **Ethics:** Spawn timing yes, spawn locations no (not relevant here but good context)
- **Tone check:** If a sentence sounds like it could be from any DTC brand, rewrite it. If it sounds like Thomas talking at the boat ramp, keep it.

## 10. Technical / Klaviyo build notes

- **Builder:** Klaviyo's drag-and-drop email editor. Use **Image + Text blocks** for the product/sticker cards (cleaner than raw HTML for mobile responsiveness).
- **HTML reference file:** `2026-05-19-whats-new-roundup.html` in the same folder shows working table-based layout if you need a fallback or want to paste-in via "Source Code" block.
- **Image hosting:** All images already live on the site CDN; no asset uploads needed.
- **Unsubscribe link:** Must use Klaviyo's `{% raw %}{% unsubscribe %}{% endraw %}` tag — don't hardcode a URL.
- **Mobile:** All cards should stack to single-column under 480px viewport. The drag-and-drop builder handles this automatically; if pasting raw HTML, the included tables degrade reasonably but aren't perfect.
- **Dark mode:** Some clients (Gmail, Apple Mail) auto-invert. Test in preview. White card on warm background should hold up.

## 11. Pre-send checklist (acceptance criteria)

Before hitting Send:

- [ ] Subject + preview text show correctly in inbox preview (Klaviyo's Preview & Test)
- [ ] All 5 product images load (Jersey Boy, Bloodworm, 3 stickers)
- [ ] Promo green banner renders correctly with white text
- [ ] Every link works — click at least: header logo, Jersey Boy card, Shop All Patterns, one sticker, blog link
- [ ] Tested on **mobile** (iOS Mail or Gmail app) AND **desktop** (Gmail web or Outlook web)
- [ ] Reply-to is `thomas@trouttricks.com` (not a no-reply)
- [ ] Unsubscribe link present in footer and resolves to Klaviyo's hosted page
- [ ] Audience = Crew list, NOT all-contacts
- [ ] No typos in subject line (auto-correct can sneak in "Buy-5-Get-1-FREE is alive")

## 12. Post-send measurement

- Klaviyo dashboard: open rate, click-through, unsubscribes
- GA4 → Acquisition → Traffic acquisition → filter `campaign = may-2026-roundup` for session-level attribution by section (each `utm_content` value)
- Watch for any "out of office" auto-replies that suggest broken targeting

---

**Questions during build?** Reply to Thomas at `thomas@trouttricks.com` or `stillwaterflies5280@gmail.com`. He'd rather you ask than guess on copy/links/tone.
