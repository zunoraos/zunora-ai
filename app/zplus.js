/* Zunora Plus — EIN Abo für alle Zunora-Apps (gleiche Zunora ID). Gemeinsam für alle PC-Apps:
 * Abo-Stand (my_subscription), Tester-Angebot holen, kündigen, Gutscheine; dazu die Plus-Funktionen, die überall gelten:
 * Zunora-Farbe, App-Hintergrund (Farbwelt, eigenes Bild, KI-Bild), App-Sperre (PIN).
 * Messenger-eigenes (Sprechblasen, Töne, Sticker, Leiste) hängt der Messenger über ZPlus.render(el, { extra, wire }) an.
 * Einstellungen liegen auf diesem PC (localStorage). Ob Plus aktiv ist, merkt sich die App bis zum Ablaufdatum. */
(function (root) {
  'use strict';
  const KEY = 'zunora-plus';
  const FEATURES = [
    ['🎨', 'Zunora-Farben ändern', 'Deine Lieblingsfarbe für Knöpfe, Leisten und Akzente.', ''],
    ['🖼', 'App-Hintergrund', 'Eigenes Foto, fertige Farbwelten oder ein Hintergrund, den die KI für dich malt.', ''],
    ['🔒', 'App-Sperre', 'Öffnen nur mit Gesicht, Fingerabdruck oder PIN (am PC mit App-PIN).', ''],
    ['🎁', 'Monatliche Gutscheine', 'Jeden Monat Gutscheine und Rabatte für Zunora-Apps, Spiele und In-App-Käufe.', ''],
    ['🪪', 'Nutzername öfter ändern', 'Deinen Nutzernamen der Zunora ID einmal am Tag ändern — ohne Plus einmal pro Woche.', ''],
    ['💬', 'Sprechblasen-Farben', 'Eigene Farben für deine und die anderen Sprechblasen.', 'Nur im Zunora Messenger'],
    ['🔊', 'Benachrichtigungston', 'Eigener Ton für neue Nachrichten.', 'Nur im Zunora Messenger'],
    ['🧩', 'Riesige Sticker-Auswahl', 'Viele zusätzliche Sticker-Pakete und Sticker, die die KI nach deiner Beschreibung malt.', 'Nur im Zunora Messenger'],
    ['🧭', 'Navigationsleiste bearbeiten', 'Lange auf die Leiste drücken: Reiter entfernen, hinzufügen, sortieren — höchstens 5.', 'Nur im Zunora Messenger'],
    ['🗂', 'Story-Archiv für 1 Jahr', 'Deine abgelaufenen Storys bleiben 1 Jahr in deinem privaten Archiv — ohne Plus 30 Tage.', 'Nur im Zunora Messenger'],
    ['✂️', 'Eigene Sticker', 'Mach aus deinen Fotos Sticker und schick sie im Chat.', 'Nur im Zunora Messenger'],
    ['📦', 'Größere Dateien', 'Dateien bis 200 MB senden — ohne Plus bis 45 MB.', 'Nur im Zunora Messenger'],
    ['✦', 'Plus-Abzeichen', 'Ein Abzeichen neben deinem Namen (abschaltbar).', 'Nur im Zunora Messenger'],
    ['🌀', 'Bewegter Profil-Rahmen', 'Ein leuchtender, bewegter Rahmen um dein Profilbild — für alle sichtbar.', 'Nur im Zunora Messenger'],
    ['🌅', 'Profil-Hintergrund', 'Ein Farbverlauf hinter deinem Profil.', 'Nur im Zunora Messenger'],
    ['🎞', 'Bewegtes Profilbild', 'Ein kurzes Video als Profilbild, das in Schleife läuft.', 'Nur im Zunora Messenger'],
    ['📊', 'Story-Statistik', 'Wer deine Storys wie oft angesehen hat.', 'Nur im Zunora Messenger'],
    ['🚀', 'Server-Boost', 'Für einen Server: Banner, bis zu 50 eigene Emojis, Rollen mit Farbverlauf, Boost-Abzeichen.', 'Nur im Zunora Messenger'],
    ['🔗', 'Anruf-Links', 'Ein Link zum Anruf — Gäste machen ohne Konto im Browser mit.', 'Nur im Zunora Messenger'],
    ['🎬', 'Mehr Seitenübergänge', 'Federn, Karussell und weitere Übergänge zwischen den Seiten.', 'Nur im Zunora Messenger'],
    ['🎭', 'Chat-Designs', 'Hintergrund, Blasenfarben und Emoji für einen Chat — alle im Chat sehen es.', 'Nur im Zunora Messenger'],
    ['🕶', 'Unsichtbar lesen', 'Lesen, ohne dass blaue Haken erscheinen — die der anderen siehst du trotzdem.', 'Nur im Zunora Messenger'],
    ['🙈', 'Versteckte Chats', 'Chats verschwinden aus der Liste und erscheinen nur mit Fingerabdruck oder PIN (Handy).', 'Nur im Zunora Messenger'],
    ['👁', 'Online-Status verbergen', 'Für einzelne Personen „online“ und „zuletzt online“ ausblenden.', 'Nur im Zunora Messenger'],
    ['✏️', '24 Stunden bearbeiten', 'Gesendete Nachrichten einen ganzen Tag lang bearbeiten — ohne Plus 15 Minuten.', 'Nur im Zunora Messenger'],
    ['📸', 'Originalqualität', 'Fotos bis 4096 Pixel, kaum komprimiert (Handy).', 'Nur im Zunora Messenger'],
    ['🎙', 'Lange Sprachnachrichten', 'Bis 30 Minuten am Stück — ohne Plus 15 Minuten.', 'Nur im Zunora Messenger'],
    ['🎥', 'Längere Storys & mehr Ordner', 'Story-Videos bis 3 Minuten und bis 50 Chat-Ordner.', 'Nur im Zunora Messenger'],
    ['🌦', 'Wetter-Designs & Widgets', 'Lebendige Wetter-Hintergründe, eigene Farben und große Widgets.', 'Nur in Zunora Wetter'],
    ['🧥', 'KI-Wetterberater', '„Was zieh ich an?“, beste Zeit fürs Rad, zum Laufen oder Wäschetrocknen.', 'Nur in Zunora Wetter'],
    ['⏰', 'Wetter-Wecker', 'Erinnerung bei Regen, Frost, Hitze oder Pollen — zu deiner Uhrzeit.', 'Nur in Zunora Wetter'],
    ['🪄', 'KI-Helfer für Notizen', 'Zusammenfassen, Aufgaben herausziehen, umformulieren, übersetzen.', 'Nur in Zunora Notizen'],
    ['🔐', 'Gesperrte Notizen', 'Einzelne Notizen mit PIN oder Fingerabdruck schützen.', 'Nur in Zunora Notizen'],
    ['📜', 'Notiz-Designs & Vorlagen', 'Papier-Stile, Farben, Schriften und viele Vorlagen.', 'Nur in Zunora Notizen'],
    ['🕘', 'Export & Versionen', 'Als PDF oder Word speichern, ältere Versionen wiederherstellen.', 'Nur in Zunora Notizen'],
    ['🔎', 'KI-Seitenhelfer', 'Seite zusammenfassen, Fragen zur Seite stellen, übersetzen.', 'Nur in Zunora Browser'],
    ['🔈', 'Vorlesen', 'Artikel vorlesen lassen.', 'Nur in Zunora Browser'],
    ['🏠', 'Browser-Designs & Startseite', 'Eigene Startseite, Hintergründe, Tab-Farben.', 'Nur in Zunora Browser'],
    ['🛡', 'Profi-Schutz & Tools', 'Strenger Werbe- und Tracker-Schutz mit Statistik, Seiten als PDF.', 'Nur in Zunora Browser'],
    ['🏋', 'KI-Trainingspläne', 'Pläne nach Ziel, Zeit und Geräten — passen sich an.', 'Nur in Zunora Fitness'],
    ['📈', 'Profi-Statistiken', 'Fortschritt, Rekorde, Wochen- und Monatsberichte, Export.', 'Nur in Zunora Fitness'],
    ['🎨', 'Fitness-Designs & Widgets', 'Eigene Farben, Startbildschirm-Widget, Abzeichen.', 'Nur in Zunora Fitness'],
    ['🔥', 'Erinnerungen & Serien', 'Trainings-Erinnerungen, Serien und Wochenziele.', 'Nur in Zunora Fitness'],
  ];
  /** Früher „Plus Extra" — seit 26.11.2026 gibt es nur noch Zunora Plus (4,99 €), alles ist in Plus enthalten. */
  const EXTRA = [];
  const TERMS = 'https://zunoraos.github.io/zunora-ai/abo.html';
  const ACCENTS = ['', '#9b7bff', '#7c5cff', '#5aa9ff', '#2f7bff', '#22c3ee', '#00b8a9', '#14b8a6', '#2fbf71', '#4caf50', '#a3d93b', '#ffd84d', '#ffc23d', '#ff9f43',
    '#ff7a45', '#ff6b6b', '#e0475b', '#ff7ad9', '#e056c8', '#c04cff', '#8e9bff', '#6b7fd7', '#b08968', '#b0b8c8', '#7a8699'];
  // Farbwelten: [blob1, blob2, blob3, Grund] für dunkel / hell
  const WORLDS = [
    { id: 'ozean', name: 'Ozean', dark: ['#0e6bff', '#00b4d8', '#2a7fff', '#06142e'], light: ['#9fe2f7', '#b5d8ff', '#8ec9ff', '#e0f0fb'] },
    { id: 'sonnenuntergang', name: 'Sonnenuntergang', dark: ['#ff6b3d', '#ff3d7f', '#c04cff', '#1f0b1e'], light: ['#ffc2a8', '#ffb5d0', '#e3c2ff', '#fbeae4'] },
    { id: 'wald', name: 'Wald', dark: ['#1faa6b', '#0e7a55', '#6bcb3b', '#07170f'], light: ['#b5ebcb', '#cff2b5', '#9fe2c8', '#e6f5ea'] },
    { id: 'polarlicht', name: 'Polarlicht', dark: ['#2fe6a0', '#6d4cff', '#00c2ff', '#050f1f'], light: ['#b5f7dd', '#d2c9ff', '#b5ecff', '#e8f3f5'] },
    { id: 'gold', name: 'Gold', dark: ['#ffb81c', '#ff8a00', '#c9a227', '#1a1205'], light: ['#ffe7a8', '#ffd6a8', '#f2e2b0', '#fbf3e2'] },
    { id: 'kirschbluete', name: 'Kirschblüte', dark: ['#ff7ad9', '#ff9ec4', '#c77dff', '#1e0b18'], light: ['#ffd1ec', '#ffe0ea', '#e8d1ff', '#fbeaf3'] },
    { id: 'nacht', name: 'Mitternacht', dark: ['#3b3f8f', '#1e2a5a', '#5b3df0', '#04050f'], light: ['#c9ccf2', '#d5dbf2', '#d2c9ff', '#e9eaf5'] },
    { id: 'lavendel', name: 'Lavendel', dark: ['#9d7bff', '#c9a0ff', '#7b61d9', '#120c24'], light: ['#e3d9ff', '#f0e1ff', '#d9ccff', '#f1ecfb'] },
    { id: 'mint', name: 'Mint', dark: ['#3fe0c5', '#2bb3a1', '#7be8b0', '#06171a'], light: ['#c5f5ea', '#d5f7e2', '#b8eedc', '#e7f7f3'] },
    { id: 'feuer', name: 'Feuer', dark: ['#ff4d2e', '#ff9500', '#e0263c', '#1e0806'], light: ['#ffc7b5', '#ffe0b0', '#ffc2cc', '#fcebe5'] },
    { id: 'eis', name: 'Gletscher', dark: ['#8fd8ff', '#b5e9ff', '#4fa3d9', '#071521'], light: ['#e3f6ff', '#effaff', '#d2ecfa', '#edf7fc'] },
    { id: 'wueste', name: 'Wüste', dark: ['#e0a15a', '#cc7a3d', '#f2c77a', '#1a1007'], light: ['#f7e1c2', '#f5d3b5', '#faeacc', '#faf1e5'] },
    { id: 'galaxie', name: 'Galaxie', dark: ['#7a2bff', '#ff2bd6', '#2b6bff', '#06001a'], light: ['#dcc9ff', '#ffc9f2', '#c9d9ff', '#f1ebfc'] },
    { id: 'regenbogen', name: 'Regenbogen', dark: ['#ff5f6d', '#ffc371', '#38ef7d', '#0e0b1f'], light: ['#ffd1d6', '#ffebc9', '#c9f7da', '#f6f2fa'] },
    { id: 'graphit', name: 'Graphit', dark: ['#5a6273', '#3a404d', '#7a8699', '#0a0b0e'], light: ['#dde1e8', '#e6e9ee', '#d2d7e0', '#eef0f3'] },
  ];
  // Töne ohne Datei (WebAudio): [Frequenz, Start, Dauer], Wellenform
  const TONES = {
    zunora: { name: 'Zunora', wave: 'sine', n: [[880, 0, .18], [660, .25, .18]] },
    glocke: { name: 'Glocke', wave: 'triangle', n: [[1046, 0, .5], [784, .18, .6]] },
    marimba: { name: 'Marimba', wave: 'sine', n: [[523, 0, .12], [659, .12, .12], [784, .24, .12], [1046, .36, .2]] },
    puls: { name: 'Puls', wave: 'square', n: [[740, 0, .08], [740, .16, .08], [740, .32, .08]] },
    retro: { name: 'Retro', wave: 'square', n: [[523, 0, .1], [784, .1, .1], [1046, .2, .16]] },
    sanft: { name: 'Sanft', wave: 'sine', n: [[392, 0, .4], [523, .3, .5]] },
    tropfen: { name: 'Tropfen', wave: 'sine', n: [[1318, 0, .08], [988, .09, .12]] },
  };

  let st = {};
  try { st = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { st = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const date = (ms) => ms ? new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  // Hell/Dunkel: was die App eingestellt hat (data-theme), sonst wie Windows
  const dark = () => { const t = document.documentElement.dataset.theme; if (t) return t === 'dark'; return !(root.matchMedia && root.matchMedia('(prefers-color-scheme: light)').matches); };
  let hiddenAt = 0;
  /** Farbton (0–359), Sättigung, Helligkeit → #rrggbb */
  const hsvHex = (h, s, v) => { const f = (n) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
    return '#' + [f(5), f(3), f(1)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join(''); };
  const hueOf = (hex) => { const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || ''); if (!m) return 260;
    const [r, g, b] = [m[1], m[2], m[3]].map((x) => parseInt(x, 16) / 255), mx = Math.max(r, g, b), d = mx - Math.min(r, g, b); if (!d) return 0;
    const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return Math.round((h * 60 + 360) % 360); };
  /** helle Farbe? (dann dunkle Schrift auf der Sprechblase) */
  const light = (hex) => { const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || ''); if (!m) return false;
    const [r, g, b] = [m[1], m[2], m[3]].map((x) => parseInt(x, 16)); return (0.299 * r + 0.587 * g + 0.114 * b) > 170; };

  const ZPlus = {
    FEATURES, EXTRA, ACCENTS, WORLDS, TONES, sub: null, vouchers: [], offers: [], extra: false,
    here: '', rpc: null, fn: null, onChange: null,

    /** opts: { here: 'Messenger', rpc: async (fn, args) => Antwort } */
    init(opts) {
      Object.assign(this, opts || {});
      this.apply();
      if (this.active() && st.lock && st.pin) this.lockNow();
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') hiddenAt = Date.now();
        else { if (hiddenAt && Date.now() - hiddenAt > 30000 && this.active() && st.lock && st.pin) this.lockNow(); hiddenAt = 0; }
      });
      if (root.matchMedia) root.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => this.apply());
      if (this.rpc) this.load().catch(() => { });
      return this;
    },
    active() { return (st.until || 0) > Date.now(); },
    get(k, d) { return st[k] == null ? d : st[k]; },
    set(k, v) { st[k] = v; save(); this.apply(); if (this.onChange) this.onChange(k); },

    // ------------------------------------------------------------------------------------- Abo
    async load() {
      const r = await this.rpc('my_subscription', {});
      const x = (Array.isArray(r) ? r[0] : r) || {};
      const t = (s) => s ? Date.parse(s) : 0;
      this.sub = { plan: x.plan || null, source: x.source || '', ends: t(x.ends_at), active: !!x.active, offer: !!x.offer_available,
        canceled: t(x.canceled_at), offerUntil: t(x.offer_until), price: x.price_text || '4,99 € / Monat', buy: !!x.buy_available,
        paidPlan: x.paid_plan || null, paidStatus: x.paid_status || null, renews: t(x.renews_at), cancelAt: t(x.cancel_at), trialEnd: t(x.trial_end),
        trialUsed: !!x.trial_used, extra: !!x.extra_active, extraRenews: t(x.extra_renews_at), extraCancel: t(x.extra_cancel_at), testBuy: !!x.test_buy };
      st.until = this.sub.active ? this.sub.ends : 0; st.extra = this.sub.active;          // alles von „Extra" gehört jetzt zu Plus
      save(); this.apply();
      this.extra = !!st.extra;
      this.trialHint();
      if (this.onChange) this.onChange('sub');
      return this.sub;
    },
    async claim() { await this.rpc('claim_tester_plus', {}); return this.load(); },
    extraActive() { return this.active(); },
    async loadOffers() { try { const r = await this.rpc('plus_offers', {}); this.offers = Array.isArray(r) ? r.filter((o) => o.grants !== 'extra') : []; } catch (e) { } return this.offers; },
    async kasse(body) {
      const call = this.fn || ((n, b) => this.zidFn(b));
      const r = (await call('plus-kasse', body)) || {};
      if (r.error) throw new Error(r.error);
      return r;
    },
    /** Kaufen: sichere Stripe-Kasse im Browser öffnen. Nach dem Bezahlen schaltet der Server Plus frei. */
    async buy(plan, code) {
      const b = { action: 'kaufen', plan, age_ok: true };
      if (code) { b.code = String(code).trim().toUpperCase(); st.testerCode = b.code; save(); }
      const r = await this.kasse(b); if (!/^https:\/\//.test(r.url || '')) throw new Error('Die Kasse ließ sich nicht öffnen.'); root.open(r.url, '_blank'); },
    /** Bezahltes Abo kündigen (endet zum Ende der bezahlten Zeit). 'plus' kündigt Plus Extra mit. */
    async cancelPaid(what) { await this.kasse({ action: 'kuendigen', plan: what || 'plus' }); return this.load(); },
    async switchPlan(plan) { await this.kasse({ action: 'wechseln', plan }); await new Promise((r) => setTimeout(r, 2500)); return this.load(); },
    async manage() { const r = await this.kasse({ action: 'verwalten' }); if (/^https:\/\//.test(r.url || '')) root.open(r.url, '_blank'); },
    /** Probezeit endet in ≤ 3 Tagen → einmal am Tag erinnern */
    trialHint() {
      const s = this.sub; if (!s || s.paidStatus !== 'trialing' || s.cancelAt || this.hintsHold) return;      // anderer einmaliger Hinweis offen → danach
      const left = s.trialEnd - Date.now(), day = new Date().toISOString().slice(0, 10);
      if (left <= 0 || left > 3 * 864e5 || st.hintDay === day || document.getElementById('zp-hint')) return;
      const price = (this.offers.find((o) => o.id === s.paidPlan) || {}).price_text || '4,99 € / Monat';
      const ov = document.createElement('div'); ov.id = 'zp-hint'; ov.className = 'zp-hint';
      ov.innerHTML = `<div class="zp-dlgbox"><h3>✨ Deine Probezeit endet bald</h3><p class="small">Am ${esc(date(s.trialEnd))} endet deine kostenlose Probezeit von Zunora Plus. Danach wird das Abo automatisch bezahlt (${esc(price)}). Wenn du das nicht möchtest, kündige vorher unter Einstellungen → Zunora Plus.</p><button class="btn">Verstanden</button></div>`;
      document.body.appendChild(ov);
      const done = () => { st.hintDay = day; save(); ov.remove(); };
      ov.querySelector('.btn').onclick = done; ov.onclick = (e) => { if (e.target === ov) done(); };
    },
    async cancel() { await this.rpc('cancel_plus', {}); return this.load(); },
    async loadVouchers() { const r = await this.rpc('my_vouchers', {}); this.vouchers = Array.isArray(r) ? r : []; return this.vouchers; },

    // ------------------------------------------------------------------------------------- Aussehen
    apply() {
      const s = document.documentElement.style, on = this.active();
      const vars = ['--accent', '--accent2', '--blob1', '--blob2', '--blob3', '--bg', '--out', '--in', '--mebub', '--mebubfg', '--zpdim'];
      vars.forEach((v) => s.removeProperty(v));
      let bgEl = document.getElementById('zplus-bg');
      if (!on) { if (bgEl) bgEl.remove(); return; }
      if (st.accent) { s.setProperty('--accent', st.accent); s.setProperty('--accent2', `color-mix(in srgb, ${st.accent} 70%, #ffffff)`); }
      const w = WORLDS.find((x) => 'w:' + x.id === st.bg);
      // Extra dunkel (Messenger) bleibt schwarz: die Farbwelt färbt dann nur noch leicht
      const black = document.documentElement.classList.contains('zm-black');
      if (w && black) { ['--blob1', '--blob2', '--blob3'].forEach((v, k) => s.setProperty(v, `color-mix(in srgb, ${w.dark[k]} 38%, #000)`)); }
      else if (w) { const c = dark() ? w.dark : w.light; s.setProperty('--blob1', c[0]); s.setProperty('--blob2', c[1]); s.setProperty('--blob3', c[2]); s.setProperty('--bg', c[3]); }
      if (st.bubbleMine) { s.setProperty('--out', `color-mix(in srgb, ${st.bubbleMine} ${dark() ? 62 : 50}%, transparent)`);
        s.setProperty('--mebub', st.bubbleGrad === false ? st.bubbleMine : `linear-gradient(135deg, ${st.bubbleMine}, color-mix(in srgb, ${st.bubbleMine} 62%, #ffffff))`);
        s.setProperty('--mebubfg', light(st.bubbleMine) ? '#111827' : '#ffffff'); }
      else if (st.bubbleGrad === false) s.setProperty('--mebub', 'var(--accent)');
      s.setProperty('--zpdim', Math.max(document.documentElement.classList.contains('zm-black') ? 60 : 0, st.dim == null ? 35 : st.dim) + '%');
      if (st.bubbleOther) s.setProperty('--in', `color-mix(in srgb, ${st.bubbleOther} ${dark() ? 62 : 50}%, transparent)`);
      if (st.bg === 'img' && st.img) {
        if (!bgEl) { bgEl = document.createElement('div'); bgEl.id = 'zplus-bg'; document.body.prepend(bgEl); }
        bgEl.style.backgroundImage = `url("${st.img}")`;
      } else if (bgEl) bgEl.remove();
    },
    /** Bild (Datei oder KI) verkleinern und merken */
    async setImage(src) {
      const img = await new Promise((ok, bad) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = () => bad(new Error('Das Bild ließ sich nicht öffnen.')); i.src = src; });
      const f = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * f); c.height = Math.round(img.height * f); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      st.img = c.toDataURL('image/jpeg', 0.82); st.bg = 'img'; save(); this.apply();
    },
    async aiBackground(prompt) {
      const p = prompt + ', Bildschirm-Hintergrund, querformat, weiche Farben, ohne Text';
      const url = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(p) + '?width=1600&height=900&nologo=true&safe=true&seed=' + Math.floor(Math.random() * 999999);
      const r = await fetch(url); if (!r.ok) throw new Error('Der KI-Bilddienst antwortet gerade nicht. Bitte gleich noch einmal.');
      const b = await r.blob(); const u = URL.createObjectURL(b);
      try { await this.setImage(u); } finally { URL.revokeObjectURL(u); }
    },

    // ------------------------------------------------------------------------------------- Töne (Messenger)
    playTone(id, vol) {
      const t = TONES[id] || TONES.zunora;
      try {
        const ctx = new AudioContext();
        t.n.forEach(([f, at, d]) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = t.wave; o.frequency.value = f;
          g.gain.setValueAtTime(vol || 0.08, ctx.currentTime + at); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + d);
          o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + at); o.stop(ctx.currentTime + at + d + 0.02); });
        setTimeout(() => { try { ctx.close(); } catch (e) { } }, 2000);
      } catch (e) { }
    },
    /** gewählter Ton (nur mit Plus), sonst null = Standard */
    tone(kind) { return this.active() ? (st[kind] || null) : null; },

    // ------------------------------------------------------------------------------------- App-Sperre (PIN)
    async hash(pin) {
      if (!st.salt) { st.salt = Math.random().toString(36).slice(2) + Date.now().toString(36); save(); }
      const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(st.salt + '|' + pin));
      return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
    },
    async setPin(pin) { st.pin = await this.hash(pin); save(); },
    hasPin() { return !!st.pin; },
    async pinOk(pin) { return !!st.pin && (await this.hash(pin)) === st.pin; },
    lockNow() {
      if (document.getElementById('zplus-lock')) return;
      const el = document.createElement('div'); el.id = 'zplus-lock';
      el.innerHTML = `<div class="zp-lockbox"><div class="zp-lockic">🔒</div><h2>Gesperrt</h2><p class="muted">Mit deiner App-PIN entsperren.</p>
        <input id="zpPin" type="password" inputmode="numeric" maxlength="8" placeholder="App-PIN" autocomplete="off"><div id="zpPinMsg" class="small" style="color:var(--bad);min-height:18px"></div></div>`;
      document.body.appendChild(el);
      const inp = el.querySelector('#zpPin'); setTimeout(() => inp.focus(), 50);
      inp.oninput = async () => { inp.value = inp.value.replace(/\D/g, ''); if (inp.value.length >= 4 && await this.hash(inp.value) === st.pin) el.remove(); };
      inp.onkeydown = (e) => { if (e.key === 'Enter') el.querySelector('#zpPinMsg').textContent = 'Die PIN stimmt nicht.'; };
    },

    /** Server-Aufruf über die Zunora ID des Programms (Store, Wetter, Notizen …): Host-Befehl „zid.plus" */
    zidRpc(fn) {
      if (root.ZidUi && root.ZidUi.call) return root.ZidUi.call('zid.plus', { fn });
      if (root.Host && root.Host.available) return root.Host.call('zid.plus', { fn });
      return Promise.reject(new Error('Nur in der Zunora-App.'));
    },
    /** Kasse über die Zunora ID des Programms: Host-Befehl „zid.plusKasse" */
    zidFn(body) {
      if (root.ZidUi && root.ZidUi.call) return root.ZidUi.call('zid.plusKasse', body);
      if (root.Host && root.Host.available) return root.Host.call('zid.plusKasse', body);
      return Promise.reject(new Error('Nur in der Zunora-App.'));
    },
    /** Plus als eigenes Fenster über der App (für Apps ohne eigene Einstellungs-Seite dafür) */
    openDialog(opts) {
      let ov = document.getElementById('zplus-dlg');
      if (!ov) { ov = document.createElement('div'); ov.id = 'zplus-dlg'; document.body.appendChild(ov); }
      ov.innerHTML = `<div class="zp-dlgbox"><button class="zp-x" title="Schließen">✕</button><div class="zp-dlgbody"></div></div>`;
      const close = () => ov.remove();
      ov.querySelector('.zp-x').onclick = close;
      ov.addEventListener('mousedown', (e) => { if (e.target === ov) close(); });
      document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
      this.render(ov.querySelector('.zp-dlgbody'), opts);
    },

    // ------------------------------------------------------------------------------------- Plus-Seite
    /** Zeichnet die Plus-Seite in el. opts: { extra: () => html (nur diese App), wire: (el) => {} } */
    render(el, opts) {
      opts = opts || {};
      const s = this.sub, me = this;
      if (!s && this.rpc) this.load().then(() => this.render(el, opts)).catch((e) => { const l = el.querySelector('.zp-loading'); if (l) l.textContent = e.message || String(e); });
      let state = '';
      if (!this._offersAsked && this.rpc) { this._offersAsked = true; this.loadOffers().then(() => this.render(el, opts)); }
      const offerOf = (id) => this.offers.find((o) => o.id === id);
      const testerBox = (key, what) => `<div class="zp-tester"><b>🧪 Abo als Tester testen</b>
          <p class="small muted">Mit einem Tester-Code kannst du „${esc(what)}“ schon jetzt ausprobieren. Bezahlt wird im Testmodus mit einer Testkarte (steht in der Kasse unter „View Testing Instructions“) — es wird kein echtes Geld abgebucht.</p>
          <div class="zp-row"><input data-zpcode="${key}" maxlength="32" placeholder="Tester-Code (z. B. PLUS-AB12-CD34)" value="${esc(st.testerCode || '')}" style="flex:1;text-transform:uppercase"><button class="btn ghost" data-zp="${key}" ${(st.testerCode || '').length >= 6 ? '' : 'disabled'}>Als Tester testen</button></div></div>`;
      const buyBox = (ready, trial, key) => !ready ? `<button class="btn" disabled>Bald verfügbar</button>`
        : `<label class="small chk"><input type="checkbox" data-zpage="${key}"> <span>Ich bin mindestens 18 Jahre alt oder meine Eltern erlauben den Kauf.</span></label>
          <button class="btn" data-zp="${key}" disabled>${trial ? 'Kostenlos testen' : 'Weiter zur Kasse'}</button>
          <p class="small muted">Bezahlt wird sicher über Stripe — z. B. mit Karte, Google Pay, Apple Pay oder SEPA-Lastschrift. Kündigen jederzeit hier in den Einstellungen. <a href="${TERMS}" target="_blank" rel="noopener">Abo-Bedingungen</a></p>`;
      const plans = this.offers;
      if (!this._pick || !offerOf(this._pick)) this._pick = plans[0] ? plans[0].id : null;
      if (!s) state = '<p class="small muted zp-loading">Lädt …</p>';
      else if (s.active && s.source === 'paid') {
        const name = (offerOf(s.paidPlan) || {}).title || 'Zunora Plus';
        const line = s.paidStatus === 'past_due' ? '<span style="color:var(--warn,#ffb020)">Die letzte Zahlung hat nicht geklappt. Bitte unter „Zahlart &amp; Rechnungen“ die Zahlart prüfen — Plus bleibt noch ein paar Tage aktiv.</span>'
          : s.cancelAt ? `Gekündigt — Plus läuft noch bis ${esc(date(s.cancelAt))} und verlängert sich nicht mehr.`
          : s.paidStatus === 'trialing' ? `Kostenlose Probezeit bis ${esc(date(s.trialEnd))}. Danach wird automatisch bezahlt — außer du kündigst vorher.`
          : `Verlängert sich automatisch am ${esc(date(s.renews))}. Jederzeit kündbar.`;
        const ask = s.paidStatus === 'trialing' ? `Wirklich kündigen? Dann wird nichts abgebucht, und Plus endet am ${esc(date(s.trialEnd))}.` : `Wirklich kündigen? Plus läuft bis ${esc(date(s.renews))} weiter und verlängert sich dann nicht mehr.`;
        const other = this.offers.find((o) => o.id !== s.paidPlan && o.ready);          // Wechseln: Plus ⇄ Plus Extra
        state = `<p><b>✓ ${esc(name)}</b></p><p class="small">${line}</p><div class="zp-row"><button class="btn ghost" data-zp="manage">Zahlart &amp; Rechnungen</button>${other ? `<button class="btn ghost" data-zp="pswitch" data-plan="${esc(other.id)}">Zu „${esc(other.title)}“ wechseln (${esc(other.price_text)})</button>` : ''}${s.cancelAt ? '' : '<button class="btn ghost" data-zp="pcancel1">Abo kündigen</button>'}</div>
          <div id="zpPaidCancel" class="hidden"><p class="small">${ask}</p><div class="zp-row"><button class="btn ghost" data-zp="pkeep">Behalten</button><button class="btn danger" data-zp="pcancel">Ja, kündigen</button></div></div>`;
      }
      else if (s.active) state = `<p><b>✓ Aktiv bis ${esc(date(s.ends))}</b></p><p class="small muted">${s.source === 'tester' ? 'Dein Dankeschön fürs Testen. Danach läuft es einfach aus — kein Vertrag, nichts wird abgebucht.' : 'Kein Vertrag, nichts wird automatisch abgebucht.'}</p>
        <div id="zpCancelBox"><button class="btn ghost" data-zp="cancel1">Abo kündigen</button></div>`;
      else if (s.offer) state = `<p>Als Dankeschön fürs Testen bekommst du Zunora Plus 2 Monate kostenlos.</p><p class="small muted">Nur noch bis ${esc(date(s.offerUntil))} erhältlich. Danach läuft es einfach aus — kein Vertrag, nichts wird abgebucht. Jederzeit kündbar.</p>
        <button class="btn" data-zp="claim">Kostenlos aktivieren</button>`;
      else {
        const pick = offerOf(this._pick), trial = !!pick && pick.trial_days > 0 && !s.trialUsed;
        state = `${s.canceled ? `<p class="small muted">Gekündigt am ${esc(date(s.canceled))}.</p>` : s.ends ? `<p class="small muted">Dein Plus ist abgelaufen (bis ${esc(date(s.ends))}).</p>` : ''}
        ${plans.length ? plans.map((o) => { const tr = o.trial_days > 0 && !s.trialUsed;
          return `<button class="zp-offer ${o.id === this._pick ? 'on' : ''}" data-zppick="${esc(o.id)}"><span class="zp-orow"><b>${esc(o.title)}</b><b class="zp-price">${esc(o.price_text)}</b></span>
            <span class="small">${esc(o.subtitle)}</span><span class="small muted">${tr ? `${o.trial_days} Tage kostenlos testen, danach ${esc(o.price_text)}. Verlängert sich automatisch, monatlich kündbar.` : 'Monatlich kündbar.'}</span>
            ${o.grants === 'extra' ? `<span class="small" style="color:var(--accent)">Dazu: ${EXTRA.map(([, t]) => esc(t)).join(' · ')}</span>` : ''}</button>`; }).join('')
          : `<p><b>Zunora Plus · ${esc(s.price)}</b></p>`}
        ${buyBox(s.buy && plans.length && pick && pick.ready, trial, 'buy')}${!s.buy && s.testBuy && plans.length ? testerBox('tbuy', (pick || plans[0]).title) : ''}`;
      }
      const extraCard = EXTRA.length ? `<h3 class="zp-h">💎 Nur in Plus Extra</h3>${EXTRA.map(([ic, t, d]) => `<div class="zp-feat"><span class="zp-fic">${ic}</span><div><b>${t}</b><div class="small muted">${d}</div></div></div>`).join('')}` : '';
      const on = this.active();
      const colors = (sel, key, list) => `<div class="zp-colors">${list.map((c) => `<button class="zp-dot ${(st[key] || '') === c ? 'on' : ''}" data-zpc="${key}" data-c="${c}" style="background:${c || 'linear-gradient(135deg,#9b7bff,#5aa9ff)'}">${c ? '' : 'Z'}</button>`).join('')}</div>`;
      const worlds = `<div class="zp-worlds"><button class="zp-world ${!st.bg ? 'on' : ''}" data-zpw="" style="background:linear-gradient(135deg,var(--blob1),var(--blob2),var(--blob3))"><span>Zunora</span></button>${WORLDS.map((w) => { const c = dark() ? w.dark : w.light;
        return `<button class="zp-world ${st.bg === 'w:' + w.id ? 'on' : ''}" data-zpw="${w.id}" style="background:linear-gradient(135deg,${c[0]},${c[1]},${c[2]})"><span>${w.name}</span></button>`; }).join('')}</div>`;
      const own = st.accent && !ACCENTS.includes(st.accent);
      // Abschnitte einzeln — die Messenger-Einstellungen zeigen sie dort, wo sie hingehören (Darstellung, Datenschutz …)
      const SEC = {
        colors: () => `<div class="zp-sec"><h3>🎨 Zunora-Farbe</h3><p class="small muted">Für Knöpfe, Leisten, Akzente und deine Sprechblasen.</p>${colors(st.accent, 'accent', ACCENTS)}
          <p class="small muted" style="margin:10px 0 4px">Eigene Farbe${own ? ' <b style="color:var(--accent)">· gewählt</b>' : ''}</p>
          <div class="zp-row"><input type="range" id="zpHue" class="zp-hue" min="0" max="359" value="${hueOf(st.accent)}" title="Farbton"><input type="color" id="zpPick" class="zp-pick" value="${/^#[0-9a-f]{6}$/i.test(st.accent || '') ? st.accent : '#9b7bff'}" title="Genaue Farbe wählen"></div>
          <div class="zp-prev"><button class="btn" tabindex="-1">Knopf</button><span class="zp-pill">Neu</span><div class="bub me zp-pbub">So sieht es aus ✨</div></div></div>`,
        bg: () => `<div class="zp-sec"><h3>🖼 App-Hintergrund</h3><p class="small muted">${WORLDS.length} Farbwelten — passen sich hell und dunkel an.</p>${worlds}
          <div class="zp-row"><button class="btn ghost" data-zp="photo">📷 Eigenes Bild wählen</button>${st.bg === 'img' ? '<button class="btn ghost" data-zp="noimg">Bild entfernen</button>' : ''}</div>
          ${st.bg === 'img' ? `<p class="small muted" style="margin:8px 0 2px">Bild abdunkeln, damit Texte gut lesbar bleiben: <b id="zpDimV">${st.dim == null ? 35 : st.dim} %</b></p><input type="range" id="zpDim" min="0" max="80" value="${st.dim == null ? 35 : st.dim}" style="width:100%">` : ''}
          <p class="small muted" style="margin:8px 0 4px">Oder von der KI malen lassen:</p>
          <div class="zp-row"><input id="zpAi" placeholder="z. B. Sternenhimmel über Bergen, Aquarell" maxlength="200" style="flex:1"><button class="btn" data-zp="ai">✨ Erstellen</button></div>
          <div class="chips zp-ideas">${['Sternenhimmel über Bergen', 'Strand bei Sonnenuntergang', 'Bunte Aquarell-Blumen', 'Nordlichter über dem Meer', 'Ruhiger Wald im Nebel', 'Weltall mit Planeten'].map((t) => `<button class="chip" data-zpidea="${t}">${t}</button>`).join('')}</div>
          <p class="small muted">Die Beschreibung geht an den kostenlosen KI-Bilddienst Pollinations.</p></div>`,
        lock: () => `<div class="zp-sec"><h3>🔒 App-Sperre</h3>
          <label class="small chk"><input type="checkbox" id="zpLock" ${st.lock ? 'checked' : ''}> <span>Beim Öffnen mit App-PIN entsperren (auch nach 30 Sekunden im Hintergrund)</span></label>
          <p class="small muted">${st.pin ? 'App-PIN ist festgelegt — hier ändern:' : 'Lege zuerst eine App-PIN fest (4–8 Ziffern):'}</p>
          <div class="zp-row"><input id="zpNewPin" type="password" inputmode="numeric" maxlength="8" placeholder="Neue PIN" style="flex:1"><button class="btn ghost" data-zp="pin">Speichern</button></div></div>`,
        vouchers: () => `<div class="zp-sec"><h3>🎁 Gutscheine des Monats</h3><div id="zpVouchers" class="small muted">Lädt …</div></div>`,
      };
      if (opts.only) {
        // Nur einzelne Abschnitte (in den Einstellungen) — ohne Plus wird gar nichts gezeigt
        if (!on) { el.innerHTML = ''; return; }
        el.innerHTML = `<div class="zp-badge">✨ Zunora Plus</div>${opts.only.map((k) => SEC[k] ? SEC[k]() : '').join('')}${opts.extra ? opts.extra() : ''}<div class="small zp-msg"></div><input type="file" id="zpFile" accept="image/*" class="hidden">`;
      } else {
        const settings = on && opts.inSettings ? `<p class="small muted">Deine Plus-Funktionen findest du direkt in den Einstellungen — jeweils dort, wo sie hingehören.</p>${SEC.vouchers()}`
          : on ? `${SEC.colors()}${SEC.bg()}${SEC.lock()}${SEC.vouchers()}${opts.extra ? opts.extra() : ''}`
          : (s ? `<p class="small muted">${opts.inSettings ? 'Mit Plus erscheinen die Funktionen direkt in den Einstellungen.' : 'Die Einstellungen erscheinen hier, sobald Plus aktiv ist.'}</p>` : '');
        const feats = FEATURES.map(([ic, t, d, where]) => { const pl = on && opts.inSettings && opts.places ? opts.places[t] : '';
          return `<div class="zp-feat"><span class="zp-fic">${ic}</span><div><b>${t}</b><div class="small muted">${d}</div>${where ? `<div class="small ${where.includes(this.here) && !where.includes('Handy') ? 'zp-here' : 'zp-other'}">${where}</div>` : ''}${pl ? `<div class="small zp-here">Zu finden unter: ${pl}</div>` : ''}</div></div>`; }).join('');
        el.innerHTML = `<div class="zp-card"><div class="zp-top">✨ <b>Zunora Plus</b></div><p class="small muted" style="margin-top:2px">Ein Abo für alle Zunora-Apps — mit deiner Zunora ID.</p>${state}<div id="zpMsg" class="small zp-msg"></div></div>
          <h3 class="zp-h">Was Plus bringt</h3>${feats}${extraCard}${settings}<input type="file" id="zpFile" accept="image/*" class="hidden">`;
      }
      const msg = (t, bad) => { const m = el.querySelector('#zpMsg') || el.querySelector('.zp-msg'); if (m) { m.textContent = t; m.style.color = bad ? 'var(--bad)' : 'var(--accent)'; } };
      const run = async (fn, ok) => { try { await fn(); if (ok) msg(ok); } catch (e) { msg(e.message || String(e), true); } };
      const again = () => this.render(el, opts);
      el.querySelectorAll('[data-zp]').forEach((b) => b.onclick = async () => {
        const a = b.dataset.zp; b.disabled = true;
        if (a === 'claim') await run(async () => { await me.claim(); again(); }, '✨ Zunora Plus ist aktiv — danke fürs Testen!');
        if (a === 'cancel1') { el.querySelector('#zpCancelBox').innerHTML = `<p class="small">Wirklich kündigen? Plus endet sofort in allen Zunora-Apps. Das kostenlose Angebot kann man danach nicht noch einmal holen.</p>
          <div class="zp-row"><button class="btn ghost" data-zp2="keep">Behalten</button><button class="btn danger" data-zp2="cancel">Ja, kündigen</button></div>`;
          el.querySelector('[data-zp2="keep"]').onclick = again;
          el.querySelector('[data-zp2="cancel"]').onclick = () => run(async () => { await me.cancel(); again(); setTimeout(() => msg('Gekündigt — Plus ist jetzt aus.'), 30); }); }
        if (a === 'buy') await run(async () => { await me.buy(me._pick); }, 'Die Kasse ist im Browser offen. Nach dem Bezahlen ist Plus in ein paar Sekunden da.');
        if (a === 'xbuy') await run(async () => { await me.buy((me.offers.find((o) => o.grants === 'extra') || {}).id); }, 'Die Kasse ist im Browser offen. Nach dem Bezahlen ist Plus Extra in ein paar Sekunden da.');
        if (a === 'tbuy' || a === 'txbuy') { const inp = el.querySelector(`[data-zpcode="${a}"]`); const code = inp ? inp.value : '';
          await run(async () => { await me.buy(a === 'tbuy' ? me._pick : (me.offers.find((o) => o.grants === 'extra') || {}).id, code); }, 'Die Test-Kasse ist im Browser offen. Bezahle dort mit der Testkarte — danach ist Plus in ein paar Sekunden da.'); }
        if (a === 'manage') await run(() => me.manage());
        if (a === 'pswitch') await run(async () => { await me.switchPlan(b.dataset.plan); again(); }, '✓ Umgestellt. Der Unterschied wird anteilig verrechnet.');
        if (a === 'pcancel1') { el.querySelector('#zpPaidCancel').classList.remove('hidden'); b.classList.add('hidden'); }
        if (a === 'pkeep') { again(); return; }
        if (a === 'pcancel') await run(async () => { await me.cancelPaid('plus'); again(); setTimeout(() => msg('Gekündigt. Du bekommst keine weitere Abbuchung.'), 30); });
        if (a === 'xcancel1') { el.querySelector('#zpXBox').innerHTML = `<div class="zp-row"><button class="btn ghost" data-zp2="xkeep">Behalten</button><button class="btn danger" data-zp2="xcancel">Ja, Plus Extra kündigen</button></div>`;
          el.querySelector('[data-zp2="xkeep"]').onclick = again;
          el.querySelector('[data-zp2="xcancel"]').onclick = () => run(async () => { await me.cancelPaid('extra'); again(); setTimeout(() => msg('Plus Extra ist gekündigt.'), 30); }); }
        if (a === 'photo') el.querySelector('#zpFile').click();
        if (a === 'noimg') { st.bg = ''; st.img = ''; save(); me.apply(); again(); }
        if (a === 'ai') { const p = el.querySelector('#zpAi').value.trim(); if (p) { b.textContent = 'KI malt … (bis zu 1 Minute)'; await run(async () => { await me.aiBackground(p); again(); }); } }
        if (a === 'pin') { const p = el.querySelector('#zpNewPin').value.replace(/\D/g, ''); if (p.length < 4) msg('Die PIN braucht 4 bis 8 Ziffern.', true); else { await me.setPin(p); again(); setTimeout(() => msg('✓ App-PIN gespeichert'), 30); } }
        b.disabled = false;
      });
      el.querySelectorAll('[data-zpc]').forEach((b) => b.onclick = () => { me.set(b.dataset.zpc, b.dataset.c); again(); });
      el.querySelectorAll('[data-zppick]').forEach((b) => b.onclick = () => { me._pick = b.dataset.zppick; again(); });
      el.querySelectorAll('[data-zpcode]').forEach((i) => i.oninput = () => { i.value = i.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''); const k = el.querySelector(`[data-zp="${i.dataset.zpcode}"]`); if (k) k.disabled = i.value.length < 6; });
      el.querySelectorAll('[data-zpage]').forEach((c) => c.onchange = () => { const k = el.querySelector(`[data-zp="${c.dataset.zpage}"]`); if (k) k.disabled = !c.checked; });
      // zurück aus der Kasse → Stand neu laden
      if (!me._focusWired) { me._focusWired = true; root.addEventListener('focus', () => { if (me.rpc) me.load().catch(() => { }); }); }
      el.querySelectorAll('[data-zpidea]').forEach((b) => b.onclick = () => { const i = el.querySelector('#zpAi'); if (i) { i.value = b.dataset.zpidea + ', Aquarell'; i.focus(); } });
      const hue = el.querySelector('#zpHue'), pick = el.querySelector('#zpPick');
      if (hue) { hue.oninput = () => { const c = hsvHex(+hue.value, 0.62, 0.98); st.accent = c; save(); me.apply(); if (pick) pick.value = c; }; hue.onchange = () => { if (me.onChange) me.onChange('accent'); again(); }; }
      if (pick) { pick.oninput = () => { st.accent = pick.value; save(); me.apply(); }; pick.onchange = () => { if (me.onChange) me.onChange('accent'); again(); }; }
      const dim = el.querySelector('#zpDim');
      if (dim) dim.oninput = () => { st.dim = +dim.value; save(); me.apply(); const v = el.querySelector('#zpDimV'); if (v) v.textContent = dim.value + ' %'; };
      el.querySelectorAll('[data-zpw]').forEach((b) => b.onclick = () => { st.bg = b.dataset.zpw ? 'w:' + b.dataset.zpw : ''; save(); me.apply(); again(); });
      const f = el.querySelector('#zpFile'); if (f) f.onchange = () => { const file = f.files && f.files[0]; if (!file) return; const r = new FileReader(); r.onload = () => run(async () => { await me.setImage(r.result); again(); }); r.readAsDataURL(file); };
      const lk = el.querySelector('#zpLock'); if (lk) lk.onchange = () => { if (lk.checked && !st.pin) { lk.checked = false; msg('Lege zuerst eine App-PIN fest.', true); return; } st.lock = lk.checked; save(); };
      const vb = el.querySelector('#zpVouchers');
      if (vb) this.loadVouchers().then((list) => { vb.innerHTML = list.length ? list.map((v) => `<div class="zp-voucher"><b data-notr>${esc(v.title)}</b>${v.details ? `<div class="small muted" data-notr>${esc(v.details)}</div>` : ''}
        ${v.code ? `<div class="zp-row"><code data-notr>${esc(v.code)}</code><button class="btn ghost" data-copy="${esc(v.code)}">Kopieren</button></div>` : ''}<div class="small muted">Gültig bis ${esc(String(v.valid_until || '').split('-').reverse().join('.'))}</div></div>`).join('')
        : 'Diesen Monat gibt es noch keine Gutscheine — schau bald wieder rein.';
        vb.querySelectorAll('[data-copy]').forEach((b) => b.onclick = () => { navigator.clipboard.writeText(b.dataset.copy).catch(() => { }); b.textContent = '✓'; }); }).catch((e) => { vb.textContent = e.message || String(e); });
      if (opts.wire) opts.wire(el);
    },
  };
  root.ZPlus = ZPlus;
})(window);
