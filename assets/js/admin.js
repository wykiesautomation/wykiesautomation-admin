
(function(){
  const state = {cfg:null, role:null, token:null, products:[], gallery:[], payments:[], priceLog:[]};
  const qs = sel=>document.querySelector(sel);

  async function loadCfg(){
    const res = await fetch('/config.json');
    state.cfg = await res.json();
  }

  function show(el, yes){ el.classList.toggle('hidden', !yes); }
  function toast(msg){ alert(msg); }

  async function login(){
    const pass = qs('#passphrase').value; const role = qs('#role').value;
    const r = await fetch(state.cfg.appScriptUrl+'?action=login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({passphrase:pass, role})});
    const data = await r.json();
    if(data.ok){ state.role = role; state.token = data.token; qs('#userRole').textContent = role.toUpperCase(); show(qs('#loginPanel'), false); show(qs('#dashboard'), true); loadAll(); }
    else{ qs('#loginMsg').textContent = data.message||'Login failed'; }
  }

  async function loadAll(){
    const base = state.cfg.appScriptUrl;
    const headers = state.token? {'X-Auth': state.token} : {};
    const [products, gallery, payments, priceLog] = await Promise.all([
      fetch(base+'?action=products',{headers}).then(r=>r.json()).catch(()=>[]),
      fetch(base+'?action=gallery',{headers}).then(r=>r.json()).catch(()=>[]),
      fetch(base+'?action=payments',{headers}).then(r=>r.json()).catch(()=>[]),
      fetch(base+'?action=priceLog',{headers}).then(r=>r.json()).catch(()=>[]),
    ]);
    state.products = products||[]; state.gallery = gallery||[]; state.payments = payments||[]; state.priceLog = priceLog||[];
    renderProducts(); renderGallery(); renderPayments(); renderPriceLog();
  }

  function renderProducts(){
    const grid = qs('#productsGrid'); grid.innerHTML='';
    const header = document.createElement('div'); header.className='row header'; header.innerHTML='<div>SKU</div><div>Name</div><div>Price</div><div>Summary</div><div>Image</div><div>Docs</div><div>Active</div>';
    grid.appendChild(header);
    state.products.forEach((p,i)=>{
      const row = document.createElement('div'); row.className='row';
      row.innerHTML = `
        <input value="${p.sku}" data-i="${i}" data-k="sku" ${state.role==='viewer'?'disabled':''} />
        <input value="${p.name||''}" data-i="${i}" data-k="name" ${state.role==='viewer'?'disabled':''} />
        <input value="${p.price||''}" data-i="${i}" data-k="price" type="number" step="0.01" ${state.role==='viewer'?'disabled':''} />
        <input value="${p.summary||''}" data-i="${i}" data-k="summary" ${state.role==='viewer'?'disabled':''} />
        <input value="${p.imageUrl||''}" data-i="${i}" data-k="imageUrl" ${state.role==='viewer'?'disabled':''} />
        <input value="${p.docUrl||''}" data-i="${i}" data-k="docUrl" ${state.role==='viewer'?'disabled':''} />
        <input type="checkbox" ${p.active!==false?'checked':''} data-i="${i}" data-k="active" ${state.role==='viewer'?'disabled':''} />`;
      grid.appendChild(row);
    });
    grid.addEventListener('input', (e)=>{
      const t=e.target; const i=Number(t.dataset.i); const k=t.dataset.k; if(k==='active') state.products[i][k]=t.checked; else state.products[i][k]=t.value; });
    qs('#saveProducts').onclick = saveProducts;
    if(state.role==='viewer') qs('#saveProducts').disabled=true;
  }

  async function saveProducts(){
    const r = await fetch(state.cfg.appScriptUrl+'?action=saveProducts', {method:'POST', headers:{'Content-Type':'application/json','X-Auth':state.token}, body: JSON.stringify({products: state.products})});
    const data = await r.json(); toast(data.message||'Saved');
  }

  function renderGallery(){
    const t = qs('#galleryTable'); t.innerHTML='';
    state.gallery.forEach((g,i)=>{
      const row = document.createElement('div'); row.className='row';
      row.innerHTML = `<div>${i+1}</div><div>${g.caption||''}</div><div>${g.imageUrl||''}</div>`;
      t.appendChild(row);
    });
    qs('#uploadGallery').onclick = async ()=>{
      if(state.role!=='admin') return toast('Viewer cannot upload');
      const file = qs('#galleryFile').files[0]; const caption = qs('#galleryCaption').value;
      if(!file) return toast('Choose a PNG/WebP file');
      if(file.size>200*1024) return toast('Max 200KB');
      const b64 = await file.arrayBuffer().then(b=>btoa(String.fromCharCode(...new Uint8Array(b))));
      const r = await fetch(state.cfg.appScriptUrl+'?action=uploadGallery',{method:'POST', headers:{'Content-Type':'application/json','X-Auth':state.token}, body: JSON.stringify({filename:file.name, caption, data:b64})});
      const data = await r.json(); toast(data.message||'Uploaded'); loadAll();
    };
  }

  function renderPayments(){
    const t = qs('#paymentsTable'); t.innerHTML='';
    const term = (qs('#paymentSearch').value||'').toLowerCase();
    state.payments.filter(p=>JSON.stringify(p).toLowerCase().includes(term)).forEach(p=>{
      const row = document.createElement('div'); row.className='row';
      row.innerHTML = `<div>${p.timestamp||''}</div><div>${p.invoiceNo||''}</div><div>${p.pf_payment_id||''}</div><div>${p.email||''}</div><div>${p.sku||''}</div><div>${p.totalInclVAT||''}</div><div><button data-inv="${p.invoiceNo}">Resend Invoice</button></div>`;
      t.appendChild(row);
    });
    t.onclick = async (e)=>{
      if(e.target.tagName==='BUTTON'){
        const inv = e.target.getAttribute('data-inv');
        const r = await fetch(state.cfg.appScriptUrl+'?action=resendInvoice', {method:'POST', headers:{'Content-Type':'application/json','X-Auth':state.token}, body: JSON.stringify({invoiceNo: inv})});
        const data = await r.json(); toast(data.message||'Sent');
      }
    };
    qs('#paymentSearch').oninput = renderPayments;
  }

  function renderPriceLog(){
    const t = qs('#priceLogTable'); t.innerHTML='';
    const header = document.createElement('div'); header.className='row header'; header.innerHTML='<div>Time</div><div>SKU</div><div>Old</div><div>New</div><div>By</div><div>IP</div><div></div>';
    t.appendChild(header);
    state.priceLog.forEach(l=>{
      const row = document.createElement('div'); row.className='row';
      row.innerHTML = `<div>${l.timestamp||''}</div><div>${l.sku||''}</div><div>${l.oldPrice||''}</div><div>${l.newPrice||''}</div><div>${l.changedBy||''}</div><div>${l.sourceIP||''}</div><div></div>`;
      t.appendChild(row);
    });
  }

  document.addEventListener('DOMContentLoaded', async ()=>{
    await loadCfg();
    qs('#loginBtn').onclick = login;
    document.querySelectorAll('nav.tabs button').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        document.querySelectorAll('.tab').forEach(t=>t.classList.add('hidden'));
        document.getElementById('tab-'+btn.dataset.tab).classList.remove('hidden');
      });
    });
  });
})();
