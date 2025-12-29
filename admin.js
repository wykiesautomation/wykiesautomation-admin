
(async () => {
  const cfg = await (await fetch('../core/config.json')).json();
  const base = cfg.cms.apps_script_base;
  let idToken = null;

  function allow(email) {
    return cfg.security.google_allowlist.includes(email.toLowerCase());
  }

  // Google Sign-In button
  window.onload = () => {
    google.accounts.id.initialize({
      client_id: 'YOUR_GOOGLE_CLIENT_ID',
      callback: async (resp) => {
        idToken = resp.credential; // verify server-side in Worker
        const payload = JSON.parse(atob(resp.credential.split('.')[1]));
        const email = payload.email;
        if (!allow(email)) { alert('Access denied'); return; }
        document.getElementById('signin').style.display='none';
        document.getElementById('dash').style.display='block';
        loadProducts(); loadPayments(); loadPromos(); loadSettings();
      }
    });
    google.accounts.id.renderButton(document.getElementById('signin'), { theme: 'outline', size: 'large' });
  };

  function authHeaders() { return { 'Content-Type':'application/json', 'X-ID-TOKEN': idToken }; }

  function showTab(name) {
    for (const el of document.querySelectorAll('.tab')) el.style.display='none';
    document.getElementById('tab-' + name).style.display = 'block';
  }

  async function loadProducts(){
    const res = await fetch(`${base}?route=products`);
    const list = await res.json();
    const t = document.getElementById('tab-products');
    t.innerHTML = '<h3>Products</h3>' + list.map(p=>`<div class="card"><strong>${p.id}</strong> — ${p.name} — R${p.price} <button class="btn" onclick="editProduct('${p.id}')">Edit</button></div>`).join('');
  }

  window.editProduct = async (id) => {
    const name = prompt('Name:');
    const price = prompt('Price:');
    const image = prompt('Image URL:');
    const payload = { route:'products', op:'update', id, name, price, image };
    const res = await fetch(base, { method:'POST', headers: authHeaders(), body: JSON.stringify(payload) });
    alert(await res.text());
    loadProducts();
  };

  async function loadPayments(){
    const res = await fetch(`${base}?route=payments`, { headers: authHeaders() });
    const list = await res.json();
    const t = document.getElementById('tab-payments');
    t.innerHTML = '<h3>Payments</h3>' + list.map(pm=>`<div class="card">${pm.invoice} — ${pm.status} — R${pm.amount} <button class="btn" onclick="resend('${pm.invoice}')">Resend Invoice</button></div>`).join('');
  }

  window.resend = async (invoice) => {
    const res = await fetch('/admin/resend-invoice', { method:'POST', headers: authHeaders(), body: JSON.stringify({ invoice }) });
    alert(await res.text());
  };

  async function loadPromos(){
    const res = await fetch(`${base}?route=promos`, { headers: authHeaders() });
    const list = await res.json();
    const t = document.getElementById('tab-promos');
    t.innerHTML = '<h3>Promo Codes</h3>' + list.map(pr=>`<div class="card">${pr.code} — ${pr.percent}% <button class="btn" onclick="delPromo('${pr.code}')">Delete</button></div>`).join('') + '<div style="margin-top:8px"><button class="btn" onclick="addPromo()">Add Promo</button></div>';
  }
  window.addPromo = async () => {
    const code = prompt('Code:');
    const percent = prompt('Discount %:');
    const res = await fetch(base, { method:'POST', headers: authHeaders(), body: JSON.stringify({ route:'promos', op:'add', code, percent }) });
    alert(await res.text());
    loadPromos();
  };
  window.delPromo = async (code) => {
    const res = await fetch(base, { method:'POST', headers: authHeaders(), body: JSON.stringify({ route:'promos', op:'delete', code }) });
    alert(await res.text());
    loadPromos();
  };

  function loadSettings(){
    document.getElementById('tab-settings').innerHTML = '<h3>Settings</h3><p>Cache bust, themes, allowlist.</p><button class="btn" onclick="cmsBump()">CMS Cache Bust</button>';
  }
  window.cmsBump = async () => {
    const res = await fetch('/admin/cms-bump', { method:'POST', headers: authHeaders(), body: JSON.stringify({}) });
    alert(await res.text());
  };
})();
