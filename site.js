// Zunora-Webseite: Sprache (Deutsch/Englisch) — Standard nach Browser-Sprache, gemerkt im Browser. Keine Cookies, kein Tracking.
// Auf den rechtlichen Seiten: Inhaltsverzeichnis aus den Überschriften der gewählten Sprache (mit Markierung beim Scrollen).
(() => {
  let l = 'en';
  try { l = localStorage.getItem('z-web-lang') || ((navigator.language || 'en').toLowerCase().startsWith('de') ? 'de' : 'en'); } catch (e) { }
  const toc = () => {
    const box = document.querySelector('[data-toc]'); if (!box) return;
    const art = document.querySelector(`article.legal[lang="${l}"]`); if (!art) return;
    const hs = [...art.querySelectorAll('h3')];
    hs.forEach((h, i) => { h.id = h.id || `${l}-${i}`; });
    box.innerHTML = `<b>${l === 'de' ? 'Inhalt' : 'Contents'}</b>` + hs.map((h) => `<a href="#${h.id}">${h.textContent.replace(/[<>&]/g, '')}</a>`).join('');
    const links = [...box.querySelectorAll('a')];
    const mark = () => { let cur = 0; hs.forEach((h, i) => { if (h.getBoundingClientRect().top < 140) cur = i; }); links.forEach((a, i) => a.classList.toggle('on', i === cur)); };
    window.onscroll = mark; mark();
  };
  const set = (x) => { l = x; document.documentElement.dataset.l = x; document.documentElement.lang = x; try { localStorage.setItem('z-web-lang', x); } catch (e) { }
    document.querySelectorAll('button.lang').forEach((b) => { b.textContent = x === 'de' ? 'English' : 'Deutsch'; }); toc(); };
  set(l);
  document.addEventListener('click', (e) => { if (e.target.closest('button.lang')) set(l === 'de' ? 'en' : 'de'); });
})();
