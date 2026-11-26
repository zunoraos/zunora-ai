/* Zunora Messenger (PC) · 1.2.0 Teil 3 — wie am Handy:
 *  • Wer darf dir schreiben (Nachrichten-Anfragen, SQL 40) · Status-Funktion ausschalten
 *  • Zunora Plus: Chat-Designs je Chat (beide sehen es), unsichtbar lesen, Online-Status vor einzelnen verbergen
 *  • Konto: Stimmung, Pronomen, Links, Geburtstag (nur Freunde), Geräte & Sicherheit, Plus & Statistik
 *  • Startseite: Tagesüberblick, Schnellaktionen, Geburtstage, Erwähnungen, angeheftete Chats
 *  • Server-Kanäle: Symbol/Farbe, Thema unter dem Namen, einklappbare Kategorien
 * Muss VOR zm/mehr.js geladen werden (die Widget-Liste wird dort beim Laden erweitert). */
(function (root) {
  const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } } };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const T = (s) => (root.ZLang && root.ZLang.tr ? root.ZLang.tr(s) : s);
  const plus = () => !!(root.ZPlus && root.ZPlus.active());
  let H = null;                    // zuletzt übergebene Helfer (S, Api, toast, renderAll …)
  const st = { dmFrom: 'friends', statusOff: LS.get('zw-status-aus', '0') === '1', loaded: false, hidden: new Set(), canMsg: new Map(), extras: new Map(), bdays: new Map(), showYear: false, stats: null };

  // ------------------------------------------------------------------------------------------ Laden
  async function load() {
    if (!H || st.loaded) return; st.loaded = true;
    const { Api } = H;
    try { const r = (await Api.list(`profiles?id=eq.${Api.userId}&select=dm_from,status_off`))[0]; if (r) { st.dmFrom = r.dm_from || 'friends'; setStatusOffLocal(!!r.status_off); } } catch (e) { }
    try { (await Api.list('presence_hidden?select=target_id')).forEach((x) => st.hidden.add(x.target_id)); } catch (e) { }
    loadBirthdays();
  }
  function setStatusOffLocal(v) { st.statusOff = v; LS.set('zw-status-aus', v ? '1' : '0'); }
  async function loadBirthdays() {
    try { const a = await H.Api.rpc('friend_birthdays'); st.bdays.clear(); (a || []).forEach((b) => st.bdays.set(b.user_id, { m: b.month, d: b.day, y: b.year })); } catch (e) { }
    try { const r = (await H.Api.list(`birthdays?user_id=eq.${H.Api.userId}&select=show_year`))[0]; st.showYear = !!(r && r.show_year); } catch (e) { }
  }
  async function loadExtras(ids) {
    const l = [...new Set(ids)].filter(Boolean).slice(0, 100); if (!l.length) return;
    try { (await H.Api.list(`profiles?id=in.(${l.join(',')})&select=id,pronouns,mood,mood_emoji,links`)).forEach((o) => st.extras.set(o.id, { pron: o.pronouns || '', mood: o.mood || '', emo: o.mood_emoji || '', links: (o.links || []).filter((x) => /^https:\/\//.test(x.u || '')) })); } catch (e) { }
  }
  const daysUntil = (b) => { const n = new Date(); n.setHours(0, 0, 0, 0); let d = new Date(n.getFullYear(), b.m - 1, b.d); if (d < n) d = new Date(n.getFullYear() + 1, b.m - 1, b.d); return Math.round((d - n) / 86400000); };

  // ------------------------------------------------------------------------------------------ Chat-Design (Plus)
  const THEMES = [['Liebe', '#FF5F8F,#7A2BFF', '#FF4D8D', '#4B1D5C', '❤️'], ['Ozean', '#0E3A5C,#2F7BFF', '#2F7BFF', '#0E3A5C', '🌊'], ['Sonnenuntergang', '#FF7A45,#FF3D7F', '#FF7A45', '#5A1E3A', '🌅'],
    ['Wald', '#1FAA6B,#0E3A2E', '#2FBF71', '#1F3A2E', '🌿'], ['Galaxie', '#1F1C2C,#7A2BFF', '#9B7BFF', '#2A1B5E', '🌌'], ['Bonbon', '#FFD1EC,#E8D1FF', '#FF7AD9', '#7C5CFF', '🍬'],
    ['Gold', '#2B1B00,#7A5600', '#FFC23D', '#5A3A00', '✨'], ['Mitternacht', '#111827,#111827', '#374151', '#1F2937', '🌙'], ['Zitrone', '#FFF6B7,#A3D93B', '#A3D93B', '#3F5A1E', '🍋'], ['Fußball', '#0B6E3A,#1FAA6B', '#FFFFFF', '#0B3D22', '⚽']];
  const hexOk = (c) => /^#[0-9A-Fa-f]{6}$/.test(c || '');
  const light = (c) => { const n = parseInt(c.slice(1), 16); return ((n >> 16) * 299 + ((n >> 8 & 255) * 587) + ((n & 255) * 114)) / 1000 > 170; };
  function applyTheme(c, el) {
    const t = c && c.theme, s = el.style;
    ['--mebub', '--mebubfg', '--out', '--in'].forEach((v) => s.removeProperty(v)); s.removeProperty('background');
    if (!t) return;
    const bg = String(t.bg || '').replace(/^[gc]:/, '').split(',').filter(hexOk);
    if (bg.length) s.background = bg.length > 1 ? `linear-gradient(160deg, ${bg[0]}, ${bg[1]})` : bg[0];
    if (hexOk(t.mine)) { s.setProperty('--mebub', `linear-gradient(135deg, ${t.mine}, color-mix(in srgb, ${t.mine} 62%, #ffffff))`); s.setProperty('--out', t.mine); s.setProperty('--mebubfg', light(t.mine) ? '#111827' : '#ffffff'); }
    if (hexOk(t.other)) s.setProperty('--in', `color-mix(in srgb, ${t.other} 70%, transparent)`);
  }
  function themeDlg(chatId) {
    const { S, Api, dlg, closeDlg, toast, tryDo } = H; const c = S.chats.get(chatId); if (!c) return;
    const cur = (c.theme || {}).name || '';
    dlg(`<h3>${T('Chat-Design')}</h3><p class="small muted">${c.group ? T('Alle in der Gruppe sehen das Design.') : T('{0} sieht das Design auch.').replace('{0}', esc(c.title))}</p>
      ${plus() ? '' : `<p class="small" style="color:var(--accent)">✨ ${T('Chat-Designs gibt es mit Zunora Plus. Ansehen kann sie jeder.')}</p>`}
      <div class="zw-themes">${THEMES.map(([n, bg, mine, other, emo], i) => { const g = bg.split(','); return `<div class="zw-theme ${n === cur ? 'on' : ''}" data-zwt="${i}" style="background:linear-gradient(160deg,${g[0]},${g[1]});${plus() ? '' : 'opacity:.6;cursor:default'}">
        <div style="font-size:22px">${emo}</div><span class="b" style="background:${other}">Hallo!</span><br><span class="b" style="background:${mine};color:${light(mine) ? '#111' : '#fff'};float:right">Hi 👋</span><div style="clear:both;font-weight:600;margin-top:6px">${esc(T(n))}</div></div>`; }).join('')}</div>
      ${c.theme ? `<button class="btn ghost" data-zwt="off" style="width:100%;margin-top:10px">${T('Design entfernen')}</button>` : ''}<button class="btn ghost" data-close style="width:100%;margin-top:6px">${T('Schließen')}</button>`, (box) => {
      box.querySelectorAll('[data-close]').forEach((b) => b.onclick = closeDlg);
      box.querySelectorAll('[data-zwt]').forEach((b) => b.onclick = () => tryDo(async () => {
        if (b.dataset.zwt !== 'off' && !plus()) return;
        const th = b.dataset.zwt === 'off' ? null : (([n, bg, mine, other, emoji]) => ({ name: n, bg: 'g:' + bg, mine, other, emoji }))(THEMES[+b.dataset.zwt]);
        await Api.rpc('set_chat_theme', { c: chatId, t: th }); c.theme = th; closeDlg(); H.renderAll(); toast(th ? '✓ ' + T('Chat-Design geändert') : '✓ ' + T('Chat-Design entfernt'));
      }));
    });
  }

  // ------------------------------------------------------------------------------------------ Nachrichten-Anfrage
  function requestHtml(h, c) {
    H = h; load();
    if (!c || c.group || !c.requestFrom) return '';
    const other = (c.members.find((m) => m.userId !== h.Api.userId) || {}).userId; const name = esc(h.S.nameOf ? h.S.nameOf(other) : c.title);
    if (c.requestFrom === h.Api.userId) return `<div class="zw-req"><b>${T('Nachrichten-Anfrage gesendet')}</b><div class="small muted">${T('{0} ist nicht mit dir befreundet. Du kannst bis zu 3 Nachrichten schicken, bis {0} antwortet.').replace(/\{0\}/g, name)}</div></div>`;
    return `<div class="zw-req"><b>${T('{0} möchte dir schreiben').replace('{0}', name)}</b><div class="small muted">${T('Ihr seid nicht befreundet. Antwortest du oder nimmst du an, wird daraus ein normaler Chat. {0} sieht erst dann, ob du gelesen hast.').replace('{0}', name)}</div>
      <div class="row-end"><button class="btn" data-zw="reqok" data-chat-id="${esc(c.id)}">${T('Annehmen')}</button><button class="btn ghost" data-zw="reqblock" data-chat-id="${esc(c.id)}" data-user="${esc(other)}">${T('Blockieren')}</button><button class="btn ghost" data-zw="reqdel" data-chat-id="${esc(c.id)}">${T('Löschen')}</button></div></div>`;
  }

  // ------------------------------------------------------------------------------------------ Profil anderer
  function canMsg(user) { return st.canMsg.get(user) === true; }
  function profileExtras(user, h, redraw) {
    H = h; load();
    if (!st.canMsg.has(user)) { st.canMsg.set(user, false); h.Api.rpc('can_message', { other: user }).then((r) => { const v = r === true || r === 'true'; if (v) { st.canMsg.set(user, true); redraw(); } }).catch(() => { }); }
    if (!st.extras.has(user)) { st.extras.set(user, null); loadExtras([user]).then(() => { if (st.extras.get(user)) redraw(); }); }
    return extrasHtml(user);
  }
  function extrasHtml(user) {
    const x = st.extras.get(user), b = st.bdays.get(user); if (!x && !b) return '';
    const parts = [];
    if (x && (x.mood || x.emo)) parts.push(`<div class="mood">${esc(x.emo)} ${esc(x.mood)}</div>`);
    if (x && x.pron) parts.push(`<div class="small muted" style="margin-top:4px">${esc(x.pron)}</div>`);
    if (b) { const d = daysUntil(b); parts.push(`<div class="small muted" style="margin-top:4px">🎂 ${String(b.d).padStart(2, '0')}.${String(b.m).padStart(2, '0')}.${b.y || ''}${d === 0 ? ' · ' + T('heute!') : d <= 14 ? ' · ' + T('in {0} Tagen').replace('{0}', d) : ''}</div>`); }
    if (x && x.links.length) parts.push(`<div class="links">${x.links.map((l) => `<a href="${esc(l.u)}" target="_blank" rel="noopener">🔗 ${esc(l.t || l.u.replace(/^https:\/\//, '').split('/')[0])}</a>`).join('')}</div>`);
    return `<div class="zw-extra">${parts.join('')}</div>`;
  }

  // ------------------------------------------------------------------------------------------ Einstellungen
  const radio = (key, cur, opts) => opts.map(([k, t, d]) => `<div class="row thopt ${cur === k ? 'on' : ''}" data-zw="${key}" data-v="${k}" style="cursor:pointer"><div class="main"><div class="title">${T(t)}</div><div class="prev">${T(d)}</div></div></div>`).join('');
  function settings(body, h) {
    H = h; load();
    const S = h.S;
    body.datenschutz = `<div class="cat" style="padding-left:0">${T('Wer darf dir schreiben')}</div><p class="small muted" style="margin:0 0 6px">${T('Wer kein Freund ist, landet als Nachrichten-Anfrage bei dir: höchstens 3 Nachrichten, bis du antwortest oder annimmst.')}</p>
      ${radio('dm', st.dmFrom, [['friends', 'Nur Freunde', 'Wie bisher: schreiben und anrufen können nur deine Freunde.'], ['fof', 'Auch Freunde von Freunden', 'Wer mindestens einen gemeinsamen Freund mit dir hat.'], ['all', 'Alle', 'Jeder mit deinem Nutzernamen kann dir eine Nachricht schicken.']])}
      <div class="cat" style="padding-left:0">${T('Status')}</div><label class="small chk"><input type="checkbox" data-zw="statusoff" ${st.statusOff ? 'checked' : ''}> <span>${T('Status-Funktion ausschalten — keine Status-Leiste und kein Status-Widget. Gilt auf allen deinen Geräten.')}</span></label>
      <div class="zw-card"><b>✨ ${T('Mehr Kontrolle')}</b>${plus() ? '' : ` <span class="small" style="color:var(--accent)">· Zunora Plus</span>`}
        <label class="small chk" style="margin-top:8px"><input type="checkbox" data-zw="ghost" ${ghost() ? 'checked' : ''} ${plus() ? '' : 'disabled'}> <span>${T('Unsichtbar lesen — niemand sieht, dass du gelesen hast; die Haken der anderen siehst du trotzdem.')}</span></label>
        <button class="btn ghost" data-zw="presence" style="width:100%;margin-top:8px" ${plus() ? '' : 'disabled'}>${T('Online-Status verbergen vor …')} (${st.hidden.size})</button>
        <p class="small muted" style="margin:8px 0 0">${T('Mit Plus außerdem: 24 Stunden bearbeiten (sonst 15 Minuten), Sprachnachrichten bis 30 Minuten (sonst 15). Versteckte Chats und Fotos in Originalqualität gibt es in der Handy-App.')}</p></div>` + body.datenschutz;
    body.konto = (body.konto || '') + moreAboutHtml() + securityHtml() + statsHtml();
  }
  const MOODS = ['😊', '😎', '🥳', '😴', '🤒', '📚', '💼', '🏋', '🎮', '🎧', '✈️', '🏖', '❤️', '🔥', '🤔', '🙏'];
  function moreAboutHtml() {
    const me = H.Api.userId; if (!st.extras.has(me)) { st.extras.set(me, null); loadExtras([me]).then(() => H.renderList()); }
    const x = st.extras.get(me) || { pron: '', mood: '', emo: '', links: [] }, b = st.bdays.get(me);
    const links = [...x.links, { t: '', u: '' }, { t: '', u: '' }, { t: '', u: '' }].slice(0, 3);
    return `<div class="zw-card" id="zwMore"><b>${T('Mehr über dich')}</b><p class="small muted" style="margin:2px 0 8px">${T('Stimmung, Pronomen und Links sehen alle, die dein Profil öffnen. Den Geburtstag sehen nur deine Freunde.')}</p>
      <div class="chips">${MOODS.map((e) => `<button class="chip ${x.emo === e ? 'on' : ''}" data-zw="emo" data-v="${e}">${e}</button>`).join('')}</div>
      <input id="zwMood" maxlength="60" placeholder="${T('Was ist los? (z. B. „Im Urlaub bis Montag“)')}" value="${esc(x.mood)}" style="width:100%;margin-top:6px" data-emo="${esc(x.emo)}">
      <input id="zwPron" maxlength="30" placeholder="${T('Pronomen (freiwillig)')}" value="${esc(x.pron)}" style="width:100%;margin-top:6px">
      <div class="small muted" style="margin-top:8px">${T('Links (bis zu 3)')}</div>
      ${links.map((l, i) => `<div style="display:flex;gap:6px;margin-top:4px"><input class="zwLt" maxlength="30" placeholder="${T('Name')}" value="${esc(l.t)}" style="flex:2"><input class="zwLu" maxlength="200" placeholder="https://…" value="${esc(l.u)}" style="flex:3"></div>`).join('')}
      <div class="small muted" style="margin-top:8px">${T('Geburtstag')}</div>
      <div style="display:flex;gap:6px;margin-top:4px"><input id="zwBd" maxlength="2" placeholder="${T('Tag')}" value="${b ? b.d : ''}" style="flex:1"><input id="zwBm" maxlength="2" placeholder="${T('Monat')}" value="${b ? b.m : ''}" style="flex:1"><input id="zwBy" maxlength="4" placeholder="${T('Jahr')}" value="${b && b.y ? b.y : ''}" style="flex:1.3"></div>
      <label class="small chk" style="margin-top:6px"><input type="checkbox" id="zwBshow" ${st.showYear ? 'checked' : ''}> <span>${T('Jahr für Freunde zeigen')}</span></label>
      <button class="btn" data-zw="savemore" style="width:100%;margin-top:8px">${T('Speichern')}</button></div>`;
  }
  function securityHtml() {
    return `<div class="zw-card"><b>${T('Geräte & Sicherheit')}</b><div id="zwDev" class="small muted" style="margin-top:6px">${T('Lädt …')}</div>
      <div style="display:flex;gap:8px;margin-top:8px"><button class="btn ghost" data-setpage="geraete" style="flex:1">${T('Geräte verwalten')}</button><button class="btn ghost" data-setpage="chats" style="flex:1">${T('Sicherung')}</button></div></div>`;
  }
  function statsHtml() {
    const s = st.stats;
    if (!s) { H.Api.rpc('my_stats').then((r) => { if (r) { st.stats = r; H.renderList(); } }).catch(() => { }); }
    const n = (v) => Number(v || 0).toLocaleString('de-DE');
    const top = s && s.top_chat && H.S.chats.get(s.top_chat);
    return `<div class="zw-card"><b>${T('Plus & Statistik')}</b> <span class="small" style="color:var(--accent);cursor:pointer" data-setpage="plus">${plus() ? '✨ ' + T('Plus aktiv') : T('Plus holen')}</span>
      ${s ? `<div class="small" style="margin-top:6px;font-weight:600">${T('Dein Jahr {0} im Messenger').replace('{0}', new Date().getFullYear())}</div><div class="zw-stats">
        <div>💬 <b>${n(s.messages_year)}</b><br><span class="small muted">${T('Nachrichten dieses Jahr')}</span></div><div>👥 <b>${n(s.friends)}</b><br><span class="small muted">${T('Freunde')}</span></div>
        <div>🗨 <b>${n(s.chats)}</b><br><span class="small muted">${T('Chats')}</span></div><div>🏠 <b>${n(s.servers)}</b><br><span class="small muted">${T('Server')}</span></div>
        <div>⭐ <b>${n(s.statuses)}</b><br><span class="small muted">${T('Status gepostet')}</span></div><div>✉️ <b>${n(s.messages)}</b><br><span class="small muted">${T('Nachrichten insgesamt')}</span></div></div>
        ${top ? `<div class="small" style="margin-top:8px">${T('Am meisten geschrieben (30 Tage): {0}').replace('{0}', esc(top.title))}</div>` : ''}
        ${s.since ? `<div class="small muted" style="margin-top:4px">${T('Dabei seit {0}').replace('{0}', new Date(s.since).toLocaleDateString('de-DE'))}</div>` : ''}` : `<div class="small muted">${T('Lädt …')}</div>`}</div>`;
  }
  function fillDevices() {
    const el = document.getElementById('zwDev'); if (!el || el.dataset.done) return; el.dataset.done = '1';
    H.Api.list('devices?select=id,name,platform,last_seen,revoked&order=last_seen.desc').then((l) => {
      const act = (l || []).filter((d) => !d.revoked);
      el.innerHTML = act.slice(0, 4).map((d) => `<div>${d.platform === 'pc' ? '💻' : d.platform === 'web' ? '🌐' : '📱'} ${esc(d.name || T('Gerät'))}${d.id === H.S.deviceId ? ' · ' + T('dieses Gerät') : ''} <span class="muted">· ${T('zuletzt aktiv {0}').replace('{0}', H.clock ? H.clock(Date.parse(d.last_seen)) : '')}</span></div>`).join('')
        + `<div style="margin-top:6px">${act.length <= 3 ? '🟢' : '🟡'} ${act.length <= 3 ? T('{0} angemeldete Geräte').replace('{0}', act.length) : T('{0} Geräte angemeldet — kennst du alle?').replace('{0}', act.length)}</div>`;
    }).catch(() => { el.textContent = ''; });
  }
  function presenceDlg() {
    const { S, Api, dlg, closeDlg, tryDo } = H;
    const fr = S.friends.filter((f) => f.st === 'accepted').map((f) => f.p);
    dlg(`<h3>${T('Online-Status verbergen')}</h3><p class="small muted">${T('Wen du hier einschaltest, sieht weder „online“ noch „zuletzt online“ von dir — alle anderen schon.')}</p>
      <div style="max-height:380px;overflow:auto">${fr.map((p) => `<label class="small chk" style="padding:4px 0"><input type="checkbox" data-u="${esc(p.id)}" ${st.hidden.has(p.id) ? 'checked' : ''}> <span>${esc(p.name)} <span class="muted">@${esc(p.username)}</span></span></label>`).join('') || T('Noch keine Freunde.')}</div>
      <button class="btn" data-close style="width:100%;margin-top:10px">${T('Fertig')}</button>`, (box) => {
      box.querySelector('[data-close]').onclick = () => { closeDlg(); H.renderList(); };
      box.querySelectorAll('[data-u]').forEach((cb) => cb.onchange = () => tryDo(async () => {
        const u = cb.dataset.u;
        if (cb.checked) { await Api.rest('POST', 'presence_hidden', { owner_id: Api.userId, target_id: u }); st.hidden.add(u); } else { await Api.rest('DELETE', `presence_hidden?target_id=eq.${u}`); st.hidden.delete(u); }
      }));
    });
  }
  const ghost = () => plus() && LS.get('zw-unsichtbar', '0') === '1';

  // ------------------------------------------------------------------------------------------ Startseite
  const WIDGETS = [['ueberblick', 'Tagesüberblick', 'Was seit deinem letzten Besuch passiert ist'], ['aktionen', 'Schnellaktionen', 'Neue Nachricht, Status posten, Freund hinzufügen'],
    ['geburtstage', 'Geburtstage', 'Wer von deinen Freunden bald Geburtstag hat'], ['erwaehnungen', 'Erwähnungen', 'Gruppen, in denen dich jemand erwähnt hat'], ['angeheftet', 'Angeheftete Chats', 'Deine angehefteten Chats']];
  function widget(k, h) {
    H = h; load();
    const { S, Api, cav, uav, I } = h;
    if (k === 'ueberblick') {
      const since = +LS.get('zw-start-besuch', String(Date.now() - 86400000)); setTimeout(() => LS.set('zw-start-besuch', String(Date.now())), 4000);
      const un = [...S.chats.values()].filter((c) => c.unread && !c.archived); const msgs = un.reduce((a, c) => a + c.unread, 0);
      const stc = st.statusOff ? 0 : [...S.statuses.keys()].filter((u) => u !== Api.userId && !(S.statuses.get(u) || []).every((i) => S.seenStatus(i.id))).length;
      const bd = [...st.bdays.entries()].filter(([u, b]) => u !== Api.userId && daysUntil(b) === 0).map(([u]) => u);
      return `<div class="wg"><div class="wg-h"><b>${T('Dein Überblick')}</b><span class="small muted" style="margin-left:auto">${T('seit')} ${new Date(since).toLocaleString('de-DE', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>
        <div class="zw-stats" style="grid-template-columns:repeat(2,1fr)"><div>💬 <b>${msgs}</b> <span class="small muted">${T('neue Nachrichten')}</span></div><div>⭐ <b>${stc}</b> <span class="small muted">${T('neue Status')}</span></div></div>
        ${un.length ? `<div class="small" style="margin-top:6px">${T('In {0} Chats').replace('{0}', un.length)}: ${un.sort((a, b) => b.lastAt - a.lastAt).slice(0, 3).map((c) => esc(c.title)).join(', ')}</div>` : ''}
        ${bd.map((u) => `<div class="small" style="margin-top:4px">🎂 ${T('{0} hat heute Geburtstag!').replace('{0}', esc(S.nameOf(u)))}</div>`).join('')}
        ${!msgs && !stc && !bd.length ? `<div class="small muted" style="margin-top:6px">${T('Alles erledigt ✓ — nichts Neues.')}</div>` : ''}</div>`;
    }
    if (k === 'aktionen') return `<div class="wg"><div class="zw-acts"><button data-act="newChat"><b>✏️</b>${T('Neue Nachricht')}</button>${st.statusOff ? '' : `<button data-act="myStatus"><b>⭐</b>${T('Status posten')}</button>`}<button data-view="friends"><b>➕</b>${T('Freund hinzufügen')}</button><button data-view="settings"><b>⚙️</b>${T('Einstellungen')}</button></div></div>`;
    if (k === 'geburtstage') {
      const soon = [...st.bdays.entries()].filter(([u]) => u !== Api.userId).map(([u, b]) => [u, daysUntil(b)]).filter(([, d]) => d <= 30).sort((a, b) => a[1] - b[1]).slice(0, 4);
      return `<div class="wg"><div class="wg-h">🎂 <b>${T('Geburtstage')}</b></div>${soon.length ? soon.map(([u, d]) => `<div class="row" data-profile="${esc(u)}" style="padding:4px 0;cursor:pointer">${uav(u, 's')}<div class="main"><div class="title">${esc(S.nameOf(u))}</div></div><span class="small" style="color:${d === 0 ? 'var(--accent)' : 'var(--sub)'}">${d === 0 ? '🎉 ' + T('heute') : d === 1 ? T('morgen') : T('in {0} Tagen').replace('{0}', d)}</span></div>`).join('') : `<div class="small muted">${T('In den nächsten 30 Tagen hat niemand Geburtstag.')}</div>`}</div>`;
    }
    if (k === 'erwaehnungen') {
      const l = [...S.chats.values()].filter((c) => c.group && c.unread && (S.messages.get(c.id) || []).some((m) => m.at > (c.myLastRead || 0) && m.sender !== Api.userId && new RegExp('@' + (S.me || {}).username + '\\b', 'i').test((m.content || {}).t || ''))).slice(0, 4);
      return `<div class="wg"><div class="wg-h"><b>@ ${T('Erwähnungen')}</b></div>${l.length ? l.map((c) => `<div class="row" data-chat="${esc(c.id)}" style="padding:4px 0">${cav(c)}<div class="main"><div class="title">${esc(c.title)}</div></div></div>`).join('') : `<div class="small muted">${T('Niemand hat dich erwähnt.')}</div>`}</div>`;
    }
    if (k === 'angeheftet') {
      const l = [...S.chats.values()].filter((c) => c.pinned && !c.archived).slice(0, 8);
      return `<div class="wg"><div class="wg-h">📌 <b>${T('Angeheftet')}</b></div>${l.length ? `<div class="wg-avs">${l.map((c) => `<div class="wg-av" data-chat="${esc(c.id)}">${cav(c)}<span>${esc(c.title)}</span></div>`).join('')}</div>` : `<div class="small muted">${T('Rechtsklick auf einen Chat → „Anheften“.')}</div>`}</div>`;
    }
    return null;
  }

  // ------------------------------------------------------------------------------------------ Server-Kanäle: Kategorien einklappen
  const catKey = (sid, k) => 'zw-kat-' + sid + '-' + k;
  const catClosed = (sid, k) => LS.get(catKey(sid, k), '0') === '1';
  function catHtml(sid, k, list, h) {
    H = h; const zu = catClosed(sid, k);
    const neu = zu && list.some((c) => h.S.channelUnread && h.S.channelUnread(c.id));
    return `<div class="cat zcat" data-zcat="${esc(sid)}" data-k="${esc(k)}">${zu ? '▸' : '▾'} ${esc(k)}${zu ? ` <span class="small muted">${list.length}</span>` : ''}${neu ? '<span class="dot"></span>' : ''}</div>`;
  }

  // ------------------------------------------------------------------------------------------ Klicks (an einer Stelle)
  document.addEventListener('click', (e) => {
    if (!H) return;
    const cat = e.target.closest('[data-zcat]');
    if (cat) { e.stopPropagation(); const k = catKey(cat.dataset.zcat, cat.dataset.k); LS.set(k, LS.get(k, '0') === '1' ? '0' : '1'); H.renderList(); return; }
    const b = e.target.closest('[data-zw]'); if (!b || b.tagName === 'INPUT') return;
    const { S, Api, toast, tryDo } = H; const w = b.dataset.zw;
    if (w === 'theme') { e.stopPropagation(); H.closeDlg && H.closeDlg(); themeDlg(b.dataset.chatId); }
    else if (w === 'reqok') tryDo(async () => { await Api.rpc('accept_message_request', { c: b.dataset.chatId }); const c = S.chats.get(b.dataset.chatId); if (c) c.requestFrom = null; H.renderAll(); });
    else if (w === 'reqblock') tryDo(async () => { await S.block(b.dataset.user); await Api.rpc('delete_chat_for_me', { c: b.dataset.chatId }); S.chats.delete(b.dataset.chatId); S.openChat = null; H.renderAll(); });
    else if (w === 'reqdel') tryDo(async () => { await Api.rpc('delete_chat_for_me', { c: b.dataset.chatId }); S.chats.delete(b.dataset.chatId); S.openChat = null; H.renderAll(); });
    else if (w === 'dm') tryDo(async () => { await Api.rest('PATCH', `profiles?id=eq.${Api.userId}`, { dm_from: b.dataset.v }); st.dmFrom = b.dataset.v; H.renderList(); });
    else if (w === 'presence') presenceDlg();
    else if (w === 'emo') { const m = document.getElementById('zwMood'); const v = m && m.dataset.emo === b.dataset.v ? '' : b.dataset.v; if (m) m.dataset.emo = v; document.querySelectorAll('[data-zw="emo"]').forEach((x) => x.classList.toggle('on', x.dataset.v === v)); }
    else if (w === 'savemore') tryDo(async () => {
      const g = (id) => (document.getElementById(id) || {}).value || '';
      const links = [...document.querySelectorAll('.zwLu')].map((u, i) => ({ t: (document.querySelectorAll('.zwLt')[i] || {}).value || '', u: u.value.trim() })).filter((l) => l.u);
      if (links.some((l) => !/^https:\/\//.test(l.u))) throw new Error(T('Links müssen mit https:// beginnen.'));
      const emo = (document.getElementById('zwMood') || {}).dataset.emo || '';
      await Api.rest('PATCH', `profiles?id=eq.${Api.userId}`, { pronouns: g('zwPron').trim(), mood: g('zwMood').trim(), mood_emoji: emo, links });
      st.extras.set(Api.userId, { pron: g('zwPron').trim(), mood: g('zwMood').trim(), emo, links });
      const d = +g('zwBd'), m = +g('zwBm'), y = +g('zwBy') || 0;
      if (d && m) {
        if (d < 1 || d > 31 || m < 1 || m > 12) throw new Error(T('Bitte ein gültiges Datum eingeben.'));
        await Api.rest('POST', 'birthdays?on_conflict=user_id', { user_id: Api.userId, day: `${y || 2000}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, show_year: !!(document.getElementById('zwBshow') || {}).checked, updated_at: new Date().toISOString() }, 'resolution=merge-duplicates');
        st.bdays.set(Api.userId, { d, m, y: y || null });
      } else if (st.bdays.has(Api.userId)) { await Api.rest('DELETE', `birthdays?user_id=eq.${Api.userId}`); st.bdays.delete(Api.userId); }
      toast('✓ ' + T('Gespeichert'));
    });
  }, true);
  document.addEventListener('change', (e) => {
    const b = e.target.closest('input[data-zw]'); if (!b || !H) return;
    if (b.dataset.zw === 'statusoff') H.tryDo(async () => { await H.Api.rest('PATCH', `profiles?id=eq.${H.Api.userId}`, { status_off: b.checked }); setStatusOffLocal(b.checked); H.renderAll(); });
    if (b.dataset.zw === 'ghost') { LS.set('zw-unsichtbar', b.checked ? '1' : '0'); }
  });
  // Geräte-Liste auf der Konto-Seite füllen, sobald sie zu sehen ist
  new MutationObserver(() => { if (document.getElementById('zwDev')) fillDevices(); }).observe(document.documentElement, { childList: true, subtree: true });

  root.ZMWish = { WIDGETS, widget, statusOff: () => st.statusOff, ghost, canMsg, profileExtras, settings, applyTheme, requestHtml, catHtml, catClosed, themeDlg, THEMES };
})(window);
