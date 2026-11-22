/* Sales pause notice. Reads /api/v1/public/sales-status (same switch that
   refuses the order server-side) and, while VPS orders are paused, shows a
   banner and turns every VPS order button into "Currently unavailable" - so a
   visitor learns it BEFORE topping up balance. API unreachable = page untouched. */
(function () {
  var SEL = 'a[href*="/dashboard/containers/create"]';
  // Strings this script writes after inn-lang.js has collected the page, so
  // they are translated here (same pattern as lunaris.js) and repainted on 'inn:lang'.
  var T = {
    de: { 'In stock': 'Verfügbar', 'Only a few left': 'Nur noch wenige verfügbar', 'Sold out': 'Ausverkauft', 'Currently unavailable': 'Derzeit nicht verfügbar' },
    es: { 'In stock': 'Disponible', 'Only a few left': 'Quedan pocos', 'Sold out': 'Agotado', 'Currently unavailable': 'No disponible por ahora' },
    fr: { 'In stock': 'Disponible', 'Only a few left': 'Plus que quelques-uns', 'Sold out': 'Épuisé', 'Currently unavailable': 'Indisponible pour le moment' }
  };
  function lang() {
    var l = window.innLang && window.innLang.current ? window.innLang.current() : document.documentElement.lang;
    return String(l || 'en').slice(0, 2).toLowerCase();
  }
  function tr(k) { var d = T[lang()]; return (d && d[k]) || k; }
  var painted = [];   // [element, english text]
  function say(el, k) {
    el.textContent = tr(k);
    if (!painted.some(function (p) { return p[0] === el; })) painted.push([el, k]);
  }
  document.addEventListener('inn:lang', function () {
    painted.forEach(function (p) { p[0].textContent = tr(p[1]); });
  });
  // "type:Label" of an order link; OpenClaw links are type=kvm&product=openclaw.
  function planKey(a) {
    if (a.hasAttribute('data-plan-key')) return a.getAttribute('data-plan-key').toLowerCase();
    var u; try { u = new URL(a.href, location.href); } catch (e) { return ''; }
    var t = (u.searchParams.get('product') || u.searchParams.get('type') || '').toLowerCase();
    var p = (u.searchParams.get('plan') || '').toLowerCase();
    return t && p ? t + ':' + p : '';
  }
  var PAGE = { kvm: 'kvm', 'epyc-kvm': 'kvm', 'ryzen-kvm': 'ryzen-kvm', lxc: 'lxc', vds: 'vds', 'windows-server': 'windows-kvm', 'storage-server': 'storage', openclaw: 'openclaw' };
  function pageType() {
    var m = location.pathname.match(/^\/([a-z-]+?)(\.html)?\/?$/);
    return m && PAGE[m[1]];
  }
  function paused() {
    var st = document.createElement('style');
    st.textContent =
      '.inn-sales-banner{position:relative;z-index:5;max-width:1100px;margin:16px auto;padding:14px 18px;' +
      'border:1px solid rgba(245,158,11,.5);border-radius:12px;background:rgba(245,158,11,.10);' +
      'color:rgba(255,255,255,.9);font-size:15px;line-height:1.5;text-align:center}' +
      '.inn-sales-banner strong{color:#fbbf24}' +
      '.inn-sales-off{pointer-events:none!important;opacity:.55!important;cursor:not-allowed!important;filter:grayscale(1)}' +
      '@media (max-width:640px){.inn-sales-banner{margin:12px 16px}}';
    document.head.appendChild(st);

    var links = Array.prototype.slice.call(document.querySelectorAll(SEL));
    // On the VPS product pages the hero "Deploy now / Deploy your VPS" buttons
    // go to /dashboard; they sell this page's product, so they are paused too.
    if (/^\/(kvm|epyc-kvm|ryzen-kvm|lxc|vds|windows-server|storage-server|openclaw)(\.html)?\/?$/.test(location.pathname)) {
      Array.prototype.forEach.call(document.querySelectorAll('a[href="/dashboard"]'), function (a) {
        if (/^\s*(Deploy|Build|Order)/i.test(a.textContent) && links.indexOf(a) < 0) { a.classList.add('inn-sales-off'); links.push(a); }
      });
    }
    Array.prototype.forEach.call(links, function (a) {
      a.classList.add('inn-sales-off');
      a.setAttribute('aria-disabled', 'true');
      a.setAttribute('tabindex', '-1');
      say(a, 'Currently unavailable');
    });
    // Configurator buttons may rewrite their href later: block navigation for
    // any VPS order link, whatever it points to by then.
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest && e.target.closest(SEL + ',.inn-sales-off');
      if (a) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    if (!links.length || document.querySelector('.inn-sales-banner')) return;
    var b = document.createElement('div');
    b.className = 'inn-sales-banner';
    b.setAttribute('role', 'status');
    b.innerHTML = '<strong>New VPS orders are temporarily paused.</strong> ' +
      'We are expanding capacity. Existing servers are not affected. ' +
      'Please do not top up balance for a new VPS until ordering is open again. Game servers can be ordered as usual.';
    var main = document.querySelector('main') || document.body;
    main.insertBefore(b, main.firstChild);
  }
  // Partial reopening: only plans up to sizeCap can be ordered. Grey out the
  // cards above it and say so once, above the plans.
  function capped(d) {
    var off = {};
    (d.unavailablePlans || []).forEach(function (k) { off[k.toLowerCase()] = 1; });
    var st = document.createElement('style');
    st.textContent =
      '.inn-sales-banner{position:relative;z-index:5;max-width:1100px;margin:16px auto;padding:14px 18px;' +
      'border:1px solid rgba(245,158,11,.5);border-radius:12px;background:rgba(245,158,11,.10);' +
      'color:rgba(255,255,255,.9);font-size:15px;line-height:1.5;text-align:center}' +
      '.inn-sales-banner strong{color:#fbbf24}' +
      '.inn-sales-off{pointer-events:none!important;opacity:.55!important;cursor:not-allowed!important;filter:grayscale(1)}' +
      '@media (max-width:640px){.inn-sales-banner{margin:12px 16px}}';
    document.head.appendChild(st);
    var hit = 0;
    Array.prototype.forEach.call(document.querySelectorAll(SEL), function (a) {
      var k = planKey(a);
      if (!k || !off[k]) return;
      hit++;
      a.classList.add('inn-sales-off');
      a.setAttribute('aria-disabled', 'true');
      a.setAttribute('tabindex', '-1');
      say(a, 'Currently unavailable');
      var card = a.closest('article, .card, .plan, [class*="plan"]');
      if (card && card !== document.body) card.style.opacity = '.6';
    });
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest && e.target.closest('.inn-sales-off');
      if (a) { e.preventDefault(); e.stopPropagation(); }
    }, true);
    // Banner only where a plan is really blocked: a greyed button or a plan of this page's type.
    var pt = pageType();
    var pageOff = pt && (d.unavailablePlans || []).some(function (k) { return k.toLowerCase().indexOf(pt + ':') === 0; });
    if (!hit && !pageOff) return;
    if (document.querySelector('.inn-sales-banner')) return;
    var c = d.sizeCap || {}, parts = [];
    if (c.cpu) parts.push(c.cpu + ' vCPU');
    if (c.ramGb) parts.push(c.ramGb + ' GB RAM');
    if (c.diskGb) parts.push(c.diskGb + ' GB disk');
    var b = document.createElement('div');
    b.className = 'inn-sales-banner';
    b.setAttribute('role', 'status');
    b.innerHTML = parts.length
      ? '<strong>Limited availability:</strong> while we expand capacity, new VPS can be ordered up to ' +
        parts.join(' / ') + '. Larger plans will be back soon. Existing servers are not affected.'
      : '<strong>Some plans are sold out right now.</strong> They will be back as soon as we add capacity. Existing servers are not affected.';
    var main = document.querySelector('main') || document.body;
    main.insertBefore(b, main.firstChild);
  }
  // One availability line per plan card on the product pages: a static dot and
  // a word. Three states only; the API carries no counts and neither does this.
  function stock(d) {
    if (!pageType()) return;   // landing page cards stand for a whole product line
    var off = {}, low = {};
    (d.unavailablePlans || []).forEach(function (k) { off[String(k).toLowerCase()] = 1; });
    (d.lowStockPlans || []).forEach(function (k) { low[String(k).toLowerCase()] = 1; });
    var st = document.createElement('style');
    st.textContent =
      '.inn-stock{display:flex;align-items:center;gap:8px;margin:auto 0 -6px;font-size:13px;line-height:1.2;color:var(--mute)}' +
      '.inn-stock::before{content:"";flex:none;width:6px;height:6px;border-radius:50%;background:var(--pp-ok,#22c55e)}' +
      '.inn-stock+.btn{margin-top:0}' +
      '.inn-stock[data-stock="low"]{color:#fbbf24}' +
      '.inn-stock[data-stock="low"]::before{background:#f59e0b}' +
      '.inn-stock[data-stock="out"]{color:var(--dim)}' +
      '.inn-stock[data-stock="out"]::before{background:none;box-shadow:inset 0 0 0 1px var(--dim)}' +
      'td .inn-stock{margin:6px 0 0;font-size:12px}';
    document.head.appendChild(st);
    // [data-plan-key]: a CTA the page already swapped for a sold-out label (vds.html).
    Array.prototype.forEach.call(document.querySelectorAll(SEL + ',[data-plan-key]'), function (a) {
      var k = planKey(a);
      if (!k) return;
      var card = a.closest('.plan, tr');
      if (!card || card.querySelector('.inn-stock')) return;
      var s = off[k] ? 'out' : low[k] ? 'low' : 'in';
      var el = document.createElement('p');
      el.className = 'inn-stock';
      el.setAttribute('data-stock', s);
      el.setAttribute('data-no-i18n', '');
      say(el, s === 'out' ? 'Sold out' : s === 'low' ? 'Only a few left' : 'In stock');
      if (a.hasAttribute('data-plan-key') && s === 'out') say(a, 'Currently unavailable');
      if (card.nodeName === 'TR') card.cells[0].appendChild(el);
      else card.insertBefore(el, a);
    });
  }
  function run() {
    fetch('/api/v1/public/sales-status', { headers: { accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.ok) return;
        if (d.vpsOrdersPaused) return paused();
        // Sold-out plans ("type:Label") are greyed out even without a size cap.
        if (d.sizeCap || (d.unavailablePlans && d.unavailablePlans.length)) capped(d);
        stock(d);
      })
      .catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
