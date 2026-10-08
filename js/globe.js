/* =====================================================================
   Self-contained 3D globe via Three.js (single instance, no globe.gl).
   Clean "dotted earth" look à la globe.gl hexed-polygons: dark sphere,
   continents as glowing dot constellations, datacenter nodes + animated
   great-circle arcs. Violet/cyan palette. Logs each step to the console.
   ===================================================================== */
(function () {
  'use strict';
  var L = function (m) { try { console.log('[globe] ' + m); } catch (e) {} };
  var el = document.getElementById('ping-globe');
  if (!el) { L('no #ping-globe element - aborting'); return; }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.onload = function () { L('loaded ' + src); resolve(); };
      s.onerror = function () { L('FAILED to load ' + src); reject(new Error(src)); };
      document.head.appendChild(s);
    });
  }

  var THREE_URL = 'https://unpkg.com/three@0.149.0/build/three.min.js';
  loadScript(THREE_URL).then(init).catch(function (err) { L('abort: ' + (err && err.message)); });

  // continent outlines [lat, lng]
  var CONTINENTS = [
    [[72,-156],[70,-130],[60,-140],[55,-130],[48,-125],[40,-124],[34,-118],[28,-115],[23,-110],[20,-105],[16,-95],[15,-90],[18,-88],[21,-87],[26,-80],[30,-81],[35,-76],[40,-70],[44,-64],[47,-53],[55,-56],[60,-64],[62,-78],[66,-84],[70,-95],[71,-118],[72,-140],[72,-156]],
    [[12,-72],[10,-62],[5,-52],[-5,-35],[-10,-36],[-23,-42],[-34,-54],[-52,-69],[-50,-74],[-41,-73],[-33,-71],[-18,-71],[-5,-81],[2,-79],[8,-77],[12,-72]],
    [[37,10],[35,11],[32,16],[31,25],[28,34],[15,40],[12,43],[11,51],[-2,42],[-12,40],[-25,33],[-35,20],[-34,18],[-28,16],[-18,12],[-5,9],[4,6],[5,-3],[10,-2],[15,-17],[21,-17],[28,-13],[30,-9],[35,-6],[37,-5],[37,10]],
    [[71,28],[69,33],[60,30],[56,21],[54,13],[55,8],[58,6],[51,2],[49,-5],[44,-9],[40,-9],[36,-6],[37,0],[43,3],[44,8],[46,12],[41,15],[40,18],[45,13],[42,28],[47,39],[60,40],[66,45],[70,40],[71,28]],
    [[77,40],[75,60],[73,80],[73,105],[73,130],[73,155],[68,170],[60,165],[54,160],[48,142],[42,131],[38,125],[35,127],[32,121],[22,114],[10,105],[8,103],[12,101],[6,105],[2,105],[8,115],[-6,120],[-8,115],[5,97],[8,80],[13,80],[21,90],[22,72],[25,60],[28,52],[37,48],[41,42],[45,40],[50,50],[60,60],[70,80],[77,40]],
    [[-11,142],[-14,143],[-18,146],[-25,153],[-37,149],[-39,146],[-35,138],[-32,115],[-22,114],[-15,124],[-12,131],[-11,142]]
  ];

  // dense coastline point cloud
  var COAST = [];
  CONTINENTS.forEach(function (poly) {
    for (var i = 0; i < poly.length - 1; i++) {
      var a = poly[i], b = poly[i + 1];
      var dlat = b[0] - a[0], dlng = b[1] - a[1];
      var dist = Math.sqrt(dlat * dlat + dlng * dlng);
      var steps = Math.max(2, Math.round(dist / 1.8));
      for (var s = 0; s <= steps; s++) {
        var u = s / steps;
        COAST.push([a[0] + dlat * u, a[1] + dlng * u]);
      }
    }
  });

  function latLng(lat, lng, r) {
    var phi = (90 - lat) * Math.PI / 180;
    var theta = (lng + 180) * Math.PI / 180;
    return {
      x: -r * Math.sin(phi) * Math.cos(theta),
      y: r * Math.cos(phi),
      z: r * Math.sin(phi) * Math.sin(theta)
    };
  }
  function arcPoint(a, b, t, r, lift) {
    var x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t, z = a.z + (b.z - a.z) * t;
    var len = Math.sqrt(x * x + y * y + z * z) || 1;
    var m = (r + lift * Math.sin(Math.PI * t)) / len;
    return { x: x * m, y: y * m, z: z * m };
  }

  function init() {
    var THREE = window.THREE;
    if (!THREE) { L('THREE not on window - abort'); return; }
    try {
      var w = Math.max(280, el.clientWidth);
      var R = 100;

      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(32, 1, 0.1, 1000);
      camera.position.set(0, 0, 480);

      var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, w);
      renderer.setClearColor(0x000000, 0);
      el.appendChild(renderer.domElement);

      var root = new THREE.Group();
      root.rotation.z = -0.38;
      scene.add(root);

      var globeGroup = new THREE.Group();
      root.add(globeGroup);

      // dark ocean sphere
      var sphere = new THREE.Mesh(
        new THREE.SphereGeometry(R, 64, 64),
        new THREE.MeshPhongMaterial({ color: 0x0b0f1f, shininess: 4, transparent: true, opacity: 0.92 })
      );
      globeGroup.add(sphere);

      // continents as glowing dot cloud
      var coastVerts = [];
      COAST.forEach(function (c) {
        var p = latLng(c[0], c[1], R + 0.3);
        coastVerts.push(p.x, p.y, p.z);
      });
      var coastGeo = new THREE.BufferGeometry();
      coastGeo.setAttribute('position', new THREE.Float32BufferAttribute(coastVerts, 3));
      var coastMat = new THREE.PointsMaterial({
        color: 0x9bb4f0, size: 2.4, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false
      });
      globeGroup.add(new THREE.Points(coastGeo, coastMat));

      // atmosphere layers removed (no outer ring)

      // soft radial glow behind the globe (brand colour aura, doesn't rotate)
      var gc = document.createElement('canvas');
      gc.width = gc.height = 256;
      var gx = gc.getContext('2d');
      var grd = gx.createRadialGradient(128, 128, 0, 128, 128, 128);
      grd.addColorStop(0, 'rgba(179,166,238,0.65)');
      grd.addColorStop(0.5, 'rgba(179,166,238,0.38)');
      grd.addColorStop(0.8, 'rgba(179,166,238,0.2)');
      grd.addColorStop(1, 'rgba(179,166,238,0)');
      gx.fillStyle = grd; gx.fillRect(0, 0, 256, 256);
      var glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), transparent: true, depthWrite: false }));
      glow.scale.set(R * 2.6, R * 2.6, 1);
      glow.position.z = -20;
      root.add(glow);

      // lighting
      scene.add(new THREE.AmbientLight(0x445, 1.3));
      var sun = new THREE.DirectionalLight(0xffffff, 0.9);
      sun.position.set(-1, 0.5, 0.9);
      scene.add(sun);

      // datacenter nodes
      var CITIES = [
        [40.71,-74.0],[34.05,-118.24],[51.5,-0.12],[50.11,8.68],[52.37,4.9],[1.35,103.82],
        [35.68,139.69],[-33.87,151.21],[-23.55,-46.63],[19.08,72.88],[25.2,55.27],[-26.2,28.05]
      ];
      var nodes = CITIES.map(function (c) { return latLng(c[0], c[1], R); });
      nodes.forEach(function (n) {
        var dot = new THREE.Mesh(new THREE.SphereGeometry(1.4, 10, 10), new THREE.MeshBasicMaterial({ color: 0xefeaff }));
        dot.position.set(n.x, n.y, n.z); globeGroup.add(dot);
        var halo = new THREE.Mesh(new THREE.SphereGeometry(3, 10, 10), new THREE.MeshBasicMaterial({ color: 0xb3a6ee, transparent: true, opacity: 0.35, depthWrite: false }));
        halo.position.set(n.x, n.y, n.z); globeGroup.add(halo);
      });

      // arcs
      var LINKS = [[0,1],[0,2],[2,3],[3,4],[1,5],[5,6],[6,7],[5,7],[2,8],[9,5],[10,5],[10,11],[8,11],[0,8],[3,9],[2,5]];
      var ARC_COLORS = [0xb3a6ee, 0x8ec5ad, 0x9bb4f0, 0xc7bfff];
      var arcs = [];
      LINKS.forEach(function (pair, i) {
        var a = nodes[pair[0]], b = nodes[pair[1]], col = ARC_COLORS[i % ARC_COLORS.length];
        var pts = [];
        for (var k = 0; k <= 40; k++) pts.push(arcPoint(a, b, k / 40, R, 24));
        var line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(pts.map(function (p) { return new THREE.Vector3(p.x, p.y, p.z); })),
          new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.3 })
        );
        globeGroup.add(line);
        var pulse = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.95 }));
        globeGroup.add(pulse);
        arcs.push({ a: a, b: b, pulse: pulse, head: Math.random(), speed: 0.0008 + Math.random() * 0.0007 });
      });

      function animate() {
        requestAnimationFrame(animate);
        globeGroup.rotation.y += 0.0016;
        for (var i = 0; i < arcs.length; i++) {
          var A = arcs[i];
          A.head = (A.head + A.speed) % 1;
          var p = arcPoint(A.a, A.b, A.head, R, 24);
          A.pulse.position.set(p.x, p.y, p.z);
          A.pulse.material.opacity = 0.95 * Math.sin(Math.PI * A.head);
        }
        renderer.render(scene, camera);
      }
      animate();

      function resize() {
        var nw = Math.max(280, el.clientWidth);
        renderer.setSize(nw, nw);
      }
      window.addEventListener('resize', resize, { passive: true });

      L('globe built OK');
    } catch (e) {
      L('ERROR building globe: ' + (e && e.message) + (e && e.stack ? '\n' + e.stack : ''));
    }
  }
})();
