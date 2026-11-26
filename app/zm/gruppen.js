/* Zunora Messenger (PC) — Gruppen verwalten (1.2.0): Name + Beschreibung, Mitglieder (suchen, Admin machen, entfernen, hinzufügen),
   Einladungslink (teilen/kopieren, neu, aus) mit Beitritts-Anfragen, Gruppen-Einstellungen, Beitritt über einen Gruppen-Link,
   angeheftete Nachricht oben im Chat. Server: SQL 36 (set_group_settings, group_invite, group_invite_info, join_group, answer_join_request). */
(function (root) {
  'use strict';
  const T = (s) => (root.ZLang && root.ZLang.t ? root.ZLang.t(s) : s);
  const G = {};
  G.codeOf = (u) => { const m = /(?:[?&]gruppe=|zunora:\/\/gruppe\?c=)(g[A-Za-z0-9]{6,20})/.exec(String(u || '')); return m ? m[1] : null; };
  G.link = (code) => 'https://zunoraos.github.io/zunora-ai/einladung.html?gruppe=' + code;
  const strip = (r) => (typeof r === 'string' ? r.replace(/^"|"$/g, '') : r);

  // ---------------------------------------------------------------------------------- Server
  const api = (H) => ({
    settings: async (c, s) => { await H.Api.rpc('set_group_settings', { c, s }); await H.S.loadChats(); },
    invite: async (c, action) => { const r = strip(await H.Api.rpc('group_invite', { c, action: action || 'get' })); await H.S.loadChats(); return r && r !== 'null' ? r : null; },
    info: async (code) => { const r = await H.Api.rpc('group_invite_info', { code }); return typeof r === 'string' ? JSON.parse(r) : r; },
    join: async (code) => { const r = await H.Api.rpc('join_group', { code }); await H.S.loadChats(); return typeof r === 'string' ? JSON.parse(r) : r; },
    requests: async (c) => { const l = await H.Api.list(`chat_join_requests?chat_id=eq.${c}&select=user_id,created_at&order=created_at.asc`); if (l.length && H.S.refreshProfiles) await H.S.refreshProfiles(l.map((x) => x.user_id)); return l.map((x) => x.user_id); },
    answer: async (c, u, ok) => { await H.Api.rpc('answer_join_request', { c, u, ok }); await H.S.loadChats(); },
    add: async (c, members) => { await H.Api.rpc('add_members', { c, members }); await H.S.loadChats(); },
    role: async (c, u, admin) => { await H.Api.rpc('set_member_role', { c, u, r: admin ? 'admin' : 'member' }); await H.S.loadChats(); },
    remove: async (c, u) => { await H.Api.rest('DELETE', `chat_members?chat_id=eq.${c}&user_id=eq.${u}`); await H.S.loadChats(); },
    save: async (c, title, about) => { await H.Api.rest('PATCH', `chats?id=eq.${c}`, { title: title.slice(0, 60), about: about.slice(0, 500) }); await H.S.loadChats(); },
  });
  const copy = (t) => { try { navigator.clipboard.writeText(t); } catch (e) { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); } };

  // ---------------------------------------------------------------------------------- Gruppe verwalten
  G.manageDlg = function (H, chatId) {
    const A = api(H), esc = H.esc;
    let q = '', reqs = [];
    const draw = async (box) => {
      const c = H.S.chats.get(chatId); if (!c) { H.closeDlg(); return; }
      const canEdit = c.admin || !c.onlyAdminsEdit;
      const online = (u) => H.S.presence && H.S.presence.get(u) && H.S.presence.get(u).online;
      const mem = c.members.filter((m) => !q || (H.S.nameOf(m.userId) + ' ' + ((H.S.profiles.get(m.userId) || {}).username || '')).toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => ((a.userId === H.Api.userId ? 0 : a.role === 'owner' ? 1 : a.role === 'admin' ? 2 : 3) - (b.userId === H.Api.userId ? 0 : b.role === 'owner' ? 1 : b.role === 'admin' ? 2 : 3)) || H.S.nameOf(a.userId).localeCompare(H.S.nameOf(b.userId)));
      const nOn = c.members.filter((m) => m.userId !== H.Api.userId && online(m.userId)).length;
      const sw = (k, on, t, d) => `<label class="small chk" style="margin:6px 0"><input type="checkbox" data-gs="${k}" ${on ? 'checked' : ''}> <span><b>${T(t)}</b><br><span class="muted">${T(d)}</span></span></label>`;
      box.innerHTML = `<h3>👥 ${esc(c.title)}</h3><div style="max-height:70vh;overflow:auto;padding-right:4px">
        ${canEdit ? `<label class="small">${T('Name der Gruppe')}<input id="gTitle" maxlength="60" value="${esc(c.title)}"></label>
          <label class="small">${T('Beschreibung')}<textarea id="gAbout" rows="3" maxlength="500" placeholder="${T('Worum geht es in der Gruppe?')}">${esc(c.about || '')}</textarea></label>
          <button class="btn ghost" data-g="save">${T('Speichern')}</button>` : `<p class="small">${esc(c.about || T('Keine Beschreibung.'))}</p>`}
        ${c.admin ? `<div class="cat" style="padding-left:0">${T('Einladungslink')}</div>
          ${c.inviteCode ? `<div class="small" style="word-break:break-all;color:var(--accent)">${esc(G.link(c.inviteCode))}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"><button class="btn" data-g="copy">${T('Link kopieren')}</button><button class="btn ghost" data-g="new">${T('Neuen Link erzeugen')}</button><button class="btn ghost" data-g="off">${T('Link ausschalten')}</button></div>`
            : `<p class="small muted">${T('Mit einem Link können auch Leute beitreten, die nicht deine Freunde sind.')}</p><button class="btn" data-g="create">${T('Link erstellen')}</button>`}
          ${reqs.length ? `<div class="cat" style="padding-left:0">${T('Beitritts-Anfragen')} (${reqs.length})</div>${reqs.map((u) => `<div class="row" style="padding:4px 0">${H.uav ? H.uav(u, 's') : ''}<div class="main"><b>${esc(H.S.nameOf(u))}</b><div class="small muted">@${esc((H.S.profiles.get(u) || {}).username || '')}</div></div>
            <button class="btn" data-acc="${esc(u)}">${T('Annehmen')}</button><button class="btn ghost" data-dec="${esc(u)}">${T('Ablehnen')}</button></div>`).join('')}` : ''}
          <div class="cat" style="padding-left:0">${T('Gruppen-Einstellungen')}</div>
          ${sw('only_admins_send', c.onlyAdminsSend, 'Nur Admins dürfen schreiben', 'Gut für Ankündigungen: alle lesen, nur Admins schreiben.')}
          ${sw('only_admins_edit', c.onlyAdminsEdit, 'Nur Admins ändern Name, Bild und Beschreibung', 'Sonst darf das jedes Mitglied.')}
          ${sw('members_can_add', c.membersCanAdd, 'Mitglieder dürfen Leute hinzufügen', 'Jedes Mitglied kann eigene Freunde hinzufügen.')}
          ${sw('join_approval', c.joinApproval, 'Beitritt per Link nur mit Freigabe', 'Wer über den Link kommt, wartet, bis ein Admin annimmt.')}` : ''}
        <div class="cat" style="padding-left:0">${c.members.length} ${T('Mitglieder')}${nOn ? ' · ' + nOn + ' online' : ''}</div>
        ${c.members.length > 8 ? `<input id="gQ" placeholder="${T('Mitglied suchen …')}" value="${esc(q)}">` : ''}
        ${c.admin || c.membersCanAdd ? `<button class="btn ghost" data-g="add">＋ ${T('Mitglieder hinzufügen')}</button>` : ''}
        ${mem.map((m) => `<div class="row" style="padding:4px 0">${H.uav ? H.uav(m.userId, 's') : ''}<div class="main"><b>${m.userId === H.Api.userId ? T('Du') : esc(H.S.nameOf(m.userId))}</b>${online(m.userId) ? ' <span class="onl" style="font-size:11px"><i></i>Online</span>' : ''}
            ${m.role !== 'member' ? `<div class="small" style="color:var(--accent)">${m.role === 'owner' ? T('Gruppen-Admin (Ersteller)') : T('Gruppen-Admin')}</div>` : ''}</div>
            ${c.admin && m.userId !== H.Api.userId && m.role !== 'owner' ? `<button class="btn ghost" data-role="${esc(m.userId)}" data-on="${m.role === 'admin' ? 0 : 1}">${m.role === 'admin' ? T('Admin ✕') : T('Admin ＋')}</button><button class="btn ghost" data-kick="${esc(m.userId)}" style="color:var(--bad)">${T('Entfernen')}</button>` : ''}</div>`).join('')}
      </div><div class="rowb"><button class="btn ghost" data-close>${T('Schließen')}</button></div>`;
      const $ = (s) => box.querySelector(s);
      $('[data-close]').onclick = H.closeDlg;
      const run = (f, ok) => H.tryDo(async () => { await f(); if (ok) H.toast(ok); await draw(box); H.renderAll(); });
      box.querySelectorAll('[data-g]').forEach((b) => b.onclick = () => {
        const k = b.dataset.g;
        if (k === 'save') run(() => A.save(c.id, $('#gTitle').value.trim() || c.title, $('#gAbout').value.trim()), T('✓ Gespeichert'));
        if (k === 'create') run(async () => { const code = await A.invite(c.id); if (code) copy(T('Komm in meine Gruppe „{0}“ im Zunora Messenger:').replace('{0}', c.title) + '\n' + G.link(code)); }, T('✓ Link erstellt und kopiert'));
        if (k === 'copy') { copy(T('Komm in meine Gruppe „{0}“ im Zunora Messenger:').replace('{0}', c.title) + '\n' + G.link(c.inviteCode)); H.toast(T('✓ Link kopiert')); }
        if (k === 'new') run(() => A.invite(c.id, 'new'), T('✓ Neuer Link — der alte gilt nicht mehr.'));
        if (k === 'off') run(() => A.invite(c.id, 'off'), T('✓ Link ausgeschaltet'));
        if (k === 'add') addDlg(H, c, () => G.manageDlg(H, chatId));
      });
      box.querySelectorAll('[data-gs]').forEach((cb) => cb.onchange = () => run(() => A.settings(c.id, { [cb.dataset.gs]: cb.checked })));
      box.querySelectorAll('[data-acc]').forEach((b) => b.onclick = () => run(async () => { await A.answer(c.id, b.dataset.acc, true); reqs = reqs.filter((x) => x !== b.dataset.acc); }, T('✓ Angenommen')));
      box.querySelectorAll('[data-dec]').forEach((b) => b.onclick = () => run(async () => { await A.answer(c.id, b.dataset.dec, false); reqs = reqs.filter((x) => x !== b.dataset.dec); }));
      box.querySelectorAll('[data-role]').forEach((b) => b.onclick = () => run(() => A.role(c.id, b.dataset.role, b.dataset.on === '1')));
      box.querySelectorAll('[data-kick]').forEach((b) => b.onclick = async () => { if (await H.zConfirm(T('{0} aus der Gruppe entfernen?').replace('{0}', H.S.nameOf(b.dataset.kick)))) run(() => A.remove(c.id, b.dataset.kick), T('✓ Entfernt')); });
      const gq = $('#gQ'); if (gq) { gq.oninput = () => { q = gq.value; draw(box).then(() => { const x = box.querySelector('#gQ'); if (x) { x.focus(); x.setSelectionRange(q.length, q.length); } }); }; }
    };
    H.dlg('', async (box) => {
      const c = H.S.chats.get(chatId);
      if (c && c.admin) { try { reqs = await A.requests(chatId); } catch (e) { reqs = []; } }
      await draw(box);
    });
  };

  function addDlg(H, c, back) {
    const A = api(H), esc = H.esc;
    const inChat = new Set(c.members.map((m) => m.userId));
    const fr = (H.S.friends || []).filter((f) => f.st === 'accepted' && f.p && !inChat.has(f.p.id));
    const id = (f) => f.p.id; const nm = (f) => H.S.nameOf(id(f));
    H.dlg(`<h3>${T('Mitglieder hinzufügen')}</h3><div style="max-height:50vh;overflow:auto">${fr.length ? fr.map((f) => `<label class="small chk" style="margin:4px 0"><input type="checkbox" data-add="${esc(id(f))}"> <span>${esc(nm(f))}</span></label>`).join('') : `<p class="muted">${T('Alle deine Freunde sind schon in der Gruppe.')}</p>`}</div>
      <div class="rowb"><button class="btn ghost" data-back>${T('Zurück')}</button><button class="btn" data-ok>${T('Hinzufügen')}</button></div>`, (box) => {
      box.querySelector('[data-back]').onclick = () => { H.closeDlg(); back(); };
      box.querySelector('[data-ok]').onclick = () => H.tryDo(async () => {
        const sel = [...box.querySelectorAll('[data-add]:checked')].map((x) => x.dataset.add); if (!sel.length) return;
        await A.add(c.id, sel); H.toast(T('✓ Hinzugefügt')); H.closeDlg(); back();
      });
    });
  }

  // ---------------------------------------------------------------------------------- Beitreten über einen Link
  G.joinDlg = async function (H, code) {
    const A = api(H), esc = H.esc;
    let i = null; try { i = await A.info(code); } catch (e) { }
    if (!i || !i.id) { H.toast(T('Dieser Einladungslink gilt nicht mehr.'), true); return; }
    const body = () => `<h3>${T('Gruppen-Einladung')}</h3><div style="display:flex;gap:12px;align-items:center">${H.av(i.title, '', true, null)}<div><b>${esc(i.title)}</b><div class="small muted">${i.members} ${T('Mitglieder')}</div></div></div>
      ${i.about ? `<p class="small">${esc(i.about)}</p>` : ''}
      ${i.joined ? `<button class="btn" data-j="open">${T('Gruppe öffnen')}</button>` : i.requested ? `<p class="small">${T('Deine Anfrage ist gesendet. Ein Admin muss sie annehmen.')}</p>` : `<button class="btn" data-j="join">${T(i.approval ? 'Beitritt anfragen' : 'Beitreten')}</button>`}
      <p class="small muted">${T('Mitglieder sehen deinen Namen und dein Profilbild. Nachrichten sind Ende-zu-Ende verschlüsselt — du siehst nur Nachrichten ab deinem Beitritt.')}</p>
      <div class="rowb"><button class="btn ghost" data-close>${T('Schließen')}</button></div>`;
    H.dlg(body(), (box) => {
      const wire = () => {
        box.querySelector('[data-close]').onclick = H.closeDlg;
        const o = box.querySelector('[data-j="open"]'); if (o) o.onclick = () => { H.S.openChat = i.id; H.closeDlg(); H.renderAll(); };
        const j = box.querySelector('[data-j="join"]'); if (j) j.onclick = () => H.tryDo(async () => {
          const r = await A.join(code);
          if (r && r.status === 'joined') { H.S.openChat = r.id; H.closeDlg(); H.renderAll(); H.toast(T('✓ Du bist jetzt in der Gruppe.')); }
          else { i.requested = true; box.innerHTML = body(); wire(); }
        });
      };
      wire();
    });
  };

  // ---------------------------------------------------------------------------------- Angeheftete Nachricht oben im Chat
  G.pinnedHtml = (H, chatId) => {
    const list = H.S.messages.get(chatId) || []; const p = [...list].reverse().find((m) => m.pinned && !m.deleted); if (!p) return '';
    return `<div class="gpin" data-gpin="${H.esc(p.id)}" title="${T('Zur Nachricht springen')}">📌 <b>${T('Angeheftet')}</b> <span>${H.esc(H.S.preview(p))}</span></div>`;
  };

  // Klick auf einen Gruppen-Link (im Chat) → Vorschau statt Browser
  G.init = function (H) {
    if (G._init) return; G._init = true;
    document.addEventListener('click', (e) => {
      const l = e.target.closest('a[data-zlink], [data-zlink], a[href]');
      if (l) { const code = G.codeOf(l.dataset.zlink || l.getAttribute('href')); if (code) { e.preventDefault(); e.stopPropagation(); G.joinDlg(H, code); return; } }
      const pin = e.target.closest('[data-gpin]');
      if (pin) { const el = document.querySelector(`[data-msg="${CSS.escape(pin.dataset.gpin)}"]`); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('gflash'); setTimeout(() => el.classList.remove('gflash'), 1400); } }
    }, true);
    // Web-App/Link mit ?gruppe=… geöffnet
    const code = G.codeOf(location.search); if (code) setTimeout(() => G.joinDlg(H, code), 1600);
  };
  root.ZMGroups = G;
})(window);
