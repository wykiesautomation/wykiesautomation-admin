
(async function(){
  const cfg = await getCfg();
  let items=[];
  async function load(){
    try{ const res = await fetch(cfg.appsScriptUrl + '?action=payments'); items = await res.json(); }
    catch(e){ items = [{timestamp:'2025-12-24T10:00:00+02:00', invoiceNo:'INV-2025-00001', orderId:'ORD-abc123', pf_payment_id:'1234567', email:'buyer@example.com', sku:'WA-01', totalInclVAT:1499.00}]; }
    render();
  }
  function render(){
    const tbody = document.querySelector('#payments-table tbody'); tbody.innerHTML='';
    const q = (document.getElementById('pay-search').value||'').toLowerCase();
    items.filter(x=>!q || x.email.toLowerCase().includes(q) || x.invoiceNo.toLowerCase().includes(q) || x.sku.toLowerCase().includes(q))
      .forEach(x=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${x.timestamp}</td>
          <td>${x.invoiceNo}</td>
          <td>${x.orderId}</td>
          <td>${x.pf_payment_id}</td>
          <td>${x.email}</td>
          <td>${x.sku}</td>
          <td>R${(x.totalInclVAT||0).toLocaleString('en-ZA')}</td>
          <td><button class="btn" onclick="resendInvoice('${x.invoiceNo}')">Resend Invoice</button></td>`;
        tbody.appendChild(tr);
      });
  }
  window.resendInvoice = async function(inv){
    try{ const res = await fetch(cfg.appsScriptUrl + '?action=resend_invoice&invoiceNo=' + encodeURIComponent(inv)); const data = await res.json(); toast(data.message||'Invoice resent'); }
    catch(e){ toast('Resend failed'); }
  }
  document.getElementById('pay-search').addEventListener('input', render);
  load();
})();
