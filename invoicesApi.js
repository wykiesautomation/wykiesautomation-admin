(() => {
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
  function init(){
    const $=(id)=>document.getElementById(id);
    const els={ tabInvoices: $('tabInvoices'), rows:$('invRows'), prev:$('invPrev'), next:$('invNext'), pageInfo:$('invPageInfo'), search:$('invSearch'), sort:$('invSort'), btnNew:$('btnNewInvoice'), btnExport:$('btnExportInvoices'), dlg:$('invDialog'), form:$('invForm'), dlgTitle:$('invDlgTitle'), iInvoiceNo:$('iInvoiceNo'), iDate:$('iDate'), iCustomer:$('iCustomer'), iEmail:$('iEmail'), iSku:$('iSku'), iName:$('iName'), iQty:$('iQty'), iUnit:$('iUnit'), btnAddItem:$('btnAddItem'), itemRows:$('invItemRows'), invSubtotal:$('invSubtotal'), invVat:$('invVat'), invTotal:$('invTotal'), btnSave:$('btnSaveInvoice'), btnCancel:$('btnCancelInvoice'), toast: $('toast'), toastText: $('toast-text') };
    const VAT = window.CONFIG.VAT_PERCENT || 15; const state={ page:1,pageSize:25,sort:'date_desc',q:'', invoices:[], items:[], editing:null };
    const showTab=()=>{ if(window.__ID_TOKEN__) els.tabInvoices.hidden=false; }; showTab(); window.addEventListener('focus', showTab);
    const fmtZAR=(v)=> 'R ' + new Intl.NumberFormat('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v||0));
    const escapeHtml=(s)=>String(s??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
    function showToast(msg, ok=true){ (els.toastText||els.toast).textContent=msg; els.toast.classList.remove('hidden'); els.toast.style.borderColor = ok ? '#2F76FF' : '#c0392b'; clearTimeout(showToast._t); showToast._t=setTimeout(()=>els.toast.classList.add('hidden'),3000); }

    async function loadInvoices(){ try{ const u=new URL(window.CONFIG.CMS_API_URL); u.searchParams.set('action','listInvoices'); u.searchParams.set('sheetId', window.CONFIG.SHEET_ID); u.searchParams.set('page', String(state.page)); u.searchParams.set('pageSize', String(state.pageSize)); u.searchParams.set('sort', state.sort); if(state.q) u.searchParams.set('q', state.q); const res=await fetch(u.toString()); if(!res.ok) throw new Error(`HTTP ${res.status}`); const j=await res.json(); if(!j?.ok) throw new Error(j?.error||'Failed to load invoices'); state.invoices=j.data||[]; renderRows(state.invoices); updatePager(j.total||state.invoices.length); showToast('Invoices loaded'); }catch(err){ console.error(err); showToast(err.message,false); } }

    function rowTemplate(inv){ const pdf=inv.PdfUrl? `<a href="${escapeHtml(inv.PdfUrl)}" target="_blank" rel="noopener">PDF</a>`:'—'; const paid=inv.Paid? `<span class="badge success">Yes</span>`:`<span class="badge warning">No</span>`; return `
      <tr>
        <td data-label="Invoice"><strong>${escapeHtml(inv.InvoiceNo)}</strong></td>
        <td data-label="Date">${escapeHtml(inv.Date)}</td>
        <td data-label="Customer">${escapeHtml(inv.CustomerName)}</td>
        <td data-label="Email">${escapeHtml(inv.Email)}</td>
        <td data-label="Subtotal">${fmtZAR(inv.Subtotal)}</td>
        <td data-label="VAT">${fmtZAR(inv.VAT)}</td>
        <td data-label="Total (incl.)">${fmtZAR(inv.TotalIncl)}</td>
        <td data-label="Paid">${paid}</td>
        <td data-label="PDF">${pdf}</td>
        <td data-label="Actions">
          <div class="row-actions">
            <button class="btn small" data-action="edit" data-inv="${escapeHtml(inv.InvoiceNo)}">Edit</button>
            <button class="btn small" data-action="pdf" data-inv="${escapeHtml(inv.InvoiceNo)}">Generate PDF</button>
            <button class="btn small" data-action="email" data-inv="${escapeHtml(inv.InvoiceNo)}">Email</button>
            <button class="btn small outline" data-action="markPaid" data-inv="${escapeHtml(inv.InvoiceNo)}">Mark Paid</button>
            <button class="btn small danger" data-action="delete" data-inv="${escapeHtml(inv.InvoiceNo)}">Delete</button>
          </div>
        </td>
      </tr>`; }

    function renderRows(items){ els.rows.innerHTML = items.map(rowTemplate).join(''); }
    function updatePager(total){ const max=Math.max(1,Math.ceil(Number(total||0)/state.pageSize)); state.page=Math.min(state.page,max); els.pageInfo.textContent=`Page ${state.page} of ${max}`; els.prev.disabled=state.page<=1; els.next.disabled=state.page>=max; }

    els.search?.addEventListener('input', ()=>{ state.q=els.search.value.trim(); state.page=1; loadInvoices(); });
    els.sort?.addEventListener('change', ()=>{ state.sort=els.sort.value; state.page=1; loadInvoices(); });
    els.prev?.addEventListener('click', ()=>{ if(state.page>1){ state.page--; loadInvoices(); }});
    els.next?.addEventListener('click', ()=>{ state.page++; loadInvoices(); });

    els.btnNew?.addEventListener('click', ()=>{ requireSignedIn(); state.editing=null; state.items=[]; clearDlg(); els.dlgTitle.textContent='New Invoice'; els.dlg.showModal(); });
    function clearDlg(){ els.iInvoiceNo.value=''; els.iDate.value=(new Date()).toISOString().slice(0,10); els.iCustomer.value=''; els.iEmail.value=''; els.iSku.value=''; els.iName.value=''; els.iQty.value=''; els.iUnit.value=''; renderItemRows(); recalcTotals(); }

    function renderItemRows(){ els.itemRows.innerHTML = state.items.map((it,idx)=>`<tr><td>${escapeHtml(it.SKU||'')}</td><td>${escapeHtml(it.Name||'')}</td><td>${escapeHtml(it.Qty||1)}</td><td>${fmtZAR(it.UnitPriceIncl||0)}</td><td>${fmtZAR((it.Qty||1)*(it.UnitPriceIncl||0))}</td><td><button class="btn small danger" data-action="delItem" data-idx="${idx}">Remove</button></td></tr>`).join(''); }
    function recalcTotals(){ const subtotal=state.items.reduce((s,it)=> s + (it.Qty||1)*(it.UnitPriceIncl||0),0); const vat=subtotal*(VAT/100); const total=subtotal+vat; els.invSubtotal.textContent=fmtZAR(subtotal); els.invVat.textContent=fmtZAR(vat); els.invTotal.textContent=fmtZAR(total); }

    els.btnAddItem?.addEventListener('click', async ()=>{ requireSignedIn(); const sku=els.iSku.value.trim(); const name=els.iName.value.trim(); const qty=Number(els.iQty.value||1); let unit=Number(els.iUnit.value||0); if(sku && (!unit || unit<=0)){ try{ const u=new URL(window.CONFIG.CMS_API_URL); u.searchParams.set('action','getProduct'); u.searchParams.set('sheetId', window.CONFIG.SHEET_ID); u.searchParams.set('sku', sku); const r=await fetch(u.toString()); const j=await r.json(); if(j?.ok && j.data?.PriceIncl) unit = Number(j.data.PriceIncl); if(!name && j.data?.Name) els.iName.value=j.data.Name; }catch{} }
      state.items.push({ SKU: sku, Name: (name||els.iName.value||sku), Qty: qty, UnitPriceIncl: unit }); els.iSku.value=''; els.iName.value=''; els.iQty.value=''; els.iUnit.value=''; renderItemRows(); recalcTotals(); });

    els.itemRows?.addEventListener('click', (ev)=>{ const btn=ev.target.closest('button[data-action="delItem"]'); if(!btn) return; const idx=Number(btn.getAttribute('data-idx')); state.items.splice(idx,1); renderItemRows(); recalcTotals(); });

    els.btnSave?.addEventListener('click', async (e)=>{ e.preventDefault(); requireSignedIn(); try{ const payload={ action: state.editing? 'updateInvoice':'createInvoice', sheetId: window.CONFIG.SHEET_ID, idToken: window.__ID_TOKEN__, expectedClientId: window.CONFIG.GOOGLE_CLIENT_ID, InvoiceNo: els.iInvoiceNo.value.trim(), Date: els.iDate.value || (new Date()).toISOString().slice(0,10), CustomerName: els.iCustomer.value.trim(), Email: els.iEmail.value.trim(), Items: state.items };
      const res=await fetch(window.CONFIG.CMS_API_URL,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) }); if(!res.ok) throw new Error(`HTTP ${res.status}`); const j=await res.json(); if(!j?.ok) throw new Error(j?.error||'Save failed'); els.dlg.close(); showToast(state.editing?'Invoice updated':'Invoice created'); loadInvoices(); }catch(err){ console.error(err); showToast(err.message,false); } });
    els.btnCancel?.addEventListener('click', (e)=>{ e.preventDefault(); els.dlg.close(); });

    els.rows?.addEventListener('click', async (ev)=>{
      const btn=ev.target.closest('button[data-action]'); if(!btn) return; const inv=btn.getAttribute('data-inv'); const action=btn.getAttribute('data-action'); requireSignedIn();
      if(action==='edit'){
        const u=new URL(window.CONFIG.CMS_API_URL); u.searchParams.set('action','getInvoice'); u.searchParams.set('sheetId', window.CONFIG.SHEET_ID); u.searchParams.set('invoiceNo', inv); const r=await fetch(u.toString()); const j=await r.json(); if(!j?.ok) return showToast(j?.error||'Load failed', false); state.editing=inv; els.dlgTitle.textContent=`Edit: ${inv}`; els.iInvoiceNo.value=j.data.InvoiceNo||inv; els.iDate.value=j.data.Date || (new Date()).toISOString().slice(0,10); els.iCustomer.value=j.data.CustomerName||''; els.iEmail.value=j.data.Email||''; state.items=j.items||[]; renderItemRows(); recalcTotals(); els.dlg.showModal();
      } else if(action==='delete'){
        if(!confirm(`Delete invoice ${inv}?`)) return; const res=await fetch(window.CONFIG.CMS_API_URL,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'deleteInvoice', sheetId: window.CONFIG.SHEET_ID, idToken: window.__ID_TOKEN__, expectedClientId: window.CONFIG.GOOGLE_CLIENT_ID, InvoiceNo: inv }) }); const j=await res.json(); if(!j?.ok) return showToast(j?.error||'Delete failed', false); showToast('Invoice deleted'); loadInvoices();
      } else if(action==='pdf'){
        const res=await fetch(window.CONFIG.CMS_API_URL,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'generateInvoicePdf', sheetId: window.CONFIG.SHEET_ID, idToken: window.__ID_TOKEN__, expectedClientId: window.CONFIG.GOOGLE_CLIENT_ID, InvoiceNo: inv, driveFolderId: window.CONFIG.DRIVE_FOLDER_ID }) }); const j=await res.json(); if(!j?.ok) return showToast(j?.error||'PDF failed', false); showToast('PDF generated'); loadInvoices();
      } else if(action==='email'){
        const res=await fetch(window.CONFIG.CMS_API_URL,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'emailInvoice', sheetId: window.CONFIG.SHEET_ID, idToken: window.__ID_TOKEN__, expectedClientId: window.CONFIG.GOOGLE_CLIENT_ID, InvoiceNo: inv, driveFolderId: window.CONFIG.DRIVE_FOLDER_ID }) }); const j=await res.json(); if(!j?.ok) return showToast(j?.error||'Email failed', false); showToast('Invoice emailed');
      } else if(action==='markPaid'){
        const res=await fetch(window.CONFIG.CMS_API_URL,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'markInvoicePaid', sheetId: window.CONFIG.SHEET_ID, idToken: window.__ID_TOKEN__, expectedClientId: window.CONFIG.GOOGLE_CLIENT_ID, InvoiceNo: inv }) }); const j=await res.json(); if(!j?.ok) return showToast(j?.error||'Mark paid failed', false); showToast('Marked as paid'); loadInvoices();
      }
    });

    function requireSignedIn(){ if(!window.__ID_TOKEN__) throw new Error('Please sign in with Google first'); }

    // Optional CSV export for invoices
    els.btnExport?.addEventListener('click', ()=>{
      const cols=['InvoiceNo','Date','CustomerName','Email','Subtotal','VAT','TotalIncl','Paid','PdfUrl'];
      const lines=[cols.join(',')];
      for(const x of state.invoices){ lines.push([x.InvoiceNo, x.Date, `"${(x.CustomerName||'').replace(/"/g,'""')}"`, x.Email, x.Subtotal, x.VAT, x.TotalIncl, x.Paid?1:0, x.PdfUrl||''].join(',')); }
      const blob=new Blob([lines.join('\n')], {type:'text/csv;charset=utf-8'}); const stamp=new Date().toISOString().replace(/[:.]/g,'-'); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`invoices_${stamp}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); showToast('CSV exported');
    });

    loadInvoices();
  }
})();
