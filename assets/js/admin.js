
const Admin = window.Admin || {}; Admin.CONFIG = {appsScriptUrl: 'https://script.google.com/macros/s/AKfycbYQad-4V64QsRkFpPqoDWE8h-w4AzIQa2GKiITVoiqnYnCa6Xxv0hdqjkE4pTnoHj2Nw/exec'}; Admin.GOOGLE_CLIENT_ID = window.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';

window.addEventListener('DOMContentLoaded', ()=>{
  const ok = sessionStorage.getItem('adm')==='ok';
  const signin = document.getElementById('signin');
  if(!ok){ if(signin) signin.style.display='block'; }
});

function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.style.display='block';setTimeout(()=>t.style.display='none',2500)}

const AdminAPI = {
  async products(){ const r = await fetch(Admin.CONFIG.appsScriptUrl + '?entity=products'); return await r.json(); },
  async gallery(){ const r = await fetch(Admin.CONFIG.appsScriptUrl + '?entity=gallery'); return await r.json(); },
  async payments(){ const r = await fetch(Admin.CONFIG.appsScriptUrl + '?entity=payments'); return await r.json(); },
  async saveProduct(body){ return fetch(Admin.CONFIG.appsScriptUrl + '?entity=products', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)}); },
  async addGallery(body){ return fetch(Admin.CONFIG.appsScriptUrl + '?entity=gallery', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)}); },
  async resend(inv){ return fetch(Admin.CONFIG.appsScriptUrl + '?entity=resend&invoiceNo=' + encodeURIComponent(inv)); },
};

const Admin = {
  async loadProducts(){
    const products = await AdminAPI.products();
    const root = document.getElementById('prod-list');
    root.innerHTML = products.map(p=>`<div class="card"><div class="content">
      <h3>${p.sku} — ${p.name}</h3>
      <div class="input-row" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <input class="input" value="${p.price}" id="${p.sku}-price" placeholder="Price"> 
        <input class="input" value="${p.imageUrl}" id="${p.sku}-img" placeholder="Image URL"> 
      </div>
      <div class="input-row" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <input class="input" value="${p.trialUrl}" id="${p.sku}-trial" placeholder="Trial URL"> 
        <input class="input" value="${p.docUrl}" id="${p.sku}-doc" placeholder="Docs URL"> 
      </div>
      <button class="btn small" onclick="Admin.save('${p.sku}')">Save</button>
    </div></div>`).join('');
  },
  async save(sku){
    const body = {
      sku,
      price: Number(document.getElementById(`${sku}-price`).value),
      imageUrl: document.getElementById(`${sku}-img`).value,
      trialUrl: document.getElementById(`${sku}-trial`).value,
      docUrl: document.getElementById(`${sku}-doc`).value,
    };
    await AdminAPI.saveProduct(body);
    toast('Saved ' + sku);
  },
  async loadGallery(){
    const list = await AdminAPI.gallery();
    const root = document.getElementById('gal-list');
    root.innerHTML = list.map(g=>`<div class="card"><img src="${g.imageUrl}"><div class="content"><p>${g.caption||''}</p></div></div>`).join('');
  },
  async addGalleryItem(){
    const imageUrl = prompt('Image URL (https://...)');
    const caption = prompt('Caption');
    if(!imageUrl) return;
    await AdminAPI.addGallery({imageUrl, caption});
    toast('Image added');
    Admin.loadGallery();
  },
  async loadPayments(){
    const list = await AdminAPI.payments();
    const root = document.getElementById('pay-list');
    root.innerHTML = `<table class="table"><thead><tr><th>Invoice</th><th>Order</th><th>SKU</th><th>Total</th><th>Email</th><th>Actions</th></tr></thead><tbody>` +
      list.map(p=>`<tr><td>${p.invoiceNo}</td><td>${p.orderId}</td><td>${p.sku}</td><td>R${Number(p.totalInclVAT).toLocaleString()}</td><td>${p.email}</td><td><button class="btn small" onclick="Admin.resend('${p.invoiceNo}')">Resend Invoice</button></td></tr>`).join('') + '</tbody></table>';
  },
  async resend(inv){ await AdminAPI.resend(inv); toast('Resent ' + inv); }
};
