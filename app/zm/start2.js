/* Zunora Messenger am PC — Offizieller Start 1.2.0 (26.11.2026), Teil 2:
   Weiterleiten mit Kennzeichnung, Medien/Links/Dateien je Chat, Standort + Live-Standort, Sicherheitsnummer als QR-Code und
   Warnung bei geänderten Schlüsseln, Server-Vorlagen, Auto-Moderation, Verlauf für neue Mitglieder, verifizierte Kanäle,
   Anruf-Links (Zunora Plus, auch für Gäste im Browser), Anruf-Effekte (Rauschen, Hintergrund weichzeichnen), Sprachnachricht „Einmal anhören". */
(function (root) {
  'use strict';
  const tr = (s) => (root.ZLang && root.ZLang.t ? root.ZLang.t(s) : s);
  const Z = root.ZMStart; const LS = Z.LS;
  const T2 = {};
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ===================================================================================== Weiterleiten
  T2.OFTEN = 5;
  T2.fwCount = (c0) => (c0 && (c0.fw || (c0.fwd ? 1 : 0))) || 0;
  T2.fwLabel = (c0) => { const n = T2.fwCount(c0); return n ? `<div class="fwlabel">↪ ${esc(tr(n >= T2.OFTEN ? 'Oft weitergeleitet' : 'Weitergeleitet'))}</div>` : ''; };
  T2.canForward = (m) => !!(m && !m.deleted && m.content && !m.viewOnce && !m.problem && ['text', 'image', 'video', 'voice', 'file', 'sticker', 'location', 'contact'].includes(m.kind) && !(m.content.live));
  T2.forward = async function (H, m, targets) {
    const { S, Api } = H; const n = T2.fwCount(m.content) + 1;
    const src = JSON.parse(JSON.stringify(m.content)); ['mentions', 'status', 'callLog', 'asked'].forEach((k) => delete src[k]);
    for (const chat of targets) {
      if (src.media && ['image', 'video', 'voice', 'file', 'sticker'].includes(m.kind)) {
        const url = await S.mediaUrl(m.id, m.content.media); const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
        const md = Object.assign({}, src.media); ['path', 'key', 'iv', 'sha', 'size', 'parts', 'offline', 'bucket'].forEach((k) => delete md[k]);
        const up = await S.putFile('chat-media', chat, bytes, m.content.media.mime || 'application/octet-stream'); delete up.bucket;
        await S.send(chat, m.kind, Object.assign({}, src, { media: Object.assign(md, up), fw: n, fwd: true }));
      } else await S.send(chat, m.kind, Object.assign({}, src, { fw: n, fwd: true }));
    }
  };
  T2.forwardDlg = function (H, m) {
    const { S } = H; const max = T2.fwCount(m.content) >= T2.OFTEN ? 1 : 5; const sel = new Set();
    const chats = [...S.chats.values()].filter((c) => !c.archived).sort((a, b) => b.lastAt - a.lastAt);
    H.dlg(`<h3>${tr('Weiterleiten')}</h3><p class="small muted" style="margin-top:0">${tr(max === 1 ? 'Diese Nachricht wurde schon oft weitergeleitet — du kannst sie nur an einen Chat schicken.' : 'Wähle bis zu 5 Chats.')}</p>
      <div style="max-height:320px;overflow:auto">${chats.map((c) => `<label class="pick" style="cursor:pointer"><input type="checkbox" data-fwc="${esc(c.id)}" style="width:auto">${H.cav(c, 'xs')}<span style="flex:1">${esc(c.title)}</span></label>`).join('')}</div>
      <div class="rowb"><button class="btn ghost" data-close>${tr('Abbrechen')}</button><button class="btn" data-go>${tr('Senden')}</button></div>`, (b) => {
      b.querySelector('[data-close]').onclick = H.closeDlg;
      b.querySelectorAll('[data-fwc]').forEach((x) => x.onchange = () => { if (x.checked) { if (sel.size >= max) { if (max === 1) { b.querySelectorAll('[data-fwc]').forEach((y) => { if (y !== x) y.checked = false; }); sel.clear(); } else { x.checked = false; return; } } sel.add(x.dataset.fwc); } else sel.delete(x.dataset.fwc); });
      b.querySelector('[data-go]').onclick = () => { if (!sel.size) return; H.tryDo(async () => { b.querySelector('[data-go]').disabled = true; await T2.forward(H, m, [...sel]); H.closeDlg(); H.toast(tr('✓ Weitergeleitet')); }); };
    });
  };

  // ===================================================================================== Medien, Links, Dateien je Chat
  T2.galleryDlg = function (H, c) {
    const { S } = H; const all = (S.messages.get(c.id) || []).filter((m) => !m.deleted && !m.viewOnce && !m.problem && m.content);
    const media = all.filter((m) => (m.kind === 'image' || m.kind === 'video') && m.content.media).reverse();
    const links = []; all.forEach((m) => { const t = m.content.t || ''; (t.match(/(?:https?:\/\/|www\.)[^\s<>"']+/gi) || []).forEach((u) => links.push([m, u.startsWith('www.') ? 'https://' + u : u])); }); links.reverse();
    const files = all.filter((m) => (m.kind === 'file' || m.kind === 'voice') && m.content.media).reverse();
    const tab = (k, t, n) => `<button class="chip" data-gt="${k}">${tr(t)} (${n})</button>`;
    H.dlg(`<h3>${tr('Medien, Links und Dateien')}</h3><div class="chips">${tab('m', 'Fotos & Videos', media.length)}${tab('l', 'Links', links.length)}${tab('f', 'Dateien', files.length)}</div><div id="gBody" style="max-height:420px;overflow:auto;margin-top:8px"></div>
      <div class="rowb"><button class="btn ghost" data-close>${tr('Schließen')}</button></div>`, (b) => {
      b.querySelector('[data-close]').onclick = H.closeDlg;
      const body = b.querySelector('#gBody');
      const show = (k) => {
        b.querySelectorAll('[data-gt]').forEach((x) => x.classList.toggle('on', x.dataset.gt === k));
        if (k === 'm') { body.innerHTML = media.length ? `<div class="ggrid">${media.map((m) => `<div class="gcell" data-gm="${esc(m.id)}">${m.content.media.thumb ? `<img src="data:image/jpeg;base64,${esc(m.content.media.thumb)}" alt="">` : ''}${m.kind === 'video' ? '<span class="gplay">▶</span>' : ''}</div>`).join('')}</div>` : `<p class="small muted">${tr('Noch keine Fotos oder Videos in diesem Chat.')}</p>`;
          body.querySelectorAll('[data-gm]').forEach((x) => { const m = media.find((y) => y.id === x.dataset.gm); S.mediaUrl(m.id, m.content.media).then((u) => { if (m.kind === 'image') { const i = x.querySelector('img') || x.appendChild(document.createElement('img')); i.src = u; } x.onclick = () => window.open(u, '_blank'); }).catch(() => { }); }); }
        else if (k === 'l') body.innerHTML = links.length ? links.map(([m, u]) => `<div class="row" style="cursor:pointer" data-zlink="${esc(u)}">${H.I('forward', 16)}<div class="main"><div class="title">${esc((m.content.lp && m.content.lp.t) || u.replace(/^https?:\/\//, '').split('/')[0])}</div><div class="prev">${esc(u)}</div></div><span class="small muted">${new Date(m.at).toLocaleDateString('de-DE')}</span></div>`).join('') : `<p class="small muted">${tr('Noch keine Links in diesem Chat.')}</p>`;
        else { body.innerHTML = files.length ? files.map((m) => `<div class="row" style="cursor:pointer" data-gf="${esc(m.id)}">${H.I(m.kind === 'voice' ? 'mic' : 'file', 16)}<div class="main"><div class="title">${esc(m.kind === 'voice' ? tr('Sprachnachricht') + ' · ' + S.nameOf(m.sender) : (m.content.media.name || tr('Datei')))}</div><div class="prev">${new Date(m.at).toLocaleString('de-DE')}</div></div></div>`).join('') : `<p class="small muted">${tr('Noch keine Dateien oder Sprachnachrichten.')}</p>`;
          body.querySelectorAll('[data-gf]').forEach((x) => x.onclick = () => H.tryDo(async () => { const m = files.find((y) => y.id === x.dataset.gf); const u = await S.mediaUrl(m.id, m.content.media); const a = document.createElement('a'); a.href = u; a.download = m.content.media.name || (m.kind === 'voice' ? 'Sprachnachricht.webm' : 'Datei'); a.click(); })); }
      };
      b.querySelectorAll('[data-gt]').forEach((x) => x.onclick = () => show(x.dataset.gt)); show('m');
    });
  };

  // ===================================================================================== Standort und Live-Standort
  T2.live = new Map();          // Nachricht → {lat, lng, acc, at}
  T2.ended = new Set();
  const tileXY = (lat, lng, z) => { const n = 2 ** z; const x = (lng + 180) / 360 * n; const r = lat * Math.PI / 180; const y = (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n; return [x, y]; };
  const left = (until) => { const m = Math.max(0, Math.round((until - Date.now()) / 60000)); return m >= 60 ? tr('noch %s Std.').replace('%s', Math.floor(m / 60) + (m % 60 >= 10 ? ':' + String(m % 60).padStart(2, '0') : '')) : tr('noch %s Min.').replace('%s', Math.max(1, m)); };
  T2.locationHtml = function (m, c0, mine) {
    const until = (c0.live && c0.live.until) || 0, p = T2.live.get(m.id);
    const lat = p ? p.lat : c0.lat, lng = p ? p.lng : c0.lng; if (typeof lat !== 'number' || typeof lng !== 'number') return '';
    const active = until > Date.now() && !T2.ended.has(m.id);
    const [x, y] = tileXY(lat, lng, 15), tx = Math.floor(x), ty = Math.floor(y);
    const ox = (x - tx) * 256, oy = (y - ty) * 256;
    return `<div class="zloc ${active ? 'live' : ''}" data-zloc="${esc(m.id)}" data-lat="${lat}" data-lng="${lng}" title="${esc(tr('In OpenStreetMap öffnen'))}">
      <div class="zmap">${[tx, ox < 128 ? tx - 1 : tx + 1].flatMap((cx) => [ty, oy < 128 ? ty - 1 : ty + 1].map((cy) => `<img src="https://tile.openstreetmap.org/15/${cx}/${cy}.png" alt="" style="left:${(120 - ox + (cx - tx) * 256).toFixed(0)}px;top:${(70 - oy + (cy - ty) * 256).toFixed(0)}px" loading="lazy" referrerpolicy="no-referrer">`)).join('')}<span class="zpin"></span><small>© OpenStreetMap</small></div>
      <div class="small"><b>${esc(tr(active ? 'Live-Standort' : until ? 'Live-Standort beendet' : 'Standort'))}</b>${active ? ' · ' + esc(left(until)) : ''}${p && active ? ' · ' + esc(tr('aktualisiert %s').replace('%s', new Date(p.at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }))) : ''}</div>
      ${mine && active && T2.mine.has(m.chatId) ? `<button class="btn ghost small" data-zlocstop="${esc(m.chatId)}">${tr('Teilen beenden')}</button>` : ''}</div>`;
  };
  T2.refreshLive = async function (H, chat) {
    const { S, Api } = H; const C = root.ZMC;
    let rows; try { rows = await Api.list(`live_locations?chat_id=eq.${chat}&select=message_id,user_id,sender_device,cipher,until,updated_at`); } catch (e) { return; }
    const seen = new Set();
    for (const r of rows) {
      seen.add(r.message_id);
      try { if (!S.signKeys.get(r.sender_device)) await S.devices([r.user_id], true);
        const o = (await C.decrypt(r.cipher, chat, 'live:' + r.message_id, r.sender_device, S.deviceId, S.keys, S.signKeys.get(r.sender_device))).content;
        T2.live.set(r.message_id, { lat: o.lat, lng: o.lng, acc: o.acc, at: o.at }); } catch (e) { }
    }
    (S.messages.get(chat) || []).forEach((m) => { if (m.kind === 'location' && m.content && m.content.live && !seen.has(m.id)) T2.ended.add(m.id); });
  };
  // Teilen vom PC (Windows-Standort bzw. Browser)
  T2.mine = new Map();          // Chat → {msg, until, watch}
  T2.push = async function (H, chat, msg, pos, until, insert) {
    const { S, Api } = H; const C = root.ZMC; const c = S.chats.get(chat); if (!c) return;
    const plain = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy, at: Date.now() };
    const cipher = await C.encrypt(plain, chat, 'live:' + msg, S.deviceId, S.keys, await S.devices(c.members.map((x) => x.userId)));
    if (insert) await Api.rest('POST', 'live_locations?on_conflict=message_id', { message_id: msg, chat_id: chat, sender_device: S.deviceId, cipher, until: new Date(until).toISOString(), updated_at: new Date().toISOString() }, 'resolution=merge-duplicates');
    else await Api.rest('PATCH', `live_locations?message_id=eq.${msg}`, { cipher, updated_at: new Date().toISOString() });
    T2.live.set(msg, plain);
  };
  const where = () => new Promise((ok, bad) => { if (!navigator.geolocation) return bad(new Error(tr('Der Standort lässt sich hier nicht bestimmen.'))); navigator.geolocation.getCurrentPosition(ok, () => bad(new Error(tr('Der Standort ließ sich nicht bestimmen. Erlaube den Standort in den Windows-Einstellungen (Datenschutz → Position).'))), { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 }); });
  T2.locationDlg = function (H, chat) {
    const { S } = H; const run = T2.mine.get(chat);
    H.dlg(`<h3>${tr('Standort')}</h3><p class="small muted" style="margin-top:0">${tr('Ende-zu-Ende verschlüsselt: Nur die Personen in diesem Chat sehen ihn.')}</p>
      ${run ? `<p>${tr('Du teilst hier gerade deinen Live-Standort.')} (${esc(left(run.until))})</p><div class="rowb"><button class="btn" data-stop>${tr('Teilen beenden')}</button></div>`
        : `<button class="btn" data-once style="width:100%">${tr('Aktuellen Standort senden')}</button><div class="cat" style="padding-left:0">${tr('Live-Standort teilen')}</div>
      <div class="chips"><button class="chip" data-live="15">15 Min.</button><button class="chip" data-live="60">1 Std.</button><button class="chip" data-live="480">8 Std.</button></div>
      <p class="small muted">${tr('Solange dieses Fenster offen ist, wird deine Position laufend aktualisiert.')}</p>`}
      <div class="rowb"><button class="btn ghost" data-close>${tr('Schließen')}</button></div>`, (b) => {
      b.querySelector('[data-close]').onclick = H.closeDlg;
      const st = b.querySelector('[data-stop]'); if (st) st.onclick = () => H.tryDo(async () => { await T2.stopLive(H, chat); H.closeDlg(); H.renderAll(); });
      const one = b.querySelector('[data-once]'); if (one) one.onclick = () => H.tryDo(async () => { const p = await where(); await S.send(chat, 'location', { t: '', lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }); H.closeDlg(); });
      b.querySelectorAll('[data-live]').forEach((x) => x.onclick = () => H.tryDo(async () => {
        const p = await where(); const until = Date.now() + (+x.dataset.live) * 60000;
        const id = await S.send(chat, 'location', { t: '', lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy, live: { until } });
        await T2.push(H, chat, id, p, until, true);
        let last = Date.now();
        const watch = navigator.geolocation.watchPosition((q) => { if (Date.now() - last < 20000) return; last = Date.now(); if (Date.now() > until) { T2.stopLive(H, chat); return; } T2.push(H, chat, id, q, until).catch(() => { }); }, () => { }, { enableHighAccuracy: true, maximumAge: 20000 });
        T2.mine.set(chat, { msg: id, until, watch }); setTimeout(() => T2.stopLive(H, chat), until - Date.now() + 1000);
        H.closeDlg(); H.renderAll();
      }));
    });
  };
  T2.stopLive = async function (H, chat) {
    const r = T2.mine.get(chat); if (!r) return; T2.mine.delete(chat); T2.ended.add(r.msg);
    try { navigator.geolocation.clearWatch(r.watch); } catch (e) { }
    try { await H.Api.rest('DELETE', `live_locations?message_id=eq.${r.msg}`); } catch (e) { }
  };

  // ===================================================================================== Einmal-Sprachnachricht
  T2.onceVoiceHtml = function (m, mine, H) {
    const { S, Api } = H; const opened = !mine && S.openedByMe && S.openedByMe(m.id);
    const who = (S.onceOpened && S.onceOpened.get(m.id)) || new Set();
    const label = mine ? (who.size ? tr('Angehört') : tr('Noch nicht angehört')) : opened ? tr('Angehört') : tr('Klicken zum Anhören');
    return `<div class="oncechip ${opened || mine ? 'done' : ''}" ${!mine && !opened ? `data-oncevoice="${esc(m.id)}"` : ''}><span class="o1">1</span><div><b>${tr('Sprachnachricht')}</b><div class="small muted">${esc(label)}</div></div></div>`;
  };

  // ===================================================================================== Sicherheitsnummer (QR) + geänderte Schlüssel
  const fp = async (keys) => { const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode([...keys].sort().join('|')))); return [...d.slice(0, 12)].map((b) => b.toString(16).padStart(2, '0')).join(''); };
  const check = async (dg) => { const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('zsn|' + dg))); return [...d.slice(0, 2)].map((b) => b.toString(16).padStart(2, '0')).join(''); };
  T2.changed = new Map();
  T2.watchKeys = async function (H, other) {
    try { const { S } = H; const devs = await S.devices([other]); const keys = (devs || []).filter((d) => d.userId === other || d.user_id === other).map((d) => d.signKey || d.sign_key).filter(Boolean); if (!keys.length) return;
      const now = await fp(keys), k = 'zm-kennt-' + other, known = LS.get(k, '');
      if (!known) { LS.set(k, now); return; }
      if (known !== now && !T2.changed.has(other)) { T2.changed.set(other, !!LS.get('zm-geprueft-' + other, '')); H.renderMain && H.renderMain(); } } catch (e) { }
  };
  T2.keyBanner = function (H, other) {
    if (!other || !T2.changed.has(other)) return '';
    const v = T2.changed.get(other);
    return `<div class="zkeyban">${H.I('shield', 16)} <span>${esc(tr(v ? 'Die geprüfte Sicherheitsnummer von %s hat sich geändert. Bitte neu prüfen.' : 'Die Sicherheitsnummer von %s hat sich geändert — vermutlich ein neues Gerät oder eine neue Installation.').replace('%s', H.S.nameOf(other)))}</span>
      <button class="btn ghost small" data-zkeycheck="${esc(other)}">${tr('Prüfen')}</button><button class="btn ghost small" data-zkeyok="${esc(other)}">OK</button></div>`;
  };
  T2.ackKeys = async function (H, other) { try { const devs = await H.S.devices([other], true); const keys = devs.filter((d) => d.userId === other || d.user_id === other).map((d) => d.signKey || d.sign_key); LS.set('zm-kennt-' + other, await fp(keys)); if (LS.get('zm-geprueft-' + other, '')) LS.set('zm-geprueft-' + other, null); } catch (e) { } T2.changed.delete(other); };
  T2.safetyDlg = async function (H, other) {
    const { S } = H;
    const mine = (await S.devices([H.Api.userId], true)).filter((d) => (d.userId || d.user_id) === H.Api.userId).map((d) => d.signKey || d.sign_key);
    const theirsD = (await S.devices([other], true)).filter((d) => (d.userId || d.user_id) === other); const theirs = theirsD.map((d) => d.signKey || d.sign_key);
    const num = await root.ZMC.safetyNumber(mine, theirs); const dg = num.replace(/\D/g, '');
    const qr = root.ZMQr ? root.ZMQr.svg('ZSN1:' + dg + ':' + await check(dg), 6) : '';
    const done = !!LS.get('zm-geprueft-' + other, '');
    H.dlg(`<h3>${tr('Sicherheitsnummer')}</h3><p class="small muted" style="margin-top:0">${esc(tr('Mit %s vergleichen').replace('%s', S.nameOf(other)))}</p>
      <div style="text-align:center;background:#fff;border-radius:16px;padding:10px;width:max-content;margin:0 auto">${qr}</div>
      <pre style="text-align:center;font-size:15px;margin:10px 0">${esc((num.match(/.{1,24}/g) || []).join('\n'))}</pre>
      <p class="small">${tr('Fotografiere den Code mit dem Zunora Messenger am Handy der anderen Person (Chat-Info → Sicherheitsnummer prüfen) — oder lest euch die Zahlen vor. Stimmen sie überein, liest niemand dazwischen mit.')}</p>
      ${done ? `<p class="small" style="color:#2FBF71">✓ ${tr('Schon geprüft')}</p>` : ''}
      <div class="rowb"><button class="btn ghost" data-close>${tr('Schließen')}</button><button class="btn" data-ok>${tr('Zahlen stimmen überein')}</button></div>`, (b) => {
      b.querySelector('[data-close]').onclick = H.closeDlg;
      b.querySelector('[data-ok]').onclick = () => H.tryDo(async () => { const f = await fp(theirs); LS.set('zm-geprueft-' + other, f); LS.set('zm-kennt-' + other, f); T2.changed.delete(other); H.closeDlg(); H.toast(tr('✓ Als geprüft gespeichert')); });
    });
  };

  // ===================================================================================== Server-Vorlagen
  T2.TEMPLATES = {
    freunde: ['Freunde', [['plaudern', 'text', 'Allgemein'], ['pläne', 'text', 'Allgemein'], ['fotos', 'text', 'Allgemein'], ['memes', 'text', 'Spaß'], ['treffpunkt', 'voice', 'Sprache']]],
    verein: ['Verein', [['ankündigungen', 'announcement', 'Info'], ['termine', 'text', 'Info'], ['allgemein', 'text', 'Mitglieder'], ['fahrgemeinschaften', 'text', 'Mitglieder'], ['fragen', 'forum', 'Mitglieder'], ['vereinsheim', 'voice', 'Sprache']]],
    klasse: ['Schulklasse', [['ankündigungen', 'announcement', 'Info'], ['hausaufgaben', 'text', 'Schule'], ['termine-und-tests', 'text', 'Schule'], ['lernhilfe', 'forum', 'Schule'], ['pause', 'text', 'Freizeit'], ['lerngruppe', 'voice', 'Sprache']]],
    gaming: ['Gaming', [['ankündigungen', 'announcement', 'Info'], ['allgemein', 'text', 'Chat'], ['clips-und-screenshots', 'text', 'Chat'], ['mitspieler-gesucht', 'text', 'Chat'], ['lobby', 'voice', 'Sprache'], ['runde-1', 'voice', 'Sprache']]],
    familie: ['Familie', [['familie', 'text', 'Allgemein'], ['termine', 'text', 'Allgemein'], ['einkauf', 'text', 'Allgemein'], ['fotos', 'text', 'Erinnerungen'], ['anrufen', 'voice', 'Sprache']]],
    lernen: ['Lerngruppe', [['allgemein', 'text', 'Lernen'], ['fragen', 'forum', 'Lernen'], ['materialien', 'text', 'Lernen'], ['lernen', 'voice', 'Sprache']]],
  };
  T2.templatesHtml = () => `<b>${tr('Mit einer Vorlage starten')}</b><div class="chips">${Object.entries(T2.TEMPLATES).map(([k, [t]]) => `<button class="chip" data-ztpl="${k}">${esc(tr(t))}</button>`).join('')}</div>`;
  T2.createFromTemplate = async function (H, key, name, about) {
    const { S } = H; const [title, chans] = T2.TEMPLATES[key];
    const id = await S.createServer(name || tr(title), about || '');
    await S.loadServer(id).catch(() => { });
    const have = new Set((((S.serverState.get(id) || {}).channels) || []).map((c) => c.name));
    for (const [n, kind, cat] of chans) if (!have.has(n)) await S.saveChannel(id, tr(n), kind, tr(cat), '').catch(() => { });
    if (key === 'verein' || key === 'klasse') await T2.saveAutomod(H, id, { words: [], links: 'neu', linkHours: 24, spam: true, waitHours: 0 }, false).catch(() => { });
    return id;
  };

  // ===================================================================================== Auto-Moderation + Verlauf für neue Mitglieder
  T2.automod = new Map(); T2.history = new Map();
  T2.loadAutomod = async function (H, s) { try { const r = (await H.Api.list(`servers?id=eq.${s}&select=automod,share_history`))[0]; if (r) { T2.automod.set(s, r.automod || {}); T2.history.set(s, !!r.share_history); } } catch (e) { } };
  T2.saveAutomod = async function (H, s, rules, share) { await H.Api.rest('PATCH', `servers?id=eq.${s}`, { automod: rules, share_history: !!share }); T2.automod.set(s, rules); T2.history.set(s, !!share); };
  const norm = (t) => String(t || '').toLowerCase().replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/@/g, 'a').replace(/\$/g, 's');
  T2.badWord = function (s, text) {
    const r = T2.automod.get(s); if (!r || !Array.isArray(r.words)) return null; const t = norm(text);
    return r.words.find((w) => { const n = norm(String(w).trim()); return n.length >= 2 && new RegExp('(^|[^\\p{L}])' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^\\p{L}])', 'u').test(t); }) || null;
  };
  T2.check = function (H, s, text) {
    const w = T2.badWord(s, text); if (w) return tr('Die Auto-Moderation dieses Servers lässt das Wort „%s“ nicht zu.').replace('%s', w);
    const r = T2.automod.get(s) || {}; const srv = H.S.servers.get(s) || {};
    if (r.links && /https?:\/\/|www\./i.test(text) && srv.owner !== H.Api.userId && !H.S.can(s, 4)) {
      if (r.links === 'alle') return tr('In diesem Server dürfen nur Verwalter Links senden.');
      const j = srv.joinedAt;
      if (j && Date.now() - j < (r.linkHours || 24) * 3600000) return tr('In diesem Server dürfen neue Mitglieder noch keine Links senden.');
    }
    return null;
  };
  T2.automodDlg = function (H, s) {
    const r = T2.automod.get(s) || {}; const sh = !!T2.history.get(s);
    H.dlg(`<h3>${tr('Auto-Moderation')}</h3><label class="small">${tr('Verbotene Wörter (durch Komma getrennt)')}</label><textarea id="amW" rows="3">${esc((r.words || []).join(', '))}</textarea>
      <div class="cat" style="padding-left:0">${tr('Links')}</div><div class="chips">${[['', 'Erlaubt'], ['neu', 'Neue: erst nach 24 Std.'], ['alle', 'Nur Verwalter']].map(([k, t]) => `<button class="chip ${(r.links || '') === k ? 'on' : ''}" data-aml="${k}">${tr(t)}</button>`).join('')}</div>
      <label class="small chk"><input type="checkbox" id="amS" ${r.spam ? 'checked' : ''}> <span>${tr('Spam-Bremse: höchstens 6 Nachrichten in 10 Sekunden pro Person')}</span></label>
      <div class="cat" style="padding-left:0">${tr('Wartezeit für neue Mitglieder')}</div><div class="chips">${[[0, 'Keine'], [1, '1 Std.'], [24, '1 Tag'], [168, '1 Woche']].map(([h, t]) => `<button class="chip ${(r.waitHours || 0) === h ? 'on' : ''}" data-amh="${h}">${tr(t)}</button>`).join('')}</div>
      <label class="small chk" style="margin-top:8px"><input type="checkbox" id="amH" ${sh ? 'checked' : ''}> <span>${tr('Neue Mitglieder sehen den bisherigen Verlauf (sonst nur Nachrichten ab ihrem Beitritt)')}</span></label>
      <div class="rowb"><button class="btn ghost" data-close>${tr('Abbrechen')}</button><button class="btn" data-save>${tr('Speichern')}</button></div>`, (b) => {
      let links = r.links || '', wait = r.waitHours || 0;
      b.querySelectorAll('[data-aml]').forEach((x) => x.onclick = () => { links = x.dataset.aml; b.querySelectorAll('[data-aml]').forEach((y) => y.classList.toggle('on', y === x)); });
      b.querySelectorAll('[data-amh]').forEach((x) => x.onclick = () => { wait = +x.dataset.amh; b.querySelectorAll('[data-amh]').forEach((y) => y.classList.toggle('on', y === x)); });
      b.querySelector('[data-close]').onclick = H.closeDlg;
      b.querySelector('[data-save]').onclick = () => H.tryDo(async () => {
        const words = b.querySelector('#amW').value.split(/[,\n]/).map((w) => w.trim()).filter(Boolean).slice(0, 200);
        await T2.saveAutomod(H, s, { words, links, linkHours: 24, spam: b.querySelector('#amS').checked, waitHours: wait }, b.querySelector('#amH').checked);
        H.closeDlg(); H.toast(tr('✓ Gespeichert'));
      });
    });
  };

  // ===================================================================================== Verifizierte Kanäle
  T2.verified = new Set(); let vAt = 0;
  T2.isVerified = function (H, id) { if (Date.now() - vAt > 1800000) { vAt = Date.now(); H.Api.list('follow_channels?verified=is.true&select=id&limit=500').then((l) => { T2.verified = new Set(l.map((x) => x.id)); }).catch(() => { }); } return T2.verified.has(id); };
  T2.badge = () => '<span class="zverified" title="Verifiziert">✔</span>';

  // ===================================================================================== Anruf-Links (Zunora Plus)
  T2.BASE = 'https://zunoraos.github.io/zunora-ai/app/?anruf=';
  T2.tokenOf = (u) => { const m = /[?&]anruf=([0-9a-f]{32})/.exec(String(u || '')); return m ? m[1] : null; };
  T2.callLinkHtml = function (H) {
    const plus = !!(root.ZPlus && root.ZPlus.active());
    return `<div class="zcalllink"><div class="h">${H.I('forward', 18)} <b>${tr('Anruf-Link')}</b>${plus ? '' : ' <span class="small" style="color:var(--accent)">✦ Plus</span>'}</div>
      <div class="small muted">${tr('Auch Leute ohne Zunora machen mit — im Browser, wie bei Zoom.')}</div>
      ${plus ? `<div style="display:flex;gap:6px;margin-top:6px"><input id="clTitle" placeholder="${esc(tr('Name (freiwillig)'))}" maxlength="60" style="flex:1"><button class="btn" data-act="zLinkNew" data-video="1">${tr('Video-Link')}</button><button class="btn ghost" data-act="zLinkNew" data-video="0">${tr('Nur Ton')}</button></div><div id="clList">${T2.linksHtml(H)}</div>`
        : `<button class="btn ghost" data-view="plus" style="margin-top:6px">${tr('Zu Zunora Plus')}</button>`}</div>`;
  };
  T2.wireCallLinks = function (el, H) {
    const list = el.querySelector('#clList');
    const draw = async () => { if (!list) return; let l = []; try { l = await H.Api.list(`call_links?owner_id=eq.${H.Api.userId}&closed=is.false&expires_at=gt.${new Date().toISOString()}&select=token,title,video&order=created_at.desc&limit=10`); } catch (e) { }
      list.innerHTML = l.map((x) => `<div class="row" style="padding:4px 0">${H.I(x.video ? 'video' : 'phone', 16)}<div class="main">${esc(x.title || tr(x.video ? 'Video-Anruf' : 'Anruf'))}</div>
        <button class="ico" data-cl-copy="${x.token}" title="${esc(tr('Link kopieren'))}">${H.I('copy', 16)}</button><button class="ico" data-cl-join="${x.token}" data-v="${x.video ? 1 : 0}" title="${esc(tr('Beitreten'))}">${H.I('phone', 16)}</button><button class="ico" data-cl-del="${x.token}" title="${esc(tr('Beenden'))}">${H.I('trash', 16)}</button></div>`).join('');
      list.querySelectorAll('[data-cl-copy]').forEach((b) => b.onclick = () => { navigator.clipboard.writeText(T2.BASE + b.dataset.clCopy).then(() => H.toast(tr('✓ Link kopiert — schick ihn, an wen du willst.'))); });
      list.querySelectorAll('[data-cl-join]').forEach((b) => b.onclick = () => H.tryDo(() => T2.joinLink(H, b.dataset.clJoin, b.dataset.v === '1', tr('Anruf-Link'))));
      list.querySelectorAll('[data-cl-del]').forEach((b) => b.onclick = () => H.tryDo(async () => { await H.Api.rpc('close_call_link', { tok: b.dataset.clDel }); draw(); })); };
    el.querySelectorAll('[data-act="zLinkNew"]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); H.tryDo(async () => {
      const tok = String(await H.Api.rpc('create_call_link', { t: ((el.querySelector('#clTitle') || {}).value || '').trim(), with_video: b.dataset.video === '1' })).replace(/"/g, '');
      try { await navigator.clipboard.writeText(T2.BASE + tok); } catch (x) { }
      H.toast(tr('✓ Anruf-Link erstellt und kopiert')); draw(); }); });
    draw();
  };
  T2.joinLink = async function (H, tok, video, title) {
    const Call = root.ZMCall; if (Call.callId) throw new Error(tr('Es läuft schon ein Anruf.'));
    await Call.media(video);
    const id = String(await H.Api.rpc('join_call_link', { tok, device: H.S.deviceId, nm: (H.S.me && H.S.me.name) || '' })).replace(/"/g, '');
    Call.guestTitle = title || tr('Anruf-Link');
    await Call.begin(id, null, null, video, false);
  };
  T2.joinPromptDlg = async function (H, tok) {
    let i = null; try { i = ((await H.Api.rpc('call_link_info', { tok })) || [])[0]; } catch (e) { }
    if (!i || !i.valid) return H.toast(tr('Dieser Anruf-Link gilt nicht mehr.'), true);
    const title = i.title || tr('Anruf von %s').replace('%s', i.host);
    H.dlg(`<h3>${esc(title)}</h3><p class="small muted">${i.people ? esc(tr('%s dabei').replace('%s', i.people)) : ''}</p><div class="rowb"><button class="btn ghost" data-a>${tr('Mit Ton')}</button>${i.video ? `<button class="btn" data-v>${tr('Mit Video')}</button>` : ''}</div>`, (b) => {
      b.querySelector('[data-a]').onclick = () => { H.closeDlg(); H.tryDo(() => T2.joinLink(H, tok, false, title)); };
      const v = b.querySelector('[data-v]'); if (v) v.onclick = () => { H.closeDlg(); H.tryDo(() => T2.joinLink(H, tok, true, title)); };
    });
  };
  /** Web-App: Gast ohne Konto (…/app/?anruf=…). Meldet sich anonym an (vorläufiges Konto, nach 1 Tag gelöscht). */
  T2.guestToken = () => (root.Host && root.Host.web ? T2.tokenOf(location.search) : null);
  T2.guestScreen = async function (H, tok) {
    const { Api, S } = H; const app = document.getElementById('zm-app');
    let i = null; try { i = ((await Api.rpc('call_link_info', { tok })) || [])[0]; } catch (e) { }
    app.innerHTML = `<div class="zm-login"><div class="card" style="max-width:420px"><div class="zm-orb" style="margin:0 auto 10px"></div>
      <h2 style="text-align:center">${i && i.valid ? esc(i.title || tr('Anruf von %s').replace('%s', i.host)) : esc(tr('Dieser Anruf-Link gilt nicht mehr.'))}</h2>
      ${i && i.valid ? `<p class="small muted" style="text-align:center">${tr('Du machst als Gast mit — ohne Konto. Ton und Bild laufen direkt und verschlüsselt.')}</p>
      <input id="gName" placeholder="${esc(tr('Dein Name'))}" maxlength="40"><div class="rowb"><button class="btn ghost" data-g="0">${tr('Mit Ton')}</button>${i.video ? `<button class="btn" data-g="1">${tr('Mit Video')}</button>` : ''}</div><p id="gMsg" class="small"></p>
      <p class="small muted">${tr('Mit dem Beitritt akzeptierst du die Nutzungsregeln von Zunora. Dein Gast-Zugang wird nach einem Tag gelöscht.')}</p>` : ''}</div></div>`;
    app.querySelectorAll('[data-g]').forEach((b) => b.onclick = async () => {
      const name = (app.querySelector('#gName').value || '').trim().slice(0, 40) || tr('Gast'); const msg = app.querySelector('#gMsg');
      try {
        b.disabled = true; msg.textContent = tr('Einen Moment …');
        const uname = 'gast_' + Array.from(crypto.getRandomValues(new Uint8Array(6))).map((x) => x.toString(16).padStart(2, '0')).join('');
        const r = await fetch(Api.url + '/auth/v1/signup', { method: 'POST', headers: { apikey: Api.anon, 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { username: uname, display_name: name } }) });
        const o = await r.json(); if (!r.ok || !o.access_token) throw new Error(tr('Der Gast-Zugang ist gerade nicht möglich. Bitte später noch einmal.'));
        Api.take(o); Api.username = uname; await Api.save();
        if (!(await S.start())) throw new Error(tr('Die Verbindung hat nicht geklappt.'));
        if (H.shell) H.shell();
        await T2.joinLink(H, tok, b.dataset.g === '1', i.title || tr('Anruf von %s').replace('%s', i.host));
        H.renderAll();
      } catch (e) { b.disabled = false; msg.textContent = Z.err(e); }
    });
  };

  // ===================================================================================== Anruf-Effekte
  T2.noiseOn = () => LS.get('zm-anruf-rauschen', '1') !== '0';
  T2.blurOn = () => LS.get('zm-anruf-weich', '0') === '1';
  /** Weichzeichnen ohne fremdes KI-Modell: Gesicht (falls der Browser es erkennt) bzw. Bildmitte scharf, Rest weich */
  T2.blurTrack = function (cam) {
    try {
      const t0 = cam.getVideoTracks()[0]; if (!t0) return null;
      const caps = t0.getCapabilities ? t0.getCapabilities() : {};
      if (caps.backgroundBlur && caps.backgroundBlur.includes && caps.backgroundBlur.includes(true)) { t0.applyConstraints({ backgroundBlur: true }).catch(() => { }); return null; }      // Windows-Studioeffekte
      const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.srcObject = new MediaStream([t0]); v.play().catch(() => { });
      const cv = document.createElement('canvas'); cv.width = 640; cv.height = 360; const g = cv.getContext('2d');
      let face = null, faceAt = 0; const fd = ('FaceDetector' in root) ? new root.FaceDetector({ maxDetectedFaces: 1, fastMode: true }) : null; let busy = false, n = 0;
      const draw = () => {
        if (v.readyState >= 2) {
          const w = cv.width, h = cv.height;
          g.filter = 'blur(14px)'; g.drawImage(v, 0, 0, w, h); g.filter = 'none';
          if (fd && !busy && n++ % 10 === 0) { busy = true; fd.detect(v).then((f) => { if (f[0]) { const b = f[0].boundingBox; face = { x: b.x / v.videoWidth, y: b.y / v.videoHeight, w: b.width / v.videoWidth, h: b.height / v.videoHeight }; faceAt = Date.now(); } }).catch(() => { }).finally(() => { busy = false; }); }
          const f = face && Date.now() - faceAt < 3000 ? face : { x: 0.38, y: 0.18, w: 0.24, h: 0.34 };
          const cx = (f.x + f.w / 2) * w, cy = (f.y + f.h / 2) * h, rx = f.w * w * 0.85, ry = f.h * h * 0.85;
          g.save(); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          g.moveTo(cx - rx * 1.25, cy + ry * 0.9); g.lineTo(cx + rx * 1.25, cy + ry * 0.9); g.lineTo(cx + rx * 2.4, h); g.lineTo(cx - rx * 2.4, h); g.closePath();
          g.clip(); g.drawImage(v, 0, 0, w, h); g.restore();
        }
        if (out.readyState !== 'ended') requestAnimationFrame(draw);
      };
      const out = cv.captureStream(24).getVideoTracks()[0];
      out.onended = () => { try { t0.stop(); } catch (e) { } };
      const st = out.stop.bind(out); out.stop = () => { try { t0.stop(); } catch (e) { } st(); };
      requestAnimationFrame(draw);
      return out;
    } catch (e) { return null; }
  };
  /** call.js erweitern: Rauschfilter und Weichzeichner beim Start der Kamera/des Mikrofons, Umschalten im Anruf */
  T2.patchCall = function () {
    const Call = root.ZMCall; if (!Call || Call._zfx) return; Call._zfx = true;
    const md = navigator.mediaDevices; const orig = md.getUserMedia.bind(md);
    md.getUserMedia = async (c) => {
      const cc = c ? JSON.parse(JSON.stringify(c)) : c;
      if (Call.callId !== undefined && cc && cc.audio && typeof cc.audio === 'object' && 'noiseSuppression' in cc.audio && T2.inCallSetup) cc.audio.noiseSuppression = T2.noiseOn();
      const s = await orig(cc);
      if (cc && cc.video && T2.inCallSetup && T2.blurOn()) { const bt = T2.blurTrack(s); if (bt) { s.getVideoTracks().forEach((t) => s.removeTrack(t)); s.addTrack(bt); } }
      return s;
    };
    const m0 = Call.media.bind(Call);
    Call.media = async (video) => { T2.inCallSetup = true; try { return await m0(video); } finally { T2.inCallSetup = false; } };
    Call.toggleNoise = async () => {
      LS.set('zm-anruf-rauschen', T2.noiseOn() ? '0' : '1');
      const a = Call.local && Call.local.getAudioTracks()[0]; if (a && a.applyConstraints) await a.applyConstraints({ noiseSuppression: T2.noiseOn(), echoCancellation: true, autoGainControl: true }).catch(() => { });
      Call.changed();
    };
    Call.toggleBlur = async () => {
      LS.set('zm-anruf-weich', T2.blurOn() ? '0' : '1');
      if (Call.local && Call.local.getVideoTracks().length) {
        const old = Call.local.getVideoTracks()[0];
        const cam = await orig({ video: { width: 1280, height: 720 } });
        let t = cam.getVideoTracks()[0]; if (T2.blurOn()) { const bt = T2.blurTrack(cam); if (bt) t = bt; }
        Call.local.removeTrack(old); Call.local.addTrack(t);
        for (const r of Call.remotes.values()) { const sd = r.pc.getSenders().find((x) => x.track === old); if (sd) await sd.replaceTrack(t); }
        try { old.stop(); } catch (e) { }
      }
      Call.changed();
    };
  };
  T2.callFxHtml = (H) => `<div class="cat" style="padding-left:0">${tr('Ton und Bild')}</div>
    <label class="small chk"><input type="checkbox" id="zNoise" ${T2.noiseOn() ? 'checked' : ''}> <span>${tr('Rauschen unterdrücken (Wind, Straße, Tastatur, Echo)')}</span></label>
    <label class="small chk"><input type="checkbox" id="zBlur" ${T2.blurOn() ? 'checked' : ''}> <span>${tr('Hintergrund weichzeichnen bei Videoanrufen (berechnet nur auf diesem PC)')}</span></label>
    <label class="small chk"><input type="checkbox" id="zVoiceNf" ${LS.get('zm-sprach-rausch', '1') !== '0' ? 'checked' : ''}> <span>${tr('Sprachnachrichten: Hintergrundgeräusche filtern')}</span></label>`;
  T2.wireCallFx = function (el) {
    const a = el.querySelector('#zNoise'), b = el.querySelector('#zBlur'), c = el.querySelector('#zVoiceNf');
    if (a) a.onchange = () => LS.set('zm-anruf-rauschen', a.checked ? '1' : '0');
    if (b) b.onchange = () => LS.set('zm-anruf-weich', b.checked ? '1' : '0');
    if (c) c.onchange = () => LS.set('zm-sprach-rausch', c.checked ? '1' : '0');
  };

  // ===================================================================================== Nachrichten-Inhalt (Standort, Einmal-Sprachnachricht)
  T2.bodyHtml = function (m, c0, mine, H) {
    if (m.kind === 'location') return T2.locationHtml(m, c0, mine);
    if (m.kind === 'voice' && m.viewOnce) return T2.onceVoiceHtml(m, mine, H);
    return '';
  };
  /** Klicks (einmal für alles registriert) */
  T2.wireGlobal = function (getH) {
    document.addEventListener('click', (e) => {
      const H = getH();
      const loc = e.target.closest('[data-zloc]'); const stop = e.target.closest('[data-zlocstop]');
      if (stop) { e.stopPropagation(); T2.stopLive(H, stop.dataset.zlocstop).then(() => H.renderAll()); return; }
      if (loc) { e.stopPropagation(); const u = `https://www.openstreetmap.org/?mlat=${loc.dataset.lat}&mlon=${loc.dataset.lng}#map=17/${loc.dataset.lat}/${loc.dataset.lng}`; if (root.ZMLinks) root.ZMLinks.open(u); else window.open(u, '_blank'); return; }
      const fwd = e.target.closest('[data-fwd]');
      if (fwd) { e.stopPropagation(); const id = (fwd.closest('[data-msg]') || {}).dataset?.msg; const m = (H.S.messages.get(H.S.openChat) || []).find((x) => x.id === id); if (m) T2.forwardDlg(H, m); return; }
      const ov = e.target.closest('[data-oncevoice]');
      if (ov) { e.stopPropagation(); const m = (H.S.messages.get(H.S.openChat) || []).find((x) => x.id === ov.dataset.oncevoice); if (!m) return;
        H.tryDo(async () => { const u = await H.S.mediaUrl(m.id, m.content.media); const a = new Audio(u); await H.S.onceOpen(m).catch(() => { }); a.play(); ov.removeAttribute('data-oncevoice'); ov.classList.add('done'); ov.querySelector('.small').textContent = tr('Läuft — danach ist sie weg'); a.onended = () => { try { URL.revokeObjectURL(u); } catch (x) { } H.renderMain(); }; }); return; }
      const kc = e.target.closest('[data-zkeycheck]'); if (kc) { e.stopPropagation(); T2.safetyDlg(H, kc.dataset.zkeycheck); return; }
      const ko = e.target.closest('[data-zkeyok]'); if (ko) { e.stopPropagation(); T2.ackKeys(H, ko.dataset.zkeyok).then(() => H.renderMain()); return; }
      const lnk = e.target.closest('a[data-zlink], [data-zlink]'); if (lnk) { const t = T2.tokenOf(lnk.dataset.zlink); if (t) { e.preventDefault(); e.stopPropagation(); T2.joinPromptDlg(H, t); } }
    }, true);
  };

  root.ZMStart2 = T2;
})(window);

/* Anruf-Links: Liste (zwischengespeichert) und Knöpfe über einen gemeinsamen Klick-Verteiler */
(function (root) {
  'use strict';
  const T2 = root.ZMStart2; const tr = (s) => (root.ZLang && root.ZLang.t ? root.ZLang.t(s) : s);
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  T2.links = []; let at = 0, loading = false;
  T2.loadLinks = async function (H) {
    if (loading) return; loading = true;
    try { T2.links = await H.Api.list(`call_links?owner_id=eq.${H.Api.userId}&closed=is.false&expires_at=gt.${new Date().toISOString()}&select=token,title,video&order=created_at.desc&limit=10`); } catch (e) { T2.links = []; }
    at = Date.now(); loading = false; H.renderList();
  };
  T2.linksHtml = function (H) {
    if (Date.now() - at > 60000 && !loading) setTimeout(() => T2.loadLinks(H), 0);
    return T2.links.map((x) => `<div class="row" style="padding:4px 0">${H.I(x.video ? 'video' : 'phone', 16)}<div class="main">${esc(x.title || tr(x.video ? 'Video-Anruf' : 'Anruf'))}</div>
      <button class="ico" data-clcopy="${x.token}" title="${esc(tr('Link kopieren'))}">${H.I('copy', 16)}</button><button class="ico" data-cljoin="${x.token}" data-v="${x.video ? 1 : 0}" title="${esc(tr('Beitreten'))}">${H.I('phone', 16)}</button><button class="ico" data-cldel="${x.token}" title="${esc(tr('Link beenden'))}">${H.I('trash', 16)}</button></div>`).join('');
  };
  T2.wireLinkClicks = function (getH) {
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-act="zLinkNew"], [data-clcopy], [data-cljoin], [data-cldel], [data-act="zNoise"], [data-act="zBlur"], [data-act="zLoc"]'); if (!t) return;
      e.stopPropagation(); e.preventDefault(); const H = getH();
      if (t.dataset.act === 'zLoc') { if (H.S.openChat) T2.locationDlg(H, H.S.openChat); return; }
      if (t.dataset.act === 'zNoise') { root.ZMCall.toggleNoise(); return; }
      if (t.dataset.act === 'zBlur') { H.tryDo(() => root.ZMCall.toggleBlur()); return; }
      if (t.dataset.act === 'zLinkNew') return H.tryDo(async () => {
        const tok = String(await H.Api.rpc('create_call_link', { t: ((document.getElementById('clTitle') || {}).value || '').trim(), with_video: t.dataset.video === '1' })).replace(/"/g, '');
        try { await navigator.clipboard.writeText(T2.BASE + tok); } catch (x) { }
        H.toast(tr('✓ Anruf-Link erstellt und kopiert — schick ihn, an wen du willst.')); at = 0; T2.loadLinks(H); });
      if (t.dataset.clcopy) { navigator.clipboard.writeText(T2.BASE + t.dataset.clcopy).then(() => H.toast(tr('✓ Link kopiert'))).catch(() => { }); return; }
      if (t.dataset.cljoin) return H.tryDo(() => T2.joinLink(H, t.dataset.cljoin, t.dataset.v === '1', tr('Anruf-Link')));
      if (t.dataset.cldel) return H.tryDo(async () => { await H.Api.rpc('close_call_link', { tok: t.dataset.cldel }); at = 0; T2.loadLinks(H); });
    }, true);
  };
})(window);
