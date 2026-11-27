/* Zunora-Look für alle Zunora-PC-Apps (Messenger, Store, Studio …) — Glas, Liquid, Animationen, Elastik. Gehört zu zlook.css.
   Einbinden:  <link rel="stylesheet" href="zlook.css">
               <script src="zlook.js" data-glass="…" data-liquid="…" data-press="…" data-lists="…" data-blob="…" data-views="…" data-elastic="…"></script>
   Alle data-* sind CSS-Selektoren der jeweiligen App:
     glass   = Glasflächen (Unschärfe, Lichtkante, Licht folgt der Maus)
     liquid  = zusätzlich echte Lichtbrechung am Rand (flüssiges Glas)
     press   = federt beim Drücken
     lists   = Listen, deren neue Einträge federnd hineingleiten
     blob    = Leisten mit einem Liquid-Tropfen, der zum gewählten Eintrag gleitet und sich dabei dehnt
     views   = Bereiche, deren Inhalt beim Wechsel weich einblendet
     elastic = Flächen, die auch ohne Bildlauf elastisch nachgeben
   Elastik: Am Rand jeder scrollbaren Fläche (oben, unten, links, rechts) gibt der Inhalt federnd nach, dehnt sich in
   Zugrichtung und wird quer dazu schmaler — ausgehend von der Stelle, wo die Maus ist. Stärke 0–100: localStorage „zl-elastik". */
(() => {
  'use strict';
  const me = document.currentScript; const cfg = (k, d) => (me && me.dataset[k]) || d || '';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // ruhig = Bewegung aus: Windows-Einstellung „Animationen" oder Energiesparmodus einer Zunora-App (ZLook.setCalm)
  let calm = reduced || root.classList.contains('z-eco');
  let strength = 50; try { const v = parseInt(localStorage.getItem('zl-elastik'), 10); if (v >= 0 && v <= 100) strength = v; } catch (e) { }
  // Animations-Stufe (wie am Handy): aus | leicht | normal | stark → Elastik und Wellen (dezent)
  let level = 'normal'; try { level = localStorage.getItem('zl-bewegung') || 'normal'; } catch (e) { }
  let waveScale = 0.55;
  let waterOff = false;          // eine App ersetzt Wasserringe/-wellen durch eigene Animationen (Messenger mit Zunora Plus)
  let waves = true; try { waves = localStorage.getItem('zl-wellen') !== '0'; } catch (e) { }
  const applyLevel = () => { waveScale = !waves ? 0 : ({ aus: 0, leicht: 0.3, stark: 0.85 }[level] ?? 0.55); if (level === 'leicht') strength = 28; else if (level === 'stark') strength = 78;
    if (level === 'aus') { calm = true; root.classList.add('z-calm'); } else root.classList.remove('z-calm'); };
  applyLevel();
  root.classList.add('zl');

  // ---------------------------------------------------------------- Federn (wie ZSpring in Android: Elastik 0–100)
  const damping = () => 1 - 0.58 * strength / 100;          // 1 = kein Überschwingen, 0,42 = sehr federnd
  const stiffness = 220;        // etwas weicher
  /** Federkurve als CSS linear()-Kurve — damit federn auch reine CSS-Übergänge (Drücken, Hineingleiten). */
  function springCurve() {
    const k = stiffness, c = 2 * Math.sqrt(k) * damping(); let x = 0, v = 0; const pts = []; const dt = 1 / 120;
    for (let i = 0; i < 120; i++) { for (let s = 0; s < 1; s++) { const a = -k * (x - 1) - c * v; v += a * dt; x += v * dt; } pts.push(+x.toFixed(3)); }
    pts[pts.length - 1] = 1; return `linear(0, ${pts.join(', ')})`;
  }
  root.style.setProperty('--zl-spring', springCurve());
  /** Feder-Simulation: bewegt st.x zu target, ruft step(x, v) je Bild auf. */
  function spring(st, target, step, done) {
    cancelAnimationFrame(st.raf); const k = stiffness * 0.75, c = 2 * Math.sqrt(k) * damping(); let last = performance.now();
    const tick = (now) => {
      let dt = Math.min(0.032, (now - last) / 1000); last = now;
      while (dt > 0) { const h = Math.min(dt, 1 / 240); const a = -k * (st.x - target) - c * st.v; st.v += a * h; st.x += st.v * h; dt -= h; }
      if (Math.abs(st.x - target) < 0.05 && Math.abs(st.v) < 0.5) { st.x = target; st.v = 0; step(st.x, 0); done && done(); return; }
      step(st.x, st.v); st.raf = requestAnimationFrame(tick);
    };
    st.raf = requestAnimationFrame(tick);
  }
  /** Liquid-Verformung (wie liquidStretch in Android): schnell bewegt → in Laufrichtung länger, quer schmaler, Fläche bleibt gleich. */
  const stretch = (v, size, amount) => { const ref = Math.max(150, 4 * size); const along = amount * (1 - Math.exp(-Math.abs(v) / ref)); return 1 + along; };

  // ---------------------------------------------------------------- Lichtbrechung (SVG-Filter für backdrop-filter)
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.style.position = 'absolute';
  svg.innerHTML = `<filter id="zl-refract" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.008 0.011" numOctaves="2" seed="7" result="n"/>
      <feGaussianBlur in="n" stdDeviation="2.2" result="nb"/>
      <feDisplacementMap in="SourceGraphic" in2="nb" scale="38" xChannelSelector="R" yChannelSelector="G"/></filter>`;
  // das Wasser bewegt sich langsam (flüssig) — nur wenn Bewegung erlaubt ist
  if (!calm) svg.querySelector("feTurbulence").innerHTML = '<animate attributeName="baseFrequency" dur="18s" values="0.008 0.011;0.011 0.008;0.008 0.011" repeatCount="indefinite"/>';

  // ---------------------------------------------------------------- Klassen an die Flächen der App hängen
  const sel = { glass: cfg('glass'), liquid: cfg('liquid'), press: cfg('press', 'button'), lists: cfg('lists'), blob: cfg('blob'), views: cfg('views'), elastic: cfg('elastic') };
  const qsa = (s) => (s ? document.querySelectorAll(s) : []);
  function mark() {
    qsa(sel.glass).forEach((e) => e.classList.add('zl-glass'));
    qsa(sel.liquid).forEach((e) => e.classList.add('zl-glass', 'zl-liquid'));
    qsa(sel.press).forEach((e) => { if (!e.classList.contains('zl-p')) { e.classList.add('zl-p'); if (e.offsetWidth > 240) e.classList.add('zl-wide'); } });
    blobs(); lists(); views();
  }
  let pending = false;
  const later = () => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; mark(); }); };

  // ---------------------------------------------------------------- Licht folgt der Maus über das Glas
  document.addEventListener('pointermove', (e) => {
    const g = e.target.closest && e.target.closest('.zl-glass'); if (!g) return;
    const r = g.getBoundingClientRect(); g.style.setProperty('--mx', (e.clientX - r.left) + 'px'); g.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });

  // ---------------------------------------------------------------- Drücken federt
  let down = null;
  document.addEventListener('pointerdown', (e) => { const p = e.target.closest && e.target.closest('.zl-p'); if (!p || calm) return; down = p; p.classList.add('zl-down'); }, true);
  const up = () => { if (down) { down.classList.remove('zl-down'); down = null; } };
  ['pointerup', 'pointercancel', 'dragstart', 'blur'].forEach((t) => addEventListener(t, up, true));
  document.addEventListener('pointerleave', up, true);

  // ---------------------------------------------------------------- Neue Einträge gleiten federnd hinein
  const keyOf = (e) => { const d = e.dataset || {}; return d.chat || d.mid || d.msg || d.id || d.server || d.channel || d.user || d.profile || d.dm || d.tab || d.app || d.setpage || d.view || d.open || d.go || null; };
  // gemerkt je Liste (Selektor + Nummer), nicht je Element: wird eine Liste neu gezeichnet, gleiten nur wirklich neue Einträge hinein
  const seen = new Map();
  function lists() {
    if (calm) return;
    sel.lists.split(',').map((x) => x.trim()).filter(Boolean).forEach((one) => qsa(one).forEach((l, i) => {
      const id = one + '|' + i; let s = seen.get(id); const first = !s; if (!s) { s = new Set(); seen.set(id, s); }
      let n = 0;
      for (const c of l.children) {
        const k = keyOf(c); if (!k || s.has(k)) continue;
        s.add(k); if (first && n > 14) continue;
        c.style.setProperty('--zl-d', Math.min(n, 10) * 28 + 'ms'); c.classList.remove('zl-in'); void c.offsetWidth; c.classList.add('zl-in'); n++;
        c.addEventListener('animationend', () => c.classList.remove('zl-in'), { once: true });
      }
    }));
  }
  // Bereichswechsel blenden weich ein
  const viewKey = new WeakMap();
  function views() {
    if (calm) return;
    qsa(sel.views).forEach((v) => { const f = v.firstElementChild; if (!f) return; if (viewKey.get(v) !== f) { viewKey.set(v, f); f.classList.add('zl-view'); f.addEventListener('animationend', () => f.classList.remove('zl-view'), { once: true }); } });
  }

  // ---------------------------------------------------------------- Liquid-Tropfen in Leisten
  const blobState = new Map();   // je Leiste (Selektor + Nummer): wird die Leiste neu gezeichnet, gleitet der Tropfen trotzdem weiter
  function blobs() {
    sel.blob.split(',').map((x) => x.trim()).filter(Boolean).forEach((one) => qsa(one).forEach((host, hi) => { const hid = one + '|' + hi;
      host.classList.add('zl-blob-host');
      let b = host.querySelector(':scope > .zl-blob'); if (!b) { b = document.createElement('div'); b.className = 'zl-blob'; host.prepend(b); }
      const act = host.querySelector(':scope > .on, :scope > .active, :scope > [aria-current="page"]');
      if (!act) { b.style.opacity = '0'; return; }
      b.style.opacity = '1';
      const t = { x: act.offsetLeft, y: act.offsetTop, w: act.offsetWidth, h: act.offsetHeight };
      const radius = getComputedStyle(act).borderRadius; if (radius) b.style.borderRadius = radius;
      let st = blobState.get(hid);
      const draw = () => { const c = st.cur, vx = st.ax.v, vy = st.ay.v;
        const sx = stretch(vx, c.w, 0.22), sy = stretch(vy, c.h, 0.22);   // Dehnung in Laufrichtung, quer schmaler (Fläche bleibt)
        b.style.left = c.x + 'px'; b.style.top = c.y + 'px'; b.style.width = c.w + 'px'; b.style.height = c.h + 'px';
        b.style.scale = `${sx / Math.sqrt(sy)} ${sy / Math.sqrt(sx)}`; };
      if (!st || calm) { st = { cur: { ...t }, ax: { x: 0, v: 0, raf: 0 }, ay: { x: 0, v: 0, raf: 0 }, to: t }; blobState.set(hid, st); draw(); return; }
      if (st.to.x === t.x && st.to.y === t.y && st.to.w === t.w && st.to.h === t.h) { draw(); return; }
      st.to = t; const from = { ...st.cur };
      st.ax.x = 0; st.ay.x = 0;
      const go = (p) => { st.cur = { x: from.x + (t.x - from.x) * p, y: from.y + (t.y - from.y) * p, w: from.w + (t.w - from.w) * p, h: from.h + (t.h - from.h) * p }; };
      // eine Feder für den Weg; Geschwindigkeit in Pixel/s für die Dehnung
      const dist = Math.hypot(t.x - from.x, t.y - from.y) || 1; const dirX = (t.x - from.x) / dist, dirY = (t.y - from.y) / dist;
      if (st.anim) cancelAnimationFrame(st.anim.raf);
      const pr = { x: 0, v: 0, raf: 0 }; st.anim = pr;
      spring(pr, 1, (p, v) => { go(p); st.ax.v = v * dist * dirX; st.ay.v = v * dist * dirY; draw(); }, () => { st.ax.v = st.ay.v = 0; draw(); });
    }));
  }

  // ---------------------------------------------------------------- Elastik an allen Rändern (oben, unten, Seiten — ab der Maus)
  const canScroll = (n, axis) => { const s = getComputedStyle(n); const o = axis === 'y' ? s.overflowY : s.overflowX;
    return /(auto|scroll)/.test(o) && (axis === 'y' ? n.scrollHeight > n.clientHeight + 1 : n.scrollWidth > n.clientWidth + 1); };
  function scroller(el, axis) { for (let n = el; n && n !== document.documentElement; n = n.parentElement) { if (n.nodeType === 1 && canScroll(n, axis)) return n; } return null; }
  const fallback = (el) => (sel.elastic && el.closest ? el.closest(sel.elastic) : null);
  const ES = new WeakMap();
  function paint(t, st) {
    const size = st.axis === 'y' ? t.clientHeight : t.clientWidth; const max = Math.min(150, Math.max(60, size * 0.22));
    const d = Math.sign(st.x) * max * (1 - Math.exp(-Math.abs(st.x) / max));        // Widerstand: je weiter, desto zäher
    const k = Math.abs(d) / Math.max(1, size);
    const along = 1 + k * 0.85 * (0.4 + strength / 100), across = 1 / Math.sqrt(along);   // dehnen + quer schmaler (wie Flüssigkeit)
    if (st.axis === 'y') { t.style.translate = `0 ${d * 0.42}px`; t.style.scale = `${across} ${along}`; t.style.transformOrigin = `${st.cx}px ${d > 0 ? '0%' : '100%'}`; }
    else { t.style.translate = `${d * 0.42}px 0`; t.style.scale = `${along} ${across}`; t.style.transformOrigin = `${d > 0 ? '0%' : '100%'} ${st.cy}px`; }
    if (Math.abs(st.x) < 0.05) { t.style.translate = t.style.scale = t.style.transformOrigin = ''; t.style.willChange = ''; }
  }
  function pull(t, axis, delta, e) {
    let st = ES.get(t); if (!st || st.axis !== axis) { st = { x: 0, v: 0, raf: 0, axis, cx: 0, cy: 0, timer: 0 }; ES.set(t, st); }
    cancelAnimationFrame(st.raf);
    const r = t.getBoundingClientRect(); st.cx = e.clientX - r.left; st.cy = e.clientY - r.top;
    t.style.willChange = 'translate, scale';
    st.x = Math.max(-900, Math.min(900, st.x + delta)); paint(t, st);
    if (WV.t !== t) { WV.t = t; } waveLoop();
    clearTimeout(st.timer); st.timer = setTimeout(() => release(t), 110);
  }
  function release(t) { const st = ES.get(t); if (!st) return; st.v = 0; spring(st, 0, () => paint(t, st)); }
  addEventListener('wheel', (e) => {
    if (calm || strength === 0 || e.ctrlKey) return;
    const f = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? 400 : 1;
    let dx = e.deltaX * f, dy = e.deltaY * f; if (e.shiftKey && !dx) { dx = dy; dy = 0; }
    const axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'; const delta = axis === 'y' ? dy : dx; if (!delta) return;
    const sc = scroller(e.target, axis);
    if (sc) {
      const pos = axis === 'y' ? sc.scrollTop : sc.scrollLeft, end = axis === 'y' ? sc.scrollHeight - sc.clientHeight : sc.scrollWidth - sc.clientWidth;
      const atEdge = (delta < 0 && pos <= 0) || (delta > 0 && pos >= end - 1);
      const st = ES.get(sc);
      if (!atEdge) { if (st && st.x) release(sc); return; }
      pull(sc, axis, -delta * 0.55, e); return;
    }
    const fb = fallback(e.target); if (fb) pull(fb, axis, -delta * 0.45, e);
  }, { passive: true });

  // ---------------------------------------------------------------- Flüssigkeits-Welle an der Kante beim Überziehen (wie am Handy)
  const waveCv = document.createElement('canvas'); waveCv.className = 'zl-wave';
  const WV = { t: null, edge: 0, amp: 0, c: 0.5, rip: 1, raf: 0 };
  const accent = () => getComputedStyle(root).getPropertyValue('--accent').trim() || '#8b6cff';
  function waveDraw() {
    const t = WV.t; const g = waveCv.getContext('2d'); const dpr = devicePixelRatio || 1;
    if (!t || !t.isConnected) { waveCv.style.display = 'none'; return; }
    const r = t.getBoundingClientRect(); waveCv.style.display = 'block';
    Object.assign(waveCv.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    if (waveCv.width !== Math.round(r.width * dpr) || waveCv.height !== Math.round(r.height * dpr)) { waveCv.width = Math.round(r.width * dpr); waveCv.height = Math.round(r.height * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, r.width, r.height);
    const st = ES.get(t); const live = st && Math.abs(st.x) > 1;
    let amp, wob = 0;
    if (waveScale <= 0 || waterOff) { waveCv.style.display = 'none'; return; }
    if (live) { amp = Math.min(Math.abs(st.x) * 0.5, 64) * waveScale; WV.edge = st.axis === 'y' ? (st.x > 0 ? 0 : 1) : (st.x > 0 ? 2 : 3); WV.c = st.axis === 'y' ? st.cx / Math.max(1, r.width) : st.cy / Math.max(1, r.height); WV.amp = amp; WV.rip = 0; }
    else { if (WV.rip >= 1) { waveCv.style.display = 'none'; return; } const d = Math.exp(-4.2 * WV.rip); amp = WV.amp * d * Math.abs(Math.cos(WV.rip * 15)); wob = 6 * d * Math.sin(WV.rip * 22); }
    const vert = WV.edge < 2, len = vert ? r.width : r.height, c = WV.c * len, spread = len * 0.3;
    const pt = (p) => { const d = amp * Math.exp(-(((p - c) / spread) ** 2)) + wob * Math.sin(p / len * 12) * 0.5;
      return [[p, d], [p, r.height - d], [d, p], [r.width - d, p]][WV.edge]; };
    const col = accent();
    g.beginPath(); const s0 = [[0, 0], [0, r.height], [0, 0], [r.width, 0]][WV.edge]; g.moveTo(s0[0], s0[1]);
    for (let k = 0; k <= 56; k++) { const [x, y] = pt(len * k / 56); g.lineTo(x, y); }
    const e0 = [[r.width, 0], [r.width, r.height], [0, r.height], [r.width, r.height]][WV.edge]; g.lineTo(e0[0], e0[1]); g.closePath();
    g.globalAlpha = 0.28 * Math.min(1, waveScale + 0.2); g.fillStyle = col; g.fill(); g.globalAlpha = 1;
    g.beginPath(); for (let k = 0; k <= 56; k++) { const [x, y] = pt(len * k / 56); k ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1.6; g.stroke();
  }
  function waveLoop() { cancelAnimationFrame(WV.raf); const t0 = performance.now(); const st = WV.t && ES.get(WV.t);
    const tick = (now) => { const s = WV.t && ES.get(WV.t); if (!(s && Math.abs(s.x) > 1)) WV.rip = Math.min(1, WV.rip + (now - (tick.l || now)) / 1100); tick.l = now; waveDraw();
      if ((s && Math.abs(s.x) > 1) || WV.rip < 1) WV.raf = requestAnimationFrame(tick); };
    WV.raf = requestAnimationFrame(tick); void t0; void st; }

  // ---------------------------------------------------------------- Wasserringe beim Klicken (wie am Handy)
  document.addEventListener('pointerdown', (e) => {
    if (calm || waterOff) return; const p = e.target.closest && e.target.closest('.zl-p'); if (!p || p.offsetWidth < 28) return;
    const r = p.getBoundingClientRect(); const size = Math.max(r.width, r.height) * 2.2;
    for (const [delay, k] of [[0, 1], [140, 0.6]]) {
      const o = document.createElement('span'); o.className = 'zl-ring';
      Object.assign(o.style, { left: (e.clientX - r.left - size / 2) + 'px', top: (e.clientY - r.top - size / 2) + 'px', width: size + 'px', height: size + 'px', animationDelay: delay + 'ms', opacity: k });
      if (getComputedStyle(p).position === 'static') p.style.position = 'relative';
      p.classList.add('zl-ringhost'); p.appendChild(o); setTimeout(() => o.remove(), 1000 + delay);
    }
  }, true);

  // ---------------------------------------------------------------- Zunora-Symbole statt Bedien-Emojis (Inhalte bleiben, wie sie sind)
  const ZI_SEL = 'button, .btn, .chip, .pill, .tab, label, summary, h1, h2, h3, h4, th, [data-act], [data-sv], [data-go], [data-tab], .zl-p, .cat, .sv-btn, .tile, nav a, .menu a, .mi';
  const ZI_SKIP = '[contenteditable], textarea, input, select, pre, code, .bub, .msgs, .md, .sv-body, .sv2-text, .sv2-info, .sv2-clist, .txt, .no-zi, .preview, .desc, .vers, .hit-shots';
  if (!window.ZIcons) { const s = document.createElement('script'); s.src = (me && me.src ? me.src.replace(/zlook\.js(\?.*)?$/, '') : '') + 'zicons.js'; s.onload = () => later(); s.onerror = () => { }; (document.head || root).appendChild(s); }
  const ziDone = new WeakSet();
  function icons() {
    const Z = window.ZIcons; if (!Z) return;
    document.querySelectorAll(ZI_SEL).forEach((el) => {
      if (el.closest(ZI_SKIP)) return;
      for (const n of [...el.childNodes]) {
        if (n.nodeType !== 3 || ziDone.has(n)) continue;
        const t = n.nodeValue.replace(/^\s+/, ''); if (!t) { ziDone.add(n); continue; }
        const cp = String.fromCodePoint(t.codePointAt(0)); const name = Z.EMOJI[cp];
        if (!name) { ziDone.add(n); continue; }
        let rest = t.slice(cp.length).replace(/^[️⃣]+/, '');
        if (rest && /^[\p{L}\p{N}]/u.test(rest) && cp !== '＋') { ziDone.add(n); continue; }
        const w = document.createElement('span'); w.className = 'zi-w'; w.innerHTML = Z.svg(name, '1.15em');
        el.insertBefore(w, n); n.nodeValue = rest.trim() ? ' ' + rest.replace(/^\s+/, '') : ''; ziDone.add(n);
      }
    });
  }

  // ---------------------------------------------------------------- Start
  const start = () => { document.body.appendChild(svg); waveCv.style.display = 'none'; document.body.appendChild(waveCv); mark(); icons(); new MutationObserver(() => { later(); laterIcons(); }).observe(document.body, { childList: true, subtree: true, characterData: true }); addEventListener('resize', later); };
  let iconsPending = false;
  const laterIcons = () => { if (iconsPending) return; iconsPending = true; requestAnimationFrame(() => { iconsPending = false; icons(); }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  window.ZLook = { refresh: mark, setCalm(v) { calm = reduced || !!v; }, get calm() { return calm; }, setStrength(v) { strength = Math.max(0, Math.min(100, v | 0)); try { localStorage.setItem('zl-elastik', String(strength)); } catch (e) { } root.style.setProperty('--zl-spring', springCurve()); }, get strength() { return strength; },
    get level() { return level; }, get waveScale() { return waveScale; }, get waves() { return waves; }, setWaterOff(v) { waterOff = !!v; }, get waterOff() { return waterOff; },
    setWaves(on) { waves = !!on; try { localStorage.setItem('zl-wellen', on ? '1' : '0'); } catch (e) { } applyLevel(); },
    setLevel(l) { level = l; try { localStorage.setItem('zl-bewegung', l); } catch (e) { } calm = reduced || root.classList.contains('z-eco'); applyLevel(); root.style.setProperty('--zl-spring', springCurve()); } };
})();
