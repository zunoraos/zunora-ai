/* Zunora Messenger am PC — ohne Internet weiter schreiben (Beta 2).
   Zwischenspeicher: Chats, letzte Nachrichten, Profile, öffentliche Geräte-Schlüssel — verschlüsselt mit einem nicht auslesbaren
   AES-Schlüssel dieses PCs (IndexedDB), damit der Messenger auch offline startet.
   Ausgang: Nachrichten ohne Verbindung stehen mit 🕓 im Chat und gehen raus, sobald wieder Internet da ist (gleiche Kennung). */
(function (root) {
  'use strict';
  const { Api, DB } = root.ZM;
  const S = root.ZM.Store;
  const OFF = 'Keine Verbindung zum Zunora-Server.';
  const isOffline = (e) => !!e && (e.message === OFF || e.name === 'TypeError' && /fetch/i.test(e.message || ''));

  // ---------------------------------------------------------------- lokaler Schlüssel (nicht auslesbar)
  let key = null;
  async function k() {
    if (key) return key;
    key = await DB.get('lokal-schluessel');
    if (!key) { key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); await DB.put('lokal-schluessel', key); }
    return key;
  }
  async function seal(obj) { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await k(), new TextEncoder().encode(JSON.stringify(obj))); return { iv, ct }; }
  async function open(box) { if (!box || !box.iv) return null; try { return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: box.iv }, await k(), box.ct))); } catch (e) { return null; } }
  async function sealBytes(bytes) { const iv = crypto.getRandomValues(new Uint8Array(12)); return { iv, ct: await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await k(), bytes) }; }
  async function openBytes(box) { if (!box || !box.iv) return null; try { return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: box.iv }, await k(), box.ct)); } catch (e) { return null; } }

  // ---------------------------------------------------------------- Zwischenspeicher
  const setJson = (m) => Object.fromEntries(Object.entries(m || {}).map(([e, s]) => [e, [...s]]));
  let saveT = null;
  const Cache = {
    saveSoon() { if (!Api.userId) return; clearTimeout(saveT); saveT = setTimeout(() => this.save().catch(() => { }), 2500); },
    async save() {
      const recent = [...S.chats.values()].sort((a, b) => b.lastAt - a.lastAt).slice(0, 60);
      const users = new Set([Api.userId]); recent.forEach((c) => c.members.forEach((m) => users.add(m.userId)));
      const data = {
        chats: recent,
        messages: Object.fromEntries(recent.map((c) => [c.id, (S.messages.get(c.id) || []).filter((m) => !m.viewOnce).slice(-100).map((m) => Object.assign({}, m, { reactions: setJson(m.reactions) }))])),
        profiles: [...users].map((u) => S.profiles.get(u)).filter(Boolean).map((p) => ({ id: p.id, username: p.username, display: p.display, about: p.about, avatar: p.avatar })),
        devices: [...S.devicesOf.entries()].map(([u, v]) => [u, v[1]]),
        sync: [...S.syncedAt.entries()].filter(([k]) => recent.some((c) => c.id === k)),
        servers: [...S.servers.values()],
        serverState: [...S.serverState.entries()].map(([id, st]) => [id, Object.assign({}, st, { members: st.members.map((m) => Object.assign({}, m, { roles: [...m.roles] })) })]),
        stateAt: [...S.stateAt.entries()],
      };
      await DB.put('zwischenspeicher-' + Api.userId, await seal(data));
    },
    async load() {
      const d = await open(await DB.get('zwischenspeicher-' + Api.userId)); if (!d) return false;
      (d.profiles || []).forEach((p) => S.profiles.set(p.id, S.prof({ id: p.id, username: p.username, display_name: p.display, about: p.about, avatar_path: p.avatar })));
      S.me = S.profiles.get(Api.userId) || S.me;
      (d.devices || []).forEach(([u, list]) => { S.devicesOf.set(u, [0, list]); list.forEach((x) => S.signKeys.set(x.id, x.sign_key)); });
      S.chats = new Map((d.chats || []).map((c) => [c.id, c]));
      (d.sync || []).forEach(([k, v]) => S.syncedAt.set(k, v));
      if (d.servers && !S.servers.size) { S.servers = new Map(d.servers.map((s) => [s.id, s])); (d.serverState || []).forEach(([id, st]) => { st.members = (st.members || []).map((m) => Object.assign(m, { roles: new Set(m.roles || []) })); S.serverState.set(id, st); }); (d.stateAt || []).forEach(([k, v]) => S.stateAt.set(k, v)); S.changed('servers'); }
      Object.entries(d.messages || {}).forEach(([chat, list]) => S.messages.set(chat, list.map((m) => Object.assign(m, { reactions: Object.fromEntries(Object.entries(m.reactions || {}).map(([e, a]) => [e, new Set(a)])) }))));
      S.changed('chats');
      return true;
    },
  };

  // ---------------------------------------------------------------- Ausgang
  let items = [], loaded = false, timer = null, busy = false;
  const Outbox = {
    get count() { return items.length; },
    async init() {
      if (loaded === Api.userId) return; loaded = Api.userId;
      items = (await open(await DB.get('ausgang-' + Api.userId))) || [];
      // was der Zwischenspeicher noch als „wartet" kennt, aber nicht mehr im Ausgang liegt, ist schon gesendet
      const ids = new Set(items.map((o) => o.id));
      S.messages.forEach((l) => l.forEach((m) => { if (m.waiting && !ids.has(m.id)) { m.waiting = false; m.pending = false; } }));
      // wartende Nachrichten wieder im Chat zeigen (falls der Zwischenspeicher sie noch nicht hatte)
      for (const o of items) {
        if (o.t !== 'chat' && !(o.t === 'datei' && o.chat)) continue;
        const l = S.messages.get(o.chat) || [];
        if (!l.some((m) => m.id === o.id)) S.messages.set(o.chat, [...l, { id: o.id, chatId: o.chat, sender: Api.userId, kind: o.t === 'chat' ? o.kind : 'text', at: Date.now(),
          content: o.t === 'chat' ? o.content : { t: '📎 ' + o.name }, pending: true, waiting: true, reactions: {}, replyTo: o.reply }]);
      }
      if (items.length) { S.changed('messages'); this.kick(); }
    },
    reset() { items = []; loaded = null; clearTimeout(timer); timer = null; },
    async persist() { await DB.put('ausgang-' + Api.userId, await seal(items)); S.changed('chats'); },
    /** bytes (nur bei Dateien) liegen getrennt und verschlüsselt in der Ablage */
    async add(o, bytes) { if (bytes) await DB.put('ausgang-datei-' + o.id, await sealBytes(bytes)); items.push(o); await this.persist(); this.kick(); },
    kick() { clearTimeout(timer); const tick = async () => { timer = null; if (!(await this.flush())) timer = setTimeout(tick, 15000); }; timer = setTimeout(tick, 50); },
    /** true = alles raus; false = noch offline */
    async flush() {
      if (busy) return false; busy = true;
      try {
        while (items.length) {
          const o = items[0];
          try {
            if (o.t === 'chat') await S.deliver(o.chat, o.kind, o.content, o.reply, o.id, o.vo);
            else if (o.t === 'kanal') await S.deliverChannel(o.ch, o.content, o.kind, o.thread, o.title, o.id);
            else if (o.t === 'datei') {
              const bytes = await openBytes(await DB.get('ausgang-datei-' + o.id));
              if (!bytes) throw new Error('Die Datei ist nicht mehr da.');
              await S.deliverFile(o, bytes);
            }
          } catch (e) {
            if (isOffline(e)) return false;
            console.warn('Ausgang:', e); S.markFailed(o.id, 'Nicht gesendet: ' + (e.message || 'Fehler'));
          }
          items.shift(); if (o.t === 'datei') await DB.put('ausgang-datei-' + o.id, null); await this.persist();
        }
        return true;
      } finally { busy = false; }
    },
  };
  root.addEventListener('online', () => Outbox.kick());

  root.ZM.Offline = { Cache, Outbox, isOffline, OFF, sealBytes, openBytes, seal, open };
})(window);
