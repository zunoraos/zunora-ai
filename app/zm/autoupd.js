/* Zunora Messenger (PC) — Automatische Updates (1.2.0):
   • IMMER: alle 6 Stunden still prüfen → bei jeder neuen Version eine Windows-Meldung + Hinweis in den Einstellungen.
   • Schalter „Automatische Updates": Update wird im Hintergrund geladen und geprüft → Meldung „Update ist geladen" →
     du wählst die Uhrzeit (Jetzt, in 1 Stunde, 22 Uhr, 3 Uhr, eigene Zeit). Zur Uhrzeit startet der Messenger kurz neu.
   Die Uhrzeit gilt, solange der Messenger läuft (auch im Hintergrund/Infobereich). */
(function (root) {
  'use strict';
  const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } } };
  const T = (s) => (root.ZLang && root.ZLang.t ? root.ZLang.t(s) : s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const host = () => root.Host && root.Host.available;
  const A = { ready: '', at: 0, busy: false, onChange: null };
  const auto = () => LS.get('zm-autoupd', '0') === '1';
  const hm = (ms) => new Date(ms).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const when = (ms) => (new Date(ms).toDateString() === new Date().toDateString() ? T('heute um {0} Uhr') : T('morgen um {0} Uhr')).replace('{0}', hm(ms));
  function next(h, m) { const d = new Date(); d.setHours(h, m, 0, 0); if (d.getTime() <= Date.now() + 60000) d.setDate(d.getDate() + 1); return d.getTime(); }
  function notify(title, body) { try { if (root.ZMHost && root.ZMHost.notify) root.ZMHost.notify(title, body); } catch (e) { } }
  const changed = () => { if (A.onChange) try { A.onChange(); } catch (e) { } };

  async function tick() {
    if (!host() || A.busy) return;
    A.busy = true;
    try {
      const r = await root.Host.call('update.ready'); A.ready = (r && r.version) || '';
      A.at = A.ready ? +LS.get('zm-autoupd-um', '0') || 0 : 0;
      if (!A.ready) {
        const c = await root.Host.call('update.check');
        if (c && c.available) {
          if (auto()) {
            const d = await root.Host.call('update.download');
            if (d && d.ready) { A.ready = d.version; LS.set('zm-autoupd-um', '0'); A.at = 0; LS.set('zm-upd-gemeldet', d.version);
              notify(T('Update {0} ist geladen').replace('{0}', d.version), T('Wann soll es installiert werden? Öffne den Messenger → Einstellungen.')); }
          } else if (LS.get('zm-upd-gemeldet', '') !== c.version) {
            LS.set('zm-upd-gemeldet', c.version);
            notify(T('Neues Update: Zunora Messenger {0}').replace('{0}', c.version), T('Öffne die Einstellungen, um zu aktualisieren.'));
          }
        }
      }
    } catch (e) { }
    A.busy = false; changed();
  }
  // Uhrzeit erreicht → einspielen (der Messenger startet neu)
  setInterval(() => { if (A.ready && A.at && Date.now() >= A.at) { A.at = 0; LS.set('zm-autoupd-um', '0'); root.Host.call('update.apply').catch(() => { }); } }, 30000);
  setTimeout(tick, 15000); setInterval(tick, 6 * 3600 * 1000);

  A.plan = (at) => { A.at = at; LS.set('zm-autoupd-um', String(at)); changed(); };
  A.now = () => { if (!A.ready) return; root.Host.call('update.apply').catch((e) => { if (root.ZM && root.ZM.toast) root.ZM.toast(e.message, true); }); };
  A.settingsHtml = () => host() ? `<label class="small chk" style="margin-top:6px"><input type="checkbox" id="zAutoUpd" ${auto() ? 'checked' : ''}> <span>${T('Automatische Updates: neue Versionen von selbst laden — du wählst dann die Uhrzeit fürs Installieren')}</span></label>
    <div class="small muted">${T('Über jedes neue Update bekommst du immer eine Meldung.')}</div>` : '';
  A.readyHtml = () => !A.ready ? '' : `<div class="updcard"><div style="display:flex;gap:10px;align-items:center"><b>${esc(T('Update {0} ist geladen').replace('{0}', A.ready))}</b></div>
    <div class="small">${A.at ? esc(T('Wird {0} installiert.').replace('{0}', when(A.at))) : esc(T('Wann soll es installiert werden? Der Messenger startet dabei kurz neu.'))}</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
      <button class="chip" data-au="now">${T('Jetzt')}</button><button class="chip" data-au="1h">${T('In 1 Stunde')}</button>
      <button class="chip" data-au="22">${T('Heute 22 Uhr')}</button><button class="chip" data-au="3">${T('Nachts 3 Uhr')}</button>
      <input type="time" id="zAuTime" style="width:auto" title="${T('Uhrzeit wählen …')}"><button class="chip" data-au="time">${T('Uhrzeit übernehmen')}</button></div></div>`;
  A.wire = (el) => {
    const cb = el.querySelector('#zAutoUpd'); if (cb) cb.onchange = () => { LS.set('zm-autoupd', cb.checked ? '1' : '0'); if (cb.checked) tick(); };
    el.querySelectorAll('[data-au]').forEach((b) => b.onclick = (e) => {
      e.stopPropagation(); const k = b.dataset.au;
      if (k === 'now') A.now();
      else if (k === '1h') A.plan(Date.now() + 3600000);
      else if (k === '22') A.plan(next(22, 0));
      else if (k === '3') A.plan(next(3, 0));
      else if (k === 'time') { const v = (el.querySelector('#zAuTime') || {}).value || ''; const m = v.match(/^(\d{1,2}):(\d{2})$/); if (m) A.plan(next(+m[1], +m[2])); }
    });
  };
  A.tick = tick;
  root.ZMAutoUpd = A;
})(window);
