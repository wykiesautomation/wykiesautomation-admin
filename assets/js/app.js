const API = {
  products: '/cms/products',
  priceLog: '/cms/priceLog',
  payments: '/cms/payments',
  changePrice: '/admin/change-price',
  saveProduct: '/admin/save-product',
  resendInvoice: '/admin/resend-invoice'
};
const ADMIN_EMAIL = 'wykiesautomation@gmail.com';

// Simple nav
const pages = document.querySelectorAll('.page');
document.querySelectorAll('.sidebar button').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.sidebar button').forEach(x=>x.classList.remove('active')); b.classList.add('active');
  pages.forEach(p=>p.classList.add('hidden')); document.getElementById(b.dataset.page).classList.remove('hidden');
}));

// Auth (v1 header allowlist)
let signedIn = false;
function signIn(){ signedIn = true; document.getElementById('btnSignIn').classList.add('hidden'); document.getElementById('btnSignOut').classList.remove('hidden'); document.getElementById('adminUser').innerText = ADMIN_EMAIL; }
function signOut(){ signedIn = false; document.getElementById('btnSignIn').classList.remove('hidden'); document.getElementById('btnSignOut').classList.add('hidden'); document.getElementById('adminUser').innerText = ''; }

document.getElementById('btnSignIn').addEventListener('click', signIn);
document.getElementById('btnSignOut').addEventListener('click', signOut);
document.getElementById('allowEmail').innerText = ADMIN_EMAIL;

// Fetch helper with admin header
async function fetchJSON(url, init={}){ init.headers = Object.assign({'Accept':'application/json'}, init.headers||{}); if(signedIn) init.headers['x-admin-email']=ADMIN_EMAIL; const r=await fetch(url, init); if(!r.ok) throw new Error('Request failed'); return await r.json(); }

// Dashboard + Products + Payments
function rowPriceLog(l){ return `<tr><td>${l.productId}</td><td>R ${l.oldPrice} → R ${l.newPrice}</td><td>${new Date(l.changedAtISO).toLocaleString()}</td><td>${l.changedBy||'admin'}</td></tr>` }

function rowProduct(p){ return `<tr><td>${p.id}</td><td>${p.name}</td><td>R ${Number(p.priceVatIncl).toLocaleString()}</td><td>${(String(p.active).toLowerCase()==='true')?'Yes':'No'}</td><td><button class='btn' onclick="openChange('${p.id}',${Number(p.priceVatIncl)})">Change Price</button> <button class='btn' onclick="toggleActive('${p.id}',${(String(p.active).toLowerCase()==='true')?'false':'true'})">${(String(p.active).toLowerCase()==='true')?'Deactivate':'Activate'}</button></td></tr>` }

function renderProds(list){ const q=(document.getElementById('pSearch').value||'').toLowerCase(); const filtered = list.filter(p=> (p.name||'').toLowerCase().includes(q) || (p.id||'').toLowerCase().includes(q)); document.getElementById('prodTable').innerHTML = filtered.map(rowProduct).join(''); document.getElementById('mProducts').innerText=list.length; document.getElementById('mActive').innerText=list.filter(p=>String(p.active).toLowerCase()==='true').length; }

function renderLog(list){ document.getElementById('priceLog').innerHTML = list.map(rowPriceLog).join(''); document.getElementById('mPrice').innerText = list.length; }

function renderPays(list){ const mapPill=s=>s; const rows=list.map(p=>`<tr><td>${new Date(p.timestampISO).toLocaleString()}</td><td>${p.pfRef}</td><td>${p.pfStatus}</td><td>R ${Number(p.amount).toLocaleString()}</td><td>${p.productId}</td><td>${p.buyerEmail}</td><td>${p.invoiceUrl?`<a href='${p.invoiceUrl}' target='_blank'>PDF</a>`:''}</td><td><button class='btn' onclick="resend('${p.pfRef}','${p.buyerEmail}','${p.productId}',${Number(p.amount)})">Resend</button></td></tr>`).join(''); document.getElementById('payTable').innerHTML = rows; document.getElementById('recentPayments').innerHTML = rows; document.getElementById('mPay').innerText = list.filter(x=>x.pfStatus==='COMPLETE').length; }

// Modals
function openModal(inner){document.getElementById('modalInner').innerHTML=inner;document.getElementById('modal').classList.remove('hidden');}
function closeModal(){document.getElementById('modal').classList.add('hidden');}

function openChange(id,current){ if(!signedIn) return alert('Sign in first'); const html = `<h3>Change Price — ${id}</h3><div class='row'><input id='newPrice' class='input' type='number' value='${current}'/></div><div class='row'><button class='btn' onclick='closeModal()'>Cancel</button><button class='btn' onclick="applyPrice('${id}')">Save</button></div>`; openModal(html); }
async function applyPrice(id){ const np = Number(document.getElementById('newPrice').value||0); if(!np) return; await fetchJSON(API.changePrice,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ productId:id, newPrice:np }) }); closeModal(); await refreshAll(); }
async function toggleActive(id,val){ if(!signedIn) return alert('Sign in first'); await fetchJSON(API.saveProduct,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id, active: !!val }) }); await refreshAll(); }

async function resend(pfRef,buyerEmail,productId,amount){ if(!signedIn) return alert('Sign in first'); await fetchJSON(API.resendInvoice,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ pfRef,buyerEmail,productId,amount }) }); alert('Resent.'); }

document.getElementById('btnTestResend').addEventListener('click',()=>{ if(!signedIn) return alert('Sign in first'); resend('TESTREF','buyer@example.com','WA-01',1499); });

document.getElementById('btnRefreshPay').addEventListener('click', refreshPayments);

document.getElementById('pSearch').addEventListener('input',()=>renderProds(window.__prods||[]));

async function refreshAll(){ const [prods,log] = await Promise.all([fetchJSON(API.products), fetchJSON(API.priceLog)]); window.__prods=prods; renderProds(prods); renderLog(log); }
async function refreshPayments(){ try{ const pays = await fetchJSON(API.payments); renderPays(pays); }catch(e){ console.error(e); }}

async function boot(){ await refreshAll(); await refreshPayments(); }
boot();
