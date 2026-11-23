// Kasse für Zunora Plus. Die App bekommt vom Zunora-Server einen Link „kasse.html?_ptxn=txn_…" und öffnet ihn im Browser;
// Paddle.js erkennt _ptxn und öffnet die Kasse für genau diesen Kauf von selbst.
// TOKEN = öffentlicher „Client-side token" aus dem Paddle-Konto (Developer tools → Authentication) — KEIN geheimer Schlüssel.
// Test-Konto (Sandbox): Token beginnt mit „test_", ENV = 'sandbox'. Echtes Konto: ENV = 'live'.
(() => {
  const ENV = 'sandbox';
  const TOKEN = 'test_fb32883c8c2925048cf5449b196';      // Test-Konto (Sandbox) — öffentlich, kein Geheimnis

  const de = document.getElementById('kStatus'), en = document.getElementById('kStatusEn'), done = document.getElementById('kDone');
  const say = (d, e) => { de.textContent = d; en.textContent = e; };
  const hasTx = /[?&]_ptxn=txn_[a-z0-9]+/i.test(location.search);

  if (!window.Paddle) { say('Die Kasse ließ sich nicht laden. Bitte Seite neu laden oder später noch einmal versuchen.', 'The checkout could not be loaded. Please reload the page or try again later.'); return; }
  if (!TOKEN) { say('Die Kasse wird gerade eingerichtet — bald kannst du hier Zunora Plus kaufen.', 'The checkout is being set up — you will be able to buy Zunora Plus here soon.'); return; }
  if (!hasTx) say('Bitte starte den Kauf in der App unter Einstellungen → Zunora Plus.', 'Please start your purchase in the app under Settings → Zunora Plus.');

  if (ENV === 'sandbox') Paddle.Environment.set('sandbox');
  Paddle.Initialize({
    token: TOKEN,
    checkout: { settings: { displayMode: 'overlay', theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light', locale: (document.documentElement.dataset.l === 'de' || /^de/i.test(navigator.language)) ? 'de' : 'en' } },
    eventCallback: (ev) => {
      if (!ev || !ev.name) return;
      if (ev.name === 'checkout.loaded') say('Die Kasse ist offen.', 'The checkout is open.');
      if (ev.name === 'checkout.completed') { say('Danke! Zunora Plus ist gleich in der App freigeschaltet (das kann ein paar Sekunden dauern).', 'Thank you! Zunora Plus will be unlocked in the app in a moment (this can take a few seconds).'); done.hidden = false; }
      if (ev.name === 'checkout.closed') { if (done.hidden) say('Die Kasse wurde geschlossen. Es wurde nichts gekauft.', 'The checkout was closed. Nothing was bought.'); }
      if (ev.name === 'checkout.error') say('Bei der Kasse ist etwas schiefgegangen. Bitte versuch es noch einmal.', 'Something went wrong at checkout. Please try again.');
    },
  });
})();
