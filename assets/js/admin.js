(function(){
  // Tabs
  const tabs=document.querySelectorAll('.tabs button');
  tabs.forEach(b=>b.addEventListener('click',()=>{
    tabs.forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    document.getElementById('tab-'+b.dataset.tab).classList.add('active');
  }));
  // Theme toggle
  const THEME_KEY='wa_theme'; const body=document.body;
  const saved=localStorage.getItem(THEME_KEY);
  body.classList.toggle('theme-light', saved==='light');
  body.classList.toggle('theme-dark', saved!=='light');
  const btn=document.getElementById('toggleTheme');
  if(btn){ btn.addEventListener('click',()=>{ const isLight=body.classList.contains('theme-light'); body.classList.toggle('theme-light', !isLight); body.classList.toggle('theme-dark', isLight); localStorage.setItem(THEME_KEY, isLight?'dark':'light'); }); }
  // Load shared data from PUBLIC site
  async function load(){
    const prod= await fetch('https://wykiesautomation.co.za/products.json').then(r=>r.json());
    renderProductsTable(prod);
    renderAdminGallery(prod);
    renderPaymentsLog([]);
    renderPriceLog([]);
  }
  function renderProductsTable(items){
    const t=document.getElementById('products-table');
    t.innerHTML='<tr><th>SKU</th><th>Name</th><th>Price (VAT incl)</th><th>Active</th></tr>' + items.map(p=>`<tr><td>${p.sku}</td><td contenteditable="true">${p.name}</td><td contenteditable="true">${p.price}</td><td><input type="checkbox" ${p.active?'checked':''}></td></tr>`).join('');
  }
  function renderAdminGallery(items){
    const g=document.getElementById('admin-gallery');
    g.innerHTML=items.map(p=>`<div class="card"><img src="https://wykiesautomation.co.za/${p.image}" alt="${p.name}"/><div class="pad"><h4>${p.name}</h4></div></div>`).join('');
  }
  function renderPaymentsLog(rows){ const div=document.getElementById('payments-log'); div.innerHTML='<div class="row header">Timestamp | InvoiceNo | OrderID | Email | SKU | TotalInclVAT</div>'; }
  function renderPriceLog(rows){ const div=document.getElementById('price-log'); div.innerHTML='<div class="row header">Timestamp | SKU | OldPrice | NewPrice | ChangedBy | SourceIP</div>'; }
  load();
})();