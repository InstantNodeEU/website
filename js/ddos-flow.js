/* /ddos-protection: attack traffic (grey glyphs) runs into the filter column and
   breaks up, real traffic (blue) passes and lands in the server rack. Same glyph
   ramp and blue as the halftone art in lunaris.js. Illustration only, not data. */
(function () {
  var cv = document.getElementById('dd-flow');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  var RAMP = ' .:-=+*#%@';
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W, H, cell, cols, rows, fx, sx0, sx1, sy0, sy1, heat, led, rack;
  var parts = [], debris = [], t = 0, last = 0, raf = 0, visible = false;

  function put(c, ch, x, y, color) { c.fillStyle = color; c.fillText(ch, x * cell + cell / 2, y * cell + cell / 2); }
  function font(c) { c.font = (cell + 1) + 'px "JetBrains Mono", ui-monospace, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; }

  function size() {
    var r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    W = (r.width | 0) || 600; H = (r.height | 0) || 300;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cell = W > 700 ? 11 : 9;
    cols = Math.ceil(W / cell); rows = Math.ceil(H / cell);
    fx = Math.round(cols * 0.56);
    sx1 = Math.round(cols * 0.93); sx0 = sx1 - Math.max(7, Math.round(cols * 0.12));
    sy0 = Math.round(rows * 0.2); sy1 = Math.round(rows * 0.8);
    heat = new Float32Array(rows); led = new Float32Array(rows);
    parts = []; debris = [];
    font(ctx);
    /* the rack body never changes: draw it once */
    rack = document.createElement('canvas');
    rack.width = W * dpr; rack.height = H * dpr;
    var rc = rack.getContext('2d');
    rc.setTransform(dpr, 0, 0, dpr, 0, 0); font(rc);
    for (var y = sy0; y <= sy1; y++) {
      for (var x = sx0; x <= sx1; x++) {
        var edge = y === sy0 || y === sy1 || x === sx0 || x === sx1, unit = (y - sy0) % 3 === 0;
        put(rc, edge ? '#' : unit ? '=' : ':', x, y, edge ? 'rgba(200,199,195,.75)' : unit ? 'rgba(150,149,145,.45)' : 'rgba(110,109,105,.22)');
      }
    }
  }

  function add(n, bad) {
    for (n += Math.random(); n >= 1; n--) {
      parts.push({
        x: -1 - Math.random() * 3, y: Math.random() * (rows - 1), bad: bad,
        v: bad ? 14 + Math.random() * 16 : 10 + Math.random() * 4,
        ch: bad ? '#%@*'[(Math.random() * 4) | 0] : '+',
        ty: sy0 + 1 + Math.random() * (sy1 - sy0 - 2)
      });
    }
  }
  function drop(list, i) { list[i] = list[list.length - 1]; list.pop(); }

  function step(dt) {
    t += dt;
    /* a calm baseline with a flood every few seconds */
    var wave = Math.pow(Math.max(0, Math.sin(t * 0.6)), 4), k = rows / 30;
    if (parts.length < 1200) { add((9 + wave * 180) * k * dt, true); add(13 * k * dt, false); }
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.x += p.v * dt;
      if (p.bad) {
        if (p.x >= fx - 1) {
          var r = Math.round(p.y);
          heat[r] = Math.min(1, heat[r] + 0.3);
          if (debris.length < 800) for (var d = 0; d < 2; d++) debris.push({ x: fx - 1.5, y: p.y, vx: -(1 + Math.random() * 4), vy: -2 + Math.random() * 6, life: 0.6 + Math.random() * 0.5 });
          drop(parts, i);
        }
        continue;
      }
      if (p.x > fx) p.y += (p.ty - p.y) * Math.min(1, dt * 2.4);
      if (p.x >= sx0) { led[Math.round(p.ty)] = 1; drop(parts, i); }
    }
    for (i = debris.length - 1; i >= 0; i--) {
      var q = debris[i];
      q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 14 * dt; q.life -= dt * 1.5;
      if (q.life <= 0 || q.y < 0 || q.y > rows) drop(debris, i);
    }
    var f1 = Math.pow(0.2, dt), f2 = Math.pow(0.05, dt);
    for (i = 0; i < rows; i++) { heat[i] *= f1; led[i] *= f2; }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    var i, p, x, y;
    for (i = 0; i < parts.length; i++) {
      p = parts[i]; x = Math.floor(p.x); y = Math.round(p.y);
      if (p.bad) {
        put(ctx, p.ch, x, y, 'rgba(214,213,209,.9)');
        put(ctx, '=', x - 1, y, 'rgba(150,149,145,.45)');
      } else {
        put(ctx, '+', x, y, 'rgb(110,160,255)');
        put(ctx, '-', x - 1, y, 'rgba(59,130,246,.55)');
        put(ctx, '.', x - 2, y, 'rgba(59,130,246,.3)');
      }
    }
    for (i = 0; i < debris.length; i++) {
      p = debris[i];
      put(ctx, '.', Math.floor(p.x), Math.round(p.y), 'rgba(120,119,115,' + (p.life * 0.55).toFixed(2) + ')');
    }
    /* the filter: a glyph column that lights up blue where it gets hit */
    for (y = 0; y < rows; y++) {
      var h = heat[y];
      var d = Math.min(1, 0.55 + 0.1 * Math.sin(y * 1.7 + t * 3) + 0.06 * Math.sin(y * 0.6 - t * 1.3) + h * 0.5);
      var n = Math.min(RAMP.length - 1, 1 + ((d * (RAMP.length - 2)) | 0));
      var c = 'rgb(' + ((170 - 60 * h) | 0) + ',' + ((182 - 10 * h) | 0) + ',' + ((215 + 40 * h) | 0) + ')';
      put(ctx, RAMP[n], fx, y, c);
      put(ctx, RAMP[n], fx + 1, y, c);
      put(ctx, RAMP[Math.max(1, n - 3)], fx + 2, y, 'rgba(110,150,240,' + (0.25 + h * 0.5).toFixed(2) + ')');
    }
    ctx.drawImage(rack, 0, 0, W, H);
    /* one LED per rack unit, lit by the clean traffic it just received */
    for (y = sy0 + 1; y < sy1; y += 3) {
      var lit = Math.max(led[y] || 0, led[y + 1] || 0, led[y - 1] || 0);
      put(ctx, 'o', sx1 - 2, y, lit > 0.05 ? 'rgba(110,160,255,' + (0.35 + lit * 0.65).toFixed(2) + ')' : 'rgba(92,91,87,.6)');
    }
  }

  function settle() { for (var i = 0; i < 240; i++) step(1 / 30); draw(); }
  function frame(ts) {
    raf = 0;
    if (!visible || document.hidden) return;
    /* a frame's timestamp can be older than the performance.now() taken in start() */
    var dt = (ts - last) / 1000;
    if (!(dt > 0)) dt = 0.016; else if (dt > 0.05) dt = 0.05;
    last = ts;
    step(dt); draw();
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (still || raf || !visible || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  size();
  if (still) settle();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; start(); }, { rootMargin: '120px 0px' }).observe(cv);
  } else { visible = true; start(); }
  document.addEventListener('visibilitychange', start);
  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { size(); if (still) settle(); }, 150);
  });
  /* JetBrains Mono may arrive after the first frame: rebuild with the real glyphs */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { size(); if (still) settle(); });
})();

/* The numbers on /ddos-protection: /ddos-stats.json is rewritten every hour on
   the server (inn-ddos-stats, aggregates only, never an address). Without it the
   numbers written into the HTML stay. */
(function () {
  var bars = document.getElementById('dd-bars');
  if (!bars || !window.fetch) return;
  var WORDS = { en: ['vectors', 'min'], de: ['Vektoren', 'Min.'], fr: ['vecteurs', 'min'], es: ['vectores', 'min'] };
  var data, io;
  function lang() { var l = (document.documentElement.lang || 'en').slice(0, 2); return WORDS[l] ? l : 'en'; }
  /* a fresh node, so inn-lang never writes its dictionary value back over it */
  function swap(sel, text) {
    var el = document.querySelector(sel);
    if (!el) return;
    var n = el.cloneNode(false);
    n.setAttribute('data-no-i18n', '');
    n.textContent = text;
    el.parentNode.replaceChild(n, el);
  }
  function reveal(li) {
    if (!('IntersectionObserver' in window)) { li.classList.add('in'); return; }
    io = io || new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -40px 0px' });
    io.observe(li);
  }
  function render() {
    var l = lang(), w = WORDS[l], d = data, max = d.top[0].gbps, ref = bars.querySelector('.dd-ref');
    swap('.js-dd-max', max + ' Gbit/s');
    swap('.js-dd-total', new Intl.NumberFormat(l).format(Math.floor(d.total / 100) * 100) + '+');
    swap('.js-dd-vectors', String(d.vectors));
    Array.prototype.slice.call(bars.children).forEach(function (li) { if (li !== ref) bars.removeChild(li); });
    d.top.forEach(function (a) {
      var p = a.date.split('-'), li = document.createElement('li');
      li.className = 'rv';
      li.setAttribute('data-no-i18n', '');
      li.style.setProperty('--w', (a.gbps / max * 100).toFixed(1) + '%');
      li.innerHTML = '<span class="dd-date">' + p[2] + '.' + p[1] + '.' + p[0] + '</span><span class="dd-bar"><i></i></span><b>' + a.gbps +
        ' Gbit/s</b><span class="dd-meta">' + a.vectors + ' ' + w[0] + (a.minutes ? ' \u00b7 ' + a.minutes + ' ' + w[1] : '') + '</span>';
      bars.insertBefore(li, ref);
      reveal(li);
    });
    if (ref) ref.style.setProperty('--w', (100 / max).toFixed(2) + '%');
  }
  fetch('/ddos-stats.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d || !d.top || !d.top.length || !(d.total > 0) || !(d.top[0].gbps > 0)) return;
    data = d;
    render();
    document.addEventListener('inn:lang', render);
  }).catch(function () {});
})();
