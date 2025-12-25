
(async function(){
  const cfg = await (await fetch('config.json')).json();
  const loginForm = document.getElementById('login-form');
  const adminUI = document.getElementById('admin-ui');
  const loginStatus = document.getElementById('login-status');

  let token = null;

  loginForm.addEventListener('submit', async (ev)=>{
    ev.preventDefault();
    const passphrase = document.getElementById('passphrase').value;
    loginStatus.textContent = 'Signing in…';
    try{
      const r = await fetch(cfg.adminAuthEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase })
      });
      const data = await r.json();
      if (data && data.token){
        token = data.token;
        loginForm.classList.add('d-none');
        adminUI.classList.remove('d-none');
        loadProducts();
      } else {
        loginStatus.textContent = 'Invalid passphrase';
      }
    }catch(e){
      console.error(e);
      loginStatus.textContent = 'Auth server not reachable. Configure adminAuthEndpoint in config.json';
    }
  });

  async function loadProducts(){
    const r = await fetch(cfg.apiBase + '/products', {
      headers: { 'Authorization': token ? ('Bearer ' + token) : '' }
    });
    const data = await r.json();
    renderProducts(data.products || []);
  }

  function renderProducts(products){
    const tbl = document.getElementById('products-table');
    if (!products.length){ tbl.innerHTML = '<p class="text-muted">No products yet.</p>'; return; }
    const rows = products.map(p=>`<tr><td>${p.id}</td><td>${p.name}</td><td>R ${Number(p.price).toFixed(2)}</td></tr>`).join('');
    tbl.innerHTML = `<table class="table table-sm"><thead><tr><th>ID</th><th>Name</th><th>Price</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  const form = document.getElementById('product-form');
  const status = document.getElementById('product-status');
  form.addEventListener('submit', async (ev)=>{
    ev.preventDefault();
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());
    status.textContent = 'Saving…';
    try{
      const r = await fetch(cfg.apiBase + '/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token ? ('Bearer ' + token) : '' },
        body: JSON.stringify(payload)
      });
      if (r.ok){ status.textContent = 'Saved'; loadProducts(); }
      else { status.textContent = 'Save failed'; }
    }catch(e){ status.textContent = 'API not reachable'; }
  });

  document.getElementById('delete-btn').addEventListener('click', async ()=>{
    const id = form.querySelector('[name=id]').value;
    if (!id) return;
    status.textContent = 'Deleting…';
    try{
      const r = await fetch(cfg.apiBase + '/products?id=' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: { 'Authorization': token ? ('Bearer ' + token) : '' }
      });
      if (r.ok){ status.textContent = 'Deleted'; loadProducts(); }
      else { status.textContent = 'Delete failed'; }
    }catch(e){ status.textContent = 'API not reachable'; }
  });
})();
