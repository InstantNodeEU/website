// InstantNode 2026 shared behaviour: announcement bar dismiss, animated
// counters, generic accordion. Idempotent; safe to load on every page.
(function () {
  'use strict';

  // Announcement bar (visibility itself is decided pre-paint by the inline
  // snippet in the partial; this only wires the close button).
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.in-announce__close');
    if (!btn) return;
    var bar = btn.closest('.in-announce');
    if (bar) bar.classList.remove('is-open');
    try { localStorage.setItem('in-announce-' + (bar.dataset.key || 'default'), '1'); } catch (e2) {}
  });

  // Generic accordion
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.in-acc__btn');
    if (!btn) return;
    btn.closest('.in-acc').classList.toggle('is-open');
  });

  // Animated counters: <span data-countto="99.9" data-decimals="1" data-suffix="%">
  function animate(el) {
    var to = parseFloat(el.dataset.countto) || 0;
    var dec = parseInt(el.dataset.decimals || '0', 10);
    var suffix = el.dataset.suffix || '';
    var prefix = el.dataset.prefix || '';
    var dur = 1400, start = null;
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { el.textContent = prefix + to.toFixed(dec) + suffix; return; }
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + (to * eased).toFixed(dec) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var seen = new WeakSet();
  function initCounters() {
    var els = document.querySelectorAll('[data-countto]');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) { els.forEach(animate); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && !seen.has(en.target)) { seen.add(en.target); animate(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.4 });
    els.forEach(function (el) { io.observe(el); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCounters);
  else initCounters();
})();
