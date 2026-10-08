/*
 * Display currency for the static marketing site.
 *
 * EUR is the price. Every payment is charged in EUR, every invoice is a EUR
 * document, and the EUR figure is what the pages ship in their HTML - this only
 * rewrites what a visitor sees, at the ECB reference rate from /api/v1/public/fx.
 *
 * It shares the panel's localStorage key (inn_ui_prefs), so a customer who picks
 * USD in the dashboard keeps USD out here, and the other way round.
 *
 * ponytail: a text-node walk rather than data-price attributes on every element.
 * The prices sit inside prose ("From EUR 2.00/mo, scale up to 32 vCPU"), so
 * marking them all up by hand is 100+ edits across 20 files that the next copy
 * change silently breaks. Give the walk a miss list and it stays correct.
 */
(function () {
  'use strict'

  var LS_KEY = 'inn_ui_prefs'
  // Never rewrite inside these: code samples, form controls, the picker itself.
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, CODE: 1, PRE: 1, TEXTAREA: 1, OPTION: 1, SELECT: 1 }
  var PRICE_RX = /€\s?(\d+(?:[.,]\d{1,4})?)/g

  function prefs() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch (e) { return {} }
  }
  function savePref(code) {
    var p = prefs()
    p.currency = code
    try { localStorage.setItem(LS_KEY, JSON.stringify(p)) } catch (e) { /* private mode */ }
  }

  function fmt(value, code) {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency', currency: code,
        minimumFractionDigits: 2, maximumFractionDigits: value < 1 ? 4 : 2,
      }).format(value)
    } catch (e) {
      return code + ' ' + value.toFixed(2)
    }
  }

  // Collect the text nodes holding a price ONCE, with their original text, so
  // switching currency repeatedly always converts from EUR and never compounds.
  var nodes = null
  function collect() {
    if (nodes) return nodes
    nodes = []
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || n.nodeValue.indexOf('€') === -1) return NodeFilter.FILTER_REJECT
        for (var p = n.parentNode; p && p !== document.body; p = p.parentNode) {
          // data-no-currency pins a subtree to EUR - for any price that has to
          // stand as a legal statement rather than a converted indication.
          if (SKIP_TAGS[p.nodeName] || (p.dataset && p.dataset.noCurrency !== undefined)) return NodeFilter.FILTER_REJECT
        }
        return NodeFilter.FILTER_ACCEPT
      },
    })
    var n
    while ((n = walker.nextNode())) nodes.push({ node: n, eur: n.nodeValue })
    return nodes
  }

  function render(code, rate) {
    collect().forEach(function (entry) {
      entry.node.nodeValue = code === 'EUR'
        ? entry.eur
        : entry.eur.replace(PRICE_RX, function (_, num) {
            return fmt(parseFloat(num.replace(',', '.')) * rate, code)
          })
    })
  }

  var rates = null
  function withRates(cb) {
    if (rates) return cb(rates)
    fetch('/api/v1/public/fx')
      .then(function (r) { return r.json() })
      .then(function (j) { if (j && j.rates) { rates = j; cb(rates) } })
      .catch(function () { /* stay on EUR */ })
  }

  function apply(code) {
    if (code === 'EUR') return render('EUR', 1)
    withRates(function (fx) {
      var rate = fx.rates[code]
      if (rate) render(code, rate)
    })
  }

  function mountPicker() {
    var host = document.querySelector('.ftr-legal > div') || document.querySelector('.ftr-legal') || document.querySelector('footer')
    if (!host) return
    var wrap = document.createElement('p')
    wrap.className = 'ftr-currency'
    wrap.style.cssText = 'margin-top:6px;display:flex;align-items:center;gap:6px'
    // Coin glyph, so the picker reads as a currency control and not as a
    // stray language/region dropdown.
    var icon = document.createElement('span')
    icon.style.cssText = 'display:inline-flex;opacity:.7'
    icon.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true">'
      + '<ellipse cx="12" cy="6.4" rx="7.4" ry="3"/><path d="M4.6 6.4v11.2c0 1.7 3.3 3 7.4 3s7.4-1.3 7.4-3V6.4"/><path d="M4.6 12c0 1.7 3.3 3 7.4 3s7.4-1.3 7.4-3"/></svg>'
    var sel = document.createElement('select')
    sel.setAttribute('aria-label', 'Display currency')
    sel.style.cssText = 'background:transparent;color:inherit;border:1px solid currentColor;border-radius:6px;padding:1px 4px;font:inherit;font-size:12px;opacity:.75;cursor:pointer'
    var note = document.createElement('span')
    note.style.cssText = 'font-size:12px;opacity:.6'
    note.textContent = 'Prices charged in EUR'

    var current = prefs().currency || 'EUR'
    withRates(function (fx) {
      sel.innerHTML = ''
      fx.currencies.forEach(function (c) {
        var o = document.createElement('option')
        o.value = c; o.textContent = c
        if (c === current) o.selected = true
        sel.appendChild(o)
      })
      note.textContent = 'Prices charged in EUR · ECB ' + fx.date
    })
    // Something to click even before the rates land.
    sel.innerHTML = '<option>' + current + '</option>'

    sel.addEventListener('change', function () {
      current = sel.value
      savePref(current)
      apply(current)
    })
    wrap.appendChild(icon)
    wrap.appendChild(sel)
    wrap.appendChild(note)
    host.appendChild(wrap)
  }

  function init() {
    mountPicker()
    var code = prefs().currency
    if (code && code !== 'EUR') apply(code)
  }

  // inn-lang.js swaps whole elements when the language changes, which
  // detaches the price nodes collected above: gather them again and re-apply.
  document.addEventListener('inn:lang', function () {
    nodes = null
    var code = prefs().currency
    if (code && code !== 'EUR') apply(code)
  })

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
