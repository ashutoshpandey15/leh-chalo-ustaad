/*
  Music:
   • Ustaad ki Cassette — Side A / Side B (songs.js)
   • "Meri Playlists" — visitors mix songs from both sides, saved in their browser, shareable as a link
   • any pasted YouTube / Spotify link, or the visitor's own Spotify playlists (login)
*/
const Music = (() => {
  const $ = (s) => document.querySelector(s);
  const store = {
    get(k, d) { try { const v = localStorage.getItem('lcu:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('lcu:' + k, JSON.stringify(v)); } catch (e) { /* blocked */ } },
    del(k) { try { localStorage.removeItem('lcu:' + k); } catch (e) { /* blocked */ } },
  };
  const mmss = (s) => { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  let toast = () => {}, onPlay = () => {};

  /* ================= lists ================= */
  // My playlists: [{ id, name, songs: [videoId] }]
  let mine = store.get('myPlaylists', []).filter((p) => p && Array.isArray(p.songs));
  let shared = null;                  // playlist opened from a friend's link (not saved yet)
  const saveMine = () => store.set('myPlaylists', mine);
  const known = (ids) => ids.filter((id) => SONG_INDEX[id]);

  // A "list" = { key, name, songs: [song objects] }
  function listFor(key) {
    if (key === 'a' || key === 'b') { const c = CASSETTES.find((x) => x.id === key); return { key, name: c.short, songs: c.songs }; }
    if (key === 'shared' && shared) return { key, name: shared.name, songs: known(shared.songs).map((id) => SONG_INDEX[id]) };
    if (key && key.startsWith('my:')) {
      const p = mine.find((x) => x.id === key.slice(3));
      if (p) return { key, name: p.name, songs: known(p.songs).map((id) => SONG_INDEX[id]) };
    }
    return listFor('a');
  }

  // src: { type: 'cassette', list } | { type: 'ytlist', id } | { type: 'ytvideo', id } | { type: 'spotify', uri }
  let src = store.get('music', { type: 'cassette', list: 'a' });
  if (src.type === 'cassette' && (!src.list || src.list === 'shared')) src.list = 'a';
  let list = listFor(src.list), idx = 0, started = false;
  const cur = () => list.songs[idx];

  /* ================= YouTube ================= */
  let yt = null, ytReady = false, wantPlay = false, errStreak = 0, vol = store.get('vol', 80), seeking = false;

  window.onYouTubeIframeAPIReady = () => {
    yt = new YT.Player('yt', {
      width: '100%', height: '100%', videoId: (cur() || CASSETTES[0].songs[0]).id,
      playerVars: { playsinline: 1, controls: 0, rel: 0, modestbranding: 1, iv_load_policy: 3, disablekb: 1, fs: 0 },
      events: {
        onReady: () => { ytReady = true; yt.setVolume(vol); if (wantPlay) applyYT(); },
        onStateChange: (e) => {
          if (src.type === 'spotify') return;
          const S = YT.PlayerState;
          if (e.data === S.PLAYING) {
            errStreak = 0; setPlayingUI(true);
            if (src.type === 'cassette') onPlay(cur().id);
            else { const d = yt.getVideoData() || {}; setMeta(d.title || 'YouTube', d.author || 'Aapka link'); onPlay(d.video_id || ''); }
          } else if (e.data === S.PAUSED || e.data === S.CUED) setPlayingUI(false);
          else if (e.data === S.ENDED && src.type === 'cassette') next();
        },
        onError: () => {
          if (src.type === 'spotify') return;
          errStreak++;
          if (errStreak > 4) { setPlayingUI(false); toast('Cassette phans gayi. Internet check karo, ustaad.'); return; }
          if (src.type === 'cassette') { toast('Ye gaana cassette mein atak gaya — agla laga rahe hain'); setTimeout(next, 700); }
          else if (src.type === 'ytlist') { toast('Ye gaana yahan nahi chal sakta — agla laga rahe hain'); setTimeout(() => yt.nextVideo(), 700); }
          else { toast('Ye video website pe nahi chal sakta. Wapas Ustaad ki cassette.'); playList('a', 0); }
        },
      },
    });
  };
  function applyYT() {
    if (!ytReady) { wantPlay = true; return; }
    wantPlay = false;
    if (src.type === 'cassette') { if (cur()) yt.loadVideoById(cur().id); }
    else if (src.type === 'ytlist') yt.loadPlaylist({ list: src.id, listType: 'playlist', index: 0 });
    else if (src.type === 'ytvideo') yt.loadVideoById(src.id);
  }
  function pauseYT() { if (ytReady && yt.getPlayerState() === YT.PlayerState.PLAYING) yt.pauseVideo(); }

  /* ================= Spotify embed ================= */
  let spApi = null, spCtl = null, spLoading = false, spPendingUri = null;
  function loadSpotifyApi() {
    if (spLoading) return; spLoading = true;
    window.onSpotifyIframeApiReady = (api) => { spApi = api; if (spPendingUri) mountSpotify(spPendingUri); };
    const s = document.createElement('script'); s.src = 'https://open.spotify.com/embed/iframe-api/v1'; s.async = true;
    s.onerror = () => { spLoading = false; toast('Spotify khul nahi paya. Internet check karo.'); };
    document.body.appendChild(s);
  }
  function mountSpotify(uri) {
    spPendingUri = null;
    if (spCtl) { spCtl.loadUri(uri); setTimeout(() => spCtl.play(), 600); return; }
    const host = $('#spotifyMount'); host.innerHTML = '';
    const div = document.createElement('div'); host.appendChild(div);
    spApi.createController(div, { uri, width: '100%', height: 80 }, (ctl) => {
      spCtl = ctl;
      ctl.addListener('ready', () => { if (src.type === 'spotify') ctl.play(); });
      ctl.addListener('playback_update', (e) => {
        if (src.type !== 'spotify') return;
        setPlayingUI(!e.data.isPaused);
        if (!e.data.isPaused) onPlay(src.uri);
      });
    });
  }
  function playSpotify(uri) {
    pauseYT();
    if (!spApi) { spPendingUri = uri; loadSpotifyApi(); return; }
    mountSpotify(uri);
  }

  /* ================= source switching ================= */
  function setSource(next, play = true) {
    src = next;
    store.set('music', src.type === 'cassette' && src.list === 'shared' ? { type: 'cassette', list: 'a' } : src);
    const p = $('.player');
    p.classList.toggle('spotify', src.type === 'spotify');
    if (src.type !== 'spotify' && spCtl) spCtl.pause();
    if (src.type === 'cassette') { list = listFor(src.list); idx = Math.min(idx, Math.max(0, list.songs.length - 1)); renderTrack(); }
    else if (src.type !== 'spotify') setMeta('Load ho raha hai…', 'Aapka YouTube link');
    $('#srcLabel').textContent = src.type === 'cassette' ? list.name.toUpperCase() : src.type === 'spotify' ? 'SPOTIFY' : 'YOUTUBE LINK';
    renderDrawer();
    if (!play || !started) return;
    if (src.type === 'spotify') playSpotify(src.uri); else applyYT();
  }
  function playList(key, i = 0) {
    const l = listFor(key);
    if (!l.songs.length) { toast('Is playlist mein abhi koi gaana nahi hai.'); return; }
    idx = Math.max(0, Math.min(i, l.songs.length - 1));
    if (!started) { started = true; }
    setSource({ type: 'cassette', list: key });
  }

  function parseLink(s) {
    s = (s || '').trim();
    if (/spotify\.link\//.test(s)) return { error: 'Ye chhota share link nahi chalega. Spotify mein playlist kholo, Share → "Copy link" dabao aur wahi link yahan daalo.' };
    let m = s.match(/spotify(?:\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?|:)(playlist|album|track|artist|episode|show)[/:]([A-Za-z0-9]{22})/);
    if (m) return { type: 'spotify', uri: `spotify:${m[1]}:${m[2]}` };
    m = s.match(/[?&]list=([A-Za-z0-9_-]{10,})/);
    if (m) return { type: 'ytlist', id: m[1] };
    m = s.match(/(?:youtu\.be\/|[?&]v=|shorts\/|embed\/)([A-Za-z0-9_-]{11})/);
    if (m) return { type: 'ytvideo', id: m[1] };
    return { error: 'Ye link samajh nahi aaya. Spotify ya YouTube ka link paste karo.' };
  }

  /* ================= player UI ================= */
  function setMeta(title, artist) { $('#trackTitle').textContent = title; $('#trackArtist').textContent = artist; }
  function renderTrack() {
    if (src.type === 'cassette' && cur()) setMeta(cur().title, `${cur().artist} · ${list.name}`);
    document.querySelectorAll('#drawerBody .trk').forEach((li) => li.classList.toggle('on', src.type === 'cassette' && li.dataset.list === list.key && +li.dataset.i === idx));
  }
  function setPlayingUI(p) {
    $('.player').classList.toggle('playing', p);
    $('#play').setAttribute('aria-label', p ? 'Pause' : 'Play');
    $('#spkState').textContent = p ? 'ON' : 'OFF';
  }
  function next() {
    if (src.type === 'cassette') { idx = (idx + 1) % list.songs.length; renderTrack(); applyYT(); }
    else if (src.type === 'ytlist' && ytReady) yt.nextVideo();
    else toast(src.type === 'spotify' ? 'Agla gaana Spotify player se chuno 👆' : 'Ek hi video hai, ustaad.');
  }
  function prev() {
    if (src.type === 'cassette') { idx = (idx - 1 + list.songs.length) % list.songs.length; renderTrack(); applyYT(); }
    else if (src.type === 'ytlist' && ytReady) yt.previousVideo();
    else toast(src.type === 'spotify' ? 'Pichhla gaana Spotify player se chuno 👆' : 'Ek hi video hai, ustaad.');
  }
  function togglePlay() {
    if (src.type === 'spotify') { if (spCtl) spCtl.togglePlay(); else playSpotify(src.uri); return; }
    if (!ytReady) { wantPlay = !wantPlay; return; }
    const st = yt.getPlayerState();
    if (st === YT.PlayerState.PLAYING) yt.pauseVideo();
    else if (st === -1 || (st === YT.PlayerState.CUED && src.type !== 'cassette')) applyYT();
    else yt.playVideo();
  }
  setInterval(() => {
    if (src.type === 'spotify' || !ytReady || !yt.getDuration) return;
    const d = yt.getDuration() || 0, c = yt.getCurrentTime() || 0;
    $('#tCur').textContent = mmss(c); $('#tDur').textContent = mmss(d);
    if (!seeking) $('#seek').value = d ? Math.round((c / d) * 1000) : 0;
  }, 500);

  /* ================= drawer: Side A / Side B / Meri Playlists ================= */
  let tab = src.type === 'cassette' && src.list && src.list !== 'a' && src.list !== 'b' ? 'mine' : (src.list === 'b' ? 'b' : 'a');
  function setTab(t) {
    tab = t;
    document.querySelectorAll('.dtabs button').forEach((b) => { const on = b.dataset.dtab === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    renderDrawer();
  }
  function songRow(song, i, listKey, opts = {}) {
    const li = el('li', 'trk'); li.dataset.list = listKey; li.dataset.i = i;
    const play = el('button', 'trk-play'); play.type = 'button';
    play.append(el('span', 'n', String(i + 1).padStart(2, '0')));
    const t = el('span', 't'); t.append(el('b', null, song.title), el('small', null, song.artist)); play.append(t);
    play.onclick = () => playList(listKey, i);
    li.append(play);
    if (opts.add !== false) {
      const add = el('button', 'trk-add', '+'); add.type = 'button';
      add.title = 'Apni playlist mein daalo'; add.setAttribute('aria-label', `${song.title} — apni playlist mein daalo`);
      add.onclick = (e) => { e.stopPropagation(); openAddMenu(add, song.id); };
      li.append(add);
    }
    return li;
  }
  function renderDrawer() {
    const body = $('#drawerBody'); if (!body) return;
    closeAddMenu();
    body.innerHTML = '';
    if (tab === 'a' || tab === 'b') {
      const c = CASSETTES.find((x) => x.id === tab);
      $('#drawerTitle').textContent = `${c.short} · ${c.songs.length} gaane`;
      const play = el('button', 'own-row play-all', `▶ Poori ${c.short} bajao`); play.type = 'button';
      play.onclick = () => playList(tab, 0);
      body.append(play);
      const ol = el('ol', 'tracks');
      c.songs.forEach((s, i) => ol.append(songRow(s, i, tab)));
      body.append(ol);
    } else {
      $('#drawerTitle').textContent = 'Meri Playlists';
      if (shared) {
        const box = el('div', 'shared-box');
        box.append(el('small', null, 'DOST NE BHEJI'), el('b', null, `${shared.name} · ${known(shared.songs).length} gaane`));
        const row = el('div', 'pl-actions');
        const p = el('button', 'mini hot', '▶ Bajao'); p.type = 'button'; p.onclick = () => playList('shared', 0);
        const sv = el('button', 'mini', '❤ Save karo'); sv.type = 'button';
        sv.onclick = () => { const id = makeId(); mine.unshift({ id, name: shared.name, songs: known(shared.songs) }); saveMine(); const wasPlaying = src.list === 'shared'; shared = null; if (wasPlaying) src.list = 'my:' + id; toast('❤ Playlist save ho gayi'); renderDrawer(); };
        row.append(p, sv); box.append(row); body.append(box);
      }
      const make = el('button', 'own-row make', '＋ Nayi playlist banao'); make.type = 'button';
      make.onclick = () => openBuilder(null);
      body.append(make);
      if (!mine.length) {
        body.append(el('p', 'hint empty', 'Abhi koi playlist nahi. Side A / Side B ke gaanon pe "+" dabao ya upar se nayi banao — phir doston ko link bhejo!'));
      }
      mine.forEach((p) => {
        const card = el('div', 'pl-card' + (src.type === 'cassette' && src.list === 'my:' + p.id ? ' on' : ''));
        const head = el('div', 'pl-head');
        head.append(el('b', null, p.name), el('small', null, `${known(p.songs).length} gaane`));
        const row = el('div', 'pl-actions');
        const mk = (label, cls, fn, aria) => { const b = el('button', 'mini ' + cls, label); b.type = 'button'; b.onclick = fn; if (aria) b.setAttribute('aria-label', aria); return b; };
        row.append(
          mk('▶ Bajao', 'hot', () => playList('my:' + p.id, 0)),
          mk('↗ Share', '', () => sharePlaylist(p)),
          mk('✎ Edit', '', () => openBuilder(p.id)),
          mk('🗑', 'danger', () => deletePlaylist(p.id), `${p.name} delete karo`),
        );
        card.append(head, row);
        if (src.type === 'cassette' && src.list === 'my:' + p.id) {
          const ol = el('ol', 'tracks small');
          list.songs.forEach((s, i) => ol.append(songRow(s, i, 'my:' + p.id, { add: false })));
          card.append(ol);
        }
        body.append(card);
      });
    }
    renderTrack();
  }

  /* add-to-playlist menu */
  let addMenu = null;
  function closeAddMenu() { if (addMenu) { addMenu.remove(); addMenu = null; } }
  function openAddMenu(anchor, songId) {
    closeAddMenu();
    if (!mine.length) { openBuilder(null, [songId]); return; }
    addMenu = el('div', 'add-menu'); addMenu.setAttribute('role', 'menu');
    addMenu.append(el('small', null, 'KIS PLAYLIST MEIN?'));
    mine.forEach((p) => {
      const has = p.songs.includes(songId);
      const b = el('button', null, (has ? '✓ ' : '') + p.name); b.type = 'button'; b.setAttribute('role', 'menuitem');
      b.onclick = () => {
        if (!has) { p.songs.push(songId); saveMine(); toast(`➕ "${SONG_INDEX[songId].title}" → ${p.name}`); }
        else toast('Ye gaana pehle se hai, ustaad.');
        closeAddMenu(); if (tab === 'mine') renderDrawer();
      };
      addMenu.append(b);
    });
    const n = el('button', 'new', '＋ Nayi playlist'); n.type = 'button'; n.onclick = () => { closeAddMenu(); openBuilder(null, [songId]); };
    addMenu.append(n);
    const drawer = $('#playlist'); drawer.append(addMenu);
    const a = anchor.getBoundingClientRect(), d = drawer.getBoundingClientRect();
    addMenu.style.top = Math.min(a.bottom - d.top + 4, d.height - addMenu.offsetHeight - 8) + 'px';
    addMenu.style.right = '14px';
    addMenu.querySelector('button').focus();
  }
  document.addEventListener('click', (e) => { if (addMenu && !addMenu.contains(e.target) && !e.target.closest('.trk-add')) closeAddMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAddMenu(); });

  function makeId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function deletePlaylist(id) {
    const p = mine.find((x) => x.id === id); if (!p) return;
    if (!confirm(`"${p.name}" delete kar dein? Ye wapas nahi aayegi.`)) return;
    mine = mine.filter((x) => x.id !== id); saveMine();
    if (src.type === 'cassette' && src.list === 'my:' + id) { idx = 0; setSource({ type: 'cassette', list: 'a' }); }
    renderDrawer(); toast('Playlist delete ho gayi.');
  }

  /* ================= share links ================= */
  // #pl=<name>~<id>.<id>.<id>   (video IDs never contain "." or "~")
  function shareUrl(p) {
    return `${location.origin}${location.pathname}#pl=${encodeURIComponent(p.name)}~${known(p.songs).join('.')}`;
  }
  async function sharePlaylist(p) {
    const url = shareUrl(p);
    const text = `🚛 Meri truck playlist "${p.name}" (${known(p.songs).length} gaane) — Leh Chalo Ustaad pe suno:`;
    if (navigator.share) {
      try { await navigator.share({ title: p.name, text, url }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(`${text} ${url}`); toast('🔗 Link copy ho gaya! WhatsApp pe paste karo.'); }
    catch (e) { window.open('https://wa.me/?text=' + encodeURIComponent(`${text} ${url}`), '_blank', 'noopener'); }
  }
  function readShareLink() {
    const m = location.hash.match(/^#pl=([^~]*)~([A-Za-z0-9_.-]*)$/);
    if (!m) return false;
    history.replaceState(null, '', location.pathname + location.search);
    let name = 'Dost ki Playlist';
    try { name = decodeURIComponent(m[1]).replace(/[\u0000-\u001f]/g, '').trim().slice(0, 30) || name; } catch (e) { /* bad encoding */ }
    const ids = known([...new Set(m[2].split('.'))]).slice(0, 200);
    if (!ids.length) return false;
    shared = { name, songs: ids };
    idx = 0; src = { type: 'cassette', list: 'shared' }; list = listFor('shared');
    tab = 'mine';
    return true;
  }

  /* ================= playlist builder dialog ================= */
  const bdlg = $('#plDialog');
  let bEdit = null, bChosen = [], bFilter = 'all';
  function openBuilder(editId, preselect = []) {
    closeAddMenu();
    const p = editId ? mine.find((x) => x.id === editId) : null;
    bEdit = p ? p.id : null;
    bChosen = p ? known(p.songs) : [...preselect];
    $('#plDlgTitle').textContent = p ? 'Playlist edit karo' : 'Nayi Playlist';
    $('#plName').value = p ? p.name : '';
    $('#plSearch').value = ''; $('#plErr').textContent = '';
    $('#plDelete').hidden = !p;
    bFilter = 'all'; document.querySelectorAll('#plDialog .seg button').forEach((b) => b.classList.toggle('on', b.dataset.src === 'all'));
    renderPick(); renderChosen();
    bdlg.showModal();
    setTimeout(() => $('#plName').focus(), 50);
  }
  function renderPick() {
    const q = $('#plSearch').value.trim().toLowerCase();
    const ul = $('#plPick'); ul.innerHTML = '';
    const seen = new Set(); let count = 0;
    CASSETTES.forEach((c) => {
      if (bFilter !== 'all' && bFilter !== c.id) return;
      c.songs.forEach((s) => {
        if (seen.has(s.id)) return; seen.add(s.id);
        if (q && !(`${s.title} ${s.artist}`.toLowerCase().includes(q))) return;
        const li = el('li');
        const lab = el('label', 'pick-row');
        const cb = el('input'); cb.type = 'checkbox'; cb.checked = bChosen.includes(s.id);
        cb.onchange = () => { if (cb.checked) { if (!bChosen.includes(s.id)) bChosen.push(s.id); } else bChosen = bChosen.filter((x) => x !== s.id); renderChosen(); };
        const t = el('span', 't'); t.append(el('b', null, s.title), el('small', null, `${s.artist} · ${c.short}`));
        lab.append(cb, t); li.append(lab); ul.append(li); count++;
      });
    });
    if (!count) ul.append(el('li', 'hint', 'Koi gaana nahi mila.'));
  }
  function renderChosen() {
    $('#plCount').textContent = bChosen.length;
    const ol = $('#plChosen'); ol.innerHTML = '';
    if (!bChosen.length) { ol.append(el('li', 'hint', 'Gaane chuno — yahan line se lag jayenge.')); return; }
    bChosen.forEach((id, i) => {
      const s = SONG_INDEX[id]; const li = el('li', 'chosen-row');
      li.append(el('span', 'n', String(i + 1)));
      const t = el('span', 't'); t.append(el('b', null, s.title), el('small', null, s.artist)); li.append(t);
      const mk = (label, aria, fn, dis) => { const b = el('button', 'ico', label); b.type = 'button'; b.setAttribute('aria-label', aria); b.disabled = !!dis; b.onclick = fn; return b; };
      li.append(
        mk('↑', 'Upar karo', () => { [bChosen[i - 1], bChosen[i]] = [bChosen[i], bChosen[i - 1]]; renderChosen(); }, i === 0),
        mk('↓', 'Neeche karo', () => { [bChosen[i + 1], bChosen[i]] = [bChosen[i], bChosen[i + 1]]; renderChosen(); }, i === bChosen.length - 1),
        mk('✕', 'Hatao', () => { bChosen.splice(i, 1); renderChosen(); renderPick(); }),
      );
      ol.append(li);
    });
  }
  function saveBuilder(andPlay) {
    const name = $('#plName').value.trim().slice(0, 30);
    if (!name) { $('#plErr').textContent = 'Playlist ka naam toh rakho, ustaad.'; $('#plName').focus(); return; }
    if (!bChosen.length) { $('#plErr').textContent = 'Kam se kam ek gaana chuno.'; return; }
    let id = bEdit;
    if (id) { const p = mine.find((x) => x.id === id); p.name = name; p.songs = [...bChosen]; }
    else { id = makeId(); mine.unshift({ id, name, songs: [...bChosen] }); }
    saveMine(); bdlg.close();
    toast(`❤ "${name}" save ho gayi · ${bChosen.length} gaane`);
    tab = 'mine'; setTab('mine'); $('#playlist').hidden = false;
    if (andPlay) playList('my:' + id, 0);
    else if (src.type === 'cassette' && src.list === 'my:' + id) { list = listFor(src.list); renderDrawer(); }
  }

  /* ================= Spotify login (PKCE, no server needed) ================= */
  const SP_SCOPES = 'playlist-read-private playlist-read-collaborative';
  const redirectUri = () => location.origin + location.pathname;
  const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  function randStr(n) {
    const a = new Uint8Array(n); crypto.getRandomValues(a);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from(a, (x) => chars[x % chars.length]).join('');
  }
  async function spLogin() {
    if (!SPOTIFY_CLIENT_ID) { toast('Spotify login jaldi aa raha hai! Tab tak playlist ka link paste karke bajao 🎧'); return; }
    if (location.hostname === 'localhost') { toast('Spotify login yahan abhi nahi chalega. Tab tak playlist ka link paste karke bajao 🎧'); return; }
    if (!window.crypto || !crypto.subtle) { toast('Is browser mein Spotify login nahi chalega. Chrome ya Safari mein try karo, ya link paste karo.'); return; }
    const verifier = randStr(64), state = randStr(16);
    const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    store.set('sp_pkce', { verifier, state });
    const q = new URLSearchParams({
      response_type: 'code', client_id: SPOTIFY_CLIENT_ID, scope: SP_SCOPES,
      code_challenge_method: 'S256', code_challenge: challenge, redirect_uri: redirectUri(), state,
    });
    location.href = 'https://accounts.spotify.com/authorize?' + q;
  }
  async function tokenRequest(params) {
    const r = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: SPOTIFY_CLIENT_ID, ...params }),
    });
    if (!r.ok) throw new Error('token ' + r.status);
    const j = await r.json();
    const old = store.get('sp_tok', {});
    const tok = { access: j.access_token, refresh: j.refresh_token || old.refresh, exp: Date.now() + (j.expires_in - 60) * 1000 };
    store.set('sp_tok', tok);
    return tok;
  }
  async function handleRedirect() {
    const p = new URLSearchParams(location.search);
    if (!p.has('code') && !p.has('error')) return false;
    history.replaceState(null, '', location.pathname + location.hash);
    if (p.has('error')) { toast('Spotify login cancel ho gaya.'); return false; }
    const pk = store.get('sp_pkce', null); store.del('sp_pkce');
    if (!pk || pk.state !== p.get('state')) { toast('Spotify login fail. Dobara try karo.'); return false; }
    try {
      await tokenRequest({ grant_type: 'authorization_code', code: p.get('code'), redirect_uri: redirectUri(), code_verifier: pk.verifier });
      return true;
    } catch (e) { toast('Spotify login fail. Dobara try karo.'); return false; }
  }
  async function spToken() {
    let t = store.get('sp_tok', null);
    if (!t) return null;
    if (Date.now() > t.exp && t.refresh) {
      try { t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: t.refresh }); }
      catch (e) { store.del('sp_tok'); return null; }
    }
    return t.access;
  }
  async function spApiGet(path) {
    const tok = await spToken(); if (!tok) throw new Error('nologin');
    const r = await fetch('https://api.spotify.com/v1' + path, { headers: { Authorization: 'Bearer ' + tok } });
    if (r.status === 401) { store.del('sp_tok'); throw new Error('nologin'); }
    if (r.status === 403) throw new Error('forbidden');
    if (!r.ok) throw new Error('http ' + r.status);
    return r.json();
  }
  function spLogout() { store.del('sp_tok'); renderSpotifyBox(); toast('Spotify disconnect ho gaya.'); }

  /* ================= music dialog (links + Spotify) ================= */
  const dlg = $('#musicDialog');
  function spConnectButton() {
    const b = el('button', 'sp-connect'); b.type = 'button';
    b.append(el('span', 'sp-logo'), document.createTextNode(' Connect Spotify'));
    b.onclick = spLogin; return b;
  }
  async function renderSpotifyBox() {
    const box = $('#spBox'); box.innerHTML = '';
    if (!store.get('sp_tok', null)) {
      box.append(spConnectButton(), el('p', 'hint', 'Login karke apni playlists yahin se chuno. Poore gaane sunne ke liye isi browser mein Spotify pe login rehna.'));
      return;
    }
    box.append(el('p', 'hint', 'Playlists la rahe hain…'));
    try {
      const [me, pl] = await Promise.all([spApiGet('/me'), spApiGet('/me/playlists?limit=50')]);
      box.innerHTML = '';
      const head = el('div', 'sp-head');
      const out = el('button', 'linkish', 'Disconnect'); out.type = 'button'; out.onclick = spLogout;
      head.append(el('span', null, `Hi ${me.display_name || 'ustaad'} 👋`), out); box.append(head);
      const grid = el('div', 'sp-grid');
      (pl.items || []).filter(Boolean).forEach((p) => {
        const b = el('button', 'sp-item'); b.type = 'button';
        const img = el('div', 'sp-cover');
        const url = p.images && p.images[0] && p.images[0].url;
        if (url && /^https:\/\//.test(url)) img.style.backgroundImage = `url("${encodeURI(url)}")`;
        const total = (p.tracks || p.items || {}).total;
        b.append(img, el('b', null, p.name), el('small', null, total != null ? `${total} gaane` : 'Playlist'));
        b.onclick = () => { setSource({ type: 'spotify', uri: p.uri }); dlg.close(); toast(`🎧 ${p.name} chal rahi hai`); };
        grid.append(b);
      });
      if (!grid.children.length) box.append(el('p', 'hint', 'Koi playlist nahi mili. Link paste karke bhi chala sakte ho.'));
      box.append(grid);
    } catch (e) {
      box.innerHTML = '';
      box.append(el('p', 'hint', e.message === 'forbidden'
        ? 'Abhi Spotify login sirf kuch logon ke liye khula hai. Tab tak apni playlist ka link upar paste karke bajao 🎧'
        : 'Spotify se playlists nahi aayi. Dobara connect karo.'));
      if (e.message !== 'forbidden') box.append(spConnectButton());
    }
  }
  function openDialog() {
    $('#musicLink').value = ''; $('#musicErr').textContent = '';
    renderSpotifyBox(); dlg.showModal();
  }
  function playLink() {
    const r = parseLink($('#musicLink').value);
    if (r.error) { $('#musicErr').textContent = r.error; return; }
    setSource(r); dlg.close();
    toast(r.type === 'spotify' ? '🎧 Spotify chal raha hai' : '▶ YouTube link chal raha hai');
  }

  /* ================= init ================= */
  async function init(opts) {
    toast = opts.toast || toast; onPlay = opts.onPlay || onPlay;
    $('#vol').value = vol;
    $('#vol').addEventListener('input', (e) => { vol = +e.target.value; if (ytReady) yt.setVolume(vol); store.set('vol', vol); });
    $('#seek').addEventListener('input', () => { seeking = true; });
    $('#seek').addEventListener('change', (e) => { seeking = false; if (ytReady) yt.seekTo((yt.getDuration() || 0) * (e.target.value / 1000), true); });
    $('#play').onclick = togglePlay; $('#next').onclick = next; $('#prev').onclick = prev;
    $('#musicBtn').onclick = openDialog;
    $('#musicGo').onclick = playLink;
    $('#musicLink').addEventListener('keydown', (e) => { if (e.key === 'Enter') playLink(); });
    $('#musicClose').onclick = () => dlg.close();
    $('#musicCassette').onclick = () => { dlg.close(); playList('a', 0); toast('📼 Ustaad ki cassette wapas'); };
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

    document.querySelectorAll('.dtabs button').forEach((b) => (b.onclick = () => setTab(b.dataset.dtab)));
    $('#plClose').onclick = () => bdlg.close();
    bdlg.addEventListener('click', (e) => { if (e.target === bdlg) bdlg.close(); });
    $('#plSearch').addEventListener('input', renderPick);
    document.querySelectorAll('#plDialog .seg button').forEach((b) => (b.onclick = () => {
      bFilter = b.dataset.src; document.querySelectorAll('#plDialog .seg button').forEach((x) => x.classList.toggle('on', x === b)); renderPick();
    }));
    $('#plSave').onclick = () => saveBuilder(false);
    $('#plSavePlay').onclick = () => saveBuilder(true);
    $('#plDelete').onclick = () => { if (bEdit) { bdlg.close(); deletePlaylist(bEdit); } };
    $('#plName').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });

    const fromLink = readShareLink();
    setSource(src, false);
    setTab(tab);
    const justLoggedIn = await handleRedirect();
    return { justLoggedIn, sharedName: fromLink ? shared.name : null, sharedCount: fromLink ? known(shared.songs).length : 0 };
  }
  function start() {
    started = true;
    if (src.type === 'spotify') playSpotify(src.uri); else applyYT();
  }

  return {
    init, start, togglePlay, next, prev, openDialog,
    openBuilder: () => openBuilder(null),
    isOpen: () => dlg.open || bdlg.open,
  };
})();
