
(async function(){
  const cfg = await getCfg();
  let products = [];
  async function load(){
    try{
      const res = await fetch(cfg.appsScriptUrl + '?action=products');
      products = await res.json();
    }catch(e){
      products = [
        {sku:'WA-01', name:'3D Printer Control V1', price:1499.00, summary:'Starter kit', imageUrl:'../assets/img/products/wa-01.png', active:true},
        {sku:'WA-02', name:'Plasma Cutter Control V1', price:2499.00, summary:'Precision plasma control', imageUrl:'../assets/img/products/wa-02.png', active:true}
      ];
    }
    render();
  }
  function render(){
    const tbody = document.querySelector('#products-table tbody');
    tbody.innerHTML = '';
    products.forEach((p,i)=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.sku}</td>
        <td contenteditable="true">${p.name}</td>
        <td contenteditable="true">${p.price}</td>
        <td contenteditable="true">${p.summary||''}</td>
        <td><img src="${p.imageUrl}" alt="${p.name}" style="width:80px; height:60px; object-fit:cover;"/></td>
        <td><input type="checkbox" ${p.active?'checked':''} data-index="${i}"/></td>`;
      tbody.appendChild(tr);
    });
  }
  window.saveProducts = async function(){
    const rows = Array.from(document.querySelectorAll('#products-table tbody tr'));
    const updated = rows.map((tr,idx)=>{
      const tds = tr.querySelectorAll('td');
      return {
        sku: tds[0].textContent.trim(),
        name: tds[1].textContent.trim(),
        price: parseFloat(tds[2].textContent.trim()),
        summary: tds[3].textContent.trim(),
        imageUrl: products[idx].imageUrl,
        active: tr.querySelector('input[type=checkbox]').checked
      };
    });
    try{
      const res = await fetch(cfg.appsScriptUrl + '?action=save_products', {method:'POST', body: JSON.stringify(updated)});
      const data = await res.json();
      toast(data.message||'Saved');
    }catch(e){ toast('Save failed'); }
  }
  load();
})();
