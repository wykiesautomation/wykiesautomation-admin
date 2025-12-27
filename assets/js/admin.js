
(async function(){
  const cfg = await (await fetch('../config.json')).json();
  function showTab(id){ ['products','gallery','payments','logs'].forEach(t=>{ document.getElementById('tab-'+t).style.display = (t===id)?'block':'none'; }); }
  window.showTab = showTab;
  async function fetchJSON(path){ try{ const r = await fetch(`${cfg.appsScriptUrl}?path=${encodeURIComponent(path)}`); return await r.json(); } catch(e){ console.warn('fetch failed', e); return []; } }
  const products = await fetchJSON('products');
  document.getElementById('tab-products').innerHTML = `
    <h2>Products</h2>
    <table style="width:100%"><thead><tr><th>SKU</th><th>Name</th><th>Price (incl VAT)</th><th>Image</th><th>Active</th><th>Save</th></tr></thead>
    <tbody>${products.map(p=>`<tr>
      <td>${p.sku}</td>
      <td><input value="${p.name}"/></td>
      <td><input type="number" step="0.01" value="${p.price}"/></td>
      <td><img src="../assets/img/${p.imageFile || p.sku.toLowerCase() + '.png'}" alt="${p.name}" style="width:80px;height:60px;object-fit:cover"/></td>
      <td><input type="checkbox" ${p.active!==false?'checked':''}/></td>
      <td><button class="btn secondary">Save</button></td>
    </tr>`).join('')}</tbody></table>`;
  const gallery = await fetchJSON('gallery');
  document.getElementById('tab-gallery').innerHTML = `<h2>Gallery</h2><div class="grid">${gallery.map(i=>`<div class="card"><img src="../assets/img/${i.file}" alt="${i.alt}"/><p>${i.caption||''}</p></div>`).join('')}</div>`;
  const payments = await fetchJSON('payments');
  document.getElementById('tab-payments').innerHTML = `
    <h2>Payments</h2>
    <table style="width:100%"><thead><tr><th>Timestamp</th><th>InvoiceNo</th><th>OrderID</th><th>pf_payment_id</th><th>Email</th><th>SKU</th><th>TotalInclVAT</th><th>Actions</th></tr></thead>
    <tbody>${payments.map(x=>`<tr>
      <td>${x.timestamp||''}</td><td>${x.invoiceNo||''}</td><td>${x.orderId||''}</td><td>${x.pf_payment_id||''}</td><td>${x.email||''}</td><td>${x.sku||''}</td><td>${x.totalInclVAT||''}</td>
      <td><button class="btn secondary" onclick='resendInvoice("${x.invoiceNo}")'>Resend Invoice</button></td>
    </tr>`).join('')}</tbody></table>`;
  const changes = await fetchJSON('pricechanges');
  document.getElementById('tab-logs').innerHTML = `<h2>Price Change Log</h2>
    <table style="width:100%"><thead><tr><th>Timestamp</th><th>SKU</th><th>Old</th><th>New</th><th>ChangedBy</th><th>SourceIP</th></tr></thead>
    <tbody>${changes.map(c=>`<tr><td>${c.timestamp||''}</td><td>${c.sku||''}</td><td>${c.oldPrice||''}</td><td>${c.newPrice||''}</td><td>${c.changedBy||''}</td><td>${c.sourceIP||''}</td></tr>`).join('')}</tbody></table>`;
  window.resendInvoice = function(inv){ alert('Resend stub for '+inv+' — implement server-side email with Apps Script'); };
})();
