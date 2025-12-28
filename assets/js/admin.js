
window.Admin = window.Admin || {};
Admin.CONFIG = { appsScriptUrl: 'https://script.google.com/macros/s/PASTE_YOUR_APPS_SCRIPT_ID/exec' };
Admin.GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';

window.addEventListener('DOMContentLoaded', () => {
  const ok = sessionStorage.getItem('adm')==='ok';
  const signin = document.getElementById('signin');
  const app = document.getElementById('app');
  if(!ok){ if(signin) signin.style.display='block'; if(app) app.style.display='none'; return; }
  if(signin) signin.style.display='none'; if(app) app.style.display='block';
  Admin.loadProducts(); Admin.loadGallery(); Admin.loadPayments();
});

function toast(msg){const t=document.getElementById('toast'); if(!t) return; t.textContent=msg; t.style.display='block'; setTimeout(()=>t.style.display='none',2500)}
function httpsUrl(u){return /^https:\/\//.test(u||'');}
function validPrice(x){return !isNaN(Number(x)) && Number(x)>=0;}

Admin.API = {
  async products(){ const r = await fetch(Admin.CONFIG.appsScriptUrl + '?entity=products'); return await r.json(); },
  async gallery(){  const r = await fetch(Admin.CONFIG.appsScriptUrl + '?entity=gallery');  return await r.json(); },
  async payments(){ const r = await fetch(Admin.CONFIG.appsScriptUrl + '?entity=payments'); return await r.json(); },
  async saveProduct(body){ return fetch(Admin.CONFIG.appsScriptUrl + '?entity=products', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)}); },
  async addGallery(body){ return fetch(Admin.CONFIG.appsScriptUrl + '?entity=gallery', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)}); },
  async resend(inv){ return fetch(Admin.CONFIG.appsScriptUrl + '?entity=resend&invoiceNo=' + encodeURIComponent(inv)); },
};

Admin.onGoogleCredential = async function(resp){
  try{
    const idToken = resp && resp.credential; if(!idToken){ alert('Missing token'); return; }
    const r = await fetch(Admin.CONFIG.appsScriptUrl + '?entity=verify', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({credential:idToken, client_id: Admin.GOOGLE_CLIENT_ID})});
    const out = await r.json();
    if(out && out.ok && out.email==='wykiesautomation@gmail.com'){
      sessionStorage.setItem('adm','ok'); sessionStorage.setItem('adm_email', out.email);
      const signin = document.getElementById('signin'); const app = document.getElementById('app');
      if(signin) signin.style.display='none'; if(app) app.style.display='block';
      Admin.loadProducts(); Admin.loadGallery(); Admin.loadPayments(); toast('Signed in');
    }else{ alert('Access denied'); }
  }catch(err){ alert('Sign‑in failed'); }
};

Admin.loadProducts = async function(){
  const products = await Admin.API.products(); const root = document.getElementById('prod-list'); if(!root) return;
  root.innerHTML = (products||[]).map(p=>`<div class="card"><div class="content">
      <h3>${p.sku} — ${p.name}</h3>
      <div class="input-row" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <input class="input" value="${p.price??''}" id="${p.sku}-price" placeholder="Price"> 
        <input class="input" value="${p.imageUrl??''}" id="${p.sku}-img"   placeholder="Image URL"> 
      </div>
      <div class="input-row" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <input class="input" value="${p.trialUrl??''}" id="${p.sku}-trial" placeholder="Trial URL"> 
        <input class="input" value="${p.docUrl??''}"   id="${p.sku}-doc"   placeholder="Docs URL"> 
      </div>
      <button class="btn small" onclick="Admin.save('${p.sku}')">Save</button>
    </div></div>`).join('');
};

Admin.save = async function(sku){
  const price = document.getElementById(`${sku}-price`)?.value;
  const img   = document.getElementById(`${sku}-img`)?.value;
  const trial = document.getElementById(`${sku}-trial`)?.value;
  const doc   = document.getElementById(`${sku}-doc`)?.value;
  const errs = [];
  if(!validPrice(price)) errs.push('Price invalid');
  if(img && !httpsUrl(img)) errs.push('Image URL must be https://');
  if(trial && trial!=='#' && !httpsUrl(trial)) errs.push('Trial URL must be https://');
  if(doc && doc!=='#' && !httpsUrl(doc)) errs.push('Docs URL must be https://');
  if(errs.length){ toast('Fix: ' + errs.join(', ')); return; }
  await Admin.API.saveProduct({ sku, price:Number(price), imageUrl:img, trialUrl:trial, docUrl:doc }); toast('Saved ' + sku);
};

Admin.loadGallery = async function(){
  const list = await Admin.API.gallery(); const root = document.getElementById('gal-list'); if(!root) return;
  root.innerHTML = (list||[]).map(g=>`<div class="card" draggable="true"><img src="${g.imageUrl}"><div class="content"><p>${g.caption||''}</p></div></div>`).join('');
  root.addEventListener('dragstart', e=>{ e.target.classList.add('dragging'); });
  root.addEventListener('dragend',   e=>{ e.target.classList.remove('dragging'); persistOrder(); });
  root.addEventListener('dragover',  e=>{ e.preventDefault(); const dragging=root.querySelector('.dragging'); const after=[...root.querySelectorAll('.card')].find(card=>{ const rect=card.getBoundingClientRect(); return e.clientY < rect.top + rect.height/2; }); if(after) root.insertBefore(dragging, after); else root.appendChild(dragging); });
  async function persistOrder(){ const items=[...root.querySelectorAll('.card img')].map((img,i)=>({imageUrl:img.src, order:i+1})); await fetch(Admin.CONFIG.appsScriptUrl+'?entity=gallery_order',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({items})}); toast('Gallery order saved'); }
};

Admin.loadPayments = async function(){
  const list = await Admin.API.payments(); const root = document.getElementById('pay-list'); if(!root) return;
  root.innerHTML = `<table class="table"><thead><tr><th>Invoice</th><th>Order</th><th>SKU</th><th>Total</th><th>Email</th><th>Actions</th></tr></thead><tbody>` +
    (list||[]).map(p=>`<tr><td>${p.invoiceNo}</td><td>${p.orderId}</td><td>${p.sku}</td><td>R${Number(p.totalInclVAT||0).toLocaleString()}</td><td>${p.email||''}</td><td><button class="btn small" onclick="Admin.resend('${p.invoiceNo}')">Resend Invoice</button></td></tr>`).join('') + '</tbody></table>';
};

Admin.resend = async function(inv){ await Admin.API.resend(inv); toast('Resent ' + inv); };
