
let ID_TOKEN = null;
let USER_EMAIL = null;

function showToast(msg, type='info'){
  const t = document.getElementById('toast');
  t.className = 'toast show ' + (type==='success'?'success': type==='error'?'error':'');
  t.textContent = msg;
  setTimeout(()=>{ t.className = 'toast'; }, 2500);
}

function signOut(){
  ID_TOKEN = null; USER_EMAIL = null;
  document.getElementById('authStatus').textContent = 'Not signed in';
  document.getElementById('signinCard').style.display = '';
  document.getElementById('signOutBtn').style.display = 'none';
  document.body.classList.add('signed-out');
  showToast('Signed out', 'success');
}

function handleCredential(response){
  try {
    ID_TOKEN = response.credential;
    const parts = ID_TOKEN.split('.');
    const payload = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));
    USER_EMAIL = payload.email || '(unknown)';
    document.getElementById('authStatus').textContent = 'Signed in: ' + USER_EMAIL;
    document.getElementById('signinCard').style.display = 'none';
    document.getElementById('signOutBtn').style.display = 'inline-block';
    document.body.classList.remove('signed-out');
    showToast('Signed in as ' + USER_EMAIL, 'success');
  } catch (e) {
    showToast('Failed to process Google credential: ' + e, 'error');
  }
}

async function loadPayments(){
  const itnUrl = document.getElementById('itnUrl').value.trim();
  if(!itnUrl){ showToast('Enter Apps Script Web App URL','error'); return; }
  if(!ID_TOKEN){ showToast('Sign in with Google first','error'); return; }
  try {
    document.getElementById('adminCard').classList.add('loading');
    const url = new URL(itnUrl); url.searchParams.set('action','list_payments');
    const res = await fetch(url.toString(), { headers: { 'Authorization': 'Bearer ' + ID_TOKEN } });
    if(!res.ok){ showToast('Auth failed or server error','error'); return; }
    const data = await res.json();
    const tb = document.querySelector('#grid tbody'); tb.innerHTML = '';
    (data.rows||[]).reverse().forEach(r=>{
      const tr = document.createElement('tr');
      const td = (t)=>{const x=document.createElement('td'); x.textContent=t||''; return x;};
      tr.appendChild(td(new Date(r.Timestamp).toLocaleString()));
      tr.appendChild(td(r.InvoiceNo));
      tr.appendChild(td(r.OrderID));
      tr.appendChild(td(r.pf_payment_id));
      tr.appendChild(td(r.Email));
      tr.appendChild(td(r.SKU));
      const tdc = document.createElement('td'); tdc.textContent=r.TotalInclVAT; tr.appendChild(tdc);
      const act = document.createElement('td');
      const btn = document.createElement('button'); btn.className='btn btn-secondary'; btn.textContent='Resend Invoice';
      btn.onclick = ()=> resendInvoice(itnUrl, r.OrderID, r.Email);
      act.appendChild(btn);
      tr.appendChild(act);
      tb.appendChild(tr);
    });
    showToast('Payments loaded', 'success');
  } catch (err){
    showToast('Load failed: ' + err, 'error');
  } finally {
    document.getElementById('adminCard').classList.remove('loading');
  }
}

async function resendInvoice(itnUrl, orderId, email){
  if(!ID_TOKEN){ showToast('Sign in with Google first','error'); return; }
  try{
    const url = new URL(itnUrl);
    url.searchParams.set('action','resend_invoice');
    url.searchParams.set('orderId', orderId);
    url.searchParams.set('email', email||'');
    const res = await fetch(url.toString(), { method:'POST', headers:{ 'Authorization': 'Bearer ' + ID_TOKEN } });
    const data = await res.json();
    if(data.ok){ showToast('Invoice re-sent','success'); } else { showToast('Failed: ' + (data.error||'unknown'),'error'); }
  } catch(err){
    showToast('Re-send failed: ' + err,'error');
  }
}
