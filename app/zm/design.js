/* Zunora Messenger (PC) · Darstellung für alle Geschmäcker — wie am Handy (MDesign.kt):
 *  • Alles größer & einfacher (kostenlos): drei Größen-Stufen für alles + Einfache Ansicht (nur Chats, Anrufe, Einstellungen)
 *  • Zunora Plus: Animationen statt der Wasserwellen (Natur, Funken & Licht, Spielerisch, Ruhig) + Animation der Seitenleiste
 *  • Zunora Plus: komplette Design-Vorlagen Bausteine, Papier, Unterwasser, Weltraum, Pixel — ansehen und 2 Minuten ausprobieren kann jeder */
(function (root) {
  const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } } };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const T = (s) => (root.ZLang && root.ZLang.t ? root.ZLang.t(s) : s);
  const plus = () => !!(root.ZPlus && root.ZPlus.active && root.ZPlus.active());
  const calm = () => !!(root.ZLook && root.ZLook.calm) || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const html = document.documentElement;

  // ============================================================================================ Alles größer & einfacher
  const SENIOR = ['Aus', 'Groß', 'Größer', 'Am größten'], ZOOM = [1, 1.12, 1.24, 1.36];
  const senior = () => Math.max(0, Math.min(3, +LS.get('zd-senior', '0') || 0));
  const simple = () => LS.get('zd-einfach', '0') === '1';
  const SIMPLE_TABS = ['chats', 'calls', 'settings'];
  const SIMPLE_PAGES = ['senioren', 'darstellung', 'konto', 'anrufe', 'datenschutz', 'hilfe'];
  function seniorSummary() { const l = senior(), s = simple(); return l === 0 && !s ? 'Aus' : (l ? SENIOR[l] : '') + (l && s ? ' · ' : '') + (s ? 'Einfache Ansicht' : ''); }

  // ============================================================================================ Animationen
  const GROUPS = [['natur', 'Natur'], ['licht', 'Funken & Licht'], ['spiel', 'Spielerisch'], ['ruhig', 'Ruhig']];
  const KINDS = [['blaetter', 'Blätter', 'natur'], ['schnee', 'Schnee', 'natur'], ['sterne', 'Sterne', 'natur'], ['blasen', 'Seifenblasen', 'natur'],
    ['glitzer', 'Glitzer', 'licht'], ['streifen', 'Lichtstreifen', 'licht'], ['feuerwerk', 'Feuerwerk', 'licht'], ['neon', 'Neon-Puls', 'licht'],
    ['feder', 'Federn', 'spiel'], ['gummi', 'Gummiband', 'spiel'], ['wackeln', 'Wackeln', 'spiel'], ['konfetti', 'Konfetti', 'spiel'],
    ['sanft', 'Sanft einblenden', 'ruhig'], ['schimmer', 'Farb-Schimmer', 'ruhig'], ['aus', 'Aus', 'ruhig']];
  const NAV = [['standard', 'Standard'], ['gleiten', 'Gleiten'], ['huepfen', 'Hüpfen'], ['pop', 'Plopp'], ['drehen', 'Drehen'], ['wackeln', 'Wackeln'], ['leuchten', 'Leuchten'], ['funken', 'Funken']];
  const PARTICLES = ['blaetter', 'schnee', 'sterne', 'blasen', 'glitzer', 'streifen', 'feuerwerk', 'konfetti'];
  const fxTitle = (k) => k === 'wasser' ? 'Wasserwellen' : ((KINDS.find((x) => x[0] === k) || [k, k])[1]);

  // ============================================================================================ Vorlagen
  // v = Farben (wie die Palette am Handy), other = feste Farbe fremder Blasen, flat = Blasen ohne Glas
  const LOOKS = [
    { key: 'bausteine', title: 'Bausteine', emoji: '🧱', dark: false, fx: 'feder', nav: 'huepfen', flat: true, font: '"Segoe UI Semibold", "Segoe UI", sans-serif',
      desc: 'Bunte Klemmbausteine: Sprechblasen mit Noppen, Steine wippen im Hintergrund, alles federt.',
      v: { bg: '#eef3fa', text: '#1b1b1f', sub: '#474c58', accent: '#c8102e', accent2: '#0057a8', panel: 'rgba(255,255,255,.86)', panel2: 'rgba(27,27,31,.06)', line: 'rgba(27,27,31,.12)', in: '#ffd43b', out: '#c8102e', rail: 'rgba(255,255,255,.8)', side: 'rgba(255,255,255,.7)' } },
    { key: 'papier', title: 'Papier', emoji: '📄', dark: false, fx: 'blaetter', nav: 'wackeln', flat: true, font: '"Segoe Print", "Comic Sans MS", cursive',
      desc: 'Wie ein Notizbuch: liniertes Papier, Blasen mit Eselsohr, Handschrift-Schrift und ein Papierflieger.',
      v: { bg: '#f6efdf', text: '#2a2520', sub: '#5b5246', accent: '#27408b', accent2: '#3b5bb0', panel: 'rgba(255,253,247,.9)', panel2: 'rgba(59,47,31,.06)', line: 'rgba(59,47,31,.14)', in: '#fffdf7', out: '#27408b', rail: 'rgba(255,253,247,.85)', side: 'rgba(255,253,247,.75)' } },
    { key: 'unterwasser', title: 'Unterwasser', emoji: '🐠', dark: true, fx: 'blasen', nav: 'gleiten', flat: false, font: '',
      desc: 'Tief im Meer: Lichtstrahlen, aufsteigende Luftblasen, Seegras und Fische — runde Blasen wie Perlen.',
      v: { bg: '#021b33', text: '#e8f8ff', sub: '#a9ccdc', accent: '#0891b2', accent2: '#0d9488', panel: 'rgba(5,47,79,.66)', panel2: 'rgba(255,255,255,.08)', line: 'rgba(255,255,255,.12)', in: 'rgba(5,47,79,.78)', out: 'linear-gradient(135deg,#0891b2,#0d9488)', rail: 'rgba(2,27,51,.7)', side: 'rgba(2,27,51,.6)' } },
    { key: 'weltraum', title: 'Weltraum', emoji: '🪐', dark: true, fx: 'sterne', nav: 'leuchten', flat: false, font: 'Bahnschrift, "Segoe UI", sans-serif',
      desc: 'Zwischen den Sternen: funkelnder Sternenhimmel, ein Planet mit Ring, Sternschnuppen und leuchtende Blasen.',
      v: { bg: '#05040e', text: '#f2efff', sub: '#b3acd9', accent: '#7c5cff', accent2: '#c026d3', panel: 'rgba(21,17,46,.7)', panel2: 'rgba(255,255,255,.07)', line: 'rgba(255,255,255,.12)', in: 'rgba(21,17,46,.82)', out: 'linear-gradient(135deg,#7c5cff,#c026d3)', rail: 'rgba(5,4,14,.72)', side: 'rgba(5,4,14,.6)' } },
    { key: 'pixel', title: 'Pixel', emoji: '👾', dark: true, fx: 'glitzer', nav: 'pop', flat: true, font: '"Cascadia Mono", Consolas, "Courier New", monospace',
      desc: 'Retro-Look: eckige Pixel-Blasen mit hartem Schatten, Pixel-Schrift, Wolken und Herzen aus Pixeln.',
      v: { bg: '#1a1c2c', text: '#f4f4f4', sub: '#b8bfd2', accent: '#2e8b57', accent2: '#3b5dc9', panel: 'rgba(38,43,68,.92)', panel2: 'rgba(255,255,255,.07)', line: 'rgba(255,255,255,.14)', in: '#333c57', out: '#2e8b57', rail: 'rgba(26,28,44,.92)', side: 'rgba(26,28,44,.85)' } },
  ];
  const byKey = (k) => LOOKS.find((l) => l.key === k) || null;
  let trial = null, trialEnds = 0, trialTimer = 0;
  const look = () => byKey(trial || (plus() ? LS.get('zd-vorlage', '') : ''));
  const fxAllowed = () => plus() || !!trial;
  function fxNow() { if (!fxAllowed()) return 'wasser'; const c = plus() ? LS.get('zd-fx', '') : ''; return c || (look() ? look().fx : 'wasser'); }
  function navNow() { if (!fxAllowed()) return 'standard'; const c = plus() ? LS.get('zd-nav', '') : ''; return c || (look() ? look().nav : 'standard'); }

  // ---------------------------------------------------------------------------------------- CSS der Vorlagen (einmal)
  function css() {
    if (document.getElementById('zd-css')) return;
    const s = document.createElement('style'); s.id = 'zd-css';
    s.textContent = LOOKS.map((l) => `html.zd-${l.key}{--bg:${l.v.bg}!important;--text:${l.v.text}!important;--sub:${l.v.sub}!important;--accent:${l.v.accent}!important;--accent2:${l.v.accent2}!important;--panel:${l.v.panel}!important;--panel2:${l.v.panel2}!important;--line:${l.v.line}!important;--in:${l.v.in}!important;--out:${l.v.out}!important;--rail:${l.v.rail}!important;--side:${l.v.side}!important;color-scheme:${l.dark ? 'dark' : 'light'}}
html.zd-${l.key} body{background:${l.v.bg}!important}${l.font ? `html.zd-${l.key} body,html.zd-${l.key} button,html.zd-${l.key} input,html.zd-${l.key} textarea{font-family:${l.font}!important}` : ''}`).join('\n') + `
#zd-scene{position:fixed;inset:0;z-index:0;pointer-events:none}
html.zd-on #zm-app{position:relative;z-index:1}
#zd-fx{position:fixed;inset:0;z-index:2147483000;pointer-events:none}
html.zd-on .bub.me{color:#fff}
html.zd-on .bub.me .meta{color:#ffffffc8}
html.zd-bausteine .bub{border-radius:5px!important;margin-top:9px;box-shadow:0 2px 0 #0002!important}
html.zd-bausteine .bub::before{content:'';position:absolute;left:8px;right:8px;top:-6px;height:7px;border-radius:3px 3px 0 0;background:repeating-linear-gradient(90deg,var(--zd-stud,#ffd43b) 0 10px,transparent 10px 16px);pointer-events:none}
html.zd-bausteine .bub.me{--zd-stud:#c8102e}
html.zd-bausteine .bub.sticker-msg::before{display:none}
html.zd-papier .bub{border-radius:2px!important;box-shadow:2px 3px 0 #3b2f1f22!important;background:linear-gradient(225deg,transparent 12px,var(--in) 12px)!important}
html.zd-papier .bub.me{background:linear-gradient(225deg,transparent 12px,var(--accent) 12px)!important}
html.zd-papier .bub::after{content:'';position:absolute;right:0;top:0;width:12px;height:12px;background:linear-gradient(225deg,transparent 50%,#d9cdb0 50%);pointer-events:none}
html.zd-papier .bub.sticker-msg::after{display:none}
html.zd-unterwasser .bub{border-radius:22px!important}
html.zd-unterwasser .bub.me::after{content:'';position:absolute;right:-9px;bottom:2px;width:7px;height:7px;border-radius:50%;border:1.2px solid #ffffff77;pointer-events:none}
html.zd-weltraum .bub{border-radius:18px 18px 18px 4px!important;box-shadow:0 0 0 1px color-mix(in srgb,var(--accent) 35%,transparent),0 0 14px color-mix(in srgb,var(--accent) 30%,transparent)!important}
html.zd-weltraum .bub.me{border-radius:18px 18px 4px 18px!important}
html.zd-pixel .bub{border-radius:0!important;margin:4px 6px;box-shadow:4px 0 0 0 var(--in),-4px 0 0 0 var(--in),0 4px 0 0 var(--in),0 -4px 0 0 var(--in),8px 8px 0 0 #0007!important}
html.zd-pixel .bub.me{box-shadow:4px 0 0 0 var(--accent),-4px 0 0 0 var(--accent),0 4px 0 0 var(--accent),0 -4px 0 0 var(--accent),8px 8px 0 0 #0007!important;background:var(--accent)!important}
html.zd-pixel .bub.sticker-msg{box-shadow:none!important}
html.zd-flat .bub{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
html.zd-on .bub.me:not(.sticker-msg){background:var(--out)}
/* Alles größer */
html.zd-senior #zm-app{zoom:calc(var(--zm-scale,1) * var(--zd-zoom,1))!important}
/* Einfache Ansicht */
html.zd-simple .stories,html.zd-simple .zst-wrap,html.zd-simple .fchips{display:none!important}
/* Seitenleiste */
@keyframes zd-hop{0%,100%{transform:none}25%{transform:translateY(-9px)}50%{transform:none}70%{transform:translateY(-4px)}}
@keyframes zd-pop{0%{transform:scale(.6)}45%{transform:scale(1.35)}70%{transform:scale(.92)}100%{transform:scale(1)}}
@keyframes zd-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes zd-wig{0%,100%{transform:rotate(0)}15%{transform:rotate(-16deg)}35%{transform:rotate(13deg)}55%{transform:rotate(-8deg)}75%{transform:rotate(4deg)}}
@keyframes zd-glow{0%{filter:drop-shadow(0 0 0 var(--accent))}40%{filter:drop-shadow(0 0 12px var(--accent))}100%{filter:drop-shadow(0 0 5px var(--accent))}}
.zd-a-huepfen{animation:zd-hop .7s ease-out}.zd-a-pop{animation:zd-pop .55s ease-out}.zd-a-drehen{animation:zd-spin .55s cubic-bezier(.2,.7,.3,1)}
.zd-a-wackeln{animation:zd-wig .7s ease-out}.zd-a-leuchten,.zd-a-funken{animation:zd-pop .5s ease-out}
html.zd-nav-leuchten #rail .nav.on .ni{filter:drop-shadow(0 0 6px var(--accent))}
html.zd-nav-gleiten #rail .nav.on{background:transparent!important}
#rail .navpill{position:relative}
.zd-slider{position:absolute;left:0;right:0;border-radius:16px;background:color-mix(in srgb,var(--accent) 22%,transparent);transition:top .42s cubic-bezier(.3,1.5,.5,1),height .3s;pointer-events:none;z-index:0}
#rail .navpill .nav{position:relative;z-index:1}
/* Einstellungen */
.zd-cards{display:flex;gap:10px;overflow-x:auto;padding:6px 0 10px}
.zd-card{flex:0 0 112px;cursor:pointer;text-align:center;border:0;background:none;color:var(--text);padding:0}
.zd-card canvas,.zd-card .zd-std{width:112px;height:160px;border-radius:16px;display:block}
.zd-card.on canvas,.zd-card.on .zd-std{outline:3px solid var(--text);outline-offset:-3px}
.zd-std{background:linear-gradient(135deg,#6d4cff,#2a7fff,#c04cff);display:flex!important;align-items:center;justify-content:center;font-size:40px;color:#fff;font-weight:600}
.zd-demo{height:96px;border-radius:16px;background:color-mix(in srgb,var(--accent) 9%,transparent);display:flex;align-items:center;justify-content:center;margin:8px 0;cursor:pointer;user-select:none}
.zd-navdemo{display:flex;justify-content:space-evenly;padding:8px;border-radius:24px;background:color-mix(in srgb,var(--accent) 9%,transparent);margin:8px 0}
.zd-navdemo button{background:none;border:0;padding:6px 14px;border-radius:16px;color:var(--text);cursor:pointer}
.zd-navdemo button.on{background:color-mix(in srgb,var(--accent) 22%,transparent);color:var(--accent)}
.zd-big{width:100%;height:360px;border-radius:18px;display:block}
.zd-trial{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:14px;background:color-mix(in srgb,var(--accent) 16%,transparent);margin:8px 0}
.chip .zd-lock{color:var(--accent);margin-left:3px}
.zd-made{text-align:center;margin:18px 0 8px;color:var(--text)}.zd-made small{display:block;color:var(--sub);font-size:11.5px;margin-top:2px}
.zd-flag{display:inline-flex;flex-direction:column;width:18px;height:12px;border-radius:2px;overflow:hidden;vertical-align:-1px;margin-right:7px}.zd-flag i{flex:1}`;
    document.head.appendChild(s);
  }

  // ---------------------------------------------------------------------------------------- Zufall & Zeichnen (wie MDesign.kt)
  const rnd = (seed, i) => { const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453; return x - Math.floor(x); };
  const PI = Math.PI;
  function rgba(hex, a) { if (hex.startsWith('rgba')) return hex; const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
  function star(g, x, y, r) { g.beginPath(); for (let k = 0; k < 10; k++) { const rr = k % 2 ? r * 0.45 : r, a = -PI / 2 + k * PI / 5; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }

  /** Animation zeichnen: t 0…1, (ox, oy) Ursprung, spread > 0 = entlang einer Kante dieser Breite */
  function drawFx(g, kind, t, ox, oy, spread, seed, pal, pixel, scale) {
    const d = (scale || 1), time = t * 1.4, fade = Math.max(0, 1 - t), edge = spread > 0;
    const start = (i) => edge ? [ox + rnd(seed, i) * spread, oy] : [ox, oy];
    const phys = (s, vx, vy, gr) => [s[0] + vx * time, s[1] + vy * time + 0.5 * gr * time * time];
    const dot = (c, x, y, r) => { g.fillStyle = c; if (pixel) g.fillRect(Math.floor((x - r) / 2) * 2, Math.floor((y - r) / 2) * 2, 2 * r, 2 * r); else { g.beginPath(); g.arc(x, y, r, 0, 2 * PI); g.fill(); } };
    const festive = [pal.accent, pal.accent2, '#ff7ad9', '#ffd54f', '#5be3a0'];
    g.save();
    switch (kind) {
      case 'blaetter': for (let i = 0; i < (edge ? 12 : 7); i++) {
        const r = rnd(seed, i + 3), s = start(i), p = phys(s, (r - .5) * 130 * d, edge ? 10 * d : (-50 - r * 60) * d, 150 * d); p[0] += Math.sin(time * 5 + i) * 10 * d;
        g.save(); g.translate(p[0], p[1]); g.rotate((time * 220 * (r - .5) * 3 + i * 40) * PI / 180); g.globalAlpha = fade;
        g.fillStyle = ['#6bbf59', '#e8a33d', '#d9653b', '#9ccb5a'][i % 4]; if (pixel) g.fillRect(-4 * d, -2 * d, 8 * d, 4 * d); else { g.beginPath(); g.ellipse(0, 0, 6 * d, 3 * d, 0, 0, 2 * PI); g.fill(); }
        g.restore(); } break;
      case 'schnee': for (let i = 0; i < (edge ? 16 : 10); i++) {
        const r = rnd(seed, i + 5), s = start(i); s[0] += (rnd(seed, i + 50) - .5) * 30 * d; const p = phys(s, (r - .5) * 50 * d, edge ? 18 * d : (-30 - r * 30) * d, 55 * d);
        g.globalAlpha = fade; dot(pal.dark ? '#fff' : '#9cc7ea', p[0] + Math.sin(time * 4 + i * 1.3) * 8 * d, p[1], (1.8 + r * 2.2) * d); } break;
      case 'sterne': for (let i = 0; i < (edge ? 12 : 8); i++) {
        const r = rnd(seed, i + 7), s = start(i), ang = edge ? (.15 + r * .7) * PI : i / 8 * 2 * PI + r, dist = (40 + r * 70) * d * (1 - (1 - t) * (1 - t));
        g.globalAlpha = fade; g.fillStyle = i % 3 ? '#ffd54f' : '#fff'; const sz = (4.5 + r * 3) * d * (.7 + .3 * Math.sin(time * 18 + i));
        if (pixel) { g.fillRect(s[0] + Math.cos(ang) * dist - sz / 2, s[1] + Math.sin(ang) * dist - sz / 6, sz, sz / 3); g.fillRect(s[0] + Math.cos(ang) * dist - sz / 6, s[1] + Math.sin(ang) * dist - sz / 2, sz / 3, sz); }
        else star(g, s[0] + Math.cos(ang) * dist, s[1] + Math.sin(ang) * dist, sz); } break;
      case 'blasen': for (let i = 0; i < (edge ? 10 : 7); i++) {
        const r = rnd(seed, i + 9), s = edge ? [ox + rnd(seed, i) * spread, oy + (60 + r * 120) * d] : [ox, oy], p = phys(s, (r - .5) * 40 * d, (-50 - r * 60) * d, -25 * d); p[0] += Math.sin(time * 6 + i) * 6 * d;
        const rad = (4 + r * 6) * d; g.globalAlpha = .75 * fade; g.strokeStyle = pal.dark ? '#fff' : pal.accent2; g.lineWidth = 1.4 * d;
        if (pixel) g.strokeRect(p[0] - rad, p[1] - rad, 2 * rad, 2 * rad); else { g.beginPath(); g.arc(p[0], p[1], rad, 0, 2 * PI); g.stroke(); g.globalAlpha = .8 * fade; dot('#fff', p[0] - rad * .35, p[1] - rad * .35, rad * .25); } } break;
      case 'glitzer': for (let i = 0; i < (edge ? 22 : 16); i++) {
        const s = start(i), x = s[0] + (rnd(seed, i + 11) - .5) * (edge ? 20 : 90) * d, y = s[1] + (rnd(seed, i + 13) - (edge ? 0 : .5)) * 70 * d - time * 14 * d;
        g.globalAlpha = (.5 + .5 * Math.sin(time * 24 + i * 1.7)) * fade; g.strokeStyle = g.fillStyle = ['#ffe082', '#ff7ad9', '#ffffff', pal.accent][i % 4]; const l = (3 + rnd(seed, i + 15) * 4) * d;
        if (pixel) { g.fillRect(x - l / 2, y - d, l, 2 * d); g.fillRect(x - d, y - l / 2, 2 * d, l); } else { g.lineWidth = 1.4 * d; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - l, y); g.lineTo(x + l, y); g.moveTo(x, y - l); g.lineTo(x, y + l); g.stroke(); } } break;
      case 'streifen': {
        if (edge) { const x = ox - spread * .3 + t * spread * 1.6, gr = g.createLinearGradient(x - 90 * d, 0, x + 90 * d, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, `rgba(255,255,255,${.9 * fade})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
          g.strokeStyle = gr; g.lineWidth = 3 * d; g.beginPath(); g.moveTo(x - 90 * d, oy); g.lineTo(x + 90 * d, oy); g.stroke(); }
        else { const len = 90 * d * (.3 + .7 * (1 - (1 - t) * (1 - t))); let gr = g.createLinearGradient(ox - len, 0, ox + len, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, `rgba(255,255,255,${.95 * fade})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
          g.strokeStyle = gr; g.lineWidth = 2.5 * d; g.beginPath(); g.moveTo(ox - len, oy); g.lineTo(ox + len, oy); g.stroke();
          gr = g.createRadialGradient(ox, oy, 0, ox, oy, 22 * d); gr.addColorStop(0, rgba(pal.accent, .45 * fade)); gr.addColorStop(1, rgba(pal.accent, 0)); g.fillStyle = gr; g.beginPath(); g.arc(ox, oy, 22 * d, 0, 2 * PI); g.fill(); }
        break; }
      case 'feuerwerk': (edge ? [.2, .55, .85].map((f) => [ox + spread * f, oy + 40 * d]) : [[ox, oy]]).forEach((c, ci) => {
        const dl = ci * .12, tt = Math.max(0, Math.min(1, (t - dl) / (1 - dl))); if (tt <= 0) return; const tm = tt * 1.4;
        for (let i = 0; i < 18; i++) { const r = rnd(seed + ci, i + 17), ang = i / 18 * 2 * PI + r * .3, sp = (110 + r * 90) * d;
          const at = (x) => [c[0] + Math.cos(ang) * sp * x, c[1] + Math.sin(ang) * sp * x + .5 * 110 * d * x * x]; const a = at(Math.max(0, tm - .09)), b = at(tm);
          g.globalAlpha = 1 - tt; g.strokeStyle = festive[(i + ci) % festive.length]; g.lineWidth = 1.8 * d; g.lineCap = 'round';
          if (pixel) dot(festive[(i + ci) % festive.length], b[0], b[1], 1.6 * d); else { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); } } }); break;
      case 'neon': { const r = (10 + 70 * (1 - (1 - t) * (1 - t))) * d; [[10, .1], [5, .25], [2, .95]].forEach(([w, al]) => { g.globalAlpha = al * fade; g.strokeStyle = pal.accent2; g.lineWidth = w * d; g.beginPath(); g.arc(ox, oy, r, 0, 2 * PI); g.stroke(); }); break; }
      case 'feder': { const r = Math.max(1, 34 * d * (1 - Math.exp(-6 * t) * Math.cos(t * 14))); g.globalAlpha = .85 * fade; g.strokeStyle = pal.accent; g.lineWidth = 3 * d; g.beginPath(); g.arc(ox, oy, r, 0, 2 * PI); g.stroke(); break; }
      case 'gummi': { const sx = 1 + .7 * Math.exp(-5 * t) * Math.cos(t * 18), sy = 1 / Math.max(.3, sx), r = 26 * d * (.6 + .4 * t); g.globalAlpha = .85 * fade; g.strokeStyle = pal.accent2; g.lineWidth = 3 * d; g.beginPath(); g.ellipse(ox, oy, r * sx, r * sy, 0, 0, 2 * PI); g.stroke(); break; }
      case 'wackeln': { g.beginPath(); for (let k = 0; k <= 64; k++) { const th = k / 64 * 2 * PI, rr = 24 * d + Math.sin(th * 8 + t * 30) * 5 * d * (1 - t); g.lineTo(ox + Math.cos(th) * rr, oy + Math.sin(th) * rr); } g.globalAlpha = .85 * fade; g.strokeStyle = pal.accent; g.lineWidth = 2.5 * d; g.stroke(); break; }
      case 'konfetti': for (let i = 0; i < (edge ? 22 : 16); i++) {
        const r = rnd(seed, i + 19), s = start(i), p = phys(s, (r - .5) * 260 * d, edge ? (20 + r * 40) * d : (-150 - r * 130) * d, 420 * d);
        g.save(); g.translate(p[0], p[1]); g.rotate((time * 720 * (r - .5) + i * 30) * PI / 180); g.globalAlpha = t < .7 ? 1 : (1 - t) / .3; g.fillStyle = festive[i % festive.length]; g.fillRect(-3.5 * d, -1.8 * d, 7 * d, 3.6 * d); g.restore(); } break;
      case 'sanft': { const gr = g.createRadialGradient(ox, oy, 0, ox, oy, 46 * d); gr.addColorStop(0, rgba(pal.accent, Math.sin(t * PI) * .35)); gr.addColorStop(1, rgba(pal.accent, 0)); g.fillStyle = gr; g.beginPath(); g.arc(ox, oy, 46 * d, 0, 2 * PI); g.fill(); break; }
      case 'schimmer': { const r = (28 + 26 * t) * d; const gr = g.createConicGradient ? g.createConicGradient(t * 5, ox, oy) : null;
        if (gr) { [pal.accent, pal.accent2, '#ff7ad9', pal.accent].forEach((c, i) => gr.addColorStop(i / 3, c)); g.strokeStyle = gr; } else g.strokeStyle = pal.accent;
        g.globalAlpha = .8 * fade; g.lineWidth = 7 * d * fade + 1; g.beginPath(); g.arc(ox, oy, r, 0, 2 * PI); g.stroke(); break; }
    }
    g.restore();
  }

  // ---------------------------------------------------------------------------------------- Teilchen-Ebene über allem
  const bursts = []; let fxCv = null, fxRaf = 0, seedN = 1;
  const pal = () => { const l = look(); const cs = getComputedStyle(html); const v = (k) => cs.getPropertyValue(k).trim() || '#9b7bff';
    return l ? { accent: l.v.accent, accent2: l.v.accent2, dark: l.dark } : { accent: v('--accent'), accent2: v('--accent2'), dark: html.getAttribute('data-theme') !== 'light' }; };
  function spawn(kind, x, y, spread, scale) {
    if (!kind || kind === 'wasser' || kind === 'aus' || calm()) return;
    if (!fxCv) { fxCv = document.createElement('canvas'); fxCv.id = 'zd-fx'; document.body.appendChild(fxCv); }
    if (bursts.length >= 10) bursts.shift();
    seedN = (seedN * 31 + 7) & 0xffff; bursts.push({ kind, x, y, spread: spread || 0, scale: scale || 1, seed: seedN, t0: performance.now() });
    if (!fxRaf) fxRaf = requestAnimationFrame(fxTick);
  }
  function fxTick(now) {
    const dpr = devicePixelRatio || 1, w = innerWidth, h = innerHeight;
    if (fxCv.width !== Math.round(w * dpr) || fxCv.height !== Math.round(h * dpr)) { fxCv.width = Math.round(w * dpr); fxCv.height = Math.round(h * dpr); fxCv.style.width = w + 'px'; fxCv.style.height = h + 'px'; }
    const g = fxCv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const p = pal(), px = (look() || {}).key === 'pixel';
    for (let i = bursts.length - 1; i >= 0; i--) { const b = bursts[i], t = (now - b.t0) / 1400; if (t >= 1) { bursts.splice(i, 1); continue; } drawFx(g, b.kind, Math.max(0, t), b.x, b.y, b.spread, b.seed, p, px, b.scale); }
    fxRaf = bursts.length ? requestAnimationFrame(fxTick) : 0;
    if (!fxRaf) g.clearRect(0, 0, w, h);
  }
  // Antippen: statt Wasserring die gewählte Animation (nur bei kurzem Klick, nicht beim Ziehen)
  let down = null;
  document.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY, performance.now()]; }, true);
  document.addEventListener('pointerup', (e) => {
    const k = fxNow(); if (!down || k === 'wasser' || k === 'aus') return;
    if (Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 8 && performance.now() - down[2] < 450 && !(e.target.closest && e.target.closest('.zd-demo'))) spawn(k, e.clientX, e.clientY);
  }, true);

  // ---------------------------------------------------------------------------------------- Bewegter Hintergrund
  let sceneCv = null, sceneRaf = 0, sceneKey = '', sceneT0 = 0, sceneLast = 0;
  function sceneBase(g, l, w, h, d) {
    const v = l.v; g.fillStyle = v.bg; g.fillRect(0, 0, w, h);
    const blob = (x, y, r, c, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba(c, a)); gr.addColorStop(1, rgba(c, 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); };
    const BL = { bausteine: ['#ffc9c9', '#ffe89a', '#afcdff', '#bde7b4'], papier: ['#f1e4c6', '#eadfc2', '#f5ebd3', '#e6d8b5'], unterwasser: ['#0e7490', '#0369a1', '#115e59', '#1e3a8a'], weltraum: ['#3b1b7a', '#1e1b5c', '#6b1f6b', '#0f2a5c'], pixel: ['#333c57', '#29366f', '#3b2e5a', '#1f3b4a'] }[l.key];
    const al = l.dark ? .45 : .6;
    [[.1, .1, .55], [.9, .2, .5], [.25, .85, .6], [.85, .9, .5]].forEach(([x, y, r], i) => blob(x * w, y * h, r * Math.max(w, h), BL[i], al));
    if (l.key === 'bausteine') { const st = 26 * d; for (let y = st / 2; y < h; y += st) for (let x = st / 2; x < w; x += st) { g.fillStyle = 'rgba(0,0,0,.05)'; g.beginPath(); g.arc(x + d, y + 1.5 * d, 7 * d, 0, 2 * PI); g.fill(); g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(x, y, 7 * d, 0, 2 * PI); g.fill(); } }
    if (l.key === 'papier') { g.strokeStyle = 'rgba(143,176,217,.38)'; g.lineWidth = d; for (let y = 96 * d; y < h; y += 30 * d) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.strokeStyle = 'rgba(229,115,115,.45)'; g.lineWidth = 1.4 * d; g.beginPath(); g.moveTo(60 * d, 0); g.lineTo(60 * d, h); g.stroke();
      g.fillStyle = 'rgba(107,91,62,.05)'; for (let i = 0; i < 600; i++) { g.beginPath(); g.arc(rnd(5, i) * w, rnd(7, i) * h, (.6 + rnd(3, i) * .9) * d, 0, 2 * PI); g.fill(); } }
    if (l.key === 'unterwasser') { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(14,116,144,.35)'); gr.addColorStop(.5, 'rgba(14,116,144,0)'); gr.addColorStop(1, 'rgba(1,16,31,.6)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(138,122,82,.35)'; g.beginPath(); g.moveTo(0, h); for (let k = 0; k <= 30; k++) g.lineTo(w * k / 30, h - (30 + Math.sin(k * 1.3) * 7) * d); g.lineTo(w, h); g.fill(); }
    if (l.key === 'weltraum') { const gr = g.createRadialGradient(w * .2, h * .25, 0, w * .2, h * .25, w * .9); gr.addColorStop(0, 'rgba(42,23,88,.55)'); gr.addColorStop(1, 'rgba(42,23,88,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
    if (l.key === 'pixel') { g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = d; for (let x = 0; x < w; x += 12 * d) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 12 * d) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }
  }
  function sceneLive(g, l, s, w, h, d) {
    const v = l.v;
    if (l.key === 'bausteine') {
      [[.06, .8, 4, '#c8102e'], [.7, .88, 3, '#0057a8'], [.82, .14, 2, '#ffc400'], [.03, .34, 2, '#00852b'], [.42, .93, 2, '#f57c00']].forEach(([bx, by, n, c], i) => {
        const bw = n * 18 * d, bh = 20 * d, x = bx * w, y = by * h + Math.sin(s * 1.1 + i * 1.7) * 5 * d;
        g.save(); g.translate(x + bw / 2, y + bh / 2); g.rotate(Math.sin(s * .7 + i) * 4 * PI / 180); g.translate(-bw / 2, -bh / 2); g.globalAlpha = .55; g.fillStyle = c;
        for (let k = 0; k < n; k++) g.fillRect(4 * d + k * 18 * d, -5 * d, 10 * d, 6 * d); g.fillRect(0, 0, bw, bh); g.fillStyle = 'rgba(0,0,0,.1)'; g.fillRect(0, bh - 4 * d, bw, 4 * d); g.restore(); });
      const p = (s % 11) / 11; if (p < .25) { const u = p / .25, b = u < .7 ? u / .7 : 1 - .08 * Math.sin((u - .7) / .3 * PI); g.globalAlpha = .5; g.fillStyle = '#7b2cbf'; g.fillRect(w * .55, -30 * d + b * h * .62, 36 * d, 20 * d); g.globalAlpha = 1; }
    }
    if (l.key === 'papier') {
      const p = (s % 15) / 15; if (p < .55) { const u = p / .55, x = -50 * d + u * (w + 100 * d), y = h * (.42 - .18 * u) + Math.sin(u * 9) * 16 * d;
        g.fillStyle = 'rgba(39,64,139,.18)'; for (let k = 0; k < 8; k++) { g.beginPath(); g.arc(x - (k + 1) * 14 * d, y + k * 1.2 * d, 1.2 * d, 0, 2 * PI); g.fill(); }
        g.save(); g.translate(x, y); g.rotate((Math.cos(u * 9) * 9 * 16 * d / (w + 100 * d) * 57 - 12) * PI / 180);
        g.beginPath(); g.moveTo(22 * d, 0); g.lineTo(-14 * d, -10 * d); g.lineTo(-6 * d, 0); g.lineTo(-14 * d, 9 * d); g.closePath(); g.fillStyle = 'rgba(255,255,255,.95)'; g.fill(); g.strokeStyle = 'rgba(39,64,139,.55)'; g.lineWidth = 1.2 * d; g.stroke(); g.restore(); }
    }
    if (l.key === 'unterwasser') {
      for (let i = 0; i < 5; i++) { const cx = w * (.1 + i * .2) + Math.sin(s * .35 + i * 2) * 24 * d, gr = g.createLinearGradient(0, 0, 0, h * .75); gr.addColorStop(0, `rgba(255,255,255,${.07 + .03 * Math.sin(s * .8 + i)})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(cx - 18 * d, 0); g.lineTo(cx + 18 * d, 0); g.lineTo(cx + 70 * d, h * .75); g.lineTo(cx - 10 * d, h * .75); g.fill(); }
      g.strokeStyle = 'rgba(20,184,166,.45)'; g.lineWidth = 6 * d; g.lineCap = 'round';
      for (let i = 0; i < 9; i++) { const bx = w * (.04 + i * .12 + rnd(9, i) * .04), ht = (80 + rnd(11, i) * 110) * d, sw = Math.sin(s * 1.1 + i * 1.4) * 14 * d; g.beginPath(); g.moveTo(bx, h); g.quadraticCurveTo(bx - sw * .5, h - ht * .5, bx + sw, h - ht); g.stroke(); }
      g.lineWidth = 1.1 * d;
      for (let i = 0; i < 26; i++) { const sp = (22 + rnd(13, i) * 36) * d, rad = (2.5 + rnd(15, i) * 5) * d, y = h - ((s * sp + rnd(17, i) * h) % (h + 40 * d)), x = rnd(19, i) * w + Math.sin(s * 1.5 + i) * 8 * d;
        g.strokeStyle = 'rgba(255,255,255,.32)'; g.beginPath(); g.arc(x, y, rad, 0, 2 * PI); g.stroke(); }
      [[0, 19, '#ffb74d'], [1, 27, '#7dd3fc']].forEach(([i, per, c]) => { const p = ((s + i * 7) % per) / per; if (p >= .6) return; const u = p / .6, dir = i ? -1 : 1, x = dir > 0 ? -40 * d + u * (w + 80 * d) : w + 40 * d - u * (w + 80 * d), y = h * (.38 + i * .2) + Math.sin(u * 12) * 6 * d;
        g.globalAlpha = .6; g.fillStyle = c; g.beginPath(); g.ellipse(x, y, 14 * d, 7 * d, 0, 0, 2 * PI); g.fill(); g.beginPath(); g.moveTo(x - dir * 12 * d, y); g.lineTo(x - dir * 24 * d, y - 8 * d); g.lineTo(x - dir * 24 * d, y + 8 * d); g.fill(); g.globalAlpha = 1; });
    }
    if (l.key === 'weltraum') {
      for (let i = 0; i < 180; i++) { const x = (rnd(21, i) * w + (i % 3 ? 0 : s * 3 * d)) % w, y = rnd(23, i) * h, tw = .35 + .65 * (.5 + .5 * Math.sin(s * (1 + rnd(25, i) * 2.5) + i));
        g.fillStyle = i % 5 ? `rgba(255,255,255,${tw * .9})` : `rgba(191,215,255,${tw * .9})`; g.beginPath(); g.arc(x, y, (.6 + rnd(27, i) * 1.3) * d, 0, 2 * PI); g.fill(); }
      const pcx = w * .88, pcy = h * .8 + Math.sin(s * .4) * 6 * d, pr = 52 * d; let gr = g.createRadialGradient(pcx - pr * .3, pcy - pr * .3, 0, pcx - pr * .3, pcy - pr * .3, pr * 1.4); gr.addColorStop(0, '#f59e0b'); gr.addColorStop(1, '#9a3412');
      g.fillStyle = gr; g.beginPath(); g.arc(pcx, pcy, pr, 0, 2 * PI); g.fill(); g.fillStyle = 'rgba(5,4,14,.45)'; g.beginPath(); g.arc(pcx + pr * .35, pcy + pr * .2, pr, 0, 2 * PI); g.fill();
      g.save(); g.translate(pcx, pcy); g.rotate(-18 * PI / 180); g.strokeStyle = 'rgba(253,230,138,.55)'; g.lineWidth = 3 * d; g.beginPath(); g.ellipse(0, 0, pr * 1.7, pr * .32, 0, 0, 2 * PI); g.stroke(); g.restore();
      const per = 7, p = (s % per) / per; if (p < .16) { const u = p / .16, n = Math.floor(s / per), sx = w * (.3 + rnd(29, n) * .6), sy = h * (.05 + rnd(31, n) * .3), hx = sx - u * 220 * d, hy = sy + u * 120 * d;
        gr = g.createLinearGradient(hx, hy, hx + 70 * d, hy - 38 * d); gr.addColorStop(0, `rgba(255,255,255,${.9 * (1 - u)})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.strokeStyle = gr; g.lineWidth = 2 * d; g.lineCap = 'round'; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + 70 * d, hy - 38 * d); g.stroke(); }
    }
    if (l.key === 'pixel') {
      const q = 4 * d, snap = (x) => Math.floor(x / q) * q;
      g.fillStyle = 'rgba(255,255,255,.09)'; for (let i = 0; i < 4; i++) { const cx = snap((rnd(33, i) * w + s * (10 + i * 4) * d) % (w + 140 * d) - 70 * d), cy = snap(h * (.1 + i * .22)); g.fillRect(cx, cy, 16 * q, 3 * q); g.fillRect(cx + 3 * q, cy - 2 * q, 7 * q, 2 * q); g.fillRect(cx + 5 * q, cy - 3 * q, 3 * q, q); }
      for (let i = 0; i < 14; i++) if (Math.floor(s * 2 + i) % 3 === 0) { const x = snap(rnd(35, i) * w), y = snap(rnd(37, i) * h); g.fillStyle = ['rgba(255,205,117,.6)', 'rgba(239,125,87,.6)', 'rgba(255,255,255,.6)', 'rgba(46,139,87,.6)'][i % 4]; g.fillRect(x - q, y, 3 * q, q); g.fillRect(x, y - q, q, 3 * q); }
      const heart = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000']; g.fillStyle = 'rgba(239,125,87,.35)';
      for (let i = 0; i < 5; i++) { const sp = (16 + rnd(39, i) * 14) * d, y = snap(h - ((s * sp + rnd(41, i) * h) % (h + 40 * d))), x = snap(rnd(43, i) * (w - 30 * d)), hq = 2 * d; heart.forEach((row, r) => [...row].forEach((ch, k) => { if (ch === '1') g.fillRect(x + k * hq, y + r * hq, hq, hq); })); }
    }
    void v;
  }
  /** Zeichnet eine Vorlage in eine Leinwand (für Hintergrund und Vorschau). s = Sekunden */
  function paint(cv, l, s, mock) {
    const dpr = devicePixelRatio || 1, w = cv.clientWidth || cv.width / dpr, h = cv.clientHeight || cv.height / dpr;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const d = mock ? Math.min(1, w / 340) : 1;
    sceneBase(g, l, w, h, d); sceneLive(g, l, s, w, h, d);
    if (mock) drawMock(g, l, w, h, d);
  }
  /** Mini-Chat in der Vorschau: Kopfzeile, drei Blasen, Leiste */
  function drawMock(g, l, w, h, d) {
    const v = l.v, f = l.font || '"Segoe UI", sans-serif', k = Math.max(.45, Math.min(1, w / 340));
    const rr = (x, y, ww, hh, r) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, ww, hh, r) : g.rect(x, y, ww, hh); };
    const panel = l.flat ? v.panel.replace(/[\d.]+\)$/, '.96)') : v.panel;
    g.fillStyle = panel; rr(10 * k, 10 * k, w - 20 * k, 46 * k, 14 * k); g.fill();
    g.fillStyle = v.accent2; g.beginPath(); g.arc(34 * k, 33 * k, 14 * k, 0, 2 * PI); g.fill();
    g.fillStyle = v.text; g.font = `600 ${15 * k}px ${f}`; g.fillText('Mia', 56 * k, 30 * k); g.fillStyle = v.sub; g.font = `${11 * k}px ${f}`; g.fillText('online', 56 * k, 45 * k);
    let y = 74 * k;
    [[false, 'Hey! Wie war dein Tag? 😊'], [true, 'Super! Neues Design 🎉'], [false, 'Wow, sieht toll aus!']].forEach(([mine, t]) => {
      g.font = `${14 * k}px ${f}`; const tw = Math.min(w * .72, g.measureText(t).width + 22 * k), bh = 30 * k, x = mine ? w - 14 * k - tw : 14 * k;
      if (l.key === 'bausteine') { g.fillStyle = mine ? v.accent : v.in; for (let s = 8 * k; s < tw - 10 * k; s += 16 * k) g.fillRect(x + s, y - 5 * k, 10 * k, 6 * k); }
      if (l.key === 'pixel') { g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(x + 4 * k, y + 4 * k, tw, bh); }
      const bg = mine ? (l.flat ? v.accent : (() => { const gr = g.createLinearGradient(x, y, x + tw, y + bh); gr.addColorStop(0, v.accent); gr.addColorStop(1, v.accent2); return gr; })()) : (l.flat ? v.in : v.panel);
      g.fillStyle = bg; rr(x, y, tw, bh, { bausteine: 4, papier: 2, unterwasser: 15, weltraum: 13, pixel: 0 }[l.key] * k); g.fill();
      if (l.key === 'papier') { g.fillStyle = '#d9cdb0'; g.beginPath(); g.moveTo(x + tw - 10 * k, y); g.lineTo(x + tw, y + 10 * k); g.lineTo(x + tw - 10 * k, y + 10 * k); g.fill(); }
      g.fillStyle = mine ? '#fff' : v.text; g.fillText(t, x + 11 * k, y + 20 * k, tw - 18 * k); y += bh + 12 * k;
    });
    g.fillStyle = panel; rr(14 * k, h - 52 * k, w - 28 * k, 40 * k, 20 * k); g.fill();
    for (let i = 0; i < 4; i++) { const cx = 14 * k + (w - 28 * k) * (i + .5) / 4; g.fillStyle = i ? v.sub : v.accent; if (!i) { g.globalAlpha = .22; rr(cx - 22 * k, h - 46 * k, 44 * k, 28 * k, 14 * k); g.fill(); g.globalAlpha = 1; } g.beginPath(); g.arc(cx, h - 32 * k, 6 * k, 0, 2 * PI); g.fill(); }
  }
  function sceneLoop(now) {
    const l = look(); if (!l || !sceneCv) { sceneRaf = 0; return; }
    if (now - sceneLast > 38 || !sceneLast) { sceneLast = now; paint(sceneCv, l, calm() ? 0 : (now - sceneT0) / 1000, false); }
    sceneRaf = calm() || document.hidden ? 0 : requestAnimationFrame(sceneLoop);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && look() && !sceneRaf) sceneRaf = requestAnimationFrame(sceneLoop); });
  addEventListener('resize', () => { if (look() && sceneCv) paint(sceneCv, look(), (performance.now() - sceneT0) / 1000, false); });

  // ---------------------------------------------------------------------------------------- Anwenden (bei jedem Zeichnen; günstig, wenn sich nichts ändert)
  let applied = '';
  function apply() {
    css();
    const l = look(), nav = navNow(), lv = senior(), sim = simple();
    const sig = [l ? l.key : '', fxNow(), nav, lv, sim].join('|');
    if (root.ZLook && root.ZLook.setWaterOff) root.ZLook.setWaterOff(fxNow() !== 'wasser');
    setTimeout(slider, 0);          // Seitenleiste wurde evtl. neu gezeichnet → Markierung wieder einsetzen
    if (sig === applied) return; applied = sig;
    LOOKS.forEach((x) => html.classList.toggle('zd-' + x.key, !!l && l.key === x.key));
    html.classList.toggle('zd-on', !!l); html.classList.toggle('zd-flat', !!l && l.flat);
    if (l) html.setAttribute('data-zd-dark', l.dark ? '1' : '0');
    NAV.forEach(([k]) => html.classList.toggle('zd-nav-' + k, nav === k));
    html.classList.toggle('zd-senior', lv > 0); html.style.setProperty('--zd-zoom', String(ZOOM[lv]));
    html.classList.toggle('zd-simple', sim);
    if (l) {
      if (!sceneCv) { sceneCv = document.createElement('canvas'); sceneCv.id = 'zd-scene'; document.body.insertBefore(sceneCv, document.body.firstChild); Object.assign(sceneCv.style, { width: '100vw', height: '100vh' }); }
      sceneCv.style.display = 'block'; if (sceneKey !== l.key) { sceneKey = l.key; sceneT0 = performance.now(); sceneLast = 0; }
      if (!sceneRaf) sceneRaf = requestAnimationFrame(sceneLoop);
    } else if (sceneCv) { sceneCv.style.display = 'none'; sceneKey = ''; }
    slider();
  }

  // ---------------------------------------------------------------------------------------- Seitenleiste: Animation + „Gleiten"
  let lastPos = null, railObs = null;
  function slider() {
    const rail = document.getElementById('rail');
    if (rail && rail !== railObs) { railObs = rail; new MutationObserver(() => slider()).observe(rail, { childList: true }); }          // Leiste neu gezeichnet → Markierung wieder einsetzen
    const pill = document.querySelector('#rail .navpill'); if (!pill) return;
    let s = pill.querySelector('.zd-slider');
    if (navNow() !== 'gleiten') { if (s) s.remove(); return; }
    const on = pill.querySelector('.nav.on');
    if (!s) { s = document.createElement('div'); s.className = 'zd-slider'; pill.insertBefore(s, pill.firstChild);
      if (lastPos) { s.style.transition = 'none'; Object.assign(s.style, lastPos); void s.offsetWidth; s.style.transition = ''; } }          // von der alten Stelle weitergleiten
    if (!on) { s.style.opacity = '0'; return; }
    lastPos = { top: on.offsetTop + 'px', height: on.offsetHeight + 'px', left: on.offsetLeft + 'px', width: on.offsetWidth + 'px' };
    s.style.opacity = '1'; Object.assign(s.style, lastPos);
  }
  function navAnim(el, kind) {
    if (!el || calm() || !kind || kind === 'standard' || kind === 'gleiten') return;
    el.classList.remove(...NAV.map(([k]) => 'zd-a-' + k)); void el.offsetWidth; el.classList.add('zd-a-' + kind);
    el.addEventListener('animationend', () => el.classList.remove('zd-a-' + kind), { once: true });
    if (kind === 'funken') { const r = el.getBoundingClientRect(); spawn('glitzer', r.left + r.width / 2, r.top + r.height / 2, 0, .5); }
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('#rail [data-view]'); if (!b) return;
    const k = b.dataset.view; requestAnimationFrame(() => { navAnim(document.querySelector(`#rail [data-view="${k}"] .ni`), navNow()); slider(); });
  }, true);

  // ---------------------------------------------------------------------------------------- Chat geht auf: statt Welle
  let lastHead = null;
  function watchHead() {
    const main = document.getElementById('main'); if (!main || main._zd) return; main._zd = true;
    new MutationObserver(() => {
      const hd = document.getElementById('mHead'); if (!hd || hd === lastHead) return; lastHead = hd;
      const k = fxNow(); if (k === 'wasser' || k === 'aus' || calm()) return;
      setTimeout(() => {
        const r = hd.getBoundingClientRect(); if (!r.width) return;
        if (PARTICLES.includes(k)) spawn(k, r.left, r.bottom, r.width);
        else { const a = { feder: [[{ transform: 'scaleY(1)' }, { transform: 'scaleY(1.1)' }, { transform: 'scaleY(.96)' }, { transform: 'scaleY(1)' }], 'top'], gummi: [[{ transform: 'scaleX(1)' }, { transform: 'scaleX(1.05)' }, { transform: 'scaleX(.98)' }, { transform: 'scaleX(1)' }], 'center'],
            wackeln: [[{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }], 'center'], sanft: [[{ opacity: .25 }, { opacity: 1 }], 'center'],
            neon: [[{ boxShadow: '0 1px 0 0 transparent' }, { boxShadow: '0 2px 14px 0 var(--accent2)' }, { boxShadow: '0 1px 0 0 transparent' }], 'center'],
            schimmer: [[{ filter: 'brightness(1)' }, { filter: 'brightness(1.25) saturate(1.3)' }, { filter: 'brightness(1)' }], 'center'] }[k];
          if (a && hd.animate) { hd.style.transformOrigin = a[1]; hd.animate(a[0], { duration: 900, easing: 'ease-out' }); } }
      }, 90);
    }).observe(main, { childList: true, subtree: true });
  }

  // ---------------------------------------------------------------------------------------- Ausprobieren
  function startTrial(k, H) {
    trial = k; trialEnds = Date.now() + 120000; clearTimeout(trialTimer);
    trialTimer = setTimeout(() => { if (trial === k) { trial = null; applied = ''; apply(); if (H) { H.toast(T('Vorschau beendet — mit Zunora Plus kannst du die Vorlage behalten.')); H.renderAll(); } } }, 120000);
    applied = ''; apply();
  }
  function endTrial() { trial = null; clearTimeout(trialTimer); applied = ''; apply(); }

  // ============================================================================================ Einstellungen
  function sections(list) {
    const i = list.findIndex((x) => x[0] === 'darstellung');
    const des = ['design', 'palette', 'Design & Animationen', look() ? look().emoji + ' ' + look().title : 'Zunora · Vorlagen, Animationen'];
    const sen = ['senioren', 'user', 'Alles größer & einfacher', seniorSummary()];
    list.splice(i + 1, 0, des); list.splice(0, 0, sen);
    return simple() ? list.filter((x) => SIMPLE_PAGES.includes(x[0])) : list;
  }
  function seniorHtml() {
    const lv = senior();
    return `<p class="small muted" style="margin:4px 0 10px">${T('Für alle, die es lieber groß und übersichtlich mögen — zum Beispiel ältere Menschen.')}</p>
      <button class="btn" data-zdquick style="width:100%">✨ ${T('Mit einem Tipp einrichten: „Größer“ + Einfache Ansicht')}</button>
      <div class="cat" style="padding-left:0">${T('Alles größer')}</div><p class="small muted" style="margin:0 0 6px">${T('Schrift, Knöpfe, Bilder und Abstände werden zusammen größer — dadurch lässt sich alles leichter lesen und treffen.')}</p>
      <div class="chips">${SENIOR.map((t, i) => `<button class="chip ${lv === i ? 'on' : ''}" data-zdlevel="${i}" style="font-size:${13 + i * 2}px">${T(t)}</button>`).join('')}</div>
      <div class="cat" style="padding-left:0">${T('Einfache Ansicht')}</div>
      <label class="small chk"><input type="checkbox" id="zdSimple" ${simple() ? 'checked' : ''}> <span>${T('Links nur noch Chats, Anrufe und Einstellungen. Status, Ordner, Startseiten-Widgets und seltene Einstellungen werden ausgeblendet.')}</span></label>
      <p class="small muted">${T('Die Schriftgröße unter Darstellung → Barrierefreiheit gilt zusätzlich. Ausschalten geht jederzeit hier.')}</p>`;
  }
  function designHtml() {
    const p = plus(), cur = look();
    const left = trial ? Math.max(0, Math.round((trialEnds - Date.now()) / 1000)) : 0;
    return `<p class="small muted" style="margin:4px 0 6px">${T('Ändert den ganzen Messenger: Farben, bewegter Hintergrund, Sprechblasen, Schrift und Animationen.')}${p ? '' : ' ' + T('Ansehen und ausprobieren kann jeder — behalten mit Zunora Plus.')}</p>
      ${trial ? `<div class="zd-trial"><span style="flex:1">${T('Vorschau')} „${esc(T(byKey(trial).title))}“ · ${T('noch')} ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</span><button class="btn ghost" data-zdend>${T('Beenden')}</button></div>` : ''}
      <div class="zd-cards"><button class="zd-card ${cur ? '' : 'on'}" data-zdstd><span class="zd-std">Z</span><div class="small">Zunora</div><div class="small muted">${cur ? T('Standard') : '✓ ' + T('Aktiv')}</div></button>
        ${LOOKS.map((l) => `<button class="zd-card ${cur && cur.key === l.key ? 'on' : ''}" data-zdlook="${l.key}"><canvas data-zdmini="${l.key}"></canvas><div class="small">${l.emoji} ${esc(T(l.title))}</div><div class="small muted">${cur && cur.key === l.key ? '✓ ' + T('Aktiv') : p ? T('Vorschau') : '✦ Plus · ' + T('Vorschau')}</div></button>`).join('')}</div>
      <div class="cat" style="padding-left:0">${T('Animationen statt Wasserwellen')}</div>
      <p class="small muted" style="margin:0">${T('Was passiert, wenn du etwas anklickst oder ein Chat aufgeht.')}${p ? '' : ' ✦ ' + T('Mit Zunora Plus — anklicken zeigt dir jede Animation.')}</p>
      <div class="zd-demo" data-zddemo><span class="small muted">${T('Hier klicken zum Ausprobieren')} · <span data-zddemoname>${esc(T(fxTitle(fxNow())))}</span></span></div>
      <div class="chips"><button class="chip ${fxNow() === 'wasser' ? 'on' : ''}" data-zdfx="wasser">${T('Wasserwellen')}</button>${cur ? `<button class="chip ${p && !LS.get('zd-fx', '') ? 'on' : ''}" data-zdfx="">${T('Passend zum Design')}${p ? '' : '<span class="zd-lock">✦</span>'}</button>` : ''}</div>
      ${GROUPS.map(([g, gt]) => `<div class="small muted" style="margin-top:8px">${T(gt)}</div><div class="chips">${KINDS.filter((x) => x[2] === g).map(([k, t]) => `<button class="chip ${p && LS.get('zd-fx', '') === k ? 'on' : ''}" data-zdfx="${k}">${T(t)}${p ? '' : '<span class="zd-lock">✦</span>'}</button>`).join('')}</div>`).join('')}
      <div class="cat" style="padding-left:0">${T('Animation in der Seitenleiste')}</div>
      <p class="small muted" style="margin:0">${T('Wie das Symbol reagiert, wenn du links einen Bereich wählst.')}${p ? '' : ' ✦ ' + T('Mit Zunora Plus.')}</p>
      <div class="zd-navdemo">${['chat', 'phone', 'server', 'settings'].map((ic, i) => `<button class="${i ? '' : 'on'}" data-zdnavdemo="${i}"><span class="ni" style="display:inline-block">${root.ZMI ? root.ZMI.svg(ic, 22) : '●'}</span></button>`).join('')}</div>
      <div class="chips">${NAV.map(([k, t]) => `<button class="chip ${p && (LS.get('zd-nav', '') || (cur ? '' : 'standard')) === k ? 'on' : ''}" data-zdnav="${k}">${T(t)}${p || k === 'standard' ? '' : '<span class="zd-lock">✦</span>'}</button>`).join('')}</div>
      ${p ? '' : `<button class="btn" data-zdplus style="width:100%;margin-top:12px">${T('Zu Zunora Plus')}</button>`}`;
  }
  /** „Entwickelt in Deutschland" — unten in den Einstellungen und auf dem Anmelde-Bildschirm */
  function madeHtml() {
    return `<div class="zd-made"><div><span class="zd-flag"><i style="background:#000"></i><i style="background:#d00"></i><i style="background:#ffce00"></i></span><b>${T('Entwickelt in Deutschland')}</b></div><small>${T('Server in der EU · Ende-zu-Ende verschlüsselt · ohne Werbung')}</small></div>`;
  }
  function settings(body) { body.senioren = seniorHtml(); body.design = designHtml(); body[''] += madeHtml(); }
  function wire(el, page, H) {
    apply(); watchHead(); slider();
    if (page === 'senioren') {
      el.querySelectorAll('[data-zdlevel]').forEach((b) => b.onclick = () => { LS.set('zd-senior', b.dataset.zdlevel); apply(); H.renderAll(); });
      const s = el.querySelector('#zdSimple'); if (s) s.onchange = () => { LS.set('zd-einfach', s.checked ? '1' : '0'); apply(); H.renderAll(); };
      const q = el.querySelector('[data-zdquick]'); if (q) q.onclick = () => { LS.set('zd-senior', '2'); LS.set('zd-einfach', '1'); apply(); H.renderAll(); };
    }
    if (page !== 'design') return;
    el.querySelectorAll('canvas[data-zdmini]').forEach((c) => requestAnimationFrame(() => paint(c, byKey(c.dataset.zdmini), 0.5, true)));
    const std = el.querySelector('[data-zdstd]'); if (std) std.onclick = () => { if (plus()) LS.set('zd-vorlage', ''); endTrial(); H.renderAll(); };
    const en = el.querySelector('[data-zdend]'); if (en) en.onclick = () => { endTrial(); H.renderAll(); };
    const pl = el.querySelector('[data-zdplus]'); if (pl) pl.onclick = () => { const b = document.querySelector('[data-setpage="plus"]'); if (b) b.click(); };
    el.querySelectorAll('[data-zdlook]').forEach((b) => b.onclick = () => previewDlg(byKey(b.dataset.zdlook), H));
    let demo = null;
    const box = el.querySelector('[data-zddemo]');
    if (box) box.onclick = (e) => { const k = demo || fxNow(); spawn(k === 'wasser' ? 'neon' : k, e.clientX, e.clientY); };
    const showDemo = (k) => { demo = k; const n = el.querySelector('[data-zddemoname]'); if (n) n.textContent = T(fxTitle(k)); if (box && k && k !== 'wasser') { const r = box.getBoundingClientRect(); spawn(k, r.left + r.width / 2, r.top + r.height / 2); } };
    el.querySelectorAll('[data-zdfx]').forEach((b) => b.onclick = () => { const k = b.dataset.zdfx; if (plus()) { LS.set('zd-fx', k); apply(); el.querySelectorAll('[data-zdfx]').forEach((x) => x.classList.toggle('on', x === b)); } showDemo(k || (look() ? look().fx : 'wasser')); });
    let navDemo = navNow(), sel = 0;
    el.querySelectorAll('[data-zdnavdemo]').forEach((b) => b.onclick = () => { sel = +b.dataset.zdnavdemo; el.querySelectorAll('[data-zdnavdemo]').forEach((x) => x.classList.toggle('on', x === b)); navAnim(b.querySelector('.ni'), navDemo === 'gleiten' ? 'pop' : navDemo); });
    el.querySelectorAll('[data-zdnav]').forEach((b) => b.onclick = () => { navDemo = b.dataset.zdnav; if (plus()) { LS.set('zd-nav', navDemo); apply(); el.querySelectorAll('[data-zdnav]').forEach((x) => x.classList.toggle('on', x === b)); }
      navAnim(el.querySelector(`[data-zdnavdemo="${sel}"] .ni`), navDemo === 'gleiten' ? 'pop' : navDemo); });
    if (trial) { clearInterval(wire._t); wire._t = setInterval(() => { const t = el.querySelector('.zd-trial span'); if (!t || !trial) { clearInterval(wire._t); return; } const left = Math.max(0, Math.round((trialEnds - Date.now()) / 1000)); t.textContent = `${T('Vorschau')} „${T(byKey(trial).title)}“ · ${T('noch')} ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; }, 1000); }
  }
  function previewDlg(l, H) {
    const p = plus(), on = look() && look().key === l.key;
    H.dlg(`<h3>${l.emoji} ${esc(T(l.title))}</h3><p class="small muted">${esc(T(l.desc))}</p><canvas class="zd-big" id="zdBig"></canvas>
      <p class="small muted">${T('Ändert: Farben · Hintergrund mit Bewegung · Sprechblasen · Schrift')} · ${T('Animation')} „${esc(T(fxTitle(l.fx)))}“ · ${T('Seitenleiste')} „${esc(T((NAV.find((x) => x[0] === l.nav) || ['', ''])[1]))}“</p>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">${p ? (on ? `<button class="btn ghost" data-zdset="">${T('Zurück zum Zunora-Design')}</button>` : `<button class="btn" data-zdset="${l.key}">${T('Diese Vorlage verwenden')}</button>`)
        : `<button class="btn" data-zdtry>${trial === l.key ? T('Vorschau läuft …') : T('2 Minuten im ganzen Messenger ausprobieren')}</button><button class="btn ghost" data-zdplusdlg>${T('Mit Zunora Plus behalten')}</button>`}
        <button class="btn ghost" data-close>${T('Schließen')}</button></div>`);
    const dl = document.querySelector('#zm-overlay') || document; const box = dl.querySelector('#zdBig'); if (!box) return; const t0 = performance.now();
    const cl = dl.querySelector('[data-close]'); if (cl) cl.onclick = () => H.closeDlg();
    const loop = (now) => { if (!box.isConnected) return; paint(box, l, calm() ? 0 : (now - t0) / 1000, true); if (!calm()) requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    const set = dl.querySelector('[data-zdset]'); if (set) set.onclick = () => { LS.set('zd-vorlage', set.dataset.zdset); endTrial(); H.closeDlg(); H.renderAll(); };
    const tr = dl.querySelector('[data-zdtry]'); if (tr) tr.onclick = () => { startTrial(l.key, H); H.closeDlg(); H.renderAll(); };
    const pd = dl.querySelector('[data-zdplusdlg]'); if (pd) pd.onclick = () => { H.closeDlg(); const b = document.querySelector('[data-setpage="plus"]'); if (b) b.click(); };
  }

  root.ZMDesign = { madeHtml, apply, settings, wire, sections, simple, SIMPLE_TABS, LOOKS, look, fxNow, navNow, spawn, startTrial, endTrial, drawFx, paint, senior };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { apply(); watchHead(); }); else { apply(); watchHead(); }
})(window);
