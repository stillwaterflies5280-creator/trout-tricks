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
    if (!Array.isArray(window.flies)) return null;

    var items = [];
    var names = [];
    var total = 0;

    raw.forEach(function (row) {
      var id = (row && row.flyId != null) ? row.flyId : (row && row.fly && row.fly.id);
      var fly = window.flies.find(function (f) { return f.id === id; });
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
})();
