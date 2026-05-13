# Sticker Round 1 — recovery email

**Hold sending until Thomas reviews and picks the actual discount code.** Placeholder `TKTKTK` in the body — replace before sending.

**Klaviyo segment / send list:** the orphan list from `assets/sticker-r1-orphans.md`. Upload as a one-off Klaviyo segment OR send via Apps Script with MailApp.sendEmail in a loop (slower, but cleaner per-recipient personalization).

**UTM** (if you link to anything in the email — currently no link, but if Round 2 lands and you want to repurpose this template):
`?utm_source=klaviyo&utm_medium=email&utm_campaign=sticker-r1-recovery&utm_content=apology`

---

## Subject

> Hey {{ first_name|default:"angler" }} — owe you a story and a code

---

## Preheader

> Round 1 stickers ran out before you got in. That's on me. Here's the make-good.

---

## Body

> Hi {{ first_name|default:"angler" }},
>
> Quick honest note. You signed up for a free sticker at trouttricks.com a few days back and you never got one. That's because Round 1 sold out at 15 — and the form on my site should've closed the moment we hit cap. It didn't. So your address landed in a queue I can't fulfill, and you've been sitting in the dark wondering where the sticker is.
>
> That's on me. Apologizing for it.
>
> The make-good:
>
> 1. **10% off your first Trout Tricks order — code `TKTKTK`.** Works on every fly, sticker, and bundle in the shop. No expiry on the code, but it ages out the moment you use it. Just one per customer.
> 2. **First dibs on Round 2.** When the next free-sticker batch opens, you'll get the link from me 24 hours before the public drop. No fighting the form again.
>
> The site bug is fixed (the giveaway page now closes properly the second we hit cap). If you'd rather just take the 10% code and grab a sticker that way, the catalog is at trouttricks.com — every sticker's listed there.
>
> Either way — sorry for the radio silence. Real talk: this is what I get for shipping a campaign without enough fail-safes. Won't happen the same way twice.
>
> Tight lines,
> Thomas
> Trout Tricks · Fairmount, CO

---

## Notes for the send

- **Code:** swap `TKTKTK` for the real code Thomas creates. Suggestion: `STICKER10` or `R1SORRY` (the second is more on-brand for the apology framing).
- **Code setup:** before sending, create the code in the cart system (likely Square dashboard if that's where promos live, OR if cart codes are hardcoded in `js/catalog.js` then add it there). Test the code applies correctly on a test order first.
- **Send batch size:** if orphan list is < 50 people, send one-off from Klaviyo with personalized merge tags. If 50+, queue in batches of 25 spaced 10 minutes apart to avoid Klaviyo's deliverability throttles.
- **Reply-to:** set to `thomas@trouttricks.com` so any genuine responses ("hey, the code's not working" / "thanks for the heads-up") land where you can actually see them.
- **Klaviyo sender-domain auth (#49):** must be resolved before this sends, or the apology will land in spam folders alongside the original missing-sticker silence. Compounding insult.
- **Round 2 promise:** keep it. The "first dibs 24 hr before public" is a real commitment — make a note in your launch plan for Round 2 so you actually email this segment first.
