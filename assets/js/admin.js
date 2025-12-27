
async function getCfg(){ if(!window._cfg){ const r=await fetch('assets/js/config.json'); window._cfg = await r.json(); } return window._cfg; }
function showTab(name){ for(const id of ['products','gallery','payments','logs']){ document.getElementById('tab-'+id).style.display = (id===name?'block':'none'); } }
async function adminLogin(){ const pf = document.getElementById('pf').value; const cfg = await getCfg(); if(pf===cfg.adminPassphrase){ localStorage.setItem('wa_admin','1'); document.getElementById('login').style.display='none'; document.getElementById('admin').style.display='block'; document.getElementById('role').textContent='Admin'; loadTabs(); } else { alert('Incorrect passphrase'); }}
async function ensureAuth(){ const authed = localStorage.getItem('wa_admin')==='1'; document.getElementById('login').style.display = authed? 'none':'flex'; document.getElementById('admin').style.display = authed? 'block':'none'; if(authed){ document.getElementById('role').textContent='Admin'; loadTabs(); } }
async function fetchLocal(p){ const r=await fetch('assets/js/'+p); return r.json(); }
async function loadTabs(){
  const prods = await fetchLocal('products.json');
  const wrap = document.getElementById('adminProducts'); wrap.innerHTML='';
  prods.forEach(p=>{
    const row = document.createElement('div'); row.className='card';
    row.innerHTML = `<div class="pad" style="display:flex;gap:10px;align-items:center">
      <img src="${p.imageUrl}" alt="${p.name}" style="width:80px;height:60px;object-fit:cover;border-radius:8px" onerror="this.src='assets/img/products/no-image.png'"/>
      <strong style="min-width:80px">${p.sku}</strong>
      <input value="${p.name}" style="flex:1"/>
      <input type="number" step="1" value="${p.price}" style="width:120px"/>
      <button class="btn ghost">Save</button>
    </div>`; wrap.appendChild(row);
  });
  const pays = await fetchLocal('payments.json');
  const pt = document.getElementById('paymentsTable');
  pt.innerHTML = '<tr><th>Timestamp</th><th>Invoice</th><th>Order</th><th>Payment ID</th><th>Email</th><th>SKU</th><th>Total</th><th>Actions</th></tr>' +
    pays.map(x=>`<tr><td>${x.timestamp}</td><td>${x.invoiceNo}</td><td>${x.orderId}</td><td>${x.pf_payment_id}</td><td>${x.email}</td><td>${x.sku}</td><td>R${x.totalInclVAT}</td><td><button class='btn' onclick="alert('Resend Invoice stub')">Resend Invoice</button></td></tr>`).join('');
  const pc = await fetchLocal('pricechanges.json');
  const pct = document.getElementById('priceChangesTable');
  pct.innerHTML = '<tr><th>Timestamp</th><th>SKU</th><th>Old</th><th>New</th><th>Changed By</th><th>IP</th></tr>' +
    pc.map(x=>`<tr><td>${x.timestamp}</td><td>${x.sku}</td><td>R${x.oldPrice}</td><td>R${x.newPrice}</td><td>${x.changedBy}</td><td>${x.sourceIP}</td></tr>`).join('');
}
ensureAuth();
