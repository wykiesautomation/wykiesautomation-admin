
// admin.js — SPA logic (v1.1)
import { cfg, api, setToken } from './api.js';

// Toast
export function showToast(message, opts={}){
  const { title='', type='success', timeout=2000 } = opts;
  let container = document.getElementById('toast-container');
  if(!container){ container=document.createElement('div'); container.id='toast-container'; document.body.appendChild(container); }
  const el=document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<div>${title?`<div class="title">${escapeHtml(title)}</div>`:''}<div class="msg">${escapeHtml(message)}</div></div><button class="close-btn" aria-label="Dismiss">×</button>`;
  container.appendChild(el);
  const remove=()=>{ el.style.animation='toast-out .16s ease-in forwards'; setTimeout(()=>el.remove(),160); };
  el.querySelector('.close-btn').addEventListener('click', remove);
  if(timeout>0){ setTimeout(remove, timeout); }
}
function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// Google Sign-In
window.onGoogleSignIn = async (response)=>{
  const token = response.credential; setToken(token);
  const vr = await api.authVerify(token);
  if(vr && vr.ok){ document.getElementById('login').style.display='none'; document.getElementById('app').style.display='block'; document.getElementById('userInfo').textContent = vr.email; setActiveTab('products'); loadProducts(); }
  else{ showToast('Not authorized', {type:'error', title:'Auth', timeout:4000}); }
}

// Tabs
function setActiveTab(n){ document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active')); document.querySelector(`[data-view="${n}"]`).classList.add('active'); document.querySelectorAll('.view').forEach(v=>v.style.display='none'); document.getElementById('view-'+n).style.display='block'; }
document.addEventListener('click', (e)=>{ const v=e.target.getAttribute('data-view'); if(v){ setActiveTab(v); if(v==='products') loadProducts(); if(v==='gallery') loadGallery(); if(v==='payments') loadPayments(); }});

document.getElementById('logoutBtn').addEventListener('click', ()=>{ setToken(null); location.reload(); });

// PRODUCTS
async function loadProducts(){ try{
  const { products } = await api.productsList();
  const tb = document.querySelector('#productsTable tbody');
  tb.innerHTML = products.map(p=>`<tr><td>${p.sku}</td><td>${p.name}</td><td>R ${Number(p.price||0).toFixed(2)}</td><td>${p.active}</td><td><button data-edit="${p.sku}" class="outline">Edit</button><button data-del="${p.sku}" class="outline">Delete</button></td></tr>`).join('');
 }catch(err){ showToast('Failed to load products', {type:'error', title:'Products'}); }}

document.getElementById('productsTable').addEventListener('click', async (e)=>{
  const skuE = e.target.getAttribute('data-edit'); const skuD = e.target.getAttribute('data-del');
  if(skuE){ const row = Array.from(e.target.closest('tr').children).map(td=>td.textContent); const f=document.getElementById('productForm'); f.sku.value=row[0]; f.name.value=row[1]; f.price.value=(row[2].replace('R ','')||'0'); f.active.checked=(row[3]==='true'); }
  if(skuD){ if(confirm('Delete product '+skuD+'?')){ await api.productsDelete(skuD); showToast('Product deleted', {title:'Products'}); await loadProducts(); }}
});

document.getElementById('productForm').addEventListener('submit', async (e)=>{
  e.preventDefault(); const f=e.target; const p={ sku:f.sku.value, name:f.name.value, price:parseFloat(f.price.value||'0'), imageUrl:f.imageUrl.value, summary:f.summary.value, description:f.description.value, trialUrl:f.trialUrl.value, docUrl:f.docUrl.value, active:f.active.checked };
  await api.productsUpsert(p); showToast('Product saved', {title:'Products'}); f.reset(); await loadProducts();
});

// GALLERY
let selectedIds = new Set();
async function loadGallery(){ try{
  const { images } = await api.galleryList();
  const grid = document.getElementById('galleryGrid');
  grid.innerHTML = images.map(i=>`<div class="card" draggable="true" data-id="${i.image_id}"><div class="sel"><input type="checkbox" class="rowSel"></div><img src="${i.public_url}" style="width:100%"><div>${i.title||''}</div><div class="muted">${i.album||''}</div></div>`).join('');
  selectedIds.clear(); updateSelCount();
  // selection wiring
  grid.querySelectorAll('.card').forEach(card=>{ const id=card.dataset.id; const box=card.querySelector('.rowSel'); box.addEventListener('change',()=>{ if(box.checked){ selectedIds.add(id); card.classList.add('selected'); } else { selectedIds.delete(id); card.classList.remove('selected'); } updateSelCount(); }); card.addEventListener('click',(e)=>{ if(e.target.classList.contains('rowSel')) return; box.checked=!box.checked; box.dispatchEvent(new Event('change')); }); });
  enableDragReorder(grid);
 }catch(err){ showToast('Failed to load gallery', {type:'error', title:'Gallery'}); }}

function updateSelCount(){ document.getElementById('selCount').textContent = `${selectedIds.size} selected`; document.getElementById('selectAll').checked=false; }
document.getElementById('selectAll').addEventListener('change',(e)=>{ const all=Array.from(document.querySelectorAll('#galleryGrid .card')); selectedIds.clear(); all.forEach(card=>{ const id=card.dataset.id; const box=card.querySelector('.rowSel'); box.checked=e.target.checked; if(e.target.checked){ selectedIds.add(id); card.classList.add('selected'); } else { card.classList.remove('selected'); } }); updateSelCount(); });

document.getElementById('bulkPublish').addEventListener('click', async ()=>{ if(!selectedIds.size) return showToast('No images selected',{type:'info',title:'Gallery'}); try{ const ids=Array.from(selectedIds); await api.galleryBulk('publish', ids); showToast(`Published ${ids.length} image(s)`,{title:'Gallery'}); await loadGallery(); }catch(err){ showToast('Failed to publish', {type:'error', title:'Gallery', timeout:4000}); }});

document.getElementById('bulkUnpublish').addEventListener('click', async ()=>{ if(!selectedIds.size) return showToast('No images selected',{type:'info',title:'Gallery'}); try{ const ids=Array.from(selectedIds); await api.galleryBulk('unpublish', ids); showToast(`Unpublished ${ids.length} image(s)`,{title:'Gallery'}); await loadGallery(); }catch(err){ showToast('Failed to unpublish', {type:'error', title:'Gallery', timeout:4000}); }});

document.getElementById('refreshGallery').addEventListener('click', loadGallery);

// Drag & drop reorder
function enableDragReorder(grid){ let dragEl=null; grid.querySelectorAll('.card').forEach(card=>{ card.addEventListener('dragstart',e=>{ dragEl=card; card.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; }); card.addEventListener('dragend',()=>{ card.classList.remove('dragging'); grid.querySelectorAll('.card').forEach(c=>c.classList.remove('drop-target')); saveNewOrder(grid); }); card.addEventListener('dragover',e=>{ e.preventDefault(); const t=e.currentTarget; if(t!==dragEl) t.classList.add('drop-target'); }); card.addEventListener('dragleave',e=>{ e.currentTarget.classList.remove('drop-target'); }); card.addEventListener('drop',e=>{ e.preventDefault(); const t=e.currentTarget; t.classList.remove('drop-target'); if(t===dragEl) return; const rect=t.getBoundingClientRect(); const mid=rect.left+rect.width/2; if(e.clientX<mid){ grid.insertBefore(dragEl,t); } else { grid.insertBefore(dragEl,t.nextSibling); } }); }); }
async function saveNewOrder(grid){ const ids=Array.from(grid.querySelectorAll('.card')).map(c=>c.dataset.id).filter(Boolean); if(!ids.length) return; try{ await api.galleryReorder(ids); showToast('Reorder saved', {title:'Gallery'}); }catch(err){ showToast('Failed to save reorder', {type:'error', title:'Gallery'}); }}

// Upload
const upForm = document.getElementById('uploadForm');
upForm.addEventListener('submit', async (e)=>{ e.preventDefault(); const f=e.target; const file=f.file.files[0]; if(!file) return; const reader=new FileReader(); reader.onload=async ()=>{ const base64=reader.result.split(',')[1]; const payload={ fileName:file.name, base64, album:f.album.value, title:f.title.value, caption:f.caption.value, publish:f.publish.checked }; try{ await api.galleryUpload(payload); showToast('Image uploaded',{title:'Gallery'}); f.reset(); await loadGallery(); }catch(err){ showToast('Upload failed',{type:'error',title:'Gallery',timeout:4000}); } }; reader.readAsDataURL(file); });

// PAYMENTS
async function loadPayments(){ try{ const from=document.getElementById('fromDate').value; const to=document.getElementById('toDate').value; const status=document.getElementById('statusSel').value; const { payments } = await api.paymentsList(from,to,status); const tb=document.querySelector('#paymentsTable tbody'); tb.innerHTML = payments.map(r=>`<tr><td>${r.Timestamp||''}</td><td>${r.InvoiceNo||''}</td><td>${r.OrderID||''}</td><td>${r.pf_payment_id||''}</td><td>${r.Email||''}</td><td>${r.SKU||''}</td><td>${r.TotalInclVAT||r.amount||''}</td><td>${r.ReleasedAt||''}</td><td>${r.payment_status||''}</td><td>${r.OrderID? `<button data-resend="${r.OrderID}" class="outline">Re-send</button>`:''}</td></tr>`).join(''); }catch(err){ showToast('Failed to load payments',{type:'error',title:'Payments'}); }}

document.getElementById('filterPayments').addEventListener('click', loadPayments);

document.getElementById('paymentsTable').addEventListener('click', async (e)=>{ const oid=e.target.getAttribute('data-resend'); if(oid){ try{ await api.invoiceResend(oid); showToast('Invoice re-sent',{title:'Payments'}); }catch(err){ showToast('Failed to re-send',{type:'error',title:'Payments'}); } }});
