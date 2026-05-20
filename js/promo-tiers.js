// Trout Tricks — automatic volume promo tiers
// Loaded on every page that hosts the cart panel. Pure-function tier math
// + auto-wiring for the stripped read-only cart panels that live on
// pages other than index.html.
//
// Tiers (stack with manual promo codes like WELCOME10):
//   - Any fly pack(s) in cart → free "Surprise Sticker" added at $0
//   - 5+ fly packs in cart    → 1 free pack every 5 (cheapest pack price)
//     ("Buy 5 Get 1 Free" — 5 in cart unlocks the discount)
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
      freePackQty: 0,
      freePackDiscount: 0,
      freeStickerLine: null,
      stickerThresholdMet: false,
      packsToNextFreePack: 5
    };
    if (!Array.isArray(cart) || cart.length === 0) return empty;

    const packs = cart.filter(function (i) {
      return i && i.fly && i.fly.category !== 'sticker';
    });
    const packCount = packs.reduce(function (s, i) { return s + (i.qty || 0); }, 0);
    if (packCount === 0) return empty;

    const freePackQty = Math.floor(packCount / 5);
    const cheapestPackPrice = packs.reduce(function (min, i) {
      const p = Number(i.fly.price) || 0;
      return p > 0 && (min === null || p < min) ? p : min;
    }, null) || 0;
    const freePackDiscount = freePackQty * cheapestPackPrice;

    // Free sticker drops on ANY cart with at least one fly pack.
    const stickerThresholdMet = packCount >= 1;
    const freeStickerLine = stickerThresholdMet ? {
      name: 'Surprise Sticker (free with any fly pack)',
      price: 0,
      qty: 1,
      isPromoSticker: true
    } : null;

    const nextFreePackAt = (freePackQty + 1) * 5;
    const packsToNextFreePack = nextFreePackAt - packCount;

    return {
      packCount: packCount,
      freePackQty: freePackQty,
      freePackDiscount: freePackDiscount,
      freeStickerLine: freeStickerLine,
      stickerThresholdMet: stickerThresholdMet,
      packsToNextFreePack: packsToNextFreePack
    };
  }

  function getPromoNudge(tiers) {
    if (!tiers || tiers.packCount === 0) return '';

    // Already have one or more free packs + close to next one
    if (tiers.freePackQty > 0 && tiers.packsToNextFreePack > 0 && tiers.packsToNextFreePack <= 3) {
      const n = tiers.packsToNextFreePack;
      const have = tiers.freePackQty;
      return have + ' FREE pack' + (have > 1 ? 's' : '') + ' unlocked! Add ' + n + ' more for another.';
    }

    // First free pack already unlocked, not close to next
    if (tiers.freePackQty > 0) {
      return '🎁 FREE pack unlocked!' + (tiers.freePackQty > 1 ? ' (x' + tiers.freePackQty + ')' : '');
    }

    // Close to unlocking the first free pack — 1, 2, or 3 packs away
    if (tiers.packsToNextFreePack > 0 && tiers.packsToNextFreePack <= 3) {
      const n = tiers.packsToNextFreePack;
      if (n === 1) return '🎯 Add 1 more pack — your cheapest pack is FREE!';
      return 'Add ' + n + ' more packs to unlock a FREE pack (cheapest in cart)';
    }

    // Has packs but far from free-pack threshold (1-2 packs)
    return '🎁 FREE Surprise Sticker added to your order';
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
      '.tt-upsell{margin:0 0 14px;padding:14px 12px;background:#0a0a0a;border:1px solid #2a2a2a;border-top:3px solid #c0392b;border-radius:0;}' +
      '.tt-upsell-eyebrow{color:#d4a017;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;font-weight:700;text-align:center;font-family:"Barlow Condensed",Impact,sans-serif;}' +
      '.tt-upsell-title{color:#ffffff;font-family:"Bebas Neue",Impact,Arial,sans-serif;font-size:18px;letter-spacing:0.04em;text-align:center;margin-top:4px;text-transform:uppercase;}' +
      '.tt-upsell-title em{color:#c0392b;font-style:normal;font-weight:700;}' +
      '.tt-upsell-sub{color:#aaa;font-size:11px;text-align:center;margin-top:4px;letter-spacing:0.02em;}' +
      '.tt-upsell-grid{display:flex;justify-content:space-between;gap:6px;margin-top:12px;}' +
      '.tt-upsell-card{flex:1;background:#181818;border:1px solid #2a2a2a;border-radius:4px;padding:8px 4px 10px;cursor:pointer;transition:border-color 0.15s,background 0.15s;text-align:center;font-family:"Barlow Condensed",sans-serif;color:#fff;-webkit-tap-highlight-color:transparent;}' +
      '.tt-upsell-card:hover{border-color:#c0392b;background:#1f1f1f;}' +
      '.tt-upsell-card:active{transform:scale(0.97);}' +
      '.tt-upsell-img{width:100%;max-width:64px;height:auto;display:block;margin:0 auto 6px;background:#fff;border-radius:2px;padding:4px;box-sizing:border-box;}' +
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

  function renderUpsell() {
    const el = document.getElementById('ttUpsellSection');
    if (!el) return;
    const cart = readCart();
    if (!shouldShowUpsell(cart)) {
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
    if (totalEl && tiers.freePackDiscount > 0) {
      const raw = (totalEl.textContent || '').replace(/[^0-9.]/g, '');
      const current = parseFloat(raw);
      if (!isNaN(current)) {
        const adjusted = Math.max(0, current - tiers.freePackDiscount);
        totalEl.textContent = '$' + adjusted.toFixed(2);
      }
    }

    const nudgeEl = document.getElementById('promoNudge');
    if (nudgeEl) {
      nudgeEl.textContent = getPromoNudge(tiers);
      nudgeEl.classList.toggle('unlocked', tiers.stickerThresholdMet || tiers.freePackQty > 0);
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
      if (tiers.freePackQty > 0) {
        extra += '<div class="cart-promo-item">' +
          '<span><span class="promo-free">🎁 Buy 5 Get 1 Free</span> · ' + tiers.freePackQty + ' pack' + (tiers.freePackQty > 1 ? 's' : '') + '</span>' +
          '<span>-$' + tiers.freePackDiscount.toFixed(2) + '</span>' +
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
