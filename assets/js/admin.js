
/* Wykies Automation — Admin v1.0 (Products, Payments, Logs, Settings) */
const CONFIG = {
  API_BASE: 'YOUR_APPS_SCRIPT_WEB_APP_URL',
  ALLOW_EMAILS: ['wykiesautomation@gmail.com'],
  SUBDOMAIN: 'admin.wykiesautomation.co.za',
  MODE: 'live'
};

const qs = (s, el=document) => el.querySelector(s);
const qsa = (s, el=document) => [...el.querySelectorAll(s)];

let JWT = null;
let PROFILE = null;

document.addEventListener('DOMContentLoaded', () => {
  qsa('.nav-btn').forEach(b => b.addEventListener('click', () => {
    qsa('.nav-btn').forEach(x => x.classList.remove('active')); b.classList.add('active');
    qsa('.tab').forEach(x => x.classList.remove('active')); qs(`#tab-${b.dataset.tab}`).classList.add('active');
  }));

  qs('#btnSignIn').addEventListener('click', signIn);
  qs('#btnSignOut').addEventListener('click', signOut);
  qs('#btnRefreshProducts')?.addEventListener('click', loadProducts);
  qs('#btnRefreshPayments')?.addEventListener('click', loadPayments);
  qs('#btnRefreshLogs')?.addEventListener('click', loadLogs);

  qs('#cfgApiBase').textContent = CONFIG.API_BASE;
  qs('#cfgMode').textContent = CONFIG.MODE;

  restoreSession();
  if (JWT) Promise.all([loadProducts(), loadPayments(), loadLogs()]);
});

async function signIn() {
  try {
    const r = await fetch(`${CONFIG.API_BASE}?op=adminAuthStart`, {cache:'no-store'});
    const { authUrl } = await r.json();
    const win = window.open(authUrl, 'gauth', 'width=520,height=640');
    const token = await waitForAuthToken(win);
    await setSession(token);
  } catch (e) { alert('Sign-in failed.'); console.error(e); }
}

function waitForAuthToken(win) {
  return new Promise((resolve, reject) => {
    const iv = setInterval(() => {
      try {
        if (win.closed) { clearInterval(iv); reject(new Error('Popup closed')); }
        const hash = win.location.hash || '';
        if (hash.includes('admin_jwt=')) {
          const jwt = new URLSearchParams(hash.substring(1)).get('admin_jwt');
          clearInterval(iv); win.close(); resolve(jwt);
        }
      } catch (_) { /* cross-origin until redirect back to our domain */ }
    }, 400);
  });
}

async function setSession(jwt) {
  const r = await fetch(`${CONFIG.API_BASE}?op=adminWhoAmI`, {
    headers: { Authorization: `Bearer ${jwt}` }, cache:'no-store'
  });
  const me = await r.json();
  if (!CONFIG.ALLOW_EMAILS.includes(me.email)) { alert('This account is not allowed.'); return; }
  JWT = jwt; PROFILE = me;
  localStorage.setItem('WA_ADMIN_JWT', JWT);
  localStorage.setItem('WA_ADMIN_PROFILE', JSON.stringify(PROFILE));
  qs('#whoami').textContent = `${me.name} (${me.email})`;
  qs('#btnSignIn').style.display = 'none';
  qs('#btnSignOut').style.display = 'inline-block';
  await Promise.all([loadProducts(), loadPayments(), loadLogs()]);
}

function restoreSession() {
  const jwt = localStorage.getItem('WA_ADMIN_JWT');
  const me = localStorage.getItem('WA_ADMIN_PROFILE');
  if (jwt && me) {
    JWT = jwt; PROFILE = JSON.parse(me);
    qs('#whoami').textContent = `${PROFILE.name} (${PROFILE.email})`;
    qs('#btnSignIn').style.display = 'none';
    qs('#btnSignOut').style.display = 'inline-block';
  }
}

function signOut() {
  JWT = null; PROFILE = null;
  localStorage.removeItem('WA_ADMIN_JWT');
  localStorage.removeItem('WA_ADMIN_PROFILE');
  qs('#whoami').textContent = 'Signed out';
  qs('#btnSignIn').style.display = 'inline-block';
  qs('#btnSignOut').style.display = 'none';
}

async function loadProducts() {
  if (!JWT) return;
  const tbody = qs('#gridProducts tbody');
  tbody.innerHTML = `<tr><td colspan="8">Loading…</td></tr>`;
  try {
    const r = await fetch(`${CONFIG.API_BASE}?op=productsAdmin`, {
      headers: { Authorization: `Bearer ${JWT}` }, cache:'no-store'
    });
    const rows = await r.json();
    tbody.innerHTML = '';
    for (const p of rows) {
      const tpl = document.querySelector('#rowProduct').content;
      const tr = document.importNode(tpl, true);
      tr.querySelector('.sku').textContent = p.sku;
      tr.querySelector('.name').value = p.name || '';
      tr.querySelector('.price').value = p.price ?? 0;
      tr.querySelector('.active').checked = (String(p.active).toUpperCase() === 'TRUE');
      tr.querySelector('.imageUrl').value = p.imageUrl || '';
      tr.querySelector('.docUrl').value = p.docUrl || '';
      tr.querySelector('.trialUrl').value = p.trialUrl || '';
      const el = tr.firstElementChild;
      el.querySelector('.save').addEventListener('click', () => saveProduct(el));
      el.querySelector('.pricechange').addEventListener('click', () => logPriceChange(el, p.price));
      tbody.appendChild(tr);
    }
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8">Failed to load products.</td></tr>`;
  }
}

async function saveProduct(row) {
  if (!JWT) return;
  const payload = {
    sku: row.querySelector('.sku').textContent.trim(),
    name: row.querySelector('.name').value.trim(),
    price: parseFloat(row.querySelector('.price').value),
    active: row.querySelector('.active').checked,
    imageUrl: row.querySelector('.imageUrl').value.trim(),
    docUrl: row.querySelector('.docUrl').value.trim(),
    trialUrl: row.querySelector('.trialUrl').value.trim()
  };
  try {
    const r = await fetch(`${CONFIG.API_BASE}?op=productUpdate`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${JWT}` },
      body: JSON.stringify(payload)
    });
    const res = await r.json();
    if (res.ok) alert('Saved.'); else throw new Error(res.error || 'Save failed');
  } catch (e) { alert('Save failed.'); console.error(e); }
}

async function logPriceChange(row, oldPrice) {
  if (!JWT) return;
  const sku = row.querySelector('.sku').textContent.trim();
  const newPrice = parseFloat(row.querySelector('.price').value);
  if (isNaN(newPrice)) { alert('Invalid price.'); return; }
  try {
    const r = await fetch(`${CONFIG.API_BASE}?op=priceChange`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${JWT}` },
      body: JSON.stringify({ sku, oldPrice, newPrice, source:'admin-ui' })
    });
    const res = await r.json();
    if (res.ok) alert('Price change logged.'); else throw new Error(res.error || 'Failed to log');
  } catch (e) { alert('Failed to log price change.'); console.error(e); }
}

async function loadPayments() {
  if (!JWT) return;
  const tbody = qs('#gridPayments tbody');
  tbody.innerHTML = `<tr><td colspan="9">Loading…</td></tr>`;
  try {
    const r = await fetch(`${CONFIG.API_BASE}?op=payments`, {
      headers:{ Authorization:`Bearer ${JWT}` }, cache:'no-store'
    });
    const rows = await r.json();
    tbody.innerHTML = '';
    for (const p of rows) {
      const tr = document.importNode(document.querySelector('#rowPayment').content, true);
      tr.querySelector('.ts').textContent = p.Timestamp || '';
      tr.querySelector('.inv').textContent = p.InvoiceNo || '';
      tr.querySelector('.order').textContent = p.OrderID || '';
      tr.querySelector('.pfid').textContent = p.pf_payment_id || '';
      tr.querySelector('.email').textContent = p.Email || '';
      tr.querySelector('.sku').textContent = p.SKU || '';
      tr.querySelector('.total').textContent = p.TotalInclVAT || '';
      tr.querySelector('.released').textContent = p.ReleasedAt || '';
      tr.querySelector('.resend').addEventListener('click', () => resendInvoice(p));
      tbody.appendChild(tr);
    }
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="9">Failed to load payments.</td></tr>`;
  }
}

async function resendInvoice(p) {
  if (!JWT) return;
  if (!confirm(`Re-send invoice ${p.InvoiceNo} to ${p.Email}?`)) return;
  try {
    const r = await fetch(`${CONFIG.API_BASE}?op=resendInvoice`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${JWT}` },
      body: JSON.stringify({ invoiceNo: p.InvoiceNo, email: p.Email })
    });
    const res = await r.json();
    if (res.ok) alert('Invoice re-sent.'); else throw new Error(res.error || 'Failed');
  } catch (e) { alert('Failed to re-send.'); console.error(e); }
}

async function loadLogs() {
  if (!JWT) return;
  const tbody = qs('#gridLogs tbody');
  tbody.innerHTML = `<tr><td colspan="5">Loading…</td></tr>`;
  try {
    const r = await fetch(`${CONFIG.API_BASE}?op=logs`, {
      headers:{ Authorization:`Bearer ${JWT}` }, cache:'no-store'
    });
    const rows = await r.json();
    tbody.innerHTML = '';
    for (const x of rows) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${x.Timestamp||''}</td><td>${x.Event||''}</td><td>${x.SKU||''}</td><td>${x.User||''}</td><td>${x.Notes||''}</td>`;
      tbody.appendChild(tr);
    }
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5">Failed to load logs.</td></tr>`;
  }
}
