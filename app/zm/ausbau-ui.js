/* Zunora Messenger am PC — Oberfläche zum Ausbau 25.11.2026: Chat-Ordner, Nachrichten planen (Plus), Kanäle zum Folgen.
   Die Funktionen bekommen die Helfer aus ui.js (esc, I, S, toast, tryDo, dlg, closeDlg, renderAll, av, cav, clock, zConfirm). */
(function (root) {
  'use strict';
  const tr = (s) => (root.ZLang && root.ZLang.t ? root.ZLang.t(s) : s);
  const SUGGEST = [['👨‍👩‍👧', 'Familie'], ['💼', 'Arbeit'], ['🎉', 'Freunde'], ['⚽', 'Verein'], ['🏫', 'Schule']];
  const A = {};

  // ======================================================================================= Chat-Ordner
  A.chips = function (H) {
    const { S, esc } = H;
    const unread = [...S.chats.values()].filter((c) => c.unread > 0 && !c.archived).length;
    const chip = (k, label, n) => `<button class="chip ${S.folderNow === k ? 'on' : ''}" data-zfold="${esc(k)}" ${k.length > 20 ? `title="${esc(tr('Rechtsklick: bearbeiten'))}"` : ''}>${esc(label)}${n ? ` <b style="opacity:.8">${n}</b>` : ''}</button>`;
    return `<div class="chips zfolders" style="padding:2px 16px 8px;flex-wrap:nowrap;overflow-x:auto">${chip('alle', tr('Alle'))}${chip('ungelesen', tr('Ungelesen'), unread)}${chip('gruppen', tr('Gruppen'))}` +
      S.folders.map((f) => chip(f.id, (f.icon ? f.icon + ' ' : '') + f.name, [...S.chats.values()].filter((c) => f.chats.includes(c.id) && c.unread > 0).length)).join('') +
      `<button class="chip" data-zfold-new style="border-style:dashed">＋ ${esc(tr('Ordner'))}</button></div>`;
  };
  A.wireChips = function (el, H) {
    el.querySelectorAll('[data-zfold]').forEach((b) => {
      b.onclick = (e) => { e.stopPropagation(); H.S.folderNow = b.dataset.zfold; H.renderList(); };
      b.oncontextmenu = (e) => { const f = H.S.folders.find((x) => x.id === b.dataset.zfold); if (!f) return; e.preventDefault(); e.stopPropagation(); A.folderDlg(H, f); };
    });
    const n = el.querySelector('[data-zfold-new]'); if (n) n.onclick = (e) => { e.stopPropagation(); A.folderDlg(H, null); };
  };
  A.emptyText = (S) => (S.folderNow === 'ungelesen' ? tr('Alles gelesen ✓') : S.folderNow !== 'alle' && S.folderNow !== 'gruppen' ? tr('Hier ist noch kein Chat. Rechtsklick auf den Reiter, um Chats hinzuzufügen.') : '');

  A.folderDlg = function (H, f) {
    const { S, esc, dlg, closeDlg, tryDo, cav, toast } = H;
    const chosen = new Set(f ? f.chats : []);
    const chats = [...S.chats.values()].sort((a, b) => b.lastAt - a.lastAt);
    dlg(`<h3>${f ? tr('Ordner bearbeiten') : tr('Neuer Ordner')}</h3>
      ${f ? '' : `<div class="chips">${SUGGEST.filter(([, n]) => !S.folders.some((x) => x.name === tr(n))).map(([i, n]) => `<button class="chip" data-sug="${esc(i)}|${esc(tr(n))}">${esc(i)} ${esc(tr(n))}</button>`).join('')}</div>`}
      <div style="display:flex;gap:8px;margin-top:8px"><input id="zfIcon" maxlength="4" style="width:64px" value="${esc(f ? f.icon : '📁')}"><input id="zfName" maxlength="30" placeholder="${esc(tr('Name (z. B. Familie)'))}" value="${esc(f ? f.name : '')}"></div>
      <div class="cat" style="padding-left:0">${tr('Chats in diesem Ordner')}</div>
      <div style="max-height:300px;overflow:auto">${chats.map((c) => `<label class="pick" style="cursor:pointer"><input type="checkbox" data-zc="${esc(c.id)}" style="width:auto" ${chosen.has(c.id) ? 'checked' : ''}>${cav(c, 'xs')}<span style="flex:1">${esc(c.title)}</span></label>`).join('')}</div>
      <p class="small muted">${tr('Nur du siehst deine Ordner — auf all deinen Geräten. Löschen entfernt nur den Ordner, nicht die Chats.')}</p>
      <div class="rowb">${f ? `<button class="btn ghost" data-mv="-1" title="${esc(tr('nach links'))}">◀</button><button class="btn ghost" data-mv="1" title="${esc(tr('nach rechts'))}">▶</button><button class="btn danger" data-del>${tr('Löschen')}</button>` : ''}<button class="btn ghost" data-close>${tr('Abbrechen')}</button><button class="btn" data-save>${tr('Speichern')}</button></div>`, (box) => {
      box.querySelector('[data-close]').onclick = closeDlg;
      box.querySelectorAll('[data-sug]').forEach((b) => b.onclick = () => { const [i, n] = b.dataset.sug.split('|'); box.querySelector('#zfIcon').value = i; box.querySelector('#zfName').value = n; });
      box.querySelectorAll('[data-zc]').forEach((x) => x.onchange = () => { if (x.checked) chosen.add(x.dataset.zc); else chosen.delete(x.dataset.zc); });
      box.querySelector('[data-save]').onclick = () => tryDo(async () => {
        const name = box.querySelector('#zfName').value.trim(), icon = box.querySelector('#zfIcon').value.trim();
        if (!name) return toast(tr('Bitte einen Namen eingeben.'), true);
        if (f) await S.saveFolder(Object.assign({}, f, { name, icon, chats: [...chosen] })); else S.folderNow = await S.createFolder(name, icon, [...chosen]);
        closeDlg(); H.renderAll();
      });
      const del = box.querySelector('[data-del]'); if (del) del.onclick = () => tryDo(async () => { await S.deleteFolder(f); closeDlg(); H.renderAll(); });
      box.querySelectorAll('[data-mv]').forEach((b) => b.onclick = () => tryDo(async () => { await S.moveFolder(f, +b.dataset.mv); H.renderAll(); }));
      setTimeout(() => box.querySelector('#zfName').focus(), 30);
    });
  };
  A.chatFolderDlg = function (H, c) {
    const { S, esc, dlg, closeDlg, tryDo } = H; if (!c) return;
    const draw = (box) => {
      box.innerHTML = `<h3>${esc(tr('„{0}“ in Ordner').replace('{0}', c.title))}</h3>${S.folders.length ? S.folders.map((f) => `<label class="pick" style="cursor:pointer"><input type="checkbox" data-zf="${esc(f.id)}" style="width:auto" ${f.chats.includes(c.id) ? 'checked' : ''}><span style="flex:1">${esc((f.icon || '📁') + '  ' + f.name)}</span></label>`).join('') : `<p class="muted">${tr('Noch keine Ordner. Lege zum Beispiel „Familie“ oder „Arbeit“ an.')}</p>`}
        <div class="rowb"><button class="btn ghost" data-new>＋ ${tr('Neuer Ordner')}</button><button class="btn" data-close>${tr('Fertig')}</button></div>`;
      box.querySelector('[data-close]').onclick = () => { closeDlg(); H.renderAll(); };
      box.querySelector('[data-new]').onclick = () => { closeDlg(); A.folderDlg(H, null); };
      box.querySelectorAll('[data-zf]').forEach((x) => x.onchange = () => tryDo(async () => { await S.toggleFolder(x.dataset.zf, c.id); }));
    };
    dlg('', draw);
  };

  // ======================================================================================= Nachrichten planen (Plus)
  function quick() {
    const now = Date.now(), at = (d, h, m = 0) => { const x = new Date(); x.setDate(x.getDate() + d); x.setHours(h, m, 0, 0); return x.getTime(); };
    return [[tr('In 1 Stunde'), now + 3600000], at(0, 18) > now + 120000 ? [tr('Heute 18:00'), at(0, 18)] : null, at(0, 21) > now + 120000 ? [tr('Heute 21:00'), at(0, 21)] : null,
      [tr('Morgen 8:00'), at(1, 8)], [tr('Morgen 12:00'), at(1, 12)], [tr('In 1 Woche'), now + 7 * 86400000]].filter(Boolean);
  }
  const localInput = (ms) => { const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); };
  A.planDlg = function (H, chat, text) {
    const { S, esc, dlg, closeDlg, tryDo, toast, I } = H;
    if (!(root.ZPlus && root.ZPlus.active())) {
      dlg(`<h3>${I('clock', 20)} ${tr('Nachricht planen')}</h3><p>${tr('Mit Zunora Plus planst du Nachrichten für später — zum Beispiel Geburtstagsgrüße um Mitternacht. Sie gehen auch raus, wenn dein PC aus ist, und bleiben Ende-zu-Ende verschlüsselt.')}</p>
        <div class="rowb"><button class="btn ghost" data-close>${tr('Schließen')}</button><button class="btn" data-plus>${tr('Zunora Plus ansehen')}</button></div>`, (box) => {
        box.querySelector('[data-close]').onclick = closeDlg; box.querySelector('[data-plus]').onclick = () => { closeDlg(); const b = document.querySelector('[data-view="plus"]') || document.querySelector('[data-view="settings"]'); if (b) b.click(); };
      });
      return;
    }
    let at = 0;
    dlg(`<h3>${I('clock', 20)} ${tr('Nachricht planen')}</h3><textarea id="plT" rows="3" maxlength="4000" placeholder="${esc(tr('Nachricht'))}">${esc(text || '')}</textarea>
      <div class="cat" style="padding-left:0">${tr('Wann?')}</div><div class="chips">${quick().map(([l, t]) => `<button class="chip" data-at="${t}">${esc(l)}</button>`).join('')}</div>
      <div style="margin-top:8px"><input type="datetime-local" id="plAt" min="${localInput(Date.now() + 60000)}"></div>
      <p class="small" id="plWhen" style="color:var(--accent)"></p>
      <p class="small muted">${tr('🔒 Wird jetzt auf diesem PC verschlüsselt. Der Server legt sie nur zur Uhrzeit in den Chat — lesen kann er sie nicht. Dein PC muss dafür nicht an sein.')}</p>
      <div class="rowb"><button class="btn ghost" data-close>${tr('Abbrechen')}</button><button class="btn" data-go>${tr('Planen')}</button></div>`, (box) => {
      const when = () => { box.querySelector('#plWhen').textContent = at ? tr('Wird gesendet: {0}').replace('{0}', S.planLabel(at)) : ''; };
      box.querySelector('[data-close]').onclick = closeDlg;
      box.querySelectorAll('[data-at]').forEach((b) => b.onclick = () => { at = +b.dataset.at; box.querySelectorAll('[data-at]').forEach((x) => x.classList.toggle('on', x === b)); box.querySelector('#plAt').value = localInput(at); when(); });
      box.querySelector('#plAt').onchange = (e) => { at = new Date(e.target.value).getTime() || 0; box.querySelectorAll('[data-at]').forEach((x) => x.classList.remove('on')); when(); };
      box.querySelector('[data-go]').onclick = () => tryDo(async () => {
        const t = box.querySelector('#plT').value.trim(); if (!t) return toast(tr('Bitte eine Nachricht eingeben.'), true); if (!at) return toast(tr('Bitte eine Zeit wählen.'), true);
        await S.schedule(chat, t, at); closeDlg(); toast('✓ ' + tr('Geplant für {0}').replace('{0}', S.planLabel(at)));
        const ta = document.querySelector('#mInput'); if (ta && ta.value.trim() === String(text || '').trim()) { ta.value = ''; S.setDraft(chat, ''); }
        H.renderAll();
      });
      setTimeout(() => box.querySelector('#plT').focus(), 30);
    });
  };
  A.plannedBar = function (H, chat) {
    const l = H.S.plannedFor(chat); if (!l.length) return '';
    return `<div class="replybar" data-act="plannedList" style="cursor:pointer">${H.I('clock', 14)} ${l.length === 1 ? H.esc(tr('1 geplante Nachricht · {0}').replace('{0}', H.S.planLabel(l[0].at))) : H.esc(tr('{0} geplante Nachrichten').replace('{0}', l.length))} · <span style="color:var(--accent)">${tr('Ansehen')}</span></div>`;
  };
  A.plannedDlg = function (H, chat) {
    const { S, esc, dlg, closeDlg, tryDo } = H;
    const draw = (box) => {
      const l = S.plannedFor(chat);
      box.innerHTML = `<h3>${tr('Geplante Nachrichten')}</h3>${l.length ? l.map((p) => `<div class="post" style="margin:6px 0"><div class="small" style="color:var(--accent)">🕓 ${esc(S.planLabel(p.at))}</div>
          <div>${esc(p.preview || tr('(auf einem anderen Gerät geplant — Text nur dort sichtbar)'))}</div>
          <div style="display:flex;gap:12px;margin-top:6px">${p.preview ? `<button class="link" data-now="${esc(p.id)}">${tr('Jetzt senden')}</button>` : ''}<label class="small">${tr('Zeit ändern')} <input type="datetime-local" data-move="${esc(p.id)}" value="${localInput(p.at)}" min="${localInput(Date.now() + 60000)}"></label><button class="link" data-del="${esc(p.id)}" style="color:var(--bad)">${tr('Löschen')}</button></div></div>`).join('')
        : `<p class="muted">${tr('Keine mehr — alles gesendet.')}</p>`}<div class="rowb"><button class="btn" data-close>${tr('Schließen')}</button></div>`;
      box.querySelector('[data-close]').onclick = () => { closeDlg(); H.renderAll(); };
      const of = (id) => S.planned.find((x) => x.id === id);
      box.querySelectorAll('[data-now]').forEach((b) => b.onclick = () => tryDo(async () => { await S.sendPlannedNow(of(b.dataset.now)); draw(box); }));
      box.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => tryDo(async () => { await S.cancelPlanned(of(b.dataset.del)); draw(box); }));
      box.querySelectorAll('[data-move]').forEach((x) => x.onchange = () => tryDo(async () => { const t = new Date(x.value).getTime(); if (t > Date.now()) { await S.movePlanned(of(x.dataset.move), t); draw(box); } }));
    };
    dlg('', draw);
  };

  // ======================================================================================= Kanäle zum Folgen
  const F = () => root.ZM.Store.Follow;
  const fol = (n) => (n === 1 ? tr('1 Follower') : tr('{0} Follower').replace('{0}', n >= 10000 ? Math.floor(n / 1000) + 'k' : n));
  const chIcon = (H, c, cls) => H.av(c.name, cls || 's', false, c.icon ? F().img(c.icon) : null);
  let found = null, q = '', qT = null, loadedMine = false;
  A.followButton = (H) => `<button class="srvic ${F().showing ? 'on' : ''}" data-act="followHome" style="position:relative" title="${H.esc(tr('Kanäle zum Folgen'))}">${H.I('megaphone', 20)}${[...F().following.keys()].some((id) => F().unread(id)) && !F().showing ? '<span class="dot red" style="position:absolute;top:2px;right:2px;width:9px;height:9px;padding:0"></span>' : ''}</button>`;
  A.followList = function (el, H, strip) {
    const { esc, I } = H;
    if (!loadedMine) { loadedMine = true; F().loadMine().catch((e) => H.toast(e.message, true)); }
    if (found === null) { found = []; F().discover('').then((l) => { found = l; H.renderList(); }).catch(() => { }); }
    const mine = [...new Set([...F().following.keys(), ...F().admin])].map((id) => F().channels.get(id)).filter(Boolean).sort((a, b) => b.lastPost - a.lastPost);
    const row = (c, extra) => `<div class="row ${F().open === c.id ? 'on' : ''}" data-zfo="${esc(c.id)}" style="cursor:pointer">${chIcon(H, c)}<div class="main"><div class="top"><span class="title" style="${F().unread(c.id) ? 'font-weight:800' : ''}">${esc(c.name)}${root.ZMStart2 && root.ZMStart2.isVerified(H, c.id) ? root.ZMStart2.badge() : ''}</span>${F().unread(c.id) ? '<span class="badge">•</span>' : ''}</div>
      <div class="prev">${esc((c.handle ? '@' + c.handle + ' · ' : '') + fol(c.followers) + (c.category ? ' · ' + c.category : ''))}</div></div>${extra || ''}</div>`;
    const disc = (found || []).filter((c) => !F().following.has(c.id));
    el.innerHTML = `<header><h2>${I('megaphone', 20)} ${tr('Kanäle')}</h2><button class="ico" data-zfnew title="${esc(tr('Neuer Kanal'))}">${I('plus')}</button></header>${strip}
      <p class="muted small" style="margin:0 16px 8px">${tr('Folge Kanälen von Vereinen, Creatorn oder Freunden — wie bei WhatsApp. Kanäle sind öffentlich; wem du folgst, sieht niemand.')}</p>
      <div class="scroll">${mine.length ? `<div class="cat">${tr('Deine Kanäle')}</div>` + mine.map((c) => row(c)).join('') : ''}
        <div class="cat">${tr('Entdecken')}</div><input class="search" id="zfQ" placeholder="${esc(tr('Kanäle suchen (Name, @name, Thema) …'))}" value="${esc(q)}">
        ${disc.length ? disc.map((c) => row(c, `<button class="btn" data-zfollowgo="${esc(c.id)}" style="padding:4px 12px">${tr('Folgen')}</button>`)).join('') : `<p class="muted small" style="padding:8px 16px">${q ? tr('Nichts gefunden.') : tr('Noch keine weiteren Kanäle. Erstelle den ersten!')}</p>`}</div>`;
    el.querySelectorAll('[data-zfo]').forEach((r) => r.onclick = (e) => { if (e.target.closest('[data-zfollowgo]')) return; F().open = r.dataset.zfo; H.renderAll(); });
    el.querySelectorAll('[data-zfollowgo]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); H.tryDo(async () => { await F().follow(b.dataset.zfollowgo); H.renderAll(); }); });
    const nb = el.querySelector('[data-zfnew]'); if (nb) nb.onclick = () => A.editDlg(H, null);
    const qi = el.querySelector('#zfQ'); if (qi) { qi.oninput = () => { q = qi.value; clearTimeout(qT); qT = setTimeout(() => F().discover(q).then((l) => { found = l; H.renderList(); const n = document.querySelector('#zfQ'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }).catch(() => { }), 300); }; }
  };
  let fmKey = '', editPost = null, pickFile = null;
  A.followMain = function (el, H) {
    const { esc, I, S } = H;
    const id = F().open;
    if (!id) { if (fmKey !== 'leer') { fmKey = 'leer'; el.innerHTML = `<div class="empty"><div class="big">${I('megaphone', 44)}</div><b>${tr('Kanäle zum Folgen')}</b><span>${tr('Wähle links einen Kanal — oder erstelle deinen eigenen.')}</span></div>`; } return; }
    const c = F().channels.get(id);
    if (fmKey !== 'k:' + id) {
      fmKey = 'k:' + id; editPost = null; pickFile = null;
      el.innerHTML = `<div class="head" id="zfHead"></div><div class="msgs" id="zfList"></div><div id="zfBar"></div><div class="composer" id="zfComp"></div>`;
      F().loadPosts(id).catch((e) => H.toast(e.message, true));
      clearInterval(A._poll); A._poll = setInterval(() => { if (F().open === id && F().showing) F().loadPosts(id).then(() => F().refresh(id)).catch(() => { }); else clearInterval(A._poll); }, 45000);
    }
    if (!c) { F().refresh(id).catch(() => { }); return; }
    const admin = F().admin.has(id), following = F().following.has(id);
    el.querySelector('#zfHead').innerHTML = `${chIcon(H, c)}<div class="t"><b>${esc(c.name)}${root.ZMStart2 && root.ZMStart2.isVerified(H, c.id) ? root.ZMStart2.badge() : ''}</b><small>${esc(fol(c.followers) + (c.handle ? ' · @' + c.handle : ''))}</small></div>
      ${following ? '' : `<button class="btn" data-zfollowme style="padding:6px 14px">${tr('Folgen')}</button>`}<button class="ico" data-zfset title="${esc(tr('Kanal-Infos'))}">${I('more')}</button>`;
    const posts = F().posts.get(id) || [];
    const list = el.querySelector('#zfList'); const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
    list.innerHTML = `<div class="post" style="text-align:center;margin:10px auto;max-width:460px">${chIcon(H, c, 'xl')}<h3 style="margin:6px 0 2px">${esc(c.name)}${root.ZMStart2 && root.ZMStart2.isVerified(H, c.id) ? root.ZMStart2.badge() : ''}</h3>${c.about ? `<div class="small muted">${esc(c.about)}</div>` : ''}<div class="small muted" style="margin-top:6px">📢 ${tr('Öffentlicher Kanal — Beiträge sehen alle. Wem du folgst, sieht niemand.')}</div>
        ${posts.length >= 30 ? `<button class="link" data-zfolder>⬆ ${tr('Ältere laden')}</button>` : ''}</div>` +
      (posts.length ? posts.map((p) => {
        const cnt = Object.entries(F().counts.get(p.id) || {}).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 6), mineR = F().mine.get(p.id);
        return `<div class="post" data-zpost="${esc(p.id)}" style="max-width:560px;margin:6px 16px">${p.media && p.media.path ? `<img class="media" src="${esc(F().img(p.media.path))}" style="max-width:100%;border-radius:10px;display:block;margin-bottom:6px">` : ''}
          ${p.body ? `<div style="white-space:pre-wrap">${root.ZMLinks ? root.ZMLinks.html(p.body) : esc(p.body)}</div>` : ''}
          <div style="display:flex;gap:6px;align-items:center;margin-top:6px;flex-wrap:wrap">${cnt.map(([e, n]) => `<button class="chip ${e === mineR ? 'on' : ''}" data-zre="${esc(e)}" ${c.reactionsOn ? '' : 'disabled'}>${esc(e)} ${n}</button>`).join('')}
            ${c.reactionsOn ? ['👍', '❤️', '😂', '😮', '🙏'].filter((e) => !cnt.some(([x]) => x === e)).map((e) => `<button class="chip" data-zre="${e}" style="opacity:.55">${e}</button>`).join('') : ''}
            <span style="flex:1"></span><span class="small muted">${esc(H.clock(p.at))}${p.edited ? ' · ' + tr('bearbeitet') : ''}</span>
            <button class="link small" data-zcopy>${tr('Kopieren')}</button>${admin ? `<button class="link small" data-zedit>${tr('Bearbeiten')}</button><button class="link small" data-zdel style="color:var(--bad)">${tr('Löschen')}</button>` : ''}</div></div>`;
      }).join('') : `<div class="empty">${admin ? tr('Schreib den ersten Beitrag für deine Follower.') : tr('Noch keine Beiträge.')}</div>`);
    if (atBottom || !list.dataset.seen) { list.scrollTop = list.scrollHeight; list.dataset.seen = '1'; }
    const comp = el.querySelector('#zfComp'), bar = el.querySelector('#zfBar');
    bar.innerHTML = (editPost ? `<div class="replybar">✏️ ${tr('Beitrag bearbeiten')}<button class="ico x" data-zcancel>✕</button></div>` : '') + (pickFile ? `<div class="replybar">${I('image', 14)} ${esc(pickFile.name)}<button class="ico x" data-zunpick>✕</button></div>` : '');
    if (admin) {
      if (!comp.dataset.ready) {
        comp.dataset.ready = '1';
        comp.innerHTML = `<button class="ico" data-zpic title="${esc(tr('Bild anhängen'))}">${I('image')}</button><textarea id="zfIn" rows="1" placeholder="${esc(tr('Beitrag an deine Follower …'))}"></textarea><button class="send" data-zsend title="${esc(tr('Senden'))}">${I('send', 18)}</button><input type="file" id="zfFile" accept="image/*" class="hidden">`;
        const ta = comp.querySelector('#zfIn');
        ta.oninput = () => { ta.style.height = 'auto'; ta.style.height = Math.min(160, ta.scrollHeight) + 'px'; };
        ta.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); comp.querySelector('[data-zsend]').click(); } };
        comp.querySelector('[data-zpic]').onclick = () => comp.querySelector('#zfFile').click();
        comp.querySelector('#zfFile').onchange = (e) => { pickFile = e.target.files[0] || null; e.target.value = ''; A.followMain(el, H); };
        comp.querySelector('[data-zsend]').onclick = () => H.tryDo(async () => {
          const t = ta.value; const ed = editPost, f = pickFile; if (!t.trim() && !f) return;
          ta.value = ''; editPost = null; pickFile = null;
          if (ed) await F().editPost(ed, t); else await F().post(id, t, f);
          A.followMain(el, H);
        });
      }
      comp.classList.remove('hidden');
    } else { comp.classList.add('hidden'); comp.innerHTML = ''; delete comp.dataset.ready; }
    const of = (b) => posts.find((p) => p.id === b.closest('[data-zpost]').dataset.zpost);
    list.querySelectorAll('[data-zre]').forEach((b) => b.onclick = () => H.tryDo(() => F().react(of(b), b.dataset.zre)));
    list.querySelectorAll('[data-zcopy]').forEach((b) => b.onclick = () => { navigator.clipboard.writeText(of(b).body + '\n— ' + c.name + (c.handle ? ' (@' + c.handle + ')' : '')); H.toast(tr('Kopiert — jetzt in einem Chat einfügen.')); });
    list.querySelectorAll('[data-zedit]').forEach((b) => b.onclick = () => { editPost = of(b); const ta = el.querySelector('#zfIn'); if (ta) { ta.value = editPost.body; ta.focus(); } A.followMain(el, H); });
    list.querySelectorAll('[data-zdel]').forEach((b) => b.onclick = () => H.zConfirm(tr('Diesen Beitrag löschen?')).then((y) => { if (y) H.tryDo(() => F().deletePost(of(b))); }));
    const older = list.querySelector('[data-zfolder]'); if (older) older.onclick = () => H.tryDo(() => F().loadPosts(id, posts[0].at));
    const on = (sel, f) => { const x = el.querySelector(sel); if (x) x.onclick = f; };
    on('[data-zfollowme]', () => H.tryDo(async () => { await F().follow(id); H.renderAll(); }));
    on('[data-zfset]', () => A.settingsDlg(H, c));
    on('[data-zcancel]', () => { editPost = null; A.followMain(el, H); });
    on('[data-zunpick]', () => { pickFile = null; A.followMain(el, H); });
  };
  A.resetMain = () => { fmKey = ''; };
  A.settingsDlg = function (H, c) {
    const { esc, dlg, closeDlg, tryDo, toast, S, Api } = H;
    const f = F().following.get(c.id), admin = F().admin.has(c.id), owner = c.owner === Api.userId;
    dlg(`<div style="display:flex;gap:10px;align-items:center">${chIcon(H, c, 'l')}<div><h3 style="margin:0">${esc(c.name)}</h3><div class="small muted">${esc(fol(c.followers))}</div></div></div>${c.about ? `<p>${esc(c.about)}</p>` : ''}
      ${f ? `<button class="btn ghost" data-mute>${f.muted ? '🔔 ' + tr('Wieder einschalten') : '🔕 ' + tr('Stummschalten')}</button><button class="btn ghost" data-unf>🚪 ${tr('Nicht mehr folgen')}</button>` : `<button class="btn" data-fol>➕ ${tr('Folgen')}</button>`}
      <button class="btn ghost" data-share>🔗 ${tr('Kanal teilen (kopieren)')}</button>
      ${admin ? `<div class="cat" style="padding-left:0">${tr('Verwalten')}</div><button class="btn ghost" data-edit>✏️ ${tr('Name, @Name, Beschreibung')}</button><button class="btn ghost" data-icon>🖼 ${tr('Kanal-Bild ändern')}</button><input type="file" id="zfIco" accept="image/*" class="hidden">${owner ? `<button class="btn danger" data-delc>🗑 ${tr('Kanal löschen …')}</button>` : ''}` : `<button class="btn ghost" data-rep>🚩 ${tr('Kanal melden')}</button>`}
      <div class="rowb"><button class="btn" data-close>${tr('Schließen')}</button></div>`, (box) => {
      const on = (sel, fn) => { const x = box.querySelector(sel); if (x) x.onclick = fn; };
      on('[data-close]', closeDlg);
      on('[data-mute]', () => tryDo(async () => { await F().mute(c.id, !f.muted); closeDlg(); H.renderAll(); }));
      on('[data-unf]', () => tryDo(async () => { await F().unfollow(c.id); closeDlg(); H.renderAll(); }));
      on('[data-fol]', () => tryDo(async () => { await F().follow(c.id); closeDlg(); H.renderAll(); }));
      on('[data-share]', () => { navigator.clipboard.writeText(F().shareText(c)); toast(tr('Kopiert.')); });
      on('[data-edit]', () => { closeDlg(); A.editDlg(H, c); });
      on('[data-icon]', () => box.querySelector('#zfIco').click());
      const ico = box.querySelector('#zfIco'); if (ico) ico.onchange = () => { const file = ico.files[0]; if (file) tryDo(async () => { await F().setIcon(c, file); closeDlg(); H.renderAll(); toast('✓'); }); };
      on('[data-delc]', () => H.zConfirm(tr('Kanal „{0}“ mit allen Beiträgen löschen?').replace('{0}', c.name)).then((y) => { if (y) tryDo(async () => { await F().deleteChannel(c); closeDlg(); A.resetMain(); H.renderAll(); }); }));
      on('[data-rep]', () => tryDo(async () => { await S.report(c.owner, null, 'Kanal zum Folgen: ' + c.name + ' (' + c.id + ')', c.about); toast(tr('Danke — wir sehen es uns an.')); closeDlg(); }));
    });
  };
  A.editDlg = function (H, c) {
    const { esc, dlg, closeDlg, tryDo, toast, S } = H;
    const own = c ? [] : [...S.servers.values()].filter((s) => S.can(s.id, 1));
    dlg(`<h3>${c ? tr('Kanal bearbeiten') : tr('Neuer Kanal')}</h3>
      <input id="zeN" maxlength="60" placeholder="${esc(tr('Name (z. B. FC Musterstadt)'))}" value="${esc(c ? c.name : '')}">
      <input id="zeH" maxlength="31" placeholder="${esc(tr('@name zum Finden (freiwillig, 3–30 Zeichen)'))}" value="${esc(c ? c.handle : '')}" style="margin-top:6px">
      <textarea id="zeA" rows="3" maxlength="500" placeholder="${esc(tr('Worum geht es?'))}" style="margin-top:6px">${esc(c ? c.about : '')}</textarea>
      <input id="zeC" maxlength="40" placeholder="${esc(tr('Thema (z. B. Sport, Musik, News)'))}" value="${esc(c ? c.category : '')}" style="margin-top:6px">
      <label class="small chk"><input type="checkbox" id="zeR" ${!c || c.reactionsOn ? 'checked' : ''}> <span>${tr('Reaktionen erlauben')}</span></label>
      ${own.length ? `<div class="small muted" style="margin-top:6px">${tr('Zu einem Server gehörig (freiwillig) — dann steht der Kanal oben in diesem Server.')}</div><select id="zeS"><option value="">${tr('Keiner')}</option>${own.map((s) => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}</select>` : ''}
      <p class="small muted">${tr('Kanäle sind öffentlich: Name, Bild und Beiträge sehen alle Zunora-Nutzer. Für Privates nimm Gruppen oder Server 🔒.')}</p>
      <div class="rowb"><button class="btn ghost" data-close>${tr('Abbrechen')}</button><button class="btn" data-go>${c ? tr('Speichern') : tr('Kanal erstellen')}</button></div>`, (box) => {
      box.querySelector('[data-close]').onclick = closeDlg;
      box.querySelector('#zeH').oninput = (e) => { e.target.value = F().cleanHandle(e.target.value); };
      box.querySelector('[data-go]').onclick = () => tryDo(async () => {
        const o = { name: box.querySelector('#zeN').value, handle: box.querySelector('#zeH').value, about: box.querySelector('#zeA').value, category: box.querySelector('#zeC').value, reactions: box.querySelector('#zeR').checked, server: (box.querySelector('#zeS') || {}).value || null };
        if (o.name.trim().length < 2) return toast(tr('Bitte einen Namen eingeben.'), true);
        try { if (c) await F().save(c, o); else { F().open = await F().create(o); F().showing = true; A.resetMain(); } }
        catch (e) { if (/duplicate|409|23505/i.test(e.message || '')) throw new Error(tr('Dieser @Name ist schon vergeben.')); throw e; }
        closeDlg(); H.renderAll();
      });
      setTimeout(() => box.querySelector('#zeN').focus(), 30);
    });
  };
  /** im Server: Kanäle zum Folgen, die zu diesem Server gehören */
  const ofServer = new Map();
  A.serverFollow = function (H, s) {
    if (!ofServer.has(s)) { ofServer.set(s, []); F().ofServer(s).then((l) => { ofServer.set(s, l); if (l.length) H.renderList(); }).catch(() => { }); }
    const l = ofServer.get(s) || []; if (!l.length) return '';
    return l.map((c) => `<div class="chan" data-act="followOpen" data-id="${H.esc(c.id)}" style="background:color-mix(in srgb, var(--accent) 12%, transparent)"><span class="i">${H.I('megaphone', 18)}</span><span style="flex:1">${H.esc(c.name)}</span><small>${F().following.has(c.id) ? '✓' : tr('Folgen')}</small></div>`).join('');
  };

  root.ZMA = A;
})(window);
