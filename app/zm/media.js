/* Zunora Messenger am PC — Fotos bearbeiten vor dem Senden, Einmal-Ansicht, Videos, Sprachnachrichten mit Wellenform.
 * Gleiche Funktionen wie am Handy (MMedia.kt). Helfer kommen von ui.js: H = { esc, I, S, Api, toast, tryDo, renderAll, nameOf } */
(function (root) {
  'use strict';
  const T = (s) => (root.ZLang ? root.ZLang.t(s) : s);
  const mmss = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
  const FILTERS = [['Original', 'none'], ['S/W', 'grayscale(1)'], ['Warm', 'sepia(.25) saturate(1.2) hue-rotate(-8deg)'], ['Kühl', 'saturate(1.05) hue-rotate(12deg) brightness(1.03)'],
    ['Lebhaft', 'saturate(1.6) contrast(1.05)'], ['Vintage', 'sepia(.75) contrast(.95)'], ['Kontrast', 'contrast(1.35)']];
  const ASPECTS = [['Original', 0], ['1:1', 1], ['4:5', 0.8], ['16:9', 16 / 9], ['9:16', 9 / 16]];
  const COLORS = ['#ffffff', '#111827', '#ff4d4d', '#ffc23d', '#2fbf71', '#3b82f6', '#9b7bff', '#ff7ad9'];
  const EMOJIS = ['😂', '😍', '🔥', '❤️', '👍', '🎉', '😎', '🥳', '✨', '💯', '😮', '🙈', '⭐', '🌈', '☀️', '🍕'];

  // =========================================================================================== Vorschau + Bearbeiten
  function preview(file, chat, H) {
    const video = file.type.startsWith('video/');
    const o = document.createElement('div'); o.className = 'ed'; document.body.appendChild(o);
    let img = null, rot = 0, aspect = 0, filter = 0, tool = '', pen = COLORS[2], penW = 0.012, once = false, busy = false;
    const strokes = [], labels = []; let vInfo = null;
    const url = URL.createObjectURL(file);
    o.innerHTML = `<div class="ed-top"><button class="ico ed-x" title="${T('Abbrechen')}">✕</button><div class="ed-tools">${video ? '' : [['undo', '↶', 'Rückgängig'], ['rot', '⟳', 'Drehen'], ['crop', '✂', 'Zuschneiden'], ['draw', '✎', 'Malen'], ['text', 'Aa', 'Text'], ['emoji', '☺', 'Emoji'], ['filter', '◐', 'Filter']]
        .map(([k, i, t]) => `<button class="ed-tool" data-tool="${k}"><b>${i}</b><span>${T(t)}</span></button>`).join('')}</div></div>
      <div class="ed-stage">${video ? `<video class="ed-video" src="${url}" controls></video>` : '<canvas class="ed-cv"></canvas>'}</div>
      <div class="ed-bar"></div><div class="ed-hint small"></div>
      <div class="ed-bottom"><input class="ed-cap" maxlength="1000" placeholder="${T(video ? 'Text zum Video …' : 'Text zum Foto …')}"><button class="ed-once" title="${T('Einmal-Ansicht')}">1</button><button class="ed-send" title="${T('Senden')}">${H.I('send', 20)}</button></div>`;
    const cv = o.querySelector('.ed-cv'), bar = o.querySelector('.ed-bar'), hint = o.querySelector('.ed-hint');
    const close = () => { URL.revokeObjectURL(url); o.remove(); document.removeEventListener('keydown', key, true); };
    const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    document.addEventListener('keydown', key, true);
    o.querySelector('.ed-x').onclick = close;
    const onceBtn = o.querySelector('.ed-once');
    const setHint = () => { hint.textContent = once ? T('① Einmal-Ansicht: kann nur einmal geöffnet werden — ohne Speichern oder Weiterleiten.') : tool === 'draw' ? T('Mit der Maus auf das Bild malen.') : labels.length ? T('Text und Emojis mit der Maus verschieben · Doppelklick = ändern · Rechtsklick = entfernen') : ''; };
    onceBtn.onclick = () => { once = !once; onceBtn.classList.toggle('on', once); setHint(); };

    // gedreht + zugeschnitten → Quelle (Leinwand ohne Malerei)
    function base() {
      const r90 = rot % 180 !== 0, W = r90 ? img.height : img.width, H0 = r90 ? img.width : img.height;
      let sw = W, sh = H0;
      if (aspect) { if (W / H0 > aspect) sw = Math.round(H0 * aspect); else sh = Math.round(W / aspect); }
      const c = document.createElement('canvas'); c.width = sw; c.height = sh; const x = c.getContext('2d');
      x.translate(sw / 2, sh / 2); x.rotate(rot * Math.PI / 180); x.drawImage(img, -img.width / 2, -img.height / 2);
      return c;
    }
    let src = null;
    function paint(target, b, scale) {
      const x = target.getContext('2d'); target.width = b.width * scale; target.height = b.height * scale;
      x.filter = FILTERS[filter][1]; x.drawImage(b, 0, 0, target.width, target.height); x.filter = 'none';
      const W = target.width, Hh = target.height;
      strokes.forEach((s) => { x.strokeStyle = s.c; x.lineWidth = s.w * W; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); s.p.forEach(([a, b2], i) => i ? x.lineTo(a * W, b2 * Hh) : x.moveTo(a * W, b2 * Hh)); if (s.p.length === 1) x.lineTo(s.p[0][0] * W + 0.1, s.p[0][1] * Hh); x.stroke(); });
      labels.forEach((l) => { x.font = `${l.emoji ? '' : '800 '}${Math.round(l.size * W)}px "Segoe UI","Segoe UI Emoji",sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = W * 0.01; x.shadowOffsetY = W * 0.004; x.fillStyle = l.c; x.fillText(l.t, l.x * W, l.y * Hh); x.shadowColor = 'transparent'; });
    }
    function draw() {
      if (!img) return; src = src || base();
      const stage = o.querySelector('.ed-stage'), maxW = stage.clientWidth - 20, maxH = stage.clientHeight - 20;
      const sc = Math.min(1, maxW / src.width, maxH / src.height);
      paint(cv, src, sc); setHint();
    }
    function toolbar() {
      o.querySelectorAll('.ed-tool').forEach((b) => b.classList.toggle('on', b.dataset.tool === tool));
      if (tool === 'crop') bar.innerHTML = ASPECTS.map(([n, a], i) => `<button class="chip ${aspect === a ? 'on' : ''}" data-asp="${i}">${T(n)}</button>`).join('');
      else if (tool === 'filter') bar.innerHTML = FILTERS.map(([n], i) => `<button class="chip ${filter === i ? 'on' : ''}" data-flt="${i}">${T(n)}</button>`).join('');
      else if (tool === 'emoji') bar.innerHTML = EMOJIS.map((e) => `<button class="ed-emo" data-emo="${e}">${e}</button>`).join('');
      else if (tool === 'draw') bar.innerHTML = COLORS.map((c) => `<button class="ed-col ${pen === c ? 'on' : ''}" data-col="${c}" style="background:${c}"></button>`).join('') +
        [[0.006, 'dünn'], [0.012, 'mittel'], [0.024, 'dick']].map(([w, n]) => `<button class="chip ${penW === w ? 'on' : ''}" data-pw="${w}">${T(n)}</button>`).join('');
      else bar.innerHTML = '';
      bar.querySelectorAll('[data-asp]').forEach((b) => b.onclick = () => { aspect = ASPECTS[+b.dataset.asp][1]; strokes.length = 0; labels.length = 0; src = null; draw(); toolbar(); });
      bar.querySelectorAll('[data-flt]').forEach((b) => b.onclick = () => { filter = +b.dataset.flt; draw(); toolbar(); });
      bar.querySelectorAll('[data-emo]').forEach((b) => b.onclick = () => { labels.push({ t: b.dataset.emo, c: '#fff', x: 0.5, y: 0.45 + (labels.length % 4) * 0.04, size: 0.14, emoji: true }); draw(); });
      bar.querySelectorAll('[data-col]').forEach((b) => b.onclick = () => { pen = b.dataset.col; toolbar(); });
      bar.querySelectorAll('[data-pw]').forEach((b) => b.onclick = () => { penW = +b.dataset.pw; toolbar(); });
      setHint();
    }
    function askText(l) {
      const t = prompt(T('Text eingeben …'), l ? l.t : ''); if (t === null) return;
      if (l) { if (t.trim()) l.t = t.trim().slice(0, 80); else labels.splice(labels.indexOf(l), 1); }
      else if (t.trim()) labels.push({ t: t.trim().slice(0, 80), c: pen === '#111827' ? '#111827' : '#ffffff', x: 0.5, y: 0.5, size: 0.08, emoji: false });
      draw();
    }
    o.querySelectorAll('.ed-tool').forEach((b) => b.onclick = () => {
      const k = b.dataset.tool;
      if (k === 'undo') { if (strokes.length && (tool === 'draw' || !labels.length)) strokes.pop(); else labels.pop(); draw(); return; }
      if (k === 'rot') { rot = (rot + 90) % 360; strokes.length = 0; labels.length = 0; src = null; draw(); return; }
      if (k === 'text') { tool = ''; toolbar(); askText(null); return; }
      tool = tool === k ? '' : k; toolbar();
    });
    if (cv) {
      // Malen, Text/Emoji verschieben
      const pos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
      const hit = (p) => { for (let i = labels.length - 1; i >= 0; i--) { const l = labels[i]; const w = l.size * (l.emoji ? 0.6 : l.t.length * 0.32), h = l.size * (cv.width / cv.height) * 0.7; if (Math.abs(p[0] - l.x) < w && Math.abs(p[1] - l.y) < h) return l; } return null; };
      let drag = null;
      cv.onpointerdown = (e) => { const p = pos(e); cv.setPointerCapture(e.pointerId);
        if (tool === 'draw') { strokes.push({ c: pen, w: penW, p: [p] }); drag = 'draw'; draw(); return; }
        const l = hit(p); if (l) drag = { l, dx: p[0] - l.x, dy: p[1] - l.y }; };
      cv.onpointermove = (e) => { if (!drag) return; const p = pos(e);
        if (drag === 'draw') { strokes[strokes.length - 1].p.push(p); draw(); } else { drag.l.x = Math.min(1, Math.max(0, p[0] - drag.dx)); drag.l.y = Math.min(1, Math.max(0, p[1] - drag.dy)); draw(); } };
      cv.onpointerup = () => { drag = null; };
      cv.ondblclick = (e) => { const l = hit(pos(e)); if (l && !l.emoji) askText(l); };
      cv.oncontextmenu = (e) => { e.preventDefault(); const l = hit(pos(e)); if (l) { labels.splice(labels.indexOf(l), 1); draw(); } };
      const im = new Image(); im.onload = () => { img = im; draw(); }; im.onerror = () => { H.toast(T('Das Bild ließ sich nicht öffnen.'), true); close(); }; im.src = url;
      addEventListener('resize', draw);
    } else {
      const v = o.querySelector('.ed-video');
      v.onloadeddata = () => { vInfo = { w: v.videoWidth, h: v.videoHeight, ms: Math.round((v.duration || 0) * 1000) }; try { v.currentTime = Math.min(0.5, (v.duration || 1) / 3); } catch (e) { } };
      v.onseeked = () => { if (vInfo && !vInfo.thumb) { const c = document.createElement('canvas'); c.width = 160; c.height = Math.max(1, Math.round(160 * v.videoHeight / v.videoWidth)); c.getContext('2d').drawImage(v, 0, 0, c.width, c.height); vInfo.thumb = c.toDataURL('image/jpeg', 0.6).split(',')[1]; } };
    }
    o.querySelector('.ed-send').onclick = async () => {
      if (busy) return; busy = true; const btn = o.querySelector('.ed-send'); btn.classList.add('busy');
      const cap = o.querySelector('.ed-cap').value;
      try {
        if (video) await H.S.sendVideo(chat, file, cap, once, vInfo || {});
        else { const out = document.createElement('canvas'); paint(out, src || base(), 1); const blob = await new Promise((ok) => out.toBlob(ok, 'image/jpeg', 0.9)); await H.S.sendImageBlob(chat, blob, cap, once); }
        close();
      } catch (e) { H.toast(e.message || String(e), true); busy = false; btn.classList.remove('busy'); }
    };
    o.querySelector('.ed-cap').onkeydown = (e) => { if (e.key === 'Enter') o.querySelector('.ed-send').click(); };
    setTimeout(() => o.querySelector('.ed-cap').focus(), 50);
  }

  // =========================================================================================== Blasen
  function fallbackWave(id) { let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) | 0; return Array.from({ length: 40 }, () => { h = (h * 1103515245 + 12345) | 0; return 25 + ((h >>> 16) & 0x7fff) % 60; }); }
  function squeeze(src, n) { if (!src.length) return []; return Array.from({ length: n }, (_, i) => { const a = Math.floor(i * src.length / n), b = Math.max(a + 1, Math.floor((i + 1) * src.length / n)); return Math.max(...src.slice(a, b)); }); }
  const heard = () => { try { return new Set(JSON.parse(localStorage.getItem('zm-gehoert') || '[]')); } catch (e) { return new Set(); } };
  let speed = 1;
  /** HTML für Einmal-Ansicht, Video und Sprachnachricht — sonst '' */
  function bodyHtml(m, c0, mine, H) {
    const { esc, S } = H; const md = c0.media;
    if (!md) return '';
    if (m.viewOnce && (m.kind === 'image' || m.kind === 'video')) {
      const c = S.chats.get(m.chatId); const others = c ? c.members.filter((x) => x.userId !== m.sender).length : 1;
      const who = S.onceOpened.get(m.id); if (who === undefined) { S.onceOpened.set(m.id, []); S.onceLoad([m.id]).then(() => { if (mine) S.onceSenderCleanup(m); }); }
      const n = (S.onceOpened.get(m.id) || []).length, me = !mine && S.openedByMe(m.id);
      const label = mine ? (others > 1 ? T('{0} von {1} geöffnet').replace('{0}', n).replace('{1}', others) : n ? T('Geöffnet') : T('Noch nicht geöffnet')) : me ? T('Geöffnet') : T('Klicken zum Ansehen');
      return `<div class="once ${!mine && !me ? 'go' : 'done'}" ${!mine && !me ? `data-once="${esc(m.id)}"` : ''}><span class="once-1">1</span><span><b>${T(m.kind === 'video' ? 'Video' : 'Foto')}</b><br><small>${label}</small></span></div>`;
    }
    if (m.kind === 'video') {
      const w = md.w || 16, h = md.h || 9;
      return `<div class="vthumb" data-video="${esc(m.id)}" style="aspect-ratio:${w}/${h}">${md.thumb ? `<img src="data:image/jpeg;base64,${esc(md.thumb)}" alt="">` : ''}<span class="vplay">▶</span>${md.ms ? `<span class="vdur">🎥 ${mmss(md.ms)}</span>` : ''}</div>`;
    }
    if (m.kind === 'voice') {
      const bars = squeeze(Array.isArray(md.wave) && md.wave.length ? md.wave : fallbackWave(m.id), 32);
      const fresh = !mine && !heard().has(m.id), dur = md.dur || c0.dur || 0;
      return `<div class="vmsg ${mine ? 'mine' : ''} ${fresh ? 'fresh' : ''}" data-vmsg="${esc(m.id)}" data-md="${esc(JSON.stringify(md))}" data-dur="${dur}">
        ${mine ? '' : `<span class="vav">${H.uav(m.sender, 's')}<i>${H.I('mic', 10)}</i></span>`}<button class="vplaybtn" title="${T('Abspielen')}">▶</button>
        <div class="vbody"><div class="vwave">${bars.map((v) => `<i style="height:${12 + v * 0.88}%"></i>`).join('')}</div><div class="vmeta"><span class="vtime">${mmss(dur)}</span>${fresh ? '<span class="vdot"></span>' : ''}<button class="vspeed hidden">${speed === 1 ? '1×' : speed === 1.5 ? '1,5×' : '2×'}</button>${canText() ? `<button class="vtextbtn" title="${T('Als Text anzeigen (nur auf diesem PC umgewandelt)')}">Aa</button>` : ''}</div></div></div>${textLine(m.id)}`;
    }
    return '';
  }

  // =========================================================================================== Nachladen + Klicks
  // Sprachnachrichten-Wiedergabe für das ganze Programm: läuft weiter, wenn man den Chat wechselt.
  // Danach spielt die nächste ungehörte Sprachnachricht desselben Chats. Leiste oben + Windows-Medientasten.
  const P = { id: null, chat: null, md: null, dur: 0, sender: null, at: 0, a: null, loading: false };
  let lastH = null;
  const spText = () => speed === 1 ? '1×' : speed === 1.5 ? '1,5×' : '2×';
  const posOf = () => { const a = P.a; if (!a) return 0; return a.duration && isFinite(a.duration) ? a.currentTime / a.duration : a.currentTime * 1000 / Math.max(1, P.dur); };
  function markHeard(id) {
    const s = heard(); if (s.has(id)) return; s.add(id);
    try { localStorage.setItem('zm-gehoert', JSON.stringify([...s].slice(-500))); } catch (e) { }
    document.querySelectorAll(`[data-vmsg="${CSS.escape(id)}"]`).forEach((el) => { el.classList.remove('fresh'); const d = el.querySelector('.vdot'); if (d) d.remove(); });
  }
  function sync(el) {
    const me = el.dataset.vmsg === P.id, a = me ? P.a : null, dur = +el.dataset.dur || 0;
    const btn = el.querySelector('.vplaybtn'), wave = el.querySelector('.vwave'), time = el.querySelector('.vtime'), sp = el.querySelector('.vspeed');
    const playing = !!(a && !a.paused);
    btn.textContent = me && P.loading ? '…' : playing ? '❚❚' : '▶';
    el.classList.toggle('playing', playing); sp.classList.toggle('hidden', !me); sp.textContent = spText();
    const f = me ? posOf() : 0, bars = wave.children;
    for (let i = 0; i < bars.length; i++) bars[i].classList.toggle('on', (i + 0.5) / bars.length <= f);
    time.textContent = mmss(me && f > 0 ? (a && isFinite(a.duration) ? a.currentTime * 1000 : f * dur) : dur);
  }
  function paint() { document.querySelectorAll('[data-vmsg]').forEach(sync); bar(); }
  function infoOf(m) { const md = (m.content || {}).media || {}; return { id: m.id, chat: m.chatId, md, dur: md.dur || (m.content || {}).dur || 0, sender: m.sender, at: m.at || 0 }; }
  // =========================================================================================== Sprachnachricht als Text
  // Nur auf diesem PC: entschlüsselte Aufnahme → WAV (16 kHz mono) → Windows-Spracherkennung (offline, VoiceText.cs). Nichts geht ins Internet.
  // Ergebnis bleibt nur hier gespeichert (localStorage), nie am Server.
  const canText = () => !!(root.Host && root.Host.available);
  const textMap = () => { try { return JSON.parse(localStorage.getItem('zm-sprachtext') || '{}'); } catch (e) { return {}; } };
  const textBusy = new Set(), textErr = new Map();
  function textLine(id) {
    const t = textMap()[id], e = textErr.get(id);
    if (textBusy.has(id)) return `<div class="vtxt busy" data-vtxt="${escA(id)}">${T('Wird in Text umgewandelt …')}</div>`;
    if (e) return `<div class="vtxt err" data-vtxt="${escA(id)}">⚠ ${escA(e)}</div>`;
    if (t !== undefined) return `<div class="vtxt" data-vtxt="${escA(id)}">${t ? escA(t) : `<i>${T('(nichts verstanden)')}</i>`}${root.ZMChat2 ? root.ZMChat2.voiceTrLine(id, t) : ''}<button class="vtxt-x" title="${T('Ausblenden')}">✕</button></div>`;
    return '';
  }
  const escA = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function b64(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }
  /** Audio → WAV 16 kHz mono 16 bit */
  async function toWav(url) {
    const buf = await (await fetch(url)).arrayBuffer();
    const ac = new AudioContext(); let audio;
    try { audio = await ac.decodeAudioData(buf); } finally { try { ac.close(); } catch (e) { } }
    const len = Math.max(1, Math.ceil(audio.duration * 16000));
    const off = new OfflineAudioContext(1, len, 16000); const src = off.createBufferSource(); src.buffer = audio; src.connect(off.destination); src.start();
    const pcm = (await off.startRendering()).getChannelData(0);
    const out = new DataView(new ArrayBuffer(44 + pcm.length * 2)); const w = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); out.setUint32(4, 36 + pcm.length * 2, true); w(8, 'WAVE'); w(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
    out.setUint32(24, 16000, true); out.setUint32(28, 32000, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, pcm.length * 2, true);
    for (let i = 0; i < pcm.length; i++) { const v = Math.max(-1, Math.min(1, pcm[i])); out.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true); }
    return new Uint8Array(out.buffer);
  }
  function showText(id) { document.querySelectorAll(`[data-vmsg="${CSS.escape(id)}"]`).forEach((el) => { const old = el.parentElement && el.parentElement.querySelector(`[data-vtxt="${CSS.escape(id)}"]`); if (old) old.remove(); el.insertAdjacentHTML('afterend', textLine(id)); }); }
  async function transcribe(id, md, H) {
    if (textBusy.has(id)) return;
    if (textMap()[id] !== undefined) { const m = textMap(); delete m[id]; try { localStorage.setItem('zm-sprachtext', JSON.stringify(m)); } catch (e) { } showText(id); return; }   // zweites Klicken = ausblenden
    textBusy.add(id); textErr.delete(id); showText(id);
    try {
      const wav = await toWav(await H.S.mediaUrl(id, md));
      const r = await root.Host.call('voice.transcribe', { wav: b64(wav), lang: (root.ZLang && root.ZLang.lang) || 'de' });
      const m = textMap(); m[id] = String((r && r.text) || '').slice(0, 5000);
      const keys = Object.keys(m); if (keys.length > 300) keys.slice(0, keys.length - 300).forEach((k) => delete m[k]);
      try { localStorage.setItem('zm-sprachtext', JSON.stringify(m)); } catch (e) { }
    } catch (e) { textErr.set(id, e.message || String(e)); }
    textBusy.delete(id); showText(id);
  }
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('.vtxt-x'); if (!b) return; e.stopPropagation(); const box = b.closest('[data-vtxt]'); const id = box.dataset.vtxt; const m = textMap(); delete m[id]; try { localStorage.setItem('zm-sprachtext', JSON.stringify(m)); } catch (x) { } box.remove(); }, true);

  // Jeder Start bekommt eine Nummer; ein älterer, noch ladender Start verwirft sich selbst → nie zwei Sprachnachrichten gleichzeitig
  // (früher: doppelt, wenn man während des Ladens auf die Welle klickte).
  let gen = 0;
  async function play(info, from) {
    if (P.id === info.id && P.loading) { P.from = from; return; }      // lädt schon: nur die Startstelle merken
    stop(false); const H = lastH; if (!H) return;
    const g = gen;
    Object.assign(P, info, { loading: true, a: null, from }); paint();
    try {
      const u = await H.S.mediaUrl(info.id, info.md);
      if (g !== gen) return;                                           // inzwischen etwas anderes gewählt oder gestoppt
      const a = new Audio(u); a.playbackRate = speed; P.a = a;
      a.ontimeupdate = paint; a.onplay = paint; a.onpause = paint; a.onended = () => { if (P.a === a) next(); };
      const start = P.from || 0;
      if (start > 0) a.addEventListener('loadedmetadata', () => { const d = isFinite(a.duration) ? a.duration : P.dur / 1000; a.currentTime = Math.min(0.99, start) * d; }, { once: true });
      if (info.sender !== H.Api.userId) markHeard(info.id);
      P.loading = false; await a.play();
      if (P.a !== a) { try { a.pause(); } catch (e) { } return; }         // während des Startens gestoppt
      media();
    } catch (e) { if (g === gen) { stop(); H.toast(e.message || String(e), true); } }
  }
  function toggle() { const a = P.a; if (!a) return; if (a.paused) a.play().catch(() => { }); else a.pause(); }
  function stop(render = true) {
    gen++;
    if (P.a) { try { const a = P.a; a.onended = a.ontimeupdate = a.onplay = a.onpause = null; a.pause(); a.removeAttribute('src'); a.load(); } catch (e) { } }
    Object.assign(P, { id: null, chat: null, a: null, loading: false });
    try { if (navigator.mediaSession) navigator.mediaSession.metadata = null; } catch (e) { }
    if (render) paint();
  }
  function next() {
    const done = { ...P }; stop(false); const H = lastH;
    const l = H ? (H.S.messages.get(done.chat) || []).slice().sort((x, y) => (x.at || 0) - (y.at || 0)) : [];
    const n = l.find((m) => m.kind === 'voice' && !m.deleted && (m.at || 0) > done.at && m.sender !== H.Api.userId && !heard().has(m.id));
    if (n) play(infoOf(n), 0); else paint();
  }
  function title() {
    const H = lastH; if (!H || !P.id) return '';
    const who = P.sender === H.Api.userId ? T('Du') : H.S.nameOf(P.sender), c = H.S.chats.get(P.chat);
    return c && c.title && c.title !== who ? `${who} · ${c.title}` : who;
  }
  /** Windows-Medientasten / Medien-Anzeige */
  function media() {
    const ms = navigator.mediaSession; if (!ms) return;
    try {
      ms.metadata = new MediaMetadata({ title: '🎤 ' + title(), artist: 'Zunora Messenger' });
      ms.setActionHandler('play', () => toggle()); ms.setActionHandler('pause', () => toggle()); ms.setActionHandler('stop', () => stop());
    } catch (e) { }
  }
  /** Leiste oben (#voicebar), solange eine Sprachnachricht läuft und ihr Chat nicht offen ist */
  function bar() {
    const el = document.getElementById('voicebar'); const H = lastH; if (!el) return;
    if (!P.id || !H || (H.cur && H.cur() === P.chat)) { if (el.innerHTML) el.innerHTML = ''; return; }
    const a = P.a, playing = !!(a && !a.paused), f = posOf();
    const t = mmss(a && isFinite(a.duration) && f > 0 ? a.currentTime * 1000 : P.dur);
    if (!el.querySelector('.voicebar')) {
      el.innerHTML = `<div class="voicebar"><button class="vb-pp"></button><span class="vb-t" title="${H.esc(T('Chat öffnen'))}"></span><span class="vb-time"></span><button class="vb-sp"></button><button class="vb-x" title="${H.esc(T('Beenden'))}">✕</button><i class="vb-pos"></i></div>`;
      el.querySelector('.vb-pp').onclick = (e) => { e.stopPropagation(); toggle(); };
      el.querySelector('.vb-t').onclick = () => { if (P.chat && H.open) H.open(P.chat); };
      el.querySelector('.vb-sp').onclick = (e) => { e.stopPropagation(); speed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1; if (P.a) P.a.playbackRate = speed; paint(); };
      el.querySelector('.vb-x').onclick = (e) => { e.stopPropagation(); stop(); };
    }
    el.querySelector('.vb-pp').textContent = P.loading ? '…' : playing ? '❚❚' : '▶';
    el.querySelector('.vb-t').textContent = '🎤 ' + title();
    el.querySelector('.vb-time').textContent = t;
    el.querySelector('.vb-sp').textContent = spText();
    el.querySelector('.vb-pos').style.width = (Math.min(1, f) * 100).toFixed(1) + '%';
  }

  function hydrate(root0, H) {
    const { S } = H; lastH = H;
    root0.querySelectorAll('[data-once]').forEach((b) => { if (b.dataset.w) return; b.dataset.w = '1'; b.onclick = () => { const m = msg(S, b.dataset.once); if (m) viewer(m, true, H); }; });
    root0.querySelectorAll('[data-video]').forEach((b) => { if (b.dataset.w) return; b.dataset.w = '1'; b.onclick = () => { const m = msg(S, b.dataset.video); if (m) viewer(m, false, H); }; });
    root0.querySelectorAll('[data-vmsg]').forEach((el) => {
      if (el.dataset.w) { sync(el); return; } el.dataset.w = '1';
      const id = el.dataset.vmsg, md = JSON.parse(el.dataset.md), dur = +el.dataset.dur || 0;
      const btn = el.querySelector('.vplaybtn'), wave = el.querySelector('.vwave'), sp = el.querySelector('.vspeed');
      const info = () => { const m = msg(S, id); return m ? infoOf(m) : { id, chat: S.openChat, md, dur, sender: el.classList.contains('mine') ? H.Api.userId : null, at: 0 }; };
      btn.onclick = (e) => { e.stopPropagation(); if (P.id === id && P.a) toggle(); else if (P.id !== id) play(info(), 0); };
      wave.onclick = (e) => { e.stopPropagation(); const r = wave.getBoundingClientRect(), f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        if (P.id === id && P.a) { const d = isFinite(P.a.duration) ? P.a.duration : dur / 1000; P.a.currentTime = f * d; if (P.a.paused) toggle(); paint(); } else play(info(), f); };
      sp.onclick = (e) => { e.stopPropagation(); speed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1; if (P.a) P.a.playbackRate = speed; paint(); };
      const tb = el.querySelector('.vtextbtn'); if (tb) tb.onclick = (e) => { e.stopPropagation(); transcribe(id, md, H); };
      if (tb && root.ZMChat2 && root.ZMChat2.voiceAuto() && textMap()[id] === undefined && !textErr.has(id)) transcribe(id, md, H);          // automatisch umwandeln (Einstellung)
      sync(el);
    });
    bar();
  }
  const msg = (S, id) => [...S.messages.values()].flat().find((m) => m.id === id);

  /** Vollbild: Video bzw. Einmal-Ansicht (ohne Speichern; Bildschirmfoto-Schutz während der Ansicht) */
  function viewer(m, once, H) {
    const { S } = H; const md = (m.content || {}).media; if (!md) return;
    const o = document.createElement('div'); o.className = 'pv once-view'; document.body.appendChild(o);
    o.innerHTML = `<div class="pv-top"><div class="pv-who"><b>${H.esc(S.nameOf(m.sender))}</b><span>${once ? T('① Einmal-Ansicht — danach ist es weg') : ''}</span></div><button class="ico pv-x" title="${T('Schließen (Esc)')}">✕</button></div><div class="pv-stage"><div class="small" style="color:#fff">${T('Lädt …')}</div></div>${(m.content || {}).t ? `<div class="pv-cap">${H.esc(m.content.t)}</div>` : ''}`;
    const shield = once && root.Host && root.Host.available && localStorage.getItem('zm-bildschutz') !== '1';
    if (shield) root.Host.call('privacy.capture', { on: true }).catch(() => { });
    let done = false;
    const close = () => { if (done) return; done = true; o.remove(); document.removeEventListener('keydown', key, true);
      if (shield) root.Host.call('privacy.capture', { on: false }).catch(() => { });
      if (once) S.onceOpen(m).then(() => H.renderAll()); };
    const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    document.addEventListener('keydown', key, true);
    o.querySelector('.pv-x').onclick = close;
    o.oncontextmenu = (e) => { if (once) e.preventDefault(); };
    if (once) S.onceOpened.set(m.id, [...(S.onceOpened.get(m.id) || []), H.Api.userId]);
    S.mediaUrl(m.id, md).then((u) => {
      const st = o.querySelector('.pv-stage');
      if (m.kind === 'video') { st.innerHTML = `<video src="${u}" autoplay ${once ? 'controlslist="nodownload noplaybackrate" disablepictureinpicture' : 'controls'} style="max-width:92vw;max-height:80vh;border-radius:16px"></video>`; if (once) st.querySelector('video').onended = close; }
      else st.innerHTML = `<img src="${u}" alt="" draggable="false" style="max-width:92vw;max-height:80vh;border-radius:16px">`;
    }).catch((e) => { o.querySelector('.pv-stage').innerHTML = `<div style="color:#fff">${H.esc(e.message || T('Laden ging nicht.'))}</div>`; });
  }

  // =========================================================================================== Aufnahme
  let rec = null;
  /** Aufnahme in der Eingabezeile: Wellenform live, stoppen = vorhören, senden */
  function record(comp, chat, H, onEnd) {
    if (rec) return;
    H.tryDo(async () => {
      const nf = (localStorage.getItem('zm-sprach-rausch') || '1') !== '0';          // Hintergrundgeräusche filtern (Einstellungen → Anrufe)
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: nf, noiseSuppression: nf, autoGainControl: true } });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '';
      const r = new MediaRecorder(s, mime ? { mimeType: mime } : {}); const parts = []; const t0 = Date.now(); const levels = [];
      const ctx = new AudioContext(); const an = ctx.createAnalyser(); an.fftSize = 512; ctx.createMediaStreamSource(s).connect(an); const buf = new Uint8Array(an.fftSize);
      if (P.a && !P.a.paused) P.a.pause();          // beim Aufnehmen nichts abspielen
      rec = { r, s, ctx, levels, t0, parts, blob: null, ms: 0, audio: null, paused: 0, pausedAt: 0, once: false };
      const elapsed = () => (rec.pausedAt || Date.now()) - t0 - rec.paused;
      r.ondataavailable = (x) => { if (x.data.size) parts.push(x.data); };
      const box = document.createElement('div'); box.className = 'vrec'; comp.appendChild(box);
      box.innerHTML = `<button class="ico vr-del" title="${T('Verwerfen')}">${H.I('trash', 18)}</button><span class="vr-dot"></span><span class="vr-t">0:00</span><div class="vr-wave"></div><button class="ico vr-pause" title="${T('Pause')}">❚❚</button><button class="ico vr-stop" title="${T('Stoppen und anhören')}"><i class="vr-sq"></i></button><button class="ico vr-once" title="${T('Einmal anhören: nach dem ersten Abspielen ist sie weg')}"><b>1</b></button><button class="send vr-send" title="${T('Senden')}">${H.I('send', 18)}</button>`;
      const wave = box.querySelector('.vr-wave'), tEl = box.querySelector('.vr-t');
      const tick = setInterval(() => {
        if (rec && rec.pausedAt) return;
        an.getByteTimeDomainData(buf); let peak = 0; for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
        levels.push(Math.max(2, Math.min(100, Math.round(Math.sqrt(peak / 128) * 100))));
        const last = levels.slice(-48); wave.innerHTML = last.map((v) => `<i style="height:${12 + v * 0.88}%"></i>`).join('');
        tEl.textContent = mmss(elapsed());
        if (elapsed() > (root.ZPlus && root.ZPlus.active() ? 30 : 15) * 60000) stop();          // Sprachnachricht: 15 Min., mit Plus 30 Min.
      }, 70);
      const cleanup = () => { clearInterval(tick); s.getTracks().forEach((t) => t.stop()); try { ctx.close(); } catch (e) { } };
      const finish = () => { box.remove(); if (rec && rec.audio) { rec.audio.pause(); } rec = null; onEnd && onEnd(); };
      const stop = () => new Promise((ok) => { if (r.state === 'inactive') return ok(); if (rec.pausedAt) { rec.paused += Date.now() - rec.pausedAt; rec.pausedAt = 0; } r.onstop = () => { cleanup(); rec.ms = Date.now() - t0 - rec.paused; rec.blob = new Blob(parts, { type: r.mimeType || 'audio/webm' }); ok(); }; r.stop(); });
      const toPreview = async () => {
        await stop(); if (!rec) return;
        if (rec.ms < 700) { H.toast(T('Zu kurz — sprich etwas länger.'), true); finish(); return; }
        const u = URL.createObjectURL(rec.blob); const a = new Audio(u); rec.audio = a;
        const bars = squeeze(levels, 48);
        box.querySelector('.vr-dot').remove(); box.querySelector('.vr-stop').outerHTML = ''; const pz = box.querySelector('.vr-pause'); if (pz) pz.remove();
        tEl.outerHTML = `<button class="ico vr-play" title="${T('Anhören')}">▶</button>`;
        wave.innerHTML = bars.map((v) => `<i style="height:${12 + v * 0.88}%"></i>`).join('') ; wave.insertAdjacentHTML('afterend', `<span class="vr-t2">${mmss(rec.ms)}</span>`);
        const pb = box.querySelector('.vr-play');
        const paintPos = (f) => [...wave.children].forEach((b, i, l) => b.classList.toggle('on', (i + 0.5) / l.length <= f));
        a.ontimeupdate = () => paintPos(a.currentTime * 1000 / Math.max(1, rec ? rec.ms : 1));
        a.onended = () => { pb.textContent = '▶'; paintPos(0); };
        pb.onclick = () => { if (a.paused) { a.play(); pb.textContent = '❚❚'; } else { a.pause(); pb.textContent = '▶'; } };
        wave.onclick = (e) => { const rr = wave.getBoundingClientRect(); a.currentTime = (e.clientX - rr.left) / rr.width * rec.ms / 1000; if (a.paused) pb.click(); };
      };
      box.querySelector('.vr-del').onclick = async () => { await stop(); finish(); };
      box.querySelector('.vr-stop').onclick = toPreview;
      box.querySelector('.vr-pause').onclick = (e) => { const b = e.currentTarget; if (r.state === 'recording') { r.pause(); rec.pausedAt = Date.now(); b.innerHTML = H.I('mic', 18); b.title = T('Weiter aufnehmen'); } else if (r.state === 'paused') { r.resume(); rec.paused += Date.now() - rec.pausedAt; rec.pausedAt = 0; b.textContent = '❚❚'; b.title = T('Pause'); } };
      box.querySelector('.vr-once').onclick = (e) => { rec.once = !rec.once; e.currentTarget.classList.toggle('on', rec.once); };
      box.querySelector('.vr-send').onclick = () => H.tryDo(async () => {
        if (!rec.blob) await stop();
        const x = rec; if (x.ms < 700) { H.toast(T('Zu kurz — sprich etwas länger.'), true); finish(); return; }
        finish(); await H.S.sendVoice(chat, x.blob, x.ms, squeeze(x.levels, 40), x.once);
      });
      r.start(250);
    });
  }
  const recording = () => !!rec;

  root.ZMMedia = { preview, bodyHtml, hydrate, record, recording, bar, stopVoice: () => stop(), pauseVoice: () => { if (P.a && !P.a.paused) P.a.pause(); } };
})(window);
