/* Zunora Messenger Web-App — Service Worker.
   1) Die App selbst liegt nach dem ersten Öffnen auf dem Gerät (startet ohne Internet, lädt nichts doppelt).
   2) Verschlüsselte Bilder/Dateien aus dem Speicher werden nach dem ersten Laden aufbewahrt (spart Internet; sie bleiben verschlüsselt).
   3) Push: zeigt nur „Neue Nachricht" / „Anruf" — der Inhalt bleibt Ende-zu-Ende verschlüsselt. */
const VERSION = '5019c196787f';
const FILES = ["./","./gate.js","./index.html","./manifest.webmanifest","./mobile.css","./web.js","./zbase.css","./zcloud.js","./zicons.js","./zlang.js","./zlook.css","./zlook.js","./zplus.css","./zplus.js","./icons/icon-180.png","./icons/icon-192.png","./icons/icon-512.png","./img/symbol-graphit.png","./img/symbol-sonne.png","./img/symbol-standard.png","./img/symbol-wald.png","./img/symbol-z.png","./zm/agb.js","./zm/api.js","./zm/ausbau-ui.js","./zm/ausbau.js","./zm/autoupd.js","./zm/call.js","./zm/chat2.js","./zm/crypto.js","./zm/design-chat.js","./zm/design.js","./zm/extras.js","./zm/gruppen.js","./zm/icons.js","./zm/konto.js","./zm/links.js","./zm/media.js","./zm/mehr.js","./zm/mehr2.js","./zm/offline.js","./zm/plus.js","./zm/pluslook.js","./zm/qr.js","./zm/start.js","./zm/start2.js","./zm/status.js","./zm/store.js","./zm/story.js","./zm/ui.js","./zm/wuensche.js","./zm/zm.css"];
const APP = 'zm-app-' + VERSION, MEDIA = 'zm-medien-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(APP).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('zm-app-') && k !== APP).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

async function trimMedia() {
  const c = await caches.open(MEDIA); const ks = await c.keys();
  if (ks.length > 400) for (const k of ks.slice(0, ks.length - 400)) await c.delete(k);
}
self.addEventListener('fetch', (e) => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  // verschlüsselte Medien (Pfade ändern sich nie): erst aus dem Gerät, sonst laden und aufheben
  if (/\/storage\/v1\/object\/(authenticated|public)\//.test(u.pathname)) {
    e.respondWith(caches.open(MEDIA).then(async (c) => {
      const hit = await c.match(r.url); if (hit) return hit;
      const res = await fetch(r); if (res.ok) { c.put(r.url, res.clone()); trimMedia(); } return res;
    }));
    return;
  }
  if (u.origin !== self.location.origin) return;                  // Server-Abfragen (Nachrichten) immer frisch
  if (u.pathname.endsWith('/zm/config.json')) return;               // Verbindung immer frisch
  e.respondWith(caches.open(APP).then(async (c) => {
    const hit = await c.match(r, { ignoreSearch: true }); if (hit) return hit;
    try { const res = await fetch(r); if (res.ok && u.pathname.includes('/lang/')) c.put(r, res.clone()); return res; }
    catch (err) { return (await c.match('index.html')) || Response.error(); }
  }));
});

self.addEventListener('push', (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (err) { }
  const call = !!d.call;
  const title = 'Zunora Messenger';
  const body = call ? (d.video === 'true' ? '📹 Videoanruf — tippen zum Öffnen' : '📞 Anruf — tippen zum Öffnen') : d.channel ? '@ Du wurdest erwähnt' : '💬 Neue Nachricht';
  const open = d.chat ? '#chat=' + d.chat : d.channel ? '#kanal=' + d.channel : '';
  e.waitUntil(self.registration.showNotification(title, { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: call ? 'anruf-' + d.call : (d.chat || d.channel || 'zm'),
    renotify: true, requireInteraction: call, data: { open } }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const open = (e.notification.data && e.notification.data.open) || '';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
    for (const c of cs) { c.postMessage({ open }); return c.focus(); }
    return self.clients.openWindow('./' + open);
  }));
});
