
(async () => {
  const res = await fetch('/config.json');
  const CFG = await res.json();
  let TOKEN = null;

  const loginForm = document.getElementById('loginForm');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(loginForm).entries());
    const r = await fetch(CFG.cms.appsScriptBase + CFG.cms.endpoints.login, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    if (r.ok) {
      const data = await r.json();
      TOKEN = data.token;
      document.getElementById('loginStatus').textContent = 'Signed in';
      document.getElementById('login').classList.add('hidden');
      document.getElementById('products').classList.remove('hidden');
      loadProducts();
    } else {
      document.getElementById('loginStatus').textContent = 'Login failed';
    }
  });

  async function loadProducts() {
    const r = await fetch(CFG.cms.appsScriptBase + CFG.cms.endpoints.products, { headers: { 'Authorization': 'Bearer ' + TOKEN }});
    const data = await r.json();
    const items = data.products || [];
    const table = document.getElementById('productTable');
    table.innerHTML = '<tr><th>SKU</th><th>Name</th><th>Price</th><th>Active</th></tr>' + items.map(p => `<tr><td>${p.sku}</td><td>${p.name}</td><td>R ${Number(p.price).toFixed(2)}</td><td>${p.active}</td></tr>`).join('');
  }

  const productForm = document.getElementById('productForm');
  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(productForm).entries());
    body.active = !!body.active;
    const r = await fetch(CFG.cms.appsScriptBase + CFG.cms.endpoints.products, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN }, body: JSON.stringify(body)
    });
    if (r.ok) { productForm.reset(); loadProducts(); }
  });
})();
