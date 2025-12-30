
const CONFIG_URL = '../config.json';
let CONFIG = null; let ADMIN_TOKEN = '';
async function loadConfig(){ const r=await fetch(CONFIG_URL); CONFIG = await r.json(); }
function auth(){ ADMIN_TOKEN = localStorage.getItem('ADMIN_TOKEN') || ''; if(!ADMIN_TOKEN){ const t = prompt((CONFIG.admin&&CONFIG.admin.prompt_text)||'Enter Passphrase'); if(t){ ADMIN_TOKEN=t; localStorage.setItem('ADMIN_TOKEN', t); } } }
function switchTab(name){ document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active')); document.getElementById('tab-'+name).classList.add('active'); }
function btn(txt, cls='btn'){ const b=document.createElement('button'); b.className=cls; b.textContent=txt; return b; }
async function apiGet(action){ const url=(CONFIG.cms?.apps_script_base_url||'')+`?action=${action}`; const r = await fetch(url,{headers:{'x-admin-token':ADMIN_TOKEN}}); return r.json(); }
async function apiPost(action, payload){ const url=(CONFIG.cms?.apps_script_base_url||'')+`?action=${action}`; const r = await fetch(url,{method:'POST',headers:{'content-type':'application/json','x-admin-token':ADMIN_TOKEN}, body: JSON.stringify(payload||{})}); return r.json(); }

// PRODUCTS
async function renderProductsTab(){
  const el = document.getElementById('tab-products');
  el.innerHTML = '<h2>Products</h2><div style="margin-bottom:0.5rem"><button id="addProd" class="btn">Add Product</button></div><div id="prodWrap"></div>';
  const {items=[]} = await apiGet('listProducts');
  const wrap = document.getElementById('prodWrap');
  const table = document.createElement('table'); table.className='table';
  table.innerHTML = '<thead><tr><th>SKU</th><th>Name</th><th>Price (incl VAT)</th><th>Summary</th><th>Image URL</th><th>Trial URL</th><th>Docs URL</th><th>Active</th><th></th></tr></thead><tbody></tbody>';
  const body = table.querySelector('tbody');
  function addRow(p){ const tr=document.createElement('tr'); tr.innerHTML = `
    <td><input class="input" value="${p.sku||''}"></td>
    <td><input class="input" value="${p.name||''}"></td>
    <td><input class="input" type="number" value="${p.price||0}"></td>
    <td><input class="input" value="${p.summary||''}"></td>
    <td><input class="input" value="${p.imageUrl||''}"></td>
    <td><input class="input" value="${p.trialUrl||''}"></td>
    <td><input class="input" value="${p.docUrl||''}"></td>
    <td><input type="checkbox" ${p.active?'checked':''}></td>
    <td></td>`;
    const save = btn('Save','btn primary'); save.onclick = async ()=>{
      const payload = {
        sku: tr.children[0].children[0].value,
        name: tr.children[1].children[0].value,
        price: Number(tr.children[2].children[0].value||0),
        summary: tr.children[3].children[0].value,
        imageUrl: tr.children[4].children[0].value,
        trialUrl: tr.children[5].children[0].value,
        docUrl: tr.children[6].children[0].value,
        active: tr.children[7].children[0].checked
      };
      const res = await apiPost('saveProduct', payload);
      alert(res.ok?'Saved':'Failed');
    };
    tr.children[8].appendChild(save);
    body.appendChild(tr);
  }
  items.forEach(addRow);
  document.getElementById('addProd').onclick = ()=> addRow({sku:'',name:'',price:0,summary:'',imageUrl:'',trialUrl:'',docUrl:'',active:true});
  wrap.appendChild(table);
}

// GALLERY
async function renderGalleryTab(){
  const el = document.getElementById('tab-gallery');
  el.innerHTML = `<h2>Gallery</h2><div id="uploader"></div><div id="galleryGrid" class="grid gallery"></div>`;
  const upl = document.getElementById('uploader');
  upl.innerHTML = `
    <div id="dropZone" class="dropzone">
      <input type="file" id="fileInput" accept="image/png,image/webp" multiple hidden />
      <div class="dz-inner">
        <button id="chooseBtn" class="btn">Choose files</button>
        <p>…or drop files here</p>
        <label>Caption <input id="caption" class="input" maxlength="120" placeholder="Optional caption"/></label>
      </div>
    </div>
    <div id="uploadList" class="upload-list"></div>`;
  const dz = document.getElementById('dropZone'); const fi=document.getElementById('fileInput'); document.getElementById('chooseBtn').addEventListener('click',()=>fi.click());
  const types = (CONFIG.uploads?.allowed_types)||['image/png','image/webp']; const maxKB = CONFIG.uploads?.max_size_kb||200;
  dz.addEventListener('dragover', e=>{e.preventDefault(); dz.classList.add('drag');});
  dz.addEventListener('dragleave', ()=> dz.classList.remove('drag'));
  dz.addEventListener('drop', e=>{ e.preventDefault(); dz.classList.remove('drag'); handleFiles(e.dataTransfer.files, types, maxKB); });
  fi.addEventListener('change', e=> handleFiles(e.target.files, types, maxKB));
  await refreshGalleryList();
}
async function refreshGalleryList(){
  const grid = document.getElementById('galleryGrid'); if(!grid) return;
  const {items=[]} = await apiGet('listGallery');
  grid.innerHTML = '';
  items.sort((a,b)=> (a.order||0)-(b.order||0)).forEach(it=>{
    const card = document.createElement('div'); card.className='card';
    card.innerHTML = `
<img src="${it.url}" alt="${it.caption||''}"/>
<div class="body"><p>${it.caption||''}</p>
<div style="display:flex;gap:0.5rem">
<button class="btn" data-act="up">↑</button>
<button class="btn" data-act="down">↓</button>
<button class="btn" data-act="del">Delete</button>
</div></div>`;
    card.querySelector('[data-act="up"]').onclick = ()=> reorder(it.url, -1);
    card.querySelector('[data-act="down"]').onclick = ()=> reorder(it.url, +1);
    card.querySelector('[data-act="del"]').onclick = async ()=>{ if(confirm('Delete image?')){ await apiPost('deleteGalleryImage',{url:it.url}); await refreshGalleryList(); } };
    grid.appendChild(card);
  });
}
async function reorder(url, delta){ await apiPost('reorderGallery',{url, delta}); await refreshGalleryList(); }
async function handleFiles(files, types, maxKB){
  const list = document.getElementById('uploadList'); const caption = document.getElementById('caption').value||'';
  for(const file of files){
    const row = document.createElement('div'); row.className='row'; row.innerHTML = `<span>${file.name}</span><span>${Math.round(file.size/1024)}KB</span><span>${file.type}</span><span class="status">validating…</span>`; list.appendChild(row);
    if(!types.includes(file.type)){ row.querySelector('.status').textContent='❌ type'; continue; }
    if(Math.round(file.size/1024) > maxKB){ row.querySelector('.status').textContent='❌ too large'; continue; }
    const dataUrl = await new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=rej; fr.readAsDataURL(file); });
    row.querySelector('.status').textContent='uploading…';
    const url = (CONFIG.api?.worker_base_url||'').replace(/\/$/,'') + '/upload';
    const r = await fetch(url,{method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({filename:file.name, mime:file.type, size:file.size, caption, dataUrl})});
    const out = await r.json().catch(()=>({ok:false}));
    row.querySelector('.status').textContent = out.ok?'✅ uploaded':'❌ failed';
  }
  await refreshGalleryList();
}

// PAYMENTS
async function renderPaymentsTab(){
  const el = document.getElementById('tab-payments');
  el.innerHTML = '<h2>Payments</h2><div id="payWrap"></div>';
  const {items=[]} = await apiGet('listPayments');
  const wrap = document.getElementById('payWrap');
  const table = document.createElement('table'); table.className='table';
  table.innerHTML = '<thead><tr><th>Timestamp</th><th>Invoice</th><th>OrderID</th><th>pf_payment_id</th><th>Email</th><th>SKU</th><th>Total</th><th></th></tr></thead><tbody></tbody>';
  const body = table.querySelector('tbody');
  items.forEach(x=>{ const tr=document.createElement('tr'); tr.innerHTML = `
    <td>${x.Timestamp||''}</td><td>${x.InvoiceNo||''}</td><td>${x.OrderID||''}</td><td>${x.pf_payment_id||''}</td><td>${x.Email||''}</td><td>${x.SKU||''}</td><td>${x.TotalInclVAT||''}</td><td></td>`;
    const b = btn('Resend Invoice'); b.onclick = async ()=>{ const r = await apiPost('resendInvoice',{invoiceNo:x.InvoiceNo, email:x.Email}); alert(r.ok?'Sent':'Failed'); };
    tr.children[7].appendChild(b); body.appendChild(tr); });
  wrap.appendChild(table);
}

// LOGS
async function renderLogsTab(){
  const el = document.getElementById('tab-logs'); el.innerHTML = '<h2>Price Change Log</h2><div id="logWrap"></div>';
  const {items=[]} = await apiGet('listPriceChanges');
  const wrap=document.getElementById('logWrap'); const table=document.createElement('table'); table.className='table';
  table.innerHTML = '<thead><tr><th>Timestamp</th><th>SKU</th><th>Old</th><th>New</th><th>ChangedBy</th><th>SourceIP</th></tr></thead><tbody></tbody>';
  const body=table.querySelector('tbody'); items.forEach(r=>{ const tr=document.createElement('tr'); tr.innerHTML = `<td>${r.Timestamp}</td><td>${r.SKU}</td><td>${r.OldPrice}</td><td>${r.NewPrice}</td><td>${r.ChangedBy}</td><td>${r.SourceIP}</td>`; body.appendChild(tr); });
  wrap.appendChild(table);
}

// BOOTSTRAP
document.addEventListener('DOMContentLoaded', async ()=>{
  await loadConfig(); auth();
  document.querySelectorAll('.tabs button').forEach(btn=> btn.addEventListener('click',()=>{ switchTab(btn.dataset.tab); const map={products:renderProductsTab, gallery:renderGalleryTab, payments:renderPaymentsTab, logs:renderLogsTab}; map[btn.dataset.tab](); }));
  switchTab('products'); renderProductsTab();
});
