
/* Admin dashboard logic */
(async function(){
  const cfg = await fetch('config.json').then(r=>r.json());
  const q = s=>document.querySelector(s);

  // Simple passphrase gate (replace with proper JWT later)
  const login = q('#login');
  const input = q('#passphrase');
  q('#loginBtn').addEventListener('click',()=>{
    if(input.value === cfg.adminPassphrase){
      login.style.display='none';
    } else {
      alert('Incorrect passphrase');
    }
  });

  async function fetchSheet(action){
    const url = cfg.appsScriptUrl + '?action=' + encodeURIComponent(action) + '&sheetId=' + encodeURIComponent(cfg.sheetId);
    const res = await fetch(url);
    if(!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }
  async function postSheet(action, payload){
    const res = await fetch(cfg.appsScriptUrl, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action, sheetId:cfg.sheetId, payload})});
    if(!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  // Products tab
  async function loadProducts(){
    try{
      const products = await fetchSheet('products');
      const tbody = q('#prod-tbody');
      tbody.innerHTML = products.map(p=>`
        <tr>
          <td><input class="input" value="${p.sku}" disabled></td>
          <td><input class="input" value="${p.name}"></td>
          <td><input class="input" type="number" step="0.01" value="${p.price}"></td>
          <td><input class="input" value="${p.summary||''}"></td>
          <td><input class="input" value="${p.imageUrl||''}"></td>
          <td><input class="input" value="${p.active!==false}"></td>
          <td><button class="btn">Save</button></td>
        </tr>
      `).join('');
      tbody.querySelectorAll('button').forEach((btn,i)=>{
        btn.addEventListener('click', async ()=>{
          const row = btn.closest('tr');
          const cells = row.querySelectorAll('input');
          const payload = {sku:cells[0].value, name:cells[1].value, price:parseFloat(cells[2].value), summary:cells[3].value, imageUrl:cells[4].value, active:(cells[5].value==='true'||cells[5].checked)};
          try{ await postSheet('updateProduct', payload); toast('Saved ' + payload.sku); }
          catch(e){ toast('Save failed: ' + e.message); }
        });
      });
    }catch(e){ toast('Load failed: ' + e.message); }
  }

  // Gallery tab: drag & drop (metadata only; actual upload handled by Apps Script)
  function setupGallery(){
    const drop = q('#gallery-drop');
    drop.addEventListener('dragover', e=>{ e.preventDefault(); drop.style.outline='2px dashed #0a60ff'; });
    drop.addEventListener('dragleave', ()=> drop.style.outline='none');
    drop.addEventListener('drop', async e=>{
      e.preventDefault();
      drop.style.outline='none';
      const files = Array.from(e.dataTransfer.files);
      const items = files.map(f=>({name:f.name, size:f.size, type:f.type}));
      try{
        await postSheet('galleryUpload', {items});
        toast('Uploaded ' + items.length + ' items (metadata). Configure Apps Script to store files.');
      }catch(err){ toast('Upload failed'); }
    });
  }

  async function loadPayments(){
    try{
      const rows = await fetchSheet('payments');
      const tbody = q('#pay-tbody');
      tbody.innerHTML = rows.map(r=>`<tr><td>${r.Timestamp||r.timestamp||''}</td><td>${r.InvoiceNo||''}</td><td>${r.OrderID||''}</td><td>${r.pf_payment_id||''}</td><td>${r.Email||''}</td><td>${r.SKU||''}</td><td>${r.TotalInclVAT||''}</td><td>${r.ReleasedAt||''}</td></tr>`).join('');
    }catch(e){ toast('Payments load failed'); }
  }

  async function loadPriceChanges(){
    try{
      const rows = await fetchSheet('priceChanges');
      const tbody = q('#log-tbody');
      tbody.innerHTML = rows.map(r=>`<tr><td>${r.Timestamp||''}</td><td>${r.SKU||''}</td><td>${r.OldPrice||''}</td><td>${r.NewPrice||''}</td><td>${r.ChangedBy||''}</td><td>${r.SourceIP||''}</td></tr>`).join('');
    }catch(e){ toast('Logs load failed'); }
  }

  function toast(msg){
    const t = q('#toast'); t.textContent = msg; t.style.display='block'; setTimeout(()=> t.style.display='none', 3000);
  }

  // Init
  loadProducts();
  setupGallery();
  loadPayments();
  loadPriceChanges();
})();
