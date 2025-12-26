// admin.js — SPA logic
import { cfg, api, setToken } from './api.js';

window.onGoogleSignIn = async (response)=>{
  const token = response.credential; setToken(token);
  const vr = await api.authVerify(token);
  if(vr && vr.ok){ document.getElementById('login').style.display='none'; document.getElementById('app').style.display='block'; document.getElementById('userInfo').textContent = vr.email; show('products'); loadProducts(); }
  else{ alert('Not authorized'); }
}

function show(name){ document.querySelectorAll('.view').forEach(v=>v.style.display='none'); document.getElementById('view-'+name).style.display='block'; }

document.addEventListener('click', (e)=>{
  const view = e.target.getAttribute('data-view'); if(view){ show(view); if(view==='products') loadProducts(); if(view==='gallery') loadGallery(); if(view==='payments') loadPayments(); }
});

// Products
async function loadProducts(){
  const { products } = await api.productsList();
  const tb = document.querySelector('#productsTable tbody');
  tb.innerHTML = products.map(p=>`<tr><td>${p.sku}</td><td>${p.name}</td><td>${p.price}</td><td>${p.active}</td><td><button data-edit="${p.sku}">Edit</button><button data-del="${p.sku}">Delete</button></td></tr>`).join('');
}

document.getElementById('productsTable').addEventListener('click', async (e)=>{
  const skuE = e.target.getAttribute('data-edit'); const skuD = e.target.getAttribute('data-del');
  if(skuE){ const row = Array.from(e.target.closest('tr').children).map(td=>td.textContent); const f=document.getElementById('productForm'); f.sku.value=row[0]; f.name.value=row[1]; f.price.value=row[2]; f.active.checked=(row[3]==='true'); }
  if(skuD){ if(confirm('Delete product '+skuD+'?')){ await api.productsDelete(skuD); await loadProducts(); }}
});

document.getElementById('productForm').addEventListener('submit', async (e)=>{
  e.preventDefault(); const f=e.target; const p={ sku:f.sku.value, name:f.name.value, price:parseFloat(f.price.value||'0'), imageUrl:f.imageUrl.value, summary:f.summary.value, description:f.description.value, trialUrl:f.trialUrl.value, docUrl:f.docUrl.value, active:f.active.checked };
  await api.productsUpsert(p); f.reset(); await loadProducts();
});

// Gallery
async function loadGallery(){
  const { images } = await api.galleryList();
  const grid = document.getElementById('galleryGrid');
  grid.innerHTML = images.map(i=>`<div class="card"><img src="${i.public_url}" style="width:100%"><div>${i.title||''}</div><div>${i.album||''}</div></div>`).join('');
}

document.getElementById('uploadForm').addEventListener('submit', async (e)=>{
  e.preventDefault(); const f=e.target; const file=f.file.files[0]; const reader=new FileReader(); reader.onload=async ()=>{ const base64 = reader.result.split(',')[1]; const payload={ fileName:file.name, base64, album:f.album.value, title:f.title.value, caption:f.caption.value, publish:f.publish.checked };
    await api.galleryUpload(payload); f.reset(); await loadGallery(); };
  reader.readAsDataURL(file);
});

// Payments
async function loadPayments(){
  const from = document.getElementById('fromDate').value; const to = document.getElementById('toDate').value; const status = document.getElementById('statusSel').value;
  const { payments } = await api.paymentsList(from,to,status);
  const tb = document.querySelector('#paymentsTable tbody');
  tb.innerHTML = payments.map(r=>`<tr><td>${r.Timestamp||''}</td><td>${r.InvoiceNo||''}</td><td>${r.OrderID||''}</td><td>${r.pf_payment_id||''}</td><td>${r.Email||''}</td><td>${r.SKU||''}</td><td>${r.TotalInclVAT||r.amount||''}</td><td>${r.ReleasedAt||''}</td><td>${r.payment_status||''}</td><td>${r.OrderID? `<button data-resend="${r.OrderID}">Re-send</button>`:''}</td></tr>`).join('');
}

document.getElementById('filterPayments').addEventListener('click', loadPayments);

document.getElementById('paymentsTable').addEventListener('click', async (e)=>{
  const oid = e.target.getAttribute('data-resend'); if(oid){ await api.invoiceResend(oid); alert('Invoice re-sent'); }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', ()=>{ setToken(null); location.reload(); });
