// Zunora-Webseite: Sprache (Deutsch/Englisch) — Standard nach Browser-Sprache, gemerkt im Browser. Keine Cookies, kein Tracking.
(() => {
  let l = 'en';
  try { l = localStorage.getItem('z-web-lang') || ((navigator.language || 'en').toLowerCase().startsWith('de') ? 'de' : 'en'); } catch (e) { }
  const set = (x) => { l = x; document.documentElement.dataset.l = x; document.documentElement.lang = x; try { localStorage.setItem('z-web-lang', x); } catch (e) { }
    document.querySelectorAll('button.lang').forEach((b) => { b.textContent = x === 'de' ? 'English' : 'Deutsch'; }); };
  set(l);
  document.addEventListener('click', (e) => { if (e.target.closest('button.lang')) set(l === 'de' ? 'en' : 'de'); });
})();
