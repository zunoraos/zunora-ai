/*
 * Zunora Plus im Profil (PC): ✦-Abzeichen (Plus, abschaltbar) und: bewegter Rahmen, Profil-Hintergrund,
 * bewegtes Profilbild (Bilder-Streifen aus einem kurzen Video), Story-Statistik — und der Server-Boost
 * (Banner, eigene Emojis :name:, Rollen mit Farbverlauf, 🚀). Gleiche Daten wie am Handy (Server-Funktionen plus_looks …).
 */
(function (root) {
  const T = (s) => (root.ZLang && root.ZLang.t ? root.ZLang.t(s) : s);
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const FRAMES = {
    regenbogen: ['#ff5f6d', '#ffc371', '#38ef7d', '#4fa3ff', '#c04cff', '#ff5f6d'], feuer: ['#ff4d2e', '#ff9500', '#ffe066', '#ff4d2e'],
    ozean: ['#0e6bff', '#00e0ff', '#7cf5ff', '#0e6bff'], gold: ['#ffd700', '#fff4b0', '#c9a227', '#ffd700'], neon: ['#ff2bd6', '#2bfff1', '#ff2bd6'],
    galaxie: ['#7a2bff', '#ff2bd6', '#2b6bff', '#7a2bff'], polarlicht: ['#2fe6a0', '#6d4cff', '#00c2ff', '#2fe6a0'], kirsche: ['#ff7ad9', '#ffd1ec', '#ff3d7f', '#ff7ad9'],
  };
  const BANNERS = {
    sonne: ['#ff9a44', '#ff3d7f'], meer: ['#00c6ff', '#0072ff'], wald: ['#56ab2f', '#a8e063'], nacht: ['#141e30', '#5b3df0'], lila: ['#8e2de2', '#ff7ad9'],
    gold: ['#f7971e', '#ffd200'], eis: ['#83a4d4', '#b6fbff'], feuer: ['#f12711', '#f5af19'], mint: ['#11998e', '#38ef7d'], galaxie: ['#2b1055', '#d53369'],
  };
  const H = () => root.ZMLookH || {};          // Helfer aus ui.js (S, Api, renderAll, toast …)

  const L = {
    FRAMES, BANNERS, looks: new Map(), _asked: '',
    async load(force) {
      const { S, Api } = H(); if (!S || !Api || !Api.userId) return;
      const ids = new Set([Api.userId]);
      S.chats.forEach((c) => c.members.forEach((m) => ids.add(m.userId)));
      (S.friends || []).forEach((f) => { if (f.st === 'accepted') ids.add(f.p.id); });
      const key = [...ids].sort().join(',');
      if (!force && key === this._asked) return; this._asked = key;
      const list = [...ids];
      for (let i = 0; i < list.length; i += 300) {
        const part = list.slice(i, i + 300);
        let r; try { r = await Api.rpc('plus_looks', { ids: part }); } catch (e) { continue; }
        const got = new Set();
        (Array.isArray(r) ? r : []).forEach((o) => { got.add(o.user_id); this.looks.set(o.user_id, { badge: !!o.badge, frame: o.frame || '', banner: o.banner || '', anim: o.anim || null }); });
        part.forEach((u) => { if (!got.has(u)) this.looks.delete(u); });
      }
      if (H().renderAll) H().renderAll();
    },
    badge(u) { const l = this.looks.get(u); return l && l.badge ? '<span class="pbadge" title="Zunora Plus">✦</span>' : ''; },
    has(u) { const l = this.looks.get(u); return !!(l && (l.frame || l.anim)); },
    /** Profilbild-HTML um Rahmen / bewegtes Bild ergänzen */
    wrap(u, html, cls) {
      const l = this.looks.get(u); if (!l || (!l.frame && !l.anim)) return html;
      const { Api } = H();
      const inner = l.anim && Api ? `<div class="av img anim ${cls || ''}" style="background-image:url('${esc(Api.publicUrl('avatars', l.anim))}')"></div>` : html;
      const fr = FRAMES[l.frame];
      return fr ? `<span class="pframe ${cls || ''}" style="--fr:conic-gradient(${fr.join(',')})">${inner}</span>` : inner;
    },
    banner(u) { const l = this.looks.get(u); const b = l && BANNERS[l.banner]; return b ? `<div class="pbanner" style="background:linear-gradient(135deg,${b[0]},${b[1]})"></div>` : ''; },

    async mine() {
      const { Api } = H();
      const r = await Api.rest('GET', `profiles?id=eq.${Api.userId}&select=plus_badge,plus_frame,plus_banner,avatar_anim`);
      const o = (Array.isArray(r) ? r[0] : r) || {};
      return { badge: o.plus_badge !== false, frame: o.plus_frame || '', banner: o.plus_banner || '', anim: o.avatar_anim || null };
    },
    async save(l) { await H().Api.rpc('set_plus_look', { badge: l.badge, frame: l.frame, banner: l.banner, anim: l.anim || '' }); await this.load(true); },
    /** Kurzes Video → 12 quadratische Bilder (256 px) nebeneinander → hochladen */
    async makeAnim(file) {
      const { Api } = H();
      const url = URL.createObjectURL(file);
      try {
        const v = document.createElement('video'); v.muted = true; v.src = url; v.preload = 'auto';
        await new Promise((ok, bad) => { v.onloadeddata = ok; v.onerror = () => bad(new Error(T('Aus diesem Video ließ sich kein bewegtes Bild machen.'))); });
        const dur = Math.min(2.4, v.duration || 0); if (!(dur > 0.3)) throw new Error(T('Aus diesem Video ließ sich kein bewegtes Bild machen.'));
        const n = 12, px = 256, c = document.createElement('canvas'); c.width = px * n; c.height = px; const x = c.getContext('2d');
        const side = Math.min(v.videoWidth, v.videoHeight);
        for (let k = 0; k < n; k++) {
          await new Promise((ok) => { v.onseeked = ok; v.currentTime = dur * k / n; });
          x.drawImage(v, (v.videoWidth - side) / 2, (v.videoHeight - side) / 2, side, side, k * px, 0, px, px);
        }
        const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.8));
        const path = `${Api.userId}/anim-${crypto.randomUUID()}.jpg`;
        await Api.upload('avatars', path, new Uint8Array(await blob.arrayBuffer()), 'image/jpeg');
        return path;
      } finally { URL.revokeObjectURL(url); }
    },
    async storyStats() { const r = await H().Api.rpc('story_stats', { days: 30 }); return Array.isArray(r) ? r : []; },

    /** Einstellungen → Konto: Karte (nur mit Plus) */
    settingsHtml() {
      if (!(root.ZPlus && root.ZPlus.active())) return '';
      return `<div class="kcard" id="plLook"><div class="kh"><b>✦ ${T('Plus im Profil')}</b></div><div class="small muted">${T('Lädt …')}</div></div>`;
    },
    async wireSettings(el) {
      const box = el.querySelector('#plLook'); if (!box) return;
      const { toast } = H();
      let l; try { l = await this.mine(); } catch (e) { box.querySelector('.small').textContent = e.message || String(e); return; }
      const extra = root.ZPlus.extraActive && root.ZPlus.extraActive();
      const draw = () => {
        box.innerHTML = `<div class="kh"><b>✦ ${T('Plus im Profil')}</b></div>
          <label class="small chk"><input type="checkbox" id="plBadge" ${l.badge ? 'checked' : ''}> <span>${T('Plus-Abzeichen zeigen')} — ${T('Freunde und Chat-Partner sehen ✦ neben deinem Namen.')}</span></label>
          ${!extra ? `<p class="small muted">${T('Bewegter Rahmen, Profil-Hintergrund, bewegtes Profilbild und Story-Statistik gibt es mit Zunora Plus (Einstellungen → Zunora Plus).')}</p>` : `
          <p class="small"><b>💎 ${T('Bewegter Rahmen')}</b></p><div class="pl-row"><button class="pl-fr ${!l.frame ? 'on' : ''}" data-fr="">${T('Aus')}</button>${Object.entries(FRAMES).map(([id, c]) => `<button class="pl-fr ${l.frame === id ? 'on' : ''}" data-fr="${id}"><span class="pframe s" style="--fr:conic-gradient(${c.join(',')})"><span class="av s" style="background:#0003"></span></span></button>`).join('')}</div>
          <p class="small"><b>💎 ${T('Profil-Hintergrund')}</b></p><div class="pl-row"><button class="pl-bn ${!l.banner ? 'on' : ''}" data-bn="">${T('Aus')}</button>${Object.entries(BANNERS).map(([id, c]) => `<button class="pl-bn ${l.banner === id ? 'on' : ''}" data-bn="${id}" style="background:linear-gradient(135deg,${c[0]},${c[1]})"></button>`).join('')}</div>
          <p class="small"><b>💎 ${T('Bewegtes Profilbild')}</b></p><p class="small muted">${T('Wähle ein kurzes Video — daraus wird ein Profilbild, das sich hin und her bewegt (für alle sichtbar, wie dein Profilbild).')}</p>
          <div class="frbtns"><button class="btn ghost" id="plVid">${T('Video wählen')}</button>${l.anim ? `<button class="btn ghost" id="plVidX">${T('Entfernen')}</button>` : ''}</div><input type="file" id="plVidF" accept="video/*" class="hidden">
          <p class="small"><b>💎 ${T('Story-Statistik')}</b></p><div class="frbtns"><button class="btn ghost" id="plStats">${T('Wer hat meine Storys angesehen?')}</button></div><div id="plStatsOut"></div>`}`;
        const put = (n) => { const old = l; l = n; draw(); this.save(n).catch((e) => { l = old; draw(); toast(e.message || String(e), true); }); };
        box.querySelector('#plBadge').onchange = (e) => put(Object.assign({}, l, { badge: e.target.checked }));
        box.querySelectorAll('[data-fr]').forEach((b) => b.onclick = () => put(Object.assign({}, l, { frame: b.dataset.fr })));
        box.querySelectorAll('[data-bn]').forEach((b) => b.onclick = () => put(Object.assign({}, l, { banner: b.dataset.bn })));
        const vf = box.querySelector('#plVidF'), vb = box.querySelector('#plVid');
        if (vb) { vb.onclick = () => vf.click(); vf.onchange = async () => { const f = vf.files && vf.files[0]; if (!f) return; vb.disabled = true; vb.textContent = T('Bewegtes Profilbild wird erstellt …');
          try { put(Object.assign({}, l, { anim: await this.makeAnim(f) })); } catch (e) { toast(e.message || String(e), true); draw(); } }; }
        const vx = box.querySelector('#plVidX'); if (vx) vx.onclick = () => put(Object.assign({}, l, { anim: null }));
        const st = box.querySelector('#plStats');
        if (st) st.onclick = async () => { const out = box.querySelector('#plStatsOut'); out.textContent = T('Lädt …');
          try { const r = await this.storyStats(); const { S } = H(); if (S.loadProfiles) await S.loadProfiles(r.map((x) => x.viewer)).catch(() => { });
            out.innerHTML = r.length ? r.slice(0, 30).map((x) => `<div class="row" style="padding:4px 0">${H().uav(x.viewer, 's')}<div class="main"><b>${esc(S.nameOf(x.viewer))}</b></div><span style="color:var(--accent)">${esc(T('{0}× angesehen').replace('{0}', x.views))}</span></div>`).join('')
              : `<p class="small muted">${T('In den letzten 30 Tagen hat noch niemand deine Storys angesehen.')}</p>`; }
          catch (e) { out.textContent = e.message || String(e); } };
      };
      draw();
    },
  };

  // ======================================================================================= Server-Boost
  const B = {
    info: new Map(), emojis: new Map(), color2: new Map(), _busy: new Set(),
    boosted(s) { const i = this.info.get(s); return !!(i && i.boosted); },
    async load(s, quiet) {
      const { Api } = H(); if (!Api || !s || this._busy.has(s)) return; this._busy.add(s);
      try {
        const a = await Api.rpc('server_boost_info', { s }); const o = (Array.isArray(a) ? a[0] : a) || {};
        const sv = await Api.rest('GET', `servers?id=eq.${s}&select=banner_path`); const bp = ((Array.isArray(sv) ? sv[0] : sv) || {}).banner_path || null;
        this.info.set(s, { boosted: !!o.boosted, boosters: o.boosters || 0, mine: !!o.mine, banner: bp });
        const e = await Api.rest('GET', `server_emojis?server_id=eq.${s}&select=id,name,path&order=name`); this.emojis.set(s, Array.isArray(e) ? e : []);
        const r = await Api.rest('GET', `server_roles?server_id=eq.${s}&select=id,color2`); (Array.isArray(r) ? r : []).forEach((x) => { if (x.color2) this.color2.set(x.id, x.color2); else this.color2.delete(x.id); });
      } catch (e) { } finally { this._busy.delete(s); }
      if (!quiet && H().renderAll) H().renderAll();
    },
    ensure(s) { if (s && !this.info.has(s)) this.load(s); },
    bannerHtml(s) {
      this.ensure(s); const i = this.info.get(s); if (!i || !i.boosted) return '';
      const { Api } = H();
      return `<div class="boost-banner" style="${i.banner ? `background-image:url('${esc(Api.publicUrl('avatars', i.banner))}');height:96px` : ''}"><span>🚀 ${T('Geboostet')}${i.boosters > 1 ? ' · ' + i.boosters : ''}</span></div>`;
    },
    /** Name mit Farbverlauf der höchsten Rolle (nur geboostet) → CSS oder '' */
    gradient(s, u) {
      if (!this.boosted(s)) return '';
      const { S } = H(); const st = S.serverState.get(s); if (!st) return '';
      const mine = new Set(((st.members || []).find((m) => m.userId === u) || {}).roles || []);
      const top = (st.roles || []).filter((r) => mine.has(r.id)).sort((a, b) => b.position - a.position)[0];
      const c2 = top && this.color2.get(top.id);
      return c2 ? `background:linear-gradient(90deg,${top.color},${c2});-webkit-background-clip:text;background-clip:text;color:transparent` : '';
    },
    /** :name: → Bild (nach dem Escapen) */
    emojify(s, html) {
      const list = this.boosted(s) ? this.emojis.get(s) || [] : []; if (!list.length || html.indexOf(':') < 0) return html;
      const { Api } = H(); const map = new Map(list.map((e) => [e.name, e]));
      return html.replace(/:([a-z0-9_]{2,24}):/g, (all, n) => { const e = map.get(n); return e ? `<img class="semoji" src="${esc(Api.publicUrl('avatars', e.path))}" alt=":${esc(n)}:" title=":${esc(n)}:">` : all; });
    },
    async setBanner(s, file) {
      const { Api } = H(); let path = null;
      if (file) {
        const img = await createImageBitmap(file); const w = Math.min(1200, img.width), h = Math.round(w / 3);
        const c = document.createElement('canvas'); c.width = w; c.height = h; const sh = Math.min(img.height, img.width / 3);
        c.getContext('2d').drawImage(img, 0, (img.height - sh) / 2, img.width, sh, 0, 0, w, h);
        const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.82));
        path = `${Api.userId}/banner-${crypto.randomUUID()}.jpg`; await Api.upload('avatars', path, new Uint8Array(await blob.arrayBuffer()), 'image/jpeg');
      }
      await Api.rest('PATCH', `servers?id=eq.${s}`, { banner_path: path }); await this.load(s);
    },
    async addEmoji(s, name, file) {
      const { Api } = H();
      const n = String(name || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '').slice(0, 24);
      if (n.length < 2) throw new Error(T('Der Name braucht 2 bis 24 Zeichen (a–z, 0–9, _).'));
      const img = await createImageBitmap(file); const side = Math.min(img.width, img.height);
      const c = document.createElement('canvas'); c.width = c.height = 128; c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 128, 128);
      const blob = await new Promise((ok) => c.toBlob(ok, 'image/png'));
      const path = `${Api.userId}/emoji-${crypto.randomUUID()}.png`; await Api.upload('avatars', path, new Uint8Array(await blob.arrayBuffer()), 'image/png');
      await Api.rest('POST', 'server_emojis', { server_id: s, name: n, path }); await this.load(s);
    },
    /** Server-Menü → 🚀 Server-Boost */
    dlg(s) {
      const { dlg, closeDlg, tryDo, toast, S, Api } = H(); const sv = S.servers.get(s); if (!sv) return;
      const draw = async (box) => {
        await this.load(s, true); const i = this.info.get(s) || {}; const list = this.emojis.get(s) || [];
        const admin = S.can(s, 128), emo = admin || S.can(s, 1), extra = root.ZPlus && root.ZPlus.extraActive && root.ZPlus.extraActive();
        box.innerHTML = `<h3>🚀 ${T('Server-Boost')}</h3><p class="small muted">${T('Mit Zunora Plus boostest du einen Server: Banner, bis zu 50 eigene Emojis, Rollen mit Farbverlauf und das Boost-Abzeichen.')}</p>
          <p><b>${i.boosted ? esc(T('✓ Dieser Server ist geboostet ({0}).').replace('{0}', i.boosters)) : T('Dieser Server ist nicht geboostet.')}</b></p>
          ${i.mine ? `<button class="btn ghost" data-b="off">${T('Boost entfernen')}</button>` : extra ? `<button class="btn" data-b="on">🚀 ${T('Diesen Server boosten')}</button>` : `<p class="small" style="color:var(--warn,#ffb020)">${T('Boosten kann man mit Zunora Plus (Einstellungen → Zunora Plus). Ein Boost gilt immer für einen Server.')}</p>`}
          ${i.boosted && admin ? `<p class="small"><b>${T('Banner')}</b></p><div class="frbtns"><button class="btn ghost" data-b="banner">${i.banner ? T('Banner ändern') : T('Banner wählen')}</button>${i.banner ? `<button class="btn ghost" data-b="nobanner">${T('Entfernen')}</button>` : ''}</div>` : ''}
          ${i.boosted ? `<p class="small"><b>${esc(T('Eigene Emojis ({0}/50) — im Text mit :name:').replace('{0}', list.length))}</b></p>
            <div class="sem-list">${list.map((e) => `<span class="sem" ${emo ? `data-del="${esc(e.id)}" title="${T('Klicken = löschen')}"` : ''}><img src="${esc(Api.publicUrl('avatars', e.path))}"><small>:${esc(e.name)}:</small></span>`).join('')}</div>
            ${emo && list.length < 50 ? `<div class="zp-row"><input id="semN" maxlength="24" placeholder="${T('Name (z. B. party)')}" style="flex:1"><button class="btn ghost" data-b="emoji">${T('Bild wählen')}</button></div>` : ''}` : ''}
          <input type="file" id="semF" accept="image/*" class="hidden"><input type="file" id="banF" accept="image/*" class="hidden">
          <div class="rowb"><button class="btn ghost" data-close>${T('Schließen')}</button></div>`;
        box.querySelector('[data-close]').onclick = closeDlg;
        const act = (k) => box.querySelector(`[data-b="${k}"]`);
        if (act('on')) act('on').onclick = () => tryDo(async () => { await Api.rpc('boost_server', { s }); await this.load(s); draw(box); toast(T('Danke! Der Server ist jetzt geboostet.')); });
        if (act('off')) act('off').onclick = () => tryDo(async () => { await Api.rpc('boost_server', { s: null }); await this.load(s); draw(box); });
        const bf = box.querySelector('#banF'), ef = box.querySelector('#semF');
        if (act('banner')) { act('banner').onclick = () => bf.click(); bf.onchange = () => { const f = bf.files[0]; if (f) tryDo(async () => { await this.setBanner(s, f); draw(box); }); }; }
        if (act('nobanner')) act('nobanner').onclick = () => tryDo(async () => { await this.setBanner(s, null); draw(box); });
        if (act('emoji')) { act('emoji').onclick = () => ef.click(); ef.onchange = () => { const f = ef.files[0]; if (f) tryDo(async () => { await this.addEmoji(s, box.querySelector('#semN').value, f); draw(box); }); }; }
        box.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => tryDo(async () => { await Api.rest('DELETE', `server_emojis?id=eq.${b.dataset.del}`); await this.load(s); draw(box); }));
      };
      dlg(`<p class="small muted">${T('Lädt …')}</p>`, (box) => draw(box));
    },
    /** Rollen-Editor: zweite Farbe (nur geboostet) */
    roleHtml(s, r) {
      if (!r || r.is_default || !this.boosted(s)) return '';
      const c2 = this.color2.get(r.id) || '';
      return `<div style="display:flex;gap:8px;align-items:center"><span class="small">🚀 ${T('Farbverlauf (Boost)')}</span><input id="roC2" type="color" value="${esc(c2 || '#ff7ad9')}" style="width:60px;height:32px;padding:0"><label class="small chk"><input type="checkbox" id="roC2on" ${c2 ? 'checked' : ''}> <span>${T('an')}</span></label></div>`;
    },
    async saveRole(s, r, box) {
      const on = box.querySelector('#roC2on'); if (!on || !r) return;
      await H().Api.rest('PATCH', `server_roles?id=eq.${r.id}`, { color2: on.checked ? box.querySelector('#roC2').value : null }); await this.load(s, true);
    },
  };

  root.ZMLook = L; root.ZMBoost = B;
})(window);
