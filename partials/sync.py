#!/usr/bin/env python3
"""Write the shared header and footer into every page.

The site stays plain static HTML. Edit one of
    partials/site-header.html      header + desktop and mobile nav (all pages)
    partials/site-footer.html      footer (all pages)
    partials/site-footer.de.html   footer of the German legal pages under de/
then run from the site root:
    python3 partials/sync.py           rewrite the pages
    python3 partials/sync.py --check   only list pages that are out of sync
/developers keeps its own footer; errors/ and offline.html have neither.
"""
import glob, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, "partials")
HEADER = re.compile(r'<header class="hdr">.*?</header>', re.S)
FOOTER = re.compile(r'<footer\b[^>]*>.*?</footer>', re.S)


def part(name):
    return open(os.path.join(P, name), encoding="utf-8").read().strip("\n")


def pages():
    for f in sorted(glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True)):
        rel = os.path.relpath(f, ROOT)
        if rel.startswith(("partials" + os.sep, "errors" + os.sep, ".")) or rel == "offline.html":
            continue
        yield f, rel


def indent_of(s, i):
    return s[s.rfind("\n", 0, i) + 1:i]


def put(s, rx, block):
    m = rx.search(s)
    if not m:
        return s, False
    pad = indent_of(s, m.start())
    text = block.replace("\n", "\n" + pad) if pad.strip() == "" else block
    return s[:m.start()] + text + s[m.end():], True


def main(check):
    header = part("site-header.html")
    footers = {"": part("site-footer.html"), "de": part("site-footer.de.html")}
    stale, missing = [], []
    for f, rel in pages():
        s = open(f, encoding="utf-8").read()
        new, ok_h = put(s, HEADER, header)
        ok_f = True
        if rel != "developers.html":
            new, ok_f = put(new, FOOTER, footers["de" if rel.startswith("de" + os.sep) else ""])
        if not (ok_h and ok_f):
            missing.append(rel)
        if new != s:
            stale.append(rel)
            if not check:
                open(f, "w", encoding="utf-8").write(new)
    verb = "out of sync" if check else "updated"
    print(f"{len(stale)} pages {verb}" + (": " + ", ".join(stale) if stale and check else ""))
    if missing:
        print("no header/footer found in: " + ", ".join(missing))
    return 1 if check and stale else 0


if __name__ == "__main__":
    sys.exit(main("--check" in sys.argv))
