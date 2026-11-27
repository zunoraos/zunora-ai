/* Zunora Messenger am PC — Status (modern wie bei Instagram/WhatsApp/TikTok, 22.11.2026): Story-Ringe, Story-Karte mit Pfeilen,
   Mausrad / Pfeil hoch-runter = nächste Person, links/rechts = Status zurück/weiter, Herzen (Doppelklick), Ende-zu-Ende verschlüsselte
   Kommentare, Teilen, Video bis 60 Sekunden, Filter, Farbverläufe, Schriften, Ausrichtung. Gleiches Format wie am Handy (MStatus.kt). */
(function (root) {
  'use strict';
  const { Api } = root.ZM;
  const S = root.ZM.Store;
  const C = root.ZMC;
  const time = (s) => (s ? Date.parse(s) : 0) || 0;
  const enc = new TextEncoder(), dec = new TextDecoder();
  const T = (s) => (root.ZLang && root.ZLang.tr ? root.ZLang.tr(s) : s);
  const MAX_SEC = 60, MAX_BYTES = 48 * 1024 * 1024;
  const LOOKS = [['Original', ''], ['Lebendig', 'saturate(1.45)'], ['Warm', 'sepia(.25) saturate(1.2) brightness(1.04)'], ['Kühl', 'hue-rotate(-12deg) saturate(1.1)'],
    ['Schwarzweiß', 'grayscale(1)'], ['Film', 'sepia(.35) contrast(.95) brightness(1.06)'], ['Sepia', 'sepia(1)']];
  const DURATIONS = [[24, '24 Std.'], [72, '3 Tage'], [168, '7 Tage']];
  S.statusLikes = new Map(); S.statusComments = new Map();

  // =================================================================================== Daten
  const oldLoad = S.loadStatuses;
  S.loadStatuses = async function () {
    await oldLoad.call(this);
    try {
      const l = await Api.list('status_likes?select=status_id,user_id&limit=5000');
      const m = new Map(); for (const r of l) (m.get(r.status_id) || m.set(r.status_id, new Set()).get(r.status_id)).add(r.user_id);
      this.statusLikes = m;
      const cc = new Map(); for (const r of await Api.list('status_comments?select=status_id&limit=5000')) cc.set(r.status_id, (cc.get(r.status_id) || 0) + 1);
      this.statusComments = cc;
    } catch (e) { /* älterer Server */ }
    this.changed('status');
  };
  S.statusHours = () => +(localStorage.getItem('zm-status-stunden') || 24);
  const key32 = () => { const a = new Uint8Array(32); crypto.getRandomValues(a); return C.b64(a); };
  S.postStatusContent = async function (content, kind, a, hours) {
    a = a || this.statusAudience(); hours = hours || this.statusHours();
    const friends = S.friends.filter((f) => f.st === 'accepted').map((f) => f.p.id);
    const who = a.mode === 'except' ? friends.filter((u) => !a.users.includes(u)) : a.mode === 'only' ? friends.filter((u) => a.users.includes(u)) : friends;
    if (a.mode === 'only' && !who.length) throw new Error(T('Wähle mindestens einen Freund aus.'));
    const id = crypto.randomUUID();
    if (S._storyExtra) { Object.assign(content, S._storyExtra); S._storyExtra = null; }      // Story-Ebenen (zm/story.js), Effekte
    content.ck = key32();
    const cipher = await C.encrypt(content, 'status', id, this.deviceId, this.keys, await this.devices([...who, Api.userId], true));
    const body = { id, kind, cipher, sender_device: this.deviceId, audience: a.mode === 'all' ? null : who, audience_mode: a.mode };
    if (hours !== 24) body.expires_at = new Date(Date.now() + hours * 3600000 - 60000).toISOString();
    await Api.rest('POST', 'statuses', body);
    this.saveStatusAudience(a); localStorage.setItem('zm-status-stunden', String(hours));
    await this.loadStatuses();
  };
  S.postStatus = function (text, bg, font, a, hours, align, hl) { const c = { t: String(text).trim().slice(0, 700), bg, f: font || '' }; if (align && align !== 'c') c.al = align; if (hl) c.hl = true; return this.postStatusContent(c, 'text', a, hours); };
  S.postStatusImage = async function (file, caption, a, hours, look) {
    const img = await createImageBitmap(file); const sc = Math.min(1, 1440 / Math.max(img.width, img.height));
    const cv = document.createElement('canvas'); cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc);
    const g = cv.getContext('2d'); g.filter = (LOOKS[look || 0] || LOOKS[0])[1] || 'none'; g.drawImage(img, 0, 0, cv.width, cv.height);
    const jpeg = new Uint8Array(await (await new Promise((ok) => cv.toBlob(ok, 'image/jpeg', 0.82))).arrayBuffer());
    const s = await C.sealFile(jpeg); const path = `${Api.userId}/${crypto.randomUUID()}.bin`;
    await Api.upload('status-media', path, s.bytes);
    return this.postStatusContent({ t: String(caption || '').trim().slice(0, 300), media: { path, key: s.key, iv: s.iv, sha: s.sha, w: cv.width, h: cv.height } }, 'image', a, hours);
  };
  /** Video prüfen: Länge, Größe, Vorschaubild */
  S.videoInfo = (file) => new Promise((ok) => {
    const v = document.createElement('video'); v.preload = 'metadata'; v.muted = true; const url = URL.createObjectURL(file); v.src = url;
    v.onloadedmetadata = () => { v.currentTime = Math.min(0.5, (v.duration || 1) / 2); };
    v.onseeked = () => {
      let th = ''; try { const sc = 320 / Math.max(v.videoWidth, v.videoHeight); const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(v.videoWidth * sc)); cv.height = Math.max(1, Math.round(v.videoHeight * sc)); cv.getContext('2d').drawImage(v, 0, 0, cv.width, cv.height); th = cv.toDataURL('image/jpeg', 0.6).split(',')[1]; } catch (e) { }
      ok({ ms: Math.round((v.duration || 0) * 1000), w: v.videoWidth, h: v.videoHeight, bytes: file.size, th }); URL.revokeObjectURL(url);
    };
    v.onerror = () => { ok({ ms: 0, bytes: file.size, w: 0, h: 0, th: '' }); URL.revokeObjectURL(url); };
  });
  S.postStatusVideo = async function (file, caption, a, hours) {
    const info = await this.videoInfo(file);
    if (!info.ms) throw new Error(T('Das Video ließ sich nicht öffnen.'));
    if (info.ms > (MAX_SEC + 1) * 1000) throw new Error(T('Videos dürfen höchstens {0} Sekunden lang sein.').replace('{0}', MAX_SEC));
    if (file.size > MAX_BYTES) throw new Error(T('Das Video ist zu groß (höchstens 48 MB). Nimm es kürzer oder in geringerer Qualität auf.'));
    const s = await C.sealFile(new Uint8Array(await file.arrayBuffer())); const path = `${Api.userId}/${crypto.randomUUID()}.bin`;
    await Api.upload('status-media', path, s.bytes);
    const media = { path, key: s.key, iv: s.iv, sha: s.sha, w: info.w, h: info.h, kind: 'video', ms: info.ms }; if (info.th) media.th = info.th;
    return this.postStatusContent({ t: String(caption || '').trim().slice(0, 300), media }, 'video', a, hours);
  };
  S.statusMedia = async function (it) {
    const k = 'status:' + it.id; if (this.mediaCache.has(k)) return this.mediaCache.get(k);
    const md = it.content.media; const bytes = await C.openFile(await Api.download('status-media', md.path), md.key, md.iv, md.sha);
    const url = URL.createObjectURL(new Blob([bytes], { type: md.kind === 'video' ? 'video/mp4' : 'image/jpeg' })); this.mediaCache.set(k, url); return url;
  };
  S.statusPreview = (it) => { const ct = it.content || {}; return ct.media ? (ct.media.kind === 'video' ? '🎬 Video' : '📷 Foto') + (ct.t ? ' · ' + ct.t : '') : String(ct.t || '').slice(0, 120); };
  S.statusLiked = (it) => (S.statusLikes.get(it.id) || new Set()).has(Api.userId);
  S.toggleStatusLike = async function (it) {
    const set = new Set(this.statusLikes.get(it.id) || []); const was = set.has(Api.userId);
    if (was) set.delete(Api.userId); else set.add(Api.userId); this.statusLikes.set(it.id, set);
    try { if (was) await Api.rest('DELETE', `status_likes?status_id=eq.${it.id}&user_id=eq.${Api.userId}`); else await Api.rest('POST', 'status_likes', { status_id: it.id }, 'resolution=ignore-duplicates'); }
    catch (e) { if (was) set.add(Api.userId); else set.delete(Api.userId); throw e; }
  };
  const aad = (it) => enc.encode('status-comment|' + it.id);
  S.statusCommentList = async function (it) {
    const k = it.content && it.content.ck ? C.unb64(it.content.ck) : null;
    const rows = await Api.list(`status_comments?status_id=eq.${it.id}&select=id,user_id,cipher,created_at&order=created_at.asc&limit=500`);
    await this.loadProfiles([...new Set(rows.map((r) => r.user_id))]);
    const out = [];
    for (const r of rows) { let text = null; try { if (k) text = JSON.parse(dec.decode(await C.open(k, C.unb64(r.cipher.iv), C.unb64(r.cipher.ct), aad(it)))).t; } catch (e) { } out.push({ id: r.id, user: r.user_id, at: time(r.created_at), text }); }
    this.statusComments.set(it.id, out.length); return out;
  };
  S.commentStatus = async function (it, text) {
    if (!it.content || !it.content.ck) throw new Error(T('Bei diesem Status gehen keine Kommentare (er ist älter).'));
    const { iv, ct } = await C.seal(C.unb64(it.content.ck), enc.encode(JSON.stringify({ t: String(text).trim().slice(0, 500) })), aad(it));
    await Api.rest('POST', 'status_comments', { status_id: it.id, cipher: { iv: C.b64(iv), ct: C.b64(ct), v: 1 } });
    this.statusComments.set(it.id, (this.statusComments.get(it.id) || 0) + 1);
  };
  S.deleteStatusComment = async function (it, c) { await Api.rest('DELETE', `status_comments?id=eq.${c.id}`); this.statusComments.set(it.id, Math.max(0, (this.statusComments.get(it.id) || 1) - 1)); };
  S.shareStatus = async function (it, chatId) {
    const who = it.user === Api.userId ? 'meinen Status' : 'den Status von ' + this.nameOf(it.user);
    await this.send(chatId, 'text', { t: '↗ Schau dir ' + who + ' an', status: { id: it.id, u: it.user, p: this.statusPreview(it), bg: (it.content || {}).bg || '' } });
  };
  S.feedOrder = function () {
    const me = Api.userId;
    const others = [...this.statuses.keys()].filter((u) => u !== me).sort((a, b) => (this.statusMuted(a) - this.statusMuted(b))
      || ((this.statuses.get(b) || []).some((i) => !this.seenStatus(i.id)) - (this.statuses.get(a) || []).some((i) => !this.seenStatus(i.id))));
    return [...(this.statuses.has(me) ? [me] : []), ...others];
  };
  const oldLive = S.onLive;
  S.onLive = async function (ch) { if (ch.table === 'status_likes' || ch.table === 'status_comments') { await this.loadStatuses(); return; } return oldLive.call(this, ch); };

  // =================================================================================== Oberfläche (modern, 22.11.2026)
  const left = (exp) => { const ms = Math.max(0, exp - Date.now()), h = Math.floor(ms / 3600000); return h >= 48 ? Math.floor(h / 24) + ' ' + T('Tage') : h >= 1 ? h + ' ' + T('Std.') : Math.max(1, Math.floor(ms / 60000)) + ' ' + T('Min.'); };
  const ago = (at) => { const m = Math.max(0, Math.floor((Date.now() - at) / 60000)); return m < 1 ? T('gerade eben') : m < 60 ? T('vor {0} Min.').replace('{0}', m) : m < 1440 ? T('vor {0} Std.').replace('{0}', Math.floor(m / 60)) : m < 2880 ? T('gestern') : T('vor {0} Tagen').replace('{0}', Math.floor(m / 1440)); };
  const num = (n) => n >= 1000 ? (n / 1000).toFixed(1).replace('.', ',') + 'K' : String(n);
  const BGS = ['grad:#7F5CFF,#25D7FF', 'grad:#FF5F6D,#FFC371', 'grad:#FF4D8D,#8B6CFF', 'grad:#11998E,#38EF7D', 'grad:#F7971E,#FFD200', 'grad:#0F2027,#2C5364', 'grad:#1F1C2C,#928DAB', 'grad:#EE0979,#FF6A00',
    '#14B8A6', '#6A4BFF', '#E05252', '#FF9F43', '#2FBF71', '#111B21', '#FF7AD9', '#4EA0FF', '#8E44AD', '#0E7C66'];
  const FONTS = [['', 'Klassisch', 'inherit', 600], ['serif', 'Elegant', 'Georgia, serif', 600], ['mono', 'Schreibmaschine', 'Consolas, monospace', 600], ['bold', 'Kräftig', 'inherit', 900]];
  const TPL = ['Guten Morgen ☀️', 'Schönes Wochenende! 🎉', 'Bin im Urlaub 🌴', 'Heute ist ein guter Tag ✨', 'Danke an alle ❤️', 'Wer hat Zeit? ☕', 'Feierabend! 🙌', 'Gute Nacht 🌙', 'Montag … 😅', 'Sport erledigt 💪', 'Neues Abenteuer 🚀', 'Alles Gute zum Geburtstag! 🎂'];
  const fontOf = (f) => FONTS.find((x) => x[0] === (f || '')) || FONTS[0];
  const colors = (bg) => { const s = String(bg || '#111b21'); const l = (s.startsWith('grad:') ? s.slice(5).split(',') : [s]).map((x) => x.trim()).filter((x) => /^#[0-9a-f]{3,8}$/i.test(x)); return l.length ? l : ['#111b21']; };
  const bgCss = (bg) => { const c = colors(bg); return c.length > 1 ? `linear-gradient(135deg, ${c.join(', ')})` : c[0]; };
  const fsOf = (t) => (t.length <= 40 ? 44 : t.length <= 140 ? 34 : 26);
  const STORY = '#FFB14A, #FF4D8D, #8B6CFF, #25D7FF';
  /** Symbole: eigene Messenger-Symbole, sonst Zunora-Symbole; Herz gefüllt selbst gezeichnet */
  const ic = (n, s = 22) => {
    if (n === 'heartf') return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 20.5C4 15.5 2.5 11 3.2 8 4 4.6 9.2 3.4 12 7.4 14.8 3.4 20 4.6 20.8 8c.7 3-.8 7.5-8.8 12.5z"/></svg>`;
    if (n === 'heart') return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.5C4 15.5 2.5 11 3.2 8 4 4.6 9.2 3.4 12 7.4 14.8 3.4 20 4.6 20.8 8c.7 3-.8 7.5-8.8 12.5z"/></svg>`;
    if (root.ZMI && root.ZMI.has(n)) return root.ZMI.svg(n, s);
    if (root.ZIcons && root.ZIcons.has(n)) return root.ZIcons.svg(n, s);
    return '';
  };
  const alignIc = (al) => { const r = (y, len) => { const l = 16 * len, x = al === 'l' ? 4 : al === 'r' ? 20 - l : 12 - l / 2; return `<line x1="${x}" y1="${y}" x2="${x + l}" y2="${y}"/>`; };
    return `<svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round">${r(7, 1)}${r(12, 0.62)}${r(17, 0.84)}</svg>`; };

  /** Ring wie bei Instagram/WhatsApp: ein Stück je Status, ungesehene im Farbverlauf, gesehene grau */
  function ring(seen, inner, size = 64) {
    const n = seen.length, r = size / 2 - 2, C = 2 * Math.PI * r, gap = n > 1 ? Math.min(9, 360 / n * 0.3) : 0, id = 'g' + Math.random().toString(36).slice(2, 8);
    const seg = (k) => { const len = C * ((360 / n - gap) / 360); const off = -C * ((k * 360 / n + gap / 2) / 360);
      return `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${seen[k] ? 'var(--zs-seen)' : `url(#${id})`}" stroke-width="2.8" stroke-linecap="round" stroke-dasharray="${len} ${C}" stroke-dashoffset="${off}" transform="rotate(-90 ${size / 2} ${size / 2})"/>`; };
    return `<div class="zs-ring" style="width:${size}px;height:${size}px">${n ? `<svg width="${size}" height="${size}"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB14A"/><stop offset=".4" stop-color="#FF4D8D"/><stop offset=".75" stop-color="#8B6CFF"/><stop offset="1" stop-color="#25D7FF"/></linearGradient></defs>${seen.map((_, k) => seg(k)).join('')}</svg>` : ''}<div class="zs-in">${inner}</div></div>`;
  }

  /** Status-Leiste über der Chat-Liste */
  function strip(H) {
    const { esc, uav } = H; const me = Api.userId;
    const others = [...S.statuses.keys()].filter((u) => u !== me).sort((a, b) => (S.statusMuted(a) - S.statusMuted(b))
      || ((S.statuses.get(b) || []).some((i) => !S.seenStatus(i.id)) - (S.statuses.get(a) || []).some((i) => !S.seenStatus(i.id))));
    const mine = S.statuses.get(me) || [];
    return `<div class="zs-head"><b>${T('Status')}</b>${others.length ? `<button class="zs-all" data-status="${esc(others[0])}">${ic('play', 13)} ${T('Alle ansehen')}</button>` : ''}</div>
      <div class="stories zs-stories">
        <div class="story zs-story" data-act="myStatus">${ring(mine.map(() => false), uav(me, 's'))}<span class="zs-plus" data-act="newStatus" title="${esc(T('Neuer Status'))}">${ic('plus', 13)}</span><span>${T(mine.length ? 'Mein Status' : 'Hinzufügen')}</span></div>
        ${others.map((u) => { const l = S.statuses.get(u) || []; const m = S.statusMuted(u); const neu = !m && l.some((i) => !S.seenStatus(i.id));
          return `<div class="story zs-story ${m ? 'muted' : ''}" data-status="${esc(u)}">${ring(l.map((i) => m || S.seenStatus(i.id)), uav(u, 's'))}<span class="${neu ? 'neu' : ''}">${esc(S.nameOf(u))}</span></div>`; }).join('')}
      </div>`;
  }

  /** Feed ansehen: Story-Karte in der Mitte, Pfeile zum Blättern, Aktionen daneben. */
  function view(user, H) {
    const { esc, uav, toast, tryDo } = H;
    const order = String(user).includes(':') ? [user] : S.feedOrder(); let u = Math.max(0, order.indexOf(user)); if (!order.length) return;
    let unLayers = () => { };
    const o = document.createElement('div'); o.className = 'zs-view'; document.body.appendChild(o);
    let i = 0, timer = null, hold = false, panel = '', reacts = false, confirmDel = false, views = null;
    const list = () => (String(order[u]).includes(':') ? (S.storyLists || new Map()).get(order[u]) : S.statuses.get(order[u])) || [];
    const close = () => { clearTimeout(timer); unLayers(); o.remove(); document.removeEventListener('keydown', key, true); H.renderList(); };
    const nextUser = () => { if (u < order.length - 1) { u++; startUser(); } else close(); };
    const prevUser = () => { if (u > 0) { u--; startUser(); } };
    const next = () => { clearTimeout(timer); if (i < list().length - 1) { i++; show(); } else nextUser(); };
    const prev = () => { clearTimeout(timer); if (i > 0) { i--; show(); } else prevUser(); };
    const startUser = () => { const l = list(); i = Math.max(0, l.findIndex((x) => !S.seenStatus(x.id))); show(); };
    const busy = () => hold || panel || reacts || (o.querySelector('.zs-reply input') === document.activeElement);
    const arm = () => {
      clearTimeout(timer); const bar = o.querySelectorAll('.zs-bars i')[i]; const v = o.querySelector('video');
      if (busy()) { if (bar && !v) { const pw = bar.parentElement.getBoundingClientRect().width || 1; const pct = Math.min(100, 100 * bar.getBoundingClientRect().width / pw); bar.style.transition = 'none'; bar.style.width = pct + '%'; } if (v) v.pause(); return; }
      if (v) { v.play().catch(() => { }); return; }
      if (!bar) return; const done = parseFloat(bar.style.width) || 0; const rest = 6000 * (1 - Math.min(99, done) / 100);
      requestAnimationFrame(() => { bar.style.transition = `width ${rest}ms linear`; bar.style.width = '100%'; }); timer = setTimeout(next, rest);
    };
    const show = () => {
      const who = String(order[u]).split(':').pop(); const l = list(); const it = l[i]; if (!it) { nextUser(); return; }
      unLayers();
      S.viewStatus(it); panel = ''; reacts = false; confirmDel = false; views = null;
      const ct = it.content || {}; const mine = who === Api.userId; const md = ct.media; const video = md && md.kind === 'video';
      const likes = (S.statusLikes.get(it.id) || new Set()).size, comments = S.statusComments.get(it.id) || 0, liked = S.statusLiked(it);
      const f = fontOf(ct.f); const txt = String(ct.t || ''); const al = ct.al || 'c';
      const blur = md ? '#000' : bgCss(ct.bg);
      o.innerHTML = `<div class="zs-bg" style="background:${blur}"></div>
        <button class="zs-x" data-sv="x" title="${esc(T('Schließen'))}">${ic('close', 22)}</button>
        <div class="zs-wrap">
          <button class="zs-nav" data-sv="prev" ${u === 0 && i === 0 ? 'disabled' : ''} title="${esc(T('Zurück'))}">${ic('back', 22)}</button>
          <div class="zs-card" style="background:${md ? '#000' : bgCss(ct.bg)}">
            <div class="zs-stage" data-stage>${it.problem ? `<div class="zs-text">${esc(T('Nicht lesbar'))}</div>`
              : video ? `<video class="zs-media" playsinline ${localStorage.getItem('zm-status-ton') === '0' ? 'muted' : ''} ${md.th ? `poster="data:image/jpeg;base64,${esc(md.th)}"` : ''}></video>`
              : md ? '<img class="zs-media" alt="">' : ct.poll && root.ZMExtra ? `<div class="zs-tbox">${root.ZMExtra.pollHtml(it, mine, Api, esc)}</div>` : `<div class="zs-tbox" style="justify-content:${al === 'l' ? 'flex-start' : al === 'r' ? 'flex-end' : 'center'}"><div class="zs-text ${ct.hl ? 'hl' : ''}" style="text-align:${al === 'l' ? 'left' : al === 'r' ? 'right' : 'center'};font-family:${f[2]};font-weight:${f[3]};font-size:${fsOf(txt) * 0.62}px;${ct.hl ? 'color:' + colors(ct.bg)[0] : ''}">${esc(txt)}</div></div>`}
              <div class="zs-heart">${ic('heartf', 120)}</div></div>
            <div class="zs-top">
              <div class="zs-bars">${l.map((_, k) => `<div><i style="width:${k < i ? 100 : 0}%"></i></div>`).join('')}</div>
              <div class="zs-who"><span data-sv="profile" class="zs-av">${uav(who, 's')}</span><div style="flex:1;min-width:0"><b>${esc(mine ? T('Mein Status') : S.nameOf(who))}</b><small>${ago(it.at)} · ${T('noch {0}').replace('{0}', left(it.exp || (it.at + 86400000)))}</small></div>
                ${video ? `<button class="zs-rb" data-sv="sound" title="${esc(T('Ton'))}">${ic(localStorage.getItem('zm-status-ton') === '0' ? 'mute' : 'speaker', 18)}</button>` : ''}
                <button class="zs-rb" data-sv="pause" title="${esc(T('Pause (Leertaste)'))}">${ic('pause', 18)}</button><button class="zs-rb" data-sv="menu" title="${esc(T('Mehr'))}">${ic('more', 18)}</button></div>
            </div>
            <div class="zs-bottom">${md && txt ? `<div class="zs-cap">${esc(txt)}</div>` : ''}<div class="zs-sent"></div>
              ${reactsHtml()}
              ${mine ? `<button class="zs-views" data-sv="viewers"><span class="zs-vav">${ic('eye', 18)}</span><b>…</b><small>${esc(S.audienceLabel({ mode: it.mode || 'all', users: [] }))}</small></button>`
                : it.problem ? '' : `<div class="zs-reply"><input maxlength="2000" placeholder="${esc(T('Antworten an {0} …').replace('{0}', S.nameOf(who)))}"><button class="zs-rb" data-sv="react" title="${esc(T('Reagieren'))}">${ic('smile', 20)}</button><button class="zs-send hidden" data-sv="send" title="${esc(T('Senden'))}">${ic('send', 18)}</button></div>`}
            </div>
          </div>
          <div class="zs-side">${it.problem ? '' : `
            <button data-sv="like" class="${liked ? 'on' : ''}"><span>${ic(liked ? 'heartf' : 'heart', 26)}</span><b>${num(likes)}</b></button>
            <button data-sv="comments"><span>${ic('chat', 24)}</span><b>${num(comments)}</b></button>
            <button data-sv="share"><span>${ic('share', 24)}</span><b>${T('Teilen')}</b></button>`}
          </div>
          <button class="zs-nav" data-sv="next" title="${esc(T('Weiter'))}"><span style="display:inline-flex;transform:scaleX(-1)">${ic('back', 22)}</span></button>
        </div>
        <div class="zs-panel hidden"></div>`;
      // Story-Ebenen (Text, Sticker, Malen, Frage, Countdown, Regler …)
      if (root.ZMStory && !it.problem && ct.ov) { const st = o.querySelector('[data-stage]'); if (st) unLayers = root.ZMStory.wireView(st, it, mine, H, (p) => { hold = p; arm(); }); }
      if (md && !it.problem) S.statusMedia(it).then((url) => {
        const el = o.querySelector('.zs-media'); if (!el) return; el.src = url;
        if (video && ct.fx === 'fast') el.playbackRate = 3;          // Zeitraffer
        if (!video && md.frames > 1 && root.ZMStory) el.onload = () => root.ZMStory.playBoomerang(el, md);       // Boomerang
        if (video) { el.onended = next; el.ontimeupdate = () => { const bar = o.querySelectorAll('.zs-bars i')[i]; if (bar && el.duration) { bar.style.transition = 'none'; bar.style.width = (100 * el.currentTime / el.duration) + '%'; } }; arm(); }
      }).catch(() => { const st = o.querySelector('[data-stage]'); if (st) st.innerHTML = '<div class="zs-text">' + T('Das ließ sich nicht laden.') + '</div>'; });
      if (ct.poll && root.ZMExtra && !it.problem) { const rr = () => { const b = o.querySelector('[data-spoll]'); if (b) { b.outerHTML = root.ZMExtra.pollHtml(it, mine, Api, esc); root.ZMExtra.wirePoll(o, it, Api, rr); } }; root.ZMExtra.wirePoll(o, it, Api, rr); }
      const inp = o.querySelector('.zs-reply input');
      if (inp) { inp.onfocus = () => arm(); inp.onblur = () => setTimeout(arm, 0); inp.oninput = () => { o.querySelector('[data-sv="send"]').classList.toggle('hidden', !inp.value.trim()); o.querySelector('[data-sv="react"]').classList.toggle('hidden', !!inp.value.trim()); };
        inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') o.querySelector('[data-sv="send"]').click(); if (e.key === 'Escape') inp.blur(); }; }
      if (mine) S.statusViewers(it).then((v) => { views = v; const b = o.querySelector('.zs-views'); if (!b) return;
        b.querySelector('.zs-vav').innerHTML = v.length ? v.slice(0, 3).map((x) => uav(x.user, 'xs')).join('') : ic('eye', 18); b.querySelector('b').textContent = T('{0} Aufrufe').replace('{0}', v.length); }).catch(() => { });
      arm();
    };
    function reactsHtml() { return `<div class="zs-reacts ${reacts ? '' : 'hidden'}">${['❤️', '😂', '😮', '😢', '👏', '🔥'].map((e) => `<button data-react="${e}">${e}</button>`).join('')}</div>`; }
    const sent = (t) => { const s = o.querySelector('.zs-sent'); if (s) { s.textContent = t; s.classList.add('on'); setTimeout(() => s.classList.remove('on'), 2600); } };
    const heart = () => { const h = o.querySelector('.zs-heart'); if (h) { h.classList.remove('go'); void h.offsetWidth; h.classList.add('go'); } };
    const setLike = (it) => { const lb = o.querySelector('[data-sv="like"]'); if (!lb) return; const on = S.statusLiked(it); lb.classList.toggle('on', on); lb.querySelector('span').innerHTML = ic(on ? 'heartf' : 'heart', 26); lb.querySelector('b').textContent = num((S.statusLikes.get(it.id) || new Set()).size); };
    const closePanel = () => { o.querySelector('.zs-panel').classList.add('hidden'); panel = ''; arm(); };
    const openPanel = (kind) => {
      const it = list()[i]; panel = kind; arm(); const p = o.querySelector('.zs-panel'); p.classList.remove('hidden');
      const head = (icon, t) => `<div class="zs-phead"><span class="zs-pic">${ic(icon, 18)}</span><b>${t}</b><button class="zs-rb" data-sv="pclose">${ic('close', 18)}</button></div>`;
      const hint = (t) => `<div class="zs-hint">${ic('lock', 13)} ${t}</div>`;
      if (kind === 'comments') {
        p.innerHTML = head('chat', T('Kommentare')) + hint(T('Nur für alle, die diesen Status sehen dürfen — Ende-zu-Ende verschlüsselt.')) + '<div class="zs-list">…</div>' +
          (it.content && it.content.ck ? `<div class="zs-reply in">${uav(Api.userId, 'xs')}<input class="zs-cin" maxlength="500" placeholder="${esc(T('Kommentar schreiben …'))}"><button class="zs-send" data-sv="csend">${ic('send', 18)}</button></div>` : `<div class="zs-hint">${T('Bei diesem Status gehen keine Kommentare (er ist älter).')}</div>`);
        const ci = p.querySelector('.zs-cin'); if (ci) { ci.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') p.querySelector('[data-sv="csend"]').click(); }; ci.focus(); }
        const draw = async () => { const l = await S.statusCommentList(it); p.querySelector('.zs-list').innerHTML = l.length ? l.map((c) => `<div class="zs-c">${uav(c.user, 'xs')}<div style="flex:1;min-width:0"><div><b>${esc(S.nameOf(c.user))}</b> <small>${ago(c.at)}</small></div>${c.text == null ? esc(T('Nicht lesbar')) : esc(c.text)}</div>${c.user === Api.userId || it.user === Api.userId ? `<button class="zs-rb sm" data-cdel="${esc(c.id)}" title="${esc(T('Löschen'))}">${ic('trash', 15)}</button>` : ''}</div>`).join('') : `<div class="zs-empty">${T('Noch keine Kommentare — schreib den ersten.')}</div>`;
          p.querySelectorAll('[data-cdel]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); tryDo(async () => { await S.deleteStatusComment(it, l.find((c) => c.id === b.dataset.cdel)); await draw(); }); }); };
        p.csend = async () => { const t = ci.value.trim(); if (!t) return; ci.value = ''; await S.commentStatus(it, t); await draw(); };
        tryDo(draw);
      } else if (kind === 'share') {
        const chats = [...S.chats.values()].sort((a, b) => b.lastAt - a.lastAt).slice(0, 60);
        p.innerHTML = head('share', T('Teilen mit …')) + hint(T('Im Chat erscheint ein Hinweis auf den Status. Ansehen können ihn nur Freunde, die ihn sehen dürfen.')) +
          `<div class="zs-search">${ic('search', 16)}<input class="zs-q" placeholder="${esc(T('Chat suchen …'))}"></div><div class="zs-list">${chats.map((c) => `<div class="zs-c row1" data-title="${esc(c.title.toLowerCase())}"><b style="flex:1">${esc(c.title)}</b><button class="zs-pill" data-share="${esc(c.id)}">${T('Senden')}</button></div>`).join('')}</div>`;
        const q = p.querySelector('.zs-q'); q.onkeydown = (e) => e.stopPropagation(); q.oninput = () => p.querySelectorAll('[data-title]').forEach((r) => r.classList.toggle('hidden', !r.dataset.title.includes(q.value.trim().toLowerCase()))); q.focus();
      } else if (kind === 'viewers') {
        let tab = 0; const lk = S.statusLikes.get(it.id) || new Set();
        const draw = () => { const v = views || []; const rows = tab === 0 ? v : [...lk].map((x) => ({ user: x, at: (v.find((y) => y.user === x) || {}).at || 0 }));
          p.innerHTML = head('eye', T('Aufrufe')) + `<div class="zs-tabs"><button class="${tab === 0 ? 'on' : ''}" data-tab="0">${ic('eye', 15)} ${T('Angesehen ({0})').replace('{0}', v.length)}</button><button class="${tab === 1 ? 'on' : ''}" data-tab="1">${ic('heart', 15)} ${T('Herzen ({0})').replace('{0}', lk.size)}</button></div>
            <div class="zs-list">${views == null ? '…' : rows.length ? rows.map((x) => `<div class="zs-c row1"><span class="zs-avh">${uav(x.user, 'xs')}${lk.has(x.user) ? `<i>${ic('heartf', 10)}</i>` : ''}</span><b style="flex:1">${esc(S.nameOf(x.user))}</b><small>${x.at ? ago(x.at) : ''}</small></div>`).join('') : `<div class="zs-empty">${T(tab === 0 ? 'Noch niemand.' : 'Noch keine Herzen.')}</div>`}</div>`;
          p.querySelectorAll('[data-tab]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); tab = +b.dataset.tab; draw(); }); };
        draw(); if (views == null) tryDo(async () => { views = await S.statusViewers(it); draw(); });
      } else if (kind === 'menu') {
        const mine = it.user === Api.userId; const ct = it.content || {};
        const entry = (k, icon, t, red) => `<button class="zs-entry ${red ? 'red' : ''}" data-sv="${k}">${ic(icon, 20)}<span>${t}</span></button>`;
        p.innerHTML = head('more', T('Mehr')) + (mine
          ? entry('viewers', 'eye', T('Wer hat es gesehen?')) + (ct.media ? entry('save', 'download', T('Auf dem PC speichern')) : '') + entry('hladd', 'star', T('Zu Highlights hinzufügen')) + entry('hldel', 'star', T('Aus Highlights entfernen')) +
            `<div class="zs-hint">${ic('friends', 14)} ${esc(T('Sichtbar für: {0}').replace('{0}', S.audienceLabel({ mode: it.mode || 'all', users: [] })))}</div>` + entry('del', 'trash', T(confirmDel ? 'Wirklich löschen? Nochmal klicken' : 'Status löschen'), true)
          : entry('mute', S.statusMuted(it.user) ? 'bell' : 'belloff', T(S.statusMuted(it.user) ? 'Status von {0} wieder zeigen' : 'Status von {0} stummschalten').replace('{0}', esc(S.nameOf(it.user)))) + entry('profile', 'user', T('Profil ansehen')));
      }
    };
    o.onclick = (e) => {
      const it = list()[i];
      const rb = e.target.closest('[data-react]'); if (rb) { reacts = false; tryDo(async () => { await S.replyStatus(it, rb.dataset.react); sent(T('Reaktion gesendet')); }); o.querySelector('.zs-reacts').classList.add('hidden'); arm(); return; }
      const sh = e.target.closest('[data-share]'); if (sh) { tryDo(async () => { await S.shareStatus(it, sh.dataset.share); closePanel(); sent(T('Geteilt')); }); return; }
      const b = e.target.closest('[data-sv]');
      if (!b) { if (e.target.closest('.zs-panel,.zs-side,.zs-top,.zs-bottom')) return; const st = e.target.closest('.zs-card'); if (!st) { if (e.target.closest('.zs-wrap') || e.target.classList.contains('zs-bg')) { if (panel) closePanel(); } return; }
        if (reacts) { reacts = false; o.querySelector('.zs-reacts').classList.add('hidden'); arm(); return; }
        if (e.detail === 2) return; const r = st.getBoundingClientRect(); if (e.clientX < r.left + r.width / 3) prev(); else next(); return; }
      const k = b.dataset.sv;
      if (k === 'x') close();
      else if (k === 'prev') prev(); else if (k === 'next') next();
      else if (k === 'profile') { if (it.user !== Api.userId) { close(); H.profileDlg(it.user); } }
      else if (k === 'pause') { hold = !hold; b.innerHTML = ic(hold ? 'play' : 'pause', 18); o.classList.toggle('held', false); arm(); }
      else if (k === 'sound') { const off = localStorage.getItem('zm-status-ton') !== '0'; localStorage.setItem('zm-status-ton', off ? '0' : '1'); const v = o.querySelector('video'); if (v) v.muted = off; b.innerHTML = ic(off ? 'mute' : 'speaker', 18); }
      else if (k === 'react') { reacts = !reacts; o.querySelector('.zs-reacts').classList.toggle('hidden', !reacts); arm(); }
      else if (k === 'like') { if (it.user === Api.userId) { openPanel('viewers'); return; } tryDo(async () => { await S.toggleStatusLike(it); setLike(it); if (S.statusLiked(it)) heart(); }); }
      else if (k === 'comments' || k === 'share' || k === 'viewers' || k === 'menu') openPanel(k);
      else if (k === 'hladd' || k === 'hldel') { const it = list()[i]; const t = k === 'hladd' ? prompt(T('Titel (z. B. Urlaub)'), 'Highlights') : null; if (k === 'hladd' && t === null) return;
        tryDo(async () => { await root.ZMStory.setHighlight(it.id, k === 'hladd' ? t : null); toast(k === 'hladd' ? T('⭐ In deinen Highlights') : T('Aus Highlights entfernt')); }); }
      else if (k === 'pclose') closePanel();
      else if (k === 'csend') { const p = o.querySelector('.zs-panel'); tryDo(() => p.csend()); }
      else if (k === 'send') { const inp = o.querySelector('.zs-reply input'); const t = inp.value.trim(); if (!t) return; tryDo(async () => { await S.replyStatus(it, t); inp.value = ''; inp.oninput(); inp.blur(); sent(T('Nachricht gesendet')); }); }
      else if (k === 'mute') { S.toggleStatusMute(it.user); toast(S.statusMuted(it.user) ? T('Stummgeschaltet') : T('Wieder laut')); closePanel(); }
      else if (k === 'save') tryDo(async () => { const url = await S.statusMedia(it); const a = document.createElement('a'); a.href = url; a.download = 'Zunora-Status-' + Date.now() + ((it.content.media || {}).kind === 'video' ? '.mp4' : '.jpg'); document.body.appendChild(a); a.click(); a.remove(); closePanel(); sent(T('Gespeichert')); });
      else if (k === 'del') { if (!confirmDel) { confirmDel = true; openPanel('menu'); return; } tryDo(async () => { await S.deleteStatus(it); order.splice(0, order.length, ...S.feedOrder()); if (!order.length) { close(); return; } u = Math.min(u, order.length - 1); startUser(); }); }
    };
    o.ondblclick = (e) => { if (!e.target.closest('.zs-card') || e.target.closest('.zs-top,.zs-bottom')) return; const it = list()[i]; if (it.user === Api.userId || it.problem) return; heart(); if (!S.statusLiked(it)) tryDo(async () => { await S.toggleStatusLike(it); setLike(it); }); };
    // gedrückt halten = Pause, die Bedienelemente blenden sich aus
    o.onpointerdown = (e) => { if (!e.target.closest('[data-stage]')) return; o._down = setTimeout(() => { hold = true; o.classList.add('held'); arm(); }, 220); };
    o.onpointerup = o.onpointerleave = () => { clearTimeout(o._down); if (o.classList.contains('held')) { o.classList.remove('held'); hold = false; arm(); } };
    let wheelAt = 0;
    o.onwheel = (e) => { if (e.target.closest('.zs-panel')) return; const now = Date.now(); if (now - wheelAt < 600 || Math.abs(e.deltaY) < 30) return; wheelAt = now; if (e.deltaY > 0) nextUser(); else prevUser(); };
    const key = (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'Escape') { if (panel) closePanel(); else close(); }
      else if (e.key === 'ArrowDown') nextUser(); else if (e.key === 'ArrowUp') prevUser(); else if (e.key === 'ArrowRight') next(); else if (e.key === 'ArrowLeft') prev();
      else if (e.key === ' ') { hold = !hold; const pb = o.querySelector('[data-sv="pause"]'); if (pb) pb.innerHTML = ic(hold ? 'play' : 'pause', 18); arm(); } else return;
      e.preventDefault(); e.stopPropagation();
    };
    document.addEventListener('keydown', key, true);
    startUser();
  }

  /** Neuen Status erstellen: links die Vorschau (direkt hineinschreiben), rechts die Werkzeuge. Dateien auch per Ziehen und Ablegen. */
  function compose(H) {
    const { esc, toast, tryDo, audienceHtml } = H;
    const mine = S.statuses.get(Api.userId) || [];
    let bg = BGS[0], font = '', align = 'c', hl = false, a = S.statusAudience(), file = null, kind = '', look = 0, hours = S.statusHours(), url = '', vinfo = '', busy = false;
    let poll = null;      // Umfrage: Liste der Antworten (Frage = Text)
    // Story-Editor: Ebenen je Element (Text = -1), mehrere Clips, Effekte (Boomerang/Zeitraffer)
    let queue = [], qi = 0; const ovsMap = new Map(), fxMap = new Map(); const ed = { ovs: [], tool: '', pen: '#FF4D4D' };
    const syncEd = () => { const k = file ? qi : -1; if (!ovsMap.has(k)) ovsMap.set(k, []); ed.ovs = ovsMap.get(k); };
    const extraOf = (k) => { const ov = ovsMap.get(k) || [], fx = fxMap.get(k) === 'fast' ? 'fast' : ''; return ov.length || fx ? Object.assign({}, ov.length ? { ov } : {}, fx ? { fx } : {}) : null; };
    const o = document.createElement('div'); o.className = 'zs-view zs-compose'; document.body.appendChild(o);
    o.addEventListener('input', (e) => { const p = e.target.closest('[data-po]'); if (p && poll) poll[+p.dataset.po] = p.value; });
    const close = () => { if (url) URL.revokeObjectURL(url); o.remove(); document.removeEventListener('keydown', key, true); };
    const key = (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
    document.addEventListener('keydown', key, true);
    const draw = () => {
      const f = fontOf(font); const t = (o.querySelector('#zsT') || {}).value || '';
      o.innerHTML = `<div class="zs-bg" style="background:${file ? '#000' : bgCss(bg)}"></div>
        <button class="zs-x" data-c="x" title="${esc(T('Schließen'))}">${ic('close', 22)}</button>
        <div class="zs-wrap">
          <div class="zs-card" style="background:${file ? '#000' : bgCss(bg)}">
            ${file ? (kind === 'video' ? `<video class="zs-media" src="${url}" muted autoplay loop playsinline></video>` : `<img class="zs-media" src="${url}" style="filter:${LOOKS[look][1] || 'none'}" alt="">`) : ''}
            ${file ? `<div class="zs-bottom"><div class="zs-reply"><input id="zsT" maxlength="300" placeholder="${esc(T('Beschreibung hinzufügen …'))}" value="${esc(t)}"></div></div>`
              : `<div class="zs-tbox" style="justify-content:${align === 'l' ? 'flex-start' : align === 'r' ? 'flex-end' : 'center'}"><textarea id="zsT" maxlength="700" class="zs-text ${hl ? 'hl' : ''}" placeholder="${esc(T('Tippe, um zu schreiben'))}" style="text-align:${align === 'l' ? 'left' : align === 'r' ? 'right' : 'center'};font-family:${f[2]};font-weight:${f[3]};font-size:${fsOf(t) * 0.62}px;${hl ? 'color:' + colors(bg)[0] : ''}">${esc(t)}</textarea></div>
                 <div class="zs-count">${t.length > 500 ? t.length + '/700' : ''}</div>`}
            ${(syncEd(), root.ZMStory ? root.ZMStory.layersHtml(ed.ovs, null, true, true) : '')}
          </div>
          <div class="zs-tools">
            <h3>${T('Neuer Status')}</h3>
            ${root.ZMStory ? root.ZMStory.toolsHtml(ed) : ''}
            ${queue.length > 1 ? `<div class="zs-lab">${T('Story-Reihe')}</div><div class="zs-chips">${queue.map((q2, k) => `<button class="${k === qi ? 'on' : ''}" data-c="qi" data-k="${k}">${k + 1} ${q2.type.startsWith('video/') ? '🎬' : '📷'}</button>`).join('')}</div>` : ''}
            ${kind === 'video' ? `<div class="zs-lab">${T('Effekt')}</div><div class="zs-chips">${[['', '▶ Normal'], ['boom', '🔁 Boomerang'], ['fast', '⏩ Zeitraffer']].map(([k2, l]) => `<button class="${(fxMap.get(qi) || '') === k2 ? 'on' : ''}" data-c="fx" data-v="${k2}">${T(l)}</button>`).join('')}</div>` : ''}
            <div class="zs-tabs">${[['', 'edit', 'Text'], ['image', 'image', 'Foto'], ['video', 'video', 'Video']].map(([k, icn, l]) => `<button class="${kind === k ? 'on' : ''}" data-kind="${k}">${ic(icn, 16)} ${T(l)}</button>`).join('')}</div>
            ${!file ? `
              <div class="zs-lab">${T('Hintergrund')}</div><div class="zs-swatches">${BGS.map((c) => `<span data-bg="${c}" class="${c === bg ? 'on' : ''}" style="background:${bgCss(c)}"></span>`).join('')}</div>
              <div class="zs-lab">${T('Vorlagen')}</div><div class="zs-chips">${TPL.map((t) => `<button data-tpl="${esc(t)}">${esc(t)}</button>`).join('')}</div>
              <div class="zs-lab">${T('Schrift')}</div><div class="zs-chips">${FONTS.map((x) => `<button data-font="${x[0]}" class="${x[0] === font ? 'on' : ''}" style="font-family:${x[2]};font-weight:${x[3]}">${T(x[1])}</button>`).join('')}</div>
              <div class="zs-chips"><button data-c="align" title="${esc(T('Ausrichtung'))}">${alignIc(align)} ${T('Ausrichtung')}</button><button data-c="hl" class="${hl ? 'on' : ''}"><b class="zs-hlico">A</b> ${T('Hervorheben')}</button></div>
              <div class="zs-lab">${T('Umfrage')}</div>${poll ? `<div class="zs-poll">${poll.map((v, k) => `<div class="zs-po"><input data-po="${k}" maxlength="60" placeholder="${esc(T('Antwort {0}').replace('{0}', k + 1))}" value="${esc(v)}">${poll.length > 2 ? `<button data-c="porm" data-k="${k}">✕</button>` : ''}</div>`).join('')}
                ${poll.length < 4 ? `<button class="zs-pill ghost" data-c="poadd">＋ ${T('Antwort hinzufügen')}</button>` : ''}<button class="zs-pill ghost" data-c="poll">${T('Keine Umfrage')}</button><div class="zs-hint">${T('Die Frage ist der Text auf dem Status.')}</div></div>`
                : `<div class="zs-chips"><button data-c="poll">📊 ${T('Umfrage hinzufügen')}</button></div>`}
              <div class="zs-drop" data-c="pick">${ic('upload', 22)}<span>${T('Foto oder Video hierher ziehen oder klicken')}</span></div>`
            : kind === 'image' ? `<div class="zs-lab">${T('Filter')}</div><div class="zs-looks">${LOOKS.map(([n, fl], k) => `<button data-look="${k}" class="${k === look ? 'on' : ''}"><img src="${url}" style="filter:${fl || 'none'}" alt=""><span>${T(n)}</span></button>`).join('')}</div>
                <button class="zs-pill ghost" data-c="clear">${ic('close', 14)} ${T('Anderes wählen')}</button>`
            : `<div class="zs-hint">${ic('video', 14)} ${esc(vinfo)}</div><button class="zs-pill ghost" data-c="clear">${ic('close', 14)} ${T('Anderes wählen')}</button>`}
            <div class="zs-lab">${T('Wie lange sichtbar?')}</div><div class="zs-chips">${DURATIONS.map(([h, l]) => `<button data-h="${h}" class="${h === hours ? 'on' : ''}">${ic('hourglass', 14)} ${T(l)}</button>`).join('')}</div>
            <div class="zs-lab">${T('Wer sieht das?')}</div><div id="audBox" class="zs-aud">${audienceHtml(a)}</div>
            <div class="zs-actions">${mine.length ? `<button class="zs-pill ghost" data-c="see">${ic('eye', 15)} ${T('Meine ansehen')}</button>` : ''}<button class="zs-pill big" data-c="post" ${busy ? 'disabled' : ''}>${busy ? (kind === 'video' ? T('Video wird verschlüsselt und hochgeladen …') : T('Einen Moment …')) : T('Teilen')} ${busy ? '' : ic('send', 16)}</button></div>
            <div class="zs-hint">${ic('lock', 13)} ${T('Ende-zu-Ende verschlüsselt. Freunde können Herzen geben und kommentieren.')}</div>
            <input type="file" id="zsFile" accept="image/*,video/*" multiple class="hidden">
          </div>
        </div>`;
      wire();
    };
    const setFiles = (l) => { const arr = [...(l || [])].filter((x) => x.type.startsWith('image/') || x.type.startsWith('video/')).slice(0, 10); if (!arr.length) return;
      queue = arr; qi = 0; ovsMap.clear(); fxMap.clear(); setFile(arr[0]); };
    const setFile = async (fl) => {
      if (!fl) return; const v = fl.type.startsWith('video/'); if (!v && !fl.type.startsWith('image/')) return toast(T('Bitte ein Foto oder Video wählen.'), true);
      if (url) URL.revokeObjectURL(url); file = fl; kind = v ? 'video' : 'image'; url = URL.createObjectURL(fl); look = 0; vinfo = '';
      if (v) { const inf = await S.videoInfo(fl); vinfo = `${Math.round(inf.ms / 1000)} s · ${(fl.size / 1048576).toFixed(1)} MB` + (inf.ms > (MAX_SEC + 1) * 1000 ? ' — ' + T('zu lang (höchstens 60 Sekunden)') : fl.size > MAX_BYTES ? ' — ' + T('zu groß (höchstens 48 MB)') : ''); }
      draw();
    };
    function wire() {
      const ta = o.querySelector('#zsT');
      if (ta) { ta.onkeydown = (e) => e.stopPropagation();
        if (ta.tagName === 'TEXTAREA') { const fit = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; ta.style.fontSize = fsOf(ta.value) * 0.62 + 'px'; const c = o.querySelector('.zs-count'); if (c) c.textContent = ta.value.length > 500 ? ta.value.length + '/700' : ''; }; ta.oninput = fit; fit(); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } }
      const fi = o.querySelector('#zsFile'); fi.onchange = () => setFiles(fi.files);
      o.querySelectorAll('[data-bg]').forEach((s) => s.onclick = () => { bg = s.dataset.bg; draw(); });
      o.querySelectorAll('[data-font]').forEach((s) => s.onclick = () => { font = s.dataset.font; draw(); });
      o.querySelectorAll('[data-tpl]').forEach((s) => s.onclick = () => { const ta2 = o.querySelector('#zsT'); if (ta2) ta2.value = s.dataset.tpl; draw(); });
      o.querySelectorAll('[data-look]').forEach((s) => s.onclick = () => { look = +s.dataset.look; draw(); });
      o.querySelectorAll('[data-h]').forEach((s) => s.onclick = () => { hours = +s.dataset.h; draw(); });
      o.querySelectorAll('[data-kind]').forEach((s) => s.onclick = () => { const k = s.dataset.kind; if (!k) { file = null; kind = ''; draw(); return; } fi.accept = k + '/*'; fi.click(); });
      const wireAud = () => { o.querySelectorAll('input[name=aud]').forEach((r) => r.onchange = () => { a.mode = r.value; o.querySelector('#audBox').innerHTML = audienceHtml(a); wireAud(); });
        o.querySelectorAll('[data-aud]').forEach((c) => c.onchange = () => { const id = c.dataset.aud; a.users = c.checked ? [...new Set([...a.users, id])] : a.users.filter((x) => x !== id); }); };
      wireAud();
      if (root.ZMStory) root.ZMStory.wireEdit(o, o.querySelector('.zs-card'), ed, draw);
    }
    o.onclick = (e) => {
      const b = e.target.closest('[data-c]'); if (!b) { if (e.target.classList.contains('zs-bg')) close(); return; }
      const k = b.dataset.c;
      if (k === 'x') close();
      else if (k === 'pick') { const fi = o.querySelector('#zsFile'); fi.accept = 'image/*,video/*'; fi.click(); }
      else if (k === 'align') { align = align === 'c' ? 'l' : align === 'l' ? 'r' : 'c'; draw(); }
      else if (k === 'hl') { hl = !hl; draw(); }
      else if (k === 'poll') { poll = poll ? null : ['', '']; draw(); }
      else if (k === 'poadd') { if (poll && poll.length < 4) poll.push(''); draw(); }
      else if (k === 'porm') { if (poll) poll.splice(+b.dataset.k, 1); draw(); }
      else if (k === 'clear') { if (url) URL.revokeObjectURL(url); file = null; kind = ''; url = ''; queue = []; ovsMap.clear(); fxMap.clear(); draw(); }
      else if (k === 'qi') { qi = +b.dataset.k; setFile(queue[qi]); }
      else if (k === 'fx') { fxMap.set(qi, b.dataset.v); draw(); }
      else if (k === 'see') { close(); view(Api.userId, H); }
      else if (k === 'post') {
        const t = ((o.querySelector('#zsT') || {}).value || '').trim(); if (!t && !file && !(ovsMap.get(-1) || []).length) return toast(T('Schreib etwas oder wähle ein Foto oder Video.'), true);
        busy = true; draw();
        tryDo(async () => { try { if (queue.length) {
            // Story-Reihe: jedes Element mit eigenen Ebenen und Effekt
            for (let k = 0; k < queue.length; k++) { const f2 = queue[k], vid = f2.type.startsWith('video/');
              if (vid && fxMap.get(k) === 'boom') { const md2 = await root.ZMStory.boomerang(f2); S._storyExtra = extraOf(k); await S.postStatusContent({ t: t.slice(0, 300), media: md2 }, 'image', a, hours); }
              else { S._storyExtra = extraOf(k); if (vid) await S.postStatusVideo(f2, t, a, hours); else await S.postStatusImage(f2, t, a, hours, k === qi ? look : 0); } }
          } else if (poll) { S._storyExtra = extraOf(-1); const op = poll.map((x) => x.trim()).filter(Boolean); if (!t || op.length < 2) throw new Error(T('Für eine Umfrage: Frage als Text und mindestens zwei Antworten.')); await S.postStatusContent({ t: t.slice(0, 300), bg, f: font || '', poll: { q: t.slice(0, 300), o: op.slice(0, 4) } }, 'text', a, hours); } else { S._storyExtra = extraOf(-1); await S.postStatus(t, bg, font, a, hours, align, hl); } close(); toast('✓ ' + T('Status geteilt') + ' · ' + S.audienceLabel(a)); H.renderList(); } finally { if (o.isConnected) { busy = false; draw(); } } });
      }
    };
    o.ondragover = (e) => { e.preventDefault(); o.classList.add('drag'); };
    o.ondragleave = () => o.classList.remove('drag');
    o.ondrop = (e) => { e.preventDefault(); o.classList.remove('drag'); setFiles(e.dataTransfer.files); };
    draw();
  }

  root.ZMStatus = { view, compose, strip };
})(window);
