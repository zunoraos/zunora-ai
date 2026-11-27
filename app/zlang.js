/* Zunora-Sprachen für alle Zunora-PC-Apps. Die Apps sind auf Deutsch geschrieben; dieses Modul übersetzt alles Sichtbare
   (Texte, Platzhalter, Tooltips) zur Laufzeit mit der gemeinsamen Wortliste lang/<sprache>.json (dieselbe wie am Handy).
   Texte mit Werten darin stehen dort als Muster: „Freunde ({0})" passt auf „Freunde (3)".
   Nie übersetzt: Nachrichten, Namen und alles, was Nutzer selbst schreiben (.txt, .who, .title, .name, [data-notr], Eingabefelder).
   Einbinden: <script src="zlang.js" data-skip="…weitere Selektoren…"></script>   ·   Standard beim ersten Start: Englisch. */
(() => {
  'use strict';
  const me = document.currentScript;
  const LANGS = [['en', 'English', '🇬🇧'], ['de', 'Deutsch', '🇩🇪'], ['es', 'Español', '🇪🇸'], ['fr', 'Français', '🇫🇷'], ['it', 'Italiano', '🇮🇹'],
    ['pt', 'Português', '🇧🇷'], ['tr', 'Türkçe', '🇹🇷'], ['pl', 'Polski', '🇵🇱'], ['nl', 'Nederlands', '🇳🇱'], ['ru', 'Русский', '🇷🇺']];
  // Angekündigt („Demnächst"): alle weiteren EU-Amtssprachen, danach viele weitere (Name in eigener Schrift)
  const SOON_EU = [['bg', 'Български', '🇧🇬'], ['hr', 'Hrvatski', '🇭🇷'], ['cs', 'Čeština', '🇨🇿'], ['da', 'Dansk', '🇩🇰'], ['et', 'Eesti', '🇪🇪'], ['fi', 'Suomi', '🇫🇮'],
    ['el', 'Ελληνικά', '🇬🇷'], ['hu', 'Magyar', '🇭🇺'], ['ga', 'Gaeilge', '🇮🇪'], ['lv', 'Latviešu', '🇱🇻'], ['lt', 'Lietuvių', '🇱🇹'], ['mt', 'Malti', '🇲🇹'],
    ['ro', 'Română', '🇷🇴'], ['sk', 'Slovenčina', '🇸🇰'], ['sl', 'Slovenščina', '🇸🇮'], ['sv', 'Svenska', '🇸🇪']];
  const SOON_MORE = [['uk', 'Українська', '🇺🇦'], ['ar', 'العربية', '🇸🇦'], ['zh', '中文', '🇨🇳'], ['ja', '日本語', '🇯🇵'], ['ko', '한국어', '🇰🇷'], ['hi', 'हिन्दी', '🇮🇳'],
    ['no', 'Norsk', '🇳🇴'], ['is', 'Íslenska', '🇮🇸'], ['sr', 'Српски', '🇷🇸'], ['bs', 'Bosanski', '🇧🇦'], ['sq', 'Shqip', '🇦🇱'], ['mk', 'Македонски', '🇲🇰'],
    ['ca', 'Català', '🌐'], ['eu', 'Euskara', '🌐'], ['gl', 'Galego', '🌐'], ['lb', 'Lëtzebuergesch', '🇱🇺'], ['fa', 'فارسی', '🇮🇷'], ['he', 'עברית', '🇮🇱'],
    ['ku', 'Kurdî', '🌐'], ['ka', 'ქართული', '🇬🇪'], ['hy', 'Հայերեն', '🇦🇲'], ['az', 'Azərbaycanca', '🇦🇿'], ['id', 'Bahasa Indonesia', '🇮🇩'], ['ms', 'Bahasa Melayu', '🇲🇾'],
    ['vi', 'Tiếng Việt', '🇻🇳'], ['th', 'ไทย', '🇹🇭'], ['tl', 'Filipino', '🇵🇭'], ['ur', 'اردو', '🇵🇰'], ['bn', 'বাংলা', '🇧🇩'], ['sw', 'Kiswahili', '🇰🇪']];
  const soonHtml = () => `<div class="zlang-soon"><div class="zlang-sh">Demnächst · Coming soon <em>${SOON_EU.length + SOON_MORE.length}</em></div>
    ${[['Alle Sprachen der EU · All EU languages', SOON_EU], ['Und viele weitere · And many more', SOON_MORE]].map(([t, l]) => `<div class="zlang-st">${t}</div><div class="zlang-grid">${l.map(([c, n, f]) => `<span class="zlang-s" lang="${c}"><span>${f}</span>${n}</span>`).join('')}</div>`).join('')}
    <div class="zlang-st" style="text-align:center">Diese Sprachen kommen nach und nach mit den nächsten Updates. · These languages are coming with the next updates.</div></div>`;
  const SKIP = '.txt:not([data-tr]), .who, [data-notr], script, style, textarea, .zl-blob' + (me && me.dataset.skip ? ', ' + me.dataset.skip : '');
  const EXACT_ONLY = '.prev, .meta, .sub, .title, .name';   // dort steht oft Nutzertext: nur ganz gleiche Texte übersetzen, keine Muster
  const KEY = 'z-lang';
  let lang = ''; try { lang = localStorage.getItem(KEY) || ''; } catch (e) { }
  const exact = new Map(); let pats = []; let ready = Promise.resolve();
  // nur fertige Sprachen anbieten (lang/index.json, Deutsch immer)
  let avail = new Set(['de']);
  const availReady = fetch('lang/index.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : [])).then((l) => { (l || []).forEach((c) => avail.add(c)); }).catch(() => { });
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function build(dict) {
    exact.clear(); pats = [];
    for (const [k0, v0] of Object.entries(dict || {})) {
      const k = k0.replace(/\\n/g, '\n'), v = String(v0).replace(/\\n/g, '\n');
      if (!/\{\d+\}/.test(k)) { exact.set(k, v); continue; }
      const parts = k.split(/(\{\d+\})/); const lit = parts.filter((p) => !/^\{\d+\}$/.test(p)).join('');
      if (lit.replace(/[\s·—:()\-,.!?…]/g, '').length < 4) continue;          // zu unspezifisch → lieber nicht
      const order = parts.filter((p) => /^\{\d+\}$/.test(p)).map((p) => +p.slice(1, -1));
      pats.push({ re: new RegExp('^' + parts.map((p) => (/^\{\d+\}$/.test(p) ? '([\\s\\S]+?)' : reEsc(p))).join('') + '$'), order, v, n: lit.length });
    }
    pats.sort((a, b) => b.n - a.n);
  }
  /** Ein Text → übersetzt (oder unverändert, wenn unbekannt). */
  function tr(s, exactOnly) {
    if (!exact.size && !pats.length) return s;
    const t = s.trim(); if (!t) return s;
    let out = exact.get(t);
    // mit Zeichen davor (✓ 🔒 📷 …): Kern übersetzen, Zeichen behalten
    if (out === undefined) { const m = /^([^\p{L}\d]+?\s*)(\p{L}[\s\S]*)$/u.exec(t); if (m && m[1].trim()) { const core = tr(m[2], exactOnly); if (core !== m[2]) out = m[1] + core; } }
    if (out === undefined && !exactOnly) for (const p of pats) { const m = p.re.exec(t); if (m) { out = p.v.replace(/\{(\d+)\}/g, (_, n) => { const i = p.order.indexOf(+n); return i >= 0 ? m[i + 1] : ''; }); break; } }
    return out === undefined ? s : s.replace(t, out);
  }

  // ---------------------------------------------------------------- Seite übersetzen (und alles, was neu dazukommt)
  const ATTRS = ['placeholder', 'title', 'aria-label'];
  const skip = (el) => !el || (el.closest && el.closest(SKIP));
  function node(n) {
    if (n.nodeType === 3) {
      const p = n.parentElement; if (!p || skip(p)) return;
      const v = n.nodeValue; const nv = tr(v, !!p.closest(EXACT_ONLY)); if (nv !== v) n.nodeValue = nv;
    } else if (n.nodeType === 1) {
      const field = n.tagName === 'TEXTAREA' || n.tagName === 'INPUT';   // Eingabefelder: nur den Hinweistext, nie den Inhalt
      if (skip(n) && !field) return;
      for (const a of ATTRS) { const v = n.getAttribute(a); if (v) { const nv = tr(v); if (nv !== v) n.setAttribute(a, nv); } }
      if (n.tagName === 'INPUT' && (n.type === 'button' || n.type === 'submit') && n.value) { const nv = tr(n.value); if (nv !== n.value) n.value = nv; }
      if (field) return;
      for (let c = n.firstChild; c; c = c.nextSibling) node(c);
    }
  }
  function all() { if (document.body) node(document.body); if (document.title) document.title = tr(document.title); }
  const mo = new MutationObserver((list) => {
    if (!exact.size && !pats.length) return;
    for (const m of list) {
      if (m.type === 'childList') m.addedNodes.forEach(node);
      else if (m.type === 'characterData') node(m.target);
      else if (m.type === 'attributes' && m.target.nodeType === 1 && (!skip(m.target) || /^(TEXTAREA|INPUT)$/.test(m.target.tagName))) { const v = m.target.getAttribute(m.attributeName); if (v) { const nv = tr(v); if (nv !== v) m.target.setAttribute(m.attributeName, nv); } }
    }
  });

  async function load(l) {
    document.documentElement.lang = l || 'en';
    if (!l || l === 'de') { build({}); return; }
    try { const r = await fetch('lang/' + l + '.json', { cache: 'no-cache' }); build(r.ok ? await r.json() : {}); } catch (e) { build({}); }
  }
  ready = load(lang || 'en').then(() => { all(); mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS }); });

  // ---------------------------------------------------------------- Sprache wählen (erster Start + Einstellungen)
  async function picker(opts) { await availReady; return pick0(opts); }
  function pick0(opts) {
    opts = opts || {};
    return new Promise((done) => {
      const cur = avail.has(lang || 'en') ? (lang || 'en') : (avail.has('en') ? 'en' : 'de');
      const o = document.createElement('div'); o.className = 'zlang-ov'; o.setAttribute('data-notr', '');
      o.innerHTML = `<div class="zlang-box zl-pop"><div class="zlang-globe">🌍</div><h2>Choose your language</h2><p>Sprache wählen · Elige tu idioma · Choisis ta langue</p>
        <div class="zlang-list">${LANGS.filter(([c]) => avail.has(c)).map(([c, n, f]) => `<button class="zlang-item ${c === cur ? 'on' : ''}" data-l="${c}"><span>${f}</span><b>${n}</b>${c === cur ? '<i>✓</i>' : ''}</button>`).join('')}${soonHtml()}</div>
        <button class="zlang-go">Continue ›</button></div>`;
      let pick = cur;
      const draw = () => o.querySelectorAll('.zlang-item').forEach((b) => { const on = b.dataset.l === pick; b.classList.toggle('on', on); const i = b.querySelector('i'); if (on && !i) b.insertAdjacentHTML('beforeend', '<i>✓</i>'); if (!on && i) i.remove(); });
      o.addEventListener('click', async (e) => {
        const b = e.target.closest('.zlang-item'); if (b) { pick = b.dataset.l; draw(); return; }
        if (e.target.closest('.zlang-go')) { o.classList.add('out'); await set(pick); setTimeout(() => { o.remove(); done(pick); }, 220); }
        if (opts.cancel && e.target === o) { o.remove(); done(null); }
      });
      document.body.appendChild(o);
    });
  }
  async function set(l) {
    lang = l; try { localStorage.setItem(KEY, l); } catch (e) { }
    await load(l);
    // neu anzeigen: die App zeichnet sich danach selbst neu; bis dahin alles Sichtbare übersetzen
    all(); window.dispatchEvent(new CustomEvent('zlang', { detail: l }));
  }
  const css = document.createElement('style');
  css.textContent = `.zlang-ov{position:fixed;inset:0;z-index:2147482000;display:grid;place-items:center;background:rgba(8,5,30,.55);backdrop-filter:blur(14px);font-family:"Segoe UI Variable","Segoe UI",system-ui,sans-serif;animation:zlf .25s}
    .zlang-ov.out{opacity:0;transition:opacity .2s}@keyframes zlf{from{opacity:0}}
    .zlang-box{width:min(440px,92vw);max-height:86vh;display:flex;flex-direction:column;gap:10px;padding:26px 22px;border-radius:26px;color:var(--text,#edf2ff);
      background:color-mix(in srgb,var(--panel,#1b2542) 82%,transparent);border:1px solid var(--line,#ffffff24);backdrop-filter:blur(30px) saturate(1.7);box-shadow:inset 0 1px 0 #ffffff30,0 30px 80px -20px #000a}
    .zlang-globe{font-size:42px;text-align:center}.zlang-box h2{margin:0;text-align:center;font-size:22px}.zlang-box p{margin:0 0 6px;text-align:center;font-size:12.5px;opacity:.7}
    .zlang-list{overflow:auto;display:flex;flex-direction:column;gap:4px;scrollbar-width:none}
    .zlang-item{display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:14px;border:0;background:transparent;color:inherit;font:inherit;font-size:15px;cursor:pointer;text-align:left;transition:background .2s,scale .4s var(--zl-spring,ease)}
    .zlang-item:hover{background:#ffffff14}.zlang-item:active{scale:.96}.zlang-item span{font-size:22px}.zlang-item i{margin-left:auto;font-style:normal;color:var(--accent,#9b7bff);font-weight:700}
    .zlang-item.on{background:color-mix(in srgb,var(--accent,#9b7bff) 24%,transparent)}
    .zlang-go{margin-top:6px;padding:12px;border:0;border-radius:16px;font:inherit;font-weight:700;font-size:15px;color:#fff;cursor:pointer;background:linear-gradient(135deg,var(--accent,#9b7bff),var(--accent2,#5aa9ff));transition:scale .4s var(--zl-spring,ease)}
    .zlang-go:active{scale:.95}
    .zlang-soon{margin-top:14px;padding-top:12px;border-top:1px solid var(--line,#ffffff1f)}.zlang-sh{font-weight:700;font-size:15px;display:flex;align-items:center;gap:8px}
    .zlang-sh em{font-style:normal;font-size:11px;padding:2px 8px;border-radius:999px;color:#fff;background:var(--accent,#9b7bff)}.zlang-st{font-size:12px;opacity:.65;margin:10px 0 6px}
    .zlang-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px}.zlang-s{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:12px;background:#ffffff0d;font-size:13px;opacity:.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .zlang-s span{font-size:16px}`;
  (document.head || document.documentElement).appendChild(css);

  window.ZLang = {
    get lang() { return lang || 'en'; }, get chosen() { return !!lang; }, langs: LANGS, soon: SOON_EU.concat(SOON_MORE),
    t: (s) => tr(String(s)), set, picker, ready: () => ready,
    /** Name der Sprache in ihrer eigenen Schrift */
    name: (c) => ((LANGS.find((x) => x[0] === c) || [])[1] || c),
  };
})();
