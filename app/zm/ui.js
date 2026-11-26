/* Zunora Messenger am PC — Oberfläche. Links: Chats, Server, Freunde, Einstellungen (wie Discord); Mitte: Liste; rechts: Gespräch. */
(function (root) {
  'use strict';
  const { Api, Live } = root.ZM;
  const S = root.ZM.Store;
  const Call = root.ZMCall;
  const X = root.ZMX;
  const I = (n, s = 20) => (root.ZMI.has && !root.ZMI.has(n) && root.ZIcons && root.ZIcons.has(n)) ? root.ZIcons.svg(n, s) : root.ZMI.svg(n, s);   // Linien-Symbole (zm/icons.js, sonst Zunora-Symbole)
  const $ = (s, r = document) => r.querySelector(s);
  const tr0 = (s) => (root.ZLang && root.ZLang.t ? root.ZLang.t(s) : s);          // übersetzen (für neue Texte)
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const COLORS = ['#14B8A6', '#6A4BFF', '#FF7AD9', '#FF9F43', '#4EA0FF', '#2FBF71', '#E05252'];
  const hash = (s) => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); };
  const av = (name, cls = '', group, pic) => pic
    ? `<div class="av img ${cls}" style="background:#0003 url('${esc(pic)}') center/cover"></div>`
    : `<div class="av ${cls}" style="background:${COLORS[hash(name) % COLORS.length]}">${group ? root.ZMI.svg('friends', 18) : esc(String(name || '?').trim().charAt(0).toUpperCase() || '?')}</div>`;
  const uav = (u, cls = '') => { const h = av(S.nameOf(u), cls, false, S.userPic(u)); return root.ZMLook ? root.ZMLook.wrap(u, h, cls) : h; };          // Nutzer mit Profilbild (+ Plus-Extra-Rahmen)
  const pb = (u) => root.ZMLook && u ? root.ZMLook.badge(u) : '';          // ✦ Plus-Abzeichen
  const otherOf = (c) => c && !c.group && !c.self ? (c.members.find((m) => m.userId !== Api.userId) || {}).userId : null;
  const selfAv = (cls = '') => `<div class="av ${cls}" style="background:linear-gradient(135deg,#7c5cff,#22c3ee)">${root.ZMI.svg('pin', 18)}</div>`;   // „Notizen an mich"
  const cav0 = (c, cls = '') => c.self ? selfAv(cls) : (otherOf(c) && root.ZMLook && root.ZMLook.has(otherOf(c))) ? uav(otherOf(c), cls) : av(c.title, cls, c.group, S.chatPic(c));   // Chat/Gruppe mit Bild
  // online → grüner Punkt mit Rand am Bild (Einzel-Chats)
  const cav = (c, cls = '') => { const h = cav0(c, cls), o = otherOf(c), p = o && S.presence && S.presence.get(o); return p && p.online ? `<span class="avw">${h}<i class="odot" title="Online"></i></span>` : h; };
  // „● Online" grün und fett, sonst „zuletzt online …"
  const presHtml = (u) => { const l = S.presenceLabel ? S.presenceLabel(u) : ''; return l === 'online' ? '<span class="onl"><i></i>Online</span>' : esc(l); };
  const hm = (ms) => new Date(ms).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  function clock(ms) {
    if (!ms) return ''; const d = new Date(ms), n = new Date();
    if (d.toDateString() === n.toDateString()) return hm(ms);
    if (n - d < 6 * 86400000) return d.toLocaleDateString('de-DE', { weekday: 'short' });
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }
  function toast(t, bad) { const e = $('#zm-toast'); e.textContent = t; e.style.color = bad ? 'var(--bad)' : ''; e.classList.remove('hidden'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.add('hidden'), 3500); }
  const tryDo = (f) => Promise.resolve().then(f).catch((e) => toast(root.ZMStart ? root.ZMStart.err(e) : (e.message || String(e)), true));          // verständliche Fehlermeldungen
  function highlight(t) {
    const f = (s) => esc(s).replace(/(^|\s)(@[a-zA-Z0-9_.]{2,24})/g, '$1<span class="mention">$2</span>');
    return root.ZMLinks ? root.ZMLinks.html(t, f) : f(t);          // Links anklickbar (öffnen im Messenger)
  }

  // Brücke zur PC-App: KI (kostenlose Zunora AI wie am Handy)
  root.ZMHost = {
    async ai(msgs) {
      if (root.ZWeb) return root.ZWeb.ai(msgs);          // iPhone-Web-App: KI direkt
      if (!root.Host || !root.Host.available) throw new Error('nur in der PC-App');
      const sys = msgs.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
      const rest = msgs.filter((m) => m.role !== 'system');
      const last = rest.pop();
      const r = await root.Host.call('quick.ask', { engine: 'zunora', text: sys + '\n\n' + last.content, history: rest.map((m) => ({ role: m.role, text: m.content })) });
      return r && r.text;
    },
    /** Meldung unten rechts über das Programm (auch wenn das Fenster im Infobereich ist). */
    notify(title, body) { if (root.ZWeb) return root.ZWeb.notify(title, body); if (root.Host && root.Host.available) return root.Host.call('notify', { title, body }); throw new Error('nur in der PC-App'); },
  };

  // Zweites Konto (eigenes Fenster, --konto2): eigene Daten, ohne Zunora ID
  const SECOND = !!(root.ZM && root.ZM.second);
  if (SECOND) { document.title = 'Zunora Messenger · Konto 2'; const setT = () => { const t = document.querySelector('#zchrome .zc-title span'); if (t) t.textContent = 'Zunora Messenger · Konto 2'; }; setT(); setTimeout(setT, 500); }
  // Darstellung (wie am Handy): system | hell | dunkel | schwarz (extra dunkel)
  const THEMES = [['system', 'Automatisch', 'Wie Windows (hell oder dunkel)'], ['hell', 'Hell', 'Pastell-Farben, dunkle Schrift'], ['dunkel', 'Dunkel', 'Tiefes Blau-Violett mit Farbwolken'], ['schwarz', 'Extra dunkel', 'Fast schwarz — angenehm nachts']];
  const themeNow = () => { try { return localStorage.getItem('zm-theme') || 'system'; } catch (e) { return 'system'; } };
  function applyTheme() {
    const t = themeNow(), h = document.documentElement;
    if (t === 'hell') h.dataset.theme = 'light'; else if (t === 'dunkel' || t === 'schwarz') h.dataset.theme = 'dark'; else delete h.dataset.theme;
    h.classList.toggle('zm-black', t === 'schwarz');
    if (root.ZPlus && root.ZPlus.apply) root.ZPlus.apply();      // Plus-Farben passend zu Hell/Dunkel/Extra dunkel
  }
  applyTheme();
  // Energiesparmodus (wie am Handy): auto (Laptop-Akku unter 20 % und nicht am Strom) | an | aus
  const ECO = [['auto', 'Automatisch', 'An, wenn der Laptop-Akku unter 20 % ist und nicht lädt'], ['an', 'Immer an', 'Schlichter Look, spart Strom'], ['aus', 'Aus', 'Voller Zunora-Look mit Glas und Animationen']];
  const ecoMode = () => { try { return localStorage.getItem('zm-eco') || 'auto'; } catch (e) { return 'auto'; } };
  let lowBattery = false;
  const ecoOn = () => ecoMode() === 'an' || (ecoMode() === 'auto' && lowBattery);
  function applyEco() {
    const on = ecoOn();
    document.documentElement.classList.toggle('z-eco', on);
    if (root.ZLook && root.ZLook.setCalm) root.ZLook.setCalm(on);
    if (on) document.querySelectorAll('svg animate').forEach((a) => a.remove());   // bewegtes Flüssigkeits-Filter anhalten
  }
  applyEco();
  if (navigator.getBattery) navigator.getBattery().then((b) => {
    const upd = () => { const was = lowBattery; lowBattery = !b.charging && b.level <= 0.2; if (was !== lowBattery) applyEco(); };
    b.addEventListener('levelchange', upd); b.addEventListener('chargingchange', upd); upd();
  }).catch(() => { });
  let view = 'chats';
  let replyTo = null, editing = null, dlgOpen = false;

  // ====================================================================== Start und Anmelden
  async function boot() {
    if (root.ZMStart) { root.ZMStart.install(S, Api); root.ZMStart.applyLook(); root.ZMStart.a11y(); }
    if (root.ZMStart2) { root.ZMStart2.patchCall(); root.ZMStart2.wireGlobal(() => startH()); root.ZMStart2.wireLinkClicks(() => startH()); }
    try { await Api.init(); } catch (e) { $('#zm-app').innerHTML = `<div class="empty"><div class="big">⚠️</div>Die Verbindung zum Zunora-Server fehlt in dieser Version.</div>`; return; }
    if ('Notification' in root && Notification.permission === 'default') try { Notification.requestPermission(); } catch (e) { }
    if (!Api.loggedIn) await Api.fromZunoraId();   // Zunora ID: in einem anderen Zunora-Programm angemeldet? Dann automatisch
    // Anruf-Link im Browser ohne Konto → Gast-Bildschirm (vorläufiges Konto, nur für diesen Anruf)
    if (!Api.loggedIn && root.ZMStart2 && root.ZMStart2.guestToken()) { root.ZMStart2.guestScreen(startH(), root.ZMStart2.guestToken()); return; }
    if (window.ZLang && !ZLang.chosen) { if (Api.loggedIn) await ZLang.set('de'); else await ZLang.picker(); }
    if (Api.loggedIn) {
      // Schneller Start: gespeicherten Stand sofort zeigen, Neues kommt im Hintergrund dazu
      const O = root.ZM.Offline; let quick = false;
      try { const dev = await root.ZM.DB.get('geraet'); if (dev && dev.id && dev.keys && O && await O.Cache.load()) { S.keys = dev.keys; S.deviceId = dev.id; quick = true; } } catch (e) { }
      if (quick) {
        shell();
        // Schneller Start mit dem gespeicherten Stand — klappt das Nachladen nicht sofort (z. B. Netz noch nicht da), später erneut
        // versuchen, sonst blieben neue Chats und Freunde unsichtbar.
        const tryStart = (n) => S.start().then((ok) => {
          if (!ok && !Api.loggedIn) { login(S.status); return; }
          renderAll();
          if (!ok && n < 6) setTimeout(() => tryStart(n + 1), Math.min(60000, 5000 * (n + 1)));
        }).catch(() => { if (n < 6) setTimeout(() => tryStart(n + 1), Math.min(60000, 5000 * (n + 1))); });
        tryStart(0); return;
      }
      if (await S.start()) shell(); else login(S.status);
    } else login(S.status);
  }

  function login(msg) {
    let mode = 'login';
    const draw = () => {
      $('#zm-app').innerHTML = `<div class="zm-login"><div class="card">
        <div class="zm-orb" style="width:70px;height:70px;align-self:center"></div>
        <h1 style="text-align:center">Zunora Messenger${SECOND ? ' <span class="k2badge">Konto 2</span>' : ''}</h1>
        ${SECOND ? '<p class="small" style="text-align:center;margin:0 0 8px">Melde hier dein <b>zweites Konto</b> an. Es bleibt nur in diesem Fenster — die anderen Zunora-Programme nutzen es nicht.</p>' : ''}
        <p class="muted small" style="text-align:center;margin:0 0 8px">Chats und Gruppen Ende-zu-Ende verschlüsselt · Server wie Discord · Zunora AI an Bord</p>
        ${root.ZMDesign ? root.ZMDesign.madeHtml() : ""}
        <input id="lgName" placeholder="Nutzername (z. B. anna.k)" autocomplete="username" maxlength="24">
        <div id="lgFree" class="hint"></div>
        ${mode === 'signup' ? '<input id="lgDisp" placeholder="Anzeigename (z. B. Anna)" maxlength="40">' : ''}
        <input id="lgPass" type="password" placeholder="Passwort" autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}">
        ${mode === 'signup' ? `<input id="lgPass2" type="password" placeholder="Passwort wiederholen" autocomplete="new-password">
          <label class="hint" style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" id="lgAgree" style="width:auto"> Ich bin mindestens 16 Jahre alt und habe Nutzungsregeln und Datenschutz (im Messenger am Handy unter Einstellungen) gelesen.</label>
          <div class="hint">Merke dir dein Passwort gut — ohne E-Mail-Adresse lässt es sich nicht zurücksetzen.</div>` : ''}
        <button class="btn" id="lgGo">${mode === 'signup' ? 'Konto erstellen' : 'Anmelden'}</button>
        <button class="link" id="lgSwitch">${mode === 'signup' ? 'Ich habe schon ein Konto — anmelden' : 'Neu hier? Konto erstellen'}</button>
        <div class="hint">Dasselbe Konto wie am Handy — der PC wird als weiteres Gerät angemeldet.</div>
        <div class="err" id="lgErr">${esc(msg || '')}</div></div></div>`;
      $('#lgSwitch').onclick = () => { mode = mode === 'signup' ? 'login' : 'signup'; msg = ''; draw(); };
      const name = $('#lgName');
      let t = null;
      name.oninput = () => { name.value = name.value.toLowerCase(); clearTimeout(t); if (mode !== 'signup') return; const n = name.value; $('#lgFree').textContent = !Api.nameOk(n) ? '3–24 Zeichen: a–z, 0–9, Punkt, Unterstrich' : '…';
        if (Api.nameOk(n)) t = setTimeout(async () => { const f = await Api.nameFree(n).catch(() => null); $('#lgFree').textContent = f === true ? '✓ frei' : f === false ? '✗ schon vergeben' : ''; }, 450); };
      $('#lgGo').onclick = async () => {
        const n = name.value, p = $('#lgPass').value; const err = $('#lgErr'); err.textContent = '';
        if (!Api.nameOk(n)) return (err.textContent = 'Der Nutzername passt nicht (3–24 Zeichen: a–z, 0–9, Punkt, Unterstrich).');
        if (p.length < 8) return (err.textContent = 'Das Passwort braucht mindestens 8 Zeichen.');
        if (mode === 'signup') { if (p !== $('#lgPass2').value) return (err.textContent = 'Die Passwörter sind verschieden.'); if (!$('#lgAgree').checked) return (err.textContent = 'Bitte bestätige Alter und Regeln.'); }
        $('#lgGo').disabled = true; $('#lgGo').textContent = 'Einen Moment …';
        try { if (mode === 'signup') await Api.signUp(n, $('#lgDisp').value, p); else await Api.signIn(n, p); Api.shareToZunoraId(p); if (await S.start()) shell(); else draw(err.textContent = S.status); }
        catch (e) { err.textContent = e.message; $('#lgGo').disabled = false; $('#lgGo').textContent = mode === 'signup' ? 'Konto erstellen' : 'Anmelden'; }
      };
      $('#lgPass').onkeydown = (e) => { if (e.key === 'Enter') $('#lgGo').click(); };
    };
    draw();
  }

  // ====================================================================== Grundgerüst
  function shell() {
    $('#zm-app').innerHTML = `<div id="callbar"></div><div id="voicebar"></div><div class="zm-shell" id="shell"><nav class="zm-rail" id="rail"></nav><section class="zm-list" id="list"></section><section class="zm-main" id="main"></section></div><div id="callroot"></div>`;
    S.listeners.add(schedule);
    calm($('#rail')); calm($('#list'));
    // Zunora Plus (alle Apps): Abo-Stand, Farbe, Hintergrund, Sperre — über die Messenger-Sitzung
    if (root.ZPlus) root.ZPlus.init({ here: 'Messenger', rpc: (f, a) => Api.rpc(f, a), fn: (f, b) => Api.fnJson(f, b), onChange: (k) => { if (view === 'settings' && ['plus', 'darstellung', 'chats', 'datenschutz'].includes(settingsPage)) { if (k === 'nav') renderRail(); return; } schedule('plus'); } });
    if (root.ZMMore) { root.ZMMore.applyIcon(); root.ZMMore.applyShield(); }
    if (X2()) { X2().loadNicks(S, Api); setTimeout(() => X2().notices(Object.assign(extraH(), { legal: () => { if (root.ZMMore && root.ZMMore.legal) root.ZMMore.legal(); else { view = 'settings'; settingsPage = 'hilfe'; renderAll(); } } })), 1200); }      // Spitznamen laden; Anleitung einmalig zeigen      // gewähltes App-Symbol und Bildschirmfoto-Schutz (nur dieser PC)
    // Leiste bearbeiten: rechte Maustaste oder lange drücken
    const rail = $('#rail'); let lp = null;
    rail.addEventListener('contextmenu', (e) => { e.preventDefault(); navEditDlg(); });
    rail.addEventListener('pointerdown', () => { clearTimeout(lp); lp = setTimeout(navEditDlg, 650); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => rail.addEventListener(ev, () => clearTimeout(lp)));
    renderAll();
    checkUpdate(false);          // still: neuere Version? (abschaltbar in den Einstellungen)
    startTasks();          // Offizieller Start 1.2.0: Hinweise, Mindestversion, neues Gerät, Absturz, Neu in dieser Version
  }
  function startH() { return Object.assign(aH(), { startUpdate, shell, renderMain }); }
  function startTasks() {
    const Z = root.ZMStart, T2 = root.ZMStart2; if (!Z) return;
    const H = startH();
    Z.loadReceipts(H).then(() => renderAll());
    setTimeout(() => { Z.loadNotices(H); Z.crashCheck(H); Z.checkDevices(H); setTimeout(() => Z.whatsNew(H), 2500); }, 1800);
    setInterval(() => { Z.loadNotices(H); Z.checkDevices(H); }, 30 * 60000);
    if (root.ZMGroups) root.ZMGroups.init(H);          // Gruppen-Links + angeheftete Nachricht
    if (T2) { const tok = T2.tokenOf(location.search); if (tok) setTimeout(() => T2.joinPromptDlg(H, tok), 1500); }
    // Live-Standort im offenen Chat alle 20 Sekunden auffrischen
    if (T2) setInterval(() => { const id = S.openChat; if (!id || document.hidden) return; if ((S.messages.get(id) || []).some((m) => m.kind === 'location' && m.content && m.content.live && m.content.live.until > Date.now())) T2.refreshLive(H, id).then(() => renderMain()); }, 20000);
  }
  /** Bereich nur neu zeichnen, wenn sich sein Inhalt wirklich geändert hat — sonst flackert es, Bilder laden neu und
   *  Eingabefelder verlieren den Fokus (gleiches HTML wird einfach nicht noch einmal gesetzt). */
  const HTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  function calm(el) {
    if (!el || el._calm) return; el._calm = true;
    Object.defineProperty(el, 'innerHTML', { configurable: true, get() { return HTML.get.call(this); },
      set(v) { if (this._last === v && this.childNodes.length) return; this._last = v; HTML.set.call(this, v); } });
  }
  let pending = false;
  function schedule(what) { if (what === 'nav') { renderAll(); return; } if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; renderAll(); }); }
  setInterval(() => { if (S.purgeExpired && S.purgeExpired()) renderAll(); }, 10000);          // verschwindende Nachrichten: auch ohne neue Ereignisse weg
  function renderAll() { if (root.ZMDesign) root.ZMDesign.apply(); renderRail(); renderList(); renderMain(); renderCall(); renderTransfer(); if (root.ZMMedia && root.ZMMedia.bar) root.ZMMedia.bar();
    if (root.ZMLook) { root.ZMLookH = { S, Api, renderAll: () => schedule('look'), toast, uav, dlg, closeDlg, tryDo }; root.ZMLook.load().catch(() => { }); } }

  function renderRail() {
    const unread = [...S.chats.values()].filter((c) => c.unread > 0).length;
    const inc = S.friends.filter((f) => f.st === 'incoming').length;
    const srv = [...S.servers.keys()].some((id) => S.serverUnread && S.serverUnread(id)) ? '•' : 0;
    // Zunora Plus: eigene Leiste (rechte Maustaste / lange drücken), sonst Standard
    const badges = { chats: unread, server: srv, friends: inc, settings: S.update ? 1 : 0 };
    const tabs = (root.ZMDesign && root.ZMDesign.simple() ? root.ZMDesign.SIMPLE_TABS : root.ZMPlus ? root.ZMPlus.tabs() : ['chats', 'calls', 'server', 'friends', 'settings']).map((k) => { const d = (root.ZMPlus ? root.ZMPlus.TABS : []).find((x) => x[0] === k) || [k, k, k]; return [k, d[1], d[2], badges[k] || 0]; });
    $('#rail').innerHTML = `<div class="navpill">${tabs.map(([k, ic, label, badge]) => `<button class="nav ${view === k ? 'on' : ''}" data-view="${k}" title="${label}"><span class="ni">${I(ic, 22)}${badge ? `<span class="dot ${k === 'settings' ? 'red' : ''}">${badge}</span>` : ''}</span><span class="nl">${label}</span></button>`).join('')}</div>
      <div style="flex:1"></div><div class="small muted" title="${S.online ? 'verbunden' : 'verbinde …'}" style="padding-bottom:10px">${S.online ? '🟢' : '⟳'}</div>`;
  }
  /** Server-Bilderleiste oben im Server-Bereich (wie die Server-Leiste am Handy) */
  function serverStrip() {
    const fo = !!(S.Follow && S.Follow.showing);
    return `<div class="srvstrip">${root.ZMA ? root.ZMA.followButton(aH()) : ''}${[...S.servers.values()].map((s) => `<button class="srvic ${S.openServer === s.id && !fo ? 'on' : ''}" data-server="${esc(s.id)}" title="${esc(s.name)}">${s.icon ? `<span class="srvimg" style="background-image:url('${esc(S.pic(s.icon))}')"></span>` : esc(s.name.split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join(''))}</button>`).join('')}
      <button class="srvic add" data-act="addServer" title="Server hinzufügen">${I('plus', 20)}</button><button class="srvic add" data-act="discover" title="Server entdecken">${I('compass', 20)}</button></div>`;
  }

  // ---------------------------------------------------------------------- Mitte: Listen
  let showLocked = false;
  const X2 = () => root.ZMExtra;
  let query = '', showArchived = false, callList = null, callFilter = 'alle', callQ = '';
  let friendsPresence = false;
  let settingsPage = '';         // Einstellungen: '' = Übersicht, sonst Bereich
  function renderList() {
    const el = $('#list'); if (!el) return;
    const keepFocus = document.activeElement && document.activeElement.id === 'listSearch';
    if (view === 'calls') {
      if (!callList) { callList = Call.hist || []; Call.history().then((l) => { callList = l; if (view === 'calls') renderList(); }).catch((e) => toast(e.message, true)); }
      const titleOf = (e) => (S.chats.get(e.chat) || {}).title || (e.by !== Api.userId ? S.nameOf(e.by) : 'Anruf');
      const shown = callList.filter((e) => (callFilter === 'alle' || e.missed) && (!callQ || titleOf(e).toLowerCase().includes(callQ.toLowerCase())));
      el.innerHTML = `<header><h2>Anrufe</h2>${callList.length ? `<button class="ico" data-act="callsClear" title="Liste leeren">${I('trash')}</button>` : ''}</header>
        <div class="callfilter"><button class="chip ${callFilter === 'alle' ? 'on' : ''}" data-act="callFilter" data-v="alle">Alle</button><button class="chip ${callFilter === 'verpasst' ? 'on' : ''}" data-act="callFilter" data-v="verpasst">Verpasst</button></div>
        <input class="search" id="callSearch" placeholder="Anrufe suchen …" value="${esc(callQ)}">
        <p class="muted small" style="margin:0 16px 8px">Die letzten 30 Tage · Ende-zu-Ende verschlüsselt · Klick für Details.</p><div class="scroll">${root.ZMStart2 ? root.ZMStart2.callLinkHtml(aH()) : ''}` +
        (shown.length ? shown.map((e) => { const c = S.chats.get(e.chat); const title = titleOf(e);
          const d = e.answered && e.ended > e.at ? ' · ' + (() => { const s = Math.round((e.ended - e.at) / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); })() : '';
          return `<div class="row" data-act="callDetail" data-id="${esc(e.id)}">${c ? cav(c) : uav(e.by)}<div class="main"><div class="top"><span class="title" style="${e.missed ? 'color:var(--bad)' : ''}">${esc(title)}</span><span class="time">${clock(e.at)}</span></div>
            <div class="prev" style="${e.missed ? 'color:var(--bad)' : ''}">${e.outgoing ? '↗' : '↙'}${e.missed ? 'Verpasst · ' : !e.answered && e.outgoing ? 'Nicht angenommen · ' : ''}${e.video ? 'Video' : 'Sprache'}${d}</div></div>
            ${c && c.members.length <= 8 ? `<button class="ico" data-act="callBack" data-chat2="${esc(e.chat)}" data-video="${e.video ? 1 : 0}" title="Zurückrufen">${I(e.video ? "video" : "phone")}</button>` : ''}</div>`; }).join('')
          : `<div class="empty"><div class="big">${I('phone', 40)}</div>${callFilter === 'verpasst' ? 'Keine verpassten Anrufe.' : callQ ? 'Nichts gefunden.' : 'Noch keine Anrufe. Im Chat oben auf Telefon oder Kamera klicken.'}</div>`) + '</div>';
      const cs = $('#callSearch'); if (cs) { cs.oninput = () => { callQ = cs.value.trim(); const pos = cs.selectionStart; renderList(); const n2 = $('#callSearch'); if (n2) { n2.focus(); n2.setSelectionRange(pos, pos); } }; }
      return;
    }
    if (view === 'chats') {
      const me = Api.userId;
      const others = [...S.statuses.keys()].filter((u) => u !== me).sort((a, b) => S.statusMuted(a) - S.statusMuted(b));
      const all = [...S.chats.values()].filter((c) => !query || (c.title + ' ' + c.preview).toLowerCase().includes(query.toLowerCase()));
      const archivedCount = [...S.chats.values()].filter((c) => c.archived).length;
      const lockedIds = X2() ? X2().lockedIds() : new Set(); if (showLocked && !X2().unlocked()) showLocked = false;
      const list = all.filter((c) => !!c.archived === showArchived && (!lockedIds.has(c.id) || showLocked) && (query || showArchived || !root.ZMA || S.inFolder(c))).sort((a, b) => (b.pinned - a.pinned) || (b.lastAt - a.lastAt));
      const hits = query.trim().length >= 2 ? S.searchAll(query) : [];
      el.innerHTML = `<header><h2>${root.ZMMore ? root.ZMMore.header(moreH()) : 'Zunora Messenger'}</h2><button class="ico" data-act="newChat" title="Neuer Chat oder Gruppe">${I("edit")}</button></header><button class="zm-fab" data-act="newChat" title="Neuer Chat oder Gruppe">${I("plus", 26)}</button>
        <input class="search" id="listSearch" placeholder="🔍 Suchen …" value="${esc(query)}">
        ${root.ZMStart && !query && !showArchived ? root.ZMStart.noticesHtml(aH()) : ''}${root.ZMA && !query && !showArchived && !(root.ZMDesign && root.ZMDesign.simple()) && (!root.ZMChat2 || root.ZMChat2.foldersOn()) ? root.ZMA.chips(aH()) : ''}
        ${root.ZMMore && !query && !showArchived && !(root.ZMDesign && root.ZMDesign.simple()) ? root.ZMMore.widgets(moreH()) : ''}
        ${S.Transfer.offer ? `<div class="offercard"><b>Chat-Verlauf von deinem anderen Gerät holen?</b><div class="small muted">Deine Chats und Nachrichten kommen mit einem Code von deinem Handy oder PC herüber — Ende-zu-Ende verschlüsselt.</div><div style="display:flex;gap:8px;margin-top:8px"><button class="btn" data-act="transfer">Verlauf holen</button><button class="btn ghost" data-act="transferNo">Nein danke</button></div></div>` : ''}
        ${(root.ZMWish && root.ZMWish.statusOff()) || (root.ZMDesign && root.ZMDesign.simple()) ? '' : root.ZMStatus && root.ZMStatus.strip ? root.ZMStatus.strip(statusHelpers()) : `<div class="stories">
          <div class="story" data-act="myStatus"><div class="sring ${S.statuses.has(me) ? '' : 'none'}">${uav(Api.userId, 's')}</div>Mein Status</div>
          ${others.map((u) => { const seen = (S.statuses.get(u) || []).every((i) => S.seenStatus(i.id)); return `<div class="story" data-status="${esc(u)}" style="${S.statusMuted(u) ? 'opacity:.45' : ''}"><div class="sring ${seen || S.statusMuted(u) ? 'seen' : ''}">${uav(u, 's')}</div>${esc(S.nameOf(u))}</div>`; }).join('')}
        </div>`}
        <div class="scroll">${!showArchived && archivedCount ? `<div class="row" data-act="showArchived"><span style="font-size:20px">🗄</span><div class="main"><div class="title">Archiviert</div></div><span class="muted">${archivedCount}</span></div>` : ''}
          ${!showArchived && !query && [...S.chats.keys()].some((id) => lockedIds.has(id)) ? `<div class="row" data-act="lockedChats"><span style="font-size:0">${I('lock', 20)}</span><div class="main"><div class="title">${showLocked ? 'Gesperrte Chats ausblenden' : 'Gesperrte Chats'}</div></div><span class="muted">${[...S.chats.keys()].filter((id) => lockedIds.has(id)).length}</span></div>` : ''}
          ${showArchived ? '<button class="link" data-act="hideArchived" style="margin:6px 16px">‹ Zurück zu den Chats</button>' : ''}
          ${list.map((c) => {
          const ty = S.typing.get(c.id); const typing = ty && Date.now() - ty[1] < 6000 && (!X2() || X2().typingOn());
          const draft = S.openChat !== c.id ? S.draft(c.id) : '';
          return `<div class="row ${S.openChat === c.id ? 'on' : ''}" data-chat="${esc(c.id)}">${cav(c)}<div class="main"><div class="top"><span class="title">${esc(c.title)}${pb(otherOf(c))}${c.requestFrom && c.requestFrom !== Api.userId ? ' <span class="chip" style="background:var(--accent);color:#fff">Anfrage</span>' : ''}${c.theme && c.theme.emoji ? ' ' + esc(c.theme.emoji) : ''}</span><span class="time" style="${c.unread ? 'color:var(--accent)' : ''}">${clock(c.lastAt)}</span></div>
            <div class="top"><span class="prev" style="flex:1;${typing || draft ? 'color:var(--accent)' : ''}">${typing ? 'schreibt …' : draft ? '✏️ Entwurf: ' + esc(draft.replace(/\n/g, ' ').slice(0, 80)) : (c.previewMine ? '✓ ' : '') + esc(c.preview || '🔒 Noch keine Nachrichten')}</span>${X2() && X2().unreadMention(c, S, Api) ? '<span class="badge">@</span>' : ''}${lockedIds.has(c.id) ? I("lock", 14) : ""}${c.mutedUntil > Date.now() ? I("belloff", 14) : ""}${c.pinned ? I("pin", 14) : ""}${c.unread ? `<span class="badge">${Math.min(c.unread, 99)}</span>` : ''}</div></div></div>`;
        }).join('')}
          ${hits.length ? '<div class="cat">Nachrichten</div>' + hits.map((m) => { const c = S.chats.get(m.chatId) || {}; return `<div class="row" data-chat="${esc(m.chatId)}" data-hit="${esc(m.id)}"><span style="font-size:18px">💬</span><div class="main"><div class="top"><span class="title small" style="color:var(--accent)">${esc((c.title || 'Chat') + ' · ' + S.nameOf(m.sender))}</span><span class="time">${clock(m.at)}</span></div><div class="prev">${esc(X.snippet(m.content.t, query))}</div></div></div>`; }).join('') : ''}
          ${!list.length && !hits.length ? `<div class="empty"><div class="big">💬</div>${root.ZMA && !query && !showArchived && root.ZMA.emptyText(S) ? esc(root.ZMA.emptyText(S)) : S.friends.some((f) => f.st === 'accepted') ? 'Klick auf ✏️, um zu schreiben.' : 'Noch keine Chats. Füge links unter 👥 Freunde jemanden über seinen Nutzernamen hinzu.'}</div>` : ''}
        <p class="muted small" style="text-align:center;padding:14px">🔒 Deine Chats und Gruppen sind Ende-zu-Ende verschlüsselt.</p></div>`;
      if (root.ZMMore) root.ZMMore.wireWidgets(el, moreH());
      if (root.ZMA) root.ZMA.wireChips(el, aH());
      if (root.ZMStart) root.ZMStart.wireNotices(el, aH());
      const s = $('#listSearch'); s.oninput = () => { query = s.value; renderList(); }; if (keepFocus) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
    } else if (view === 'server') {
      if (root.ZMA && S.Follow && S.Follow.showing) { root.ZMA.followList(el, aH(), serverStrip()); return; }          // Kanäle zum Folgen
      if ((!S.openServer || !S.servers.has(S.openServer)) && S.servers.size) S.openServer = S.servers.keys().next().value;
      const s = S.servers.get(S.openServer); const st = S.serverState.get(S.openServer);
      if (!s) { el.innerHTML = `<header><h2>Server</h2></header>${serverStrip()}<div class="empty"><div class="big">🏠</div>Noch kein Server. Erstelle einen, tritt mit einem Einladungs-Code bei oder entdecke öffentliche Server.</div>`; return; }
      if (!st) { S._ld = S._ld || new Set(); if (!S._ld.has(s.id)) { S._ld.add(s.id); S.loadServer(s.id).catch((e) => toast(e.message, true)).finally(() => S._ld.delete(s.id)); } el.innerHTML = `<header><h2>${esc(s.name)}</h2></header><p class="muted" style="padding:16px">Lädt …</p>`; return; }
      const cats = new Map(); st.channels.forEach((c) => { const k = c.category || 'Kanäle'; (cats.get(k) || cats.set(k, []).get(k)).push(c); });
      el.innerHTML = `<header><h2 style="color:var(--text)">${esc(s.name)}</h2><button class="ico" data-act="srvSearch" title="Im Server suchen">${I("search")}</button><button class="ico" data-act="mentions" title="@ Erwähnungen" style="font-weight:700;font-size:18px">@</button>${S.can(s.id, 32) ? '<button class="ico" data-act="invite" title="Einladen">' + I("invite") + '</button>' : ''}<button class="ico" data-act="serverMenu" title="Server">${I("settings")}</button></header>${serverStrip()}
        ${root.ZMBoost ? root.ZMBoost.bannerHtml(s.id) : ''}<p class="muted small" style="margin:0 16px 6px">${st.members.length} Mitglieder${s.owner === Api.userId ? ' · dein Server' : ''}</p>
        ${s.rules ? (S.rulesSeen(s) ? '<button class="link" data-act="rules" style="margin:0 16px 4px">📜 Regeln</button>' : '<div class="offercard" data-act="rules" style="cursor:pointer"><b>📜 Regeln dieses Servers</b><div class="small muted">Bitte einmal lesen — anklicken.</div></div>') : ''}
        <div class="scroll">${root.ZMA ? root.ZMA.serverFollow(aH(), s.id) : ''}${[...cats.entries()].map(([k, list]) => (root.ZMWish ? root.ZMWish.catHtml(s.id, k, list, aH()) : `<div class="cat">${esc(k)}</div>`) + (root.ZMWish && root.ZMWish.catClosed(s.id, k) ? [] : list).map((c) => {
          const voice = c.kind === 'voice' || c.kind === 'stage';
          const icon = c.emoji ? `<span class="chemo" style="background:color-mix(in srgb, ${/^#[0-9a-f]{6}$/i.test(c.color || '') ? c.color : 'var(--accent)'} 28%, transparent)">${esc(c.emoji)}</span>` : I({ announcement: "megaphone", forum: "forum", voice: "speaker", stage: "speaker" }[c.kind] || "hash", 18);
          if (voice && !Call.voiceMembers.has(c.id)) { Call.voiceMembers.set(c.id, []); Call.refreshVoice(c.id).catch(() => { }); }
          const inHere = Call.channelId === c.id;
          return `<div class="chan ${S.openChannel === c.id || inHere ? 'on' : ''}" data-${voice ? 'voice' : 'channel'}="${esc(c.id)}" title="Rechtsklick: Kanal stummschalten"><span class="i">${icon}</span><span style="flex:1;min-width:0">${esc(c.name)}${c.topic && !voice ? `<small class="chtopic">${esc(c.topic)}</small>` : ''}</span>${S.channelMuted(c.id) ? I("belloff", 14) : ''}${c.min_role_position > 0 ? '🔒' : ''}${voice ? `<small>${(Call.voiceMembers.get(c.id) || []).length}/8</small>` : ''}</div>` +
            (voice ? `<div class="voice-users">${(Call.voiceMembers.get(c.id) || []).map((u) => `<div>${av(S.nameIn(s.id, u), 'xs', false, S.userPic(u))}${esc(S.nameIn(s.id, u))}</div>`).join('')}</div>` : '');
        }).join('')).join('')}
        ${S.can(s.id, 1) ? '<button class="link" style="margin:10px 16px" data-act="newChannel">＋ Kanal anlegen</button>' : ''}</div>`;
    } else if (view === 'friends') {
      const g = (st) => S.friends.filter((f) => f.st === st);
      if (!friendsPresence) { friendsPresence = true; S.loadPresence(g('accepted').map((f) => f.p.id)).catch(() => { }); }
      root.ZMMore.friends(el, moreH());      // Freunde · Anfragen (mit Nachricht, Verlauf) · Hinzufügen (Suche, QR-Code)
    } else if (view === 'settings') {
      // Einstellungen in Bereichen (wie WhatsApp): Übersicht → Bereich
      const SECTIONS0 = [['anrufe', 'phone', 'Anrufe', 'Klingelton, Ruhezeiten, Mikrofon'], ['darstellung', 'screen', 'Darstellung & Energie', (THEMES.find((x) => x[0] === themeNow()) || THEMES[0])[1]], ['startseite', 'star', 'Startseite', localStorage.getItem('zm-start') === '1' ? 'An · Widgets über den Chats' : 'Aus · Widgets über den Chats'], ['konto', 'user', 'Konto', 'Profil, Nutzername, QR-Code, Passwort'], ['datenschutz', 'lock', 'Datenschutz', 'Wer sieht was, Anfragen, Bildschirmfoto-Schutz, Blockiert'],
        ['chats', 'chat', 'Chats', 'Verlauf übertragen, Verlauf-Sicherung'], ['geraete', 'shield', 'Geräte', 'Wo du angemeldet bist'],
        ['pc', 'settings', 'Am PC', 'Infobereich, Autostart, Updates'], ['plus', 'sparkle', 'Zunora Plus', 'Ein Abo für alle Zunora-Apps'], ['anleitung', 'compass', 'Anleitung', 'Alle Funktionen kurz erklärt'], ['hilfe', 'file', 'Hilfe & Rechtliches', 'Impressum, Datenschutz, Nutzungsregeln']];
      const SECTIONS = root.ZMDesign ? root.ZMDesign.sections(SECTIONS0) : SECTIONS0;          // + Alles größer & einfacher, Design & Animationen; Einfache Ansicht: nur das Wichtigste
      const p = settingsPage;
      const head = p ? `<header><button class="ico" data-setpage="" title="Zurück">${I('back')}</button><h2>${esc((SECTIONS.find((x) => x[0] === p) || [])[2] || 'Einstellungen')}</h2></header>` : '<header><h2>Einstellungen</h2></header>';
      const body = {
        '': `${root.ZMAutoUpd ? root.ZMAutoUpd.readyHtml() : ''}${updCard()}${root.ZMStart ? root.ZMStart.searchHtml(aH()) : ''}
          <div class="row setprof" data-setpage="konto" style="cursor:pointer;padding:8px 0">${uav(Api.userId)}<div class="main"><div class="title">${esc((S.me || {}).name || '')}</div><div class="prev">${esc((S.me || {}).about || '@' + ((S.me || {}).username || Api.username))}</div></div>${I('forward', 16)}</div>
          <div class="row setsec" data-act="language"><span class="secic">🌍</span><div class="main"><div class="title">Sprache · Language</div><div class="prev" data-notr>${esc(window.ZLang ? ZLang.name(ZLang.lang) : 'Deutsch')}</div></div>${I('forward', 14)}</div>
          ${SECTIONS.map(([k, ic, t, sub]) => `<div class="row setsec" data-setpage="${k}"><span class="secic">${I(ic, 19)}</span><div class="main"><div class="title">${t}</div><div class="prev">${sub}</div></div>${I('forward', 14)}</div>`).join('')}`,
        konto2: `${SECOND ? `<div class="k2card"><b>Zweites Konto</b><div class="small muted">Dieses Fenster ist dein zweites Konto. Anmeldung, Schlüssel und Chats liegen getrennt vom Hauptkonto. Die anderen Zunora-Programme (Zunora ID) haben darauf keinen Zugriff. Updates installiert das Hauptfenster.</div></div>`
          : `<div class="k2card"><b>Zweites Konto</b><div class="small muted">Melde ein weiteres Konto an — es öffnet sich in einem eigenen Fenster und bleibt für sich: die anderen Zunora-Programme nutzen nur dein Hauptkonto.</div><button class="btn" data-act="openKonto2" style="margin-top:8px">${I('user', 16)} Zweites Konto öffnen</button></div>`}
`,
        datenschutz: root.ZMMore.privacy(moreH()),
        startseite: root.ZMMore.startPage(moreH()),
        chats: `<div class="cat" style="padding-left:0">Chat-Verlauf übertragen</div><p class="small muted" style="margin:0 0 6px">Neues Gerät? Hol deine Chats und Nachrichten mit einem Code von deinem anderen Gerät herüber.</p>
          <button class="btn ghost" data-act="transfer" style="width:100%">📲 Verlauf von anderem Gerät holen</button>
          <div class="cat" style="padding-left:0">Verlauf-Sicherung</div><p class="muted small">Am PC sind die Schlüssel absichtlich fest in diesem Windows-Konto gespeichert und nicht auslesbar (stärkerer Schutz). Die Sicherung, mit der alte Nachrichten nach einer Neuinstallation lesbar bleiben, gibt es im Messenger am Handy unter Einstellungen → Chats.</p>`,
        geraete: `<p class="small muted" style="margin:0 0 6px">Überall, wo du angemeldet bist. Ein abgemeldetes Gerät verliert sofort den Zugang zu neuen Nachrichten.</p><div id="devList" class="muted small">Lädt …</div>
          <button class="btn ghost hidden" id="revokeOthers" data-act="revokeOthers" style="width:100%;margin-top:6px">Alle anderen Geräte abmelden</button>`,
        anrufe: `<div class="cat" style="padding-left:0">Klingelton</div><div class="chips">${Object.entries(Call.TONES).map(([k, l]) => `<button class="chip ${Call.pref('ton', 'klassisch') === k ? 'on' : ''}" data-act="setTone" data-v="${k}">${l}</button>`).join('')}</div>
          <div class="cat" style="padding-left:0">Ruhezeiten</div><label class="small chk"><input type="checkbox" id="setQuiet" ${Call.pref('ruhe', false) ? 'checked' : ''}> <span>In dieser Zeit klingelt kein Anruf — du siehst ihn danach als verpassten Anruf.</span></label>
          <div style="display:flex;gap:8px;align-items:center;margin-top:6px"><span class="small muted">Von</span><select id="setQFrom">${[...Array(24).keys()].map((h) => `<option value="${h}" ${Call.pref('von', 22) === h ? 'selected' : ''}>${String(h).padStart(2, '0')}:00</option>`).join('')}</select>
            <span class="small muted">bis</span><select id="setQTo">${[...Array(24).keys()].map((h) => `<option value="${h}" ${Call.pref('bis', 7) === h ? 'selected' : ''}>${String(h).padStart(2, '0')}:00</option>`).join('')}</select></div>
          <div class="cat" style="padding-left:0">Mikrofon und Lautsprecher</div><button class="btn ghost" data-act="callAudio">${I('speaker', 16)} Geräte wählen</button>`,
        darstellung: `<p class="small muted" style="margin:4px 0 10px">Wähle, wie hell der Messenger aussieht.</p>${THEMES.map(([k, t, d]) => `<div class="row thopt ${themeNow() === k ? 'on' : ''}" data-act="setTheme" data-v="${k}"><span class="thdot th-${k}"></span><div class="main"><div class="title">${t}</div><div class="prev">${d}</div></div>${themeNow() === k ? I('check', 18) : ''}</div>`).join('')}
          <div class="cat" style="padding-left:0;margin-top:14px">Energiesparmodus</div><p class="small muted" style="margin:0 0 8px">Spart Strom: ohne Glas-Unschärfe und Animationen, der Messenger sieht seltener im Hintergrund nach. Nachrichten kommen trotzdem sofort an.</p>
          ${ECO.map(([k, t, d]) => `<div class="row thopt ${ecoMode() === k ? 'on' : ''}" data-act="setEco" data-v="${k}"><div class="main"><div class="title">${t}${k === 'auto' && ecoOn() ? ' · gerade an' : ''}</div><div class="prev">${d}</div></div>${ecoMode() === k ? I('check', 18) : ''}</div>`).join('')}`,
        pc: `<label class="small chk"><input type="checkbox" id="setBg"> <span>Beim Schließen im Infobereich weiterlaufen (Nachrichten und Anrufe kommen weiter an)</span></label>
          ${S.msstore ? '' : `          <label class="small chk"><input type="checkbox" id="setAuto"> <span>Mit Windows starten (unsichtbar im Hintergrund)</span></label>
`}
          ${S.msstore ? '<p class="small muted">Updates kommen automatisch über den Microsoft Store.</p>' : `          <label class="small chk"><input type="checkbox" id="setUpd" ${localStorage.getItem('zm-update') !== '0' ? 'checked' : ''}> <span>Beim Start nach Updates suchen ${S.appVersion ? '(installiert: ' + esc(S.appVersion) + ')' : ''}</span></label>${root.ZMAutoUpd ? root.ZMAutoUpd.settingsHtml() : ''}`}`,
        plus: '<div id="zpPage"></div>',          // Zunora Plus (gemeinsam: zplus.js; Messenger-Teil: zm/plus.js)
        hilfe: `<div class="cat" style="padding-left:0">Impressum</div><div id="impressum" class="small">Lädt …</div>
          <div class="cat" style="padding-left:0">Datenschutz in Kürze</div>
          <p class="small">Chats, Gruppen, Status, Anrufe, Server-Kanäle sowie Profil- und Gruppenbilder sind Ende-zu-Ende verschlüsselt — nur die Geräte der Teilnehmer können sie lesen, auch Zunora nicht. Öffentlich sind nur Kanäle zum Folgen und Server-Bilder. Keine Werbung, kein Tracking. Ton und Bild von Anrufen gehen direkt zwischen den Geräten. Für das Abo „Zunora Plus“ werden nur Art, Beginn und Ende gespeichert (derzeit kostenlos). Die vollständige Datenschutzerklärung steht im Messenger am Handy unter Einstellungen → Hilfe & Rechtliches.</p>
          <div class="cat" style="padding-left:0">Nutzungsregeln</div>
          <p class="small">Ab 16 Jahren. Nicht erlaubt: Belästigung, Bedrohung, Hassrede, Betrug und Spam, Inhalte, die Kinder gefährden, fremde private Daten verbreiten, Urheberrechtsverletzungen und alles, was gegen Gesetze verstößt. Jede Nachricht und jedes Konto lässt sich melden; bei Verstößen können Konten gesperrt werden.</p>`,
      };
      // Zunora Plus: Funktionen stehen dort, wo sie hingehören — und nur, wenn Plus aktiv ist
      body.konto = root.ZMMore.konto(moreH(), body.konto2); delete body.konto2;
      if (X2()) { body.umfrage = X2().surveyHtml(extraH()); body.chats = X2().typingSettings() + X2().trSettings(extraH()) + body.chats; }
      body.darstellung += root.ZMMore.looks(moreH());
      if (root.ZMStart) { const Z = root.ZMStart; body.darstellung += Z.lookHtml(aH()); body.chats += Z.disappearHtml() + Z.backupHtml(aH()); body.datenschutz += Z.receiptsListHtml(aH()); body.konto += Z.exportHtml(); body.pc += Z.crashHtml(); body.hilfe += Z.legalHtml(); }
      if (root.ZMStart2) body.anrufe += root.ZMStart2.callFxHtml(aH());
      if (root.ZMWish) root.ZMWish.settings(body, aH());          // Wer darf schreiben, Status aus, Plus-Kontrolle, Konto: mehr über dich, Sicherheit, Statistik
      if (root.ZMDesign) root.ZMDesign.settings(body);          // Seiten „Alles größer & einfacher" und „Design & Animationen"
      if (root.ZMChat2) root.ZMChat2.settings(body);          // KI an/aus, Sprache → Text, Ordner, Gerät umbenennen
      body.darstellung += '<div id="zpDarst"></div>'; body.chats += '<div id="zpChats"></div>'; body.datenschutz += '<div id="zpPriv"></div>';
      el.innerHTML = head + `<div class="scroll" style="padding:0 16px">${body[p] !== undefined ? body[p] : body['']}</div>`;
      el.querySelectorAll('[data-setpage]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); if (b.dataset.setpage === 'anleitung') { if (X2()) X2().tour(extraH(), true); return; } settingsPage = b.dataset.setpage; renderList(); });
      if (p === 'umfrage' && X2()) X2().wireSurvey(el, extraH());
      if (p === 'chats' && X2()) { X2().wireTrSettings(el, extraH()); X2().wireTypingSettings(el, { renderAll }); }
      if (p === 'konto') root.ZMMore.wireKonto(el, moreH());
      if (p === 'datenschutz') root.ZMMore.wirePrivacy(el, moreH());
      if (p === 'startseite') root.ZMMore.wireStart(el, moreH());
      if (p === 'darstellung') root.ZMMore.wireLooks(el, moreH());
      if (root.ZMDesign) root.ZMDesign.wire(el, p, aH());
      if (root.ZMChat2) root.ZMChat2.wireSettings(el, p, aH());
      if (root.ZMStart) root.ZMStart.wireSettings(el, p, aH(), (k) => { settingsPage = k; renderList(); });
      // Anrufe: Ruhezeiten
      const sq = $('#setQuiet'), qf = $('#setQFrom'), qt = $('#setQTo');
      if (sq) { const saveQ = () => { Call.setPref('ruhe', sq.checked); Call.setPref('von', +qf.value); Call.setPref('bis', +qt.value); }; sq.onchange = saveQ; qf.onchange = saveQ; qt.onchange = saveQ; }
      const zp = $('#zpPage');
      if (zp && root.ZPlus && !zp.childElementCount) { const draw = () => root.ZPlus.render(zp, { inSettings: true, places: root.ZMPlus.PLACES }); draw(); }
      [['#zpDarst', ['colors', 'bg'], () => root.ZMPlus.navSetting()], ['#zpChats', [], () => root.ZMPlus.chatSettings()], ['#zpPriv', ['lock'], null]].forEach(([sel, only, extra]) => {
        const box = $(sel); if (!box || !root.ZPlus || !root.ZMPlus) return;
        const draw = () => root.ZPlus.render(box, { only, extra, wire: (x) => root.ZMPlus.wire(x, draw, navEditDlg) }); draw(); });
      const on = (sel, ev, fn) => { const x = $(sel); if (x) x[ev] = fn; };
      if (root.Host && root.Host.available) {
        if ($('#setBg')) root.Host.call('bg.get').then((b) => { const x = $('#setBg'), y = $('#setAuto'); if (x) x.checked = !!b.hintergrund; if (y) y.checked = !!b.autostart; }).catch(() => { });
        on('#setBg', 'onchange', (e) => tryDo(async () => { await root.Host.call('bg.set', { hintergrund: e.target.checked }); toast(e.target.checked ? '✓ Läuft beim Schließen im Infobereich weiter' : 'Schließen beendet den Messenger jetzt ganz'); }));
        on('#setAuto', 'onchange', (e) => tryDo(async () => { const b = await root.Host.call('bg.set', { autostart: e.target.checked }); e.target.checked = !!b.autostart; toast(b.autostart ? '✓ Startet mit Windows im Hintergrund' : 'Startet nicht mehr mit Windows'); }));
      } else { ['#setBg', '#setAuto'].forEach((id) => { const x = $(id); if (x) x.closest('label').classList.add('hidden'); }); }
      if (root.ZMAutoUpd) { root.ZMAutoUpd.wire(document); root.ZMAutoUpd.onChange = () => { if (view === 'settings') renderList(); }; }
      on('#setUpd', 'onchange', (e) => { localStorage.setItem('zm-update', e.target.checked ? '1' : '0'); if (e.target.checked) checkUpdate(true); else { S.update = null; renderAll(); } });
      const priv = (id, field, yes, no) => on(id, 'onchange', (e) => tryDo(async () => { await S.setPrivacy(field, e.target.checked); toast(e.target.checked ? yes : no); }));
      priv('#setReceipts', 'read_receipts', '✓ Lesebestätigungen an', 'Lesebestätigungen aus — andere sehen nur „zugestellt“');
      priv('#setLastSeen', 'show_last_seen', '✓ „Zuletzt online“ wird gezeigt', '„Zuletzt online“ ist verborgen');
      priv('#setOnline', 'show_online', '✓ Online-Status wird gezeigt', 'Online-Status ist verborgen');
      on('#setPreview', 'onchange', (e) => { S.showText = e.target.checked; toast(e.target.checked ? '✓ Meldungen zeigen den Text' : 'Meldungen zeigen nur „Neue Nachricht“'); });
      on('#setUnameGo', 'onclick', () => tryDo(async () => { const n = await S.changeUsername($('#setUname').value); toast('✓ Dein Nutzername ist jetzt @' + n); renderList(); }));
      on('#pwGo', 'onclick', () => { const a = $('#pwOld').value, b = $('#pwNew').value, c2 = $('#pwNew2').value; if (b !== c2) return toast('Die neuen Passwörter sind verschieden.', true);
        tryDo(async () => { await S.changePassword(a, b); $('#pwOld').value = $('#pwNew').value = $('#pwNew2').value = ''; toast('✓ Passwort geändert — gilt ab jetzt überall'); }); });
      document.querySelectorAll('[data-unblock]').forEach((b) => b.onclick = () => tryDo(async () => { await S.unblock(b.dataset.unblock); renderList(); }));
      if ($('#devList')) S.myDevices().then((list) => { const d = $('#devList'); if (!d) return;
        const others = list.filter((x) => !x.revoked && x.id !== S.deviceId); const ro = $('#revokeOthers'); if (ro) { ro.classList.toggle('hidden', others.length < 2); ro.dataset.ids = others.map((x) => x.id).join(','); }
        d.innerHTML = list.map((x) => `<div class="row" style="padding:6px 0"><span style="font-size:20px">${x.platform === 'pc' ? '💻' : '📱'}</span><div class="main"><div class="title" style="font-weight:500">${esc(x.name)}${x.id === S.deviceId ? ' · dieses Gerät' : ''}</div><div class="prev">${x.revoked ? 'abgemeldet' : 'zuletzt ' + clock(Date.parse(x.last_seen))}</div></div>${!x.revoked && x.id !== S.deviceId ? `<button class="link" data-revoke="${esc(x.id)}">Abmelden</button>` : ''}</div>`).join(''); }).catch(() => { });
      if ($('#impressum')) fetch('zm/anbieter.json', { cache: 'no-store' }).then((r) => r.ok ? r.json() : {}).catch(() => ({})).then((a) => { const x = $('#impressum'); if (!x) return;
        x.innerHTML = a && a.name && a.address ? `<b>${esc(a.name)}</b><br>${esc(a.address).replace(/\n/g, '<br>')}<br>E-Mail: ${esc(a.email || '')}${a.phone ? '<br>Telefon: ' + esc(a.phone) : ''}` : '⚠️ Die Angaben zum Anbieter fehlen noch.'; });
    }
  }

  // ---------------------------------------------------------------------- Rechts: Gespräch
  /** ohne Internet keine roten Fehlermeldungen beim Laden — der Hinweis über dem Eingabefeld reicht */
  const quiet = (e) => !!(root.ZM.Offline && root.ZM.Offline.isOffline(e));
  root.addEventListener('online', () => schedule('online'));
  // Fenster wieder vorn (z. B. aus dem Infobereich geholt): Verpasstes nachholen — neue Chats, Freunde, Status
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.catchUp) S.catchUp(); });
  root.addEventListener('focus', () => { if (S.catchUp) S.catchUp(); });
  // Sicherheitsnetz: offener Chat holt alle 20 s still das Neueste (falls die Live-Verbindung etwas verpasst hat)
  let pollTick = 0;
  setInterval(() => { pollTick++; if (ecoOn() && pollTick % 3) return;          // Energiesparmodus: nur jede Minute
    if (S.openChat && document.visibilityState === 'visible' && Api.loggedIn && !S.offlineStart) S.loadMessages(S.openChat).catch(() => { });
    // verschlüsselte Kanal-Nachrichten ohne Schlüssel: nachsehen, ob er inzwischen da ist
    if (view === 'server' && S.openChannel && S.retryLocked && document.visibilityState === 'visible' && Api.loggedIn) S.retryLocked(S.openChannel).catch(() => { }); }, 20000);
  root.addEventListener('offline', () => schedule('online'));
  let mainKey = '';
  function renderMain() {
    const el = $('#main'); if (!el) return;
    let key = 'leer:' + view;
    if (view === 'chats' && S.openChat && S.chats.get(S.openChat)) key = 'chat:' + S.openChat;
    if (key.startsWith('chat:') && X2() && X2().isLocked(S.openChat) && !X2().unlocked()) {
      if (mainKey !== 'lock:' + S.openChat) {
        mainKey = 'lock:' + S.openChat;
        el.innerHTML = `<div class="empty"><div class="big">${I('lock', 44)}</div><b>Dieser Chat ist gesperrt</b><span>Mit deiner Chat-PIN öffnen.</span><button class="btn" id="unlockChat" style="margin-top:12px">Entsperren</button></div>`;
        $('#unlockChat').onclick = () => X2().askPin(extraH(), 'Chat entsperren', () => { mainKey = ''; renderAll(); });
      }
      return;
    }
    if (view === 'server' && root.ZMA && S.Follow && S.Follow.showing) {          // Kanäle zum Folgen: eigene Ansicht
      if (mainKey !== 'follow') { mainKey = 'follow'; root.ZMA.resetMain(); el.innerHTML = ''; }
      root.ZMA.followMain(el, aH()); return;
    }
    if (view === 'server' && S.openChannel) key = 'ch:' + S.openChannel + ':' + (S.openThread || '');
    if (key !== mainKey) {
      mainKey = key; replyTo = null; editing = null;
      // Fließender Übergang: neuer Chat/Kanal gleitet herein
      if (!(root.ZLook && root.ZLook.calm)) { el.classList.remove('zm-enter'); void el.offsetWidth; el.classList.add('zm-enter'); if (root.ZMStart) root.ZMStart.animate(el); }
      if (key.startsWith('leer')) { el.innerHTML = `<div class="empty"><div class="big">${view === 'server' ? '🏠' : '💬'}</div><b>Zunora Messenger am PC</b><span>${view === 'server' ? 'Wähle links einen Kanal.' : 'Wähle links einen Chat — oder schreib Freunden ein Hallo.'}</span><span class="small">Dasselbe Konto wie am Handy · Ende-zu-Ende verschlüsselt</span></div>`; return; }
      el.innerHTML = `<div class="head" id="mHead"></div><div id="mSearch" class="searchbar hidden"></div><div class="msgs" id="mList"></div><div id="mBars"></div><div class="composer" id="mComp"></div>`;
      calm($('#mHead')); calm($('#mList')); calm($('#mBars'));
      buildComposer();
      if (key.startsWith('chat:')) { const c0 = S.chats.get(S.openChat); if (c0) S.loadPresence(c0.members.map((m) => m.userId)).catch(() => { }); }
      if (key.startsWith('chat:')) { const id = S.openChat; Live.watchTyping(id); S.loadMessages(id).then(() => S.markRead(id)).catch((e) => { if (!quiet(e)) toast(e.message, true); }); }
      else if (S.openThread) S.loadThread(S.openThread).catch((e) => { if (!quiet(e)) toast(e.message, true); });
      else S.loadChannel(S.openChannel).catch((e) => { if (!quiet(e)) toast(e.message, true); });
      lastCount = -1;
    }
    if (key.startsWith('leer')) return;
    if (key.startsWith('chat:')) renderChat(); else renderChannel();
  }

  let lastCount = -1, lastChat = null;
  /** Ganz nach unten (ohne Gleiten) — und unten bleiben, während Bilder nachladen und die Liste höher wird. */
  function scrollDown(list, n) {
    if (n === lastCount) return; lastCount = n;
    const bottom = () => { list.style.scrollBehavior = 'auto'; list.scrollTop = list.scrollHeight; };
    bottom(); requestAnimationFrame(bottom);
    list.querySelectorAll('img').forEach((img) => { if (!img.complete) img.addEventListener('load', () => { if (list.scrollHeight - list.scrollTop - list.clientHeight < 400) bottom(); }, { once: true }); });
  }

  function renderChat() {
    const c = S.chats.get(S.openChat); if (!c) return;
    if (X2()) X2().applyWall($('#mList'), c.id);
    const ty = S.typing.get(c.id); const typing = ty && Date.now() - ty[1] < 6000 && (!X2() || X2().typingOn());
    const other = !c.group && c.members.find((m) => m.userId !== Api.userId);
    $('#mHead').innerHTML = `<span ${other ? `data-profile="${esc(other.userId)}" style="cursor:pointer" title="Profil ansehen"` : ''}>${cav(c, 's')}</span><div class="t"><b>${esc(c.title)}${pb(otherOf(c))}</b><small>${typing ? (c.group ? esc(S.nameOf(ty[0])) + ' schreibt …' : 'schreibt …') : c.group ? esc(c.members.map((m) => S.nameOf(m.userId)).join(', ')) : (c.self ? '🔒 Nur auf deinen Geräten' : (other && S.presenceLabel(other.userId)) ? presHtml(other.userId) : '🔒 Ende-zu-Ende verschlüsselt')}${c.disappear ? ' · ⏱ verschwindend' : ''}${root.ZMChat2 ? root.ZMChat2.pills(c) : ''}</small></div>
      ${c.members.length <= 8 && !c.self && (!root.ZMChat2 || root.ZMChat2.canCall(c)) ? `<button class="ico" data-act="call" data-video="1" title="Videoanruf">${I("video", 21)}</button><button class="ico" data-act="call" title="Sprachanruf">${I("phone")}</button>` : ''}
      <button class="ico" data-act="chatSearch" title="Im Chat suchen (Strg+F)">${I("search")}</button>
      <button class="ico" data-act="chatMenu" title="Mehr">${I("more")}</button>`;
    const hid = S.hiddenIds();
    if (S.purgeExpired) S.purgeExpired();          // verschwindende Nachrichten: abgelaufene sofort weg
    const list = (S.messages.get(c.id) || []).filter((m) => !hid.has(m.id));
    const mList = $('#mList');
    if (c.id !== lastChat) { lastChat = c.id; lastCount = -1; }        // anderer Chat geöffnet → immer unten bei den neuesten anfangen
    const atBottom = lastCount < 0 || mList.scrollHeight - mList.scrollTop - mList.clientHeight < 80;
    let lastDay = '';
    if (other && root.ZMStart2) root.ZMStart2.watchKeys(startH(), other.userId);          // geänderte Sicherheitsnummer?
    if (root.ZMWish) root.ZMWish.applyTheme(c, mList);          // Chat-Design (Plus, beide sehen es)
    mList.innerHTML = `${root.ZMWish ? root.ZMWish.requestHtml(aH(), c) : ''}${root.ZMGroups ? root.ZMGroups.pinnedHtml(aH(), c.id) : ''}${list.length >= 15 && S.hasMore(c.id) ? '<button class="link older" data-act="olderChat">⬆ 15 ältere Nachrichten laden</button>' : ''}${other && root.ZMStart2 ? root.ZMStart2.keyBanner(aH(), other.userId) : ''}<div class="e2e-note">🔒 Nachrichten und Anrufe sind Ende-zu-Ende verschlüsselt. Niemand außerhalb dieses Chats kann sie lesen — auch Zunora nicht.</div>` +
      list.map((m) => { const d = new Date(m.at).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }); const day = d !== lastDay ? `<div class="day">${esc(d)}</div>` : ''; lastDay = d; return day + bubble(m, c, list); }).join('') +
      `<div id="tyBub">${X2() ? X2().typingBubble(c, S, { uav, esc }) : ''}</div>`;
    if (atBottom || lastCount < 0) scrollDown(mList, list.length); else lastCount = list.length;
    hydrate(mList);
    bars(root.ZMChat2 ? root.ZMChat2.writeBlock(c) : (c.onlyAdminsSend && !c.admin ? 'Nur Admins können in dieser Gruppe schreiben.' : ''));
  }

  /** Suche im offenen Chat (nur auf diesem PC, der Server kennt den Inhalt nicht). */
  function chatSearch(open) {
    const box = $('#mSearch'); if (!box) return;
    if (open === false || (open === undefined && !box.classList.contains('hidden'))) { box.classList.add('hidden'); box.innerHTML = ''; return; }
    box.classList.remove('hidden');
    box.innerHTML = `<input id="csQ" placeholder="Im Chat suchen …" autocomplete="off"><div class="small muted" id="csInfo"></div><div id="csHits"></div>`;
    const q = $('#csQ'); let t = null;
    const run = async (pages) => {
      const chat = S.openChat; const hits = await S.searchChat(chat, q.value, pages).catch(() => []);
      if (S.openChat !== chat) return;
      $('#csInfo').innerHTML = q.value.trim().length < 2 ? '' : `${hits.length} Treffer · <button class="link" id="csDeep">Ältere Nachrichten mit durchsuchen</button>`;
      const deep = $('#csDeep'); if (deep) deep.onclick = () => run(5);
      $('#csHits').innerHTML = hits.slice().reverse().slice(0, 50).map((m) => `<div class="hit" data-jump="${esc(m.id)}"><b>${esc(S.nameOf(m.sender))}:</b> ${esc(X.snippet(m.content.t || m.content.w || (m.content.media || {}).name, q.value))} <span class="muted">${clock(m.at)}</span></div>`).join('');
    };
    q.oninput = () => { clearTimeout(t); t = setTimeout(() => run(0), 200); };
    q.onkeydown = (e) => { if (e.key === 'Escape') chatSearch(false); };
    q.focus();
  }

  /** Datei: Art, Farbe, Symbol, Endung */
  function fileKind(name) {
    const e = (String(name).split('.').pop() || '').toLowerCase(), E = e.toUpperCase().slice(0, 5);
    const K = [[['pdf'], 'PDF', '#e5484d', '📕'], [['zip', 'rar', '7z', 'gz', 'tar'], 'Archiv', '#f5a524', '🗜'], [['doc', 'docx', 'odt', 'rtf', 'txt', 'md'], 'Text', '#3e8ef7', '📝'],
      [['xls', 'xlsx', 'ods', 'csv'], 'Tabelle', '#2fbf71', '📊'], [['ppt', 'pptx', 'odp', 'key'], 'Präsentation', '#ff7a45', '📽'], [['mp3', 'm4a', 'wav', 'ogg', 'flac', 'aac'], 'Audio', '#c04cff', '🎵'],
      [['mp4', 'mov', 'mkv', 'webm', 'avi'], 'Video', '#ff2bd6', '🎬'], [['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'], 'Bild', '#14b8a6', '🖼'], [['apk', 'exe', 'msi'], 'Programm', '#3ddc84', '📦']];
    const k = K.find(([l]) => l.includes(e)); return k ? [k[1], k[2], k[3], E] : ['Datei', '#7a8699', '📄', E];
  }
  function bubble(m, c, list) {
    const c0 = m.content || {};
    if (c0.callLog && !m.deleted) return `<div class="sys">${esc(c0.t)} · ${hm(m.at)}</div>`;
    if (m.kind === 'system') return '<div class="sys">' + esc(S.sysText ? S.sysText(m) : 'Gruppe erstellt') + '</div>';
    const mine = m.sender === Api.userId, ai = m.kind === 'ai';
    const own = m.kind === 'sticker' && !m.deleted && c0.own && c0.media;
    const st = m.kind === 'sticker' && !m.deleted ? X.of(c0) : null;
    if (st || own) {
      const t0 = mine ? S.ticks(m) : -1; const rx0 = Object.entries(m.reactions || {});
      return `<div class="bub sticker-msg ${mine ? 'me' : ''}" data-msg="${esc(m.id)}">
        <div class="acts">${['👍', '❤️', '😂', '🙏'].map((e) => `<button data-react="${e}">${e}</button>`).join('')}<button data-reply title="Antworten">${I("reply", 16)}</button>${root.ZMStart2 && root.ZMStart2.canForward(m) ? '<button data-fwd title="Weiterleiten">' + I('forward', 16) + '</button>' : ''}${mine || c.admin ? '<button data-del title="Für alle löschen">' + I("trash", 16) + '</button>' : ''}${!mine ? '<button data-report title="Melden">' + I("flag", 16) + '</button>' : ''}</div>
        ${c.group && !mine ? `<div class="who" style="color:${COLORS[hash(m.sender) % COLORS.length]}">${esc(S.nameOf(m.sender))}</div>` : ''}
        ${own ? `<img class="own-st" data-ownst="${esc(m.id)}" data-md="${esc(JSON.stringify(c0.media))}" alt="Sticker">` : X.html(st, 128)}<div class="meta">${hm(m.at)}${mine ? `<span class="${t0 === 3 ? 'read' : ''}">${t0 === 0 ? '🕓' : t0 === 1 ? '✓' : '✓✓'}</span>` : ''}</div>
        ${rx0.length ? `<div class="reacts">${rx0.map(([e, who]) => `<span class="${who.has(Api.userId) ? 'mine' : ''}" data-react="${esc(e)}">${esc(e)} ${who.size}</span>`).join('')}</div>` : ''}</div>`;
    }
    const emo = m.kind === 'text' && !m.deleted && !m.problem && !m.replyTo && !c0.status && !c0.fwd && !m.viewOnce ? X.emojiOnly(c0.t) : 0;
    if (emo) {
      const t1 = mine ? S.ticks(m) : -1; const rx1 = Object.entries(m.reactions || {});
      return `<div class="bub sticker-msg emoji-msg ${mine ? 'me' : ''}" data-msg="${esc(m.id)}">
        <div class="acts">${['👍', '❤️', '😂', '🙏'].map((e) => `<button data-react="${e}">${e}</button>`).join('')}<button data-reply title="Antworten">${I("reply", 16)}</button>${root.ZMStart2 && root.ZMStart2.canForward(m) ? '<button data-fwd title="Weiterleiten">' + I('forward', 16) + '</button>' : ''}${mine || c.admin ? '<button data-del title="Für alle löschen">' + I("trash", 16) + '</button>' : ''}</div>
        ${c.group && !mine ? `<div class="who" style="color:${COLORS[hash(m.sender) % COLORS.length]}">${esc(S.nameOf(m.sender))}</div>` : ''}
        <div class="big-emoji e${emo}">${esc(c0.t.trim())}</div><div class="meta">${hm(m.at)}${mine ? `<span class="${t1 === 3 ? 'read' : ''}">${t1 === 0 ? '🕓' : t1 === 1 ? '✓' : '✓✓'}</span>` : ''}</div>
        ${rx1.length ? `<div class="reacts">${rx1.map(([e, who]) => `<span class="${who.has(Api.userId) ? 'mine' : ''}" data-react="${esc(e)}">${esc(e)} ${who.size}</span>`).join('')}</div>` : ''}</div>`;
    }
    const reply = m.replyTo && list.find((x) => x.id === m.replyTo);
    let body = '';
    if (m.deleted) body = '<div class="txt muted">🚫 Diese Nachricht wurde gelöscht</div>';
    else if (m.problem) body = `<div class="txt muted small" data-tr>🔒 ${esc(m.problem)}</div>`;
    else {
      const sx = root.ZMStart2 ? root.ZMStart2.bodyHtml(m, c0, mine, aH()) : '';          // Standort, Live-Standort, Einmal-Sprachnachricht (zm/start2.js)
      if (sx) body += sx;
      const mx = sx ? '' : root.ZMMedia ? root.ZMMedia.bodyHtml(m, c0, mine, mediaH()) : '';      // Einmal-Ansicht, Video, Sprachnachricht (zm/media.js)
      if (mx) body += mx;
      else if (m.kind === 'image' && c0.media && c0.media.album && !m.viewOnce) {
        const al = c0.media.album, grp = (S.messages.get(m.chatId) || []).filter((o) => o.sender === m.sender && o.kind === 'image' && !o.deleted && ((o.content || {}).media || {}).album && o.content.media.album.id === al.id).sort((a, b) => a.content.media.album.i - b.content.media.album.i);
        if (grp.length > 1 && grp[0].id !== m.id) return '';          // Album: nur das erste Foto zeigt das ganze Raster
        const sh = grp.slice(0, 4);
        body += grp.length > 1 ? `<div class="album n${sh.length}">${sh.map((o, k) => `<div class="alc">${`<img class="media" data-mid="${esc(o.id)}" data-md="${esc(JSON.stringify(o.content.media))}" ${o.content.media.thumb ? `src="data:image/jpeg;base64,${esc(o.content.media.thumb)}"` : ''} alt="Foto">`}${k === 3 && grp.length > 4 ? `<span class="almore">+${grp.length - 4}</span>` : ''}</div>`).join('')}</div><div class="small muted">${grp.length} ${tr0('Fotos')}</div>`
          : `<img class="media" data-mid="${esc(m.id)}" data-md="${esc(JSON.stringify(c0.media))}" ${c0.media.thumb ? `src="data:image/jpeg;base64,${esc(c0.media.thumb)}"` : ''} alt="Foto">`;
      }
      else if (m.kind === 'image' && c0.media) body += `<img class="media" data-mid="${esc(m.id)}" data-md="${esc(JSON.stringify(c0.media))}" ${c0.media.thumb ? `src="data:image/jpeg;base64,${esc(c0.media.thumb)}"` : ''} alt="Foto">`;
      if (m.kind === 'file' && c0.media) { const fk = fileKind(c0.media.name || ''), sz = c0.media.size || 0;
        body += `<div class="file fcard" data-file="${esc(m.id)}" data-md="${esc(JSON.stringify(c0.media))}" title="${tr0('Klicken zum Speichern')}"><span class="fic" style="background:${fk[1]}">${fk[2]}<b>${esc(fk[3])}</b></span><span class="fmeta"><b>${esc(c0.media.name || 'Datei')}</b><small>${tr0(fk[0])} · ${sz >= 1048576 ? (sz / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(sz / 1024)) + ' KB'} · ${tr0('klicken zum Speichern')}</small></span></div>`; }
      if (!mx && !sx && m.kind === 'voice' && c0.media) body += `<audio controls preload="none" data-audio="${esc(m.id)}" data-md="${esc(JSON.stringify(c0.media))}"></audio>`;
      if (m.kind === 'poll') body += pollHtml(m.id, c0);
      else if (m.kind === 'event') body += eventHtml(m.id, c0);
      else if (c0.t) body += `<div class="txt">${highlight(c0.t)}</div>`;
      if (m.kind === 'text' && c0.lp && root.ZMLinks) body += root.ZMLinks.card(c0.lp);          // Link-Vorschau (vom Absender, verschlüsselt mitgeschickt)
      if (c0.t && X2()) body += X2().trLine(m, esc);
    }
    if (root.ZMChat2 && m.viewOnce && !m.deleted && !m.problem && (m.kind === 'text' || ((m.content || {}).snap && m.kind !== 'image' && m.kind !== 'video'))) body = root.ZMChat2.onceTextHtml(m, mine);          // Text als Einmal-Ansicht
    const t = mine ? S.ticks(m) : -1;
    const rx = Object.entries(m.reactions || {});
    return `<div class="bub ${mine ? 'me' : ''} ${ai ? 'ai' : ''}" data-msg="${esc(m.id)}">
      <div class="acts">${['👍', '❤️', '😂', '🙏'].map((e) => `<button data-react="${e}">${e}</button>`).join('')}<button data-reply title="Antworten">${I("reply", 16)}</button>${root.ZMStart2 && root.ZMStart2.canForward(m) ? '<button data-fwd title="Weiterleiten">' + I('forward', 16) + '</button>' : ''}${X2() && X2().trOn() && c0.t && !m.deleted ? '<button data-trmsg title="Übersetzen">🌐</button>' : ''}${mine && m.kind === 'text' && Date.now() - m.at < (root.ZPlus && root.ZPlus.active() ? 86400000 : 43200000) ? '<button data-edit title="Bearbeiten">' + I("edit", 16) + '</button>' : ''}${!m.deleted && ((mine && Date.now() - m.at < (root.ZPlus && root.ZPlus.active() ? 72 : 24) * 3600000) || c.admin) ? '<button data-del title="Für alle löschen">' + I("trash", 16) + '</button>' : ''}${!mine ? '<button data-report title="Melden">' + I("flag", 16) + '</button>' : ''}</div>
      ${c.group && !mine && !ai ? `<div class="who" style="color:${COLORS[hash(m.sender) % COLORS.length]}">${esc(S.nameOf(m.sender))}</div>` : ''}
      ${ai ? `<div class="who" style="color:var(--accent)">✨ Zunora AI${c0.asked ? ' · für ' + esc(c0.asked) : ''}</div>` : ''}
      ${root.ZMStart2 && !m.deleted ? root.ZMStart2.fwLabel(c0) : ''}
      ${reply ? `<div class="reply"><b>${esc(S.nameOf(reply.sender))}</b><br>${esc(S.preview(reply))}</div>` : ''}
      ${c0.status && !m.deleted ? `<div class="reply"><b>${c0.status.u === Api.userId ? 'Dein Status' : 'Status von ' + esc(S.nameOf(c0.status.u))}</b><br>${esc(c0.status.p || 'Status')}</div>` : ''}
      ${body}
      ${m.check === 'BAD_SIGNATURE' ? '<div class="small" style="color:var(--bad)">⚠ Absender nicht bestätigt</div>' : ''}
      ${m.failed ? `<div class="small" style="color:var(--bad)">⚠ ${esc(m.failed)}</div>` : ''}
      <div class="meta">${m.pinned ? '📌' : ''}${m.edited && !m.deleted ? 'bearbeitet ·' : ''}${hm(m.at)}${mine && !m.failed ? `<span class="${t === 3 ? 'read' : ''}" title="${m.waiting ? 'Wartet auf Internet — geht automatisch raus' : ''}">${t === 0 ? '🕓' : t === 1 ? '✓' : '✓✓'}</span>` : ''}</div>
      ${rx.length ? `<div class="reacts">${rx.map(([e, who]) => `<span class="${who.has(Api.userId) ? 'mine' : ''}" data-react="${esc(e)}">${esc(e)} ${who.size}</span>`).join('')}</div>` : ''}
    </div>`;
  }

  function pollHtml(mid, c) {
    if (!S.votes.has(mid)) { S.votes.set(mid, {}); S.loadVotes(mid).catch(() => { }); }
    const v = S.votes.get(mid) || {}; const total = new Set(Object.values(v).flatMap((s) => [...s])).size;
    return `<div class="poll"><b>📊 ${esc(c.t)}</b><div class="small muted">${c.multi ? 'Mehrere Antworten möglich' : 'Eine Antwort'}</div>` +
      (c.options || []).map((o, i) => { const who = v[i] || new Set(); const share = total ? Math.round(who.size * 100 / total) : 0;
        return `<div class="opt" data-vote="${esc(mid)}" data-opt="${i}" data-multi="${c.multi ? 1 : 0}"><div class="bar" style="width:${share}%"></div><div class="lab"><span>${who.has(Api.userId) ? '✓ ' : ''}${esc(o)}</span><span>${who.size}</span></div></div>`; }).join('') +
      `<div class="small muted">${total} ${total === 1 ? 'Person hat' : 'Personen haben'} abgestimmt</div></div>`;
  }
  function eventHtml(mid, c) {
    if (!S.rsvps.has(mid)) { S.rsvps.set(mid, new Map()); S.loadRsvps(mid).catch(() => { }); }
    const r = S.rsvps.get(mid) || new Map(); const mine = r.get(Api.userId);
    const cnt = (k) => [...r.values()].filter((x) => x === k).length;
    return `<div class="poll"><b>📅 ${esc(c.t)}</b>${c.when ? `<div style="color:var(--accent)">${esc(new Date(c.when).toLocaleString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }))} Uhr</div>` : ''}
      ${c.place ? `<div>📍 ${esc(c.place)}</div>` : ''}${c.about ? `<div class="small muted">${esc(c.about)}</div>` : ''}
      <div class="rsvp">${[['yes', '✅ Dabei'], ['maybe', '🤔 Vielleicht'], ['no', '❌ Nein']].map(([k, l]) => `<button class="${mine === k ? 'on' : ''}" data-rsvp="${esc(mid)}" data-a="${k}">${l} ${cnt(k)}</button>`).join('')}</div></div>`;
  }

  /** Bilder/Sprachnachrichten nachladen (entschlüsselt, im Speicher dieses Fensters). */
  function aH() { return { esc, I, S, Api, toast, tryDo, dlg, closeDlg, renderAll, renderList, renderMain, av, cav, uav, clock, zConfirm }; }          // Ausbau: Ordner, Planen, Kanäle zum Folgen (zm/ausbau-ui.js)
  function extraH() { return { esc, I, S, Api, toast, tryDo, dlg, closeDlg, renderAll, renderList, uav, av }; }
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-trmsg]'); if (!b || !X2()) return; e.stopPropagation();
    const id = (b.closest('[data-msg]') || {}).dataset?.msg; const m = (S.messages.get(S.openChat) || []).find((x) => x.id === id); if (m) X2().translate(m, extraH()); }, true);
  function mediaH() { return { esc, I, S, Api, toast, tryDo, renderAll, uav, cur: () => (view === 'chats' ? S.openChat : null), open: (id) => { view = 'chats'; S.openChat = id; renderAll(); } }; }
  function hydrate(root0) {
    if (root.ZMMedia) root.ZMMedia.hydrate(root0, mediaH());
    root0.querySelectorAll('img[data-ownst]').forEach((im) => { if (im.dataset.w) return; im.dataset.w = '1';
      S.mediaUrl(im.dataset.ownst, JSON.parse(im.dataset.md)).then((u) => { im.src = u; }).catch(() => { im.replaceWith(Object.assign(document.createElement('div'), { className: 'big-emoji e1', textContent: '🖼' })); }); });
    // iPhone-Web-App „Internet sparen": Bilder erst beim Antippen laden (root.ZM.mediaGate)
    const gate = (el, go) => (root.ZM && root.ZM.mediaGate) ? root.ZM.mediaGate(el, go) : go();
    root0.querySelectorAll('img[data-mid]').forEach((img) => { if (img.dataset.done) return; img.dataset.done = '1';
      gate(img, () => S.mediaUrl(img.dataset.mid, JSON.parse(img.dataset.md)).then((u) => { img.src = u; }).catch(() => { })); });
    root0.querySelectorAll('audio[data-audio]').forEach((a) => { if (a.dataset.done) return; a.dataset.done = '1';
      S.mediaUrl(a.dataset.audio, JSON.parse(a.dataset.md)).then((u) => { a.src = u; }).catch(() => { }); });
  }

  function renderChannel() {
    const c = S.channel(S.openChannel); if (!c) return;
    const icon = I({ announcement: "megaphone", forum: "forum" }[c.kind] || "hash", 20);
    const thread = S.openThread;
    const start = thread && S.findCh(thread);
    $('#mHead').innerHTML = thread
      ? `<button class="ico" data-act="closeThread">${I("back")}</button><div class="t"><b>🧵 ${esc((start && (start.threadTitle || start.content.t || '').slice(0, 80)) || 'Thread')}</b><small>in ${icon} ${esc(c.name)}</small></div>`
      : `<span style="font-size:22px;color:var(--sub)">${icon}</span><div class="t"><b>${esc(c.name)}</b><small>${esc(c.topic || (S.servers.get(c.server_id) || {}).name || '')}${c.slowmode_seconds ? ' · 🐢 ' + c.slowmode_seconds + ' s' : ''}${c.ai_mode === 'off' ? ' · ✨ KI aus' : ''}</small></div>
        ${S.can(c.server_id, 1) ? '<button class="ico" data-act="channelSettings" title="Kanal-Einstellungen">' + I("settings") + '</button>' : ''}`;
    const mList = $('#mList');
    const atBottom = mList.scrollHeight - mList.scrollTop - mList.clientHeight < 80;
    if (!thread && c.kind === 'forum') {
      const posts = (S.chMessages.get(c.id) || []).filter((m) => m.threadTitle && !m.deleted).sort((a, b) => Math.max(b.at, b.lastReply) - Math.max(a.at, a.lastReply));
      mList.innerHTML = `<button class="btn" data-act="newPost" style="align-self:flex-start;margin:6px 16px">＋ Neuer Beitrag</button>` +
        posts.map((p) => `<div class="post" data-thread="${esc(p.id)}"><b>${esc(p.threadTitle)}</b>${p.content.t ? `<div class="muted small">${esc(p.content.t.slice(0, 220))}</div>` : ''}<div class="small muted" style="margin-top:6px">${esc(S.nameIn(c.server_id, p.sender))} · 💬 ${p.replies} · ${clock(Math.max(p.at, p.lastReply))}</div></div>`).join('') ||
        '<div class="empty">Noch keine Beiträge. Starte die erste Unterhaltung!</div>';
      bars(''); $('#mComp').classList.add('hidden'); return;
    }
    $('#mComp').classList.remove('hidden');
    const list = thread ? [start, ...(S.threads.get(thread) || [])].filter(Boolean) : (S.chMessages.get(c.id) || []);
    mList.innerHTML = (!thread && list.length >= 15 && S.hasMore(c.id) ? '<button class="link older" data-act="olderChannel">⬆ 15 ältere Nachrichten laden</button>' : '') + (!thread && !list.length ? `<div class="empty"><b>Willkommen in ${icon} ${esc(c.name)}!</b>Das ist der Anfang dieses Kanals.</div>` : '') +
      list.map((m, i) => cmsg(c, m, list[i - 1], thread && i === 0)).join('');
    if (atBottom || lastCount < 0) scrollDown(mList, list.length); else lastCount = list.length;
    hydrateCh(mList);
    const to = S.myTimeout(c.server_id);
    bars(to ? `⏸ Du hast in diesem Server eine Auszeit bis ${new Date(to).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} — lesen geht, schreiben nicht.`
      : c.kind === 'announcement' && !thread && !S.can(c.server_id, 4) ? '📢 In Ankündigungen schreiben nur Moderatoren. Antworten kannst du in Threads.' : '');
  }
  function cmsg(c, m, prev, isRoot) {
    if (m.kind === 'system') {
      const wt = (S.servers.get(c.server_id) || {}).welcomeText || '';
      const txt = m.content.t === 'server-created' ? '🎉 ' + esc(S.nameIn(c.server_id, m.sender)) + ' hat den Server erstellt.'
        : m.content.t === 'member-joined' ? '👋 ' + esc(S.nameIn(c.server_id, m.sender)) + ' ist dem Server beigetreten.' + (wt ? '<br>' + esc(wt) : '') : '🎉 ' + esc(m.content.t);
      return `<div class="sys" style="align-self:flex-start;margin-left:16px">${txt}</div>`;
    }
    const ai = m.kind === 'ai';
    const compact = prev && prev.sender === m.sender && m.at - prev.at < 300000 && prev.kind !== 'system' && !ai && prev.kind !== 'ai' && !isRoot;
    const name = ai ? 'Zunora AI' : S.nameIn(c.server_id, m.sender);
    const col = ai ? 'var(--accent)' : S.colorOf(c.server_id, m.sender) || 'var(--text)';
    const mine = m.sender === Api.userId, mod = S.can(c.server_id, 4);
    let body = '';
    if (m.deleted) body = '<div class="txt muted">🚫 Nachricht gelöscht</div>';
    else {
      const md = m.content.media;
      if (m.kind === 'image' && md) body += `<img class="media" style="max-width:340px;border-radius:8px;display:block;margin-top:4px" data-cmid="${esc(m.id)}" data-md="${esc(JSON.stringify(md))}" ${md.thumb ? `src="data:image/jpeg;base64,${esc(md.thumb)}"` : ''}>`;
      if (m.kind === 'file' && md) body += `<div class="file" style="background:var(--panel);padding:8px;border-radius:8px;cursor:pointer;display:inline-block" data-cfile="${esc(m.id)}" data-md="${esc(JSON.stringify(md))}">📄 ${esc(md.name || 'Datei')}</div>`;
      if (m.kind === 'poll') body += pollHtml(m.id, m.content); else if (m.kind === 'event') body += eventHtml(m.id, m.content);
      else if (m.content.t) body += `<div class="txt">${root.ZMBoost ? root.ZMBoost.emojify(c.server_id, highlight(m.content.t)) : highlight(m.content.t)}</div>`;
      if (m.kind === 'text' && m.content.lp && root.ZMLinks) body += root.ZMLinks.card(m.content.lp);
    }
    const rx = Object.entries(m.reactions || {});
    return `<div class="cmsg ${compact ? 'compact' : ''}" data-cmsg="${esc(m.id)}" style="${isRoot ? 'background:#14b8a610' : m.pinned ? 'background:#ffc10712' : ''}${compact ? '' : ';margin-top:10px'}">
      <div class="side">${compact ? `<div class="tm">${hm(m.at)}</div>` : ai ? '<div class="av s ai"></div>' : `<span ${m.sender !== Api.userId ? `data-profile="${esc(m.sender)}" style="cursor:pointer"` : ''}>${av(name, 's', false, S.userPic(m.sender))}</span>`}</div>
      <div style="flex:1;min-width:0">${compact ? '' : `<div class="name" style="color:${esc(col)}"><span style="${root.ZMBoost && !ai ? root.ZMBoost.gradient(c.server_id, m.sender) : ''}">${esc(name)}</span>${(S.servers.get(c.server_id) || {}).owner === m.sender && !ai ? ' 👑' : ''}<small>${clock(m.at)}${clock(m.at).length > 5 ? '' : ''}</small></div>`}
        ${body}${m.edited && !m.deleted ? '<span class="small muted">(bearbeitet)</span>' : ''}${m.waiting ? '<div class="small muted">🕓 wird gesendet, sobald Internet da ist</div>' : ''}${m.failed ? `<div class="small" style="color:var(--bad)">⚠ ${esc(m.failed)}</div>` : ''}
        ${rx.length ? `<div class="reacts">${rx.map(([e, who]) => `<span class="${who.has(Api.userId) ? 'mine' : ''}" data-creact="${esc(e)}">${esc(e)} ${who.size}</span>`).join('')}</div>` : ''}
        ${!m.thread && !isRoot && m.replies ? `<div class="thr" data-thread="${esc(m.id)}">🧵 ${m.replies} Antworten · ${clock(m.lastReply)}</div>` : ''}</div>
      <div class="acts">${['👍', '❤️', '😂', '🔥'].map((e) => `<button data-creact="${e}">${e}</button>`).join('')}${!m.thread && !isRoot && !m.deleted ? `<button data-thread="${esc(m.id)}" title="Thread">${I("chat", 16)}</button>` : ''}${(mine || mod) && !m.deleted ? '<button data-cdel title="Löschen">' + I("trash", 16) + '</button>' : ''}${mod && !m.deleted ? '<button data-cpin title="Anheften">' + I("pin", 16) + '</button>' : ''}${!mine ? '<button data-creport title="Melden">' + I("flag", 16) + '</button>' : ''}</div>
    </div>`;
  }
  function hydrateCh(r0) {
    r0.querySelectorAll('img[data-cmid]').forEach((img) => { if (img.dataset.done) return; img.dataset.done = '1';
      const go = () => S.mediaUrl(img.dataset.cmid, JSON.parse(img.dataset.md), 'server-media').then((u) => { img.src = u; }).catch(() => { });
      if (root.ZM && root.ZM.mediaGate) root.ZM.mediaGate(img, go); else go(); });
  }

  function bars(note) {
    const b = $('#mBars'); if (!b) return;
    let h = '';
    const waiting = root.ZM.Offline ? root.ZM.Offline.Outbox.count : 0;
    const off = !navigator.onLine || S.offlineStart || (!S.online && waiting > 0);
    if (off) h += `<div class="offbar">${I('clock', 14)} Kein Internet — du kannst trotzdem schreiben. Nachrichten warten und gehen raus, sobald wieder Internet da ist.</div>`;
    else if (waiting) h += `<div class="offbar">${I('send', 14)} ${waiting === 1 ? 'Eine Nachricht wird' : waiting + ' Nachrichten werden'} gerade nachgesendet …</div>`;
    if (S.status) h +=`<div class="errbar" data-act="clearErr">${esc(S.status)}</div>`;
    if (replyTo || editing) h += `<div class="replybar">${editing ? '✏️ Nachricht bearbeiten' : `↩ Antwort an <b>${esc(S.nameOf(replyTo.sender))}</b>: ${esc(S.preview(replyTo))}`}<button class="ico x" data-act="cancelReply">✕</button></div>`;
    if (note) h += `<div class="replybar muted">${esc(note)}</div>`;
    if (mainKey.startsWith('chat:') && root.ZMA) h += root.ZMA.plannedBar(aH(), S.openChat);          // „🕓 2 geplante Nachrichten"
    b.innerHTML = h;
    $('#mComp').classList.toggle('hidden', !!note);
  }

  function buildComposer() {
    const comp = $('#mComp');
    const isChat = mainKey.startsWith('chat:');
    const ch0 = !isChat && S.channel(S.openChannel);
    const aiOn = (!root.ZMChat2 || root.ZMChat2.aiOn()) && (isChat || !ch0 || ch0.ai_mode !== 'off');          // KI lässt sich in den Einstellungen ausschalten
    comp.innerHTML = `<button class="ico" data-act="attach" title="Datei oder Foto senden">${I("attach")}</button><button class="ico" data-act="pollEvent" title="Umfrage oder Termin">${I("poll")}</button>${isChat && root.ZMStart2 ? '<button class="ico" data-act="zLoc" title="' + esc(tr0('Standort senden oder live teilen')) + '">' + I("pin") + '</button>' : ''}${isChat ? '<button class="ico" data-act="stickers" title="Sticker">' + I("sticker") + '</button>' : ''}${isChat && root.ZMA ? '<button class="ico" data-act="plan" title="' + esc(tr0('Später senden (Zunora Plus)')) + '">' + I("clock") + '</button>' : ''}
      <textarea id="mInput" rows="1" placeholder="${isChat ? 'Nachricht' : 'Nachricht an den Kanal'}${aiOn ? ' · @Zunora fragt die KI' : ''}" title="Enter = senden · Umschalt+Enter = neue Zeile"></textarea>${isChat ? `<button class="ico" data-act="voiceRec" title="Sprachnachricht aufnehmen">${I('mic')}</button>` : ''}<button class="send" data-act="send" title="Senden (Enter) · Rechtsklick: Nachricht planen">${I("send", 18)}</button>
      <input type="file" id="mFile" class="hidden" multiple><div id="sendStat" class="sendstat hidden"></div>`;
    const ta = $('#mInput');
    if (isChat) { const chat = S.openChat; ta.value = S.draft(chat); ta._draft = setInterval(() => { if (S.openChat === chat && !editing && $('#mInput') === ta) S.setDraft(chat, ta.value); else clearInterval(ta._draft); }, 800); }
    ta.oninput = () => { ta.style.height = 'auto'; ta.style.height = Math.min(160, ta.scrollHeight) + 'px'; if (isChat && ta.value && (!X2() || X2().typingOn())) { const now = Date.now(); if (!ta._t || now - ta._t > 2500) { ta._t = now; Live.sendTyping(S.openChat); } } };
    ta.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { if (document.querySelector('#mComp .mentbar')) return; e.preventDefault(); send(); } };
    if (isChat && X2()) X2().wireMentions(ta, S.chats.get(S.openChat), extraH());
    $('#mFile').onchange = (e) => { const all = [...e.target.files]; e.target.value = ''; const f = all[0]; if (!f) return;
      if (isChat && all.length > 1) return sendMany(S.openChat, all);          // mehrere → Album/Dateien mit Fortschritt
      // Foto/Video im Chat: erst Vorschau (bearbeiten, Text, Einmal-Ansicht)
      if (isChat && root.ZMMedia && ((f.type.startsWith('image/') && f.type !== 'image/gif') || f.type.startsWith('video/'))) return root.ZMMedia.preview(f, S.openChat, mediaH());
      tryDo(() => (isChat ? S.sendFile(S.openChat, f) : S.sendChannelFile(S.openChannel, f, S.openThread))); };
    setTimeout(() => ta.focus(), 30);
  }

  /** mehrere Fotos/Dateien: Fotos als Album, Fortschritt über der Eingabe */
  function sendMany(chat, files) {
    files = files.slice(0, 30);
    const imgs = files.filter((f) => f.type.startsWith('image/') && f.type !== 'image/gif');
    const go = (original) => tryDo(() => S.sendMany(chat, files, (t) => { const el = $('#sendStat'); if (el) { el.textContent = t; el.classList.toggle('hidden', !t); } }, original));
    if (imgs.length < 2) return go(false);
    dlg(`<h3>${imgs.length} ${tr0('Fotos senden')}</h3><div class="albpick">${imgs.slice(0, 12).map((f) => `<img src="${URL.createObjectURL(f)}" alt="">`).join('')}</div>
      ${files.length > imgs.length ? `<p class="small muted">+ ${files.length - imgs.length} ${tr0('Datei(en)')}</p>` : ''}
      <label class="small chk"><input type="checkbox" id="albOrig"> <span>${tr0('Originalqualität')} — ${tr0('Volle Auflösung (größer, braucht länger). Aus = schneller, kleiner, trotzdem scharf.')}</span></label>
      <p class="small muted">${tr0('Fotos werden auf diesem PC verschlüsselt, bevor sie hochgeladen werden.')}</p>
      <div class="rowb"><button class="btn ghost" data-close>${tr0('Abbrechen')}</button><button class="btn" id="albGo">${tr0('Senden')}</button></div>`, (box) => {
      box.querySelector('[data-close]').onclick = closeDlg;
      box.querySelector('#albGo').onclick = () => { const o = box.querySelector('#albOrig').checked; closeDlg(); go(o); };
    });
  }
  // Fotos/Dateien in den Chat ziehen oder mit Strg+V einfügen
  document.addEventListener('dragover', (e) => { if (view === 'chats' && S.openChat && e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); document.body.classList.add('dropping'); } });
  document.addEventListener('dragleave', (e) => { if (!e.relatedTarget) document.body.classList.remove('dropping'); });
  document.addEventListener('drop', (e) => { document.body.classList.remove('dropping'); if (view !== 'chats' || !S.openChat || !e.dataTransfer || !e.dataTransfer.files.length) return; e.preventDefault();
    const files = [...e.dataTransfer.files]; const f = files[0];
    if (files.length === 1 && root.ZMMedia && ((f.type.startsWith('image/') && f.type !== 'image/gif') || f.type.startsWith('video/'))) root.ZMMedia.preview(f, S.openChat, mediaH()); else sendMany(S.openChat, files); });
  document.addEventListener('paste', (e) => { if (view !== 'chats' || !S.openChat || !e.clipboardData) return; const files = [...e.clipboardData.files]; if (!files.length) return; e.preventDefault();
    const f = files[0]; if (files.length === 1 && root.ZMMedia && f.type.startsWith('image/')) root.ZMMedia.preview(f, S.openChat, mediaH()); else sendMany(S.openChat, files); });

  async function send() {
    const ta = $('#mInput'); const t = ta.value.trim(); if (!t) return;
    if (X2()) { const b = document.querySelector('#mComp .send'); if (b) { const r = b.getBoundingClientRect(); X2().burst(r.left + r.width / 2, r.top + r.height / 2); } }
    ta.value = ''; ta.style.height = 'auto';
    const ed = editing, rp = replyTo; editing = null; replyTo = null; bars('');
    if (mainKey.startsWith('chat:')) {
      const chat = S.openChat;
      if (!ed) S.setDraft(chat, '');
      await tryDo(async () => {
        if (ed) await S.edit(ed, t);
        else { const c1 = S.chats.get(chat), ment = c1 && c1.group && X2() ? X2().collectMentions(t, c1, S, Api) : null;
          await S.send(chat, 'text', ment ? { t, mentions: ment } : { t }, rp && rp.id); if (S.wantsAi(t)) await S.askAiChat(chat, t); }
      });
    } else {
      const ch = S.openChannel, th = S.openThread; const c0 = S.channel(ch);
      await tryDo(async () => { await S.sendChannel(ch, { t }, 'text', th); if (S.wantsAi(t) && (!c0 || c0.ai_mode !== 'off')) await S.askAiChannel(ch, t, th); });
    }
  }

  // ====================================================================== Anruf
  function renderCall() {
    const bar = $('#callbar'), rootEl = $('#callroot'); if (!rootEl) return;
    const inc = Call.incoming;
    const title = Call.guestTitle || (Call.chatId ? (S.chats.get(Call.chatId) || {}).title : Call.channelId ? '🔊 ' + ((S.channel(Call.channelId) || {}).name || '') : '');
    renderVoicemail();
    bar.innerHTML = Call.callId && Call.minimized ? `<div class="callbar" data-act="callMax">${I("phone", 16)} ${esc(title)}${Call.startedAt ? ' · ' + dur() : ''}<span style="flex:1"></span><span data-act="mute">${I(Call.muted ? "micoff" : "mic", 18)}</span><span data-act="hangup">${I("hangup", 18)}</span></div>` : '';
    if (inc) {
      const c = S.chats.get(inc.chat) || {};
      rootEl.innerHTML = `<div class="ring"><div style="display:flex;gap:12px;align-items:center">${c.id ? cav(c) : uav(inc.from)}<div><b>${esc(c.group ? c.title : S.nameOf(inc.from))}</b><div class="muted small">${inc.guest ? 'lädt dich in einen Anruf ein …' : (inc.video ? 'Videoanruf' : 'Sprachanruf') + ' von ' + esc(S.nameOf(inc.from)) + ' …'}</div></div></div>
        <div class="quick">${(Call.QUICK || []).map((q, i) => `<button class="chip" data-quick="${i}">${esc(q)}</button>`).join('')}</div>
        <div class="rowb" style="display:flex;gap:8px;margin-top:14px"><button class="btn danger" data-act="decline">Ablehnen</button>${inc.video ? '<button class="btn ghost" data-act="acceptAudio">Nur Ton</button>' : ''}<button class="btn" data-act="accept">Annehmen</button></div></div>`;
      rootEl.querySelectorAll('[data-quick]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); tryDo(() => Call.declineWith(Call.QUICK[+b.dataset.quick])); });
      return;
    }
    if (!Call.callId || Call.minimized) { rootEl.innerHTML = ''; return; }
    let call = $('#callScreen');
    if (!call) { rootEl.innerHTML = `<div class="call" id="callScreen"><div class="top"><button class="ico" data-act="callMin" style="color:#fff">⌄</button><div><b id="callTitle"></b><div class="small" id="callSub" style="opacity:.7"></div></div></div><div class="grid" id="callGrid"></div><div class="self hidden" id="callSelf"><video autoplay muted playsinline></video></div><div class="bar" id="callBar"></div></div>`; call = $('#callScreen'); }
    $('#callTitle').textContent = title || 'Anruf';
    const ql = ['', '▂ Verbindung schwach', '▂▄ Verbindung mittel', '▂▄▆ Verbindung gut'][Call.quality || 0];
    $('#callSub').textContent = (ql ? ql + ' · ' : '') + (Call.status || (Call.reconnecting ? '⟳ Verbindung wird wiederhergestellt …' : Call.startedAt ? dur() + (Call.chatId ? ' · 🔒 verschlüsselt' : '') + (Call.sharing ? ' · 🖥 du teilst deinen Bildschirm' : '') : Call.remotes.size ? 'Verbinde …' : Call.chatId ? 'Klingelt …' : 'Du bist allein im Kanal'));
    const grid = $('#callGrid');
    const keys = [...Call.remotes.keys()];
    grid.querySelectorAll('[data-tile]').forEach((t) => { if (!Call.remotes.has(t.dataset.tile)) t.remove(); });
    if (!keys.length && !grid.querySelector('.wait')) grid.innerHTML = `<div class="tile wait">${av(title || '?', '')}</div>`;
    if (keys.length) grid.querySelectorAll('.wait').forEach((x) => x.remove());
    keys.forEach((k) => {
      const r = Call.remotes.get(k);
      let tile = grid.querySelector(`[data-tile="${CSS.escape(k)}"]`);
      if (!tile) { tile = document.createElement('div'); tile.className = 'tile'; tile.dataset.tile = k; tile.innerHTML = `${uav(r.user)}<video autoplay playsinline class="hidden"></video><div class="nm"></div>`; grid.appendChild(tile); }
      const v = tile.querySelector('video');
      if (v.srcObject !== r.stream) v.srcObject = r.stream;
      Call.applySpeaker(v);
      const hasVideo = r.stream.getVideoTracks().length > 0;
      v.classList.toggle('hidden', !hasVideo); tile.querySelector('.av').classList.toggle('hidden', hasVideo);
      tile.querySelector('.nm').textContent = (r.connected ? '' : '⏳ ') + S.nameOf(r.user);
      tile.classList.toggle('speaking', !!(Call.speaking && Call.speaking.has(k)));
    });
    const self = $('#callSelf'); const hasLocalVideo = Call.local && Call.local.getVideoTracks().length > 0;
    self.classList.toggle('hidden', !hasLocalVideo);
    const sv = self.querySelector('video'); if (hasLocalVideo && sv.srcObject !== Call.local) sv.srcObject = Call.local;
    $('#callBar').innerHTML = `${root.ZMStart2 ? `<button class="${root.ZMStart2.noiseOn() ? 'on' : ''}" data-act="zNoise" title="${esc(tr0('Rauschen unterdrücken'))}">${I("voice", 22)}</button>${Call.videoOn ? `<button class="${root.ZMStart2.blurOn() ? 'on' : ''}" data-act="zBlur" title="${esc(tr0('Hintergrund weichzeichnen'))}">${I("screen", 22)}</button>` : ''}` : ''}<button class="${Call.muted ? 'on' : ''}" data-act="mute" title="Stumm">${I(Call.muted ? "micoff" : "mic", 22)}</button><button class="${Call.videoOn ? 'on' : ''}" data-act="video" title="Kamera">${I("video", 22)}</button><button class="${Call.sharing ? 'on' : ''}" data-act="share" title="${Call.sharing ? 'Teilen beenden' : 'Bildschirm teilen'}">${I("screen", 22)}</button>${Call.chatId && !Call.guestTitle ? `<button data-act="callInvite" title="Personen dazuholen">${I("invite", 22)}</button>` : ''}<button data-act="callAudio" title="Mikrofon und Lautsprecher">${I("speaker", 22)}</button><button class="end" data-act="hangup" title="Auflegen">${I("hangup", 22)}</button>`;
    // Anklopfen: zweiter Anruf
    let wb = $('#callWait'); const w = Call.waiting;
    if (w && !wb) { wb = document.createElement('div'); wb.id = 'callWait'; wb.className = 'callwait'; $('#callScreen').appendChild(wb); }
    if (wb) { if (!w) wb.remove(); else { const wc = S.chats.get(w.chat) || {}; wb.innerHTML = `${uav(w.from, 's')}<div style="flex:1;min-width:0"><b>${esc(wc.group ? wc.title : S.nameOf(w.from))}</b><div class="small" style="opacity:.75">${w.guest ? 'lädt dich in einen Anruf ein' : 'klopft an'} · Annehmen beendet den laufenden Anruf</div></div><button class="btn danger" data-act="waitNo">Ablehnen</button><button class="btn" data-act="waitYes">Annehmen</button>`; } }
  }
  function dur() { const s = Math.floor((Date.now() - Call.startedAt) / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
  setInterval(() => { if (Call.callId) renderCall(); }, 1000);

  // ====================================================================== Fenster (Dialoge)
  function dlg(html, wire) {
    const o = $('#zm-overlay'); o.innerHTML = `<div class="dlg">${html}</div>`; o.classList.remove('hidden'); dlgOpen = true;
    o.onclick = (e) => { if (e.target === o) closeDlg(); };
    wire && wire(o.firstElementChild);
  }
  function closeDlg() { const o = $('#zm-overlay'); o.classList.add('hidden'); o.innerHTML = ''; dlgOpen = false; }

  function newChatDlg() {
    const friends = S.friends.filter((f) => f.st === 'accepted').map((f) => f.p);
    let group = false; const sel = new Set();
    const draw = (box) => {
      box.innerHTML = `<h3>${group ? 'Neue Gruppe' : 'Neuer Chat'}</h3>
        ${!friends.length ? '<p class="muted">Erst unter 👥 Freunde jemanden über seinen Nutzernamen hinzufügen.</p>' : ''}
        ${!group ? `<div class="pick" data-self>${selfAv('s')}<div style="flex:1"><b>Notizen an mich</b><div class="small muted">Nachrichten an dich selbst — nur auf deinen Geräten</div></div></div>` : ''}
        ${!group && friends.length ? '<button class="link" data-g="1" style="align-self:flex-start">👥 Neue Gruppe</button>' : ''}
        ${group ? '<input id="gTitle" placeholder="Name der Gruppe" maxlength="60">' : ''}
        <div>${friends.map((p) => `<div class="pick" data-p="${esc(p.id)}">${av(p.name, 's', false, S.pic(p.avatar))}<div style="flex:1"><b>${esc(p.name)}</b><div class="small muted">@${esc(p.username)}</div></div>${group ? (sel.has(p.id) ? '☑' : '☐') : ''}</div>`).join('')}</div>
        <div class="rowb"><button class="btn ghost" data-close>Abbrechen</button>${group ? `<button class="btn" data-mk>Gruppe erstellen (${sel.size})</button>` : ''}</div>`;
      box.querySelector('[data-close]').onclick = closeDlg;
      const g = box.querySelector('[data-g]'); if (g) g.onclick = () => { group = true; draw(box); };
      const me = box.querySelector('[data-self]'); if (me) me.onclick = () => tryDo(async () => { const id = await S.selfChat(); closeDlg(); view = 'chats'; S.openChat = id; renderAll(); });
      box.querySelectorAll('[data-p]').forEach((r) => r.onclick = () => {
        const p = friends.find((x) => x.id === r.dataset.p);
        if (group) { if (sel.has(p.id)) sel.delete(p.id); else sel.add(p.id); const t = (box.querySelector('#gTitle') || {}).value; draw(box); if (t) box.querySelector('#gTitle').value = t; }
        else tryDo(async () => { const id = await S.openDirect(p); closeDlg(); view = 'chats'; S.openChat = id; renderAll(); });
      });
      const mk = box.querySelector('[data-mk]'); if (mk) mk.onclick = () => { const t = box.querySelector('#gTitle').value.trim(); if (!t || !sel.size) return toast('Name und mindestens eine Person wählen.', true);
        tryDo(async () => { const id = await S.newGroup(t, [...sel]); closeDlg(); S.openChat = id; renderAll(); }); };
    };
    dlg('', draw);
  }

  function addServerDlg() {
    dlg(`<h3>Server hinzufügen</h3>
      <b>✨ Eigenen Server erstellen</b><input id="svName" placeholder="Name des Servers" maxlength="60" value="${esc((S.me || {}).name ? 'Server von ' + S.me.name : '')}"><input id="svAbout" placeholder="Worum geht es? (freiwillig)" maxlength="500">
      <div class="rowb"><button class="btn" id="svCreate">Erstellen</button></div>
      ${root.ZMStart2 ? root.ZMStart2.templatesHtml() : ''}
      <hr style="border-color:var(--line);width:100%">
      <b>🔗 Mit Einladungs-Code beitreten</b><input id="svCode" placeholder="Einladungs-Code oder ganzer Einladungs-Text"><div id="svPrev" class="small muted"></div>
      <div class="rowb"><button class="btn" id="svJoin">Beitreten</button></div>
      <hr style="border-color:var(--line);width:100%">
      <b>🧭 Server entdecken</b><p class="small muted" style="margin:0">Hier stehen nur Server, deren Admins das ausdrücklich eingeschaltet haben.</p>
      <input id="svDisc" placeholder="Suchen (Name, Thema, Stichwort) …"><div id="svFound" style="max-height:260px;overflow:auto"></div>
      <div class="rowb"><button class="btn ghost" data-close>Schließen</button></div>
      <p class="small muted">Auch Server-Kanäle sind Ende-zu-Ende verschlüsselt — nur die Mitglieder können sie lesen.</p>`, (box) => {
      box.querySelector('[data-close]').onclick = closeDlg;
      const dq = box.querySelector('#svDisc'); let dt = null;
      const find = () => S.discover(dq.value).then((l) => { box.querySelector('#svFound').innerHTML = discoverHtml(l);
        box.querySelectorAll('[data-join]').forEach((b) => b.onclick = () => tryDo(async () => { const id = await S.joinPublic(b.dataset.join); closeDlg(); view = 'server'; S.openServer = id; S.openChannel = null; await S.loadServer(id); renderAll(); })); })
        .catch((e) => { box.querySelector('#svFound').innerHTML = `<p class="small muted">${esc(e.message)}</p>`; });
      dq.oninput = () => { clearTimeout(dt); dt = setTimeout(find, 300); }; find();
      box.querySelectorAll('[data-ztpl]').forEach((b) => b.onclick = () => tryDo(async () => { b.disabled = true; const id = await root.ZMStart2.createFromTemplate(aH(), b.dataset.ztpl, box.querySelector('#svName').value.trim(), box.querySelector('#svAbout').value.trim()); closeDlg(); view = 'server'; S.openServer = id; S.openChannel = null; await S.loadServer(id); renderAll(); }));
      box.querySelector('#svCreate').onclick = () => tryDo(async () => { const id = await S.createServer(box.querySelector('#svName').value.trim(), box.querySelector('#svAbout').value.trim()); closeDlg(); view = 'server'; S.openServer = id; S.openChannel = null; await S.loadServer(id); renderAll(); });
      const code = box.querySelector('#svCode');
      code.oninput = async () => { const p = S.inviteCode(code.value).length === 10 ? await S.serverPreview(code.value).catch(() => null) : null;
        box.querySelector('#svPrev').innerHTML = p ? `<b>${esc(p.name)}</b> · ${p.members} Mitglieder${p.banned ? ' · <span style="color:var(--bad)">du wurdest gebannt</span>' : ''}${p.joined ? ' · schon Mitglied' : ''}` : ''; };
      box.querySelector('#svJoin').onclick = () => tryDo(async () => { const id = await S.joinServer(code.value); closeDlg(); view = 'server'; S.openServer = id; S.openChannel = null; await S.loadServer(id); renderAll(); });
    });
  }

  function pollEventDlg() {
    dlg(`<h3>Einfügen</h3><div style="display:flex;gap:8px"><button class="btn ghost" data-k="poll">📊 Umfrage</button><button class="btn ghost" data-k="event">📅 Termin</button></div><div id="peBox"></div>`, (box) => {
      box.querySelectorAll('[data-k]').forEach((b) => b.onclick = () => {
        const k = b.dataset.k; const pb = box.querySelector('#peBox');
        if (k === 'poll') {
          pb.innerHTML = `<input id="pQ" placeholder="Frage" maxlength="300" style="width:100%;margin:8px 0">${[1, 2, 3, 4].map((i) => `<input class="pO" placeholder="Antwort ${i}" maxlength="100" style="width:100%;margin-bottom:6px">`).join('')}
            <label class="small"><input type="checkbox" id="pM" style="width:auto"> Mehrere Antworten erlauben</label><div class="rowb"><button class="btn" id="pGo">Senden</button></div>`;
          pb.querySelector('#pGo').onclick = () => { const q = pb.querySelector('#pQ').value.trim(); const opts = [...pb.querySelectorAll('.pO')].map((i) => i.value.trim()).filter(Boolean);
            if (!q || opts.length < 2) return toast('Frage und mindestens zwei Antworten.', true);
            sendKind('poll', { t: q.slice(0, 300), options: opts.slice(0, 12).map((o) => o.slice(0, 100)), multi: pb.querySelector('#pM').checked }); };
        } else {
          const d = new Date(Date.now() + 86400000); d.setHours(18, 0, 0, 0);
          const local = new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          pb.innerHTML = `<input id="eT" placeholder="Was? (z. B. Grillabend)" maxlength="120" style="width:100%;margin:8px 0"><input id="eW" type="datetime-local" value="${local}" style="width:100%;margin-bottom:6px">
            <input id="eP" placeholder="Wo? (freiwillig)" maxlength="200" style="width:100%;margin-bottom:6px"><textarea id="eA" placeholder="Notiz (freiwillig)" maxlength="1000" style="width:100%"></textarea><div class="rowb"><button class="btn" id="eGo">Senden</button></div>`;
          pb.querySelector('#eGo').onclick = () => { const t = pb.querySelector('#eT').value.trim(); if (!t) return toast('Bitte einen Titel.', true);
            sendKind('event', { t: t.slice(0, 120), when: new Date(pb.querySelector('#eW').value).getTime(), place: pb.querySelector('#eP').value.trim(), about: pb.querySelector('#eA').value.trim() }); };
        }
      });
    });
  }
  function sendKind(kind, content) {
    closeDlg();
    if (mainKey.startsWith('chat:')) tryDo(() => S.send(S.openChat, kind, content));
    else tryDo(() => S.sendChannel(S.openChannel, content, kind, S.openThread));
  }

  // ---------------------------------------------------------------------- Status (ansehen, antworten, wer sieht ihn)
  const FONTS = { '': 'inherit', serif: 'Georgia, serif', mono: 'Consolas, monospace', bold: 'inherit' };
  function statusView(user) {
    if (root.ZMStatus) return root.ZMStatus.view(user, statusHelpers());
    const list = S.statuses.get(user) || []; if (!list.length) return;
    let i = Math.max(0, list.findIndex((x) => !S.seenStatus(x.id)));
    const mine = user === Api.userId;
    const o = document.createElement('div'); o.className = 'status-view'; document.body.appendChild(o);
    let timer = null, hold = false;
    const close = () => { clearTimeout(timer); o.remove(); renderList(); };
    const next = () => { clearTimeout(timer); i++; show(); };
    const arm = () => { clearTimeout(timer); const bar = o.querySelectorAll('.bars i')[i]; if (hold) { if (bar) { bar.style.transition = 'none'; } return; }
      if (bar) requestAnimationFrame(() => { bar.style.transition = 'width 6s linear'; bar.style.width = '100%'; }); timer = setTimeout(next, 6000); };
    const show = () => {
      const it = list[i]; if (!it) { close(); return; }
      S.viewStatus(it); hold = false;
      const ct = it.content || {};
      o.style.background = ct.media ? '#000' : (ct.bg || '#111b21');
      const modeTxt = { except: 'Alle außer …', only: 'Nur ausgewählte' }[it.mode] || 'Alle Freunde';
      o.innerHTML = `<div class="bars">${list.map((_, k) => `<div><i style="width:${k < i ? 100 : 0}%"></i></div>`).join('')}</div>
        <div class="sv-head"><span ${mine ? '' : `data-sv="profile" style="cursor:pointer"`}>${uav(user, 's')}</span><div ${mine ? '' : 'data-sv="profile" style="cursor:pointer"'}><b>${mine ? 'Mein Status' : esc(S.nameOf(user))}</b><div class="small" style="opacity:.75">${clock(it.at)}${mine ? ' · ' + modeTxt : ''}</div></div>
          <div style="flex:1"></div>${mine ? '' : `<button class="sv-btn" data-sv="mute" title="Status von dieser Person stummschalten">${S.statusMuted(user) ? '🔔' : '🔕'}</button>`}<button class="sv-btn" data-sv="x" title="Schließen">✕</button></div>
        <div class="sv-body" style="font-family:${FONTS[ct.f || ''] || 'inherit'};font-weight:${ct.f === 'bold' ? 900 : 600}">${it.problem ? '🔒 ' + esc(it.problem) : ct.media ? `<img class="sv-img" alt="Status">${ct.t ? `<div class="sv-cap">${esc(ct.t)}</div>` : ''}` : esc(ct.t || '')}</div>
        <div class="sv-foot">${mine ? `<button class="sv-btn" data-sv="viewers">👁 Wer hat es gesehen?</button><button class="sv-btn" data-sv="del">🗑 Löschen</button><div class="sv-viewers"></div>`
          : it.problem ? '' : `<div class="sv-reacts">${['❤️', '😂', '😮', '😢', '👏', '🔥'].map((e) => `<button data-sve="${e}">${e}</button>`).join('')}</div>
             <div style="display:flex;gap:8px"><input class="sv-input" placeholder="Antworten …" maxlength="2000"><button class="btn" data-sv="send">Senden</button></div><div class="sv-sent small"></div>`}</div>`;
      if (ct.media && !it.problem) S.statusMedia(it).then((u) => { const im = o.querySelector('.sv-img'); if (im) im.src = u; }).catch(() => { const b = o.querySelector('.sv-body'); if (b) b.textContent = '📷 Foto ließ sich nicht laden.'; });
      const inp = o.querySelector('.sv-input');
      if (inp) { inp.onfocus = () => { hold = true; arm(); }; inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') o.querySelector('[data-sv="send"]').click(); }; }
      arm();
    };
    const sent = (t) => { const s = o.querySelector('.sv-sent'); if (s) s.textContent = t; };
    o.onclick = (e) => {
      const b = e.target.closest('[data-sv],[data-sve],.sv-foot,.sv-head'); const it = list[i];
      if (!b) { if (e.clientX < o.clientWidth / 3) { i = Math.max(0, i - 1); clearTimeout(timer); show(); } else next(); return; }
      if (b.dataset.sve) { tryDo(async () => { await S.replyStatus(it, b.dataset.sve); sent(b.dataset.sve + ' gesendet'); }); return; }
      const k = b.dataset.sv;
      if (k === 'x') close();
      else if (k === 'profile') { close(); profileDlg(user); }
      else if (k === 'mute') { S.toggleStatusMute(user); b.textContent = S.statusMuted(user) ? '🔔' : '🔕'; toast(S.statusMuted(user) ? 'Status von ' + S.nameOf(user) + ' stummgeschaltet' : 'Wieder laut'); }
      else if (k === 'send') { const t = o.querySelector('.sv-input').value.trim(); if (!t) return; tryDo(async () => { await S.replyStatus(it, t); o.querySelector('.sv-input').value = ''; sent('✓ Antwort gesendet'); }); }
      else if (k === 'viewers') { hold = true; arm(); tryDo(async () => { const v = await S.statusViewers(it); o.querySelector('.sv-viewers').innerHTML = `<b>👁 ${v.length} angesehen</b>` + (v.length ? v.map((x) => `<div style="display:flex;gap:8px;align-items:center;margin-top:4px">${uav(x.user, 'xs')}<span style="flex:1">${esc(S.nameOf(x.user))}</span><span class="small" style="opacity:.7">${x.at ? clock(x.at) : ''}</span></div>`).join('') : '<div class="small">Noch niemand.</div>'); }); }
      else if (k === 'del') { zAsk('Diesen Status löschen?', () => { tryDo(async () => { await S.deleteStatus(it); list.splice(i, 1); if (!list.length) close(); else { i = Math.min(i, list.length - 1); show(); } }); }); }
    };
    show();
  }

  /** Auswahl „Wer sieht meinen Status?" */
  function audienceHtml(a) {
    const friends = S.friends.filter((f) => f.st === 'accepted').map((f) => f.p);
    return `${[['all', 'Alle Freunde'], ['except', 'Alle Freunde außer …'], ['only', 'Nur mit …']].map(([m, l]) => `<label class="small chk"><input type="radio" name="aud" value="${m}" ${a.mode === m ? 'checked' : ''}> <span>${l}</span></label>`).join('')}
      <div id="audList" class="${a.mode === 'all' ? 'hidden' : ''}" style="max-height:200px;overflow:auto;margin-top:4px"><div class="small muted">${a.mode === 'except' ? 'Diese Freunde sehen ihn NICHT:' : 'Nur diese Freunde sehen ihn:'}</div>
        ${friends.length ? friends.map((p) => `<label class="pick"><input type="checkbox" data-aud="${esc(p.id)}" style="width:auto" ${a.users.includes(p.id) ? 'checked' : ''}>${av(p.name, 'xs', false, S.pic(p.avatar))}<span>${esc(p.name)}</span></label>`).join('') : '<div class="small muted">Noch keine Freunde.</div>'}</div>`;
  }
  /** Details eines Anrufs (Zeit, Dauer, wer war dabei) + löschen */
  function callDetail(id) {
    const e = (callList || []).find((x) => x.id === id); if (!e) return;
    const c = S.chats.get(e.chat); const title = c ? c.title : S.nameOf(e.by);
    const s = e.answered && e.ended > e.at ? Math.round((e.ended - e.at) / 1000) : 0;
    const people = [...new Set([...e.people, e.by])];
    dlg(`<div style="display:flex;gap:12px;align-items:center">${c ? cav(c) : uav(e.by)}<div><h3 style="margin:0">${esc(title)}</h3><div class="small" style="${e.missed ? 'color:var(--bad)' : ''}">${e.video ? 'Videoanruf' : 'Sprachanruf'} · ${e.missed ? 'verpasst' : e.outgoing ? (e.answered ? 'ausgehend' : 'nicht angenommen') : 'eingehend'}</div></div></div>
      <p>${esc(new Date(e.at).toLocaleString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }))}${s ? `<br>Dauer: ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : ''}</p>
      ${people.length ? `<div class="cat" style="padding-left:0">Dabei</div>${people.map((u) => `<div style="display:flex;gap:8px;align-items:center;margin:4px 0">${uav(u, 'xs')}<span>${esc(u === Api.userId ? 'Du' : S.nameOf(u))}${u === e.by ? ' · hat angerufen' : ''}</span></div>`).join('')}` : ''}
      <div class="rowb" style="margin-top:14px">${c && c.members.length <= 8 ? `<button class="btn" data-d="audio">${I('phone', 16)} Anrufen</button><button class="btn ghost" data-d="video">${I('video', 16)} Video</button>` : ''}${c ? '<button class="btn ghost" data-d="chat">Chat</button>' : ''}</div>
      <button class="btn ghost" data-d="del" style="margin-top:8px;width:100%">${I('trash', 16)} Aus der Liste löschen</button>
      <p class="small muted">Wird nur bei dir gelöscht. Haben alle Beteiligten den Anruf gelöscht, ist er komplett vom Server weg.</p>`, (box) => {
      box.querySelectorAll('[data-d]').forEach((b) => b.onclick = () => { const k = b.dataset.d; closeDlg();
        if (k === 'audio' || k === 'video') tryDo(() => Call.call(e.chat, k === 'video'));
        else if (k === 'chat') { view = 'chats'; S.openChat = e.chat; renderAll(); }
        else if (k === 'del') tryDo(async () => { await Call.deleteCalls([e.id]); callList = (callList || []).filter((x) => x.id !== e.id); renderList(); }); });
    });
  }
  /** Personen dazuholen: Freunde in den laufenden Anruf einladen */
  function inviteDlg() {
    const inCall = new Set([Api.userId, ...[...Call.remotes.values()].map((r) => r.user), ...((S.chats.get(Call.chatId) || {}).members || []).map((m) => m.userId)]);
    const friends = S.friends.filter((f) => f.st === 'accepted' && !inCall.has(f.p.id)).map((f) => f.p);
    dlg(`<h3>Personen dazuholen</h3><p class="small muted">Deine Freunde bekommen einen Anruf und können dazukommen (höchstens 8 Personen).</p>
      ${friends.length ? friends.map((p) => `<div class="pick" style="cursor:default">${av(p.name, 'xs', false, S.pic(p.avatar))}<span style="flex:1">${esc(p.name)}</span><button class="btn" data-inv="${esc(p.id)}">Dazuholen</button></div>`).join('') : '<p class="muted">Alle deine Freunde sind schon dabei — oder du hast noch keine.</p>'}`, (box) => {
      box.querySelectorAll('[data-inv]').forEach((b) => b.onclick = () => tryDo(async () => { await Call.invite(b.dataset.inv); b.textContent = '✓ Eingeladen'; b.disabled = true; }));
    });
  }
  /** Mikrofon und Lautsprecher wählen (auch während des Anrufs) */
  async function audioDlg() {
    let devs = []; try { devs = await navigator.mediaDevices.enumerateDevices(); } catch (e) { }
    const mics = devs.filter((x) => x.kind === 'audioinput'), outs = devs.filter((x) => x.kind === 'audiooutput');
    const opt = (l, cur) => `<option value="">Standard</option>` + l.map((x) => `<option value="${esc(x.deviceId)}" ${x.deviceId === cur ? 'selected' : ''}>${esc(x.label || 'Gerät')}</option>`).join('');
    dlg(`<h3>Ton</h3><label class="small muted">Mikrofon</label><select id="aMic" style="width:100%">${opt(mics, Call.pref('mic', ''))}</select>
      <label class="small muted" style="margin-top:8px;display:block">Lautsprecher / Kopfhörer</label><select id="aOut" style="width:100%">${opt(outs, Call.pref('speaker', ''))}</select>
      <p class="small muted">Echo- und Rausch-Unterdrückung sind immer an.</p><div class="rowb"><button class="btn" data-a="ok">Fertig</button></div>`, (box) => {
      box.querySelector('[data-a="ok"]').onclick = () => tryDo(async () => {
        const mic = box.querySelector('#aMic').value, out = box.querySelector('#aOut').value;
        const micChanged = mic !== Call.pref('mic', '');
        Call.setPref('mic', mic); Call.setPref('speaker', out);
        document.querySelectorAll('#callScreen video, audio').forEach((v) => Call.applySpeaker(v));
        if (micChanged && Call.local && Call.callId) {
          const s = await navigator.mediaDevices.getUserMedia({ audio: Object.assign({ echoCancellation: true, noiseSuppression: true, autoGainControl: true }, mic ? { deviceId: { exact: mic } } : {}) });
          const t = s.getAudioTracks()[0];
          for (const r of Call.remotes.values()) { const snd = r.pc.getSenders().find((x) => x.track && x.track.kind === 'audio'); if (snd) await snd.replaceTrack(t); }
          Call.local.getAudioTracks().forEach((o) => { o.stop(); Call.local.removeTrack(o); }); Call.local.addTrack(t); t.enabled = !Call.muted;
        }
        closeDlg();
      });
    });
  }
  /** Anrufbeantworter: niemand hat abgenommen → Sprachnachricht hinterlassen */
  let vmRec = null;
  function renderVoicemail() {
    const chat = Call.voicemailFor; if (!chat || Call.callId || document.getElementById('vmBox')) return;
    const who = (S.chats.get(chat) || {}).title || '';
    const box = document.createElement('div'); box.id = 'vmBox'; box.className = 'zask';
    box.innerHTML = `<div class="card" style="max-width:380px;text-align:center"><div style="font-size:0">${I('voice', 34)}</div><h3>Niemand hat abgenommen</h3><p>Möchtest du ${esc(who)} eine Sprachnachricht hinterlassen?</p><div id="vmT" class="small" style="color:#ff6b6b;min-height:18px"></div>
      <div class="rowb" style="justify-content:center"><button class="btn ghost" data-vm="no">Nein danke</button><button class="btn" data-vm="rec">Aufnehmen</button></div></div>`;
    document.body.appendChild(box);
    const done = () => { try { vmRec && vmRec.r.state !== 'inactive' && vmRec.r.stop(); vmRec && vmRec.s.getTracks().forEach((t) => t.stop()); } catch (e) { } vmRec = null; Call.voicemailFor = null; box.remove(); };
    box.querySelector('[data-vm="no"]').onclick = () => { if (vmRec) vmRec.cancel = true; done(); };
    box.querySelector('[data-vm="rec"]').onclick = (ev) => tryDo(async () => {
      const b = ev.currentTarget;
      if (vmRec) { vmRec.r.stop(); return; }
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const r = new MediaRecorder(s, { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '' }); const parts = []; const t0 = Date.now();
      vmRec = { r, s, cancel: false };
      r.ondataavailable = (x) => { if (x.data.size) parts.push(x.data); };
      r.onstop = async () => { const rec = vmRec; s.getTracks().forEach((t) => t.stop()); clearInterval(tick); if (!rec || rec.cancel) return; const ms = Date.now() - t0; vmRec = null;
        Call.voicemailFor = null; box.remove(); if (ms < 700) return;
        const blob = new Blob(parts, { type: r.mimeType || 'audio/webm' });
        try { const media = Object.assign(await S.putFile('chat-media', chat, new Uint8Array(await blob.arrayBuffer()), blob.type), { dur: ms }); delete media.bucket; await S.send(chat, 'voice', { media, dur: ms }); toast('✓ Sprachnachricht gesendet'); } catch (e) { toast(e.message, true); } };
      r.start(); b.textContent = 'Senden';
      const tick = setInterval(() => { const sec = Math.floor((Date.now() - t0) / 1000); const t = document.getElementById('vmT'); if (t) t.textContent = `● ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')} / 1:00`; if (sec >= 60 && r.state === 'recording') r.stop(); }, 250);
    });
  }

  /** Foto im Chat: schöne Vollbild-Ansicht — wischen/Pfeile zwischen allen Fotos, Mausrad = Zoom, Doppelklick, Speichern, Kopieren, Löschen */
  function photoViewer(startImg) {
    const imgs = [...document.querySelectorAll('#mList img.media[data-mid]')];
    let i = Math.max(0, imgs.indexOf(startImg)), zoom = 1, px = 0, py = 0, drag = null;
    const o = document.createElement('div'); o.className = 'pv'; document.body.appendChild(o);
    const msgOfImg = (img) => (S.messages.get(S.openChat) || []).find((m) => m.id === img.dataset.mid);
    const close = () => { o.remove(); document.removeEventListener('keydown', key, true); };
    const apply = () => { const im = o.querySelector('.pv-img'); if (im) im.style.transform = `translate(${px}px, ${py}px) scale(${zoom})`; };
    const draw = () => {
      const img = imgs[i]; const m = msgOfImg(img) || {}; const mine = m.sender === Api.userId; const c = S.chats.get(S.openChat) || {};
      zoom = 1; px = 0; py = 0;
      o.innerHTML = `<div class="pv-bg" style="background-image:url('${img.src}')"></div>
        <div class="pv-top">${uav(m.sender || Api.userId, 's')}<div style="flex:1;min-width:0"><b>${esc(mine ? 'Du' : S.nameOf(m.sender))}</b><div class="small" style="opacity:.75">${m.at ? esc(new Date(m.at).toLocaleString('de-DE', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })) : ''}</div></div>
          ${imgs.length > 1 ? `<span class="pv-count">${i + 1} / ${imgs.length}</span>` : ''}<button class="pv-btn" data-pv="x" title="Schließen (Esc)">${I('close', 20)}</button></div>
        <img class="pv-img" src="${img.src}" alt="Foto" draggable="false">
        ${imgs.length > 1 ? `<button class="pv-nav l" data-pv="prev" ${i === 0 ? 'disabled' : ''}>${I('back', 22)}</button><button class="pv-nav r" data-pv="next" ${i === imgs.length - 1 ? 'disabled' : ''}><span style="display:inline-flex;transform:scaleX(-1)">${I('back', 22)}</span></button>` : ''}
        <div class="pv-bottom">${m.content && m.content.t ? `<div class="pv-cap">${esc(m.content.t)}</div>` : ''}
          <div class="pv-bar"><button data-pv="save">${I('download', 20)}<span>Speichern</span></button><button data-pv="copy">${I('copy', 20)}<span>Kopieren</span></button><button data-pv="del" class="red">${I('trash', 20)}<span>Löschen</span></button></div>
          <div class="pv-del hidden"><b>Foto löschen?</b><button data-pv="delme">Für mich löschen</button>${!m.deleted && ((mine && Date.now() - m.at < (root.ZPlus && root.ZPlus.active() ? 72 : 24) * 3600000) || c.admin) ? '<button data-pv="delall">Für alle löschen</button>' : ''}<button data-pv="delno" class="ghost">Abbrechen</button></div></div>`;
      const im = o.querySelector('.pv-img');
      im.onwheel = (e) => { e.preventDefault(); zoom = Math.min(5, Math.max(1, zoom * (e.deltaY < 0 ? 1.15 : 0.87))); if (zoom === 1) { px = 0; py = 0; } apply(); };
      im.ondblclick = () => { zoom = zoom > 1 ? 1 : 2.5; px = 0; py = 0; apply(); };
      im.onpointerdown = (e) => { if (zoom <= 1) return; drag = { x: e.clientX - px, y: e.clientY - py }; im.setPointerCapture(e.pointerId); };
      im.onpointermove = (e) => { if (!drag) return; px = e.clientX - drag.x; py = e.clientY - drag.y; apply(); };
      im.onpointerup = () => { drag = null; };
    };
    o.onclick = (e) => {
      const b = e.target.closest('[data-pv]'); if (!b) { if (e.target === o || e.target.classList.contains('pv-bg')) close(); return; }
      const k = b.dataset.pv, img = imgs[i], m = msgOfImg(img);
      if (k === 'x') close();
      else if (k === 'prev' && i > 0) { i--; draw(); } else if (k === 'next' && i < imgs.length - 1) { i++; draw(); }
      else if (k === 'save') { const a = document.createElement('a'); a.href = img.src; a.download = 'Zunora-' + Date.now() + '.jpg'; document.body.appendChild(a); a.click(); a.remove(); toast('✓ Gespeichert (Downloads)'); }
      else if (k === 'copy') tryDo(async () => { const blob = await (await fetch(img.src)).blob(); const png = await new Promise((ok) => { const c2 = document.createElement('canvas'); const x = new Image(); x.onload = () => { c2.width = x.naturalWidth; c2.height = x.naturalHeight; c2.getContext('2d').drawImage(x, 0, 0); c2.toBlob(ok, 'image/png'); }; x.src = URL.createObjectURL(blob); });
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]); toast('✓ Foto kopiert'); });
      else if (k === 'del') o.querySelector('.pv-del').classList.remove('hidden');
      else if (k === 'delno') o.querySelector('.pv-del').classList.add('hidden');
      else if (k === 'delme' && m) { S.hideForMe(m); close(); toast('Foto für dich gelöscht'); }
      else if (k === 'delall' && m) tryDo(async () => { await S.deleteForAll(m); close(); toast('Foto für alle gelöscht'); });
    };
    const key = (e) => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft' && i > 0) { i--; draw(); } else if (e.key === 'ArrowRight' && i < imgs.length - 1) { i++; draw(); } else return; e.preventDefault(); e.stopPropagation(); };
    document.addEventListener('keydown', key, true);
    draw();
  }

  /** Helfer für zm/mehr.js (Freunde, Startseite, Konto, Datenschutz) */
  function moreH() { return { esc, av, uav, cav, I, S, Api, toast, tryDo, dlg, closeDlg, profileDlg, renderList, renderAll, clock, SECOND, statusH: statusHelpers,
    openChat: (id) => { view = 'chats'; S.openChat = id; renderAll(); }, go: (v) => { view = v; renderAll(); } }; }
  function statusHelpers() { return { esc, uav, clock, toast, tryDo, zAsk, dlg, closeDlg, profileDlg, renderList, audienceHtml, I }; }
  function myStatusDlg() {
    if (root.ZMStatus) return root.ZMStatus.compose(statusHelpers());
    const mine = S.statuses.get(Api.userId) || [];
    let bg = '#14B8A6', font = '', a = S.statusAudience(), file = null;
    const BGS = ['#14B8A6', '#6A4BFF', '#E05252', '#FF9F43', '#2FBF71', '#111B21', '#FF7AD9', '#4EA0FF', '#8E44AD', '#0E7C66'];
    dlg(`<h3>Mein Status</h3><p class="small muted">🔒 Ende-zu-Ende verschlüsselt, nach 24 Stunden weg.</p>
      <textarea id="stT" rows="4" maxlength="700" placeholder="Status schreiben … (bei einem Foto: Bildunterschrift)" style="width:100%"></textarea>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">${BGS.map((c) => `<span data-bg="${c}" style="width:24px;height:24px;border-radius:50%;background:${c};cursor:pointer;border:2px solid ${c === bg ? '#fff' : 'transparent'}"></span>`).join('')}
        <button class="btn ghost" id="stFont" title="Schriftart">Aa</button><button class="btn ghost" id="stPic">${I('image', 16)} Foto</button><input type="file" id="stFile" accept="image/*" class="hidden"><span id="stFileName" class="small muted"></span></div>
      <div class="cat" style="padding-left:0">Wer sieht das?</div><div id="audBox">${audienceHtml(a)}</div>
      <div class="rowb">${mine.length ? '<button class="btn ghost" data-see>Meine ansehen</button>' : ''}<button class="btn" data-post>Teilen</button></div>`, (box) => {
      const ta = box.querySelector('#stT'); const paint = () => { ta.style.background = bg; ta.style.color = '#fff'; ta.style.fontFamily = FONTS[font]; ta.style.fontWeight = font === 'bold' ? 900 : 600; }; paint();
      box.querySelectorAll('[data-bg]').forEach((s) => s.onclick = () => { bg = s.dataset.bg; box.querySelectorAll('[data-bg]').forEach((x) => x.style.borderColor = x.dataset.bg === bg ? '#fff' : 'transparent'); paint(); });
      box.querySelector('#stFont').onclick = () => { const k = Object.keys(FONTS); font = k[(k.indexOf(font) + 1) % k.length]; paint(); };
      box.querySelector('#stPic').onclick = () => box.querySelector('#stFile').click();
      box.querySelector('#stFile').onchange = (e) => { file = e.target.files[0] || null; box.querySelector('#stFileName').textContent = file ? '📷 ' + file.name : ''; };
      const wireAud = () => { box.querySelectorAll('input[name=aud]').forEach((r) => r.onchange = () => { a.mode = r.value; box.querySelector('#audBox').innerHTML = audienceHtml(a); wireAud(); });
        box.querySelectorAll('[data-aud]').forEach((c) => c.onchange = () => { const id = c.dataset.aud; a.users = c.checked ? [...new Set([...a.users, id])] : a.users.filter((x) => x !== id); }); };
      wireAud();
      const see = box.querySelector('[data-see]'); if (see) see.onclick = () => { closeDlg(); statusView(Api.userId); };
      box.querySelector('[data-post]').onclick = () => { const t = ta.value.trim(); if (!t && !file) return toast('Schreib etwas oder wähle ein Foto.', true);
        tryDo(async () => { if (file) await S.postStatusImage(file, t, a); else await S.postStatus(t, bg, font, a); closeDlg(); toast('✓ Status geteilt · ' + S.audienceLabel(a)); }); };
    });
  }

  // ---------------------------------------------------------------------- Profil eines anderen Nutzers
  function profileDlg(user) {
    if (!user || user === Api.userId) return;
    const draw = (box) => {
      const p = S.profiles.get(user) || { name: '…', username: '', about: '' };
      const fr = (S.friends.find((f) => f.p.id === user) || {}).st;
      const blocked = S.blocked.has(user);
      const direct = [...S.chats.values()].find((c) => !c.group && c.members.some((m) => m.userId === user));
      const groups = [...S.chats.values()].filter((c) => c.group && c.members.some((m) => m.userId === user));
      const servers = [...S.servers.values()].filter((s) => ((S.serverState.get(s.id) || {}).members || []).some((m) => m.userId === user));
      const pres = S.presenceLabel(user);
      box.innerHTML = `<div style="text-align:center">${root.ZMLook ? root.ZMLook.banner(user) : ''}<span data-bigav="${esc(user)}" style="cursor:zoom-in;display:inline-block;position:relative" title="Groß ansehen">${root.ZMLook ? root.ZMLook.wrap(user, av(p.name, 'xl', false, S.userPic(user)), 'xl') : av(p.name, 'xl', false, S.userPic(user))}</span><h3 style="margin:8px 0 0">${esc(p.name)}${pb(user)}</h3><div class="muted">@${esc(p.username || '')}</div>
          ${pres ? `<div class="small" style="color:${pres === 'online' ? 'var(--accent)' : 'var(--sub)'}">${esc(pres)}</div>` : ''}
          ${root.ZMWish ? root.ZMWish.profileExtras(user, aH(), () => draw(box)) : ''}
          ${p.about ? `<p>${esc(p.about)}</p>` : ''}<div class="small" style="color:var(--accent)">${fr === 'accepted' ? '✓ Ihr seid befreundet' : fr === 'outgoing' ? 'Freundschaftsanfrage gesendet' : fr === 'incoming' ? 'Möchte mit dir befreundet sein' : blocked ? '⛔ Blockiert' : 'Nicht befreundet'}</div></div>
        ${!blocked && (fr === 'accepted' || direct || (root.ZMWish && root.ZMWish.canMsg(user))) ? `<div class="pactions"><button class="btn ghost" data-pa="chat">${I('chat', 18)} Nachricht</button><button class="btn ghost" data-pa="call">${I('phone', 18)} Anrufen</button><button class="btn ghost" data-pa="video">${I('video', 18)} Video</button></div>` : ''}
        ${direct ? `<button class="btn ghost" data-pa="delchat">🗑 Chat löschen</button>` : ""}
        ${direct ? `<button class="btn ghost" data-pa="mute">${direct.mutedUntil > Date.now() ? '🔕 ' + esc(S.muteLabel(direct.mutedUntil)) + ' · ändern' : '🔕 Chat stummschalten …'}</button>` : ''}
        ${groups.length || servers.length ? `<div class="cat" style="padding-left:0">Gemeinsam</div>${groups.map((g) => `<div class="row" data-pg="${esc(g.id)}" style="cursor:pointer;padding:4px 0">${cav(g, 'xs')}<div class="main">${esc(g.title)}</div></div>`).join('')}${servers.map((s) => `<div class="row" style="padding:4px 0">${av(s.name, 'xs', false, s.icon ? S.pic(s.icon) : null)}<div class="main">${esc(s.name)} · Server</div></div>`).join('')}` : ''}
        ${!fr && !blocked ? '<button class="btn" data-pa="friend">Als Freund hinzufügen</button>' : ''}${fr === 'incoming' ? '<button class="btn" data-pa="accept">Anfrage annehmen</button><button class="btn ghost" data-pa="withdraw">Anfrage ablehnen</button>' : ''}${fr === 'outgoing' ? '<button class="btn ghost" data-pa="withdraw">↩ Anfrage zurückziehen</button>' : ''}${fr === 'accepted' ? '<button class="btn ghost" data-pa="unfriend">Als Freund entfernen</button>' : ''}
        <button class="btn ${blocked ? 'ghost' : 'danger'}" data-pa="block">${blocked ? 'Blockierung aufheben' : '⛔ Blockieren'}</button>
        <button class="btn ghost" data-pa="report">🚩 Melden</button>
        <div class="rowb"><button class="btn ghost" data-close>Schließen</button></div>`;
      box.querySelector('[data-close]').onclick = closeDlg;
      // Story-Highlights der Person
      if (root.ZMStory) root.ZMStory.highlightsHtml(user).then(({ html, l }) => { if (!html || !box.isConnected || box.querySelector('.sto-hls')) return; const m = box.querySelector('.muted'); if (m) m.insertAdjacentHTML('afterend', html);
        box.querySelectorAll('[data-sto-hl]').forEach((b) => b.onclick = () => { closeDlg(); root.ZMStory.openList('hl:' + user, l.filter((x) => x.hl === b.dataset.stoHl), statusHelpers()); }); });
      box.querySelectorAll('[data-pg]').forEach((r) => r.onclick = () => { closeDlg(); view = 'chats'; S.openChat = r.dataset.pg; renderAll(); });
      box.querySelectorAll('[data-pa]').forEach((b) => b.onclick = () => tryDo(async () => {
        const k = b.dataset.pa;
        const chatId = async () => direct ? direct.id : await S.openDirect(p);
        if (k === 'chat') { const id = await chatId(); closeDlg(); view = 'chats'; S.openChat = id; renderAll(); return; }
        if (k === 'call' || k === 'video') { const id = await chatId(); closeDlg(); view = 'chats'; S.openChat = id; renderAll(); await Call.call(id, k === 'video'); return; }
        if (k === 'mute') { closeDlg(); muteDlg(p.name, direct.mutedUntil, (until) => S.muteChat(direct.id, until)); return; }
        if (k === 'friend') { await S.request(p); toast('✓ Anfrage gesendet'); }
        if (k === 'accept') await S.accept(p);
        if (k === 'withdraw') { await S.withdraw(p); toast(fr === 'outgoing' ? '↩ Anfrage zurückgezogen' : 'Anfrage abgelehnt'); closeDlg(); return; }
        if (k === "unfriend") { if (!await zConfirm(S.UNFRIEND_TEXT(p.name))) return; await S.unfriend(p); closeDlg(); renderAll(); return; }
        if (k === "delchat") { if (!await zConfirm(S.DELETE_CHAT_TEXT(p.name))) return; await S.deleteChatForMe(direct.id); closeDlg(); renderAll(); return; }
        if (k === 'block') { if (blocked) await S.unblock(user); else { if (!await zConfirm(p.name + ' blockieren? Ihr könnt euch dann nicht mehr schreiben.')) return; await S.block(user); } }
        if (k === 'report') { closeDlg(); reportDlg(user, null, null); return; }
        draw(box);
      }));
    };
    dlg('', (box) => { draw(box); S.refreshProfiles([user]).then(() => { if (dlgOpen) draw(box); }).catch(() => { }); S.loadPresence([user]).then(() => { if (dlgOpen) draw(box); }).catch(() => { }); });
  }

  // ---------------------------------------------------------------------- Stummschalten (Dauer wählen)
  function muteDlg(title, until, apply) {
    dlg(`<h3>${esc(title)} stummschalten</h3><p class="small muted">Keine Meldungen, solange stummgeschaltet. Nachrichten kommen trotzdem an.</p>
      ${until > Date.now() ? '<button class="btn" data-mu="0">🔔 Ton wieder an</button>' : ''}
      ${S.MUTE.map(([l, ms]) => `<button class="btn ghost" data-mu="${ms}">🔕 ${l}</button>`).join('')}
      <div class="rowb"><button class="btn ghost" data-close>Abbrechen</button></div>`, (box) => {
      box.querySelector('[data-close]').onclick = closeDlg;
      box.querySelectorAll('[data-mu]').forEach((b) => b.onclick = () => tryDo(async () => { const ms = +b.dataset.mu; await apply(ms ? Date.now() + ms : null); closeDlg(); toast(ms ? '🔕 Stummgeschaltet' : '🔔 Ton wieder an'); renderAll(); }));
    });
  }

  // ---------------------------------------------------------------------- Chat-Verlauf übertragen
  function transferDlg() {
    const T = S.Transfer;
    const draw = (box) => {
      const ph = T.phase;
      box.innerHTML = `<h3>Chat-Verlauf übertragen</h3>` + (
        !ph ? `<p>Hol dir deine Chats und Nachrichten von einem anderen Gerät, auf dem du schon angemeldet bist (Handy oder PC). Dort erscheint gleich ein Code, den du hier eingibst.</p><div class="rowb"><button class="btn ghost" data-close>Abbrechen</button><button class="btn" data-t="start">Verlauf holen</button></div>`
        : ph === 'fertig' ? `<p>${esc(T.message)}</p><div class="rowb"><button class="btn" data-t="done">Fertig</button></div>`
        : ph === 'abgelehnt' ? `<p style="color:var(--bad)">${esc(T.message)}</p><div class="rowb"><button class="btn" data-t="done">Schließen</button></div>`
        : `<p>${ph === 'warten' ? 'Öffne jetzt Zunora Messenger auf einem deiner anderen Geräte. Dort erscheint ein Code.' : ph === 'packen' ? 'Dein anderes Gerät packt gerade deinen Verlauf … gleich erscheint dort der Code.' : ph === 'laden' ? esc(T.message) : 'Gib den Code ein, der auf deinem anderen Gerät steht.'}</p>
           <input id="trCode" placeholder="Code (z. B. ABCD-EFGH)" maxlength="12" style="width:100%;font-size:20px;letter-spacing:2px;text-transform:uppercase">
           <div class="rowb"><button class="btn ghost" data-t="cancel">Abbrechen</button><button class="btn" data-t="go">Übertragen</button></div>`) +
        `<div id="trErr" class="small" style="color:var(--bad)"></div><p class="small muted">🔒 Ende-zu-Ende verschlüsselt — der Server kann den Verlauf nicht lesen. Ohne den Code geht nichts auf.</p>`;
      const c = box.querySelector('[data-close]'); if (c) c.onclick = closeDlg;
      box.querySelectorAll('[data-t]').forEach((b) => b.onclick = async () => {
        const k = b.dataset.t, err = box.querySelector('#trErr');
        try {
          if (k === 'start') { await T.start(); draw(box); }
          if (k === 'done' || k === 'cancel') { T.reset(); closeDlg(); renderAll(); }
          if (k === 'go') { b.disabled = true; b.textContent = 'Prüfe …'; await T.enter(box.querySelector('#trCode').value); draw(box); renderAll(); }
        } catch (e) { b.disabled = false; b.textContent = 'Übertragen'; err.textContent = e.message; }
      });
      const inp = box.querySelector('#trCode'); if (inp) { inp.focus(); inp.onkeydown = (e) => { if (e.key === 'Enter') box.querySelector('[data-t="go"]').click(); }; }
    };
    dlg('', (box) => { draw(box); transferBox = box; transferDraw = draw; });
  }
  let transferBox = null, transferDraw = null;
  /** Altes Gerät: Code anzeigen (eigenes Fenster oben rechts, auch über anderen Fenstern) */
  function renderTransfer() {
    const T = S.Transfer; let el = document.getElementById('zm-transfer');
    // neues Gerät: offenes Fenster aktualisieren, solange nicht getippt wird
    if (transferBox && dlgOpen && transferBox.isConnected && T.phase && T.phase !== 'laden' && !(document.activeElement && document.activeElement.id === 'trCode' && document.activeElement.value)) { const ph = transferBox.dataset.ph; if (ph !== T.phase) { transferBox.dataset.ph = T.phase; transferDraw(transferBox); } }
    const i = T.incoming;
    if (!i) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'zm-transfer'; el.className = 'transfer-card'; document.body.appendChild(el); }
    el.innerHTML = `<b>Neues Gerät: ${esc(i.name)}</b>` + (
      i.status === 'packing' ? `<p class="small">${i.packer ? 'Dein Chat-Verlauf wird verschlüsselt verpackt … das kann einen Moment dauern.' : 'Ein anderes Gerät von dir packt gerade den Verlauf …'}</p>`
      : i.status === 'ready' ? `<p class="small">Gib diesen Code auf dem neuen Gerät ein:</p><div class="tcode">${i.code ? esc(T.pretty(i.code)) : '(Code auf dem Gerät, das gepackt hat)'}</div><p class="small muted">Übertragen werden Chats, Nachrichten, Entwürfe und Einstellungen. Server und Gruppen hängen an deinem Konto und sind dort schon da.</p>`
      : i.status === 'done' ? '<p class="small">✓ Fertig — der Verlauf ist auf dem neuen Gerät.</p>'
      : `<p class="small" style="color:var(--bad)">Das Packen ging nicht: ${esc(T.message)}</p>`) +
      `<div class="rowb">${i.status !== 'done' ? '<button class="btn ghost" data-act="transferReject">Ablehnen</button>' : ''}<button class="btn" data-act="transferClose">${i.status === 'done' ? 'Schließen' : 'Später'}</button></div>
      ${i.status !== 'done' ? '<p class="small muted">Warst du das nicht? Ablehnen und unter Einstellungen → Deine Geräte das fremde Gerät abmelden.</p>' : ''}`;
    // eigene Klicks (funktionieren auch, wenn gerade ein anderes Fenster offen ist)
    el.querySelectorAll('[data-act]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); if (b.dataset.act === 'transferReject') T.reject(); else T.close(); });
  }

  // ---------------------------------------------------------------------- Server: Suche, Erwähnungen, Regeln, Rollen, Banns
  function hitRows(list) {
    return list.length ? list.map((m) => { const c = S.channel(m.channel) || {};
      return `<div class="row" data-hitch="${esc(m.channel)}" data-hitthread="${esc(m.thread || '')}" style="cursor:pointer;padding:6px 0;align-items:flex-start">${av(S.nameIn(c.server_id, m.sender), 's', false, S.userPic(m.sender))}
        <div class="main"><div class="small" style="color:var(--accent)">#${esc(c.name || 'Kanal')} · ${esc(S.nameIn(c.server_id, m.sender))} · ${clock(m.at)}</div><div class="small">${highlight(String(m.content.t || '').slice(0, 300))}</div></div></div>`; }).join('')
      : '<p class="small muted">Nichts gefunden.</p>';
  }
  function wireHits(box) {
    box.querySelectorAll('[data-hitch]').forEach((r) => r.onclick = () => { const c = S.channel(r.dataset.hitch); closeDlg(); view = 'server'; if (c) S.openServer = c.server_id; S.openChannel = r.dataset.hitch; S.openThread = r.dataset.hitthread || null; renderAll(); });
  }
  function serverSearchDlg() {
    const s = S.servers.get(S.openServer); if (!s) return;
    dlg(`<h3>Im Server „${esc(s.name)}“ suchen</h3><input id="ssQ" placeholder="Suchbegriff …" maxlength="80"><div id="ssHits" style="max-height:420px;overflow:auto"></div><div class="rowb"><button class="btn ghost" data-close>Schließen</button></div>`, (box) => {
      box.querySelector('[data-close]').onclick = closeDlg; const q = box.querySelector('#ssQ'); q.focus(); let t = null;
      q.oninput = () => { clearTimeout(t); t = setTimeout(() => tryDo(async () => { const h = box.querySelector('#ssHits'); if (q.value.trim().length < 2) { h.innerHTML = ''; return; } h.innerHTML = hitRows(await S.searchServer(s.id, q.value)); wireHits(box); }), 350); };
    });
  }
  function mentionsDlg() {
    dlg(`<h3>@ Erwähnungen</h3><p class="small muted">Wo dich jemand in einem Server erwähnt hat.</p><div id="mnHits" style="max-height:440px;overflow:auto"><p class="small muted">Lädt …</p></div><div class="rowb"><button class="btn ghost" data-close>Schließen</button></div>`, (box) => {
      box.querySelector('[data-close]').onclick = closeDlg;
      tryDo(async () => { box.querySelector('#mnHits').innerHTML = hitRows(await S.mentions()); wireHits(box); });
    });
  }
  function rulesDlg() {
    const s = S.servers.get(S.openServer); if (!s) return;
    const edit = S.can(s.id, 128);
    dlg(`<h3>📜 Regeln von „${esc(s.name)}“</h3>${edit ? `<textarea id="rlT" rows="10" maxlength="4000" style="width:100%" placeholder="z. B. 1. Seid nett zueinander …">${esc(s.rules || '')}</textarea><p class="small muted">Neue Mitglieder sehen die Regeln oben in der Kanal-Liste. Leer = keine Regeln.</p>`
      : `<div style="white-space:pre-wrap;background:var(--panel);padding:12px;border-radius:12px;max-height:380px;overflow:auto">${esc(s.rules || '')}</div><p class="small muted">Verstöße kannst du melden (Nachricht → 🚩). Admins können Auszeiten geben, entfernen oder bannen.</p>`}
      <div class="rowb"><button class="btn ghost" data-close>Schließen</button>${edit ? '<button class="btn" data-save>Speichern</button>' : '<button class="btn" data-ok>Gelesen</button>'}</div>`, (box) => {
      box.querySelector('[data-close]').onclick = closeDlg;
      const ok = box.querySelector('[data-ok]'); if (ok) ok.onclick = () => { S.markRulesSeen(s); closeDlg(); renderList(); };
      const sv = box.querySelector('[data-save]'); if (sv) sv.onclick = () => tryDo(async () => { await S.saveRules(s.id, box.querySelector('#rlT').value); S.markRulesSeen(S.servers.get(s.id)); closeDlg(); toast('✓ Regeln gespeichert'); });
    });
  }
  function rolesDlg() {
    const s = S.openServer; if (!S.serverState.get(s)) return;
    let edit = null;      // null = Liste, {} = neue Rolle, role = bearbeiten
    const draw = (box) => {
      const st = S.serverState.get(s);
      if (!edit) {
        box.innerHTML = `<h3>🎭 Rollen</h3><div style="max-height:380px;overflow:auto">${st.roles.map((r) => `<div class="row" style="padding:6px 0;cursor:pointer" data-role="${esc(r.id)}"><span style="width:14px;height:14px;border-radius:50%;background:${esc(r.color || '#888')}"></span><div class="main"><b>${esc(r.name)}</b><div class="small muted">${r.is_default ? 'Alle Mitglieder (@everyone)' : 'Rang ' + r.position} · ${S.PERMS.filter(([b]) => (r.perms & b) !== 0).map(([, l]) => l.split(' (')[0]).join(', ') || 'keine Rechte'}</div></div><span class="muted">›</span></div>`).join('')}</div>
          <div class="rowb"><button class="btn ghost" data-close>Schließen</button><button class="btn" data-new>＋ Neue Rolle</button></div>`;
        box.querySelector('[data-close]').onclick = closeDlg;
        box.querySelector('[data-new]').onclick = () => { edit = {}; draw(box); };
        box.querySelectorAll('[data-role]').forEach((r) => r.onclick = () => { edit = st.roles.find((x) => x.id === r.dataset.role); draw(box); });
        return;
      }
      const r = edit.id ? edit : null; const perms = r ? r.perms : 0;
      box.innerHTML = `<h3>${r ? 'Rolle bearbeiten' : 'Neue Rolle'}</h3><input id="roN" maxlength="40" placeholder="Name (z. B. Moderator)" value="${esc(r ? r.name : '')}" ${r && r.is_default ? 'disabled' : ''}>
        <div style="display:flex;gap:8px;align-items:center"><span class="small">Farbe</span><input id="roC" type="color" value="${esc((r && r.color) || '#14b8a6')}" style="width:60px;height:32px;padding:0"> ${r && r.is_default ? '' : `<span class="small">Rang</span><input id="roP" type="number" min="1" max="99" value="${r ? r.position : 1}" style="width:70px">`}</div>
        ${root.ZMBoost ? root.ZMBoost.roleHtml(s, r) : ''}
        <div style="max-height:260px;overflow:auto">${S.PERMS.map(([b, l]) => `<label class="small chk"><input type="checkbox" data-perm="${b}" ${(perms & b) ? 'checked' : ''}> <span>${esc(l)}</span></label>`).join('')}</div>
        <div class="rowb">${r && !r.is_default ? '<button class="btn danger" data-del>Löschen</button>' : ''}<button class="btn ghost" data-back>Zurück</button><button class="btn" data-save>Speichern</button></div>`;
      box.querySelector('[data-back]').onclick = () => { edit = null; draw(box); };
      box.querySelector('[data-save]').onclick = () => tryDo(async () => {
        const p = [...box.querySelectorAll('[data-perm]')].filter((c) => c.checked).reduce((a, c) => a | +c.dataset.perm, 0);
        const pos = box.querySelector('#roP') ? Math.max(1, +box.querySelector('#roP').value || 1) : 0;
        await S.saveRole(s, r, r && r.is_default ? r.name : box.querySelector('#roN').value, box.querySelector('#roC').value, p, pos);
        if (root.ZMBoost) await root.ZMBoost.saveRole(s, r, box); edit = null; draw(box); toast('✓ Rolle gespeichert');
      });
      const del = box.querySelector('[data-del]'); if (del) del.onclick = () => { zAsk('Rolle „' + r.name + '“ löschen?', () => { tryDo(async () => { await S.deleteRole(s, r); edit = null; draw(box); }); }); };
    };
    dlg('', draw);
  }
  function bansDlg() {
    const s = S.openServer;
    const draw = (box) => tryDo(async () => {
      const l = await S.bans(s);
      box.innerHTML = `<h3>⛔ Gebannt</h3><div style="max-height:400px;overflow:auto">${l.length ? l.map((b) => `<div class="row" style="padding:6px 0">${uav(b.user_id, 's')}<div class="main"><b>${esc(S.nameOf(b.user_id))}</b><div class="small muted">${esc(b.reason || 'ohne Grund')} · ${clock(Date.parse(b.created_at))}</div></div><button class="link" data-unban="${esc(b.user_id)}">Aufheben</button></div>`).join('') : '<p class="small muted">Niemand ist gebannt.</p>'}</div>
        <div class="rowb"><button class="btn ghost" data-close>Schließen</button></div>`;
      box.querySelector('[data-close]').onclick = closeDlg;
      box.querySelectorAll('[data-unban]').forEach((b) => b.onclick = () => tryDo(async () => { await S.unban(s, b.dataset.unban); toast('✓ Bann aufgehoben'); draw(box); }));
    });
    dlg('<p class="small muted">Lädt …</p>', draw);
  }
  /** Mitglied: Rollen vergeben, entfernen, bannen */
  function memberDlg(s, u) {
    const draw = (box) => {
      const st = S.serverState.get(s); const m = st.members.find((x) => x.userId === u); if (!m) { closeDlg(); return; }
      const below = u !== Api.userId && S.rankOf(s, u) < S.rankOf(s, Api.userId);
      box.innerHTML = `<div style="text-align:center">${av(S.nameIn(s, u), 'xl', false, S.userPic(u))}<h3 style="margin:6px 0 0">${esc(S.nameIn(s, u))}</h3><div class="muted">@${esc((S.profiles.get(u) || {}).username || '')}</div></div>
        ${S.can(s, 2) ? `<div class="cat" style="padding-left:0">Rollen</div>${st.roles.filter((r) => !r.is_default).map((r) => `<label class="small chk"><input type="checkbox" data-mr="${esc(r.id)}" ${m.roles.has(r.id) ? 'checked' : ''} ${below || u === Api.userId ? '' : 'disabled'}> <span style="color:${esc(r.color || 'inherit')}">${esc(r.name)}</span></label>`).join('') || '<p class="small muted">Noch keine Rollen — unter „🎭 Rollen“ anlegen.</p>'}` : ''}
        ${u !== Api.userId ? '<button class="btn ghost" data-mp>👤 Profil ansehen</button>' : ''}
        ${below && S.can(s, 8) ? '<button class="btn ghost" data-kick>🚪 Aus dem Server entfernen</button>' : ''}
        ${below && S.can(s, 16) ? '<input id="banR" placeholder="Grund (freiwillig)" maxlength="300"><button class="btn danger" data-ban>⛔ Bannen</button>' : ''}
        <div class="rowb"><button class="btn ghost" data-close>Zurück</button></div>`;
      box.querySelector('[data-close]').onclick = () => { closeDlg(); membersDlg(); };
      box.querySelectorAll('[data-mr]').forEach((c) => c.onchange = () => tryDo(async () => { await S.setMemberRole(s, u, c.dataset.mr, c.checked); draw(box); }));
      const mp = box.querySelector('[data-mp]'); if (mp) mp.onclick = () => { closeDlg(); profileDlg(u); };
      const k = box.querySelector('[data-kick]'); if (k) k.onclick = () => { zAsk(S.nameIn(s, u) + ' aus dem Server entfernen? (Kann mit Einladung wieder beitreten.)', () => { tryDo(async () => { await S.kick(s, u); closeDlg(); membersDlg(); toast('✓ Entfernt'); }); }); };
      const bn = box.querySelector('[data-ban]'); if (bn) bn.onclick = () => { zAsk(S.nameIn(s, u) + ' bannen? (Kann nicht wieder beitreten, bis der Bann aufgehoben ist.)', () => { tryDo(async () => { await S.ban(s, u, box.querySelector('#banR').value); closeDlg(); membersDlg(); toast('✓ Gebannt'); }); }); };
    };
    dlg('', draw);
  }

  function chatMenuDlg() {
    const c = S.chats.get(S.openChat); if (!c) return;
    const other = c.members.find((m) => m.userId !== Api.userId);
    dlg(`<h3>${esc(c.title)}</h3>
      ${c.group ? `<div class="small muted">${c.members.length} Mitglieder: ${c.members.map((m) => m.userId === Api.userId ? 'Du' : `<span class="link" data-profile="${esc(m.userId)}" style="padding:0">${esc(S.nameOf(m.userId))}</span>`).join(', ')}</div>` : `<div class="small muted">@${esc(((S.profiles.get(other && other.userId)) || {}).username || '')}</div>`}
      ${c.group ? `<button class="btn" data-m="manage">👥 ${esc(tr0(c.admin ? 'Gruppe verwalten — Mitglieder, Einladungslink, Einstellungen' : 'Gruppe — Mitglieder, Beschreibung'))}</button>` : ''}
      <button class="btn" data-act="personalize">🎨 Chat anpassen — ${c.group ? 'Hintergrund, Sperre' : 'Spitzname, Hintergrund, Sperre'}</button>
      <button class="btn" data-zw="theme" data-chat-id="${esc(c.id)}">🎭 Chat-Design — ${c.theme && c.theme.name ? esc(c.theme.name) : 'für alle im Chat (Plus)'}</button>
      <button class="btn ghost" data-m="pin">${c.pinned ? '📌 Nicht mehr anheften' : '📌 Anheften'}</button>
      <button class="btn ghost" data-m="mute">${c.mutedUntil > Date.now() ? '🔕 ' + esc(S.muteLabel(c.mutedUntil)) + ' · ändern' : '🔕 Stummschalten …'}</button>
      ${!c.group && other ? '<button class="btn ghost" data-m="profile">👤 Profil ansehen</button>' : ''}
      <button class="btn ghost" data-m="archive">${c.archived ? '🗄 Aus dem Archiv holen' : '🗄 Archivieren'}</button>
      ${root.ZMA ? `<button class="btn ghost" data-m="folders">📁 ${esc(tr0('In Ordner …'))}${S.folders.filter((f) => f.chats.includes(c.id)).length ? ' (' + esc(S.folders.filter((f) => f.chats.includes(c.id)).map((f) => f.name).join(', ')) + ')' : ''}</button>` : ''}
      ${c.group && c.admin ? `<button class="btn ghost" data-act="groupPicture">${I("camera", 16)} Gruppenbild ändern</button>` : ""}
      <button class="btn ghost" data-m="gallery">${I("image", 16)} ${esc(tr0("Medien, Links und Dateien"))}</button>
      ${!c.self ? `<button class="btn ghost" data-m="receipts">${I("check", 16)} ${esc(tr0("Lesebestätigung in diesem Chat"))}${root.ZMStart && root.ZMStart.receipts.has(c.id) ? " · " + esc(tr0(root.ZMStart.receipts.get(c.id) ? "immer an" : "immer aus")) : ""}</button>` : ""}
      ${!c.group && other ? `<button class="btn ghost" data-m="safetyqr">${I("shield", 16)} ${esc(tr0("Sicherheitsnummer prüfen (QR-Code)"))}</button>` : `<button class="btn ghost" data-m="safety">${I("shield", 16)} ${esc(tr0("Sicherheitsnummer anzeigen"))}</button>`}
      ${c.group && c.onlyAdminsEdit && !c.admin ? '' : `<div class="small muted" style="margin-top:4px">⏱ Verschwindende Nachrichten · gilt für alle im Chat</div><div class="chips">${[[0, 'Aus'], [300, '5 Min.'], [3600, '1 Std.'], [86400, '24 Std.'], [604800, '7 Tage'], [7776000, '90 Tage']].map(([v, l]) => `<button class="chip ${c.disappear === v ? 'on' : ''}" data-dis="${v}">${l}</button>`).join('')}</div>`}
      ${!c.group && other ? '<button class="btn ghost" data-m="report">🚩 Melden</button>' : ''}
      ${!c.group && other ? "<button class=\"btn ghost\" data-m=\"delchat\">🗑 Chat löschen</button>" : ""}
      ${root.ZMChat2 ? root.ZMChat2.infoHtml(c) : ''}
      ${c.group ? '<button class="btn danger" data-m="leave">Gruppe verlassen</button>' : other ? '<button class="btn danger" data-m="block">Blockieren</button>' : ''}
      <div id="safety" class="small" style="font-family:Consolas,monospace"></div><div class="rowb"><button class="btn ghost" data-close>Schließen</button></div>`, (box) => {
      if (root.ZMChat2) root.ZMChat2.wireInfo(box, c, aH());
      box.querySelector('[data-close]').onclick = closeDlg;
      box.querySelectorAll('[data-dis]').forEach((b) => b.onclick = () => tryDo(async () => { await S.setDisappear(c.id, +b.dataset.dis); closeDlg(); toast(+b.dataset.dis ? '✓ Neue Nachrichten verschwinden automatisch' : '✓ Verschwindende Nachrichten aus'); renderAll(); }));
      box.querySelectorAll('[data-m]').forEach((b) => b.onclick = () => tryDo(async () => {
        const m = b.dataset.m;
        if (m === 'report') { closeDlg(); reportDlg(other.userId, null, null); return; }
        if (m === 'manage') { closeDlg(); root.ZMGroups.manageDlg(aH(), c.id); return; }
        if (m === 'gallery') { closeDlg(); root.ZMStart2.galleryDlg(aH(), c); return; }
        if (m === 'receipts') { closeDlg(); root.ZMStart.receiptsDlg(aH(), c); return; }
        if (m === 'safetyqr') { closeDlg(); await root.ZMStart2.safetyDlg(aH(), other.userId); return; }
        if (m === 'folders') { closeDlg(); root.ZMA.chatFolderDlg(aH(), c); return; }
        if (m === 'pin') await S.mine(c.id, 'pinned', !c.pinned);
        if (m === 'mute') { closeDlg(); muteDlg(c.title, c.mutedUntil, (until) => S.muteChat(c.id, until)); return; }
        if (m === 'profile') { closeDlg(); profileDlg(other.userId); return; }
        if (m === "delchat") { if (!await zConfirm(S.DELETE_CHAT_TEXT(c.title))) return; await S.deleteChatForMe(c.id); closeDlg(); renderAll(); return; }
        if (m === 'archive') { await S.mine(c.id, 'archived', !c.archived); if (!c.archived) S.openChat = null; }
        if (m === 'leave') { if (root.ZMChat2) { closeDlg(); root.ZMChat2.leaveDlg(c, aH()); return; } await S.leave(c.id); S.openChat = null; }
        if (m === 'block') { await S.block(other.userId); toast('Blockiert.'); }
        if (m === 'safety') {
          const mine = (await S.devices([Api.userId], true)).map((d) => d.signKey); const theirs = (await S.devices(c.members.filter((x) => x.userId !== Api.userId).map((x) => x.userId), true)).map((d) => d.signKey);
          box.querySelector('#safety').textContent = await root.ZMC.safetyNumber(mine, theirs) + '  — am Handy des anderen muss dieselbe Nummer stehen.';
          return;
        }
        closeDlg(); renderAll();
      }));
    });
  }

  function serverMenuDlg() {
    const s = S.servers.get(S.openServer); if (!s) return;
    dlg(`<h3>${esc(s.name)}</h3>${s.about ? `<p class="small muted">${esc(s.about)}</p>` : ''}
      ${S.can(s.id, 32) ? `<div>Einladungs-Code: <b>${esc(s.invite)}</b> <button class="link" data-copy>kopieren</button></div>` : ''}
      ${S.can(s.id, 128) ? `<button class="btn ghost" data-act="serverPicture">${I("camera", 16)} Server-Bild ändern</button>
      <label class="small" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="svPublic" style="width:auto" ${s.discoverable ? "checked" : ""}> ${I("globe", 16)} Server veröffentlichen — jeder kann ihn unter „Server entdecken“ finden und beitreten</label>` : ""}
      <button class="btn ghost" data-m2="mute">${s.mutedUntil > Date.now() ? '🔕 ' + esc(S.muteLabel(s.mutedUntil)) + ' · ändern' : '🔕 Server stummschalten …'}</button>
      <button class="btn ghost" data-m2="events">📅 Termine</button>
      <button class="btn ghost" data-m2="members">👥 Mitglieder${S.can(s.id, 256) ? ' & Auszeit' : ''}</button>
      ${S.can(s.id, 128) ? '<button class="btn ghost" data-m2="community">🧭 Community & Zunora-AI-Bot</button>' : ''}
      ${S.can(s.id, 128) && root.ZMStart2 ? '<button class="btn ghost" data-m2="automod">' + I('shield', 16) + ' ' + esc(tr0('Auto-Moderation und Verlauf')) + '</button>' : ''}
      ${S.can(s.id, 128) || s.rules ? '<button class="btn ghost" data-m2="rules">📜 Regeln</button>' : ''}
      ${S.can(s.id, 2) ? '<button class="btn ghost" data-m2="roles">🎭 Rollen</button>' : ''}
      <button class="btn ghost" data-m2="boost">🚀 Server-Boost</button>
      ${S.can(s.id, 16) ? '<button class="btn ghost" data-m2="bans">⛔ Gebannte</button>' : ''}
      ${s.owner === Api.userId ? '' : '<button class="btn danger" data-leave>Server verlassen</button>'}
      <div class="rowb"><button class="btn ghost" data-close>Schließen</button></div>`, (box) => {
      box.querySelector('[data-close]').onclick = closeDlg;
      const cp = box.querySelector('[data-copy]'); if (cp) cp.onclick = () => { navigator.clipboard.writeText(`Komm auf meinen Server „${s.name}“ im Zunora Messenger!\nEinladungs-Code: ${s.invite}`); toast('✓ Einladung kopiert'); };
      const lv = box.querySelector('[data-leave]'); if (lv) lv.onclick = () => tryDo(async () => { await S.leaveServer(s.id); closeDlg(); view = 'chats'; S.openServer = null; S.openChannel = null; renderAll(); });
      const pub = box.querySelector('#svPublic'); if (pub) pub.onchange = () => tryDo(async () => { await S.saveCommunity(s.id, { discoverable: pub.checked, tags: s.tags, persona: s.persona, welcomeChannel: s.welcomeChannel, welcomeText: s.welcomeText }); toast(pub.checked ? '✓ Dein Server ist jetzt unter „Server entdecken“ zu finden' : '✓ Nicht mehr öffentlich'); });
      box.querySelectorAll('[data-m2]').forEach((b) => b.onclick = () => { const m = b.dataset.m2; closeDlg(); if (m === 'automod') { root.ZMStart2.loadAutomod(aH(), s.id).then(() => root.ZMStart2.automodDlg(aH(), s.id)); return; } if (m === 'mute') muteDlg(s.name, s.mutedUntil, (until) => S.muteServer(s.id, until)); else if (m === 'rules') rulesDlg(); else if (m === 'roles') rolesDlg(); else if (m === 'boost') { if (root.ZMBoost) root.ZMBoost.dlg(s.id); } else if (m === 'bans') bansDlg(); else if (m === 'events') eventsDlg(); else if (m === 'members') membersDlg(); else communityDlg(); });
    });
  }
  function newChannelDlg() {
    const s = S.openServer;
    dlg(`<h3>Kanal anlegen</h3><input id="cN" placeholder="Name (z. B. hausaufgaben)" maxlength="40"><select id="cK"><option value="text"># Text</option><option value="announcement">📢 Ankündigungen</option><option value="forum">💬 Forum</option><option value="voice">🔊 Sprache</option></select>
      <input id="cC" placeholder="Kategorie (z. B. Textkanäle)" maxlength="40" value="Textkanäle"><input id="cT" placeholder="Thema (freiwillig)" maxlength="300">
      <div class="rowb"><button class="btn ghost" data-close>Abbrechen</button><button class="btn" data-go>Anlegen</button></div>`, (box) => {
      box.querySelector('[data-close]').onclick = closeDlg;
      box.querySelector('[data-go]').onclick = () => tryDo(async () => { await S.saveChannel(s, box.querySelector('#cN').value, box.querySelector('#cK').value, box.querySelector('#cC').value, box.querySelector('#cT').value); closeDlg(); });
    });
  }
  function newPostDlg() {
    dlg(`<h3>Neuer Beitrag</h3><input id="pT" placeholder="Titel" maxlength="100"><textarea id="pB" rows="5" placeholder="Worum geht es?" maxlength="4000"></textarea>
      <div class="rowb"><button class="btn ghost" data-close>Abbrechen</button><button class="btn" data-go>Veröffentlichen</button></div>`, (box) => {
      box.querySelector('[data-close]').onclick = closeDlg;
      box.querySelector('[data-go]').onclick = () => { const t = box.querySelector('#pT').value.trim(); if (!t) return toast('Bitte einen Titel.', true);
        tryDo(async () => { await S.sendChannel(S.openChannel, { t: box.querySelector('#pB').value.trim() }, 'text', null, t); closeDlg(); }); };
    });
  }

  // ====================================================================== Beta 2: Updates im Messenger
  let updProgress = -1;
  /** Beim Start (abschaltbar): gibt es eine neuere Version? Dann ganz oben in den Einstellungen + „1" am Zahnrad. */
  async function checkUpdate(force) {
    if (!root.Host || !root.Host.available) return;
    try { const v = await root.Host.call('app.version'); S.appVersion = v && v.version; S.msstore = !!(v && v.msstore); } catch (e) { }
    if (!force && localStorage.getItem('zm-update') === '0') return;
    try { const r = await root.Host.call('update.check'); S.update = r && r.available ? r : null; renderRail(); if (view === 'settings') renderList(); } catch (e) { }
  }
  function updCard() {
    const u = S.update; if (!u) return '';
    return `<div class="updcard"><div style="display:flex;gap:10px;align-items:center">${I('update', 22)}<div style="flex:1"><b>Update verfügbar: ${esc(u.version)}</b>
      <div class="small muted">Installiert: ${esc(u.current || S.appVersion || '?')} · ${((u.size || 0) / 1048576).toFixed(1)} MB</div></div></div>
      ${u.notes ? `<div class="small" style="white-space:pre-wrap">${esc(u.notes.slice(0, 600))}</div>` : ''}
      ${updProgress >= 0 ? `<div class="small">Lädt … ${updProgress} %</div><div class="bar"><i style="width:${updProgress}%"></i></div>` : '<button class="btn" data-act="doUpdate">Jetzt aktualisieren</button>'}
      <div class="small muted">Der Messenger startet danach kurz neu.</div></div>`;
  }
  async function startUpdate() {
    if (updProgress >= 0) return;
    if (Call.callId && !await zConfirm('Gerade läuft ein Anruf. Trotzdem jetzt aktualisieren (der Messenger startet neu)?')) return;
    updProgress = 0; renderList();
    root.Host.call('update.start').catch((e) => { updProgress = -1; renderList(); toast(e.message, true); });
  }
  if (root.Host && root.Host.on) root.Host.on('update.progress', (p) => { updProgress = Math.max(0, Math.min(100, +p || 0)); if (view === 'settings') renderList(); });

  // ====================================================================== Beta 2: Bilder (Foto / KI), Server entdecken
  /** Bild quadratisch zuschneiden (Mitte) → 512 px JPEG. */
  async function squareJpeg(src) {
    const bmp = await createImageBitmap(src);
    const s = Math.min(bmp.width, bmp.height), cv = document.createElement('canvas'); cv.width = cv.height = 512;
    cv.getContext('2d').drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, 512, 512);
    return new Uint8Array(await (await new Promise((ok) => cv.toBlob(ok, 'image/jpeg', 0.85))).arrayBuffer());
  }
  /** target: 'me' | 'chat:<id>' | 'server:<id>' */
  function pictureDlg(target, title, current) {
    let jpeg = null, prompt = '';
    const draw = (box, mode) => {
      box.innerHTML = `<h3>${esc(title)}</h3>` + (mode === 'ki'
        ? `<textarea id="pkPrompt" rows="3" maxlength="300" placeholder="Beschreibe dein Bild (z. B. „Fuchs mit Sonnenbrille im Comic-Stil“)">${esc(prompt)}</textarea>
           <p class="small muted" style="margin:0">Deine Beschreibung geht an einen kostenlosen KI-Bilddienst im Internet (Pollinations). Keine Fotos von echten Personen beschreiben.</p>
           <div class="rowb"><button class="btn ghost" data-back>Zurück</button><button class="btn" data-gen>${I('sparkle', 16)} Bild erstellen</button></div>`
        : mode === 'vorschau'
          ? `<img class="picprev" src="${URL.createObjectURL(new Blob([jpeg], { type: 'image/jpeg' }))}" style="border-radius:${target.startsWith('server:') ? '30%' : '50%'}">
             <div class="rowb"><button class="btn ghost" data-back>Anderes Bild</button><button class="btn" data-save>Übernehmen</button></div>`
          : `<button class="btn ghost" data-file>${I('image', 18)} Foto auswählen</button><button class="btn ghost" data-ki>${I('sparkle', 18)} Mit KI erstellen</button>
             ${current ? `<button class="btn danger" data-rm>${I('trash', 18)} Bild entfernen</button>` : ''}
             <p class="small muted">${target.startsWith('server:') ? 'Server-Bilder sind öffentlich sichtbar (auch in „Server entdecken“).' : target.startsWith('chat:') ? '🔒 Ende-zu-Ende verschlüsselt: Sehen können es nur die Mitglieder dieser Gruppe — nicht Zunora.' : '🔒 Ende-zu-Ende verschlüsselt: Sehen können es nur deine Freunde, deine Chat-Partner und Mitglieder deiner Server — nicht Zunora.'}</p><input type="file" id="pkFile" accept="image/*" class="hidden">
             <div class="rowb"><button class="btn ghost" data-close>Schließen</button></div>`);
      const on = (sel, f) => { const e = box.querySelector(sel); if (e) e.onclick = f; };
      on('[data-close]', closeDlg); on('[data-back]', () => draw(box, 'start')); on('[data-ki]', () => draw(box, 'ki'));
      on('[data-file]', () => box.querySelector('#pkFile').click());
      const fi = box.querySelector('#pkFile'); if (fi) fi.onchange = () => { const f = fi.files[0]; if (f) tryDo(async () => { jpeg = await squareJpeg(f); prompt = ''; draw(box, 'vorschau'); }); };
      on('[data-gen]', () => { prompt = box.querySelector('#pkPrompt').value.trim(); if (prompt.length < 3) return toast('Bitte etwas genauer beschreiben.', true);
        const b = box.querySelector('[data-gen]'); b.disabled = true; b.textContent = 'Wird gemalt … (bis zu 30 s)';
        tryDo(async () => { try { const r = await root.Host.call('image.generate', { prompt }); const bytes = Uint8Array.from(atob(r.base64), (ch) => ch.charCodeAt(0)); jpeg = await squareJpeg(new Blob([bytes], { type: 'image/jpeg' })); draw(box, 'vorschau'); } finally { b.disabled = false; } }); });
      on('[data-save]', () => tryDo(async () => { await S.setPicture(target, jpeg); closeDlg(); toast('✓ Bild gespeichert'); renderAll(); }));
      on('[data-rm]', () => tryDo(async () => { await S.setPicture(target, null); closeDlg(); toast('✓ Bild entfernt'); renderAll(); }));
    };
    dlg('', (box) => draw(box, 'start'));
  }

  function discoverDlg() {
    dlg(`<h3>${I('compass', 20)} Server entdecken</h3><p class="small muted" style="margin:0">Öffentliche Server, denen jeder beitreten kann. Deinen eigenen Server veröffentlichst du im Server-Menü (${I('settings', 14)}) → „Server veröffentlichen“.</p>
      <input id="svDisc" placeholder="Suchen (Name, Thema, Stichwort) …"><div id="svFound" style="max-height:420px;overflow:auto"></div><div class="rowb"><button class="btn ghost" data-close>Schließen</button></div>`, (box) => {
      box.querySelector('[data-close]').onclick = closeDlg;
      const dq = box.querySelector('#svDisc'); let dt = null;
      const find = () => S.discover(dq.value).then((l) => { box.querySelector('#svFound').innerHTML = discoverHtml(l);
        box.querySelectorAll('[data-join]').forEach((b) => b.onclick = () => tryDo(async () => { const id = await S.joinPublic(b.dataset.join); closeDlg(); view = 'server'; S.openServer = id; S.openChannel = null; await S.loadServer(id); renderAll(); })); })
        .catch((e) => { box.querySelector('#svFound').innerHTML = `<p class="small muted">${esc(e.message)}</p>`; });
      dq.oninput = () => { clearTimeout(dt); dt = setTimeout(find, 300); }; find(); dq.focus();
    });
  }

  // ====================================================================== Ausbau-Dialoge
  /** Zunora Plus: Navigationsleiste bearbeiten (höchstens 5 Reiter) */
  function navEditDlg() {
    if (dlgOpen) return;
    if (!(root.ZMPlus && root.ZMPlus.on())) {
      dlg(`<h3>Navigationsleiste bearbeiten</h3><p class="muted">Mit Zunora Plus kannst du die Leiste selbst zusammenstellen — Reiter entfernen, hinzufügen und sortieren (höchstens 5).</p>
        <div class="rowb"><button class="btn ghost" data-close>Schließen</button><button class="btn" data-goplus>Zu Zunora Plus</button></div>`, (box) => {
        box.querySelector('[data-close]').onclick = closeDlg;
        box.querySelector('[data-goplus]').onclick = () => { closeDlg(); view = 'settings'; settingsPage = 'plus'; renderAll(); };
      });
      return;
    }
    dlg('', (box) => root.ZMPlus.navEditor(box, () => { closeDlg(); renderAll(); }));
  }

  // Eigene Sticker (Zunora Plus): nur auf diesem PC gespeichert (als Bild-Daten), höchstens 30
  function ownList() { try { return JSON.parse(localStorage.getItem('zm-eigene-sticker') || '[]') || []; } catch (e) { return []; } }
  function ownSave(u) { const l = [u, ...ownList()].slice(0, 30); try { localStorage.setItem('zm-eigene-sticker', JSON.stringify(l)); } catch (e) { throw new Error('Kein Platz mehr für eigene Sticker — lösche ein paar (Rechtsklick).'); } }
  /** Foto → Sticker: 512 × 512, runde Ecken, weißer Rand, durchsichtiger Hintergrund */
  async function ownMake(file) {
    const img = await createImageBitmap(file); const n = 512, b = 14, r = n * 0.22, side = Math.min(img.width, img.height);
    const c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d');
    const rr = (p, rad) => { x.beginPath(); x.roundRect(p, p, n - 2 * p, n - 2 * p, rad); };
    rr(2, r); x.fillStyle = '#fff'; x.fill();
    x.save(); rr(b, r - b); x.clip(); x.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, n, n); x.restore();
    return c.toDataURL('image/png');
  }
  function stickerDlg() {
    const chat = S.openChat; let tab = X.recent().length ? 'zuletzt' : X.MOVING[0].id;
    const plus = !!(root.ZMPlus && root.ZMPlus.on());
    const packs = X.MOVING.concat(X.PACKS, plus ? root.ZMPlus.PACKS : []);     // bewegte Sticker für alle; Zunora Plus: riesige Auswahl
    const draw = (box) => {
      const items = tab === 'zuletzt' ? X.recent() : (packs.find((p) => p.id === tab) || {}).items || [];
      const chips = (X.recent().length ? [['zuletzt', '🕘 Zuletzt']] : []).concat(plus ? [['ki', '✨ KI'], ['eigene', '✂️ Eigene']] : []).concat(packs.map((p) => [p.id, p.name])).concat(plus ? [] : [['mehr', '✨ Mehr mit Plus']]);
      const body = tab === 'ki' ? `<div class="zp-row"><input id="kiSt" placeholder="Was soll der Sticker zeigen? z. B. Katze mit Sonnenbrille" maxlength="160" style="flex:1"><button class="btn" id="kiGo">✨ Malen</button></div>
          <div id="kiOut"></div>${root.ZMPlus.myAi().length ? `<p class="small muted">Meine KI-Sticker</p><div class="sticker-grid">${root.ZMPlus.myAi().map((u, i) => `<button class="sticker-pick" data-ai="${i}"><img src="${u}" style="width:84px;height:84px;border-radius:18px;object-fit:cover"></button>`).join('')}</div>` : ''}
          <p class="small muted">Die Beschreibung geht an den kostenlosen KI-Bilddienst Pollinations. Der Sticker wird als Bild gesendet — Ende-zu-Ende verschlüsselt.</p>`
        : tab === 'eigene' ? `<p class="small muted">Mach aus deinen Fotos Sticker. Rechtsklick = löschen.</p><div class="sticker-grid"><button class="sticker-pick own-add" id="ownAdd" title="Foto wählen">＋</button>${ownList().map((u, i) => `<button class="sticker-pick" data-own="${i}"><img src="${u}" style="width:84px;height:84px"></button>`).join('')}</div><input type="file" id="ownFile" accept="image/*" class="hidden">`
        : tab === 'mehr' ? `<p class="muted">Mit Zunora Plus bekommst du ${root.ZMPlus ? root.ZMPlus.PACKS.length : 11} weitere Sticker-Pakete mit ${root.ZMPlus ? root.ZMPlus.count : 300} Stickern — und die KI malt dir eigene Sticker. Zu finden unter Mehr → Zunora Plus.</p>`
        : `<div class="sticker-grid">${items.map((st, i) => `<button class="sticker-pick" data-i="${i}" title="${esc(st.w || st.s)}">${X.html(st, 84, true)}</button>`).join('')}</div>`;
      box.innerHTML = `<h3>Sticker</h3><div class="chips">${chips.map(([id, n]) => `<button class="chip ${tab === id ? 'on' : ''}" data-tab="${id}">${esc(n)}</button>`).join('')}</div>
        ${body}
        <p class="small muted">Sticker sind wie alle Chat-Nachrichten Ende-zu-Ende verschlüsselt.</p><div class="rowb"><button class="btn ghost" data-close>Schließen</button></div>`;
      box.querySelector('[data-close]').onclick = closeDlg;
      box.querySelectorAll('[data-tab]').forEach((b) => b.onclick = () => { tab = b.dataset.tab; draw(box); });
      const sendAi = (url) => { closeDlg(); tryDo(() => S.sendFile(chat, root.ZMPlus.fileOf(url))); };
      box.querySelectorAll('[data-ai]').forEach((b) => b.onclick = () => sendAi(root.ZMPlus.myAi()[+b.dataset.ai]));
      const kg = box.querySelector('#kiGo');
      if (kg) kg.onclick = async () => { const p = box.querySelector('#kiSt').value.trim(); if (!p) return; kg.disabled = true; kg.textContent = 'KI malt …';
        try { const url = await root.ZMPlus.aiSticker(p); box.querySelector('#kiOut').innerHTML = `<div class="zp-row"><img src="${url}" style="width:110px;height:110px;border-radius:22px"><button class="btn" id="kiSend">Senden</button></div>`;
          box.querySelector('#kiSend').onclick = () => { root.ZMPlus.keepAi(url); sendAi(url); }; }
        catch (e) { toast(e.message || String(e), true); } kg.disabled = false; kg.textContent = '✨ Malen'; };
      const oa = box.querySelector('#ownAdd'), of = box.querySelector('#ownFile');
      if (oa && of) { oa.onclick = () => of.click(); of.onchange = () => { const f = of.files && of.files[0]; if (f) tryDo(async () => { ownSave(await ownMake(f)); draw(box); }); }; }
      box.querySelectorAll('[data-own]').forEach((b) => {
        b.onclick = () => { const u = ownList()[+b.dataset.own]; closeDlg(); const rp = replyTo; replyTo = null; bars('');
          tryDo(async () => S.sendOwnSticker(chat, await (await fetch(u)).blob(), rp && rp.id)); };
        b.oncontextmenu = (e) => { e.preventDefault(); const l = ownList(); l.splice(+b.dataset.own, 1); try { localStorage.setItem('zm-eigene-sticker', JSON.stringify(l)); } catch (x) { } draw(box); };
      });
      box.querySelectorAll('[data-i]').forEach((b) => b.onclick = () => { const st = items[+b.dataset.i]; X.used(st); closeDlg();
        const rp = replyTo; replyTo = null; bars(''); tryDo(() => S.send(chat, 'sticker', Object.assign({ s: st.s, w: st.w, c: st.c }, st.a ? { a: st.a } : {}), rp && rp.id)); });
    };
    dlg('', draw);
  }

  /** Melden mit Grund (Digital Services Act). evidence = Inhalt der einen Nachricht (bei verschlüsselten Chats). */
  function reportDlg(user, msgId, evidence) {
    dlg(`<h3>🚩 Melden</h3><p class="small muted">${evidence !== null ? 'Der Inhalt dieser einen Nachricht wird mitgeschickt, damit Zunora die Meldung prüfen kann.' : 'Warum meldest du das?'}</p>
      ${X.REPORT_REASONS.map((r, i) => `<label class="pick"><input type="radio" name="rr" value="${i}" style="width:auto"> ${esc(r)}</label>`).join('')}
      <input id="rNote" placeholder="Was ist passiert? (freiwillig)" maxlength="500">
      ${user && !S.blocked.has(user) && S.chats.get(S.openChat) && !S.chats.get(S.openChat).group ? '<label class="small"><input type="checkbox" id="rBlock" style="width:auto"> Diese Person auch blockieren</label>' : ''}
      <div class="rowb"><button class="btn ghost" data-close>Abbrechen</button><button class="btn" data-go>Meldung senden</button></div>`, (box) => {
      box.querySelector('[data-close]').onclick = closeDlg;
      box.querySelector('[data-go]').onclick = () => {
        const sel = box.querySelector('input[name=rr]:checked'); if (!sel) return toast('Bitte einen Grund wählen.', true);
        const note = box.querySelector('#rNote').value.trim(); const blk = box.querySelector('#rBlock');
        tryDo(async () => { await S.report(user, msgId, X.REPORT_REASONS[+sel.value] + (note ? ': ' + note : ''), evidence); if (blk && blk.checked) await S.block(user); closeDlg(); toast('Danke — die Meldung ist eingegangen.' + (blk && blk.checked ? ' Die Person ist blockiert.' : '')); });
      };
    });
  }

  function discoverHtml(list) {
    return list.length ? list.map((p) => `<div class="post" style="margin:6px 0"><div style="display:flex;gap:10px;align-items:center">${av(p.name, 's', false, S.pic(p.icon_path))}<b>${esc(p.name)}</b></div>${p.about ? `<div class="small muted">${esc(p.about.slice(0, 200))}</div>` : ''}
      <div class="small muted">${p.members} Mitglieder${p.tags ? ' · ' + esc(p.tags) : ''}</div>${p.joined ? '<div class="small" style="color:var(--ok,#2FBF71)">✓ Du bist Mitglied</div>' : `<button class="btn" data-join="${esc(p.id)}" style="margin-top:6px">Beitreten</button>`}</div>`).join('')
      : '<p class="small muted">Nichts gefunden.</p>';
  }

  function eventsDlg() {
    const s = S.openServer;
    dlg(`<h3>📅 Termine</h3><div id="evList" class="small muted">Lädt …</div><div class="rowb"><button class="btn ghost" data-close>Schließen</button></div>`, (box) => {
      box.querySelector('[data-close]').onclick = closeDlg;
      S.events(s).then((l) => { box.querySelector('#evList').innerHTML = l.length ? l.map((e) => `<div class="post" data-evch="${esc(e.channel)}" style="margin:6px 0;cursor:pointer"><b>${esc(e.title)}</b>
        <div class="small" style="color:${e.at < Date.now() ? 'var(--sub)' : 'var(--accent)'}">${esc(new Date(e.at).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }))}${e.place ? ' · 📍 ' + esc(e.place) : ''} · #${esc((S.channel(e.channel) || {}).name || '')}</div></div>`).join('')
        : 'Keine kommenden Termine. Termine legst du in einem Kanal über 📊 → Termin an.';
        box.querySelectorAll('[data-evch]').forEach((x) => x.onclick = () => { closeDlg(); S.openChannel = x.dataset.evch; S.openThread = null; renderAll(); }); }).catch((e) => toast(e.message, true));
    });
  }

  function membersDlg() {
    const s = S.openServer; if (!S.serverState.get(s)) return;
    const mine = S.rankOf(s, Api.userId); const canTo = S.can(s, 256);
    const draw = (box) => {
      const st = S.serverState.get(s);          // nach jeder Änderung neu (loadServer legt einen frischen Stand an)
      const list = [...st.members].sort((a, b) => S.rankOf(s, b.userId) - S.rankOf(s, a.userId));
      box.innerHTML = `<h3>👥 Mitglieder (${list.length})</h3><div style="max-height:420px;overflow:auto">${list.map((m) => {
        const below = m.userId !== Api.userId && S.rankOf(s, m.userId) < mine;
        const to = m.timeoutUntil > Date.now();
        return `<div class="pick" style="cursor:default"><span data-mem="${esc(m.userId)}" style="cursor:pointer">${av(S.nameIn(s, m.userId), 's', false, S.userPic(m.userId))}</span><div style="flex:1;cursor:pointer" data-mem="${esc(m.userId)}"><b>${esc(S.nameIn(s, m.userId))}</b>${(S.servers.get(s) || {}).owner === m.userId ? ' 👑' : ''}
          <div class="small muted">@${esc((S.profiles.get(m.userId) || {}).username || '')}${to ? ' · ⏸ Auszeit bis ' + new Date(m.timeoutUntil).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}</div></div>
          ${canTo && below ? `<select data-to="${esc(m.userId)}"><option value="">Auszeit …</option><option value="10">10 Min.</option><option value="60">1 Std.</option><option value="1440">1 Tag</option><option value="10080">1 Woche</option>${to ? '<option value="0">Aufheben</option>' : ''}</select>` : ''}</div>`;
      }).join('')}</div><p class="small muted">Auszeit = das Mitglied kann lesen, aber eine Weile nicht schreiben. Mitglied anklicken: Rollen, entfernen, bannen.</p><div class="rowb"><button class="btn ghost" data-close>Schließen</button></div>`;
      box.querySelector('[data-close]').onclick = closeDlg;
      box.querySelectorAll('[data-mem]').forEach((x) => x.onclick = () => { closeDlg(); memberDlg(s, x.dataset.mem); });
      box.querySelectorAll('[data-to]').forEach((sel) => sel.onchange = () => { if (sel.value === '') return;
        tryDo(async () => { await S.setTimeoutFor(s, sel.dataset.to, +sel.value); toast(+sel.value ? '✓ Auszeit gegeben' : '✓ Auszeit aufgehoben'); draw(box); }); });
    };
    dlg('', draw);
  }

  function communityDlg() {
    const s = S.servers.get(S.openServer); const st = S.serverState.get(S.openServer); if (!s || !st) return;
    const chans = st.channels.filter((c) => ['text', 'announcement', 'forum'].includes(c.kind));
    dlg(`<h3>🧭 Community & Zunora-AI-Bot</h3>
      <label class="small" style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" id="cmDisc" style="width:auto" ${s.discoverable ? 'checked' : ''}> In „Server entdecken“ zeigen — dann kann jeder mit Zunora ID den Server finden und ohne Code beitreten (Name, Beschreibung und Mitgliederzahl sind dann öffentlich).</label>
      <input id="cmTags" placeholder="Stichworte (z. B. Gaming, Fußball, Lernen)" maxlength="120" value="${esc(s.tags)}">
      <b>👋 Willkommens-Bot</b><select id="cmWc"><option value="">Aus</option>${chans.map((c) => `<option value="${esc(c.id)}" ${s.welcomeChannel === c.id ? 'selected' : ''}>#${esc(c.name)}</option>`).join('')}</select>
      <textarea id="cmWt" rows="2" maxlength="500" placeholder="Begrüßung (z. B. „Schön, dass du da bist! Lies bitte #regeln.“)">${esc(s.welcomeText)}</textarea>
      <b>✨ Zunora-AI-Bot</b><p class="small muted" style="margin:0">Wer in einem Kanal @Zunora schreibt, bekommt eine Antwort der kostenlosen Zunora AI (je Kanal abschaltbar über ⚙️ im Kanal). Hier legst du fest, wie der Bot auftritt.</p>
      <textarea id="cmPersona" rows="3" maxlength="600" placeholder="Rolle des Bots (z. B. „Du hilfst unserer Lerngruppe bei Mathe, erklärst Schritt für Schritt.“)">${esc(s.persona)}</textarea>
      <div class="rowb"><button class="btn ghost" data-close>Abbrechen</button><button class="btn" data-go>Speichern</button></div>`, (box) => {
      box.querySelector('[data-close]').onclick = closeDlg;
      box.querySelector('[data-go]').onclick = () => tryDo(async () => {
        await S.saveCommunity(s.id, { discoverable: box.querySelector('#cmDisc').checked, tags: box.querySelector('#cmTags').value, welcomeChannel: box.querySelector('#cmWc').value,
          welcomeText: box.querySelector('#cmWt').value, persona: box.querySelector('#cmPersona').value });
        closeDlg(); toast('✓ Gespeichert');
      });
    });
  }

  function channelSettingsDlg() {
    const c = S.channel(S.openChannel); if (!c) return;
    const on = c.ai_mode !== 'off';
    dlg(`<h3>⚙️ #${esc(c.name)}</h3>
      <label class="small" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="chAi" style="width:auto" ${on ? 'checked' : ''}> Zunora AI in diesem Kanal (wer @Zunora schreibt, bekommt eine Antwort)</label>
      <p class="small muted">Name, Thema, langsamer Modus und Sichtbarkeit änderst du im Messenger am Handy (⚙ im Server → Kanäle).</p>
      <div class="rowb"><button class="btn ghost" data-close>Abbrechen</button><button class="btn" data-go>Speichern</button></div>`, (box) => {
      box.querySelector('[data-close]').onclick = closeDlg;
      box.querySelector('[data-go]').onclick = () => tryDo(async () => { await S.setAiMode(c.server_id, c.id, box.querySelector('#chAi').checked ? 'mention' : 'off'); closeDlg(); mainKey = ''; renderAll(); toast('✓ Gespeichert'); });
    });
  }

  /** Rückfrage im Zunora-Look (statt Windows-Fenster „Diese Seite sagt …“) */
  function zConfirm(text) {
    return new Promise((ok) => {
      const o = document.createElement('div'); o.className = 'zask';
      const [head, ...rest] = String(text).split('\n\n');
      o.innerHTML = `<div class="dlg"><h3>${esc(head)}</h3>${rest.length ? `<p>${esc(rest.join(' '))}</p>` : ''}<div class="rowb"><button class="btn ghost" data-no>Abbrechen</button><button class="btn" data-yes>OK</button></div></div>`;
      const done = (v) => { o.remove(); document.removeEventListener('keydown', key, true); ok(v); };
      const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); done(false); } if (e.key === 'Enter') { e.stopPropagation(); done(true); } };
      o.onclick = (e) => { e.stopPropagation(); if (e.target === o || e.target.closest('[data-no]')) done(false); else if (e.target.closest('[data-yes]')) done(true); };
      document.addEventListener('keydown', key, true); document.body.appendChild(o); o.querySelector('[data-yes]').focus();
    });
  }
  function zAsk(text, then) { zConfirm(text).then((y) => { if (y) then(); }); }

  // ====================================================================== Klicks (ein Verteiler für alles)
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act],[data-view],[data-server],[data-chat],[data-channel],[data-voice],[data-status],[data-accept],[data-dm],[data-unfriend],[data-request],[data-revoke],[data-react],[data-reply],[data-edit],[data-del],[data-report],[data-vote],[data-rsvp],[data-file],[data-thread],[data-creact],[data-cdel],[data-cpin],[data-creport],[data-cfile],[data-jump],[data-profile],img.media');
    if (!t || dlgOpen && !t.closest('#zm-overlay')) return;
    const d = t.dataset;
    if (d.jump) { const b = document.querySelector(`[data-msg="${CSS.escape(d.jump)}"]`); if (b) { b.scrollIntoView({ block: 'center', behavior: 'smooth' }); b.classList.add('flash'); setTimeout(() => b.classList.remove('flash'), 1600); } return; }
    if (d.chat && d.hit) { S.openChat = d.chat; renderAll(); setTimeout(() => { const b = document.querySelector(`[data-msg="${CSS.escape(d.hit)}"]`); if (b) { b.scrollIntoView({ block: 'center' }); b.classList.add('flash'); setTimeout(() => b.classList.remove('flash'), 1600); } }, 700); return; }
    const msgOf = () => { const b = t.closest('[data-msg]'); return b && (S.messages.get(S.openChat) || []).find((m) => m.id === b.dataset.msg); };
    const cmsgOf = () => { const b = t.closest('[data-cmsg]'); return b && S.findCh(b.dataset.cmsg); };
    if (d.profile) { e.stopPropagation(); profileDlg(d.profile); return; }
    if (d.view === 'notizen') { tryDo(async () => { const id = await S.selfChat(); view = 'chats'; S.openChat = id; renderAll(); }); return; }
    if (d.view === 'plus') { view = 'settings'; settingsPage = 'plus'; renderAll(); return; }
    if (d.view) { view = d.view; if (view !== 'server') S.openChannel = null; if (view === 'calls') callList = null; renderAll(); return; }
    if (d.server) { view = 'server'; if (S.Follow) { S.Follow.showing = false; S.Follow.open = null; } if (S.openServer !== d.server) { S.openServer = d.server; S.openChannel = null; S.openThread = null; } renderAll(); return; }
    if (d.chat && !d.act) { if (view === 'calls') view = 'chats'; S.openChat = d.chat; renderAll(); return; }
    if (d.channel) { S.openChannel = d.channel; S.openThread = null; renderAll(); return; }
    if (d.voice) { if (Call.channelId === d.voice) { Call.minimized = false; renderCall(); } else tryDo(() => Call.joinVoice(d.voice)); return; }
    if (d.thread) { S.openThread = d.thread; renderAll(); return; }
    if (d.status) { statusView(d.status); return; }
    if (d.accept) { const f = S.friends.find((x) => x.p.id === d.accept); tryDo(() => S.accept(f.p)); return; }
    if (d.withdraw) { const f = S.friends.find((x) => x.p.id === d.withdraw); if (f) tryDo(async () => { await S.withdraw(f.p); toast(f.st === 'outgoing' ? '↩ Anfrage zurückgezogen' : 'Anfrage abgelehnt'); }); return; }
    if (d.request) { tryDo(async () => { const p = (await S.search($('#friendSearch').value)).find((x) => x.id === d.request); await S.request(p); toast('✓ Anfrage geschickt'); $('#friendSearch').dispatchEvent(new Event('input')); }); return; }
    if (d.dm) { const f = S.friends.find((x) => x.p.id === d.dm); tryDo(async () => { const id = await S.openDirect(f.p); view = 'chats'; S.openChat = id; renderAll(); }); return; }
    if (d.unfriend) { const f = S.friends.find((x) => x.p.id === d.unfriend); zAsk(S.UNFRIEND_TEXT(f.p.name), () => { tryDo(() => S.unfriend(f.p)); }); return; }
    if (d.revoke) { zAsk('Dieses Gerät abmelden? Es verliert sofort den Zugang.', () => { tryDo(async () => { await S.revoke(d.revoke); renderList(); }); }); return; }
    if (d.vote) { tryDo(() => S.vote(d.vote, +d.opt, d.multi === '1')); return; }
    if (d.rsvp) { tryDo(() => S.rsvp(d.rsvp, d.a)); return; }
    if (d.react !== undefined) { const m = msgOf(); if (m) tryDo(() => S.react(m, d.react)); return; }
    if (d.reply !== undefined) { replyTo = msgOf(); bars(''); $('#mInput').focus(); return; }
    if (d.edit !== undefined) { editing = msgOf(); $('#mInput').value = (editing.content || {}).t || ''; bars(''); $('#mInput').focus(); return; }
    if (d.del !== undefined) { const m = msgOf(); if (m) zAsk('Diese Nachricht für alle löschen?', () => { tryDo(() => S.deleteForAll(m)); }); return; }
    if (d.report !== undefined) { const m = msgOf(); if (m) reportDlg(m.sender, m.id, (m.content || {}).t || S.preview(m)); return; }
    if (d.creact !== undefined) { const m = cmsgOf(); if (m) tryDo(async () => { await S.react(m, d.creact); if (m.thread) await S.loadThread(m.thread); }); return; }
    if (d.cdel !== undefined) { const m = cmsgOf(); if (m) zAsk('Diese Nachricht löschen?', () => { tryDo(async () => { await Api.rest('PATCH', `messages?id=eq.${m.id}`, { deleted: true }); if (m.thread) await S.loadThread(m.thread); else await S.loadChannel(m.channel); }); }); return; }
    if (d.cpin !== undefined) { const m = cmsgOf(); if (m) tryDo(async () => { await Api.rest('PATCH', `messages?id=eq.${m.id}`, { pinned: !m.pinned }); m.pinned = !m.pinned; renderMain(); }); return; }
    if (d.creport !== undefined) { const m = cmsgOf(); if (m) reportDlg(m.sender, m.id, m.content.t || ''); return; }
    if (d.file || d.cfile) { const md = JSON.parse(d.md); tryDo(async () => { const u = await S.mediaUrl(d.file || d.cfile, md, d.cfile ? 'server-media' : 'chat-media'); const a = document.createElement('a'); a.href = u; a.download = md.name || 'datei'; a.click(); }); return; }
    if (t.matches && t.matches('img.media') && t.src && !t.src.startsWith('data:')) { photoViewer(t); return; }
    switch (d.act) {
      case 'newChat': return newChatDlg();
      case 'addServer': return addServerDlg();
      case 'myStatus': if (root.ZMStatus && S.statuses.has(Api.userId)) { statusView(Api.userId); return; } return myStatusDlg();
      case 'newStatus': return myStatusDlg();
      case 'pollEvent': return pollEventDlg();
      case 'attach': return $('#mFile').click();
      case 'send': return send();
      case 'personalize': { const c = S.chats.get(S.openChat); if (c && X2()) X2().personalize(c, extraH()); return; }
      case 'lockedChats': if (showLocked) { showLocked = false; X2().lockAgain(); renderList(); } else X2().askPin(extraH(), 'Gesperrte Chats öffnen', () => { showLocked = true; renderList(); }); return;
      case 'voiceRec': if (root.ZMMedia && S.openChat) root.ZMMedia.record($('#mComp'), S.openChat, mediaH()); return;
      case 'cancelReply': replyTo = null; editing = null; $('#mInput').value = ''; return bars('');
      case 'clearErr': S.status = ''; return bars('');
      case 'chatMenu': return chatMenuDlg();
      case 'serverMenu': return serverMenuDlg();
      case 'newChannel': return newChannelDlg();
      case 'newPost': return newPostDlg();
      case 'closeThread': S.openThread = null; return renderAll();
      case 'invite': { const s = S.servers.get(S.openServer); navigator.clipboard.writeText(`Komm auf meinen Server „${s.name}“ im Zunora Messenger!\nEinladungs-Code: ${s.invite}`); return toast('✓ Einladung kopiert — schick sie deinen Freunden.'); }
      case 'saveProfile': return tryDo(async () => { await S.saveProfile($('#setDisp').value, $('#setAbout').value); toast('✓ Gespeichert'); });
      case 'logout': zAsk('Auf diesem PC abmelden?', () => { tryDo(async () => { await S.logout(false); location.reload(); }); }); return;
      case 'claimPlus': settingsPage = 'plus'; renderList(); return;
      case 'inviteFriends': case 'inviteMail': {
        // Link zur Einladungs-Seite (erkennt dort das Gerät, passender Download, mit Nutzername zum Hinzufügen)
        const u = (S.me || {}).username || Api.username || '', n = String((S.me || {}).display || '').trim().slice(0, 40);
        const link = 'https://zunoraos.github.io/zunora-ai/einladung.html?von=' + encodeURIComponent(u) + (n && n !== u ? '&name=' + encodeURIComponent(n) : '');
        const text = 'Hey! Schreib mir im Zunora Messenger — Ende-zu-Ende verschlüsselt, kostenlos, ohne Telefonnummer. Hier kannst du ihn laden:\n' + link;
        if (d.act === 'inviteMail') { const a = document.createElement('a'); a.href = 'mailto:?subject=' + encodeURIComponent('Komm zu Zunora Messenger') + '&body=' + encodeURIComponent(text); a.click(); return; }
        navigator.clipboard.writeText(text).then(() => toast('✓ Einladung kopiert — einfach in WhatsApp, E-Mail oder SMS einfügen')).catch(() => toast(link)); return;
      }
      case 'openKonto2': if (root.Host && root.Host.available) root.Host.call('konto2.open').then(() => toast('Zweites Konto öffnet sich in einem eigenen Fenster …')).catch((e) => toast(e.message || 'Ging nicht', true)); else toast('Nur in der PC-App.', true); return;
      case 'infoTpl': { const a = $('#setAbout'); if (a) { a.value = d.v; a.focus(); } return; }
      case 'setTone': Call.setPref('ton', d.v); try { const ctx = new AudioContext(); Call.playTone(ctx, d.v); setTimeout(() => ctx.close(), 2000); } catch (x) { } renderList(); return;
      case 'setEco': try { localStorage.setItem('zm-eco', t.dataset.v); } catch (e) { } applyEco(); renderAll(); return;
      case 'setTheme': try { localStorage.setItem('zm-theme', t.dataset.v); } catch (e) { } applyTheme(); renderAll(); return;
      case 'language': if (window.ZLang) ZLang.picker({ cancel: true }).then((l) => { if (!l) return; ['#rail', '#list', '#mHead', '#mList', '#mBars'].forEach((q) => { const e = $(q); if (e) e._last = null; }); mainKey = ''; renderAll(); }); return;
      case 'logoutAll': zAsk('Auf ALLEN Geräten abmelden?', () => { tryDo(async () => { await S.logout(true); location.reload(); }); }); return;
      case 'call': return tryDo(() => Call.call(S.openChat, d.video === '1'));
      case 'accept': return tryDo(() => Call.accept());
      case 'acceptAudio': return tryDo(() => Call.accept(false));
      case 'decline': return tryDo(() => Call.decline());
      case 'mute': e.stopPropagation(); return Call.toggleMute();
      case 'video': return tryDo(() => Call.toggleVideo());
      case 'hangup': e.stopPropagation(); return tryDo(() => Call.leave());
      case 'share': return tryDo(() => Call.toggleShare());
      case 'discover': return discoverDlg();
      case 'myPicture': return pictureDlg('me', 'Profilbild', (S.me || {}).avatar);
      case 'groupPicture': { const c = S.chats.get(S.openChat); closeDlg(); return c && pictureDlg('chat:' + c.id, 'Gruppenbild', c.avatar); }
      case 'serverPicture': { const s = S.servers.get(S.openServer); closeDlg(); return s && pictureDlg('server:' + s.id, 'Server-Bild', s.icon); }
      case 'doUpdate': return startUpdate();
      case 'stickers': return stickerDlg();
      case 'chatSearch': return chatSearch();
      case 'channelSettings': return channelSettingsDlg();
      case 'showArchived': showArchived = true; return renderList();
      case 'hideArchived': showArchived = false; return renderList();
      case 'callBack': e.stopPropagation(); return tryDo(() => Call.call(d.chat2, d.video === '1'));
      case 'callFilter': callFilter = d.v; renderList(); return;
      case 'callsClear': return zAsk('Ganze Anrufliste leeren? Alle beendeten Anrufe verschwinden aus deiner Liste — auf allen deinen Geräten. Haben alle Beteiligten einen Anruf gelöscht, ist er komplett vom Server weg.', () => tryDo(async () => { await Call.clearAll(); callList = []; renderList(); toast('✓ Anrufliste geleert'); }));
      case 'callDetail': return callDetail(d.id);
      case 'waitYes': return tryDo(() => Call.acceptWaiting());
      case 'waitNo': return tryDo(() => Call.declineWaiting());
      case 'callInvite': return inviteDlg();
      case 'callAudio': return audioDlg();
      case 'revokeOthers': { const ids = (d.ids || '').split(',').filter(Boolean); if (ids.length) zAsk(`Alle ${ids.length} anderen Geräte abmelden? Sie verlieren sofort den Zugang.`, () => { tryDo(async () => { for (const id of ids) await S.revoke(id); toast('✓ Alle anderen Geräte sind abgemeldet'); renderList(); }); }); return; }
      case 'callMin': Call.minimized = true; return renderAll();
      case 'callMax': Call.minimized = false; return renderAll();
      case 'transfer': return transferDlg();
      case 'olderChat': { const l = S.messages.get(S.openChat) || []; if (!l.length) return; const h = $('#mList').scrollHeight; t.textContent = 'Lädt …'; return tryDo(async () => { await S.loadMessages(S.openChat, l[0].at); const ml = $('#mList'); ml.scrollTop = ml.scrollHeight - h; }); }
      case 'olderChannel': { const l = S.chMessages.get(S.openChannel) || []; if (!l.length) return; t.textContent = 'Lädt …'; return tryDo(() => S.loadChannel(S.openChannel, l[0].at)); }
      case 'srvSearch': return serverSearchDlg();
      case 'plan': return root.ZMA && root.ZMA.planDlg(aH(), S.openChat, ($('#mInput') || {}).value || '');
      case 'plannedList': return root.ZMA && root.ZMA.plannedDlg(aH(), S.openChat);
      case 'followHome': if (S.Follow) { view = 'server'; S.Follow.showing = true; S.Follow.open = null; root.ZMA.resetMain(); renderAll(); } return;
      case 'followOpen': if (S.Follow) { S.Follow.showing = true; S.Follow.open = d.id; root.ZMA.resetMain(); renderAll(); } return;
      case 'mentions': return mentionsDlg();
      case 'rules': return rulesDlg();
      case 'transferNo': return S.Transfer.dismissOffer();
      case 'transferReject': return S.Transfer.reject();
      case 'transferClose': return S.Transfer.close();
    }
  });
  document.addEventListener('contextmenu', (e) => { const b = e.target.closest && e.target.closest('button.send[data-act="send"]'); if (!b || !root.ZMA || view !== 'chats' || !S.openChat) return; e.preventDefault(); root.ZMA.planDlg(aH(), S.openChat, ($('#mInput') || {}).value || ''); });          // Senden rechts anklicken = planen
  document.addEventListener('contextmenu', (e) => { const ch = e.target.closest('[data-channel]'); if (!ch) return; e.preventDefault(); S.toggleChannelMute(ch.dataset.channel); toast(S.channelMuted(ch.dataset.channel) ? '🔕 Kanal stummgeschaltet (keine Meldungen bei Erwähnungen)' : '🔔 Kanal wieder laut'); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dlgOpen) closeDlg();
    if (e.ctrlKey && e.key.toLowerCase() === 'f' && mainKey.startsWith('chat:') && !dlgOpen) { e.preventDefault(); chatSearch(true); }
  });
  window.addEventListener('focus', () => { if (S.openChat && view === 'chats') S.markRead(S.openChat).catch(() => { }); if (Api.loggedIn) Live.start(); });
  setInterval(() => { if (S.typing.size) { renderList(); updTyping(); } }, 1000);
  // Wer ist online? Einzel-Chats in der Liste (grüner Punkt), jede Minute frisch
  const loadOnline = () => { if (!Api.loggedIn || !S.loadPresence) return; const ids = [...S.chats.values()].map(otherOf).filter(Boolean); if (ids.length) S.loadPresence(ids).then(() => renderList()).catch(() => { }); };
  setTimeout(loadOnline, 4000); setInterval(loadOnline, 60000);
  /** nur die Blase „tippt …" auffrischen (nicht den ganzen Chat) */
  function updTyping() {
    const el = document.getElementById('tyBub'); if (!el || !X2()) return;
    // Kopfzeile („schreibt …" ⇄ „Online") nur neu zeichnen, wenn sich der Zustand ändert
    const ty0 = S.typing.get(S.openChat), on = !!(ty0 && Date.now() - ty0[1] < 6000 && X2().typingOn());
    if (on !== updTyping.last) { updTyping.last = on; renderMain(); return; }
    const h = X2().typingBubble(S.chats.get(S.openChat), S, { uav, esc });
    if (el.innerHTML !== h) { const list = el.parentElement, near = list && list.scrollHeight - list.scrollTop - list.clientHeight < 120; el.innerHTML = h; if (near && h) list.scrollTop = list.scrollHeight; }
  }

  boot();
})(window);
