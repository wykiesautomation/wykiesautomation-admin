
const admin = {
  cfg:null, products:[],
  init(){
    fetch('config.json').then(r=>r.json()).then(cfg=>{this.cfg=cfg; return fetch('../public/assets/data/products.json')})
      .then(r=>r.json()).then(items=>{this.products=items;});
  },
  login(){
    const pass = document.getElementById('pass').value;
    // WARNING: Demo-only client-side check; move to server-side (Apps Script / JWT)
    if(pass === 'Ford@20132016'){
      document.getElementById('login').style.display='none';
      document.getElementById('panel').style.display='block';
      this.renderTable();
    } else {
      alert('Incorrect passphrase');
    }
  },
  renderTable(){
    const t = document.getElementById('productsTable');
    const rows = this.products.map((p,i)=>{
      return `<tr>
        <td>${p.sku}</td>
        <td><input value="${p.name}" data-i="${i}" data-k="name"></td>
        <td><input type='number' value="${p.price}" data-i="${i}" data-k="price"></td>
        <td><input value="${p.imageUrl}" data-i="${i}" data-k="imageUrl"></td>
        <td><input value="${p.trialUrl}" data-i="${i}" data-k="trialUrl"></td>
        <td><input value="${p.docUrl}" data-i="${i}" data-k="docUrl"></td>
        <td><input type='checkbox' ${p.active?'checked':''} data-i="${i}" data-k="active"></td>
      </tr>`;
    }).join('');
    t.innerHTML = `<table class='card' style='width:100%'>
      <thead><tr><th>SKU</th><th>Name</th><th>Price</th><th>Image URL</th><th>Trial URL</th><th>Docs URL</th><th>Active</th></tr></thead>
      <tbody>${rows}</tbody></table>`;
    t.querySelectorAll('input').forEach(inp=>{
      inp.addEventListener('input', e=>{
        const i = +e.target.dataset.i; const k = e.target.dataset.k;
        if(e.target.type==='checkbox') this.products[i][k] = e.target.checked; else this.products[i][k] = e.target.value;
      })
    })
  },
  save(){
    const payload = {action:'saveProducts', products: this.products};
    fetch(this.cfg.appsScriptWebAppUrl, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)})
      .then(r=>r.json()).then(res=>{alert('Saved to Google Sheets.');})
      .catch(()=>{alert('Offline demo: changes not persisted. Configure Apps Script URL.')});
  }
};
admin.init();
