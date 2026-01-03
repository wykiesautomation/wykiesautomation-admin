// Wire all tabs to API via /api proxy
import { apiGet, apiPost } from './api.js';
import { setRole, renderGoogleButton } from './auth.js';
import { openProductDialog, openNewProductDialog } from './dialogs.js';
import { exportPriceLogCsv, setPriceLogCache } from './export.js';
import { loadAnalytics } from './analytics.js';

// --- Dashboard ---
async function loadDashboard(){
  const r = await apiGet('overview'); const s = r.data || { todaySales: 0, itn24: 0, queueHealth: 'OK' };
  document.getElementById('todaySales').textContent = 'R ' + (s.todaySales||0);
  document.getElementById('itn24').textContent = s.itn24||0;
  document.getElementById('qHealth').textContent = s.queueHealth||'OK';
}

// --- Catalog ---
export async function loadCatalog(){
  const tbody = document.querySelector('#tblCatalog tbody'); tbody.innerHTML='';
  const items = (await apiGet('products')).data || [];
  for (const p of items){
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${p.id}</td><td>${p.name}</td><td>R${p.price}</td><td>${(p.images||[]).length||0}</td><td>${p.status}</td>
      <td><button class="btn outline" data-role="Admin" data-id="${p.id}" data-action="edit" disabled>Edit</button>
      <button class="btn outline" data-role="Admin" data-id="${p.id}" data-action="toggle" disabled>${p.status==='visible'?'Hide':'Show'}</button></td>`;
    tbody.appendChild(tr);
  }
}

async function toggleVisibility(id, current){
  const next = current==='visible' ? 'hidden' : 'visible';
  const r = await apiPost('products', { action:'update', id, status: next });
  if (r.ok) { toast(`Product ${id} is now ${next}`); await loadCatalog(); } else { toast(r.error||'Failed', true); }
}

document.getElementById('tblCatalog').addEventListener('click', async (e)=>{
  const btn = e.target.closest('button'); if (!btn) return; const id = btn.dataset.id; const action = btn.dataset.action;
  const row = btn.closest('tr'); const cells = row.querySelectorAll('td');
  const product = { id, name: cells[1].textContent, price: Number(String(cells[2].textContent).replace(/[^0-9.]/g,'')), status: cells[4].textContent };
  if (action==='edit') openProductDialog(product, async (payload)=>{
    const r = await apiPost('products', { action:'update', ...payload }); if(!r.ok) return toast(r.error||'Update failed', true);
    toast(`Product ${payload.id} updated`); await loadCatalog(); await loadPriceLog();
  });
  if (action==='toggle') await toggleVisibility(id, product.status);
});

document.getElementById('btnNewProduct').addEventListener('click', ()=>{
  openNewProductDialog(async (payload)=>{
    const createRes = await apiPost('products', { action:'create', id: payload.id, name: payload.name, price: payload.price, status: payload.status, note: payload.note });
    if (!createRes.ok) throw new Error(createRes.error||'Create failed');
    if (payload.image_b64){
      const filename = `${payload.id}.png`;
      const gRes = await apiPost('gallery', { filename, content_b64: payload.image_b64, alt: payload.name });
      if (!gRes.ok) throw new Error(gRes.error||'Image upload failed');
    }
    await loadCatalog(); await loadPriceLog(); toast(`Product ${payload.id} created`);
  });
});

// --- Price Log ---
export async function loadPriceLog(){
  const body = document.querySelector('#tblPrices tbody'); body.innerHTML='';
  const res = await apiGet('price-changes'); const rows = res.data || [];
  setPriceLogCache(rows);
  for(const r of rows){ const tr = document.createElement('tr'); tr.innerHTML = `<td>${r.when}</td><td>${r.product}</td><td>R${r.old}</td><td>R${r.new}</td><td>${r.who}</td><td>${r.note||''}</td>`; body.appendChild(tr); }
}

document.getElementById('btnExportCSV').addEventListener('click', exportPriceLogCsv);

// --- Payments ---
async function loadPayments(){
  const body = document.querySelector('#tblPayments tbody'); body.innerHTML='';
  const res = await apiGet('payments'); const rows = res.data || [];
  for(const r of rows){ const tr = document.createElement('tr'); tr.innerHTML = `<td>${r.date||''}</td><td>${r.order}</td><td>${r.email||''}</td><td>R${r.total||r.amount||''}</td><td>${r.status}</td><td><button class="btn" data-role="Admin" data-order="${r.order}" data-action="resend" disabled>Resend Invoice</button></td>`; body.appendChild(tr); }
}

document.getElementById('tblPayments').addEventListener('click', async (e)=>{
  const btn = e.target.closest('button[data-action="resend"]'); if (!btn) return; const orderId = btn.dataset.order;
  const r = await apiPost('payments/resend-invoice', { orderId });
  toast(r.ok ? `Invoice re-sent for ${orderId}` : (r.error||'Failed'), !r.ok);
});

// --- Pages ---
function mdToHtml(md){ let h = md.replace(/^###\s+(.*)$/gm,'<h3>$1</h3>').replace(/^##\s+(.*)$/gm,'<h2>$1</h2>').replace(/^#\s+(.*)$/gm,'<h1>$1</h1>'); h = h.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\*(.*?)\*/g,'<em>$1</em>').replace(/
/g,'<br>'); return h; }

document.getElementById('btnPreviewPage').addEventListener('click', ()=>{ const md = document.getElementById('pgMd').value; document.getElementById('pgPreview').innerHTML = mdToHtml(md); });

document.getElementById('btnSavePage').addEventListener('click', async ()=>{ const payload = { slug: document.getElementById('pgSlug').value.trim(), title: document.getElementById('pgTitle').value.trim(), md: document.getElementById('pgMd').value }; const r = await apiPost('pages', { action:'save', ...payload }); toast(r.ok ? 'Page saved' : (r.error||'Save failed'), !r.ok); });

// --- Settings ---
document.getElementById('btnSaveSettings').addEventListener('click', async ()=>{ const logoInput = document.getElementById('setLogo'); let logo_b64 = null; if (logoInput.files && logoInput.files[0]){ const buf = await logoInput.files[0].arrayBuffer(); logo_b64 = btoa(String.fromCharCode(...new Uint8Array(buf))); } const payload = { company: document.getElementById('setCompany').value, vat: document.getElementById('setVat').value, address: document.getElementById('setAddr').value, email: document.getElementById('setEmail').value, brandColor: document.getElementById('setColor').value, logo_b64 }; const r = await apiPost('settings', payload); toast(r.ok ? 'Settings saved' : (r.error||'Save failed'), !r.ok); });

// --- Audit ---
async function loadAudit(){ const body=document.querySelector('#tblAudit tbody'); body.innerHTML=''; const res=await apiGet('audit'); const rows=res.data||[]; for(const a of rows){ const tr=document.createElement('tr'); tr.innerHTML=`<td>${a.when}</td><td>${a.user}</td><td>${a.ip}</td><td>${a.action}</td><td>${a.target||''}</td>`; body.appendChild(tr);} }

function toast(msg, error=false){ const t=document.getElementById('toast'); t.textContent=msg; t.style.borderColor= error?'#803':'#1c2430'; t.hidden=false; setTimeout(()=>t.hidden=true,2500); }

(async function(){
  setRole('Viewer'); renderGoogleButton();
  await loadDashboard(); await loadCatalog(); await loadPriceLog(); await loadPayments(); await loadAudit();
  await import('./analytics.js');
  await loadAnalytics();
})();
