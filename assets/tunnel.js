/* Machwake — test section.
 *
 * Instrumentation, not decoration. Three things happen on this layer, and each
 * one is the product stated in motion rather than in words:
 *
 *   run     Every so often a single article crosses the tunnel. One at a time;
 *           between runs the tunnel is empty.
 *   shock   Sweep the pointer far enough in one direction and it goes
 *           supersonic. Fidget with it and nothing happens at all.
 *   stamp   A click leaves a permanent node on the lattice with an id beside
 *           it. It is the only thing on this page that survives the gesture.
 *
 * The first two work one way. A moving object emits pressure waves into the
 * world and leaves them there; each wave expands from where it was emitted, at
 * the page's own speed of sound, and dissipates in place. Nothing is drawn
 * relative to the object, so nothing about it is rigid — and the Mach cone is
 * not drawn at all. It is the envelope of the waves the object is outrunning.
 * Below M = 1 the waves stay nested and no envelope exists; above it, one
 * forms on its own. The transition needs no separate effect: it is the only
 * thing that is happening.
 *
 * The pointer does not emit directly. It tows a body with mass, and that body
 * is what emits. A body has to be dragged one way for a while before it can
 * outrun its own sound, so a flick or a tight circle stays quiet where a
 * committed sweep does not. Machine speed is something you commit to.
 *
 * This layer also draws the lattice, which the stylesheet otherwise paints as
 * a pair of repeating gradients. That is deliberate and not a duplicate: a CSS
 * gradient measures its stripes from the centre of the box, along a line whose
 * length depends on the box, so its intersections are not addressable from
 * script. Owning the lattice here makes a stamp land on a real crossing by
 * construction. The stylesheet keeps its gradients as the no-script and
 * reduced-motion fallback; this file switches them off when it takes over.
 *
 * Everything below is in document coordinates, so the layer scrolls with the
 * page exactly as the background did.
 *
 * The rules that keep this from becoming a screensaver: one ink, hairlines
 * only, no blur and no glow, nothing moves while the visitor is still, and the
 * whole layer sits under the type and never over it.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('tunnel');
  if (!canvas || !canvas.getContext) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var q = new URLSearchParams(location.search);
  var CFG = {
    runs:   q.get('runs')   !== '0',
    shock:  q.get('shock')  !== '0',
    stamps: q.get('stamps') !== '0',
    ids:    q.get('ids')    !== '0'
  };

  var ctx = canvas.getContext('2d');
  document.documentElement.classList.add('tunnel-on');

  var CHALK  = '230,237,243';
  var SODIUM = '255,174,26';

  /* The lattice: horizontal lines every 32px, and a second family raked to the
     mark's own 16°. U is the raked family's normal, so its lines are exactly
     the points where p·U is a multiple of the module. */
  var MODULE = 32;
  var MAJOR  = 128;
  var SHEAR  = 16 * Math.PI / 180;
  var U = { x: Math.cos(SHEAR), y: Math.sin(SHEAR) };
  var D = { x: -U.y, y: U.x };            // along the raked lines
  var A_MINOR = 0.05, A_MAJOR = 0.085;

  /* The page's speed of sound. Everything is measured against it. */
  var C_SOUND   = 0.85;           // px/ms
  var WAVE_LIFE = 170;            // ms until a pressure wave has dissipated
  var WAVE_CAP  = 220;

  var RUN_GAP   = [9000, 17000];  // ms between articles
  var RUN_SPEED = 1.25;           // px/ms — about M 1.5
  var RUN_PATH  = 190;            // ms of visible path behind the article

  /* Towed-body constants. K is how hard the body is pulled toward the pointer,
     DAMP how much it resists; together they are very nearly critically damped,
     so the body tracks without ringing. */
  var K = 0.0009, DAMP = 0.05;
  /* Crossing M 1 is one event, not a flicker. Going supersonic takes M_UP and
     a moment to hold it; coming back subsonic takes a drop clear of the
     threshold, held long enough to be a decision rather than a wobble between
     two pointer samples. MARK_GAP then keeps a single sweep to a single mark
     even if the body genuinely crosses twice inside it. */
  var M_UP       = 1.0;
  var M_DOWN     = 0.82;
  var SUPER_HOLD = 80;            // ms above M_UP before the crossing counts
  var SUB_HOLD   = 400;           // ms below M_DOWN before it can count again
  var MARK_GAP   = 2500;          // ms between crossing marks

  /* A body only disturbs the air once it is going somewhere. Both conditions
     matter: fast enough, and for long enough that it is travel rather than a
     twitch. Amplitude then comes in gradually, so the wake never switches on. */
  var M_WAKE    = 0.55;
  var MOVE_HOLD = 110;            // ms of unbroken motion before it counts
  var V_FLOOR   = 0.06;           // px/ms — below this the body is at rest

  var TRAIL_MS  = 620;
  var NODE_MAX  = 14;

  var W = 0, H = 0, dpr = 1;
  var runs = [], pulses = [], nodes = [], waves = [], marks = [];
  var body = { x: 0, y: 0, vx: 0, vy: 0, v: 0, mach: 0, id: 0,
               since: 0, below: 0, moving: 0, marked: -1e9,
               live: false, trail: [] };
  var ptr = { x: 0, y: 0, last: 0, seen: false };
  var raf = 0, timer = 0, now = 0, prev = 0;

  /* ── geometry ─────────────────────────────────────────────────────────── */

  function snap(x, y) {
    var m = Math.round(y / MODULE);
    var k = Math.round((x * U.x + y * U.y) / MODULE);
    var sy = m * MODULE;
    return { x: (k * MODULE - sy * U.y) / U.x, y: sy };
  }

  function line(ax, ay, bx, by, a, ink) {
    ctx.strokeStyle = 'rgba(' + (ink || CHALK) + ',' + a + ')';
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }

  function ray(x, y, ang, len, a0) {
    var ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
    var g = ctx.createLinearGradient(x, y, ex, ey);
    g.addColorStop(0, 'rgba(' + CHALK + ',' + a0 + ')');
    g.addColorStop(1, 'rgba(' + CHALK + ',0)');
    ctx.strokeStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  }

  /* The crossing itself. One wave, far stronger than the rest and in the ink
     the page reserves for things that were recorded — but still just a wave,
     expanding by the same rule as every other, so it cannot look bolted on. */
  function shock(x, y) {
    waves.push({ x: x, y: y, t0: now, a: 0.3, l: 200, ink: SODIUM });
  }

  /* Emission is interpolated across the frame rather than fired once at the
     new position. One wave per frame leaves the envelope tangent to a handful
     of widely spaced circles, which reads as beads rather than as a shock; two
     sub-frame emissions halve the spacing for the same cost. */
  function emit(x0, y0, x1, y1, dt, amp) {
    for (var i = 1; i <= 2; i++) {
      var f = i / 2;
      waves.push({ x: x0 + (x1 - x0) * f, y: y0 + (y1 - y0) * f,
                   t0: now - dt * (1 - f), a: amp });
    }
    while (waves.length > WAVE_CAP) waves.shift();
  }

  /* ── the lattice ──────────────────────────────────────────────────────── */

  function lattice() {
    /* Batched into one path per weight: a hundred separate strokes per frame
       would be a hundred state changes for two colours. */
    var minor = new Path2D(), major = new Path2D();
    var every = MAJOR / MODULE, i, p, path;

    for (i = 0; i * MODULE <= H; i++) {
      p = i * MODULE + 0.5;                      // crisp on the device grid
      path = i % every === 0 ? major : minor;
      path.moveTo(0, p);
      path.lineTo(W, p);
    }

    /* Raked lines are indexed by p·U, which runs from 0 at the top-left corner
       to W·Ux + H·Uy at the bottom-right one. */
    var span = Math.hypot(W, H);
    var last = Math.ceil((W * U.x + H * U.y) / MODULE);
    for (i = 0; i <= last; i++) {
      var ox = U.x * i * MODULE, oy = U.y * i * MODULE;
      path = i % every === 0 ? major : minor;
      path.moveTo(ox - D.x * span, oy - D.y * span);
      path.lineTo(ox + D.x * span, oy + D.y * span);
    }

    ctx.strokeStyle = 'rgba(' + CHALK + ',' + A_MINOR + ')';
    ctx.stroke(minor);
    ctx.strokeStyle = 'rgba(' + CHALK + ',' + A_MAJOR + ')';
    ctx.stroke(major);
  }

  /* ── events ───────────────────────────────────────────────────────────── */

  function spawnRun() {
    var top = window.scrollY, band = window.innerHeight;
    runs.push({
      x0: -100,
      y0: top + 90 + Math.random() * Math.max(1, band - 180),
      x: -100, y: 0,
      dx: Math.cos(-SHEAR),
      dy: Math.sin(-SHEAR),
      born: now, emit: 0, id: 'r' + (now | 0)
    });
    kick();
  }

  function scheduleRun() {
    if (!CFG.runs || timer) return;
    var gap = RUN_GAP[0] + Math.random() * (RUN_GAP[1] - RUN_GAP[0]);
    timer = setTimeout(function () { timer = 0; spawnRun(); }, gap);
  }

  function stampAt(px, py) {
    var p = snap(px, py);
    pulses.push({ x: p.x, y: p.y, born: now });
    if (!CFG.stamps) { kick(); return; }
    nodes.push({
      x: p.x, y: p.y, born: now, lit: 0, ties: [], tieId: '',
      id: (Math.random() * 0xffff | 0).toString(16).padStart(4, '0')
    });
    /* The record is capped, but nothing is silently dropped: the oldest node
       fades out where it stands. */
    if (nodes.length > NODE_MAX) {
      var old = nodes[0];
      if (!old.dying) old.dying = now;
      if (now - old.dying > 900) nodes.shift();
    }
    kick();
  }

  /* ── the towed body ───────────────────────────────────────────────────── */

  function tow(dt) {
    if (!CFG.shock || !ptr.seen) return;

    var px = body.x, py = body.y;

    body.vx += (ptr.x - body.x) * K * dt;
    body.vy += (ptr.y - body.y) * K * dt;
    var d = Math.exp(-DAMP * dt);
    body.vx *= d; body.vy *= d;
    body.x += body.vx * dt;
    body.y += body.vy * dt;

    body.v = Math.hypot(body.vx, body.vy);
    body.mach = body.v / C_SOUND;

    if (body.mach > M_UP) {
      body.below = 0;
      if (!body.since) body.since = now;
      if (!body.live && now - body.since > SUPER_HOLD) {
        body.live = true;
        /* Supersonic either way; the mark is what the cooldown withholds. */
        if (now - body.marked > MARK_GAP) {
          body.marked = now;
          shock(body.x, body.y);
          marks.push({ x: body.x, y: body.y,
                       dx: body.vx / body.v, dy: body.vy / body.v, t0: now });
          if (marks.length > 4) marks.shift();
        }
      }
    } else if (body.mach < M_DOWN) {
      body.since = 0;
      if (!body.below) body.below = now;
      if (now - body.below > SUB_HOLD) body.live = false;
    }
    /* Between M_DOWN and M_UP nothing changes: that band is the hysteresis. */

    if (body.v > V_FLOOR) {
      if (!body.moving) { body.moving = now; body.id++; }
      body.trail.push({ x: body.x, y: body.y, t: now,
                        w: Math.min(1, body.mach / 0.8) });
      if (body.trail.length > 60) body.trail.shift();

      var amp = (body.mach - M_WAKE) / (1 - M_WAKE);
      if (amp > 0 && now - body.moving > MOVE_HOLD) {
        emit(px, py, body.x, body.y, dt, 0.105 * Math.min(1, amp));
      }
      if (body.live) tie(body.x, body.y, 'b' + body.id);
    } else {
      body.moving = 0;
    }
  }

  /* ── provenance ───────────────────────────────────────────────────────── */

  /* An edge is not drawn because two things are near each other. It is drawn
     because something that was running passed something that was recorded, and
     it stays afterwards. No agent without a principal. */
  function tie(x, y, id) {
    for (var i = 0; i < nodes.length; i++) {
      var nd = nodes[i], dx = nd.x - x, dy = nd.y - y, d2 = dx * dx + dy * dy;
      if (d2 > 8100 || nd.dying) continue;         // 90px
      nd.lit = now;
      if (nd.tieId === id) {
        var last = nd.ties[nd.ties.length - 1];
        if (d2 < last.d2) { last.bx = x; last.by = y; last.d2 = d2; }
      } else {
        nd.tieId = id;
        nd.ties.push({ bx: x, by: y, d2: d2, t0: now });
        if (nd.ties.length > 3) nd.ties.shift();
      }
    }
  }

  /* ── painting ─────────────────────────────────────────────────────────── */

  function paint(dtFrame) {
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;
    lattice();

    var i, n, a, age, f;

    /* Stamped nodes: a surveyed point, ticked along both lattice families. */
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      a = n.dying ? Math.max(0, 1 - (now - n.dying) / 900) : 1;
      a *= Math.min(1, (now - n.born) / 220);
      if (a <= 0) continue;

      var boost = n.lit ? Math.max(0, 1 - (now - n.lit) / 600) : 0;

      ctx.strokeStyle = 'rgba(' + CHALK + ',' + (0.22 * a + 0.25 * boost) + ')';
      ctx.beginPath();
      ctx.moveTo(n.x - 9, n.y);                          // along the horizontals
      ctx.lineTo(n.x + 9, n.y);
      ctx.moveTo(n.x - 9 * D.x, n.y - 9 * D.y);          // along the raked family
      ctx.lineTo(n.x + 9 * D.x, n.y + 9 * D.y);
      ctx.stroke();

      for (var e = 0; e < n.ties.length; e++) {
        var ti = n.ties[e];
        line(n.x, n.y, ti.bx, ti.by,
             0.12 * a * Math.min(1, (now - ti.t0) / 400));
      }

      ctx.fillStyle = 'rgba(' + SODIUM + ',' + (0.7 * a + 0.3 * boost) + ')';
      ctx.beginPath();
      ctx.arc(n.x, n.y, 3.2, 0, 6.2832);
      ctx.fill();

      if (CFG.ids) {
        ctx.save();
        ctx.transform(1, 0, -Math.tan(SHEAR), 1, n.x + 11, n.y - 7);
        ctx.fillStyle = 'rgba(' + CHALK + ',' + (0.32 * a) + ')';
        ctx.font = '600 9px "Plex Mono", ui-monospace, monospace';
        ctx.fillText(n.id, 0, 0);
        ctx.restore();
      }
    }

    /* Pressure waves. Where the emitter was subsonic these stay nested and
       read as a ripple; where it was not, they pile up along a line, and that
       line is the shock. Nothing here knows which case it is in. */
    for (i = waves.length - 1; i >= 0; i--) {
      var wv = waves[i], wl = wv.l || WAVE_LIFE;
      age = now - wv.t0;
      if (age > wl) { waves.splice(i, 1); continue; }
      /* Amplitude holds and then drops away, rather than decaying from the
         first instant: the envelope is built by the oldest, widest waves, and
         fading those first is what dissolves the cone. */
      f = age / wl;
      ctx.strokeStyle = 'rgba(' + (wv.ink || CHALK) + ',' +
        (wv.a * Math.min(1, (1 - f) * 2.4)) + ')';
      ctx.beginPath();
      ctx.arc(wv.x, wv.y, Math.max(0, C_SOUND * age), 0, 6.2832);
      ctx.stroke();
    }

    /* Pressure ring from a click. */
    for (i = pulses.length - 1; i >= 0; i--) {
      age = now - pulses[i].born;
      if (age > 520) { pulses.splice(i, 1); continue; }
      f = age / 520;
      ctx.strokeStyle = 'rgba(' + CHALK + ',' + (0.3 * (1 - f)) + ')';
      ctx.beginPath();
      ctx.arc(pulses[i].x, pulses[i].y, 5 + f * 62, 0, 6.2832);
      ctx.stroke();
    }

    /* Where the crossing happened, left on the ground with its reading while
       whatever crossed carries on without it. */
    for (i = marks.length - 1; i >= 0; i--) {
      var mk = marks[i];
      age = now - mk.t0;
      if (age > 2100) { marks.splice(i, 1); continue; }
      a = Math.min(1, age / 110) * Math.max(0, 1 - Math.max(0, age - 1100) / 1000);
      line(mk.x - mk.dy * 9, mk.y + mk.dx * 9,
           mk.x + mk.dy * 9, mk.y - mk.dx * 9, 0.75 * a, SODIUM);
      ctx.save();
      /* Fixed offset rather than one derived from heading: the tick reaches
         9px in whatever direction the crossing happened, and a perpendicular
         offset puts the label straight through it on a flat sweep. */
      ctx.transform(1, 0, -Math.tan(SHEAR), 1, mk.x + 14, mk.y + 20);
      ctx.fillStyle = 'rgba(' + SODIUM + ',' + (0.8 * a) + ')';
      ctx.font = '600 9px "Plex Mono", ui-monospace, monospace';
      ctx.fillText('M 1.00', 0, 0);
      ctx.restore();
    }

    /* Articles under test: a head, and the path it came in on. Everything else
       about them is already out in the world. */
    for (i = runs.length - 1; i >= 0; i--) {
      var r = runs[i];
      var d = (now - r.born) * RUN_SPEED;
      var rpx = r.x, rpy = r.y;
      r.x = r.x0 + r.dx * d;
      r.y = r.y0 + r.dy * d;
      if (r.x > W + 160) { runs.splice(i, 1); continue; }

      if (r.emit) emit(rpx, rpy, r.x, r.y, dtFrame, 0.10);
      r.emit = 1;

      ray(r.x, r.y, Math.atan2(-r.dy, -r.dx),
          Math.min(d, RUN_SPEED * RUN_PATH), 0.13);

      ctx.save();
      ctx.transform(1, 0, -Math.tan(SHEAR), 1, r.x, r.y);
      ctx.fillStyle = 'rgba(' + CHALK + ',0.6)';
      ctx.fillRect(-1.5, -1.5, 3, 3);
      ctx.restore();

      tie(r.x, r.y, r.id);
    }

    /* The towed body: its path, and a reading once there is one worth taking. */
    if (CFG.shock) {
      var tr = body.trail;
      while (tr.length && now - tr[0].t > TRAIL_MS) tr.shift();
      for (i = 1; i < tr.length; i++) {
        a = 1 - (now - tr[i].t) / TRAIL_MS;
        if (a <= 0) continue;
        ctx.strokeStyle = 'rgba(' + CHALK + ',' + (0.14 * a * a * tr[i].w) + ')';
        ctx.beginPath();
        ctx.moveTo(tr[i - 1].x, tr[i - 1].y);
        ctx.lineTo(tr[i].x, tr[i].y);
        ctx.stroke();
      }

      if (body.mach > 0.8 && body.v > 0.03) {
        a = Math.min(1, (body.mach - 0.8) / 0.35);
        ctx.save();
        ctx.transform(1, 0, -Math.tan(SHEAR), 1, body.x + 13, body.y - 11);
        ctx.fillStyle = body.live
          ? 'rgba(' + SODIUM + ',' + (0.8 * a) + ')'
          : 'rgba(' + CHALK + ',' + (0.3 * a) + ')';
        ctx.font = '600 9px "Plex Mono", ui-monospace, monospace';
        ctx.fillText('M ' + body.mach.toFixed(2), 0, 0);
        ctx.restore();
      }
    }
  }

  /* ── loop ─────────────────────────────────────────────────────────────── */

  function busy() {
    return runs.length > 0 || pulses.length > 0 || waves.length > 0 ||
           marks.length > 0 ||
           (CFG.shock && (body.trail.length > 0 || body.v > 0.03 ||
                          now - ptr.last < 200)) ||
           nodes.some(function (n) {
             return n.dying || (now - n.born < 240) || (n.lit && now - n.lit < 620);
           });
  }

  function frame(t) {
    raf = 0;
    var dt = Math.min(t - (prev || t), 48);
    prev = t;
    now = t;
    tow(dt);
    paint(dt);
    /* Idle means idle: the loop stops rather than repainting an unchanged
       frame sixty times a second. What is on the canvas stays there, because
       nothing clears it until something moves again. */
    if (busy()) raf = requestAnimationFrame(frame);
    else { prev = 0; scheduleRun(); }
  }

  function kick() {
    if (!raf && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.height = '0px';
    W = document.documentElement.clientWidth;
    H = Math.max(document.documentElement.scrollHeight, window.innerHeight);
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    kick();
  }

  /* ── wiring ───────────────────────────────────────────────────────────── */

  window.addEventListener('resize', resize, { passive: true });

  window.addEventListener('pointermove', function (e) {
    if (!CFG.shock) return;
    ptr.x = e.pageX; ptr.y = e.pageY; ptr.last = performance.now();
    if (!ptr.seen) { ptr.seen = true; body.x = ptr.x; body.y = ptr.y; }
    kick();
  }, { passive: true });

  window.addEventListener('pointerdown', function (e) {
    now = performance.now();
    stampAt(e.pageX, e.pageY);
  }, { passive: true });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (raf) { cancelAnimationFrame(raf); raf = 0; prev = 0; }
      if (timer) { clearTimeout(timer); timer = 0; }
    } else {
      kick();
      scheduleRun();
    }
  });

  resize();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(kick);
  if (CFG.runs) timer = setTimeout(function () { timer = 0; spawnRun(); }, 4000);

  if (q.has('lab')) {
    window.__tunnel = { run: spawnRun, stamp: stampAt, kick: kick,
                        runs: runs, waves: waves, body: body, C: C_SOUND, gap: 16 };
  }
})();
