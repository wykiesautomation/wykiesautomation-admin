
const BUILD_ID = new Date().toISOString().slice(0,10) + '-admin-spa-skel';
const API_BASE = location.origin + '/api';
let ROLE = 'Signed out';
let USER = null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

window.addEventListener('DOMContentLoaded', () => {
  $('#buildId').textContent = BUILD_ID;
  setupNav();
  $('#signOutBtn').addEventListener('click', signOut);
  $('#mockMode').addEventListener('change', refreshProducts);
});

function setupNav(){
  $$('.nav').forEach(btn => btn.addEventListener('click', () => {
    $$('.nav').forEach(b => b.classList.remove('active'));
    $$('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const id = btn.dataset.tab;
    $('#tab-' + id).classList.add('active');
    if(id === 'products') refreshProducts();
    if(id === 'payments') refreshPayments();
  }));
}

// Google Identity callback
window.onGoogleCredential = async (resp) => {
  try{
    const id_token = resp.credential;
    const r = await fetch(API_BASE + '/google-auth', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id_token })
    });
    const j = await r.json();
    if(!j.ok) throw new Error(j.error || 'Auth failed');
    ROLE = j.data.role; USER = j.data;
    $('#roleBadge').textContent = ROLE;
    $('#signin').style.display = 'none';
    $('#signOutBtn').hidden = false;
    // Initial loads
    refreshOverview();
    refreshProducts();
  }catch(err){
    console.error(err);
    alert('Sign-in failed: ' + err.message);
  }
};

function signOut(){
  ROLE = 'Signed out'; USER = null;
  $('#roleBadge').textContent = ROLE;
  $('#signin').style.display = 'flex';
  $('#signOutBtn').hidden = true;
}

async function refreshOverview(){
  // Placeholder stats; wire to API later
  $('#statProducts').textContent = '--';
  $('#statPayments').textContent = '--';
  $('#statGallery').textContent = '--';
  $('#statErrors').textContent = '--';
}

async function refreshProducts(){
  const tbody = $('#tblProducts tbody');
  tbody.innerHTML = '';
  const mock = $('#mockMode').checked;
  let items = [];
  if(mock){
    items = [
      {id:'WA-01', name:'Hybrid Gate Opener (GSM)', price:1499, visible:true},
      {id:'WA-02', name:'Gate Opener (ESP32 Wi‑Fi/BLE)', price:2499, visible:true},
      {id:'WA-11', name:'Plasma Cutter GUI Pro', price:5499, visible:false},
    ];
  } else {
    try{
      const r = await fetch(API_BASE + '/products');
      const j = await r.json();
      if(j.ok) items = j.data; else throw new Error(j.error||'Load failed');
    }catch(e){
      log('Products error: ' + e.message);
    }
  }
  for(const p of items){
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${p.id}</td><td>${p.name}</td><td>R ${p.price.toLocaleString()}</td>`+
                   `<td>${p.visible? 'Yes':'No'}</td>`+
                   `<td><button class="btn btn-outline" data-id="${p.id}">Edit</button></td>`;
    tbody.appendChild(tr);
  }
}

async function refreshPayments(){
  const tbody = $('#tblPayments tbody');
  tbody.innerHTML = '';
  const items = [
    {order:'PF123456', email:'customer@example.com', amount:1499, status:'PAID'},
  ];
  for(const p of items){
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${p.order}</td><td>${p.email}</td><td>R ${p.amount}</td><td>${p.status}</td>`+
                   `<td><button class="btn btn-outline" onclick="resendInvoice('${p.order}')">Resend Invoice</button></td>`;
    tbody.appendChild(tr);
  }
}

async function resendInvoice(orderId){
  try{
    const r = await fetch(API_BASE + '/payments/' + encodeURIComponent(orderId) + '/resend-invoice', {method:'POST'});
    const j = await r.json();
    if(!j.ok) throw new Error(j.error||'Resend failed');
    alert('Invoice resent: ' + (j.data && j.data.invoice_id ? j.data.invoice_id : orderId));
  }catch(e){ alert('Error: ' + e.message); }
}

function log(msg){
  const el = $('#logs');
  const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
  el.textContent = line + '
' + el.textContent;
}
