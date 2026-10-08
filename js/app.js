//i am sorry lilypad :skull:
(function () {
  'use strict';
  var on = function (el, ev, fn, opts) { el && el.addEventListener(ev, fn, opts); };

  // bfcache fix: on back/forward the page is restored from cache and this
  // deferred script does NOT re-run, so any [data-reveal] elements left at the
  // JS-set opacity:0 would stay invisible until a manual reload (the "page
  // doesn't load until I reload" bug). On a persisted pageshow, force them all
  // visible again.
  on(window, 'pageshow', function (e) {
    if (!e.persisted) return;
    document.querySelectorAll('[data-reveal]').forEach(function (el) {
      el.classList.add('reveal-in');
      el.style.opacity = '';
      el.style.transform = '';
    });
  });

  // Auth-aware header: if a session is active, turn the header "Log in" button
  // into a "Dashboard" link (static pages can't know this server-side).
  try {
    fetch('/api/v1/profile/me', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (r) {
        if (!r.ok) return;
        document.querySelectorAll('a[href="/auth/login"]').forEach(function (a) {
          if ((a.textContent || '').trim() === 'Log in') {
            a.setAttribute('href', '/dashboard');
            a.textContent = 'Dashboard';
          }
        });
      })
      .catch(function () {});
  } catch (e) {}

  var reveals = document.querySelectorAll('[data-reveal]');
  var revealNow = function (el) { el.classList.add('reveal-in'); };
  // Hide every reveal element immediately (no flash before the animation runs).
  reveals.forEach(function (el) {
    el.classList.add('reveal-init');
    var from = el.getAttribute('data-reveal-from') || 'opacity:0';
    from.split(';').forEach(function (rule) {
      var i = rule.indexOf(':');
      if (i < 0) return;
      el.style.setProperty(rule.slice(0, i).trim(), rule.slice(i + 1).trim());
    });
  });
  var startReveals = function () {
    if (!reveals.length) return;
    // Stagger the elements already in view so the page cascades in smoothly.
    var vh = window.innerHeight || 800, k = 0;
    reveals.forEach(function (el) {
      if (el.getBoundingClientRect().top < vh - 40) {
        el.style.transitionDelay = (k * 0.08) + 's';
        k++;
      }
    });
    if ('IntersectionObserver' in window) {
      var rObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { revealNow(e.target); rObs.unobserve(e.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
      reveals.forEach(function (el) { rObs.observe(el); });
      setTimeout(function () { reveals.forEach(revealNow); }, 1500);
    } else {
      reveals.forEach(revealNow);
    }
  };

  // Defer to after the first paint so the hidden (reveal-init) state renders
  // first - otherwise the opacity/transform transition has no "from" frame and
  // elements snap in with no animation.
  if ('requestAnimationFrame' in window) {
    requestAnimationFrame(function () { requestAnimationFrame(startReveals); });
  } else {
    setTimeout(startReveals, 60);
  }

  var bars = document.querySelectorAll('[data-bar]');
  if (bars.length) {
    var fillBar = function (el) { el.style.width = el.getAttribute('data-bar-target') || '100%'; };
    bars.forEach(function (el) { el.style.width = '0%'; });
    if ('IntersectionObserver' in window) {
      var bObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { fillBar(e.target); bObs.unobserve(e.target); }
        });
      }, { threshold: 0.25 });
      bars.forEach(function (el) { bObs.observe(el); });
    } else {
      bars.forEach(fillBar);
    }
  }

  var faqTriggers = document.querySelectorAll('[data-faq-trigger]');
  faqTriggers.forEach(function (btn) {
    on(btn, 'click', function (e) {
      e.preventDefault();
      var item = btn.closest('[data-faq-item]');
      if (!item) return;
      var willOpen = !item.hasAttribute('data-open');
      document.querySelectorAll('[data-faq-item][data-open]').forEach(function (it) {
        it.removeAttribute('data-open'); it.setAttribute('data-closed', '');
        var b = it.querySelector('[data-faq-trigger]');
        if (b) { b.setAttribute('aria-expanded', 'false'); b.removeAttribute('data-panel-open'); }
      });
      if (willOpen) {
        item.setAttribute('data-open', ''); item.removeAttribute('data-closed');
        btn.setAttribute('aria-expanded', 'true'); btn.setAttribute('data-panel-open', '');
      }
    });
  });

  var wireDropdown = function (trigger, menu) {
    if (!trigger || !menu) return;
    var set = function (open) {
      menu.hidden = !open;
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      trigger.setAttribute('data-state', open ? 'open' : 'closed');
    };
    on(trigger, 'click', function (e) { e.preventDefault(); e.stopPropagation(); set(menu.hidden); });
    on(document, 'click', function (e) { if (!menu.hidden && !menu.contains(e.target) && !trigger.contains(e.target)) set(false); });
    on(document, 'keydown', function (e) { if (e.key === 'Escape') set(false); });
  };
  wireDropdown(document.querySelector('[data-login-trigger]'), document.querySelector('[data-login-menu]'));
  wireDropdown(document.querySelector('[data-support-trigger]'), document.querySelector('[data-support-menu]'));
  wireDropdown(document.querySelector('[data-servers-trigger]'), document.querySelector('[data-servers-menu]'));

  // Mobile nav: bottom tab bar + a "More" sheet that rises from the bottom,
  // same interaction as the dashboard's MobileTabBar/MobileMoreSheet - the
  // sheet's own trigger is one of the tab bar's items, not a header hamburger.
  var moreTrigger = document.querySelector('[data-more-trigger]');
  var sheet = document.querySelector('[data-more-sheet]');
  var scrim = document.querySelector('[data-more-scrim]');
  if (moreTrigger && sheet && scrim) {
    var openSheet = function () {
      sheet.classList.add('is-open'); scrim.classList.add('is-open');
      moreTrigger.setAttribute('aria-expanded', 'true');
      document.body.classList.add('menu-open');
    };
    var closeSheet = function () {
      sheet.classList.remove('is-open'); scrim.classList.remove('is-open');
      moreTrigger.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('menu-open');
    };
    on(moreTrigger, 'click', function () {
      if (sheet.classList.contains('is-open')) closeSheet(); else openSheet();
    });
    on(scrim, 'click', closeSheet);
    on(sheet.querySelector('[data-more-close]'), 'click', closeSheet);
    sheet.querySelectorAll('a').forEach(function (a) { on(a, 'click', closeSheet); });
    on(document, 'keydown', function (e) { if (e.key === 'Escape') closeSheet(); });
  }

  // "Create server" CTAs (desktop header + mobile menu) are decorative <button>s
  // with no action - wire them to the create flow so clicking actually navigates.
  document.querySelectorAll('button').forEach(function (b) {
    if (/create server/i.test(b.textContent || '') && !b.closest('a')) {
      b.style.cursor = 'pointer';
      on(b, 'click', function () { window.location.href = 'https://instantnode.eu/dashboard/containers/create'; });
    }
  });

  var headerBg = document.querySelector('[data-header-bg]');
  if (headerBg) {
    var SCROLL_ON = ['bg-greengray/[50%]', 'backdrop-blur-[10px]', 'border-gray-200/[10%]'];
    var onScroll = function () {
      var scrolled = window.scrollY > 20;
      SCROLL_ON.forEach(function (c) { headerBg.classList.toggle(c, scrolled); });
      headerBg.classList.toggle('border-transparent', !scrolled);
    };
    on(window, 'scroll', onScroll, { passive: true });
    onScroll();
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    on(a, 'click', function (e) {
      var id = a.getAttribute('href').slice(1);
      var t = id && document.getElementById(id);
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
    });
  });


  document.querySelectorAll('.game-marquee').forEach(function (g) {
    var rows = g.querySelectorAll('.animate-marquee');
    var setRate = function (rate) {
      rows.forEach(function (r) {
        (r.getAnimations ? r.getAnimations() : []).forEach(function (a) { a.playbackRate = rate; });
      });
    };
    on(g, 'mouseenter', function () { setRate(0.25); });
    on(g, 'mouseleave', function () { setRate(1); });
  });

  document.querySelectorAll('[data-vps-config]').forEach(function (cfg) {
    var base = +cfg.dataset.base, rCpu = +cfg.dataset.rcpu, rRam = +cfg.dataset.rram, rDisk = +cfg.dataset.rdisk;
    var cpu = cfg.querySelector('[data-vps-cpu]'), ram = cfg.querySelector('[data-vps-ram]'), disk = cfg.querySelector('[data-vps-disk]');
    if (!cpu || !ram || !disk) return;
    var priceEl = cfg.querySelector('[data-vps-price]');
    var cpuV = cfg.querySelectorAll('[data-vps-cpu-val]'), ramV = cfg.querySelectorAll('[data-vps-ram-val]'), diskV = cfg.querySelectorAll('[data-vps-disk-val]');
    var fill = function (s) { var p = (s.value - s.min) / (s.max - s.min) * 100; s.style.background = 'linear-gradient(to right,#3b82f6 ' + p + '%,#2a2a2a ' + p + '%)'; };
    var update = function () {
      var c = +cpu.value, r = +ram.value, d = +disk.value;
      priceEl.textContent = (base + c * rCpu + r * rRam + d * rDisk).toFixed(2);
      cpuV.forEach(function (el) { el.textContent = c; });
      ramV.forEach(function (el) { el.textContent = r; });
      diskV.forEach(function (el) { el.textContent = d; });
      [cpu, ram, disk].forEach(fill);
    };
    [cpu, ram, disk].forEach(function (s) { on(s, 'input', update); });
    update();
  });

  document.querySelectorAll('[data-ded-config]').forEach(function (cfg) {
    var base = +cfg.dataset.base, rRam = +cfg.dataset.ramRate, ramInc = +cfg.dataset.ramIncluded;
    var ram = cfg.querySelector('[data-ded-ram]');
    if (!ram) return;
    var priceEl = cfg.querySelector('[data-ded-price]');
    var raidSection = cfg.querySelector('[data-ded-raid-section]');
    var raidNote = cfg.querySelector('[data-ded-disks-note]');
    var raidInputs = Array.prototype.slice.call(cfg.querySelectorAll('input[name="ded-raid"]'));
    var orderLink = cfg.querySelector('[data-ded-order]');
    var set = function (sel, v) { cfg.querySelectorAll(sel).forEach(function (el) { el.textContent = v; }); };
    var picked = function (name) { return cfg.querySelector('input[name="' + name + '"]:checked'); };
    var rPrice = function (name) { var el = picked(name); return el ? (+el.dataset.price || 0) : 0; };
    var rLabel = function (name) { var el = picked(name); return el ? (el.dataset.label || '') : ''; };
    var fill = function (s) { var p = (s.value - s.min) / (s.max - s.min) * 100; s.style.background = 'linear-gradient(to right,#3b82f6 ' + p + '%,#2a2a2a ' + p + '%)'; };
    var highlight = function (name) {
      cfg.querySelectorAll('input[name="' + name + '"]').forEach(function (el) {
        var card = el.closest('[data-ded-opt]'); if (card) card.classList.toggle('ded-on', el.checked);
      });
    };
    var syncRaid = function (disks) {
      var firstVisible = null, currentValid = false;
      raidInputs.forEach(function (el) {
        var ok = disks >= (+el.dataset.minDisks || 1);
        var card = el.closest('[data-ded-opt]'); if (card) card.hidden = !ok;
        if (ok) { if (!firstVisible) firstVisible = el; if (el.checked) currentValid = true; }
      });
      if (!currentValid && firstVisible) firstVisible.checked = true;
      if (raidSection) raidSection.hidden = disks < 2;
      if (raidNote) raidNote.textContent = disks >= 2 ? disks + ' disks available' : 'Single disk';
    };
    var update = function () {
      var ramGB = +ram.value;
      var sto = picked('ded-storage');
      var disks = sto ? (+sto.dataset.disks || 1) : 1;
      syncRaid(disks);
      priceEl.textContent = (base + rPrice('ded-cpu') + Math.max(0, ramGB - ramInc) * rRam + rPrice('ded-storage') + rPrice('ded-raid') + rPrice('ded-network')).toFixed(2);
      set('[data-ded-ram-val]', ramGB);
      set('[data-ded-cpu-val]', rLabel('ded-cpu'));
      set('[data-ded-storage-val]', rLabel('ded-storage'));
      set('[data-ded-raid-val]', disks < 2 ? 'Single disk' : rLabel('ded-raid'));
      set('[data-ded-network-val]', rLabel('ded-network'));
      highlight('ded-cpu'); highlight('ded-storage'); highlight('ded-raid'); highlight('ded-network');
      fill(ram);
      if (orderLink) {
        var raidVal = disks < 2 ? 'Single disk' : rLabel('ded-raid');
        var subject = 'Dedicated server order: ' + rLabel('ded-cpu');
        var msg = 'I would like to order the following dedicated server:\n\n'
          + 'Processor: ' + rLabel('ded-cpu') + '\n'
          + 'Memory: ' + ramGB + ' GB DDR5 ECC\n'
          + 'Storage: ' + rLabel('ded-storage') + '\n'
          + 'RAID: ' + raidVal + '\n'
          + 'Network: ' + rLabel('ded-network') + '\n'
          + 'Location: Eygelshoven, NL\n\n'
          + 'Monthly price: EUR ' + priceEl.textContent + '/mo (+ EUR 0 setup)\n\n'
          + 'Please provision this configuration for my account.';
        orderLink.href = '/dashboard/tickets/create?category=general&priority=medium'
          + '&subject=' + encodeURIComponent(subject)
          + '&message=' + encodeURIComponent(msg);
      }
    };
    ['ded-cpu', 'ded-storage', 'ded-raid', 'ded-network'].forEach(function (n) {
      cfg.querySelectorAll('input[name="' + n + '"]').forEach(function (el) { on(el, 'change', update); });
    });
    on(ram, 'input', update);
    update();
  });

  /* -- plan carousel (gameservers) ------------------------------------ */
  var Lc = function (m) { try { console.log('[carousel] ' + m); } catch (e) {} };
  document.querySelectorAll('[aria-roledescription="carousel"]').forEach(function (carousel) {
    var track = carousel.querySelector('[style*="translate3d"]') || carousel.querySelector('.overflow-hidden > div');
    if (!track) { Lc('no track found'); return; }
    var slides = Array.prototype.slice.call(track.children).filter(function (c) {
      return c.getAttribute && c.getAttribute('aria-roledescription') === 'slide';
    });
    if (!slides.length) { Lc('no slides found'); return; }
    var prevBtn = null, nextBtn = null;
    carousel.querySelectorAll('button').forEach(function (b) {
      var t = b.textContent || '';
      if (t.indexOf('Previous') > -1) prevBtn = b;
      else if (t.indexOf('Next') > -1) nextBtn = b;
    });
    Lc('init: ' + slides.length + ' slides, prev=' + !!prevBtn + ' next=' + !!nextBtn);
    var index = 0;

    function perView() { return window.matchMedia('(min-width: 768px)').matches ? 3 : 1; }
    function maxIndex() { return Math.max(0, slides.length - perView()); }

    function render() {
      var w = slides[0].offsetWidth;
      track.style.transition = 'transform .45s cubic-bezier(.16,1,.3,1)';
      track.style.transform = 'translate3d(' + (-index * w) + 'px,0,0)';
      if (prevBtn) { prevBtn.disabled = index <= 0; }
      if (nextBtn) { nextBtn.disabled = index >= maxIndex(); }
    }
    if (prevBtn) prevBtn.removeAttribute('disabled');
    on(prevBtn, 'click', function () { if (index > 0) { index--; render(); } });
    on(nextBtn, 'click', function () { if (index < maxIndex()) { index++; render(); } });
    on(window, 'resize', render, { passive: true });
    render();
  });
})();

/* ── Flash-Sale-Banner: zeigt aktive Sales mit Countdown (API: /api/v1/public/sales) ── */
(function () {
  var LABELS = {
    'vps': ['VPS', '/kvm'], 'vps:kvm': ['KVM VPS', '/kvm'], 'vps:vds': ['VDS', '/vds'],
    'vps:windows-kvm': ['Windows VPS', '/windows-server'], 'vps:storage': ['Storage VPS', '/storage-server'],
    'bots': ['Discord Bots', '/discord-bots'], 'webspaces': ['Web Hosting', '/webspaces'],
    'gameserver': ['Game Servers', '/gameservers'], 'domains': ['Domains', '/domains']
  };
  function target(genre) {
    if (LABELS[genre]) return LABELS[genre];
    if (genre.indexOf('vps:plan:') === 0) return [genre.slice(9) + ' plan', '/kvm'];
    if (genre.indexOf('vps') === 0) return ['VPS', '/kvm'];
    return [genre.charAt(0).toUpperCase() + genre.slice(1) + ' servers', '/gameservers'];
  }
  function fmt(ms) {
    if (ms < 0) ms = 0;
    var s = Math.floor(ms / 1000), d = Math.floor(s / 86400);
    var h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return (d > 0 ? d + 'd ' : '') + p(h) + ':' + p(m) + ':' + p(sec);
  }
  fetch('/api/v1/public/sales').then(function (r) { return r.json(); }).then(function (data) {
    var sales = (data && data.sales) || [];
    if (!sales.length) return;
    var sale = sales[0];
    var key = 'in-sale-' + sale.genre + '-' + (sale.endDate || 'open');
    try { if (localStorage.getItem(key)) return; } catch (e) {}
    var t = target(sale.genre);
    var bar = document.createElement('div');
    bar.setAttribute('style', 'position:fixed;bottom:0;left:0;right:0;z-index:60;background:linear-gradient(90deg,#052e1b,#064e2b);border-top:1px solid rgba(34,197,94,.45);color:#f1f5f9;font-size:14px;padding:10px 44px 10px 16px;display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;');
    var cd = sale.endDate ? '<span style="font-variant-numeric:tabular-nums;font-weight:700;color:#4ade80" data-sale-cd></span>' : '';
    bar.innerHTML = '<span style="font-weight:800;color:#4ade80">SALE</span>' +
      '<span><strong>-' + sale.percentage + '%</strong> on ' + t[0] + (sale.endDate ? ' - ends in ' : '') + '</span>' + cd +
      '<a href="' + t[1] + '" style="background:#22c55e;color:#03150b;font-weight:700;padding:6px 14px;border-radius:999px;text-decoration:none;white-space:nowrap">Get the deal</a>' +
      '<button aria-label="Dismiss" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:0;color:#94a3b8;font-size:18px;cursor:pointer" data-sale-close>&#10005;</button>';
    document.body.appendChild(bar);
    bar.querySelector('[data-sale-close]').addEventListener('click', function () {
      bar.remove();
      try { localStorage.setItem(key, '1'); } catch (e) {}
    });
    if (sale.endDate) {
      var el = bar.querySelector('[data-sale-cd]');
      var tick = function () {
        var left = sale.endDate - Date.now();
        if (left <= 0) { bar.remove(); return; }
        el.textContent = fmt(left);
        setTimeout(tick, 1000);
      };
      tick();
    }
  }).catch(function () {});
})();
