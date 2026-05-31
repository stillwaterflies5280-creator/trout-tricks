// Unified site nav — single hamburger menu shared by every page.
// Drop-in: include <script src="/js/nav.js" defer></script> and remove the
// page's existing <nav> from <header>. The hamburger button + drawer are
// injected at runtime so menu edits live in this one file.

(function () {
  'use strict';

  var SECTIONS = [
    {
      label: 'Shop',
      items: [
        { label: 'All Flies',      href: '/' },
        { label: 'Top Sellers',    href: '/#top-sellers' },
        { label: 'Chironomids',    href: '/flies/chironomids.html' },
        { label: 'Leeches',        href: '/flies/leeches.html' },
        { label: 'Scuds',          href: '/flies/bling-scud.html' },
        { label: 'Stickers',       href: '/stickers.html' },
        { label: 'Free Sticker',   href: '/free-sticker.html' },
        { label: 'Gear We Trust',  href: '/affiliates.html' }
      ]
    },
    {
      label: 'Explore',
      items: [
        { label: 'The Fish',  href: '/fish.html' },
        { label: 'The Drop',  href: '/the-drop.html' },
        { label: 'Blog',      href: '/blog.html' },
        { label: 'Community', href: '/community.html' }
      ]
    },
    {
      label: 'Trip',
      items: [
        { label: 'Book a Trip', href: '/trip.html' }
      ]
    },
    {
      label: 'About',
      items: [
        { label: 'About',     href: '/about.html' },
        { label: 'Contact',   href: '/contact.html' },
        { label: 'Media Kit', href: '/media-kit.html' }
      ]
    }
  ];

  var QUICKLINKS = [
    { label: 'Order Map',        href: '/about.html#flymap' },
    { label: 'Reviews',          href: '/#reviews' },
    { label: 'Trusted Partners', href: '/#trusted-partners' },
    { label: 'Permits',          href: '/permits.html' }
  ];

  var CSS = [
    // Header layout: collapses the variable right-side items (search, cart,
    // hamburger) into a single flex cluster so the page's <header> only has
    // two children (logo + cluster). Eliminates the "cart drifts to center"
    // bug that justify-content:space-between caused when N>2.
    'header > .tt-header-right{display:inline-flex;align-items:center;gap:8px;margin-left:auto;}',
    '.tt-search{display:inline-flex;align-items:center;position:relative;}',
    '.tt-search-toggle{background:transparent;border:1px solid #2a2a2a;color:#fff;width:42px;height:38px;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;font-family:inherit;}',
    '.tt-search-toggle:hover{border-color:#C0392B;color:#C0392B;}',
    '.tt-search-panel{position:absolute;top:calc(100% + 6px);right:0;background:#0a0a0a;border:1px solid #2a2a2a;border-radius:4px;padding:6px;display:none;z-index:100;box-shadow:0 6px 20px rgba(0,0,0,0.5);}',
    '.tt-search.open .tt-search-panel{display:flex;align-items:center;gap:4px;}',
    '.tt-search-input{background:#050505;border:1px solid #2a2a2a;color:#fff;padding:8px 10px;border-radius:3px;font-family:inherit;font-size:0.92rem;width:240px;outline:none;}',
    '.tt-search-input:focus{border-color:#C0392B;}',
    '.tt-search-submit{background:#C0392B;border:none;color:#fff;padding:8px 12px;border-radius:3px;cursor:pointer;font-family:"Bebas Neue",Impact,sans-serif;font-size:0.85rem;letter-spacing:0.1em;text-transform:uppercase;}',
    '.tt-search-submit:hover{background:#E74C3C;}',
    '@media (max-width:480px){.tt-search-input{width:180px;}.tt-search-panel{right:-44px;}}',
    '.tt-hamburger{background:transparent;border:1px solid #2a2a2a;color:#fff;width:42px;height:38px;border-radius:4px;font-size:1.35rem;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;font-family:inherit;}',
    '.tt-hamburger:hover{border-color:#C0392B;color:#C0392B;}',
    '.tt-nav-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:4998;opacity:0;pointer-events:none;transition:opacity 0.25s ease;}',
    '.tt-nav-overlay.open{opacity:1;pointer-events:auto;}',
    '.tt-nav-drawer{position:fixed;top:0;right:0;width:320px;max-width:88vw;height:100vh;background:#0a0a0a;border-left:1px solid #2a2a2a;z-index:4999;transform:translateX(100%);transition:transform 0.28s ease;display:flex;flex-direction:column;font-family:"Barlow Condensed",sans-serif;box-shadow:-8px 0 32px rgba(0,0,0,0.5);}',
    '.tt-nav-drawer.open{transform:translateX(0);}',
    '.tt-nav-head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #1a1a1a;}',
    '.tt-nav-head-title{font-family:"Bebas Neue",Impact,sans-serif;font-size:1.1rem;letter-spacing:0.18em;color:#999;text-transform:uppercase;}',
    '.tt-nav-close{background:transparent;border:none;color:#fff;font-size:1.4rem;width:36px;height:36px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;}',
    '.tt-nav-close:hover{background:#C0392B;}',
    '.tt-nav-body{flex:1;overflow-y:auto;padding:8px 0 20px;}',
    '.tt-nav-section{padding:14px 20px 4px;}',
    '.tt-nav-section-label{font-family:"Bebas Neue",Impact,sans-serif;font-size:0.72rem;letter-spacing:0.22em;color:#D4AF37;text-transform:uppercase;padding-bottom:6px;border-bottom:1px solid #1a1a1a;margin-bottom:6px;}',
    '.tt-nav-link{display:block;color:#fff;text-decoration:none;font-size:1.02rem;letter-spacing:0.04em;padding:9px 6px;border-radius:3px;transition:background 0.15s,color 0.15s;}',
    '.tt-nav-link:hover{background:#1a1a1a;color:#E74C3C;}',
    '.tt-nav-link.active{color:#C0392B;border-left:2px solid #C0392B;padding-left:10px;background:#150707;}',
    '.tt-nav-foot{padding:14px 20px 22px;border-top:1px solid #1a1a1a;display:flex;flex-wrap:wrap;gap:6px 14px;}',
    '.tt-nav-foot a{color:#888;font-size:0.78rem;letter-spacing:0.1em;text-transform:uppercase;text-decoration:none;}',
    '.tt-nav-foot a:hover{color:#C0392B;}',
    'body.tt-nav-locked{overflow:hidden;}',
    '@media (max-width:480px){.tt-hamburger{width:38px;height:36px;font-size:1.2rem;margin-left:6px;}}'
  ].join('');

  function injectStyles() {
    if (document.getElementById('tt-nav-styles')) return;
    var s = document.createElement('style');
    s.id = 'tt-nav-styles';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function normalize(p) {
    if (!p) return '/';
    // Strip trailing index.html and trailing slashes for fair compare
    p = p.replace(/\/index\.html$/, '/').replace(/\/+$/, '/');
    return p || '/';
  }

  function isActive(href, pathname) {
    var u;
    try { u = new URL(href, location.origin); } catch (e) { return false; }
    if (u.hash) return false; // hash links never highlight as active
    return normalize(u.pathname) === normalize(pathname);
  }

  function buildDrawer() {
    var path = location.pathname;
    var sectionsHTML = SECTIONS.map(function (sec) {
      var links = sec.items.map(function (it) {
        var cls = 'tt-nav-link' + (isActive(it.href, path) ? ' active' : '');
        return '<a class="' + cls + '" href="' + it.href + '">' + it.label + '</a>';
      }).join('');
      return (
        '<div class="tt-nav-section">' +
          '<div class="tt-nav-section-label">' + sec.label + '</div>' +
          links +
        '</div>'
      );
    }).join('');

    var quickHTML = QUICKLINKS.map(function (q) {
      return '<a href="' + q.href + '">' + q.label + '</a>';
    }).join('');

    var drawer = document.createElement('div');
    drawer.className = 'tt-nav-drawer';
    drawer.id = 'ttNavDrawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-label', 'Site menu');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML =
      '<div class="tt-nav-head">' +
        '<div class="tt-nav-head-title">Menu</div>' +
        '<button class="tt-nav-close" type="button" aria-label="Close menu">&times;</button>' +
      '</div>' +
      '<div class="tt-nav-body">' + sectionsHTML + '</div>' +
      '<div class="tt-nav-foot">' + quickHTML + '</div>';

    var overlay = document.createElement('div');
    overlay.className = 'tt-nav-overlay';
    overlay.id = 'ttNavOverlay';

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    drawer.querySelector('.tt-nav-close').addEventListener('click', close);
    overlay.addEventListener('click', close);
  }

  function injectHamburger() {
    var header = document.querySelector('header');
    if (!header) return;

    // Build the unified right-side cluster. Pulls every existing non-logo
    // header child into a single flex container so the cart, search, and
    // hamburger always anchor to the right edge regardless of how many
    // items the page contributes. Skips if already set up (e.g., SPA-style
    // re-mounts).
    var cluster = header.querySelector('.tt-header-right');
    if (!cluster) {
      cluster = document.createElement('div');
      cluster.className = 'tt-header-right';
      // Move every child that isn't the logo into the cluster
      Array.prototype.slice.call(header.children).forEach(function (child) {
        if (child.classList.contains('logo')) return;
        cluster.appendChild(child);
      });
      header.appendChild(cluster);
    }

    // If the page didn't ship its own search (Pattern B pages — fly
    // products, category pages, media-kit), inject a minimal one that
    // round-trips through the homepage's /?q= query.
    if (!cluster.querySelector('.header-search, .tt-search')) {
      var sf = document.createElement('form');
      sf.className = 'tt-search';
      sf.setAttribute('action', '/');
      sf.setAttribute('method', 'get');
      sf.innerHTML =
        '<button type="button" class="tt-search-toggle" aria-label="Search">🔍</button>' +
        '<div class="tt-search-panel">' +
          '<input type="text" name="q" class="tt-search-input" placeholder="Search flies & articles…" autocomplete="off">' +
          '<button type="submit" class="tt-search-submit">Go</button>' +
        '</div>';
      sf.querySelector('.tt-search-toggle').addEventListener('click', function (e) {
        e.preventDefault();
        var open = sf.classList.toggle('open');
        if (open) {
          var inp = sf.querySelector('.tt-search-input');
          setTimeout(function () { inp && inp.focus(); }, 30);
        }
      });
      // Close on outside click
      document.addEventListener('click', function (e) {
        if (!sf.contains(e.target)) sf.classList.remove('open');
      });
      // Prepend before the cart so order is: [search] [cart] [hamburger]
      cluster.insertBefore(sf, cluster.firstChild);
    }

    // Inject the hamburger as the last item in the cluster
    if (!header.querySelector('.tt-hamburger')) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tt-hamburger';
      btn.setAttribute('aria-label', 'Open menu');
      btn.setAttribute('aria-expanded', 'false');
      btn.textContent = '☰';
      btn.addEventListener('click', open);
      cluster.appendChild(btn);
    }
  }

  function open() {
    var d = document.getElementById('ttNavDrawer');
    var o = document.getElementById('ttNavOverlay');
    var h = document.querySelector('.tt-hamburger');
    if (!d || !o) return;
    d.classList.add('open');
    o.classList.add('open');
    d.setAttribute('aria-hidden', 'false');
    if (h) h.setAttribute('aria-expanded', 'true');
    document.body.classList.add('tt-nav-locked');
  }

  function close() {
    var d = document.getElementById('ttNavDrawer');
    var o = document.getElementById('ttNavOverlay');
    var h = document.querySelector('.tt-hamburger');
    if (!d || !o) return;
    d.classList.remove('open');
    o.classList.remove('open');
    d.setAttribute('aria-hidden', 'true');
    if (h) h.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('tt-nav-locked');
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
  });

  function init() {
    injectStyles();
    buildDrawer();
    injectHamburger();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
