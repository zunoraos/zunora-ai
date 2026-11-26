/* Zunora Messenger am PC — Beta 2 (Teil 2): Datenschutz am Konto, online / zuletzt online, Server stummschalten,
   Status mit Auswahl „wer sieht ihn", Antworten auf Status, Chat-Verlauf übertragen (Code), Nutzername/Passwort ändern.
   Gleiche Abläufe und gleiches Verschlüsselungs-Format wie am Handy (MKonto.kt, MStatus.kt, MTransfer.kt). */
(function (root) {
  'use strict';
  const { Api, DB } = root.ZM;
  const S = root.ZM.Store;
  const C = root.ZMC;
  const O = () => root.ZM.Offline;
  const time = (s) => (s ? Date.parse(s) : 0) || 0;
  const enc = new TextEncoder(), dec = new TextDecoder();

  // =================================================================================== Datenschutz (am Konto, alle Geräte)
  const P = S.privacy = { readReceipts: true, lastSeen: false, online: false };
  S.loadPrivacy = async function () {
    const r = (await Api.list(`profiles?id=eq.${Api.userId}&select=read_receipts,show_last_seen,show_online`))[0];
    if (r) { P.readReceipts = r.read_receipts !== false; P.lastSeen = !!r.show_last_seen; P.online = !!r.show_online; }
    this.changed('privacy');
  };
  S.setPrivacy = async function (field, v) {
    await Api.rest('PATCH', `profiles?id=eq.${Api.userId}`, { [field]: !!v });
    if (field === 'read_receipts') P.readReceipts = !!v; if (field === 'show_last_seen') P.lastSeen = !!v; if (field === 'show_online') P.online = !!v;
    this.changed('privacy');
  };
  // Lesebestätigung kommt jetzt vom Konto (vorher nur dieses Gerät)
  Object.defineProperty(S, 'readReceipts', { configurable: true, get() { return P.readReceipts; }, set(v) { S.setPrivacy('read_receipts', v).catch(() => { }); } });
  // aus → man sieht die blauen Haken bei anderen auch nicht (wie bei WhatsApp)
  const ticks0 = S.ticks; S.ticks = function (m) { const t = ticks0.call(this, m); return !P.readReceipts && t === 3 ? 2 : t; };
  // Text in Meldungen (nur dieses Gerät)
  Object.defineProperty(S, 'showText', { configurable: true, get() { return localStorage.getItem('zm-vorschau') !== '0'; }, set(v) { localStorage.setItem('zm-vorschau', v ? '1' : '0'); } });

  // ---- online / zuletzt online
  S.presence = new Map();
  S.loadPresence = async function (users) {
    const u = [...new Set(users)].filter((x) => x && x !== Api.userId).slice(0, 200); if (!u.length) return;
    const rows = (await Api.rpc('presence', { users: u })) || [];
    rows.forEach((r) => this.presence.set(r.user_id, { online: !!r.online, lastSeen: time(r.last_seen) }));
    this.changed('presence');
  };
  S.presenceLabel = function (u) {
    const p = this.presence.get(u); if (!p) return '';
    if (p.online) return 'online';
    if (!p.lastSeen) return '';
    const d = new Date(p.lastSeen), now = new Date(); const hm = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = Math.round((day(now) - day(d)) / 86400000);
    return 'zuletzt online ' + (diff === 0 ? 'heute um ' + hm : diff === 1 ? 'gestern um ' + hm : 'am ' + d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + ' um ' + hm);
  };
  // Herzschlag: solange das Fenster sichtbar ist, jede Minute „bin da"
  const beat = () => { if (document.visibilityState === 'visible' && Api.loggedIn && S.deviceId && !S.offlineStart) Api.rpc('touch').catch(() => { }); };
  setInterval(beat, 60000);
  document.addEventListener('visibilitychange', beat);

  // ---- Profile frisch halten (Name/Bild aus anderen Zunora-Apps)
  S.refreshProfiles = async function (ids) {
    const miss = [...new Set(ids)].filter(Boolean);
    for (let i = 0; i < miss.length; i += 80) (await Api.list(`profiles?id=in.(${miss.slice(i, i + 80).join(',')})&select=id,username,display_name,about,avatar_path`)).forEach((r) => { const p = this.prof(r); this.profiles.set(r.id, p); if (r.id === Api.userId) this.me = p; });
    this.changed('chats');
  };

  // ---- Nutzername ändern (Zunora ID: Profil + Anmelde-Adresse; höchstens einmal am Tag)
  S.changeUsername = async function (name) {
    const n = Api.cleanName(name);
    if (!Api.nameOk(n)) throw new Error('Der Nutzername darf nur a–z, 0–9, Punkt und Unterstrich enthalten (3–24 Zeichen).');
    await Api.rpc('change_username', { new_name: n });
    Api.username = n; await Api.save(); await this.loadMe(); this.changed('chats');
    return n;
  };
  // ---- Passwort ändern (bisheriges prüfen)
  S.changePassword = async function (old, neu) {
    if (String(neu).length < 8) throw new Error('Das neue Passwort braucht mindestens 8 Zeichen.');
    const { code, res } = await Api.raw('POST', '/auth/v1/token?grant_type=password', { email: `${Api.username}@nutzer.zunora.invalid`, password: old }, { auth: false });
    if (code !== 200) throw new Error(code === 400 ? 'Das bisherige Passwort stimmt nicht.' : root.ZM.german(code, res ? await res.text() : ''));
    try { const t = (await res.json()).access_token; if (t) await Api.raw('POST', '/auth/v1/logout?scope=local', {}, { auth: false, headers: { Authorization: 'Bearer ' + t } }); } catch (e) { }
    await Api.fresh();
    const r = await Api.raw('PUT', '/auth/v1/user', { password: neu });
    if (r.code < 200 || r.code > 299) throw new Error(root.ZM.german(r.code, r.res ? await r.res.text() : ''));
  };

  // =================================================================================== Server stummschalten
  S.muteServer = async function (s, until) {
    await Api.rest('PATCH', `server_members?server_id=eq.${s}&user_id=eq.${Api.userId}`, { muted_until: until ? new Date(until).toISOString() : null });
    const x = this.servers.get(s); if (x) x.mutedUntil = until || 0; this.changed('servers');
  };
  S.muteChat = async function (c, until) { await this.mine(c, 'muted_until', until ? new Date(until).toISOString() : null); };
  S.MUTE = [['1 Stunde', 3600000], ['8 Stunden', 8 * 3600000], ['1 Tag', 86400000], ['1 Woche', 7 * 86400000], ['Immer', 100 * 365 * 86400000]];
  S.muteLabel = (until) => !until || until <= Date.now() ? '' : until - Date.now() > 50 * 365 * 86400000 ? 'stumm' : 'stumm bis ' + new Date(until).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  // =================================================================================== Status (mit Auswahl, wer ihn sieht)
  S.statusAudience = function () { try { const a = JSON.parse(localStorage.getItem('zm-status-publikum') || '{}'); return { mode: a.mode || 'all', users: a.users || [] }; } catch (e) { return { mode: 'all', users: [] }; } };
  S.saveStatusAudience = (a) => localStorage.setItem('zm-status-publikum', JSON.stringify({ mode: a.mode, users: [...a.users] }));
  S.audienceLabel = (a) => a.mode === 'except' ? (a.users.length ? `Alle Freunde außer ${a.users.length}` : 'Alle Freunde') : a.mode === 'only' ? `Nur ${a.users.length} ausgewählte` : 'Alle Freunde';
  S.statusMuted = (u) => { try { return (JSON.parse(localStorage.getItem('zm-status-stumm') || '[]')).includes(u); } catch (e) { return false; } };
  S.toggleStatusMute = function (u) { let l = []; try { l = JSON.parse(localStorage.getItem('zm-status-stumm') || '[]'); } catch (e) { } l = l.includes(u) ? l.filter((x) => x !== u) : [...l, u]; localStorage.setItem('zm-status-stumm', JSON.stringify(l)); this.changed('status'); };

  S.loadStatuses = async function () {
    const rows = await Api.list('statuses?select=id,user_id,sender_device,kind,cipher,created_at,expires_at,audience_mode&order=created_at.asc&limit=500')
      .catch(() => Api.list('statuses?select=id,user_id,sender_device,kind,cipher,created_at,expires_at&order=created_at.asc&limit=500'));
    const users = [...new Set(rows.map((r) => r.user_id))];
    await this.loadProfiles(users); await this.devices(users);
    const map = new Map();
    for (const o of rows) {
      let content = null, problem = null;
      try { content = (await C.decrypt(o.cipher, 'status', o.id, o.sender_device, this.deviceId, this.keys, this.signKeys.get(o.sender_device))).content; } catch (e) { problem = e.message; }
      if (problem && o.user_id !== Api.userId) continue;            // nicht für mich verschlüsselt → nicht zeigen
      const it = { id: o.id, user: o.user_id, at: time(o.created_at), exp: time(o.expires_at), content, problem, mode: o.audience_mode || 'all' };
      (map.get(o.user_id) || map.set(o.user_id, []).get(o.user_id)).push(it);
    }
    this.statuses = map; this.changed('status');
  };
  function targets(a) {
    const friends = S.friends.filter((f) => f.st === 'accepted').map((f) => f.p.id);
    return a.mode === 'except' ? friends.filter((u) => !a.users.includes(u)) : a.mode === 'only' ? friends.filter((u) => a.users.includes(u)) : friends;
  }
  S.postStatusContent = async function (content, kind, a) {
    a = a || this.statusAudience();
    const who = targets(a);
    if (a.mode === 'only' && !who.length) throw new Error('Wähle mindestens einen Freund aus.');
    const id = crypto.randomUUID();
    const cipher = await C.encrypt(content, 'status', id, this.deviceId, this.keys, await this.devices([...who, Api.userId], true));
    await Api.rest('POST', 'statuses', { id, kind, cipher, sender_device: this.deviceId, audience: a.mode === 'all' ? null : who, audience_mode: a.mode });
    this.saveStatusAudience(a);
    await this.loadStatuses();
  };
  S.postStatus = function (text, bg, font, a) { return this.postStatusContent({ t: String(text).trim().slice(0, 700), bg, f: font || '' }, 'text', a); };
  S.postStatusImage = async function (file, caption, a) {
    const img = await createImageBitmap(file); const sc = Math.min(1, 1440 / Math.max(img.width, img.height));
    const cv = document.createElement('canvas'); cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    const jpeg = new Uint8Array(await (await new Promise((ok) => cv.toBlob(ok, 'image/jpeg', 0.8))).arrayBuffer());
    const s = await C.sealFile(jpeg); const path = `${Api.userId}/${crypto.randomUUID()}.bin`;
    await Api.upload('status-media', path, s.bytes);
    return this.postStatusContent({ t: String(caption || '').trim().slice(0, 300), media: { path, key: s.key, iv: s.iv, sha: s.sha, w: cv.width, h: cv.height } }, 'image', a);
  };
  S.statusMedia = async function (it) {
    const k = 'status:' + it.id; if (this.mediaCache.has(k)) return this.mediaCache.get(k);
    const md = it.content.media; const bytes = await C.openFile(await Api.download('status-media', md.path), md.key, md.iv, md.sha);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' })); this.mediaCache.set(k, url); return url;
  };
  S.statusViewers = async function (it) {
    const rows = await Api.list(`status_views?status_id=eq.${it.id}&select=viewer,seen_at&order=seen_at.desc`).catch(() => Api.list(`status_views?status_id=eq.${it.id}&select=viewer`));
    await this.loadProfiles(rows.map((r) => r.viewer)); return rows.map((r) => ({ user: r.viewer, at: time(r.seen_at) }));
  };
  S.deleteStatus = async function (it) {
    await Api.rest('DELETE', `statuses?id=eq.${it.id}`);
    const p = it.content && it.content.media && it.content.media.path; if (p) try { await Api.remove('status-media', [p]); } catch (e) { }
    await this.loadStatuses();
  };
  S.statusPreview = (it) => it.content && it.content.media ? '📷 Foto' + (it.content.t ? ' · ' + it.content.t : '') : String((it.content || {}).t || '').slice(0, 120);
  /** Antwort / Reaktion → Nachricht im Chat mit der Person (mit Hinweis auf den Status). */
  S.replyStatus = async function (it, text) {
    let chat = [...this.chats.values()].find((c) => !c.group && c.members.some((m) => m.userId === it.user));
    let id = chat && chat.id;
    if (!id) { const p = this.profiles.get(it.user); id = await this.openDirect(p); }
    await this.send(id, 'text', { t: String(text).trim().slice(0, 2000), status: { id: it.id, u: it.user, p: this.statusPreview(it), bg: (it.content || {}).bg || '' } });
  };

  // =================================================================================== übertragener Verlauf (dieses Gerät)
  const V = { map: new Map(), user: '' };
  async function verlaufLoad() {
    if (V.user === Api.userId) return; V.map = new Map(); V.user = Api.userId;
    const o = O(); if (!o) return;
    const d = await o.open(await DB.get('verlauf-' + Api.userId)); if (d) Object.entries(d).forEach(([k, v]) => V.map.set(k, v));
  }
  async function verlaufAdd(entries) { await verlaufLoad(); Object.entries(entries).forEach(([k, v]) => V.map.set(k, v)); await DB.put('verlauf-' + Api.userId, await O().seal(Object.fromEntries(V.map))); }
  S.verlaufSize = () => V.map.size;
  const toMsg0 = S.toMsg;
  S.toMsg = async function (o) {
    const m = await toMsg0.call(this, o);
    if (m.problem && !m.deleted) { await verlaufLoad(); const h = V.map.get(m.id); if (h) { m.content = h; m.problem = null; m.check = 'OK'; } }
    return m;
  };
  const forget0 = S.forgetDevice;
  S.forgetDevice = async function () { if (Api.userId) { await DB.put('verlauf-' + Api.userId, null); } V.map = new Map(); V.user = ''; T.reset(); return forget0.call(this); };

  // =================================================================================== Chat-Verlauf übertragen
  const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', ITER = 150000;
  const T = S.Transfer = {
    request: null, phase: '', message: '', offer: false, incoming: null, codes: new Map(), busy: new Set(), _lock: Promise.resolve(),
    norm: (c) => String(c || '').toUpperCase().split('').filter((x) => ABC.includes(x)).join(''),
    pretty(c) { return (this.norm(c).match(/.{1,4}/g) || []).join('-'); },
    newCode() { const r = crypto.getRandomValues(new Uint32Array(8)); return [...r].map((x) => ABC[x % ABC.length]).join(''); },
    async codeKey(code, id, iter = ITER) {
      const k = await crypto.subtle.importKey('raw', enc.encode(this.norm(code)), 'PBKDF2', false, ['deriveBits']);
      return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode('zunora-transfer|' + id), iterations: iter }, k, 256));
    },
    async lockInner(inner, code, id, iter = ITER) { const s = await C.seal(await this.codeKey(code, id, iter), enc.encode(JSON.stringify(inner)), enc.encode(id)); return C.b64(s.iv) + '.' + C.b64(s.ct); },
    async unlockInner(w, code, id, iter = ITER) {
      try { const [a, b] = String(w).split('.'); return JSON.parse(dec.decode(await C.open(await this.codeKey(code, id, iter), C.unb64(a), C.unb64(b), enc.encode(id)))); } catch (e) { return null; }
    },
    async gzip(bytes) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()); },
    async gunzip(bytes) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()); },
    set(k, v) { this[k] = v; S.changed('transfer'); },
    reset() { this.request = null; this.phase = ''; this.message = ''; this.offer = false; this.incoming = null; this.codes.clear(); this.busy.clear(); S.changed('transfer'); },

    check() { this._lock = this._lock.then(() => this.checkNow()).catch((e) => console.warn('Übertragung:', e)); return this._lock; },
    async checkNow() {
      if (!S.deviceId || !Api.loggedIn) return;
      const rows = await Api.list('transfers?select=id,new_device,new_name,status,from_device,code_cipher,expires_at&order=created_at.desc&limit=8');
      const now = Date.now(); let mineActive = false;
      for (const r of rows) {
        const alive = time(r.expires_at) > now;
        if (r.new_device === S.deviceId) {
          if (r.id === this.request || (!this.request && alive && ['waiting', 'packing', 'ready'].includes(r.status))) {
            this.request = r.id; mineActive = alive && !['done', 'rejected'].includes(r.status);
            this.phase = { waiting: 'warten', packing: 'packen', ready: ['laden', 'fertig'].includes(this.phase) ? this.phase : 'bereit', rejected: 'abgelehnt' }[r.status] || this.phase;
            if (r.status === 'rejected') this.message = 'Dein anderes Gerät hat die Übertragung abgelehnt.';
          }
        } else if (alive || (this.incoming && this.incoming.id === r.id)) await this.handleIncoming(r);
      }
      await verlaufLoad();
      if (!mineActive && !this.phase && !V.map.size && localStorage.getItem('zm-verlauf-frage-' + S.deviceId) !== '1') {
        const others = (await S.myDevices().catch(() => [])).filter((d) => !d.revoked && d.id !== S.deviceId).length;
        this.offer = others > 0;
      }
      S.changed('transfer');
    },
    dismissOffer() { this.offer = false; localStorage.setItem('zm-verlauf-frage-' + S.deviceId, '1'); S.changed('transfer'); },

    // ---- neues Gerät
    async start() {
      this.dismissOffer();
      const res = await Api.rest('POST', 'transfers', { new_device: S.deviceId, new_name: 'PC (Windows)' }, 'return=representation');
      this.request = res[0].id; this.phase = 'warten'; this.message = ''; S.changed('transfer');
    },
    async enter(code) {
      const id = this.request; if (!id) throw new Error('Bitte zuerst „Verlauf holen“ anklicken.');
      if (this.norm(code).length !== 8) throw new Error('Der Code hat 8 Zeichen (z. B. ABCD-EFGH).');
      const r = (await Api.list(`transfers?id=eq.${id}&select=status,from_device,cipher,file_path,size`))[0];
      if (!r) throw new Error('Die Anfrage ist abgelaufen — bitte neu starten.');
      if (r.status !== 'ready') throw new Error(r.status === 'rejected' ? 'Die Übertragung wurde abgelehnt.' : 'Noch nicht bereit — öffne den Messenger auf deinem anderen Gerät und warte, bis der Code erscheint.');
      this.set('phase', 'laden'); this.message = 'Code wird geprüft …';
      try {
        await S.devices([Api.userId], true);
        const opened = await C.decrypt(r.cipher, 'transfer', id, r.from_device, S.deviceId, S.keys, S.signKeys.get(r.from_device));
        if (opened.check !== 'OK') throw new Error('Die Übertragung ist nicht von deinem Gerät unterschrieben — abgebrochen.');
        const inner = await this.unlockInner(opened.content.w, code, id);
        if (!inner) { this.phase = 'bereit'; throw new Error('Der Code stimmt nicht.'); }
        this.set('message', 'Verlauf wird geladen …');
        const plain = await this.gunzip(await C.openFile(await Api.download('transfer', inner.path), inner.key, inner.iv, inner.sha));
        const [n, chats] = await this.importBundle(JSON.parse(dec.decode(plain)));
        try { await Api.rest('PATCH', `transfers?id=eq.${id}`, { status: 'done' }); } catch (e) { }
        try { await Api.remove('transfer', [inner.path]); } catch (e) { }
        this.phase = 'fertig'; this.message = `✓ Übertragen: ${n} Nachrichten aus ${chats} Chats.`; S.changed('transfer');
        try { await S.loadChats(); if (S.openChat) await S.loadMessages(S.openChat); } catch (e) { }
      } catch (e) { if (this.phase === 'laden') this.phase = 'bereit'; S.changed('transfer'); throw e; }
    },
    async importBundle(o) {
      const entries = {}; const chats = o.chats || {};
      Object.values(chats).forEach((list) => (list || []).forEach((m) => { if (m && m.id && m.c) entries[m.id] = m.c; }));
      await verlaufAdd(entries);
      const s = o.settings || {};
      if ('showText' in s) localStorage.setItem('zm-vorschau', s.showText ? '1' : '0');
      if ('updates' in s) localStorage.setItem('zm-update', s.updates ? '1' : '0');
      if (Array.isArray(s.statusMuted)) localStorage.setItem('zm-status-stumm', JSON.stringify(s.statusMuted));
      if (s.statusAudience) localStorage.setItem('zm-status-publikum', JSON.stringify(s.statusAudience));
      Object.entries(o.drafts || {}).forEach(([chat, t]) => { if (!S.draft(chat)) S.setDraft(chat, t); });
      return [Object.keys(entries).length, Object.keys(chats).length];
    },

    // ---- altes Gerät
    async handleIncoming(r) {
      const id = r.id, name = r.new_name || 'Neues Gerät';
      if (r.status === 'waiting') {
        if (this.busy.has(id)) return; this.busy.add(id);
        const won = await Api.rest('PATCH', `transfers?id=eq.${id}&status=eq.waiting`, { status: 'packing', from_device: S.deviceId }, 'return=representation').catch(() => null);
        if (!won || !won.length) { this.busy.delete(id); return; }
        this.set('incoming', { id, name, code: null, status: 'packing', packer: true });
        try { await this.pack(id, r.new_device, name); }
        catch (e) {
          this.message = e.message; this.set('incoming', { id, name, code: null, status: 'fehler', packer: true });
          try { await Api.rest('PATCH', `transfers?id=eq.${id}`, { status: 'waiting', from_device: null }); } catch (x) { }
          this.busy.delete(id);
        }
      } else if (r.status === 'packing') { if (!this.incoming || this.incoming.id !== id) this.set('incoming', { id, name, code: null, status: 'packing', packer: r.from_device === S.deviceId }); }
      else if (r.status === 'ready') {
        let code = this.codes.get(id);
        if (!code && r.code_cipher) try { await S.devices([Api.userId]); code = (await C.decrypt(r.code_cipher, 'transfer-code', id, r.from_device, S.deviceId, S.keys, S.signKeys.get(r.from_device))).content.code; this.codes.set(id, code); } catch (e) { }
        this.set('incoming', { id, name, code: code || null, status: 'ready', packer: r.from_device === S.deviceId });
      } else if (r.status === 'done') { if (this.incoming && this.incoming.id === id) this.set('incoming', Object.assign({}, this.incoming, { status: 'done' })); }
      else if (r.status === 'rejected') { if (this.incoming && this.incoming.id === id) this.set('incoming', null); }
    },
    async pack(id, newDevice, name) {
      const bundle = await this.buildBundle();
      const sealed = await C.sealFile(await this.gzip(enc.encode(JSON.stringify(bundle))));
      if (sealed.bytes.length > 48 * 1024 * 1024) throw new Error('Der Verlauf ist zu groß zum Übertragen.');
      const path = `${Api.userId}/${id}.bin`;
      await Api.upload('transfer', path, sealed.bytes);
      const code = this.newCode();
      const w = await this.lockInner({ path, key: sealed.key, iv: sealed.iv, sha: sealed.sha, size: sealed.bytes.length }, code, id);
      const mine = await S.devices([Api.userId], true);
      const target = mine.find((d) => d.id === newDevice); if (!target) throw new Error('Das neue Gerät ist nicht mehr angemeldet.');
      const cipher = await C.encrypt({ w }, 'transfer', id, S.deviceId, S.keys, [target]);
      const others = mine.filter((d) => d.id !== newDevice && d.id !== S.deviceId);
      const codeCipher = others.length ? await C.encrypt({ code }, 'transfer-code', id, S.deviceId, S.keys, others) : null;
      this.codes.set(id, code);
      await Api.rest('PATCH', `transfers?id=eq.${id}`, { status: 'ready', cipher, code_cipher: codeCipher, file_path: path, size: sealed.bytes.length });
      this.set('incoming', { id, name, code, status: 'ready', packer: true });
    },
    async buildBundle() {
      const chats = {}; let total = 0;
      for (const c of [...S.chats.values()]) {
        await S.devices(c.members.map((m) => m.userId));
        const out = []; let before = null;
        while (out.length < 3000 && total < 35000000) {
          const older = before ? `&created_at=lt.${Api.q(before)}` : '';
          const rows = await Api.list(`messages?chat_id=eq.${c.id}&select=id,chat_id,sender_id,sender_device,kind,cipher,created_at,deleted,edited_at,reply_to,view_once,expires_at,pinned${older}&order=created_at.desc&limit=500`);
          if (!rows.length) break;
          for (const row of rows) {
            if (row.view_once) continue;
            const m = await S.toMsg(row);
            if (!m.deleted && m.content) { const e = { id: m.id, s: m.sender, k: m.kind, a: m.at, c: m.content, r: m.replyTo || null }; total += JSON.stringify(e).length; out.push(e); }
          }
          before = rows[rows.length - 1].created_at;
          if (rows.length < 500) break;
        }
        if (out.length) chats[c.id] = out;
      }
      let statusMuted = [], statusAudience = null; try { statusMuted = JSON.parse(localStorage.getItem('zm-status-stumm') || '[]'); statusAudience = JSON.parse(localStorage.getItem('zm-status-publikum') || 'null'); } catch (e) { }
      const drafts = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('zm-entwurf-')) drafts[k.slice(11)] = localStorage.getItem(k); }
      const settings = { showText: S.showText, updates: localStorage.getItem('zm-update') !== '0', statusMuted }; if (statusAudience) settings.statusAudience = statusAudience;
      return { v: 1, from: 'pc', at: Date.now(), chats, settings, drafts };
    },
    reject() {
      const i = this.incoming; if (!i) return; this.set('incoming', null);
      Api.rest('PATCH', `transfers?id=eq.${i.id}`, { status: 'rejected' }).then(() => Api.remove('transfer', [`${Api.userId}/${i.id}.bin`])).catch(() => { });
    },
    close() { this.set('incoming', null); },
  };

  // Live: Änderungen an Übertragungen sofort prüfen
  const onLive0 = S.onLive;
  S.onLive = async function (ch) { if (ch.table === 'transfers') return T.check(); return onLive0.call(this, ch); };
  // nach dem Start: Datenschutz laden, Übertragungen prüfen, Profile frisch halten
  const start0 = S.start;
  S.start = async function () {
    const ok = await start0.call(this);
    if (ok && !this.offlineStart) {
      try { await this.loadPrivacy(); } catch (e) { }
      beat(); T.check();
      const ids = () => [Api.userId, ...[...this.chats.values()].flatMap((c) => c.members.map((m) => m.userId)), ...this.friends.map((f) => f.p.id)];
      this.refreshProfiles(ids()).catch(() => { });
      if (!this._refreshTimer) this._refreshTimer = setInterval(() => { if (Api.loggedIn) this.refreshProfiles(ids()).catch(() => { }); }, 10 * 60000);
    }
    return ok;
  };
})(window);

/* ---- Freund entfernen = Chat + Verlauf weg (für beide) · Chat löschen (nur für mich) */
(function (root) {
  'use strict';
  const { Api } = root.ZM; const S = root.ZM.Store;
  const directWith = (u) => [...S.chats.values()].find((c) => !c.group && c.members.some((m) => m.userId === u));
  S.unfriend = async function (p) {
    const c = directWith(p.id);
    if (c) try {   // Dateien des gemeinsamen Chats wegräumen, solange der Chat noch besteht
      const { code, res } = await Api.raw('POST', '/storage/v1/object/list/chat-media', { prefix: c.id + '/', limit: 1000 });
      if (code === 200) { const l = (await res.json()).filter((f) => f.id).map((f) => c.id + '/' + f.name); if (l.length) await Api.remove('chat-media', l); }
    } catch (e) { }
    await Api.rpc('unfriend', { other: p.id });
    if (c) { this.chats.delete(c.id); this.messages.delete(c.id); this.setDraft(c.id, ''); if (this.openChat === c.id) this.openChat = null; }
    await this.loadFriends(); this.changed('chats'); this.saveCache && this.saveCache();
  };
  S.deleteChatForMe = async function (chat) {
    await Api.rpc('delete_chat_for_me', { c: chat });
    this.chats.delete(chat); this.messages.delete(chat); this.setDraft(chat, ''); if (this.openChat === chat) this.openChat = null;
    this.changed('chats'); this.changed('nav'); this.saveCache && this.saveCache();
  };
  S.UNFRIEND_TEXT = (name) => `${name} als Freund entfernen?\n\nEuer Chat und der ganze Verlauf werden dabei gelöscht — für euch beide. Das lässt sich nicht rückgängig machen.`;
  S.DELETE_CHAT_TEXT = (name) => `Chat mit ${name} löschen?\n\nDer Chat und euer Verlauf werden auf deinen Geräten gelöscht. Ihr bleibt Freunde — du kannst jederzeit einen neuen Chat starten.`;
})(window);

/* ---- Bilder/Dateien nicht jedes Mal neu laden: verschlüsselte Downloads bleiben auf diesem PC (bis 300 MB, älteste fliegen raus) */
(function (root) {
  'use strict';
  const { Api, DB } = root.ZM;
  const dl0 = Api.download.bind(Api);
  const LIMIT = 300 * 1024 * 1024;
  Api.download = async function (bucket, path) {
    if (!['chat-media', 'server-media', 'status-media'].includes(bucket)) return dl0(bucket, path);
    const k = 'medien:' + bucket + '/' + path;
    try { const hit = await DB.get(k); if (hit) return hit; } catch (e) { }
    const b = await dl0(bucket, path);
    if (b && b.length < 25 * 1024 * 1024) try {
      await DB.put(k, b);
      const idx = (await DB.get('medien-index')) || []; idx.push([k, b.length]);
      let total = idx.reduce((s, x) => s + x[1], 0);
      while (total > LIMIT && idx.length > 1) { const [ok, size] = idx.shift(); total -= size; await DB.put(ok, null); }
      await DB.put('medien-index', idx);
    } catch (e) { }
    return b;
  };
})(window);

/* ---- Server: Regeln, Suche, Erwähnungen, Kanäle stummschalten, Rollen/Rauswerfen/Bannen (wie am Handy) */
(function (root) {
  'use strict';
  const { Api } = root.ZM; const S = root.ZM.Store;
  const COLS = 'id,channel_id,sender_id,kind,body,created_at,edited_at,deleted,thread_id,thread_title,reply_to,pinned';
  S.PERMS = [[1, 'Kanäle verwalten'], [2, 'Rollen verwalten'], [4, 'Nachrichten verwalten (löschen, anheften, Ankündigungen)'], [8, 'Mitglieder entfernen'], [16, 'Mitglieder bannen'],
    [256, 'Auszeit geben'], [32, 'Einladen'], [64, '@everyone erwähnen'], [512, 'Termine veröffentlichen'], [128, 'Administrator (alles)']];
  S.saveRules = async function (s, rules) { await Api.rest('PATCH', `servers?id=eq.${s}`, { rules: String(rules || '').trim().slice(0, 4000) }); await this.loadServers(); };
  const hash = (t) => { let h = 0; for (const c of String(t)) h = (h * 31 + c.charCodeAt(0)) | 0; return h; };
  S.rulesSeen = (s) => localStorage.getItem('zm-regeln-' + s.id) === String(hash(s.rules));
  S.markRulesSeen = function (s) { localStorage.setItem('zm-regeln-' + s.id, String(hash(s.rules))); this.changed('servers'); };
  S.channelMuted = (ch) => { try { return JSON.parse(localStorage.getItem('zm-kanal-stumm') || '[]').includes(ch); } catch (e) { return false; } };
  S.toggleChannelMute = function (ch) { let l = []; try { l = JSON.parse(localStorage.getItem('zm-kanal-stumm') || '[]'); } catch (e) { } l = l.includes(ch) ? l.filter((x) => x !== ch) : [...l, ch]; localStorage.setItem('zm-kanal-stumm', JSON.stringify(l)); this.changed('servers'); };
  S.searchServer = async function (s, q) {
    const st = this.serverState.get(s); const ids = ((st && st.channels) || []).filter((c) => c.kind !== 'voice' && c.kind !== 'stage').map((c) => c.id);
    const t = String(q || '').replace(/[(),*]/g, ' ').trim(); if (!ids.length || t.length < 2) return [];
    const l = (await Api.list(`messages?channel_id=in.(${ids.join(',')})&deleted=is.false&body=ilike.${Api.q('*' + t + '*')}&select=${COLS}&order=created_at.desc&limit=50`)).map((r) => this.chMsg(r));
    await this.loadProfiles(l.map((m) => m.sender)); return l;
  };
  S.mentions = async function () {
    const me = (this.me || {}).username || Api.username; if (!me) return [];
    const re = new RegExp('(^|\\s)@(' + me.replace(/\./g, '\\.') + '|everyone|here)\\b', 'i');
    const l = (await Api.list(`messages?channel_id=not.is.null&deleted=is.false&sender_id=neq.${Api.userId}&or=(body.ilike.*@${me}*,body.ilike.*@everyone*,body.ilike.*@here*)&select=${COLS}&order=created_at.desc&limit=60`))
      .map((r) => this.chMsg(r)).filter((m) => re.test(m.content.t || ''));
    await this.loadProfiles(l.map((m) => m.sender)); return l;
  };
  S.saveRole = async function (s, role, name, color, perms, position) {
    const o = { name: String(name || '').trim().slice(0, 40) || 'Rolle', color, perms };
    if (!(role && role.is_default)) o.position = position;
    if (role) await Api.rest('PATCH', `server_roles?id=eq.${role.id}`, o); else await Api.rest('POST', 'server_roles', Object.assign(o, { server_id: s }));
    await this.loadServer(s);
  };
  S.deleteRole = async function (s, role) { await Api.rest('DELETE', `server_roles?id=eq.${role.id}`); await this.loadServer(s); };
  S.setMemberRole = async function (s, user, role, on) {
    if (on) await Api.rest('POST', 'member_roles', { server_id: s, user_id: user, role_id: role }); else await Api.rest('DELETE', `member_roles?server_id=eq.${s}&user_id=eq.${user}&role_id=eq.${role}`);
    await this.loadServer(s);
  };
  S.kick = async function (s, user) { await Api.rest('DELETE', `server_members?server_id=eq.${s}&user_id=eq.${user}`); await this.loadServer(s); };
  S.ban = async function (s, user, reason) { await Api.rpc('ban_member', { s, u: user, reason: String(reason || '').trim() || null }); await this.loadServer(s); };
  S.bans = async function (s) { const l = await Api.list(`server_bans?server_id=eq.${s}&select=user_id,reason,created_at`); await this.loadProfiles(l.map((b) => b.user_id)); return l; };
  S.unban = async function (s, user) { await Api.rest('DELETE', `server_bans?server_id=eq.${s}&user_id=eq.${user}`); };
})(window);

/* ---- Anrufe: Verbindungsqualität, wer spricht, Ablehnen mit Kurznachricht (wie am Handy) */
(function (root) {
  'use strict';
  const S = root.ZM.Store;
  const wait = () => new Promise((ok) => { const t = setInterval(() => { if (root.ZMCall) { clearInterval(t); ok(root.ZMCall); } }, 100); });
  wait().then((Call) => {
    Call.quality = 0; Call.speaking = new Set();
    Call.QUICK = ['Kann gerade nicht — ich rufe dich zurück.', 'Bin unterwegs, schreib mir bitte.', 'Gleich, gib mir 5 Minuten.'];
    Call.declineWith = async function (text) { const inc = this.incoming; if (!inc) return; await this.decline(); try { await S.send(inc.chat, 'text', { t: text }); } catch (e) { } };
    setInterval(async () => {
      if (!Call.callId) { if (Call.quality) { Call.quality = 0; Call.speaking.clear(); Call.changed(); } return; }
      let worst = 3, any = false; const speak = new Set();
      for (const [k, r] of Call.remotes) {
        try {
          const st = await r.pc.getStats(); let rtt = -1, lost = 0, recv = 0, level = 0;
          st.forEach((s) => {
            if (s.type === 'candidate-pair' && s.state === 'succeeded' && s.nominated && typeof s.currentRoundTripTime === 'number') rtt = s.currentRoundTripTime;
            if (s.type === 'inbound-rtp' && s.kind === 'audio') { lost += s.packetsLost || 0; recv += s.packetsReceived || 0; }
            if ((s.type === 'inbound-rtp' || s.type === 'media-source' || s.type === 'track') && s.kind === 'audio' && typeof s.audioLevel === 'number' && s.type !== 'media-source') level = Math.max(level, s.audioLevel);
          });
          if (rtt >= 0 || recv > 0) { any = true; const loss = recv + lost > 0 ? lost / (recv + lost) : 0; worst = Math.min(worst, rtt > 0.6 || loss > 0.08 ? 1 : rtt > 0.3 || loss > 0.03 ? 2 : 3); }
          if (level > 0.04) speak.add(k);
        } catch (e) { }
      }
      const q = any ? worst : 0; const changed = q !== Call.quality || speak.size !== Call.speaking.size || [...speak].some((k) => !Call.speaking.has(k));
      Call.quality = q; Call.speaking = speak; if (changed) Call.changed();
    }, 2000);
  });
})(window);

/* ---- Profil-, Gruppen- und Server-Bilder nur einmal laden: auf diesem PC behalten (IndexedDB), danach sofort von hier */
(function (root) {
  'use strict';
  const { DB } = root.ZM; const S = root.ZM.Store;
  const pub = S.pic.bind(S);
  const urls = new Map(), busy = new Set();
  S.pic = function (path) {
    if (!path) return null;
    const u = urls.get(path); if (u) return u;
    if (!busy.has(path)) {
      busy.add(path);
      (async () => {
        try {
          let b = await DB.get('bild:' + path);
          if (!b) { const r = await fetch(pub(path)); if (!r.ok) return; b = new Uint8Array(await r.arrayBuffer()); await DB.put('bild:' + path, b); }
          urls.set(path, URL.createObjectURL(new Blob([b], { type: 'image/jpeg' }))); S.changed('bilder');
        } catch (e) { }
      })();
    }
    return pub(path);
  };
})(window);

/* ---- Abo „Zunora Plus" (Beta 5): vorerst nur das kostenlose Dankeschön für Tester (2 Monate, einmal pro Konto, nichts wird abgebucht) */
(function (root) {
  'use strict';
  const { Api } = root.ZM; const S = root.ZM.Store;
  S.sub = null;
  S.loadSub = async function () {
    const r = (await Api.rpc('my_subscription')) || []; const x = r[0] || {};
    this.sub = { plan: x.plan || null, source: x.source || '', ends: x.ends_at ? new Date(x.ends_at).getTime() : 0, active: !!x.active, offer: x.offer_available !== false };
    this.changed('sub'); return this.sub;
  };
  S.claimPlus = async function () { await Api.rpc('claim_tester_plus'); return this.loadSub(); };
})(window);
