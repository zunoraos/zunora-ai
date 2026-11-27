/* Zunora Messenger am PC — Ausbau: Sticker (dieselben Sets wie am Handy, MAusbau.kt), Melde-Gründe. */
(function (root) {
  'use strict';
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const COLORS = [['#6A4BFF', '#FF7AD9'], ['#14B8A6', '#4EA0FF'], ['#FF9F43', '#FF7AD9'], ['#2FBF71', '#14B8A6'], ['#4EA0FF', '#6A4BFF'], ['#E05252', '#FF9F43']];
  const em = (list, shift) => list.map((s, i) => ({ s, w: '', c: (i + shift) % 6 }));
  const PACKS = [
    { id: 'gefuehle', name: 'Gefühle', items: em(['😀', '😂', '🥰', '😎', '🤔', '😴', '😭', '😡', '🥳', '🤯', '😇', '🙈'], 0) },
    { id: 'tiere', name: 'Tiere', items: em(['🐶', '🐱', '🦊', '🐼', '🐨', '🦁', '🐸', '🐧', '🦄', '🐙', '🐝', '🦋'], 2) },
    { id: 'sprueche', name: 'Sprüche', items: [['👋', 'Hallo!'], ['☀️', 'Guten Morgen'], ['🌙', 'Gute Nacht'], ['🙏', 'Danke!'], ['🎉', 'Glückwunsch!'], ['❤️', 'Hab dich lieb'],
      ['👍', 'Passt!'], ['⏰', 'Bin gleich da'], ['😂', 'Haha'], ['🍕', 'Essen?'], ['💪', 'Du schaffst das'], ['🤝', 'Abgemacht']].map(([s, w], i) => ({ s, w, c: i % 6 })) },
  ];
  /** Sticker aus einer (fremden) Nachricht — Werte begrenzt. */
  const ANIMS = ['hops', 'wackel', 'puls', 'dreh', 'schweb', 'herz', 'wobbel', 'schuettel', 'tanz', 'blink'];
  function of(c) { if (!c || !c.s) return null; return { s: String(c.s).slice(0, 16), w: String(c.w || '').slice(0, 40), c: Math.max(0, Math.min(5, Number(c.c) || 0)), a: ANIMS.includes(c.a) ? c.a : '' }; }
  /** Sticker: nur der Sticker selbst — ausgeschnitten mit weißem Rand, ohne Farbfläche; bewegte Sticker mit Animation (wie am Handy) */
  function html(st, size = 128, tile) {
    const [a] = COLORS[st.c] || COLORS[0];
    return `<div class="sticker2 ${tile ? 'tile' : ''}" style="width:${size}px;height:${size}px"><div class="stk ${st.a ? 'a-' + st.a : ''}">
      <span class="stk-e" style="font-size:${Math.round(size * (st.w ? 0.5 : 0.66))}px">${esc(st.s)}</span>${st.w ? `<b class="stk-w" style="font-size:${Math.round(size * 0.12)}px;color:${a}">${esc(st.w)}</b>` : ''}</div></div>`;
  }
  const mv = (id, name, l) => ({ id, name, items: l.map(([s, a], i) => ({ s, w: '', c: i % 6, a })) });
  const MOVING = [
    mv('b-gefuehle', '✨ Gefühle', [['😂', 'wackel'], ['🤣', 'schuettel'], ['😍', 'herz'], ['🥰', 'puls'], ['😘', 'hops'], ['😎', 'tanz'], ['🤩', 'dreh'], ['🥳', 'tanz'], ['😭', 'schuettel'], ['😡', 'schuettel'], ['🤯', 'puls'], ['😴', 'schweb'], ['🤔', 'wackel'], ['🙄', 'wackel'], ['😇', 'schweb'], ['🫠', 'wobbel']]),
    mv('b-liebe', '✨ Liebe', [['❤️', 'herz'], ['💖', 'puls'], ['💕', 'schweb'], ['💘', 'hops'], ['💝', 'wackel'], ['💗', 'herz'], ['💓', 'herz'], ['💞', 'dreh'], ['😻', 'hops'], ['🥰', 'puls'], ['💋', 'puls'], ['🌹', 'wackel'], ['💌', 'schweb'], ['🫶', 'puls'], ['❤️‍🔥', 'wobbel'], ['💑', 'hops']]),
    mv('b-party', '✨ Party', [['🎉', 'schuettel'], ['🎊', 'dreh'], ['🥳', 'tanz'], ['🎈', 'schweb'], ['🎁', 'hops'], ['🎂', 'wackel'], ['🍾', 'schuettel'], ['🥂', 'wackel'], ['🪩', 'dreh'], ['💃', 'tanz'], ['🕺', 'tanz'], ['🎆', 'puls'], ['🎶', 'schweb'], ['🪅', 'wackel'], ['🎤', 'hops'], ['🤩', 'blink']]),
    mv('b-tiere', '✨ Tiere', [['🐶', 'hops'], ['🐱', 'wackel'], ['🐰', 'hops'], ['🦊', 'wackel'], ['🐼', 'wobbel'], ['🐨', 'schweb'], ['🐸', 'hops'], ['🐧', 'tanz'], ['🦄', 'schweb'], ['🐙', 'wobbel'], ['🐝', 'schweb'], ['🦋', 'schweb'], ['🐢', 'wackel'], ['🐳', 'schweb'], ['🦖', 'schuettel'], ['🐥', 'hops']]),
    mv('b-haende', '✨ Hände', [['👋', 'wackel'], ['👍', 'hops'], ['👏', 'puls'], ['🙌', 'hops'], ['🤞', 'wackel'], ['✌️', 'wackel'], ['🤙', 'wackel'], ['💪', 'puls'], ['🙏', 'puls'], ['👊', 'schuettel'], ['🤝', 'puls'], ['👌', 'hops'], ['🫡', 'wackel'], ['✍️', 'wackel'], ['🫰', 'puls'], ['🤘', 'tanz']]),
    mv('b-essen', '✨ Essen', [['🍕', 'dreh'], ['🍔', 'hops'], ['🍟', 'wackel'], ['🌮', 'wackel'], ['🍣', 'schweb'], ['🍩', 'dreh'], ['🍦', 'wobbel'], ['🎂', 'hops'], ['☕', 'schweb'], ['🧋', 'wackel'], ['🍉', 'wackel'], ['🍓', 'puls'], ['🥑', 'hops'], ['🍿', 'schuettel'], ['🍪', 'dreh'], ['🍻', 'wackel']]),
    mv('b-wetter', '✨ Wetter & Natur', [['☀️', 'dreh'], ['🌈', 'schweb'], ['⛈️', 'schuettel'], ['❄️', 'dreh'], ['🌙', 'schweb'], ['⭐', 'blink'], ['✨', 'blink'], ['🔥', 'wobbel'], ['🌸', 'dreh'], ['🌻', 'wackel'], ['🍀', 'dreh'], ['🌊', 'schweb'], ['⚡', 'blink'], ['☃️', 'wackel'], ['🌪️', 'dreh'], ['💧', 'hops']]),
    { id: 'b-sprueche', name: '✨ Sprüche', items: [['👋', 'Hallo!', 'wackel'], ['😘', 'Kuss!', 'herz'], ['🎉', 'Glückwunsch!', 'schuettel'], ['🙏', 'Danke!', 'puls'], ['😂', 'Ich kann nicht mehr', 'wackel'], ['😴', 'Gute Nacht', 'schweb'], ['☀️', 'Guten Morgen', 'dreh'], ['💪', 'Du schaffst das!', 'puls'],
      ['🤗', 'Drück dich', 'puls'], ['⏰', 'Bin gleich da', 'schuettel'], ['🍕', 'Essen?', 'hops'], ['🥳', 'Party!', 'tanz'], ['❤️', 'Hab dich lieb', 'herz'], ['👀', "Ich seh's", 'blink'], ['🤝', 'Abgemacht', 'puls'], ['😅', 'Sorry!', 'wobbel']].map(([s, w, a], i) => ({ s, w, c: i % 6, a })) },
  ];
  /** Nachricht nur aus 1–3 Emojis? → Anzahl (sonst 0): dann groß und ohne Sprechblase */
  function emojiOnly(t) {
    t = String(t || '').trim(); if (!t || t.length > 40) return 0;
    const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? [...new Intl.Segmenter('de', { granularity: 'grapheme' }).segment(t)].map((x) => x.segment).filter((x) => x.trim()) : [...t];
    if (seg.length > 3) return 0;
    return seg.every((g) => /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(g)) ? seg.length : 0;
  }
  function recent() { try { return (JSON.parse(localStorage.getItem('zm-sticker-zuletzt') || '[]') || []).map(of).filter(Boolean); } catch (e) { return []; } }
  function used(st) { const l = [st, ...recent().filter((x) => !(x.s === st.s && x.w === st.w && x.c === st.c))].slice(0, 12); localStorage.setItem('zm-sticker-zuletzt', JSON.stringify(l)); }

  const REPORT_REASONS = ['Spam oder Betrug', 'Belästigung oder Mobbing', 'Hass, Hetze oder Gewalt', 'Nacktheit oder sexuelle Inhalte', 'Gefahr für Kinder', 'Illegale Inhalte', 'Etwas anderes'];

  /** Ausschnitt um den Suchtreffer. */
  function snippet(text, q) {
    const t = String(text || '').replace(/\n/g, ' '); const i = t.toLowerCase().indexOf(String(q || '').trim().toLowerCase());
    if (i < 0 || t.length <= 90) return t;
    const from = Math.max(0, i - 30);
    return (from > 0 ? '…' : '') + t.slice(from, from + 90) + (from + 90 < t.length ? '…' : '');
  }

  root.ZMX = { PACKS, MOVING, COLORS, of, html, emojiOnly, recent, used, REPORT_REASONS, snippet };
})(window);
