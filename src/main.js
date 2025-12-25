const app = document.getElementById('app');
const CFG = { adminAuthEndpoint: 'https://script.google.com/macros/s/AKfycbynudewxl8FUOILFPOva_fKpYtZDugzSQRNPASt0G1xix4HZ0jiAjZc3a45KaHpZG5g/exec', apiBase: 'https://script.google.com/macros/s/AKfycbynudewxl8FUOILFPOva_fKpYtZDugzSQRNPASt0G1xix4HZ0jiAjZc3a45KaHpZG5g/exec' };
let TOKEN = '';

function nav(path) { history.pushState(null, '', path); render(); }

function render(){
  const path = location.pathname;
  if(path==='/'||path===''){
    app.innerHTML = `
      <h1 class="h3">Dashboard</h1>
      <p class="text-muted">Cloudflare Pages SPA placeholder.</p>
      <div class="mb-3">
        <button class="btn btn-outline-primary" onclick="history.pushState(null,'','/login');dispatchEvent(new Event('popstate'))">Login</button>
        <button class="btn btn-outline-secondary ms-2" onclick="history.pushState(null,'','/products');dispatchEvent(new Event('popstate'))">Products</button>
      </div>`;
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
      let msg='';
      try{
        const res = await fetch(CFG.adminAuthEndpoint + '/auth', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({passphrase})});
        const data = await res.json();
        TOKEN = data.token || '';
        msg = TOKEN ? 'Authenticated.' : 'No token returned.';
      }catch(err){ msg = 'Auth request failed: ' + err; }
      document.getElementById('result').textContent = msg;
    });
  } else if(path==='/products'){
    app.innerHTML = `<h1 class="h3">Products</h1><div id="products" class="mt-3">Loading…</div>`;
    (async()=>{
      try{
        const res = await fetch(CFG.apiBase + '/products', {headers: TOKEN ? {'Authorization': `Bearer ${TOKEN}`} : {}});
        const items = await res.json();
        const list = Array.isArray(items) ? items : (items.data||[]);
        document.getElementById('products').innerHTML = list.length ? '<ul>' + list.map(p=>`<li>${p.name||p.id||'item'} — ${p.price||''}</li>`).join('') + '</ul>' : 'No products.';
      }catch(err){
        document.getElementById('products').textContent = 'Fetch failed: ' + err;
      }
    })();
  } else {
    app.innerHTML = `<p>Route not found: ${path}</p>`;
  }
}

window.addEventListener('popstate', render);
render();
