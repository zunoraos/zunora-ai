/* Zunora Messenger am PC — 1.1.3: Freunde (Anfragen mit Nachricht, QR-Code, Verwalten), App-Startseite mit Widgets,
 * Zunora-Logo + App-Symbol, Profilbild groß, neue Konto- und Datenschutz-Seite. Gleiche Funktionen wie am Handy.
 * Die Oberfläche (ui.js) gibt ihre Helfer über H() mit: { esc, av, uav, cav, I, S, Api, toast, tryDo, dlg, closeDlg, profileDlg, renderList, renderAll, openChat, go, clock, SECOND } */
(function (root) {
  'use strict';
  const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } } };
  const T = (s) => (root.ZLang ? root.ZLang.t(s) : s);
  let sec = 'freunde', found = [], q = '';

  function ago(ms) {
    if (!ms) return ''; const d = Math.floor((Date.now() - ms) / 60000);
    if (d < 1) return T('gerade eben'); if (d < 60) return T('vor {0} Min.').replace('{0}', d); if (d < 1440) return T('vor {0} Std.').replace('{0}', Math.floor(d / 60));
    if (d < 2880) return T('gestern'); return T('vor {0} Tagen').replace('{0}', Math.floor(d / 1440));
  }
  function inviteLink(H) {
    const u = (H.S.me || {}).username || H.Api.username || '', n = String((H.S.me || {}).display || '').trim().slice(0, 40);
    return 'https://zunoraos.github.io/zunora-ai/einladung.html?von=' + encodeURIComponent(u) + (n && n !== u ? '&name=' + encodeURIComponent(n) : '');
  }
  const qrHtml = (H, px) => `<div class="qrbox">${root.ZMQr ? root.ZMQr.svg(inviteLink(H), px || 180) : ''}</div>`;

  // =========================================================================================== Freunde
  function friends(el, H) {
    const { esc, av, I, S } = H;
    const g = (st) => S.friends.filter((f) => f.st === st);
    const inc = g('incoming').sort((a, b) => ((S.reqInfo.get(b.p.id) || {}).at || 0) - ((S.reqInfo.get(a.p.id) || {}).at || 0));
    const out = g('outgoing');
    const pic = (p, cls) => `<span data-profile="${esc(p.id)}" style="cursor:pointer;position:relative">${av(p.name, cls || 's', false, S.pic(p.avatar))}${(S.presence.get(p.id) || {}).online ? '<i class="onl"></i>' : ''}</span>`;
    const tabs = `<div class="frtabs">${[['freunde', 'Freunde'], ['anfragen', 'Anfragen'], ['add', 'Hinzufügen']].map(([k, t]) => `<button class="${sec === k ? 'on' : ''}" data-frsec="${k}">${T(t)}${k === 'anfragen' && inc.length ? ` <i>${inc.length}</i>` : ''}</button>`).join('')}</div>`;
    let body = '';
    if (sec === 'freunde') {
      const list = g('accepted').sort((a, b) => (((S.presence.get(b.p.id) || {}).online ? 1 : 0) - ((S.presence.get(a.p.id) || {}).online ? 1 : 0)) || a.p.name.localeCompare(b.p.name));
      const online = list.filter((f) => (S.presence.get(f.p.id) || {}).online).length;
      body = `<div class="cat">${T('Freunde')} · ${list.length}${online ? ` <span style="color:#2fbf71;text-transform:none">· ${T('{0} online').replace('{0}', online)}</span>` : ''}</div>` +
        (list.length ? list.map((f) => `<div class="row" data-dm="${esc(f.p.id)}">${pic(f.p)}<div class="main"><div class="title">${esc(f.p.name)}</div><div class="prev">${esc(S.presenceLabel(f.p.id) || f.p.about || '@' + f.p.username)}</div></div><button class="ico" data-dm="${esc(f.p.id)}" title="Chat">${I('chat', 18)}</button><button class="ico" data-unfriend="${esc(f.p.id)}" title="Entfernen">✕</button></div>`).join('')
          : `<div class="empty"><div class="big">👋</div>${T('Noch keine Freunde — such jemanden über den Nutzernamen oder teile deinen QR-Code.')}<br><button class="btn" data-frsec="add" style="margin-top:10px">${T('Freunde hinzufügen')}</button></div>`);
    } else if (sec === 'anfragen') {
      const old = inc.filter((f) => ((S.reqInfo.get(f.p.id) || {}).at || Date.now()) < Date.now() - 3 * 86400000).length;
      body = (old ? `<div class="frwarn">${I('bell', 18)} ${old === 1 ? T('Eine Anfrage wartet schon seit über 3 Tagen auf deine Antwort.') : T('{0} Anfragen warten schon seit über 3 Tagen auf deine Antwort.').replace('{0}', old)}</div>` : '') +
        `<div class="cat">${T('Eingegangen')}${inc.length ? ' · ' + inc.length : ''}</div>` +
        (inc.length ? inc.map((f) => { const r = S.reqInfo.get(f.p.id) || {};
          return `<div class="frcard"><div class="row" style="padding:0">${pic(f.p)}<div class="main"><div class="title">${esc(f.p.name)}</div><div class="prev">@${esc(f.p.username)}${r.at ? ' · ' + ago(r.at) : ''}</div></div></div>
            ${r.message ? `<div class="frmsg">${esc(r.message)}</div>` : ''}
            <div class="frbtns"><button class="btn" data-accept="${esc(f.p.id)}">${T('Annehmen')}</button><button class="btn ghost" data-fr-reply="${esc(f.p.id)}">${I('chat', 16)} ${T('Annehmen und antworten')}</button><button class="btn ghost" data-withdraw="${esc(f.p.id)}">${T('Ablehnen')}</button><button class="ico" data-fr-block="${esc(f.p.id)}" title="${T('Blockieren')}">⛔</button></div></div>`; }).join('')
          : `<p class="muted small" style="padding:0 16px">${T('Gerade keine neuen Anfragen.')}</p>`) +
        `<div class="cat">${T('Gesendet')}${out.length ? ' · ' + out.length : ''}</div>` +
        (out.length ? out.map((f) => { const r = S.reqInfo.get(f.p.id) || {};
          return `<div class="row">${pic(f.p)}<div class="main"><div class="title">${esc(f.p.name)}</div><div class="prev">@${esc(f.p.username)} · ${r.at ? T('gesendet') + ' ' + ago(r.at) : T('wartet …')}${r.message ? ' · „' + esc(r.message) + '“' : ''}</div></div><button class="btn ghost" data-withdraw="${esc(f.p.id)}">↩ ${T('Zurückziehen')}</button></div>`; }).join('')
          : `<p class="muted small" style="padding:0 16px">${T('Keine offenen Anfragen von dir.')} <button class="link" data-frsec="add">${T('Jemanden anfragen')}</button></p>`);
      const hist = g('accepted').map((f) => [f.p, (S.reqInfo.get(f.p.id) || {}).acceptedAt || 0]).filter((x) => x[1]).sort((a, b) => b[1] - a[1]).slice(0, 15);
      if (hist.length) body += `<div class="cat">${T('Verlauf')}</div>` + hist.map(([p, at]) => `<div class="row" data-profile="${esc(p.id)}" style="cursor:pointer">${av(p.name, 'xs', false, S.pic(p.avatar))}<div class="main"><div class="title small">${esc(p.name)}</div></div><span class="muted small">${T('befreundet seit {0}').replace('{0}', new Date(at).toLocaleDateString('de-DE'))}</span></div>`).join('');
    } else {
      body = `<div class="cat">${T('Nutzername suchen')}</div><p class="muted small" style="margin:0 16px 6px">${T('Tippe einen Nutzernamen oder Namen ein — oder füge einen Einladungs-Link ein. Danach kannst du eine Nachricht zur Anfrage schreiben.')}</p>
        <input class="search" id="frSearch" placeholder="${T('@nutzername oder Link …')}" value="${esc(q)}"><div id="frResults">${results(H)}</div>
        <div class="frqr"><b>${T('Mein QR-Code')}</b><div class="small muted">${T('Mit dem Handy scannen — öffnet deine Einladung. Wer die App noch nicht hat, kommt direkt zum Download.')}</div>${qrHtml(H, 170)}
          <div class="frbtns" style="justify-content:center"><button class="btn" data-act="inviteFriends">${I('copy', 16)} ${T('Link kopieren')}</button><button class="btn ghost" data-act="inviteMail">${I('send', 16)} ${T('Per E-Mail')}</button></div></div>`;
    }
    el.innerHTML = `<header><h2>${T('Freunde')}</h2></header>${tabs}<div class="scroll">${body}</div>`;
    el.querySelectorAll('[data-frsec]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); sec = b.dataset.frsec; H.renderList(); });
    el.querySelectorAll('[data-fr-reply]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); const f = S.friends.find((x) => x.p.id === b.dataset.frReply); if (f) H.tryDo(async () => { await S.accept(f.p); H.openChat(await S.openDirect(f.p)); }); });
    el.querySelectorAll('[data-fr-block]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); H.tryDo(async () => { await S.block(b.dataset.frBlock); H.toast(T('Blockiert.')); }); });
    el.querySelectorAll('[data-pick]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); const f = found.find((x) => x.p.id === b.dataset.pick); if (f) requestDlg(f, H); });
    const fs = el.querySelector('#frSearch');
    if (fs) { let t = null; fs.oninput = () => { q = fs.value; clearTimeout(t); t = setTimeout(async () => { found = await S.searchPeople(q).catch(() => []); const r = el.querySelector('#frResults'); if (r) { r.innerHTML = results(H); r.querySelectorAll('[data-pick]').forEach((b) => b.onclick = () => { const f = found.find((x) => x.p.id === b.dataset.pick); if (f) requestDlg(f, H); }); } }, 350); }; }
  }
  function results(H) {
    const { esc, av, S } = H;
    if (q.trim().length >= 2 && !found.length) return `<p class="muted small" style="padding:0 16px">${T('Niemand gefunden. Prüfe die Schreibweise — Nutzernamen haben nur a–z, 0–9, Punkt und Unterstrich.')}</p>`;
    return found.map((f) => { const st = (S.friends.find((x) => x.p.id === f.p.id) || {}).st;
      const right = st === 'accepted' ? `<span class="muted small">✓ ${T('Freunde')}</span>` : st === 'outgoing' ? `<span class="muted small">${T('Angefragt')}</span>` : st === 'incoming' ? `<span class="small" style="color:var(--accent)">${T('Fragt dich an')}</span>`
        : f.can ? `<span class="frpill">${T('Anfragen')}</span>` : `<span class="muted small">${T('Keine Anfragen')}</span>`;
      return `<div class="row" data-pick="${esc(f.p.id)}" style="cursor:pointer">${av(f.p.name, 's', false, S.pic(f.p.avatar))}<div class="main"><div class="title">${esc(f.p.name)}</div><div class="prev">@${esc(f.p.username)}${f.mutual ? ' · ' + (f.mutual === 1 ? T('1 gemeinsamer Freund') : T('{0} gemeinsame Freunde').replace('{0}', f.mutual)) : ''}</div></div>${right}</div>`; }).join('');
  }
  const TPL = ["Hi, ich bin's! 👋", 'Wir kennen uns aus der Schule', 'Wir kennen uns von der Arbeit', 'Lass uns hier schreiben!', 'Ich hab deinen Link bekommen'];
  function requestDlg(f, H) {
    const { esc, av, S } = H; const p = f.p;
    H.dlg('', (box) => {
      const draw = () => {
        const st = (S.friends.find((x) => x.p.id === p.id) || {}).st;
        let act = '';
        if (st === 'accepted') act = `<p style="color:var(--accent)">✓ ${T('Ihr seid schon befreundet.')}</p><button class="btn" data-rq="chat" style="width:100%">${T('Nachricht schreiben')}</button>`;
        else if (st === 'incoming') act = `<p>${T('@{0} möchte mit dir befreundet sein.').replace('{0}', esc(p.username))}</p><button class="btn" data-rq="accept" style="width:100%">${T('Annehmen')}</button>`;
        else if (st === 'outgoing') act = `<p class="muted">${T('Anfrage gesendet — wartet auf Antwort.')}</p><button class="btn ghost" data-rq="withdraw" style="width:100%">↩ ${T('Anfrage zurückziehen')}</button>`;
        else if (!f.can) act = `<p class="muted">${T('@{0} nimmt gerade keine Freundesanfragen an (oder nur von Freunden ihrer Freunde).').replace('{0}', esc(p.username))}</p>`;
        else act = `<label class="small muted" style="display:block;text-align:left">${T('Nachricht zur Anfrage (freiwillig)')}</label><textarea id="rqMsg" maxlength="200" rows="3" style="width:100%" placeholder="${T('z. B. „Hi, ich bin Anna aus deinem Kurs!“')}"></textarea>
          <div class="chips" style="justify-content:flex-start">${TPL.map((t) => `<button class="chip" data-rqt="${esc(t)}">${esc(T(t))}</button>`).join('')}</div>
          <div class="small muted" id="rqInfo" style="text-align:left;margin:4px 0 10px">0/200 · ${T('Die Nachricht sieht nur @{0}. Sie wird nicht Ende-zu-Ende verschlüsselt.').replace('{0}', esc(p.username))}</div>
          <button class="btn" data-rq="send" style="width:100%">${T('Anfrage senden')}</button>`;
        box.innerHTML = `<div style="text-align:center"><span data-bigav="${esc(p.id)}" style="cursor:zoom-in;display:inline-block">${av(p.name, 'xl', false, S.pic(p.avatar))}</span><h3 style="margin:8px 0 0">${esc(p.name)}</h3><div class="muted">@${esc(p.username)}</div>
          ${p.about ? `<p>${esc(p.about)}</p>` : ''}${f.mutual ? `<div class="small" style="color:var(--accent)">${f.mutual === 1 ? T('1 gemeinsamer Freund') : T('{0} gemeinsame Freunde').replace('{0}', f.mutual)}</div>` : ''}<div style="margin-top:12px">${act}</div><div class="small" id="rqErr" style="color:var(--bad);margin-top:6px"></div></div>
          <div class="rowb"><button class="btn ghost" data-close>${T('Schließen')}</button></div>`;
        box.querySelector('[data-close]').onclick = H.closeDlg;
        const m = box.querySelector('#rqMsg'), info = box.querySelector('#rqInfo');
        if (m) m.oninput = () => { info.firstChild.textContent = m.value.length + '/200 · '; };
        box.querySelectorAll('[data-rqt]').forEach((b) => b.onclick = () => { m.value = T(b.dataset.rqt); m.oninput(); m.focus(); });
        box.querySelectorAll('[data-rq]').forEach((b) => b.onclick = async () => {
          const k = b.dataset.rq; b.disabled = true;
          try {
            if (k === 'send') { await S.request(p, m ? m.value : ''); H.closeDlg(); H.toast(T('✓ Anfrage an @{0} gesendet').replace('{0}', p.username)); }
            if (k === 'accept') { await S.accept(p); H.closeDlg(); H.toast(T('✓ Du bist jetzt mit {0} befreundet').replace('{0}', p.name)); }
            if (k === 'withdraw') { await S.withdraw(p); draw(); }
            if (k === 'chat') { const id = await S.openDirect(p); H.closeDlg(); H.openChat(id); }
            H.renderList();
          } catch (e) { box.querySelector('#rqErr').textContent = e.message || String(e); b.disabled = false; }
        });
      };
      draw();
    });
  }
  /** Link/QR: zunora://freund?u=… oder Einladungs-Link → Anfrage-Fenster */
  async function openLink(u, H) { sec = 'add'; const f = await H.S.findUser(u).catch(() => null); H.go('friends'); if (f) requestDlg(f, H); else H.toast(T('@{0} wurde nicht gefunden.').replace('{0}', u), true); }

  // =========================================================================================== Startseite (Widgets über den Chats)
  const WIDGETS = [['uhr', 'Uhr, Datum & Wetter', 'Begrüßung mit Uhrzeit, Datum und Wetter für deinen Ort'], ['chats', 'Chats & Anfragen', 'Ungelesene Chats, angeheftete Chats und offene Freundesanfragen'],
    ['status', 'Status & Freunde', 'Neue Status von Freunden und wer gerade online ist'], ['anrufe', 'Anrufe & Notiz', 'Letzte Anrufe zum Zurückrufen und eine Notiz an dich']]
  if (root.ZMWish) WIDGETS.push(...root.ZMWish.WIDGETS);          // Tagesüberblick, Schnellaktionen, Geburtstage …
  const homeOn = () => LS.get('zm-start', '0') === '1';
  const order = () => LS.get('zm-start-w', 'uhr,chats,status,anrufe').split(',').filter((k) => WIDGETS.some((w) => w[0] === k));
  let weather = null, weatherFor = '', calls = null;
  async function loadWeather(H) {
    const city = LS.get('zm-start-ort', '').trim(); if (!city) { weather = null; return; }
    try { const c = JSON.parse(LS.get('zm-start-wetter', 'null')); if (c && c.city === city && Date.now() - c.at < 30 * 60000) { weather = c; return; } } catch (e) { }
    if (weatherFor === city) return; weatherFor = city;
    try {
      const g = await (await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=de&name=' + encodeURIComponent(city))).json();
      const r = (g.results || [])[0]; if (!r) return;
      const w = await (await fetch(`https://api.open-meteo.com/v1/forecast?current=temperature_2m,weather_code&latitude=${r.latitude}&longitude=${r.longitude}`)).json();
      weather = { city, place: r.name, t: w.current.temperature_2m, c: w.current.weather_code, at: Date.now() }; LS.set('zm-start-wetter', JSON.stringify(weather)); H.renderList();
    } catch (e) { } finally { weatherFor = ''; }
  }
  const wIcon = (c) => c === 0 ? ['☀️', 'Klar'] : c <= 2 ? ['🌤️', 'Leicht bewölkt'] : c === 3 ? ['☁️', 'Bewölkt'] : c <= 48 ? ['🌫️', 'Nebel'] : c <= 57 ? ['🌦️', 'Nieselregen'] : c <= 67 || (c >= 80 && c <= 82) ? ['🌧️', 'Regen'] : c <= 86 ? ['❄️', 'Schnee'] : ['⛈️', 'Gewitter'];
  function widgets(H) {
    if (!homeOn()) return '';
    const { esc, uav, cav, av, I, S, Api } = H;
    const now = new Date(), h = now.getHours();
    const hi = h >= 5 && h <= 10 ? 'Guten Morgen' : h <= 17 && h >= 11 ? 'Hallo' : h <= 22 && h >= 18 ? 'Guten Abend' : 'Gute Nacht';
    if (!weather && LS.get('zm-start-ort', '')) loadWeather(H);
    if (calls === null && root.ZMCall) { calls = []; root.ZMCall.history().then((l) => { calls = (l || []).slice().sort((a, b) => b.at - a.at).slice(0, 3); H.renderList(); }).catch(() => { }); }
    const parts = order().map((k) => {
      const wx = root.ZMWish ? root.ZMWish.widget(k, H) : null; if (wx !== null) return wx;          // neue Widgets (1.2.0 Teil 3)
      if (k === 'uhr') { const w = weather && weather.city === LS.get('zm-start-ort', '').trim() ? weather : null; const wi = w ? wIcon(w.c) : null;
        return `<div class="wg wg-hero"><div class="small"><b>${T(hi)}, ${esc(String((S.me || {}).name || '').split(' ')[0])} 👋</b></div><div class="wg-row"><span class="wg-time">${now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
          <span class="wg-date">${now.toLocaleDateString(root.ZLang ? root.ZLang.lang : 'de', { weekday: 'long' })}<br><small>${now.toLocaleDateString(root.ZLang ? root.ZLang.lang : 'de', { day: 'numeric', month: 'long', year: 'numeric' })}</small></span>
          ${w ? `<span class="wg-wx">${wi[0]} ${Math.round(w.t)}°<small>${esc(w.place)} · ${T(wi[1])}</small></span>` : ''}</div>${LS.get('zm-start-ort', '') ? '' : `<div class="small muted">${T('Für das Wetter: Ort unter Einstellungen → Startseite eintragen.')}</div>`}</div>`; }
      if (k === 'chats') { const un = [...S.chats.values()].filter((c) => c.unread && !c.archived).sort((a, b) => b.lastAt - a.lastAt); const pin = [...S.chats.values()].filter((c) => c.pinned && !c.archived);
        const show = [...new Map([...un, ...pin].map((c) => [c.id, c])).values()].slice(0, 6); const req = S.friends.filter((f) => f.st === 'incoming').length;
        return `<div class="wg"><div class="wg-h">${I('chat', 18)}<b>${un.length ? T('{0} ungelesene Chats').replace('{0}', un.length) : T('Alles gelesen ✓')}</b>${req ? `<button class="frpill" data-wgo="friends">${req === 1 ? T('1 Anfrage') : T('{0} Anfragen').replace('{0}', req)}</button>` : ''}</div>
          ${show.length ? `<div class="wg-avs">${show.map((c) => `<div class="wg-av" data-chat="${esc(c.id)}">${cav(c)}${c.unread ? `<i>${Math.min(c.unread, 99)}</i>` : ''}<span>${esc(c.title)}</span></div>`).join('')}</div>` : ''}</div>`; }
      if (k === 'status' && root.ZMWish && root.ZMWish.statusOff()) return '';
      if (k === 'status') { const st = [...S.statuses.keys()].filter((u) => u !== Api.userId && !(S.statuses.get(u) || []).every((i) => S.seenStatus(i.id)));
        const on = S.friends.filter((f) => f.st === 'accepted' && (S.presence.get(f.p.id) || {}).online).map((f) => f.p);
        return `<div class="wg"><div class="wg-h">${I('friends', 18)}<b>${T('Status & Freunde')}</b><span class="small" style="color:#2fbf71">${T('{0} online').replace('{0}', on.length)}</span></div>
          ${st.length || on.length ? `<div class="wg-avs">${st.map((u) => `<div class="wg-av" data-status="${esc(u)}"><div class="sring">${uav(u, 's')}</div><span>${esc(S.nameOf(u))}</span></div>`).join('')}${on.filter((p) => !st.includes(p.id)).map((p) => `<div class="wg-av" data-profile="${esc(p.id)}">${av(p.name, '', false, S.pic(p.avatar))}<i class="onl"></i><span>${esc(p.name)}</span></div>`).join('')}</div>`
            : `<div class="small muted">${T('Keine neuen Status — und gerade niemand online.')}</div>`}</div>`; }
      if (k === 'anrufe') { const l = calls || [];
        return `<div class="wg"><div class="wg-h">${I('phone', 18)}<b>${T('Letzte Anrufe')}</b><button class="link" data-wgo="calls">${T('Alle')}</button></div>
          ${l.length ? l.map((e) => { const c = S.chats.get(e.chat); return `<div class="row" style="padding:4px 0">${c ? cav(c, 'xs') : uav(e.by, 'xs')}<div class="main"><div class="title small" style="${e.missed ? 'color:var(--bad)' : ''}">${esc(c ? c.title : S.nameOf(e.by))}</div><div class="prev">${T(e.missed ? 'Verpasst' : e.outgoing ? 'Ausgehend' : 'Eingehend')} · ${ago(e.at)}</div></div>${c ? `<button class="ico" data-act="callBack" data-chat2="${esc(e.chat)}" data-video="${e.video ? 1 : 0}">${I(e.video ? 'video' : 'phone', 18)}</button>` : ''}</div>`; }).join('') : `<div class="small muted">${T('Noch keine Anrufe.')}</div>`}
          <div class="small muted" style="margin:8px 0 4px">${T('Notiz an mich')}</div><textarea class="wg-note" id="wgNote" rows="2" placeholder="${T('Etwas notieren … (bleibt nur auf diesem PC)')}">${esc(LS.get('zm-start-notiz', ''))}</textarea></div>`; }
      return '';
    });
    return `<div class="wgs">${parts.join('')}</div>`;
  }
  function wireWidgets(el, H) {
    const n = el.querySelector('#wgNote'); if (n) n.oninput = () => LS.set('zm-start-notiz', n.value.slice(0, 500));
    el.querySelectorAll('[data-wgo]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); if (b.dataset.wgo === 'friends') sec = 'anfragen'; H.go(b.dataset.wgo); });
  }
  function startPage(H) {
    const { esc, I } = H; const o = order();
    return `<label class="small chk"><input type="checkbox" id="stOn" ${homeOn() ? 'checked' : ''}> <span><b>${T('Startseite anzeigen')}</b> — ${T('Widgets oben über deinen Chats. Von Haus aus aus.')}</span></label>
      ${homeOn() ? `<div class="cat" style="padding-left:0">${T('Widgets')}</div><p class="small muted" style="margin:0 0 6px">${T('Einschalten und mit den Pfeilen sortieren.')}</p>
      ${[...o, ...WIDGETS.map((w) => w[0]).filter((k) => !o.includes(k))].map((k) => { const w = WIDGETS.find((x) => x[0] === k); const i = o.indexOf(k);
        return `<div class="row wgset ${i >= 0 ? 'on' : ''}"><div class="main"><div class="title">${T(w[1])}</div><div class="prev">${T(w[2])}</div></div>${i > 0 ? `<button class="ico" data-wup="${k}" title="Nach oben">${I('up', 16)}</button>` : ''}${i >= 0 && i < o.length - 1 ? `<button class="ico" data-wdown="${k}" title="Nach unten">${I('down', 16)}</button>` : ''}<input type="checkbox" data-wtg="${k}" ${i >= 0 ? 'checked' : ''}></div>`; }).join('')}
      ${o.includes('uhr') ? `<div class="cat" style="padding-left:0">${T('Ort für das Wetter')}</div><p class="small muted" style="margin:0 0 6px">${T('Nur der Ortsname geht an den kostenlosen Wetterdienst Open-Meteo — kein Standort, kein Konto.')}</p>
        <div style="display:flex;gap:8px"><input id="stOrt" style="flex:1" maxlength="60" placeholder="${T('z. B. Berlin')}" value="${esc(LS.get('zm-start-ort', ''))}"><button class="btn ghost" id="stOrtGo">${T('Speichern')}</button></div>` : ''}` : ''}`;
  }
  function wireStart(el, H) {
    const on = el.querySelector('#stOn'); if (on) on.onchange = () => { LS.set('zm-start', on.checked ? '1' : '0'); H.renderAll(); };
    const save = (l) => { LS.set('zm-start-w', l.join(',')); H.renderAll(); };
    el.querySelectorAll('[data-wup]').forEach((b) => b.onclick = () => { const l = order(), i = l.indexOf(b.dataset.wup); l.splice(i - 1, 0, l.splice(i, 1)[0]); save(l); });
    el.querySelectorAll('[data-wdown]').forEach((b) => b.onclick = () => { const l = order(), i = l.indexOf(b.dataset.wdown); l.splice(i + 1, 0, l.splice(i, 1)[0]); save(l); });
    el.querySelectorAll('[data-wtg]').forEach((c) => c.onchange = () => { const l = order().filter((k) => k !== c.dataset.wtg); if (c.checked) l.push(c.dataset.wtg); save(l); });
    const go = el.querySelector('#stOrtGo'); if (go) go.onclick = () => { LS.set('zm-start-ort', el.querySelector('#stOrt').value.trim()); weather = null; LS.set('zm-start-wetter', 'null'); loadWeather(H); H.toast(T('✓ Gespeichert')); };
  }

  // =========================================================================================== Zunora-Logo & App-Symbol
  const logoSvg = (px) => `<svg class="zlogo" width="${px}" height="${px}" viewBox="0 0 40 40" aria-hidden="true"><defs><radialGradient id="zlg1" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="var(--accent)" stop-opacity=".45"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></radialGradient>
    <linearGradient id="zlg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b9a4ff"/><stop offset=".55" stop-color="var(--accent)"/><stop offset="1" stop-color="#3a5bd9"/></linearGradient><radialGradient id="zlg3" cx=".35" cy=".3" r=".35"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <circle cx="20" cy="20" r="20" fill="url(#zlg1)"/><circle cx="20" cy="20" r="16.4" fill="url(#zlg2)"/><circle cx="20" cy="20" r="16.4" fill="url(#zlg3)"/><text x="20" y="26.5" text-anchor="middle" font-family="Segoe UI, sans-serif" font-weight="900" font-size="18" fill="#fff">Z</text></svg>`;
  function header(H) {
    const k2 = H.SECOND ? ' <span class="k2badge">Konto 2</span>' : '';
    if (LS.get('zm-logo', '1') !== '1') return 'Zunora Messenger' + k2;
    const st = LS.get('zm-logo-stil', 'kugel');
    if (st === 'klein') return `<span class="zlogo-wrap">${logoSvg(30)}</span>${k2}`;
    if (st === 'schrift') return `<span class="zlogo-wrap">${logoSvg(26)}<b class="zword">Zunora</b><span class="zword2">Messenger</span></span>${k2}`;
    return `<span class="zlogo-wrap">${logoSvg(26)}<span>Zunora Messenger</span></span>${k2}`;
  }
  const ICONS = [['standard', 'Standard'], ['z', 'Zunora Z'], ['sonne', 'Sonne'], ['wald', 'Wald'], ['graphit', 'Graphit']];
  function looks(H) {
    const on = LS.get('zm-logo', '1') === '1', st = LS.get('zm-logo-stil', 'kugel'), ic = LS.get('zm-symbol', 'standard');
    return `<div class="cat" style="padding-left:0;margin-top:14px">${T('Zunora-Logo')}</div>
      <label class="small chk"><input type="checkbox" id="lgOn" ${on ? 'checked' : ''}> <span>${T('Logo in der Kopfleiste')} — ${T('oben über der Chat-Liste neben „Zunora Messenger“.')}</span></label>
      ${on ? `<div class="chips" style="justify-content:flex-start;margin-top:6px">${[['kugel', 'Kugel'], ['schrift', 'Schriftzug'], ['klein', 'Nur Logo']].map(([k, n]) => `<button class="chip ${st === k ? 'on' : ''}" data-lgs="${k}">${T(n)}</button>`).join('')}</div><div class="lgprev">${header(H)}</div>` : ''}
      <div class="cat" style="padding-left:0;margin-top:14px">${T('Animationen')}</div><p class="small muted" style="margin:0 0 8px">${T('Federn, Übergänge, Wellen und kleine Effekte — gilt für alle Zunora-Programme auf diesem PC.')}</p>
      <div class="chips" style="justify-content:flex-start">${[['aus', 'Aus'], ['leicht', 'Leicht'], ['normal', 'Normal'], ['stark', 'Stark']].map(([k, n]) => `<button class="chip ${(root.ZLook ? root.ZLook.level : 'normal') === k ? 'on' : ''}" data-lvl="${k}">${T(n)}</button>`).join('')}</div>
      <label class="small chk" style="margin-top:8px"><input type="checkbox" id="wvOn" ${!root.ZLook || root.ZLook.waves !== false ? 'checked' : ''}> <span>${T('Wellen-Animation')} — ${T('Die Wellen auf Glas, an Kanten und beim Antippen. Aus = ruhige Flächen, Federn und Übergänge bleiben.')}</span></label>
      <div class="cat" style="padding-left:0;margin-top:14px">${T('App-Symbol')}</div><p class="small muted" style="margin:0 0 8px">${T('Für Fenster, Taskleiste und Infobereich. (Die Verknüpfung im Startmenü behält ihr Symbol.)')}</p>
      <div class="symrow">${ICONS.map(([k, n]) => `<button class="sym ${ic === k ? 'on' : ''}" data-sym="${k}"><img src="img/symbol-${k}.png" alt=""><span>${T(n)}</span></button>`).join('')}</div>`;
  }
  function applyIcon() { const ic = LS.get('zm-symbol', 'standard'); if (ic !== 'standard' && root.Host && root.Host.available) root.Host.call('icon.set', { name: ic }).catch(() => { }); }
  function wireLooks(el, H) {
    const on = el.querySelector('#lgOn'); if (on) on.onchange = () => { LS.set('zm-logo', on.checked ? '1' : '0'); H.renderAll(); };
    const wv = el.querySelector('#wvOn'); if (wv) wv.onchange = () => { if (root.ZLook && root.ZLook.setWaves) root.ZLook.setWaves(wv.checked); };
    el.querySelectorAll('[data-lvl]').forEach((b) => b.onclick = () => { if (root.ZLook && root.ZLook.setLevel) root.ZLook.setLevel(b.dataset.lvl); H.renderAll(); });
    el.querySelectorAll('[data-lgs]').forEach((b) => b.onclick = () => { LS.set('zm-logo-stil', b.dataset.lgs); H.renderAll(); });
    el.querySelectorAll('[data-sym]').forEach((b) => b.onclick = () => {
      LS.set('zm-symbol', b.dataset.sym);
      if (root.Host && root.Host.available) root.Host.call('icon.set', { name: b.dataset.sym }).then(() => H.toast(T('✓ App-Symbol geändert'))).catch((e) => H.toast(e.message || 'Ging nicht', true));
      else H.toast(T('Nur in der PC-App.'), true);
      H.renderList();
    });
  }

  // =========================================================================================== Konto
  function konto(H, extraTop) {
    const { esc, uav, I, S, Api } = H; const me = S.me || {};
    const fr = S.friends.filter((f) => f.st === 'accepted').length;
    const plus = root.ZPlus && root.ZPlus.active();
    const tpl = ['Verfügbar', 'Beschäftigt', 'In der Schule', 'Bei der Arbeit', 'Im Kino', 'Beim Sport', 'Akku fast leer', 'Schlafe gerade', 'Nur Notfälle', 'Im Urlaub 🌴', 'Unterwegs 🚗', 'Im Meeting', 'Zocke gerade 🎮', 'Hey, ich nutze Zunora!', 'Lieber schreiben als anrufen', 'Bin gleich zurück'];
    return `<div class="khero"><div class="kav"><span data-bigav="${esc(Api.userId)}" title="${T('Groß ansehen')}">${uav(Api.userId, 'xl')}</span><button class="kcam" data-act="myPicture" title="${T('Profilbild ändern')}">${I('camera', 16)}</button></div>
        <h3>${esc(me.name || '')}</h3><div class="muted">@${esc(me.username || Api.username || '')}</div>${me.about ? `<p>${esc(me.about)}</p>` : ''}
        <div class="kchips"><span>🪪 Zunora ID</span>${plus ? '<span>✨ Zunora Plus</span>' : ''}<span>${T('{0} Freunde').replace('{0}', fr)}</span></div>
        <div class="frbtns" style="justify-content:center"><button class="btn" id="kQr">${T('Mein QR-Code')}</button><button class="btn ghost" data-act="inviteFriends">${I('copy', 16)} ${T('Profil teilen')}</button></div><div id="kQrBox" class="hidden">${qrHtml(H, 180)}<div class="small muted">${T('Mit der Handy-Kamera scannen — öffnet deine Einladung.')}</div></div></div>
      ${extraTop || ''}
      <div class="kcard"><div class="kh">${I('star', 18)}<b>${T('Meine Storys')}</b></div><div class="small muted">${root.ZPlus && root.ZPlus.active() ? T('Mit Zunora Plus bleiben abgelaufene Storys 1 Jahr in deinem privaten Archiv. Highlights bleiben in deinem Profil, bis du sie entfernst.') : T('Abgelaufene Storys bleiben 30 Tage in deinem privaten Archiv. Highlights bleiben in deinem Profil, bis du sie entfernst.')}</div>
        <div class="frbtns"><button class="btn ghost" id="kArchiv">📦 ${T('Archiv')}</button><button class="btn ghost" id="kHl">⭐ ${T('Highlights')}</button></div></div>
      ${root.ZMLook ? root.ZMLook.settingsHtml() : ''}
      <div class="kcard"><div class="kh">${I('user', 18)}<b>${T('Profil')}</b></div><div class="small muted">${T('So sehen dich deine Freunde.')}</div>
        <label class="small muted">${T('Anzeigename')}</label><input id="setDisp" style="width:100%" maxlength="40" value="${esc(me.display || '')}">
        <label class="small muted">${T('Info')}</label><input id="setAbout" style="width:100%" maxlength="140" value="${esc(me.about || '')}">
        <div class="small muted" style="margin-top:6px">${T('Vorlagen')}</div><div class="chips infotpl">${tpl.map((t) => `<button class="chip" data-act="infoTpl" data-v="${esc(t)}">${esc(t)}</button>`).join('')}</div>
        <div class="frbtns"><button class="btn ghost" data-act="myPicture">${I('camera', 16)} ${T('Profilbild')}</button><button class="btn" data-act="saveProfile">${T('Speichern')}</button></div></div>
      <div class="kcard"><div class="kh">${I('hash', 18)}<b>${T('Nutzername')}</b></div><div class="small muted">${plus ? T('Gilt für deine Zunora ID in allen Apps · mit Zunora Plus einmal am Tag änderbar.') : T('Gilt für deine Zunora ID in allen Apps · einmal pro Woche änderbar (mit Zunora Plus einmal am Tag).')}</div>
        <div class="kname">@${esc(me.username || Api.username || '')}<span id="kNameAgo" class="small muted"></span></div>
        <div id="kNameWait" class="small hidden"></div>
        <div id="kNameEdit"><div style="display:flex;gap:8px"><input id="setUname" style="flex:1" maxlength="24" placeholder="${T('Neuer Nutzername')}"><button class="btn ghost" id="setUnameGo">${T('Ändern')}</button></div>
        <div class="small muted" style="margin-top:4px">${T('Nur a–z, 0–9, Punkt und Unterstrich (3–24 Zeichen). Danach meldest du dich mit dem neuen Namen an.')}</div></div></div>
      <div class="kcard"><div class="kh">${I('shield', 18)}<b>${T('Sicherheit')}</b></div><div class="small muted">${T('Dein Passwort schützt dein Konto.')}</div>
        <input id="pwOld" type="password" placeholder="${T('Bisheriges Passwort')}" style="width:100%;margin:6px 0"><input id="pwNew" type="password" placeholder="${T('Neues Passwort (mind. 8 Zeichen)')}" style="width:100%;margin-bottom:6px"><input id="pwNew2" type="password" placeholder="${T('Neues Passwort wiederholen')}" style="width:100%;margin-bottom:6px">
        <button class="btn ghost" id="pwGo" style="width:100%">${T('Passwort ändern')}</button>
        <div class="frbtns"><button class="btn ghost" data-setpage="geraete">${I('shield', 16)} ${T('Geräte')}</button><button class="btn ghost" data-setpage="datenschutz">${I('lock', 16)} ${T('Datenschutz')}</button></div></div>
      <div class="kcard"><div class="kh">${I('logout', 18)}<b>${T('Konto')}</b></div>
        <button class="btn ghost" data-act="logout" style="width:100%;margin:6px 0">${T('Auf diesem PC abmelden')}</button>
        <button class="btn ghost" data-act="logoutAll" style="width:100%">${T('Überall abmelden')}</button></div>`;
  }
  function wireKonto(el, H) {
    const b = el.querySelector('#kQr'); if (b) b.onclick = () => el.querySelector('#kQrBox').classList.toggle('hidden');
    if (root.ZMLook) root.ZMLook.wireSettings(el);          // Plus im Profil (Abzeichen, Rahmen, Hintergrund)
    const ka = el.querySelector('#kArchiv'); if (ka && root.ZMStory) ka.onclick = () => H.tryDo(async () => { const l = await root.ZMStory.archive(); if (!l.length) { H.toast(T('Noch keine Storys im Archiv.')); return; } root.ZMStory.openList('ar:' + H.Api.userId, l.reverse(), H.statusH()); });
    const kh = el.querySelector('#kHl'); if (kh && root.ZMStory) kh.onclick = () => H.tryDo(async () => { const l = await root.ZMStory.highlightsOf(H.Api.userId); if (!l.length) { H.toast(T('Noch keine Highlights — im Status-Menü ⋯ → „Zu Highlights hinzufügen“.')); return; } root.ZMStory.openList('hl:' + H.Api.userId, l, H.statusH()); });
    H.S.usernameInfo().then((i) => {
      if (!i) return; const ago2 = el.querySelector('#kNameAgo'); if (ago2 && i.changed) ago2.textContent = ' · ' + T('geändert {0}').replace('{0}', ago(i.changed));
      if (i.next && i.next > Date.now()) {
        const w = el.querySelector('#kNameWait'), e = el.querySelector('#kNameEdit'); if (!w || !e) return;
        w.innerHTML = T('Nächste Änderung ab {0}').replace('{0}', new Date(i.next).toLocaleString(root.ZLang ? root.ZLang.lang : 'de', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })) + (i.plus ? '' : `<div style="color:var(--accent)">✨ ${T('Mit Zunora Plus kannst du ihn jeden Tag ändern.')}</div>`);
        w.classList.remove('hidden'); e.classList.add('hidden');
      }
    });
  }

  // =========================================================================================== Datenschutz
  function privacy(H) {
    const { esc, uav, I, S } = H; const pv = S.privacy || {};
    const shared = [[pv.readReceipts, 'Lesebestätigungen'], [pv.lastSeen, 'Zuletzt online'], [pv.online, 'Online-Status']].filter((x) => x[0]).map((x) => T(x[1]));
    const fr = S.friendRequests || 'all', shield = LS.get('zm-bildschutz', '0') === '1';
    const card = (ic, t, hint, inner) => `<div class="kcard"><div class="kh">${I(ic, 18)}<b>${T(t)}</b></div>${hint ? `<div class="small muted">${T(hint)}</div>` : ''}${inner}</div>`;
    return `<div class="pvhero">${I('lock', 22)}<div><b>${T('Deine Privatsphäre')}</b><div class="small">${T('Chats und Anrufe sind Ende-zu-Ende verschlüsselt. Du teilst gerade:')} ${shared.length ? shared.join(', ') : T('nichts davon')}.</div></div></div>` +
      card('user', 'Wer sieht was', 'Gilt für dein Konto auf allen Geräten. Was du ausschaltest, siehst du auch bei anderen nicht.',
        `<label class="small chk"><input type="checkbox" id="setReceipts" ${pv.readReceipts ? 'checked' : ''}> <span><b>${T('Lesebestätigungen')}</b> — ${T('Blaue Haken, wenn du gelesen hast.')}</span></label>
         <label class="small chk"><input type="checkbox" id="setLastSeen" ${pv.lastSeen ? 'checked' : ''}> <span><b>${T('Zuletzt online')}</b> — ${T('Andere sehen, wann du zuletzt im Messenger warst.')}</span></label>
         <label class="small chk"><input type="checkbox" id="setOnline" ${pv.online ? 'checked' : ''}> <span><b>${T('Online-Status')}</b> — ${T('Andere sehen „online“, solange der Messenger offen ist.')}</span></label>`) +
      card('friends', 'Wer darf dich anfragen', 'Schreiben und anrufen können dich nur deine Freunde.',
        [['all', 'Alle', 'Jeder kann dir eine Freundesanfrage schicken.'], ['fof', 'Freunde von Freunden', 'Nur wer mindestens einen gemeinsamen Freund mit dir hat.'], ['none', 'Niemand', 'Keine neuen Anfragen — du kannst selbst weiter anfragen.']]
          .map(([k, t, d]) => `<label class="pvopt ${fr === k ? 'on' : ''}"><input type="radio" name="frReq" value="${k}" ${fr === k ? 'checked' : ''}><span><b>${T(t)}</b><br><small class="muted">${T(d)}</small></span></label>`).join('')) +
      card('screen', 'Auf diesem PC', 'Nur hier — gilt nicht für deine anderen Geräte.',
        `<label class="small chk"><input type="checkbox" id="setPreview" ${S.showText ? 'checked' : ''}> <span><b>${T('Text in Meldungen zeigen')}</b> — ${T('Aus = nur „Neue Nachricht“, ohne Absender und Text.')}</span></label>
         <label class="small chk"><input type="checkbox" id="setShield" ${shield ? 'checked' : ''}> <span><b>${T('Bildschirmfoto-Schutz')}</b> — ${T('Das Fenster erscheint auf Bildschirmfotos, Aufnahmen und beim Teilen des Bildschirms schwarz.')}</span></label>`) +
      card('block', [...S.blocked].length ? T('Blockiert') + ` (${[...S.blocked].length})` : 'Blockiert', 'Blockierte können dir nicht schreiben, dich nicht anrufen und nicht anfragen.',
        `<div id="blockList" class="small muted">${[...S.blocked].length ? [...S.blocked].map((u) => `<div class="row" style="padding:4px 0"><span data-profile="${esc(u)}" style="cursor:pointer">${uav(u, 'xs')}</span><div class="main">${esc(S.nameOf(u))}</div><button class="link" data-unblock="${esc(u)}">${T('Aufheben')}</button></div>`).join('') : T('Niemand blockiert.')}</div>`) +
      card('shield', 'Sicherheit & Daten', '', `<ul class="pvlist"><li>${T('Chats, Gruppen, Status und Chat-Anrufe sind Ende-zu-Ende verschlüsselt — auch Zunora kann sie nicht lesen.')}</li><li>${T('Server-Kanäle sind nicht Ende-zu-Ende verschlüsselt.')}</li><li>${T('Keine Werbung, kein Tracking, keine Telefonnummer nötig.')}</li></ul>
        <div class="frbtns"><button class="btn ghost" data-setpage="geraete">${I('shield', 16)} ${T('Geräte')}</button><button class="btn ghost" data-setpage="hilfe">${I('file', 16)} ${T('Datenschutzerklärung')}</button></div>`);
  }
  function applyShield() { if (LS.get('zm-bildschutz', '0') === '1' && root.Host && root.Host.available) root.Host.call('privacy.capture', { on: true }).catch(() => { }); }
  function wirePrivacy(el, H) {
    if (!H.S._frLoaded) { H.S._frLoaded = true; H.S.loadRequestsSetting().then(() => H.renderList()); }
    el.querySelectorAll('input[name="frReq"]').forEach((r) => r.onchange = () => H.tryDo(async () => { await H.S.chooseFriendRequests(r.value); H.toast(T('✓ Gespeichert')); H.renderList(); }));
    const sh = el.querySelector('#setShield');
    if (sh) sh.onchange = () => {
      LS.set('zm-bildschutz', sh.checked ? '1' : '0');
      if (root.Host && root.Host.available) root.Host.call('privacy.capture', { on: sh.checked }).then(() => H.toast(sh.checked ? T('✓ Bildschirmfoto-Schutz an') : T('Bildschirmfoto-Schutz aus'))).catch((e) => H.toast(e.message || 'Ging nicht', true));
    };
  }

  // =========================================================================================== Profilbild groß
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-bigav]'); if (!t) return;
    e.preventDefault(); e.stopPropagation();
    const S = root.ZM.Store, u = t.dataset.bigav, pic = S.userPic(u), p = S.profiles.get(u) || S.me || {};
    const o = document.createElement('div'); o.className = 'bigav';
    o.innerHTML = `<div class="bigav-top"><b>${String(p.name || S.nameOf(u)).replace(/[<>&]/g, '')}</b><span>@${String(p.username || '').replace(/[<>&]/g, '')}</span></div>${pic ? `<img src="${pic.replace(/"/g, '%22')}" alt="">` : `<div class="bigav-none">${T('Kein Profilbild')}</div>`}<div class="bigav-hint">${T('Klicken oder Esc zum Schließen · Mausrad = Zoom')}</div>`;
    document.body.appendChild(o);
    let z = 1; const img = o.querySelector('img');
    if (img) o.addEventListener('wheel', (ev) => { ev.preventDefault(); z = Math.min(4, Math.max(1, z * (ev.deltaY < 0 ? 1.15 : 0.87))); img.style.transform = `scale(${z})`; }, { passive: false });
    const close = () => { o.remove(); document.removeEventListener('keydown', esc); };
    const esc = (ev) => { if (ev.key === 'Escape') close(); };
    o.onclick = close; document.addEventListener('keydown', esc);
  }, true);

  root.ZMMore = { friends, openLink, widgets, wireWidgets, startPage, wireStart, header, looks, wireLooks, applyIcon, konto, wireKonto, privacy, wirePrivacy, applyShield,
    setSection: (s) => { sec = s; } };
})(window);
