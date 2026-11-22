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
    let last = -1;
    const mark = () => { let cur = 0; hs.forEach((h, i) => { if (h.getBoundingClientRect().top < 160) cur = i; }); links.forEach((a, i) => a.classList.toggle('on', i === cur));
      // Handy: Inhaltsverzeichnis ist eine Chip-Leiste — den aktuellen Abschnitt mitscrollen
      if (cur !== last && innerWidth <= 640 && links[cur]) box.scrollTo({ left: links[cur].offsetLeft - 16, behavior: 'smooth' }); last = cur; };
    window.onscroll = mark; mark();
  };
  const set = (x) => { l = x; document.documentElement.dataset.l = x; document.documentElement.lang = x; try { localStorage.setItem('z-web-lang', x); } catch (e) { }
    document.querySelectorAll('button.lang').forEach((b) => { b.innerHTML = x === 'de' ? '<span class="lf">English</span><span class="ls">EN</span>' : '<span class="lf">Deutsch</span><span class="ls">DE</span>'; b.title = x === 'de' ? 'English' : 'Deutsch'; }); toc(); };
  // Handy: Leiste unten wie in einer App (Start, Store, Download) — die Links oben werden dann ausgeblendet (style.css)
  const ICONS = { 'index.html': '<path d="M4 11.5 12 5l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19z"/>',
    'store.html': '<path d="M5 8h14l-1.2 11.2a1.5 1.5 0 0 1-1.5 1.3H7.7a1.5 1.5 0 0 1-1.5-1.3z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
    'download.html': '<path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5"/><path d="M5 19.5h14"/>' };
  const nav = document.querySelector('nav.top');
  if (nav && !document.querySelector('nav.tabbar')) {
    const bar = document.createElement('nav'); bar.className = 'tabbar'; bar.setAttribute('aria-label', 'Navigation');
    bar.innerHTML = [...nav.querySelectorAll('a.l')].map((a) => { const h = a.getAttribute('href');
      return `<a href="${h}" class="${a.classList.contains('on') ? 'on' : ''}"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[h] || ''}</svg><span>${a.textContent}</span></a>`; }).join('');
    document.body.appendChild(bar);
  }
  set(l);
  document.addEventListener('click', (e) => { if (e.target.closest('button.lang')) set(l === 'de' ? 'en' : 'de'); });
})();
