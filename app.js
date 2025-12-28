// Admin Dashboard JS — Google Sign-In + Apps Script backend
const ALLOWLIST = ["wykiesautomation@gmail.com"]; // only email allowed
const BACKEND_URL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
let idToken = null;

function onSignIn(resp){
  idToken = resp.credential;
  verifyToken(idToken).then(info=>{
    if(!info || !ALLOWLIST.includes(info.email)){
      alert('Access denied'); return;
    }
    document.getElementById('signin').style.display='none';
    document.getElementById('adminContent').style.display='block';
  }).catch(()=>alert('Sign-in error'));
}
async function verifyToken(token){
  // Send to backend to verify and return email
  const res = await fetch(`${BACKEND_URL}?action=verify`, {headers:{Authorization:`Bearer ${token}`}});
  if(!res.ok) return null; return await res.json();
}
async function backend(action, data){
  const opts = {method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${idToken}`}, body:JSON.stringify({action, data})};
  const res = await fetch(BACKEND_URL, opts); if(!res.ok) throw new Error('Backend error'); return await res.json();
}

// Panels
async function loadProductsAdmin(){
  const panel = document.getElementById('adminPanel'); panel.innerHTML = '<p>Loading products…</p>';
  const rsp = await backend('list_products');
  panel.innerHTML = `<table style="width:100%"><thead><tr><th>SKU</th><th>Name</th><th>Price</th><th>Stock</th><th>Active</th><th></th></tr></thead><tbody>
    ${rsp.products.map(p=>`<tr>
      <td>${p.sku}</td>
      <td><input value="${p.name}" data-sku="${p.sku}" data-field="name"></td>
      <td><input value="${p.price}" data-sku="${p.sku}" data-field="price" type="number"></td>
      <td><input value="${p.stock}" data-sku="${p.sku}" data-field="stock" type="number"></td>
      <td><input type="checkbox" ${p.active?'checked':''} data-sku="${p.sku}" data-field="active"></td>
      <td><button class="btn" onclick="saveRow('${p.sku}')">Save</button></td>
    </tr>`).join('')}
  </tbody></table>`;
}
async function saveRow(sku){
  const inputs = [...document.querySelectorAll(`[data-sku='${sku}']`)];
  const payload = {sku}; inputs.forEach(i=>{ const f=i.dataset.field; payload[f] = (i.type==='checkbox'? i.checked : i.value); });
  await backend('update_product', payload); alert('Saved');
}
async function loadPayments(){
  const panel = document.getElementById('adminPanel'); panel.innerHTML = '<p>Loading payments…</p>';
  const rsp = await backend('list_payments');
  panel.innerHTML = `<table style="width:100%"><thead><tr><th>Date</th><th>Buyer</th><th>SKU</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>
    ${rsp.items.map(x=>`<tr>
      <td>${x.date}</td><td>${x.buyer}</td><td>${x.sku}</td><td>${x.amount}</td><td>${x.status}</td>
      <td><button class="btn" onclick="resend('${x.id}')">Resend Invoice</button></td>
    </tr>`).join('')}
  </tbody></table>`;
}
async function resend(id){ await backend('resend_invoice', {id}); alert('Invoice re-sent'); }
async function loadGalleryAdmin(){
  const panel = document.getElementById('adminPanel'); panel.innerHTML = '<p>Loading gallery…</p>';
  const rsp = await backend('list_gallery');
  panel.innerHTML = `<div class="grid">
    ${rsp.items.map(g=>`<article class='card'><img src='${g.src}' alt='${g.alt}'><div class='body'><input value='${g.caption}' data-id='${g.id}'><button class='btn' onclick="saveGal('${g.id}')">Save</button></div></article>`).join('')}
  </div>`;
}
async function saveGal(id){ const el = document.querySelector(`[data-id='${id}']`); await backend('update_gallery', {id, caption:el.value}); alert('Saved'); }
