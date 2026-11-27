/* Zunora Messenger Web-App — Testphase: nur mit Tester-Code (27.11.2026).
   Der Code steht nicht im Klartext hier, nur sein SHA-256-Prüfwert (Groß/Klein egal). Einmal eingegeben, merkt sich das Gerät die Freigabe.
   Hinweis: Das ist eine Tür für Tester, kein Schutz der Daten — die Daten schützt weiter die Anmeldung und die Ende-zu-Ende-Verschlüsselung. */
(function () {
  'use strict';
  const OK = '0ff903d911d483d180079e0ebe632a4feb64043a59c40c9d270e2f222290611a';
  const KEY = 'zweb-tester';
  let saved = ''; try { saved = localStorage.getItem(KEY) || ''; } catch (e) { }
  if (saved === OK) return;
  document.documentElement.classList.add('zgate');
  const css = `html.zgate body > *:not(#zgate){visibility:hidden!important}
    #zgate{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:24px;
      padding-top:calc(24px + env(safe-area-inset-top));background:radial-gradient(120% 80% at 20% 0%,#7a2bff55,transparent 60%),radial-gradient(120% 80% at 100% 100%,#2f7bff44,transparent 60%),#100e1f;
      color:#fff;font:16px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}
    #zgate .box{width:100%;max-width:380px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);border-radius:28px;padding:26px 22px;
      backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);box-shadow:0 20px 60px rgba(0,0,0,.45);text-align:center}
    #zgate img{display:block;width:76px;height:76px;border-radius:20px;margin:0 auto 12px}
    #zgate h1{font-size:22px;margin:0 0 4px} #zgate p{margin:0 0 16px;color:rgba(255,255,255,.75);font-size:14px}
    #zgate .tag{display:inline-block;font-size:12px;font-weight:600;padding:3px 10px;border-radius:99px;background:#ffc23d;color:#2b1b00;margin-bottom:10px}
    #zgate input{width:100%;box-sizing:border-box;font-size:17px;padding:14px 16px;border-radius:16px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.25);color:#fff;text-align:center;outline:none}
    #zgate input:focus{border-color:#9b7bff}
    #zgate button{width:100%;margin-top:12px;font-size:17px;font-weight:600;padding:14px;border:0;border-radius:16px;color:#fff;background:linear-gradient(135deg,#7c5cff,#2f7bff);cursor:pointer}
    #zgate .err{min-height:20px;margin-top:10px;color:#ff8aa8;font-size:14px}
    #zgate.shake .box{animation:zgs .35s} @keyframes zgs{25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  async function hash(s) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
  }
  function show() {
    if (document.getElementById('zgate')) return;
    const g = document.createElement('div'); g.id = 'zgate';
    g.innerHTML = `<form class="box" autocomplete="off" data-notr translate="no"><img src="icons/icon-192.png" alt=""><div class="tag">Testphase</div>
      <h1>Zunora Messenger fürs iPhone</h1><p>Die Web-App ist gerade nur für Tester geöffnet. Bitte gib deinen Tester-Code ein.</p>
      <input id="zgCode" type="text" inputmode="text" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Tester-Code" aria-label="Tester-Code">
      <button type="submit">Weiter</button><div class="err" id="zgErr" role="alert"></div></form>`;
    document.body.appendChild(g);
    const f = g.querySelector('form'), inp = g.querySelector('#zgCode'), err = g.querySelector('#zgErr');
    setTimeout(() => inp.focus(), 50);
    f.onsubmit = async (e) => {
      e.preventDefault();
      const v = inp.value.trim().toLowerCase(); if (!v) return;
      let h = ''; try { h = await hash(v); } catch (x) { err.textContent = 'Bitte die Seite über https öffnen.'; return; }
      if (h === OK) {
        try { localStorage.setItem(KEY, OK); } catch (x) { }
        g.remove(); document.documentElement.classList.remove('zgate');
        dispatchEvent(new Event('resize'));
      } else {
        err.textContent = 'Dieser Code stimmt leider nicht.'; g.classList.remove('shake'); void g.offsetWidth; g.classList.add('shake'); inp.select();
      }
    };
  }
  if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
})();
