/* Sound effects made with WebAudio — no audio files needed. */
const Sfx = (() => {
  let ctx = null, master = null, horn = null, engine = null;

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);
    loadHorn();
  }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

  function curve(k) {
    const n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; c[i] = ((1 + k) * x) / (1 + k * Math.abs(x)); }
    return c;
  }

  // The real lorry horn (assets/horn.mp3): ~0.1s lead-in, then one steady blast.
  // Held = loop the steady part; released = quick fade.
  let hornBuf = null, hornLoading = null;
  function loadHorn() {
    if (hornBuf || hornLoading || !ctx) return hornLoading;
    hornLoading = fetch('assets/horn.mp3')
      .then((r) => r.arrayBuffer())
      .then((a) => new Promise((res, rej) => ctx.decodeAudioData(a, res, rej)))
      .then((b) => { hornBuf = b; })
      .catch(() => { hornLoading = null; });
    return hornLoading;
  }
  function hornStart() {
    init(); if (!ctx) return; resume(); loadHorn();
    if (horn) return;
    if (!hornBuf) return synthHornStart();
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = hornBuf;
    src.loop = true;
    src.loopStart = Math.min(1.5, hornBuf.duration * 0.2);
    src.loopEnd = hornBuf.duration - 0.3;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(1, t + 0.02);
    src.connect(g); g.connect(master);
    src.start(t, 0.09);
    horn = { g, oscs: [src], t0: t, level: 1 };
  }
  // Fallback synth horn (used only until the MP3 has loaded).
  function synthHornStart() {
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.28, t + 0.04);
    const shaper = ctx.createWaveShaper(); shaper.curve = curve(18);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; lp.Q.value = 1.4;
    const oscs = [233, 294, 349].map((f) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f * 0.93, t);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.09);
      const og = ctx.createGain(); og.gain.value = 0.33;
      o.connect(og); og.connect(shaper); o.start(t);
      return o;
    });
    shaper.connect(lp); lp.connect(g); g.connect(master);
    horn = { g, oscs, t0: t, level: 0.28 };
  }
  function hornStop() {
    if (!horn || !ctx) return;
    const h = horn; horn = null;
    const t = Math.max(ctx.currentTime, h.t0 + 0.3);
    h.g.gain.setValueAtTime(h.level, t);
    h.g.gain.linearRampToValueAtTime(0, t + 0.15);
    h.oscs.forEach((o) => o.stop(t + 0.2));
  }

  // Musical "pressure horn" — an original little tune.
  function tune() {
    init(); if (!ctx) return; resume();
    const notes = [0, 4, 7, 12, 9, 7, 4, 7, 12, 16];
    const durs  = [.13, .13, .13, .26, .13, .13, .13, .13, .13, .4];
    let t = ctx.currentTime + 0.02;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000;
    lp.connect(master);
    notes.forEach((n, i) => {
      const f = 392 * Math.pow(2, n / 12);
      ['square', 'sawtooth'].forEach((type, j) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.value = f * (j ? 1.005 : 1);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.09, t + 0.015);
        g.gain.setValueAtTime(0.09, t + durs[i] - 0.03);
        g.gain.linearRampToValueAtTime(0, t + durs[i]);
        o.connect(g); g.connect(lp); o.start(t); o.stop(t + durs[i] + 0.02);
      });
      t += durs[i];
    });
  }

  // Diesel rumble: brown noise + low sawtooth with a throb.
  function engineOn() {
    init(); if (!ctx || engine) return; resume();
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 44;
    const og = ctx.createGain(); og.gain.value = 0.18;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 9;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.1;
    lfo.connect(lfoG); lfoG.connect(og.gain);
    const g = ctx.createGain(); g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.11, ctx.currentTime + 0.8);
    src.connect(lp); o.connect(og); og.connect(lp); lp.connect(g); g.connect(master);
    src.start(); o.start(); lfo.start();
    engine = { src, o, lfo, g };
  }
  function engineSet(mult) {
    if (!engine) return;
    const t = ctx.currentTime;
    engine.o.frequency.setTargetAtTime(36 + mult * 16, t, 0.3);
    engine.lfo.frequency.setTargetAtTime(6 + mult * 5, t, 0.3);
  }
  function engineOff() {
    if (!engine) return;
    const e = engine; engine = null;
    const t = ctx.currentTime;
    e.g.gain.setTargetAtTime(0, t, 0.25);
    [e.src, e.o, e.lfo].forEach((n) => n.stop(t + 1.2));
  }

  function chime() {
    init(); if (!ctx) return; resume();
    let t = ctx.currentTime;
    [784, 988, 1175].forEach((f) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.65);
      t += 0.09;
    });
  }

  return { init, resume, hornStart, hornStop, tune, engineOn, engineOff, engineSet, chime };
})();
