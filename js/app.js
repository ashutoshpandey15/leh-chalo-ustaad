/* Glue: intro, HUD cards, YouTube player, controls, keyboard, sharing. */
(() => {
  const $ = (s) => document.querySelector(s);
  const store = {
    get(k, d) { try { const v = localStorage.getItem('lcu:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('lcu:' + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
  };
  const fmtINR = (n) => Math.round(n).toLocaleString('en-IN');
  const mmss = (s) => { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const pick = (a) => a[(Math.random() * a.length) | 0];
  const isMobile = () => innerWidth < 760;

  /* ---------- state ---------- */
  const saved = store.get('truck', null);
  let truckCfg = {
    pal: PALETTES.find((p) => saved && p.id === saved.palId) || PALETTES[0],
    name: (saved && saved.name) || '',
    slogan: (saved && saved.slogan) || SLOGANS[0],
    plate: (saved && saved.plate) || 'HP 66 LC 474',
  };
  const G = { started: false, horns: 0, songs: new Set(), maggi: 0, diesel: 100, lastKm: 0, t0: 0, quoteLock: 0 };

  /* ---------- toast ---------- */
  let toastTimer = 0;
  function toast(msg) {
    const t = $('#toast');
    // an open dialog sits in the browser's top layer, so move the toast inside it to stay visible
    const host = document.querySelector('dialog[open]') || document.body;
    if (t.parentElement !== host) host.appendChild(t);
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  }

  /* ---------- intro truck ---------- */
  const introCv = $('#introTruck'), ictx = introCv.getContext('2d');
  let introRaf = 0;
  function drawIntro(ts) {
    const t = ts / 1000, w = introCv.width, h = introCv.height;
    ictx.clearRect(0, 0, w, h);
    ictx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 9; i++) { const x = ((i * 70 - t * 120) % (w + 70) + w + 70) % (w + 70) - 35; ictx.fillRect(x, h - 22, 38, 4); }
    const s = (w - 40) / (Scene.TRUCK_LEN + 10);
    Scene.drawTruck(ictx, 20, h - 30, s, { pal: truckCfg.pal, name: truckCfg.name || 'USTAAD', slogan: (truckCfg.slogan || '').trim(), t, wheel: t * 6, moving: true, lights: true, disco: false });
    Scene.drawTruckGlow(ictx, 20, h - 30, s, { pal: truckCfg.pal, t, lights: true, disco: false });
    introRaf = requestAnimationFrame(drawIntro);
  }

  /* ---------- scene ---------- */
  Scene.init($('#scene'));
  applyTruck();
  function applyTruck() {
    Scene.set({ truck: { pal: truckCfg.pal, name: truckCfg.name || 'USTAAD', slogan: (truckCfg.slogan || '').trim() } });
    store.set('truck', { palId: truckCfg.pal.id, name: truckCfg.name, slogan: truckCfg.slogan, plate: truckCfg.plate });
  }
  function measureInset() {
    document.documentElement.style.setProperty('--player-h', $('.player').offsetHeight + 'px');
    const els = isMobile() ? [$('.controls'), $('.player')] : [$('.player')];
    const top = Math.min(...els.map((e) => e.getBoundingClientRect().top));
    Scene.setBottomInset(innerHeight - top + (isMobile() ? 18 : 34));
  }
  addEventListener('resize', () => { if (G.started) measureInset(); });
  if (window.ResizeObserver) new ResizeObserver(() => { if (G.started) measureInset(); }).observe($('.player'));

  /* ---------- quotes ---------- */
  function say(who, text, lockSec = 9) {
    const box = $('#quote');
    $('#quoteWho').textContent = who; $('#quoteText').textContent = text;
    box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
    G.quoteLock = Date.now() + lockSec * 1000;
  }
  setInterval(() => { if (G.started && Date.now() > G.quoteLock) { const q = pick(QUOTES); say(q[0], q[1], 0); } }, 9000);

  // road wisdom under the title + slogan ticker on the intro
  let roadIdx = 0;
  setInterval(() => {
    if (!G.started) return;
    roadIdx = (roadIdx + 1) % ROAD_LINES.length;
    const el = $('.subtitle'); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    el.textContent = ROAD_LINES[roadIdx];
  }, 12000);
  (function ticker() {
    const items = [...SLOGANS, ...ROAD_LINES].map((s) => `<span>${s.replace(/</g, '&lt;')}</span>`).join('<i>✦</i>');
    $('#tickerTrack').innerHTML = items + '<i>✦</i>' + items + '<i>✦</i>';
  })();

  /* ---------- HUD ---------- */
  function partOfDay(h) { return h < 4 ? 'RAAT' : h < 12 ? 'SUBAH' : h < 16 ? 'DOPAHAR' : h < 19.5 ? 'SHAAM' : 'RAAT'; }
  function clockText(i) {
    const mins = Math.floor(i.mins) % 1440, h = Math.floor(mins / 60), mi = mins % 60;
    const h12 = ((h + 11) % 12) + 1;
    return `DIN ${i.day} · ${partOfDay(i.hr)} ${h12}:${String(mi).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  }
  function setStop(stop) {
    $('#stopName').textContent = stop.en;
    $('#stopHindi').textContent = stop.hi;
    const card = $('.now'); card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop');
  }
  function menuFor(stop) {
    const items = (stop.km > 170 ? MENU_LADAKH : MENU_HIMACHAL).map(([n, p]) => [n, Math.round((p * (1 + (stop.alt - 2000) / 2200)) / 5) * 5]);
    if (stop.alt > 4000) items.push(['Oxygen ki ek saans', 'FREE']);
    if (stop.km > 170) items.push(['Raat ka kambal', 100]);
    return items;
  }
  function showMenu(stop) {
    $('#dhabaName').textContent = stop.dhaba;
    $('#dhabaAlt').textContent = `${stop.en} · ${fmtINR(stop.alt)} m`;
    $('#menu').innerHTML = menuFor(stop).map(([n, p]) => `<li><span>${n}</span><b>${typeof p === 'number' ? '₹' + p : p}</b></li>`).join('');
    const maggi = menuFor(stop)[0][1];
    $('#menuNote').textContent = maggi > 60 ? `Manali mein ₹40 thi. Yahan ₹${maggi}. Isse kehte hain ooncha rate.` : 'Upar jaate jaate Maggi mehengi hoti jaayegi.';
  }
  function switchTab(name) {
    document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
    $('#tab-bhada').hidden = name !== 'bhada'; $('#tab-dhaba').hidden = name !== 'dhaba';
  }
  document.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => switchTab(b.dataset.tab)));
  showMenu(STOPS.find((s) => s.type === 'dhaba'));
  $('#menuNote').textContent = 'Agla dhaba: Sissu. Upar jaate jaate Maggi mehengi hoti jaayegi.';

  function hud() {
    if (!G.started) return;
    const i = Scene.info();
    $('#clock').textContent = clockText(i);
    $('#alt').textContent = fmtINR(i.alt);
    $('#kmLeft').textContent = Math.ceil(i.kmLeft);
    const o2 = Math.round(100 * Math.exp(-i.alt / 8000));
    $('#o2').textContent = o2; $('#o2bar').style.width = o2 + '%';
    const d = i.km - G.lastKm; G.lastKm = i.km; G.diesel = Math.max(3, G.diesel - d * 0.13);
    $('#diesel').textContent = Math.round(G.diesel); $('#dieselBar').style.width = G.diesel + '%';
    $('#dieselBar').classList.toggle('low', G.diesel < 25);
    const kmh = i.speed < 0.02 ? 0 : Math.round(i.speed * 34 + Math.sin(Date.now() / 700) * 1.5);
    $('#speed').textContent = kmh;
    $('#hornCount').textContent = G.horns;
  }
  setInterval(hud, 250);

  /* ---------- online counter (simulated) ---------- */
  let online = 0;
  function tickOnline() {
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    const target = 900 + 700 * (0.5 + 0.5 * Math.sin(((h - 16) / 24) * Math.PI * 2));
    online = online ? online + (target - online) * 0.05 + (Math.random() - 0.5) * 14 : target;
    $('#onlineCount').textContent = fmtINR(online);
  }
  tickOnline(); setInterval(tickOnline, 3000);

  /* ---------- music (see music.js) ---------- */
  let openMusicAfterStart = false, openDrawerAfterStart = false;
  Music.init({ toast, onPlay: (id) => id && G.songs.add(id) }).then(({ justLoggedIn, sharedName, sharedCount }) => {
    if (justLoggedIn) { openMusicAfterStart = true; toast('✅ Spotify connect ho gaya! Gaadi nikalo, phir playlist chuno.'); }
    if (sharedName) {
      openDrawerAfterStart = true;
      const note = $('#sharedNote');
      note.textContent = `🎧 Dost ne playlist bheji: "${sharedName}" · ${sharedCount} gaane — gaadi nikalo, yahi bajegi!`;
      note.hidden = false;
    }
  });
  $('#listBtn').onclick = () => { const p = $('#playlist'); p.hidden = !p.hidden; };
  $('#playlistClose').onclick = () => ($('#playlist').hidden = true);
  $('#playlistOwn').onclick = () => { $('#playlist').hidden = true; Music.openDialog(); };

  /* ---------- wallpapers ---------- */
  const credit = (w) => `📷 ${w.title} — ${w.author}, ${w.license}`;
  (function introBackdrop() {
    const layers = [...document.querySelectorAll('.intro-bg .bg')];
    const order = WALLPAPERS.map((_, i) => i).sort(() => Math.random() - 0.5);
    let n = 0, cur = 0;
    const show = () => {
      const w = WALLPAPERS[order[n % order.length]];
      const img = new Image();
      img.onload = () => {
        cur = 1 - cur;
        layers[cur].style.backgroundImage = `url("${w.file}")`;
        layers[cur].classList.remove('kb'); void layers[cur].offsetWidth; layers[cur].classList.add('kb');
        layers[cur].classList.add('on'); layers[1 - cur].classList.remove('on');
        const c = $('#introCredit'); c.textContent = credit(w); c.href = w.source;
      };
      img.src = w.file; n++;
    };
    show(); const timer = setInterval(() => { if ($('#intro').hidden) clearInterval(timer); else show(); }, 6500);
  })();
  function openWalls() {
    const grid = $('#wallGrid');
    if (!grid.children.length) {
      WALLPAPERS.forEach((w) => {
        const fig = document.createElement('figure');
        const img = document.createElement('img'); img.src = w.file; img.alt = w.title; img.loading = 'lazy';
        const cap = document.createElement('figcaption');
        const t = document.createElement('b'); t.textContent = w.title;
        const by = document.createElement('small');
        const a1 = document.createElement('a'); a1.href = w.source; a1.target = '_blank'; a1.rel = 'noopener'; a1.textContent = w.author;
        const a2 = document.createElement('a'); a2.href = w.licenseUrl; a2.target = '_blank'; a2.rel = 'noopener'; a2.textContent = w.license;
        by.append('📷 ', a1, ' · ', a2);
        const dl = document.createElement('a'); dl.className = 'wall-dl'; dl.href = w.file; dl.download = w.file.split('/').pop(); dl.textContent = '⬇ Download';
        cap.append(t, by, dl); fig.append(img, cap); grid.appendChild(fig);
      });
    }
    $('#wallDialog').showModal();
  }
  $('#wallClose').onclick = () => $('#wallDialog').close();
  $('#wallDialog').addEventListener('click', (e) => { if (e.target === $('#wallDialog')) $('#wallDialog').close(); });
  $('#introWalls').onclick = openWalls;

  /* ---------- controls ---------- */
  function setToggle(id, on) { const b = $(id); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }
  function toggleLights(force) {
    const on = typeof force === 'boolean' ? force : !Scene.get().lights;
    Scene.set({ lights: on }); setToggle('#btnLights', on);
  }
  function toggleDisco() {
    const on = !Scene.get().disco; Scene.set({ disco: on }); setToggle('#btnDisco', on);
    document.body.classList.toggle('disco', on);
    if (on) say('KHALASI BOLA', 'उस्ताद, डिस्को लाइट! अब ये ट्रक नहीं, चलता-फिरता शादी का पंडाल है.', 6);
  }
  function toggleEngine() {
    const on = !Scene.get().engine; Scene.set({ engine: on }); setToggle('#btnEngine', on);
    on ? Sfx.engineOn() : Sfx.engineOff();
    if (!on) say('USTAAD BOLE', 'इंजन बंद. पाँच मिनट चाय ब्रेक.', 6);
  }
  function speed(dir) {
    const m = Math.round(Math.max(0.4, Math.min(2.4, Scene.get().mult + dir * 0.4)) * 10) / 10;
    Scene.set({ mult: m }); Sfx.engineSet(m);
    if (m >= 2.4) say('KHALASI BOLA', 'उस्ताद धीरे! ये पहाड़ है, यमुना एक्सप्रेसवे नहीं.', 5);
    toast(`Gear ${Math.round(m / 0.4)} · ${m}x speed`);
  }
  function hornDown() {
    if (Scene.get().honk) return;
    Sfx.hornStart(); Scene.set({ honk: true }); G.horns++;
    $('#horn').classList.add('on');
  }
  function hornUp() { Sfx.hornStop(); Scene.set({ honk: false }); $('#horn').classList.remove('on'); }
  function tuneHorn() { Sfx.tune(); G.horns++; Scene.set({ honk: true }); setTimeout(() => Scene.set({ honk: false }), 1700); }

  const horn = $('#horn');
  horn.addEventListener('pointerdown', (e) => { e.preventDefault(); horn.setPointerCapture(e.pointerId); hornDown(); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => horn.addEventListener(ev, hornUp));
  horn.addEventListener('contextmenu', (e) => e.preventDefault());
  horn.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); e.stopPropagation(); hornDown(); } });
  horn.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); hornUp(); } });

  $('#btnLights').onclick = () => toggleLights();
  $('#btnDisco').onclick = toggleDisco;
  $('#btnEngine').onclick = toggleEngine;
  $('#btnTune').onclick = tuneHorn;
  $('#btnFaster').onclick = () => speed(1);
  $('#btnSlower').onclick = () => speed(-1);
  $('#btnPaint').onclick = openPaint;
  $('#btnWalls').onclick = openWalls;
  $('#btnPhoto').onclick = () => togglePhoto();

  /* ---------- photo backdrop (real route photos) vs art mode ---------- */
  function showCredit(p) {
    const c = $('#photoCredit');
    if (!p || !Scene.get().photo) { c.hidden = true; return; }
    c.textContent = `📷 ${p.place} — ${p.author}, ${p.license}`; c.href = p.source; c.hidden = false;
  }
  let lastPhoto = null;
  Scene.on('photo', (p) => { lastPhoto = p; showCredit(p); });
  function togglePhoto(force) {
    const on = typeof force === 'boolean' ? force : !Scene.get().photo;
    Scene.set({ photo: on }); setToggle('#btnPhoto', on); store.set('photo', on);
    $('#btnPhoto span:last-child').textContent = on ? 'Asli Photo View' : 'Art View';
    $('#btnPhoto .ic').textContent = on ? '🏞️' : '🎨';
    showCredit(lastPhoto);
    if (G.started && typeof force !== 'boolean') toast(on ? '🏞️ Asli photo view — real Manali–Leh!' : '🎨 Art view — halka aur fast');
  }
  togglePhoto(store.get('photo', true));
  $('#btnLedger').onclick = () => $('.ledger').classList.toggle('open');
  $('#ledgerClose').onclick = () => $('.ledger').classList.remove('open');

  function openPaint() {
    Custom.open(truckCfg, (c) => {
      truckCfg = c; applyTruck();
      say('KHALASI BOLA', `वाह उस्ताद! "${(c.slogan || SLOGANS[0]).trim()}" — अब तो लेह वाले भी फ़ोटो लेंगे.`, 8);
    }, toast);
  }

  addEventListener('keydown', (e) => {
    if (!G.started || Custom.isOpen() || Music.isOpen() || $('#wallDialog').open || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest && e.target.closest('input, textarea, select, button')) {
      if (e.key === ' ' || e.key === 'Enter') return;
    }
    const k = e.key.toLowerCase();
    if (k === 'h') { if (!e.repeat) hornDown(); }
    else if (k === 't' && !e.repeat) tuneHorn();
    else if (k === 'l') toggleLights();
    else if (k === 'd') toggleDisco();
    else if (k === 'e') toggleEngine();
    else if (k === 'c') openPaint();
    else if (k === ' ') { e.preventDefault(); Music.togglePlay(); }
    else if (k === 'n' || k === 'arrowright') Music.next();
    else if (k === 'p' || k === 'arrowleft') Music.prev();
    else if (k === 'm') Music.openDialog();
    else if (k === 'y') Music.openBuilder();
    else if (k === 'b') togglePhoto();
    else if (k === 'w') openWalls();
    else if (k === 'arrowup') { e.preventDefault(); speed(1); }
    else if (k === 'arrowdown') { e.preventDefault(); speed(-1); }
  });
  addEventListener('keyup', (e) => { if (e.key.toLowerCase() === 'h') hornUp(); });

  /* ---------- scene events ---------- */
  Scene.on('stop', (stop) => {
    setStop(stop);
    say('USTAAD BOLE', stop.line, 10);
    if (stop.type === 'dhaba') {
      G.maggi++; showMenu(stop); switchTab('dhaba');
      toast(`🍜 ${stop.dhaba} — Maggi ₹${menuFor(stop)[0][1]}`);
    } else if (stop.type === 'pump') {
      G.diesel = 100; switchTab('bhada'); toast('⛽ Tanki full! Agla pump 365 km baad.');
    } else if (stop.type === 'pass') {
      Sfx.chime(); toast(`🏔️ ${stop.en} — ${fmtINR(stop.alt)} m. Photo lo!`);
    }
  });
  Scene.on('tunnel', (inside) => {
    if (inside && !Scene.get().lights) toast('🚇 Surang aa gayi! L dabao — lights jalao');
    if (!inside) toast('Lahaul mein swagat hai 🏔️');
  });
  Scene.on('pass', (type, t) => {
    if (Date.now() < G.quoteLock - 4000) return;
    if (type === 'bike') say('BULLET WALE BHAIYA', pick(BIKE_LINES), 6);
    else if (type === 'army') say('FAUJI CONVOY', pick(ARMY_LINES), 6);
    else if (type === 'truck') say('SAAMNE WALE TRUCK PE LIKHA THA', t.slogan, 7);
    else say('TOURIST TAXI', pick(TAXI_LINES), 6);
  });
  Scene.on('arrive', () => {
    Sfx.chime();
    const mins = Math.round((Date.now() - G.t0) / 60000);
    $('#statHorns').textContent = G.horns;
    $('#statSongs').textContent = G.songs.size;
    $('#statMaggi').textContent = G.maggi;
    $('#statTime').textContent = mins < 1 ? '<1 min' : mins + ' min';
    setTimeout(() => ($('#arrival').hidden = false), 1200);
  });

  /* ---------- share ---------- */
  async function share(text) {
    const url = location.href.split('#')[0];
    if (navigator.share) {
      try { await navigator.share({ title: 'Leh Chalo Ustaad', text, url }); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
    window.open('https://wa.me/?text=' + encodeURIComponent(`${text} ${url}`), '_blank', 'noopener');
  }
  $('#shareBtn').onclick = () => share('Truck mein Manali se Leh chal raha hoon 🚛🏔️ Ustaad ki playlist full volume pe. Tum bhi baitho:');
  $('#arrShare').onclick = () => share(`Main truck mein Manali se Leh pahunch gaya 🚛🏔️ ${G.horns} baar horn bajaya, ${G.maggi} dhabe pe Maggi khayi. Tumhari baari:`);
  $('#arrPaint').onclick = openPaint;
  $('#arrAgain').onclick = () => {
    $('#arrival').hidden = true;
    Scene.reset(); G.diesel = 100; G.lastKm = 0; G.maggi = 0; G.horns = 0; G.songs.clear(); G.t0 = Date.now();
    setStop(STOPS[0]); switchTab('bhada');
    say('USTAAD BOLE', 'चलो, वापस मनाली. इस बार ज़्यादा हॉर्न बजाना.', 8);
  };

  /* ---------- start ---------- */
  document.fonts && document.fonts.ready.then(() => { cancelAnimationFrame(introRaf); introRaf = requestAnimationFrame(drawIntro); });
  introRaf = requestAnimationFrame(drawIntro);

  $('#startBtn').onclick = () => {
    Sfx.init(); Sfx.engineOn();
    Music.start();
    G.started = true; G.t0 = Date.now();
    $('#intro').classList.add('gone');
    $('#app').hidden = false;
    setTimeout(() => { cancelAnimationFrame(introRaf); $('#intro').hidden = true; }, 700);
    requestAnimationFrame(() => { measureInset(); Scene.start(); });
    setStop(STOPS[0]);
    say('USTAAD BOLE', STOPS[0].line, 8);
    setTimeout(() => toast('H = horn · L = lights · D = disco · ↑↓ = speed'), 2500);
    if (openMusicAfterStart) setTimeout(() => Music.openDialog(), 900);
    if (openDrawerAfterStart) setTimeout(() => ($('#playlist').hidden = false), 900);
  };
})();
