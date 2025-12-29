
/* admin/admin.js – Wykies Automation Admin SPA client */
(function () {
  // ---------- helpers ----------
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const state = { config: null, role: 'Viewer', payments: [], logs: [], gallery: [], products: [] };

  async function loadConfig() {
    if (state.config) return state.config;
    // Try the real config, then example as fallback
    try {
      const res = await fetch('./config/config.json', { cache: 'no-store' });
      if (res.ok) { state.config = await res.json(); return state.config; }
    } catch (_) {}
    const res = await fetch('./config/config.example.json', { cache: 'no-store' });
    state.config = await res.json();
    return state.config;
  }

  function toast(type, msg) {
    const host = $('#toasts'); if (!host) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`; el.textContent = msg;
    host.appendChild(el); setTimeout(() => el.remove(), 4000);
  }

  function setStatus(msg, ok = true) {
    const sb = $('#statusbar'); if (!sb) return;
    sb.textContent = msg; sb.style.color = ok ? '#b7c8dc' : '#ff8080';
  }

  function csvDownload(filename, rows) {
    if (!rows || !rows.length) return toast('info', 'Nothing to export');
    const headers = Object.keys(rows[0] || {});
    const lines = [headers.join(',')].concat(rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(',')));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    URL.revokeObjectURL(a.href);
  }

  // ---------- API ----------
  let API = {};
  function makeApi(base) {
    const j = (url, opt = {}) =>
      fetch(url, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opt))
        .then(r => r.json());

    return {
      // read
      products: () => j(`${base}?route=products`),
      gallery:  () => j(`${base}?route=gallery`),
      payments: (params = {}) => j(`${base}?route=payments&${new URLSearchParams(params).toString()}`),
      logs:     (cat = 'Price Changes') => j(`${base}?route=logs&cat=${encodeURIComponent(cat)}`),
      verify:   () => j(`${base}?route=auth.verify`),

      // write (token in body)
      addProduct:   (token, payload) => j(`${base}?route=products.add`,   { method: 'POST', body: JSON.stringify({ token, ...payload }) }),
      updateProduct:(token, sku, patch) => j(`${base}?route=products.update&sku=${encodeURIComponent(sku)}`, { method: 'POST', body: JSON.stringify({ token, ...patch }) }),
      toggleProduct:(token, sku, active) => j(`${base}?route=products.toggle`, { method: 'POST', body: JSON.stringify({ token, sku, active }) }),
      addGallery:   (token, payload) => j(`${base}?route=gallery.add`,    { method: 'POST', body: JSON.stringify({ token, ...payload }) }),
      reorderGallery:(token, order) => j(`${base}?route=gallery.reorder`, { method: 'POST', body: JSON.stringify({ token, order }) }),
      resendInvoice:(token, invoiceNo) => j(`${base}?route=payments.resend-invoice`, { method: 'POST', body: JSON.stringify({ token, invoice: invoiceNo }) }),

      // auth
      login:  (passphrase) => j(`${base}?route=auth.login`, { method: 'POST', body: JSON.stringify({ passphrase }) }),
      logout: () => j(`${base}?route=auth.logout`, { method: 'POST', body: '{}' })
    };
  }

  // ---------- UI wiring ----------
  function switchTab(id) {
    $$('.sidenav button').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
    $$('.tab').forEach(t => t.classList.toggle('visible', t.id === `tab-${id}`));
  }

  async function bootstrap() {
    try {
      const cfg = await loadConfig();
      API = makeApi(cfg.scriptUrl);
      $('#buildId').textContent = 'admin-v1.' + new Date().toISOString().slice(0, 10);

      // Role detection (if token stored locally)
      const token = localStorage.getItem('adminToken') || '';
      let isAdmin = false;
      try { const v = await API.verify(); isAdmin = !!v.ok; } catch (_) {}

      state.role = isAdmin ? 'Admin' : 'Viewer';
      $('#roleBadge').textContent = state.role;
      $('#roleLabel').textContent = 'Role: ' + state.role;
      document.body.classList.toggle('gate-viewer', !isAdmin);

      // Nav
      $$('.sidenav button').forEach(b => b.addEventListener('click', () => {
        switchTab(b.dataset.tab);
        if (b.dataset.tab === 'overview')  loadOverview();
        if (b.dataset.tab === 'products')  loadProducts();
        if (b.dataset.tab === 'gallery')   loadGallery();
        if (b.dataset.tab === 'payments')  loadPayments();
        if (b.dataset.tab === 'logs')      loadLogs('Price Changes');
      }));

      $('#signOut').addEventListener('click', async () => {
        try { await API.logout(); localStorage.removeItem('adminToken'); location.href = 'login.html'; }
        catch (e) { toast('error', 'Sign out failed: ' + (e.message || 'Failed')); }
      });

      // Default
      switchTab('overview'); await loadOverview();
      setStatus('Connected to Admin UI');
    } catch (e) {
      setStatus('Unable to connect. Check scriptUrl in config.', false);
      toast('error', e.message || 'Failed to initialize');
    }
  }

  // ---------- Overview ----------
  async function loadOverview() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [prod, gal, pay, prices] = await Promise.all([
        API.products(), API.gallery(), API.payments({ from: today, to: today }), API.logs('Price Changes')
      ]);

      if (!prod.ok || !gal.ok || !pay.ok) throw new Error('CMS error');

      state.products = prod.items || [];
      state.gallery  = gal.items  || [];
      state.payments = pay.items  || [];
      state.logs     = prices.items || [];

      $('#stat-products').textContent = state.products.length;
      $('#stat-gallery').textContent  = state.gallery.length;
      $('#stat-payments').textContent = state.payments.length;
      $('#stat-errors').textContent   = 0;

      const smallTable = (rows, cols) =>
        `<table><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${
          rows.map(r=>`<tr>${cols.map(c=>`<td>${r[c]??''}</td>`).join('')}</tr>`).join('')
        }</tbody></table>`;

      $('#ov-products').innerHTML = smallTable(state.products.slice(0,5), ['sku','name','price_incl','active']);
      $('#ov-payments').innerHTML = smallTable(state.payments.slice(0,3), ['Timestamp','InvoiceNo','Email']);
      $('#ov-price').innerHTML    = smallTable(state.logs.slice(0,5), ['Timestamp','SKU','OldPrice','NewPrice','ChangedBy']);
      $('#ov-gallery').innerHTML  = (state.gallery.slice(0,6)).map(g =>
          `<img src="${g.thumbUrl||g.imageUrl}" alt="${g;

      $('#exp-pay').onclick  = () => csvDownload('payments_today.csv', state.payments);
      $('#exp-price').onclick= () => csvDownload('price_changes.csv', state.logs);

      setStatus('Connected to Google Sheets CMS');
    } catch (e) {
      setStatus('Failed to load overview: ' + (e.message || 'Failed to fetch'), false);
    }
  }

  // ---------- Products ----------
  async function loadProducts() {
    try {
      const res = await API.products(); if (!res.ok) throw new Error('CMS error');
      const rows = res.items || []; state.products = rows;

      const table = `<table>
        <thead><tr><th>SKU</th><th>Name</th><th>Price (incl.)</th><th>Summary</th><th>Active</th><th></th></tr></thead>
        <tbody>${
          rows.map(r=>`<tr data-sku="${r.sku}">
            <td class="mono">${r.sku}</td>
            <td><input type="text" class="name-input" value="${(r.name||'').replace(/"/g,'&quot;')}" data-old="${(r.name||'').replace(/"/g,'&quot;')}"/></td>
            <td><input type="number" step="1" min="0" class="price-input" value="${r.price_incl}" data-old="${r.price_incl}"/></td>
            <td>${r.summary||''}</td>
            <td><input type="checkbox" class="active-toggle" ${r.active?'checked':''}/></td>
            <td><button class="btn small edit">Edit</button></td>
          </tr>`).join('')
        }</tbody></table>`;

      $('#products-table').innerHTML = table;

      // Inline edits
      $('#products-table').addEventListener('change', async (e) => {
        const token = localStorage.getItem('adminToken') || '';
        const nameInp = e.target.closest('.name-input');
        const priceInp= e.target.closest('.price-input');
        const activeChk= e.target.closest('.active-toggle');
        const tr = e.target.closest('tr'); const sku = tr?.dataset?.sku;

        if (nameInp) {
          const oldVal = nameInp.dataset.old; const newVal = nameInp.value.trim();
          if (newVal === oldVal) return;
          nameInp.disabled = true;
          try { await API.updateProduct(token, sku, { name: newVal }); nameInp.dataset.old = newVal; toast('success', `Name updated for ${sku}`); }
          catch (err) { toast('error','Save failed: '+(err.message||'Failed')); nameInp.value = oldVal; }
          finally { nameInp.disabled = false; }
        }
        if (priceInp) {
          const oldVal = parseFloat(priceInp.dataset.old || '0');
          const newVal = parseFloat(priceInp.value || '0');
          if (Number.isNaN(newVal) || newVal < 0) { toast('error','Invalid price'); priceInp.value = oldVal; return; }
          if (newVal === oldVal) return;
          if (!confirm(`Change price for ${sku} from R${oldVal} to R${newVal}? This will be logged.`)) { priceInp.value = oldVal; return; }
          priceInp.disabled = true;
          try { await API.updateProduct(token, sku, { price_incl: newVal }); priceInp.dataset.old = String(newVal); toast('success', `Price updated for ${sku}`); }
          catch (err) { toast('error','Save failed: '+(err.message||'Failed')); priceInp.value = oldVal; }
          finally { priceInp.disabled = false; }
        }
        if (activeChk) {
          const val = activeChk.checked; activeChk.disabled = true;
          try { await API.toggleProduct(token, sku, val); toast('success', `${sku} ${val?'activated':'deactivated'}`); }
          catch (err){ toast('error','Toggle failed: '+(err.message||'Failed')); activeChk.checked = !val; }
          finally { activeChk.disabled = false; }
        }
      });

      // Add Product modal
      $('#btnAddProduct')?.addEventListener('click', () => {
        const m = $('#modal'); m.classList.remove('hidden');
        m.innerHTML = `<div class="panel"><h3>Add Product</h3>
          <div class="form">
            <label>SKU <input id="ap-sku" placeholder="WA-01"></label>
            <label>Name <input id="ap-name"></label>
            <label>Price (incl.) <input id="ap-price" type="number" min="0" step="1"></label>
            <label>Summary <input id="ap-summary"></label>
            <label>Description (MD) <textarea id="ap-desc" rows="4"></textarea></label>
            <label>Image URL <input id="ap-img"></label>
            <label>Trial URL <input id="ap-trial"></label>
            <label>Docs URL <input id="ap-doc"></label>
            <label><input id="ap-active" type="checkbox" checked> Active</label>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button id="ap-cancel" class="btn">Cancel</button>
            <button id="ap-save"   class="btn primary">Save</button>
          </div></div>`;
        $('#ap-cancel').onclick = () => { m.classList.add('hidden'); m.innerHTML = ''; };
        $('#ap-save').onclick = async () => {
          const token = localStorage.getItem('adminToken') || '';
          const sku = $('#ap-sku').value.trim().toUpperCase();
          const name= $('#ap-name').value.trim();
          const price = parseFloat($('#ap-price').value || '0');
          const summary = $('#ap-summary').value.trim();
          const description_md = $('#ap-desc').value;
          const imageUrl = $('#ap-img').value.trim();
          const trialUrl = $('#ap-trial').value.trim();
          const docUrl   = $('#ap-doc').value.trim();
          const active   = $('#ap-active').checked;
          if (!/^WA-\d{2,}$/.test(sku)) return toast('error','SKU must be WA-XX');
          if (!name || Number.isNaN(price) || price < 0) return toast('error','Name/price invalid');
          try {
            await API.addProduct(token, { sku, name, price_incl: price, summary, description_md, imageUrl, trialUrl, docUrl, active });
            m.classList.add('hidden'); m.innerHTML = ''; toast('success', `Product ${sku} created`);
            await loadProducts();
          } catch (err) { toast('error','Create failed: '+(err.message||'Failed')); }
        };
      });

      // Export
      $('#btnExportProducts')?.addEventListener('click', () => csvDownload('products.csv', rows));
    } catch (e) {
      setStatus('Products load failed: ' + (e.message || 'Failed to fetch'), false);
    }
  }

  // ---------- Gallery ----------
  async function loadGallery() {
    try {
      const res = await API.gallery(); if (!res.ok) throw new Error('CMS error');
      const items = res.items || []; state.gallery = items;
      const grid = $('#galleryGrid');
      grid.innerHTML = items.map(x => `
        <div class="gcard" draggable="true" data-id="${x.id||x.sku||x.imageUrl}">
          ${x.thumbUrl||x.imageUrl}
          <div class="tiny muted">${x.sku||''} • ${x.caption||x.name||''}</div>
        </div>`).join('');

      // Drag reorder
      let drag = null;
      grid.addEventListener('dragstart', e => { drag = e.target.closest('.gcard'); if (drag) drag.classList.add('dragging'); });
      grid.addEventListener('dragend',   e => { const c = e.target.closest('.gcard'); if (c) c.classList.remove('dragging'); drag = null; });
      grid.addEventListener('dragover',  e => { e.preventDefault(); const c = e.target.closest('.gcard'); if (!c || c===drag) return; grid.insertBefore(drag, c); });

      // Save order
      $('#btnSaveOrder').onclick = async () => {
        const token = localStorage.getItem('adminToken') || '';
        const order = [...grid.querySelectorAll('.gcard')].map((el, i) => ({ id: el.dataset.id, orderIndex: i + 1 }));
        try { const r = await API.reorderGallery(token, order); if (!r.ok) throw new Error(r.error||'Failed'); toast('success','Gallery order saved'); }
        catch (err) { toast('error','Save order failed: '+(err.message||'Failed')); }
      };

      // Upload (URL-based add; binary upload requires a storage URL)
      $('#galleryUpload')?.addEventListener('change', async (e) => {
        const f = e.target.files?.[0]; if (!f) return toast('error','Choose an image first');
        if (f.size > 200*1024) return toast('error','File too large (>200KB)');
        toast('info','For direct file uploads we need an upload URL (Drive/R2). For now, add via imageUrl.');
      });

    } catch (e) {
      setStatus('Gallery load failed: ' + (e.message || 'Failed to fetch'), false);
    }
  }

  // ---------- Payments ----------
  async function loadPayments() {
    try {
      const from = $('#paymentsFrom')?.value || new Date().toISOString().slice(0, 10);
      const to   = $('#paymentsTo')?.value   || new Date().toISOString().slice(0, 10);
      const email= $('#paymentsEmail')?.value || '';
      const sku  = $('#paymentsSku')?.value   || '';
      const res = await API.payments({ from, to, email, sku }); if (!res.ok) throw new Error('CMS error');
      const rows = res.items || []; state.payments = rows;

      const tableHost = $('#paymentsTable');
      tableHost.innerHTML = `<table><thead><tr>
        <th>Timestamp</th><th>InvoiceNo</th><th>Email</th><th>SKU</th><th>Total</th><th></th>
        </tr></thead><tbody>${
          rows.map(r => `<tr data-inv="${r.InvoiceNo}">
            <td>${r.Timestamp||''}</td><td>${r.InvoiceNo||''}</td><td>${r.Email||''}</td><td>${r.SKU||''}</td>
            <td>${r.TotalInclVAT||r.total_incl_vat||''}</td>
            <td><button class="btn small resend">Resend</button></td>
          </tr>`).join('')
        }</tbody></table>`;

      // Resend handler
      tableHost.querySelectorAll('.resend').forEach(b => b.addEventListener('click', async () => {
        const token = localStorage.getItem('adminToken') || '';
        const inv = b.closest('tr')?.dataset?.inv; if (!inv) return;
        if (!confirm(`Resend invoice ${inv}?`)) return;
        try { const r = await API.resendInvoice(token, inv); if (!r.ok) throw new Error(r.error||'Failed'); toast('success','Invoice resent (rate-limited server side)'); }
        catch (err) { toast('error','Resend failed: '+(err.message||'Failed')); }
      }));

      $('#btnExportPayments')?.addEventListener('click', () => csvDownload('payments.csv', rows));
    } catch (e) {
      setStatus('Payments load failed: ' + (e.message || 'Failed to fetch'), false);
    }
  }

  // ---------- Logs ----------
  async function loadLogs(kind = 'Price Changes') {
    try {
      const res = await API.logs(kind); if (!res.ok) throw new Error('CMS error');
      const rows = res.items || []; state.logs = rows;
      const colsBy = {
        'Price Changes': ['Timestamp','SKU','OldPrice','NewPrice','ChangedBy','SourceIP'],
        'System':        ['Timestamp','Level','Component','Message'],
        'ITN Errors':    ['Timestamp','Message','SourceIP']
      };
      const cols = colsBy[kind] || Object.keys(rows[0] || {});
      $('#logsTable').innerHTML = `<table><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${
        rows.map(r=>`<tr>${cols.map(c=>`<td>${r[c]??''}</td>`).join('')}</tr>`).join('')
      }</tbody></table>`;

      $('#btnExportLogs')?.addEventListener('click', () => csvDownload(`logs_${kind.toLowerCase().replace(/\s+/g,'_')}.csv`, rows));
      // Category switch
      $('#logCat')?.addEventListener('change', async (e) => { await loadLogs(e.target.value); });
    } catch (e) {
      setStatus('Logs load failed: ' + (e.message || 'Failed to fetch'), false);
    }
  }

  document.addEventListener('DOMContentLoaded', bootstrap);
})();
