// Zunora Cloud für Web-Oberflächen (PC-Programme und Zunora Dokumente am Handy): Abgleich über die Zunora ID und Teilen mit
// Freunden — Ende-zu-Ende verschlüsselt, byte-genau wie am Handy (ZIdData.kt / RShare.kt):
//   Versiegeln:  Base64( IV 12 Byte + AES-256-GCM(Daten) + Prüfwert 16 )
//   Teilen:      Raum-Schlüssel für jedes Mitglied eingepackt: k = SHA-256("zunora-space-v1|" + ECDH-P256(Einmal-Schlüssel, Mitglied))
// Einbinden: <script src="zcloud.js"></script>, dann ZCloud.init(call) mit der Brücken-Funktion der App (Aufruf „zid.session").
'use strict';
const ZCloud = (() => {
  let call = null, sess = null, sessAt = 0;
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const C = crypto.subtle;

  async function session(force) {
    if (!call) return null;
    if (!force && sess && Date.now() - sessAt < 50_000) return sess;
    try { sess = await call('zid.session'); sessAt = Date.now(); } catch (e) { sess = null; }
    return sess && sess.loggedIn ? sess : null;
  }
  async function rest(method, path, body, prefer) {
    const s = await session(); if (!s) throw new Error('Nicht angemeldet');
    const h = { apikey: s.anon, Authorization: 'Bearer ' + s.token, 'Content-Type': 'application/json' };
    if (prefer) h.Prefer = prefer;
    const r = await fetch(s.url + path, { method, headers: h, body: body == null ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)) });
    const t = await r.text();
    return { code: r.status, body: t, json: () => (t ? JSON.parse(t) : null) };
  }

  // ---------------------------------------------------------------- AES-GCM
  const aes = (raw) => C.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
  async function seal(raw, data) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await C.encrypt({ name: 'AES-GCM', iv }, await aes(raw), typeof data === 'string' ? enc.encode(data) : data));
    const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12); return b64(out);
  }
  async function open(raw, sealed) {
    try { const b = unb64(sealed); return new Uint8Array(await C.decrypt({ name: 'AES-GCM', iv: b.subarray(0, 12) }, await aes(raw), b.subarray(12))); } catch (e) { return null; }
  }
  const openJson = async (raw, s) => { const b = await open(raw, s); if (!b) return null; try { return JSON.parse(dec.decode(b)); } catch (e) { return null; } };
  const dataKey = async () => { const s = await session(); return s && s.dataKey ? unb64(s.dataKey) : null; };

  // ---------------------------------------------------------------- eigene Einträge (zid_items)
  const safeId = (id) => String(id).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64);
  async function pull(app, since) {
    const k = await dataKey(); if (!k) return null;
    const r = await rest('GET', `/rest/v1/zid_items?app=eq.${app}&select=item_id,data,deleted,updated_at&order=updated_at.asc&limit=5000` + (since ? '&updated_at=gt.' + encodeURIComponent(since) : ''));
    if (r.code !== 200) return null;
    const out = [];
    for (const o of r.json()) out.push({ id: o.item_id, deleted: o.deleted, at: o.updated_at, json: o.deleted ? null : await openJson(k, o.data) });
    return out;
  }
  async function push(app, id, obj) {
    const k = await dataKey(); if (!k) return false;
    const row = { app, item_id: safeId(id), deleted: obj == null, data: obj == null ? '' : await seal(k, JSON.stringify(obj)) };
    const r = await rest('POST', '/rest/v1/zid_items?on_conflict=user_id,app,item_id', [row], 'resolution=merge-duplicates,return=minimal');
    return r.code >= 200 && r.code < 300;
  }

  // ---------------------------------------------------------------- Teilen
  let mine = null;     // {pub, priv} (Base64 SPKI / PKCS8)
  const ec = { name: 'ECDH', namedCurve: 'P-256' };
  async function newPair() {
    const p = await C.generateKey(ec, true, ['deriveBits']);
    return { pub: b64(new Uint8Array(await C.exportKey('spki', p.publicKey))), priv: b64(new Uint8Array(await C.exportKey('pkcs8', p.privateKey))) };
  }
  async function shared(privB64, pubB64) {
    const priv = await C.importKey('pkcs8', unb64(privB64), ec, false, ['deriveBits']);
    const pub = await C.importKey('spki', unb64(pubB64), ec, false, []);
    const bits = new Uint8Array(await C.deriveBits({ name: 'ECDH', public: pub }, priv, 256));
    const pre = enc.encode('zunora-space-v1|'); const all = new Uint8Array(pre.length + bits.length); all.set(pre); all.set(bits, pre.length);
    return new Uint8Array(await C.digest('SHA-256', all));
  }
  async function wrap(spaceKey, memberPub) { const e = await newPair(); return { eph: e.pub, w: await seal(await shared(e.priv, memberPub), spaceKey) }; }
  async function unwrap(o, myPriv) { try { const k = await open(await shared(myPriv, o.eph), o.w); return k && k.length === 32 ? k : null; } catch (e) { return null; } }

  async function ensureKeys() {
    if (mine) return mine;
    const k = await dataKey(); if (!k) return null;
    const r = await rest('GET', '/rest/v1/zid_items?app=eq.zid&item_id=eq.sharekey&select=data,deleted');
    if (r.code !== 200) return null;
    const row = (r.json() || [])[0];
    if (row && !row.deleted) { const o = await openJson(k, row.data); if (!o) return null; mine = { pub: o.pub, priv: o.priv }; }
    else {
      const p = await newPair();
      const w = await rest('POST', '/rest/v1/zid_items?on_conflict=user_id,app,item_id', [{ app: 'zid', item_id: 'sharekey', deleted: false, data: await seal(k, JSON.stringify(p)) }], 'resolution=merge-duplicates,return=minimal');
      if (w.code < 200 || w.code > 299) return null;
      mine = p;
    }
    await rest('POST', '/rest/v1/zid_pubkeys?on_conflict=user_id', [{ pub: mine.pub }], 'resolution=merge-duplicates,return=minimal');
    return mine;
  }
  async function friends() { const r = await rest('POST', '/rest/v1/rpc/zid_share_friends', {}); return r.code === 200 ? r.json() : []; }
  async function mySpaces(app) {
    const m = await ensureKeys(); if (!m) return null;
    const r = await rest('POST', '/rest/v1/rpc/zid_my_spaces', { p_app: app }); if (r.code !== 200) return null;
    const out = [];
    for (const o of r.json()) { const key = await unwrap(typeof o.my_key === 'string' ? JSON.parse(o.my_key) : o.my_key, m.priv); if (key) out.push({ id: o.space_id, owner: o.owner, key, members: o.members || [] }); }
    return out;
  }
  async function create(app, list) {
    const m = await ensureKeys(); const s = await session(); if (!m || !s) return null;
    const r = await rest('POST', '/rest/v1/zid_spaces?select=id', { app }, 'return=representation');
    if (r.code < 200 || r.code > 299) return null;
    const id = r.json()[0].id; const key = crypto.getRandomValues(new Uint8Array(32));
    const rows = [{ space_id: id, user_id: s.userId, key: await wrap(key, m.pub) }];
    for (const f of list) rows.push({ space_id: id, user_id: f.id, key: await wrap(key, f.pub) });
    const r2 = await rest('POST', '/rest/v1/zid_space_members', rows, 'return=minimal');
    if (r2.code < 200 || r2.code > 299) { await rest('DELETE', `/rest/v1/zid_spaces?id=eq.${id}`); return null; }
    return { id, key };
  }
  async function addMembers(space, key, list) {
    if (!list.length) return true; const rows = [];
    for (const f of list) rows.push({ space_id: space, user_id: f.id, key: await wrap(key, f.pub) });
    const r = await rest('POST', '/rest/v1/zid_space_members', rows, 'return=minimal'); return r.code >= 200 && r.code < 300;
  }
  async function leave(space, owner) {
    const s = await session(); if (!s) return false;
    const r = owner ? await rest('DELETE', `/rest/v1/zid_spaces?id=eq.${space}`) : await rest('DELETE', `/rest/v1/zid_space_members?space_id=eq.${space}&user_id=eq.${s.userId}`);
    return r.code >= 200 && r.code < 300;
  }
  async function spacePull(space, key, since) {
    const r = await rest('GET', `/rest/v1/zid_space_items?space_id=eq.${space}&select=item_id,data,deleted,updated_at&order=updated_at.asc&limit=5000` + (since ? '&updated_at=gt.' + encodeURIComponent(since) : ''));
    if (r.code !== 200) return null;
    const out = []; for (const o of r.json()) out.push({ id: o.item_id, deleted: o.deleted, at: o.updated_at, json: o.deleted ? null : await openJson(key, o.data) });
    return out;
  }
  async function spacePush(space, key, id, obj) {
    const row = { space_id: space, item_id: safeId(id), deleted: obj == null, data: obj == null ? '' : await seal(key, JSON.stringify(obj)) };
    const r = await rest('POST', '/rest/v1/zid_space_items?on_conflict=space_id,item_id', [row], 'resolution=merge-duplicates,return=minimal');
    return r.code >= 200 && r.code < 300;
  }

  return {
    init(fn) { call = fn; }, session, rest, seal, open, b64, unb64,
    pull, push, share: { ensureKeys, friends, mySpaces, create, addMembers, leave, pull: spacePull, push: spacePush, wrap, unwrap, newPair },
    forget() { mine = null; sess = null; },
  };
})();
if (typeof window !== 'undefined') window.ZCloud = ZCloud;
