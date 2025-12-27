const state={cfg:null};
async function loadConfig(){const r=await fetch('config.json');return r.json()}
async function guard(cfg){if(!cfg.adminPassphrase) return true;const entered=localStorage.getItem('wykies_admin_pass')||prompt('Enter admin passphrase');if(!entered){alert('No passphrase');return false}if(entered!==cfg.adminPassphrase){alert('Incorrect passphrase');return false}localStorage.setItem('wykies_admin_pass',entered);return true}
async function fetchSheet(tab){const url=`${state.cfg.appsScriptUrl}?sheet=${encodeURIComponent(tab)}`;const r=await fetch(url);return r.json()}
function table(head, rows){return `<table style='width:100%;border-collapse:collapse'>${head}${rows}</table>`}
function ths(cols){return `<tr>${cols.map(c=>`<th style='text-align:left;border-bottom:1px solid #22304e;padding:6px'>${c}</th>`).join('')}</tr>`}
function tds(cols){return `<tr>${cols.map(c=>`<td style='border-bottom:1px solid #1b2744;padding:6px'>${c}</td>`).join('')}</tr>`}
async function init(){state.cfg=await loadConfig();const ok=await guard(state.cfg);if(!ok){document.body.innerHTML='<div class=hero><div class=panel><h1>Access denied</h1></div></div>';return}
  const prod=await fetchSheet('Products');
  document.getElementById('statProducts').textContent=prod.items?.length||0;
  document.getElementById('products').innerHTML=table(ths(['SKU','Name','Price','Active']), (prod.items||[]).map(p=>tds([p.sku,p.name,`R${(p.price||0).toLocaleString('en-ZA')}`,String(p.active)])).join(''));
  const pays=await fetchSheet('Payments');
  const today=new Date().toISOString().slice(0,10);
  document.getElementById('statPayments').textContent=(pays.items||[]).filter(x=> (x.timestamp||'').startsWith(today)).length;
  document.getElementById('payments').innerHTML=table(ths(['Time','Invoice','Order','Email','SKU','Total','Actions']), (pays.items||[]).map(x=>tds([x.timestamp,x.invoiceNo,x.orderId,x.email,x.sku,`R${(x.totalInclVAT||0).toLocaleString('en-ZA')}`,`<button class='btn' onclick="resendInvoice('${x.invoiceNo}')">Resend Invoice</button>`])).join(''));
  const logs=await fetchSheet('PriceChanges');
  document.getElementById('logs').innerHTML=table(ths(['Time','SKU','Old','New','By','IP']), (logs.items||[]).map(x=>tds([x.timestamp,x.sku,x.oldPrice,x.newPrice,x.changedBy,x.sourceIP])).join(''));
}
async function resendInvoice(inv){try{await fetch(`${state.cfg.appsScriptUrl}?action=resendInvoice&invoice=${encodeURIComponent(inv)}`);alert('Resend requested for '+inv)}catch(e){alert('Failed to request resend')}}
function logout(){localStorage.removeItem('wykies_admin_pass');location.reload()}
init();
