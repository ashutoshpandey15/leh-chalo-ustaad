/* "Truck Sajao" — paint the back of your truck and download it as a PNG. */
const Custom = (() => {
  const dlg = document.getElementById('paintModal');
  const cv = document.getElementById('backCanvas');
  const c = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  let cfg = null, onApply = null, toast = () => {};

  const els = {
    slogans: document.getElementById('sloganChips'),
    custom: document.getElementById('customSlogan'),
    name: document.getElementById('ustaadName'),
    plate: document.getElementById('plateNo'),
    pals: document.getElementById('paletteChips'),
  };

  function wrap(text, maxW) {
    const words = text.split(' '), lines = []; let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (c.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
    }
    if (line) lines.push(line);
    return lines;
  }

  function eye(x, y, pal, flip) {
    c.save(); c.translate(x, y); if (flip) c.scale(-1, 1);
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-46, 0); c.quadraticCurveTo(0, -36, 46, 0); c.quadraticCurveTo(0, 30, -46, 0); c.fill();
    c.strokeStyle = '#111'; c.lineWidth = 4; c.stroke();
    c.fillStyle = pal.accent; c.beginPath(); c.arc(4, 0, 15, 0, 7); c.fill();
    c.fillStyle = '#111'; c.beginPath(); c.arc(6, 0, 7, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(10, -4, 3, 0, 7); c.fill();
    c.lineWidth = 3;
    for (let i = 0; i < 6; i++) { const t = -30 + i * 12; c.beginPath(); c.moveTo(t, -17 + Math.abs(t) * 0.25); c.lineTo(t - 4, -30 + Math.abs(t) * 0.3); c.stroke(); }
    c.restore();
  }

  function render() {
    const pal = cfg.pal;
    c.clearRect(0, 0, W, H);
    const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#1d1236'); bg.addColorStop(1, '#0d0820');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);

    // mudflaps
    c.fillStyle = '#111';
    c.fillRect(62, 548, 78, 92); c.fillRect(400, 548, 78, 92);
    c.fillStyle = pal.trim; c.font = '400 15px Bungee, sans-serif'; c.textAlign = 'center';
    c.fillText('JULLEY', 101, 600); c.fillText('JULLEY', 439, 600);
    ['#e63946', '#ffd23f', '#2ec4b6'].forEach((col, i) => {
      c.fillStyle = col;
      for (let j = 0; j < 4; j++) { c.beginPath(); c.arc(70 + j * 20 + i * 2, 642 + i * 6, 4, 0, 7); c.fill(); c.beginPath(); c.arc(408 + j * 20 + i * 2, 642 + i * 6, 4, 0, 7); c.fill(); }
    });

    // panel
    c.fillStyle = pal.body; c.beginPath(); c.roundRect ? c.roundRect(36, 36, 468, 516, 14) : c.rect(36, 36, 468, 516); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.15)'; c.lineWidth = 2;
    for (let y = 70; y < 545; y += 26) { c.beginPath(); c.moveTo(40, y); c.lineTo(500, y); c.stroke(); }
    c.strokeStyle = pal.trim; c.lineWidth = 10; c.strokeRect(52, 52, 436, 484);

    // crown arch with scallops
    c.fillStyle = pal.accent;
    c.beginPath(); c.moveTo(52, 120); c.quadraticCurveTo(270, 20, 488, 120); c.lineTo(488, 52); c.lineTo(52, 52); c.closePath(); c.fill();
    c.fillStyle = pal.trim;
    for (let i = 0; i < 14; i++) {
      const t = (i + 0.5) / 14, x = 52 + t * 436, y = 120 - Math.sin(t * Math.PI) * 50 + 2;
      c.beginPath(); c.arc(x, y, 9, 0, Math.PI); c.fill();
    }

    eye(140, 170, pal, false); eye(400, 170, pal, true);

    // HORN  (OK)  PLEASE
    c.textAlign = 'center';
    c.font = '400 38px Bungee, Impact, sans-serif';
    c.lineWidth = 6; c.strokeStyle = 'rgba(0,0,0,0.55)'; c.fillStyle = pal.trim;
    c.strokeText('HORN', 132, 268); c.fillText('HORN', 132, 268);
    c.strokeText('PLEASE', 410, 268); c.fillText('PLEASE', 410, 268);
    c.fillStyle = pal.trim; c.beginPath(); c.arc(270, 254, 40, 0, 7); c.fill();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4; c.beginPath(); c.ellipse(270 + Math.cos(a) * 46, 254 + Math.sin(a) * 46, 12, 7, a, 0, 7); c.fillStyle = pal.accent; c.fill();
    }
    c.fillStyle = pal.body; c.font = '400 34px Bungee, Impact, sans-serif'; c.fillText('OK', 270, 267);

    // slogan
    const slogan = (cfg.slogan || '').trim() || SLOGANS[0];
    let size = 44; c.font = `800 ${size}px "Baloo 2", sans-serif`;
    let lines = wrap(slogan, 400);
    while ((lines.length > 2 || lines.some((l) => c.measureText(l).width > 410)) && size > 24) {
      size -= 2; c.font = `800 ${size}px "Baloo 2", sans-serif`; lines = wrap(slogan, 400);
    }
    const y0 = 380 - ((lines.length - 1) * size * 1.05) / 2;
    lines.forEach((l, i) => {
      const y = y0 + i * size * 1.05;
      c.lineWidth = 8; c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineJoin = 'round'; c.strokeText(l, 270, y);
      c.fillStyle = pal.trim; c.fillText(l, 270, y);
    });

    // dipper band
    c.fillStyle = 'rgba(0,0,0,0.75)'; c.fillRect(70, 446, 400, 38);
    c.fillStyle = pal.trim; c.font = '400 20px Bungee, Impact, sans-serif'; c.fillText('USE DIPPER AT NIGHT', 270, 473);

    c.fillStyle = '#fff'; c.font = '700 18px "Baloo 2", sans-serif';
    c.fillText(`— Ustaad ${cfg.name || 'Ji'} —`, 270, 512);

    // tail lights
    c.fillStyle = '#ff2a2a'; c.fillRect(60, 494, 46, 26); c.fillRect(434, 494, 46, 26);
    c.fillStyle = '#ff9f1c'; c.fillRect(60, 522, 46, 10); c.fillRect(434, 522, 46, 10);

    // yellow commercial number plate
    c.fillStyle = '#ffd400'; c.fillRect(170, 534, 200, 46);
    c.strokeStyle = '#111'; c.lineWidth = 4; c.strokeRect(170, 534, 200, 46);
    c.fillStyle = '#111'; c.font = '400 22px Bungee, Impact, sans-serif';
    c.fillText((cfg.plate || 'HP 66 LC 474').toUpperCase().slice(0, 13), 270, 566);

    c.fillStyle = 'rgba(255,255,255,0.45)'; c.font = '700 13px "Baloo 2", sans-serif';
    c.fillText('made on LEH CHALO USTAAD 🚛', 270, 664);
    c.textAlign = 'left';
  }

  function buildUI() {
    els.slogans.innerHTML = '';
    SLOGANS.forEach((s) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip' + (cfg.slogan === s ? ' on' : ''); b.textContent = s;
      b.onclick = () => { cfg.slogan = s; els.custom.value = ''; buildUI(); render(); };
      els.slogans.appendChild(b);
    });
    els.pals.innerHTML = '';
    PALETTES.forEach((p) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'swatch' + (cfg.pal.id === p.id ? ' on' : '');
      b.title = p.name; b.setAttribute('aria-label', p.name);
      b.style.background = `linear-gradient(135deg, ${p.body} 0 45%, ${p.trim} 45% 60%, ${p.accent} 60% 80%, ${p.cab} 80%)`;
      b.innerHTML = `<span>${p.name}</span>`;
      b.onclick = () => { cfg.pal = p; buildUI(); render(); };
      els.pals.appendChild(b);
    });
  }

  els.custom.addEventListener('input', () => { cfg.slogan = els.custom.value; buildUI(); render(); });
  els.name.addEventListener('input', () => { cfg.name = els.name.value; render(); });
  els.plate.addEventListener('input', () => { cfg.plate = els.plate.value; render(); });

  function blob() { return new Promise((r) => cv.toBlob(r, 'image/png')); }
  async function download() {
    const b = await blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = 'mera-truck-leh-chalo-ustaad.png';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    toast('Photo save ho gayi! Story pe daal do 📸');
  }
  async function share() {
    const b = await blob();
    const file = new File([b], 'mera-truck.png', { type: 'image/png' });
    const text = `Mera truck dekho 🚛✨ "${(cfg.slogan || SLOGANS[0]).trim()}" — apna banao: ${location.href.split('#')[0]}`;
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], text }); } catch (e) { /* user cancelled */ }
    } else {
      await download();
    }
  }

  document.getElementById('paintDownload').onclick = download;
  document.getElementById('paintShare').onclick = share;
  document.getElementById('paintApply').onclick = () => { onApply && onApply({ ...cfg }); dlg.close(); };
  document.getElementById('paintClose').onclick = () => dlg.close();
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

  function open(current, apply, toastFn) {
    cfg = { ...current }; onApply = apply; if (toastFn) toast = toastFn;
    els.name.value = cfg.name || ''; els.plate.value = cfg.plate || '';
    els.custom.value = SLOGANS.includes(cfg.slogan) ? '' : cfg.slogan || '';
    buildUI(); render(); dlg.showModal();
  }
  return { open, isOpen: () => dlg.open };
})();
