(() => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

  function init(){
    const API_BASE = window.CONFIG?.PAYMENTS_API_URL || '';
    const $ = (id)=>document.getElementById(id);
    const els = { rows: $('payRows'), search: $('paySearch'), sort: $('paySort'), prev: $('prevPage'), next: $('nextPage'), pageInfo: $('pageInfo'), toast: $('toast'), toastText: $('toast-text'), exportCsv: $('btnExportCsv'), exportXlsx: $('btnExportXlsx') };

    const state = { page:1, pageSize:25, sort:'timestamp_desc', q:'' };
    let controller=null;

    function authHeaders(){ const h={}; const t=window.__ID_TOKEN__; if(t) h['X-ID-Token']=t; return h; }
    function showToast(msg, ok=true){ if(!els.toast) return; (els.toastText?els.toastText:els.toast).textContent=msg; els.toast.classList.remove('hidden'); els.toast.style.borderColor = ok ? '#2F76FF' : '#c0392b'; clearTimeout(showToast._t); showToast._t=setTimeout(()=>els.toast.classList.add('hidden'),3000); }
    const fmtZAR=(v)=> 'R ' + new Intl.NumberFormat('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v||0));
    const fmtDT=(s)=>{ if(!s) return '—'; const d=new Date(s); return isNaN(d)? String(s): d.toLocaleString('en-ZA',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}); };
    const escapeHtml=(s)=> String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));

    async function fetchPayments(){
      try{
        if(controller) controller.abort(); controller = new AbortController();
        const params = new URLSearchParams({ action:'listPayments', page:String(state.page), pageSize:String(state.pageSize), sort: state.sort }); if(state.q) params.set('q', state.q);
        const res = await fetch(`${API_BASE}?${params.toString()}`, { signal: controller.signal, headers: authHeaders() }); if(!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json(); if(!json?.ok) throw new Error(json?.error||'Failed to load payments');
        renderRows(json.data||[]); updatePager(json.total||0); showToast('Payments loaded');
      }catch(err){ if(err?.name==='AbortError') return; console.error(err); showToast(err.message||'Failed to load payments', false); }
    }

    function rowTemplate(row){
      const fileUrl = row.FileUrl ? encodeURI(String(row.FileUrl)) : '';
      const pdfCell = fileUrl ? `<a href="${fileUrl}" target="_blank" rel="noopener">View PDF</a>` : '—';
      const released = row.ReleasedAt ? `<span class="badge success" title="${escapeHtml(row.ReleasedAt)}">${escapeHtml(fmtDT(row.ReleasedAt))}</span>` : `<span class="badge warning">Pending</span>`;
      return `
        <tr>
          <td data-label="Timestamp">${escapeHtml(fmtDT(row.Timestamp))}</td>
          <td data-label="Invoice">${escapeHtml(row.InvoiceNo)}</td>
          <td data-label="Order ID">${escapeHtml(row.OrderID)}</td>
          <td data-label="pf_payment_id">${escapeHtml(row.pf_payment_id||'')}</td>
          <td data-label="Email">${escapeHtml(row.Email)}</td>
          <td data-label="SKU">${escapeHtml(row.SKU)}</td>
          <td data-label="Total (incl.)">${escapeHtml(fmtZAR(row.TotalInclVAT))}</td>
          <td data-label="Released">${released}</td>
          <td data-label="PDF">${pdfCell}</td>
          <td data-label="Actions"><div class="row-actions"><button class="btn small" data-action="resend" data-invoice="${escapeHtml(row.InvoiceNo)}">Resend Invoice</button> <button class="btn small outline" data-action="repair" data-invoice="${escapeHtml(row.InvoiceNo)}">Repair PDF</button></div></td>
        </tr>`;
    }

    function renderRows(items){ els.rows.innerHTML = items.map(rowTemplate).join(''); els.rows.addEventListener('click', onRowAction, { once:true }); }

    async function onRowAction(e){ const btn = e.target.closest('button[data-action]'); if(!btn){ els.rows.addEventListener('click', onRowAction,{ once:true }); return; } const action=btn.getAttribute('data-action'); const inv=btn.getAttribute('data-invoice'); if(!inv) return; btn.disabled=true; try{ if(action==='resend'){ await resendInvoice(inv); showToast(`Resent ${inv}`); } else if(action==='repair'){ await repairInvoice(inv); showToast(`Repaired ${inv}`); fetchPayments(); } }catch(err){ console.error(err); showToast(`${action==='resend'?'Resend':'Repair'} failed: ${err.message}`, false); } finally { btn.disabled=false; els.rows.addEventListener('click', onRowAction,{ once:true }); } }

    function updatePager(total){ const max=Math.max(1, Math.ceil(Number(total||0)/state.pageSize)); state.page=Math.min(state.page,max); if(els.pageInfo){ els.pageInfo.textContent = `Page ${state.page} of ${max}`; } if(els.prev) els.prev.disabled = state.page<=1; if(els.next) els.next.disabled = state.page>=max; }

    async function resendInvoice(invoiceNo){ const url=`${API_BASE}?action=resendInvoice&invoiceNo=${encodeURIComponent(invoiceNo)}`; const res=await fetch(url,{method:'GET', headers: authHeaders()}); if(!res.ok) throw new Error(`HTTP ${res.status}`); const json=await res.json(); if(!json?.ok) throw new Error(json?.error||'Resend failed'); return true; }
    async function repairInvoice(invoiceNo){ const url=`${API_BASE}?action=repairInvoice&invoiceNo=${encodeURIComponent(invoiceNo)}`; const res=await fetch(url,{method:'GET', headers: authHeaders()}); if(!res.ok) throw new Error(`HTTP ${res.status}`); const json=await res.json(); if(!json?.ok) throw new Error(json?.error||'Repair failed'); return json.fileUrl; }

    els.search?.addEventListener('input', ()=>{ state.q=els.search.value.trim(); state.page=1; fetchPayments(); });
    els.sort?.addEventListener('change', ()=>{ state.sort=els.sort.value; state.page=1; fetchPayments(); });
    els.prev?.addEventListener('click', ()=>{ if(state.page>1){ state.page--; fetchPayments(); }});
    els.next?.addEventListener('click', ()=>{ state.page++; fetchPayments(); });

    async function doExport(format){ try{ const params=new URLSearchParams({ action:'exportPayments', format, page:'1', pageSize:'2000', sort: state.sort }); if(state.q) params.set('q', state.q); const res=await fetch(`${API_BASE}?${params.toString()}`, { headers: authHeaders() }); if(!res.ok) throw new Error(`HTTP ${res.status}`); const blob=await res.blob(); const stamp=new Date().toISOString().replace(/[:.]/g,'-'); const name=`payments_${stamp}.${format}`; const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); showToast(`${format.toUpperCase()} exported`); } catch(err){ console.error(err); showToast(`Export failed: ${err.message}`, false); } }

    els.exportCsv?.addEventListener('click', ()=>doExport('csv'));
    els.exportXlsx?.addEventListener('click', ()=>doExport('xlsx'));

    fetchPayments();
  }
})();
