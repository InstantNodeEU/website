/*
 * Display language for the static marketing site.
 *
 * English is the source. The text in the HTML is what ships, and every other
 * language is keyed on it: i18n/<code>.json maps each English unit (an
 * element's text, whitespace-collapsed) to its translation, which may carry
 * the same inline markup. A unit without an entry simply stays English - so a
 * copy change in the HTML never surfaces a stale translation, it shows English
 * until the dictionary catches up. No data-i18n attributes to maintain.
 *
 * Two dictionaries per language: i18n/<code>.json (header, footer, announcement -
 * everything every page shares) and i18n/<code>/<page>.json for the page's own
 * copy. A page without its own file simply gets the shared strings.
 *
 * Legal pages have official German versions under /de/: picking Deutsch there
 * navigates to that page instead of translating in place, and the /de/ pages
 * offer the way back. French and Spanish stay on the English legal text.
 *
 * It shares the panel's localStorage key (inn_ui_prefs.locale), so the language
 * picked in the dashboard profile applies out here and the other way round.
 * ?lang=de in the URL picks (and saves) a language too.
 *
 * Load this BEFORE inn-currency.js: units are snapshotted at execution time,
 * so the keys are the pristine English text - not a price the currency walk
 * already rewrote. After every swap an 'inn:lang' event tells the currency
 * script to re-collect its price nodes (they were replaced).
 */
(function () {
  'use strict'

  var LS_KEY = 'inn_ui_prefs'
  var DICT_V = '14'
  var LANGS = [
    { code: 'en', name: 'English' },
    { code: 'de', name: 'Deutsch' },
    { code: 'fr', name: 'Français' },
    { code: 'es', name: 'Español' },
  ]
  // Subtrees that never hold copy.
  var SKIP = { SCRIPT: 1, STYLE: 1, SVG: 1, CODE: 1, PRE: 1, NOSCRIPT: 1, TEXTAREA: 1, CANVAS: 1, TEMPLATE: 1, SELECT: 1 }
  // Figures lunaris.js writes from the API: keep whatever they show across a swap.
  var LIVE = '.js-customer-count, .js-user-count'
  var ATTRS = ['aria-label', 'alt', 'placeholder', 'title']
  var HEAD = 'meta[name="description"], meta[name="title"], meta[property="og:title"], meta[property="og:description"], meta[name="twitter:title"], meta[name="twitter:description"]'

  function norm(s) { return (s || '').replace(/\s+/g, ' ').trim() }
  function prefs() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch (e) { return {} }
  }
  function savePref(code) {
    var p = prefs()
    p.locale = code
    try { localStorage.setItem(LS_KEY, JSON.stringify(p)) } catch (e) { /* private mode */ }
  }
  function known(code) {
    for (var i = 0; i < LANGS.length; i++) if (LANGS[i].code === code) return true
    return false
  }

  /* ---------- which page is this ---------- */

  // English legal page -> its German counterpart under /de/ (same name unless mapped).
  var LEGAL = { terms: 'terms', privacy: 'privacy', dpa: 'avv', withdrawal: 'withdrawal', payment: 'payment', 'partner-terms': 'partner-terms',
    'fair-use': 'fair-use', abuse: 'abuse', imprint: 'imprint', standards: 'standards', 'cancel-contract': 'cancel-contract' }
  var path = location.pathname.replace(/\.html$/, '').replace(/\/$/, '')
  var onDePage = /^\/de\//.test(path)
  var slug = path === '' ? 'index' : path.replace(/^\/(de\/)?/, '')
  var legalDe = !onDePage && LEGAL[slug] ? '/de/' + LEGAL[slug] : null
  function englishTwin() {  // /de/avv -> /dpa, /de/terms -> /terms
    for (var k in LEGAL) if (LEGAL[k] === slug) return '/' + k
    return '/' + slug
  }

  /* ---------- units ---------- */

  // A unit is the highest element in a branch that has text of its own. Its
  // children (a <small>, a <b>, a link inside a sentence) are part of the unit
  // and travel with it in the translation's markup.
  var units = []      // { el, key, html, state }
  var attrUnits = []  // { el, attr, key, state }
  var headUnits = []  // { el, attr, key, state }  (title + meta)

  function hasOwnText(el) {
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3 && norm(n.nodeValue)) return true
    }
    return false
  }
  function visit(el) {
    if (SKIP[el.nodeName.toUpperCase()] || el.hasAttribute('data-no-i18n')) return
    for (var i = 0; i < ATTRS.length; i++) {
      var v = el.getAttribute(ATTRS[i])
      if (v && norm(v)) attrUnits.push({ el: el, attr: ATTRS[i], key: norm(v), state: 'en' })
    }
    if (hasOwnText(el)) {
      units.push({ el: el, key: norm(el.textContent), html: el.innerHTML, state: 'en' })
      return
    }
    for (var c = el.firstElementChild; c; c = c.nextElementSibling) visit(c)
  }
  function collect() {
    visit(document.body)
    var t = document.querySelector('title')
    if (t && norm(t.textContent)) headUnits.push({ el: t, attr: null, key: norm(t.textContent), state: 'en' })
    Array.prototype.forEach.call(document.querySelectorAll(HEAD), function (m) {
      var v = m.getAttribute('content')
      if (v && norm(v)) headUnits.push({ el: m, attr: 'content', key: norm(v), state: 'en' })
    })
  }

  function liveSnapshot(root) {
    var out = []
    Array.prototype.forEach.call(root.querySelectorAll(LIVE), function (el) {
      out.push({ cls: el.className, text: el.textContent })
    })
    return out
  }
  function liveRestore(root, snap) {
    snap.forEach(function (s) {
      Array.prototype.forEach.call(root.querySelectorAll(LIVE), function (el) {
        if (el.className === s.cls) el.textContent = s.text
      })
    })
  }

  // val: the translated inner markup, or null for the English original.
  function setUnit(u, val) {
    var live = liveSnapshot(u.el)
    if (val === null) {
      u.el.innerHTML = u.html
    } else if (val.indexOf('<') === -1 && u.el.children.length) {
      // Plain-text translation for a unit that also holds an icon (the ticker
      // items, the nav buttons): swap the text nodes, leave the elements be.
      var done = false
      for (var n = u.el.firstChild; n; n = n.nextSibling) {
        if (n.nodeType !== 3 || !norm(n.nodeValue)) continue
        if (done) { n.nodeValue = '' ; continue }
        n.nodeValue = n.nodeValue.replace(/^(\s*)[\s\S]*?(\s*)$/, function (_, a, b) { return a + val + b })
        done = true
      }
    } else if (val.indexOf('<') === -1) {
      u.el.textContent = val
    } else {
      // Markup translation: the dictionary carries the inline tags but never
      // the icons, so lift any direct svg/img out first and put them back at
      // the same positions afterwards.
      var icons = []
      var idx = 0
      for (var c = u.el.firstChild; c; c = c.nextSibling, idx++) {
        if (c.nodeType === 1 && /^(svg|img)$/i.test(c.nodeName)) icons.push({ node: c, idx: idx })
      }
      u.el.innerHTML = val
      icons.forEach(function (ic) { u.el.insertBefore(ic.node, u.el.childNodes[ic.idx] || null) })
    }
    liveRestore(u.el, live)
  }

  function render(code, dict) {
    var debug = /[?&]lang_debug=1/.test(location.search)
    units.forEach(function (u) {
      if (!u.el.isConnected) return
      var v = code === 'en' ? null : dict[u.key]
      if (v === undefined) v = null
      var want = v === null ? 'en' : code
      if (debug) {
        if (v === null && code !== 'en') u.el.setAttribute('data-i18n-miss', '')
        else u.el.removeAttribute('data-i18n-miss')
      }
      if (u.state === want) return
      setUnit(u, v)
      u.state = want
    })
    attrUnits.concat(headUnits).forEach(function (a) {
      var v = code === 'en' ? null : dict[a.key]
      if (v === undefined) v = null
      var want = v === null ? 'en' : code
      if (a.state === want) return
      var out = v === null ? a.key : v
      if (a.attr) a.el.setAttribute(a.attr, out)
      else a.el.textContent = out
      a.state = want
    })
    document.documentElement.lang = code
    paintSwitcher(code)
    try { document.dispatchEvent(new CustomEvent('inn:lang', { detail: { code: code } })) } catch (e) { /* old engines */ }
  }

  /* ---------- dictionaries ---------- */

  var dicts = {}
  var current = 'en'
  function getJson(url) {
    return fetch(url, { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : {} })
      .catch(function () { return {} })
  }
  function load(code, cb) {
    if (dicts[code]) return cb(dicts[code])
    var shared = getJson('/i18n/' + code + '.json?v=' + DICT_V)
    var own = onDePage ? Promise.resolve({}) : getJson('/i18n/' + code + '/' + slug + '.json?v=' + DICT_V)
    Promise.all([shared, own]).then(function (parts) {
      var d = {}
      for (var k in parts[0]) d[k] = parts[0][k]
      for (var j in parts[1]) d[j] = parts[1][j]   // the page's own strings win
      dicts[code] = d
      cb(d)
    })
  }
  function apply(code, save) {
    if (!known(code)) code = 'en'
    if (save) savePref(code)
    // Legal pages: Deutsch means the official German page, not a swap in place.
    if (legalDe && code === 'de') { location.href = legalDe; return }
    if (onDePage && code !== 'de') { location.href = englishTwin(); return }
    current = code
    paintSwitcher(code)
    if (code === 'en') return render('en', {})
    load(code, function (d) { if (current === code) render(code, d) })
  }

  /* ---------- switcher (markup lives in the page, this only wires it) ---------- */

  function paintSwitcher(code) {
    Array.prototype.forEach.call(document.querySelectorAll('.lang-cur'), function (el) { el.textContent = code.toUpperCase() })
    Array.prototype.forEach.call(document.querySelectorAll('[data-lang]'), function (b) {
      var on = b.getAttribute('data-lang') === code
      if (b.hasAttribute('aria-checked')) b.setAttribute('aria-checked', String(on))
      if (b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', String(on))
    })
  }
  function wire() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-lang]'), function (b) {
      b.addEventListener('click', function () {
        var code = b.getAttribute('data-lang')
        if (!known(code)) return
        apply(code, true)
        var drop = b.closest('.drop[data-open]')
        if (drop) {
          drop.removeAttribute('data-open')
          var t = drop.querySelector(':scope > button'); if (t) t.setAttribute('aria-expanded', 'false')
        }
      })
    })
  }

  /* ---------- init ---------- */

  collect()
  wire()
  var fromUrl = null
  try { fromUrl = new URLSearchParams(location.search).get('lang') } catch (e) { /* no URLSearchParams */ }
  if (fromUrl && known(fromUrl)) savePref(fromUrl)
  var want = fromUrl && known(fromUrl) ? fromUrl : (prefs().locale || 'en')
  if (onDePage) {
    // The page is German whatever the preference says; the header follows it.
    current = 'de'; paintSwitcher('de'); load('de', function (d) { render('de', d) })
  } else if (legalDe && want === 'de') {
    location.replace(legalDe)
  } else {
    apply(want, false)
  }

  // For the extractor and for debugging in the console.
  window.innLang = {
    apply: function (code) { apply(code, true) },
    current: function () { return current },
    languages: LANGS,
    keys: function () {
      return {
        units: units.map(function (u) { return { key: u.key, tag: u.el.nodeName.toLowerCase(), html: u.html } }),
        attrs: attrUnits.map(function (a) { return { key: a.key, attr: a.attr, tag: a.el.nodeName.toLowerCase() } }),
        head: headUnits.map(function (h) { return { key: h.key, attr: h.attr, tag: h.el.nodeName.toLowerCase() } }),
      }
    },
    missing: function (code) {
      var d = dicts[code] || {}
      var out = []
      units.concat(attrUnits, headUnits).forEach(function (u) { if (d[u.key] === undefined && out.indexOf(u.key) === -1) out.push(u.key) })
      return out
    },
  }
})()
