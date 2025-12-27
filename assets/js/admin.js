
<script>
(function () {
  const state = { cfg: null, role: null, token: null, products: [], gallery: [], payments: [], priceLog: [] };
  const qs = sel => document.querySelector(sel);

  // Append token in URL so GAS can read e.parameter.auth
  function withAuth(url) {
    return state.token ? (url + (url.includes('?') ? '&' : '?') + 'auth=' + encodeURIComponent(state.token)) : url;
  }

  async function loadCfg() {
    // Reads /config.json from the admin site root
    const res = await fetch('/config.json');
    state.cfg = await res.json();
  }

  function show(el, yes) { el.classList.toggle('hidden', !yes); }
  function toast(msg) { alert(msg); }

  // ---------- AUTH ----------
  async function login() {
    const pass = qs('#passphrase').value;
    const role = qs('#role').value;

    // Use text/plain to avoid a CORS preflight to Google Apps Script
    const r = await fetch(state.cfg.appScriptUrl + '?action=login', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ passphrase: pass, role })
    });

    let data;
    try { data = await r.json(); } catch (e) { data = { ok: false, message: 'Login response invalid' }; }

    if (data.ok) {
      state.role = role;
      state.token = data.token;
      qs('#userRole').textContent = role.toUpperCase();
      show(qs('#loginPanel'), false);
      show(qs('#dashboard'), true);
      loadAll();
    } else {
      qs('#loginMsg').textContent = data.message || 'Login failed';
    }
  }

  // ---------- LOAD ALL ----------
  async function loadAll() {
    const base = state.cfg.appScriptUrl;

    const [products, gallery, payments, priceLog] = await Promise.all([
      fetch(base + '?action=products').then(r => r.json()).catch(() => []),
      fetch(base + '?action=gallery').then(r => r.json()).catch(() => []),
      fetch(withAuth(base + '?action=payments')).then(r => r.json()).catch(() => []),
      fetch(withAuth(base + '?action=priceLog')).then(r => r.json()).catch(() => [])
    ]);

    state.products = products || [];
    state.gallery = gallery || [];
    state.payments = payments || [];
    state.priceLog = priceLog || [];

    renderProducts(); renderGallery(); renderPayments(); renderPriceLog();
  }

  // ---------- PRODUCTS ----------
  function renderProducts() {
    const grid = qs('#productsGrid');
    grid.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'row header';
    header.innerHTML = '<div>SKU</div><div>Name</div><div>Price</div><div>Summary</div><div>Image</div><div>Docs</div><div>Active</div>';
    grid.appendChild(header);

    state.products.forEach((p, i) => {
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `
        <input value="${p.sku}" data-i="${i}" data-k="sku" ${state.role === 'viewer' ? 'disabled' : ''} />
        <input value="${p.name || ''}" data-i="${i}" data-k="name" ${state.role === 'viewer' ? 'disabled' : ''} />
        <input value="${p.price || ''}" data-i="${i}" data-k="price" type="number" step="0.01" ${state.role === 'viewer' ? 'disabled' : ''} />
        <input value="${p.summary || ''}" data-i="${i}" data-k="summary" ${state.role === 'viewer' ? 'disabled' : ''} />
        <input value="${p.imageUrl || ''}" data-i="${i}" data-k="imageUrl" ${state.role === 'viewer' ? 'disabled' : ''} />
        <input value="${p.docUrl || ''}" data-i="${i}" data-k="docUrl" ${state.role === 'viewer' ? 'disabled' : ''} />
        <input type="checkbox" ${p.active !== false ? 'checked' : ''} data-i="${i}" data-k="active" ${state.role === 'viewer' ? 'disabled' : ''} />`;
      grid.appendChild(row);
    });

    grid.addEventListener('input', (e) => {
      const t = e.target; const i = Number(t.dataset.i); const k = t.dataset.k;
      if (k === 'active') state.products[i][k] = t.checked; else state.products[i][k] = t.value;
    });

    qs('#saveProducts').onclick = saveProducts;
    if (state.role === 'viewer') qs('#saveProducts').disabled = true;
  }

  async function saveProducts() {
    const r = await fetch(withAuth(state.cfg.appScriptUrl + '?action=saveProducts'), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' }, // avoid preflight
      body: JSON.stringify({ products: state.products })
    });
    const data = await r.json();
    toast(data.message || 'Saved');
  }

  // ---------- GALLERY ----------
  function renderGallery() {
    const t = qs('#galleryTable'); t.innerHTML = '';
    state.gallery.forEach((g, i) => {
      const row = document.createElement('div'); row.className = 'row';
      row.innerHTML = `<div>${i + 1}</div><div>${g.caption || ''}</div><div>${g.imageUrl || ''}</div>`;
      t.appendChild(row);
    });

    qs('#uploadGallery').onclick = async () => {
      if (state.role !== 'admin') return toast('Viewer cannot upload');

      const file = qs('#galleryFile').files[0];
      const caption = qs('#galleryCaption').value;
      if (!file) return toast('Choose a PNG/WebP file');
      if (file.size > 200 * 1024) return toast('Max 200KB');

      const b64 = await file.arrayBuffer().then(b => btoa(String.fromCharCode(...new Uint8Array(b))));
      const r = await fetch(withAuth(state.cfg.appScriptUrl + '?action=uploadGallery'), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' }, // avoid preflight
        body: JSON.stringify({ filename: file.name, caption, data: b64, imageUrl: '' })
      });
      const data = await r.json();
      toast(data.message || 'Uploaded');
      loadAll();
    };
