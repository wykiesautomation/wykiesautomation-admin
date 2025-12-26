
// Admin config (client-safe)
const CFG = {
  environment: 'prod',
  sheetId: '12qRMe6pAPVaQtosZBnhVtpMwyNks7W8uY9PX1mF620k',
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycbynudewxl8FUOILFPOva_fKpYtZDugzSQRNPASt0G1xix4HZ0jiAjZc3a45KaHpZG5g/exec',
  adminAllowedEmails: ['wykiesautomation@gmail.com'],
};

// Tabs
const tabBtns = document.querySelectorAll('.tabs button[data-tab]');
const tabs = document.querySelectorAll('.tab');

tabBtns.forEach(b=>b.addEventListener('click',()=>{
  tabBtns.forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  const id = b.dataset.tab;
  tabs.forEach(s=>s.classList.toggle('active', s.id===id));
}));

document.getElementById('sheetId').textContent = CFG.sheetId;

// Toast helper
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.hidden = false; setTimeout(()=>t.hidden=true, 2200);
}

// --- Demo data (until Apps Script wired) ---
const demoProducts = [
  {sku:'WA-01', name:'3D Printer Control V1', price:1499, summary:'Compact controller UI', active:true, imageUrl:'../assets/img/logo-blue.png'},
  {sku:'WA-02', name:'Plasma Cutter Control V1', price:2499, summary:'CNC plasma UI', active:true, imageUrl:'../assets/img/logo-blue.png'},
  {sku:'WA-07', name:'Hybrid Gate Controller V1', price:1800, summary:'Wi‑Fi/GSM hybrid gate', active:true, imageUrl:'../assets/img/logo-blue.png'},
];

const demoPayments = [
  {ts:'2025-12-24 10:00', inv:'INV-2025-00001', oid:'ORD-abc123', pf:'1234567', email:'buyer@example.com', sku:'WA-01', total:'1499.00', rel:'2025-12-24 10:02'},
  {ts:'2025-12-25 09:11', inv:'INV-2025-00002', oid:'ORD-xyz999', pf:'1234568', email:'client@example.com', sku:'WA-02', total:'2499.00', rel:'2025-12-25 09:12'},
];

const demoLogs = [
  {ts:'2025-12-26 09:00', sku:'WA-01', old:1499, newP:1599, by:'admin', ip:'203.0.113.10'},
  {ts:'2025-12-26 09:10', sku:'WA-02', old:2499, newP:2599, by:'admin', ip:'203.0.113.10'},
];

// --- Products grid ---
const tbodyP = document.querySelector('#tblProducts tbody');
function rowHtml(p){
  return `<tr>
    <td><input value="${p.sku}" data-k="sku"/></td>
    <td><input value="${p.name}" data-k="name"/></td>
    <td><input type="number" step="0.01" value="${p.price}" data-k="price"/></td>
    <td><input value="${p.summary}" data-k="summary"/></td>
    <td><input type="checkbox" ${p.active?'checked':''} data-k="active"/></td>
    <td><input value="${p.imageUrl}" data-k="imageUrl"/></td>
    <td>
      <button class="secondary actSave">Save Row</button>
      <button class="secondary actDel">Delete</button>
    </td>
  </tr>`;
}
function renderProducts(){
  tbodyP.innerHTML = demoProducts.map(rowHtml).join('');
}
renderProducts();

tbodyP.addEventListener('click', (e)=>{
  const tr = e.target.closest('tr');
  if(!tr) return;
  const idx = [...tbodyP.children].indexOf(tr);
  if(e.target.classList.contains('actSave')){
    const inputs = tr.querySelectorAll('input');
    inputs.forEach(inp=>{
      const k = inp.dataset.k; if(!k) return;
      demoProducts[idx][k] = inp.type==='checkbox'? inp.checked : inp.value;
    });
    toast('Saved (local) – wire to Apps Script to persist.');
  }
  if(e.target.classList.contains('actDel')){
    demoProducts.splice(idx,1); renderProducts(); toast('Deleted (local)');
  }
});

document.getElementById('btnAddProduct').addEventListener('click',()=>{
  demoProducts.push({sku:'WA-XX', name:'New Product', price:0, summary:'', active:false, imageUrl:''});
  renderProducts();
});

// --- Gallery ---
const grid = document.getElementById('galleryGrid');
let gallery = demoProducts.map((p,i)=>({url:p.imageUrl, caption:p.sku+" — "+p.name, idx:i}));
function renderGallery(){
  grid.innerHTML = gallery.sort((a,b)=>a.idx-b.idx).map(g=>`<div class='card' draggable='true' data-idx='${g.idx}'>
    <img src='${g.url}' alt='${g.caption}'/>
    <div class='row'><span>${g.caption}</span> <span class='badge'>#${g.idx}</span></div>
  </div>`).join('');
}
renderGallery();

let dragSrc=null;
grid.addEventListener('dragstart',e=>{dragSrc=e.target.closest('.card')});
grid.addEventListener('dragover',e=>e.preventDefault());
grid.addEventListener('drop',e=>{
  const target=e.target.closest('.card'); if(!dragSrc||!target) return;
  const a=parseInt(dragSrc.dataset.idx), b=parseInt(target.dataset.idx);
  gallery.forEach(g=>{ if(g.idx===a) g.idx=b; else if(g.idx===b) g.idx=a;});
  renderGallery(); toast('Order saved (local)');
});

document.getElementById('btnUpload').addEventListener('click',()=>{
  const f = document.getElementById('file').files[0];
  const c = document.getElementById('caption').value;
  if(!f){ toast('Choose a PNG/WebP file'); return; }
  if(!/png|webp$/i.test(f.name)){ toast('PNG/WebP only'); return; }
  const url = URL.createObjectURL(f);
  gallery.push({url, caption:c||f.name, idx:gallery.length});
  renderGallery(); toast('Uploaded (local) – wire to Apps Script to persist.');
});

// --- Payments ---
const tbodyPay = document.querySelector('#tblPayments tbody');
function renderPayments(list=demoPayments){
  tbodyPay.innerHTML = list.map(p=>`<tr>
    <td>${p.ts}</td><td>${p.inv}</td><td>${p.oid}</td><td>${p.pf}</td>
    <td>${p.email}</td><td>${p.sku}</td><td>R${p.total}</td><td>${p.rel}</td>
    <td><button class='secondary resend' title='Resend invoice (ITN verified only)'>Resend</button></td>
  </tr>`).join('');
}
renderPayments();

document.getElementById('searchPay').addEventListener('input', e=>{
  const q = e.target.value.toLowerCase();
  renderPayments(demoPayments.filter(p=>(`${p.inv}${p.email}${p.sku}`).toLowerCase().includes(q)));
});

tbodyPay.addEventListener('click', e=>{
  if(e.target.classList.contains('resend')){
    toast('Resend queued (stub) – connect to Apps Script endpoint /resendInvoice');
  }
});

// --- Logs ---
const logViewer = document.getElementById('logViewer');
function renderLogs(){
  logViewer.textContent = demoLogs.map(l=>`${l.ts}\t${l.sku}\t${l.old} -> ${l.newP}\t${l.by}\t${l.ip}`).join('\n');
}
renderLogs();

document.getElementById('btnExport').addEventListener('click',()=>{
  const rows = 'Timestamp,SKU,OldPrice,NewPrice,ChangedBy,SourceIP\n' + demoLogs.map(l=>`${l.ts},${l.sku},${l.old},${l.newP},${l.by},${l.ip}`).join('\n');
  const blob = new Blob([rows], {type:'text/csv'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'logs.csv'; a.click();
});

// Global refresh
 document.getElementById('btnRefresh').addEventListener('click',()=>{ renderProducts(); renderGallery(); renderPayments(); renderLogs(); toast('Refreshed'); });
