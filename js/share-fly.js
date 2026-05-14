// Reusable share helper for fly + sticker cards.
// Used by stickers.html static cards and the generated /flies/<slug>.html pages.
//
// Mobile (Web Share API available): pops the native OS share sheet so users
// can send via Messages / Mail / Instagram DM / whatever they have installed.
// Desktop / no Web Share API: copies the URL to clipboard + shows a toast.

async function ttShareFly(title, text, url) {
  // Prefer native share on mobile. The userAgent check is intentional —
  // some desktop browsers expose navigator.share but it's a worse UX than
  // a clipboard copy on desktop (it just opens a small Chrome share popup).
  if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
    try {
      await navigator.share({ title: title, text: text, url: url });
      return;
    } catch (e) {
      // User cancelled or share failed — fall through to clipboard
    }
  }
  // Desktop fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(url);
    ttShareToast('Link copied — paste anywhere');
  } catch (e) {
    // Last resort: prompt the user with the URL highlighted
    window.prompt('Copy this link:', url);
  }
}

function ttShareToast(msg) {
  var t = document.getElementById('tt-share-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'tt-share-toast';
    t.style.cssText = [
      'position:fixed',
      'bottom:24px',
      'left:50%',
      'transform:translateX(-50%)',
      'background:#c0392b',
      'color:#fff',
      'padding:12px 24px',
      'border-radius:6px',
      'font-family:"Bebas Neue",Impact,sans-serif',
      'font-size:1rem',
      'letter-spacing:0.08em',
      'text-transform:uppercase',
      'z-index:9999',
      'box-shadow:0 4px 20px rgba(0,0,0,0.6)',
      'pointer-events:none'
    ].join(';');
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(ttShareToast._tid);
  ttShareToast._tid = setTimeout(function() { t.style.display = 'none'; }, 2500);
}
