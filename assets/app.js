/* Admin UI logic (mocked data + API stubs)
 * - Populates dashboard counters
 * - Renders Products, Gallery, Payments, Logs
 * - Provides Add/Edit Product modal
 * - Resend Invoice (stub -> Apps Script)
 * - Drag-and-drop gallery reorder (basic)
 */

// ---- Navigation ----
const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item');
navItems.forEach(item => item.addEventListener('click', e => {
  e.preventDefault();
  navItems.forEach(n => n.classList.remove('active'));
  item.classList.add('active');
  const id = item.getAttribute('href').substring(1);
  views.forEach(v => v.classList.toggle('active', v.id === id));
}));

// ---- Mock Data (replace via API) ----
const products = [
  { sku: 'WA-01', name: '3D Printer Control V1', price: 1499.00, image: 'wa-01.png', active: true },
  { sku: 'WA-02', name: 'Hybrid Gate Opener (ESP32)', price: 2499.00, image: 'wa-02.png', active: true },
  { sku: 'WA-03', name: 'Plasma Cutter GUI License', price: 6499.00, image: 'wa-03.png', active: false },
];

const gallery = [
  { id: 1, label: 'Controller Board' },
  { id: 2, label: 'Gate Opener' },
  { id: 3, label: 'Plasma Cutter GUI' },
  { id: 4, label: 'Alarm System' },
];

const payments = [
  { ts: '2025-12-24 10:00', invoice: 'INV-2025-0001', amount: 1499.00, email: 'buyer@example.com', sku: 'WA-01' },
  { ts: '2025-12-24 12:35', invoice: 'INV-2025-0002', amount: 999.00, email: 'another@example.com', sku: 'WA-09' },
];

const priceLog = [
  { ts: '2025-12-23 14:45', sku: 'WA-01', oldPrice: 1299.00, newPrice: 1499.00, by: 'admin', ip: '192.168.0.2' },
];

const sysLogs = [
  { ts: '2025-12-24 09:12', type: 'INFO', msg: 'Apps Script connected' },
  { ts: '2025-12-24 09:18', type: 'INFO', msg: 'PayFast ITN verified' },
];

// ---- Rendering ----
function formatR(value){return 'R' + value.toFixed(2);}
function maskEmail(email){const i = email.indexOf('@'); if(i<2) return email; return email[0] + '***' + email.substring(i-1);} 

function renderKPIs(){
  document.getElementById('kpiProducts').textContent = products.length;
  const today = new Date().toISOString().slice(0,10);
  const countToday = payments.filter(p => p.ts.startsWith(today)).length;
  document.getElementById('kpiPaymentsToday').textContent = countToday;
  document.getElementById('kpiGallery').textContent = gallery.length;
  document.getElementById('kpiErrors').textContent = sysLogs.filter(l => l.type==='ERROR').length;
}

function bindProducts(tableId){
  const tbody = document.querySelector(`#${tableId} tbody`);
  tbody.innerHTML = '';
  products.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.sku}</td>
      <td>${p.name}</td>
      <td>${formatR(p.price)}</td>
      <td>${p.image}</td>
      <td>${p.active ? '✓' : ''}</td>
      <td>
        <button class="btn btn-ghost" onclick="editProduct('${p.sku}')">Edit</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

function bindGallery(gridId){
  const grid = document.getElementById(gridId);
  grid.innerHTML = '';
  gallery.forEach(g => {
    const item = document.createElement('div');
    item.className = 'item';
    item.textContent = g.label;
    item.draggable = true;
    item.dataset.id = g.id;
    item.addEventListener('dragstart', dragStart);
    item.addEventListener('dragover', dragOver);
    item.addEventListener('drop', dropItem);
    grid.appendChild(item);
  });
}
let dragId=null;
function dragStart(e){dragId = e.target.dataset.id;}
function dragOver(e){e.preventDefault();}
function dropItem(e){
  e.preventDefault();
  const targetId = e.target.dataset.id;
  if(!dragId || !targetId || dragId===targetId) return;
  const from = gallery.findIndex(g=>g.id==dragId);
  const to = gallery.findIndex(g=>g.id==targetId);
  const [moved] = gallery.splice(from,1);
  gallery.splice(to,0,moved);
  bindGallery(e.target.parentElement.id);
  console.log('Reordered gallery ->', gallery.map(g=>g.id));
}

function bindPayments(tableId){
  const tbody = document.querySelector(`#${tableId} tbody`);
  tbody.innerHTML = '';
  payments.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.ts}</td>
      <td>${p.invoice}</td>
      <td>${formatR(p.amount)}</td>
      <td>${maskEmail(p.email)}</td>
      <td>${p.sku}</td>
      <td><button class="btn btn-ghost" onclick="resendInvoice('${p.invoice}')">Resend Invoice</button></td>`;
    tbody.appendChild(tr);
  });
}

function bindPriceLog(){
  const tbody = document.querySelector('#priceLogTable tbody');
  tbody.innerHTML = '';
  priceLog.forEach(l => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${l.ts}</td>
      <td>${l.sku}</td>
      <td>${formatR(l.oldPrice)}</td>
      <td class="badge ok">${formatR(l.newPrice)}</td>
      <td>${l.by}</td>
      <td>${l.ip}</td>`;
    tbody.appendChild(tr);
  });
}

function bindSysLogs(){
  const tbody = document.querySelector('#logsTable tbody');
  tbody.innerHTML = '';
  sysLogs.forEach(l => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${l.ts}</td>
      <td>${l.type}</td>
      <td>${l.msg}</td>`;
    tbody.appendChild(tr);
  });
}

// ---- Product Modal ----
const modal = document.getElementById('productModal');
const modalTitle = document.getElementById('modalTitle');
const skuInput = document.getElementById('skuInput');
const nameInput = document.getElementById('nameInput');
const priceInput = document.getElementById('priceInput');
const imageInput = document.getElementById('imageInput');
const activeInput = document.getElementById('activeInput');

function addProduct(){
  modalTitle.textContent = 'Add Product';
  skuInput.value = '';
  nameInput.value = '';
  priceInput.value = '';
  imageInput.value = '';
  activeInput.checked = true;
  modal.showModal();
}
function editProduct(sku){
  const p = products.find(x=>x.sku===sku);
  if(!p) return;
  modalTitle.textContent = 'Edit Product';
  skuInput.value = p.sku;
  nameInput.value = p.name;
  priceInput.value = p.price;
  imageInput.value = p.image;
  activeInput.checked = p.active;
  modal.showModal();
}

document.getElementById('addProductBtn').addEventListener('click', addProduct);
try{document.getElementById('addProductBtn2').addEventListener('click', addProduct);}catch{}

document.getElementById('saveProductBtn').addEventListener('click', ()=>{
  const existing = products.findIndex(x=>x.sku===skuInput.value);
  const data = { sku: skuInput.value, name: nameInput.value, price: parseFloat(priceInput.value||'0'), image: imageInput.value, active: activeInput.checked };
  if(existing>=0){
    const oldPrice = products[existing].price;
    products[existing] = data;
    priceLog.unshift({ ts: new Date().toISOString().replace('T',' ').slice(0,16), sku: data.sku, oldPrice, newPrice: data.price, by: 'admin', ip: 'client' });
  } else {
    products.unshift(data);
  }
  bindProducts('productsTable');
  bindProducts('productsTable2');
  bindPriceLog();
});

// ---- Search ----
function wireSearch(inputId, tableId){
  const input = document.getElementById(inputId);
  input.addEventListener('input', ()=>{
    const q = input.value.toLowerCase();
    const tbody = document.querySelector(`#${tableId} tbody`);
    tbody.querySelectorAll('tr').forEach(tr => {
      const text = tr.textContent.toLowerCase();
      tr.style.display = text.includes(q) ? '' : 'none';
    });
  });
}
wireSearch('productSearch','productsTable');
try{wireSearch('productSearch2','productsTable2');}catch{}

// ---- Payments: Resend Invoice (stub) ----
function resendInvoice(invoice){
  console.log('Resend Invoice ->', invoice);
  // Replace with call to Apps Script emailer
  // fetch(CONFIG.APPS_SCRIPT_URL + '?action=resend&invoice=' + encodeURIComponent(invoice))
  //   .then(r=>r.json()).then(console.log).catch(console.error);
  alert('Resend request queued for ' + invoice);
}
window.resendInvoice = resendInvoice; // expose

// ---- Gallery Upload (stub) ----
const uploadBtn = document.getElementById('uploadImagesBtn');
if(uploadBtn){
  uploadBtn.addEventListener('click', ()=>{
    const files = document.getElementById('galleryUpload').files;
    if(!files.length){alert('Select image(s)'); return;}
    alert(`${files.length} image(s) ready. Implement Apps Script upload here.`);
  });
}

// ---- Auth (placeholder) ----
const roleLabel = document.getElementById('roleLabel');
roleLabel.textContent = 'Role: Admin';

// ---- Init ----
function init(){
  renderKPIs();
  bindProducts('productsTable');
  bindProducts('productsTable2');
  bindGallery('galleryGrid');
  bindGallery('galleryGrid2');
  bindPayments('paymentsTable');
  bindPayments('paymentsTable2');
  bindPriceLog();
  bindSysLogs();
}
init();
