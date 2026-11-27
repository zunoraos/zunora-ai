/* Zunora Messenger am PC — Ausbau 25.11.2026 (genau wie am Handy: MSKeys, MPics, MPlan, MFolders, MFollow):
   • Server-Kanäle Ende-zu-Ende (gemeinsamer Server-Schlüssel je Epoche, für jedes Gerät einzeln verpackt)
   • Profil- und Gruppenbilder Ende-zu-Ende („….zenc“)
   • Nachrichten planen (Zunora Plus), Chat-Ordner, Kanäle zum Folgen
   Server-Schlüssel und Bild-Schlüssel bleiben am PC nur im Arbeitsspeicher — nach dem Start holt der PC sie neu (für dieses Gerät verpackt). */
(function (root) {
  'use strict';
  const { Api } = root.ZM;
  const S = root.ZM.Store;
  const C = root.ZMC;
  const uuid = () => crypto.randomUUID();
  const time = (s) => (s ? Date.parse(s) : 0) || 0;
  const iso = (ms) => new Date(ms === undefined ? Date.now() : ms).toISOString();
  const tr = (s) => (root.ZLang && root.ZLang.t ? root.ZLang.t(s) : s);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const LOCKED = '🔒 Verschlüsselte Nachricht — der Schlüssel kommt, sobald ein anderes Mitglied kurz online ist.';
  const BROKEN = '⚠️ Diese Nachricht ließ sich nicht prüfen und wird darum nicht angezeigt.';

  // ======================================================================================= 1. Server-Schlüssel
  const SK = { keys: new Map(), info: new Map(), infoAt: new Map(), missing: new Map(), shared: new Map() };
  S.SK = SK;
  S.setKeyInfo = function (s, epoch, rekey) { SK.info.set(s, [epoch | 0, !!rekey]); SK.infoAt.set(s, Date.now()); };
  S.serverOfChannel = function (ch) { const c = this.channel(ch); return c ? c.server_id : null; };

  async function key(s, e) {
    const k0 = SK.keys.get(s + '|' + e); if (k0) return k0;
    if (!(e > 0) || !S.deviceId || !S.keys) return null;
    const miss = SK.missing.get(s + '|' + e); if (miss && Date.now() - miss < 15000) return null;
    let row = null;
    try { row = (await Api.list(`server_keys?server_id=eq.${s}&epoch=eq.${e}&device_id=eq.${S.deviceId}&select=by_user,by_device,wrapped`))[0]; } catch (x) { }
    if (!row) { SK.missing.set(s + '|' + e, Date.now()); return null; }
    let sk = S.signKeys.get(row.by_device);
    if (!sk) { try { await S.devices([row.by_user], true); } catch (x) { } sk = S.signKeys.get(row.by_device); }
    if (!sk) return null;
    const k = await C.unwrapKey(row.wrapped, `skey|${s}|${e}`, S.deviceId, S.keys, sk);
    if (!k) return null;
    SK.keys.set(s + '|' + e, k); SK.missing.delete(s + '|' + e);
    return k;
  }
  async function fresh(s) {
    const i = SK.info.get(s); if (i && Date.now() - (SK.infoAt.get(s) || 0) < 20000) return i;
    const row = (await Api.list(`servers?id=eq.${s}&select=key_epoch,rekey`))[0];
    if (!row) throw new Error(tr('Diesen Server gibt es nicht mehr.'));
    S.setKeyInfo(s, row.key_epoch, row.rekey); return SK.info.get(s);
  }
  async function claim(s, cur) {
    const n = Number(String(await Api.rpc('server_key_new', { s, cur })).replace(/"/g, ''));
    if (!(n > 0)) return null;
    const k = C.random(32); SK.keys.set(s + '|' + n, k); S.setKeyInfo(s, n, false);
    await share(s, n, k, true);
    return [n, k];
  }
  async function forSend(s) {
    for (let round = 0; round < 4; round++) {
      if (round) SK.infoAt.delete(s);
      const [e, rekey] = await fresh(s);
      if (!e || rekey) { const c = await claim(s, e); if (c) return c; await sleep(700); continue; }
      const k = await key(s, e); if (k) return [e, k];
      SK.missing.delete(s + '|' + e);
      const any = await Api.list(`server_keys?server_id=eq.${s}&epoch=eq.${e}&select=device_id&limit=1`);
      if (!any.length) { await sleep(1500); if (!(await Api.list(`server_keys?server_id=eq.${s}&epoch=eq.${e}&select=device_id&limit=1`)).length) { const c = await claim(s, e); if (c) return c; } continue; }
      throw new Error(tr('Der Schlüssel für diesen Server ist noch unterwegs — ein anderes Mitglied muss kurz online sein. Bitte gleich noch einmal.'));
    }
    throw new Error(tr('Gerade ging das nicht. Bitte noch einmal.'));
  }
  /** viele Zeilen auf einmal, bei Fehler einzeln (z. B. ein Gerät wurde gerade abgemeldet) */
  async function insertAll(path, rows) {
    for (let i = 0; i < rows.length; i += 100) {
      const part = rows.slice(i, i + 100);
      try { await Api.rest('POST', path, part, 'resolution=ignore-duplicates,return=minimal'); }
      catch (x) { for (const r of part) { try { await Api.rest('POST', path, [r], 'resolution=ignore-duplicates,return=minimal'); } catch (y) { } } }
    }
  }
  S.insertAll = insertAll;
  async function share(s, e, k, force) {
    if (!S.keys) return;
    const tag = s + '|' + e; if (!force && Date.now() - (SK.shared.get(tag) || 0) < 120000) return; SK.shared.set(tag, Date.now());
    const st = S.serverState.get(s);
    const members = st && st.members.length ? st.members.map((m) => m.userId) : (await Api.list(`server_members?server_id=eq.${s}&select=user_id&limit=1000`)).map((r) => r.user_id);
    const have = new Set((await Api.list(`server_keys?server_id=eq.${s}&epoch=eq.${e}&select=device_id&limit=5000`)).map((r) => r.device_id));
    const users = [...new Set([Api.userId, ...members])];
    let devs = [];
    for (let i = 0; i < users.length; i += 80) devs = devs.concat(await S.devices(users.slice(i, i + 80), force));
    const seen = new Set(); devs = devs.filter((d) => !have.has(d.id) && !seen.has(d.id) && seen.add(d.id)).sort((a, b) => (a.userId === Api.userId ? 0 : 1) - (b.userId === Api.userId ? 0 : 1)).slice(0, 400);
    if (!devs.length) return;
    const rows = [];
    for (const d of devs) rows.push({ server_id: s, epoch: e, device_id: d.id, by_device: S.deviceId, wrapped: await C.wrapKey(k, `skey|${s}|${e}`, d.id, d.encKey, S.keys) });
    await insertAll('server_keys?on_conflict=server_id,epoch,device_id', rows);
  }
  /** beim Öffnen eines Servers: Schlüssel an neue Mitglieder/Geräte weitergeben */
  S.steward = function (s) {
    setTimeout(async () => {
      try { const [e, rekey] = await fresh(s); if (!e || rekey) return; const k = await key(s, e); if (k) await share(s, e, k); }
      catch (x) { console.warn('Server-Schlüssel verteilen', x); }
    }, 300 + Math.random() * 3700);
  };
  /** Zeilen vorbereiten: verschlüsselte Kanal-Nachrichten öffnen (Ergebnis in _c / _locked) */
  S.prep = async function (rows) {
    const enc = (rows || []).filter((r) => r && r.cipher && r.cipher.z === 's1');
    if (!enc.length) return rows;
    const pairs = new Map();
    for (const r of enc) { const s = this.serverOfChannel(r.channel_id) || (await Api.list(`channels?id=eq.${r.channel_id}&select=server_id`).catch(() => []))[0]?.server_id; r._s = s; if (s) pairs.set(s + '|' + r.cipher.e, [s, r.cipher.e]); }
    for (const [s, e] of pairs.values()) { try { await key(s, e); } catch (x) { } }
    try { await this.devices([...new Set(enc.map((r) => r.sender_id).filter(Boolean))]); } catch (x) { }
    for (const r of enc) {
      const k = r._s && SK.keys.get(r._s + '|' + r.cipher.e);
      if (!k) { r._c = { t: tr(LOCKED) }; r._locked = true; continue; }
      try {
        const o = await C.openChannel(r.cipher, r.channel_id, r.id, r.sender_device, k, this.signKeys.get(r.sender_device));
        if (o.check === 'BAD_SIGNATURE') { r._c = { t: tr(BROKEN) }; r._locked = true; } else { r._c = o.content; r._locked = false; }
      } catch (x) { r._c = { t: tr(BROKEN) }; r._locked = true; }
    }
    return rows;
  };
  S.mentionTags = (text) => [...new Set([...String(text || '').matchAll(/(?:^|\s)@([A-Za-z0-9_.]{3,24})/g)].map((m) => m[1].toLowerCase()).filter((n) => n !== 'zunora'))].slice(0, 30);
  /** Felder für die Datenbank: cipher, sender_device, mentions, Thread-Titel nur als 🔒 */
  S.sealCh = async function (ch, id, content, threadTitle) {
    const s = this.serverOfChannel(ch) || ((await Api.list(`channels?id=eq.${ch}&select=server_id`))[0] || {}).server_id;
    if (!s) throw new Error('Kanal nicht gefunden.');
    if (!this.keys) throw new Error(tr('Dieses Gerät hat noch keine Schlüssel — bitte neu anmelden.'));
    const [e, k] = await forSend(s);
    const full = Object.assign({}, content); if (threadTitle) full.tt = threadTitle;
    const tags = this.mentionTags(content.t);
    return { cipher: await C.sealChannel(full, ch, id, e, k, this.deviceId, this.keys), sender_device: this.deviceId, body: null, mentions: tags.length ? tags : null, thread_title: threadTitle ? '🔒' : null };
  };
  S.retryLocked = async function (ch) {
    const all = [...(this.chMessages.get(ch) || []), ...[...this.threads.values()].flat().filter((m) => m.channel === ch)];
    const ids = [...new Set(all.filter((m) => m.locked).map((m) => m.id))].slice(0, 100);
    if (!ids.length) return;
    const rows = await this.prep(await Api.list(`messages?id=in.(${ids.join(',')})&select=${this.COLS}`));
    if (rows.some((r) => !r._locked)) { if (this.chMessages.has(ch)) { this.chSynced.delete(ch); await this.loadChannel(ch); } if (this.openThread) await this.loadThread(this.openThread); }
  };
  // Suche in einem Server — auf diesem PC (die Kanäle sind verschlüsselt): die letzten 500 Nachrichten
  S.searchServer = async function (s, q) {
    const st = this.serverState.get(s); const ids = ((st && st.channels) || []).filter((c) => c.kind !== 'voice' && c.kind !== 'stage').map((c) => c.id);
    const t = String(q || '').trim().toLowerCase(); if (!ids.length || t.length < 2) return [];
    const rows = await this.prep(await Api.list(`messages?channel_id=in.(${ids.join(',')})&deleted=is.false&kind=neq.system&select=${this.COLS}&order=created_at.desc&limit=500`));
    const l = rows.map((r) => this.chMsg(r)).filter((m) => !m.locked && [m.content.t, m.threadTitle, (m.content.media || {}).name].some((x) => x && String(x).toLowerCase().includes(t))).slice(0, 50);
    await this.loadProfiles(l.map((m) => m.sender)); return l;
  };
  S.mentions = async function () {
    const me = ((this.me || {}).username || Api.username || '').toLowerCase().replace(/[^a-z0-9_.]/g, ''); if (!me) return [];
    const re = new RegExp('(^|\\s)@(' + me.replace(/\./g, '\\.') + '|everyone|here)\\b', 'i');
    const rows = await this.prep(await Api.list(`messages?channel_id=not.is.null&deleted=is.false&sender_id=neq.${Api.userId}&or=(mentions.cs.%7B${me}%7D,mentions.cs.%7Beveryone%7D,mentions.cs.%7Bhere%7D,body.ilike.*@${me}*,body.ilike.*@everyone*,body.ilike.*@here*)&select=${this.COLS}&order=created_at.desc&limit=60`));
    const l = rows.map((r) => this.chMsg(r)).filter((m) => re.test(m.content.t || ''));
    await this.loadProfiles(l.map((m) => m.sender)); return l;
  };

  // ======================================================================================= 2. Profil- und Gruppenbilder
  const PK = { keys: new Map(), chatOf: new Map(), missing: new Map(), urls: new Map(), busy: new Set() };
  S.PK = PK;
  const isEnc = (p) => !!p && String(p).endsWith('.zenc');
  S.isEncPic = isEnc;
  S.groupPic = (path, chat) => { if (path) PK.chatOf.set(path, chat); };
  async function picKey(path) {
    if (PK.keys.has(path)) return PK.keys.get(path);
    if (!S.keys || !S.deviceId) return null;
    const m = PK.missing.get(path); if (m && Date.now() - m < 60000) return null;
    const chat = PK.chatOf.get(path), owner = path.split('/')[0];
    const [kind, ref] = chat ? ['c', chat] : ['p', owner];
    try {
      const row = (await Api.list(`pic_keys?kind=eq.${kind}&ref=eq.${ref}&path=eq.${Api.q(path)}&device_id=eq.${S.deviceId}&select=by_user,by_device,wrapped`))[0];
      if (row) {
        let sk = S.signKeys.get(row.by_device);
        if (!sk) { await S.devices([row.by_user], true); sk = S.signKeys.get(row.by_device); }
        const k = sk && await C.unwrapKey(row.wrapped, `pic|${kind}|${ref}|${path}`, S.deviceId, S.keys, sk);
        if (k) { PK.keys.set(path, k); return k; }
      }
      if (!chat) for (const r of await Api.list(`pic_keys_srv?owner=eq.${owner}&path=eq.${Api.q(path)}&select=server_id,epoch,sealed&limit=20`)) {
        const sk = await key(r.server_id, r.epoch); if (!sk) continue;
        const k = await C.openSmall(sk, r.sealed, `zunora-picsrv-v1|${r.server_id}|${owner}|${path}|${r.epoch}`);
        if (k && k.length === 32) { PK.keys.set(path, k); return k; }
      }
    } catch (x) { }
    PK.missing.set(path, Date.now()); return null;
  }
  /** Bild öffnen → Blob-Adresse; danach zeichnet die Oberfläche neu */
  async function loadPic(path) {
    if (PK.busy.has(path)) return; PK.busy.add(path);
    try {
      const k = await picKey(path); if (!k) return;
      const r = await fetch(Api.publicUrl('avatars', path)); if (!r.ok) return;
      const jpeg = await C.openPicture(k, new Uint8Array(await r.arrayBuffer()), path); if (!jpeg) return;
      PK.urls.set(path, URL.createObjectURL(new Blob([jpeg], { type: 'image/jpeg' })));
      S.changed('pics');
    } catch (x) { } finally { setTimeout(() => PK.busy.delete(path), 60000); }
  }
  const pic0 = S.pic.bind(S);
  S.pic = function (path) {
    if (!isEnc(path)) return pic0(path);
    const u = PK.urls.get(path); if (u) return u;
    loadPic(path); return null;          // bis der Schlüssel da ist: Anfangsbuchstabe
  };
  const audience = () => [...new Set([Api.userId, ...S.friends.filter((f) => f.st === 'accepted').map((f) => f.p.id), ...[...S.chats.values()].flatMap((c) => c.members.map((m) => m.userId))])].filter((u) => u && !S.blocked.has(u));
  async function sharePic(kind, ref, path, k, users) {
    if (!S.keys) return;
    const have = new Set((await Api.list(`pic_keys?kind=eq.${kind}&ref=eq.${ref}&path=eq.${Api.q(path)}&select=device_id&limit=5000`)).map((r) => r.device_id));
    let devs = []; const u = [...new Set(users)];
    for (let i = 0; i < u.length; i += 80) devs = devs.concat(await S.devices(u.slice(i, i + 80)));
    const seen = new Set(); devs = devs.filter((d) => !have.has(d.id) && !seen.has(d.id) && seen.add(d.id)).slice(0, 500);
    const rows = []; for (const d of devs) rows.push({ kind, ref, path, device_id: d.id, by_device: S.deviceId, wrapped: await C.wrapKey(k, `pic|${kind}|${ref}|${path}`, d.id, d.encKey, S.keys) });
    if (rows.length) await insertAll('pic_keys?on_conflict=kind,ref,path,device_id', rows);
  }
  async function shareSrv(path, k) {
    const have = new Set((await Api.list(`pic_keys_srv?owner=eq.${Api.userId}&path=eq.${Api.q(path)}&select=server_id,epoch`)).map((r) => r.server_id + '|' + r.epoch));
    for (const s of S.servers.keys()) {
      const i = SK.info.get(s); if (!i || !i[0]) continue; const sk = SK.keys.get(s + '|' + i[0]) || await key(s, i[0]); if (!sk || have.has(s + '|' + i[0])) continue;
      try { await Api.rest('POST', 'pic_keys_srv?on_conflict=server_id,owner,path,epoch', { server_id: s, path, epoch: i[0], sealed: await C.sealSmall(sk, k, `zunora-picsrv-v1|${s}|${Api.userId}|${path}|${i[0]}`) }, 'resolution=ignore-duplicates,return=minimal'); } catch (x) { }
    }
  }
  /** Profil-/Gruppenbild speichern: verschlüsselt hochladen, Schlüssel verteilen; Server-Bilder bleiben öffentlich */
  const setPic0 = S.setPicture.bind(S);
  S.setPicture = async function (target, jpeg) {
    if (target.startsWith('server:')) return setPic0(target, jpeg);
    let path = null;
    if (jpeg) {
      const k = C.random(32); path = `${Api.userId}/${uuid()}.zenc`;
      await Api.upload('avatars', path, await C.sealPicture(k, jpeg, path), 'application/octet-stream');
      PK.keys.set(path, k); PK.urls.set(path, URL.createObjectURL(new Blob([jpeg], { type: 'image/jpeg' })));
    }
    let old = null;
    if (target === 'me') { old = (this.me || {}).avatar; await Api.rest('PATCH', `profiles?id=eq.${Api.userId}`, { avatar_path: path }); this.profiles.delete(Api.userId); await this.loadMe(); }
    else { const id = target.slice(5); old = (this.chats.get(id) || {}).avatar; if (path) S.groupPic(path, id); await Api.rest('PATCH', `chats?id=eq.${id}`, { avatar_path: path }); await this.loadChats(); }
    if (old && old !== path && old.startsWith(Api.userId + '/')) try { await Api.remove('avatars', [old]); } catch (e) { }
    try {
      const not = path ? `&path=neq.${Api.q(path)}` : '';
      if (target === 'me') {
        await Api.rest('DELETE', `pic_keys?by_user=eq.${Api.userId}&kind=eq.p${not}`).catch(() => { });
        await Api.rest('DELETE', `pic_keys_srv?owner=eq.${Api.userId}${not}`).catch(() => { });
        if (path) { await sharePic('p', Api.userId, path, PK.keys.get(path), audience()); await shareSrv(path, PK.keys.get(path)); }
      } else {
        const id = target.slice(5);
        await Api.rest('DELETE', `pic_keys?by_user=eq.${Api.userId}&kind=eq.c&ref=eq.${id}${not}`).catch(() => { });
        if (path) await sharePic('c', id, path, PK.keys.get(path), ((this.chats.get(id) || {}).members || []).map((m) => m.userId));
      }
    } catch (x) { console.warn('Bild-Schlüssel verteilen', x); }
    this.changed('chats');
  };
  /** beim Start (höchstens alle 10 Minuten): eigenes Profilbild + Gruppenbilder an neue Freunde/Mitglieder; alte Bilder umstellen */
  S.ensurePics = async function () {
    if (Date.now() - (PK.last || 0) < 600000) return; PK.last = Date.now();
    await sleep(6000);
    const mine = (this.me || {}).avatar;
    try {
      if (isEnc(mine)) { const k = await picKey(mine); if (k) { await sharePic('p', Api.userId, mine, k, audience()); await shareSrv(mine, k); } }
      else if (mine && mine.startsWith(Api.userId + '/')) { const r = await fetch(Api.publicUrl('avatars', mine)); if (r.ok) await this.setPicture('me', new Uint8Array(await r.arrayBuffer())); }
      for (const c of this.chats.values()) {
        if (!c.group || !c.avatar) continue;
        if (isEnc(c.avatar)) { const k = await picKey(c.avatar); if (k) await sharePic('c', c.id, c.avatar, k, c.members.map((m) => m.userId)); }
        else if (c.admin) { const r = await fetch(Api.publicUrl('avatars', c.avatar)); if (r.ok) await this.setPicture('chat:' + c.id, new Uint8Array(await r.arrayBuffer())); }
      }
    } catch (x) { console.warn('Bild-Schlüssel', x); }
  };

  // ======================================================================================= 3. Nachrichten planen (Zunora Plus)
  const previews = () => { try { return JSON.parse(localStorage.getItem('zm-geplant') || '{}') || {}; } catch (e) { return {}; } };
  S.planned = [];
  S.loadPlanned = async function () {
    const rows = await Api.list('scheduled_messages?select=id,chat_id,send_at&order=send_at.asc&limit=100');
    const p = previews(), keep = {};
    this.planned = rows.map((r) => { if (p[r.id]) keep[r.id] = p[r.id]; return { id: r.id, chat: r.chat_id, at: time(r.send_at), preview: p[r.id] || '' }; });
    localStorage.setItem('zm-geplant', JSON.stringify(keep)); this.changed('planned');
  };
  S.plannedFor = function (chat) { return this.planned.filter((p) => p.chat === chat).sort((a, b) => a.at - b.at); };
  S.schedule = async function (chat, text, at) {
    if (!(root.ZPlus && root.ZPlus.active())) throw new Error(tr('Nachrichten planen gehört zu Zunora Plus.'));
    if (at < Date.now() + 60000) throw new Error(tr('Bitte eine Zeit mindestens 1 Minute in der Zukunft wählen.'));
    const c = this.chats.get(chat); if (!c) throw new Error('Chat nicht gefunden.');
    const id = uuid(), content = { t: String(text).trim(), planned: true };
    const cipher = await C.encrypt(content, chat, id, this.deviceId, this.keys, await this.devices(c.members.map((m) => m.userId), true));
    await Api.rest('POST', 'scheduled_messages', { id, chat_id: chat, sender_device: this.deviceId, kind: 'text', cipher, send_at: iso(at) });
    const p = previews(); p[id] = content.t.slice(0, 300); localStorage.setItem('zm-geplant', JSON.stringify(p));
    this.planned.push({ id, chat, at, preview: content.t.slice(0, 300) }); this.changed('planned');
  };
  S.cancelPlanned = async function (p) { await Api.rest('DELETE', `scheduled_messages?id=eq.${p.id}`); this.planned = this.planned.filter((x) => x.id !== p.id); this.changed('planned'); };
  S.movePlanned = async function (p, at) { await Api.rest('PATCH', `scheduled_messages?id=eq.${p.id}`, { send_at: iso(at) }); p.at = at; this.changed('planned'); };
  S.sendPlannedNow = async function (p) {
    if (!p.preview) throw new Error(tr('Diese Nachricht wurde auf einem anderen Gerät geplant — dort kannst du sie sofort senden.'));
    await this.cancelPlanned(p); await this.send(p.chat, 'text', { t: p.preview });
  };
  S.planLabel = function (at) {
    const d = new Date(at), n = new Date(), m = new Date(); m.setDate(n.getDate() + 1);
    const same = (a, b) => a.toDateString() === b.toDateString();
    const day = same(d, n) ? tr('heute') : same(d, m) ? tr('morgen') : d.toLocaleDateString(root.ZLang && root.ZLang.lang ? root.ZLang.lang : 'de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
    return day + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };
  // ist eine geplante Nachricht dran, kurz danach auffrischen (sie liegt dann im Chat)
  setInterval(() => { if (S.planned.some((p) => p.at < Date.now() - 70000)) S.loadPlanned().then(() => S.openChat && S.loadMessages(S.openChat)).catch(() => { }); }, 30000);

  // ======================================================================================= 4. Chat-Ordner
  S.folders = []; S.folderNow = 'alle';
  try { S.folders = JSON.parse(localStorage.getItem('zm-ordner-' + (Api.userId || '')) || '[]') || []; } catch (e) { }
  const saveFolders = () => { try { localStorage.setItem('zm-ordner-' + Api.userId, JSON.stringify(S.folders)); } catch (e) { } S.changed('chats'); };
  S.loadFolders = async function () {
    this.folders = (await Api.list('chat_folders?select=id,name,icon,position,chats&order=position.asc,created_at.asc')).map((f) => ({ id: f.id, name: f.name, icon: f.icon || '', position: f.position, chats: f.chats || [] }));
    if (!['alle', 'ungelesen', 'gruppen'].includes(this.folderNow) && !this.folders.some((f) => f.id === this.folderNow)) this.folderNow = 'alle';
    saveFolders();
  };
  S.createFolder = async function (name, icon, chats) {
    if (this.folders.length >= 20) throw new Error(tr('Höchstens 20 Ordner.'));
    const r = (await Api.rest('POST', 'chat_folders', { name: String(name).trim().slice(0, 30), icon: String(icon || '').slice(0, 16), position: Math.max(0, ...this.folders.map((f) => f.position)) + 1, chats: [...new Set(chats || [])] }, 'return=representation'))[0];
    this.folders.push({ id: r.id, name: r.name, icon: r.icon || '', position: r.position, chats: r.chats || [] }); saveFolders(); return r.id;
  };
  S.saveFolder = async function (f) {
    await Api.rest('PATCH', `chat_folders?id=eq.${f.id}`, { name: String(f.name).trim().slice(0, 30), icon: String(f.icon || '').slice(0, 16), position: f.position, chats: [...new Set(f.chats)], updated_at: iso() });
    this.folders = this.folders.map((x) => (x.id === f.id ? f : x)); saveFolders();
  };
  S.deleteFolder = async function (f) { await Api.rest('DELETE', `chat_folders?id=eq.${f.id}`); this.folders = this.folders.filter((x) => x.id !== f.id); if (this.folderNow === f.id) this.folderNow = 'alle'; saveFolders(); };
  S.toggleFolder = async function (fid, chat) { const f = this.folders.find((x) => x.id === fid); if (!f) return; await this.saveFolder(Object.assign({}, f, { chats: f.chats.includes(chat) ? f.chats.filter((x) => x !== chat) : [...f.chats, chat] })); };
  S.moveFolder = async function (f, d) {
    const l = [...this.folders]; const i = l.findIndex((x) => x.id === f.id), j = Math.max(0, Math.min(l.length - 1, i + d)); if (i < 0 || i === j) return;
    l.splice(j, 0, l.splice(i, 1)[0]);
    for (let k = 0; k < l.length; k++) if (l[k].position !== k) { l[k] = Object.assign({}, l[k], { position: k }); await this.saveFolder(l[k]); }
    this.folders = l; saveFolders();
  };
  S.inFolder = function (c, tab) {
    tab = tab || this.folderNow;
    if (tab === 'alle') return true; if (tab === 'ungelesen') return c.unread > 0; if (tab === 'gruppen') return !!c.group;
    const f = this.folders.find((x) => x.id === tab); return f ? f.chats.includes(c.id) : true;
  };

  // ======================================================================================= 5. Kanäle zum Folgen (öffentlich)
  const CC = 'id,owner_id,name,handle,about,icon_path,category,server_id,followers,reactions_on,last_post_at';
  const fch = (o) => ({ id: o.id, owner: o.owner_id, name: o.name, handle: o.handle || '', about: o.about || '', icon: o.icon_path || null, category: o.category || '', server: o.server_id || null, followers: o.followers || 0, reactionsOn: o.reactions_on !== false, lastPost: time(o.last_post_at) });
  const F = { channels: new Map(), following: new Map(), admin: new Set(), posts: new Map(), counts: new Map(), mine: new Map(), open: null, showing: false };
  S.Follow = F;
  F.unread = (id) => { const c = F.channels.get(id), m = F.following.get(id); return !!(c && m && !m.muted && c.lastPost > m.seenAt + 1000); };
  F.loadMine = async function () {
    const mine = await Api.list(`follow_members?user_id=eq.${Api.userId}&select=channel_id,muted,seen_at`);
    F.following = new Map(mine.map((r) => [r.channel_id, { muted: !!r.muted, seenAt: time(r.seen_at) }]));
    F.admin = new Set((await Api.list(`follow_admins?user_id=eq.${Api.userId}&select=channel_id`)).map((r) => r.channel_id));
    const ids = [...new Set([...F.following.keys(), ...F.admin])];
    if (ids.length) (await Api.list(`follow_channels?id=in.(${ids.join(',')})&select=${CC}`)).forEach((o) => F.channels.set(o.id, fch(o)));
    S.changed('follow');
  };
  F.discover = async function (q) { const l = ((await Api.rpc('discover_follow', { q: String(q || '').trim().slice(0, 60) })) || []).map(fch); l.forEach((c) => F.channels.set(c.id, c)); return l; };
  F.ofServer = async function (s) { const l = (await Api.list(`follow_channels?server_id=eq.${s}&select=${CC}&order=followers.desc&limit=20`)).map(fch); l.forEach((c) => F.channels.set(c.id, c)); return l; };
  F.refresh = async function (id) { const o = (await Api.list(`follow_channels?id=eq.${id}&select=${CC}`))[0]; if (o) F.channels.set(id, fch(o)); S.changed('follow'); };
  F.follow = async function (id) { await Api.rest('POST', 'follow_members', { channel_id: id }, 'resolution=ignore-duplicates,return=minimal'); F.following.set(id, { muted: false, seenAt: Date.now() }); await F.refresh(id); };
  F.unfollow = async function (id) { await Api.rest('DELETE', `follow_members?channel_id=eq.${id}&user_id=eq.${Api.userId}`); F.following.delete(id); await F.refresh(id); };
  F.mute = async function (id, on) { await Api.rest('PATCH', `follow_members?channel_id=eq.${id}&user_id=eq.${Api.userId}`, { muted: !!on }); const m = F.following.get(id); if (m) m.muted = !!on; S.changed('follow'); };
  F.seen = async function (id) { if (!F.following.has(id)) return; try { await Api.rest('PATCH', `follow_members?channel_id=eq.${id}&user_id=eq.${Api.userId}`, { seen_at: iso() }); } catch (e) { } F.following.get(id).seenAt = Date.now(); };
  F.loadPosts = async function (id, before) {
    const older = before ? `&created_at=lt.${Api.q(iso(before))}` : '';
    const rows = (await Api.list(`follow_posts?channel_id=eq.${id}&deleted=is.false&select=id,channel_id,sender_id,body,media,created_at,edited_at${older}&order=created_at.desc&limit=30`))
      .map((o) => ({ id: o.id, channel: o.channel_id, sender: o.sender_id, body: o.body || '', media: o.media || null, at: time(o.created_at), edited: !!o.edited_at }));
    const all = new Map([...(before ? F.posts.get(id) || [] : []), ...rows].map((p) => [p.id, p]));
    F.posts.set(id, [...all.values()].sort((a, b) => a.at - b.at));
    const ids = rows.map((p) => p.id);
    if (ids.length) {
      const cnt = (await Api.rpc('follow_reaction_counts', { posts: ids })) || [];
      ids.forEach((p) => F.counts.set(p, {})); cnt.forEach((r) => { F.counts.get(r.post_id)[r.emoji] = Number(r.n) || 0; });
      (await Api.list(`follow_reactions?user_id=eq.${Api.userId}&post_id=in.(${ids.join(',')})&select=post_id,emoji`)).forEach((r) => F.mine.set(r.post_id, r.emoji));
    }
    await F.seen(id); S.changed('follow');
  };
  F.react = async function (p, emoji) {
    const old = F.mine.get(p.id), c = Object.assign({}, F.counts.get(p.id) || {});
    if (old) { c[old] = (c[old] || 1) - 1; if (c[old] <= 0) delete c[old]; }
    if (old === emoji) { F.mine.delete(p.id); F.counts.set(p.id, c); S.changed('follow'); await Api.rest('DELETE', `follow_reactions?post_id=eq.${p.id}&user_id=eq.${Api.userId}`); return; }
    c[emoji] = (c[emoji] || 0) + 1; F.counts.set(p.id, c); F.mine.set(p.id, emoji); S.changed('follow');
    if (!old) await Api.rest('POST', 'follow_reactions', { post_id: p.id, emoji }); else await Api.rest('PATCH', `follow_reactions?post_id=eq.${p.id}&user_id=eq.${Api.userId}`, { emoji });
  };
  async function jpeg(file, max, square) {
    const img = await createImageBitmap(file);
    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (square) { const s = Math.min(sw, sh); sx = (sw - s) / 2; sy = (sh - s) / 2; sw = sh = s; }
    const sc = Math.min(1, max / Math.max(sw, sh)), w = Math.round(sw * sc), h = Math.round(sh * sc);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    const b = await new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.84));
    return { bytes: new Uint8Array(await b.arrayBuffer()), w, h };
  }
  F.post = async function (id, text, file) {
    let media = null;
    if (file) { const j = await jpeg(file, 1600, false); const path = `${id}/${uuid()}.jpg`; await Api.upload('follow-media', path, j.bytes, 'image/jpeg'); media = { path, w: j.w, h: j.h }; }
    if (!String(text || '').trim() && !media) return;
    await Api.rest('POST', 'follow_posts', { channel_id: id, body: String(text || '').trim().slice(0, 4000), media });
    await F.loadPosts(id); await F.refresh(id);
  };
  F.editPost = async function (p, text) { await Api.rest('PATCH', `follow_posts?id=eq.${p.id}`, { body: String(text).trim().slice(0, 4000) }); await F.loadPosts(p.channel); };
  F.deletePost = async function (p) {
    await Api.rest('PATCH', `follow_posts?id=eq.${p.id}`, { deleted: true });
    if (p.media && p.media.path) try { await Api.remove('follow-media', [p.media.path]); } catch (e) { }
    F.posts.set(p.channel, (F.posts.get(p.channel) || []).filter((x) => x.id !== p.id)); S.changed('follow');
  };
  F.cleanHandle = (h) => String(h || '').trim().replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 30);
  F.create = async function (o) {
    const h = F.cleanHandle(o.handle);
    const r = (await Api.rest('POST', 'follow_channels', { name: String(o.name).trim().slice(0, 60), handle: h.length >= 3 ? h : null, about: String(o.about || '').trim().slice(0, 500), category: String(o.category || '').trim().slice(0, 40), server_id: o.server || null }, 'return=representation'))[0];
    const c = fch(r); F.channels.set(c.id, c); F.admin.add(c.id); try { await F.follow(c.id); } catch (e) { } return c.id;
  };
  F.save = async function (c, o) {
    const h = F.cleanHandle(o.handle);
    await Api.rest('PATCH', `follow_channels?id=eq.${c.id}`, { name: String(o.name).trim().slice(0, 60), handle: h.length >= 3 ? h : null, about: String(o.about || '').trim().slice(0, 500), category: String(o.category || '').trim().slice(0, 40), reactions_on: !!o.reactions });
    await F.refresh(c.id);
  };
  F.setIcon = async function (c, file) {
    const j = await jpeg(file, 512, true); const path = `${c.id}/icon-${uuid()}.jpg`;
    await Api.upload('follow-media', path, j.bytes, 'image/jpeg');
    await Api.rest('PATCH', `follow_channels?id=eq.${c.id}`, { icon_path: path });
    if (c.icon) try { await Api.remove('follow-media', [c.icon]); } catch (e) { }
    await F.refresh(c.id);
  };
  F.deleteChannel = async function (c) {
    await Api.rest('DELETE', `follow_channels?id=eq.${c.id}`);
    F.channels.delete(c.id); F.following.delete(c.id); F.admin.delete(c.id); F.posts.delete(c.id); if (F.open === c.id) F.open = null; S.changed('follow');
  };
  F.img = (path) => (path ? Api.publicUrl('follow-media', path) : null);
  F.shareText = (c) => tr('Folge dem Kanal „{0}“ im Zunora Messenger!').replace('{0}', c.name) + '\n' + (c.handle ? `@${c.handle}  ·  zunora://kanal/${c.handle}` : 'zunora://kanal/' + c.id) + '\n' + tr('(Messenger → Server → 📢 Kanäle → suchen)');

  // nach dem Anmelden: Ordner, geplante Nachrichten, Bilder-Schlüssel
  const start0 = S.start.bind(S);
  S.start = async function () {
    const ok = await start0();
    if (ok && !this.offlineStart) { this.loadFolders().catch(() => { }); this.loadPlanned().catch(() => { }); this.ensurePics().catch(() => { }); F.loadMine().catch(() => { }); }
    return ok;
  };
  const cu0 = S.catchUp.bind(S);
  S.catchUp = function (force) { cu0(force); if (Api.loggedIn && !this.offlineStart) { this.loadFolders().catch(() => { }); this.loadPlanned().catch(() => { }); this.ensurePics().catch(() => { }); } };
})(typeof window !== 'undefined' ? window : globalThis);
