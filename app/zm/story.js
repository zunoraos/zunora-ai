/* Zunora Messenger am PC — Storys wie bei Snapchat/TikTok (gleiches Format wie MStory.kt am Handy):
 * Ebenen auf jedem Status (Text, bewegte Sticker, Malen), interaktive Sticker (Frage, Countdown, Emoji-Regler, Uhrzeit, Ort),
 * mehrere Clips, Boomerang (Bilderstreifen hin und her), Zeitraffer, Highlights und privates Archiv.
 * Positionen sind relativ (0–1) zur Story-Fläche. */
(function (root) {
  'use strict';
  const { Api } = root.ZM; const S = root.ZM.Store; const C = root.ZMC;
  const T = (s) => (root.ZLang && root.ZLang.tr ? root.ZLang.tr(s) : s);
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const time = (s) => (s ? Date.parse(s) : 0) || 0;
  const COLORS = ['#FFFFFF', '#111827', '#FF4D4D', '#FFC23D', '#2FBF71', '#3B82F6', '#9B7BFF', '#FF7AD9'];
  const EMOJIS = [['😂', 'wackel'], ['😍', 'herz'], ['🔥', 'wobbel'], ['❤️', 'herz'], ['🥳', 'tanz'], ['😎', 'hops'], ['✨', 'blink'], ['👍', 'hops'], ['😭', 'schuettel'],
    ['🙈', 'wackel'], ['🎉', 'schuettel'], ['💯', 'puls'], ['🌈', 'schweb'], ['⭐', 'blink'], ['🍕', 'dreh'], ['😴', 'schweb'], ['💪', 'puls'], ['🤯', 'puls']];
  const r3 = (f) => Math.round(f * 1000) / 1000;

  // =========================================================================================== Ebenen anzeigen
  const slider = new Map();
  async function loadSlider(id) { try { slider.set(id, new Map((await Api.list(`status_slider?status_id=eq.${id}&select=user_id,value`)).map((r) => [r.user_id, r.value]))); } catch (e) { } }
  const pad2 = (n) => String(n).padStart(2, '0');
  function countHtml(o) {
    const left = Math.max(0, Math.floor(((o.at || 0) - Date.now()) / 1000));
    return left ? [[Math.floor(left / 86400), 'Tg'], [Math.floor(left % 86400 / 3600), 'Std'], [Math.floor(left % 3600 / 60), 'Min'], [left % 60, 'Sek']].map(([v, l]) => `<span><b>${pad2(v)}</b><small>${T(l)}</small></span>`).join('') : `<b class="now">${T('Jetzt! 🎉')}</b>`;
  }
  /** HTML der Ebenen (Ansehen: edit=false; Bearbeiten: edit=true) */
  function layersHtml(list, it, mine, edit) {
    const draws = list.filter((o) => o.t === 'draw' && (o.p || []).length >= 4);
    let h = draws.length ? `<svg class="sto-draw" viewBox="0 0 1000 1000" preserveAspectRatio="none">${draws.map((o) => { let d = ''; for (let k = 0; k + 1 < o.p.length; k += 2) d += (k ? 'L' : 'M') + Math.round(o.p[k] * 1000) + ' ' + Math.round(o.p[k + 1] * 1000);
      return `<path d="${d}" stroke="${esc(o.c || '#fff')}" stroke-width="${Math.round((o.w || 0.012) * 1000)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`; }).join('')}</svg>` : '';
    list.forEach((o, k) => {
      if (o.t === 'draw') return;
      const pos = `left:${(o.x ?? 0.5) * 100}%;top:${(o.y ?? 0.5) * 100}%`;
      let inner = '';
      if (o.t === 'txt') inner = `<div class="sto-txt" style="color:${esc(o.c || '#fff')};font-size:${(o.z || 0.08) * 100}cqw">${esc(o.s)}</div>`;
      else if (o.t === 'emo') inner = `<div class="stk ${o.a ? 'a-' + esc(o.a) : ''}"><span class="stk-e" style="font-size:${(o.z || 0.24) * 66}cqw">${esc(o.s)}</span></div>`;
      else if (o.t === 'frage') inner = `<div class="sto-card sto-q"><div class="sto-qh">${esc(o.s || T('Frag mich was!'))}</div><div class="sto-qb" ${!mine && !edit ? `data-sto-ask="${esc(o.s || T('Frag mich was!'))}"` : ''}>${T(mine || edit ? 'Antworten kommen als private Nachricht' : 'Klicke, um zu antworten …')}</div></div>`;
      else if (o.t === 'count') inner = `<div class="sto-card sto-count"><small>${esc((o.s || T('Countdown')).toUpperCase())}</small><div class="sto-cd" data-at="${o.at || 0}">${countHtml(o)}</div><small>${new Date(o.at || 0).toLocaleString(root.ZLang ? root.ZLang.lang : 'de', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</small></div>`;
      else if (o.t === 'slider') {
        const v = it ? slider.get(it.id) : null, my = v && v.get(Api.userId), all = v ? [...v.values()] : [], avg = all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : null;
        const pos2 = mine ? (avg ?? 50) : (my ?? 50);
        inner = `<div class="sto-card sto-sl"><b>${esc(o.s || T("Wie findest du's?"))}</b><div class="sto-track" ${!mine && !edit && it && my == null ? 'data-sto-slide' : ''}><i style="width:${pos2}%"></i><span style="left:${pos2}%;font-size:${30 + pos2 / 10}px">${esc(o.e || '😍')}</span></div>
          <small>${mine ? T('{0} Antworten · Durchschnitt {1} %').replace('{0}', all.length).replace('{1}', avg ?? '–') : my != null ? T('Deine Antwort: {0} %').replace('{0}', my) : edit ? T('Freunde ziehen den Regler') : T('Zieh das Emoji')}</small></div>`;
      } else if (o.t === 'zeit') inner = `<div class="sto-chip">🕐 ${new Date(it ? it.at : Date.now()).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</div>`;
      else if (o.t === 'ort') inner = `<div class="sto-chip">📍 ${esc(o.s)}</div>`;
      h += `<div class="sto-ov ${edit ? 'edit' : ''} ${['frage', 'count', 'slider'].includes(o.t) ? 'ia' : ''}" data-ov="${k}" style="${pos}">${inner}</div>`;
    });
    return `<div class="sto-layers">${h}</div>`;
  }
  /** Ansehen: Ebenen einsetzen und Frage/Regler/Countdown verdrahten */
  function wireView(stage, it, mine, H, pause) {
    const list = ((it.content || {}).ov) || []; if (!list.length) return () => { };
    const draw = () => { const old = stage.querySelector('.sto-layers'); if (old) old.remove(); stage.insertAdjacentHTML('beforeend', layersHtml(list, it, mine, false)); wire(); };
    const wire = () => {
      stage.querySelectorAll('.sto-ov.ia').forEach((e) => { e.onclick = (ev) => ev.stopPropagation(); e.onpointerdown = (ev) => ev.stopPropagation(); });
      stage.querySelectorAll('[data-sto-ask]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); ask(b.dataset.stoAsk, it, H, pause); });
      const tr = stage.querySelector('[data-sto-slide]');
      if (tr) tr.onpointerdown = (e) => { e.stopPropagation(); tr.setPointerCapture(e.pointerId); const set = (ev) => { const r = tr.getBoundingClientRect(); const f = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)); tr.querySelector('i').style.width = f * 100 + '%'; const sp = tr.querySelector('span'); sp.style.left = f * 100 + '%'; tr.dataset.v = Math.round(f * 100); };
        set(e); tr.onpointermove = set; tr.onpointerup = async () => { tr.onpointermove = null; const v = +tr.dataset.v || 0; const m = slider.get(it.id) || new Map(); m.set(Api.userId, v); slider.set(it.id, m);
          try { await Api.rest('POST', 'status_slider?on_conflict=status_id,user_id', { status_id: it.id, value: v }, 'resolution=merge-duplicates'); } catch (x) { } draw(); }; };
    };
    draw();
    if (list.some((o) => o.t === 'slider') && !slider.has(it.id)) loadSlider(it.id).then(draw);
    const iv = list.some((o) => o.t === 'count') ? setInterval(() => stage.querySelectorAll('.sto-cd').forEach((d) => { d.innerHTML = countHtml({ at: +d.dataset.at }); }), 1000) : 0;
    return () => clearInterval(iv);
  }
  function ask(q, it, H, pause) {
    pause && pause(true);
    const o = document.createElement('div'); o.className = 'sto-ask';
    o.innerHTML = `<div class="sto-askbox"><b>❓ ${esc(q)}</b><textarea rows="3" maxlength="500" placeholder="${esc(T('Deine Antwort …'))}"></textarea><small>${esc(T('Geht als private Nachricht an {0}.').replace('{0}', S.nameOf(it.user)))}</small>
      <div class="rowb"><button class="btn ghost" data-a="x">${T('Abbrechen')}</button><button class="btn" data-a="go">${T('Senden')}</button></div></div>`;
    document.body.appendChild(o); const ta = o.querySelector('textarea'); setTimeout(() => ta.focus(), 30); ta.onkeydown = (e) => e.stopPropagation();
    const close = () => { o.remove(); pause && pause(false); };
    o.querySelector('[data-a="x"]').onclick = close; o.onclick = (e) => { if (e.target === o) close(); };
    o.querySelector('[data-a="go"]').onclick = () => { const t = ta.value.trim(); if (!t) return; close(); H.tryDo(async () => { await S.replyStatus(it, '❓ ' + q.slice(0, 120) + '\n' + t); H.toast(T('Antwort gesendet')); }); };
  }

  // =========================================================================================== Bearbeiten (im Status-Erstellen)
  function toolsHtml(state) {
    const b = (k, l) => `<button class="${state.tool === k ? 'on' : ''}" data-sto-tool="${k}">${T(l)}</button>`;
    return `<div class="zs-lab">${T('Story-Werkzeuge')}</div><div class="zs-chips">${b('txt', 'Aa Text')}${b('emo', '☺ Sticker')}${b('draw', '✎ Malen')}${b('frage', '❓ Frage')}${b('count', '⏳ Countdown')}${b('slider', '😍 Regler')}${b('zeit', '🕐 Uhrzeit')}${b('ort', '📍 Ort')}</div>
      ${state.tool === 'emo' ? `<div class="zs-chips">${EMOJIS.map(([e, a]) => `<button class="sto-emo-pick" data-sto-emo="${e}" data-a="${a}"><span class="stk a-${a}"><span class="stk-e">${e}</span></span></button>`).join('')}</div>` : ''}
      ${state.tool === 'draw' ? `<div class="zs-chips">${COLORS.map((c) => `<button class="sto-col ${state.pen === c ? 'on' : ''}" data-sto-pen="${c}" style="background:${c}"></button>`).join('')}<button data-sto-undo>↶ ${T('Rückgängig')}</button></div><div class="zs-hint">${T('Mit der Maus auf die Story malen.')}</div>` : ''}
      ${state.ovs.length && state.tool !== 'draw' ? `<div class="zs-hint">${T('Ebenen mit der Maus verschieben · Rechtsklick = entfernen')}</div>` : ''}`;
  }
  /** Werkzeuge + Bearbeiten auf der Karte. state = { ovs, tool, pen }; redraw() zeichnet den Dialog neu */
  function wireEdit(o, card, state, redraw) {
    o.querySelectorAll('[data-sto-tool]').forEach((b) => b.onclick = (e) => {
      e.stopPropagation(); const k = b.dataset.stoTool;
      if (k === 'zeit') { state.ovs.push({ t: 'zeit', x: 0.5, y: 0.3 }); redraw(); return; }
      if (k === 'emo' || k === 'draw') { state.tool = state.tool === k ? '' : k; redraw(); return; }
      state.tool = ''; const ask2 = (t) => { const v = prompt(T(t)); return v === null ? null : v.trim(); };
      if (k === 'txt') { const v = ask2('Text eingeben …'); if (v) state.ovs.push({ t: 'txt', s: v.slice(0, 120), c: state.pen === '#111827' ? '#111827' : '#FFFFFF', x: 0.5, y: 0.35, z: 0.08 }); }
      if (k === 'frage') { const v = ask2('Deine Frage (z. B. Frag mich was!)'); if (v !== null) state.ovs.push({ t: 'frage', s: v.slice(0, 80), x: 0.5, y: 0.6 }); }
      if (k === 'ort') { const v = ask2('Ort (z. B. Berlin)'); if (v) state.ovs.push({ t: 'ort', s: v.slice(0, 40), x: 0.5, y: 0.25 }); }
      if (k === 'slider') { const v = ask2('Frage (z. B. Wie findest du\'s?)'); if (v !== null) { const e2 = ask2('Emoji (z. B. 😍)'); state.ovs.push({ t: 'slider', s: v.slice(0, 60), e: (e2 || '😍').slice(0, 8), x: 0.5, y: 0.62 }); } }
      if (k === 'count') { const n = ask2('Wofür? (z. B. Urlaub)'); if (n === null) return; const w = ask2('Wann? TT.MM.JJJJ HH:MM');
        const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})$/.exec(w || ''); const at = m ? new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]).getTime() : 0;
        if (!(at > Date.now())) { alert(T('Bitte Datum und Uhrzeit in der Zukunft eingeben, z. B. 24.12.2026 18:00')); return; } state.ovs.push({ t: 'count', s: n.slice(0, 40), at, x: 0.5, y: 0.6 }); }
      redraw();
    });
    o.querySelectorAll('[data-sto-emo]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); state.ovs.push({ t: 'emo', s: b.dataset.stoEmo, a: b.dataset.a, x: 0.5, y: 0.4 + (state.ovs.length % 4) * 0.05, z: 0.24 }); state.tool = ''; redraw(); });
    o.querySelectorAll('[data-sto-pen]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); state.pen = b.dataset.stoPen; redraw(); });
    const un = o.querySelector('[data-sto-undo]'); if (un) un.onclick = (e) => { e.stopPropagation(); for (let k = state.ovs.length - 1; k >= 0; k--) if (state.ovs[k].t === 'draw') { state.ovs.splice(k, 1); break; } redraw(); };
    if (!card) return;
    card.querySelectorAll('.sto-ov.edit').forEach((el) => {
      const ov = state.ovs[+el.dataset.ov];
      el.oncontextmenu = (e) => { e.preventDefault(); state.ovs.splice(+el.dataset.ov, 1); redraw(); };
      el.onpointerdown = (e) => { if (state.tool === 'draw' || e.button !== 0) return; e.stopPropagation(); e.preventDefault(); el.setPointerCapture(e.pointerId); const r = card.getBoundingClientRect();
        el.onpointermove = (ev) => { ov.x = r3(Math.max(0.05, Math.min(0.95, (ev.clientX - r.left) / r.width))); ov.y = r3(Math.max(0.05, Math.min(0.95, (ev.clientY - r.top) / r.height))); el.style.left = ov.x * 100 + '%'; el.style.top = ov.y * 100 + '%'; };
        el.onpointerup = () => { el.onpointermove = null; }; };
    });
    if (state.tool === 'draw') {
      card.style.cursor = 'crosshair';
      card.onpointerdown = (e) => { if (e.button !== 0) return; e.preventDefault(); card.setPointerCapture(e.pointerId); const r = card.getBoundingClientRect(); const d = { t: 'draw', c: state.pen, w: 0.012, x: 0, y: 0, p: [r3((e.clientX - r.left) / r.width), r3((e.clientY - r.top) / r.height)] }; state.ovs.push(d);
        card.onpointermove = (ev) => { if (d.p.length < 1600) { d.p.push(r3((ev.clientX - r.left) / r.width), r3((ev.clientY - r.top) / r.height)); const old = card.querySelector('.sto-layers'); if (old) old.outerHTML = layersHtml(state.ovs, null, true, true); } };
        card.onpointerup = () => { card.onpointermove = null; redraw(); }; };
    } else { card.style.cursor = ''; card.onpointerdown = null; }
  }

  // =========================================================================================== Boomerang (Bilderstreifen)
  async function boomerang(file) {
    const v = document.createElement('video'); v.muted = true; v.preload = 'auto'; const url = URL.createObjectURL(file); v.src = url;
    await new Promise((ok, bad) => { v.onloadeddata = ok; v.onerror = () => bad(new Error(T('Aus diesem Video ließ sich kein Boomerang machen.'))); });
    const n = 14, dur = Math.min(1.6, v.duration || 1.6), fw = 480, fh = Math.min(860, Math.round(fw * v.videoHeight / Math.max(1, v.videoWidth)));
    const cv = document.createElement('canvas'); cv.width = fw * n; cv.height = fh; const g = cv.getContext('2d');
    for (let k = 0; k < n; k++) { v.currentTime = dur * k / n; await new Promise((ok) => { v.onseeked = ok; }); g.drawImage(v, k * fw, 0, fw, fh); }
    URL.revokeObjectURL(url);
    const jpeg = new Uint8Array(await (await new Promise((ok) => cv.toBlob(ok, 'image/jpeg', 0.78))).arrayBuffer());
    const s = await C.sealFile(jpeg); const path = `${Api.userId}/${crypto.randomUUID()}.bin`;
    await Api.upload('status-media', path, s.bytes);
    return { path, key: s.key, iv: s.iv, sha: s.sha, w: fw, h: fh, frames: n };
  }
  /** Boomerang im Ansehen: Bild als Streifen hin und her */
  function playBoomerang(img, md) {
    const n = md.frames; let k = 0, dir = 1;
    const box = img.parentElement; const cv = document.createElement('canvas'); cv.className = 'zs-media'; cv.width = md.w; cv.height = md.h; img.replaceWith(cv);
    const g = cv.getContext('2d'); const iv = setInterval(() => { if (!cv.isConnected) { clearInterval(iv); return; } g.drawImage(img, k * md.w, 0, md.w, md.h, 0, 0, md.w, md.h); k += dir; if (k >= n - 1) dir = -1; if (k <= 0) dir = 1; }, 70);
    return box;
  }

  // =========================================================================================== Highlights + Archiv
  async function toItems(rows) {
    rows = rows || []; const users = [...new Set(rows.map((r) => r.user_id))]; await S.loadProfiles(users); await S.devices(users);
    const out = [];
    for (const o of rows) { let content = null, problem = null;
      try { content = (await C.decrypt(o.cipher, 'status', o.id, o.sender_device, S.deviceId, S.keys, S.signKeys.get(o.sender_device))).content; } catch (e) { problem = e.message; }
      out.push({ id: o.id, user: o.user_id, at: time(o.created_at), content, problem, mode: o.audience_mode, hl: o.highlight || '' }); }
    return out;
  }
  const archive = async () => toItems(await Api.rpc('my_status_archive', {}));
  const highlightsOf = async (u) => toItems(await Api.rpc('status_highlights_of', { u }));
  async function setHighlight(id, title) {
    if (title == null) await Api.rest('DELETE', `status_highlights?status_id=eq.${id}`);
    else await Api.rest('POST', 'status_highlights?on_conflict=status_id', { status_id: id, title: String(title).trim().slice(0, 30) || 'Highlights' }, 'resolution=merge-duplicates');
  }
  S.storyLists = S.storyLists || new Map();
  function openList(key, items, H) { S.storyLists.set(key, items); root.ZMStatus.view(key, H); }
  /** Highlights-Kreise (Profil) */
  async function highlightsHtml(u) {
    const l = await highlightsOf(u).catch(() => []); if (!l.length) return { html: '', l };
    const groups = new Map(); l.forEach((x) => (groups.get(x.hl) || groups.set(x.hl, []).get(x.hl)).push(x));
    return { l, html: `<div class="sto-hls">${[...groups.entries()].map(([t, g]) => `<button class="sto-hl" data-sto-hl="${esc(t)}"><span>${esc(((g[0].content || {}).t || '').slice(0, 2) || '⭐')}</span><small>${esc(t)}</small></button>`).join('')}</div>` };
  }

  root.ZMStory = { layersHtml, wireView, toolsHtml, wireEdit, boomerang, playBoomerang, archive, highlightsOf, setHighlight, openList, highlightsHtml };
})(window);
