
async function loadPayments(){
  const itnUrl = document.getElementById('itnUrl').value.trim();
  const token = document.getElementById('token').value.trim();
  if(!itnUrl){ alert('Enter Apps Script Web App URL'); return; }
  const url = new URL(itnUrl);
  url.searchParams.set('action','list_payments');
  url.searchParams.set('token', token);
  const res = await fetch(url.toString());
  const data = await res.json();
  const tb = document.querySelector('#grid tbody');
  tb.innerHTML = '';
  (data.rows||[]).reverse().forEach(r=>{
    const tr = document.createElement('tr');
    const td = (t)=>{const x=document.createElement('td'); x.textContent=t||''; return x;}
    tr.appendChild(td(new Date(r.Timestamp).toLocaleString()));
    tr.appendChild(td(r.InvoiceNo));
    tr.appendChild(td(r.OrderID));
    tr.appendChild(td(r.pf_payment_id));
    tr.appendChild(td(r.Email));
    tr.appendChild(td(r.SKU));
    const tdc = document.createElement('td'); tdc.textContent=r.TotalInclVAT; tr.appendChild(tdc);
    const act = document.createElement('td');
    const btn = document.createElement('button'); btn.className='btn btn-secondary'; btn.textContent='Resend Invoice';
    btn.onclick = ()=> resendInvoice(itnUrl, token, r.OrderID, r.Email);
    act.appendChild(btn);
    tr.appendChild(act);
    tb.appendChild(tr);
  });
}

async function resendInvoice(itnUrl, token, orderId, email){
  const url = new URL(itnUrl);
  url.searchParams.set('action','resend_invoice');
  url.searchParams.set('token', token);
  url.searchParams.set('orderId', orderId);
  url.searchParams.set('email', email||'');
  const res = await fetch(url.toString(), { method:'POST' });
  const data = await res.json();
  if(data.ok){ alert('Invoice re-sent.'); } else { alert('Failed: '+(data.error||'unknown')); }
}
