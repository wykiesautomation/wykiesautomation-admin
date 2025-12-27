(async function(){
  const cfg = await fetch('../config.json').then(r=>r.json()).catch(()=>({env:'dev'}));
  document.getElementById('envLabel').textContent = cfg.env;

  const tabs = document.querySelectorAll('.tab');
  const panels = {
    dashboard: document.getElementById('panel-dashboard'),
    products: document.getElementById('panel-products'),
    gallery: document.getElementById('panel-gallery'),
    payments: document.getElementById('panel-payments'),
    logs: document.getElementById('panel-logs'),
  };
  tabs.forEach(t=> t.addEventListener('click', ()=>{
    tabs.forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    Object.values(panels).forEach(p=>p.hidden=true);
    panels[t.dataset.tab].hidden=false;
  }));

  const productsDev = [
    { sku:'WA-01', name:'3D Printer Control V1', price:1499, active:true },
    { sku:'WA-02', name:'Plasma Cutter Control V1', price:2499, active:true },
    { sku:'WA-03', name:'ECU/TCU Control System V1', price:6499, active:true },
  ];
  const paymentsDev = [
    { timestamp:'2025-12-24T10:00:00+02:00', invoiceNo:'INV-001234', pf_payment_id:'1234567', email:'buyer@example.com', sku:'WA-01', totalInclVAT:1499 }
  ];
  const logsDev = ['2025-12-26T09:00:00 Price change WA-01: 1499 -> 1599 (admin)'];

  async function api(route){
    if (cfg.env !== 'prod'){
      switch(route){
        case 'products': return productsDev;
        case 'gallery': return Array.from({length:6}, (_,i)=>({url:`../assets/img/gallery-0${i+1}.png`, caption:`Gallery ${i+1}`}));
        case 'payments': return paymentsDev;
        case 'logs': return logsDev;
      }
    }
    const url = cfg.apps_script_url + '?route=' + route;
    const res = await fetch(url, { cache: 'no-store' });
    return await res.json();
  }

  const prods = await api('products');
  document.getElementById('kpiProducts').textContent = prods.length;
  const pays = await api('payments');
  document.getElementById('kpiPayments').textContent = pays.filter(p=> new Date(p.timestamp).toDateString() === new Date().toDateString()).length;
  document.getElementById('kpiPriceChange').textContent = logsDev[0] || '—';

  const tbodyP = document.querySelector('#tableProducts tbody');
  tbodyP.innerHTML = prods.map(p=>`<tr><td>${p.sku}</td><td>${p.name}</td><td>R${p.price}</td><td>${p.active?'Yes':'No'}</td></tr>`).join('');

  const gallery = await api('gallery');
  const grid = document.getElementById('galleryGrid');
  grid.innerHTML = gallery.map(g=>`<img src="${g.url}" alt="${g.caption}">`).join('');

  const tbodyPay = document.querySelector('#tablePayments tbody');
  tbodyPay.innerHTML = pays.map(p=>`<tr>
    <td>${p.timestamp}</td>
    <td>${p.invoiceNo}</td>
    <td>${p.pf_payment_id}</td>
    <td>${p.email}</td>
    <td>${p.sku}</td>
    <td>R${p.totalInclVAT}</td>
    <td><button data-pfid="${p.pf_payment_id}" class="btn">Resend Invoice</button></td>
  </tr>`).join('');

  tbodyPay.addEventListener('click', async (e)=>{
    if (e.target.matches('button[data-pfid]')){
      const pfid = e.target.getAttribute('data-pfid');
      if (cfg.env !== 'prod'){ alert('Dev mode: would resend invoice for ' + pfid); return; }
      try{
        const res = await fetch(cfg.apps_script_url + '?route=resendInvoice', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ pf_payment_id: pfid }) });
        const data = await res.json();
        alert(data.message || 'Resent');
      }catch(err){ alert('Failed: ' + err.message); }
    }
  });

  const logs = await api('logs');
  document.getElementById('panel-logs').querySelector('#logs').textContent = Array.isArray(logs)? logs.join('
') : JSON.stringify(logs, null, 2);
})();
