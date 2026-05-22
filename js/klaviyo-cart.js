// Trout Tricks → Klaviyo cart event tracker.
// Exposes window.ttTrackKlaviyoCart(eventName). Reads the canonical tt_cart
// localStorage shape, resolves fly metadata via window.flies + FLY_IMAGES
// from /js/catalog.js, builds the standard Klaviyo cart payload, and pushes
// via window._learnq. Silent no-op if _learnq, flies, or cart are missing —
// so a failed tracker can never break the cart UX.
(function () {
  var SITE = 'https://trouttricks.com';

  function buildPayload() {
    var raw = [];
    try { raw = JSON.parse(localStorage.getItem('tt_cart') || '[]'); } catch (e) {}
    if (!Array.isArray(raw) || raw.length === 0) return null;
    if (typeof flies === 'undefined' || !Array.isArray(flies)) return null;

    var items = [];
    var names = [];
    var total = 0;

    raw.forEach(function (row) {
      var id = (row && row.flyId != null) ? row.flyId : (row && row.fly && row.fly.id);
      var fly = flies.find(function (f) { return f.id === id; });
      if (!fly) return;
      var qty = parseInt(row.qty, 10) || 1;
      var price = +fly.price || 0;
      var rowTotal = price * qty;
      total += rowTotal;
      names.push(fly.name);
      var slug = (typeof slugifyFlyName === 'function')
        ? slugifyFlyName(fly.name)
        : String(fly.id);
      var imgRel = (typeof FLY_IMAGES === 'object' && FLY_IMAGES && FLY_IMAGES[fly.img])
        ? FLY_IMAGES[fly.img]
        : 'og-image.jpg';
      items.push({
        ProductID: slug,
        SKU: slug,
        ProductName: fly.name,
        Quantity: qty,
        ItemPrice: price,
        RowTotal: rowTotal,
        ProductURL: SITE + '/flies/' + slug + '.html',
        ImageURL: SITE + '/' + String(imgRel).replace(/^\//, ''),
        ProductCategories: [fly.category || 'fly']
      });
    });

    if (items.length === 0) return null;

    return {
      '$value': total,
      ItemNames: names,
      CheckoutURL: SITE + '/#cart',
      Items: items
    };
  }

  window.ttTrackKlaviyoCart = function (eventName) {
    try {
      if (!window._learnq) return;
      var payload = buildPayload();
      if (!payload) return;
      window._learnq.push(['track', eventName, payload]);
    } catch (e) { /* never break cart on tracker failure */ }
  };

  // Cart-panel email capture → Klaviyo identify. Persists across sessions in
  // localStorage so a returning visitor stays identified without retyping.
  // Silent: invalid/empty input never shows an error (low-pressure capture
  // — the user can still check out without giving an email; Square captures
  // it at payment as a backstop).
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function initCartEmailCapture() {
    try {
      var input = document.getElementById('cartEmailInput');
      if (!input) return;

      var stored = '';
      try { stored = localStorage.getItem('tt_customer_email') || ''; } catch (e) {}

      if (stored) {
        input.value = stored;
        if (window._learnq) {
          try { window._learnq.push(['identify', { '$email': stored }]); } catch (e) {}
        }
      }

      function handle() {
        try {
          var val = (input.value || '').trim();
          if (!val || !EMAIL_RE.test(val)) return;
          try { localStorage.setItem('tt_customer_email', val); } catch (e) {}
          if (window._learnq) {
            window._learnq.push(['identify', { '$email': val, '$source': 'cart-panel' }]);
          }
        } catch (e) {}
      }

      input.addEventListener('blur', handle);
      input.addEventListener('change', handle);
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCartEmailCapture);
  } else {
    initCartEmailCapture();
  }
})();
