# Drop launch — Paid Meta ads brief

Objective: drive **waitlist signups on /the-drop.html**. Pay per lead, scale what works.

**UTM lock:**
`https://www.trouttricks.com/the-drop.html?utm_source=meta&utm_medium=paid-social&utm_campaign=drop-launch&utm_content={ad-creative}`

Per creative concept:
- Concept A: `utm_content=photo-founding-10`
- Concept B: `utm_content=carousel-mastermind`
- Concept C: `utm_content=video-knowledge-gap`

---

## Campaign structure

**Campaign objective:** Leads (formerly "Conversions") with the **Lead** event mapped to `add_to_cart` or a custom `drop_waitlist` event — depends on whether you have the Meta Pixel firing a custom event on submitting the /the-drop waitlist form. If not, fall back to **Traffic** for testing and switch to Leads once the event fires.

**Buying type:** Auction.

**Budget:** $20/day for 5 days = **$100 total test budget** as agreed. Bid strategy: **Highest volume** (let Meta optimize until you have ~50 conversions of data).

**Schedule:** run continuously for 5 days. Don't dayparted-restrict (the algorithm needs the full 24-hr window to find the audience).

**Optimization event:** Landing page views (initial 48 hrs) → switch to Leads once you've got the Pixel custom event firing reliably.

**Ad set count:** 1 ad set to start. Don't fragment $100 across multiple ad sets — you'll burn through budget without learning anything.

**Placement:** Automatic (Meta + Instagram + Facebook + Messenger). Let the algorithm pick. After 5 days of data, kill the bottom 50% of placements and re-run.

---

## Audience (interest stack)

**Geography:**
- Colorado (state) — primary
- Wyoming (state) — secondary, lower budget weight
- Optional: northern New Mexico if your data ever supports it later

**Age:** 28–55 (tighten to 28–49 after first 5 days if signups are skewing young)

**Gender:** All

**Detailed targeting (interest stack — Meta's "Interests"):**

Layer 1 — Fly fishing core (pick all that have ~500K+ Meta audience size):
- Fly fishing
- Fly tying
- Trout fishing
- Stillwater fly fishing (if surfaced)

Layer 2 — Geographic / water-specific interest (these may not all exist as Meta-defined interests — try each, drop the ones with audience size <10K):
- Antero Reservoir
- Spinney Mountain Reservoir
- Eleven Mile Reservoir
- Delaney Buttes Lake
- Lake John (Colorado)
- Carter Lake
- Horsetooth Reservoir

Layer 3 — Adjacent interests (engage when fly-fishing-specific is too narrow):
- Outdoor recreation
- Fishing
- Trout Unlimited
- Orvis, Simms Fishing Products, Umpqua Feather Merchants (brand interests)

**Behaviors:**
- Engaged shoppers
- Outdoor activities enthusiasts

**Detailed targeting expansion:** ON. Let Meta find lookalikes outside the stack you defined. This compounds with your interest stack and usually drops CPL.

**Exclusions (CRITICAL — don't pay to acquire people you already have):**
- Custom Audience: upload your Klaviyo Crew list (master list `SUpRkF`) as a Customer File. Exclude.
- Custom Audience: people who've visited /the-drop in the last 30 days (Pixel-based, exclude — they're either already on waitlist or saw it and bounced; retarget those separately).

**Lookalikes (defer to round 2):** once you have 50+ waitlist signups, build a 1% lookalike of those signups. That's your second campaign after this test wave.

---

## Creative concepts (3 to test in rotation)

### Concept A — Photo + scarcity copy (Founding-10 angle)

**Image:** dark background, gold-rule headline "Founding 10 · $20/mo locked for life". Subtext: "After 10, standard rate $35/mo. Forever." Maybe a small Trout Tricks wordmark in the corner. Clean, not busy.

**Primary text (the big chunk of copy above the image — 125 char visible before "See more"):**

> Built something for serious Colorado stillwater anglers — bi-weekly mastermind call, ten members max, $20/mo locked for life if you're in the first ten.

> The Drop is a working group for the anglers who already know depth beats pattern and want to dial it faster. Bi-weekly call. Real intel. Real anglers. Real water.
>
> Members bring conditions, food sources, recent trips, rigs that aren't earning — we work problems together. Less webinar, more ten of us in a room comparing notes.
>
> Founding 10 lock in $20/mo for life. After that, $35/mo forever. Founding opens when the waitlist hits 25.
>
> Get on it.

**Headline (under the image — 27 char limit on Meta):**
"Founding 10 — $20/mo for life"

**Description (under the headline — 27 char optional):**
"CO stillwater mastermind"

**CTA button:** "Sign Up"

### Concept B — Carousel: 5-slide mastermind walkthrough

**Slide 1 — Hook image:** vise shot, fly in progress. Text overlay: "The 17-foot gap most CO stillwater anglers don't talk about."

**Slide 2 — Knowledge gap:** text-only slide, dark bg: "Generic YouTube can teach you how to *tie* a chironomid. It can't tell you what's hitting at 17 feet on Antero this Tuesday."

**Slide 3 — Format:** text-only slide: "The Drop · bi-weekly live call · ten members max · members bring intel · we work problems together · not a webinar."

**Slide 4 — Pitch:** lake shot, text overlay: "For the anglers who already know depth beats pattern — and want to dial it faster."

**Slide 5 — Founding-10:** gold-on-black: "Founding 10 · $20/mo locked for life · After 10, $35/mo. Forever." CTA arrow on the image.

**Primary text (above the carousel):**

> There's a gap between general fly fishing knowledge and right-now Colorado stillwater knowledge. That gap is what burns trips.
>
> Started a mastermind for the anglers feeling it. Bi-weekly live call. Ten members max. Founding 10 at $20/mo locked for life.

**Headlines (each slide can have its own — keep them short):**
1. "The 17-ft gap"
2. "Right-now intel"
3. "Mastermind, not webinar"
4. "For working anglers"
5. "Founding 10 — $20/mo"

**CTA button:** "Sign Up"

### Concept C — Video (15–30 sec, repurposed from the IG Reel)

**Reuse Script 3 from the Instagram drafts** (the Reel script). Re-cut to 15–30 sec — Meta runs hotter than IG on shorter video.

**Cut for paid:**
- Strip the "let me build to the pitch" — paid needs the offer earlier
- Open with the gap line + immediately stack the offer

**Cut version (~20 sec):**

[0:00] "There's a 17-foot gap that ruins most Colorado stillwater trips. It's the depth column."
[0:04] "Generic YouTube can teach you to tie a chironomid. It can't tell you what's hitting on Antero this Tuesday."
[0:10] "I built a working group for the anglers who want right-now intel. Bi-weekly call, ten members max."
[0:16] "Founding 10 — $20/mo locked for life. Link below."

**Primary text:**

> Bi-weekly mastermind for serious Colorado stillwater anglers. Founding 10 lock in $20/mo for life. Link below.

**Headline:** "The Drop · $20/mo locked"
**CTA button:** "Sign Up"

---

## Copy variants to A/B test

Within each Concept, rotate 2–3 primary-text variants. Meta's algorithm will pick the winner inside ~48 hrs of data.

**Variant 1 — Pain-point opener (default in the briefs above)**
"There's a 17-foot gap that ruins most CO stillwater trips..."

**Variant 2 — Curiosity opener**
"Most anglers fishing CO stillwaters waste their first two trips of the season relearning waters that ten other people already have figured out. There's a fix."

**Variant 3 — Direct opener**
"Bi-weekly mastermind for serious Colorado stillwater anglers. Founding 10 lock in $20/mo for life. Ten members max."

---

## What to watch in the first 48 hrs

| Metric | Target | If you miss target |
|---|---|---|
| **CPM** (cost per 1K impressions) | <$15 | If $20+: audience too tight, broaden Layer 2 |
| **CTR** (click-through rate) | >1.0% | If <0.6%: kill the creative, swap variant |
| **CPC** (cost per click) | <$1.00 | If $1.50+: refine targeting OR kill creative |
| **CPL** (cost per lead — waitlist signup) | <$5 — kill candidate; <$10 — iterate; <$2 — scale | After 5 days you'll know |
| **Frequency** (impressions per person) | <2.5 | If 3+: audience too small, broaden geo or interests |

**Kill criteria after 5 days ($100 spent):**
- If 0 leads at $100 spend → kill, regroup, don't double-budget into the same setup
- If 1–5 leads → marginally viable; rebuild ad set with tighter targeting + iterated copy
- If 5–10 leads → keep running, scale to $50/day
- If 10+ leads → scale to $100/day and build lookalike audience for round 2

---

## Required setup before launching

- [ ] **Meta Pixel** firing on /the-drop.html — verify in Events Manager. Custom event `drop_waitlist` on submit, with $20 value param.
- [ ] **Conversion API (CAPI)** wired server-side as backup to Pixel (iOS 14+ kills client-side tracking otherwise). Apps Script can post to the CAPI endpoint when it processes the waitlist submission.
- [ ] **Klaviyo Crew custom audience** uploaded to Meta and excluded (don't pay to re-acquire your own list).
- [ ] **/the-drop ad-account permissions** — make sure your personal Meta ad account has access to the Trout Tricks Page.
- [ ] **Domain verified** in Meta Business Settings for trouttricks.com (drops CPL ~20%).
- [ ] **3 creatives + 6–9 copy variants** uploaded and ready to launch as a single ad set with creative-rotation enabled.

---

## When to launch

**Hold until Klaviyo sender-domain auth is resolved** (#49). Why: a waitlist signup that should trigger a welcome email but gets blocked by the unauthenticated sender flow = lost lead. Once Klaviyo Welcome flow is firing reliably, you can hit "Publish" on the campaign.

If you want to test creative early without sending traffic to a broken flow: run the campaign with **Traffic** objective for the first 24 hrs (no Lead optimization), measure CTR + CPC only, then switch to Leads once Klaviyo is live.

---

## Sticker overlap

Per the no-organic-FB-group rule, sticker campaign Meta ads are still allowed and run on a **separate campaign** with **separate UTMs** (`utm_campaign=sticker-r2-launch` not `drop-launch`). Don't pool the budget. The audiences may overlap but the funnel is different.
