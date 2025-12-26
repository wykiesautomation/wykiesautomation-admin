
(function(){
  const cfg = window.__CONFIG__;
  let token = null;
  function q(id){ return document.getElementById(id); }
  window.showTab = function(id){
    document.querySelectorAll('.tab').forEach(el=>el.style.display='none');
    q(id).style.display='block';
    if(id==='products') loadProducts();
    if(id==='payments') loadPayments();
    if(id==='invoices') loadInvoices();
    if(id==='logs') loadLogs();
    if(id==='settings') loadSettings();
    if(id==='dashboard') loadDashboard();
  }
  window.adminLogin = async function(){
    const email = prompt('Enter Google account email'); if(!email) return;
    const res = await fetch(`${cfg.APPS_SCRIPT_BASE}?op=adminLogin&email=${encodeURIComponent(email)}`);
    const data = await res.json();
    if(data && data.token){ token = data.token; q('login').style.display='none'; q('content').style.display='flex'; q('user').textContent = email; showTab('dashboard'); }else{ alert('Not allowed'); }
  }
  async function api(op, params={}){
    const qs = new URLSearchParams({op, ...params}).toString();
    const res = await fetch(`${cfg.APPS_SCRIPT_BASE}?${qs}`, { headers: token?{Authorization:`Bearer ${token}`}:{}});
    return res.json();
  }
  async function loadDashboard(){ const s = await api('stats'); q('dashboard').innerHTML = `<h2>Dashboard</h2><div>Active Products: <span class='badge'>${s.activeProducts||0}</span></div><div>Payments (24h): <span class='badge'>${s.payments24h||0}</span></div>`; }
  async function loadProducts(){ const d = await api('products'); const rows=(d.products||[]).map(p=>`<tr><td>${p.sku}</td><td>${p.name}</td><td>R${p.price}</td><td>${p.active}</td><td>${p.imageUrl||''}</td><td>${p.docUrl||''}</td><td>${p.trialUrl||''}</td><td><button onclick="toggleActive('${p.sku}', ${String(p.active).toLowerCase()!=='true'})">${String(p.active).toLowerCase()==='true'?'Disable':'Enable'}</button></td></tr>`).join(''); q('products').innerHTML = `<h2>Products</h2><table class='table'><thead><tr><th>SKU</th><th>Name</th><th>Price</th><th>Active</th><th>Image</th><th>Docs</th><th>Trial</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table>`; }
  window.toggleActive = async function(sku, active){ await api('setActive',{sku, active}); loadProducts(); }
  async function loadPayments(){ const d = await api('payments'); const rows=(d.records||[]).map(r=>`<tr><td>${r.Timestamp}</td><td>${r.InvoiceNo}</td><td>${r.OrderID||''}</td><td>${r.pf_payment_id}</td><td>${r.Email}</td><td>${r.SKU}</td><td>${r.TotalInclVAT}</td><td>${r.ReleasedAt||''}</td><td><button onclick="resend('${r.InvoiceNo}','${r.Email}')">Re-send Invoice</button></td></tr>`).join(''); q('payments').innerHTML = `<h2>Payments</h2><table class='table'><thead><tr><th>Timestamp</th><th>Invoice</th><th>Order</th><th>PF ID</th><th>Email</th><th>SKU</th><th>Total (incl VAT)</th><th>Released</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table>`; }
  window.resend = async function(inv,email){ const ok = await api('resendInvoice',{invoice:inv,email}); alert(ok && ok.status ? ok.status : 'Done'); }
  async function loadInvoices(){ const qinv = prompt('Enter invoice number (e.g., INV-00001)'); if(!qinv) return; const d = await api('invoice',{invoice:qinv}); q('invoices').innerHTML = `<h2>Invoice</h2><div>${JSON.stringify(d)}</div>`; }
  async function loadLogs(){ const d = await api('logs'); const rows=(d.records||[]).map(r=>`<tr><td>${r.Timestamp}</td><td>${r.Event}</td><td>${r.SKU||''}</td><td>${r.User||''}</td><td>${r.Notes||''}</td></tr>`).join(''); q('logs').innerHTML = `<h2>Logs</h2><table class='table'><thead><tr><th>Timestamp</th><th>Event</th><th>SKU</th><th>User</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table>`; }
  async function loadSettings(){ const d = await api('settings'); q('settings').innerHTML = `<h2>Settings</h2><div>Environment: <span class='badge'>${d.env||'sandbox'}</span></div><div>notify_url: <code>${d.notify_url||''}</code></div>`; }
})();
