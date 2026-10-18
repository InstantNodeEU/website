/* /license-server: the check demo, the key builder, the dashboard tour and the API
   example tabs. Everything shown is example data made in the browser, nothing is sent. */
(function () {
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

  /* Tablists on this page share one behaviour: click or arrow keys select, the panel follows. */
  function tablist(root, onSelect) {
    var tabs = [].slice.call(root.querySelectorAll('[role="tab"]'));
    function select(i, focus, fromUser) {
      // Tabs may share one panel (the check demo), so hide all first, then show the chosen one.
      tabs.forEach(function (t, j) {
        var on = i === j;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = true;
      });
      var panel = document.getElementById(tabs[i].getAttribute('aria-controls'));
      panel.hidden = false;
      panel.setAttribute('aria-labelledby', tabs[i].id);
      if (focus) tabs[i].focus();
      onSelect(i, fromUser);
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i, false, true); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); select((i + 1) % tabs.length, true, true); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); select((i + tabs.length - 1) % tabs.length, true, true); }
      });
    });
    return { select: select, count: tabs.length };
  }

  /* ---------- the check demo ---------- */
  var SCENES = [
    {
      machine: 'nordlicht-01', ok: true, verdict: 'Valid',
      json: '{\n  "data": {\n    "ok": <b>true</b>,\n    "msg": "<b>Welcome back! 23 days left.</b>",\n    "code": "ok"\n  },\n  "signature": "Qm9CR2x5...J5Aw=="\n}',
      buyer: 'Welcome back! 23 days left.', script: 'The script starts.',
      you: '<b>Nothing to do.</b> The check appears in your live list, with machine and address.'
    },
    {
      machine: 'friends-pc-77', ok: false, verdict: 'Refused',
      json: '{\n  "data": {\n    "ok": <b>false</b>,\n    "msg": "<b>This key already runs on another PC. Move it on our buyer page.</b>",\n    "code": "hwid_mismatch"\n  },\n  "signature": "Zk3a1Pwq...Lm0c=="\n}',
      buyer: 'This key already runs on another PC. Move it on our buyer page.', script: 'The script stays off.',
      you: '<b>A Discord message:</b> Key used on another machine, with key, machine and address. One click frees the slot or blocks that machine.'
    },
    {
      machine: 'nordlicht-01', ok: false, verdict: 'Refused',
      json: '{\n  "data": {\n    "ok": <b>false</b>,\n    "msg": "<b>Your Police Job license ran out on 1 Oct. Renew it in our store.</b>",\n    "code": "expired"\n  },\n  "signature": "a8Hc2LtQ...Ve4s=="\n}',
      buyer: 'Your Police Job license ran out on 1 Oct. Renew it in our store.', script: 'The script stays off.',
      you: '<b>No surprise.</b> A week before, the key was on your Needs a look list. Extend it with one click.'
    },
    {
      machine: 'CRACK-7731', ok: false, verdict: 'Blocked',
      json: '{\n  "data": {\n    "ok": <b>false</b>,\n    "msg": "<b>Access denied. Open a ticket in our Discord if this is a mistake.</b>",\n    "code": "blacklisted"\n  },\n  "signature": "Ty90bXfE...q2Rk=="\n}',
      buyer: 'Access denied. Open a ticket in our Discord if this is a mistake.', script: 'The script stays off.',
      you: '<b>A Discord message:</b> Blocked request. The machine is on your blacklist, so every key it tries gets the same answer.'
    }
  ];

  var lc = document.getElementById('lc');
  if (lc) {
    var $ = function (s) { return lc.querySelector(s); };
    var dot = $('.lc-dot'), verdict = $('.lc-verdict'), machine = $('.lc-machine');
    var out = [$('#lc-json'), $('#lc-buyer'), $('#lc-you')];
    var run = 0, auto = true, current = 0, timer = 0, visible = false;

    function fill(s) {
      out[0].innerHTML = s.json;
      $('#lc-buyer-msg').textContent = s.buyer;
      $('#lc-buyer-act').textContent = s.script;
      out[2].innerHTML = s.you;
      lc.dataset.result = s.ok ? 'ok' : 'no';
      verdict.textContent = s.verdict;
    }
    // The wire runs across on wide screens and down on phones; the dot moves along it.
    function travel(back, ok) {
      var wire = dot.parentNode, down = wire.clientHeight > wire.clientWidth;
      var d = (down ? wire.clientHeight - dot.offsetHeight : wire.clientWidth - dot.offsetWidth) + 'px';
      var at = function (v) { return (down ? 'translateY(' : 'translateX(') + v + ')'; };
      dot.classList.toggle('no', !ok);
      return dot.animate([{ transform: at(back ? d : '0px'), opacity: 1 }, { transform: at(back ? '0px' : d), opacity: 1 }],
        { duration: back ? 520 : 640, easing: EASE, fill: 'forwards' }).finished;
    }
    function play(i) {
      var s = SCENES[i], mine = ++run;
      current = i;
      machine.textContent = s.machine;
      if (still) { fill(s); return; }
      lc.dataset.phase = 'ask';
      verdict.textContent = 'Checking';
      out.forEach(function (el) { el.closest('.lc-card').classList.add('wait'); });
      travel(false, true).then(function () {
        if (mine !== run) return;
        lc.dataset.phase = 'decide';
        fill(s);
        $('.lc-srv').animate([{ borderColor: s.ok ? 'rgba(59,130,246,.6)' : 'rgba(255,47,123,.55)' }, { borderColor: 'rgba(255,255,255,.08)' }], { duration: 900, easing: 'ease-out' });
        return travel(true, s.ok);
      }).then(function () {
        if (mine !== run) return;
        lc.dataset.phase = 'done';
        out.forEach(function (el, k) {
          var card = el.closest('.lc-card');
          setTimeout(function () { if (mine === run) card.classList.remove('wait'); }, k * 120);
        });
      });
    }
    var picker = tablist($('.lc-pick'), function (i, fromUser) {
      if (fromUser) { auto = false; clearTimeout(timer); }
      play(i);
    });
    function next() {
      clearTimeout(timer);
      if (!auto || !visible || still) return;
      timer = setTimeout(function () { picker.select((current + 1) % SCENES.length, false, false); next(); }, 6200);
    }
    fill(SCENES[0]);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        var was = visible;
        visible = es[0].isIntersecting;
        if (visible && !was && auto) { play(current); next(); }
        if (!visible) clearTimeout(timer);
      }, { threshold: 0.45 }).observe(lc);
    }
  }

  /* ---------- the key builder (same alphabets and maths as the license server) ---------- */
  var SETS = {
    upper: 'ABCDEFGHJKMNPQRSTUVWXYZ23456789',
    hex: '0123456789ABCDEF',
    lower: 'abcdefghjkmnpqrstuvwxyz23456789',
    alnum: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  };
  var kb = document.getElementById('kb');
  if (kb) {
    var f = {
      prefix: kb.querySelector('[name="prefix"]'), blocks: kb.querySelector('[name="blocks"]'),
      len: kb.querySelector('[name="len"]'), sep: kb.querySelector('[name="sep"]'), set: kb.querySelector('[name="set"]')
    };
    var keys = [].slice.call(kb.querySelectorAll('.kb-key')), bits = kb.querySelector('.kb-bits');
    var rand = function (n) {
      var a = new Uint32Array(1);
      (window.crypto || window.msCrypto).getRandomValues(a);
      return a[0] % n;
    };
    var make = function (alpha, blocks, len, sep, prefix) {
      var parts = [];
      for (var b = 0; b < blocks; b++) {
        var s = '';
        for (var c = 0; c < len; c++) s += alpha[rand(alpha.length)];
        parts.push(s);
      }
      return prefix + parts.join(sep);
    };
    var scramble = function (el, target, alpha) {
      if (still) { el.textContent = target; return; }
      var start = performance.now(), dur = 320;
      (function frame(t) {
        var k = Math.min(1, (t - start) / dur), fixed = Math.floor(k * target.length), s = target.slice(0, fixed);
        for (var i = fixed; i < target.length; i++) s += /[A-Za-z0-9]/.test(target[i]) ? alpha[rand(alpha.length)] : target[i];
        el.textContent = s;
        if (k < 1) requestAnimationFrame(frame);
      })(start);
    };
    var update = function () {
      var alpha = SETS[f.set.value] || SETS.upper;
      var blocks = +f.blocks.value, len = +f.len.value;
      var prefix = f.prefix.value.replace(/[^A-Za-z0-9._-]/g, '').slice(0, 8);
      kb.querySelector('[data-for="blocks"]').textContent = blocks;
      kb.querySelector('[data-for="len"]').textContent = len;
      keys.forEach(function (el) { scramble(el, make(alpha, blocks, len, f.sep.value, prefix), alpha); });
      var n = Math.floor(blocks * len * Math.log2(alpha.length));
      bits.textContent = n + ' bits of randomness, ' + (n >= 50 ? 'practically impossible to guess.' : n >= 35 ? 'fine with the machine lock on.' : 'too short to sell, add a block.');
    };
    ['input', 'change'].forEach(function (ev) { kb.addEventListener(ev, update); });
    update();
  }

  /* ---------- the dashboard tour ---------- */
  var tour = document.getElementById('tour-tabs');
  if (tour) {
    tablist(tour, function (i) {
      var shot = document.getElementById('tour-p' + (i + 1));
      if (!still && shot) shot.animate([{ opacity: 0, filter: 'blur(6px)' }, { opacity: 1, filter: 'blur(0)' }], { duration: 320, easing: EASE });
    });
  }

  /* ---------- the API examples ---------- */
  var lxTabs = document.querySelector('.lx-tabs');
  if (lxTabs) {
    var facts = [
      '<span>Keys <b>PJ-XXXX-XXXX-XXXX</b></span><span>Lock <b>1 machine</b></span><span>Runs <b>30 days from first use</b></span><span>Address <b>license.instantnode.eu/nordlicht</b></span>',
      '<span>Keys <b>BW-XXXXX-XXXXX</b></span><span>Lock <b>2 machines</b></span><span>Runs <b>forever</b></span><span>Address <b>license.instantnode.eu/blockwerk</b></span>',
      '<span>Keys <b>24 hex characters</b></span><span>Lock <b>1 experience</b></span><span>Runs <b>365 days</b></span><span>Address <b>license.instantnode.eu/skyforge</b></span>'
    ];
    tablist(lxTabs, function (i) { document.getElementById('lx-facts').innerHTML = facts[i]; });
  }
})();
