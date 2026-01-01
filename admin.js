
import { CONFIG } from '../public/config.js';

let currentUser = null;

function showTab(id) {
  document.querySelectorAll('.side button').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === id);
  });
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('show', t.id === id));
}

document.querySelectorAll('.side button').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));

// Google Sign-In
window.onload = () => {
  google.accounts.id.initialize({
    client_id: CONFIG.OAUTH_CLIENT_ID,
    callback: handleCredentialResponse
  });
  google.accounts.id.renderButton(document.getElementById('signin'), { theme: 'filled_blue', size: 'large' });
};

function parseJwt (token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
  return JSON.parse(jsonPayload);
}

function handleCredentialResponse(resp) {
  const data = parseJwt(resp.credential);
  const email = data.email;
  if (!CONFIG.ALLOWLIST_EMAILS.includes(email)) {
    alert('Access denied for ' + email);
    return;
  }
  currentUser = { email, name: data.name };
  document.getElementById('user').textContent = email;
  document.getElementById('signin').style.display = 'none';
  loadDashboard(); loadCatalog(); loadPriceLog(); loadPayments(); loadSettings();
}

async function loadDashboard() {
  try {
    const r = await fetch(CONFIG.APP_SCRIPT_URL + '?action=kpis');
    const k = await r.json();
    document.getElementById('k_orders').textContent = k.orders || 0;
    document.getElementById('k_products').textContent = k.products || 0;
    document.getElementById('k_docs').textContent = k.docs || 0;
  } catch {}
}

async function loadCatalog() {
  try {
    const r = await fetch(CONFIG.APP_SCRIPT_URL + '?action=products');
    const list = await r.json();
    const rows = document.getElementById('prodRows');
    rows.innerHTML = '';
    (list.products || []).forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${p.id}</td><td><input value="${p.name}"/></td><td><input type="number" value="${p.price}"/></td><td><input value="${p.img || ''}"/></td><td><button class="btn">Save</button></td>`;
      tr.querySelector('button').onclick = async () => {
        const inputs = tr.querySelectorAll('input');
        const payload = { id: p.id, name: inputs[0].value, price: Number(inputs[1].value), img: inputs[2].value };
        await fetch(CONFIG.APP_SCRIPT_URL + '?action=save_product', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        alert('Saved');
      };
      rows.appendChild(tr);
    });
  } catch {}
}

async function loadPriceLog() {
  try {
    const r = await fetch(CONFIG.APP_SCRIPT_URL + '?action=price_log');
    const list = await r.json();
    const rows = document.getElementById('priceRows');
    rows.innerHTML = '';
    (list.rows || []).forEach(pl => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${pl.date}</td><td>${pl.product}</td><td>${pl.old}</td><td>${pl.new}</td><td>${pl.user}</td>`;
      rows.appendChild(tr);
    });
  } catch {}
}

async function loadPayments() {
  try {
    const r = await fetch(CONFIG.APP_SCRIPT_URL + '?action=orders');
    const list = await r.json();
    const rows = document.getElementById('payRows');
    rows.innerHTML = '';
    (list.orders || []).forEach(o => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${o.id}</td><td>${o.customer}</td><td>R${o.amount}</td><td>${o.status}</td><td><button class="btn">Resend Invoice</button></td>`;
      tr.querySelector('button').onclick = async () => {
        await fetch(CONFIG.APP_SCRIPT_URL + '?action=resend_invoice', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ order_id: o.id }) });
        alert('Invoice re-sent');
      };
      rows.appendChild(tr);
    });
  } catch {}
}

function loadSettings() {
  document.getElementById('cfg').textContent = JSON.stringify(CONFIG, null, 2);
}
