/* Admin SPA JS */
const qs = sel => document.querySelector(sel);
const qsa = sel => Array.from(document.querySelectorAll(sel));

const state = {
  role: 'Viewer',
  offline: true,
  buildId: 'WA-WEB-20260102-165645',
};

// Tabs
qsa('.nav-btn').forEach(btn => btn.addEventListener('click', () => {
  qsa('.nav-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  qsa('.tab').forEach(p=>p.classList.remove('active'));
  qs('#'+btn.dataset.tab).classList.add('active');
}));

function setStatus(text){ qs('#statusBar').textContent = text; }
function setRole(role){ state.role = role; qs('#roleBadge').textContent = role; }

async function boot(){
  qs('#buildId').textContent = state.buildId;
  setStatus('Loading build…');
  try {
    if (window.CONFIG) {
      state.offline = !!window.CONFIG.OFFLINE_DEMO;
    }
  } catch(e){}

  if (state.offline) {
    setRole('Admin');
    setStatus('OFFLINE DEMO mode');
    loadMock();
  } else {
    setStatus('Connecting to CMS…');
    await refreshAll();
  }
}

function loadMock(){
  const products = [
    {id:'WA-01', title:'ESP32 Gate Opener (Wi‑Fi/BLE)', price:1499, status:'Enabled'},
    {id:'WA-02', title:'GSM Gate Opener (Nano)', price:2499, status:'Enabled'},
    {id:'WA-03', title:'Hybrid Gate Controller', price:6499, status:'Draft'}
  ];
  renderProducts(products);
  qs('#statProducts').textContent = String(products.length);
  qs('#statPayments').textContent = '0';
  qs('#statGallery').textContent = '0';
  qs('#logView').textContent = '[DEMO] No logs yet';
}

async function refreshAll(){
  const [products, payments] = await Promise.all([
    api('/products'),
    api('/payments')
  ]);
  renderProducts(products.data || []);
  qs('#statProducts').textContent = String((products.data||[]).length);
  qs('#statPayments').textContent = String((payments.data||[]).filter(p=>p.date && new Date(p.date).toDateString()===new Date().toDateString()).length);
}

function renderProducts(rows){
  const tb = qs('#gridProducts tbody');
  tb.innerHTML = '';
  rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.id}</td><td>${r.title}</td><td>R ${Number(r.price).toLocaleString()}</td><td>${r.status||'Enabled'}</td><td><button class="ghost">Edit</button></td>`;
    tb.appendChild(tr);
  });
}

async function api(path, opts={}){
  const base = (window.CONFIG && window.CONFIG.API_BASE) || '/api';
  const url = base + path;
  const res = await fetch(url, {
    method: opts.method||'GET',
    headers: Object.assign({'Content-Type':'application/json'}, opts.headers||{}),
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: 'omit'
  });
  if (!res.ok) throw new Error('API '+res.status);
  return await res.json();
}

window.addEventListener('load', boot);
