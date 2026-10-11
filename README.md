# instantnode.eu

The public website of [InstantNode](https://instantnode.eu): game servers, KVM/LXC VPS,
VDS, web hosting, managed email and databases, hosted in the Netherlands (EU).

This repository is published so the code can be read. It is **not open source**:
all rights are reserved, see [LICENSE](LICENSE). Please do not copy or reuse it.

## What is in here

- Plain static HTML, CSS and JavaScript. No framework, no build step: every page is
  a finished `.html` file and is served as it is.
- `css/lunaris.css`, `css/product.css` - the shared design system and the product page parts.
- `js/lunaris.js` - the glyph-halftone ASCII art (`<canvas class="art" data-art="...">`),
  navigation, reveal on scroll and the small motion layer.
- `js/inn-lang.js` + `i18n/<lang>/*.json` - runtime translation: English source text,
  German, French and Spanish dictionaries.
- `img/3d/` - the 3D product renders on the product pages.
- `partials/` - the shared header and footer. Edit `partials/site-header.html` or
  `partials/site-footer*.html`, then run `python3 partials/sync.py` to write them into
  every page (`--check` lists pages that are out of sync).

## Contact

Questions, permission requests or a bug on the site: contact@instantnode.eu
Security issues or abuse: abuse@instantnode.eu
