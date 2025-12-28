
<script>
// Admin Payments UI: fetch + render + actions (robust + ID-agnostic)
(() => {
  // Wait until DOM is ready if this script loads early
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    const state = {
      page: 1,
      pageSize: 25,
      sort: 'timestamp_desc',
      q: '',
      from: '',
      to: ''
    };

    const API_BASE = window.CONFIG?.PAYMENTS_API_URL
      || 'https://admin-proxy.wykiesautomation.co.za/payments';

    // --- Element helpers (support both legacy and new IDs) ---
    const $id = (id) => document.getElementById(id);
    const pick = (...ids) => ids.map($id).find(Boolean);

    const els = {
      rows:       pick('payRows', 'payments-tbody'),
      search:     pick('paySearch', 'search-input'),
      sort:       pick('paySort', 'sort-select'),
      prev:       pick('prevPage', 'btn-prev'),
      next:       pick('nextPage', 'btn-next'),
      pageInfo:   pick('pageInfo', 'page-indicator'),
      toast:      pick('toast'),
      toastText:  $id('toast-text'),
      exportCsv:  pick('btnExportCsv', 'btn-export-csv'),
      exportXlsx: pick('btnExportXlsx', 'btn-export-xlsx'),
      dateFrom:   $id('dateFrom'),
      dateTo:     $id('dateTo')
    };

    // Guard: required pieces
    if (!els.rows) {
      console.error('paymentsApi: <tbody id="payRows"> or <tbody id="payments-tbody"> not found.');
      return;
    }

    // --- Formatting helpers ---
    const formatZAR = (v) => {
      const n = Number(v);
      if (!isFinite(n)) return 'R —';
      // Use en-ZA formatting and prefix R to match site style
      return 'R ' + new Intl.NumberFormat('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
    };
    const formatDateTime = (s) => {
      if (!s) return '—';
      const d = new Date(s);
      if (isNaN(d.getTime())) return s;
      return d.toLocaleString('en-ZA', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
    };

    // Correct HTML escaper (attribute-safe as well)
    function escapeHtml(str) {
      return String(str ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      })[c]);
    }
    function safeAttr(str) {
      // For attribute contexts like data-invoice; keep it simple and escaped
      return escapeHtml(str).replace(/"/g, '&quot;');
    }

    // Toast
    function showToast(msg, ok = true) {
      if (!els.toast) return;
      if (els.toastText) els.toastText.textContent = msg; else els.toast.textContent = msg;
      els.toast.classList.remove('hidden');
      els.toast.style.borderColor = ok ? '#2F76FF' : '#c0392b';
      clearTimeout(showToast._t);
      showToast._t = setTimeout(() => els.toast.classList.add('hidden'), 3000);
    }

    // Debounce
    const debounce = (fn, ms = 300) => {
      let t;
      return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
    };

    // Abortable fetch to prevent races
    let currentController = null;
    async function fetchPayments() {
      try {
        if (currentController) currentController.abort();
        currentController = new AbortController();

        const params = new URLSearchParams({
          action: 'listPayments',
          page: String(state.page),
          pageSize: String(state.pageSize),
          sort: state.sort
        });
        if (state.q)    params.set('q', state.q);
        if (state.from) params.set('from', state.from);
        if (state.to)   params.set('to', state.to);

        const url = `${API_BASE}?${params.toString()}`;
        const res = await fetch(url, { signal: currentController.signal });

        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
        const json = await res.json();
        if (!json?.ok) throw new Error(json?.error || 'Failed to load payments');

        renderRows(json.data || []);
        updatePager(json.total ?? 0);
        showToast('Payments loaded');
      } catch (err) {
        if (err?.name === 'AbortError') return; // ignore aborted calls
        console.error(err);
        showToast(err.message || 'Failed to load payments', false);
      }
    }

    // Build a single table row (supports responsive labels via data-label)
    function rowTemplate(row) {
      const fileUrl = row.FileUrl ? encodeURI(String(row.FileUrl)) : '';
      const pdfCell = fileUrl
        ? `${fileUrl}View PDF</a>`
        : '—';

      // Released badge
      const released = row.ReleasedAt
        ? `<span class="badge success" title="${escapeHtml(row.ReleasedAt)}">${escapeHtml(formatDateTime(row.ReleasedAt))}</span>`
        : `<span class="badge warning">Pending</span>`;

      return `
        <tr>
          <td data-label="Timestamp">${escapeHtml(formatDateTime(row.Timestamp))}</td>
          <td data-label="Invoice">${escapeHtml(row.InvoiceNo)}</td>
          <td data-label="Order ID">${escapeHtml(row.OrderID)}</td>
          <td data-label="pf_payment_id">${escapeHtml(row.pf_payment_id || '')}</td>
          <td data-label="Email">${escapeHtml(row.Email)}</td>
          <td data-label="SKU">${escapeHtml(row.SKU)}</td>
          <td data-label="Total (incl.)">${escapeHtml(formatZAR(row.TotalInclVAT))}</td>
          <td data-label="Released">${released}</td>
          <td data-label="PDF">${pdfCell}</td>
          <td data-label="Actions">
            <div class="row-actions">
              resendResend Invoice</button>
              <button class="btn small outline" data-action="repair" data-invoice="${safeAttr(row.InvoiceNo)}function renderRows(items) {
      els.rows.innerHTML = items.map(rowTemplate).join('');

      // Action bindings (event delegation for efficiency)
      els.rows.addEventListener('click', onRowAction, { once: true });
    }

    async function onRowAction(e) {
      const btn = e.target.closest('button[data-action]');
      if (!btn) {
        // Re-bind if user clicks non-action elements; keep delegate alive
        els.rows.addEventListener('click', onRowAction, { once: true });
        return;
      }
      const action = btn.getAttribute('data-action');
      const inv = btn.getAttribute('data-invoice');
      if (!inv) return;

      btn.disabled = true;
      try {
        if (action === 'resend') {
          await resendInvoice(inv);
          showToast(`Resent ${inv}`);
        } else if (action === 'repair') {
          await repairInvoice(inv);
          showToast(`Repaired ${inv}`);
          fetchPayments(); // refresh the table to show updated FileUrl/ReleasedAt
        }
      } catch (err) {
        console.error(err);
        showToast(`${action === 'resend' ? 'Resend' : 'Repair'} failed: ${err.message}`, false);
      } finally {
        btn.disabled = false;
        // Re-bind after action
        els.rows.addEventListener('click', onRowAction, { once: true });
      }
    }

    function updatePager(total) {
      const maxPage = Math.max(1, Math.ceil(Number(total || 0) / state.pageSize));
      state.page = Math.min(state.page, maxPage);
      if (els.pageInfo) {
        const text = `Page ${state.page} of ${maxPage}`;
        if (els.pageInfo.tagName === 'SPAN') {
          els.pageInfo.innerHTML = `Page <strong>${state.page}</strong> of ${maxPage}`;
        } else {
          els.pageInfo.textContent = text;
        }
      }
      if (els.prev) els.prev.disabled = state.page <= 1;
      if (els.next) els.next.disabled = state.page >= maxPage;
    }

    async function resendInvoice(invoiceNo) {
      const url = `${API_BASE}?action=resendInvoice&invoiceNo=${encodeURIComponent(invoiceNo)}`;
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || 'Resend failed');
      return true;
    }

    async function repairInvoice(invoiceNo) {
      const url = `${API_BASE}?action=repairInvoice&invoiceNo=${encodeURIComponent(invoiceNo)}`;
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || 'Repair failed');
      return json.fileUrl;
    }

    // --- Events ---
    if (els.search) {
      els.search.addEventListener('input', debounce(() => {
        state.q = els.search.value.trim();
        state.page = 1;
        fetchPayments();
      }, 250));
    }
    if (els.sort) {
      els.sort.addEventListener('change', () => {
        state.sort = els.sort.value;
        state.page = 1;
        fetchPayments();
      });
    }
    if (els.prev) {
      els.prev.addEventListener('click', () => { if (state.page > 1) { state.page--; fetchPayments(); } });
    }
    if (els.next) {
      els.next.addEventListener('click', () => { state.page++; fetchPayments(); });
    }
    if (els.dateFrom) {
      els.dateFrom.addEventListener('change', () => { state.from = els.dateFrom.value; state.page = 1; fetchPayments(); });
    }
    if (els.dateTo) {
      els.dateTo.addEventListener('change', () => { state.to = els.dateTo.value; state.page = 1; fetchPayments(); });
    }

    // Export CSV/XLSX (2000 rows cap to keep files small)
    async function doExport(format) {
      try {
        const params = new URLSearchParams({
          action: 'exportPayments',
          format,
          page: '1',
          pageSize: '2000',
          sort: state.sort
        });
        if (state.q)    params.set('q', state.q);
        if (state.from) params.set('from', state.from);
        if (state.to)   params.set('to', state.to);

        const res = await fetch(`${API_BASE}?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const name = `payments_${stamp}.${format}`;
        downloadBlob(blob, name);
        showToast(`${format.toUpperCase()} exported`);
      } catch (err) {
        console.error(err);
        showToast(`Export failed: ${err.message}`, false);
      }
    }
    if (els.exportCsv)  els.exportCsv.addEventListener('click', () => doExport('csv'));
    if (els.exportXlsx) els.exportXlsx.addEventListener('click', () => doExport('xlsx'));

    function downloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      a.remove(); URL.revokeObjectURL(url);
    }

    // --- Boot ---
    fetchPayments().catch(err => showToast(err.message, false));
  }
})();
</script>
