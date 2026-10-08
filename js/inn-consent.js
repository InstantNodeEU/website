/*! InstantNode Consent - own GDPR cookie consent + Google Consent Mode v2 (advanced).
 * Self-contained, no deps. Consent Mode DEFAULT (all denied) is set by a small inline
 * <head> snippet BEFORE the Google tags; this file renders the banner and calls
 * gtag('consent','update',...) on the user's choice. Styled to match the site
 * (.in-announce card + .in-cta__btn blue pill buttons). */
(function () {
  'use strict';
  var KEY = 'inn_consent_v1';
  var MAXAGE_DAYS = 180; // re-ask after 6 months

  var CATS = [
    { id: 'analytics', label: 'Analytics', desc: 'Anonymous usage statistics so we can improve the site (Google Analytics).', signals: ['analytics_storage'] },
    { id: 'ads', label: 'Advertising', desc: 'Measure ad performance and show relevant ads.', signals: ['ad_storage', 'ad_user_data', 'ad_personalization'] },
    { id: 'prefs', label: 'Preferences', desc: 'Remember choices like language and layout.', signals: ['functionality_storage', 'personalization_storage'] }
  ];

  function gtag() { window.dataLayer = window.dataLayer || []; if (window.gtag) return window.gtag.apply(null, arguments); window.dataLayer.push(arguments); }
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function fresh(s) { return s && s.ts && (Date.now() - s.ts) < MAXAGE_DAYS * 864e5; }

  function toConsent(cats) {
    var c = { security_storage: 'granted' };
    CATS.forEach(function (cat) { var v = cats[cat.id] ? 'granted' : 'denied'; cat.signals.forEach(function (sig) { c[sig] = v; }); });
    return c;
  }
  function apply(cats) {
    var consent = toConsent(cats);
    gtag('consent', 'update', consent);
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'inn_consent_update', inn_consent: cats });
    return consent;
  }
  function save(cats) {
    var consent = apply(cats);
    try { localStorage.setItem(KEY, JSON.stringify({ v: 1, ts: Date.now(), cats: cats, consent: consent })); } catch (e) {}
    hide();
  }

  var root, styleEl;
  function css() {
    if (styleEl) return;
    styleEl = document.createElement('style');
    styleEl.textContent =
      '.innc{position:fixed;z-index:2147483647;left:50%;bottom:22px;transform:translateX(-50%) translateY(14px);' +
      'width:min(660px,calc(100vw - 28px));background:rgba(11,11,12,.97);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);' +
      'color:#f2f1ee;border:1px solid rgba(255,255,255,.08);border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.6);' +
      'font-family:inherit;padding:20px 22px;opacity:0;visibility:hidden;transition:opacity .28s ease,transform .28s ease,visibility .28s}' +
      '.innc.open{opacity:1;visibility:visible;transform:translateX(-50%) translateY(0)}' +
      '.innc h2{margin:0 0 6px;font-size:16px;font-weight:600;color:#f2f1ee;letter-spacing:-.01em}' +
      '.innc p{margin:0 0 15px;font-size:13px;line-height:1.55;color:#8f8e89}' +
      '.innc a{color:#f2f1ee;text-decoration:none;border-bottom:1px solid #3b82f6}.innc a:hover{color:#3b82f6}' +
      '.innc-row{display:flex;flex-wrap:wrap;gap:9px;justify-content:flex-end;align-items:center}' +
      '.innc-btn{cursor:pointer;border:0;border-radius:999px;padding:.62rem 1.3rem;font-size:13px;font-weight:500;line-height:1;' +
      'transition:background .15s,color .15s;white-space:nowrap;font-family:inherit}' +
      '.innc-primary{background:#f5f4f1;color:#0a0a0a;font-weight:600;box-shadow:0 8px 28px -8px rgba(59, 130, 246,.55)}.innc-primary:hover{box-shadow:0 10px 34px -6px rgba(96, 165, 250,.8)}' +
      '.innc-ghost{background:rgba(255,255,255,.02);color:#f2f1ee;border:1px solid rgba(255,255,255,.08)}.innc-ghost:hover{border-color:rgba(255,255,255,.22);background:rgba(255,255,255,.05)}' +
      '.innc-link{background:transparent;color:#8f8e89;padding:.62rem .55rem}.innc-link:hover{color:#f2f1ee}' +
      '.innc-cats{margin:0 0 15px;border-top:1px solid rgba(255,255,255,.08);display:none}.innc-cats.open{display:block}' +
      '.innc-cat{display:flex;gap:13px;align-items:flex-start;padding:13px 0;border-bottom:1px solid rgba(255,255,255,.06)}' +
      '.innc-cat h3{margin:0 0 2px;font-size:13.5px;font-weight:600;color:#f2f1ee}.innc-cat span{font-size:12px;color:#8f8e89;line-height:1.5}' +
      '.innc-sw{position:relative;width:38px;height:22px;flex:0 0 38px;margin-top:1px}.innc-sw input{opacity:0;width:0;height:0}' +
      '.innc-sl{position:absolute;inset:0;background:rgba(255,255,255,.18);border-radius:999px;transition:.15s;cursor:pointer}' +
      '.innc-sl:before{content:"";position:absolute;height:16px;width:16px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.15s}' +
      '.innc-sw input:checked + .innc-sl{background:linear-gradient(90deg,#22d3ee,#3b82f6)}.innc-sw input:checked + .innc-sl:before{transform:translateX(16px)}' +
      '.innc-sw input:disabled + .innc-sl{opacity:.5;cursor:not-allowed}' +
      '@media(max-width:560px){.innc{left:10px;right:10px;bottom:10px;transform:translateY(14px);width:auto;padding:17px}.innc.open{transform:translateY(0)}.innc-row{justify-content:stretch}.innc-btn{flex:1 1 auto;text-align:center}.innc-link{flex-basis:100%;order:5}}' +
      '@media(prefers-reduced-motion:reduce){.innc{transition:opacity .01s}}';
    document.head.appendChild(styleEl);
  }

  function build() {
    css();
    var prev = load();
    var initial = (prev && prev.cats) || { analytics: false, ads: false, prefs: false };
    root = document.createElement('div'); root.className = 'innc'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Cookie settings');
    var catsHtml = CATS.map(function (c) {
      return '<div class="innc-cat"><label class="innc-sw"><input type="checkbox" data-cat="' + c.id + '"' + (initial[c.id] ? ' checked' : '') + '><span class="innc-sl"></span></label>' +
        '<div><h3>' + c.label + '</h3><span>' + c.desc + '</span></div></div>';
    }).join('');
    root.innerHTML =
      '<h2>We value your privacy</h2>' +
      '<p>We use cookies to run the site, understand traffic and (with your consent) measure ads. Necessary cookies are always on. See our <a href="/privacy">Privacy Policy</a>.</p>' +
      '<div class="innc-cats">' +
        '<div class="innc-cat"><label class="innc-sw"><input type="checkbox" checked disabled><span class="innc-sl"></span></label><div><h3>Necessary</h3><span>Required for the site to work (security, session). Always active.</span></div></div>' +
        catsHtml +
      '</div>' +
      '<div class="innc-row">' +
        '<button class="innc-btn innc-link" data-act="manage">Manage</button>' +
        '<button class="innc-btn innc-ghost" data-act="reject">Reject all</button>' +
        '<button class="innc-btn innc-ghost" data-act="save" style="display:none">Save choices</button>' +
        '<button class="innc-btn innc-primary" data-act="accept">Accept all</button>' +
      '</div>';
    document.body.appendChild(root);
    var catsBox = root.querySelector('.innc-cats');
    var saveBtn = root.querySelector('[data-act="save"]');
    function readCats() { var o = {}; CATS.forEach(function (c) { o[c.id] = !!root.querySelector('[data-cat="' + c.id + '"]').checked; }); return o; }
    root.addEventListener('click', function (e) {
      var a = e.target.getAttribute && e.target.getAttribute('data-act'); if (!a) return;
      if (a === 'manage') { catsBox.classList.add('open'); saveBtn.style.display = ''; e.target.style.display = 'none'; }
      else if (a === 'accept') { save({ analytics: true, ads: true, prefs: true }); }
      else if (a === 'reject') { save({ analytics: false, ads: false, prefs: false }); }
      else if (a === 'save') { save(readCats()); }
    });
  }

  function show(manage) {
    if (!root) build();
    requestAnimationFrame(function () { root.classList.add('open'); });
    if (manage) { root.querySelector('.innc-cats').classList.add('open'); root.querySelector('[data-act="save"]').style.display = ''; var mb = root.querySelector('[data-act="manage"]'); if (mb) mb.style.display = 'none'; }
  }
  function hide() { if (root) root.classList.remove('open'); }

  window.innConsent = {
    open: function () { show(true); },
    acceptAll: function () { save({ analytics: true, ads: true, prefs: true }); },
    rejectAll: function () { save({ analytics: false, ads: false, prefs: false }); }
  };

  function init() {
    var s = load();
    if (fresh(s) && s.cats) { apply(s.cats); }
    else { show(false); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
