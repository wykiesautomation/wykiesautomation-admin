
// Dev-only passphrase gate (client-side). For production, validate on backend.
(async function(){
  const cfg = await fetch('config.json').then(r=>r.json());
  if(!cfg.devMode){
    const pass = prompt('Enter admin passphrase');
    const res = await fetch(cfg.appsScriptUrl + '?action=auth&pass=' + encodeURIComponent(pass));
    const ok = await res.json();
    if(!ok || ok.authorized!==true){
      alert('Unauthorized'); location.href = 'about:blank';
    }
  }
})();
