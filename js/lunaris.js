/* InstantNode 2026 - glyph-halftone art + nav + reveal. No deps. */
(function () {
  'use strict';

  /* ---------- glyph halftone renderer ----------
     Draws a density field as a grid of glyphs; brighter = denser glyph.
     Ember tint near a configurable hotspot. data-art picks the shape. */

  var RAMP = ' ..::--=+*#%@';

  function mix(a, b, t) { return a + (b - a) * t; }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  /* cheap value noise */
  function hash(x, y) {
    var h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return h - Math.floor(h);
  }
  function noise(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return mix(
      mix(hash(xi, yi), hash(xi + 1, yi), u),
      mix(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v);
  }
  function fbm(x, y) {
    return noise(x, y) * 0.55 + noise(x * 2.1, y * 2.1) * 0.28 + noise(x * 4.3, y * 4.3) * 0.17;
  }

  function amb(u, v) { return fbm(u * 10, v * 10) * 0.07; }
  /* signed inside-distance -> ambient / bright rim / noisy fill */
  function ico(s, u, v) {
    if (s <= 0) return amb(u, v);
    if (s < 0.045) return 0.97;
    return 0.28 + 0.38 * fbm(u * 16, v * 14);
  }

  /* small card icons: simple, readable at ~24x16 glyphs.
     Each takes normalized u,v and the canvas aspect a. */
  function bar(X, Y, x0, y0, x1, y1, t) {   /* thick segment test */
    var dx = x1 - x0, dy = y1 - y0, L = dx * dx + dy * dy;
    var s = L ? ((X - x0) * dx + (Y - y0) * dy) / L : 0;
    s = s < 0 ? 0 : s > 1 ? 1 : s;
    var px = X - (x0 + s * dx), py = Y - (y0 + s * dy);
    return t - Math.sqrt(px * px + py * py);
  }
  function ring(X, Y, cx, cy, r, t) {
    return t - Math.abs(Math.sqrt((X - cx) * (X - cx) + (Y - cy) * (Y - cy)) - r);
  }
  function ell(X, Y, cy, a, b, t) {   /* distance to an ellipse outline */
    var d = Math.sqrt((X / a) * (X / a) + ((Y - cy) / b) * ((Y - cy) / b));
    return t - Math.abs(d - 1) * b;
  }
  function box(X, Y, w, h, cx, cy) {
    return Math.min(w - Math.abs(X - (cx || 0)), h - Math.abs(Y - (cy || 0)));
  }
  /* the InstantNode mark: three blades with speed spikes and six round holes,
     in logo units (height -1..1). Simplified from mc-renders logo_shape.json. */
  var LOGO = [[-0.469,-0.92,-0.462,-0.95,-0.445,-0.976,-0.419,-0.994,-0.393,-1.0,1.702,-0.998,1.727,-0.989,1.747,-0.973,1.766,-0.93,1.766,-0.43,1.756,-0.406,1.74,-0.385,1.717,-0.372,1.692,-0.366,-0.054,-0.365,-1.265,-0.43,-1.285,-0.444,-1.29,-0.462,-1.281,-0.485,-1.258,-0.494,0.723,-0.606,-0.419,-0.66,-0.455,-0.683,-0.468,-0.715],[-1.651,-0.149,1.697,-0.271,1.722,-0.263,1.744,-0.248,1.759,-0.227,1.766,-0.202,1.766,0.234,1.756,0.264,1.74,0.284,1.717,0.298,1.687,0.304,-0.054,0.304,-1.265,0.236,-1.285,0.223,-1.29,0.205,-1.285,0.187,-1.265,0.173,0.535,0.05,-1.678,-0.094,-1.735,-0.09,-1.753,-0.095,-1.766,-0.116,-1.765,-0.134,-1.753,-0.149,-1.735,-0.154],[-1.187,0.502,1.697,0.412,1.722,0.419,1.744,0.435,1.759,0.456,1.766,0.481,1.766,0.93,1.756,0.96,1.74,0.98,1.717,0.994,1.687,1.0,-0.399,0.999,-0.441,0.98,-0.458,0.96,-0.467,0.935,-0.469,0.612,-1.265,0.568,-1.281,0.56,-1.29,0.543,-1.281,0.514,-1.265,0.505]];
  var LOGO_HOLES = [[1.199,-0.695,0.083],[1.478,-0.695,0.083],[1.199,0.017,0.083],[1.478,0.017,0.083],[1.199,0.687,0.083],[1.478,0.687,0.083]];
  /* signed distance to the mark in logo units, positive inside */
  function logoSd(X, Y) {
    var inside = false, best = 1e9, k, i, j, p, n;
    for (k = 0; k < LOGO.length; k++) {
      p = LOGO[k]; n = p.length;
      for (i = 0, j = n - 2; i < n; j = i, i += 2) {
        var xi = p[i], yi = p[i + 1], dx = p[j] - xi, dy = p[j + 1] - yi;
        if ((yi > Y) !== (p[j + 1] > Y) && X < dx * (Y - yi) / dy + xi) inside = !inside;
        var L = dx * dx + dy * dy, t = L ? ((X - xi) * dx + (Y - yi) * dy) / L : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        var ex = X - xi - t * dx, ey = Y - yi - t * dy;
        if (ex * ex + ey * ey < best) best = ex * ex + ey * ey;
      }
    }
    var s = inside ? Math.sqrt(best) : -Math.sqrt(best);
    for (k = 0; k < LOGO_HOLES.length; k++) {
      var h = LOGO_HOLES[k];
      s = Math.min(s, Math.sqrt((X - h[0]) * (X - h[0]) + (Y - h[1]) * (Y - h[1])) - h[2]);
    }
    return s;
  }
  /* ---- InstantNode mark as ink: shared by mark / gate ----
     X, Y in logo units (height -1..1), c = one glyph row in logo units.
     Returns a density for the mark, 0 for its clean halo (keeps the blades
     apart and the six holes hollow), or -1 when the point is free. */
  var LOGO_TIPS = [[-1.29, -0.462], [-1.766, -0.12], [-1.29, 0.205], [-1.29, 0.543]];
  function logoInk(X, Y, c, u, v, cx) {
    cx = cx || c;                                       /* cx = one glyph column in logo units */
    var k, h, dx, dy, lip = false;
    var hx = Math.max(2, Math.round(0.166 / cx)) * cx * 0.5, hy = Math.max(2, Math.round(0.166 / c)) * c * 0.5;
    for (k = 0; k < LOGO_HOLES.length; k++) {           /* holes: whole glyphs picked at the cell */
      h = LOGO_HOLES[k];                                /* centre, so each is a clean 2 x 2 at mark size */
      dx = Math.abs(X + cx * 0.5 - h[0]); dy = Math.abs(Y + c * 0.5 - h[1]);
      if (dx < hx && dy < hy) return 0;                 /* always hollow */
      if (dx < hx + cx && dy < hy + c) lip = true;
    }
    if (lip) return 0.85;                               /* even lip, so the holes read as dots */
    var m = logoSd(X, Y);
    if (X < -0.47) {                                    /* needles: vertical coverage, taper to the tip */
      if (m < -c * 1.6) return -1;
      var f = 0;
      for (k = 0; k < 6; k++) if (logoSd(X, Y + (k / 5 - 0.5) * c * 0.96) > 0) f++;
      return f ? 0.3 + 0.58 * clamp01(f / 6 * 1.6) : 0;   /* tops out at the rim level */
    }
    if (m > 0) return m < c * 0.6 ? 0.9 : 0.62 + 0.34 * fbm(u * 16, v * 14);   /* solid blades */
    if (m > -c * 1.2) return 0;                         /* clean halo, gaps stay open */
    return -1;
  }
  /* wraps an icon fn: outline style - bright edge, near-empty interior,
     so box-ish glyphs stay readable at ~25x25 characters */
  function icon(fn, sx, sy) {
    return function (u, v, a) {
      a = a || 1;
      var X = ((u - 0.5) * a) / (sx || 0.8), Y = (v - 0.5) / (sy || 0.8);
      var s = fn(X, Y);
      if (s <= 0) return 0;
      if (s < 0.05) return 0.95;
      return 0.13;
    };
  }

  /* shapes: return density 0..1 for normalized coords u,v in [0,1] */
  var SHAPES = {
    /* --- card icons --- */
    scales: icon(function (X, Y) {                       /* honesty / fair pricing */
      var s = bar(X, Y, 0, -0.46, 0, 0.42, 0.045);
      s = Math.max(s, bar(X, Y, -0.46, -0.3, 0.46, -0.3, 0.045));
      s = Math.max(s, bar(X, Y, -0.26, 0.42, 0.26, 0.42, 0.05));
      s = Math.max(s, bar(X, Y, -0.46, -0.3, -0.46, -0.08, 0.032));
      s = Math.max(s, bar(X, Y, 0.46, -0.3, 0.46, -0.08, 0.032));
      if (Y > -0.09) {                                   /* pans: lower arcs only */
        s = Math.max(s, ring(X, Y, -0.46, -0.09, 0.17, 0.048));
        s = Math.max(s, ring(X, Y, 0.46, -0.09, 0.17, 0.048));
      }
      return s;
    }),
    heart: icon(function (X, Y) {                        /* customer focused */
      var s = -1;
      if (Y < -0.1) {                                    /* top halves of the lobes */
        s = Math.max(s, ring(X, Y, -0.24, -0.1, 0.26, 0.075));
        s = Math.max(s, ring(X, Y, 0.24, -0.1, 0.26, 0.075));
      }
      s = Math.max(s, bar(X, Y, -0.5, -0.1, 0, 0.52, 0.075));
      return Math.max(s, bar(X, Y, 0.5, -0.1, 0, 0.52, 0.075));
    }, 0.78, 0.78),
    spark: icon(function (X, Y) {                        /* innovation */
      var s = bar(X, Y, 0, -0.55, 0, 0.55, 0.06);
      s = Math.max(s, bar(X, Y, -0.55, 0, 0.55, 0, 0.06));
      s = Math.max(s, bar(X, Y, -0.34, -0.34, 0.34, 0.34, 0.045));
      return Math.max(s, bar(X, Y, -0.34, 0.34, 0.34, -0.34, 0.045));
    }),
    gauge: icon(function (X, Y) {                        /* performance */
      var s = Y < 0.2 ? ring(X, Y, 0, 0.2, 0.46, 0.055) : -1;
      s = Math.max(s, bar(X, Y, 0, 0.2, 0.22, -0.15, 0.05));       /* needle */
      s = Math.max(s, 0.08 - Math.sqrt(X * X + (Y - 0.2) * (Y - 0.2)));
      s = Math.max(s, bar(X, Y, -0.5, 0.2, -0.36, 0.2, 0.042));
      return Math.max(s, bar(X, Y, 0.36, 0.2, 0.5, 0.2, 0.042));
    }),
    lock: icon(function (X, Y) {                         /* privacy / GDPR */
      var s = box(X, Y, 0.42, 0.3, 0, 0.26);             /* body */
      if (Y < -0.04) s = Math.max(s, ring(X, Y, 0, -0.04, 0.22, 0.055)); /* shackle */
      if (s > 0.07 && Y > 0.14 && Math.abs(X) < 0.05 && Y < 0.4) return 0.02; /* keyhole */
      return s;
    }),
    headset: icon(function (X, Y) {                      /* human support */
      var s = Y < 0.05 ? ring(X, Y, 0, 0.05, 0.46, 0.06) : -1;
      s = Math.max(s, box(X, Y, 0.11, 0.2, -0.46, 0.22));
      s = Math.max(s, box(X, Y, 0.11, 0.2, 0.46, 0.22));
      return Math.max(s, bar(X, Y, 0.46, 0.42, 0.1, 0.52, 0.05));
    }),
    ticket: icon(function (X, Y) {                       /* support tickets */
      var s = box(X, Y, 0.5, 0.3);
      if (s <= 0) return -1;
      if (Math.abs(X - 0.06) < 0.11 &&
          (Math.abs(Y + 0.3) < 0.08 || Math.abs(Y - 0.3) < 0.08)) return -1;  /* notches */
      if (s < 0.05) return s;
      if (Math.abs(X - 0.06) < 0.022 && Math.abs(Math.sin(Y * 22)) > 0.5) return 0.02;
      return s;
    }),
    mail: icon(function (X, Y) {                         /* email */
      var s = box(X, Y, 0.56, 0.36);
      if (s > 0.05 && (bar(X, Y, -0.56, -0.36, 0, 0.08, 0.045) > 0 ||
                       bar(X, Y, 0.56, -0.36, 0, 0.08, 0.045) > 0)) return 0.02;
      return s;
    }),
    pin: icon(function (X, Y) {                          /* location */
      var s = Y < 0.03 ? ring(X, Y, 0, -0.18, 0.3, 0.055) : -1;
      s = Math.max(s, bar(X, Y, -0.26, -0.06, 0, 0.54, 0.055));
      s = Math.max(s, bar(X, Y, 0.26, -0.06, 0, 0.54, 0.055));
      return Math.max(s, ring(X, Y, 0, -0.18, 0.1, 0.04));
    }),
    nodes: icon(function (X, Y) {                        /* network: one hub, three leaves */
      var P = [[-0.42, 0.34], [0, 0.34], [0.42, 0.34]], i, s = -1;
      s = Math.max(s, bar(X, Y, 0, -0.3, 0, -0.02, 0.03));        /* trunk */
      s = Math.max(s, bar(X, Y, -0.42, -0.02, 0.42, -0.02, 0.03)); /* bus */
      for (i = 0; i < 3; i++) s = Math.max(s, bar(X, Y, P[i][0], -0.02, P[i][0], P[i][1], 0.03));
      for (i = 0; i < 3; i++) {
        s = Math.max(s, 0.12 - Math.sqrt((X - P[i][0]) * (X - P[i][0]) + (Y - P[i][1]) * (Y - P[i][1])));
      }
      return Math.max(s, 0.15 - Math.sqrt(X * X + (Y + 0.36) * (Y + 0.36)));
    }),
    pulse: icon(function (X, Y) {                        /* uptime / reliability */
      var s = bar(X, Y, -0.6, 0, -0.26, 0, 0.05);
      s = Math.max(s, bar(X, Y, -0.26, 0, -0.12, -0.42, 0.05));
      s = Math.max(s, bar(X, Y, -0.12, -0.42, 0.06, 0.4, 0.05));
      s = Math.max(s, bar(X, Y, 0.06, 0.4, 0.2, 0, 0.05));
      return Math.max(s, bar(X, Y, 0.2, 0, 0.6, 0, 0.05));
    }),
    vault: icon(function (X, Y) {                        /* isolation / security */
      var s = box(X, Y, 0.5, 0.42);
      if (s > 0.06) {
        if (ring(X, Y, 0, 0, 0.2, 0.045) > 0) return 0.02;
        if (Math.abs(X) < 0.028 && Math.abs(Y) < 0.34) return 0.02;
        if (Math.abs(Y) < 0.028 && Math.abs(X) < 0.34) return 0.02;
      }
      return s;
    }),
    disc: icon(function (X, Y) {                         /* NVMe storage */
      var s = ring(X, Y, 0, 0, 0.5, 0.06);
      s = Math.max(s, ring(X, Y, 0, 0, 0.3, 0.045));
      return Math.max(s, 0.09 - Math.sqrt(X * X + Y * Y));
    }),
    arrows: icon(function (X, Y) {                       /* fast network */
      var s = -1, i, ox;
      for (i = -1; i <= 1; i += 2) {
        ox = i * 0.24;
        s = Math.max(s, bar(X, Y, ox - 0.13, -0.32, ox + 0.15, 0, 0.055));
        s = Math.max(s, bar(X, Y, ox + 0.15, 0, ox - 0.13, 0.32, 0.055));
      }
      return s;
    }),
    wasm: icon(function (X, Y) {                         /* wasm core */
      var s = box(X, Y, 0.46, 0.4);
      if (s > 0.06 && Math.abs(Math.sin(X * 11)) < 0.3 && Math.abs(Y) < 0.26) return 0.02;
      return s;
    }),
    ghost: icon(function (X, Y) {                        /* silent rejection */
      var s = Y < 0 ? ring(X, Y, 0, 0, 0.42, 0.07) : -1;
      s = Math.max(s, bar(X, Y, -0.42, 0, -0.42, 0.4, 0.07));
      s = Math.max(s, bar(X, Y, 0.42, 0, 0.42, 0.4, 0.07));
      s = Math.max(s, bar(X, Y, -0.42, 0.4, 0.42, 0.4, 0.07));
      return Math.max(s, bar(X, Y, -0.5, -0.5, 0.5, 0.5, 0.05));
    }),
    radar: icon(function (X, Y) {                        /* scoring / analyzer */
      var s = ring(X, Y, 0, 0, 0.5, 0.05);
      s = Math.max(s, ring(X, Y, 0, 0, 0.28, 0.04));
      s = Math.max(s, bar(X, Y, 0, 0, 0.36, -0.36, 0.045));
      return Math.max(s, 0.07 - Math.sqrt(X * X + Y * Y));
    }),
    check: icon(function (X, Y) {                        /* verify / verdict */
      var s = ring(X, Y, 0, 0, 0.5, 0.055);
      s = Math.max(s, bar(X, Y, -0.24, 0.02, -0.06, 0.22, 0.055));
      return Math.max(s, bar(X, Y, -0.06, 0.22, 0.26, -0.22, 0.055));
    }),
    db: icon(function (X, Y) {                           /* databases */
      var s = ell(X, Y, -0.32, 0.44, 0.14, 0.05);        /* top rim */
      s = Math.max(s, Y > 0 ? ell(X, Y, 0.0, 0.44, 0.14, 0.045) : -1);
      s = Math.max(s, Y > 0.3 ? ell(X, Y, 0.32, 0.44, 0.14, 0.05) : -1);
      s = Math.max(s, bar(X, Y, -0.44, -0.32, -0.44, 0.32, 0.045));
      return Math.max(s, bar(X, Y, 0.44, -0.32, 0.44, 0.32, 0.045));
    }),
    layers: icon(function (X, Y) {                       /* scale / capacity */
      var s = -1, o = [-0.36, 0, 0.36];
      for (var i = 0; i < 3; i++) s = Math.max(s, box(X, Y, 0.5, 0.1, 0, o[i]));
      return s;
    }),
    roof: icon(function (X, Y) {                         /* one roof / house */
      var s = bar(X, Y, -0.55, -0.02, 0, -0.5, 0.055);
      s = Math.max(s, bar(X, Y, 0.55, -0.02, 0, -0.5, 0.055));
      s = Math.max(s, bar(X, Y, -0.4, 0.0, -0.4, 0.48, 0.05));
      s = Math.max(s, bar(X, Y, 0.4, 0.0, 0.4, 0.48, 0.05));
      return Math.max(s, bar(X, Y, -0.4, 0.48, 0.4, 0.48, 0.05));
    }),
    plus: icon(function (X, Y) {                         /* more resources */
      var s = ring(X, Y, 0, 0, 0.5, 0.055);
      s = Math.max(s, bar(X, Y, -0.26, 0, 0.26, 0, 0.055));
      return Math.max(s, bar(X, Y, 0, -0.26, 0, 0.26, 0.055));
    }),
    cycle: icon(function (X, Y) {                        /* auto-restart */
      var s = (X > -0.12 || Y > 0.05) ? ring(X, Y, 0, 0, 0.44, 0.055) : -1;
      s = Math.max(s, bar(X, Y, -0.44, 0.02, -0.28, -0.2, 0.05));
      return Math.max(s, bar(X, Y, -0.44, 0.02, -0.6, -0.2, 0.05));
    }),
    /* mouse pointer, drawn as one closed outline so it reads as a cursor */
    cursor: icon(function (X, Y) {
      var P = [[-0.30, -0.54], [-0.30, 0.34], [-0.08, 0.13], [0.06, 0.52],
               [0.24, 0.45], [0.10, 0.08], [0.34, 0.04]];
      var s = -1;
      for (var i = 0; i < P.length - 1; i++) {
        s = Math.max(s, bar(X, Y, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1], 0.042));
      }
      /* close the shape back to the tip */
      return Math.max(s, bar(X, Y, P[6][0], P[6][1], P[0][0], P[0][1], 0.042));
    }),
    /* server migration: two racks with a flow of data between them */
    migrate: icon(function (X, Y) {
      var s = -1, i, cx, b;
      for (i = -1; i <= 1; i += 2) {
        cx = i * 0.66;
        b = box(X, Y, 0.2, 0.44, cx, 0);
        if (b > 0) {
          if (b < 0.05) s = Math.max(s, b);                       /* cabinet rim */
          else if (Math.abs(Math.abs(Y) - 0.22) < 0.035 || Math.abs(Y) < 0.035) {
            s = Math.max(s, 0.02);                                /* unit slats */
          }
        }
      }
      s = Math.max(s, bar(X, Y, -0.3, 0, 0.26, 0, 0.045));        /* arrow shaft */
      s = Math.max(s, bar(X, Y, 0.26, 0, 0.11, -0.15, 0.045));    /* head */
      return Math.max(s, bar(X, Y, 0.26, 0, 0.11, 0.15, 0.045));
    }, 1.05, 0.66),
    sliders: icon(function (X, Y) {                      /* configure */
      var s = -1, r = [[-0.32, -0.1], [0, 0.22], [0.32, -0.3]];
      for (var i = 0; i < 3; i++) {
        s = Math.max(s, bar(X, Y, -0.55, r[i][0], 0.55, r[i][0], 0.035));
        s = Math.max(s, box(X, Y, 0.07, 0.11, r[i][1], r[i][0]));
      }
      return s;
    }),
    play: icon(function (X, Y) {                         /* deploy & play */
      var s = ring(X, Y, 0, 0, 0.5, 0.055);
      s = Math.max(s, bar(X, Y, -0.16, -0.24, 0.24, 0, 0.05));
      s = Math.max(s, bar(X, Y, -0.16, 0.24, 0.24, 0, 0.05));
      return Math.max(s, bar(X, Y, -0.16, -0.24, -0.16, 0.24, 0.05));
    }),
    chart: icon(function (X, Y) {                        /* analytics / usage */
      var s = bar(X, Y, -0.5, 0.45, 0.5, 0.45, 0.045);
      s = Math.max(s, box(X, Y, 0.09, 0.16, -0.3, 0.28));
      s = Math.max(s, box(X, Y, 0.09, 0.3, 0, 0.14));
      return Math.max(s, box(X, Y, 0.09, 0.44, 0.3, 0));
    }),
    search: icon(function (X, Y) {                       /* finder / detection */
      var s = ring(X, Y, -0.12, -0.12, 0.34, 0.055);
      return Math.max(s, bar(X, Y, 0.14, 0.14, 0.46, 0.46, 0.06));
    }),
    doc: icon(function (X, Y) {                          /* files / editor */
      var s = box(X, Y, 0.36, 0.48);
      if (s > 0.06) {
        for (var i = -2; i <= 1; i++) if (Math.abs(Y - i * 0.17 - 0.05) < 0.028 && Math.abs(X) < 0.22) return 0.02;
      }
      return s;
    }),
    cloud: icon(function (X, Y) {                        /* your own cloud */
      var s = Y < 0.14 ? ring(X, Y, -0.24, 0.02, 0.24, 0.055) : -1;
      s = Math.max(s, Y < 0.14 ? ring(X, Y, 0.1, -0.06, 0.32, 0.055) : -1);
      return Math.max(s, bar(X, Y, -0.44, 0.16, 0.42, 0.16, 0.055));
    }),
    people: icon(function (X, Y) {                       /* community / team */
      var s = ring(X, Y, -0.24, -0.24, 0.17, 0.05);
      s = Math.max(s, ring(X, Y, 0.26, -0.28, 0.14, 0.045));
      s = Math.max(s, Y < 0.34 && Y > -0.04 ? ring(X, Y, -0.24, 0.34, 0.3, 0.05) : -1);
      return Math.max(s, Y < 0.32 && Y > -0.06 && X > 0.1 ? ring(X, Y, 0.3, 0.32, 0.26, 0.05) : -1);
    }),
    book: icon(function (X, Y) {                         /* courses / learning */
      var s = bar(X, Y, -0.55, -0.1, 0, -0.42, 0.05);    /* mortar board */
      s = Math.max(s, bar(X, Y, 0.55, -0.1, 0, -0.42, 0.05));
      s = Math.max(s, bar(X, Y, -0.55, -0.1, 0, 0.18, 0.05));
      s = Math.max(s, bar(X, Y, 0.55, -0.1, 0, 0.18, 0.05));
      s = Math.max(s, bar(X, Y, 0.42, -0.02, 0.42, 0.34, 0.035));   /* tassel */
      return Math.max(s, 0.085 - Math.sqrt((X - 0.42) * (X - 0.42) + (Y - 0.4) * (Y - 0.4)));
    }),
    gamepad: icon(function (X, Y) {                      /* game backends */
      var s = box(X, Y, 0.5, 0.24, 0, 0.02);
      s = Math.max(s, ring(X, Y, -0.34, 0.12, 0.2, 0.2) > 0 ? 0.2 - Math.hypot(X + 0.34, Y - 0.12) : -1);
      s = Math.max(s, 0.2 - Math.hypot(X - 0.34, Y - 0.12));
      if (s > 0.06) {
        if ((Math.abs(X + 0.28) < 0.12 && Math.abs(Y) < 0.035) || (Math.abs(X + 0.28) < 0.035 && Math.abs(Y) < 0.12)) return 0.02;
        if (Math.hypot(X - 0.22, Y + 0.04) < 0.05 || Math.hypot(X - 0.34, Y - 0.08) < 0.05) return 0.02;
      }
      return s;
    }),
    terminal: icon(function (X, Y) {                     /* dev & staging */
      var s = box(X, Y, 0.52, 0.4);
      if (s > 0.06) {
        if (Math.abs(Y + 0.29) < 0.03) return 0.02;
        if (bar(X, Y, -0.32, -0.12, -0.14, 0.02, 0.045) > 0 || bar(X, Y, -0.14, 0.02, -0.32, 0.16, 0.045) > 0) return 0.02;
        if (Math.abs(Y - 0.2) < 0.035 && X > -0.04 && X < 0.24) return 0.02;
      }
      return s;
    }),
    folder: icon(function (X, Y) {                       /* nextcloud / files */
      var s = box(X, Y, 0.5, 0.3, 0, 0.1);
      return Math.max(s, box(X, Y, 0.2, 0.08, -0.3, -0.24));
    }),
    archive: icon(function (X, Y) {                      /* cold data */
      var s = box(X, Y, 0.54, 0.1, 0, -0.34);
      s = Math.max(s, box(X, Y, 0.46, 0.3, 0, 0.12));
      if (s > 0.06 && Y > -0.12 && Math.abs(Y) < 0.08 && Math.abs(X) < 0.16) return 0.02;
      return s;
    }),
    bucket: icon(function (X, Y) {                       /* s3 object storage */
      var w = 0.46 - (Y + 0.3) * 0.18;
      var s = Y > -0.3 && Y < 0.44 ? Math.min(w - Math.abs(X), 0.44 - Y, Y + 0.3) : -1;
      s = Math.max(s, ell(X, Y, -0.3, 0.46, 0.12, 0.05));
      if (s > 0.06 && Math.abs(Y - 0.1) < 0.03) return 0.02;
      return s;
    }),
    download: icon(function (X, Y) {                     /* seedbox */
      var s = bar(X, Y, 0, -0.5, 0, 0.08, 0.055);
      s = Math.max(s, bar(X, Y, -0.22, -0.12, 0, 0.1, 0.055));
      s = Math.max(s, bar(X, Y, 0.22, -0.12, 0, 0.1, 0.055));
      s = Math.max(s, bar(X, Y, -0.48, 0.2, -0.48, 0.44, 0.05));
      s = Math.max(s, bar(X, Y, 0.48, 0.2, 0.48, 0.44, 0.05));
      return Math.max(s, bar(X, Y, -0.48, 0.44, 0.48, 0.44, 0.05));
    }),
    braces: icon(function (X, Y) {                       /* apis */
      var s = -1, i;
      for (i = -1; i <= 1; i += 2) {
        s = Math.max(s, bar(X, Y, 0.34 * i, -0.46, 0.22 * i, -0.4, 0.045));
        s = Math.max(s, bar(X, Y, 0.22 * i, -0.4, 0.22 * i, -0.08, 0.045));
        s = Math.max(s, bar(X, Y, 0.22 * i, -0.08, 0.1 * i, 0, 0.045));
        s = Math.max(s, bar(X, Y, 0.1 * i, 0, 0.22 * i, 0.08, 0.045));
        s = Math.max(s, bar(X, Y, 0.22 * i, 0.08, 0.22 * i, 0.4, 0.045));
        s = Math.max(s, bar(X, Y, 0.22 * i, 0.4, 0.34 * i, 0.46, 0.045));
      }
      return s;
    }),
    chat: icon(function (X, Y) {                         /* bots / chat */
      var s = box(X, Y, 0.5, 0.3, 0, -0.08);
      s = Math.max(s, bar(X, Y, -0.24, 0.2, -0.36, 0.44, 0.055));
      if (s > 0.06 && Math.abs(Y + 0.08) < 0.05) {
        for (var i = -1; i <= 1; i++) if (Math.abs(X - i * 0.2) < 0.05) return 0.02;
      }
      return s;
    }),
    server: icon(function (X, Y) {                       /* databases / hosts */
      var s = -1;
      for (var i = -1; i <= 1; i++) {
        var t = box(X, Y, 0.5, 0.13, 0, i * 0.32);
        if (t > 0.06 && Math.hypot(X - 0.34, Y - i * 0.32) < 0.045) return 0.02;
        if (t > 0.06 && Math.abs(Y - i * 0.32) < 0.03 && X > -0.36 && X < 0.08) return 0.02;
        s = Math.max(s, t);
      }
      return s;
    }),
    calendar: icon(function (X, Y) {                     /* schedules / automation */
      var s = box(X, Y, 0.46, 0.4, 0, 0.06);
      s = Math.max(s, bar(X, Y, -0.22, -0.48, -0.22, -0.3, 0.05));
      s = Math.max(s, bar(X, Y, 0.22, -0.48, 0.22, -0.3, 0.05));
      if (s > 0.06) {
        if (Math.abs(Y + 0.14) < 0.03) return 0.02;
        for (var r = 0; r < 2; r++) for (var c = -1; c <= 1; c++) if (Math.abs(X - c * 0.22) < 0.05 && Math.abs(Y - 0.06 - r * 0.2) < 0.05) return 0.02;
      }
      return s;
    }),
    candles: icon(function (X, Y) {                      /* trading */
      var s = -1, C = [[-0.36, 0.1, 0.14, 0.3], [-0.12, -0.08, 0.16, 0.36], [0.12, 0.04, 0.12, 0.26], [0.36, -0.2, 0.18, 0.4]];
      for (var i = 0; i < C.length; i++) {
        s = Math.max(s, box(X, Y, 0.07, C[i][2], C[i][0], C[i][1]));
        s = Math.max(s, bar(X, Y, C[i][0], C[i][1] - C[i][3], C[i][0], C[i][1] + C[i][3], 0.025));
      }
      return s;
    }),
    wrench: icon(function (X, Y) {                       /* tools / panels */
      var s = bar(X, Y, -0.3, 0.3, 0.14, -0.14, 0.08);
      var r = ring(X, Y, 0.26, -0.26, 0.18, 0.07);
      if (X > 0.3 && Y < -0.22) r = -1;                  /* jaw opening */
      return Math.max(s, r);
    }),
    remote: icon(function (X, Y) {                       /* remote desktop */
      var s = box(X, Y, 0.52, 0.34, 0, -0.08);
      s = Math.max(s, bar(X, Y, -0.2, 0.42, 0.2, 0.42, 0.05));
      if (s > 0.06) {
        if (bar(X, Y, -0.06, -0.2, -0.06, 0.1, 0.035) > 0 || bar(X, Y, -0.06, -0.2, 0.14, 0.0, 0.035) > 0 || bar(X, Y, -0.06, 0.1, 0.02, 0.0, 0.03) > 0) return 0.02;
      }
      return s;
    }),
    monitor: icon(function (X, Y) {                      /* remote desktop */
      var s = box(X, Y, 0.5, 0.34, 0, -0.1);
      s = Math.max(s, bar(X, Y, 0, 0.24, 0, 0.42, 0.05));
      return Math.max(s, bar(X, Y, -0.24, 0.46, 0.24, 0.46, 0.05));
    }),
    clock: icon(function (X, Y) {                        /* always on / 24-7 */
      var s = ring(X, Y, 0, 0, 0.48, 0.055);
      s = Math.max(s, bar(X, Y, 0, 0, 0, -0.28, 0.05));
      return Math.max(s, bar(X, Y, 0, 0, 0.22, 0.1, 0.05));
    }),
    tag: icon(function (X, Y) {                          /* low cost / pricing */
      var s = bar(X, Y, -0.5, -0.3, 0.16, -0.3, 0.048);
      s = Math.max(s, bar(X, Y, -0.5, 0.3, 0.16, 0.3, 0.048));
      s = Math.max(s, bar(X, Y, -0.5, -0.3, -0.5, 0.3, 0.048));
      s = Math.max(s, bar(X, Y, 0.16, -0.3, 0.5, 0, 0.048));
      s = Math.max(s, bar(X, Y, 0.16, 0.3, 0.5, 0, 0.048));
      return Math.max(s, ring(X, Y, -0.28, 0, 0.09, 0.042));
    }),
    film: icon(function (X, Y) {                         /* media libraries */
      var s = box(X, Y, 0.5, 0.36);
      if (s > 0.06) {
        for (var i = -1; i <= 1; i++) {
          if (Math.abs(X - i * 0.3) < 0.06 && Math.abs(Math.abs(Y) - 0.26) < 0.05) return 0.02;
        }
        if (Math.abs(Y) < 0.03) return 0.02;
      }
      return s;
    }),
    branch: icon(function (X, Y) {                       /* subdomains / forks */
      var s = bar(X, Y, -0.3, -0.4, -0.3, 0.4, 0.045);
      s = Math.max(s, bar(X, Y, -0.3, 0, 0.3, 0, 0.045));
      s = Math.max(s, bar(X, Y, 0.3, 0, 0.3, -0.32, 0.045));
      s = Math.max(s, 0.11 - Math.sqrt((X + 0.3) * (X + 0.3) + (Y + 0.4) * (Y + 0.4)));
      s = Math.max(s, 0.11 - Math.sqrt((X + 0.3) * (X + 0.3) + (Y - 0.4) * (Y - 0.4)));
      return Math.max(s, 0.11 - Math.sqrt((X - 0.3) * (X - 0.3) + (Y + 0.32) * (Y + 0.32)));
    }),
    gear: icon(function (X, Y) {                         /* runtime / settings */
      var s = ring(X, Y, 0, 0, 0.34, 0.055);
      for (var i = 0; i < 6; i++) {
        var a2 = i * Math.PI / 3;
        s = Math.max(s, bar(X, Y, Math.cos(a2) * 0.34, Math.sin(a2) * 0.34,
                                  Math.cos(a2) * 0.52, Math.sin(a2) * 0.52, 0.06));
      }
      return s;
    }),
    shieldico: icon(function (X, Y) {                    /* DDoS / protection */
      var s = bar(X, Y, -0.42, -0.42, 0.42, -0.42, 0.05);
      s = Math.max(s, bar(X, Y, -0.42, -0.42, -0.42, 0.06, 0.05));
      s = Math.max(s, bar(X, Y, 0.42, -0.42, 0.42, 0.06, 0.05));
      s = Math.max(s, bar(X, Y, -0.42, 0.06, 0, 0.5, 0.05));
      s = Math.max(s, bar(X, Y, 0.42, 0.06, 0, 0.5, 0.05));
      s = Math.max(s, bar(X, Y, -0.17, -0.04, -0.03, 0.12, 0.05));
      return Math.max(s, bar(X, Y, -0.03, 0.12, 0.2, -0.2, 0.05));
    }),
    key: icon(function (X, Y) {                          /* auth / tokens */
      var s = ring(X, Y, -0.32, 0, 0.2, 0.06);
      s = Math.max(s, bar(X, Y, -0.13, 0, 0.55, 0, 0.055));
      s = Math.max(s, bar(X, Y, 0.32, 0, 0.32, 0.24, 0.05));
      return Math.max(s, bar(X, Y, 0.52, 0, 0.52, 0.2, 0.05));
    }),
    /* CPU chip with pins + bright die (kvm) */
    chip: function (u, v, a) {
      a = a || 1;
      var X = ((u - 0.5) * a) / 0.62, Y = (v - 0.48) / 0.62;
      var pg = Math.round(Y * 4) / 4;
      if (Math.abs(Y) < 0.42 && Math.abs(Y - pg) < 0.05 && Math.abs(X) > 0.53 && Math.abs(X) < 0.7) return 0.85;
      pg = Math.round(X * 4) / 4;
      if (Math.abs(X) < 0.42 && Math.abs(X - pg) < 0.05 && Math.abs(Y) > 0.53 && Math.abs(Y) < 0.7) return 0.85;
      if (Math.abs(X) < 0.2 && Math.abs(Y) < 0.2) return 1;
      return ico(Math.min(0.5 - Math.abs(X), 0.5 - Math.abs(Y)), u, v);
    },
    /* three stacked containers with ribs (lxc) */
    crates: function (u, v, a) {
      a = a || 1;
      var X = ((u - 0.5) * a) / 0.7, Y = (v - 0.5) / 0.7;
      var s = -1, c = [[-0.38, 0.33], [0.38, 0.33], [0, -0.32]];
      for (var i = 0; i < 3; i++) s = Math.max(s, Math.min(0.35 - Math.abs(X - c[i][0]), 0.3 - Math.abs(Y - c[i][1])));
      if (s > 0.045 && Math.abs(Math.sin(X * 14)) > 0.88) return 0.55;
      return ico(s, u, v);
    },
    /* lightning bolt (vds) */
    bolt: function (u, v, a) {
      a = a || 1;
      var X = ((u - 0.5) * a) / 0.75, Y = (v - 0.5) / 0.55;
      var s = -1;
      if (Y > -1 && Y < 0.18) s = 0.26 - Math.abs(X + 0.12 + (Y + 0.4) * 0.38);
      if (Y > -0.18 && Y < 1) s = Math.max(s, 0.26 - Math.abs(X - 0.12 + (Y - 0.4) * 0.38));
      return ico(s, u, v);
    },
    /* four window tiles with perspective, like the Windows flag (windows-server) */
    panes: function (u, v, a) {
      a = a || 1;
      var X = ((u - 0.5) * a) / 0.72, Y = (v - 0.48) / 0.72;
      var Yp = Y / (1 + 0.16 * X);              /* tiles grow slightly towards the right */
      var s = -1;
      for (var i = -1; i <= 1; i += 2) for (var j = -1; j <= 1; j += 2) {
        s = Math.max(s, Math.min(0.22 - Math.abs(X - i * 0.31), 0.22 - Math.abs(Yp - j * 0.31)));
      }
      if (s <= 0) return amb(u, v);
      if (s < 0.05) return 0.97;
      return 0.3 + 0.36 * fbm(u * 16, v * 14);
    },
    /* storage drum with bands (storage-server) */
    drum: function (u, v, a) {
      a = a || 1;
      var X = ((u - 0.5) * a) / 0.62, Y = (v - 0.48) / 0.62;
      var s = Math.min(0.42 - Math.abs(X), 0.55 - Math.abs(Y));
      if (s <= 0) return amb(u, v);
      if (s < 0.045) return 0.97;
      var b = [-0.32, 0.02, 0.36];
      for (var i = 0; i < 3; i++) if (Math.abs(Y - b[i]) < 0.045) return 0.9;
      return 0.28 + 0.38 * fbm(u * 16, v * 14);
    },
    /* browser window with a plain toolbar, no traffic-light dots (webspaces) */
    browser: function (u, v, a) {
      a = a || 1;
      var X = ((u - 0.5) * a) / 0.72, Y = (v - 0.48) / 0.72;
      var s = Math.min(0.62 - Math.abs(X), 0.44 - Math.abs(Y));
      if (s <= 0) return amb(u, v);
      if (s < 0.04) return 0.97;
      if (Y < -0.28) {
        if (Math.abs(Y + 0.28) < 0.02) return 0.9;
        return 0.45 + 0.3 * fbm(u * 20, v * 20);
      }
      return 0.22 + 0.28 * fbm(u * 16, v * 14);
    },
    /* no-code flow: trigger -> condition -> two actions, curved wires (instantbot) */
    flow: function (u, v, a) {
      a = a || 1;
      /* horizontal span clamped: narrow canvases squish, very wide ones don't spread thin */
      var A = Math.min(Math.max(a, 2.6), 3.4);
      var X = ((u - 0.5) * A) / 0.62, Y = (v - 0.5) / 0.62;
      var w = 0.42, h = 0.11, R = 0.05;
      var B = [[0, -0.42], [0, 0], [-0.95, 0.42], [0.95, 0.42]];
      var i, s;
      for (i = 0; i < 4; i++) {
        s = box(X, Y, w, h, B[i][0], B[i][1]);
        if (s > 0) {
          if (s < R) return 0.97;
          var lx = X - (B[i][0] - w), dy = Y - B[i][1];
          if (lx > 0.1 && lx < 0.24 && Math.abs(dy) < 0.05) return 0.85;          /* block icon */
          if (lx > 0.32 && lx < 0.66 && Math.abs(dy + 0.026) < 0.024) return 0.72; /* title */
          if (lx > 0.32 && lx < 0.52 && Math.abs(dy - 0.038) < 0.018) return 0.42; /* subtitle */
          return 0.14 + 0.18 * fbm(u * 16, v * 14);
        }
      }
      var P = [[0, -0.31], [0, -0.11], [-0.18, 0.11], [0.18, 0.11], [-0.95, 0.31], [0.95, 0.31]];
      for (i = 0; i < P.length; i++) {
        var px = X - P[i][0], py = Y - P[i][1];
        if (px * px + py * py < 0.0028) return 1;
      }
      s = bar(X, Y, 0, -0.31, 0, -0.11, 0.055);
      for (i = -1; i <= 1; i += 2) {
        var x0 = 0.18 * i, y0 = 0.11, x3 = 0.95 * i, y3 = 0.31, qx = x0, qy = y0;
        for (var k = 1; k <= 12; k++) {
          var t = k / 12, m = 1 - t;
          var nx = m * m * m * x0 + 3 * m * m * t * x0 + 3 * m * t * t * x3 + t * t * t * x3;
          var ny = m * m * m * y0 + 3 * m * m * t * (y0 + 0.2) + 3 * m * t * t * (y3 - 0.2) + t * t * t * y3;
          s = Math.max(s, bar(X, Y, qx, qy, nx, ny, 0.02));
          qx = nx; qy = ny;
        }
      }
      if (s > 0) return 0.62;
      return amb(u, v);
    },
    /* robot head: antenna, eyes, mouth (discord-bots) */
    bot: function (u, v, a) {
      a = a || 1;
      var X = ((u - 0.5) * a) / 0.66, Y = (v - 0.52) / 0.66;
      if (Math.abs(X) < 0.03 && Y > -0.76 && Y < -0.38) return 0.9;
      var dx = X, dy = Y + 0.8;
      if (dx * dx + dy * dy < 0.005) return 1;
      var s = Math.min(0.5 - Math.abs(X), 0.36 - Math.abs(Y - 0.02));
      if (s <= 0) return amb(u, v);
      if (s < 0.045) return 0.97;
      var e1 = (X + 0.2) * (X + 0.2) + (Y + 0.03) * (Y + 0.03);
      var e2 = (X - 0.2) * (X - 0.2) + (Y + 0.03) * (Y + 0.03);
      if (e1 < 0.008 || e2 < 0.008) return 1;
      if (Math.abs(Y - 0.2) < 0.028 && Math.abs(X) < 0.24) return 0.9;
      return 0.26 + 0.32 * fbm(u * 16, v * 14);
    },
    /* wireframe globe (datacenter) */
    globe: function (u, v, a) {
      a = a || 1;
      var X = ((u - 0.5) * a) / 0.62, Y = (v - 0.48) / 0.62;
      var r = Math.sqrt(X * X + Y * Y);
      if (r > 0.55) return amb(u, v);
      if (r > 0.5) return 0.97;
      var cv = Math.sqrt(Math.max(0, 1 - (Y / 0.55) * (Y / 0.55)));
      var i;
      var m = [-0.55, 0, 0.55];
      for (i = 0; i < 3; i++) if (Math.abs(X - m[i] * 0.55 * cv) < 0.03) return 0.85;
      var l = [-0.26, 0, 0.26];
      for (i = 0; i < 3; i++) if (Math.abs(Y - l[i]) < 0.028) return 0.85;
      return 0.18 + 0.28 * fbm(u * 14, v * 12);
    },
    /* speech bubble with typing dots (contact) */
    bubble: function (u, v, a) {
      a = a || 1;
      var X = ((u - 0.5) * a) / 0.68, Y = (v - 0.48) / 0.68;
      if (X > -0.3 && X < -0.05 && Y > 0.25 && Y < 0.5 && X > -0.3 + (Y - 0.25) * 0.55) return 0.8;
      var s = Math.min(0.55 - Math.abs(X), 0.34 - Math.abs(Y + 0.08));
      if (s <= 0) return amb(u, v);
      if (s < 0.045) return 0.97;
      for (var i = -1; i <= 1; i++) {
        var dx = X - i * 0.22, dy = Y + 0.08;
        if (dx * dx + dy * dy < 0.006) return 1;
      }
      return 0.24 + 0.28 * fbm(u * 16, v * 14);
    },
    /* question mark (faq) */
    qmark: function (u, v, a) {
      a = a || 1;
      var X = ((u - 0.5) * a) / 0.7, Y = (v - 0.5) / 0.7;
      var dx = X, dy = Y - 0.52;
      if (dx * dx + dy * dy < 0.009) return 1;
      var s = -1;
      var d = Math.abs(Math.sqrt(X * X + (Y + 0.28) * (Y + 0.28)) - 0.3);
      if (!(X < 0 && Y > -0.25)) s = 0.1 - d;
      if (Math.abs(X) < 0.09 && Y > -0.02 && Y < 0.3) s = Math.max(s, 0.05);
      return ico(s, u, v);
    },
    /* </> code brackets (developers) */
    code: function (u, v, a) {
      a = a || 1;
      var X = ((u - 0.5) * a) / 0.8, Y = (v - 0.5) / 0.6;
      var s = -1;
      if (Math.abs(Y) < 0.42) {
        s = Math.max(s, 0.08 - Math.abs((X + 0.6) - Math.abs(Y) * 0.85));
        s = Math.max(s, 0.08 - Math.abs((0.6 - X) - Math.abs(Y) * 0.85));
      }
      if (Math.abs(Y) < 0.5) s = Math.max(s, 0.07 - Math.abs(X + Y * 0.35));
      return ico(s, u, v);
    },
    /* two linked rings (partners) */
    rings: function (u, v, a) {
      a = a || 1;
      var X = ((u - 0.5) * a) / 0.66, Y = (v - 0.48) / 0.66;
      var r1 = Math.abs(Math.sqrt((X + 0.26) * (X + 0.26) + Y * Y) - 0.36);
      var r2 = Math.abs(Math.sqrt((X - 0.26) * (X - 0.26) + Y * Y) - 0.36);
      return ico(0.09 - Math.min(r1, r2), u, v);
    },
    /* rolling dotted terrain (hero) */
    terrain: function (u, v) {
      var ridge = 0.4 + 0.3 * fbm(u * 3.2, 7.7) - 0.1 * Math.sin(u * 9);
      if (v < ridge) return 0;
      var depth = (v - ridge) / (1 - ridge);
      return clamp01(0.25 + depth * 1.5) * (0.45 + 0.75 * fbm(u * 14, v * 10));
    },
    /* DDoS shield: aspect-corrected so the silhouette keeps its proportions
       on any canvas. Flat top, straight sides, tapered tip, bright rim,
       bolt emblem in the middle. */
    shield: function (u, v, a, c) {
      a = a || 1; c = c || 0.025;
      /* coords in height units, centered on the shield */
      var x = ((u - 0.5) * a) / 0.36;      /* half-width = 0.36 * H */
      var y = (v - 0.46) / 0.4;            /* half-height = 0.4 * H; y: -1 top .. 1 tip */
      var w = -1;
      if (y >= -1 && y <= 1) {
        if (y < -0.85) w = Math.sqrt(clamp01((y + 1) / 0.15));   /* rounded top corners */
        else if (y < 0.1) w = 1;
        else w = 1 - Math.pow((y - 0.1) / 0.9, 1.5);
      }
      var edge = (w - Math.abs(x)) * 0.36; /* back to height units for even rim */
      var ground = v > 0.84 ? fbm(u * 26, v * 7) * 0.3 : 0;
      var field = fbm(u * 10, v * 10) * 0.08;
      if (edge <= 0) return Math.max(field, ground);
      if (edge < 0.035) return 0.97;                      /* bright rim */
      if (edge < 0.065) return 0.12;                      /* dark inset ring */
      /* the InstantNode mark as the emblem; c = one cell in height units, so
         the thin speed spikes still land on a row of glyphs. Under ~44 rows
         the mark turns to mush, so coarse shields keep the plain fill. */
      if (c > 1 / 44) return 0.28 + 0.38 * fbm(u * 16, v * 14);
      var m = logoSd(((u - 0.5) * a) / 0.145, (v - 0.41) / 0.145) * 0.145;
      if (m > -c * 0.5) return 0.6 + 0.4 * clamp01(0.5 + m / c);
      if (m > -c * 1.5) return 0.07;
      return 0.22 + 0.3 * fbm(u * 16, v * 14);
    },
    /* datacenter aisle: a long row of racks of varying height, each with
       unit slats and glowing status LEDs. Built to fill a wide hero. */
    racks: function (u, v) {
      var GROUND = 0.88;
      var sky = fbm(u * 8, v * 8) * 0.05;
      if (v > GROUND) {                                   /* floor haze */
        var fade = 1 - (v - GROUND) / (1 - GROUND);
        return clamp01(fade) * 0.2 * (0.4 + fbm(u * 26, v * 12));
      }
      if (Math.abs(v - GROUND) < 0.012) return 0.8;       /* floor line */
      var N = 13;
      var i = Math.floor(u * N), f = u * N - i;
      var pad = 0.06;
      var h = 0.42 + hash(i * 1.7, 4.3) * 0.4;            /* rack height */
      var top = GROUND - h;
      if (v < top || f < pad || f > 1 - pad) return sky;
      if (v - top < 0.02) return 0.95;                    /* bright cap */
      if (f < pad + 0.05 || f > 1 - pad - 0.05) return 0.88;    /* side rails */
      var unit = (v - top) * 30, uf = unit - Math.floor(unit);
      if (uf < 0.34) return 0.55 + 0.3 * fbm(u * 30, v * 30);   /* unit slat */
      if (f > pad + 0.08 && f < pad + 0.17 &&
          hash(i, Math.floor(unit)) > 0.55) return 1;           /* status LED */
      return 0.16 + 0.18 * fbm(u * 24, v * 24);
    },
    /* tiny terraria world: starry sky, trees, grass line, dirt/stone
       layers with carved caves and bright ore pockets */
    world: function (u, v, a) {
      a = a || 1;
      var h = 0.38 + 0.1 * fbm(u * 3.1, 4.2) - 0.05 * Math.sin(u * 8);
      if (v < h) {
        /* trees on some columns */
        var k = Math.floor(u * 7);
        if (hash(k, 9.9) > 0.35) {
          var tx = (k + 0.5 + (hash(k, 3.7) - 0.5) * 0.5) / 7;
          var ht = 0.38 + 0.1 * fbm(tx * 3.1, 4.2) - 0.05 * Math.sin(tx * 8);
          var du = (u - tx) * a, dv = v - ht;
          if (Math.abs(du) < 0.035 && dv > -0.12 && dv < 0) return 0.8;        /* trunk */
          var cu = du / 0.1, cv = (dv + 0.16) / 0.08;
          if (cu * cu + cv * cv < 1) return 0.5 + 0.4 * fbm(u * 30, v * 30);   /* canopy */
        }
        /* sparse stars */
        return hash(Math.floor(u * 90), Math.floor(v * 40)) > 0.985 ? 0.35 : 0;
      }
      var d = v - h;
      if (d < 0.035) return 0.95;                                   /* grass line */
      var cave = fbm(u * 5.5, v * 5.5);
      if (d > 0.12 && cave > 0.64) return 0.05;                     /* caves */
      if (d > 0.15 && fbm(u * 12 + 7, v * 12) > 0.72) return 1;     /* ore pockets */
      if (d < 0.28) return 0.3 + 0.35 * fbm(u * 14, v * 11);        /* dirt */
      return 0.45 + 0.4 * fbm(u * 18, v * 15);                      /* stone */
    },
    /* game controller: capsule body + grips, d-pad and buttons (aspect-corrected) */
    controller: function (u, v, a) {
      a = a || 1;
      var x = ((u - 0.5) * a) / 0.62;
      var y = (v - 0.48) / 0.62;
      /* body: capsule along x, plus two grip lobes */
      var cx = Math.max(-0.7, Math.min(0.7, x));
      var s = 0.45 - Math.sqrt((x - cx) * (x - cx) + y * y);
      var g1 = 0.34 - Math.sqrt((x + 0.72) * (x + 0.72) + (y - 0.28) * (y - 0.28));
      var g2 = 0.34 - Math.sqrt((x - 0.72) * (x - 0.72) + (y - 0.28) * (y - 0.28));
      s = Math.max(s, Math.max(g1, g2));
      if (s <= 0) return fbm(u * 10, v * 10) * 0.07;
      if (s < 0.045) return 0.97;                          /* bright rim */
      /* d-pad (left) */
      var px = x + 0.42, py = y + 0.02;
      if ((Math.abs(px) < 0.2 && Math.abs(py) < 0.07) || (Math.abs(px) < 0.07 && Math.abs(py) < 0.2)) return 1;
      /* face buttons (right, diamond of 4) */
      var qx = x - 0.42, qy = y + 0.02;
      var b = [[0, -0.14], [0, 0.14], [-0.14, 0], [0.14, 0]];
      for (var i = 0; i < 4; i++) {
        var dx = qx - b[i][0], dy = qy - b[i][1];
        if (dx * dx + dy * dy < 0.0042) return 1;
      }
      return 0.28 + 0.38 * fbm(u * 16, v * 14);
    },
    /* server importer: arrow dropping into a tray (aspect-corrected) */
    import: function (u, v, a) {
      a = a || 1;
      var x = ((u - 0.5) * a) / 0.85;
      var y = (v - 0.5) / 0.44;            /* -1 top .. 1 bottom */
      var fill = 0.5 + 0.5 * fbm(u * 16, v * 14);
      /* arrow shaft */
      if (Math.abs(x) < 0.16 && y > -0.95 && y < 0.05) return fill;
      /* arrow head pointing down */
      if (y >= 0.05 && y <= 0.5) {
        var hw = 0.48 * (1 - (y - 0.05) / 0.45);
        if (Math.abs(x) < hw) return Math.abs(x) > hw - 0.08 ? 0.95 : fill;
      }
      /* tray: bottom bar + short side walls, open top */
      if (y > 0.78 && y < 0.95 && Math.abs(x) < 0.8) return 0.9;
      if (Math.abs(x) > 0.66 && Math.abs(x) < 0.8 && y > 0.5 && y < 0.95) return 0.9;
      return fbm(u * 10, v * 10) * 0.07;
    },
    /* stacked server rack rising like an arrow (growth) */
    rack: function (u, v) {
      var x = Math.abs(u - 0.5);
      var tiers = [[0.78, 0.34], [0.62, 0.26], [0.46, 0.18], [0.30, 0.10]];
      for (var i = 0; i < tiers.length; i++) {
        if (v > tiers[i][0] - 0.13 && v < tiers[i][0] && x < tiers[i][1]) {
          return 0.5 + 0.5 * fbm(u * 18, v * 18) + (tiers[i][0] - v < 0.02 ? 0.3 : 0);
        }
      }
      return fbm(u * 10, v * 10) * 0.12;
    },
    /* soft wave field (footer / cta) */
    /* customer reviews: a back bubble with lines of text, a front bubble
       carrying a row of five stars, a few sparks around (/reviews hero) */
    reviews: function (u, v, a) {
      a = a || 1;
      var X = (u - 0.5) * a, Y = v - 0.5;
      function rr(cx, cy, hw, hh, r) {                 /* rounded box, + inside */
        var qx = Math.abs(X - cx) - hw + r, qy = Math.abs(Y - cy) - hh + r;
        var o = Math.sqrt(Math.max(qx, 0) * Math.max(qx, 0) + Math.max(qy, 0) * Math.max(qy, 0));
        return r - o - Math.min(Math.max(qx, qy), 0);
      }
      function tri(x0, y0, x1, y1, x2, y2) {           /* + inside, distance to the nearest edge */
        var e = [bar(X, Y, x0, y0, x1, y1, 0), bar(X, Y, x1, y1, x2, y2, 0), bar(X, Y, x2, y2, x0, y0, 0)];
        var d = -Math.max(e[0], e[1], e[2]);
        var c1 = (x1 - x0) * (Y - y0) - (y1 - y0) * (X - x0), c2 = (x2 - x1) * (Y - y1) - (y2 - y1) * (X - x1), c3 = (x0 - x2) * (Y - y2) - (y0 - y2) * (X - x2);
        var inside = (c1 >= 0 && c2 >= 0 && c3 >= 0) || (c1 <= 0 && c2 <= 0 && c3 <= 0);
        return inside ? d : -d;
      }
      function star(cx, cy, R) {                       /* five points, + inside */
        var dx = X - cx, dy = Y - cy;
        if (dx * dx + dy * dy > R * R * 1.2) return -1;
        var p = [], inside = false, best = 1e9, k, i, j;
        for (k = 0; k < 10; k++) {
          var an = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? R * 0.42 : R;
          p.push(cx + Math.cos(an) * r, cy + Math.sin(an) * r);
        }
        for (i = 0, j = 18; i < 20; j = i, i += 2) {
          if ((p[i + 1] > Y) !== (p[j + 1] > Y) && X < (p[j] - p[i]) * (Y - p[i + 1]) / (p[j + 1] - p[i + 1]) + p[i]) inside = !inside;
          best = Math.min(best, -bar(X, Y, p[i], p[i + 1], p[j], p[j + 1], 0));
        }
        return inside ? best : -best;
      }
      var front = Math.max(rr(0.3, 0.1, 0.7, 0.23, 0.12), tri(0.56, 0.32, 0.78, 0.32, 0.88, 0.49));
      if (front > 0) {
        if (front < 0.016) return 0.97;                 /* rim */
        for (var i = 0; i < 5; i++) if (star(0.3 + (i - 2) * 0.255, 0.11, 0.115) > 0) return 0.95;
        return 0.16 + 0.22 * fbm(u * 16, v * 14);
      }
      if (front > -0.035) return 0;                     /* clean gap between the bubbles */
      var back = Math.max(rr(-0.42, -0.14, 0.52, 0.2, 0.11), tri(-0.72, 0.05, -0.54, 0.05, -0.82, 0.24));
      if (back > 0) {
        if (back < 0.016) return 0.72;
        var line = Math.max(bar(X, Y, -0.82, -0.22, -0.14, -0.22, 0.017), bar(X, Y, -0.82, -0.14, -0.26, -0.14, 0.017), bar(X, Y, -0.82, -0.06, -0.44, -0.06, 0.017));
        return line > 0 ? 0.5 : 0.06;
      }
      var sp = [[-1.2, -0.3], [1.22, -0.26], [-1.02, 0.32], [1.16, 0.38], [-0.02, -0.42]];
      for (var j = 0; j < sp.length; j++) if (star(sp[j][0], sp[j][1], 0.04) > 0) return 0.6;
      return amb(u, v);
    },
    wave: function (u, v) {
      var y = 0.42 + 0.18 * Math.sin(u * 6.3) * fbm(u * 2.5, 1.2) + 0.12 * fbm(u * 4.4, 8.8);
      if (v < y) return fbm(u * 9, v * 9) * 0.06;
      return clamp01(0.2 + (v - y) * 2.4) * (0.5 + 0.7 * fbm(u * 12, v * 12));
    },
    /* envelope, flap open (managed email) */
    envelope: function (u, v, a) {
      a = a || 1;
      var X = ((u - 0.5) * a) / 0.72, Y = (v - 0.48) / 0.72;
      var s = Math.min(0.60 - Math.abs(X), 0.40 - Math.abs(Y));
      if (s <= 0) return amb(u, v);
      if (s < 0.04) return 0.97;                       /* body rim */
      /* the flap: two diagonals from the top corners into the centre */
      var f = Math.max(bar(X, Y, -0.60, -0.40, 0, 0.04, 0.032),
                       bar(X, Y, 0.60, -0.40, 0, 0.04, 0.032));
      if (f > 0) return 0.95;
      return 0.22 + 0.28 * fbm(u * 16, v * 14);
    },
    /* three stacked platters (managed databases) */
    dbstack: function (u, v, a) {
      a = a || 1;
      var X = ((u - 0.5) * a) / 0.66, Y = (v - 0.48) / 0.66;
      var w = 0.46;
      /* every disc edge is the lower arc of an ellipse, so the whole body sags
         in the middle - that is what separates a cylinder stack from a box */
      var c = 0.085 * Math.cos((X / w) * 1.45);
      var s = Math.min(w - Math.abs(X), Math.min(Y - (-0.38 + c), (0.38 + c) - Y));
      if (s <= 0) return amb(u, v);
      if (s < 0.04) return 0.97;
      var b = [-0.127, 0.127], i;
      for (i = 0; i < 2; i++) if (Math.abs(Y - (b[i] + c)) < 0.032) return 0.95;
      return 0.24 + 0.3 * fbm(u * 16, v * 14);
    },
    /* instantblock dogfooding: traffic streaks stop at a thin gate, only
       the four rows of the mark's own needles pass through to the mark */
    gate: function (u, v, a, c, cu) {
      a = a || 1; c = c || 0.03;
      var S = 0.36, cx = a - 0.05 - 1.766 * S;
      var X = (u * a - cx) / S, Y = (v - 0.5) / S, cl = c / S;
      var d = logoInk(X, Y, cl, u, v, cu ? cu * a / S : cl);
      if (d >= 0) return d;
      var x = u * a, gx = cx - 1.766 * S - 0.16;
      if (v > 0.08 && v < 0.92) {
        if (Math.abs(x - gx) < c * 0.5) return 0.95;               /* the gate */
        if (Math.abs(x - gx - c) < c * 0.5) return 0.18;           /* its shadow */
      }
      var i, s = 0;
      for (i = 0; i < 4; i++) {
        var ty = 0.5 + LOGO_TIPS[i][1] * S, tx = cx + (LOGO_TIPS[i][0] - cl * 1.5) * S;
        if (Math.abs(v - ty) <= c * 0.5) {
          if (x > gx + c * 1.5 && x < tx) return Math.floor(x / c + 0.01) % 2 ? 0 : 0.5;   /* passed */
          if (x < gx - c && x > 0.03) s = 0.15 + 0.45 * (x / gx);                 /* arriving */
        }
      }
      if (!s) {
        var r = Math.floor(v / c);
        if (v > 0.1 && v < 0.9 && hash(r, 5.5) > 0.62 && x < gx - c * 0.5) {     /* blocked rows */
          var xs = 0.03 + hash(r, 2.9) * gx * 0.6;
          if (x > gx - c * 1.5) s = 0.85;                                         /* impact */
          else if (x > xs) s = 0.16 + 0.5 * (x - xs) / (gx - xs);
        }
      } else if (x < gx * 0.35) s = 0;
      return s || amb(u, v);
    },
    /* glyph pool under a 3D product shot: a flat ellipse, densest in the
       middle with one faint ring, so the render stands on the same glyph
       field as the rest of the page */
    pool: function (u, v) {
      var x = (u - 0.5) * 2, y = (v - 0.5) * 2;
      var r = Math.sqrt(x * x + y * y);
      if (r >= 1) return 0;
      if (Math.abs(r - 0.82) < 0.05) return 0.5;
      return (1 - r * r) * (0.42 + 0.55 * fbm(u * 18, v * 5));
    },
    /* concentric orbit rings with a core (platform) */
    orbit: function (u, v) {
      var x = (u - 0.5) * 2, y = (v - 0.55) * 2.4;
      var r = Math.sqrt(x * x + y * y);
      var ring = Math.abs(Math.sin(r * 9)) < 0.14 && r < 1 ? 0.75 : 0;
      var core = r < 0.16 ? 1 : 0;
      return clamp01(core + ring * (0.4 + 0.6 * fbm(u * 10, v * 10)) + fbm(u * 8, v * 8) * 0.08);
    }
  };

  function renderArt(cv) {
    cv.dataset.drawn = '1';
    var shape = SHAPES[cv.dataset.art] || SHAPES.wave;
    var hotU = parseFloat(cv.dataset.hotx || '0.5');
    var hotV = parseFloat(cv.dataset.hoty || '0.6');
    var rect = cv.getBoundingClientRect();
    /* use the element's real box; the fallbacks only apply pre-layout,
       otherwise small icon canvases get drawn wide and squeezed square */
    var W = (rect.width | 0) || 300;
    var H = (rect.height | 0) || ((W * 0.38) | 0);
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr;
    var ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    var cell = parseFloat(cv.dataset.cell) || (W > 700 ? 11 : 9);
    ctx.font = (cell + 1) + 'px "JetBrains Mono", monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    var cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
    var A = cv._art = { ctx: ctx, W: W, H: H, cell: cell, cols: cols, rows: rows, tint: cv.dataset.tint !== 'off',
                        u: [], v: [], d: [], hu: hotU, hv: hotV, tu: hotU, tv: hotV, hu0: hotU, hv0: hotV };
    for (var gy = 0; gy < rows; gy++) {
      for (var gx = 0; gx < cols; gx++) {
        var u = gx / cols, v = gy / rows;
        var d = clamp01(shape(u, v, W / H, 1 / rows, 1 / cols));
        if (d < 0.06) continue;
        A.u.push(u); A.v.push(v); A.d.push(d);
      }
    }
    paint(A, 0);
    if (!cv.classList.contains('cell-ico')) watch(cv);
  }

  /* t = 0 draws the still picture; later frames let the glyphs shimmer and
     send a blue pulse across the canvas every 9 s */
  function paint(A, t) {
    var ctx = A.ctx, cell = A.cell, n = A.d.length, top = RAMP.length - 1;
    var sweep = t ? (t / 9000 % 1) * 1.8 - 0.4 : -9;
    ctx.clearRect(0, 0, A.W, A.H);
    for (var k = 0; k < n; k++) {
      var u = A.u[k], v = A.v[k], d = A.d[k];
      if (t) d = clamp01(d + (noise(u * A.cols * 0.2 + t * 0.0004, v * A.rows * 0.2 - t * 0.0003) - 0.5) * 0.2);
      var ch = RAMP[Math.min(top, (d * top) | 0)];
      if (ch === ' ') continue;
      var dx = u - A.hu, dy = (v - A.hv) * 1.4;
      var heat = A.tint ? clamp01(1 - Math.sqrt(dx * dx + dy * dy) * 2.6) : 0;
      if (t && A.tint) { var w = (u - sweep) * 10; heat = Math.max(heat, Math.exp(-w * w) * clamp01(d * 1.5) * 0.85); }
      var g = 60 + d * 140;
      /* glow towards the brand blue (#3b82f6) near the hotspot */
      var r0 = mix(g, 59, heat * 0.8);
      var g0 = mix(g, 120 + d * 70, heat * 0.85);
      var b0 = mix(g, 255, heat * 0.9);
      ctx.fillStyle = 'rgb(' + (r0 | 0) + ',' + (g0 | 0) + ',' + (b0 | 0) + ')';
      ctx.fillText(ch, (u * A.cols) * cell + cell / 2, (v * A.rows) * cell + cell / 2);
    }
  }

  /* ---------- living art ----------
     The wide canvases (not the card icons) keep moving while they are on
     screen, ~12 fps: glyph shimmer, the pulse, and the glow drifting towards
     the pointer. Reduced motion keeps the still picture. */
  var calm = !window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var live = [], liveIO, raf = 0, last = 0;
  function watch(cv) {
    if (calm || !('IntersectionObserver' in window)) return;
    if (!liveIO) liveIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var i = live.indexOf(en.target);
        if (en.isIntersecting && i < 0) live.push(en.target);
        if (!en.isIntersecting && i >= 0) live.splice(i, 1);
      });
      if (live.length && !raf) raf = requestAnimationFrame(tick);
    });
    liveIO.observe(cv);
  }
  function tick(now) {
    raf = live.length ? requestAnimationFrame(tick) : 0;
    if (now - last < 80) return;
    last = now;
    live.forEach(function (cv) {
      var A = cv._art;
      A.hu += (A.tu - A.hu) * 0.15; A.hv += (A.tv - A.hv) * 0.15;
      paint(A, now);
    });
  }
  window.addEventListener('pointermove', function (e) {
    live.forEach(function (cv) {
      var A = cv._art, r = cv.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      var on = x >= 0 && x <= 1 && y >= -0.2 && y <= 1.2;
      A.tu = on ? x : A.hu0; A.tv = on ? y : A.hv0;
    });
  }, { passive: true });

  /* product shots sit a little deeper than the page: they trail the scroll by
     a few px, which reads as depth. Measured on the parent so the shift does
     not feed back into itself; reduced motion keeps them still. */
  var shots = document.querySelectorAll('.prod, .cell-shot > img');
  if (!calm && shots.length) {
    var sT = 0;
    var depth = function () {
      sT = 0;
      shots.forEach(function (el) {
        var r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -200 || r.top > innerHeight + 200) return;
        el.style.translate = '0 ' + (((r.top + r.height / 2) / innerHeight - 0.5) * 24).toFixed(1) + 'px';
      });
    };
    window.addEventListener('scroll', function () { if (!sT) sT = requestAnimationFrame(depth); }, { passive: true });
    depth();
  }

  /* ponytail: draw each canvas only once it nears the viewport - drawing all
     of them up front cost ~800ms of blocking main thread on mobile. */
  var artIO;
  function renderAll() {
    var list = document.querySelectorAll('canvas.art');
    if (!('IntersectionObserver' in window)) { list.forEach(renderArt); return; }
    if (artIO) artIO.disconnect();
    artIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        artIO.unobserve(en.target);
        renderArt(en.target);
      });
    }, { rootMargin: '400px 0px' });
    list.forEach(function (cv) { artIO.observe(cv); });
  }

  /* ---------- nav dropdowns ---------- */
  document.querySelectorAll('.drop > button').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var d = btn.parentElement;
      var open = d.hasAttribute('data-open');
      document.querySelectorAll('.drop[data-open]').forEach(function (o) { o.removeAttribute('data-open'); });
      if (!open) d.setAttribute('data-open', '');
      btn.setAttribute('aria-expanded', String(!open));
    });
  });
  document.addEventListener('click', function () {
    document.querySelectorAll('.drop[data-open]').forEach(function (o) {
      o.removeAttribute('data-open');
      var b = o.querySelector('button'); if (b) b.setAttribute('aria-expanded', 'false');
    });
  });

  /* ---------- products mega menu: category panes ----------
     Opening/closing is the shared .drop code above. A click inside the panel
     must not reach the document closer. Panes switch on hover (with a short
     intent delay so a diagonal move towards a card does not flip the pane),
     on click and on arrow keys - not on plain focus, so Tab can walk the
     category list without the pane changing underneath. */
  document.querySelectorAll('.drop.mega').forEach(function (drop) {
    var trigger = drop.querySelector(':scope > button');
    var menu = drop.querySelector('.mega-menu');
    var cats = Array.prototype.slice.call(menu.querySelectorAll('.mm-cat'));
    var panes = menu.querySelectorAll('.mm-pane');
    var timer;
    function show(btn) {
      clearTimeout(timer);
      cats.forEach(function (c) { c.setAttribute('aria-expanded', String(c === btn)); });
      panes.forEach(function (p) { p.hidden = p.id !== btn.getAttribute('aria-controls'); });
    }
    menu.addEventListener('click', function (e) { if (!e.target.closest('a')) e.stopPropagation(); });
    cats.forEach(function (btn) {
      btn.addEventListener('click', function () { show(btn); });
      btn.addEventListener('mouseenter', function () { clearTimeout(timer); timer = setTimeout(function () { show(btn); }, 80); });
      btn.addEventListener('mouseleave', function () { clearTimeout(timer); });
    });
    menu.addEventListener('keydown', function (e) {
      var i = cats.indexOf(document.activeElement);
      if (i < 0) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        var next = cats[(i + (e.key === 'ArrowDown' ? 1 : cats.length - 1)) % cats.length];
        next.focus();
        show(next);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        show(cats[i]);
        var first = document.getElementById(cats[i].getAttribute('aria-controls')).querySelector('a');
        if (first) first.focus();
      }
    });
    // Runs after the shared toggle (same element, registered later): reset on every open.
    trigger.addEventListener('click', function () { if (drop.hasAttribute('data-open')) show(cats[0]); });
  });

  /* Escape closes any open dropdown and hands focus back to its trigger */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.drop[data-open]').forEach(function (o) {
      o.removeAttribute('data-open');
      var b = o.querySelector(':scope > button');
      if (b) { b.setAttribute('aria-expanded', 'false'); if (o.contains(document.activeElement)) b.focus(); }
    });
  });

  /* ---------- mobile nav ---------- */
  var burger = document.querySelector('.burger');
  var mnav = document.querySelector('.m-nav');
  if (burger && mnav) {
    burger.addEventListener('click', function () {
      mnav.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(mnav.classList.contains('open')));
    });
  }

  /* ---------- accordions: animate open/close ----------
     <details> has no native transition. The Web Animations API keeps this on
     one compositor-driven timeline and cleans up after itself; padding has to
     be part of the keyframes or the body jumps by its own padding at frame 0. */
  var noMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!noMotion && document.body.animate) {
    document.querySelectorAll('details').forEach(function (d) {
      var sum = d.querySelector('summary');
      var body = sum && sum.nextElementSibling;
      if (!sum || !body) return;

      function slide(opening) {
        var cs = getComputedStyle(body);
        var pt = cs.paddingTop, pb = cs.paddingBottom;
        var h = body.scrollHeight + 'px';
        var shut = { height: '0px', paddingTop: '0px', paddingBottom: '0px', opacity: 0 };
        var open = { height: h, paddingTop: pt, paddingBottom: pb, opacity: 1 };
        return body.animate([opening ? shut : open, opening ? open : shut], {
          duration: 320,
          easing: 'cubic-bezier(0.33, 1, 0.68, 1)'
        });
      }

      sum.addEventListener('click', function (e) {
        e.preventDefault();
        if (d.dataset.busy) return;
        d.dataset.busy = '1';
        if (d.open) {
          slide(false).onfinish = function () {
            d.open = false;
            delete d.dataset.busy;
          };
        } else {
          d.open = true;
          slide(true).onfinish = function () { delete d.dataset.busy; };
        }
      });
    });
  }

  /* ---------- ticker: duplicate the track so the loop is seamless ---------- */
  document.querySelectorAll('.tick-track').forEach(function (track) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var copy = track.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    while (copy.firstChild) track.appendChild(copy.firstChild);
  });

  /* ---------- scroll reveal ---------- */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.rv').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.rv').forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- render art (once + on resize) ---------- */
  var rT;
  window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(renderAll, 180); });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderAll);
  } else {
    renderAll();
  }

  /* ---------- easter egg ----------
     Konami code on desktop, five taps on the footer logo on touch.
     Opens a glyph "transmission" panel. Nothing here talks to a server. */

  function openSecret() {
    if (document.getElementById('inn-secret')) return;
    var wrap = document.createElement('div');
    wrap.id = 'inn-secret';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-label', 'Hidden transmission');
    wrap.innerHTML =
      '<div class="secret-box">' +
        '<button class="secret-x" type="button" aria-label="Close">&#10005;</button>' +
        '<canvas class="art" data-art="orbit" data-hotx="0.5" data-hoty="0.5" data-cell="4.5" height="240"></canvas>' +
        '<p class="k">Signal acquired</p>' +
        '<h3>You found the hidden node.</h3>' +
        '<p>Nothing here is for sale. Drop the word <b>ORBIT</b> in our Discord and the team will know you went looking.</p>' +
        '<a class="btn btn-light btn-sm" href="https://instantnode.eu/discord" rel="noreferrer" target="_blank">Join the Discord</a>' +
      '</div>';
    document.body.appendChild(wrap);
    renderArt(wrap.querySelector('canvas'));
    requestAnimationFrame(function () { wrap.classList.add('on'); });

    function close() {
      wrap.classList.remove('on');
      setTimeout(function () { wrap.remove(); }, 240);
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    wrap.querySelector('.secret-x').addEventListener('click', close);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
    document.addEventListener('keydown', onKey);
    wrap.querySelector('.secret-x').focus();
  }

  var SEQ = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft',
             'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  var step = 0;
  document.addEventListener('keydown', function (e) {
    var want = SEQ[step];
    var hit = want.length === 1 ? e.key.toLowerCase() === want : e.key === want;
    step = hit ? step + 1 : (e.key === SEQ[0] ? 1 : 0);
    if (step === SEQ.length) { step = 0; openSecret(); }
  });

  var taps = 0, tapT;
  var mark = document.querySelector('.ftr-brand img');
  if (mark) {
    mark.style.cursor = 'default';
    mark.addEventListener('click', function () {
      clearTimeout(tapT);
      tapT = setTimeout(function () { taps = 0; }, 900);
      if (++taps >= 5) { taps = 0; openSecret(); }
    });
  }

  /* a note for anyone who opens the console */
  try {
    console.log('%c InstantNode ', 'background:#3b82f6;color:#060606;font-weight:700;padding:2px 6px;border-radius:4px',
      '\n  Every bit of art on this site is drawn from characters at runtime - no image files.\n' +
      '  Curious how? js/lunaris.js is unminified on purpose.\n' +
      '  There is a secret on this page. The old cheat code still works.\n');
  } catch (e) { /* console may be unavailable */ }
})();

/* Announcement bar: visibility is decided pre-paint by the inline snippet in
   the markup; this only wires the close button and remembers the dismissal.
   ponytail: one delegated listener, no per-page wiring. */
(function () {
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.in-announce__close');
    if (!btn) return;
    var bar = btn.closest('.in-announce');
    if (!bar) return;
    bar.classList.remove('is-open');
    try { localStorage.setItem('in-announce-' + (bar.dataset.key || 'default'), '1'); } catch (e2) {}
  });
})();

/* Auth-aware header + live customer count.
   Both live here because js/app.js, where an earlier attempt at the header sat,
   is not loaded by a single page on the site - it never ran. lunaris.js is on
   every page, so this is the one place that reaches all of them. */
(function () {
  'use strict';

  // The header CTA is `<a class="btn ..." href="/dashboard">Log in</a>`: the
  // href is already right, only the label is wrong for a signed-in visitor.
  // Matching on the text is deliberate - an earlier version selected
  // a[href="/auth/login"], which matches nothing in this markup.
  function markSignedIn() {
    var seen = 0;
    Array.prototype.forEach.call(document.querySelectorAll('a.btn, .m-nav a'), function (a) {
      if ((a.textContent || '').trim() !== 'Log in') return;
      a.setAttribute('href', '/dashboard');
      a.textContent = 'Dashboard';
      seen++;
    });
    return seen;
  }

  function checkSession() {
    if (!window.fetch) return;
    fetch('/api/v1/profile/me', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (r) { if (r.ok) markSignedIn(); })
      .catch(function () { /* signed out, or the API is down: leave "Log in" */ });
  }

  function setAll(sel, txt) {
    Array.prototype.forEach.call(document.querySelectorAll(sel), function (el) { el.textContent = txt; });
  }

  // "Rated 4.8 out of 5 in 12 customer reviews": our own reviews (/reviews),
  // shown from the first one on. Worded here per language because the numbers
  // arrive after inn-lang has taken its snapshot of the page copy.
  var REVIEW_LINE = {
    en: function (a, n) { return 'Rated ' + a + ' out of 5 in ' + n + (n === 1 ? ' customer review' : ' customer reviews') },
    de: function (a, n) { return 'Mit ' + a + ' von 5 bewertet, aus ' + n + (n === 1 ? ' Kundenbewertung' : ' Kundenbewertungen') },
    fr: function (a, n) { return 'Noté ' + a + ' sur 5 dans ' + n + ' avis clients' },
    es: function (a, n) { return 'Valorado con ' + a + ' de 5 en ' + n + (n === 1 ? ' opinión de cliente' : ' opiniones de clientes') },
  };
  var reviewSummary = null;
  function renderReviewLines() {
    var s = reviewSummary;
    if (!s || !(s.count > 0) || !(s.average > 0)) return;
    var c = window.innLang && window.innLang.current ? window.innLang.current() : 'en';
    var f = REVIEW_LINE[c] || REVIEW_LINE.en;
    var avg = s.average.toFixed(1);
    var text = f(c === 'en' ? avg : avg.replace('.', ','), s.count);
    Array.prototype.forEach.call(document.querySelectorAll('.js-review-line, .js-review-pill'), function (el) {
      var t = el.querySelector('[data-review-text]');
      if (t) t.textContent = text;
      el.hidden = false;
    });
  }
  document.addEventListener('inn:lang', renderReviewLines);

  // One request feeds the live counts on the marketing pages. Each value is
  // only written when the API actually returned it, so a partial or failed
  // response leaves the static number in the markup standing.
  function fillPublicInfo() {
    var wanted = document.querySelector('.js-customer-count, .js-user-count, .js-support-median, .js-uptime, .js-countries, .js-review-line, .js-review-pill');
    if (!wanted || !window.fetch) return;
    fetch('/api/v1/public/info', { cache: 'no-store', headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && d.reviews) { reviewSummary = d.reviews; renderReviewLines(); }
        var st = d && d.stats;
        if (!st) return;
        // Floored to the nearest 100, so "X,X00+" is never a claim for more
        // than there are. Customers = accounts that paid at least once.
        [['.js-customer-count', st.totalCustomers], ['.js-user-count', st.registeredUsers]].forEach(function (f) {
          var n = Number(f[1]);
          if (n >= 100) setAll(f[0], (Math.floor(n / 100) * 100).toLocaleString('en-US') + '+');
        });
        // Support median rounded up and uptime floored by the API: the page
        // never shows us faster or more available than measured.
        var m = st.support && Number(st.support.medianMinutes);
        if (m > 0) setAll('.js-support-median', m < 60 ? Math.ceil(m) + ' min' : Math.ceil(m / 6) / 10 + ' h');
        if (Number(st.uptime90) > 0) setAll('.js-uptime', Number(st.uptime90).toFixed(2) + '%');
        if (Number(st.countries) >= 10) setAll('.js-countries', Math.floor(st.countries / 10) * 10 + '+');
      })
      .catch(function () { /* the numbers in the markup stay */ });
  }

  function checkMaintenance() {
    if (!window.fetch) return;
    fetch('/api/v1/public/info', { cache: 'no-store', headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var on = d && d.maintenance && d.maintenance.active;
        var el = document.getElementById('in-maint-banner');
        if (!on) { if (el && el.parentNode) el.parentNode.removeChild(el); return; }
        if (!document.getElementById('in-maint-style')) {
          var st = document.createElement('style');
          st.id = 'in-maint-style';
          st.textContent = '#in-maint-banner{display:flex;align-items:center;justify-content:center;gap:10px;padding:10px 16px;background:#3a2f05;border-bottom:1px solid #b8860b;color:#ffe8a3;font:600 13.5px/1.35 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-align:center}#in-maint-banner .imd-dot{width:9px;height:9px;border-radius:50%;background:#ffcc33;animation:imd-pulse 1.3s ease-out infinite;flex:none}@keyframes imd-pulse{0%{box-shadow:0 0 0 0 rgba(255,204,51,.6)}70%{box-shadow:0 0 0 8px rgba(255,204,51,0)}100%{box-shadow:0 0 0 0 rgba(255,204,51,0)}}@media (prefers-reduced-motion:reduce){#in-maint-banner .imd-dot{animation:none}}';
          document.head.appendChild(st);
        }
        if (!el) {
          el = document.createElement('div');
          el.id = 'in-maint-banner';
          document.body.insertBefore(el, document.body.firstChild);
        }
        var raw = (d.maintenance.message && String(d.maintenance.message).trim()) || 'We are performing scheduled maintenance. Some services may be unavailable.';
        var safe = raw.replace(/[<>&]/g, function (c) { return c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&amp;'; });
        el.innerHTML = '<span class="imd-dot"></span><span>Current maintenance - ' + safe + '</span>';
      })
      .catch(function () {});
  }
  function boot() { checkSession(); fillPublicInfo(); checkMaintenance(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/* ---------- Ping tooltips ----------
   Any [data-ping][title] element shows its title in a small bubble with Ping's
   blinking head. The title stays the source of truth, so inn-lang.js keeps
   translating it; it is only lifted off while the bubble shows (no native tip on top). */
(function () {
  var tip, txt, cur;
  function make() {
    tip = document.createElement('div');
    tip.className = 'ping-tip';
    tip.setAttribute('role', 'tooltip');
    tip.innerHTML = '<span class="ping-head" aria-hidden="true"><img src="/img/ping/ping-head.webp" width="256" height="285" alt="" />' +
      '<img src="/img/ping/ping-head-blink.webp" width="256" height="285" alt="" /></span><span></span>';
    txt = tip.lastChild;
    document.body.appendChild(tip);
  }
  function show(el) {
    var t = el.getAttribute('title');
    if (!t) return;
    if (!tip) make();
    cur = el;
    el.setAttribute('data-ping-title', t);
    el.removeAttribute('title');
    txt.textContent = t;
    var r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    var y = r.top - h - 10;
    tip.style.left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8) + 'px';
    tip.style.top = (y < 8 ? r.bottom + 10 : y) + 'px';
    tip.classList.add('is-on');
  }
  function hide() {
    if (!cur) return;
    cur.setAttribute('title', cur.getAttribute('data-ping-title'));
    cur.removeAttribute('data-ping-title');
    cur = null;
    tip.classList.remove('is-on');
  }
  function pick(e) { return e.target.closest ? e.target.closest('[data-ping]') : null; }
  document.addEventListener('pointerover', function (e) { var el = pick(e); if (el !== cur) { hide(); if (el) show(el); } });
  document.addEventListener('focusin', function (e) { var el = pick(e); if (el !== cur) { hide(); if (el) show(el); } });
  document.addEventListener('focusout', hide);
  addEventListener('scroll', hide, { passive: true });
})();
