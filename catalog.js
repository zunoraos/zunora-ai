// Zunora-Webseite: App-Katalog vom Zunora-Store-Server (nur LESEN, mit dem öffentlichen Schlüssel — wie die Store-Apps).
// Sicherheit: Alle Texte aus dem Katalog werden maskiert (esc), Download-Links nur zu GitHub-Releases von zunoraos/zunora-ai.
const ZC = (() => {
  let cfg = null, data = null;
  const L = () => document.documentElement.dataset.l || 'en';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const cmp = (a, b) => {
    const p = (v) => String(v).split('-')[0].split('.').map((n) => parseInt(n, 10) || 0);
    const x = p(a), y = p(b);
    for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0);
    const ba = String(a).includes('-'), bb = String(b).includes('-');
    if (ba !== bb) return ba ? -1 : 1;
    return String(a).localeCompare(String(b), undefined, { numeric: true });
  };
  /** Nur echte GitHub-Release-Dateien des Zunora-Kontos zulassen. */
  const safeUrl = (u) => { try { const x = new URL(u); return x.protocol === 'https:' && x.hostname === 'github.com' && x.pathname.startsWith('/zunoraos/zunora-ai/releases/download/') ? x.href : null; } catch { return null; } };
  const size = (b) => !b ? '' : b >= 1048576 ? (b / 1048576).toFixed(1).replace('.', L() === 'de' ? ',' : '.') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';

  async function config() {
    if (cfg) return cfg;
    const r = await fetch('store.json', { cache: 'no-store' }); const j = await r.json();
    const url = String(j.url || '').replace(/\/+$/, '');
    if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url) || !String(j.anon || '').startsWith('sb_publishable_')) throw new Error('config');
    return (cfg = { url, anon: j.anon });
  }
  async function rest(path) {
    const c = await config();
    const r = await fetch(c.url + '/rest/v1/' + path, { headers: { apikey: c.anon }, cache: 'no-store' });
    if (!r.ok) throw new Error('Server ' + r.status);
    return r.json();
  }
  async function load() {
    if (data) return data;
    const [apps, vers, shots] = await Promise.all([
      rest('apps?select=*&order=sort.asc,name.asc'),
      rest('versions?select=app_id,platform,channel,version,notes,file_name,file_url,size,sha256,min_os,created_at&channel=in.(stable,beta)&order=created_at.desc&limit=800'),
      rest('app_screens?select=app_id,platform,path,position,caption&order=position.asc'),
    ]);
    const byApp = {};
    for (const a of apps) a._beta = a.status === 'beta';
    const appMap = Object.fromEntries(apps.map((a) => [a.id, a]));
    for (const v of vers) {
      const a = appMap[v.app_id]; if (!a) continue;
      if (v.channel === 'beta' && !a._beta) continue;           // Beta nur bei Apps im Beta-Test
      if (!safeUrl(v.file_url)) continue;
      ((byApp[v.app_id] ||= {})[v.platform] ||= []).push(v);
    }
    for (const id in byApp) for (const p in byApp[id]) byApp[id][p].sort((a, b) => cmp(b.version, a.version));
    const sh = {}; for (const s of shots) ((sh[s.app_id] ||= {})[s.platform] ||= []).push(s);
    // wie die Store-App: Wartung und „Heute"-Karten (fehlen sie, bleibt der Rest wie gehabt)
    const [status, stories] = await Promise.all([
      rest('store_status?select=maint_from,maint_until,title,body').catch(() => []),
      rest('today_stories?select=id,style,kicker,title,subtitle,body,app_id,app_ids,emoji,color1,color2,image_path,countdown_at,platforms,sort&order=sort.asc,created_at.desc&limit=30').catch(() => []),
    ]);
    return (data = { apps: apps.filter((a) => a.access !== 'invite'), vers: byApp, shots: sh, status: status[0] || null, stories });
  }
  const latest = (id, plat) => (data?.vers?.[id]?.[plat] || [])[0] || null;
  const media = (p) => !p ? '' : String(p).startsWith('https://') ? p : cfg.url + '/storage/v1/object/public/store-media/' + String(p).split('/').map(encodeURIComponent).join('/');
  const icon = (a, cls = '') => {
    const color = /^#[0-9a-fA-F]{6}$/.test(a.accent || '') ? a.accent : '#8B6CFF';
    if (a.icon_path) return `<img class="icon ${cls}" src="${esc(media(a.icon_path))}" alt="">`;
    return `<div class="icon ${cls}" style="background:linear-gradient(135deg,${color},color-mix(in srgb,${color} 45%,#1b1450))">${esc(String(a.name || '?').replace(/^Zunora\s+/, '').charAt(0))}</div>`;
  };
  async function counted(id) { try { const c = await config(); await fetch(c.url + '/rest/v1/rpc/count_download', { method: 'POST', headers: { apikey: c.anon, 'Content-Type': 'application/json' }, body: JSON.stringify({ app: id }) }); } catch { } }
  const visible = (a) => a.id !== 'store' || true;
  return { load, latest, media, icon, esc, size, counted, safeUrl, L, visible };
})();

// Startseite: App-Kacheln aus dem Katalog (wenn erreichbar; sonst bleiben die festen Kacheln)
(async () => {
  const box = document.getElementById('appsLive'); if (!box) return;
  try {
    const d = await ZC.load();
    const list = d.apps.filter((a) => a.id !== 'store');
    if (!list.length) return;
    box.innerHTML = list.map((a) => {
      const soon = a.status === 'announced', beta = a.status === 'beta';
      return `<a class="glass app-tile in" href="store.html#app=${encodeURIComponent(a.id)}">${ZC.icon(a)}<b>${ZC.esc(a.name)}</b>
        <small>${ZC.esc(a.subtitle || '')}</small>${soon ? '<span class="chip soon"><span lang="de">BALD</span><span lang="en">SOON</span></span>' : beta ? '<span class="chip beta">BETA</span>' : ''}</a>`;
    }).join('');
  } catch { /* feste Kacheln bleiben */ }
})();
