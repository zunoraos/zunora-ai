/* Zunora Plus im Messenger am PC: Sprechblasen-Farben, Klingelton, Benachrichtigungston, große Sticker-Auswahl + KI-Sticker,
 * eigene Navigationsleiste (rechte Maustaste oder lange drücken, höchstens 5). Gilt nur, solange Plus aktiv ist.
 * Gleiche Pakete wie am Handy (MPlus.kt). Die allgemeinen Plus-Teile kommen aus zplus.js. */
(function (root) {
  'use strict';
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const P = () => root.ZPlus;
  const on = () => !!(P() && P().active());

  // ------------------------------------------------------------------------------------- Sticker (Plus)
  const pack = (id, name, s, shift = 0) => ({ id, name, items: s.split(' ').filter(Boolean).map((e, i) => ({ s: e, w: '', c: (i + shift) % 6 })) });
  const PACKS = [
    pack('plus-gesichter', 'Gesichter+', '😁 😆 😅 🤣 😊 😍 🤩 😘 😜 🤪 🤗 🤭 🫢 🤫 😏 😬 🙄 😮 😲 🥺 😢 😤 🤬 😱 🥶 🥵 🤠 🥸 🤓 🧐 😵 🤐 🤢 🤮 🤧 😷 🫠 🫡 🫣 😶‍🌫️'),
    pack('plus-herzen', 'Herzen', '❤️ 🧡 💛 💚 💙 💜 🤎 🖤 🤍 💖 💗 💓 💞 💕 💘 💝 💟 ❣️ 💔 ❤️‍🔥 ❤️‍🩹 💌 💋 🌹', 1),
    pack('plus-haende', 'Hände', '👋 🤚 ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 👍 👎 ✊ 👊 👏 🙌 🫶 👐 🤲 🙏 ✍️ 💪', 2),
    pack('plus-tiere', 'Tiere+', '🐵 🐒 🦍 🐕 🐩 🐺 🐈 🐅 🐆 🐴 🦓 🦌 🐮 🐷 🐗 🐏 🐪 🦒 🐘 🦏 🐭 🐹 🐰 🐿️ 🦔 🦇 🐻 🐻‍❄️ 🦥 🦦 🦘 🐔 🐣 🦅 🦉 🦩 🦚 🦜 🐢 🐍 🐲 🦖 🐳 🐬 🦭 🐠 🦈 🦀 🐌 🐞', 3),
    pack('plus-essen', 'Essen', '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🥑 🥦 🌽 🥕 🥐 🥨 🧀 🥚 🍳 🥞 🧇 🥓 🍔 🍟 🌭 🌮 🌯 🥙 🍝 🍜 🍣 🍱 🥟 🍦 🍩 🍪 🎂 🍰 🧁 🍫 🍿 ☕ 🧋 🍺 🥂', 4),
    pack('plus-sport', 'Sport & Spiel', '⚽ 🏀 🏈 ⚾ 🎾 🏐 🏉 🎱 🏓 🏸 🥊 🥋 ⛳ ⛸️ 🎿 🏂 🏋️ 🤸 🚴 🏊 🏄 🧗 🏆 🥇 🥈 🥉 🎮 🕹️ 🎲 ♟️ 🎯 🎳 🧩', 5),
    pack('plus-reisen', 'Reisen', '🚗 🚕 🚌 🏎️ 🚓 🚑 🚒 🚚 🚲 🛵 🏍️ 🚂 🚆 ✈️ 🛫 🛬 🚀 🛸 🚁 ⛵ 🚢 🗺️ 🧭 🏔️ 🌋 🏕️ 🏖️ 🏝️ 🏰 🗼 🗽 🎡 🎢 🌅 🌄 🌃', 0),
    pack('plus-natur', 'Natur & Wetter', '🌸 🌼 🌻 🌺 🌷 🌱 🌿 🍀 🍁 🍂 🌵 🌴 🌲 🍄 🌍 🌙 ⭐ 🌟 ✨ ☀️ 🌤️ ⛅ 🌧️ ⛈️ 🌩️ ❄️ ☃️ 🌈 🔥 💧 🌊 🌪️', 1),
    pack('plus-party', 'Party', '🎉 🎊 🥳 🎈 🎁 🎀 🪅 🎆 🎇 🧨 🎄 🎃 👻 🎅 🤶 🐰 🥚 💐 🍾 🥂 🎵 🎶 🎤 🎧 🎸 🥁 🎷 🎺 💃 🕺', 2),
    pack('plus-fantasy', 'Fantasie', '🦄 🐉 🧚 🧜 🧞 🧙 🧛 🧟 👽 👾 🤖 👑 💎 🔮 🪄 🧿 🌌 🪐 ☄️ 🛸', 3),
    pack('plus-gefuehle', 'Gefühle', '🥰 😇 🙂 🙃 😉 😌 😋 😛 🤑 🤔 🫡 🤐 🤨 😐 😑 😶 🫥 😮‍💨 🤥 😔 😪 🤤 😷 🤒 🤕 🤢 🤮 🤧 🥴 😵‍💫 🤯 🥱 😳 🫣 😨 😰 😥 😭 😖 😣 😞 😓 😩 😫', 3),
    pack('plus-musik', 'Musik & Kunst', '🎵 🎶 🎤 🎧 🎼 🎹 🥁 🪘 🎷 🎺 🪗 🎸 🪕 🎻 🎬 🎨 🖌️ 🖍️ 🎭 🩰 📸 🎥 📽️ 🎞️ 📻 🎙️', 4),
    pack('plus-schule', 'Schule & Arbeit', '📚 📖 ✏️ 📝 🖊️ 📐 📏 🎒 🏫 🧮 💻 🖥️ ⌨️ 🖱️ 📊 📈 📅 📌 📎 🗂️ 💼 ☕ 🧑‍💻 🧑‍🏫 🧑‍🎓 ⏰ ✅ 🏢', 5),
    pack('plus-jahreszeiten', 'Jahreszeiten', '🌷 🐣 🌱 ☀️ 🏖️ 🍉 🍦 🌻 🍂 🍁 🎃 🌰 ❄️ ⛄ ☃️ 🎄 🧣 🧤 🌨️ 🌈 🌦️ ⛈️ 🌊 🏔️', 0),
    pack('plus-zeichen', 'Zeichen', '✨ ⭐ 🌟 💫 ⚡ 🔥 💥 💯 ✔️ ❌ ❓ ❗ ‼️ ⁉️ 💤 💬 💭 🗯️ ♻️ ⚠️ 🚫 🔞 🆗 🆒 🆕 🆓 🔝 ➡️ ⬅️ ⬆️ ⬇️ 🔄', 1),
    { id: 'plus-sprueche2', name: 'Sprüche 2', items: [['👋', 'Hallo!'], ['🙏', 'Danke!'], ['😂', 'Haha!'], ['😍', 'Wie schön!'], ['🎂', 'Alles Gute!'], ['🎉', 'Glückwunsch!'],
      ['🤝', 'Abgemacht'], ['🍕', 'Essen?'], ['🚗', 'Bin gleich da'], ['🛌', 'Gute Nacht'], ['☀️', 'Guten Morgen'], ['💪', 'Du schaffst das!']].map(([s, w], i) => ({ s, w, c: i % 6 })) },
    { id: 'plus-sprueche', name: 'Sprüche+', items: [['😘', 'Kuss!'], ['🤗', 'Drück dich'], ['😴', 'Bin müde'], ['🏃', 'Bin unterwegs'], ['🍻', 'Prost!'], ['🎂', 'Alles Gute!'],
      ['🤒', 'Gute Besserung'], ['🍀', 'Viel Glück!'], ['😅', 'Sorry!'], ['🙌', 'Super!'], ['🤷', 'Keine Ahnung'], ['👀', "Ich seh's"],
      ['📞', 'Ruf mich an'], ['⏳', 'Moment …'], ['✅', 'Erledigt'], ['🥰', 'Vermiss dich'], ['🌞', 'Schönes Wochenende'], ['😂', 'Ich kann nicht mehr']].map(([s, w], i) => ({ s, w, c: i % 6 })) },
  ];
  const count = PACKS.reduce((n, p) => n + p.items.length, 0);

  /** KI-Sticker (Pollinations, kostenlos). Ergebnis: Data-URL (JPEG, 512 px). */
  async function aiSticker(prompt) {
    const p = prompt + ', niedlicher Sticker, dicker weißer Rand, einfarbiger heller Hintergrund, Comic-Stil, ohne Text';
    const r = await fetch('https://image.pollinations.ai/prompt/' + encodeURIComponent(p) + '?width=512&height=512&nologo=true&safe=true&seed=' + Math.floor(Math.random() * 999999));
    if (!r.ok) throw new Error('Der KI-Bilddienst antwortet gerade nicht. Bitte gleich noch einmal.');
    const blob = await r.blob();
    return await new Promise((ok) => { const f = new FileReader(); f.onload = () => ok(f.result); f.readAsDataURL(blob); });
  }
  function myAi() { try { return JSON.parse(localStorage.getItem('zm-ki-sticker') || '[]') || []; } catch (e) { return []; } }
  function keepAi(url) { const l = [url, ...myAi().filter((x) => x !== url)].slice(0, 24); try { localStorage.setItem('zm-ki-sticker', JSON.stringify(l)); } catch (e) { } }
  function fileOf(dataUrl) {
    const [h, b] = dataUrl.split(','); const bin = atob(b); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return new File([a], 'ki-sticker.jpg', { type: (h.match(/data:([^;]+)/) || [])[1] || 'image/jpeg' });
  }

  // ------------------------------------------------------------------------------------- Navigationsleiste
  const TABS = [['chats', 'chat', 'Chats'], ['calls', 'phone', 'Anrufe'], ['server', 'server', 'Server'], ['friends', 'friends', 'Freunde'], ['notizen', 'pin', 'Notizen'], ['plus', 'sparkle', 'Plus'], ['settings', 'settings', 'Mehr']];
  const DEFAULT = ['chats', 'calls', 'server', 'friends', 'settings'];
  const MAX = 5;
  function tabs() {
    if (!on()) return DEFAULT;
    const t = String(P().get('nav', '')).split(',').filter((k) => TABS.some((x) => x[0] === k));
    return !t.length || !t.includes('settings') ? DEFAULT : [...new Set(t)].slice(0, MAX);
  }
  function navEditor(box, done) {
    let list = tabs(); let msg = '';
    const draw = () => {
      box.innerHTML = `<h3>Navigationsleiste bearbeiten</h3><p class="small muted">Höchstens ${MAX} Reiter. „Mehr“ bleibt immer drin.</p><div class="zp-navedit">${TABS.map(([k, ic, n]) => {
        const i = list.indexOf(k), sel = i >= 0;
        return `<div class="zp-ne ${sel ? 'on' : ''}">${root.ZMI.svg(ic, 18)}<span class="t">${n}</span>${sel && i > 0 ? `<button class="ico" data-up="${k}" title="Nach oben">↑</button>` : ''}${sel && i < list.length - 1 ? `<button class="ico" data-down="${k}" title="Nach unten">↓</button>` : ''}
          ${k !== 'settings' ? `<input type="checkbox" data-tg="${k}" ${sel ? 'checked' : ''}>` : ''}</div>`; }).join('')}</div>
        <div class="small" style="color:var(--bad);min-height:18px">${esc(msg)}</div>
        <div class="rowb"><button class="btn ghost" data-std>Standard</button><button class="btn ghost" data-close>Abbrechen</button><button class="btn" data-ok>Fertig</button></div>`;
      box.querySelectorAll('[data-up]').forEach((b) => b.onclick = () => { const i = list.indexOf(b.dataset.up); list.splice(i - 1, 0, list.splice(i, 1)[0]); draw(); });
      box.querySelectorAll('[data-down]').forEach((b) => b.onclick = () => { const i = list.indexOf(b.dataset.down); list.splice(i + 1, 0, list.splice(i, 1)[0]); draw(); });
      box.querySelectorAll('[data-tg]').forEach((c) => c.onchange = () => { const k = c.dataset.tg; msg = '';
        if (!c.checked) list = list.filter((x) => x !== k);
        else if (list.length >= MAX) { msg = 'Höchstens 5 — nimm erst einen anderen heraus.'; }
        else { const i = list.indexOf('settings'); list.splice(i >= 0 ? i : list.length, 0, k); }
        draw(); });
      box.querySelector('[data-std]').onclick = () => { list = DEFAULT.slice(); draw(); };
      box.querySelector('[data-close]').onclick = () => done(false);
      box.querySelector('[data-ok]').onclick = () => { P().set('nav', list.join(',')); done(true); };
    };
    draw();
  }

  // ------------------------------------------------------------------------------------- Plus-Seite: Messenger-Teil
  const TONE_IDS = () => Object.keys(P().TONES);
  // Farben für Sprechblasen (wie am Handy, MPlus.BUBBLES) und fertige Farbsets: [Name, eigene, andere]
  const BUBBLES = ['', '#9b7bff', '#7c5cff', '#5aa9ff', '#2f7bff', '#22c3ee', '#14b8a6', '#25d366', '#2fbf71', '#a3d93b', '#ffd84d', '#ffc23d', '#ff9f43',
    '#ff7a45', '#ff6b6b', '#e0475b', '#ff7ad9', '#c04cff', '#b08968', '#6b7280', '#374151', '#111827', '#f3f4f6', '#ffffff'];
  const SETS = [['Zunora', '', ''], ['Ozean', '#2f7bff', '#0e3a5c'], ['Sonnenuntergang', '#ff7a45', '#5a1e3a'], ['Wald', '#2fbf71', '#1f3a2e'],
    ['Bonbon', '#ff7ad9', '#7c5cff'], ['Klassisch grün', '#25d366', '#374151'], ['Mitternacht', '#374151', '#111827'], ['Gold', '#ffc23d', '#5a3a00']];
  /** Wo steht welche Plus-Funktion in den Einstellungen? (für die Plus-Seite) */
  const PLACES = { 'Zunora-Farben ändern': 'Einstellungen → Darstellung & Energie', 'App-Hintergrund': 'Einstellungen → Darstellung & Energie',
    'Navigationsleiste bearbeiten': 'Einstellungen → Darstellung & Energie', 'App-Sperre': 'Einstellungen → Datenschutz', 'Nutzername öfter ändern': 'Einstellungen → Konto',
    'Sprechblasen-Farben': 'Einstellungen → Chats', 'Benachrichtigungston': 'Einstellungen → Chats', 'Riesige Sticker-Auswahl': 'Einstellungen → Chats' };
  const grad = (c) => c ? `linear-gradient(135deg, ${c}, color-mix(in srgb, ${c} 62%, #ffffff))` : 'linear-gradient(135deg,#9b7bff,#5aa9ff)';

  /** Plus-Teil in Einstellungen → Chats: Sprechblasen, Ton, Sticker */
  function chatSettings() {
    const z = P();
    const dots = (key) => `<div class="zp-colors">${BUBBLES.map((c) =>
      `<button class="zp-dot ${(z.get(key, '') || '') === c ? 'on' : ''}" data-zmb="${key}" data-c="${c}" style="background:${c || 'linear-gradient(135deg,#9b7bff,#5aa9ff)'}">${c ? '' : 'Z'}</button>`).join('')}</div>`;
    const sel = (key) => `<select data-zmt="${key}"><option value="">Standard</option>${TONE_IDS().map((id) => `<option value="${id}" ${z.get(key, '') === id ? 'selected' : ''}>${esc(z.TONES[id].name)}</option>`).join('')}</select>`;
    const mine = z.get('bubbleMine', ''), other = z.get('bubbleOther', '');
    return `<div class="zp-sec"><h3>💬 Sprechblasen-Farben</h3><p class="small muted">Fertige Farbsets</p>
        <div class="zp-sets">${SETS.map(([n, a, b], i) => `<button class="zp-set ${mine === a && other === b ? 'on' : ''}" data-zmset="${i}"><i style="background:${b || 'var(--in)'}"></i><i class="m" style="background:${grad(a)}"></i><span>${esc(n)}</span></button>`).join('')}</div>
        <p class="small muted">Deine Nachrichten</p>${dots('bubbleMine')}<p class="small muted">Nachrichten der anderen</p>${dots('bubbleOther')}
        <label class="small chk" style="margin-top:8px"><input type="checkbox" id="zmGrad" ${z.get('bubbleGrad', true) !== false ? 'checked' : ''}> <span><b>Farbverlauf</b> — deine Blasen schimmern von der Farbe ins Helle. Aus = einfarbig.</span></label>
        <div class="zp-prev" style="flex-direction:column;align-items:stretch;gap:6px"><div class="bub" style="align-self:flex-start">Hallo! 👋</div><div class="bub me" style="align-self:flex-end;margin-left:0">Hi, wie geht's? 😊</div><div class="bub" style="align-self:flex-start">Super, danke!</div></div></div>
      <div class="zp-sec"><h3>🔔 Benachrichtigungston</h3><p class="small muted">Für neue Nachrichten. Den Klingelton für Anrufe wählst du unter Einstellungen → Anrufe.</p>
        <div class="zp-row"><span style="flex:1">Ton</span>${sel('notif')}<button class="btn ghost" data-zmplay="notif">▶</button></div></div>
      <div class="zp-sec"><h3>🧩 Sticker</h3><p class="small muted">${PACKS.length} zusätzliche Sticker-Pakete mit ${count} Stickern sind freigeschaltet — im Chat unter 🧩. Dort malt dir die KI unter „✨ KI“ auch eigene Sticker.</p>
        <div class="chips">${PACKS.map((p) => `<span class="chip">${p.items[0].s} ${esc(p.name)}</span>`).join('')}</div></div>`;
  }
  /** Plus-Teil in Einstellungen → Darstellung: Navigationsleiste */
  function navSetting() {
    return `<div class="zp-sec"><h3>🧭 Navigationsleiste</h3><p class="small muted">Rechte Maustaste oder lange auf die Leiste links drücken — oder hier:</p><button class="btn ghost" data-zmnav>Leiste bearbeiten</button></div>`;
  }
  /** alt: alles auf der Plus-Seite (nicht mehr genutzt — Plus steht jetzt in den Einstellungen) */
  function extra() { return `<h3 class="zp-h">Nur im Zunora Messenger</h3>${chatSettings()}${navSetting()}`; }
  function wire(el, rerender, openNav) {
    el.querySelectorAll('[data-zmb]').forEach((b) => b.onclick = () => { P().set(b.dataset.zmb, b.dataset.c); rerender(); });
    el.querySelectorAll('[data-zmt]').forEach((s) => s.onchange = () => { P().set(s.dataset.zmt, s.value); if (s.value) P().playTone(s.value); });
    el.querySelectorAll('[data-zmplay]').forEach((b) => b.onclick = () => P().playTone(P().get(b.dataset.zmplay, '') || 'zunora'));
    el.querySelectorAll('[data-zmset]').forEach((b) => b.onclick = () => { const [, a, c] = SETS[+b.dataset.zmset]; P().set('bubbleMine', a); P().set('bubbleOther', c); rerender(); });
    const g = el.querySelector('#zmGrad'); if (g) g.onchange = () => { P().set('bubbleGrad', g.checked); };
    const n = el.querySelector('[data-zmnav]'); if (n) n.onclick = openNav;
  }

  root.ZMPlus = { PACKS, count, chatSettings, navSetting, PLACES, aiSticker, myAi, keepAi, fileOf, TABS, DEFAULT, MAX, tabs, navEditor, extra, wire, on };
})(window);
