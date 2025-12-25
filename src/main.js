
const app = document.getElementById('app');
function render(){
  const path = location.pathname;
  if(path==='/'||path===''){
    app.innerHTML = `
      <h1 class="h3">Dashboard</h1>
      <p class="text-muted">Cloudflare Pages SPA placeholder.</p>
      <ul>
        <li><a href="/login">Go to Login</a></li>
        <li><a href="/products">View Products</a></li>
      </ul>`;
  } else if(path==='/login'){
    app.innerHTML = `
      <h1 class="h3">Login</h1>
      <form id="loginForm" class="mt-3" autocomplete="off">
        <div class="mb-3">
          <label class="form-label">Passphrase</label>
          <input type="password" class="form-control" name="passphrase" required />
        </div>
        <button class="btn btn-primary" type="submit">Authenticate</button>
      </form>
      <div id="result" class="mt-3"></div>`;
    const form = document.getElementById('loginForm');
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const passphrase = new FormData(form).get('passphrase');
      const cfg = await fetch('/config.json').then(r=>r.json()).catch(()=>({adminAuthEndpoint:'',apiBase:''}));
      let msg='';
      try{
        const res = await fetch(cfg.adminAuthEndpoint + '/auth', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({passphrase})});
        const data = await res.json();
        msg = `Token: ${data.token||'n/a'}`;
      }catch(err){ msg = 'Auth request failed: ' + err; }
      document.getElementById('result').textContent = msg;
    });
  } else if(path==='/products'){
    app.innerHTML = `<h1 class="h3">Products</h1><p>Placeholder. Wire to Apps Script API.</p>`;
  } else {
    app.innerHTML = `<p>Route not found: ${path}</p>`;
  }
}
window.addEventListener('popstate', render);
render();
