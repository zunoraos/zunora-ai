// Rückkehr von der Stripe-Kasse für Zunora Plus. Die App holt sich vom Zunora-Server (Edge Function „plus-kasse") einen Link
// direkt zur Stripe-Kasse; danach schickt Stripe hierher zurück: ?ok=1 (bezahlt / Probezeit gestartet), ?abbruch=1 (abgebrochen),
// ?verwaltet=1 (aus dem Kundenbereich „Zahlart & Rechnungen" zurück). Hier wird nichts bezahlt und nichts geladen.
(() => {
  const de = document.getElementById('kStatus'), en = document.getElementById('kStatusEn'), done = document.getElementById('kDone');
  const say = (d, e) => { de.textContent = d; en.textContent = e; };
  const q = new URLSearchParams(location.search);
  if (q.has('ok')) {
    say('Danke! Zunora Plus ist gleich in der App freigeschaltet (das kann ein paar Sekunden dauern). Du kannst dieses Fenster schließen.',
      'Thank you! Zunora Plus will be unlocked in the app in a moment (this can take a few seconds). You can close this window.');
    done.hidden = false;
  } else if (q.has('abbruch')) {
    say('Die Kasse wurde geschlossen. Es wurde nichts gekauft.', 'The checkout was closed. Nothing was bought.');
    done.hidden = false;
  } else if (q.has('verwaltet')) {
    say('Fertig. Änderungen an Zahlart oder Abo siehst du gleich in der App.', 'Done. Changes to your payment method or subscription will show up in the app shortly.');
    done.hidden = false;
  }
})();
