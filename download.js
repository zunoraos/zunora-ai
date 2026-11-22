// Download-Seite: Gerät erkennen, Plattform wählen, neueste Versionen live aus dem Katalog (sonst feste Links).
(() => {
  const FALLBACK = {
    store: { android: { url: 'https://github.com/zunoraos/zunora-ai/releases/download/store-store-android-v1.1.1/store-android-1.1.1.apk', version: '1.1.1' },
             pc: { url: 'https://github.com/zunoraos/zunora-ai/releases/download/store-store-pc-v1.2.0/store-pc-1.2.0.zip', version: '1.2.0' } },
    messenger: { android: { url: 'https://github.com/zunoraos/zunora-ai/releases/download/store-messenger-android-v1.1.2-beta.3/messenger-android-1.1.2-beta.3.apk', version: '1.1.2-beta.3' },
                 pc: { url: 'https://github.com/zunoraos/zunora-ai/releases/download/store-messenger-pc-v1.1.2-beta.3/messenger-pc-1.1.2-beta.3.zip', version: '1.1.2-beta.3' } },
  };
  const ua = navigator.userAgent || '';
  const guess = /Android/i.test(ua) ? 'android' : /Windows/i.test(ua) ? 'windows' : (location.hash === '#windows' ? 'windows' : 'android');
  let plat = location.hash === '#windows' ? 'windows' : location.hash === '#android' ? 'android' : guess;
  let live = null;

  function draw() {
    const p = plat === 'windows' ? 'pc' : 'android';
    document.querySelectorAll('#platTabs button').forEach((b) => b.classList.toggle('on', b.dataset.p === plat));
    document.querySelectorAll('[data-steps]').forEach((d) => { d.style.display = d.dataset.steps === plat ? '' : 'none'; });
    const de = ZC.L() === 'de';
    const rec = document.getElementById('recText');
    rec.textContent = plat === guess ? (de ? '✓ Passend für dein Gerät' : '✓ Matches your device') : (de ? 'Für ein anderes Gerät' : 'For another device');
    for (const id of ['store', 'messenger']) {
      const v = (live && ZC.latest(id, p)) || null;
      const fb = FALLBACK[id][p];
      const url = v ? ZC.safeUrl(v.file_url) : fb.url;
      const a = document.querySelector(`[data-dl="${id}"]`); if (a && url) { a.href = url; a.onclick = () => ZC.counted(id); }
      const m = document.querySelector(`[data-meta="${id}"]`);
      if (m) m.textContent = (plat === 'windows' ? 'Windows · ' : 'Android · ') + 'Version ' + (v ? v.version : fb.version) + (v && v.size ? ' · ' + ZC.size(v.size) : '');
      const s = document.querySelector(`[data-sha="${id}"]`);
      if (s) s.textContent = v && v.sha256 ? 'SHA-256: ' + v.sha256 : '';
    }
  }
  document.getElementById('platTabs').addEventListener('click', (e) => { const b = e.target.closest('button[data-p]'); if (b) { plat = b.dataset.p; history.replaceState(null, '', '#' + plat); draw(); } });
  document.addEventListener('click', (e) => { if (e.target.closest('button.lang')) setTimeout(draw, 0); });
  draw();
  ZC.load().then((d) => { live = d; draw(); }).catch(() => { });
})();
