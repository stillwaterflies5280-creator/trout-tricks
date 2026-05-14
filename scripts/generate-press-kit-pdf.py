#!/usr/bin/env python3
"""Render the live /media-kit.html page to a PDF press kit.

The output PDF is committed to /media/trouttricks-press-kit-2026.pdf and is
the file linked by the "Download Press Kit (PDF)" button on /media-kit.html.

Re-run this script whenever the media kit page is updated:
    python3 scripts/generate-press-kit-pdf.py
or:
    make press-kit
"""
import os
import sys
import time
from playwright.sync_api import sync_playwright

URL = "https://www.trouttricks.com/media-kit.html"
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(REPO, "media", "trouttricks-press-kit-2026.pdf")


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 1800},
            device_scale_factor=2,
        )
        page = context.new_page()
        print(f"Loading {URL} ...")
        page.goto(URL, wait_until="networkidle", timeout=60000)
        # Buffer for fonts + lazy images to settle after networkidle
        time.sleep(2)
        page.emulate_media(media="print")
        page.pdf(
            path=OUT,
            format="Letter",
            print_background=True,
            prefer_css_page_size=False,
            margin={"top": "0.4in", "right": "0.4in", "bottom": "0.4in", "left": "0.4in"},
        )
        browser.close()
    size_kb = os.path.getsize(OUT) / 1024
    print(f"Wrote {OUT} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    sys.exit(main())
