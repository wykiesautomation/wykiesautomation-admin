
// Admin Payments UI: fetch + render + actions
(() => {
  const state = { page:1, pageSize:25, sort:'timestamp_desc', q:'', from:'', to:'' };
  const API_BASE = window.CONFIG?.PAYMENTS_API_URL || 'https://admin-proxy.wykiesautomation.co.za/payments';

  const els = {
    rows: document.getElementById('payRows'),
    search: document.getElementById('paySearch'),
    sort: document.getElementById('paySort'),
    prev: document.getElementById('prevPage'),
    next: document.getElementById('nextPage'),
    pageInfo: document.getElementById('pageInfo'),
    toast: document.getElementById('toast'),
    exportCsv: document.getElementById('btnExportCsv'),
    exportXlsx: document.getElementById('btnExportXlsx'),
    dateFrom: document.getElementById('dateFrom'),
    dateTo: document.getElementById('dateTo')
  };

  function showToast(msg, ok=true){
    els.toast.textContent = msg;
    els.toast.classList.remove('hidden');
    els.toast.style.borderColor = ok ? '#2F76FF' : '#c0392b';
    setTimeout(()=> els.toast.classList.add('hidden'), 3000);
  }

  async function fetchPayments(){
    const params = new URLSearchParams({ action:'listPayments', page:String(state.page), pageSize:String(state.pageSize), sort: state.sort });
    if (state.q) params.set('q', state.q);
    if (state.from) params.set('from', state.from);
    if (state.to) params.set('to', state.to);
    const res = await fetch(`${API_BASE}?${params.toString()}`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Failed to load payments');
    renderRows(json.data);
    updatePager(json.total);
  }

  function renderRows(items){
    els.rows.innerHTML = items.map(row => `
      <tr>
        <td>${escapeHtml(row.Timestamp)}</td>
        <td>${escapeHtml(row.InvoiceNo)}</td>
        <td>${escapeHtml(row.OrderID)}</td>
        <td>${escapeHtml(row.pf_payment_id || '')}</td>
        <td>${escapeHtml(row.Email)}</td>
        <td>${escapeHtml(row.SKU)}</td>
        <td>R${Number(row.TotalInclVAT).toFixed(2)}</td>
        <td>${escapeHtml(row.ReleasedAt || '')}</td>
        <td>${row.FileUrl ? `${encodeURI(row.FileUrl)}View PDF</a>` : '—'}</td>
        <td>
          <button class="btn-resend" data-invoice="${escapeHtml(row.InvoiceNo)}">Resend Invoice</button>
          <button class="btn-repair" data-invoice="${escapeHtml(row.InvoiceNo)}">Repair PDF</button>
        </td>
      </tr>
    `).join('');

    els.rows.querySelectorAll('.btn-resend').forEach(btn => {
      btn.addEventListener('click', async () => {
        const inv = btn.getAttribute('data-invoice');
        btn.disabled = true;
        try { await resendInvoice(inv); showToast(`Resent ${inv}`); }
        catch(err){ console.error(err); showToast(`Resend failed: ${err.message}`, false); }
        finally { btn.disabled = false; }
      });
    });
    els.rows.querySelectorAll('.btn-repair').forEach(btn => {
      btn.addEventListener('click', async () => {
        const inv = btn.getAttribute('data-invoice');
        btn.disabled = true;
        try { const url = await repairInvoice(inv); showToast(`Repaired ${inv}`); fetchPayments(); }
        catch(err){ console.error(err); showToast(`Repair failed: ${err.message}`, false); }
        finally { btn.disabled = false; }
      });
    });
  }

  function updatePager(total){
    const maxPage = Math.max(1, Math.ceil(total / state.pageSize));
    state.page = Math.min(state.page, maxPage);
    els.pageInfo.textContent = `Page ${state.page} of ${maxPage}`;
    els.prev.disabled = state.page <= 1;
    els.next.disabled = state.page >= maxPage;
  }

  async function resendInvoice(invoiceNo){
    const url = `${API_BASE}?action=resendInvoice&invoiceNo=${encodeURIComponent(invoiceNo)}`;
    const res = await fetch(url, { method:'GET' });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Resend failed');
    return true;
  }

  async function repairInvoice(invoiceNo){
    const url = `${API_BASE}?action=repairInvoice&invoiceNo=${encodeURIComponent(invoiceNo)}`;
    const res = await fetch(url, { method:'GET' });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Repair failed');
    return json.fileUrl;
  }

  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // Events
  els.search.addEventListener('input', () => { state.q = els.search.value.trim(); state.page = 1; fetchPayments(); });
  els.sort.addEventListener('change', () => { state.sort = els.sort.value; state.page = 1; fetchPayments(); });
  els.prev.addEventListener('click', () => { state.page--; fetchPayments(); });
  els.next.addEventListener('click', () => { state.page++; fetchPayments(); });

  els.dateFrom.addEventListener('change', () => { state.from = els.dateFrom.value; state.page = 1; fetchPayments(); });
  els.dateTo.addEventListener('change', () => { state.to = els.dateTo.value; state.page = 1; fetchPayments(); });

  // Export CSV
  els.exportCsv.addEventListener('click', async () => {
    try {
      const params = new URLSearchParams({ action:'exportPayments', format:'csv', page:'1', pageSize:'2000', sort: state.sort });
      if (state.q) params.set('q', state.q);
      if (state.from) params.set('from', state.from);
      if (state.to) params.set('to', state.to);
      const res = await fetch(`${API_BASE}?${params.toString()}`);
      const blob = await res.blob();
      downloadBlob(blob, `payments_${new Date().toISOString().replace(/[:.]/g,'-')}.csv`);
      showToast('CSV exported');
    } catch(err){ console.error(err); showToast(`Export failed: ${err.message}`, false); }
  });

  // Export XLSX
  els.exportXlsx.addEventListener('click', async () => {
    try {
      const params = new URLSearchParams({ action:'exportPayments', format:'xlsx', page:'1', pageSize:'2000', sort: state.sort });
      if (state.q) params.set('q', state.q);
      if (state.from) params.set('from', state.from);
      if (state.to) params.set('to', state.to);
      const res = await fetch(`${API_BASE}?${params.toString()}`);
      const blob = await res.blob();
      downloadBlob(blob, `payments_${new Date().toISOString().replace(/[:.]/g,'-')}.xlsx`);
      showToast('XLSX exported');
    } catch(err){ console.error(err); showToast(`Export failed: ${err.message}`, false); }
  });

  function downloadBlob(blob, filename){
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  // Boot
  fetchPayments().catch(err => showToast(err.message, false));
})();
