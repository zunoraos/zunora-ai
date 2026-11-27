// Zunora App Store im Browser: stöbern, suchen, Details, herunterladen — mit Wahl der Plattform (Android / Windows).
(() => {
  const $ = (s) => document.querySelector(s);
  const esc = ZC.esc;
  const T = (de, en) => (ZC.L() === 'de' ? de : en);
  const PLAT = { android: { icon: '🤖', name: 'Android', file: 'APK' }, pc: { icon: '🪟', name: 'Windows', file: 'ZIP' } };
  const ua = navigator.userAgent || '';
  const myPlat = /Android/i.test(ua) ? 'android' : /Windows/i.test(ua) ? 'pc' : null;
  let D = null, kind = 'all', plat = 'all', q = '', open = null, chosen = null;

  const has = (a, p) => !!ZC.latest(a.id, p);
  const platsOf = (a) => ['android', 'pc'].filter((p) => (a.platforms || []).includes(p));
  const soon = (a) => a.status === 'announced';
  /** Geräte, die angekündigt, aber noch nicht da sind (iPhone kommt als Web-App über Safari) */
  const SOON_PLAT = { messenger: ['ios'] };
  const soonPlats = (a) => SOON_PLAT[a.id] || [];

  // ------------------------------------------------------------ wie die Store-App: Wartung, „Heute", Top-Apps, Premium-Apps
  const euro = (c) => (c / 100).toLocaleString(ZC.L() === 'de' ? 'de-DE' : 'en-US', { style: 'currency', currency: 'EUR' });
  const paid = (a) => (a.price_cents || 0) > 0;
  function maintOn() {
    const s = D && D.status; if (!s || !s.maint_from) return null;
    const now = Date.now(), f = new Date(s.maint_from).getTime(), u = s.maint_until ? new Date(s.maint_until).getTime() : 0;
    return now >= f && (!u || now < u) ? s : null;
  }
  function drawMaint() {
    const el = $('#maint'); if (!el) return; const s = maintOn();
    el.innerHTML = s ? `<div class="glass maint in"><span class="em">🛠</span><div><b>${esc(s.title || T('Der Store wird gerade aktualisiert', 'The store is being updated'))}</b><p>${esc(s.body || '')}</p>
      ${s.maint_until ? `<small>${T('Wieder da um', 'Back at')} ${new Date(s.maint_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${T(' Uhr', '')}</small>` : ''}</div></div>` : '';
  }
  function cd(at) {
    const ms = new Date(at).getTime() - Date.now(); if (ms <= 0) return T('Jetzt da', 'Out now');
    const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4), s = Math.floor(ms % 6e4 / 1e3);
    return (d ? d + T(' T. ', 'd ') : '') + [h, m, s].map((x) => String(x).padStart(2, '0')).join(':');
  }
  function drawToday() {
    const el = $('#today'); if (!el) return;
    if (!D || q || kind !== 'all') { el.innerHTML = ''; return; }
    const st = D.stories || [];
    const top = D.apps.filter((a) => a.status !== 'announced' && (has(a, 'android') || has(a, 'pc'))).sort((x, y) => (y.downloads || 0) - (x.downloads || 0)).slice(0, 5);
    const prem = D.apps.filter(paid);
    const day = new Date().toLocaleDateString(ZC.L() === 'de' ? 'de-DE' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' });
    const col = (c, d) => (/^#[0-9a-fA-F]{6}$/.test(c || '') ? c : d);
    el.innerHTML = `<div class="today-head"><small>${esc(day)}</small><h2>${T('Heute', 'Today')}</h2></div>
      ${st.length ? `<div class="stories">${st.map((s) => `<div class="story in" data-story="${esc(s.id)}" style="--c1:${col(s.color1, '#9B7BFF')};--c2:${col(s.color2, '#5AA9FF')}">
        ${s.image_path ? `<img src="${esc(ZC.media(s.image_path))}" alt="" loading="lazy">` : ''}<span class="em">${esc(s.emoji || '')}</span>
        <div class="st"><small>${esc(s.kicker || '')}</small><b>${esc(s.title)}</b><span>${esc(s.subtitle || '')}</span>
        ${s.countdown_at && new Date(s.countdown_at) > new Date() ? `<span class="cd" data-cd="${esc(s.countdown_at)}">${cd(s.countdown_at)}</span>` : ''}</div></div>`).join('')}</div>` : ''}
      ${top.length >= 3 ? `<h3>${T('Top-Apps', 'Top apps')}</h3><div class="glass charts">${top.map((a, i) => `<div class="chart" data-open="${esc(a.id)}"><span class="nr ${i ? '' : 'first'}">${i + 1}</span>${ZC.icon(a)}<span class="t"><b>${esc(a.name)}</b><small>${esc(a.subtitle || a.category || '')}</small></span></div>`).join('')}</div>` : ''}
      ${prem.length ? `<h3>${T('Premium-Apps', 'Premium apps')}</h3><div class="cards">${prem.map((a) => `<div class="glass card in" data-open="${esc(a.id)}">${ZC.icon(a)}<div class="t"><b>${esc(a.name)}</b><small>${esc(a.subtitle || '')}</small><span class="plat">💎 ${euro(a.price_cents)}${a.plus_discount !== false ? ' · ' + T('Plus-Rabatt', 'Plus discount') : ''}</span></div></div>`).join('')}</div>` : ''}
      <h3>${T('Alle Apps', 'All apps')}</h3>`;
  }
  setInterval(() => document.querySelectorAll('[data-cd]').forEach((x) => { x.textContent = cd(x.dataset.cd); }), 1000);
  function storyDlg(s) {
    if (s.app_id && !s.body) { detail(s.app_id); return; }
    const col = (c, d) => (/^#[0-9a-fA-F]{6}$/.test(c || '') ? c : d);
    $('#dlg').innerHTML = `<div class="dlg" data-close="1"><div class="glass box"><button class="x" data-close="1" aria-label="close">✕</button>
      <div class="story big" style="--c1:${col(s.color1, '#9B7BFF')};--c2:${col(s.color2, '#5AA9FF')}"><span class="em">${esc(s.emoji || '')}</span><div class="st"><small>${esc(s.kicker || '')}</small><b>${esc(s.title)}</b><span>${esc(s.subtitle || '')}</span></div></div>
      <div class="desc">${esc(s.body || '').replace(/^## (.*)$/gm, '<b>$1</b>')}</div>
      ${s.app_id ? `<button class="btn big" data-open="${esc(s.app_id)}">${T('Zur App', 'View app')}</button>` : ''}</div></div>`;
    document.body.style.overflow = 'hidden';
  }

  function badges(a) {
    return platsOf(a).map((p) => PLAT[p].icon).concat(soonPlats(a).map(() => '🍎')).join(' ') + (soon(a) ? ` <span class="chip soon">${T('DEMNÄCHST', 'SOON')}</span>` : a.status === 'beta' ? ' <span class="chip beta">BETA</span>' : '') + (paid(a) && !soon(a) ? ` <span class="chip price">💎 ${euro(a.price_cents)}</span>` : '');
  }
  function filtered() {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return D.apps.filter((a) => {
      if (kind === 'soon' && !soon(a)) return false;
      if ((kind === 'app' || kind === 'game') && (a.kind || 'app') !== kind) return false;
      if (plat !== 'all' && !(a.platforms || []).includes(plat)) return false;
      const hay = [a.name, a.subtitle, a.category, a.description].join(' ').toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }
  function drawList() {
    if (!D) return;
    drawMaint(); drawToday();
    const l = filtered();
    const ios = document.querySelector('.ios-soon'); if (ios) ios.hidden = !!q || kind === 'game';
    const f = !q && kind === 'all' ? D.apps.find((a) => a.featured) : null;
    $('#featured').innerHTML = f ? `<div class="glass featured in" data-open="${esc(f.id)}" style="--fa:${/^#[0-9a-fA-F]{6}$/.test(f.accent || '') ? f.accent + '66' : '#8b6cff55'}">
      ${ZC.icon(f, 'xl')}<div><span class="chip">${T('EMPFOHLEN', 'FEATURED')}</span><h2>${esc(f.name)}</h2><p>${esc(f.featured_text || f.subtitle || '')}</p></div></div>` : '';
    $('#list').innerHTML = l.length ? l.map((a, i) => `<div class="glass card in" style="animation-delay:${Math.min(i, 12) * 0.03}s" data-open="${esc(a.id)}">
        ${ZC.icon(a)}<div class="t"><b>${esc(a.name)}</b><small>${esc(a.subtitle || a.category || '')}</small><span class="plat">${badges(a)}</span></div></div>`).join('')
      : `<div class="empty">${maintOn() ? T('Während der Wartung sind die Apps kurz nicht zu sehen — gleich geht es weiter.', 'During maintenance the apps are hidden for a moment — back soon.') : T('Nichts gefunden.', 'Nothing found.')}</div>`;
  }

  function detail(id) {
    const a = D.apps.find((x) => x.id === id); if (!a) return;
    open = a;
    const avail = platsOf(a).filter((p) => has(a, p));
    if (!chosen || !avail.includes(chosen)) chosen = avail.includes(myPlat) ? myPlat : avail[0] || null;
    const v = chosen ? ZC.latest(a.id, chosen) : null;
    const shotsP = (D.shots[a.id]?.[chosen || 'android'] || D.shots[a.id]?.android || D.shots[a.id]?.pc || []);
    const opts = platsOf(a).map((p) => {
      const x = ZC.latest(a.id, p);
      return `<button class="opt ${p === chosen ? 'on' : ''}" data-plat-pick="${p}" ${x ? '' : 'disabled'}>
        <b>${PLAT[p].icon} ${PLAT[p].name}${p === myPlat ? ` · ${T('dein Gerät', 'your device')}` : ''}</b>
        <small>${x ? `Version ${esc(x.version)} · ${ZC.size(x.size)} · ${PLAT[p].file}` : T('noch nicht verfügbar', 'not available yet')}</small></button>`;
    }).join('') + soonPlats(a).map(() => `<a class="opt" href="app/" rel="noopener" style="text-decoration:none">
        <b>🍎 iPhone${/iPhone|iPad/i.test(ua) ? ` · ${T('dein Gerät', 'your device')}` : ''}</b>
        <small>${T('Testphase — nur mit Tester-Code · in Safari öffnen', 'Test phase — tester code only · open in Safari')}</small></a>`).join('');
    const dl = v ? `<a class="btn big" id="dlBtn" href="${esc(ZC.safeUrl(v.file_url))}" rel="noopener">⬇ ${T('Herunterladen für', 'Download for')} ${PLAT[chosen].name}</a>
        <div class="muted" style="margin-top:6px">${esc(v.min_os || '')}${v.min_os ? ' · ' : ''}${chosen === 'android' ? T('APK antippen und installieren. Beim ersten Mal „Apps aus dieser Quelle erlauben“.', 'Tap the APK to install. The first time, allow apps from this source.') : T('ZIP entpacken und das Programm darin starten.', 'Extract the ZIP and start the program inside.')}</div>
        ${v.sha256 ? `<code class="sha">SHA-256: ${esc(v.sha256)}</code>` : ''}` : '';
    $('#dlg').innerHTML = `<div class="dlg" data-close="1"><div class="glass box">
      <button class="x" data-close="1" aria-label="close">✕</button>
      <div class="det-head">${ZC.icon(a, 'xl')}<div><h2>${esc(a.name)}</h2><p>${esc(a.subtitle || '')}</p><span class="plat">${esc(a.category || '')} · ${badges(a)}</span></div></div>
      ${paid(a) && !soon(a) ? `<div class="choose"><b>💎 ${euro(a.price_cents)}${a.plus_discount !== false ? ' · ' + T('mit Zunora Plus günstiger', 'cheaper with Zunora Plus') : ''}</b><div class="muted">${T('Einmal kaufen — alle Updates inklusive. Kaufen geht in der App „Zunora App Store“ (Android und Windows) mit deiner Zunora ID.', 'Buy once — all updates included. Buy in the Zunora App Store app (Android and Windows) with your Zunora ID.')}</div><a class="btn big" href="store.html#app=store" data-open="store">${T('Zunora App Store laden', 'Get the Zunora App Store')}</a></div>`
        : soon(a) ? `<div class="choose"><b>🕒 ${T('Demnächst', 'Coming soon')}</b><div class="muted">${esc(a.release_text || T('Kommt bald in den Zunora App Store.', 'Coming soon to the Zunora App Store.'))}</div></div>`
        : avail.length ? `<div class="choose"><b>${T('Für welches Gerät möchtest du es laden?', 'Which device do you want it for?')}</b><div class="row">${opts}</div>${dl}</div>`
        : `<div class="choose"><b>${T('Noch keine Version zum Laden', 'No version to download yet')}</b></div>`}
      ${a.price_model && a.price_model !== 'free' && a.price_text ? `<p class="muted">💎 ${esc(a.price_text)}</p>` : ''}
      ${shotsP.length ? `<div class="shots ${chosen === 'pc' ? 'pc' : ''}">${shotsP.map((s) => `<img src="${esc(ZC.media(s.path))}" alt="${esc(s.caption || '')}" loading="lazy">`).join('')}</div>` : ''}
      ${a.trailer_path ? `<video class="trailer" controls preload="none" playsinline poster="${esc(ZC.media(a.trailer_path.replace(/\.[a-z0-9]+$/i, '.jpg')))}" src="${esc(ZC.media(a.trailer_path))}"></video>` : ''}
      <h3>${T('Beschreibung', 'Description')}</h3><div class="desc">${esc(a.description || '')}</div>
      ${v && v.notes ? `<h3>${T('Neu in Version', 'New in version')} ${esc(v.version)}</h3><div class="desc">${esc(v.notes)}</div>` : ''}
    </div></div>`;
    document.body.style.overflow = 'hidden';
    const b = document.getElementById('dlBtn'); if (b) b.addEventListener('click', () => { ZC.counted(a.id); toast(T('Download startet …', 'Download starting …')); });
    if (location.hash !== '#app=' + a.id) history.replaceState(null, '', '#app=' + encodeURIComponent(a.id));
  }
  function close() { open = null; $('#dlg').innerHTML = ''; document.body.style.overflow = ''; history.replaceState(null, '', location.pathname); }
  function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); }

  document.addEventListener('click', (e) => {
    const sto = e.target.closest('[data-story]'); if (sto && D) { const s = (D.stories || []).find((x) => x.id === sto.dataset.story); if (s) storyDlg(s); return; }
    const o = e.target.closest('[data-open]'); if (o) { chosen = null; detail(o.dataset.open); return; }
    const pp = e.target.closest('[data-plat-pick]'); if (pp && open) { chosen = pp.dataset.platPick; detail(open.id); return; }
    if (e.target.closest('.x') || e.target.classList.contains('dlg')) { close(); return; }
    const k = e.target.closest('[data-kind]'); if (k) { kind = k.dataset.kind; document.querySelectorAll('[data-kind]').forEach((x) => x.classList.toggle('on', x === k)); drawList(); return; }
    const p = e.target.closest('[data-plat]'); if (p) { plat = p.dataset.plat; document.querySelectorAll('[data-plat]').forEach((x) => x.classList.toggle('on', x === p)); drawList(); return; }
    if (e.target.closest('button.lang')) setTimeout(() => { $('#q').placeholder = T('Apps und Spiele suchen …', 'Search apps and games …'); drawList(); if (open) detail(open.id); }, 0);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) close(); });
  $('#q').addEventListener('input', (e) => { q = e.target.value; drawList(); });
  $('#q').placeholder = T('Apps und Spiele suchen …', 'Search apps and games …');
  // Startauswahl: Gerät des Besuchers vorwählen
  const start = myPlat || 'all';
  plat = start; document.querySelectorAll('[data-plat]').forEach((x) => x.classList.toggle('on', x.dataset.plat === start));

  ZC.load().then((d) => {
    D = d;
    drawList();
    const m = /#app=([\w-]+)/.exec(location.hash); if (m) detail(decodeURIComponent(m[1]));
  }).catch(() => { $('#list').innerHTML = `<div class="empty">${T('Der Store ist gerade nicht erreichbar. Bitte später noch einmal.', 'The store is not reachable right now. Please try again later.')}</div>`; });
})();
