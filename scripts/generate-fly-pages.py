#!/usr/bin/env python3
"""Generate per-fly static landing pages at /flies/{slug}.html from the canonical
flies[] array in /js/catalog.js. Each page gets unique title, meta, OpenGraph,
Twitter cards, Product JSON-LD, and BreadcrumbList JSON-LD so that:

1. Google can index and rank each fly for its money keyword.
2. Shares to FB/X/iMessage produce a real preview card (not the generic homepage).

The pages do NOT carry the full cart JS — that lives on the homepage. The
"Add to Cart" CTA on each per-fly page deep-links back to index.html#fly-{slug}
where the working catalog card is. Per-fly pages are landing pages, not
checkout pages.

Re-run this script anytime you add or rename a fly in /js/catalog.js.
"""
import json, re, os, sys, subprocess

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
CATALOG_JS = os.path.join(REPO, 'js', 'catalog.js')
OUT_DIR = os.path.join(REPO, 'flies')
SITE = 'https://www.trouttricks.com'

# Read flies[] and FLY_IMAGES via Node — vastly more reliable than parsing JS in Python
node_snippet = f'''
const fs = require('fs');
// Read catalog.js, swap `const ` -> `var ` so the bindings escape the eval block
let src = fs.readFileSync({json.dumps(CATALOG_JS)}, 'utf8');
src = src.replace(/\\bconst /g, 'var ');
eval(src);
process.stdout.write(JSON.stringify({{flies, FLY_IMAGES}}));
'''
result = subprocess.run(['node', '-e', node_snippet], capture_output=True, text=True)
if result.returncode != 0:
    print('Node error:', result.stderr)
    sys.exit(1)
data = json.loads(result.stdout)
flies = data['flies']
fly_images = data['FLY_IMAGES']
print(f'Loaded {len(flies)} flies, {len(fly_images)} image paths')


def slugify(name):
    s = name.lower()
    s = re.sub(r"['‘’]", '', s)
    s = re.sub(r'[^a-z0-9]+', '-', s)
    s = re.sub(r'^-+|-+$', '', s)
    return s


def html_escape(s):
    return (str(s).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                  .replace('"', '&quot;').replace("'", '&#39;'))


def attr_escape(s):
    return html_escape(s)


# ---- Per-fly contextual content ----

CHIRONOMID_IDS = {1, 2, 3, 4, 5, 6, 7, 8, 9}
LEECH_IDS = {10, 11, 12}

def category(fly):
    if fly.get('category') == 'sticker':
        return 'sticker'
    if fly.get('bundle'):
        return 'bundle'
    if fly['id'] in LEECH_IDS:
        return 'leech'
    if fly['id'] in CHIRONOMID_IDS:
        return 'chironomid'
    return 'fly'


FISH_IT_ON = {
    'chironomid': (
        'Stillwaters, Plains Lakes',
        '<strong>Stillwaters, plains lakes.</strong>'
    ),
    'leech': (
        'Any Stillwater + Rivers',
        '<strong>Any stillwater. And rivers too!</strong>'
    ),
}


RELATED_BLOG_LINKS = {
    'chironomid': [
        ('best-chironomid-fly-patterns.html', 'The 5 chironomid patterns we lean on'),
        ('how-to-fish-chironomids-colorado.html', 'How to fish chironomids in Colorado'),
        ('chironomid-depth-control-stillwater.html', 'Depth control for stillwater chironomid fishing'),
        ('indicator-fishing-setup-colorado-lakes.html', 'Indicator fishing setup for Colorado lakes'),
    ],
    'leech': [
        ('balanced-leech-stillwater-colorado.html', 'Balanced leech for Colorado stillwater'),
        ('biggest-mistake-stillwater-anglers.html', 'The biggest mistake stillwater anglers make'),
        ('colorado-trophy-trout-guide.html', 'Colorado trophy trout playbook'),
    ],
    'sticker': [
        ('best-chironomid-fly-patterns.html', 'The 5 chironomid patterns we lean on'),
        ('colorado-trophy-trout-guide.html', 'Colorado trophy trout playbook'),
    ],
    'bundle': [
        ('best-chironomid-fly-patterns.html', 'The 5 chironomid patterns we lean on'),
        ('balanced-leech-stillwater-colorado.html', 'Balanced leech for Colorado stillwater'),
        ('spinney-mountain-reservoir-guide.html', 'Spinney Mountain Reservoir guide'),
    ],
    'fly': [
        ('best-chironomid-fly-patterns.html', 'The 5 chironomid patterns we lean on'),
        ('colorado-trophy-trout-guide.html', 'Colorado trophy trout playbook'),
    ],
}


PAGE_TEMPLATE = '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<meta name="description" content="{meta_desc}">
<link rel="canonical" href="{canonical}">

<meta property="og:type" content="product">
<meta property="og:title" content="{og_title}">
<meta property="og:description" content="{meta_desc}">
<meta property="og:image" content="{og_image}">
<meta property="og:url" content="{canonical}">
<meta property="og:site_name" content="Trout Tricks">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{og_title}">
<meta name="twitter:description" content="{meta_desc}">
<meta name="twitter:image" content="{og_image}">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;700&display=swap" rel="stylesheet">

<script type="application/ld+json">
{product_jsonld}
</script>

<script type="application/ld+json">
{breadcrumb_jsonld}
</script>

<style>
:root {{
  --red: #C0392B;
  --red-bright: #E74C3C;
  --gold: #D4AF37;
  --white: #fff;
  --gray: #999;
  --dark: #0a0a0a;
  --card: #1a1a1a;
  --border: #2a2a2a;
}}
* {{ box-sizing: border-box; }}
body {{
  margin: 0;
  background: var(--dark);
  color: var(--white);
  font-family: 'Barlow Condensed', sans-serif;
  line-height: 1.55;
}}
header {{
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 24px;
  border-bottom: 1px solid var(--border);
  background: #050505;
}}
header .logo {{
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.55rem;
  letter-spacing: 0.04em;
  text-decoration: none;
  color: var(--white);
}}
header .logo span {{ color: var(--red); }}
header nav {{ display: flex; gap: 6px; flex-wrap: wrap; }}
header nav a {{
  color: var(--white);
  text-decoration: none;
  font-size: 0.82rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 6px 9px;
  border: 1px solid transparent;
  border-radius: 3px;
}}
header nav a:hover {{ border-color: var(--red); color: var(--red); }}
.cart-pill {{
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--red); color: #fff;
  padding: 6px 12px; border-radius: 4px;
  text-decoration: none;
  font-family: 'Bebas Neue', sans-serif;
  font-size: 0.92rem; letter-spacing: 0.1em;
  text-transform: uppercase;
  border: 2px solid var(--red-bright);
}}
.cart-pill:hover {{ background: var(--red-bright); }}
.cart-pill-count {{
  background: rgba(0,0,0,0.4);
  border-radius: 12px;
  padding: 0 8px;
  font-size: 0.85rem;
  min-width: 18px;
  text-align: center;
}}

/* Quick-add UI in hero */
.quick-add {{
  margin-top: 20px;
  padding: 16px;
  background: rgba(0,0,0,0.25);
  border: 1px solid var(--border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}}
.qa-row {{
  display: flex; align-items: center; gap: 12px;
  flex-wrap: wrap;
}}
.qa-row label {{
  font-family: 'Bebas Neue', sans-serif;
  font-size: 0.85rem; letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--gray);
  min-width: 60px;
}}
.qa-row select {{
  background: #0a0a0a;
  border: 1px solid var(--border);
  color: var(--white);
  padding: 8px 12px;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.95rem;
  min-width: 100px;
  cursor: pointer;
}}
.qa-qty-row {{
  display: inline-flex; align-items: center;
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
}}
.qa-qty-btn {{
  background: #111; border: none;
  color: var(--white);
  width: 36px; height: 36px;
  font-size: 1.1rem; font-weight: 700;
  cursor: pointer;
}}
.qa-qty-btn:hover {{ background: var(--red); }}
.qa-qty {{
  display: inline-block;
  min-width: 36px; text-align: center;
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.1rem; padding: 0 10px;
}}
.qa-add {{
  margin-top: 4px;
  width: 100%;
  justify-content: center;
}}

/* Toast notification */
#toast {{
  position: fixed;
  bottom: 24px; left: 50%;
  transform: translateX(-50%) translateY(120%);
  background: var(--red);
  color: #fff;
  padding: 12px 24px;
  border-radius: 6px;
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1rem; letter-spacing: 0.08em;
  text-transform: uppercase;
  box-shadow: 0 4px 20px rgba(0,0,0,0.6);
  z-index: 3000;
  transition: transform 0.4s ease;
  pointer-events: none;
}}
#toast.show {{ transform: translateX(-50%) translateY(0); }}
.breadcrumb {{
  padding: 14px 24px;
  font-size: 0.78rem;
  color: var(--gray);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}}
.breadcrumb a {{ color: var(--gray); text-decoration: none; }}
.breadcrumb a:hover {{ color: var(--red); }}
main {{ max-width: 920px; margin: 0 auto; padding: 12px 24px 48px; }}
.hero {{
  display: grid; grid-template-columns: 1fr 1fr; gap: 36px;
  margin-bottom: 36px;
}}
@media (max-width: 720px) {{
  .hero {{ grid-template-columns: 1fr; gap: 24px; }}
}}
.hero-img-wrap {{
  background: #111;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 1 / 1;
  display: flex; align-items: center; justify-content: center;
}}
.hero-img-wrap img {{ width: 100%; height: 100%; object-fit: cover; display: block; }}
.hero-info h1 {{
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(2.2rem, 5vw, 3.2rem);
  letter-spacing: 0.03em;
  margin: 0 0 12px;
  line-height: 1.05;
}}
.hero-badge {{
  display: inline-block;
  background: var(--red);
  color: #fff;
  font-size: 0.7rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  padding: 4px 9px;
  border-radius: 3px;
  margin-bottom: 14px;
  font-weight: 700;
}}
.hero-badge.gold {{ background: var(--gold); color: #000; }}
.hero-price {{
  font-family: 'Bebas Neue', sans-serif;
  font-size: 2rem;
  color: var(--gold);
  margin: 0 0 16px;
}}
.hero-price .per {{ font-size: 0.7rem; color: var(--gray); letter-spacing: 0.16em; }}
.hero-desc {{
  font-size: 1rem; color: #d6d6d6;
  margin: 0 0 22px;
  line-height: 1.6;
}}
.cta-row {{ display: flex; flex-wrap: wrap; gap: 10px; }}
.btn-primary {{
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--red); color: #fff;
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.05rem; letter-spacing: 0.14em;
  text-decoration: none;
  padding: 12px 24px;
  border-radius: 4px;
  border: 2px solid var(--red-bright);
  text-transform: uppercase;
  cursor: pointer;
}}
.btn-primary:hover {{ background: var(--red-bright); }}
.btn-ghost {{
  display: inline-flex; align-items: center; gap: 6px;
  background: transparent; color: var(--red);
  border: 1px solid var(--red);
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.05rem; letter-spacing: 0.14em;
  text-decoration: none;
  padding: 12px 24px;
  border-radius: 4px;
  text-transform: uppercase;
  cursor: pointer;
}}
.btn-ghost:hover {{ background: var(--red); color: #fff; }}
section {{ margin: 36px 0; }}
section h2 {{
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.5rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin: 0 0 14px;
  color: var(--white);
  border-bottom: 1px solid var(--red);
  padding-bottom: 6px;
}}
.specs-grid {{
  display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 14px;
}}
.spec {{
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 12px 16px;
}}
.spec-label {{
  font-size: 0.7rem; color: var(--gray);
  letter-spacing: 0.14em; text-transform: uppercase;
  margin-bottom: 4px;
}}
.spec-value {{ font-size: 1rem; color: #e6e6e6; }}
.lakes-prose {{ font-size: 0.95rem; color: #c8c8c8; line-height: 1.7; }}
ul.blog-links {{ list-style: none; padding: 0; margin: 0; }}
ul.blog-links li {{ margin-bottom: 8px; }}
ul.blog-links a {{
  color: var(--red); text-decoration: none;
  font-size: 0.95rem; letter-spacing: 0.02em;
  border-bottom: 1px solid transparent;
}}
ul.blog-links a:hover {{ border-color: var(--red); }}
.bottom-cta {{
  background: linear-gradient(135deg, #1a1a1a 0%, #222 100%);
  border: 1px solid var(--red);
  border-radius: 8px;
  padding: 28px 24px;
  margin: 48px 0 24px;
  text-align: center;
}}
.bottom-cta h3 {{
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.55rem; letter-spacing: 0.06em;
  margin: 0 0 10px;
  text-transform: uppercase;
}}
.bottom-cta p {{ font-size: 0.95rem; color: #c8c8c8; margin: 0 0 16px; }}
footer {{
  border-top: 1px solid var(--border);
  padding: 28px 24px;
  text-align: center;
  font-size: 0.78rem; color: var(--gray);
  letter-spacing: 0.08em;
}}
footer a {{ color: var(--red); text-decoration: none; }}
</style>
</head>
<body>

<header>
  <a class="logo" href="/">TROUT <span>TRICKS</span></a>
  <nav>
    <a href="/">The Flies</a>
    <a href="/stickers.html">The Stickers</a>
    <a href="/fish.html">The Fish</a>
    <a href="/the-drop.html">The Drop</a>
    <a href="/blog.html">Blog</a>
    <a href="/about.html">About</a>
  </nav>
  <a class="cart-pill" href="/#shop" aria-label="View cart">
    🪝 Cart <span class="cart-pill-count" id="cart-pill-count">0</span>
  </a>
</header>

<nav class="breadcrumb">
  <a href="/">Trout Tricks</a> &nbsp;/&nbsp; <a href="/#shop">{breadcrumb_parent}</a> &nbsp;/&nbsp; {name_plain}
</nav>

<main>
  <div class="hero">
    <div class="hero-img-wrap">
      <img src="/{img_src}" alt="{name_plain} — Trout Tricks Colorado stillwater fly pattern" width="600" height="600" loading="eager" fetchpriority="high"{rotate_style}>
    </div>
    <div class="hero-info">
      {badge_html}
      <h1>{name_plain}</h1>
      <div class="hero-price">{price_display}{price_suffix}</div>
      <p class="hero-desc">{desc_plain}</p>
      {quick_add_html}
    </div>
  </div>

  <section>
    <h2>Specs</h2>
    <div class="specs-grid">
      {specs_html}
    </div>
  </section>

  {fish_it_on_html}

  <section>
    <h2>Read More</h2>
    <ul class="blog-links">
      {blog_links_html}
    </ul>
  </section>

  <div class="bottom-cta">
    <h3>Ready to fish it?</h3>
    <p>Hand-tied to order in Colorado. Add it to your cart above &mdash; we&rsquo;ll ship it out.</p>
    <a class="btn-primary" href="/#shop">View Full Cart &amp; Checkout &rarr;</a>
  </div>
</main>

<div id="toast" aria-live="polite"></div>

<footer>
  &copy; 2026 Trout Tricks &middot; Hand-tied in Colorado &middot;
  <a href="/contact.html">Contact</a> &middot;
  <a href="/the-drop.html">The Drop</a> &middot;
  <a href="/blog.html">Blog</a>
</footer>

<script src="/js/catalog.js"></script>
<script>
// Quick-Add: writes to the same `tt_cart` localStorage shape the homepage cart
// reads, so adds made here show up in the homepage cart panel + checkout flow.
function quickAdd(flyId) {{
  const fly = (typeof flies !== 'undefined') ? flies.find(f => f.id === flyId) : null;
  if (!fly) {{ console.warn('Fly not found:', flyId); return; }}
  const sizeEl = document.getElementById('qa-size');
  const colorEl = document.getElementById('qa-color');
  const qtyEl = document.getElementById('qa-qty');
  const size = sizeEl ? sizeEl.value : (fly.sizes ? fly.sizes[0] : null);
  const color = colorEl ? colorEl.value : null;
  const qty = qtyEl ? parseInt(qtyEl.textContent, 10) || 1 : 1;
  let cart = [];
  try {{ cart = JSON.parse(localStorage.getItem('tt_cart') || '[]'); }} catch(e) {{}}
  cart.push({{ flyId: flyId, size: size, color: color, qty: qty,
              pickup: false, uid: Date.now() + Math.random() }});
  localStorage.setItem('tt_cart', JSON.stringify(cart));
  updateCartCount();
  const label = (fly.category === 'sticker' || fly.bundle) ? '' : ' pack' + (qty > 1 ? 's' : '');
  showToast(qty + label + ' of ' + fly.name + ' added!');
  if (typeof gtag === 'function') {{
    try {{ gtag('event', 'add_to_cart', {{ currency: 'USD', value: fly.price * qty, item_name: fly.name, quantity: qty }}); }} catch(e) {{}}
  }}
}}
function updateCartCount() {{
  let cart = [];
  try {{ cart = JSON.parse(localStorage.getItem('tt_cart') || '[]'); }} catch(e) {{}}
  const count = cart.reduce((s, i) => s + (parseInt(i.qty, 10) || 1), 0);
  const el = document.getElementById('cart-pill-count');
  if (el) el.textContent = count;
}}
function changeQty(delta) {{
  const el = document.getElementById('qa-qty');
  if (!el) return;
  const next = Math.max(1, (parseInt(el.textContent, 10) || 1) + delta);
  el.textContent = next;
}}
function showToast(msg) {{
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._tid);
  showToast._tid = setTimeout(() => t.classList.remove('show'), 2800);
}}
document.addEventListener('DOMContentLoaded', updateCartCount);
window.addEventListener('storage', e => {{ if (e.key === 'tt_cart') updateCartCount(); }});
</script>

</body>
</html>
'''


def build_specs(fly):
    rows = []
    if fly.get('sizes'):
        rows.append(('Sizes', ' / '.join(fly['sizes'])))
    if fly.get('colors'):
        rows.append(('Colors', ', '.join(fly['colors'])))
    if fly.get('pack'):
        unit = 'pack' if not fly.get('category') == 'sticker' else 'each'
        rows.append(('Pack Size', f'{fly["pack"]} per {unit}'))
    rows.append(('Tier', 'Trout Tricks'))
    rows.append(('Tied', 'Hand-tied to order'))
    return '\n      '.join(
        f'<div class="spec"><div class="spec-label">{html_escape(lbl)}</div><div class="spec-value">{html_escape(val)}</div></div>'
        for lbl, val in rows
    )


def build_quick_add(fly, cat):
    """Build the in-page Add-to-Cart UI for the hero. Writes to localStorage
    tt_cart in the same shape the homepage cart reads, so adds persist across
    pages. Showing the full slide-in cart panel stays on the homepage to keep
    per-fly pages light and avoid duplicating ~600 lines of cart code per page."""
    if cat == 'bundle':
        # Bundles use a single "Add Bundle" button (no size/color selection)
        return f'''<div class="quick-add">
        <button class="btn-primary qa-add" onclick="quickAdd({fly['id']})">🪝 Add Bundle to Cart</button>
        <a class="btn-ghost" href="/#shop">View Full Cart &rarr;</a>
      </div>'''

    size_sel = ''
    if fly.get('sizes'):
        opts = '\n          '.join(f'<option>{s}</option>' for s in fly['sizes'])
        size_sel = f'''<div class="qa-row">
        <label for="qa-size">Size</label>
        <select id="qa-size">
          {opts}
        </select>
      </div>'''

    color_sel = ''
    if fly.get('colors'):
        opts = '\n          '.join(f'<option>{c}</option>' for c in fly['colors'])
        color_sel = f'''<div class="qa-row">
        <label for="qa-color">Color</label>
        <select id="qa-color">
          {opts}
        </select>
      </div>'''

    qty_label = 'Qty' if cat == 'sticker' else 'Packs'

    return f'''<div class="quick-add">
      {size_sel}
      {color_sel}
      <div class="qa-row">
        <label>{qty_label}</label>
        <div class="qa-qty-row">
          <button type="button" class="qa-qty-btn" onclick="changeQty(-1)">−</button>
          <span class="qa-qty" id="qa-qty">1</span>
          <button type="button" class="qa-qty-btn" onclick="changeQty(1)">+</button>
        </div>
      </div>
      <button class="btn-primary qa-add" onclick="quickAdd({fly['id']})">🪝 Add to Cart</button>
      <a class="btn-ghost" href="/#shop">View Full Cart &rarr;</a>
    </div>'''


def build_meta_desc(fly, cat):
    base = fly['desc'].rstrip('.')
    if cat == 'chironomid':
        suffix = ' Hand-tied chironomid pattern for Colorado stillwater fly fishing — Antero, Spinney, 11 Mile, Delaney.'
    elif cat == 'leech':
        suffix = ' Hand-tied leech pattern for Colorado and Wyoming stillwater fly fishing.'
    elif cat == 'sticker':
        suffix = ' Trout Tricks sticker — Colorado stillwater fly fishing brand.'
    elif cat == 'bundle':
        suffix = ' Trout Tricks bundle pack — hand-tied Colorado stillwater patterns.'
    else:
        suffix = ' Hand-tied Trout Tricks fly pattern from Colorado.'
    text = (base + '.' + suffix).strip()
    # Cap at ~280 chars, snap back to a word boundary, append ellipsis if truncated
    if len(text) <= 280:
        return text
    cut = text[:280].rsplit(' ', 1)[0].rstrip('.,;:—-')
    return cut + '…'


def build_page(fly):
    cat = category(fly)
    slug = slugify(fly['name'])
    name_plain = fly['name']
    desc_plain = fly['desc']
    img_key = fly.get('img')
    img_src = fly_images.get(img_key, '') if img_key else ''
    if not img_src and fly.get('bundle'):
        # Bundle: use first child's image
        first = next((f for f in flies if f['id'] in fly.get('bundle_includes', [])), None)
        if first:
            img_src = fly_images.get(first.get('img'), '')
    if not img_src and fly.get('gallery'):
        img_src = fly_images.get(fly['gallery'][0], '')

    canonical = f'{SITE}/flies/{slug}.html'
    og_image = f'{SITE}/{img_src}' if img_src else f'{SITE}/images/fly2.jpg'

    if cat == 'sticker':
        title = f"{name_plain} — Trout Tricks Colorado Fly Fishing Sticker"
        breadcrumb_parent = 'Stickers'
    elif cat == 'bundle':
        title = f"{name_plain} — Trout Tricks Hand-Tied Fly Bundle Colorado Stillwater"
        breadcrumb_parent = 'Bundles'
    else:
        title = f"{name_plain} — Trout Tricks Hand-Tied Colorado Stillwater Fly Pattern"
        breadcrumb_parent = 'Flies'

    meta_desc = build_meta_desc(fly, cat)
    og_title = f'{name_plain} — Trout Tricks'

    # Badge
    badge_html = ''
    if fly.get('badge'):
        gold = ' gold' if fly['badge'] == 'Top Secret' else ''
        badge_html = f'<span class="hero-badge{gold}">{html_escape(fly["badge"])}</span>'

    # Price
    price_display = f'${fly["price"]}'
    price_suffix = ''
    if fly.get('pack') and cat not in ('sticker',):
        price_suffix = f' <span class="per">/ {fly["pack"]}-pack</span>'
    elif cat == 'sticker':
        price_suffix = ' <span class="per">/ each</span>'

    rotate_style = ' style="transform:rotate(90deg) scale(1.4);"' if fly.get('id') == 9 else ''

    # Quick-Add UI
    quick_add_html = build_quick_add(fly, cat)

    # Specs
    specs_html = build_specs(fly)

    # Fish it on (only for chironomid/leech)
    fish_it_on_html = ''
    if cat in FISH_IT_ON:
        heading, prose = FISH_IT_ON[cat]
        fish_it_on_html = f'''<section>
    <h2>Fish It On — {html_escape(heading)}</h2>
    <p class="lakes-prose">{prose}</p>
  </section>'''

    # Blog links
    links = RELATED_BLOG_LINKS.get(cat, RELATED_BLOG_LINKS['fly'])
    blog_links_html = '\n      '.join(
        f'<li><a href="/blog/{href}">{html_escape(label)}</a></li>'
        for href, label in links
    )

    # JSON-LD payloads
    product = {
        '@context': 'https://schema.org/',
        '@type': 'Product',
        'name': name_plain,
        'image': og_image,
        'description': desc_plain,
        'brand': {'@type': 'Brand', 'name': 'Trout Tricks'},
        'offers': {
            '@type': 'Offer',
            'url': canonical,
            'priceCurrency': 'USD',
            'price': str(fly['price']),
            'availability': 'https://schema.org/InStock',
            'seller': {'@type': 'Organization', 'name': 'Trout Tricks'},
        }
    }
    breadcrumb = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Trout Tricks', 'item': SITE + '/'},
            {'@type': 'ListItem', 'position': 2, 'name': breadcrumb_parent, 'item': SITE + '/#shop'},
            {'@type': 'ListItem', 'position': 3, 'name': name_plain, 'item': canonical},
        ]
    }

    return PAGE_TEMPLATE.format(
        title=html_escape(title),
        meta_desc=attr_escape(meta_desc),
        canonical=canonical,
        og_title=attr_escape(og_title),
        og_image=og_image,
        product_jsonld=json.dumps(product, indent=2),
        breadcrumb_jsonld=json.dumps(breadcrumb, indent=2),
        name_plain=html_escape(name_plain),
        breadcrumb_parent=html_escape(breadcrumb_parent),
        slug=slug,
        img_src=img_src,
        rotate_style=rotate_style,
        badge_html=badge_html,
        price_display=price_display,
        price_suffix=price_suffix,
        desc_plain=html_escape(desc_plain),
        quick_add_html=quick_add_html,
        specs_html=specs_html,
        fish_it_on_html=fish_it_on_html,
        blog_links_html=blog_links_html,
    )


# ---- Generate pages ----
os.makedirs(OUT_DIR, exist_ok=True)
generated = []
for fly in flies:
    slug = slugify(fly['name'])
    out_path = os.path.join(OUT_DIR, slug + '.html')
    html = build_page(fly)
    with open(out_path, 'w') as f:
        f.write(html)
    generated.append((slug, fly['name']))
    print(f'  /flies/{slug}.html  -- {fly["name"]}')

print(f'\nGenerated {len(generated)} per-fly pages -> {OUT_DIR}')

# ---- Append sitemap entries ----
sitemap_path = os.path.join(REPO, 'sitemap.xml')
with open(sitemap_path) as f:
    sm = f.read()
# Remove any existing /flies/ entries first
sm = re.sub(r'\s*<url><loc>https://www\.trouttricks\.com/flies/[^<]+</loc>[^<]*<lastmod>[^<]+</lastmod>[^<]*<priority>[^<]+</priority>[^<]*<changefreq>[^<]+</changefreq></url>\s*', '\n  ', sm)
# Add new entries before </urlset>
today = '2026-05-12'
new_urls = '\n'.join(
    f'  <url><loc>https://www.trouttricks.com/flies/{s}.html</loc><lastmod>{today}</lastmod><priority>0.85</priority><changefreq>weekly</changefreq></url>'
    for s, _ in generated
)
sm = sm.replace('</urlset>', new_urls + '\n</urlset>')
with open(sitemap_path, 'w') as f:
    f.write(sm)
print(f'Updated sitemap.xml with {len(generated)} /flies/ entries')
