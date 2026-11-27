/* Zunora Messenger am PC — Offizieller Start 1.2.0 (26.11.2026), Teil 1:
   Hinweise vom Zunora-Team + Mindestversion, „Neu in dieser Version", Absturzberichte (nur mit Erlaubnis), Warnung bei neuem Gerät,
   verständliche Fehlermeldungen, Lesebestätigung je Chat, verschwindende Nachrichten als Standard, Barrierefreiheit,
   Seitenübergänge, Themen (Plus), Suche in den Einstellungen, Sicherungsdatei, „Meine Daten herunterladen", AGB/Melden.
   Die Funktionen bekommen die Helfer aus ui.js (H = { esc, I, S, Api, toast, tryDo, dlg, closeDlg, renderAll, … }). */
(function (root) {
  'use strict';
  const tr = (s) => (root.ZLang && root.ZLang.t ? root.ZLang.t(s) : s);
  const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }, set(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { } } };
  const web = !!(root.Host && root.Host.web);
  const Z = {};
  Z.LS = LS;

  // ===================================================================================== Versionen
  Z.cmpVer = function (a, b) {
    const p = (v) => { const m = /^(\d+)\.(\d+)\.(\d+)(?:-[A-Za-z]+\.?(\d+))?/.exec(String(v || '').trim()); return m ? [+m[1], +m[2], +m[3], m[4] !== undefined ? +m[4] : 1e9] : [0, 0, 0, 0]; };
    const x = p(a), y = p(b); for (let i = 0; i < 4; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1; return 0;
  };
  Z.version = (S) => (S && S.appVersion) || (root.ZM && root.ZM.version) || '1.2.0';

  // ===================================================================================== Verständliche Fehler
  Z.err = function (e) {
    const m = String((e && (e.message || e)) || '');
    const code = e && e.code;
    if (code === 0 || /failed to fetch|networkerror|network request failed|load failed/i.test(m)) return tr('Keine Verbindung zum Zunora-Server. Prüfe dein Internet — Nachrichten gehen automatisch raus, sobald du wieder online bist.');
    if (code === 413 || /payload too large/i.test(m)) return tr('Das ist zu groß. Versuch es mit einer kleineren Datei.');
    if (code >= 500) return tr('Beim Zunora-Server klemmt gerade etwas. Versuch es in ein paar Minuten noch einmal.');
    if (/jwt expired|401/i.test(m)) return tr('Anmeldung abgelaufen — bitte neu anmelden.');
    if (/row-level security|permission denied|403/i.test(m)) return tr('Das darfst du hier nicht.');
    if (/notallowederror|permission dismissed|permission denied by system/i.test(m)) return tr('Dafür fehlt eine Erlaubnis (Kamera, Mikrofon oder Standort). Erlaube sie in den Windows-Einstellungen unter Datenschutz.');
    if (/notfounderror|requested device not found/i.test(m)) return tr('Kein passendes Gerät gefunden (Kamera oder Mikrofon). Ist es angeschlossen?');
    if (/quota|storage full/i.test(m)) return tr('Der Speicher ist voll. Lösche ein paar Dateien und versuch es noch einmal.');
    if (/timeout|timed out/i.test(m)) return tr('Das dauert gerade zu lange. Versuch es gleich noch einmal.');
    if (!m || m.length > 300 || /exception|typeerror|referenceerror|undefined|null is not|cannot read|\{"|sqlstate|violates|constraint|pgrst/i.test(m)) return tr('Das hat nicht geklappt. Bitte versuch es noch einmal.');
    return m;
  };

  // ===================================================================================== Hinweise + Mindestversion
  Z.notices = []; Z.updateNeeded = null; Z.bypass = false;
  const gone = () => { try { return new Set(JSON.parse(LS.get('zm-hinweise-weg', '[]'))); } catch (e) { return new Set(); } };
  Z.loadNotices = async function (H) {
    try {
      const pf = web ? 'web' : 'pc';
      const rows = await H.Api.list(`app_notices?select=id,level,title,body,link,min_version&app=eq.messenger&platform=in.(all,${pf})&order=created_at.desc&limit=10`);
      const v = Z.version(H.S);
      const mins = rows.map((r) => r.min_version).filter((x) => x && Z.cmpVer(v, x) < 0);
      Z.updateNeeded = mins.sort(Z.cmpVer).pop() || null;
      const g = gone();
      Z.notices = rows.filter((r) => !r.min_version && !g.has(r.id) && (r.title || r.body));
      H.renderList();
      if (Z.updateNeeded && !Z.bypass) Z.updateDlg(H);
    } catch (e) { }
  };
  Z.noticesHtml = function (H) {
    const { esc, I } = H;
    return Z.notices.map((n) => `<div class="zstart-note ${n.level === 'warn' ? 'warn' : ''}" data-note="${esc(n.id)}"><div class="h">${I(n.level === 'warn' ? 'shield' : 'sparkle', 16)} <b>${esc(n.title || tr('Hinweis vom Zunora-Team'))}</b><button class="ico" data-note-x="${esc(n.id)}" title="${esc(tr('Ausblenden'))}">${I('close', 14)}</button></div>${n.body ? `<div class="small">${esc(n.body)}</div>` : ''}${n.link ? `<a class="small" href="#" data-zlink="${esc(n.link)}">${esc(tr('Mehr erfahren'))}</a>` : ''}</div>`).join('');
  };
  Z.wireNotices = function (el, H) {
    el.querySelectorAll('[data-note-x]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); const g = gone(); g.add(b.dataset.noteX); LS.set('zm-hinweise-weg', JSON.stringify([...g])); Z.notices = Z.notices.filter((n) => n.id !== b.dataset.noteX); H.renderList(); });
  };
  Z.updateDlg = function (H) {
    const { dlg, closeDlg, esc } = H;
    dlg(`<h3>${tr('Bitte aktualisieren')}</h3><p>${tr('Diese Version des Messengers ist zu alt und funktioniert nicht mehr richtig. Das Update dauert nur einen Moment — deine Chats bleiben erhalten.')}</p>
      <p class="small muted">${esc(tr('Installiert: %1 · nötig: mindestens %2').replace('%1', Z.version(H.S)).replace('%2', Z.updateNeeded))}</p>
      <div class="rowb"><button class="btn ghost" data-later>${tr('Trotzdem weiter')}</button>${web ? `<button class="btn" data-reload>${tr('Neu laden')}</button>` : `<button class="btn" data-upd>${tr('Jetzt aktualisieren')}</button>`}</div>`, (box) => {
      box.querySelector('[data-later]').onclick = () => { Z.bypass = true; closeDlg(); };
      const r = box.querySelector('[data-reload]'); if (r) r.onclick = () => location.reload();
      const u = box.querySelector('[data-upd]'); if (u) u.onclick = () => { closeDlg(); if (H.startUpdate) H.startUpdate(); };
    });
  };

  // ===================================================================================== Neu in dieser Version
  const NEW = [['image', 'Neu in 1.2.2: Chat-Designs sind jetzt nur für dich — jeder wählt sein eigenes, auf all deinen Geräten gleich. Hintergrund und eigenes Foto stecken mit im Chat-Design, und alles Farbliche findest du auf einer Seite „Design“.'], ['image', 'Neu in 1.2.1: Chat-Designs mit 8 kostenlosen Vorlagen, Mustern und bewegten Hintergründen — mit Plus 20 weitere und ein eigenes Design. In den Einstellungen ein Design für alle Chats.'], ['sparkle', 'Offizieller Start: Der Zunora Messenger ist keine Beta mehr.'], ['pin', 'Live-Standort ansehen und teilen.'], ['forward', 'Weiterleiten mit Kennzeichnung („Weitergeleitet“, „Oft weitergeleitet“).'],
    ['check', 'Lesebestätigung für jeden Chat einzeln.'], ['phone', 'Anrufe: Rauschen unterdrücken, Hintergrund weichzeichnen, Anruf-Links (Plus).'], ['shield', 'Warnung bei neuem Gerät, Sicherheitsnummer als QR-Code.'],
    ['clock', 'Verschwindende Nachrichten als Standard für neue Chats.'], ['server', 'Server-Vorlagen, Auto-Moderation, Umfragen und Termine.'], ['image', 'Medien, Links und Dateien je Chat.'], ['search', 'Suche in den Einstellungen.']];
  Z.whatsNew = function (H, force) {
    const v = Z.version(H.S), last = LS.get('zm-neu-gesehen', '');
    if (!force) { if (!last) { LS.set('zm-neu-gesehen', v); if (LS.get('zm-anleitung', '') === '') return; } else if (last === v || Z.cmpVer(v, last) <= 0) return; }
    LS.set('zm-neu-gesehen', v);
    H.dlg(`<h3>${tr('Neu in dieser Version')}</h3><p class="small muted" style="margin-top:0">Zunora Messenger ${H.esc(v)}</p>${NEW.map(([i, t]) => `<div class="row" style="padding:6px 0">${H.I(i, 18)}<div class="main">${H.esc(tr(t))}</div></div>`).join('')}
      <div class="rowb"><button class="btn" data-close>${tr("Los geht's")}</button></div>`, (b) => { b.querySelector('[data-close]').onclick = H.closeDlg; });
  };

  // ===================================================================================== Absturzberichte (nur mit Erlaubnis)
  const clean = (s) => String(s || '').replace(/https?:\/\/\S+/g, '<link>').replace(/[\w.+-]+@[\w.-]+/g, '<adresse>').replace(/\d{4,}/g, '<zahl>').slice(0, 7900);
  root.addEventListener('error', (e) => { try { if (!e || !e.error) return; LS.set('zm-absturz', clean((e.error.name || 'Error') + ': ' + String(e.error.message || '').slice(0, 120) + '\n' + (e.error.stack || ''))); } catch (x) { } });
  root.addEventListener('unhandledrejection', (e) => { try { const r = e && e.reason; if (!r || !r.stack || r.code !== undefined) return; LS.set('zm-absturz', clean((r.name || 'Error') + ': ' + String(r.message || '').slice(0, 120) + '\n' + r.stack)); } catch (x) { } });
  Z.crashConsent = () => LS.get('zm-absturz-ok', '');
  Z.crashSend = async function (H) {
    const t = LS.get('zm-absturz', ''); LS.set('zm-absturz', null); if (!t) return;
    try { await H.Api.rest('POST', 'crash_reports', { app: 'messenger', version: Z.version(H.S), platform: web ? 'web' : 'pc', os: String(navigator.userAgent || '').slice(0, 80), device: web ? 'Browser' : 'Windows-PC', error: t, user_id: H.Api.userId || null }); } catch (e) { }
  };
  Z.crashCheck = function (H) {
    if (!LS.get('zm-absturz', '')) return;
    const c = Z.crashConsent();
    if (c === 'ja') return Z.crashSend(H);
    if (c === 'nein') { LS.set('zm-absturz', null); return; }
    H.dlg(`<h3>${tr('Beim letzten Mal ist ein Fehler passiert')}</h3><p class="small">${tr('Dürfen wir einen kurzen Fehlerbericht bekommen? Er enthält nur die Stelle im Programm, die App-Version und das System — keine Nachrichten, Namen oder Kontakte.')}</p>
      <div class="rowb"><button class="btn ghost" data-no>${tr('Nein, danke')}</button><button class="btn ghost" data-once>${tr('Nur diesmal')}</button><button class="btn" data-yes>${tr('Immer senden')}</button></div>`, (b) => {
      b.querySelector('[data-no]').onclick = () => { LS.set('zm-absturz-ok', 'nein'); LS.set('zm-absturz', null); H.closeDlg(); };
      b.querySelector('[data-once]').onclick = () => { Z.crashSend(H); H.closeDlg(); };
      b.querySelector('[data-yes]').onclick = () => { LS.set('zm-absturz-ok', 'ja'); Z.crashSend(H); H.closeDlg(); };
    });
  };

  // ===================================================================================== Neues Gerät
  Z.checkDevices = async function (H) {
    try {
      const { S, Api } = H; if (!Api.userId || !S.deviceId) return;
      const list = (await S.myDevices()).filter((d) => !d.revoked);
      const key = 'zm-geraete-' + Api.userId;
      let known; try { known = JSON.parse(LS.get(key, 'null')); } catch (e) { known = null; }
      if (!Array.isArray(known)) { LS.set(key, JSON.stringify([...list.map((d) => d.id), S.deviceId])); return; }
      const fresh = list.filter((d) => d.id !== S.deviceId && !known.includes(d.id));
      if (!fresh.length) return;
      const d = fresh[0];
      const ok = () => { known.push(d.id); LS.set(key, JSON.stringify(known)); };
      try { root.ZMHost.notify(tr('Neues Gerät angemeldet'), tr('Dein Konto wurde auf „%s“ angemeldet.').replace('%s', d.name)); } catch (e) { }
      H.dlg(`<h3>${H.I('shield', 20)} ${tr('Neues Gerät angemeldet')}</h3><p><b>${H.esc(d.name)}</b> · ${d.platform === 'pc' ? 'PC' : tr('Handy')} · ${H.esc(new Date(d.created_at).toLocaleString('de-DE'))}</p>
        <p class="small muted">${tr('Dein Konto wurde auf diesem Gerät angemeldet. Warst du das?')}</p>
        <div class="rowb"><button class="btn danger" data-no>${tr('Nein — sofort abmelden')}</button><button class="btn" data-yes>${tr('Ja, das war ich')}</button></div>`, (b) => {
        b.querySelector('[data-yes]').onclick = () => { ok(); H.closeDlg(); };
        b.querySelector('[data-no]').onclick = () => H.tryDo(async () => { await S.revoke(d.id); ok(); H.closeDlg(); H.toast(tr('✓ Das Gerät ist abgemeldet. Ändere jetzt dein Passwort (Einstellungen → Konto).')); });
      });
    } catch (e) { }
  };

  // ===================================================================================== Lesebestätigung je Chat
  Z.receipts = new Map();
  Z.loadReceipts = async function (H) {
    try { const l = await H.Api.list(`chat_members?user_id=eq.${H.Api.userId}&read_receipts=not.is.null&select=chat_id,read_receipts`); Z.receipts.clear(); l.forEach((r) => Z.receipts.set(r.chat_id, !!r.read_receipts)); } catch (e) { }
  };
  Z.receiptsFor = (S, chat) => (Z.receipts.has(chat) ? Z.receipts.get(chat) : S.readReceipts !== false);
  Z.setReceipts = async function (H, chat, v) {
    await H.Api.rest('PATCH', `chat_members?chat_id=eq.${chat}&user_id=eq.${H.Api.userId}`, { read_receipts: v === null ? null : !!v });
    if (v === null) Z.receipts.delete(chat); else Z.receipts.set(chat, !!v);
    if (v === true) try { await H.Api.rest('PATCH', `chat_members?chat_id=eq.${chat}&user_id=eq.${H.Api.userId}`, { last_read_at: new Date().toISOString() }); } catch (e) { }
  };
  Z.receiptsDlg = function (H, c) {
    const cur = Z.receipts.has(c.id) ? Z.receipts.get(c.id) : null;
    const opt = (v, t) => `<button class="chip ${cur === v ? 'on' : ''}" data-rr="${v === null ? 'null' : v}">${t}</button>`;
    H.dlg(`<h3>${tr('Lesebestätigung in diesem Chat')}</h3><p class="small muted">${tr(H.S.readReceipts !== false ? 'Standard: an (Einstellungen → Datenschutz)' : 'Standard: aus (Einstellungen → Datenschutz)')}</p>
      <div class="chips">${opt(null, tr('Wie Standard'))}${opt(true, tr('Immer an'))}${opt(false, tr('Immer aus'))}</div>
      <p class="small muted">${tr('Aus = die anderen sehen nicht, wann du gelesen hast — und du siehst es bei ihnen in diesem Chat auch nicht.')}</p><div class="rowb"><button class="btn ghost" data-close>${tr('Fertig')}</button></div>`, (b) => {
      b.querySelector('[data-close]').onclick = H.closeDlg;
      b.querySelectorAll('[data-rr]').forEach((x) => x.onclick = () => H.tryDo(async () => { const v = x.dataset.rr === 'null' ? null : x.dataset.rr === 'true'; await Z.setReceipts(H, c.id, v); H.closeDlg(); H.renderAll(); }));
    });
  };
  Z.receiptsListHtml = function (H) {
    const rows = [...Z.receipts.entries()].map(([id, v]) => [H.S.chats.get(id), v]).filter(([c]) => c);
    return `<div class="cat" style="padding-left:0">${tr('Lesebestätigung je Chat')}</div><p class="small muted" style="margin:0 0 6px">${tr('Für einzelne Chats abweichend: im Chat oben ⋯ → Lesebestätigung.')}</p>` +
      (rows.length ? rows.map(([c, v]) => `<div class="row" style="padding:4px 0">${H.cav(c, 'xs')}<div class="main">${H.esc(c.title)}</div><span class="small muted">${v ? tr('immer an') : tr('immer aus')}</span><button class="ico" data-rrx="${H.esc(c.id)}" title="${H.esc(tr('Zurücksetzen'))}">${H.I('close', 14)}</button></div>`).join('') : `<p class="small muted">${tr('Noch keine Ausnahmen.')}</p>`);
  };

  // ===================================================================================== Verschwindende Nachrichten als Standard
  Z.disappearDefault = () => +LS.get('zm-verschwinden', '0') || 0;
  Z.applyDisappear = async function (S, chat, wasThere) {
    const d = Z.disappearDefault(); if (wasThere || !d || !chat) return;
    try { const c = S.chats.get(chat); if (!c || !(c.disappear > 0)) await S.setDisappear(chat, d); } catch (e) { }
  };

  // ===================================================================================== Barrierefreiheit, Übergänge, Themen
  Z.applyLook = function () {
    const h = document.documentElement;
    h.classList.toggle('zm-kontrast', LS.get('zm-kontrast', '0') === '1');
    h.style.setProperty('--zm-scale', LS.get('zm-schrift', '1'));
    h.classList.toggle('zm-gross', LS.get('zm-schrift', '1') !== '1');
    ['gleiten', 'blende', 'zoom', 'aus', 'feder', 'karussell', 'steigen', 'kreis'].forEach((k) => h.classList.remove('zt-' + k));
    h.classList.add('zt-' + Z.trans());
  };
  const TRANS = [['gleiten', 'Gleiten', 0], ['blende', 'Überblenden', 0], ['zoom', 'Zoom', 0], ['aus', 'Aus', 0], ['feder', 'Federn', 1], ['karussell', 'Karussell', 1], ['steigen', 'Aufsteigen', 1], ['kreis', 'Kreis', 1]];
  Z.trans = () => { const k = LS.get('zm-uebergang', 'gleiten'); const t = TRANS.find((x) => x[0] === k); return t && (!t[2] || (root.ZPlus && root.ZPlus.active())) ? k : 'gleiten'; };
  const THEMES = [['zunora', 'Zunora', null], ['ozean', 'Ozean', '#1E88E5'], ['sonne', 'Sonnenuntergang', '#FF7043'], ['wald', 'Wald', '#2E9D5B'], ['neon', 'Neon', '#E040FB'], ['lavendel', 'Lavendel', '#9575CD'], ['kirsche', 'Kirsche', '#E53970'], ['graphit', 'Graphit', '#78909C']];
  Z.lookHtml = function (H) {
    const plus = !!(root.ZPlus && root.ZPlus.active());
    const sc = LS.get('zm-schrift', '1');
    return `<div class="cat" style="padding-left:0;margin-top:14px">${tr('Seitenübergänge')}</div><div class="chips">${TRANS.map(([k, t, p]) => `<button class="chip ${Z.trans() === k ? 'on' : ''} ${p && !plus ? 'locked' : ''}" data-ztrans="${k}">${tr(t)}${p ? ' ✦' : ''}</button>`).join('')}</div>
      <div class="cat" style="padding-left:0">${tr('Barrierefreiheit')}</div>
      <label class="small chk"><input type="checkbox" id="zKontrast" ${LS.get('zm-kontrast', '0') === '1' ? 'checked' : ''}> <span>${tr('Starker Kontrast (graue Schrift wird kräftiger)')}</span></label>
      <div class="chips" style="margin-top:6px">${[['1', 'Normal'], ['1.12', 'Groß'], ['1.25', 'Sehr groß'], ['1.4', 'Riesig']].map(([v, t]) => `<button class="chip ${sc === v ? 'on' : ''}" data-zscale="${v}">${tr(t)}</button>`).join('')}</div>
      ${plus ? `<div class="cat" style="padding-left:0">${tr('Themen')} ✦</div><div class="chips">${THEMES.map(([k, t, c]) => `<button class="chip ${LS.get('zm-thema', 'zunora') === k ? 'on' : ''}" data-ztheme="${k}"><span class="thdot" style="background:${c || 'linear-gradient(135deg,#7c5cff,#22c3ee)'}"></span> ${tr(t)}</button>`).join('')}</div>` : ''}`;
  };
  Z.wireLook = function (el, H) {
    el.querySelectorAll('[data-ztrans]').forEach((b) => b.onclick = () => { const t = TRANS.find((x) => x[0] === b.dataset.ztrans); if (t[2] && !(root.ZPlus && root.ZPlus.active())) return H.toast(tr('Diese Übergänge gibt es mit Zunora Plus.')); LS.set('zm-uebergang', t[0]); Z.applyLook(); H.renderList(); });
    el.querySelectorAll('[data-zscale]').forEach((b) => b.onclick = () => { LS.set('zm-schrift', b.dataset.zscale); Z.applyLook(); H.renderAll(); });
    const k = el.querySelector('#zKontrast'); if (k) k.onchange = () => { LS.set('zm-kontrast', k.checked ? '1' : '0'); Z.applyLook(); };
    el.querySelectorAll('[data-ztheme]').forEach((b) => b.onclick = () => {
      const t = THEMES.find((x) => x[0] === b.dataset.ztheme); LS.set('zm-thema', t[0]);
      try { if (root.ZPlus && root.ZPlus.pickAccent) root.ZPlus.pickAccent(t[2]); else if (root.ZPlus && root.ZPlus.set) root.ZPlus.set('accent', t[2]); } catch (e) { }
      document.documentElement.style.setProperty('--zm-theme', t[2] || ''); document.documentElement.classList.toggle('zm-themed', !!t[2]);
      if (t[2]) document.documentElement.style.setProperty('--accent', t[2]); else document.documentElement.style.removeProperty('--accent');
      H.renderAll();
    });
  };
  /** beschriftet Symbol-Knöpfe für Bildschirmleser (title → aria-label) */
  Z.a11y = function () {
    const fix = (r) => r.querySelectorAll('button:not([aria-label])[title], [data-act]:not([aria-label])[title]').forEach((b) => b.setAttribute('aria-label', b.getAttribute('title')));
    try { fix(document); new MutationObserver((l) => l.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) fix(n); }))).observe(document.body, { childList: true, subtree: true }); } catch (e) { }
  };
  /** Seitenübergang beim Wechsel der rechten Seite (Chat öffnen, Reiter) */
  Z.animate = function (el) { try { if (!el || Z.trans() === 'aus' || Z.trans() === 'gleiten') return; el.classList.remove('zt-run'); void el.offsetWidth; el.classList.add('zt-run'); } catch (e) { } };

  // ===================================================================================== Suche in den Einstellungen
  const INDEX = [['darstellung', 'screen', 'Hell, Dunkel, Extra dunkel', 'theme dunkelmodus farben'], ['darstellung', 'screen', 'Energiesparmodus', 'akku strom'], ['darstellung', 'sparkle', 'Seitenübergänge', 'animation zoom federn'],
    ['darstellung', 'user', 'Starker Kontrast und Schriftgröße', 'barrierefreiheit lesen groß'], ['darstellung', 'star', 'Themen und Farben (Plus)', 'farbe akzent thema'], ['konto', 'user', 'Profil, Name, Info', 'profilbild'],
    ['konto', 'lock', 'Passwort ändern', 'passwort'], ['konto', 'user', 'Zweites Konto', 'zweitkonto wechseln'], ['konto', 'file', 'Meine Daten herunterladen', 'datenauskunft dsgvo export'],
    ['anrufe', 'phone', 'Klingelton und Ruhezeiten', 'klingeln nicht stören'], ['anrufe', 'speaker', 'Rauschen unterdrücken, Hintergrund weichzeichnen', 'anruf video mikrofon'], ['anrufe', 'speaker', 'Mikrofon und Lautsprecher', 'audio gerät'],
    ['datenschutz', 'check', 'Lesebestätigung (auch je Chat)', 'gelesen haken'], ['datenschutz', 'clock', 'Zuletzt online, Online-Status', 'online'], ['datenschutz', 'friends', 'Wer mich anfragen darf', 'anfragen spam'],
    ['datenschutz', 'block', 'Blockierte Kontakte', 'blockiert'], ['chats', 'chat', 'Übersetzen, „schreibt …“, Links', 'übersetzung tippen link vorschau'], ['chats', 'clock', 'Verschwindende Nachrichten (Standard)', 'timer'],
    ['chats', 'file', 'Sicherung und Verlauf übertragen', 'backup sicherung umzug'], ['geraete', 'shield', 'Geräte', 'angemeldet abmelden'], ['pc', 'settings', 'Am PC: Infobereich, Autostart, Updates', 'windows update autostart'],
    ['pc', 'shield', 'Absturzberichte', 'fehler bericht'], ['plus', 'sparkle', 'Zunora Plus', 'abo kündigen preis'], ['hilfe', 'file', 'Impressum, Datenschutz, AGB, Melden', 'rechtliches agb widerruf dsa']];
  Z.searchHtml = (H) => `<div class="zset-search"><input id="zSetQ" placeholder="${H.esc(tr('Einstellungen durchsuchen …'))}" value="${H.esc(Z.setQ || '')}"></div><div id="zSetHits"></div>`;
  Z.wireSearch = function (el, H, go) {
    const q = el.querySelector('#zSetQ'), box = el.querySelector('#zSetHits'); if (!q || !box) return;
    const draw = () => {
      const t = q.value.trim().toLowerCase(); Z.setQ = q.value;
      el.querySelectorAll('.setsec, .setprof').forEach((r) => r.classList.toggle('hidden', !!t));
      if (!t) { box.innerHTML = ''; return; }
      const hits = INDEX.filter(([, , ti, w]) => t.split(/\s+/).every((x) => (tr(ti) + ' ' + ti + ' ' + w).toLowerCase().includes(x))).slice(0, 12);
      box.innerHTML = hits.length ? hits.map(([p, i, ti]) => `<div class="row setsec2" data-zgo="${p}">${H.I(i, 18)}<div class="main"><div class="title">${H.esc(tr(ti))}</div></div>${H.I('forward', 14)}</div>`).join('') : `<p class="small muted">${tr('Nichts gefunden. Versuch ein anderes Wort.')}</p>`;
      box.querySelectorAll('[data-zgo]').forEach((r) => r.onclick = () => { Z.setQ = ''; go(r.dataset.zgo); });
    };
    q.oninput = draw; draw();
  };

  // ===================================================================================== Sicherungsdatei + Datenauskunft
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64 = (u) => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = (s) => Uint8Array.from(atob(String(s).trim()), (c) => c.charCodeAt(0));
  const MAGIC = 'ZUNORA-SICHERUNG-1';
  async function pbkdf(pw, salt, iter) { const k = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveKey']); return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, k, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); }
  async function gz(bytes, unzip) { const s = new Blob([bytes]).stream().pipeThrough(unzip ? new DecompressionStream('gzip') : new CompressionStream('gzip')); return new Uint8Array(await new Response(s).arrayBuffer()); }
  /** gleiche Datei wie am Handy (MBackupFile.kt) */
  Z.seal = async function (plain, pw, iter = 150000) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(MAGIC) }, await pbkdf(pw, salt, iter), plain));
    return `${MAGIC}\n${iter}\n${b64(salt)}\n${b64(iv)}\n${b64(ct)}\n`;
  };
  Z.open = async function (text, pw) {
    try { const l = String(text).trim().split(/\r?\n/); if (l.length < 5 || l[0].trim() !== MAGIC) return null;
      return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(l[3]), additionalData: enc.encode(MAGIC) }, await pbkdf(pw, unb64(l[2]), +l[1]), unb64(l[4]))); } catch (e) { return null; }
  };
  /** alles, was dieser PC lesen kann: Nachrichten (entschlüsselt) je Chat, höchstens 3000 je Chat */
  Z.bundle = async function (H) {
    const { S, Api } = H; const chats = {};
    for (const c of S.chats.values()) {
      const out = []; let before = null;
      while (out.length < 3000) {
        const rows = await Api.list(`messages?chat_id=eq.${c.id}&select=id,chat_id,sender_id,sender_device,kind,cipher,created_at,deleted,edited_at,reply_to,view_once,expires_at,pinned${before ? '&created_at=lt.' + encodeURIComponent(before) : ''}&order=created_at.desc&limit=500`);
        if (!rows.length) break;
        for (const r of rows) { try { const m = await S.toMsg(r); if (m && !m.deleted && !m.viewOnce && m.content && !m.problem) out.push({ id: m.id, s: m.sender, k: m.kind, a: m.at, c: m.content, r: m.replyTo || null }); } catch (e) { } }
        before = rows[rows.length - 1].created_at; if (rows.length < 500) break;
      }
      if (out.length) chats[c.id] = out;
    }
    return { v: 1, from: web ? 'web' : 'pc', at: Date.now(), chats, settings: {}, drafts: {} };
  };
  const saveFile = (name, text, mime) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: mime })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); };
  const today = () => new Date().toISOString().slice(0, 10);
  Z.backupHtml = (H) => `<div class="cat" style="padding-left:0">${tr('Sicherungsdatei (Handywechsel)')}</div><p class="small muted" style="margin:0 0 6px">${tr('Chats als Datei, mit Passwort verschlüsselt — für ein neues Gerät, auch wenn das alte weg ist. Die Datei funktioniert am Handy und am PC.')}</p>
    <div style="display:flex;gap:8px"><input id="zBkPw" type="password" placeholder="${H.esc(tr('Passwort (mind. 8 Zeichen)'))}" style="flex:1"><button class="btn" data-act="zBackup">${tr('Sichern')}</button><button class="btn ghost" data-act="zRestore">${tr('Wiederherstellen')}</button></div><div id="zBkMsg" class="small muted"></div>`;
  Z.wireBackup = function (el, H) {
    const pw = el.querySelector('#zBkPw'), msg = el.querySelector('#zBkMsg'); if (!pw) return;
    const say = (t) => { if (msg) msg.textContent = t; };
    const b1 = el.querySelector('[data-act="zBackup"]'), b2 = el.querySelector('[data-act="zRestore"]');
    if (b1) b1.onclick = (e) => { e.stopPropagation(); if (pw.value.length < 8) return say(tr('Das Passwort braucht mindestens 8 Zeichen.')); H.tryDo(async () => {
      say(tr('Sicherung wird erstellt … das kann eine Minute dauern.')); const bd = await Z.bundle(H); const n = Object.values(bd.chats).reduce((a, l) => a + l.length, 0);
      saveFile('Zunora-Sicherung-' + today() + '.zunora', await Z.seal(await gz(enc.encode(JSON.stringify(bd))), pw.value), 'application/octet-stream'); pw.value = '';
      say(tr('✓ Gespeichert: %s Nachrichten. Bewahre die Datei und dein Passwort gut auf.').replace('%s', n)); }); };
    if (b2) b2.onclick = (e) => { e.stopPropagation(); if (!pw.value) return say(tr('Gib das Passwort der Sicherung ein.'));
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.zunora,*/*';
      inp.onchange = () => H.tryDo(async () => { const f = inp.files[0]; if (!f) return; const raw = await Z.open(await f.text(), pw.value); if (!raw) return say(tr('Falsches Passwort — oder das ist keine Zunora-Sicherung.'));
        const o = JSON.parse(dec.decode(await gz(raw, true))); const n = await Z.importBundle(H, o); pw.value = ''; say(tr('✓ Wiederhergestellt: %s Nachrichten.').replace('%s', n)); });
      inp.click(); };
  };
  /** Paket übernehmen: Inhalte für Nachrichten, die dieser PC nicht entschlüsseln kann (wie „Verlauf übertragen") */
  Z.importBundle = async function (H, o) {
    const { S } = H; const entries = {};
    Object.values(o.chats || {}).forEach((l) => (l || []).forEach((m) => { if (m && m.id && m.c) entries[m.id] = m.c; }));
    if (S.importHistory) await S.importHistory(entries); else if (root.ZM.Offline && root.ZM.Offline.History && root.ZM.Offline.History.add) await root.ZM.Offline.History.add(entries);
    await S.refreshAll().catch(() => { }); return Object.keys(entries).length;
  };
  Z.exportHtml = () => `<div class="cat" style="padding-left:0">${tr('Meine Daten herunterladen')}</div><p class="small muted" style="margin:0 0 6px">${tr('Alles, was der Zunora-Server über dich speichert (Konto, Geräte, Freunde, Chats, Server, Abo, Meldungen) — als Datei für dich. Nachrichten-Inhalte kennt der Server nicht; die kann dieser PC dazulegen.')}</p>
    <label class="small chk"><input type="checkbox" id="zExMsgs"> <span>${tr('Nachrichten dieses PCs dazulegen')}</span></label><button class="btn ghost" data-act="zExport" style="margin-top:6px">${tr('Datei erstellen')}</button>`;
  Z.wireExport = function (el, H) {
    const b = el.querySelector('[data-act="zExport"]'); if (!b) return;
    b.onclick = (e) => { e.stopPropagation(); H.tryDo(async () => {
      const server = await H.Api.rpc('export_my_data', {});
      const out = { zunora_messenger: 'Datenauskunft', erstellt: new Date().toLocaleString('de-DE'), nutzername: H.Api.username, server };
      if ((el.querySelector('#zExMsgs') || {}).checked) out.nachrichten_auf_diesem_geraet = (await Z.bundle(H)).chats;
      saveFile('Zunora-Meine-Daten-' + today() + '.json', JSON.stringify(out, null, 2), 'application/json'); H.toast(tr('✓ Gespeichert.')); }); };
  };

  // ===================================================================================== Rechtliches: AGB Plus, Melden (DSA)
  // AGB aus zm/agb.js (erzeugt aus tools/agb/agb-de.txt); {ANBIETER} = Angaben aus zm/anbieter.json (werden nachgeladen)
  const agbEsc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function agbProvider() {
    fetch('zm/anbieter.json', { cache: 'no-store' }).then((r) => r.ok ? r.json() : {}).catch(() => ({})).then((a) => {
      const t = [a.name, String(a.address || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean).join(', '), a.email ? 'E-Mail: ' + a.email : ''].filter(Boolean).join(', ');
      if (t) document.querySelectorAll('.zagb-prov').forEach((s) => { s.textContent = t; });
    });
  }
  Z.agbHtml = () => {
    const A = root.ZAgb; if (!A) return '';
    setTimeout(agbProvider, 0);
    return A.sections.map(([h, t]) => `<p class="small" style="margin:12px 0 2px"><b>${agbEsc(h)}</b></p>` + t.split(/\n\n+/).map((p) =>
      `<p class="small" style="margin:4px 0">${agbEsc(p).replace(/\{ANBIETER\}/g, '<span class="zagb-prov">Zunora (siehe Impressum)</span>').replace(/\n/g, '<br>')}</p>`).join('')).join('')
      + `<p class="small muted">Stand: ${agbEsc(A.stand)}</p>`;
  };
  Z.legalHtml = () => `<div class="cat" style="padding-left:0">${tr('AGB für Zunora Plus')}</div>
    <p class="small">${tr('Zunora Plus ist ein Monats-Abo für 4,99 € im Monat (die ersten 14 Tage kostenlos), bezahlt über Stripe, jederzeit zum Monatsende kündbar (Einstellungen → Zunora Plus). Der Messenger selbst bleibt kostenlos.')}</p>
    <details class="kcard"><summary><b>${tr('Allgemeine Geschäftsbedingungen, Widerrufsbelehrung und Muster-Widerrufsformular')}</b></summary>${Z.agbHtml()}</details>
    <div class="cat" style="padding-left:0">${tr('Melden und Kontaktstelle (DSA)')}</div>
    <p class="small">${tr('Melden: Rechtsklick auf eine Nachricht, ein Profil oder einen Server → „Melden“. Zentrale Kontaktstelle für Behörden, die EU-Kommission und Nutzer nach dem Gesetz über digitale Dienste (Art. 11 und 12 DSA) ist die E-Mail-Adresse im Impressum (Deutsch und Englisch). Gegen eine Sperre kannst du innerhalb von 6 Monaten widersprechen — eine andere Person aus dem Team prüft erneut. Bei akuter Gefahr: Polizei 110, Notruf 112.')}</p>`;

  root.ZMStart = Z;
})(window);

/* Einhängen in den Speicher (store.js) — einmal beim Start aus ui.js */
(function (root) {
  'use strict';
  const Z = root.ZMStart;
  Z.install = function (S, Api) {
    if (S._zstart) return; S._zstart = true;
    const iso = () => new Date().toISOString();
    // Lesebestätigung je Chat (in beide Richtungen, wie am Handy)
    S.markRead = async function (chat) {
      const c = this.chats.get(chat);
      if (c && !c.unread && (c.seenAt || 0) >= c.lastAt) return;
      const body = { last_delivered_at: iso() }; if (Z.receiptsFor(this, chat)) body.last_read_at = iso();
      try { await Api.rest('PATCH', `chat_members?chat_id=eq.${chat}&user_id=eq.${Api.userId}`, body); } catch (e) { }
      if (c) { c.seenAt = Math.max(Date.now(), c.lastAt); if (c.unread) { c.unread = 0; this.changed('chats'); } }
    };
    const ticks0 = S.ticks; S.ticks = function (m) { const t = ticks0.call(this, m); return t === 3 && !Z.receiptsFor(this, m.chatId) ? 2 : t; };
    // Verschwindende Nachrichten als Standard für neue Chats
    const od = S.openDirect; S.openDirect = async function (p) { const had = [...this.chats.values()].some((c) => !c.group && c.members.some((m) => m.userId === p.id)); const id = await od.call(this, p); await Z.applyDisappear(this, id, had); return id; };
    const ng = S.newGroup; S.newGroup = async function (t, m) { const id = await ng.call(this, t, m); await Z.applyDisappear(this, id, false); return id; };
    // Auto-Moderation vor dem Senden in Server-Kanäle
    const sc = S.sendChannel; S.sendChannel = async function (ch, content, kind, thread, title) {
      const T2 = root.ZMStart2; const c = this.channel(ch);
      if (T2 && c && c.server_id) { if (!T2.automod.has(c.server_id)) await T2.loadAutomod({ Api }, c.server_id); const bad = T2.check({ S: this, Api }, c.server_id, String((content && content.t) || '')); if (bad) throw new Error(bad); }
      return sc.call(this, ch, content, kind, thread, title);
    };
    // Sprachnachricht „Einmal anhören"
    S.sendVoice = async function (chat, blob, ms, wave, once) {
      const media = Object.assign(await this.putFile('chat-media', chat, new Uint8Array(await blob.arrayBuffer()), blob.type || 'audio/webm'), { dur: ms }, wave && wave.length ? { wave } : {}); delete media.bucket;
      return this.send(chat, 'voice', { media, dur: ms }, null, !!once);
    };
    // Vorschau-Text für neue Arten
    const pv = S.preview.bind(S); S.preview = function (m) { if (m && m.kind === 'location') return (m.content && m.content.live ? '📍 Live-Standort' : '📍 Standort'); if (m && m.kind === 'voice' && m.viewOnce) return '① Sprachnachricht · Einmal anhören'; return pv(m); };
  };
})(window);

/* Einstellungen: zusätzliche Bereiche und ihre Knöpfe */
(function (root) {
  'use strict';
  const Z = root.ZMStart; const LS = Z.LS;
  const tr = (s) => (root.ZLang && root.ZLang.t ? root.ZLang.t(s) : s);
  Z.disappearHtml = () => `<div class="cat" style="padding-left:0">${tr('Verschwindende Nachrichten (Standard)')}</div><p class="small muted" style="margin:0 0 6px">${tr('Gilt für neue Chats und Gruppen. Bestehende Chats änderst du im Chat oben (⋯).')}</p>
    <div class="chips">${[[0, 'Aus'], [86400, '24 Std.'], [604800, '7 Tage'], [7776000, '90 Tage']].map(([v, t]) => `<button class="chip ${Z.disappearDefault() === v ? 'on' : ''}" data-zdis="${v}">${tr(t)}</button>`).join('')}</div>`;
  Z.crashHtml = () => `<div class="cat" style="padding-left:0">${tr('Absturzberichte')}</div><label class="small chk"><input type="checkbox" id="zCrash" ${Z.crashConsent() === 'ja' ? 'checked' : ''}> <span>${tr('Absturzberichte senden — nur die Fehlerstelle, App-Version und System, keine Inhalte')}</span></label>
    <button class="btn ghost" data-act="zNew" style="margin-top:6px">${tr('Neu in dieser Version')}</button>`;
  Z.wireSettings = function (el, page, H, go) {
    Z.wireSearch(el, H, go);
    if (page === 'darstellung') Z.wireLook(el, H);
    if (page === 'chats') { Z.wireBackup(el, H); el.querySelectorAll('[data-zdis]').forEach((b) => b.onclick = () => { LS.set('zm-verschwinden', b.dataset.zdis); el.querySelectorAll('[data-zdis]').forEach((x) => x.classList.toggle('on', x === b)); }); }
    if (page === 'konto') Z.wireExport(el, H);
    if (page === 'datenschutz') el.querySelectorAll('[data-rrx]').forEach((b) => b.onclick = () => H.tryDo(async () => { await Z.setReceipts(H, b.dataset.rrx, null); H.renderList(); }));
    const c = el.querySelector('#zCrash'); if (c) c.onchange = () => LS.set('zm-absturz-ok', c.checked ? 'ja' : 'nein');
    const n = el.querySelector('[data-act="zNew"]'); if (n) n.onclick = (e) => { e.stopPropagation(); Z.whatsNew(H, true); };
    if (page === 'anrufe' && root.ZMStart2) root.ZMStart2.wireCallFx(el);
  };
})(window);
