(function(){
  const tabs = document.querySelectorAll('.tabs button');
  tabs.forEach(b=>b.addEventListener('click',()=>{
    tabs.forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    document.getElementById('tab-'+b.dataset.tab).classList.add('active');
  }));
  async function load(cfg){
    const prod = await fetch('../products.json').then(r=>r.json());
    renderProductsTable(prod);
    renderAdminGallery(prod);
    renderPaymentsLog([]);
    renderPriceLog([]);
  }
  function renderProductsTable(items){
    const t = document.getElementById('products-table');
    t.innerHTML = '<tr><th>SKU</th><th>Name</th><th>Price (VAT incl)</th><th>Active</th></tr>'+
      items.map(p=>`<tr><td>${p.sku}</td><td contenteditable="true">${p.name}</td><td contenteditable="true">${p.price}</td><td><input type="checkbox" ${p.active?'checked':''}></td></tr>`).join('');
  }
  function renderAdminGallery(items){
    const g = document.getElementById('admin-gallery');
    g.innerHTML = items.map(p=>`<div class="card"><img src="../${p.image}" alt="${p.name}"/><div class="pad"><h4>${p.name}</h4></div></div>`).join('');
  }
  function renderPaymentsLog(rows){
    const div = document.getElementById('payments-log');
    div.innerHTML = '<div class="row header">Timestamp | InvoiceNo | OrderID | Email | SKU | TotalInclVAT</div>';
  }
  function renderPriceLog(rows){
    const div = document.getElementById('price-log');
    div.innerHTML = '<div class="row header">Timestamp | SKU | OldPrice | NewPrice | ChangedBy | SourceIP</div>';
  }
  fetch('../config.json').then(r=>r.json()).then(load);
})();