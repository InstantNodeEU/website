/** A link into the panel opens the account card over the page the visitor is on: the panel's own /auth page in a frame, behind it the page itself. /auth/... stays a page of its own for mail links and expired sessions */
(function () {
  'use strict';

  if (!window.fetch || !window.DOMParser || !Element.prototype.animate) return;

  var EASE = 'cubic-bezier(.32,.72,0,1)';
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pending = null, host = null, frame = null, link = null, ready = false, grown = false, giveUp = 0;

  /** lunaris.js marks a visitor without a session; signed in, the same links simply lead into the panel */
  function isPanel(a) {
    if (!a || a.target === '_blank' || !document.documentElement.hasAttribute('data-signed-out')) return false;
    return /^\/(dashboard|auth\/(login|register))([/?#]|$)/.test(a.getAttribute('href') || '');
  }

  /** The empty card shown until the frame has loaded is the panel's own first-paint shell, kept for the visit so only the first page asks for it */
  function shellSource() {
    try {
      var kept = JSON.parse(sessionStorage.getItem('in-auth-shell') || 'null');
      if (kept && kept.css && kept.html) return Promise.resolve(kept);
    } catch (e) { /** storage is off: ask the panel every time */ }
    return fetch('/auth/login', { credentials: 'same-origin', headers: { Accept: 'text/html' } })
      .then(function (r) { if (!r.ok) throw new Error('shell ' + r.status); return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var css = doc.getElementById('auth-shell-css'), shell = doc.getElementById('auth-shell');
        if (!css || !shell) throw new Error('no shell');
        var src = { css: css.textContent, html: shell.innerHTML };
        try { sessionStorage.setItem('in-auth-shell', JSON.stringify(src)); } catch (e) { /** not kept, nothing lost */ }
        return src;
      });
  }

  function prepare() {
    if (pending) return pending;
    pending = shellSource().then(function (src) {
      var el = document.createElement('div');
      /** Same level as the cookie banner and later in the page, so the banner does not sit on top */
      el.style.cssText = 'position:fixed;inset:0;z-index:2147483647';
      var css = document.createElement('style');
      /** The frame's page is dark; without the same colour scheme here the browser paints it opaque */
      css.textContent = src.css
        + '.ia-dim,.ia-frame{position:absolute;inset:0;width:100%;height:100%;border:0}'
        + '.ia-dim{background:rgb(5 5 6/.62);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}'
        + '.ia-frame{color-scheme:dark;opacity:0}';
      var dim = document.createElement('div');
      dim.className = 'ia-dim';
      var shell = document.createElement('div');
      shell.id = 'auth-shell';
      /** Our own panel's markup, same origin; it holds no script */
      shell.innerHTML = src.html;
      var site = shell.querySelector('.as-site');
      if (site) site.parentNode.removeChild(site);
      if (!shell.querySelector('.as-card')) throw new Error('shell is incomplete');
      el.appendChild(css);
      el.appendChild(dim);
      el.appendChild(shell);
      host = el;
      return el;
    });
    pending.catch(function () {
      pending = null;
      try { sessionStorage.removeItem('in-auth-shell'); } catch (e) { /** nothing to clear */ }
    });
    return pending;
  }

  /** The frame takes over from the empty card once it has loaded and the card has finished growing */
  function show() {
    if (!frame || !ready || !grown) return;
    clearTimeout(giveUp);
    frame.style.opacity = 1;
    host.querySelector('#auth-shell').hidden = true;
    frame.focus();
  }

  function open(a) {
    var href = a.getAttribute('href');
    var src = href.indexOf('/auth/') === 0 ? href : '/auth/login?returnTo=' + encodeURIComponent(href);
    var shell = host.querySelector('#auth-shell'), card = shell.querySelector('.as-card');
    /** A menu entry may be gone when the card closes: without a matching view it closes in place instead of folding back */
    var menu = !!a.closest('.m-nav');

    link = a;
    ready = false;
    grown = still;
    /** The page must not scroll behind the card; the room of its scrollbar stays, so nothing jumps */
    var root = document.documentElement;
    root.style.paddingRight = (window.innerWidth - root.clientWidth) + 'px';
    root.style.overflow = 'hidden';
    shell.hidden = false;
    document.body.appendChild(host);
    var from = a.getBoundingClientRect(), to = card.getBoundingClientRect();
    try {
      /** The panel folds the card back into this button when it is closed */
      sessionStorage.setItem('in-auth-handoff', JSON.stringify({
        t: Date.now(), from: location.pathname + location.search,
        button: [from.left, from.top, from.width, from.height], view: menu ? [0, 0] : [host.clientWidth, host.clientHeight]
      }));
    } catch (e) { /** private mode: the card closes in place */ }

    frame = document.createElement('iframe');
    frame.className = 'ia-frame';
    frame.title = 'Log in';
    frame.src = src;
    /** A full page load inside the frame that leaves /auth is a finished sign-in: it belongs to the whole window */
    frame.onload = function () {
      try {
        var at = frame.contentWindow.location;
        if (at.origin === location.origin && !/^\/auth\/(?!sso)/.test(at.pathname)) location.assign(at.href);
      } catch (e) { /** another origin: not ours to follow */ }
    };
    host.appendChild(frame);
    /** No sign of life from the frame: the page of its own still works */
    giveUp = setTimeout(function () { location.assign(src); }, 12000);

    if (still) return;
    var sx = from.width / to.width, sy = from.height / to.height, r = from.height / 2;
    a.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: 'ease-out', fill: 'forwards' });
    host.querySelector('.ia-dim').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'ease-out' });
    card.animate([
      { transform: 'translate(' + (from.left - to.left) + 'px,' + (from.top - to.top) + 'px) scale(' + sx + ',' + sy + ')', borderRadius: (r / sx) + 'px / ' + (r / sy) + 'px', opacity: 0 },
      { opacity: 1, offset: 0.16 },
      { opacity: 1 }
    ], { duration: 640, easing: EASE }).onfinish = function () { grown = true; show(); };
  }

  function close() {
    if (!frame) return;
    clearTimeout(giveUp);
    var el = host, f = frame, a = link;
    frame = link = null;
    function done() {
      el.removeChild(f);
      if (el.parentNode) el.parentNode.removeChild(el);
      document.documentElement.style.overflow = document.documentElement.style.paddingRight = '';
      if (a.getAnimations) a.getAnimations().forEach(function (anim) { anim.cancel(); });
      a.focus({ preventScroll: true });
    }
    if (still) return done();
    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'ease-out' }).onfinish = done;
  }

  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!isPanel(a) || frame) return;
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    prepare().then(function () { if (!frame) open(a); }).catch(function () { location.assign(a.href); });
  });

  /** The panel's card says when it is there and when its X or Esc closed it */
  window.addEventListener('message', function (e) {
    if (!frame || e.origin !== location.origin || e.source !== frame.contentWindow || !e.data) return;
    if (e.data.inAuth === 'ready') { ready = true; show(); }
    if (e.data.inAuth === 'close') close();
  });
  /** Esc while the focus is still on the page; inside the frame the card handles it */
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  /** Fetch the shell early: when a pointer or finger reaches a panel link, otherwise once the page is quiet and the visitor is known to be signed out */
  ['pointerover', 'touchstart', 'focusin'].forEach(function (type) {
    document.addEventListener(type, function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a') : null;
      if (isPanel(a)) prepare();
    }, { passive: true });
  });
  function early() {
    if (!document.documentElement.hasAttribute('data-signed-out')) return false;
    prepare();
    return true;
  }
  (window.requestIdleCallback || function (fn) { return setTimeout(fn, 1800); })(function () {
    if (early() || !window.MutationObserver) return;
    var seen = new MutationObserver(function () { if (early()) seen.disconnect(); });
    seen.observe(document.documentElement, { attributes: true, attributeFilter: ['data-signed-out'] });
  });

  /** Back button after signing in: the browser may restore this page with the card still open */
  window.addEventListener('pageshow', function (e) { if (e.persisted) close(); });
})();
