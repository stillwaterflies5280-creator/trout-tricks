# Drop launch — Email follow-up flow (Klaviyo, 2 emails)

Klaviyo flow logic for newsletter subscribers who clicked through to /the-drop.html but didn't submit the waitlist form within 48 hours.

**Flow trigger:** Klaviyo "Active on Site — visited /the-drop.html" event from the master list (`SUpRkF`).

**Flow gate (filter):** has NOT triggered "Drop Waitlist Signup" event since flow entry. Re-evaluate after each delay.

**Delays:**
- Email 1: 48 hours after trigger
- Email 2: 7 days after trigger (5 days after Email 1)

**Stop condition:** if they submit the waitlist at any point, exit the flow. (Klaviyo handles this via the "has NOT" filter on each email step.)

**UTM:**
`https://www.trouttricks.com/the-drop.html?utm_source=klaviyo&utm_medium=email&utm_campaign=drop-launch&utm_content={email-id}`

- Email 1: `utm_content=followup-48h-objection-handler`
- Email 2: `utm_content=followup-7d-last-call`

---

## EMAIL 1 — 48-hour reminder + objection-handler

**Subject:** You looked at The Drop. Quick thing.

**Preheader:** One question that's worth answering before the waitlist closes.

**Body:**

> Hi {{ first_name|default:"angler" }},
>
> Saw you swung by The Drop page a couple days ago. No pressure to sign up — but I figured I'd answer the question most people ask before they put their name on the list.
>
> **"Is this for me if I only fish stillwaters a few times a year?"**
>
> Honest answer: probably not yet. The Drop is built for anglers fishing CO stillwaters 5+ times a year — folks already running indicators and balanced leeches, who want to dial conditions and technique faster. If you're fishing once or twice a season, the free Crew newsletter covers what you need. Save the $20.
>
> If you're fishing every couple of weeks and the same questions keep coming up — depth column shifting, what color chironomid is earning on Spinney this Tuesday, why your indicator drift is missing eats — that's the gap The Drop fills. Bi-weekly call, ten members, members bring intel, we work problems together. Less webinar, more ten of us in a room comparing notes.
>
> Founding 10 still open — $20/mo locked for life. After those 10 fill, standard is $35/mo. Waitlist gates founding access; founding opens once 25 anglers are on it.
>
> If that's still the right speed for you:
>
> [JOIN THE WAITLIST →]
> https://www.trouttricks.com/the-drop.html?utm_source=klaviyo&utm_medium=email&utm_campaign=drop-launch&utm_content=followup-48h-objection-handler
>
> If not, no hard feelings. The Crew newsletter still gets the patterns and the lake reports — that part doesn't change.
>
> Tight lines,
> Thomas
> Trout Tricks · Fairmount, CO

---

## EMAIL 2 — 7-day last call + personal pitch

**Subject:** One more thing before I stop bringing it up

**Preheader:** Why I built this in the first place — and why I'm only opening it once.

**Body:**

> Hi {{ first_name|default:"angler" }},
>
> Last note on The Drop, then I'll get out of your inbox on this.
>
> Quick why: I started getting the same questions from the same anglers every time my regulars came back from a trip. "Why is Spinney bite shifting at 14 ft?" "What chironomid color is hitting on Antero in May?" "How deep am I missing on 11 Mile?" Good questions. But buried in DMs that the next angler can't see.
>
> So I built a forum where the answers compound instead of getting lost. Ten serious CO stillwater anglers, bi-weekly call, real-time intel sharing. Mastermind format, not webinar. Members bring what they're seeing — conditions, food sources, recent trips, rigs that aren't earning — and we work problems together. I anchor with tying-bench context.
>
> Why founding 10 at $20/mo locked for life: the first 10 are taking a bet on a new thing. The rate is my thank-you. After those 10 fill, founding closes forever and the rate moves to $35/mo.
>
> The waitlist gates access — founding 10 opens once 25 anglers are on it. If that sounds like your speed:
>
> [CLAIM YOUR FOUNDING SEAT →]
> https://www.trouttricks.com/the-drop.html?utm_source=klaviyo&utm_medium=email&utm_campaign=drop-launch&utm_content=followup-7d-last-call
>
> If not, all good. I'll stop nudging. The Crew newsletter still ships every week with the patterns and the lake reports — that's not going anywhere.
>
> Tight lines,
> Thomas
> Trout Tricks · Fairmount, CO

---

## Klaviyo flow build notes (for the Klaviyo session)

**Required setup before this flow can fire:**

1. **Active on Site tracking** must be enabled in Klaviyo for trouttricks.com. Confirm the Klaviyo Pixel is firing on /the-drop.html.
2. **Custom event** `Drop Waitlist Signup` defined in Klaviyo with the properties: `email`, `first_name`, `founding_interest`. The /the-drop.html form already POSTs to Klaviyo with `custom_source="The Drop Waitlist"` — verify the event is firing and named correctly.
3. **Sender domain auth (#49)** must be resolved before this flow goes live. Without auth, both emails will land in spam.

**Flow logic:**

```
Trigger: "Active on Site" event
  → Filter: page URL contains "/the-drop"
  → Filter: has NOT triggered "Drop Waitlist Signup" since trigger
       → Wait 48 hours
       → Filter (re-evaluate): has NOT triggered "Drop Waitlist Signup"
       → Send Email 1 (48-hour reminder)
       → Wait 5 days (= 7 days from trigger)
       → Filter (re-evaluate): has NOT triggered "Drop Waitlist Signup"
       → Send Email 2 (7-day last call)
       → Exit
```

**Smart send time:** ON (Klaviyo's default — send during recipient's typical engagement window).
**Quiet hours:** ON (9 PM–8 AM recipient time).
**Skip recipients without first_name?** NO — the `{{ first_name|default:"angler" }}` fallback handles that.

**A/B variants if you want them after first 50 entries:**
- Email 1: subject A "You looked at The Drop. Quick thing." vs subject B "Question before you sign up to The Drop"
- Email 2: subject A "One more thing before I stop bringing it up" vs subject B "Last note on The Drop, then I'll stop"

---

## Expected behavior

In a healthy funnel with these emails:
- **30–40% open rate** on Email 1 (already engaged audience — they visited the page)
- **8–12% click-through rate** on Email 1 → /the-drop
- **3–6% conversion rate** from those clicks
- Email 2 typically drops open rate to 22–30% but pulls in another ~25% of remaining holdouts

So if 100 people hit /the-drop and don't submit:
- Email 1 → ~10 click-through → ~3 sign up
- Email 2 → ~6 click-through → ~2 sign up
- Total recovered: ~5 of the 100

Not huge in absolute numbers — but compounds against your paid acquisition cost, since these are people you already paid to acquire once.
