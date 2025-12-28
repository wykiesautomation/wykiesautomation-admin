
(() => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

  function init() {
    const $ = (id) => document.getElementById(id);
    const els = {
      // auth
      authStatus: $('authStatus'),
      authEmail: $('authEmail'),
      googleBtn: $('googleBtn'),
      btnSignOut: $('btnSignOut'),
      tabProducts: $('tabProducts'),
      tabPayments: $('tabPayments'),
      toast: $('toast'), toastText: $('toast-text'),
      // products
      rows: $('prodRows'), table: $('prodTable'),
      search: $('prodSearch'), sort: $('prodSort'),
      prev: $('prodPrev'), next: $('prodNext'), pageInfo: $('prodPageInfo'),
      btnNew: $('btnNewProduct'), btnExport: $('btnExportProducts'),
      btnPublish: $('btnPublish'),
      // dialog
      dlg: $('prodDialog'), form: $('prodForm'),
      fSku: $('fSku'), fName: $('fName'), fPrice: $('fPrice'), fImage: $('fImage'),
      btnSaveProd: $('btnSaveProd'), btnCancelProd: $('btnCancelProd')
    };

    const state = {
      page: 1, pageSize: 25,
      sort: 'name_asc', q: '',
      products: [],
      editing: null,
      user: null,
      idToken: null // Google ID token
    };

    // =========================
    //  Google Identity Services
    // =========================

    // Robust init: retry until google.accounts.id is ready
    const GIS_MAX_TRIES = 40;      // ~10 seconds total (40 * 250ms)
    const GIS_RETRY_MS  = 250;

    function initGIS() {
      let tries = 0;

      (function attempt() {
        const ready = !!(window.google && window.google.accounts && window.google.accounts.id);
        const hasCID = !!(window.CONFIG && window.CONFIG.GOOGLE_CLIENT_ID);
        if (ready && hasCID) {
          try {
            google.accounts.id.initialize({
              client_id: window.CONFIG.GOOGLE_CLIENT_ID,
              callback: handleCredentialResponse,
              auto_select: false,
              ux_mode: 'popup'
            });
            google.accounts.id.renderButton(els.googleBtn, {
              theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', width: 240
            });
            return; // Done
          } catch (err) {
            console.error('GIS init error:', err);
            showToast('Google Sign-In failed to initialize', false);
            return;
          }
        }

        // Retry if not ready
        tries += 1;
        if (tries < GIS_MAX_TRIES) {
          setTimeout(attempt, GIS_RETRY_MS);
        } else {
          console.warn('GIS library not available after retries.');
          showToast('Cannot load Google Sign-In (check blockers / CSP).', false);
        }
      })();
    }

    // Kick off GIS init (works even if gsi/client is late)
    initGIS();

    async function handleCredentialResponse(resp) {
      try {
        const idToken = resp?.credential;
        if (!idToken) throw new Error('No credential from Google');

        // Verify token server-side (Apps Script)
        const verifyRes = await fetch(window.CONFIG.AUTH_VERIFY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'verifyToken',
            idToken,
            expectedClientId: window.CONFIG.GOOGLE_CLIENT_ID
          })
        });
        if (!verifyRes.ok) throw new Error(`HTTP ${verifyRes.status}`);
        const vjson = await verifyRes.json();
        if (!vjson?.ok) throw new Error(vjson?.error || 'Token verify failed');

        const email = String(vjson.email || '').toLowerCase();
        const allowed = window.CONFIG.ALLOWLIST.includes(email);
        if (!allowed) { showToast('This account is not allowlisted', false); return; }

        // Auth success
        state.idToken = idToken;
        window.__ID_TOKEN__ = idToken; // expose for paymentsApi.js
        setSignedIn(email);

        // Load data
        await loadProducts();
      } catch (err) {
        console.error(err);
        showToast(err.message, false);
      }
    }

    function setSignedIn(email) {
      state.user = email;
      els.authStatus.textContent = 'Signed in';
      els.authEmail.textContent = email || '';
      els.btnSignOut.disabled = false;
      els.tabProducts.hidden = false;
      els.tabPayments.hidden = false;
    }

    els.btnSignOut?.addEventListener('click', () => {
      state.user = null;
      state.idToken = null;
      window.__ID_TOKEN__ = null;
      els.authStatus.textContent = 'Signed out';
      els.authEmail.textContent = '';
      els.btnSignOut.disabled = true;
      els.tabProducts.hidden = true;
      els.tabPayments.hidden = true;
      try { google?.accounts?.id?.disableAutoSelect?.(); } catch {}
      showToast('Signed out');
    });

    // ====== UI helpers ======
    const fmtZAR = (v) => 'R ' + new Intl.NumberFormat('en-ZA', {minimumFractionDigits:2, maximumFractionDigits:2})
      .format(Number(v ?? 0));
    const escapeHtml = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
    function showToast(msg, ok=true) {
      if (!els.toast) return;
      (els.toastText ? els.toastText : els.toast).textContent = msg;
      els.toast.classList.remove('hidden');
      els.toast.style.borderColor = ok ? '#2F76FF' : '#c0392b';
      clearTimeout(showToast._t);
      showToast._t = setTimeout(() => els.toast.classList.add('hidden'), 3000);
    }
    const debounce = (fn,ms=250)=>{ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms);} };

    // ====== Products CRUD ======
    async function loadProducts() {
      try {
        const u = new URL(window.CONFIG.CMS_API_URL);
        u.searchParams.set('action','listProducts');
        u.searchParams.set('sheetId', window.CONFIG.SHEET_ID);
        u.searchParams.set('page', String(state.page));
        u.searchParams.set('pageSize', String(state.pageSize));
        u.searchParams.set('sort', state.sort);
        if (state.q) u.searchParams.set('q', state.q);
        if (state.idToken) u.searchParams.set('idToken', state.idToken);
        u.searchParams.set('expectedClientId', window.CONFIG.GOOGLE_CLIENT_ID);

        const res = await fetch(u.toString());
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json?.ok) throw new Error(json?.error || 'Failed to load products');

        const data = Array.isArray(json.data) ? json.data : (json.data || []);
        state.products = data;
        renderRows(state.products);
        updatePager(json.total || state.products.length);
        showToast('Products loaded');
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Load failed', false);
      }
    }

    function rowTemplate(p) {
      const thumb = p.Images?.[0]
        ? `<img src="${escapeHtml(p.Images[0])}" alt="" style="width:42px;height:image</span>`;
      const imgs = Array.isArray(p.Images) ? p.Images.length : 0;
      const updated = p.UpdatedAt ? new Date(p.UpdatedAt).toLocaleString('en-ZA') : '—';
      return `
        <tr>
          <td data-label="Thumbnail">${thumb}</td>
          <td data-label="SKU"><strong>${escapeHtml(p.SKU)}</strong></td>
          <td data-label="Name">${escapeHtml(p.Name)}</td>
          <td data-label="Price (incl.)">${fmtZAR(p.PriceIncl)}</td>
          <td data-label="Updated">${escapeHtml(updated)}</td>
          <td data-label="Images">${imgs} file(s)</td>
          <td data-label="Actions">
            <div class="row-actions">
              editEdit</button>
              <label class="btn small outline">
                Upload <input type="file" accept="image/*" data-action="upload" data-sku="${escapeHtml(p.SKU)}" style="/td>
        </tr>
      `;
    }

    function renderRows(items) {
      els.rows.innerHTML = items.map(rowTemplate).join('');
    }

    function updatePager(total) {
      const max = Math.max(1, Math.ceil(Number(total || 0) / state.pageSize));
      state.page = Math.min(state.page, max);
      els.pageInfo.textContent = `Page ${state.page} of ${max}`;
      els.prev.disabled = state.page <= 1;
      els.next.disabled = state.page >= max;
    }

    // Search/sort/pager
    els.search?.addEventListener('input', debounce(() => { state.q = els.search.value.trim(); state.page=1; loadProducts(); }, 250));
    els.sort?.addEventListener('change', () => { state.sort = els.sort.value; state.page=1; loadProducts(); });
    els.prev?.addEventListener('click', () => { if (state.page>1) { state.page--; loadProducts(); } });
    els.next?.addEventListener('click', () => { state.page++; loadProducts(); });

    // Export (client-side CSV)
    els.btnExport?.addEventListener('click', () => {
      const cols = ['SKU','Name','PriceIncl','UpdatedAt','Images'];
      const lines = [cols.join(',')];
      for (const p of state.products) {
        lines.push([p.SKU, `"${(p.Name||'').replace(/"/g,'""')}"`, p.PriceIncl, p.UpdatedAt || '', (p.Images||[]).join('|')].join(','));
      }
      const blob = new Blob([lines.join('\n')], {type:'text/csv;charset=utf-8'});
      const stamp = new Date().toISOString().replace(/[:.]/g,'-');
      downloadBlob(blob, `products_${stamp}.csv`);
      showToast('CSV exported');
    });

    function downloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    }

    // New Product
    els.btnNew?.addEventListener('click', () => {
      requireSignedIn();
      state.editing = null;
      $('dlgTitle').textContent = 'New Product';
      els.fSku.value = ''; els.fName.value=''; els.fPrice.value='';
      els.fImage.value = '';
      els.dlg.showModal();
    });
    els.btnCancelProd?.addEventListener('click', (e) => { e.preventDefault(); els.dlg.close(); });

    els.btnSaveProd?.addEventListener('click', async (e) => {
      e.preventDefault();
      requireSignedIn();
      try {
        const payload = {
          action: state.editing ? 'updateProduct' : 'addProduct',
          sheetId: window.CONFIG.SHEET_ID,
          SKU: els.fSku.value.trim(),
          Name: els.fName.value.trim(),
          PriceIncl: parseFloat(els.fPrice.value),
          idToken: state.idToken,
          expectedClientId: window.CONFIG.GOOGLE_CLIENT_ID
        };
        const res = await fetch(window.CONFIG.CMS_API_URL, {
          method:'POST',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json?.ok) throw new Error(json?.error || 'Save failed');

        // Optional: upload image(s)
        if (els.fImage.files?.length) {
          await uploadImages(payload.SKU, els.fImage.files);
        }

        els.dlg.close();
        showToast(state.editing ? 'Product updated' : 'Product created');
        loadProducts();
        await logPriceIfChanged(payload.SKU, payload.PriceIncl);
      } catch (err) { console.error(err); showToast(err.message, false); }
    });

    // Row actions
    els.table?.addEventListener('click', async (ev) => {
      const btn = ev.target.closest('button[data-action]');
      const fileInput = ev.target.closest('input[type="file"][data-action="upload"]');
      if (btn) {
        requireSignedIn();
        const action = btn.getAttribute('data-action');
        const sku = btn.getAttribute('data-sku');
        if (action === 'edit') {
          const p = state.products.find(x => x.SKU === sku);
          state.editing = sku;
          $('dlgTitle').textContent = `Edit: ${p?.Name || sku}`;
          els.fSku.value = p?.SKU || ''; els.fName.value = p?.Name || '';
          els.fPrice.value = p?.PriceIncl ?? '';
          els.fImage.value = '';
          els.dlg.showModal();
        } else if (action === 'delete') {
          if (!confirm(`Delete ${sku}?`)) return;
          try {
            const res = await fetch(window.CONFIG.CMS_API_URL, {
              method:'POST',
              headers:{ 'Content-Type':'application/json' },
              body: JSON.stringify({ action:'deleteProduct', sheetId: window.CONFIG.SHEET_ID, SKU: sku, idToken: state.idToken, expectedClientId: window.CONFIG.GOOGLE_CLIENT_ID })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const j = await res.json();
            if (!j?.ok) throw new Error(j?.error || 'Delete failed');
            showToast('Product deleted');
            loadProducts();
          } catch (err) { console.error(err); showToast(err.message, false); }
        }
      } else if (fileInput) {
        requireSignedIn();
        const sku = fileInput.getAttribute('data-sku');
        await uploadImages(sku, fileInput.files);
      }
    });

    async function uploadImages(sku, files) {
      if (!files?.length) return;
      const fd = new FormData();
      fd.append('action','uploadImage');
      fd.append('sheetId', window.CONFIG.SHEET_ID);
      fd.append('driveFolderId', window.CONFIG.DRIVE_FOLDER_ID);
      fd.append('SKU', sku);
      fd.append('idToken', state.idToken);
      fd.append('expectedClientId', window.CONFIG.GOOGLE_CLIENT_ID);
      for (const f of files) fd.append('images', f, f.name);
      const res = await fetch(window.CONFIG.UPLOAD_URL, { method:'POST', body: fd });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || 'Upload failed');
      showToast(`Uploaded ${files.length} image(s) for ${sku}`);
      loadProducts();
    }

    async function logPriceIfChanged(sku, newPrice) {
      try {
        await fetch(window.CONFIG.CMS_API_URL, { method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ action:'logPriceChange', sheetId: window.CONFIG.SHEET_ID, SKU: sku, PriceIncl: newPrice, idToken: state.idToken, expectedClientId: window.CONFIG.GOOGLE_CLIENT_ID })
        });
      } catch {}
    }

    // Publish (server-side proxy; send token via header)
    els.btnPublish?.addEventListener('click', async () => {
      requireSignedIn();
      try {
        const res = await fetch(window.CONFIG.PUBLISH_URL, {
          method:'POST',
          headers:{ 'Content-Type':'application/json', 'X-ID-Token': state.idToken },
          body: JSON.stringify({ action:'publishProducts', sheetId: window.CONFIG.SHEET_ID })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json?.ok) throw new Error(json?.error || 'Publish failed');
        showToast('Published to public site');
      } catch (err) {
        console.error(err);
        showToast(`Publish failed: ${err.message}`, false);
      }
    });

    function requireSignedIn() {
      if (!state.idToken || !state.user) throw new Error('Please sign in with Google first');
    }
  }
})();
