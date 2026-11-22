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

  function badges(a) {
    return platsOf(a).map((p) => PLAT[p].icon).join(' ') + (soon(a) ? ` <span class="chip soon">${T('DEMNÄCHST', 'SOON')}</span>` : a.status === 'beta' ? ' <span class="chip beta">BETA</span>' : '');
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
    const l = filtered();
    const f = !q && kind === 'all' ? D.apps.find((a) => a.featured) : null;
    $('#featured').innerHTML = f ? `<div class="glass featured in" data-open="${esc(f.id)}" style="--fa:${/^#[0-9a-fA-F]{6}$/.test(f.accent || '') ? f.accent + '66' : '#8b6cff55'}">
      ${ZC.icon(f, 'xl')}<div><span class="chip">${T('EMPFOHLEN', 'FEATURED')}</span><h2>${esc(f.name)}</h2><p>${esc(f.featured_text || f.subtitle || '')}</p></div></div>` : '';
    $('#list').innerHTML = l.length ? l.map((a, i) => `<div class="glass card in" style="animation-delay:${Math.min(i, 12) * 0.03}s" data-open="${esc(a.id)}">
        ${ZC.icon(a)}<div class="t"><b>${esc(a.name)}</b><small>${esc(a.subtitle || a.category || '')}</small><span class="plat">${badges(a)}</span></div></div>`).join('')
      : `<div class="empty">${T('Nichts gefunden.', 'Nothing found.')}</div>`;
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
    }).join('');
    const dl = v ? `<a class="btn big" id="dlBtn" href="${esc(ZC.safeUrl(v.file_url))}" rel="noopener">⬇ ${T('Herunterladen für', 'Download for')} ${PLAT[chosen].name}</a>
        <div class="muted" style="margin-top:6px">${esc(v.min_os || '')}${v.min_os ? ' · ' : ''}${chosen === 'android' ? T('APK antippen und installieren. Beim ersten Mal „Apps aus dieser Quelle erlauben“.', 'Tap the APK to install. The first time, allow apps from this source.') : T('ZIP entpacken und das Programm darin starten.', 'Extract the ZIP and start the program inside.')}</div>
        ${v.sha256 ? `<code class="sha">SHA-256: ${esc(v.sha256)}</code>` : ''}` : '';
    $('#dlg').innerHTML = `<div class="dlg" data-close="1"><div class="glass box">
      <button class="x" data-close="1" aria-label="close">✕</button>
      <div class="det-head">${ZC.icon(a, 'xl')}<div><h2>${esc(a.name)}</h2><p>${esc(a.subtitle || '')}</p><span class="plat">${esc(a.category || '')} · ${badges(a)}</span></div></div>
      ${soon(a) ? `<div class="choose"><b>🕒 ${T('Demnächst', 'Coming soon')}</b><div class="muted">${esc(a.release_text || T('Kommt bald in den Zunora App Store.', 'Coming soon to the Zunora App Store.'))}</div></div>`
        : avail.length ? `<div class="choose"><b>${T('Für welches Gerät möchtest du es laden?', 'Which device do you want it for?')}</b><div class="row">${opts}</div>${dl}</div>`
        : `<div class="choose"><b>${T('Noch keine Version zum Laden', 'No version to download yet')}</b></div>`}
      ${a.price_model && a.price_model !== 'free' && a.price_text ? `<p class="muted">💎 ${esc(a.price_text)}</p>` : ''}
      ${shotsP.length ? `<div class="shots ${chosen === 'pc' ? 'pc' : ''}">${shotsP.map((s) => `<img src="${esc(ZC.media(s.path))}" alt="${esc(s.caption || '')}" loading="lazy">`).join('')}</div>` : ''}
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
