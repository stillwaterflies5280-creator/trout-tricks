// Shared customer-shipment map data — single source of truth.
//
// Both /about.html (full live map + reach counter) and / (homepage mini live
// map + counter teaser) read from window.TT_HQ + window.TT_ORDERS so the
// numbers + pins stay in sync from one edit.
//
// To add a destination: copy a line, set city / lat / lng / count, push.
// City-level only (never street addresses — customer privacy).
// Look up coords at https://www.latlong.net if you don't have them.
(function (g) {
  g.TT_HQ = { city: 'Fairmount, CO', lat: 39.7686, lng: -105.1447 };

  g.TT_ORDERS = [
    // Colorado
    { city: 'Fort Collins, CO',     lat: 40.5853, lng: -105.0844, count: 3 },
    { city: 'Littleton, CO',        lat: 39.6133, lng: -105.0166, count: 2 },
    { city: 'Denver, CO',           lat: 39.7392, lng: -104.9903, count: 1 },
    { city: 'Lakewood, CO',         lat: 39.7047, lng: -105.0814, count: 1 },
    { city: 'Arvada, CO',           lat: 39.8028, lng: -105.0875, count: 1 },
    { city: 'Westminster, CO',      lat: 39.8367, lng: -105.0372, count: 1 },
    { city: 'Commerce City, CO',    lat: 39.8083, lng: -104.9339, count: 1 },
    { city: 'Centennial, CO',       lat: 39.5807, lng: -104.8772, count: 1 },
    { city: 'Highlands Ranch, CO',  lat: 39.5539, lng: -104.9689, count: 1 },
    { city: 'Parker, CO',           lat: 39.5186, lng: -104.7614, count: 1 },
    { city: 'Erie, CO',             lat: 40.0503, lng: -105.0499, count: 1 },
    { city: 'Longmont, CO',         lat: 40.1672, lng: -105.1019, count: 1 },
    { city: 'Colorado Springs, CO', lat: 38.8339, lng: -104.8214, count: 1 },
    { city: 'Steamboat Springs, CO',lat: 40.4850, lng: -106.8317, count: 1 },
    // Out of state
    { city: 'Germfask, MI',         lat: 46.2480, lng:  -85.9477, count: 1 },
    { city: 'Newfoundland, PA',     lat: 41.2962, lng:  -75.3338, count: 1 },
    // Canada
    { city: 'Saskatchewan, Canada', lat: 52.1332, lng: -106.6700, count: 1 }
  ];
})(window);
