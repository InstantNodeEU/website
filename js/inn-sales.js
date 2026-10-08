/* Sales pause notice. Reads /api/v1/public/sales-status (same switch that
   refuses the order server-side) and, while VPS orders are paused, shows a
   banner and turns every VPS order button into "Currently unavailable" - so a
   visitor learns it BEFORE topping up balance. API unreachable = page untouched. */
(function () {
  var SEL = 'a[href*="/dashboard/containers/create"]';
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
    if (/^\/(kvm|lxc|vds|windows-server|storage-server|openclaw)(\.html)?\/?$/.test(location.pathname)) {
      Array.prototype.forEach.call(document.querySelectorAll('a[href="/dashboard"]'), function (a) {
        if (/^\s*(Deploy|Build|Order)/i.test(a.textContent) && links.indexOf(a) < 0) { a.classList.add('inn-sales-off'); links.push(a); }
      });
    }
    Array.prototype.forEach.call(links, function (a) {
      a.classList.add('inn-sales-off');
      a.setAttribute('aria-disabled', 'true');
      a.setAttribute('tabindex', '-1');
      a.textContent = 'Currently unavailable';
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
      var u; try { u = new URL(a.href, location.href); } catch (e) { return; }
      var t = (u.searchParams.get('type') || '').toLowerCase(), p = (u.searchParams.get('plan') || '').toLowerCase();
      if (!p || !off[t + ':' + p]) return;
      hit++;
      a.classList.add('inn-sales-off');
      a.setAttribute('aria-disabled', 'true');
      a.setAttribute('tabindex', '-1');
      a.textContent = 'Currently unavailable';
      var card = a.closest('article, .card, .plan, [class*="plan"]');
      if (card && card !== document.body) card.style.opacity = '.6';
    });
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest && e.target.closest('.inn-sales-off');
      if (a) { e.preventDefault(); e.stopPropagation(); }
    }, true);
    if (!hit && !/^\/(kvm|lxc|vds|windows-server|storage-server|openclaw)(\.html)?\/?$/.test(location.pathname)) return;
    if (document.querySelector('.inn-sales-banner')) return;
    var c = d.sizeCap, parts = [];
    if (c.cpu) parts.push(c.cpu + ' vCPU');
    if (c.ramGb) parts.push(c.ramGb + ' GB RAM');
    if (c.diskGb) parts.push(c.diskGb + ' GB disk');
    var b = document.createElement('div');
    b.className = 'inn-sales-banner';
    b.setAttribute('role', 'status');
    b.innerHTML = '<strong>Limited availability:</strong> while we expand capacity, new VPS can be ordered up to ' +
      parts.join(' / ') + '. Larger plans will be back soon. Existing servers are not affected.';
    var main = document.querySelector('main') || document.body;
    main.insertBefore(b, main.firstChild);
  }
  function run() {
    fetch('/api/v1/public/sales-status', { headers: { accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.ok) return;
        if (d.vpsOrdersPaused) return paused();
        if (d.sizeCap) capped(d);
      })
      .catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
