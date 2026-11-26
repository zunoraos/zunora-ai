/* Zunora Messenger als Web-App (iPhone, iPad, jeder Browser) — ersetzt die Brücke zum Windows-Programm (js/bridge.js).
   Die App wird einmal auf dem Gerät gespeichert (sw.js); danach gehen nur noch Nachrichten übers Internet.
   Push-Meldungen über Web Push (iPhone ab iOS 16.4, nur wenn die App auf dem Home-Bildschirm liegt). Inhalte bleiben Ende-zu-Ende verschlüsselt:
   die Meldung enthält nur „Neue Nachricht" bzw. „Anruf" — der Text wird erst in der App entschlüsselt. */
(function () {
  'use strict';
  const root = window;
  const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } } };
  const T = (s) => (root.ZLang && root.ZLang.t ? root.ZLang.t(s) : s);
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = () => (root.matchMedia && root.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  document.documentElement.classList.add('zweb');
  if (ios) document.documentElement.classList.add('zweb-ios');

  // ---------------------------------------------------------------- Ersatz für das Windows-Programm
  // available=false → alle PC-Teile (Hintergrund, Autostart, Updates, App-Symbol, Zunora ID vom PC) bleiben aus.
  root.Host = { available: false, web: true, call: (t) => Promise.reject(new Error(T('Das gibt es nur in der PC-App.'))), on() { }, unlocked() { } };
  root.ZM = Object.assign(root.ZM || {}, { webDevice: { name: (ios ? (/iPad/.test(navigator.userAgent) ? 'iPad' : 'iPhone') : 'Browser') + ' · Zunora Messenger (Web-App)', platform: 'web' } });

  const AI = [['https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions', 'gpt-oss-120b'], ['https://text.pollinations.ai/openai', 'openai']];
  root.ZWeb = {
    /** Zunora AI (kostenlos, wie in der PC-App) */
    async ai(msgs) {
      let last = '';
      for (const [url, model] of AI) {
        try {
          const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages: msgs, stream: false }) });
          if (!r.ok) { last = 'Fehler ' + r.status; continue; }
          const j = await r.json(); const t = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
          if (t && t.trim()) return t.trim();
        } catch (e) { last = e.message; }
      }
      throw new Error(T('Die KI ist gerade nicht erreichbar.') + (last ? ' (' + last + ')' : ''));
    },
    /** Meldung, wenn die App im Hintergrund ist */
    async notify(title, body) {
      if (!document.hidden || !('Notification' in root) || Notification.permission !== 'granted') return;
      const reg = await navigator.serviceWorker.ready; return reg.showNotification(title, { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'zm-lokal' });
    },
  };

  // ---------------------------------------------------------------- Internet sparen: Bilder erst beim Antippen
  const saver = () => LS.get('zw-sparen', '1') === '1';
  root.ZM.mediaGate = (el, go) => {
    if (!saver()) return go();
    const b = document.createElement('button'); b.className = 'zw-tap'; b.type = 'button';
    b.innerHTML = '<span>🖼</span><small>' + T('Bild laden') + '</small>';
    b.onclick = (e) => { e.stopPropagation(); b.replaceWith(el); go(); };
    el.replaceWith(b);
  };

  // ---------------------------------------------------------------- Handy-Ansicht: Liste ODER Chat (wie am Handy)
  const narrow = () => root.matchMedia('(max-width: 760px)').matches;
  function chatOpen() { const m = document.getElementById('main'); return !!(m && (m.querySelector('#mHead') || m.querySelector('#unlockChat'))); }
  let wasOpen = false;
  function sync() {
    const open = chatOpen();
    document.documentElement.classList.toggle('zw-open', open);
    if (open && !wasOpen && narrow()) { try { history.pushState({ zw: 1 }, ''); } catch (e) { } }
    wasOpen = open; ensureBack();
  }
  function closeChat() {
    const S = root.ZM && root.ZM.Store; if (!S) return;
    S.openChat = null; S.openChannel = null; S.openThread = null;
    try { S.changed('nav'); } catch (e) { }
    document.documentElement.classList.remove('zw-open');
  }
  function ensureBack() {
    const h = document.getElementById('mHead'); if (!h || h.querySelector('.zw-back')) return;
    const b = document.createElement('button'); b.className = 'ico zw-back'; b.type = 'button'; b.title = T('Zurück'); b.textContent = '‹';
    b.onclick = (e) => { e.stopPropagation(); if (history.state && history.state.zw) history.back(); else closeChat(); };
    h.insertBefore(b, h.firstChild);
  }
  root.addEventListener('popstate', () => { if (document.documentElement.classList.contains('zw-open')) closeChat(); });
  new MutationObserver(() => sync()).observe(document.documentElement, { childList: true, subtree: true });

  // ---------------------------------------------------------------- Aus einer Meldung geöffnet: #chat=<id> / #call=<id>
  function fromHash() {
    const m = /^#(chat|kanal)=([\w-]+)/.exec(location.hash); if (!m) return;
    const go = () => { const S = root.ZM && root.ZM.Store; if (!S || !S.chats || !S.chats.size) return setTimeout(go, 400);
      if (m[1] === 'chat') S.openChat = m[2]; else S.openChannel = m[2];
      try { S.changed('nav'); } catch (e) { } try { history.replaceState(null, '', location.pathname); } catch (e) { } };
    go();
  }
  root.addEventListener('hashchange', fromHash);

  // ---------------------------------------------------------------- Offline-Speicher + Push
  const cfg = () => fetch('zm/config.json', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({}));
  const b64 = (s) => { const p = '='.repeat((4 - s.length % 4) % 4); const r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, (c) => c.charCodeAt(0)); };
  async function pushState() {
    if (!('serviceWorker' in navigator) || !('PushManager' in root)) return ios && !standalone() ? 'install' : 'none';
    if (!('Notification' in root)) return 'none';
    if (Notification.permission === 'denied') return 'denied';
    const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription();
    return sub ? 'on' : 'off';
  }
  /** Push einschalten (nur nach Tippen erlaubt) und die Kennung am eigenen Gerät speichern */
  async function pushOn() {
    const c = await cfg(); if (!c.vapid) throw new Error(T('Push-Meldungen sind auf dem Server noch nicht eingerichtet.'));
    if ((await Notification.requestPermission()) !== 'granted') throw new Error(T('Meldungen wurden nicht erlaubt. Du kannst sie in den iPhone-Einstellungen → Zunora → Mitteilungen erlauben.'));
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(c.vapid) });
    await saveSub(sub);
  }
  async function saveSub(sub) {
    const S = root.ZM && root.ZM.Store, Api = root.ZM && root.ZM.Api; if (!S || !Api || !S.deviceId) return;
    await Api.rest('PATCH', 'devices?id=eq.' + S.deviceId, { web_push: sub ? sub.toJSON() : null });
  }
  async function pushOff() { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); if (sub) await sub.unsubscribe(); await saveSub(null).catch(() => { }); }
  // nach dem Anmelden: vorhandene Kennung (sie kann sich ändern) wieder am Gerät speichern
  setInterval(async () => { try { if ((await pushState()) === 'on') { const reg = await navigator.serviceWorker.ready; await saveSub(await reg.pushManager.getSubscription()); } } catch (e) { } }, 6 * 3600e3);
  setTimeout(async () => { try { if ((await pushState()) === 'on') { const reg = await navigator.serviceWorker.ready; await saveSub(await reg.pushManager.getSubscription()); } } catch (e) { } }, 15000);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => { });
    navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.open) { location.hash = e.data.open; fromHash(); } });
  }

  // ---------------------------------------------------------------- Einstellungen der Web-App (in „Mehr")
  function dlg(html) {
    const bg = document.createElement('div'); bg.className = 'zw-bg';
    bg.innerHTML = '<div class="dlg zw-dlg">' + html + '</div>'; document.body.appendChild(bg);
    bg.onclick = (e) => { if (e.target === bg || e.target.closest('[data-zw-close]')) bg.remove(); };
    return bg;
  }
  async function settings() {
    const st = await pushState().catch(() => 'none');
    const pushTxt = { on: T('✓ An — du bekommst Meldungen zu neuen Nachrichten und Anrufen.'), off: T('Aus.'), denied: T('Blockiert. Erlauben unter iPhone-Einstellungen → Zunora → Mitteilungen.'),
      install: T('Erst die App auf den Home-Bildschirm legen (Teilen → „Zum Home-Bildschirm"), dann hier einschalten.'), none: T('Dieser Browser kann keine Push-Meldungen.') }[st];
    const el = dlg(`<h3 style="margin-top:0">📱 ${T('Web-App')}</h3>
      <b>${T('Push-Meldungen')}</b><p class="small">${pushTxt}</p>
      ${st === 'off' ? `<button class="btn" data-zw="push">${T('Push-Meldungen einschalten')}</button>` : st === 'on' ? `<button class="btn ghost" data-zw="pushoff">${T('Ausschalten')}</button>` : ''}
      <p class="small muted">${T('Die Meldung zeigt nur „Neue Nachricht" — der Inhalt bleibt Ende-zu-Ende verschlüsselt und wird erst in der App entschlüsselt.')}</p>
      <label class="zw-row"><input type="checkbox" id="zwSaver" ${saver() ? 'checked' : ''}> <span><b>${T('Internet sparen')}</b><br><small>${T('Bilder erst beim Antippen laden. Was einmal geladen ist, bleibt auf dem Gerät.')}</small></span></label>
      <p class="small muted">${T('Anrufe klingeln, solange die App offen ist. Ist sie zu, kommt eine Meldung — antippen öffnet die App.')}</p>
      <div style="text-align:right"><button class="btn ghost" data-zw-close>${T('Schließen')}</button></div><div class="zw-msg small"></div>`);
    const msg = (t) => { el.querySelector('.zw-msg').textContent = t; };
    el.querySelector('#zwSaver').onchange = (e) => LS.set('zw-sparen', e.target.checked ? '1' : '0');
    const p = el.querySelector('[data-zw="push"]'); if (p) p.onclick = () => pushOn().then(() => { el.remove(); settings(); }).catch((e) => msg(e.message));
    const o = el.querySelector('[data-zw="pushoff"]'); if (o) o.onclick = () => pushOff().then(() => { el.remove(); settings(); }).catch((e) => msg(e.message));
  }
  root.ZWeb.settings = settings;
  // Eintrag in der Einstellungs-Liste
  new MutationObserver(() => {
    const first = document.querySelector('#list .row.setsec'); if (!first || document.getElementById('zwSet')) return;
    const row = document.createElement('div'); row.className = first.className.replace(/\bon\b/, ''); row.id = 'zwSet'; row.style.cursor = 'pointer';
    row.innerHTML = '<span class="secic" style="font-size:17px">📱</span><div class="main"><div class="title">' + T('Web-App') + '</div><div class="prev">' + T('Push-Meldungen, Internet sparen') + '</div></div>';
    row.onclick = settings; first.parentNode.insertBefore(row, first);
  }).observe(document.documentElement, { childList: true, subtree: true });

  // ---------------------------------------------------------------- Hinweis: auf den Home-Bildschirm legen (iPhone, einmal je Woche)
  function installHint() {
    if (!ios || standalone()) return;
    const last = +LS.get('zw-hinweis', '0'); if (Date.now() - last < 7 * 864e5) return;
    const b = document.createElement('div'); b.className = 'zw-install';
    b.innerHTML = `<b>📲 ${T('Zunora als App')}</b><span>${T('Tippe unten auf Teilen (□↑) und dann auf „Zum Home-Bildschirm". Dann startet Zunora wie eine App, braucht weniger Internet und kann dir Meldungen schicken.')}</span><button type="button">✕</button>`;
    b.querySelector('button').onclick = () => { LS.set('zw-hinweis', String(Date.now())); b.remove(); };
    document.body.appendChild(b);
  }
  // nach der Anmeldung: einmal fragen, ob Push an soll (nicht gleichzeitig mit anderen Hinweisen)
  function pushAsk() {
    if (LS.get('zw-push-gefragt', '0') === '1' || !standalone()) return;
    if (!root.ZM || !root.ZM.Store || !root.ZM.Store.deviceId || document.querySelector('.dlg, .zm-notice, .zw-bg')) return setTimeout(pushAsk, 8000);
    pushState().then((st) => {
      if (st !== 'off') return; LS.set('zw-push-gefragt', '1');
      const el = dlg(`<h3 style="margin-top:0">🔔 ${T('Meldungen bei neuen Nachrichten?')}</h3><p class="small">${T('Dann sagt dir Zunora Bescheid, auch wenn die App zu ist. Der Inhalt bleibt verschlüsselt.')}</p>
        <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" data-zw-close>${T('Später')}</button><button class="btn" data-zw="ja">${T('Einschalten')}</button></div><div class="zw-msg small"></div>`);
      el.querySelector('[data-zw="ja"]').onclick = () => pushOn().then(() => el.remove()).catch((e) => { el.querySelector('.zw-msg').textContent = e.message; });
    }).catch(() => { });
  }
  root.addEventListener('load', () => { setTimeout(installHint, 2500); setTimeout(pushAsk, 6000); fromHash(); });
})();
