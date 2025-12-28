
// Admin email + password
window.Admin = window.Admin || {};
Admin.CONFIG = { appsScriptUrl: 'https://script.google.com/macros/s/PASTE_YOUR_APPS_SCRIPT_ID/exec' };

window.addEventListener('DOMContentLoaded', async ()=>{
  const t = sessionStorage.getItem('adm_token');
  if(t){ const ok = await Admin.verify(t); if(ok){ Admin.enter(); return; } }
});

Admin.enter = function(){
  const signin = document.getElementById('signin'); const app = document.getElementById('app');
  if(signin) signin.style.display='none'; if(app) app.style.display='block';
  Admin.loadProducts(); Admin.loadGallery(); Admin.loadPayments();
};

Admin.logout = async function(){
  const t = sessionStorage.getItem('adm_token');
  try{ await fetch(Admin.CONFIG.appsScriptUrl+'?entity=logout', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({token:t})}); }catch(e){}
  sessionStorage.removeItem('adm_token');
  const signin = document.getElementById('signin'); const app = document.getElementById('app');
  if(signin) signin.style.display='block'; if(app) app.style.display='none';
};

Admin.login = async function(ev){
  ev.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const err = document.getElementById('loginError');
  err.style.display='none';
  try{
    const r = await fetch(Admin.CONFIG.appsScriptUrl+'?entity=login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({email, password})
    });
    const out = await r.json();
    if(out && out.ok && out.token){
      sessionStorage.setItem('adm_token', out.token);
      Admin.enter();
    }else{
      err.textContent = (out && out.error) ? out.error : 'Login failed';
      err.style.display='block';
    }
  }catch(e){ err.textContent='Network error'; err.style.display='block'; }
};

Admin.verify = async function(token){
  try{ const r = await fetch(Admin.CONFIG.appsScriptUrl+'?entity=verify', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({token})});
       const out = await r.json(); return !!(out && out.ok); }catch(e){ return false; }
};

// Auth fetch helper
Admin.authFetch = async function(url, options){
  const t = sessionStorage.getItem('adm_token');
  options = options || {}; options.headers = options.headers || {}; options.headers['Authorization'] = 'Bearer '+(t||'');
  return fetch(url, options);
};

// API wrappers
Admin.API = {
  async products(){ const r = await Admin.authFetch(Admin.CONFIG.appsScriptUrl + '?entity=products'); return await r.json(); },
  async gallery(){  const r = await Admin.authFetch(Admin.CONFIG.appsScriptUrl + '?entity=gallery');  return await r.json(); },
  async payments(){ const r = await Admin.authFetch(Admin.CONFIG.appsScriptUrl + '?entity=payments'); return await r.json(); },
  async saveProduct(body){ return Admin.authFetch(Admin.CONFIG.appsScriptUrl + '?entity=products', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)}); },
  async addGallery(body){ return Admin.authFetch(Admin.CONFIG.appsScriptUrl + '?entity=gallery', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)}); },
  async resend(inv){ return Admin.authFetch(Admin.CONFIG.appsScriptUrl + '?entity=resend&invoiceNo=' + encodeURIComponent(inv)); },
};

// UI
function toast(msg){const t=document.getElementById('toast'); if(!t) return; t.textContent=msg; t.style.display='block'; setTimeout(()=>t.style.display='none',2500)}
function httpsUrl(u){return /^https:\/\//.test(u||'');}
function validPrice(x){return !isNaN(Number(x)) && Number(x)>=0;}

Admin.loadProducts = async function(){
  const products = await Admin.API.products(); const root = document.getElementById('prod-list'); if(!root) return;
  root.innerHTML = (products||[]).map(p=>`<div class=\"card\"><div class=\"content\">\n      <h3>${p.sku} — ${p.name}</h3>\n      <div class=\"input-row\" style=\"display:grid;grid-template-columns:1fr 1fr;gap:10px\">\n        <input class=\"input\" value=\"${p.price??''}\" id=\"${p.sku}-price\" placeholder=\"Price\"> \n        <input class=\"input\" value=\"${p.imageUrl??''}\" id=\"${p.sku}-img\"   placeholder=\"Image URL\"> \n      </div>\n      <div class=\"input-row\" style=\"display:grid;grid-template-columns:1fr 1fr;gap:10px\">\n        <input class=\"input\" value=\"${p.trialUrl??''}\" id=\"${p.sku}-trial\" placeholder=\"Trial URL\"> \n        <input class=\"input\" value=\"${p.docUrl??''}\"   id=\"${p.sku}-doc\"   placeholder=\"Docs URL\"> \n      </div>\n      <button class=\"btn small\" onclick=\"Admin.save('${p.sku}')\">Save</button>\n    </div></div>`).join('');
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
  root.innerHTML = (list||[]).map(g=>`<div class=\"card\" draggable=\"true\"><img src=\"${g.imageUrl}\"><div class=\"content\"><p>${g.caption||''}</p></div></div>`).join('');
  root.addEventListener('dragstart', e=>{ e.target.classList.add('dragging'); });
  root.addEventListener('dragend',   e=>{ e.target.classList.remove('dragging'); persistOrder(); });
  root.addEventListener('dragover',  e=>{ e.preventDefault(); const dragging=root.querySelector('.dragging'); const after=[...root.querySelectorAll('.card')].find(card=>{ const rect=card.getBoundingClientRect(); return e.clientY < rect.top + rect.height/2; }); if(after) root.insertBefore(dragging, after); else root.appendChild(dragging); });
  async function persistOrder(){ const items=[...root.querySelectorAll('.card img')].map((img,i)=>({imageUrl:img.src, order:i+1})); await Admin.API.addGallery({items}); toast('Gallery order saved'); }
};

Admin.loadPayments = async function(){
  const list = await Admin.API.payments(); const root = document.getElementById('pay-list'); if(!root) return;
  root.innerHTML = `<table class=\"table\"><thead><tr><th>Invoice</th><th>Order</th><th>SKU</th><th>Total</th><th>Email</th><th>Actions</th></tr></thead><tbody>` +
    (list||[]).map(p=>`<tr><td>${p.invoiceNo}</td><td>${p.orderId}</td><td>${p.sku}</td><td>R${Number(p.totalInclVAT||0).toLocaleString()}</td><td>${p.email||''}</td><td><button class=\"btn small\" onclick=\"Admin.resend('${p.invoiceNo}')\">Resend Invoice</button></td></tr>`).join('') + '</tbody></table>';
};

Admin.resend = async function(inv){ await Admin.API.resend(inv); toast('Resent ' + inv); };
