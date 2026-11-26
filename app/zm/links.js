/* Zunora Messenger — Links im Chat (25.11.2026):
   • Links in Nachrichten sind anklickbar und öffnen sich direkt im Messenger (PC: eigenes Link-Fenster; iPhone-Web-App: Seitenansicht).
   • Link-Warnung: verdächtige Links (nachgemachte Bank/Paketdienst, versteckte Adresse, Programm-Download …) → erst ein Hinweis.
   • Link-Vorschau: der ABSENDER holt Titel/Bild der Seite und schickt sie verschlüsselt mit (Feld „lp“), Empfänger laden nichts.
   Gleiche Regeln wie am Handy (MLinks.kt / MLinkPreview.kt). */
(function (root) {
  'use strict';
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const T = (s) => (root.ZLang && root.ZLang.t ? root.ZLang.t(s) : s);
  const RX = /\b(?:https?:\/\/|www\.)[^\s<>"'`]+/gi;
  const TRAIL = '.,;:!?\'"»“”‘’…';
  const count = (s, ch) => s.split(ch).length - 1;

  /** Seitenname aus einer Adresse */
  function hostOf(url) {
    const rest = String(url).split('://')[1] || '';
    return rest.split('/')[0].split('?')[0].split('#')[0].split('@').pop().split(':')[0].toLowerCase();
  }
  const host = (url) => hostOf(url).replace(/^www\./, '') || url;

  /** Fundstellen: [{start, end, url}] — Satzzeichen am Ende gehören nicht dazu, „www.“ wird zu https:// */
  function find(text) {
    const out = []; const t = String(text ?? ''); RX.lastIndex = 0; let m;
    while ((m = RX.exec(t))) {
      let s = m[0];
      for (;;) {
        const l = s.slice(-1);
        if (l && TRAIL.includes(l)) s = s.slice(0, -1);
        else if (l === ')' && count(s, '(') < count(s, ')')) s = s.slice(0, -1);
        else if (l === ']' && count(s, '[') < count(s, ']')) s = s.slice(0, -1);
        else if (l === '}' && count(s, '{') < count(s, '}')) s = s.slice(0, -1);
        else break;
      }
      const url = /^www\./i.test(s) ? 'https://' + s : s, h = hostOf(url);
      if (h.length >= 3 && h.includes('.') && !h.startsWith('.') && !h.endsWith('.')) out.push({ start: m.index, end: m.index + s.length, url });
    }
    return out;
  }

  // =========================================================================================== Link-Warnung
  const SHORT = new Set(['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'is.gd', 'ow.ly', 'buff.ly', 'rebrand.ly', 'cutt.ly', 'shorturl.at', 'tiny.cc', 's.id', 'rb.gy', 't.ly', 'bit.do', 'lnkd.in', 'shorte.st', 'adf.ly']);
  const BAD_TLD = new Set(['zip', 'mov', 'tk', 'ml', 'ga', 'cf', 'gq']);
  const PROGRAM = /\.(apk|exe|msi|bat|cmd|scr|vbs|jar|ps1|dmg|pkg|xapk|apks)$/i;
  const TWO_LEVEL = new Set(['co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'com.au', 'co.at', 'or.at', 'gv.at', 'com.br', 'co.jp', 'com.tr', 'co.nz', 'co.za', 'github.io', 'com.mx', 'com.pl']);
  const BRANDS = [
    ['paypal', 'PayPal', ['paypal.com', 'paypal.de', 'paypal.me', 'paypalobjects.com']],
    ['amazon', 'Amazon', ['amazon.de', 'amazon.com', 'amazon.at', 'amazon.co.uk', 'amazon.fr', 'amazon.it', 'amazon.es', 'amazon.nl', 'amazon.pl', 'amzn.to', 'amzn.eu', 'media-amazon.com']],
    ['sparkasse', 'Sparkasse', ['sparkasse.de', 'sparkasse.at']],
    ['dhl', 'DHL', ['dhl.de', 'dhl.com']],
    ['postbank', 'Postbank', ['postbank.de']],
    ['commerzbank', 'Commerzbank', ['commerzbank.de', 'commerzbank.com']],
    ['deutschebank', 'Deutsche Bank', ['deutsche-bank.de', 'db.com']],
    ['apple', 'Apple', ['apple.com', 'icloud.com', 'apple.de']],
    ['icloud', 'iCloud', ['icloud.com', 'apple.com']],
    ['microsoft', 'Microsoft', ['microsoft.com', 'live.com', 'office.com', 'microsoftonline.com', 'office365.com', 'microsoft.de']],
    ['netflix', 'Netflix', ['netflix.com']],
    ['ebay', 'eBay', ['ebay.de', 'ebay.com', 'ebay.at', 'ebay.co.uk']],
    ['klarna', 'Klarna', ['klarna.com', 'klarna.de']],
    ['whatsapp', 'WhatsApp', ['whatsapp.com', 'whatsapp.net', 'wa.me']],
    ['instagram', 'Instagram', ['instagram.com']],
    ['facebook', 'Facebook', ['facebook.com', 'fb.com', 'fb.me', 'meta.com']],
    ['telekom', 'Telekom', ['telekom.de', 'telekom.com', 't-online.de']],
    ['vodafone', 'Vodafone', ['vodafone.de', 'vodafone.com']],
    ['dpd', 'DPD', ['dpd.de', 'dpd.com']],
    ['zunora', 'Zunora', ['zunoraos.github.io', 'zunora.de']],
  ];
  function siteOf(h) {
    const l = h.replace(/\.+$/, '').split('.').filter(Boolean);
    if (l.length <= 2) return l.join('.');
    const two = l.slice(-2).join('.');
    return TWO_LEVEL.has(two) ? l.slice(-3).join('.') : two;
  }
  const norm = (s) => s.toLowerCase().replace(/0/g, 'o').replace(/1/g, 'l').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't').replace(/rn/g, 'm').replace(/vv/g, 'w');
  /** Prüft einen Link (nur hier, nichts geht ins Internet) → {danger, reasons[]} */
  function risk(url) {
    const r = []; let danger = false; const u = String(url);
    const after = u.split('://')[1] || '';
    const authority = after.split('/')[0].split('?')[0].split('#')[0];
    const h = hostOf(u);
    const path = (after.includes('/') ? after.slice(after.indexOf('/') + 1) : '').split('?')[0].split('#')[0];
    if (authority.includes('@')) { danger = true; r.push(T('Der Link versteckt die echte Adresse hinter einem „@“. Er führt zu: {0}').replace('{0}', h)); }
    if (h.includes('xn--')) { danger = true; r.push(T('Der Name enthält fremde Schriftzeichen, die wie normale Buchstaben aussehen können.')); }
    const site = siteOf(h);
    const pre = h.endsWith(site) ? h.slice(0, h.length - site.length).replace(/\.+$/, '') : '';
    const tokens = (pre + '.' + site.split('.')[0]).split(/[.\-_]/).filter(Boolean).map(norm), joined = tokens.join('');
    for (const [key, name, real] of BRANDS) {
      const hit = tokens.some((t) => t.startsWith(key)) || (key.length >= 6 && joined.includes(key));
      if (hit && !real.includes(site)) { danger = true; r.push(T('Sieht aus wie „{0}“, gehört aber nicht zu {0} (echte Seite: {1}).').split('{0}').join(name).replace('{1}', real[0])); break; }
    }
    if (PROGRAM.test(path)) { danger = true; r.push(T('Der Link lädt direkt ein Programm herunter (.{0}). Nur öffnen, wenn du es erwartest.').replace('{0}', path.split('.').pop())); }
    if (/^http:\/\//i.test(u)) r.push(T('Die Seite ist nicht verschlüsselt (http) — andere im selben WLAN könnten mitlesen.'));
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.startsWith('[')) r.push(T('Statt eines Namens steht nur eine Zahlen-Adresse (IP) da.'));
    if (SHORT.has(site)) r.push(T('Kurz-Link: Wohin er wirklich führt, ist nicht zu sehen.'));
    const tld = h.split('.').pop();
    if (BAD_TLD.has(tld)) r.push(T('Die Endung „.{0}“ wird oft für Betrug benutzt.').replace('{0}', tld));
    if (h.length > 60 || count(h, '.') >= 5) r.push(T('Ungewöhnlich lange Adresse.'));
    return { danger, reasons: r };
  }

  /** Text → HTML mit Links. fmt formatiert die Stücke ohne Link (z. B. @Erwähnungen), Standard: nur escapen. */
  function html(raw, fmt = esc) {
    const t = String(raw ?? ''); if (!/http|www\./i.test(t)) return fmt(t);
    let out = '', last = 0;
    for (const h of find(t)) {
      out += fmt(t.slice(last, h.start));
      out += `<a class="zlink${risk(h.url).danger ? ' bad' : ''}" href="${esc(h.url)}" data-zlink="${esc(h.url)}" title="${esc(h.url)}" rel="noopener noreferrer">${esc(t.slice(h.start, h.end))}</a>`;
      last = h.end;
    }
    return out + fmt(t.slice(last));
  }

  const LS = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } } };
  const inApp = () => LS.get('zm-links-im-messenger') !== '0';
  const setInApp = (on) => LS.set('zm-links-im-messenger', on ? '1' : '0');
  const previewOn = () => LS.get('zm-link-vorschau') !== '0';
  const setPreviewOn = (on) => LS.set('zm-link-vorschau', on ? '1' : '0');

  function go(url) {
    const H = root.Host;
    if (H && H.available) {
      if (inApp()) H.call('link.open', { url }).catch(() => H.call('link.external', { url }).catch(() => { }));
      else H.call('link.external', { url }).catch(() => { });
    } else window.open(url, '_blank', 'noopener,noreferrer');      // iPhone/Browser: eigene Ansicht über der Web-App
  }

  /** Link öffnen: erst prüfen (Warnung), dann im Messenger (Standard) oder im normalen Browser */
  function open(url) {
    if (!/^https?:\/\//i.test(String(url))) return;
    const r = risk(url);
    if (r.reasons.length) warnDlg(url, r); else go(url);
  }

  /** Warnung vor einem verdächtigen Link — „Nicht öffnen" ist der hervorgehobene Knopf */
  function warnDlg(url, r) {
    const o = document.createElement('div'); o.className = 'zlwarn-ov';
    o.innerHTML = `<div class="zlwarn ${r.danger ? 'danger' : ''}" role="alertdialog" aria-modal="true">
      <h3>${r.danger ? '⚠ ' + esc(T('Vorsicht bei diesem Link')) : esc(T('Hinweis zu diesem Link'))}</h3>
      <div class="zlw-host">${esc(hostOf(url))}</div><div class="zlw-url">${esc(url)}</div>
      <ul>${r.reasons.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
      ${r.danger ? `<p class="zlw-tip">${esc(T('Betrüger geben sich oft als Bank, Paketdienst oder Shop aus. Gib dort keine Passwörter oder Kartendaten ein.'))}</p>` : ''}
      <button class="zlw-no">${esc(T('Nicht öffnen'))}</button><button class="zlw-yes">${esc(T('Trotzdem öffnen'))}</button></div>`;
    document.body.appendChild(o);
    const close = () => { o.remove(); document.removeEventListener('keydown', key, true); };
    const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    document.addEventListener('keydown', key, true);
    o.addEventListener('click', (e) => { if (e.target === o) close(); });
    o.querySelector('.zlw-no').onclick = close;
    o.querySelector('.zlw-yes').onclick = () => { close(); go(url); };
    o.querySelector('.zlw-no').focus();
  }

  // =========================================================================================== Link-Vorschau
  const decode = (s) => { const d = document.createElement('textarea'); d.innerHTML = String(s || ''); return d.value.replace(/\s+/g, ' ').trim(); };
  /** {t, d, s, img} aus dem HTML (Open-Graph, Twitter-Karten, <title>) — null = nichts Brauchbares */
  function parse(htmlText, base) {
    const doc = new DOMParser().parseFromString(String(htmlText), 'text/html');
    const meta = {};
    doc.querySelectorAll('meta').forEach((m) => {
      const k = (m.getAttribute('property') || m.getAttribute('name') || '').toLowerCase(), v = m.getAttribute('content');
      if (k && v && v.trim() && !(k in meta)) meta[k] = decode(v);
    });
    const title = meta['og:title'] || meta['twitter:title'] || decode(doc.title);
    if (!title) return null;
    const p = { t: title.slice(0, 140), d: (meta['og:description'] || meta['twitter:description'] || meta.description || '').slice(0, 220), s: (meta['og:site_name'] || host(base)).slice(0, 50) };
    const img = meta['og:image:secure_url'] || meta['og:image'] || meta['og:image:url'] || meta['twitter:image'] || meta['twitter:image:src'];
    if (img) { try { p.img = new URL(img.trim(), base).toString(); } catch (e) { } }
    return p;
  }
  /** Bild → kleines JPEG (Base64), höchstens 400 px breit */
  function thumb(b64, mime) {
    return new Promise((ok) => {
      const im = new Image();
      im.onload = () => {
        if (im.naturalWidth < 32 || im.naturalHeight < 32) return ok(null);
        const w = Math.min(400, im.naturalWidth), h = Math.max(1, Math.min(400, Math.round(im.naturalHeight * w / im.naturalWidth)));
        const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0, w, h);
        let q = 0.72, out = '';
        do { out = c.toDataURL('image/jpeg', q).split(',')[1] || ''; q -= 0.14; } while (out.length > 60000 && q > 0.2);
        ok(out.length > 60000 ? null : { i: out, iw: w, ih: h });
      };
      im.onerror = () => ok(null);
      im.src = `data:${mime};base64,${b64}`;
    });
  }
  /** Vorschau für einen Link bauen (nur in der PC-App; die Seite holt das Programm, nicht die Web-Seite) */
  async function build(url) {
    const H = root.Host; if (!H || !H.available) return null;
    const r = await H.call('link.fetch', { url });
    if (!r || !r.html) return null;
    const p = parse(r.html, r.url || url); if (!p) return null;
    p.u = url;
    if (p.img && /^https:\/\//i.test(p.img)) { try { const im = await H.call('link.image', { url: p.img }); if (im && im.b64) Object.assign(p, await thumb(im.b64, im.mime) || {}); } catch (e) { } }
    delete p.img;
    return p;
  }
  /** Vorschau an eine Text-Nachricht hängen (höchstens ~8 s; klappt es nicht, geht sie ohne raus) */
  async function attach(content) {
    if (!previewOn() || !content || content.lp) return false;
    const h = find(content.t)[0]; if (!h || !/^https:\/\//i.test(h.url) || risk(h.url).reasons.length) return false;
    const lp = await Promise.race([build(h.url).catch(() => null), new Promise((ok) => setTimeout(() => ok(null), 8000))]);
    if (!lp) return false;
    content.lp = lp; return true;
  }
  /** Vorschau-Karte unter einer Nachricht (Inhalt kommt von außen → alles escapen, nur gültige Links) */
  function card(lp) {
    if (!lp || typeof lp !== 'object' || !/^https?:\/\//i.test(String(lp.u || '')) || !lp.t) return '';
    const u = String(lp.u), bad = risk(u).danger;
    const img = typeof lp.i === 'string' && lp.i.length < 80000 && /^[A-Za-z0-9+/=]+$/.test(lp.i) ? `<img src="data:image/jpeg;base64,${lp.i}" alt="">` : '';
    return `<a class="zlcard${bad ? ' bad' : ''}" href="${esc(u)}" data-zlink="${esc(u)}" rel="noopener noreferrer">${img}<span class="zlc-b"><small>${bad ? '⚠ ' : ''}${esc(host(u))}</small><b>${esc(String(lp.t).slice(0, 140))}</b>${lp.d ? `<span>${esc(String(lp.d).slice(0, 220))}</span>` : ''}</span></a>`;
  }

  // Klick auf einen Link oder eine Vorschau im Chat (vor allen anderen Klicks der Nachricht)
  document.addEventListener('click', (e) => {
    const a = e.target && e.target.closest ? e.target.closest('a[data-zlink]') : null;
    if (!a) return;
    e.preventDefault(); e.stopPropagation();
    open(a.getAttribute('data-zlink'));
  }, true);

  root.ZMLinks = { find, html, open, go, hostOf, host, risk, siteOf, inApp, setInApp, previewOn, setPreviewOn, parse, attach, card, canPreview: () => !!(root.Host && root.Host.available) };
})(window);
