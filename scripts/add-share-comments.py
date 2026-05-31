#!/usr/bin/env python3
"""One-shot patcher: add a share bar + comments section to every real blog article.

Idempotent — re-running skips files already patched (guards on marker strings).
The stub redirect (delaney-buttes-lake-john-wyoming.html) is left untouched.
"""
import re
import sys
import glob
import os

STUB = "blog/delaney-buttes-lake-john-wyoming.html"

# --- 1. Share bar (inserted right after the <div class="post-meta">…</div> line) ---
SHARE_BAR = '''<div class="article-share" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:18px 0 4px;">
<span style="color:#888;font-family:'Barlow Condensed',Impact,sans-serif;font-size:0.8rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Share</span>
<a class="tt-sh" href="#" onclick="ttShareArticle();return false;" aria-label="Share this article" title="Share / copy link" style="display:inline-flex;align-items:center;gap:6px;background:#c0392b;color:#fff;text-decoration:none;padding:7px 14px;border-radius:4px;font-family:'Barlow Condensed',Impact,sans-serif;font-size:0.85rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">🔗 Share</a>
<a class="tt-sh" href="#" onclick="ttShareTo('fb');return false;" aria-label="Share on Facebook" title="Facebook" style="display:inline-flex;align-items:center;background:#1f1f1f;color:#ccc;text-decoration:none;padding:7px 12px;border-radius:4px;border:1px solid #333;font-family:'Barlow Condensed',Impact,sans-serif;font-size:0.85rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">Facebook</a>
<a class="tt-sh" href="#" onclick="ttShareTo('x');return false;" aria-label="Share on X" title="X / Twitter" style="display:inline-flex;align-items:center;background:#1f1f1f;color:#ccc;text-decoration:none;padding:7px 12px;border-radius:4px;border:1px solid #333;font-family:'Barlow Condensed',Impact,sans-serif;font-size:0.85rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">X</a>
<a class="tt-sh" href="#" onclick="ttShareTo('email');return false;" aria-label="Share by email" title="Email" style="display:inline-flex;align-items:center;background:#1f1f1f;color:#ccc;text-decoration:none;padding:7px 12px;border-radius:4px;border:1px solid #333;font-family:'Barlow Condensed',Impact,sans-serif;font-size:0.85rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">Email</a>
</div>
'''

# --- 2. Comments mount (inserted after the related-articles </section>) ---
COMMENTS = '''<section class="article-comments" style="margin-top:44px;padding-top:8px;">
<h2 style="color:#f0f0f0;font-family:'Barlow Condensed',Impact,sans-serif;font-size:1.4rem;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:18px;padding-bottom:8px;border-bottom:1px solid #2a2a2a;">Comments</h2>
<div id="tt-comments"></div>
</section>
'''

# --- 3. Page-level share helper (uses og:url / canonical for the URL) ---
SHARE_HELPER = '''<script>
/* tt-article-share-v1 — wraps the shared ttShareFly helper for blog posts */
function ttArticleMeta(){
  var u=document.querySelector('link[rel="canonical"]');
  u=u?u.href:(document.querySelector('meta[property="og:url"]')||{}).content||location.href;
  var t=(document.querySelector('meta[property="og:title"]')||{}).content||document.title;
  return {url:u,title:t};
}
function ttShareArticle(){var m=ttArticleMeta();ttShareFly(m.title,m.title,m.url);}
function ttShareTo(net){
  var m=ttArticleMeta(),u=encodeURIComponent(m.url),t=encodeURIComponent(m.title),h;
  if(net==='fb')h='https://www.facebook.com/sharer/sharer.php?u='+u;
  else if(net==='x')h='https://twitter.com/intent/tweet?url='+u+'&text='+t;
  else if(net==='email')h='mailto:?subject='+t+'&body='+t+'%20'+u;
  if(net==='email'){location.href=h;}else{window.open(h,'_blank','noopener,width=600,height=520');}
}
</script>
'''

SCRIPTS = '''<script src="/js/share-fly.js" defer></script>
<script src="/js/comments.js" defer></script>
'''

NAV_LINE = '<script src="/js/nav.js" defer></script>'


def patch(path):
    with open(path, encoding="utf-8") as f:
        html = f.read()
    orig = html

    # 1. Share bar after post-meta (only if not already present)
    if 'class="article-share"' not in html:
        html = re.sub(
            r'(<div class="post-meta">.*?</div>\n)',
            r'\1' + SHARE_BAR,
            html,
            count=1,
            flags=re.S,
        )

    # 2. Comments section after the related-articles </section>
    if 'id="tt-comments"' not in html:
        # related-articles section is the only one closed right before blog-post close
        html = re.sub(
            r'(</section>\n)(</div>\n</div>\n<!-- CART OVERLAY)',
            r'\1' + COMMENTS + r'\2',
            html,
            count=1,
        )

    # 3. Scripts + helper after nav.js loader
    if "tt-article-share-v1" not in html:
        html = html.replace(NAV_LINE, NAV_LINE + "\n" + SCRIPTS + SHARE_HELPER, 1)

    if html != orig:
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)
        return True
    return False


def main():
    changed = []
    skipped = []
    for path in sorted(glob.glob("blog/*.html")):
        if path == STUB:
            skipped.append(path + " (stub redirect)")
            continue
        if patch(path):
            changed.append(path)
        else:
            skipped.append(path + " (already patched / no change)")
    print(f"Patched {len(changed)} files:")
    for c in changed:
        print("  +", c)
    if skipped:
        print(f"Skipped {len(skipped)}:")
        for s in skipped:
            print("  -", s)


if __name__ == "__main__":
    os.chdir(os.path.join(os.path.dirname(__file__), ".."))
    main()
