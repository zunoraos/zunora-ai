/* Zunora Messenger am PC — Ende-zu-Ende-Verschlüsselung, Version 1 (genau wie MCrypto.kt auf dem Handy).
   Nur WebCrypto: P-256 ECDH (Entschlüsseln) + ECDSA (Unterschreiben) je Gerät, HKDF-SHA256, AES-256-GCM.
   Private Schlüssel sind nicht auslesbar (extractable = false) und liegen nur in der IndexedDB dieses PCs. */
(function (root) {
  'use strict';
  const S = (root.crypto || globalThis.crypto).subtle;
  const enc = new TextEncoder(), dec = new TextDecoder();
  const VERSION = 1;

  function b64(buf) { const a = new Uint8Array(buf); let s = ''; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); }
  function unb64(s) { const b = atob(s); const a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function cat(...parts) { const n = parts.reduce((x, p) => x + p.length, 0); const o = new Uint8Array(n); let i = 0; for (const p of parts) { o.set(p, i); i += p.length; } return o; }
  function random(n) { const a = new Uint8Array(n); (root.crypto || globalThis.crypto).getRandomValues(a); return a; }

  // ECDSA: Java liefert/erwartet DER, WebCrypto r||s (je 32 Byte) → umrechnen
  function rawToDer(raw) {
    const part = (x) => { let i = 0; while (i < x.length - 1 && x[i] === 0) i++; x = x.slice(i); if (x[0] & 0x80) x = cat(new Uint8Array([0]), x); return cat(new Uint8Array([0x02, x.length]), x); };
    const r = part(raw.slice(0, 32)), s = part(raw.slice(32, 64));
    return cat(new Uint8Array([0x30, r.length + s.length]), r, s);
  }
  function derToRaw(der) {
    let i = 2; if (der[1] & 0x80) i = 2 + (der[1] & 0x7f);
    const read = () => { if (der[i++] !== 0x02) throw new Error('Unterschrift kaputt'); const len = der[i++]; let v = der.slice(i, i + len); i += len; while (v.length > 32 && v[0] === 0) v = v.slice(1); return cat(new Uint8Array(32 - v.length), v); };
    return cat(read(), read());
  }

  const EC = { name: 'ECDH', namedCurve: 'P-256' };
  const DSA = { name: 'ECDSA', namedCurve: 'P-256' };
  async function importEnc(spkiB64) { return S.importKey('spki', unb64(spkiB64), EC, true, []); }
  async function importSign(spkiB64) { return S.importKey('spki', unb64(spkiB64), DSA, true, ['verify']); }

  /** Neues Gerät: zwei Schlüsselpaare; die privaten Hälften bleiben im PC (nicht auslesbar). */
  async function newDevice() {
    const e = await S.generateKey(EC, false, ['deriveBits']);
    const s = await S.generateKey(DSA, false, ['sign']);
    return { encPriv: e.privateKey, encPub: b64(await S.exportKey('spki', e.publicKey)), signPriv: s.privateKey, signPub: b64(await S.exportKey('spki', s.publicKey)) };
  }
  /** Für die Gegenprobe mit dem Handy: Schlüssel aus PKCS8/SPKI (Base64) laden. */
  async function importDevice(o) {
    return { encPriv: await S.importKey('pkcs8', unb64(o.encPriv), EC, false, ['deriveBits']), encPub: o.encPub,
             signPriv: await S.importKey('pkcs8', unb64(o.signPriv), DSA, false, ['sign']), signPub: o.signPub };
  }

  async function hkdf(ikm, salt, info) {
    const k = await S.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
    return new Uint8Array(await S.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: salt.length ? salt : new Uint8Array(32), info }, k, 256));
  }
  async function aesKey(raw, use) { return S.importKey('raw', raw, 'AES-GCM', false, use); }
  async function seal(keyRaw, plain, aad) {
    const iv = random(12);
    const p = { name: 'AES-GCM', iv }; if (aad) p.additionalData = aad;
    return { iv, ct: new Uint8Array(await S.encrypt(p, await aesKey(keyRaw, ['encrypt']), plain)) };
  }
  async function open(keyRaw, iv, ct, aad) {
    const p = { name: 'AES-GCM', iv }; if (aad) p.additionalData = aad;
    try { return new Uint8Array(await S.decrypt(p, await aesKey(keyRaw, ['decrypt']), ct)); }
    catch (e) { throw new Error('Entschlüsseln ging nicht (falscher Schlüssel oder verändert).'); }
  }
  async function ecdh(priv, pubKey) { return new Uint8Array(await S.deriveBits({ name: 'ECDH', public: pubKey }, priv, 256)); }
  const signed = (chat, msg, sender, eph, iv, ct) => enc.encode(`zunora-e2e-v1|${chat}|${msg}|${sender}|${eph}|${iv}|${ct}`);

  /** Inhalt (Objekt) für alle Geräte verschlüsseln. devices = [{id, encKey}] (auch die eigenen anderen Geräte). */
  async function encrypt(plain, chatId, msgId, myDeviceId, me, devices) {
    if (!devices.length) throw new Error('Keine Geräte zum Verschlüsseln.');
    const msgKey = random(32);
    const { iv, ct } = await seal(msgKey, enc.encode(JSON.stringify(plain)), enc.encode(`${chatId}|${msgId}`));
    const eph = await S.generateKey(EC, true, ['deriveBits']);
    const ephPub = b64(await S.exportKey('spki', eph.publicKey));
    const keys = {};
    const seen = new Set();
    for (const d of devices) {
      if (seen.has(d.id)) continue; seen.add(d.id);
      const kek = await hkdf(await ecdh(eph.privateKey, await importEnc(d.encKey)), enc.encode(msgId), enc.encode('zunora-e2e-v1|' + d.id));
      const w = await seal(kek, msgKey);
      keys[d.id] = b64(cat(w.iv, w.ct));
    }
    const ivS = b64(iv), ctS = b64(ct);
    const raw = new Uint8Array(await S.sign({ name: 'ECDSA', hash: 'SHA-256' }, me.signPriv, signed(chatId, msgId, myDeviceId, ephPub, ivS, ctS)));
    return { v: VERSION, eph: ephPub, iv: ivS, ct: ctS, sig: b64(rawToDer(raw)), keys };
  }

  /** Für dieses Gerät entschlüsseln → {content, check: 'OK'|'UNSIGNED'|'BAD_SIGNATURE'} */
  async function decrypt(cipher, chatId, msgId, senderDevice, myDeviceId, me, senderSignKey) {
    if (cipher.v !== VERSION) throw new Error('Unbekannte Version — bitte Zunora aktualisieren.');
    const wrapped = (cipher.keys || {})[myDeviceId];
    if (!wrapped) throw new Error('Diese Nachricht wurde vor der Anmeldung auf diesem Gerät gesendet.');
    const kek = await hkdf(await ecdh(me.encPriv, await importEnc(cipher.eph)), enc.encode(msgId), enc.encode('zunora-e2e-v1|' + myDeviceId));
    const w = unb64(wrapped);
    if (w.length < 13) throw new Error('Kaputter Schlüssel.');
    const msgKey = await open(kek, w.slice(0, 12), w.slice(12));
    const plain = await open(msgKey, unb64(cipher.iv), unb64(cipher.ct), enc.encode(`${chatId}|${msgId}`));
    let check = 'UNSIGNED';
    if (senderSignKey) {
      try {
        const ok = await S.verify({ name: 'ECDSA', hash: 'SHA-256' }, await importSign(senderSignKey), derToRaw(unb64(cipher.sig)), signed(chatId, msgId, senderDevice, cipher.eph, cipher.iv, cipher.ct));
        check = ok ? 'OK' : 'BAD_SIGNATURE';
      } catch (e) { check = 'BAD_SIGNATURE'; }
    }
    return { content: JSON.parse(dec.decode(plain)), check };
  }

  /** Dateien: zufälliger Schlüssel, Prüfsumme über die verschlüsselten Bytes (wie am Handy). */
  async function sealFile(bytes) {
    const key = random(32);
    const { iv, ct } = await seal(key, bytes);
    return { bytes: ct, key: b64(key), iv: b64(iv), sha: b64(await S.digest('SHA-256', ct)) };
  }
  async function openFile(ct, key, iv, sha) {
    if (sha && b64(await S.digest('SHA-256', ct)) !== sha) throw new Error('Die Datei wurde verändert.');
    return open(unb64(key), unb64(iv), ct);
  }

  // ----------------------------------------------------------------------------------- Schlüssel verpacken (wie MCrypto.wrapKey am Handy)
  async function signB64(me, data) { return b64(rawToDer(new Uint8Array(await S.sign({ name: 'ECDSA', hash: 'SHA-256' }, me.signPriv, data)))); }
  async function verifyB64(signKey, data, sig) { try { return await S.verify({ name: 'ECDSA', hash: 'SHA-256' }, await importSign(signKey), derToRaw(unb64(sig)), data); } catch (e) { return false; } }
  const wrapSigned = (context, dev, eph, w) => enc.encode(`zunora-wrap-v1|${context}|${dev}|${eph}|${w}`);
  /** 32-Byte-Schlüssel für EIN Gerät verpacken und unterschreiben. context z. B. „skey|<server>|<epoche>“ oder „pic|p|<besitzer>|<pfad>“. */
  async function wrapKey(key, context, deviceId, devEncKey, me) {
    const eph = await S.generateKey(EC, true, ['deriveBits']);
    const ephPub = b64(await S.exportKey('spki', eph.publicKey));
    const kek = await hkdf(await ecdh(eph.privateKey, await importEnc(devEncKey)), enc.encode(context), enc.encode('zunora-wrap-v1|' + deviceId));
    const s = await seal(kek, key, enc.encode(`zunora-wrap-v1|${context}|${deviceId}`));
    const w = b64(cat(s.iv, s.ct));
    return { eph: ephPub, w, sig: await signB64(me, wrapSigned(context, deviceId, ephPub, w)) };
  }
  /** Gegenstück — nur mit gültiger Unterschrift des verpackenden Geräts. null = nicht lesbar / nicht echt. */
  async function unwrapKey(o, context, myDeviceId, me, bySignKey) {
    try {
      if (!o || !(await verifyB64(bySignKey, wrapSigned(context, myDeviceId, o.eph, o.w), o.sig))) return null;
      const kek = await hkdf(await ecdh(me.encPriv, await importEnc(o.eph)), enc.encode(context), enc.encode('zunora-wrap-v1|' + myDeviceId));
      const raw = unb64(o.w);
      const k = await open(kek, raw.slice(0, 12), raw.slice(12), enc.encode(`zunora-wrap-v1|${context}|${myDeviceId}`));
      return k.length === 32 ? k : null;
    } catch (e) { return null; }
  }
  // ----------------------------------------------------------------------------------- Server-Kanäle (gemeinsamer Server-Schlüssel)
  const srvSigned = (ch, id, dev, e, iv, ct) => enc.encode(`zunora-srv-v1|${ch}|${id}|${dev}|${e}|${iv}|${ct}`);
  async function sealChannel(plain, ch, id, epoch, key, myDev, me) {
    const s = await seal(key, enc.encode(JSON.stringify(plain)), enc.encode(`zunora-srv-v1|${ch}|${id}|${epoch}`));
    const iv = b64(s.iv), ct = b64(s.ct);
    return { z: 's1', e: epoch, iv, ct, sig: await signB64(me, srvSigned(ch, id, myDev, epoch, iv, ct)) };
  }
  async function openChannel(c, ch, id, dev, key, signKey) {
    const e = Number(c.e) | 0;
    const p = await open(key, unb64(c.iv), unb64(c.ct), enc.encode(`zunora-srv-v1|${ch}|${id}|${e}`));
    let check = 'UNSIGNED';
    if (signKey) check = (await verifyB64(signKey, srvSigned(ch, id, dev, e, c.iv, c.ct), c.sig || '')) ? 'OK' : 'BAD_SIGNATURE';
    return { content: JSON.parse(dec.decode(p)), check };
  }
  async function sealSmall(key, data, aad) { const s = await seal(key, data, enc.encode(aad)); return { iv: b64(s.iv), ct: b64(s.ct) }; }
  async function openSmall(key, o, aad) { try { return await open(key, unb64(o.iv), unb64(o.ct), enc.encode(aad)); } catch (e) { return null; } }
  // Profil-/Gruppenbilder: Datei = iv ‖ verschlüsselte Bytes, an den Pfad gebunden
  async function sealPicture(key, jpeg, path) { const s = await seal(key, jpeg, enc.encode('zunora-pic-v1|' + path)); return cat(s.iv, s.ct); }
  async function openPicture(key, bytes, path) { try { if (bytes.length < 29) return null; return await open(key, bytes.slice(0, 12), bytes.slice(12), enc.encode('zunora-pic-v1|' + path)); } catch (e) { return null; } }

  /** Sicherheitsnummer (60 Ziffern) wie am Handy. */
  async function safetyNumber(mine, theirs) {
    async function part(keys) {
      const d = new Uint8Array(await S.digest('SHA-512', enc.encode([...keys].sort().join('|'))));
      let out = '';
      for (let i = 0; i < 6; i++) { let v = 0n; for (let j = 0; j < 5; j++) v = (v << 8n) | BigInt(d[i * 5 + j]); out += String(v % 100000n).padStart(5, '0'); }
      return out;
    }
    const a = await part(mine), b = await part(theirs);
    return (a < b ? a + b : b + a).match(/.{5}/g).join(' ');
  }

  root.ZMC = { VERSION, newDevice, importDevice, encrypt, decrypt, sealFile, openFile, safetyNumber, b64, unb64, rawToDer, derToRaw, seal, open, hkdf, random,
    wrapKey, unwrapKey, sealChannel, openChannel, sealSmall, openSmall, sealPicture, openPicture };
})(typeof window !== 'undefined' ? window : globalThis);
