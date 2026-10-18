/*
 * instantnode.eu/reviews - renders the customer reviews from
 * /api/v1/public/reviews (services/reviews.js in the panel): summary, filters,
 * the reviews themselves, removed-review placeholders, the report form and the
 * moderation log. Review text is the customer's own: inserted as text, never
 * as HTML, never translated. The static copy around it is translated by
 * inn-lang; everything built here follows its language and re-renders on
 * 'inn:lang'.
 */
(function () {
  'use strict'

  var PRODUCTS = ['gameserver', 'kvm', 'lxc', 'vds', 'windows', 'storage', 'vps', 'dedicated', 'webspace', 'domain', 'email', 'database', 'bot', 'ipforwarding']
  var T = {
    en: {
      of: 'out of 5', count: function (n) { return n === 1 ? '1 review' : n + ' reviews' },
      paying: 'Paying customer', edited: 'edited', reply: 'Reply from InstantNode',
      stars: function (r) { return r + ' out of 5 stars' },
      empty: 'No reviews yet. Be the first to write one.', none: 'No reviews match these filters.', showAll: 'Show all reviews',
      failed: 'The reviews could not be loaded. Please try again later.',
      since: function (m) { return 'Customer since ' + m }, spent: function (n) { return '€' + n.toLocaleString('en-US') + '+ spent' },
      removedTitle: 'Review removed', removedLine: function (d, c) { return 'Removed on ' + d + ' · Reason: ' + c }, written: function (d) { return 'Written on ' + d },
      cats: { insult: 'Insult or threat', personal_data: 'Personal data', spam: 'Spam or advertising', unlawful: 'Other unlawful content', not_genuine: 'Not a genuine experience', other: 'Something else' },
      products: { gameserver: 'Game servers', kvm: 'KVM VPS', lxc: 'LXC VPS', vds: 'VDS', windows: 'Windows Server', storage: 'Storage Server', vps: 'VPS', dedicated: 'Dedicated servers', webspace: 'Web hosting', domain: 'Domains', email: 'E-mail', database: 'Databases', bot: 'Discord bots', ipforwarding: 'IP forwarding' },
      all: 'All', allProducts: 'All products', sort: { newest: 'Newest first', oldest: 'Oldest first', high: 'Highest rating', low: 'Lowest rating' },
      filterStars: 'Filter by rating', filterProduct: 'Filter by product', sortBy: 'Sort',
      report: 'Report', reportReason: 'What is wrong with this review?', reportMsg: 'Details (optional)', send: 'Send report', cancel: 'Cancel',
      thanks: 'Thanks. We will look at it and remove the review if it breaks the rules.', reportFailed: 'The report could not be sent. Please try again later.'
    },
    de: {
      of: 'von 5', count: function (n) { return n === 1 ? '1 Bewertung' : n + ' Bewertungen' },
      paying: 'Zahlender Kunde', edited: 'bearbeitet', reply: 'Antwort von InstantNode',
      stars: function (r) { return r + ' von 5 Sternen' },
      empty: 'Noch keine Bewertungen. Schreib die erste.', none: 'Keine Bewertungen passen zu diesen Filtern.', showAll: 'Alle Bewertungen zeigen',
      failed: 'Die Bewertungen konnten nicht geladen werden. Bitte versuch es später noch einmal.',
      since: function (m) { return 'Kunde seit ' + m }, spent: function (n) { return n.toLocaleString('de-DE') + '+ € ausgegeben' },
      removedTitle: 'Bewertung entfernt', removedLine: function (d, c) { return 'Entfernt am ' + d + ' · Grund: ' + c }, written: function (d) { return 'Geschrieben am ' + d },
      cats: { insult: 'Beleidigung oder Drohung', personal_data: 'Personenbezogene Daten', spam: 'Spam oder Werbung', unlawful: 'Sonstiger rechtswidriger Inhalt', not_genuine: 'Keine echte Erfahrung', other: 'Etwas anderes' },
      products: { gameserver: 'Gameserver', kvm: 'KVM VPS', lxc: 'LXC VPS', vds: 'VDS', windows: 'Windows Server', storage: 'Storage Server', vps: 'VPS', dedicated: 'Dedicated Server', webspace: 'Webhosting', domain: 'Domains', email: 'E-Mail', database: 'Datenbanken', bot: 'Discord-Bots', ipforwarding: 'IP-Forwarding' },
      all: 'Alle', allProducts: 'Alle Produkte', sort: { newest: 'Neueste zuerst', oldest: 'Älteste zuerst', high: 'Beste Bewertung', low: 'Schlechteste Bewertung' },
      filterStars: 'Nach Bewertung filtern', filterProduct: 'Nach Produkt filtern', sortBy: 'Sortierung',
      report: 'Melden', reportReason: 'Was stimmt mit dieser Bewertung nicht?', reportMsg: 'Details (optional)', send: 'Meldung senden', cancel: 'Abbrechen',
      thanks: 'Danke. Wir sehen uns das an und entfernen die Bewertung, wenn sie gegen die Regeln verstößt.', reportFailed: 'Die Meldung konnte nicht gesendet werden. Bitte versuch es später noch einmal.'
    },
    fr: {
      of: 'sur 5', count: function (n) { return n + ' avis' },
      paying: 'Client payant', edited: 'modifié', reply: "Réponse d'InstantNode",
      stars: function (r) { return r + ' étoiles sur 5' },
      empty: "Pas encore d'avis. Soyez le premier à en écrire un.", none: 'Aucun avis ne correspond à ces filtres.', showAll: 'Voir tous les avis',
      failed: "Les avis n'ont pas pu être chargés. Réessayez plus tard.",
      since: function (m) { return 'Client depuis ' + m }, spent: function (n) { return n.toLocaleString('fr-FR') + '+ € dépensés' },
      removedTitle: 'Avis retiré', removedLine: function (d, c) { return 'Retiré le ' + d + ' · Motif : ' + c }, written: function (d) { return 'Écrit le ' + d },
      cats: { insult: 'Insulte ou menace', personal_data: 'Données personnelles', spam: 'Spam ou publicité', unlawful: 'Autre contenu illicite', not_genuine: "Pas une expérience réelle", other: 'Autre chose' },
      products: { gameserver: 'Serveurs de jeu', kvm: 'VPS KVM', lxc: 'VPS LXC', vds: 'VDS', windows: 'Windows Server', storage: 'Serveur de stockage', vps: 'VPS', dedicated: 'Serveurs dédiés', webspace: 'Hébergement web', domain: 'Domaines', email: 'E-mail', database: 'Bases de données', bot: 'Bots Discord', ipforwarding: 'Redirection IP' },
      all: 'Tous', allProducts: 'Tous les produits', sort: { newest: 'Plus récents', oldest: 'Plus anciens', high: 'Meilleure note', low: 'Moins bonne note' },
      filterStars: 'Filtrer par note', filterProduct: 'Filtrer par produit', sortBy: 'Trier',
      report: 'Signaler', reportReason: "Quel est le problème avec cet avis ?", reportMsg: 'Détails (facultatif)', send: 'Envoyer le signalement', cancel: 'Annuler',
      thanks: "Merci. Nous allons l'examiner et retirer l'avis s'il enfreint les règles.", reportFailed: "Le signalement n'a pas pu être envoyé. Réessayez plus tard."
    },
    es: {
      of: 'de 5', count: function (n) { return n === 1 ? '1 opinión' : n + ' opiniones' },
      paying: 'Cliente de pago', edited: 'editada', reply: 'Respuesta de InstantNode',
      stars: function (r) { return r + ' de 5 estrellas' },
      empty: 'Todavía no hay opiniones. Escribe la primera.', none: 'Ninguna opinión coincide con estos filtros.', showAll: 'Ver todas las opiniones',
      failed: 'No se pudieron cargar las opiniones. Inténtalo más tarde.',
      since: function (m) { return 'Cliente desde ' + m }, spent: function (n) { return n.toLocaleString('es-ES') + '+ € gastados' },
      removedTitle: 'Opinión retirada', removedLine: function (d, c) { return 'Retirada el ' + d + ' · Motivo: ' + c }, written: function (d) { return 'Escrita el ' + d },
      cats: { insult: 'Insulto o amenaza', personal_data: 'Datos personales', spam: 'Spam o publicidad', unlawful: 'Otro contenido ilícito', not_genuine: 'No es una experiencia real', other: 'Otra cosa' },
      products: { gameserver: 'Servidores de juegos', kvm: 'VPS KVM', lxc: 'VPS LXC', vds: 'VDS', windows: 'Windows Server', storage: 'Servidor de almacenamiento', vps: 'VPS', dedicated: 'Servidores dedicados', webspace: 'Alojamiento web', domain: 'Dominios', email: 'Correo', database: 'Bases de datos', bot: 'Bots de Discord', ipforwarding: 'Reenvío de IP' },
      all: 'Todas', allProducts: 'Todos los productos', sort: { newest: 'Más recientes', oldest: 'Más antiguas', high: 'Mejor valoración', low: 'Peor valoración' },
      filterStars: 'Filtrar por valoración', filterProduct: 'Filtrar por producto', sortBy: 'Ordenar',
      report: 'Denunciar', reportReason: '¿Qué problema tiene esta opinión?', reportMsg: 'Detalles (opcional)', send: 'Enviar denuncia', cancel: 'Cancelar',
      thanks: 'Gracias. La revisaremos y la retiraremos si incumple las normas.', reportFailed: 'No se pudo enviar la denuncia. Inténtalo más tarde.'
    }
  }
  var REPORT_REASONS = ['insult', 'personal_data', 'spam', 'unlawful', 'not_genuine', 'other']
  var data = null
  var failed = false
  var state = { stars: 0, product: '', sort: 'newest', reporting: null, reported: {} }
  var animated = false
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  function code() {
    var c = window.innLang && window.innLang.current ? window.innLang.current() : 'en'
    return T[c] ? c : 'en'
  }
  function loc(c) { return c === 'en' ? 'en-GB' : c }
  function el(tag, cls, text) {
    var e = document.createElement(tag)
    if (cls) e.className = cls
    if (text != null) e.textContent = text
    return e
  }
  function stars(rating, label) {
    var s = el('span', 'stars rv-stars')
    s.setAttribute('role', 'img')
    s.setAttribute('aria-label', label)
    s.appendChild(el('span', '', '★★★★★'.slice(0, rating)))
    s.appendChild(el('span', 'off', '★★★★★'.slice(rating)))
    return s
  }
  function num(x, c) { return c === 'en' ? x.toFixed(1) : x.toFixed(1).replace('.', ',') }
  function date(iso, c) {
    try { return new Date(iso).toLocaleDateString(loc(c), { day: 'numeric', month: 'long', year: 'numeric' }) } catch (e) { return String(iso).slice(0, 10) }
  }
  function month(ym, c) {
    try { return new Date(ym + '-01T12:00:00Z').toLocaleDateString(loc(c), { month: 'long', year: 'numeric' }) } catch (e) { return ym }
  }
  function country(cc, c) {
    if (!cc) return null
    try { return new Intl.DisplayNames([c], { type: 'region' }).of(cc) } catch (e) { return cc }
  }
  function avatar(rv) {
    var box = el('span', 'rv-av')
    box.setAttribute('aria-hidden', 'true')
    var src = rv.details && rv.details.avatar
    if (src) {
      var img = el('img')
      img.alt = ''
      img.loading = 'lazy'
      img.width = 40
      img.height = 40
      img.onerror = function () { box.textContent = rv.initials }
      img.src = src
      box.appendChild(img)
    } else {
      box.textContent = rv.initials
    }
    return box
  }

  /* ---------- summary + toolbar ---------- */

  function renderSummary(t, c) {
    var s = data.summary
    var sum = document.getElementById('rv-summary')
    var avgEl = sum.querySelector('.js-rv-avg')
    var first = !animated && !still
    avgEl.textContent = num(first ? 0 : s.average, c)
    sum.querySelector('.js-rv-of').textContent = t.of
    var st = sum.querySelector('.js-rv-stars')
    st.textContent = ''
    // exact average as a partial fill, so 4.6 shows 4.6 stars, never rounded up
    var row = el('span', 'rv-fill-stars')
    row.setAttribute('role', 'img')
    row.setAttribute('aria-label', t.stars(num(s.average, c)))
    row.appendChild(el('span', 'base', '★★★★★'))
    var fillRow = el('span', 'fill', '★★★★★')
    row.appendChild(fillRow)
    st.appendChild(row)
    sum.querySelector('.js-rv-count').textContent = t.count(s.count)
    var dist = sum.querySelector('.js-rv-dist')
    dist.textContent = ''
    for (var r = 5; r >= 1; r--) {
      var n = s.distribution[r] || 0
      var li = el('li')
      var b = el('button', 'rv-bar-btn' + (state.stars === r ? ' is-on' : ''))
      b.type = 'button'
      b.setAttribute('aria-pressed', state.stars === r ? 'true' : 'false')
      b.setAttribute('aria-label', t.filterStars + ': ' + t.stars(r))
      b.appendChild(el('span', '', r + ' ★'))
      var bar = el('span', 'bar')
      var fill = el('i')
      fill.style.width = first ? '0%' : (s.count ? n / s.count * 100 : 0) + '%'
      fill.setAttribute('data-w', (s.count ? n / s.count * 100 : 0) + '%')
      bar.appendChild(fill)
      b.appendChild(bar)
      b.appendChild(el('span', '', String(n)))
      b.onclick = (function (rr) { return function () { state.stars = state.stars === rr ? 0 : rr; render() } })(r)
      li.appendChild(b)
      dist.appendChild(li)
    }
    sum.hidden = false
    var target = s.average / 5 * 100 + '%'
    if (!first) { fillRow.style.width = target; return }
    animated = true
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        fillRow.style.width = target
        Array.prototype.forEach.call(dist.querySelectorAll('i[data-w]'), function (i) { i.style.width = i.getAttribute('data-w') })
        var t0 = performance.now()
        ;(function tick(now) {
          var k = Math.min(1, (now - t0) / 900)
          avgEl.textContent = num(Math.floor(s.average * (1 - Math.pow(1 - k, 3)) * 10) / 10, code())
          if (k < 1) requestAnimationFrame(tick)
        })(t0)
      })
    })
  }

  function renderToolbar(t) {
    var bar = document.getElementById('rv-toolbar')
    bar.textContent = ''
    var chips = el('div', 'rv-seg')
    chips.setAttribute('role', 'group')
    chips.setAttribute('aria-label', t.filterStars)
    ;[0, 5, 4, 3, 2, 1].forEach(function (r) {
      var b = el('button', 'rv-seg-btn' + (state.stars === r ? ' is-on' : ''), r ? String(r) : t.all)
      if (r) b.appendChild(el('span', 'rv-seg-star', '★'))
      b.type = 'button'
      b.setAttribute('aria-pressed', state.stars === r ? 'true' : 'false')
      b.onclick = function () { state.stars = r; render() }
      chips.appendChild(b)
    })
    bar.appendChild(chips)

    var used = {}
    data.reviews.forEach(function (rv) { (rv.details ? rv.details.products : []).forEach(function (p) { used[p] = 1 }) })
    var right = el('div', 'rv-selects')
    var prods = PRODUCTS.filter(function (p) { return used[p] })
    if (prods.length) {
      var ps = el('select', 'rv-sel')
      ps.setAttribute('aria-label', t.filterProduct)
      var o0 = el('option', '', t.allProducts)
      o0.value = ''
      ps.appendChild(o0)
      prods.forEach(function (p) { var o = el('option', '', t.products[p]); o.value = p; if (state.product === p) o.selected = true; ps.appendChild(o) })
      ps.onchange = function () { state.product = ps.value; render() }
      right.appendChild(ps)
    }
    var ss = el('select', 'rv-sel')
    ss.setAttribute('aria-label', t.sortBy)
    ;['newest', 'oldest', 'high', 'low'].forEach(function (k) { var o = el('option', '', t.sort[k]); o.value = k; if (state.sort === k) o.selected = true; ss.appendChild(o) })
    ss.onchange = function () { state.sort = ss.value; render() }
    right.appendChild(ss)
    bar.appendChild(right)
    bar.hidden = false
  }

  /* ---------- cards ---------- */

  function reportForm(rv, t) {
    var f = el('form', 'rv-report')
    var lab = el('label', '', t.reportReason)
    var sel = el('select', 'rv-select')
    REPORT_REASONS.forEach(function (k) { var o = el('option', '', t.cats[k]); o.value = k; sel.appendChild(o) })
    lab.appendChild(sel)
    f.appendChild(lab)
    var lab2 = el('label', '', t.reportMsg)
    var ta = el('textarea')
    ta.maxLength = 1000
    ta.rows = 3
    lab2.appendChild(ta)
    f.appendChild(lab2)
    var row = el('div', 'rv-report-row')
    var send = el('button', 'btn btn-light btn-sm', t.send)
    send.type = 'submit'
    var cancel = el('button', 'btn btn-ghost btn-sm', t.cancel)
    cancel.type = 'button'
    cancel.onclick = function () { state.reporting = null; render() }
    row.appendChild(send)
    row.appendChild(cancel)
    f.appendChild(row)
    var msg = el('p', 'rv-report-msg')
    msg.setAttribute('role', 'status')
    f.appendChild(msg)
    f.onsubmit = function (e) {
      e.preventDefault()
      send.disabled = true
      fetch('/api/v1/public/reviews/' + encodeURIComponent(rv.id) + '/report', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ reason: sel.value, message: ta.value })
      }).then(function (r) { return r.ok ? r.json() : Promise.reject(r.status) })
        .then(function () { state.reported[rv.id] = true; state.reporting = null; render() })
        .catch(function () { msg.textContent = t.reportFailed; send.disabled = false })
    }
    return f
  }

  function card(rv, t, c) {
    var a = el('article', 'quote rv-card')
    var head = el('div', 'rv-head')
    head.appendChild(avatar(rv))
    var w = el('div')
    w.appendChild(el('b', '', rv.displayName))
    var meta = [country(rv.country, c), date(rv.createdAt, c)]
    if (rv.editedAt) meta.push(t.edited)
    if (rv.paying) meta.push(t.paying)
    w.appendChild(el('span', '', meta.filter(Boolean).join(' · ')))
    head.appendChild(w)
    a.appendChild(head)
    a.appendChild(stars(rv.rating, t.stars(rv.rating)))
    a.appendChild(el('p', 'rv-body', rv.body))
    if (rv.details) {
      var facts = [t.since(month(rv.details.customerSince, c))]
      if (rv.details.spent) facts.push(t.spent(rv.details.spent))
      if (rv.details.products.length) facts.push(rv.details.products.map(function (p) { return t.products[p] || p }).join(', '))
      a.appendChild(el('p', 'rv-facts', facts.join(' · ')))
    }
    if (rv.reply) {
      var rep = el('div', 'rv-reply')
      rep.appendChild(el('b', '', t.reply))
      rep.appendChild(el('p', '', rv.reply.body))
      a.appendChild(rep)
    }
    if (state.reported[rv.id]) {
      a.appendChild(el('p', 'rv-report-msg', t.thanks))
    } else if (state.reporting === rv.id) {
      a.appendChild(reportForm(rv, t))
    } else {
      var foot = el('div', 'rv-foot')
      var rb = el('button', 'rv-link', t.report)
      rb.type = 'button'
      rb.onclick = function () { state.reporting = rv.id; render() }
      foot.appendChild(rb)
      a.appendChild(foot)
    }
    return a
  }

  function removedCard(rm, t, c) {
    var a = el('article', 'quote rv-card rv-removed')
    a.appendChild(el('b', '', t.removedTitle))
    a.appendChild(el('span', '', t.removedLine(date(rm.removed.at, c), t.cats[rm.removed.category] || rm.removed.category)))
    a.appendChild(el('span', '', t.written(date(rm.createdAt, c))))
    return a
  }

  /* ---------- moderation log ---------- */

  function renderModeration(t) {
    var m = data.moderation
    if (!m) return
    var removedTotal = 0
    var parts = []
    for (var k in m.removed) { removedTotal += m.removed[k]; parts.push(t.cats[k] + ' ' + m.removed[k]) }
    var set = function (cls, v) { var e = document.querySelector(cls); if (e) e.textContent = String(v) }
    set('.js-mod-published', m.published)
    set('.js-mod-edited', m.edited)
    set('.js-mod-deleted', m.deletedByAuthor)
    set('.js-mod-removed', removedTotal)
    set('.js-mod-removed-by', parts.join(' · '))
    set('.js-mod-reports', m.reports.received + ' / ' + m.reports.resolved)
    set('.js-mod-replies', m.replies)
  }

  var seen = window.IntersectionObserver ? new IntersectionObserver(function (entries) {
    var k = 0
    entries.forEach(function (e) {
      if (!e.isIntersecting) return
      seen.unobserve(e.target)
      e.target.style.transitionDelay = (k++ % 6) * 60 + 'ms'
      e.target.classList.add('is-in')
    })
  }, { rootMargin: '0px 0px -40px 0px' }) : null
  function reveal(node) {
    if (!seen || still) { node.classList.add('is-in'); return }
    seen.observe(node)
  }

  // Nothing to show: a card Ping peeks over, with a way back to all reviews.
  function noneCard(text, t, withReset) {
    var box = el('div', 'rv-none ping-host')
    box.innerHTML = '<span class="ping ping--ledge ping--peek" style="--pw:96px" aria-hidden="true"><img src="/img/ping/ping-peek.webp" width="520" height="393" alt="" decoding="async" /><img src="/img/ping/ping-peek-happy.webp" width="520" height="393" alt="" decoding="async" /></span>'
    box.appendChild(el('p', '', text))
    if (withReset) {
      var b = el('button', 'btn btn-ghost btn-sm', t.showAll)
      b.type = 'button'
      b.onclick = function () { state.stars = 0; state.product = ''; render() }
      box.appendChild(b)
    }
    return box
  }

  /* ---------- list ---------- */

  function render() {
    var c = code()
    var t = T[c]
    var sum = document.getElementById('rv-summary')
    var msg = document.getElementById('rv-empty')
    var list = document.getElementById('rv-list')
    list.textContent = ''
    if (failed) { msg.textContent = t.failed; msg.hidden = false; sum.hidden = true; return }
    if (!data) return
    renderModeration(t)
    if (!data.summary.count && !data.removed.length) { msg.hidden = true; sum.hidden = true; list.appendChild(noneCard(t.empty, t, false)); return }
    if (data.summary.count) renderSummary(t, c)
    renderToolbar(t)

    var items = data.reviews.filter(function (rv) {
      if (state.stars && rv.rating !== state.stars) return false
      if (state.product && !(rv.details && rv.details.products.indexOf(state.product) >= 0)) return false
      return true
    }).map(function (rv) { return { at: rv.createdAt, rating: rv.rating, rv: rv } })
    // Removed reviews have no rating or product: they belong to the unfiltered view.
    if (!state.stars && !state.product) data.removed.forEach(function (rm) { items.push({ at: rm.createdAt, rating: null, rm: rm }) })
    var by = {
      newest: function (a, b) { return a.at < b.at ? 1 : -1 },
      oldest: function (a, b) { return a.at > b.at ? 1 : -1 },
      high: function (a, b) { return (b.rating || -1) - (a.rating || -1) || (a.at < b.at ? 1 : -1) },
      low: function (a, b) { return (a.rating || 99) - (b.rating || 99) || (a.at < b.at ? 1 : -1) }
    }
    items.sort(by[state.sort])
    msg.hidden = true
    if (!items.length) list.appendChild(noneCard(t.none, t, true))
    items.forEach(function (it) {
      var node = it.rv ? card(it.rv, t, c) : removedCard(it.rm, t, c)
      list.appendChild(node)
      reveal(node)
    })
  }

  fetch('/api/v1/public/reviews', { headers: { Accept: 'application/json' } })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status) })
    .then(function (d) { data = d; render() })
    .catch(function () { failed = true; render() })
  document.addEventListener('inn:lang', render)
})()
