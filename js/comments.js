// Article comments loader for Trout Tricks blog posts.
//
// Comments are powered by giscus (https://giscus.app) — a free, ad-free,
// no-tracker widget backed by this repo's GitHub Discussions. One-time setup
// is required (see SETUP below). Until that's done, this script shows a clean
// "join the conversation" panel instead of a broken widget, so the page is
// never broken.
//
// ─────────────────────────────────────────────────────────────────────────
// SETUP (do once, then every article gets comments automatically):
//   1. Push this repo to GitHub and make it PUBLIC.
//   2. Repo → Settings → General → Features → tick "Discussions".
//   3. Install the giscus app: https://github.com/apps/giscus  (grant it
//      access to the trout-tricks repo).
//   4. Go to https://giscus.app, enter repo "stillwaterflies5280-creator/trout-tricks",
//      pick mapping "pathname" and a Discussion category (e.g. "Announcements"
//      or a new "Comments" category).
//   5. giscus.app shows you a <script> snippet containing data-repo-id and
//      data-category-id. Copy those two values into GISCUS below.
//   6. Save, commit, done — all 23 articles go live with real comments.
// ─────────────────────────────────────────────────────────────────────────

var GISCUS = {
  repo: 'stillwaterflies5280-creator/trout-tricks',
  repoId: '',        // <-- paste data-repo-id here
  category: 'Comments',
  categoryId: '',    // <-- paste data-category-id here
  theme: 'light'
};

(function () {
  var mount = document.getElementById('tt-comments');
  if (!mount) return;

  var ready = GISCUS.repoId && GISCUS.categoryId;

  if (!ready) {
    // Fallback until giscus is configured — route engagement to the community.
    mount.innerHTML =
      '<div style="background:#f5f5f5;border:1px solid #e0e0e0;border-radius:8px;' +
      'padding:24px 22px;text-align:center;">' +
        '<div style="font-family:\'Bebas Neue\',Impact,sans-serif;font-size:1.5rem;' +
        'letter-spacing:0.04em;color:#1a1a1a;margin-bottom:6px;">Join The Conversation</div>' +
        '<p style="color:#555;font-size:0.95rem;line-height:1.6;margin:0 auto 16px;max-width:460px;">' +
        'Questions about this one, or a catch to brag about? Drop it in the Trout Tricks crew ' +
        'on Facebook or tag us on Instagram — that\'s where the stillwater talk happens.</p>' +
        '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">' +
          '<a href="https://www.facebook.com/share/g/14ZLtNGNF6W/" target="_blank" rel="noopener" ' +
          'style="background:#1877f2;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;' +
          'font-family:\'Barlow Condensed\',Impact,sans-serif;font-weight:700;letter-spacing:0.04em;' +
          'text-transform:uppercase;font-size:0.95rem;">Facebook Group</a>' +
          '<a href="https://www.instagram.com/trouttricks" target="_blank" rel="noopener" ' +
          'style="background:#1a1a1a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;' +
          'font-family:\'Barlow Condensed\',Impact,sans-serif;font-weight:700;letter-spacing:0.04em;' +
          'text-transform:uppercase;font-size:0.95rem;">Instagram</a>' +
        '</div>' +
      '</div>';
    return;
  }

  var s = document.createElement('script');
  s.src = 'https://giscus.app/client.js';
  s.setAttribute('data-repo', GISCUS.repo);
  s.setAttribute('data-repo-id', GISCUS.repoId);
  s.setAttribute('data-category', GISCUS.category);
  s.setAttribute('data-category-id', GISCUS.categoryId);
  s.setAttribute('data-mapping', 'pathname');
  s.setAttribute('data-strict', '0');
  s.setAttribute('data-reactions-enabled', '1');
  s.setAttribute('data-emit-metadata', '0');
  s.setAttribute('data-input-position', 'top');
  s.setAttribute('data-theme', GISCUS.theme);
  s.setAttribute('data-lang', 'en');
  s.crossOrigin = 'anonymous';
  s.async = true;
  mount.appendChild(s);
})();
