
(async function(){
  const cfg = await getCfg();
  let items=[];
  async function load(){
    try{ const res = await fetch(cfg.appsScriptUrl + '?action=pricechanges'); items = await res.json(); }
    catch(e){ items = [{timestamp:'2025-12-26T09:00:00+02:00', sku:'WA-01', oldPrice:1499.00, newPrice:1599.00, changedBy:'admin', sourceIP:'203.0.113.10'}]; }
    const tbody = document.querySelector('#pricechanges-table tbody'); tbody.innerHTML='';
    items.forEach(x=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${x.timestamp}</td>
        <td>${x.sku}</td>
        <td>R${(x.oldPrice||0).toLocaleString('en-ZA')}</td>
        <td>R${(x.newPrice||0).toLocaleString('en-ZA')}</td>
        <td>${x.changedBy}</td>
        <td>${x.sourceIP}</td>`;
      tbody.appendChild(tr);
    });
  }
  load();
})();
