// Shared Trout Tricks catalog — flies, sticker images, fly images, slugifier.
// Single source of truth: this file is loaded by every page that needs flies[]
// (cart lookups, catalog rendering, per-fly pages). To add/edit a fly, change
// it here ONLY. Generated per-fly pages should be re-run after edits via
// /scripts/generate-fly-pages.py.

const flies = [
  {
    id: 1, img: "fly1",
    name: "Muskie Buzzer",
    desc: "A deadly buzzer pattern discovered by Musky John and designed to attract and land trophy trout. Tied on 2x heavy wire hooks with a realistic wing case that seals the deal.",
    sizes: ["#12","#14","#16","#18"],
    colors: null,
    price: 25,
    pack: 5,
    badge: "Top Secret"
  },
  {
    id: 3, img: "ironman", gallery: ["ironman", "fly3"],
    name: "Top Secret Ironman",
    desc: "Built tough for pressured water. The Ironman is a durable, high-contrast chironomid that holds up through dozens of strikes. A staple in any stillwater box.",
    sizes: ["#8","#10","#12","#14"],
    colors: null,
    price: 25,
    pack: 5,
    badge: "Top Secret"
  },
  {
    id: 8, img: "fly8",
    name: "Top Secret Winged Duck",
    desc: "No description necessary.",
    sizes: ["#12","#14","#16","#18"],
    colors: null,
    price: 25,
    pack: 5,
    badge: "Top Secret"
  },
  {
    id: 9, img: "fly9",
    name: "Top Secret Winged Cone",
    desc: "No description necessary.",
    sizes: ["#12","#14","#16","#18"],
    colors: null,
    price: 25,
    pack: 5,
    badge: "Top Secret"
  },
  {
    id: 25, img: "bloodworm1", gallery: ["bloodworm1", "bloodworm"],
    name: "Secret Bloodworm",
    desc: "Secret purple-hued bloodworm. The color shift gets trophy trout to commit when standard reds get refused. Tied on 2x heavy hooks for the bigger eat.",
    sizes: ["#12","#14","#16"],
    colors: null,
    price: 21,
    pack: 5,
    badge: "Top Secret"
  },
  {
    id: 26, img: "jersey-boy",
    name: "The Jersey Boy",
    desc: "Collab pattern dialed in with master angler and tier Ryan \"Jito\" Garcia. Built for the technical eats Jito earns on his home water — translates straight to the Colorado stillwater rotation. Tied on 2x heavy.",
    sizes: ["#12","#14","#16"],
    colors: null,
    price: 21,
    pack: 5,
    badge: "Guide Pattern"
  },
  {
    id: 27, img: "scud1", gallery: ["scud1", "scud2", "scud3"],
    name: "Bling Scud",
    desc: "Flash scud back, antennas, tied on 2x heavy wire. The scud is the unsung hero of stillwater — match the bug profile in olive, tan, or grey. Fish it deep along weed lines, shoals, and rocky drop-offs.",
    sizes: ["#14","#16"],
    colors: ["Olive","Tan","Grey"],
    price: 25,
    pack: 5,
    badge: "Guide Pattern"
  },
  {
    id: 2, img: "fly2",
    name: "Chocolate Gold",
    desc: "Sleek, flashy, and tungsten-loaded. A proven guide pattern that sinks fast and triggers strikes when nothing else will. The go-to when fish are deep.",
    sizes: ["#12","#14","#16","#18"],
    colors: null,
    price: 21,
    pack: 5,
    badge: "Guide Pattern"
  },
  {
    id: 4, img: "fly4",
    name: "Snow Cone (Frank\'s Red Hot Ronnie)",
    desc: "Black thread, red wire, white bead — a classic combination that trout simply cannot refuse. One of the most recognizable and productive chironomid patterns on the water.",
    sizes: ["#12","#14","#16","#18"],
    colors: null,
    price: 21,
    pack: 5,
    badge: null
  },
  {
    id: 5, img: "fly5",
    name: "Chirono\'midge\'",
    desc: "An absolute killer searching pattern that works everywhere — lakes, tailwaters, slow runs. Tungsten bead on 2x heavy wire hooks. When you don\'t know what they\'re eating, tie this on.",
    sizes: ["#12","#14","#16","#18"],
    colors: null,
    price: 21,
    pack: 5,
    badge: "Searching Pattern"
  },
  {
    id: 6, img: "fly6",
    name: "Burnt Wino",
    desc: "A fire-kissed variation of the legendary Wino pattern, inspired by tier Kyle Glass. Tungsten bead on 2x heavy wire hooks. Deep color and earthy tones that big fish recognize.",
    sizes: ["#12","#14","#16","#18"],
    colors: null,
    price: 21,
    pack: 5,
    badge: null
  },
  {
    id: 7, img: "fly7",
    name: "Burnt Hopper",
    desc: "Absolutely stunning colors that trout cannot ignore. Tungsten bead on 2x heavy wire hooks. This pattern turns heads both in the box and in the water.",
    sizes: ["#12","#14","#16","#18"],
    colors: null,
    price: 21,
    pack: 5,
    badge: null
  },
  {
    id: 28, img: "rusty-duck",
    name: "Rusty Ducks",
    desc: "A rusty-copper chironomid finished with a soft breather tuft up front. The warm rust body and gold-wire rib give off just enough flash to draw a look in clear or stained water, while the breather pulses on the rise to seal the eat. Tied on 2x heavy wire for the deep stillwater game.",
    sizes: ["#12","#14","#16","#18"],
    colors: null,
    price: 21,
    pack: 5,
    badge: "New"
  },
  {
    id: 29, img: "franks-red-hot-ronnie-2",
    name: "Frank\'s Red Hot Ronnie 2.0",
    desc: "The next evolution of Frank\'s Red Hot Ronnie. Same deadly black-body, red-wire, white-bead recipe — now tied slimmer with a glassy coated finish that adds durability and a wet-look shine trout cannot leave alone. A proven snow cone profile, dialed up.",
    sizes: ["#12","#14","#16","#18"],
    colors: null,
    price: 21,
    pack: 5,
    badge: "New"
  },
  {
    id: 10, img: "balanced-leech",
    name: "Balanced Leech",
    desc: "The stillwater angler's most versatile weapon. Suspended under an indicator with neutral buoyancy, this pattern triggers strikes when chironomids aren't cutting it. Tied on 2x heavy wire jig hooks for perfect balance and natural movement.",
    sizes: ["#10"],
    colors: ["Orange Bead / Black Marabou Tail","Orange Bead / Olive Marabou Tail","Orange Bead / Black Leech Leather Tail","Orange Bead / Olive Leech Leather Tail","Black Bead / Black Marabou Tail","Black Bead / Olive Marabou Tail","Black Bead / Black Leech Leather Tail","Black Bead / Olive Leech Leather Tail","Chartreuse Bead / Black Marabou Tail","Chartreuse Bead / Olive Marabou Tail","Chartreuse Bead / Black Leech Leather Tail","Chartreuse Bead / Olive Leech Leather Tail","Gold Bead / Brown Marabou Tail"],
    price: 25,
    pack: 5,
    badge: "Staff Pick"
  },
  {
    id: 11, img: "mayers1",
    gallery: ["mayers1","mayers2","mayers3","mayers4"],
    name: "Mayer's Leech",
    desc: "A stillwater classic refined for Colorado's high-altitude reservoirs. Slim profile, subtle movement, and deadly in the film or just below. When trout are finicky and chironomids aren't enough, this is the pattern to tie on. A consistent producer on Spinney, Antero, and 11 Mile.",
    sizes: ["#14"],
    colors: ["Orange Bead / Black Marabou Tail","Orange Bead / Olive Marabou Tail","Black Bead / Black Marabou Tail","Black Bead / Olive Marabou Tail","Chartreuse Bead / Black Marabou Tail","Chartreuse Bead / Olive Marabou Tail","Gold Bead / Brown Marabou Tail"],
    price: 21,
    pack: 5,
    badge: "Hatch-Tested"
  },
  {
    id: 12, img: "micro1", gallery: ["micro1","micro2"],
    name: "Micro Leech",
    desc: "When trophy trout get finicky and refuse larger presentations, downsize to the Micro Leech. Tied on a size 16 hook with the same deadly color combinations as our full-size leeches — just smaller, more subtle, and often more effective in pressured or clear water conditions.",
    sizes: ["#16"],
    colors: ["Orange Bead / Black Marabou Tail","Orange Bead / Olive Marabou Tail","Black Bead / Black Marabou Tail","Black Bead / Olive Marabou Tail","Chartreuse Bead / Black Marabou Tail","Chartreuse Bead / Olive Marabou Tail","Gold Bead / Brown Marabou Tail"],
    price: 21,
    pack: 5,
    badge: "New"
  },
  {
    id: 15, img: "stickerFishOn",
    name: "Fish On Sticker",
    desc: "Die-cut weatherproof vinyl. The look when the indicator drops and your eight-weight loads up. Slap it on your vise, boat, or Yeti.",
    sizes: null,
    colors: null,
    price: 5,
    pack: null,
    badge: null,
    category: "sticker"
  },
  {
    id: 23, img: "brown3",
    name: "Drop It Like It's Hot Sticker",
    desc: "Die-cut weatherproof vinyl. For the moment the indicator drops and the rod loads. Slap it on your vise, boat, or Yeti.",
    sizes: null,
    colors: null,
    price: 5,
    pack: null,
    badge: null,
    category: "sticker"
  },
  {
    id: 21, img: "brown1",
    name: "Brown Town Sticker",
    desc: "Die-cut weatherproof vinyl. For the days the browns are stacked deep and you know exactly where you're headed. Slap it on your vise, boat, or Yeti.",
    sizes: null,
    colors: null,
    price: 5,
    pack: null,
    badge: null,
    category: "sticker"
  },
  {
    id: 22, img: "brown2",
    name: "Butter Brown Sticker",
    desc: "Die-cut weatherproof vinyl. Honors the buttery yellow-bellied browns that make a stillwater season. Slap it on your vise, boat, or Yeti.",
    sizes: null,
    colors: null,
    price: 5,
    pack: null,
    badge: null,
    category: "sticker"
  },
  {
    id: 16, img: "stickerDontJudge",
    name: "Don't Judge Me Sticker",
    desc: "Die-cut weatherproof vinyl. For the day you fish three flies on a 7x leader. Slap it on your vise, boat, or Yeti.",
    sizes: null,
    colors: null,
    price: 5,
    pack: null,
    badge: null,
    category: "sticker"
  },
  {
    id: 17, img: "stickerBuffet",
    name: "Buffet Mode Sticker",
    desc: "Die-cut weatherproof vinyl. When the trout are eating chironomids, callibaetis, and midges in the same pass. Slap it on your vise, boat, or Yeti.",
    sizes: null,
    colors: null,
    price: 5,
    pack: null,
    badge: null,
    category: "sticker"
  },
  {
    id: 18, img: "stickerBuzzers",
    name: "Got Buzzers? Sticker",
    desc: "Die-cut weatherproof vinyl. UK tying slang for chironomids — if you tie them, you know. Slap it on your vise, boat, or Yeti.",
    sizes: null,
    colors: null,
    price: 3,
    pack: null,
    badge: null,
    category: "sticker"
  },
  {
    id: 13, img: "sticker1", gallery: ["sticker1", "wordmarkreal"],
    name: "Trout Tricks Wordmark Sticker",
    desc: "Die-cut 3.25\" × 1.2\" weatherproof vinyl. Slap it on your boat, vise, or Yeti.",
    sizes: null,
    colors: null,
    price: 3,
    pack: null,
    badge: null,
    category: "sticker"
  },
  {
    id: 14, img: "sticker2",
    name: "Trout Tricks Square Sticker",
    desc: "Die-cut 3\" × 3\" weatherproof vinyl. Slap it on your boat, vise, or Yeti.",
    sizes: null,
    colors: null,
    price: 5,
    pack: null,
    badge: null,
    category: "sticker"
  },
  {
    id: 24, img: "brown1",
    name: "The Browns",
    desc: "Includes: Brown Town + Butter Brown. Two-pack of brown-trout stickers, $2 off retail ($10 → $8).",
    sizes: null,
    colors: null,
    price: 8,
    pack: null,
    badge: null,
    category: "sticker",
    bundle: true,
    bundle_includes: [21, 22]
  },
  {
    id: 19, img: "stickerFishOn",
    name: "The Greedy Trout Pack",
    desc: "Includes: Fish On + Don't Judge Me + Buffet Mode. The trout-cinematic-universe set, $3 off retail ($15 → $12).",
    sizes: null,
    colors: null,
    price: 12,
    pack: null,
    badge: null,
    category: "sticker",
    bundle: true,
    bundle_includes: [15, 16, 17]
  },
  {
    id: 20, img: "sticker1",
    name: "The Complete Collection",
    desc: "Includes: Fish On, Don't Judge Me, Buffet Mode, Got Buzzers?, Wordmark, and Square. Every Trout Tricks sticker — $6 off retail ($26 → $20).",
    sizes: null,
    colors: null,
    price: 20,
    pack: null,
    badge: "Best Value",
    category: "sticker",
    bundle: true,
    bundle_includes: [13, 14, 15, 16, 17, 18]
  },
  // === Cart-upsell variants (hidden from main catalog) ===
  // Same artwork as the regular Brown Town / Butter Brown / Drop It Like It's Hot
  // stickers (ids 21/22/23) but priced at $3 for the in-cart "Add a sticker for $3"
  // impulse upsell. Cart panel renders an "Add for $3" button per variant via
  // /js/promo-tiers.js. hiddenFromCatalog flag keeps them out of /stickers grids.
  {
    id: 121, img: "brown1",
    name: "Brown Town Sticker",
    desc: "Cart-upsell special — $3 (regularly $5).",
    sizes: null, colors: null,
    price: 3, pack: null, badge: null,
    category: "sticker",
    hiddenFromCatalog: true,
    upsellOf: 21
  },
  {
    id: 122, img: "brown2",
    name: "Butter Brown Sticker",
    desc: "Cart-upsell special — $3 (regularly $5).",
    sizes: null, colors: null,
    price: 3, pack: null, badge: null,
    category: "sticker",
    hiddenFromCatalog: true,
    upsellOf: 22
  },
  {
    id: 123, img: "brown3",
    name: "Drop It Like It's Hot Sticker",
    desc: "Cart-upsell special — $3 (regularly $5).",
    sizes: null, colors: null,
    price: 3, pack: null, badge: null,
    category: "sticker",
    hiddenFromCatalog: true,
    upsellOf: 23
  }
];

const FLY_IMAGES = {
  fly1: "images/fly1.jpg",
  fly2: "images/fly2.jpg",
  fly3: "images/fly3.jpg",
  fly4: "images/fly4.jpg",
  fly5: "images/fly5.jpg",
  fly6: "images/fly6.jpg",
  fly7: "images/fly7.jpg",
  fly8: "images/fly8.jpg",
  fly9: "images/fly9.jpg",
  "balanced-leech": "balanced-leech.jpg",
  guidechoice: "guidechoice.jpg",
  "mayers1": "mayers1.jpg",
  "mayers2": "mayers2.jpg",
  "mayers3": "mayers3.jpg",
  "mayers4": "mayers4.jpg",
  micro1: "micro1.jpg",
  micro2: "micro2.jpg",
  sticker1: "images/sticker1.png",
  sticker2: "images/sticker2.png",
  stickerFishOn: "images/sticker-fish-on.png",
  stickerDontJudge: "images/sticker-dont-judge-me.png",
  stickerBuffet: "images/sticker-buffet-mode.png",
  stickerBuzzers: "images/sticker-got-buzzers.png",
  wordmarkreal: "images/wordmarkreal.jpg",
  brown1: "images/brown1.png",
  brown2: "images/brown2.png",
  brown3: "images/brown3.png",
  ironman: "images/ironman.jpg",
  bloodworm: "images/bloodworm.png",
  bloodworm1: "images/bloodworm1.png",
  "jersey-boy": "images/jersey-boy.jpg",
  scud1: "images/scud1.png",
  scud2: "images/scud2.png",
  scud3: "images/scud3.png",
  "rusty-duck": "images/rusty-duck.jpg",
  "franks-red-hot-ronnie-2": "images/franks-red-hot-ronnie-2.jpg"
};

// Slugify a fly name into a URL-safe hash anchor / per-fly page filename.
// Used by index.html share buttons (#fly-{slug}) and the per-fly page generator.
function slugifyFlyName(name) {
  return name.toLowerCase()
    .replace(/[‘’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Inject a volume-promo banner above the "Add to Cart" button on per-fly
// pages. No-op on pages without a .quick-add block (index, blog, etc.).
// Tier rules live in /js/promo-tiers.js; this banner is informational and
// updates passively when the user changes quantity.
// `typeof document` guard keeps scripts/generate-fly-pages.py from crashing
// when it `eval`s this file in Node to extract the flies[] array.
if (typeof document !== 'undefined') (function injectFlyPagePromoBanner() {
  function render() {
    const quickAdd = document.querySelector('.quick-add');
    if (!quickAdd) return;
    if (document.getElementById('qaPromoBanner')) return;

    const addBtn = quickAdd.querySelector('.qa-add');
    if (!addBtn) return;

    const styleId = 'tt-qa-promo-banner-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent =
        '.qa-promo-banner{display:block;margin:14px 0;padding:12px 14px;border-radius:6px;' +
        'background:linear-gradient(135deg,rgba(46,204,113,.16),rgba(46,204,113,.06));' +
        'border:1px solid rgba(46,204,113,.45);color:#2ecc71;' +
        'font-family:"Barlow Condensed",sans-serif;font-size:.92rem;letter-spacing:.05em;' +
        'text-transform:uppercase;text-align:center;line-height:1.5;}' +
        '.qa-promo-banner strong{color:#2ecc71;font-weight:700;}' +
        '.qa-promo-banner .qa-promo-divider{opacity:.5;margin:0 6px;}';
      document.head.appendChild(style);
    }

    const banner = document.createElement('div');
    banner.id = 'qaPromoBanner';
    banner.className = 'qa-promo-banner';
    banner.innerHTML =
      '🎁 <strong>FREE Surprise Sticker</strong> with any fly pack' +
      '<span class="qa-promo-divider">·</span>' +
      'Buy 5 packs · <strong>1 FREE pack</strong>';

    addBtn.parentNode.insertBefore(banner, addBtn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
