// Einladung zu Zunora Messenger: Gerät erkennen, passenden Download zeigen (neueste Version live aus dem Katalog, sonst feste Links).
// einladung.html?von=<nutzername> → „<Name> lädt dich ein" + wie man ihn danach als Freund hinzufügt. Nichts wird gespeichert oder gesendet.
(() => {
  const FALLBACK = {
    android: { url: 'https://github.com/zunoraos/zunora-ai/releases/download/store-messenger-android-v1.1.2-beta.5/messenger-android-1.1.2-beta.5.apk', version: '1.1.2-beta.5' },
    pc: { url: 'https://github.com/zunoraos/zunora-ai/releases/download/store-messenger-pc-v1.1.2-beta.6/messenger-pc-1.1.2-beta.6.zip', version: '1.1.2-beta.6' },
  };
  const ua = navigator.userAgent || '';
  const apple = /iPhone|iPad|iPod|Macintosh/i.test(ua) && !/Windows/i.test(ua);
  const guess = /Android/i.test(ua) ? 'android' : /Windows/i.test(ua) ? 'windows' : 'android';
  let plat = location.hash === '#windows' ? 'windows' : location.hash === '#android' ? 'android' : guess;
  let live = null;
  // Nutzername aus dem Link — nur erlaubte Zeichen (wie im Messenger), sonst ignorieren
  const von = (new URLSearchParams(location.search).get('von') || '').trim().toLowerCase().replace(/^@/, '');
  const user = /^[a-z0-9_.]{3,24}$/.test(von) ? von : '';
  const name = (new URLSearchParams(location.search).get('name') || '').trim().slice(0, 40).replace(/[<>&"]/g, '');
  const $ = (id) => document.getElementById(id);

  function draw() {
    const de = ZC.L() === 'de';
    const p = plat === 'windows' ? 'pc' : 'android';
    document.querySelectorAll('#platTabs button').forEach((b) => b.classList.toggle('on', b.dataset.p === plat));
    document.querySelectorAll('[data-steps]').forEach((d) => { d.style.display = d.dataset.steps === plat ? '' : 'none'; });
    const v = (live && ZC.latest('messenger', p)) || null;
    const url = v ? ZC.safeUrl(v.file_url) : FALLBACK[p].url;
    const a = $('invDl'); if (url) { a.href = url; a.onclick = () => ZC.counted('messenger'); }
    $('invDlText').textContent = de ? `Für ${plat === 'windows' ? 'Windows' : 'Android'} herunterladen` : `Download for ${plat === 'windows' ? 'Windows' : 'Android'}`;
    $('invMeta').textContent = (plat === guess ? (de ? '✓ Passend für dein Gerät · ' : '✓ Matches your device · ') : '') + 'Version ' + (v ? v.version : FALLBACK[p].version) + (v && v.size ? ' · ' + ZC.size(v.size) : '');
    $('invApple').classList.toggle('hidden', !apple);
    const from = $('invFrom');
    if (user) {
      const who = name || '@' + user;
      from.textContent = de ? `${who} lädt dich ein` : `${who} invited you`;
      from.classList.remove('hidden');
      $('invUser').textContent = '@' + user;
      $('invFriend').classList.remove('hidden');
    }
  }
  $('platTabs').addEventListener('click', (e) => { const b = e.target.closest('button[data-p]'); if (b) { plat = b.dataset.p; history.replaceState(null, '', location.search + '#' + plat); draw(); } });
  $('invCopy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(user); const b = $('invCopy'); b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 1500); } catch (e) { } });
  document.addEventListener('click', (e) => { if (e.target.closest('button.lang')) setTimeout(draw, 0); });
  draw();
  ZC.load().then((d) => {
    live = d; draw();
    const app = d && (d.apps || []).find ? (d.apps || []).find((x) => x.id === 'messenger') : null;
    if (app && app.icon_path) $('invIcon').outerHTML = ZC.icon(app, 'xl invite-icon');
  }).catch(() => { });
})();
