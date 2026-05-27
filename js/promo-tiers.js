// Trout Tricks — automatic volume promo tiers
// Loaded on every page that hosts the cart panel. Pure-function tier math
// + auto-wiring for the stripped read-only cart panels that live on
// pages other than index.html.
//
// Tiers (stack with manual promo codes like WELCOME10):
//   - Any fly pack(s) in cart → 50% off ONE pack (cheapest in cart),
//     auto-applied. Customer-acquisition hook; capped at one pack for margin.
//   - Any fly pack(s) in cart → free "Surprise Sticker" added at $0
//
// Two integration modes:
//   1. INLINE mode (index.html): page's own updateCartUI calls getPromoTiers
//      / getPromoNudge and renders rewards itself. Page sets
//      window.__promoTiersInlineHandled = true so this script's auto-wiring
//      stays out of the way.
//   2. AUTO mode (every other cart page): this script injects CSS, a nudge
//      element, and wraps updateCartUI to apply rewards after the original
//      runs. The wrap only adjusts the displayed total and appends reward
//      rows — checkout still routes through index.html where the real
//      discount math + Worker payload happen.

(function (global) {
  function getPromoTiers(cart) {
    const empty = {
      packCount: 0,
      halfOffApplies: false,
      halfOffDiscount: 0,
      halfOffPackPrice: 0,
      freeStickerLine: null,
      stickerThresholdMet: false
    };
    if (!Array.isArray(cart) || cart.length === 0) return empty;

    const packs = cart.filter(function (i) {
      return i && i.fly && i.fly.category !== 'sticker';
    });
    const packCount = packs.reduce(function (s, i) { return s + (i.qty || 0); }, 0);
    if (packCount === 0) return empty;

    // 50% off ONE pack (the cheapest eligible pack in the cart) — auto-applied.
    // Capped at a single pack so the discount stays margin-safe regardless of
    // cart size; the free Surprise Sticker below stacks on top.
    //
    // The Guide's Choice Box (id 'gc', flagged noPromo) is excluded: it's
    // already a discounted 25-fly bundle, so half-off would wreck the margin.
    // It still counts toward the free-sticker threshold below, and any OTHER
    // pack in the same cart can still take the 50% off.
    const discountablePacks = packs.filter(function (i) {
      return !i.fly.noPromo && i.fly.id !== 'gc';
    });
    const cheapestPackPrice = discountablePacks.reduce(function (min, i) {
      const p = Number(i.fly.price) || 0;
      return p > 0 && (min === null || p < min) ? p : min;
    }, null) || 0;
    const halfOffApplies = cheapestPackPrice > 0;
    const halfOffDiscount = halfOffApplies ? Math.round(cheapestPackPrice * 50) / 100 : 0;

    // Free sticker drops on ANY cart with at least one fly pack (box included).
    const stickerThresholdMet = packCount >= 1;
    const freeStickerLine = stickerThresholdMet ? {
      name: 'Surprise Sticker (free with any fly pack)',
      price: 0,
      qty: 1,
      isPromoSticker: true
    } : null;

    return {
      packCount: packCount,
      halfOffApplies: halfOffApplies,
      halfOffDiscount: halfOffDiscount,
      halfOffPackPrice: cheapestPackPrice,
      freeStickerLine: freeStickerLine,
      stickerThresholdMet: stickerThresholdMet
    };
  }

  function getPromoNudge(tiers) {
    if (!tiers || tiers.packCount === 0) return '';
    // Reflect only the rewards that actually applied. The Guide's Choice Box
    // alone gets the free sticker but not the 50% off (it's promo-excluded).
    if (tiers.halfOffApplies) {
      return '✅ 50% OFF a pack + FREE Surprise Sticker — applied!';
    }
    return '✅ FREE Surprise Sticker — applied!';
  }

  global.getPromoTiers = getPromoTiers;
  global.getPromoNudge = getPromoNudge;

  // ===========================================================================
  // CART UPSELL — "Add a sticker for $3" impulse offer
  // ===========================================================================
  // Cart-side mechanic: 3 sticker upsell variants (catalog ids 121/122/123,
  // priced at $3 instead of the $5 retail). Shown in the cart panel when
  // cart has non-sticker items AND no sticker yet. Tap → adds at $3.
  // Variants are hidden from the main catalog (hiddenFromCatalog:true).

  const UPSELL_STICKER_IDS = [121, 122, 123];

  function shouldShowUpsell(cart) {
    if (!Array.isArray(cart) || cart.length === 0) return false;
    const hasNonSticker = cart.some(function (i) {
      return i && i.fly && i.fly.category !== 'sticker';
    });
    if (!hasNonSticker) return false;
    const hasSticker = cart.some(function (i) {
      return i && i.fly && i.fly.category === 'sticker';
    });
    return !hasSticker;
  }

  function injectUpsellStyles() {
    if (document.getElementById('tt-upsell-styles')) return;
    const css =
      '.tt-upsell{position:relative;margin:0 0 10px;padding:10px 10px 12px;background:#0a0a0a;border:1px solid #2a2a2a;border-top:3px solid #c0392b;border-radius:0;}' +
      '.tt-upsell-close{position:absolute;top:-10px;right:-10px;width:30px;height:30px;background:#c0392b;border:2px solid #ffffff;color:#ffffff;font-size:16px;font-weight:700;line-height:26px;cursor:pointer;padding:0;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.45);transition:background 0.15s,transform 0.1s;-webkit-tap-highlight-color:transparent;z-index:5;text-align:center;}' +
      '.tt-upsell-close:hover{background:#e74c3c;}' +
      '.tt-upsell-close:active{transform:scale(0.9);}' +
      '.tt-upsell-eyebrow{color:#d4a017;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;font-weight:700;text-align:center;font-family:"Barlow Condensed",Impact,sans-serif;padding:0 24px;}' +
      '.tt-upsell-title{color:#ffffff;font-family:"Bebas Neue",Impact,Arial,sans-serif;font-size:16px;letter-spacing:0.04em;text-align:center;margin-top:2px;text-transform:uppercase;}' +
      '.tt-upsell-title em{color:#c0392b;font-style:normal;font-weight:700;}' +
      '.tt-upsell-sub{color:#aaa;font-size:10px;text-align:center;margin-top:2px;letter-spacing:0.02em;}' +
      '.tt-upsell-grid{display:flex;justify-content:space-between;gap:6px;margin-top:8px;}' +
      '.tt-upsell-card{flex:1;background:#181818;border:1px solid #2a2a2a;border-radius:4px;padding:8px 4px 10px;cursor:pointer;transition:border-color 0.15s,background 0.15s;text-align:center;font-family:"Barlow Condensed",sans-serif;color:#fff;-webkit-tap-highlight-color:transparent;}' +
      '.tt-upsell-card:hover{border-color:#c0392b;background:#1f1f1f;}' +
      '.tt-upsell-card:active{transform:scale(0.97);}' +
      '.tt-upsell-img{width:100%;max-width:52px;height:auto;display:block;margin:0 auto 4px;background:#fff;border-radius:2px;padding:3px;box-sizing:border-box;}' +
      '.tt-upsell-name{font-size:11px;color:#fff;line-height:1.2;min-height:26px;display:flex;align-items:center;justify-content:center;text-align:center;letter-spacing:0.02em;}' +
      '.tt-upsell-add{display:inline-block;margin-top:6px;padding:4px 8px;background:#c0392b;color:#fff;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;border-radius:2px;}' +
      '.tt-upsell:empty{display:none;}';
    const style = document.createElement('style');
    style.id = 'tt-upsell-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function injectUpsellElement() {
    if (document.getElementById('ttUpsellSection')) return;
    const cartFooter = document.querySelector('.cart-footer');
    if (!cartFooter) return;
    const upsell = document.createElement('div');
    upsell.id = 'ttUpsellSection';
    upsell.className = 'tt-upsell';
    upsell.style.display = 'none';
    cartFooter.insertBefore(upsell, cartFooter.firstChild);
  }

  function getUpsellStickerObjs() {
    if (typeof flies === 'undefined') return [];
    const out = [];
    for (let i = 0; i < UPSELL_STICKER_IDS.length; i++) {
      const f = flies.find(function (x) { return x.id === UPSELL_STICKER_IDS[i]; });
      if (f) out.push(f);
    }
    return out;
  }

  function isUpsellDismissed() {
    try { return sessionStorage.getItem('tt_upsell_dismissed') === '1'; }
    catch (e) { return false; }
  }

  function dismissUpsell() {
    try { sessionStorage.setItem('tt_upsell_dismissed', '1'); } catch (e) {}
    const el = document.getElementById('ttUpsellSection');
    if (el) { el.style.display = 'none'; el.innerHTML = ''; }
  }

  global.dismissUpsell = dismissUpsell;

  function renderUpsell() {
    const el = document.getElementById('ttUpsellSection');
    if (!el) return;
    const cart = readCart();
    if (!shouldShowUpsell(cart) || isUpsellDismissed()) {
      el.style.display = 'none';
      el.innerHTML = '';
      return;
    }
    const stickers = getUpsellStickerObjs();
    if (stickers.length === 0) {
      el.style.display = 'none';
      return;
    }
    let cards = '';
    for (let i = 0; i < stickers.length; i++) {
      const s = stickers[i];
      const imgPath = (typeof FLY_IMAGES !== 'undefined' && FLY_IMAGES[s.img]) ? FLY_IMAGES[s.img] : ('images/' + s.img);
      const shortName = s.name.replace(/ Sticker$/, '');
      cards += '<div class="tt-upsell-card" onclick="addUpsellSticker(' + s.id + ')" role="button" tabindex="0">' +
        '<img class="tt-upsell-img" src="/' + imgPath + '" alt="' + shortName + '">' +
        '<div class="tt-upsell-name">' + shortName + '</div>' +
        '<div class="tt-upsell-add">+ Add $3</div>' +
        '</div>';
    }
    el.innerHTML =
      '<button type="button" class="tt-upsell-close" onclick="event.stopPropagation();dismissUpsell();" aria-label="Dismiss offer">×</button>' +
      '<div class="tt-upsell-eyebrow">🎁 You already got 1 FREE sticker</div>' +
      '<div class="tt-upsell-title">Add a second for <em>$3</em></div>' +
      '<div class="tt-upsell-sub">Regularly $5 — save $2 instantly</div>' +
      '<div class="tt-upsell-grid">' + cards + '</div>';
    el.style.display = 'block';
  }

  function addUpsellSticker(flyId) {
    let stored = [];
    try {
      const raw = localStorage.getItem('tt_cart');
      stored = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(stored)) stored = [];
    } catch (e) { stored = []; }
    const uid = Date.now() + Math.random();
    stored.push({ flyId: flyId, size: null, color: null, qty: 1, pickup: false, uid: uid });
    try { localStorage.setItem('tt_cart', JSON.stringify(stored)); }
    catch (e) { console.error('[upsell] save failed', e); return; }
    // Refresh the page's cart state — each page exposes loadCart() top-level.
    if (typeof global.loadCart === 'function') {
      try { global.loadCart(); } catch (e) {}
    } else if (typeof global.updateCartUI === 'function') {
      try { global.updateCartUI(); } catch (e) {}
    }
    if (typeof global.openCart === 'function') {
      try { global.openCart(); } catch (e) {}
    }
    if (typeof global.gtag === 'function') {
      try {
        global.gtag('event', 'add_to_cart', {
          currency: 'USD', value: 3, item_name: 'Sticker Upsell', quantity: 1
        });
      } catch (e) {}
    }
  }

  global.addUpsellSticker = addUpsellSticker;

  // ----- Auto-wiring for stripped cart pages -----
  // Skipped entirely on pages that set window.__promoTiersInlineHandled = true.

  function injectStyles() {
    if (document.getElementById('tt-promo-tiers-styles')) return;
    const css =
      '.promo-nudge{font-family:"Barlow Condensed",sans-serif;font-size:.86rem;letter-spacing:.06em;text-transform:uppercase;text-align:center;padding:8px 10px;margin-bottom:10px;border-radius:4px;background:rgba(46,204,113,.12);color:#2ecc71;border:1px solid rgba(46,204,113,.35);}' +
      '.promo-nudge.unlocked{background:rgba(46,204,113,.22);}' +
      '.promo-nudge:empty{display:none;}' +
      '.cart-promo-item{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;margin:6px 0;background:rgba(46,204,113,.08);border:1px dashed rgba(46,204,113,.4);border-radius:4px;font-family:"Barlow Condensed",sans-serif;color:#2ecc71;font-size:.92rem;letter-spacing:.04em;}' +
      '.cart-promo-item .promo-free{font-weight:700;text-transform:uppercase;}';
    const style = document.createElement('style');
    style.id = 'tt-promo-tiers-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function injectNudgeElement() {
    if (document.getElementById('promoNudge')) return;
    const cartFooter = document.querySelector('.cart-footer');
    if (!cartFooter) return;
    const nudge = document.createElement('div');
    nudge.className = 'promo-nudge';
    nudge.id = 'promoNudge';
    cartFooter.insertBefore(nudge, cartFooter.firstChild);
  }

  function readCart() {
    // Stripped pages declare `let cart = []` which doesn't attach to window;
    // fall back to the shared localStorage key catalog.js already uses.
    if (Array.isArray(global.cart)) return global.cart;
    try {
      const raw = localStorage.getItem('tt_cart');
      const stored = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(stored) || stored.length === 0) return [];
      // localStorage stores { flyId, size, color, qty, ... } — hydrate against
      // the shared flies[] catalog (declared in /js/catalog.js, same realm).
      if (typeof flies === 'undefined') return [];
      return stored.map(function (it) {
        const fly = flies.find(function (f) { return f.id === it.flyId; });
        return fly ? { fly: fly, qty: it.qty, size: it.size, color: it.color, uid: it.uid } : null;
      }).filter(Boolean);
    } catch (e) { return []; }
  }

  function applyTiersToCartPanel() {
    const cart = readCart();
    if (!Array.isArray(cart)) return;
    const tiers = getPromoTiers(cart);

    const totalEl = document.getElementById('cartTotal');
    if (totalEl && tiers.halfOffDiscount > 0) {
      const raw = (totalEl.textContent || '').replace(/[^0-9.]/g, '');
      const current = parseFloat(raw);
      if (!isNaN(current)) {
        const adjusted = Math.max(0, current - tiers.halfOffDiscount);
        totalEl.textContent = '$' + adjusted.toFixed(2);
      }
    }

    const nudgeEl = document.getElementById('promoNudge');
    if (nudgeEl) {
      nudgeEl.textContent = getPromoNudge(tiers);
      nudgeEl.classList.toggle('unlocked', tiers.stickerThresholdMet || tiers.halfOffApplies);
    }

    const itemsEl = document.getElementById('cartItems');
    if (itemsEl && cart.length > 0) {
      // Strip any rewards we previously appended, then re-append fresh.
      const stale = itemsEl.querySelectorAll('.cart-promo-item');
      for (let i = 0; i < stale.length; i++) stale[i].remove();

      let extra = '';
      if (tiers.freeStickerLine) {
        extra += '<div class="cart-promo-item">' +
          '<span><span class="promo-free">🎁 Free</span> · Surprise Sticker</span>' +
          '<span>$0.00</span>' +
          '</div>';
      }
      if (tiers.halfOffApplies) {
        extra += '<div class="cart-promo-item">' +
          '<span><span class="promo-free">🎁 50% Off a Pack</span></span>' +
          '<span>-$' + tiers.halfOffDiscount.toFixed(2) + '</span>' +
          '</div>';
      }
      if (extra) itemsEl.insertAdjacentHTML('beforeend', extra);
    }
  }

  function wrapUpdateCartUI() {
    if (typeof global.updateCartUI !== 'function') return;
    if (global.__promoTiersUpdateCartWrapped) return;
    const original = global.updateCartUI;
    global.updateCartUI = function () {
      original.apply(this, arguments);
      // Tier-discount UI is skipped on pages that handle tiers inline (index.html).
      if (!global.__promoTiersInlineHandled) {
        try { applyTiersToCartPanel(); } catch (e) { console.error('[promo-tiers]', e); }
      }
      // Upsell renders on every page (always wired regardless of inline flag).
      try { renderUpsell(); } catch (e) { console.error('[upsell]', e); }
    };
    global.__promoTiersUpdateCartWrapped = true;
  }

  function init() {
    // Upsell setup runs on every page (always — even index.html).
    injectUpsellStyles();
    injectUpsellElement();

    // Tier-discount UI scaffold is only injected on pages that don't handle
    // tiers inline. Index.html sets __promoTiersInlineHandled and renders the
    // tier nudge / discount lines via its own updateCartUI.
    if (!global.__promoTiersInlineHandled) {
      injectStyles();
      injectNudgeElement();
    }

    // Always wrap updateCartUI so the upsell re-renders after every cart change.
    // The wrap also conditionally calls applyTiersToCartPanel for non-inline pages.
    wrapUpdateCartUI();

    // Re-render once so promo state matches whatever's already in cart on load.
    if (typeof global.updateCartUI === 'function') {
      try { global.updateCartUI(); } catch (e) {}
    } else {
      // Page has no updateCartUI (rare) — at least render the upsell.
      try { renderUpsell(); } catch (e) {}
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
