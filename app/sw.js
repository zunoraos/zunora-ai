/* Die iPhone-Web-App gibt es nicht mehr. Dieser Helfer löscht eine früher gespeicherte Kopie auf dem Gerät und meldet sich ab. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('zm-')) await caches.delete(k);
    await self.registration.unregister();
    for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate('../store.html');
  })());
});
