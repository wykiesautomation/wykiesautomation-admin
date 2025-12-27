
// Wykies Automation v4.3 — Admin Prototype JS (Dark)
const PRODUCTS_URL = '../products.json';
const PAYMENTS_URL = '../payments.json';
const PRICECHANGES_URL = '../pricechanges.json';

const q = sel => document.querySelector(sel);

async function fetchJSON(url){ const r = await fetch(url); return r.json(); }

function toast(msg){ const t = q('#toast'); t.textContent = msg; t.style.display='block'; setTimeout(()=>t.style.display='none',2000); }

async function initAdmin(){
  const products = await fetchJSON(PRODUCTS_URL);
  const tbody = q('#tbl-products tbody');
  products.forEach(p=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${p.sku}</td><td>${p.name}</td><td>R${p.price.toLocaleString('en-ZA')}</td><td>${p.image}</td><td>${p.trialUrl||''}</td><td>${p.docUrl||''}</td><td>${p.active? 'Yes':'No'}</td>`;
    tbody.appendChild(tr);
  });
  const payments = await fetchJSON(PAYMENTS_URL);
  const ptbody = q('#tbl-payments tbody');
  payments.forEach(pay=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${pay.timestamp}</td><td>${pay.invoiceNo}</td><td>${pay.orderId}</td><td>${pay.pf_payment_id}</td><td>${pay.email}</td><td>${pay.sku}</td><td>R${pay.totalInclVAT.toLocaleString('en-ZA')}</td><td>${pay.releasedAt}</td><td><button class='btn outline btn-resend'>Resend Invoice</button></td>`;
    ptbody.appendChild(tr);
  });
  ptbody.addEventListener('click',e=>{
    if(e.target.classList.contains('btn-resend')){ toast('Invoice re-sent (prototype)'); }
  });
  const changes = await fetchJSON(PRICECHANGES_URL);
  const ctbody = q('#tbl-changes tbody');
  changes.forEach(pc=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${pc.timestamp}</td><td>${pc.sku}</td><td>R${pc.oldPrice}</td><td>R${pc.newPrice}</td><td>${pc.changedBy}</td><td>${pc.sourceIP}</td><td>${pc.changeNote||''}</td>`;
    ctbody.appendChild(tr);
  });
}

export { initAdmin };
