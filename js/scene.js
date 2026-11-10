/* The road: parallax mountains, day/night sky, traffic and the truck — all drawn on one canvas. */
const Scene = (() => {
  const PX_PER_KM = 60;
  const BASE_SPEED = 110;              // world px per second at 1x
  const TOTAL_PX = ROUTE_KM * PX_PER_KM;
  const TUNNEL = STOPS.find((s) => s.type === 'tunnel');
  const TRUCK_LEN = 356;

  let cv, ctx, W = 0, H = 0, dpr = 1, S = 1, base = 0, bottomInset = 140;
  let running = false, last = 0, time = 0, truckX = 0;
  let nextStop = 1, inTunnel = false, nextSpawn = 5, puffT = 0;
  const traffic = [], puffs = [], flakes = [];
  let stars = [];
  const cbs = {};

  const st = {
    x: 0, speed: 0, mult: 1, engine: true, lights: false, disco: false, honk: false, arrived: false, photo: true,
    truck: { pal: PALETTES[0], name: 'USTAAD' },
  };

  /* ---------- helpers ---------- */
  const h1 = (i, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const hexCache = {};
  const C = (h) => hexCache[h] || (hexCache[h] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
  function m(a, b, t) {
    a = Array.isArray(a) ? a : C(a); b = Array.isArray(b) ? b : C(b);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }
  const css = (c, al = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${al})`;
  function rr(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  const SKY = [
    { h: 0, t: '#060a1f', b: '#1a1e47' }, { h: 4.5, t: '#0d1433', b: '#2a2a5a' },
    { h: 6, t: '#34407a', b: '#f2a46a' }, { h: 8, t: '#4f97e0', b: '#c4e4ff' },
    { h: 12, t: '#3a8ade', b: '#acdcff' }, { h: 16, t: '#4a86d0', b: '#ffd9a0' },
    { h: 18, t: '#363b82', b: '#ff8656' }, { h: 19.5, t: '#1a1c4c', b: '#6b3b6e' },
    { h: 21, t: '#0a0e2a', b: '#242754' }, { h: 24, t: '#060a1f', b: '#1a1e47' },
  ];
  function skyAt(hr) {
    let i = 0; while (i < SKY.length - 2 && SKY[i + 1].h <= hr) i++;
    const A = SKY[i], B = SKY[i + 1], t = (hr - A.h) / (B.h - A.h);
    return [m(A.t, B.t, t), m(A.b, B.b, t)];
  }
  function daylight(hr) {
    if (hr < 5) return 0; if (hr < 7.5) return (hr - 5) / 2.5;
    if (hr < 17.5) return 1; if (hr < 20) return 1 - (hr - 17.5) / 2.5; return 0;
  }
  const kmNow = () => st.x / PX_PER_KM;
  function altAt(k) {
    for (let i = 0; i < STOPS.length - 1; i++) {
      const a = STOPS[i], b = STOPS[i + 1];
      if (k <= b.km) return lerp(a.alt, b.alt, (k - a.km) / (b.km - a.km));
    }
    return STOPS[STOPS.length - 1].alt;
  }
  function clockAt(k) {
    const mins = 370 + (k / ROUTE_KM) * 1970;     // 6:10 AM day 1 → ~3 PM day 2
    return { mins, hr: (mins / 60) % 24, day: mins >= 1440 ? 2 : 1 };
  }

  /* ---------- setup ---------- */
  function init(canvas) {
    cv = canvas; ctx = cv.getContext('2d');
    resize();
    if (st.photo) { photoImg(0); photoImg(1); }       // warm up while the intro is showing
    addEventListener('resize', resize);
  }
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    const mobile = W < 760;
    S = mobile ? clamp(W / 740, 0.46, 0.68) : clamp(W / 1450, 0.6, 1);
    base = H - bottomInset;
    truckX = (mobile ? W * 0.42 : W * 0.4) - (TRUCK_LEN * S) / 2;
    stars = Array.from({ length: 140 }, (_, i) => ({
      x: h1(i, 3) * W, y: h1(i, 4) * base * 0.6, r: h1(i, 5) * 1.4 + 0.4, p: h1(i, 6) * 6,
    }));
  }
  function setBottomInset(px) { bottomInset = px; resize(); }

  function start() { if (running) return; running = true; last = performance.now(); requestAnimationFrame(frame); }
  function frame(ts) {
    if (!running) return;
    const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts; time += dt;
    update(dt); draw();
    requestAnimationFrame(frame);
  }
  function emit(n, ...a) { if (cbs[n]) cbs[n](...a); }

  /* ---------- simulation ---------- */
  function update(dt) {
    const tgt = st.engine && !st.arrived ? st.mult : 0;
    st.speed += (tgt - st.speed) * Math.min(1, dt * 1.2);
    if (Math.abs(st.speed) < 0.002) st.speed = 0;
    st.x += BASE_SPEED * st.speed * dt;
    if (st.x >= TOTAL_PX) {
      st.x = TOTAL_PX;
      if (!st.arrived) { st.arrived = true; emit('arrive'); }
    }
    while (nextStop < STOPS.length && st.x >= STOPS[nextStop].km * PX_PER_KM) { emit('stop', STOPS[nextStop], nextStop); nextStop++; }

    const k = kmNow();
    const inside = k >= TUNNEL.km && k <= TUNNEL.km + TUNNEL.len;
    if (inside !== inTunnel) { inTunnel = inside; emit('tunnel', inside); }

    // oncoming traffic
    nextSpawn -= dt * Math.max(st.speed, 0.15);
    if (nextSpawn <= 0 && !inTunnel && !st.arrived) {
      nextSpawn = 6 + Math.random() * 9;
      const r = Math.random();
      const x0 = st.x + W + 200;
      if (r < 0.55) {
        const n = 2 + ((Math.random() * 3) | 0);
        const cols = ['#e63946', '#ffd23f', '#2ec4b6', '#ff4f8b', '#4cc9f0', '#f77f00'];
        for (let i = 0; i < n; i++) traffic.push({ type: 'bike', x: x0 + i * 58, v: 95, lead: i === 0, col: cols[(Math.random() * cols.length) | 0], seed: Math.random() * 10 });
      } else if (r < 0.62) {
        traffic.push({ type: 'army', x: x0, v: 55, lead: true });
        traffic.push({ type: 'army', x: x0 + 175, v: 55, lead: false });
      } else if (r < 0.9) {
        const pal = PALETTES[(Math.random() * PALETTES.length) | 0];
        traffic.push({ type: 'truck', x: x0, v: 60, lead: true, pal, slogan: TRUCK_BADGES[(Math.random() * TRUCK_BADGES.length) | 0] });
      } else {
        traffic.push({ type: 'taxi', x: x0, v: 85, lead: true });
      }
    }
    const tc = truckX + (TRUCK_LEN * S) / 2;
    for (let i = traffic.length - 1; i >= 0; i--) {
      const t = traffic[i];
      t.x -= t.v * dt;
      const sx = t.x - st.x + truckX;
      if (t.lead && !t.passed && sx < tc) { t.passed = true; emit('pass', t.type, t); }
      if (sx < -400) traffic.splice(i, 1);
    }

    // exhaust
    puffT -= dt;
    if (st.engine && puffT <= 0) {
      puffT = st.speed > 0.05 ? 0.07 : 0.22;
      puffs.push({ x: truckX + 231.5 * S, y: base - 204 * S, vx: -BASE_SPEED * st.speed * 0.5 - 8, vy: -24 - Math.random() * 10, r: 4 * S, life: 0 });
    }
    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i]; p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += 14 * S * dt;
      if (p.life > 1.6) puffs.splice(i, 1);
    }

    // snow at altitude
    const want = Math.round(clamp((altAt(k) - 4300) / 700, 0, 1) * 140);
    while (flakes.length < want) flakes.push({ x: Math.random() * W, y: Math.random() * H, v: 30 + Math.random() * 40, r: Math.random() * 2 + 0.8, p: Math.random() * 6 });
    if (flakes.length > want) flakes.length = want;
    for (const f of flakes) {
      f.y += f.v * dt; f.x += (-18 - st.speed * 50 + Math.sin(time + f.p) * 10) * dt;
      if (f.y > H) { f.y = -5; f.x = Math.random() * W; }
      if (f.x < -5) f.x = W + 5;
    }
  }

  /* ---------- drawing ---------- */
  const NEAR = { par: 0.42, f: [[0.25, 0.0035, 1], [0.13, 0.009, 2], [0.07, 0.021, 0.5]] };
  const MID = { par: 0.2, f: [[0.28, 0.0022, 0.3], [0.12, 0.006, 1.7], [0.05, 0.017, 2.2]] };
  function ridgeY(L, by, amp, x) {
    const wx = x + st.x * L.par; let y = 0;
    for (const [a, f, p] of L.f) y += a * Math.sin(wx * f + p);
    return by - amp * (0.55 + y);
  }
  function drawRidge(L, by, amp, col) {
    ctx.fillStyle = css(col); ctx.beginPath(); ctx.moveTo(-2, H);
    for (let x = -2; x <= W + 10; x += 8) ctx.lineTo(x, ridgeY(L, by, amp, x));
    ctx.lineTo(W + 10, H); ctx.closePath(); ctx.fill();
  }

  function drawPeaks(par, sp, by, hMin, hMax, col, snowCol, snowFrac, seed) {
    const off = st.x * par;
    const i0 = Math.floor(off / sp) - 2, i1 = Math.ceil((off + W) / sp) + 2;
    const pts = [];
    for (let i = i0; i <= i1; i++) {
      const ph = hMin + h1(i, seed + 1) * (hMax - hMin);
      pts.push({ x: i * sp - off + (h1(i, seed) - 0.5) * sp * 0.4, y: by - ph, h: ph, i });
    }
    const vals = [];
    for (let j = 1; j < pts.length; j++) {
      const p = pts[j], q = pts[j - 1];
      vals[j] = { x: (p.x + q.x) / 2 + (h1(p.i, seed + 2) - 0.5) * sp * 0.2, y: by - Math.min(p.h, q.h) * (0.25 + h1(p.i, seed + 3) * 0.25) };
    }
    ctx.fillStyle = css(col); ctx.beginPath(); ctx.moveTo(pts[0].x - sp, H);
    pts.forEach((p, j) => { if (j > 0) ctx.lineTo(vals[j].x, vals[j].y); ctx.lineTo(p.x, p.y); });
    ctx.lineTo(pts[pts.length - 1].x + sp, H); ctx.closePath(); ctx.fill();
    for (let j = 1; j < pts.length - 1; j++) {
      const p = pts[j], L = vals[j], R = vals[j + 1];
      // shaded face
      ctx.fillStyle = 'rgba(0,0,0,0.13)';
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(R.x, R.y); ctx.lineTo(lerp(p.x, R.x, 0.25), by); ctx.closePath(); ctx.fill();
      if (snowFrac <= 0) continue;
      const f = clamp(snowFrac * (0.7 + h1(p.i, seed + 4) * 0.5), 0, 0.9);
      const lx = lerp(p.x, L.x, f), ly = lerp(p.y, L.y, f), rx = lerp(p.x, R.x, f), ry = lerp(p.y, R.y, f);
      ctx.fillStyle = css(snowCol);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(rx, ry);
      for (let q = 1; q < 5; q++) {
        const t = q / 5;
        ctx.lineTo(lerp(rx, lx, t), lerp(ry, ly, t) - (q % 2 ? 1 : -0.3) * p.h * 0.06 * (0.5 + h1(q + p.i, seed + 5)));
      }
      ctx.lineTo(lx, ly); ctx.closePath(); ctx.fill();
    }
  }

  function drawSunMoon(hr, noSun) {
    if (!noSun && hr > 5.3 && hr < 19.2) {
      const f = (hr - 5.3) / 13.9;
      const x = W * (0.08 + 0.84 * f), y = base * 0.62 - Math.sin(f * Math.PI) * base * 0.5;
      const low = 1 - Math.sin(f * Math.PI);
      const col = m('#fff6d6', '#ff9a4a', low);
      const g = ctx.createRadialGradient(x, y, 0, x, y, 90 * S);
      g.addColorStop(0, css(col, 0.55)); g.addColorStop(1, css(col, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 90 * S, 0, 7); ctx.fill();
      ctx.fillStyle = css(col); ctx.beginPath(); ctx.arc(x, y, 26 * S, 0, 7); ctx.fill();
    }
    const mh = hr >= 18.5 ? hr - 18.5 : hr + 5.5;      // moon up from 18:30 → 06:30
    if (mh >= 0 && mh <= 12) {
      const f = mh / 12;
      const x = W * (0.1 + 0.8 * f), y = base * 0.55 - Math.sin(f * Math.PI) * base * 0.42;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 70 * S);
      g.addColorStop(0, 'rgba(220,225,255,0.25)'); g.addColorStop(1, 'rgba(220,225,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 70 * S, 0, 7); ctx.fill();
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, 22 * S, 0, 7); ctx.clip();
      ctx.fillStyle = '#e9e6ff'; ctx.fillRect(x - 30 * S, y - 30 * S, 60 * S, 60 * S);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.arc(x + 11 * S, y - 6 * S, 20 * S, 0, 7); ctx.fill();
      ctx.restore();
    }
  }

  function pine(x, y, h, col) {
    ctx.fillStyle = css(col);
    ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + h * 0.32, y - h * 0.35); ctx.lineTo(x - h * 0.32, y - h * 0.35); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, y - h * 0.7); ctx.lineTo(x + h * 0.4, y); ctx.lineTo(x - h * 0.4, y); ctx.fill();
  }
  function chorten(x, y, s, night) {
    ctx.fillStyle = css(m('#f4efe6', '#3a3f63', night * 0.7));
    ctx.fillRect(x - 9 * s, y - 8 * s, 18 * s, 8 * s);
    ctx.beginPath(); ctx.arc(x, y - 12 * s, 7 * s, Math.PI, 0); ctx.fill();
    ctx.fillRect(x - 2 * s, y - 26 * s, 4 * s, 10 * s);
    ctx.fillStyle = css(m('#c0392b', '#3a1f30', night * 0.7)); ctx.fillRect(x - 9 * s, y - 9 * s, 18 * s, 2 * s);
  }
  const FLAG_COLS = ['#2b6cd6', '#f4f4f4', '#d62839', '#2b9348', '#ffd23f'];
  function flagLine(x1, y1, x2, y2, s, sag) {
    ctx.strokeStyle = 'rgba(40,30,30,0.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 + sag, x2, y2); ctx.stroke();
    const n = Math.max(4, Math.floor(Math.abs(x2 - x1) / (11 * s)));
    for (let i = 1; i < n; i++) {
      const t = i / n, a = 1 - t;
      const x = a * a * x1 + 2 * a * t * (x1 + x2) / 2 + t * t * x2;
      const y = a * a * y1 + 2 * a * t * ((y1 + y2) / 2 + sag) + t * t * y2;
      ctx.fillStyle = FLAG_COLS[i % 5];
      const sw = Math.sin(time * 4 + i) * 1.5 * s;
      ctx.fillRect(x - 3.5 * s + sw, y, 7 * s, 9 * s);
    }
  }

  function signBoard(x, y, stop) {
    const s = S;
    ctx.font = `400 ${13 * s}px Bungee, Impact, sans-serif`;
    const w = Math.max(ctx.measureText(stop.en).width + 24 * s, 110 * s), h = 40 * s;
    ctx.fillStyle = '#3b3b3b';
    ctx.fillRect(x - w / 2 + 10 * s, y - h - 26 * s, 4 * s, h + 26 * s);
    ctx.fillRect(x + w / 2 - 14 * s, y - h - 26 * s, 4 * s, h + 26 * s);
    ctx.fillStyle = '#f6c90e'; rr(ctx, x - w / 2, y - h - 30 * s, w, h, 4 * s); ctx.fill();
    ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 2 * s; ctx.stroke();
    ctx.fillStyle = '#1b1b1b'; ctx.textAlign = 'center';
    ctx.fillText(stop.en, x, y - h - 12 * s);
    ctx.font = `700 ${10 * s}px "Baloo 2", sans-serif`;
    ctx.fillText(`${stop.alt.toLocaleString('en-IN')} M  ·  LEH ${ROUTE_KM - stop.km} KM`, x, y - 36 * s);
    ctx.textAlign = 'left';
  }

  function house(x, y, s, ladakhi, seed, night) {
    const w = (40 + h1(seed, 1) * 22) * s, hh = (30 + h1(seed, 2) * 16) * s;
    const dim = night * 0.65;
    if (ladakhi) {
      ctx.fillStyle = css(m('#f2ece0', '#2e3354', dim)); ctx.fillRect(x, y - hh, w, hh);
      ctx.fillStyle = css(m('#8b2d1f', '#2a1a28', dim)); ctx.fillRect(x - 2 * s, y - hh - 4 * s, w + 4 * s, 5 * s);
      ctx.fillStyle = css(m('#4a2c1a', '#141522', dim));
      for (let i = 0; i < 2; i++) ctx.fillRect(x + 8 * s + i * w * 0.45, y - hh + 10 * s, 9 * s, 9 * s);
      flagLine(x + 2 * s, y - hh - 4 * s, x + w - 2 * s, y - hh - 14 * s, s, 2 * s);
    } else {
      ctx.fillStyle = css(m('#7b5236', '#24203a', dim)); ctx.fillRect(x, y - hh, w, hh);
      ctx.fillStyle = css(m('#8f8f96', '#262a40', dim)); ctx.fillRect(x, y - 8 * s, w, 8 * s);
      ctx.fillStyle = css(m('#4b4e5c', '#151726', dim));
      ctx.beginPath(); ctx.moveTo(x - 6 * s, y - hh); ctx.lineTo(x + w / 2, y - hh - 18 * s); ctx.lineTo(x + w + 6 * s, y - hh); ctx.fill();
    }
    if (night > 0.5) { ctx.fillStyle = 'rgba(255,200,90,0.9)'; ctx.fillRect(x + w * 0.6, y - hh * 0.6, 6 * s, 6 * s); }
  }

  function drawStopObject(stop, sx, y, night, k) {
    const s = S, ladakhi = stop.km > 250;
    switch (stop.type) {
      case 'town':
        for (let i = 0; i < 4; i++) house(sx + 40 * s + i * 62 * s, y, s, ladakhi, stop.km + i, night);
        break;
      case 'dhaba': {
        const x = sx + 50 * s, w = 130 * s, hh = 42 * s;
        if (stop.km > 170) { // parachute tent
          const cols = ['#d62839', '#f4f4f4', '#2b6cd6'];
          for (let i = 0; i < 6; i++) {
            ctx.fillStyle = cols[i % 3];
            ctx.beginPath(); ctx.moveTo(x + w / 2, y - hh - 20 * s);
            ctx.lineTo(x + (i / 6) * w, y); ctx.lineTo(x + ((i + 1) / 6) * w, y); ctx.closePath(); ctx.fill();
          }
          ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x + w * 0.42, y - 22 * s, w * 0.16, 22 * s);
        } else {
          ctx.fillStyle = css(m('#7fc8d8', '#24304a', night * 0.6)); ctx.fillRect(x, y - hh, w, hh);
          ctx.fillStyle = css(m('#2f5d8a', '#18203a', night * 0.6));
          ctx.beginPath(); ctx.moveTo(x - 10 * s, y - hh); ctx.quadraticCurveTo(x + w / 2, y - hh - 22 * s, x + w + 10 * s, y - hh); ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x + 12 * s, y - 28 * s, 30 * s, 28 * s);
        }
        ctx.fillStyle = '#d62839'; rr(ctx, x + w / 2 - 38 * s, y - hh - 46 * s, 76 * s, 20 * s, 3 * s); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = `400 ${11 * s}px Bungee, sans-serif`; ctx.textAlign = 'center';
        ctx.fillText('DHABA', x + w / 2, y - hh - 31 * s); ctx.textAlign = 'left';
        ctx.fillStyle = '#e63946';
        for (let i = 0; i < 3; i++) ctx.fillRect(x + w + 10 * s + i * 14 * s, y - 12 * s, 9 * s, 12 * s);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2 * s;
        for (let i = 0; i < 3; i++) {
          const sx2 = x + w + 20 * s + i * 7 * s, t = (time * 0.8 + i * 0.3) % 1;
          ctx.globalAlpha = 1 - t; ctx.beginPath(); ctx.moveTo(sx2, y - 18 * s - t * 26 * s);
          ctx.quadraticCurveTo(sx2 + 5 * s, y - 24 * s - t * 26 * s, sx2, y - 30 * s - t * 26 * s); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        break;
      }
      case 'pump': {
        const x = sx + 50 * s;
        ctx.fillStyle = '#f4f4f4'; ctx.fillRect(x, y - 70 * s, 140 * s, 12 * s);
        ctx.fillStyle = '#d62839'; ctx.fillRect(x, y - 60 * s, 140 * s, 5 * s);
        ctx.fillStyle = '#8a8a8a'; ctx.fillRect(x + 12 * s, y - 58 * s, 6 * s, 58 * s); ctx.fillRect(x + 122 * s, y - 58 * s, 6 * s, 58 * s);
        ctx.fillStyle = '#d62839'; rr(ctx, x + 55 * s, y - 34 * s, 22 * s, 34 * s, 3 * s); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillRect(x + 59 * s, y - 29 * s, 14 * s, 8 * s);
        ctx.fillStyle = '#1b1b1b'; ctx.font = `400 ${9 * s}px Bungee, sans-serif`; ctx.fillText('FUEL', x + 50 * s, y - 61 * s);
        break;
      }
      case 'check': {
        const x = sx + 50 * s;
        ctx.fillStyle = css(m('#e9e2cf', '#2c3050', night * 0.6)); ctx.fillRect(x, y - 40 * s, 40 * s, 40 * s);
        ctx.fillStyle = '#ff9933'; ctx.fillRect(x, y - 40 * s, 40 * s, 4 * s);
        ctx.fillStyle = '#fff'; ctx.fillRect(x, y - 36 * s, 40 * s, 4 * s);
        ctx.fillStyle = '#138808'; ctx.fillRect(x, y - 32 * s, 40 * s, 4 * s);
        ctx.fillStyle = '#333'; ctx.fillRect(x + 50 * s, y - 22 * s, 6 * s, 22 * s);
        ctx.save(); ctx.translate(x + 53 * s, y - 20 * s); ctx.rotate(-0.9);
        for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#fff' : '#d62839'; ctx.fillRect(i * 10 * s, -2 * s, 10 * s, 4 * s); }
        ctx.restore();
        break;
      }
      case 'pass': {
        const x = sx + 40 * s;
        ctx.fillStyle = css(m('#8d8478', '#2a2c44', night * 0.6));
        [[0, 18], [4, 13], [8, 9]].forEach(([dy, r], i) => { ctx.beginPath(); ctx.ellipse(x + 30 * s, y - dy * 2.2 * s - r * s * 0.4, r * s, r * 0.6 * s, 0, 0, 7); ctx.fill(); });
        ctx.fillStyle = '#5b4636'; ctx.fillRect(x + 28 * s, y - 80 * s, 3 * s, 60 * s); ctx.fillRect(x + 220 * s, y - 70 * s, 3 * s, 70 * s);
        flagLine(x + 30 * s, y - 78 * s, x + 221 * s, y - 68 * s, s, 18 * s);
        flagLine(x + 30 * s, y - 60 * s, x + 221 * s, y - 50 * s, s, 14 * s);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(x + 70 * s + i * 45 * s, y - 2 * s, 22 * s, 4 * s, 0, 0, 7); ctx.fill(); }
        break;
      }
      case 'tunnel': {
        const x = sx + 30 * s;
        ctx.fillStyle = css(m('#6d6a73', '#22243a', night * 0.6)); ctx.fillRect(x, y - 120 * s, 190 * s, 120 * s);
        ctx.fillStyle = css(m('#55525c', '#1b1d30', night * 0.6)); ctx.fillRect(x - 10 * s, y - 132 * s, 210 * s, 14 * s);
        ctx.fillStyle = '#0c0c12'; ctx.beginPath(); ctx.moveTo(x + 30 * s, y); ctx.lineTo(x + 30 * s, y - 55 * s);
        ctx.arc(x + 95 * s, y - 55 * s, 65 * s, Math.PI, 0); ctx.lineTo(x + 160 * s, y); ctx.fill();
        ctx.fillStyle = '#ffd23f'; ctx.font = `400 ${12 * s}px Bungee, sans-serif`; ctx.textAlign = 'center';
        ctx.fillText('ATAL TUNNEL', x + 95 * s, y - 121 * s); ctx.textAlign = 'left';
        break;
      }
      case 'loops': break;
      case 'plains': break;
      case 'finish': {
        const x = sx + 20 * s, w = 220 * s;
        ctx.fillStyle = '#8b2d1f'; ctx.fillRect(x, y - 110 * s, 16 * s, 110 * s); ctx.fillRect(x + w - 16 * s, y - 110 * s, 16 * s, 110 * s);
        ctx.fillStyle = '#f2ece0'; ctx.fillRect(x - 6 * s, y - 130 * s, w + 12 * s, 26 * s);
        const cols = ['#2b6cd6', '#ffd23f', '#d62839', '#2b9348'];
        for (let i = 0; i < 12; i++) { ctx.fillStyle = cols[i % 4]; ctx.fillRect(x - 6 * s + i * (w + 12 * s) / 12, y - 104 * s, (w + 12 * s) / 12, 5 * s); }
        ctx.fillStyle = '#8b2d1f'; ctx.beginPath(); ctx.moveTo(x - 12 * s, y - 130 * s); ctx.lineTo(x + w / 2, y - 152 * s); ctx.lineTo(x + w + 12 * s, y - 130 * s); ctx.fill();
        ctx.fillStyle = '#8b2d1f'; ctx.font = `400 ${12 * s}px Bungee, sans-serif`; ctx.textAlign = 'center';
        ctx.fillText('JULLEY · WELCOME TO LEH', x + w / 2, y - 112 * s); ctx.textAlign = 'left';
        break;
      }
    }
    signBoard(sx - 60 * s, y, stop);
  }

  function drawLoops(by, amp, night) {
    const L = STOPS.find((s) => s.type === 'loops');
    const cx = (L.km * PX_PER_KM - st.x) * MID.par + truckX + 160 * S;
    if (cx < -300 || cx > W + 300) return;
    const top = ridgeY(MID, by, amp, cx) + 18 * S;
    const bottom = by - 4 * S;
    ctx.strokeStyle = css(m('#d8cbb6', '#3a3d5c', night * 0.7)); ctx.lineWidth = 2.2 * S; ctx.lineJoin = 'round';
    ctx.beginPath();
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const y = lerp(bottom, top, i / n), x = cx + (i % 2 ? 1 : -1) * 70 * S * (1 - i / (n * 1.6));
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }

  /* ---------- vehicles ---------- */
  function wheel(c, x, y, r, a, accent) {
    c.fillStyle = '#18181c'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    c.fillStyle = '#c9cbd3'; c.beginPath(); c.arc(x, y, r * 0.55, 0, 7); c.fill();
    c.strokeStyle = accent; c.lineWidth = 2.5; c.beginPath(); c.arc(x, y, r * 0.62, 0, 7); c.stroke();
    c.fillStyle = '#4b4d57';
    for (let i = 0; i < 6; i++) { const t = a + (i * Math.PI) / 3; c.beginPath(); c.arc(x + Math.cos(t) * r * 0.36, y + Math.sin(t) * r * 0.36, 1.9, 0, 7); c.fill(); }
    c.beginPath(); c.arc(x, y, r * 0.16, 0, 7); c.fill();
  }

  const LAMP_COLS = ['#ff4d4d', '#ffd23f', '#3ddc97', '#4cc9f0', '#f72585', '#ffd23f', '#ff9f1c'];
  const LAMP_X = [232, 243, 254, 265, 276, 287, 298];
  const lampY = (x) => -191 + ((x - 216) / 82) * 10;
  function lampColor(i, o) {
    if (o.disco) return LAMP_COLS[(i + Math.floor((o.t || 0) * 8)) % LAMP_COLS.length];
    return o.lights ? LAMP_COLS[i % LAMP_COLS.length] : '#5a5560';
  }
  // text that stays readable when the truck is mirrored (oncoming trucks)
  function txt(c, o, str, x, y) {
    if (!o.flip) { c.fillText(str, x, y); return; }
    c.save(); c.translate(x, y); c.scale(-1, 1); c.fillText(str, 0, 0); c.restore();
  }
  function fitFont(c, str, maxW, size, family, weight) {
    c.font = `${weight} ${size}px ${family}`;
    while (c.measureText(str).width > maxW && size > 6) { size -= 0.5; c.font = `${weight} ${size}px ${family}`; }
  }
  function flower(c, x, y, r, petal, centre) {
    c.fillStyle = petal;
    for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3; c.beginPath(); c.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.75, 0, 7); c.fill(); }
    c.fillStyle = centre; c.beginPath(); c.arc(x, y, r * 0.6, 0, 7); c.fill();
  }

  /*
    Classic Indian goods truck, side view, facing right.
    Local units: 350 long, ~200 tall. (x, y) = rear end on the road.
    Bonnet nose, tall wooden body with painted panels, "taj" crown over the cab,
    striped bumper, fuel tank, mudflaps with tassels, nimbu-mirchi.
  */
  function drawTruck(c, x, y, s, o) {
    const pal = o.pal, t = o.t || 0;
    c.save(); c.translate(x, y);
    if (o.flip) { c.translate(TRUCK_LEN * s, 0); c.scale(-s, s); } else c.scale(s, s);
    c.textAlign = 'center';

    // shadow
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(178, 2, 182, 7, 0, 0, 7); c.fill();
    const wa = o.wheel || 0;
    [62, 112, 302].forEach((wx) => wheel(c, wx, -23, 23, wa, pal.accent));

    const bob = o.moving ? Math.sin(t * 16) * 0.9 : 0;
    c.translate(0, bob);

    // chassis, fuel tank, battery box
    c.fillStyle = '#25252b'; c.fillRect(4, -56, 340, 10);
    c.fillStyle = '#c3c7cf'; rr(c, 166, -58, 58, 22, 9); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(180, -58, 3, 22); c.fillRect(206, -58, 3, 22);
    c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(170, -55, 50, 3);
    c.fillStyle = '#1a1a1f'; c.fillRect(234, -52, 26, 16);
    // side reflectors
    c.fillStyle = '#ff9f1c'; for (let rx = 20; rx < 160; rx += 34) c.fillRect(rx, -50, 6, 3);

    // mudflaps with tassels
    c.fillStyle = '#121216';
    [[138, 146], [4, 11], [270, 276]].forEach(([a, b]) => c.fillRect(a, -54, b - a, 36));
    [142, 7.5, 273].forEach((mx) => {
      ['#e63946', '#ffd23f', '#2ec4b6'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(mx - 3 + i * 3, -16 + Math.sin(t * 9 + i) * 0.8, 1.7, 0, 7); c.fill(); });
    });

    // tarpaulin (overloaded bulge) with ropes
    c.fillStyle = pal.tarp;
    c.beginPath(); c.moveTo(8, -150); c.quadraticCurveTo(8, -180, 40, -182); c.lineTo(184, -182); c.quadraticCurveTo(214, -180, 214, -150); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.32)'; c.lineWidth = 1.3;
    for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(18 + i * 30, -181); c.lineTo(34 + i * 30, -150); c.stroke(); }
    c.beginPath(); c.moveTo(10, -166); c.lineTo(212, -166); c.stroke();

    // wooden body
    c.fillStyle = pal.body; c.fillRect(6, -152, 210, 98);
    c.strokeStyle = 'rgba(0,0,0,0.16)'; c.lineWidth = 1.3;
    for (let yy = -140; yy < -56; yy += 12) { c.beginPath(); c.moveTo(6, yy); c.lineTo(216, yy); c.stroke(); }
    for (let xx = 40; xx < 216; xx += 44) { c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(xx, -152, 3, 98); }
    // top band with bunting
    c.fillStyle = pal.trim; c.fillRect(6, -152, 210, 9);
    for (let i = 0; i < 17; i++) {
      c.fillStyle = i % 2 ? pal.accent : pal.cab;
      c.beginPath(); c.moveTo(8 + i * 12.3, -143); c.lineTo(20 + i * 12.3, -143); c.lineTo(14 + i * 12.3, -135); c.fill();
    }
    // painted panel 1: mountains + sun
    c.save(); rr(c, 14, -130, 82, 54, 6); c.clip();
    c.fillStyle = '#7ec8e3'; c.fillRect(14, -130, 82, 54);
    c.fillStyle = '#ffb703'; c.beginPath(); c.arc(76, -114, 9, 0, 7); c.fill();
    c.fillStyle = '#4361ee'; c.beginPath(); c.moveTo(10, -76); c.lineTo(40, -118); c.lineTo(66, -76); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(33, -108); c.lineTo(40, -118); c.lineTo(47, -108); c.fill();
    c.fillStyle = '#2b9348'; c.beginPath(); c.moveTo(44, -76); c.lineTo(72, -104); c.lineTo(100, -76); c.fill();
    c.restore();
    c.strokeStyle = pal.trim; c.lineWidth = 3; rr(c, 14, -130, 82, 54, 6); c.stroke();
    // painted panel 2: name / slogan medallion
    c.fillStyle = pal.trim; rr(c, 104, -130, 104, 54, 27); c.fill();
    c.strokeStyle = pal.accent; c.lineWidth = 2.5; rr(c, 108, -126, 96, 46, 23); c.stroke();
    c.fillStyle = pal.body;
    if (o.badge) {
      fitFont(c, o.badge, 86, 13, '"Baloo 2", sans-serif', 800);
      txt(c, o, o.badge, 156, -98);
    } else {
      const name = (o.name || 'USTAAD').toUpperCase().slice(0, 12);
      fitFont(c, name, 84, 16, 'Bungee, Impact, sans-serif', 400);
      txt(c, o, name, 156, -101);
      c.font = '700 8px "Baloo 2", sans-serif'; txt(c, o, 'ROADLINES', 156, -88);
    }
    // bottom band: national permit + slogan
    c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(6, -70, 210, 14);
    c.fillStyle = pal.trim;
    const band = o.slogan ? `NATIONAL PERMIT  ·  ${o.slogan}` : 'NATIONAL PERMIT  ·  HORN OK PLEASE';
    fitFont(c, band, 200, 9, '"Baloo 2", sans-serif', 800);
    txt(c, o, band, 111, -60);
    // rope hooks
    c.fillStyle = '#2a2a2a'; for (let hx = 14; hx < 216; hx += 22) c.fillRect(hx, -55, 3, 4);

    // headboard (front wall of body that rises above the cab)
    c.fillStyle = pal.accent; c.fillRect(214, -192, 14, 140);
    c.fillStyle = pal.trim; for (let i = 0; i < 6; i++) c.fillRect(216, -186 + i * 22, 10, 4);

    // exhaust pipe
    c.fillStyle = '#5b5d66'; c.fillRect(229, -200, 5, 150);
    c.fillStyle = '#33343a'; c.fillRect(227.5, -204, 8, 6);

    // cab
    c.fillStyle = pal.cab;
    c.beginPath(); c.moveTo(236, -50); c.lineTo(236, -150); c.lineTo(298, -150); c.lineTo(312, -110); c.lineTo(316, -58); c.lineTo(316, -50); c.closePath(); c.fill();
    // bonnet / hood
    c.beginPath(); c.moveTo(310, -110); c.quadraticCurveTo(330, -108, 346, -102); c.quadraticCurveTo(352, -100, 352, -92); c.lineTo(352, -58); c.lineTo(310, -58); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(314, -104); c.quadraticCurveTo(332, -100, 348, -94); c.stroke();
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(322 + i * 6, -92); c.lineTo(322 + i * 6, -78); c.stroke(); }
    c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(236, -64, 116, 14);
    // chrome grille edge
    c.fillStyle = '#d9dce3'; c.fillRect(348, -96, 5, 36);
    c.fillStyle = '#7b7f88'; for (let gy = -93; gy < -62; gy += 5) c.fillRect(348, gy, 5, 1.5);
    // window + driver
    c.fillStyle = o.night ? '#2b3a55' : '#a8dbea';
    c.beginPath(); c.moveTo(244, -143); c.lineTo(294, -143); c.lineTo(306, -113); c.lineTo(244, -113); c.closePath(); c.fill();
    c.fillStyle = '#3b2a20'; c.beginPath(); c.arc(272, -121, 7.5, 0, 7); c.fill();
    c.fillRect(263, -115, 18, 2);
    c.fillStyle = pal.accent; c.beginPath(); c.ellipse(271, -127, 9.5, 5.5, -0.1, 0, 7); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 2; c.beginPath(); c.moveTo(290, -140); c.lineTo(300, -117); c.stroke();
    // window frame paint
    c.strokeStyle = pal.trim; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(244, -143); c.lineTo(294, -143); c.lineTo(306, -113); c.lineTo(244, -113); c.closePath(); c.stroke();
    // door with painting
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1.5; c.strokeRect(244, -108, 54, 52);
    c.fillStyle = '#222'; c.fillRect(288, -98, 7, 2.5);
    flower(c, 262, -88, 5, pal.trim, pal.body);
    c.fillStyle = pal.trim; c.font = '800 6.5px "Baloo 2", sans-serif';
    txt(c, o, 'PUBLIC CARRIER', 271, -64);
    // front fender (black mudguard)
    c.fillStyle = '#1d1d22';
    c.beginPath(); c.moveTo(270, -50); c.quadraticCurveTo(302, -96, 336, -50); c.lineTo(330, -50); c.quadraticCurveTo(302, -86, 276, -50); c.closePath(); c.fill();
    // headlight
    c.fillStyle = '#d9dce3'; c.beginPath(); c.arc(342, -82, 7.5, 0, 7); c.fill();
    c.fillStyle = o.lights ? '#fff8cc' : '#d8d2b0'; c.beginPath(); c.arc(342, -82, 5, 0, 7); c.fill();
    c.fillStyle = '#ff9f1c'; c.fillRect(338, -70, 8, 3);
    // striped bumper
    c.save(); c.beginPath(); c.rect(326, -58, 30, 12); c.clip();
    c.fillStyle = '#ffd23f'; c.fillRect(326, -58, 30, 12);
    c.fillStyle = '#1b1b1b';
    for (let bx = 320; bx < 360; bx += 8) { c.beginPath(); c.moveTo(bx, -46); c.lineTo(bx + 4, -46); c.lineTo(bx + 12, -58); c.lineTo(bx + 8, -58); c.fill(); }
    c.restore();
    // mirror + black tassel
    c.strokeStyle = '#333'; c.lineWidth = 2; c.beginPath(); c.moveTo(306, -128); c.lineTo(320, -136); c.stroke();
    c.fillStyle = '#333'; c.fillRect(318, -150, 6, 16);
    c.strokeStyle = '#111'; c.lineWidth = 1.5;
    const tw = Math.sin(t * 7) * 2;
    c.beginPath(); c.moveTo(321, -134); c.lineTo(321 + tw, -118); c.stroke();
    c.fillStyle = '#e63946'; c.beginPath(); c.arc(321 + tw, -117, 2, 0, 7); c.fill();

    // taj (painted crown over the cab)
    c.fillStyle = pal.accent;
    c.beginPath(); c.moveTo(214, -192); c.lineTo(298, -182); c.lineTo(324, -166); c.lineTo(314, -156); c.lineTo(236, -151); c.lineTo(214, -151); c.closePath(); c.fill();
    c.strokeStyle = pal.trim; c.lineWidth = 3;
    c.beginPath(); c.moveTo(218, -176); c.lineTo(300, -170); c.lineTo(318, -162); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 8; i++) { c.beginPath(); c.arc(224 + i * 11, -160 - i * 0.3, 1.7, 0, 7); c.fill(); }
    flower(c, 250, -181, 3, pal.trim, pal.cab);
    flower(c, 282, -178, 3, pal.trim, pal.cab);
    LAMP_X.forEach((lx, i) => { c.fillStyle = lampColor(i, o); c.beginPath(); c.arc(lx, lampY(lx), 3.2, 0, 7); c.fill(); });

    // nimbu-mirchi on the bumper
    const sw = Math.sin(t * 6) * 3;
    c.strokeStyle = '#222'; c.lineWidth = 1; c.beginPath(); c.moveTo(340, -46); c.lineTo(340 + sw, -32); c.stroke();
    c.fillStyle = '#e8e23a'; c.beginPath(); c.arc(340 + sw, -30, 3.2, 0, 7); c.fill();
    c.strokeStyle = '#2b9348'; c.lineWidth = 2;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(338 + sw + i * 2, -27); c.lineTo(337 + sw * 1.2 + i * 2, -19); c.stroke(); }

    // tail light + reflector
    c.fillStyle = o.lights ? '#ff2a2a' : '#7a1d1d'; c.fillRect(2, -80, 6, 12);
    c.fillStyle = '#ff9f1c'; c.fillRect(2, -66, 6, 5);
    c.textAlign = 'left';
    c.restore();
  }

  // additive glows (drawn after night tint so they shine). Only for the player's (unflipped) truck.
  function drawTruckGlow(c, x, y, s, o) {
    c.save(); c.globalCompositeOperation = 'lighter';
    const hx = x + 346 * s, hy = y - 82 * s;
    if (o.lights) {
      const g = c.createLinearGradient(hx, hy, hx + 480 * s, hy);
      g.addColorStop(0, 'rgba(255,240,180,0.55)'); g.addColorStop(1, 'rgba(255,240,180,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(hx, hy - 4 * s); c.lineTo(hx + 480 * s, hy - 60 * s); c.lineTo(hx + 480 * s, hy + 80 * s); c.closePath(); c.fill();
      const tx = x + 5 * s, ty = y - 74 * s;
      const tg = c.createRadialGradient(tx, ty, 0, tx, ty, 28 * s);
      tg.addColorStop(0, 'rgba(255,40,40,0.6)'); tg.addColorStop(1, 'rgba(255,40,40,0)');
      c.fillStyle = tg; c.beginPath(); c.arc(tx, ty, 28 * s, 0, 7); c.fill();
    }
    if (o.lights || o.disco) {
      LAMP_X.forEach((lxl, i) => {
        const lx = x + lxl * s, ly = y + lampY(lxl) * s;
        const col = C(lampColor(i, o));
        const g = c.createRadialGradient(lx, ly, 0, lx, ly, 14 * s);
        g.addColorStop(0, css(col, 0.8)); g.addColorStop(1, css(col, 0));
        c.fillStyle = g; c.beginPath(); c.arc(lx, ly, 14 * s, 0, 7); c.fill();
      });
    }
    if (o.disco) {
      const hue = (o.t * 160) % 360;
      const g = c.createRadialGradient(x + 178 * s, y, 0, x + 178 * s, y, 200 * s);
      g.addColorStop(0, `hsla(${hue},100%,60%,0.55)`); g.addColorStop(1, `hsla(${hue},100%,60%,0)`);
      c.fillStyle = g; c.beginPath(); c.ellipse(x + 178 * s, y, 200 * s, 26 * s, 0, 0, 7); c.fill();
    }
    if (o.honk) {
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 3 * s;
      for (let i = 0; i < 3; i++) {
        const r = (14 + ((o.t * 90 + i * 18) % 54)) * s;
        c.globalAlpha = 1 - (r / s - 14) / 54;
        c.beginPath(); c.arc(hx + 12 * s, hy, r, -0.7, 0.7); c.stroke();
      }
    }
    c.restore();
  }

  function drawBike(x, y, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(-s, s);
    const b = Math.sin(time * 18 + t.seed) * 0.6;
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2.6;
    [0, 30].forEach((wx) => { ctx.beginPath(); ctx.arc(wx, -8, 8, 0, 7); ctx.stroke(); });
    ctx.translate(0, b);
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(14, -17); ctx.lineTo(30, -8); ctx.stroke();
    ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.ellipse(17, -19, 7, 3.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#7a4a26'; ctx.fillRect(-6, -27, 12, 10);
    ctx.strokeStyle = t.col; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(12, -20); ctx.lineTo(13, -36); ctx.stroke();
    ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(14, -32); ctx.lineTo(26, -24); ctx.stroke();
    ctx.fillStyle = '#1b1b1b'; ctx.beginPath(); ctx.arc(14, -41, 6, 0, 7); ctx.fill();
    ctx.fillStyle = t.col; ctx.fillRect(13, -45, 6, 3);
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-5, -27); ctx.lineTo(-5, -52); ctx.stroke();
    ctx.fillStyle = FLAG_COLS[Math.floor(t.seed) % 5];
    ctx.beginPath(); ctx.moveTo(-5, -52); ctx.lineTo(-17 + Math.sin(time * 10) * 2, -48); ctx.lineTo(-5, -44); ctx.fill();
    ctx.restore();
  }
  function drawArmy(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(-s, s);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(75, 1, 80, 5, 0, 0, 7); ctx.fill();
    [22, 50, 130].forEach((wx) => wheel(ctx, wx, -12, 12, -time * 6, '#3b3b2a'));
    ctx.fillStyle = '#4b5320'; rr(ctx, 0, -80, 112, 60, 10); ctx.fill();
    ctx.fillStyle = '#3c4219'; ctx.fillRect(0, -26, 150, 8);
    ctx.fillStyle = '#55602a'; ctx.beginPath(); ctx.moveTo(114, -24); ctx.lineTo(114, -62); ctx.lineTo(138, -62); ctx.lineTo(150, -40); ctx.lineTo(150, -24); ctx.fill();
    ctx.fillStyle = '#9fb7a6'; ctx.fillRect(120, -58, 16, 14);
    ctx.fillStyle = '#f4f4f4'; ctx.font = '400 10px Bungee, sans-serif'; ctx.save(); ctx.scale(-1, 1); ctx.fillText('★ INDIAN ARMY', -100, -45); ctx.restore();
    ctx.restore();
  }
  function drawTaxi(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(-s, s);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(45, 1, 50, 4, 0, 0, 7); ctx.fill();
    [18, 72].forEach((wx) => wheel(ctx, wx, -11, 11, -time * 8, '#888'));
    ctx.fillStyle = '#f4f4f4'; rr(ctx, 0, -46, 92, 28, 6); ctx.fill();
    ctx.beginPath(); ctx.moveTo(10, -46); ctx.lineTo(18, -64); ctx.lineTo(66, -64); ctx.lineTo(80, -46); ctx.fill();
    ctx.fillStyle = '#9fd3e6'; ctx.fillRect(22, -60, 20, 12); ctx.fillRect(46, -60, 20, 12);
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(0, -32, 92, 4);
    ctx.fillStyle = '#d62839'; ctx.fillRect(18, -72, 10, 8); ctx.fillStyle = '#2b6cd6'; ctx.fillRect(30, -72, 14, 8); ctx.fillStyle = '#ffd23f'; ctx.fillRect(46, -70, 10, 6);
    ctx.restore();
  }

  /* ---------- real route photos as the far backdrop ---------- */
  const photoImgs = {};
  let photoIdx = -1;
  function photoImg(i) {
    const p = ROUTE_PHOTOS[i]; if (!p) return null;
    if (!photoImgs[i]) { const im = new Image(); im.decoding = 'async'; im.src = p.file; photoImgs[i] = im; }
    const im = photoImgs[i];
    return im.complete && im.naturalWidth ? im : null;
  }
  function photoIndexAt(k) {
    let i = 0; while (i < ROUTE_PHOTOS.length - 1 && ROUTE_PHOTOS[i + 1].km <= k) i++; return i;
  }
  // Draw an image "cover"-style into (0,0,W,h), slowly panning with progress t (0..1).
  function coverImage(im, h, t, alpha) {
    const zoom = 1.12;
    const s = Math.max(W / im.naturalWidth, h / im.naturalHeight) * zoom;
    const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
    const x = -(dw - W) * (0.15 + 0.7 * t);       // drift left as the truck moves right
    const y = -(dh - h) * 0.55;
    ctx.globalAlpha = alpha; ctx.drawImage(im, x, y, dw, dh); ctx.globalAlpha = 1;
  }
  // Returns true when a photo was drawn (art sky/mountains are skipped then).
  function drawPhotoBackdrop(k, hr, night, h) {
    const i = photoIndexAt(k);
    if (i !== photoIdx) { photoIdx = i; emit('photo', ROUTE_PHOTOS[i], i); }
    photoImg(i + 1); photoImg(i + 2);                // preload what's coming
    const cur = photoImg(i); if (!cur) return false;
    const a = ROUTE_PHOTOS[i], b = ROUTE_PHOTOS[i + 1];
    const segEnd = b ? b.km : ROUTE_KM + 10;
    const t = clamp((k - a.km) / Math.max(1, segEnd - a.km), 0, 1);
    coverImage(cur, h, t, 1);
    if (b) {                                          // crossfade over the last 6 km
      const f = clamp((k - (b.km - 6)) / 6, 0, 1);
      const nxt = photoImg(i + 1);
      if (f > 0 && nxt) coverImage(nxt, h, 0, f);
    }
    // time-of-day grade: warm at dawn/dusk, deep blue at night
    const dusk = Math.max(clamp(1 - Math.abs(hr - 18.2) / 1.6, 0, 1), clamp(1 - Math.abs(hr - 6.2) / 1.3, 0, 1));
    if (dusk > 0) { ctx.fillStyle = `rgba(255,110,50,${0.28 * dusk})`; ctx.fillRect(0, 0, W, h); }
    if (night > 0) { ctx.fillStyle = `rgba(8,12,45,${0.72 * night})`; ctx.fillRect(0, 0, W, h); }
    // soft top shade so the title stays readable on bright skies
    const g = ctx.createLinearGradient(0, 0, 0, h * 0.4);
    g.addColorStop(0, 'rgba(10,6,30,0.45)'); g.addColorStop(1, 'rgba(10,6,30,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, h * 0.4);
    return true;
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const k = kmNow(), alt = altAt(k), { hr } = clockAt(k);
    const day = daylight(hr), night = 1 - day;
    const green = clamp(1 - (k - 45) / 55, 0, 1), ladakh = clamp((k - 170) / 80, 0, 1);
    const roadH = 64 * S + 26, farEdge = base - roadH * 0.78, nearEdge = base + roadH * 0.22;
    const tc = truckX + (TRUCK_LEN * S) / 2;

    // sky
    const [top, bot] = skyAt(hr);
    const g = ctx.createLinearGradient(0, 0, 0, farEdge);
    g.addColorStop(0, css(top)); g.addColorStop(1, css(bot));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const photo = st.photo && drawPhotoBackdrop(k, hr, night, farEdge + 30 * S);
    if (night > 0.05) for (const s of stars) {
      ctx.fillStyle = `rgba(255,255,255,${night * (photo ? 0.8 : 1) * (0.45 + 0.55 * Math.sin(time * 2 + s.p))})`;
      ctx.fillRect(s.x, s.y * (photo ? 0.55 : 1), s.r, s.r);
    }
    drawSunMoon(hr, photo);

    // mountains (art mode only — the photo already has real ones)
    if (!photo) {
      const snowFrac = 0.28 + 0.3 * clamp((alt - 2500) / 2600, 0, 1);
      const farCol = m(m(m('#a9bbdc', '#b9a6bd', ladakh * 0.7), bot, 0.25), '#1e2652', night * 0.75);
      drawPeaks(0.05, 300 * S, farEdge, farEdge * 0.3, farEdge * 0.6, farCol, m('#f6f9ff', '#8a96c4', night * 0.7), snowFrac, 7);
      const midAmp = farEdge * 0.3, midBy = farEdge + 2;
      const midCol = m(m(m('#7d8aa3', '#4e6d61', green * 0.8), '#a88f88', ladakh), '#161d3d', night * 0.75);
      drawRidge(MID, midBy, midAmp, midCol);
      drawLoops(midBy, midAmp, night);
    }
    const nearAmp = farEdge * 0.14, nearBy = farEdge + 6;
    const nearCol = m(m(m('#a3825f', '#3f7444', green), '#c8a47a', ladakh), '#121730', night * 0.78);
    drawRidge(NEAR, nearBy, nearAmp, nearCol);

    // trees, chortens & flags on the near ridge
    const off = st.x * NEAR.par;
    if (green > 0.02) {
      const tcol = m('#1e4a31', '#0a0f22', night * 0.8);
      const i0 = Math.floor((off - 30) / 13), i1 = Math.ceil((off + W + 30) / 13);
      for (let i = i0; i <= i1; i++) {
        if (h1(i, 9) > green * 0.6) continue;
        const x = i * 13 - off;
        pine(x, ridgeY(NEAR, nearBy, nearAmp, x) + 10 * S, (18 + h1(i, 10) * 20) * S, tcol);
      }
    }
    if (ladakh > 0.2) {
      const i0 = Math.floor((off - 60) / 95), i1 = Math.ceil((off + W + 60) / 95);
      for (let i = i0; i <= i1; i++) {
        const x = i * 95 - off, r = h1(i, 11);
        if (r < 0.1 * ladakh) chorten(x, ridgeY(NEAR, nearBy, nearAmp, x) + 6 * S, S, night);
        else if (r > 0.93) flagLine(x, ridgeY(NEAR, nearBy, nearAmp, x) - 8 * S, x + 70 * S, ridgeY(NEAR, nearBy, nearAmp, x + 70 * S) - 8 * S, S, 10 * S);
      }
    }

    // road
    ctx.fillStyle = css(m(m('#8b7357', '#b49a76', ladakh), '#121424', night * 0.8));
    ctx.fillRect(0, farEdge - 7 * S, W, H);
    ctx.fillStyle = css(m('#4a4a55', '#1b1c29', night * 0.75));
    ctx.fillRect(0, farEdge, W, nearEdge - farEdge);
    const cy = lerp(farEdge, nearEdge, 0.48), dash = 40 * S, gap = 36 * S;
    ctx.fillStyle = css(m('#f5f0e1', '#6a6c88', night * 0.6));
    for (let x = -(st.x % (dash + gap)); x < W; x += dash + gap) ctx.fillRect(x, cy - 1.5 * S, dash, 3 * S);
    ctx.fillStyle = css(m('#6f5a45', '#0d0f1d', night * 0.8));
    ctx.fillRect(0, nearEdge + 6 * S, W, H);

    // stop objects behind the road
    for (const stop of STOPS) {
      const sx = stop.km * PX_PER_KM - st.x + tc;
      if (sx > -420 * S && sx < W + 320 * S) drawStopObject(stop, sx, farEdge - 2, night, k);
    }
    {
      const ex = (TUNNEL.km + TUNNEL.len) * PX_PER_KM - st.x + tc;
      if (ex > -300 && ex < W + 300) drawStopObject({ ...TUNNEL, type: 'tunnel', en: 'NORTH PORTAL' }, ex, farEdge - 2, night, k);
    }

    // traffic (far lane)
    const laneY = lerp(farEdge, nearEdge, 0.36);
    for (const t of traffic) {
      const sx = t.x - st.x + truckX;
      if (sx < -300 || sx > W + 300) continue;
      if (t.type === 'bike') drawBike(sx, laneY, S * 0.9, t);
      else if (t.type === 'army') drawArmy(sx, laneY, S * 0.85);
      else if (t.type === 'truck') drawTruck(ctx, sx, laneY, S * 0.78, { pal: t.pal, badge: t.slogan, slogan: t.slogan, flip: true, t: time, wheel: time * 5, moving: true, lights: false, night: false });
      else drawTaxi(sx, laneY, S * 0.85);
    }

    // truck
    const o = { ...st.truck, t: time, wheel: st.x / 22, moving: st.speed > 0.02 || st.engine, lights: st.lights, disco: st.disco, honk: st.honk, night: night > 0.5 };
    drawTruck(ctx, truckX, base, S, o);

    // foreground: guard stones + milestones
    const gs = 64, gi0 = Math.floor((st.x - tc - 60) / gs), gi1 = Math.ceil((st.x - tc + W + 60) / gs);
    for (let i = gi0; i <= gi1; i++) {
      const x = i * gs - st.x + tc, y = nearEdge + 2 * S;
      ctx.fillStyle = css(m('#f6c90e', '#4a3f1a', night * 0.6)); ctx.fillRect(x, y, 10 * S, 6 * S);
      ctx.fillStyle = css(m('#1b1b1b', '#09090f', night * 0.6)); ctx.fillRect(x, y + 6 * S, 10 * S, 6 * S);
    }
    const mi0 = Math.ceil((st.x - tc - 60) / (PX_PER_KM * 10)), mi1 = Math.floor((st.x - tc + W + 60) / (PX_PER_KM * 10));
    for (let i = Math.max(1, mi0); i <= Math.min(47, mi1); i++) {
      const x = i * 10 * PX_PER_KM - st.x + tc, y = nearEdge + 12 * S;
      const w = 24 * S, hh = 32 * S;
      ctx.fillStyle = css(m('#f4f4f4', '#6b6e8a', night * 0.55)); rr(ctx, x, y - hh, w, hh, 3 * S); ctx.fill();
      ctx.fillStyle = css(m('#f6c90e', '#6e5f1f', night * 0.55));
      ctx.beginPath(); ctx.arc(x + w / 2, y - hh + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w, y - hh + 14 * S); ctx.lineTo(x, y - hh + 14 * S); ctx.fill();
      ctx.fillStyle = '#1b1b1b'; ctx.textAlign = 'center';
      ctx.font = `700 ${7 * S}px "Baloo 2", sans-serif`; ctx.fillText('LEH', x + w / 2, y - hh + 11 * S);
      ctx.font = `800 ${9 * S}px "Baloo 2", sans-serif`; ctx.fillText(String(ROUTE_KM - i * 10), x + w / 2, y - 7 * S);
      ctx.textAlign = 'left';
    }

    // exhaust
    for (const p of puffs) {
      ctx.fillStyle = `rgba(${night > 0.5 ? '120,125,150' : '200,200,205'},${0.35 * (1 - p.life / 1.6)})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    }

    // night tint
    if (night > 0) { ctx.fillStyle = `rgba(8,10,40,${night * 0.28})`; ctx.fillRect(0, 0, W, H); }

    // tunnel darkness
    if (k > TUNNEL.km - 0.5 && k < TUNNEL.km + TUNNEL.len + 0.5) {
      const d = Math.min(k - TUNNEL.km, TUNNEL.km + TUNNEL.len - k);
      const a = clamp((d + 0.3) / 0.8, 0, 1) * 0.82;
      ctx.fillStyle = `rgba(6,6,12,${a})`; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const ly = base - 210 * S;
      for (let x = -(st.x % 150); x < W + 150; x += 150) {
        const lg = ctx.createRadialGradient(x, ly, 0, x, ly, 60 * S);
        lg.addColorStop(0, `rgba(255,170,60,${a * 0.9})`); lg.addColorStop(1, 'rgba(255,170,60,0)');
        ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(x, ly, 60 * S, 0, 7); ctx.fill();
      }
      ctx.restore();
    }

    drawTruckGlow(ctx, truckX, base, S, o);

    if (flakes.length) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (const f of flakes) { ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill(); }
    }
  }

  /* ---------- public ---------- */
  function info() {
    const k = kmNow(), c = clockAt(k);
    return { km: k, kmLeft: Math.max(0, ROUTE_KM - k), alt: altAt(k), hr: c.hr, mins: c.mins, day: c.day, speed: st.speed, mult: st.mult, arrived: st.arrived };
  }
  function set(p) { Object.assign(st, p); }
  function reset() {
    st.x = 0; st.speed = 0; st.arrived = false; nextStop = 1; inTunnel = false; photoIdx = -1;
    traffic.length = 0; puffs.length = 0;
  }
  function on(n, fn) { cbs[n] = fn; }

  return { init, start, set, get: () => st, info, reset, on, setBottomInset, drawTruck, drawTruckGlow, TRUCK_LEN };
})();
