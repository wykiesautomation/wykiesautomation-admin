(function(){
Promise.all([fetch('config.json').then(r=>r.json())]).then(([cfg])=>{
  const userEl=document.getElementById('user'); userEl.textContent='Signed-in: (demo) wykiesautomation@gmail.com';
  // Fetch payments (requires Apps Script endpoint op=payments returning JSON array)
  fetch(`${cfg.appScriptUrl}?op=payments`).then(r=>r.json()).then(list=>{
    const tbody=document.querySelector('#paymentsTbl tbody');
    (list||[]).forEach(p=>{
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${p.Timestamp||''}</td><td>${p.InvoiceNo||''}</td><td>${p.OrderID||''}</td><td>${p.pf_payment_id||''}</td><td>${p.Email||''}</td><td>${p.SKU||''}</td><td>${p.TotalInclVAT||''}</td>`;
      const td=document.createElement('td');
      const btn=document.createElement('button'); btn.className='btn brand'; btn.textContent='Resend Invoice';
      btn.onclick=()=>{
        fetch(`${cfg.appScriptUrl}?op=resendInvoice`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pf_payment_id:p.pf_payment_id, invoice:p.InvoiceNo, email:p.Email})})
          .then(r=>r.json()).then(()=>alert('Invoice re-sent')).catch(()=>alert('Failed to resend invoice'))
      };
      td.appendChild(btn); tr.appendChild(td); tbody.appendChild(tr);
    })
  }).catch(()=>{
    const tbody=document.querySelector('#paymentsTbl tbody');
    const tr=document.createElement('tr'); tr.innerHTML='<td colspan="8">No payments API yet. Wire Apps Script op=payments.</td>'; tbody.appendChild(tr);
  })
});
})();