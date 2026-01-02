
const API = (path, init={}) => fetch(`/api?path=${encodeURIComponent(path)}`, {
  ...init,
  headers: { 'content-type': 'application/json', ...(init.headers||{}) }
}).then(r => r.json()).catch(() => ({ ok:false, error:'Network error' }));

// Tabs
const tabs = document.querySelectorAll('.tab');
const btns = document.querySelectorAll('.tab-btn');
btns.forEach(b => b.addEventListener('click', () => {
  btns.forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  tabs.forEach(t => t.classList.remove('active'));
  document.getElementById(b.dataset.tab).classList.add('active');
}));

let ROLE = 'Viewer';

async function signIn(){
  // Passphrase fallback (spec v1.0) — replace with GIS in production
  const pass = prompt('Enter admin passphrase:');
  const out = await API('google-auth', { method:'POST', body: JSON.stringify({ passphrase: pass }) });
  ROLE = out.ok && out.data && out.data.role ? out.data.role : 'Viewer';
  document.getElementById('role').textContent = ROLE;
  document.getElementById('cms-status').textContent = out.ok ? 'Connected' : 'Disconnected';
  log(out.ok ? 'Signed in' : 'Sign-in failed');
}

document.getElementById('signin').addEventListener('click', signIn);

// Overview stats
async function renderOverview(){
  const products = await API('products');
  const payments = await API('payments');
  document.getElementById('stat-products').textContent = products.ok ? products.data.length : 0;
  document.getElementById('stat-payments').textContent = payments.ok ? payments.data.filter(x=>x.status==='Verified').length : 0;
  document.getElementById('stat-gallery').textContent = 0;
  document.getElementById('stat-errors').textContent = 0;
}

// Products CRUD
let PRODUCTS = [];
async function renderProducts(){
  const resp = await API('products');
  PRODUCTS = resp.ok ? resp.data : [];
  const tbody = document.querySelector('#products-table tbody');
  tbody.innerHTML = '';
  PRODUCTS.forEach((p,i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.id}</td>
      <td contenteditable="true">${p.name}</td>
      <td contenteditable="true">${p.price}</td>
      <td><input type="checkbox" ${p.visible?'checked':''}></td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById('add-product').addEventListener('click', () => {
  PRODUCTS.push({ id:'NEW', name:'New Product', price:0, visible:true });
  renderProducts();
});

document.getElementById('save-products').addEventListener('click', async () => {
  if(ROLE!=="Admin") return alert('Read-only (Viewer)');
  // Collect table edits
  const rows = [...document.querySelectorAll('#products-table tbody tr')];
  const updated = rows.map(r => {
    const id = r.children[0].textContent.trim();
    const name = r.children[1].textContent.trim();
    const price = Number(r.children[2].textContent.trim());
    const visible = r.children[3].querySelector('input').checked;
    return { id, name, price, visible };
  });
  const out = await API('products', { method:'POST', body: JSON.stringify({ items: updated }) });
  log(out.ok? 'Products saved' : 'Save failed');
  if(out.ok) renderProducts();
});

// Gallery upload (≤ 200KB per image)
const uploader = document.getElementById('gallery-upload');
uploader.addEventListener('change', async (e) => {
  if(ROLE!=="Admin") return alert('Read-only (Viewer)');
  const files = [...e.target.files].slice(0,10);
  for(const f of files){
    if(f.size>200*1024){ log(`Skip ${f.name}: >200KB`); continue; }
    const b64 = await toBase64(f);
    const out = await API('gallery/upload', { method:'POST', body: JSON.stringify({ name:f.name, data:b64 }) });
    log(out.ok? `Uploaded ${f.name}`: `Upload failed for ${f.name}`);
  }
});
function toBase64(file){ return new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=rej; fr.readAsDataURL(file); }); }

// Payments + Resend Invoice
async function renderPayments(){
  const tbody = document.querySelector('#payments-table tbody');
  const resp = await API('payments');
  const list = resp.ok ? resp.data : [];
  tbody.innerHTML = '';
  list.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.order}</td><td>R ${p.amount}</td><td>${p.status}</td>
      <td><button class="btn" data-order="${p.order}">Resend Invoice</button></td>
    `;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('button[data-order]').forEach(btn => btn.addEventListener('click', async () => {
    if(ROLE!=="Admin") return alert('Read-only (Viewer)');
    const orderId = btn.getAttribute('data-order');
    const out = await API(`payments/${orderId}/resend-invoice`, { method:'POST' });
    log(out.ok? `Invoice resent for ${orderId}` : `Resend failed for ${orderId}`);
  }));
}

// Price Log read-only
async function renderPriceLog(){
  const tbody = document.querySelector('#pl-table tbody');
  const resp = await API('price-log');
  const list = resp.ok ? resp.data : [];
  tbody.innerHTML = '';
  list.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.date}</td><td>${r.product}</td><td>R ${r.old}</td><td>R ${r.new}</td><td>${r.note||''}</td>`;
    tbody.appendChild(tr);
  });
}

function log(msg){
  const pre = document.getElementById('logs-pre');
  const time = new Date().toISOString();
  pre.textContent += `
[${time}] ${msg}`;
}

renderOverview();
renderProducts();
renderPayments();
renderPriceLog();
