/* Zunora Messenger am PC — Verbindung zum Zunora-Server (Supabase): Anmeldung, Daten, Dateien, Live-Verbindung.
   Gleiches Konto wie am Handy. Nur der öffentliche Schlüssel steckt hier (zm/config.json), nie der geheime. */
(function (root) {
  'use strict';
  // Zweites Konto (eigenes Fenster, Start mit --konto2): eigener Speicher, KEINE Verbindung zur Zunora ID der anderen Zunora-Programme
  const SECOND = /[?&]konto=2(&|$)/.test(location.search);

  // ----------------------------------------------------------------------------------- Ablage auf diesem PC (IndexedDB)
  const DB = {
    _db: null,
    open() {
      if (this._db) return Promise.resolve(this._db);
      return new Promise((ok, bad) => {
        const r = indexedDB.open('zunora-messenger', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => { this._db = r.result; ok(r.result); };
        r.onerror = () => bad(r.error);
      });
    },
    async get(k) { const d = await this.open(); return new Promise((ok, bad) => { const q = d.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => ok(q.result); q.onerror = () => bad(q.error); }); },
    async put(k, v) { const d = await this.open(); return new Promise((ok, bad) => { const t = d.transaction('kv', 'readwrite'); if (v === undefined || v === null) t.objectStore('kv').delete(k); else t.objectStore('kv').put(v, k); t.oncomplete = () => ok(); t.onerror = () => bad(t.error); }); },
  };

  const NAME_RE = /^[a-z0-9_.]{3,24}$/;
  const loginMail = (n) => `${n}@nutzer.zunora.invalid`;
  function german(code, text) {
    let m = ''; try { const o = JSON.parse(text); m = o.message || o.msg || o.error_description || o.error || ''; } catch (e) { m = text || ''; }
    if (/Invalid login credentials/i.test(m)) return 'Nutzername oder Passwort stimmt nicht.';
    if (/already registered|already exists|duplicate key.*username/i.test(m)) return 'Diesen Nutzernamen gibt es schon.';
    if (/Password should be/i.test(m)) return 'Das Passwort ist zu schwach (mindestens 8 Zeichen).';
    if (/row-level security|permission denied/i.test(m)) return 'Das darfst du hier nicht.';
    if (code === 0) return 'Keine Verbindung zum Zunora-Server.';
    if (code === 429) return 'Zu viele Versuche — bitte kurz warten.';
    return m || ('Fehler ' + code);
  }
  function jwtPayload(t) { try { return JSON.parse(decodeURIComponent(escape(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))))); } catch (e) { return {}; } }

  const Api = {
    url: '', anon: '', userId: '', username: '', access: '', refresh: '', exp: 0,
    async init() {
      const c = await (await fetch('zm/config.json', { cache: 'no-store' })).json();
      this.url = String(c.url || '').replace(/\/$/, ''); this.anon = c.anon || '';
      const s = await DB.get('sitzung');
      if (s) Object.assign(this, s);
    },
    configured() { return this.url.startsWith('https://') && !!this.anon; },
    get loggedIn() { return !!this.refresh && !!this.userId; },
    async save() { await DB.put('sitzung', { userId: this.userId, username: this.username, access: this.access, refresh: this.refresh, exp: this.exp }); },
    headers(auth) {
      const h = { apikey: this.anon };
      if (auth && this.access) h.Authorization = 'Bearer ' + this.access;
      else if (this.anon.startsWith('eyJ')) h.Authorization = 'Bearer ' + this.anon;
      return h;
    },
    async raw(method, path, body, opt = {}) {
      const h = Object.assign(this.headers(opt.auth !== false), opt.headers || {});
      let b = body;
      if (body !== undefined && body !== null && !(body instanceof Blob) && !(body instanceof ArrayBuffer) && !(body instanceof Uint8Array)) { b = JSON.stringify(body); h['Content-Type'] = 'application/json'; }
      try { const r = await fetch(this.url + path, { method, headers: h, body: b }); return { code: r.status, res: r }; }
      catch (e) { return { code: 0, res: null }; }
    },
    async fresh() {
      if (!this.refresh) throw new Error('Bitte anmelden.');
      if (this.access && Date.now() < this.exp - 60000) return;
      const { code, res } = await this.raw('POST', '/auth/v1/token?grant_type=refresh_token', { refresh_token: this.refresh }, { auth: false });
      const t = res ? await res.text() : '';
      if (code !== 200) { if (code >= 400 && code < 500) await this.logoutLocal(); throw new Error(german(code, t)); }
      this.take(JSON.parse(t)); await this.save();
    },
    take(o) {
      this.access = o.access_token; this.refresh = o.refresh_token || this.refresh;
      this.exp = (jwtPayload(this.access).exp || 0) * 1000;
      if (o.user && o.user.id) { this.userId = o.user.id; this.username = (o.user.user_metadata || {}).username || this.username; }
    },
    sessionId() { return jwtPayload(this.access).session_id || null; },
    /** Daten (PostgREST). */
    async rest(method, path, body, prefer) {
      await this.fresh();
      const { code, res } = await this.raw(method, '/rest/v1/' + path, body, { headers: prefer ? { Prefer: prefer } : {} });
      const t = res ? await res.text() : '';
      if (code < 200 || code > 299) { const err = new Error(german(code, t)); err.code = code; throw err; }
      if (!t.trim()) return null;
      try { return JSON.parse(t); } catch (e) { return t.trim().replace(/^"|"$/g, ''); }
    },
    async list(path) { return (await this.rest('GET', path)) || []; },
    async rpc(fn, args = {}) { return this.rest('POST', 'rpc/' + fn, args); },
    /** Edge Function mit Fehlertext ({ error } statt null), z. B. Kasse für Zunora Plus */
    async fnJson(name, body = {}) {
      await this.fresh();
      const { code, res } = await this.raw('POST', '/functions/v1/' + name, body);
      try { return await res.json(); } catch (e) { return { error: code ? `Der Server antwortet gerade nicht (${code}).` : 'Keine Verbindung zum Zunora-Server.' }; }
    },
    /** Server-Funktion (Edge Function); null, wenn es sie (noch) nicht gibt oder sie scheitert. */
    async fn(name, body = {}) {
      await this.fresh();
      const { code, res } = await this.raw('POST', '/functions/v1/' + name, body);
      if (code < 200 || code > 299 || !res) return null;
      try { return await res.json(); } catch (e) { return null; }
    },
    q: (s) => encodeURIComponent(s),

    // ----------------------------------------------------------------------------------- Anmelden
    cleanName: (n) => String(n || '').trim().toLowerCase(),
    nameOk: (n) => NAME_RE.test(n),
    async nameFree(n) {
      const { code, res } = await this.raw('POST', '/rest/v1/rpc/username_free', { name: this.cleanName(n) }, { auth: false });
      return code === 200 && (await res.text()).trim() === 'true';
    },
    async signUp(name, display, password) {
      const n = this.cleanName(name);
      const { code, res } = await this.raw('POST', '/auth/v1/signup', { email: loginMail(n), password, data: { username: n, display_name: (display || '').trim() || n } }, { auth: false });
      const t = res ? await res.text() : '';
      if (code < 200 || code > 299) throw new Error(german(code, t));
      const o = JSON.parse(t);
      if (!o.access_token) throw new Error('Der Server verlangt eine E-Mail-Bestätigung — das muss am Server ausgeschaltet sein.');
      this.take(o); this.username = n; await this.save();
    },
    async signIn(name, password) {
      const n = this.cleanName(name);
      const { code, res } = await this.raw('POST', '/auth/v1/token?grant_type=password', { email: loginMail(n), password }, { auth: false });
      const t = res ? await res.text() : '';
      if (code !== 200) throw new Error(german(code, t));
      this.take(JSON.parse(t)); this.username = n; await this.save();
    },
    /** Zunora ID: ist ein anderes Zunora-Programm auf diesem PC angemeldet, bekommt der Messenger eine eigene Sitzung (still). */
    async fromZunoraId() {
      if (SECOND || this.loggedIn || !root.Host || !root.Host.available) return false;   // zweites Konto: nie mit der Zunora ID verbunden
      try {
        const s = await root.Host.call('zid.auto');
        if (!s || !s.loggedIn) return false;
        const o = await root.Host.call('zid.extra');
        if (!o || !o.refresh_token) return false;
        this.take(o); await this.save(); return true;
      } catch (e) { return false; }
    },
    /** Nach dem Anmelden im Messenger: dasselbe Konto ist die Zunora ID der anderen Zunora-Programme (still, ohne Fehlermeldung). */
    shareToZunoraId(password) { if (SECOND) return; try { if (root.Host && root.Host.available && this.access) root.Host.call('zid.adopt', { token: this.access, password: password || '' }).catch(() => {}); } catch (e) { } },
    async logout(scope = 'local') {
      try { if (this.access) await this.raw('POST', '/auth/v1/logout?scope=' + scope); } catch (e) { }
      try { if (!SECOND && root.Host && root.Host.available) await root.Host.call('zid.logout', { everywhere: false }); } catch (e) { }
      if (scope !== 'others') await this.logoutLocal();
    },
    async logoutLocal() { this.access = ''; this.refresh = ''; this.userId = ''; this.username = ''; this.exp = 0; await DB.put('sitzung', null); },

    // ----------------------------------------------------------------------------------- Dateien
    async upload(bucket, path, bytes, mime = 'application/octet-stream') {
      await this.fresh();
      const { code, res } = await this.raw('POST', `/storage/v1/object/${bucket}/${path}`, new Blob([bytes], { type: mime }), { headers: { 'x-upsert': 'true', 'Content-Type': mime } });
      if (code < 200 || code > 299) throw new Error(german(code, res ? await res.text() : ''));
    },
    async download(bucket, path) {
      await this.fresh();
      const { code, res } = await this.raw('GET', `/storage/v1/object/authenticated/${bucket}/${path}`);
      if (code !== 200) throw new Error(german(code, res ? await res.text() : ''));
      return new Uint8Array(await res.arrayBuffer());
    },
    async remove(bucket, paths) {
      await this.fresh();
      const { code, res } = await this.raw('DELETE', `/storage/v1/object/${bucket}`, { prefixes: paths });
      if (code < 200 || code > 299) throw new Error(german(code, res ? await res.text() : ''));
    },
    publicUrl(bucket, path) { return `${this.url}/storage/v1/object/public/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`; },
  };

  // ----------------------------------------------------------------------------------- Live-Verbindung (Supabase Realtime)
  const TABLES = ['transfers', 'messages', 'reactions', 'chat_members', 'friendships', 'chats', 'servers', 'channels', 'server_members', 'server_roles', 'member_roles',
    'poll_votes', 'event_rsvps', 'statuses', 'status_likes', 'status_comments', 'calls', 'call_participants', 'call_signals', 'call_invites'];
  const Live = {
    ws: null, ref: 1, wanted: false, connected: false, fails: 0, beat: null, typing: new Set(),
    onChange: null, onTyping: null, onState: null,
    send(topic, event, payload) { const r = String(this.ref++); try { this.ws && this.ws.readyState === 1 && this.ws.send(JSON.stringify({ topic, event, payload, ref: r, join_ref: r })); } catch (e) { } },
    async start() {
      this.wanted = true;
      if (this.ws && this.ws.readyState <= 1) return;
      try { await Api.fresh(); await Api.rpc('touch'); } catch (e) { }
      const ws = new WebSocket(Api.url.replace('https://', 'wss://') + '/realtime/v1/websocket?apikey=' + encodeURIComponent(Api.anon) + '&vsn=1.0.0');
      this.ws = ws;
      ws.onopen = () => {
        this.connected = true; this.fails = 0; this.onState && this.onState(true);
        this.send('realtime:zunora-db', 'phx_join', { config: { broadcast: { self: false }, presence: { key: '' }, postgres_changes: TABLES.map((t) => ({ event: '*', schema: 'public', table: t })) }, access_token: Api.access });
        this.typing.forEach((t) => this.send(t, 'phx_join', { config: { broadcast: { self: false } } }));
        let last = Api.access;
        this.beat = setInterval(async () => {
          this.send('phoenix', 'heartbeat', {});
          try { await Api.fresh(); } catch (e) { }   // „bin da“ meldet konto.js (1× pro Minute, nur wenn das Fenster sichtbar ist)
          if (Api.access !== last) { last = Api.access; this.send('realtime:zunora-db', 'access_token', { access_token: last }); }
        }, 25000);
      };
      ws.onmessage = (e) => {
        try {
          const o = JSON.parse(e.data);
          // Datenbank-Kanal vom Server geschlossen/fehlerhaft (z. B. abgelaufene Anmeldung) → Verbindung neu aufbauen, sonst kämen still keine Nachrichten mehr
          if (o.topic === 'realtime:zunora-db' && (o.event === 'phx_close' || o.event === 'phx_error' || (o.event === 'system' && o.payload && o.payload.status === 'error'))) { try { ws.close(); } catch (x) { } return; }
          if (o.event === 'postgres_changes') { const d = o.payload.data; this.onChange && this.onChange({ table: d.table, type: d.type, record: d.record || {}, old: d.old_record || {} }); }
          else if (o.event === 'broadcast' && o.payload && o.payload.event === 'typing') this.onTyping && this.onTyping(o.topic.replace('realtime:typing-', ''), (o.payload.payload || {}).user);
        } catch (x) { }
      };
      ws.onclose = () => {
        this.connected = false; clearInterval(this.beat); this.onState && this.onState(false);
        if (!this.wanted) return;
        this.fails++; setTimeout(() => this.start(), Math.min(60000, 2000 * Math.pow(2, Math.min(this.fails, 5))));
      };
    },
    stop() { this.wanted = false; clearInterval(this.beat); try { this.ws && this.ws.close(); } catch (e) { } this.ws = null; },
    watchTyping(chat) { const t = 'realtime:typing-' + chat; if (!this.typing.has(t)) { this.typing.add(t); this.send(t, 'phx_join', { config: { broadcast: { self: false } } }); } },
    sendTyping(chat) { this.watchTyping(chat); this.send('realtime:typing-' + chat, 'broadcast', { type: 'broadcast', event: 'typing', payload: { user: Api.userId } }); },
  };

  root.ZM = Object.assign(root.ZM || {}, { DB, Api, Live, german, second: SECOND });
})(window);
