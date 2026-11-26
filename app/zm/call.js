/* Zunora Messenger am PC — Anrufe und Sprachkanäle (WebRTC ist in WebView2 eingebaut).
   Gleiches Verfahren wie MCall.kt am Handy: Wer dazukommt, bietet allen an, die schon drin sind; alle Signale sind Ende-zu-Ende
   verschlüsselt (Absender-Unterschrift wird geprüft), auch in Sprachkanälen. Höchstens 8 Personen. */
(function (root) {
  'use strict';
  const { Api } = root.ZM;
  const S = root.ZM.Store;
  const C = root.ZMC;
  const ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  // TURN: kurzlebige Zugangsdaten von der Server-Funktion „turn-credentials" (nur wenn ein Anbieter eingetragen ist)
  let turn = null, turnUntil = 0;
  async function loadTurn() {
    if (turn && turnUntil > Date.now() + 600000) return;
    const r = await Api.fn('turn-credentials').catch(() => null);
    if (r && Array.isArray(r.iceServers) && r.iceServers.length) { turn = r.iceServers; turnUntil = Date.now() + (r.ttl || 3600) * 1000; }
  }
  const iceServers = () => ICE.concat(turn && turnUntil > Date.now() ? turn : []);

  const Call = {
    callId: null, chatId: null, channelId: null, incoming: null, muted: false, videoOn: false, minimized: false, startedAt: 0, status: '',
    remotes: new Map(),           // „nutzer|gerät" → {user, device, pc, stream, connected}
    local: null, iStarted: false, wantVideo: false, voiceMembers: new Map(), ringTimer: null, ringAudio: null,
    sharing: null,                // Bildschirm teilen: laufende Aufnahme (Video-Spur)
    waiting: null,                // Anklopfen: zweiter Anruf während eines laufenden
    guestTitle: null,             // eingeladen in einen fremden Anruf → Titel „Anruf mit …"
    voicemailFor: null,           // niemand hat abgenommen → Sprachnachricht hinterlassen? (Chat)
    changed() { S.changed('call'); },
    get reconnecting() { return [...this.remotes.values()].some((r) => r.restarting); },

    /** Bildschirm (oder ein Fenster) teilen — ersetzt die Kamera bzw. kommt als Bild dazu. Nochmal klicken = beenden. */
    async toggleShare() {
      if (this.sharing) { this.stopShare(); return; }
      const s = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15 }, audio: false });
      const t = s.getVideoTracks()[0]; if (!t) return;
      this.sharing = t;
      t.onended = () => this.stopShare();
      for (const r of this.remotes.values()) {
        const v = r.pc.getSenders().find((x) => x.track && x.track.kind === 'video');
        if (v) await v.replaceTrack(t); else { r.pc.addTrack(t, this.local || new MediaStream([t])); await this.renegotiate(r); }
      }
      this.changed();
    },
    async stopShare() {
      const t = this.sharing; if (!t) return;
      this.sharing = null; try { t.stop(); } catch (e) { }
      const cam = this.local && this.local.getVideoTracks()[0];
      for (const r of this.remotes.values()) {
        const v = r.pc.getSenders().find((x) => x.track === t || (x.track === null && cam));
        if (v) { if (cam) await v.replaceTrack(cam); else { try { r.pc.removeTrack(v); } catch (e) { } await this.renegotiate(r); } }
      }
      this.changed();
    },

    /** ICE-Neustart (Netzwechsel/kurzer Abbruch). Nur die Seite mit der „kleineren" Geräte-Kennung startet; höchstens 3 Versuche. */
    async restartIce(k) {
      const r = this.remotes.get(k); if (!r) return false;
      r.restarts = (r.restarts || 0) + 1;
      if (r.restarts > 3) return false;
      r.restarting = true; this.changed();
      if (S.deviceId < r.device) {
        await loadTurn();
        try { r.pc.setConfiguration({ iceServers: iceServers() }); } catch (e) { }
        const d = await r.pc.createOffer({ iceRestart: true }); await r.pc.setLocalDescription(d);
        this.signal(r.user, r.device, 'offer', { sdp: d.sdp, restart: true });
      }
      setTimeout(() => { const x = this.remotes.get(k); if (x === r && r.pc.connectionState !== 'connected' && r.restarts >= 3) this.drop(k); }, 20000);
      return true;
    },

    /** Anrufliste: gemerkt (verschlüsselt auf diesem PC), danach nur neue oder beendete Anrufe nachladen */
    hist: null, histAt: '',
    async history() {
      const O = root.ZM.Offline;
      if (!this.hist) { this.hist = []; try { const d = O && await O.open(await root.ZM.DB.get('anrufe-' + Api.userId)); if (d) { this.histAt = d.at || ''; this.hist = (d.l || []).map((e) => Object.assign(e, { people: new Set(e.people || []) })); } } catch (e) { } }
      const filter = this.hist.length && this.histAt ? `&or=(created_at.gt.${Api.q(this.histAt)},ended_at.gt.${Api.q(this.histAt)})` : '';
      const checkAt = new Date(Date.now() - 120000).toISOString();
      const rows = await Api.list(`calls?chat_id=not.is.null${filter}&select=id,chat_id,started_by,video,created_at,ended_at,call_participants(user_id)&order=created_at.desc&limit=80`);
      const fresh = rows.map((r) => {
        const people = new Set((r.call_participants || []).map((p) => p.user_id));
        const outgoing = r.started_by === Api.userId;
        return { id: r.id, chat: r.chat_id, by: r.started_by, video: !!r.video, at: Date.parse(r.created_at) || 0, ended: Date.parse(r.ended_at) || 0, people, outgoing,
          missed: !outgoing && !people.has(Api.userId), answered: [...people].some((u) => u !== r.started_by) };
      });
      const month = Date.now() - 30 * 86400000;
      let hidden = new Set(); try { hidden = new Set((await Api.list('call_hidden?select=call_id&limit=2000')).map((h) => h.call_id)); } catch (e) { }
      const list = [...fresh, ...this.hist.filter((k) => !fresh.some((f) => f.id === k.id))].filter((e) => !hidden.has(e.id)).filter((e) => e.at > month).sort((a, b) => b.at - a.at).slice(0, 80);
      this.hist = list; this.histAt = checkAt;
      try { if (O) await root.ZM.DB.put('anrufe-' + Api.userId, await O.seal({ at: checkAt, l: list.map((e) => Object.assign({}, e, { people: [...e.people] })) })); } catch (e) { }
      await S.loadProfiles(list.flatMap((e) => [...e.people, e.by]));
      return list;
    },

    /** Anrufe aus meiner Liste löschen („für mich"; haben alle Beteiligten gelöscht, ist er komplett vom Server weg) */
    async deleteCalls(ids) {
      if (!ids.length) return;
      await Api.rpc('hide_calls', { ids });
      this.hist = (this.hist || []).filter((e) => !ids.includes(e.id)); this.histAt = ''; await this.history().catch(() => { });
    },
    async clearAll() { await Api.rpc('clear_call_history', {}); this.hist = []; this.histAt = ''; await this.history().catch(() => { }); },

    // ---- Einstellungen auf diesem PC: Mikrofon, Lautsprecher, Klingelton, Ruhezeiten
    pref(k, d) { try { const v = localStorage.getItem('zm-anruf-' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    setPref(k, v) { try { localStorage.setItem('zm-anruf-' + k, JSON.stringify(v)); } catch (e) { } },
    quietNow() { if (!this.pref('ruhe', false)) return false; const h = new Date().getHours(), a = this.pref('von', 22), b = this.pref('bis', 7); return a === b ? false : a < b ? h >= a && h < b : h >= a || h < b; },
    /** Lautsprecher/Kopfhörer für ein Wiedergabe-Element wählen */
    applySpeaker(el) { const id = this.pref('speaker', ''); if (id && el && el.setSinkId && el.sinkId !== id) el.setSinkId(id).catch(() => { }); },

    async media(video) {
      // bessere Tonqualität: Echo, Rauschen und Lautstärke regelt WebRTC; gewähltes Mikrofon
      const mic = this.pref('mic', '');
      if (!this.local) this.local = await navigator.mediaDevices.getUserMedia({ audio: Object.assign({ echoCancellation: true, noiseSuppression: true, autoGainControl: true }, mic ? { deviceId: { ideal: mic } } : {}), video: false });
      if (video && !this.local.getVideoTracks().length) {
        const v = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
        const t = v.getVideoTracks()[0]; this.local.addTrack(t);
        for (const r of this.remotes.values()) { r.pc.addTrack(t, this.local); await this.renegotiate(r); }
        this.videoOn = true;
      }
    },

    async call(chat, video) {
      if (this.callId) { this.status = 'Es läuft schon ein Anruf.'; this.changed(); return; }
      const c = S.chats.get(chat); if (!c) return;
      if (c.members.length > 8) { this.status = 'Anrufe gehen mit höchstens 8 Personen.'; this.changed(); return; }
      try {
        await this.media(video);
        const id = String(await Api.rpc('start_call', { chat, with_video: !!video, device: S.deviceId })).replace(/"/g, '');
        await this.begin(id, chat, null, video, true);
      } catch (e) { this.status = e.message; this.stopMedia(); this.changed(); }
    },
    async accept(video) {
      const inc = this.incoming; if (!inc) return;
      this.stopRing(); this.incoming = null;
      try {
        const v = video === undefined ? inc.video : video;
        await this.media(v);
        const id = inc.guest ? String(await Api.rpc('join_call', { c: inc.call, device: S.deviceId })).replace(/"/g, '')
                             : String(await Api.rpc('start_call', { chat: inc.chat, with_video: !!v, device: S.deviceId })).replace(/"/g, '');
        this.guestTitle = inc.guest ? 'Anruf mit ' + S.nameOf(inc.from) : null;
        await this.begin(id, inc.chat, null, v, false);
      } catch (e) { this.status = e.message; this.stopMedia(); this.changed(); }
    },
    async decline() { const inc = this.incoming; if (!inc) return; this.stopRing(); this.incoming = null; this.changed(); try { await Api.rpc(inc.guest ? 'decline_invite' : 'decline_call', { c: inc.call }); } catch (e) { } },
    // ---- Anklopfen
    async acceptWaiting() { const w = this.waiting; if (!w) return; this.waiting = null; await this.leave(); this.incoming = w; await this.accept(); },
    async declineWaiting() { const w = this.waiting; if (!w) return; this.waiting = null; this.changed(); this.missed(w); try { await Api.rpc(w.guest ? 'decline_invite' : 'decline_call', { c: w.call }); } catch (e) { } },
    // ---- Personen dazuholen
    async invite(user) { if (!this.callId) throw new Error('Es läuft kein Anruf.'); await Api.rpc('invite_to_call', { c: this.callId, u: user }); await S.devices([user], true); },
    /** Verpasster Anruf: Meldung unten rechts + in der Liste */
    missed(inc, quiet) {
      const c = S.chats.get(inc.chat) || {};
      root.ZM.notify(quiet ? 'Anruf während der Ruhezeit' : 'Verpasster Anruf', (c.group ? c.title : S.nameOf(inc.from)) + ' · ' + (inc.video ? 'Videoanruf' : 'Sprachanruf'));
    },
    async joinVoice(chan) {
      if (this.callId && this.channelId === chan) { this.minimized = false; this.changed(); return; }
      try {
        if (this.callId) await this.leave();
        await this.media(false);
        const id = String(await Api.rpc('join_voice', { chan, device: S.deviceId })).replace(/"/g, '');
        await this.begin(id, null, chan, false, false);
        this.minimized = true; this.changed();
      } catch (e) { this.status = e.message; this.stopMedia(); this.changed(); }
    },

    async begin(id, chat, chan, video, iStarted) {
      Object.assign(this, { callId: id, chatId: chat, channelId: chan, muted: false, minimized: false, startedAt: 0, status: '', iStarted, wantVideo: !!video });
      this.remotes.clear(); this.changed();
      await loadTurn();
      const others = (await Api.list(`call_participants?call_id=eq.${id}&left_at=is.null&select=user_id,device_id`)).filter((o) => o.device_id !== S.deviceId);
      await S.loadProfiles(others.map((o) => o.user_id));
      for (const o of others) await this.offer(o.user_id, o.device_id);
      if (others.length) this.startedAt = Date.now();
      if (chat && !others.length) setTimeout(() => { if (this.callId === id && ![...this.remotes.values()].some((r) => r.connected)) { this.status = 'Niemand hat abgenommen.'; this.voicemailFor = chat; this.leave(true); } }, 45000);
      this.changed();
    },

    peer(user, device) {
      const k = user + '|' + device;
      if (this.remotes.has(k)) return this.remotes.get(k);
      const pc = new RTCPeerConnection({ iceServers: iceServers() });
      const r = { user, device, pc, stream: new MediaStream(), connected: false, ice: [] };
      this.remotes.set(k, r);
      if (this.local) this.local.getTracks().forEach((t) => pc.addTrack(t, this.local));
      if (this.sharing && !(this.local && this.local.getVideoTracks().length)) pc.addTrack(this.sharing, new MediaStream([this.sharing]));
      pc.onicecandidate = (e) => { if (e.candidate) this.signal(user, device, 'ice', { mid: e.candidate.sdpMid, line: e.candidate.sdpMLineIndex, sdp: e.candidate.candidate }); };
      pc.ontrack = (e) => { r.stream.addTrack(e.track); e.track.onended = () => { r.stream.removeTrack(e.track); this.changed(); }; this.changed(); };
      pc.onconnectionstatechange = () => {
        const st = pc.connectionState;
        r.connected = st === 'connected';
        if (r.connected) { r.restarting = false; r.restarts = 0; if (!this.startedAt) this.startedAt = Date.now(); }
        if (st === 'disconnected') setTimeout(() => { if (this.remotes.get(k) === r && pc.connectionState === 'disconnected') this.restartIce(k); }, 4000);
        if (st === 'failed') this.restartIce(k).then((ok) => { if (!ok) this.drop(k); });
        this.changed();
      };
      this.changed();
      return r;
    },
    async offer(user, device) {
      const r = this.peer(user, device);
      const d = await r.pc.createOffer(); await r.pc.setLocalDescription(d);
      this.signal(user, device, 'offer', { sdp: d.sdp });
    },
    async renegotiate(r) { const d = await r.pc.createOffer(); await r.pc.setLocalDescription(d); this.signal(r.user, r.device, 'offer', { sdp: d.sdp }); },
    drop(k) {
      const r = this.remotes.get(k); if (!r) return;
      try { r.pc.close(); } catch (e) { }
      this.remotes.delete(k);
      if (this.chatId && !this.remotes.size && this.startedAt) this.leave();
      this.changed();
    },

    async signal(user, device, kind, content) {
      const id = this.callId; if (!id) return;
      try {
        const sid = crypto.randomUUID();
        // Immer Ende-zu-Ende (Chat-Anrufe UND Server-Sprachkanäle): nur das Zielgerät kann es lesen, unterschrieben vom eigenen Gerät
        const target = (await S.devices([user])).find((d) => d.id === device) || (await S.devices([user], true)).find((d) => d.id === device);
        if (!target) throw new Error('Gerät unbekannt');
        const payload = await C.encrypt(content, 'call:' + id, sid, S.deviceId, S.keys, [target]);
        await Api.rest('POST', 'call_signals', { id: sid, call_id: id, from_device: S.deviceId, to_user: user, to_device: device, kind, payload });
      } catch (e) { console.warn('Signal', kind, e); }
    },

    async onLive(ch) {
      const r = ch.record;
      if (ch.table === 'call_signals' && ch.type === 'INSERT') return this.onSignal(r);
      if (ch.table === 'calls') {
        if (ch.type === 'INSERT' && r.chat_id && r.started_by !== Api.userId && !r.ended_at && r.chat_id !== this.chatId && Date.now() - Date.parse(r.created_at) < 60000) {
          if (!S.chats.has(r.chat_id)) await S.loadChats();
          const c = S.chats.get(r.chat_id); if (!c || c.mutedUntil > Date.now()) return;
          await S.loadProfiles([r.started_by]);
          const inc = { call: r.id, chat: r.chat_id, from: r.started_by, video: !!r.video };
          if (this.callId) { this.waiting = inc; this.beep(); this.changed(); return; }        // Anklopfen
          if (this.quietNow()) { this.missed(inc, true); return; }                             // Ruhezeit: nicht klingeln
          this.incoming = inc;
          this.startRing(); this.changed();
          root.ZM.notify((c.group ? c.title + ' · ' : '') + S.nameOf(r.started_by), r.video ? 'Videoanruf …' : 'Sprachanruf …');
        }
        if (ch.type === 'UPDATE' && r.ended_at) {
          if (this.incoming && this.incoming.call === r.id) { const inc = this.incoming; this.incoming = null; this.stopRing(); this.changed(); this.missed(inc); }
          if (this.waiting && this.waiting.call === r.id) { const w = this.waiting; this.waiting = null; this.changed(); this.missed(w); }
          if (this.callId === r.id && this.chatId) this.leave();
        }
        if (r.channel_id) this.refreshVoice(r.channel_id);
      }
      if (ch.table === 'call_invites' && ch.type === 'INSERT' && r.user_id === Api.userId) {
        const k = (await Api.list(`calls?id=eq.${r.call_id}&select=*`))[0]; if (!k || k.ended_at) return;
        await S.loadProfiles([r.invited_by]);
        const inc = { call: r.call_id, chat: k.chat_id, from: r.invited_by, video: !!k.video, guest: true };
        if (this.callId) { this.waiting = inc; this.beep(); this.changed(); return; }
        this.incoming = inc; this.startRing(); this.changed();
        root.ZM.notify(S.nameOf(r.invited_by), 'lädt dich in einen Anruf ein …');
        return;
      }
      if (ch.table === 'call_participants') {
        const call = (r && r.call_id) || (ch.old || {}).call_id; if (!call) return;
        const k = (await Api.list(`calls?id=eq.${call}&select=channel_id`))[0];
        if (k && k.channel_id) this.refreshVoice(k.channel_id);
      }
    },
    async onSignal(r) {
      if (r.to_device !== S.deviceId || r.call_id !== this.callId) return;
      let content;
      const p = r.payload || {};
      // Nur verschlüsselt und gültig unterschrieben annehmen — auch in Server-Sprachkanälen (sonst könnte sich der Server dazwischenschalten)
      if (p.plain) { console.warn('Signal ohne Verschlüsselung abgelehnt (altes Gerät?)'); return; }
      {
        try {
          await S.devices([r.from_user]);
          if (!S.signKeys.get(r.from_device)) await S.devices([r.from_user], true);     // neues Gerät / gerade erst im selben Kanal
          const o = await C.decrypt(p, 'call:' + r.call_id, r.id, r.from_device, S.deviceId, S.keys, S.signKeys.get(r.from_device));
          if (o.check !== 'OK') return;
          content = o.content;
        } catch (e) { console.warn('Signal unlesbar', e); return; }
      }
      const k = r.from_user + '|' + r.from_device;
      if (r.kind === 'offer') {
        await S.loadProfiles([r.from_user]);
        const x = this.peer(r.from_user, r.from_device);
        await x.pc.setRemoteDescription({ type: 'offer', sdp: content.sdp });
        for (const c of x.ice.splice(0)) await x.pc.addIceCandidate(c).catch(() => { });
        const a = await x.pc.createAnswer(); await x.pc.setLocalDescription(a);
        this.signal(r.from_user, r.from_device, 'answer', { sdp: a.sdp });
      } else if (r.kind === 'answer') {
        const x = this.remotes.get(k); if (!x) return;
        await x.pc.setRemoteDescription({ type: 'answer', sdp: content.sdp });
        for (const c of x.ice.splice(0)) await x.pc.addIceCandidate(c).catch(() => { });
      } else if (r.kind === 'ice') {
        const x = this.remotes.get(k) || this.peer(r.from_user, r.from_device);
        const cand = { candidate: content.sdp, sdpMid: content.mid, sdpMLineIndex: content.line };
        if (x.pc.remoteDescription) await x.pc.addIceCandidate(cand).catch(() => { }); else x.ice.push(cand);
      } else if (r.kind === 'bye' || r.kind === 'decline') this.drop(k);
    },

    async refreshVoice(chan) {
      const rows = await Api.list(`calls?channel_id=eq.${chan}&ended_at=is.null&select=id,call_participants(user_id,left_at)&order=created_at.desc&limit=1`);
      const users = [...new Set(((rows[0] || {}).call_participants || []).filter((p) => !p.left_at).map((p) => p.user_id))];
      await S.loadProfiles(users);
      this.voiceMembers.set(chan, users); this.changed();
    },

    toggleMute() { this.muted = !this.muted; if (this.local) this.local.getAudioTracks().forEach((t) => (t.enabled = !this.muted)); this.changed();
      if (this.callId) Api.rest('PATCH', `call_participants?call_id=eq.${this.callId}&user_id=eq.${Api.userId}&device_id=eq.${S.deviceId}`, { muted: this.muted }).catch(() => { }); },
    async toggleVideo() {
      if (this.videoOn) {
        this.local.getVideoTracks().forEach((t) => { t.stop(); this.local.removeTrack(t); });
        for (const r of this.remotes.values()) { r.pc.getSenders().filter((s) => s.track && s.track.kind === 'video').forEach((s) => r.pc.removeTrack(s)); await this.renegotiate(r); }
        this.videoOn = false; this.changed();
      } else { try { await this.media(true); this.changed(); } catch (e) { this.status = 'Kamera ging nicht: ' + e.message; this.changed(); } }
    },
    stopMedia() { if (this.local) this.local.getTracks().forEach((t) => t.stop()); this.local = null; this.videoOn = false; },

    async leave(missed) {
      const id = this.callId; if (!id) return;
      const chat = this.chatId, chan = this.channelId, dur = this.startedAt ? Date.now() - this.startedAt : 0, video = this.wantVideo || this.videoOn;
      for (const r of this.remotes.values()) this.signal(r.user, r.device, 'bye', {});
      await new Promise((ok) => setTimeout(ok, 150));
      try { await Api.rpc('leave_call', { c: id, device: S.deviceId }); } catch (e) { }
      for (const r of this.remotes.values()) try { r.pc.close(); } catch (e) { }
      if (this.sharing) { try { this.sharing.stop(); } catch (e) { } this.sharing = null; }
      this.remotes.clear(); this.stopMedia();
      Object.assign(this, { callId: null, chatId: null, channelId: null, minimized: false, startedAt: 0, guestTitle: null });
      this.changed();
      if (chat && this.iStarted) {
        const d = Math.round(dur / 1000), mm = Math.floor(d / 60), ss = String(d % 60).padStart(2, '0');
        try { await S.send(chat, 'text', { t: (video ? '📹 Videoanruf' : '📞 Sprachanruf') + (missed || !dur ? ' · nicht angenommen' : ` · ${mm}:${ss}`), callLog: true, dur }); } catch (e) { }
      }
      if (chan) this.refreshVoice(chan);
    },

    startRing() {
      try {
        // eigener Klingelton (zwei Töne), ohne Datei
        const plusTone = null;   // Klingelton wählt man für alle unter Einstellungen → Anrufe (wie am Handy)
        if (plusTone) { root.ZPlus.playTone(plusTone, 0.1); this.ringTimer = setInterval(() => root.ZPlus.playTone(plusTone, 0.1), 1800); setTimeout(() => { if (this.incoming) { this.incoming = null; this.stopRing(); this.changed(); } }, 45000); return; }
        const ctx = new AudioContext(); this.ringAudio = ctx;
        const beep = () => this.playTone(ctx, this.pref('ton', 'klassisch'));
        beep(); this.ringTimer = setInterval(beep, 1600);
      } catch (e) { }
      const ringing = this.incoming;
      setTimeout(() => { if (this.incoming && this.incoming === ringing) { this.incoming = null; this.stopRing(); this.changed(); this.missed(ringing); } }, 45000);
    },
    /** Klingeltöne ohne Datei (WebAudio) */
    TONES: { klassisch: 'Klassisch', sanft: 'Sanft', digital: 'Digital', glocke: 'Glocke' },
    playTone(ctx, name) {
      const P = { klassisch: [[880, 0, 0.18], [660, 0.25, 0.18]], sanft: [[523, 0, 0.35], [659, 0.4, 0.35], [784, 0.8, 0.45]], digital: [[1200, 0, 0.08], [1200, 0.12, 0.08], [1200, 0.24, 0.08], [1200, 0.36, 0.08]], glocke: [[988, 0, 0.9], [740, 0.45, 0.9]] }[name] || [[880, 0, 0.18], [660, 0.25, 0.18]];
      P.forEach(([f, t, d]) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = name === 'glocke' || name === 'sanft' ? 'sine' : 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + d);
        o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + d + 0.05); });
    },
    beep() { try { const ctx = new AudioContext(); [0, 0.3].forEach((t) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 440; g.gain.value = 0.06; o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.15); }); setTimeout(() => ctx.close(), 1200); } catch (e) { }
    },
    stopRing() { clearInterval(this.ringTimer); try { this.ringAudio && this.ringAudio.close(); } catch (e) { } this.ringAudio = null; },
  };

  root.ZMCall = Call;
  // Netz wieder da / gewechselt: laufende Verbindungen sofort neu aushandeln
  root.addEventListener('online', () => { for (const [k, r] of Call.remotes) { r.restarts = 0; Call.restartIce(k).catch(() => { }); } });
})(window);
