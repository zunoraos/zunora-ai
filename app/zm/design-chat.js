/* Zunora Messenger (PC) · Chat-Designs erweitert (27.11.2026) — wie am Handy (MChatDesign.kt):
 *  • 8 kostenlose Vorlagen, 20 Plus-Vorlagen (mit Mustern und bewegten Hintergründen), „Eigenes Design" (Plus)
 *  • NUR FÜR DICH (chat_looks, SQL 49): je Chat + „Design für alle Chats"; Einstellungen → eine Seite „Design"
 *  • Muster/Bewegung auch für den eigenen Chat-Hintergrund (mehr2.js, Werte „g:#a,#b|p:sterne|a:schnee")
 * Muss NACH wuensche.js, mehr2.js und design.js und VOR ui.js geladen werden. */
(function (root) {
  const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } } };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const T = (s) => (root.ZLang && root.ZLang.tr ? root.ZLang.tr(s) : s);
  const plus = () => !!(root.ZPlus && root.ZPlus.active());
  const calm = () => !!(root.ZLook && root.ZLook.calm) || matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('z-eco');

  const D = (key, name, bg, mine, other, emoji, pat = '', anim = '', free = false) => ({ key, name, bg, mine, other, emoji, pat, anim, free });
  const FREE = [
    D('klassik', 'Klassik', 'g:#E8EEF7,#D6E2F5', '#2F7BFF', '#5B6B82', '💬', '', '', true),
    D('minze', 'Minze', 'g:#D9F7EC,#BDEFD9', '#1FAA6B', '#2F5D4C', '🌱', '', '', true),
    D('lavendel', 'Lavendel', 'g:#EDE6FF,#D9CCFF', '#7C5CFF', '#4B3A80', '💜', '', '', true),
    D('pfirsich', 'Pfirsich', 'g:#FFE5D6,#FFC9B0', '#FF7A45', '#7A3A22', '🍑', '', '', true),
    D('schiefer', 'Schiefer', 'g:#1F2933,#323F4B', '#52606D', '#2A343E', '🪨', '', '', true),
    D('himmel', 'Himmel', 'g:#B5ECFF,#E0F0FB', '#2FA3FF', '#1E5A80', '☁️', 'wellen', '', true),
    D('punkte', 'Pünktchen', 'g:#FFF4D6,#FFE7A8', '#F2A900', '#6B4E00', '🌼', 'punkte', '', true),
    D('nachtblau', 'Nachtblau', 'g:#0E1A33,#1C2E5A', '#3D6BFF', '#1B2A4A', '🌙', 'sterne', '', true)];
  const PLUS = [
    D('liebe', 'Liebe', 'g:#FF5F8F,#7A2BFF', '#FF4D8D', '#4B1D5C', '❤️'), D('ozean', 'Ozean', 'g:#0E3A5C,#2F7BFF', '#2F7BFF', '#0E3A5C', '🌊'),
    D('sonnenuntergang', 'Sonnenuntergang', 'g:#FF7A45,#FF3D7F', '#FF7A45', '#5A1E3A', '🌅'), D('wald', 'Wald', 'g:#1FAA6B,#0E3A2E', '#2FBF71', '#1F3A2E', '🌿'),
    D('galaxie', 'Galaxie', 'g:#1F1C2C,#7A2BFF', '#9B7BFF', '#2A1B5E', '🌌'), D('bonbon', 'Bonbon', 'g:#FFD1EC,#E8D1FF', '#FF7AD9', '#7C5CFF', '🍬'),
    D('gold', 'Gold', 'g:#2B1B00,#7A5600', '#FFC23D', '#5A3A00', '✨'), D('mitternacht', 'Mitternacht', 'c:#111827', '#374151', '#1F2937', '🌙'),
    D('zitrone', 'Zitrone', 'g:#FFF6B7,#A3D93B', '#A3D93B', '#3F5A1E', '🍋'), D('fussball', 'Fußball', 'g:#0B6E3A,#1FAA6B', '#FFFFFF', '#0B3D22', '⚽'),
    D('herzregen', 'Herzregen', 'g:#FF5F8F,#B8336A', '#FF4D8D', '#5C1D3A', '💕', 'herzen', 'herzen'), D('schnee', 'Schneenacht', 'g:#1B2A4A,#3B5A8C', '#7FB3FF', '#22365C', '❄️', '', 'schnee'),
    D('sterne', 'Sternenhimmel', 'g:#0B0B1E,#2A1B5E', '#9B7BFF', '#1E1640', '⭐', '', 'funkeln'), D('unterwasser', 'Unterwasser', 'g:#003B5C,#0FA3B1', '#19C3D6', '#0B3C4F', '🐠', '', 'blasen'),
    D('party', 'Party', 'g:#2B0B3F,#C21E9E', '#FFC23D', '#4A1066', '🎉', '', 'konfetti'), D('polarlicht', 'Polarlicht', 'g:#06141C,#0B2A2A,#1A1240', '#2FE0A0', '#123A3A', '🌌', '', 'polarlicht'),
    D('kirschbluete', 'Kirschblüte', 'g:#FFE3EE,#FFC1D9', '#FF6FA5', '#7A2E4E', '🌸', '', 'blueten'), D('neon', 'Neon', 'c:#0A0A12', '#00C8D6', '#24243A', '🕹️', 'raster'),
    D('herbst', 'Herbst', 'g:#5A2E0E,#C2611F', '#FF9A3D', '#4A260C', '🍂', '', 'blaetter'), D('regen', 'Regentag', 'g:#2E3A48,#55677A', '#6FA8DC', '#2C3A4A', '🌧️', '', 'regen')];
  const ALL = FREE.concat(PLUS);
  const PATTERNS = [['', 'Keins'], ['punkte', 'Punkte'], ['herzen', 'Herzen'], ['sterne', 'Sterne'], ['raster', 'Raster'], ['wellen', 'Wellen'], ['streifen', 'Streifen']];
  const ANIMS = [['', 'Keine'], ['herzen', 'Herzen'], ['schnee', 'Schnee'], ['funkeln', 'Funkeln'], ['blasen', 'Blasen'], ['konfetti', 'Konfetti'], ['polarlicht', 'Polarlicht'], ['blueten', 'Blüten'], ['blaetter', 'Blätter'], ['regen', 'Regen']];
  const PALETTE = ['#FF4D8D', '#FF7A45', '#FFC23D', '#A3D93B', '#2FBF71', '#19C3D6', '#2F7BFF', '#7C5CFF', '#9B7BFF', '#FF7AD9', '#FFFFFF', '#E8EEF7', '#FFE5D6', '#D9F7EC', '#EDE6FF', '#52606D', '#374151', '#1F2937', '#111827', '#0B0B1E', '#5A1E3A', '#0E3A5C', '#0B3D22', '#4A260C'];
  const EMOJIS = ['💬', '❤️', '🔥', '✨', '🌈', '🎉', '🐶', '🐱', '⚽', '🎮', '🎵', '☕', '🍕', '🌸', '🌙', '⭐'];
  // „Nur Hintergrund" (früher Chat-Hintergrund) — kostenlos, Blasen bleiben wie im App-Design. Gleiche Liste wie am Handy (MWall.PRESETS).
  const WALLS0 = [['g:#2A1B5E,#0E3A5C', 'Nacht'], ['g:#FF7A45,#FF3D7F', 'Sonnenuntergang'], ['g:#1FAA6B,#0E7A55', 'Wald'], ['g:#9D7BFF,#5AA9FF', 'Zunora'],
    ['g:#FFD1EC,#E8D1FF', 'Rosa'], ['g:#B5ECFF,#E0F0FB', 'Himmel'], ['c:#111827', 'Schwarz'], ['c:#F3F4F6', 'Hell'], ['g:#7A2BFF,#FF2BD6', 'Galaxie'],
    ['g:#FFF4D6,#FFE7A8|p:punkte', 'Pünktchen'], ['g:#FFD1EC,#FFB3CF|p:herzen', 'Herzchen'], ['g:#0E1A33,#1C2E5A|p:sterne', 'Sterne'], ['c:#0A0A12|p:raster', 'Raster'],
    ['g:#B5ECFF,#7FC8F8|p:wellen', 'Wellen'], ['g:#E8EEF7,#D6E2F5|p:streifen', 'Streifen'], ['g:#D9F7EC,#BDEFD9', 'Minze'], ['g:#EDE6FF,#D9CCFF', 'Lavendel'], ['g:#FFE5D6,#FFC9B0', 'Pfirsich'],
    ['g:#1B2A4A,#3B5A8C|a:schnee', 'Schnee'], ['g:#0B0B1E,#2A1B5E|a:funkeln', 'Funkeln'], ['g:#003B5C,#0FA3B1|a:blasen', 'Blasen'], ['g:#06141C,#0B2A2A,#1A1240|a:polarlicht', 'Polarlicht'],
    ['g:#2E3A48,#55677A|a:regen', 'Regen'], ['g:#FFE3EE,#FFC1D9|a:blueten', 'Blüten'], ['g:#5A2E0E,#C2611F|a:blaetter', 'Herbst']];
  const pt = (v, k) => (String(v || '').split('|').find((x) => x.startsWith(k + ':')) || '').slice(2);
  const WALLS = WALLS0.map(([v, n]) => D('wand:' + n.toLowerCase(), n, v.split('|')[0], '', '', '', pt(v, 'p'), pt(v, 'a'), true));
  const FOTO = D('foto', 'Eigenes Foto', '', '', '', '📷', '', '', true);
  const isFreeKey = (k) => FREE.some((f) => f.key === k) || String(k || '').startsWith('wand:') || k === 'foto';
  const isFree = (d) => isFreeKey(d.key);
  const hexOk = (c) => /^#[0-9A-Fa-f]{6}$/.test(c || '');
  const lum = (c) => { const n = parseInt(String(c).slice(1), 16); return ((n >> 16) * 299 + ((n >> 8 & 255) * 587) + ((n & 255) * 114)) / 255000; };

  function toJson(d) { const o = { key: d.key, name: d.name, bg: d.bg, mine: d.mine, other: d.other, emoji: d.emoji }; if (d.pat) o.pat = d.pat; if (d.anim) o.anim = d.anim; if (d.key === 'eigenes') o.custom = true; if (d.key === 'foto') o.img = true; return o; }
  function fromJson(o) {
    if (!o) return null;
    const key = o.key || (ALL.find((d) => d.name === o.name) || {}).key || '';
    return D(key, o.name || '', o.bg || '', o.mine || '', o.other || '', o.emoji || '', o.pat || '', o.anim || '', isFreeKey(key));
  }

  // ------------------------------------------------------------------------------------------ Persönliche Chat-Designs (nur ich; am Konto → Handy + PC gleich; SQL 49)
  //   chat_key = Chat-ID oder „*" (Design für alle Chats). Vorrang: dieser Chat → alle Chats → App-Design.
  const looks = new Map();
  try { Object.entries(JSON.parse(LS.get('zm-looks', '{}') || '{}')).forEach(([k, v]) => looks.set(k, v)); } catch (e) { }
  const saveCache = () => LS.set('zm-looks', JSON.stringify(Object.fromEntries(looks)));
  const ApiNow = () => root.ZM && root.ZM.Api;
  async function setLook(key, o) {
    const Api = ApiNow();
    if (o) await Api.rest('POST', 'chat_looks?on_conflict=user_id,chat_key', { user_id: Api.userId, chat_key: key, look: o, updated_at: new Date().toISOString() }, 'resolution=merge-duplicates');
    else await Api.rest('DELETE', 'chat_looks?chat_key=eq.' + encodeURIComponent(key));
    if (o) looks.set(key, o); else looks.delete(key);
    saveCache();
  }
  async function sync(S) {
    const Api = ApiNow(); if (!Api || !Api.userId) return;
    const rows = await Api.list('chat_looks?select=chat_key,look');
    looks.clear(); (rows || []).forEach((r) => { if (r.look) looks.set(r.chat_key, r.look); }); saveCache();
    if (LS.get('zm-looks-umzug', '') !== '1') {          // einmalig: alte Einstellungen dieses PCs übernehmen
      try { const g = JSON.parse(LS.get('zm-design-alle', '') || 'null'); if (g && !looks.has('*')) await setLook('*', g); } catch (e) { }
      if (S && S.chats) for (const id of S.chats.keys()) {
        const w = LS.get('zm-wand-' + id, ''); if (!w || looks.has(id)) continue;
        const n = (WALLS0.find((x) => x[0] === w) || [])[1] || 'Hintergrund';
        try { await setLook(id, w.startsWith('i:') ? toJson(FOTO) : toJson(D('wand:alt', n, w.split('|')[0], '', '', '', pt(w, 'p'), pt(w, 'a'), true))); } catch (e) { }
      }
      LS.set('zm-looks-umzug', '1');
    }
  }
  const usable = (o) => (o && (isFreeKey((fromJson(o) || {}).key) || plus())) ? o : null;
  const of = (id) => (id ? usable(looks.get(id)) : null);
  const global = () => usable(looks.get('*'));
  const effective = (id) => of(id) || global();
  const setGlobal = (o) => setLook('*', o);
  // abgleichen: beim ersten Chat nach der Anmeldung und wenn das Fenster wieder nach vorn kommt (höchstens alle 2 Minuten)
  let lastSync = 0, syncing = false;
  function syncSoon(force) {
    const Api = ApiNow(), S = root.ZM && root.ZM.Store;
    if (!Api || !Api.userId || syncing || (!force && Date.now() - lastSync < 120000)) return;
    syncing = true; lastSync = Date.now();
    sync(S).then(() => { if (S && S.changed) S.changed('chats'); }).catch(() => { }).finally(() => { syncing = false; });
  }
  addEventListener('focus', () => syncSoon(false));

  // ------------------------------------------------------------------------------------------ Zeichnen: Verlauf + Muster (CSS) + Bewegung (Canvas)
  const colorsOf = (bg) => String(bg || '').split('|')[0].replace(/^[gc]:/, '').split(',').filter(hexOk);
  const part = (v, k) => (String(v || '').split('|').find((x) => x.startsWith(k + ':')) || '').slice(2);
  function gradCss(bg) { const c = colorsOf(bg); if (!c.length) return ''; return c.length > 1 ? `linear-gradient(160deg, ${c.join(', ')})` : c[0]; }
  function patCss(pat, dark) {
    if (!pat) return '';
    const ink = dark ? 'rgba(255,255,255,.11)' : 'rgba(0,0,0,.08)';
    const svg = {
      punkte: `<circle cx="17" cy="17" r="2.5" fill="${ink}"/>`,
      herzen: `<text x="17" y="22" font-size="14" text-anchor="middle" fill="${ink}">♥</text>`,
      sterne: `<text x="17" y="21" font-size="12" text-anchor="middle" fill="${ink}">✦</text>`,
      raster: `<path d="M0 0H34M0 0V34" stroke="${ink}" stroke-width="1" fill="none"/>`,
      wellen: `<path d="M0 17 Q8.5 10 17 17 T34 17" stroke="${ink}" stroke-width="1.5" fill="none"/>`,
      streifen: `<path d="M-8 34 L34 -8 M26 42 L42 26" stroke="${ink}" stroke-width="6" fill="none"/>`
    }[pat];
    return svg ? `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34">${svg}</svg>`)}")` : '';
  }
  /** CSS-Hintergrund (Verlauf + Muster) für Vorschauen und mehr2.js */
  function css(bg, pat) {
    const g = gradCss(bg); if (!g) return '';
    const p = patCss(pat != null ? pat : part(bg, 'p'), lum(colorsOf(bg)[0] || '#000000') < 0.45);
    return p ? `${p}, ${g}` : g;
  }

  // Bewegung: ein Canvas hinter der Nachrichtenliste
  const rnd = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.547; return x - Math.floor(x); };
  let layer = null, cv = null, anim = '', raf = 0, t0 = 0;
  function ensureLayer(list) {
    const host = list && list.parentElement; if (!host) return null;
    if (!layer || layer.parentElement !== host) {
      layer = document.createElement('div'); layer.className = 'zcd-layer'; cv = document.createElement('canvas'); layer.appendChild(cv);
      host.insertBefore(layer, list);
      if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    }
    const r = list.getBoundingClientRect(), hr = host.getBoundingClientRect();
    Object.assign(layer.style, { top: (r.top - hr.top) + 'px', left: (r.left - hr.left) + 'px', width: r.width + 'px', height: r.height + 'px' });
    return layer;
  }
  function frame(now) {
    raf = 0; if (!layer || !layer.isConnected || !anim) return;
    const w = layer.clientWidth, h = layer.clientHeight; if (!w || !h) { raf = requestAnimationFrame(frame); return; }
    const dpr = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const t = calm() ? 3.3 : (now - t0) / 1000;
    const fall = (i, sp, up) => { const v = (rnd(i, 2) + t * sp * (0.6 + rnd(i, 3) * 0.8) / h * 60) % 1; return up ? h * (1.1 - v * 1.2) : h * (v * 1.2 - 0.1); };
    const glyph = (s, x, y, px, col, deg) => { g.save(); g.translate(x, y); g.rotate((deg || 0) * Math.PI / 180); g.font = `${px}px "Segoe UI Emoji", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(s, 0, 0); g.restore(); };
    if (anim === 'polarlicht') ['47,224,160', '122,43,255', '25,195,214'].forEach((c, i) => {
      const cx = w * (0.5 + 0.4 * Math.sin(t * 0.12 + i * 2.1)), cy = h * (0.3 + 0.25 * Math.sin(t * 0.09 + i * 1.3)), rr = w * 0.7;
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rr); gr.addColorStop(0, `rgba(${c},.35)`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    else if (anim === 'funkeln') for (let i = 0; i < 60; i++) { const a = 0.25 + 0.75 * Math.abs(Math.sin(t * (0.6 + rnd(i, 4)) + i)); g.fillStyle = `rgba(255,255,255,${a * 0.9})`; g.beginPath(); g.arc(rnd(i, 1) * w, rnd(i, 2) * h, 0.8 + rnd(i, 5) * 1.6, 0, 7); g.fill(); }
    else if (anim === 'regen') { g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 1.2; for (let i = 0; i < 70; i++) { const x = rnd(i, 1) * w, y = fall(i, 9); g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y + 16); g.stroke(); } }
    else if (anim === 'schnee') { g.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < 55; i++) { g.beginPath(); g.arc(rnd(i, 1) * w + Math.sin(t * 0.8 + i) * 14, fall(i, 1.6), 1.5 + rnd(i, 5) * 2.5, 0, 7); g.fill(); } }
    else if (anim === 'blasen') { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.3; for (let i = 0; i < 26; i++) { g.beginPath(); g.arc(rnd(i, 1) * w + Math.sin(t * 1.1 + i) * 10, fall(i, 1.8, true), 4 + rnd(i, 5) * 9, 0, 7); g.stroke(); } }
    else if (anim === 'konfetti') { const cs = ['#FFC23D', '#FF4D8D', '#19C3D6', '#A3D93B', '#9B7BFF']; for (let i = 0; i < 50; i++) { const x = rnd(i, 1) * w + Math.sin(t + i) * 12, y = fall(i, 2.6); g.save(); g.translate(x, y); g.rotate((t * 90 * (i % 2 ? -1 : 1) + i * 37) * Math.PI / 180); g.fillStyle = cs[i % cs.length]; g.fillRect(0, 0, 5, 9); g.restore(); } }
    else { const [s, n, up] = anim === 'herzen' ? ['♥', 22, true] : anim === 'blueten' ? ['🌸', 18, false] : ['🍂', 18, false];
      for (let i = 0; i < n; i++) glyph(s, rnd(i, 1) * w + Math.sin(t * 0.9 + i) * 18, fall(i, 1.4, up), 12 + rnd(i, 5) * 12, anim === 'herzen' ? 'rgba(255,255,255,.45)' : '#fff', Math.sin(t + i) * 30); }
    if (!calm()) raf = requestAnimationFrame(frame);
  }
  /** Design (Verlauf + Muster + Bewegung) hinter die Nachrichtenliste legen — null = aus */
  function paint(list, bg, pat, an) {
    if (!bg) { if (layer) layer.remove(); layer = null; anim = ''; return; }
    const l = ensureLayer(list); if (!l) return;
    l.style.background = css(bg, pat);
    list.style.background = 'transparent';
    const was = anim; anim = an || '';
    if (!anim) { cv.style.display = 'none'; return; }
    cv.style.display = '';
    if (!raf || was !== anim) { if (raf) cancelAnimationFrame(raf); t0 = performance.now(); raf = requestAnimationFrame(frame); }
  }
  addEventListener('resize', () => { const list = document.getElementById('mList'); if (layer && list) ensureLayer(list); });

  // ------------------------------------------------------------------------------------------ in wuensche.js einhängen (Blasenfarben + Hintergrund)
  const W = root.ZMWish;
  if (W && W.applyTheme) {
    const orig = W.applyTheme;
    W.applyTheme = function (c, el) {
      if (!lastSync) syncSoon(true);
      const own = c ? of(c.id) : null, eff = own || global();
      orig(c ? Object.assign({}, c, { theme: eff && eff.mine ? eff : null }) : c, el);          // Blasenfarben nur aus deinem Design
      el.style.removeProperty('background');
      if (eff && eff.img) {          // eigenes Foto (liegt nur auf diesem PC)
        paint(el, null);
        const v = LS.get('zm-wand-' + (own ? c.id : '*'), '');
        if (v.startsWith('i:')) el.style.background = `linear-gradient(#0000004d, #0000004d), url("${v.slice(2)}") center / cover no-repeat`;
        return;
      }
      if (eff && colorsOf(eff.bg).length) { paint(el, eff.bg, eff.pat || '', eff.anim || ''); return; }
      paint(el, null);
    };
  }

  // ------------------------------------------------------------------------------------------ Auswahl (ein Chat oder „alle Chats") — nur für dich
  function preview(d, big) {
    const bub = (bg) => lum(bg) > 0.6 ? '#111' : '#fff';
    const bg = d.bg ? css(d.bg, d.pat) : 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 35%, transparent), color-mix(in srgb, var(--accent) 12%, transparent))';
    const other = d.other || 'color-mix(in srgb, currentColor 18%, transparent)', mine = d.mine || 'var(--accent)';
    return `<div class="zcd-prev ${big ? 'big' : ''}" style="background:${bg}">${d.emoji ? `<div style="font-size:${big ? 24 : 20}px">${esc(d.emoji)}</div>` : ''}
      <span class="b" style="background:${esc(other)};color:${d.other ? bub(d.other) : 'inherit'}">${T('Hallo!')}</span><br><span class="b" style="background:linear-gradient(135deg, ${esc(mine)}, color-mix(in srgb, ${esc(mine)} 65%, #fff));color:${d.mine ? bub(d.mine) : '#fff'};float:right">Hi 👋</span>
      ${d.anim ? `<i class="zcd-mv">▶ ${T('bewegt')}</i>` : ''}</div>`;
  }
  /** chatId = null → Design für alle Chats */
  function themeDlg(chatId, H) {
    const { S, dlg, closeDlg, toast, tryDo } = H;
    const c = chatId ? S.chats.get(chatId) : null; if (chatId && !c) return;
    const key = c ? c.id : '*';
    const curJ = c ? of(c.id) : global();
    const cur = fromJson(curJ);
    let tab = cur && cur.key === 'eigenes' ? 2 : cur && !isFree(cur) ? 1 : 0;
    let sel = cur || FREE[0];
    let own = cur && cur.key === 'eigenes' ? cur : D('eigenes', 'Eigenes Design', 'g:#7C5CFF,#2F7BFF', '#FF4D8D', '#1F2937', '✨');
    const sub = !c ? T('Gilt in jedem Chat, dem du kein eigenes Design gegeben hast. Nur du siehst es — auf all deinen Geräten.')
      : T('Nur du siehst es — auf all deinen Geräten. {0} kann sich ein eigenes Design aussuchen.').replace('{0}', esc(c.group ? T('Die anderen') : c.title));
    dlg('', (box) => {
      const draw = () => {
        const shown = tab === 2 ? own : sel, may = isFree(shown) || plus();
        const g = colorsOf(own.bg); const top = g[0] || '#7C5CFF', bot = g[1] || top;
        const sw = (k, curC) => `<div class="zcd-sw">${PALETTE.map((h) => `<button class="${h.toLowerCase() === String(curC).toLowerCase() ? 'on' : ''}" data-zcdc="${k}" data-v="${h}" style="background:${h}" title="${h}"></button>`).join('')}</div>`;
        const chips = (k, list, curV) => `<div class="zcd-chips">${list.map(([v, n]) => `<button class="${v === curV ? 'on' : ''}" data-zcdp="${k}" data-v="${esc(v)}">${esc(T(n))}</button>`).join('')}</div>`;
        const grid = (list) => `<div class="zcd-grid">${list.map((d) => `<div class="zcd-item ${d.key === sel.key ? 'on' : ''}" data-zcdk="${d.key}">${preview(d)}<b>${esc(T(d.name))}</b></div>`).join('')}</div>`;
        box.innerHTML = `<h3>${T(c ? 'Chat-Design' : 'Design für alle Chats')}</h3><p class="small muted">${sub}</p>
          <div class="zcd-big">${preview(shown, true)}<span class="zcd-tag">${esc(T(shown.name))} · ${isFree(shown) ? T('Kostenlos') : 'Plus'}</span></div>
          <div class="zcd-tabs">${[T('Kostenlos'), '✨ Plus', '🎨 ' + T('Eigenes')].map((n, i) => `<button class="${i === tab ? 'on' : ''}" data-zcdt="${i}">${n}</button>`).join('')}</div>
          <div class="zcd-scroll">${tab === 0 ? `<div class="small muted" style="font-weight:600;margin-bottom:6px">${T('Vorlagen')}</div>${grid(FREE)}
              <div class="small muted" style="font-weight:600;margin-top:10px">${T('Nur Hintergrund')}</div><p class="small muted" style="margin:2px 0 6px">${T('Blasen bleiben wie im App-Design.')}</p>
              <div class="zcd-foto ${sel.key === 'foto' ? 'on' : ''}" id="zcdFoto">📷 <b>${T('Eigenes Foto')}</b><span class="small muted"> · ${T('Bleibt auf diesem Gerät · auf anderen Geräten gilt dort ein eigenes Foto oder der Standard')}</span></div>
              ${grid(WALLS)}<input type="file" id="zcdFile" accept="image/*" class="hidden">`
            : tab === 1 ? `${plus() ? '' : `<p class="small" style="color:var(--accent)">✨ ${T('Diese Vorlagen gibt es mit Zunora Plus. Ansehen und ausprobieren kann sie jeder.')}</p>`}${grid(PLUS)}`
            : `${plus() ? '' : `<p class="small" style="color:var(--accent)">✨ ${T('Ein eigenes Design gibt es mit Zunora Plus. Ausprobieren kann es jeder.')}</p>`}
            <div class="small muted">${T('Hintergrund oben')}</div>${sw('top', top)}<div class="small muted">${T('Hintergrund unten')}</div>${sw('bot', bot)}
            <div class="small muted">${T('Meine Blasen')}</div>${sw('mine', own.mine)}<div class="small muted">${T('Blasen der anderen')}</div>${sw('other', own.other)}
            <div class="small muted">${T('Muster')}</div>${chips('pat', PATTERNS, own.pat)}<div class="small muted">${T('Bewegung')}</div>${chips('anim', ANIMS, own.anim)}
            <div class="small muted">${T('Emoji')}</div>${chips('emoji', EMOJIS.map((e) => [e, e]), own.emoji)}`}</div>
          <button class="btn" id="zcdGo" style="width:100%;margin-top:10px" ${may ? '' : 'disabled'}>${may ? T('Design übernehmen') : T('Mit Zunora Plus übernehmen')}</button>
          ${curJ ? `<button class="btn ghost" id="zcdOff" style="width:100%;margin-top:6px">${T(c && global() ? 'Wie alle Chats' : 'Design entfernen')}</button>` : ''}
          <button class="btn ghost" data-close style="width:100%;margin-top:6px">${T('Schließen')}</button>`;
        box.querySelector('[data-close]').onclick = closeDlg;
        box.querySelectorAll('[data-zcdt]').forEach((b) => b.onclick = () => { tab = +b.dataset.zcdt; draw(); });
        box.querySelectorAll('[data-zcdk]').forEach((b) => b.onclick = () => { sel = ALL.concat(WALLS).find((d) => d.key === b.dataset.zcdk) || sel; draw(); });
        box.querySelectorAll('[data-zcdc]').forEach((b) => b.onclick = () => { const k = b.dataset.zcdc, v = b.dataset.v;
          if (k === 'top') own = Object.assign({}, own, { bg: `g:${v},${bot}` }); else if (k === 'bot') own = Object.assign({}, own, { bg: `g:${top},${v}` }); else own = Object.assign({}, own, { [k]: v }); draw(); });
        box.querySelectorAll('[data-zcdp]').forEach((b) => b.onclick = () => { own = Object.assign({}, own, { [b.dataset.zcdp]: b.dataset.v }); draw(); });
        const fb = box.querySelector('#zcdFoto'), ff = box.querySelector('#zcdFile');
        if (fb && ff) { fb.onclick = () => ff.click(); ff.onchange = () => { const file = ff.files[0]; if (!file) return; tryDo(async () => {
          const bmp = await createImageBitmap(file); const s = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
          const cv2 = document.createElement('canvas'); cv2.width = Math.round(bmp.width * s); cv2.height = Math.round(bmp.height * s); cv2.getContext('2d').drawImage(bmp, 0, 0, cv2.width, cv2.height);
          LS.set('zm-wand-' + key, 'i:' + cv2.toDataURL('image/jpeg', 0.72)); sel = FOTO; draw(); }); }; }
        const go = box.querySelector('#zcdGo'); go.onclick = () => tryDo(async () => {
          await setLook(key, toJson(tab === 2 ? own : sel));
          closeDlg(); H.renderAll(); toast('✓ ' + T('Chat-Design geändert'));
        });
        const off = box.querySelector('#zcdOff'); if (off) off.onclick = () => tryDo(async () => {
          await setLook(key, null);
          closeDlg(); H.renderAll(); toast('✓ ' + T('Chat-Design entfernt'));
        });
      };
      draw();
    });
  }
  if (W) { W.themeDlg = themeDlg; }

  // ------------------------------------------------------------------------------------------ Einstellungen → EINE Seite „Design"
  //   So gilt es: 1. Design eines Chats → 2. Design für alle Chats → 3. App-Design (Welt oder Zunora + Feinschliff)
  const DS = root.ZMDesign;
  if (DS && DS.settings) {
    const os = DS.settings, ow = DS.wire, osec = DS.sections;
    DS.settings = function (body) {
      os(body);
      // Hell/Dunkel wandert von „Darstellung" nach „Design"; dort bleiben Energiesparen, Bewegung, Logo, Übergänge
      const d = body.darstellung || '', cut = d.indexOf('<div class="cat" style="padding-left:0;margin-top:14px">Energiesparmodus');
      const mode = cut > 0 ? d.slice(0, cut) : '';
      if (cut > 0) body.darstellung = d.slice(cut);
      const g = fromJson(global());
      body.design = `<div class="kcard" style="margin-top:6px"><b>${T('So gilt es')}</b><div class="small muted">${T('1. Dein Design für einen Chat (im Chat → Chat-Design)  ·  2. Dein Design für alle Chats  ·  3. Das App-Design. Andere sehen davon nichts.')}</div></div>
        <div class="cat" style="padding-left:0;margin-top:14px">${T('Hell oder dunkel')}</div>${mode}
        <div class="cat" style="padding-left:0;margin-top:14px">${T('Chats')}</div><p class="small muted" style="margin:0 0 6px">${T('Hintergrund, Blasenfarben, Muster und Bewegung — für jeden Chat ohne eigenes Design. Auf all deinen Geräten gleich.')}</p>
        <div class="kcard zcd-card" data-zcdall="1" style="cursor:pointer;display:flex;gap:12px;align-items:center">
        ${g ? `<div class="zcd-mini" style="background:${g.bg ? css(g.bg, g.pat) : ''}">${esc(g.emoji || '🖼')}</div>` : '<div class="zcd-mini">🎨</div>'}
        <div style="flex:1"><b>${T('Design für alle Chats')}</b><div class="small muted">${g ? esc(T(g.name)) : T('Hintergrund, Blasenfarben, Muster und Bewegung für jeden Chat')}</div></div><span class="muted">›</span></div>
        <div class="cat" style="padding-left:0;margin-top:18px">${T('App-Design')}</div><div class="cat" style="padding-left:0;margin-top:2px;font-size:13px">${T('Welten')}</div>` + (body.design || '');
    };
    DS.sections = function (list) {
      const out = osec(list);
      out.forEach((x) => {
        if (x[0] === 'design') { x[2] = T('Design'); x[3] = (look() ? T(look().title) : 'Zunora') + ' · ' + T('Hell, Dunkel, Chats, Welten'); }
        if (x[0] === 'darstellung') { x[2] = T('Anzeige & Energie'); x[3] = T('Energiesparen, Bewegung, Schrift, App-Symbol'); }
      });
      return out;
    };
    DS.wire = function (el, page, H) {
      ow(el, page, H);
      if (page === 'design') { const b = el.querySelector('[data-zcdall]'); if (b) b.onclick = () => themeDlg(null, H); }
    };
  }
  const look = () => (DS && DS.look ? DS.look() : null);

  root.ZMChatDesign = { FREE, PLUS, ALL, WALLS, PATTERNS, ANIMS, toJson, fromJson, global, setGlobal, of, effective, setLook, sync, looks, css, part, colorsOf, paint, themeDlg, isFree };
})(window);
