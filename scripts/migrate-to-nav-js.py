#!/usr/bin/env python3
"""One-shot migration: strip legacy <nav id="mainNav"> blocks (and their
support scaffolding: toggleNavMore/toggleFliesNav inline script + .nav-overlay
div) from every HTML page that has them, and add <script src="/js/nav.js"
defer></script> before </head>. The unified hamburger menu lives in /js/nav.js
and is injected at runtime, so each page just needs the script tag.

Run from repo root: python3 scripts/migrate-to-nav-js.py
"""
import os, re, sys

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# Pattern A pages (homepage-style header with mainNav). index.html was
# migrated manually because it also had the Featured Patterns rename.
import glob

PATTERN_A = [
    'about.html', 'community.html', 'contact.html', 'affiliates.html',
    'blog.html', 'fish.html', 'free-sticker.html', 'the-drop.html',
    'trip.html', 'permits.html', 'stickers.html', 'thank-you.html',
    'media-kit.html',
] + sorted(
    os.path.relpath(p, REPO)
    for p in glob.glob(os.path.join(REPO, 'blog', '*.html'))
)

# Pattern B pages (simple flat <nav> in <header>, no mainNav id). These are
# the category pages, media-kit, and the per-fly product pages (handled by
# the generator, not this script).
PATTERN_B = [
    'media-kit.html',
    'flies/chironomids.html',
    'flies/leeches.html',
    'flies/scuds.html',
]

NAV_JS_TAG = '<script src="/js/nav.js" defer></script>'

# Strip <nav id="mainNav">...</nav> (greedy across newlines, non-greedy match)
RE_MAIN_NAV = re.compile(
    r'\n?\s*<nav id="mainNav">.*?</nav>\s*\n?',
    re.DOTALL,
)

# Strip the inline <script> that wires toggleNavMore/toggleFliesNav. This sits
# immediately after </nav> in the pattern-A pages.
RE_NAV_TOGGLE_SCRIPT = re.compile(
    r'\n?\s*<script>\s*function toggleNavMore.*?</script>\s*\n?',
    re.DOTALL,
)

# Strip the <div class="nav-overlay" id="navOverlay"></div> after </header>.
RE_NAV_OVERLAY = re.compile(
    r'\n?\s*<div class="nav-overlay" id="navOverlay"></div>\s*\n?',
)

# Strip the flat <nav>...</nav> inside <header> on Pattern B pages. Matches
# both whitespace variants. Anchored to <header> -> <a class="logo"> -> <nav>
# to avoid hitting other unrelated <nav> elements (e.g., breadcrumbs).
RE_FLAT_HEADER_NAV = re.compile(
    r'(<a class="logo"[^>]*>.*?</a>)\s*\n\s*<nav>.*?</nav>\s*\n',
    re.DOTALL,
)


def add_script(html):
    """Add the nav.js script tag before </head>, only if not already present."""
    if NAV_JS_TAG in html:
        return html
    return html.replace('</head>', NAV_JS_TAG + '\n</head>', 1)


def migrate_pattern_a(path):
    with open(path) as f:
        html = f.read()
    orig = html
    html = RE_MAIN_NAV.sub('\n  ', html)
    html = RE_NAV_TOGGLE_SCRIPT.sub('\n', html)
    html = RE_NAV_OVERLAY.sub('\n', html)
    html = add_script(html)
    if html == orig:
        return False
    with open(path, 'w') as f:
        f.write(html)
    return True


def migrate_pattern_b(path):
    with open(path) as f:
        html = f.read()
    orig = html
    # Replace `<a class="logo">...</a>\n  <nav>...</nav>\n` with just the logo
    html = RE_FLAT_HEADER_NAV.sub(r'\1\n', html)
    html = add_script(html)
    if html == orig:
        return False
    with open(path, 'w') as f:
        f.write(html)
    return True


changed = []
skipped = []

for rel in PATTERN_A:
    p = os.path.join(REPO, rel)
    if not os.path.exists(p):
        skipped.append((rel, 'missing'))
        continue
    if migrate_pattern_a(p):
        changed.append(('A', rel))
    else:
        skipped.append((rel, 'no-op'))

for rel in PATTERN_B:
    p = os.path.join(REPO, rel)
    if not os.path.exists(p):
        skipped.append((rel, 'missing'))
        continue
    if migrate_pattern_b(p):
        changed.append(('B', rel))
    else:
        skipped.append((rel, 'no-op'))

print(f'Migrated {len(changed)} files:')
for kind, rel in changed:
    print(f'  [{kind}] {rel}')
if skipped:
    print(f'\nSkipped {len(skipped)} files:')
    for rel, why in skipped:
        print(f'  - {rel} ({why})')
