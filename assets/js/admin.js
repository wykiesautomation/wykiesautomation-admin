
/* Wykies Admin Shell (Dark) — v1.0 */
(function(){
  const KEY_ADMIN = 'wa_admin_key';
  const KEY_CFG = 'wa_admin_cfg';
  const cfgDefault = {
    apiBase: '',
    sheetId: '',
    prodFolderId: '', galFolderId: '', thumbsFolderId: ''
  };

  function loadCfg(){ try{ return Object.assign({}, cfgDefault, JSON.parse(localStorage.getItem(KEY_CFG)||'{}')); }catch(e){ return {...cfgDefault}; } }
  function saveCfg(c){ localStorage.setItem(KEY_CFG, JSON.stringify(c)); }
  function adminKey(){ return localStorage.getItem(KEY_ADMIN)||''; }
  function setAdminKey(k){ if(k) localStorage.setItem(KEY_ADMIN,k); }
  function clearAdmin(){ localStorage.removeItem(KEY_ADMIN); }

  // Simple fetch wrapper adding admin key
  async function apiGet(params){
    const cfg = loadCfg();
    if(!cfg.apiBase) throw new Error('API base missing');
    const url = new URL(cfg.apiBase);
    const q = new URLSearchParams(params);
    q.set('key', adminKey());
    url.search = q.toString();
    const res = await fetch(url.toString(), { cache:'no-store' });
    if(!res.ok) throw new Error('HTTP '+res.status);
    return res.json();
  }
  async function apiPost(payload){
    const cfg = loadCfg();
    if(!cfg.apiBase) throw new Error('API base missing');
    const url = new URL(cfg.apiBase);
    url.search = new URLSearchParams({ key: adminKey() }).toString();
    const res = await fetch(url.toString(), { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    if(!res.ok) throw new Error('HTTP '+res.status);
    return res.json();
  }

  // UI wiring
  const $ = sel => document.querySelector(sel);
  function show(tab){ document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active')); $('#tab-'+tab).classList.add('active'); document.querySelectorAll('.tablink').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab)); }

  function bindNav(){
    document.querySelectorAll('.tablink').forEach(b=> b.addEventListener('click', ()=> show(b.dataset.tab)) );
    $('#btnLogout').addEventListener('click', ()=>{ clearAdmin(); location.reload(); });
  }

  // Login overlay
 
async function signIn(){
  const keyEl = document.querySelector('#adminKey');
  const statusEl = document.querySelector('#loginStatus');
  const key = (keyEl?.value || '').trim();

  // Read config
  let cfg = {};
  try { cfg = JSON.parse(localStorage.getItem('wa_admin_cfg') || '{}'); } catch(e){}

  // Basic checks
  if (!cfg.apiBase) {
    statusEl.textContent = 'API base missing — open Settings and paste your Apps Script Web App URL';
    return;
  }
  if (!key) {
    statusEl.textContent = 'Enter passphrase';
    return;
  }

  // Try auth
  localStorage.setItem('wa_admin_key', key);
  try {
    const url = new URL(cfg.apiBase);
    url.search = new URLSearchParams({ action: 'auth', key }).toString();
    const res = await fetch(url.toString(), { cache: 'no-store' });
    const json = await res.json();
    if (json && json.ok) {
      document.getElementById('login').style.display = 'none';
      initApp();
    } else {
      throw new Error('Auth failed');
    }
  } catch (err) {
    statusEl.textContent = 'Invalid passphrase or API URL';
    localStorage.removeItem('wa_admin_key');
  }
}


  function bindLogin(){ $('#btnLogin').addEventListener('click', signIn); $('#adminKey').addEventListener('keydown', e=>{ if(e.key==='Enter') signIn(); }); }

  // Settings load/save
  function loadSettingsForm(){ const c=loadCfg(); $('#apiBase').value=c.apiBase; $('#sheetId').value=c.sheetId; $('#prodFolderId').value=c.prodFolderId; $('#galFolderId').value=c.galFolderId; $('#thumbsFolderId').value=c.thumbsFolderId; updateLinks(); }
  function updateLinks(){ const c=loadCfg(); if(c.sheetId) $('#lnkSheet').href = 'https://docs.google.com/spreadsheets/d/'+c.sheetId+'/edit'; if(c.prodFolderId) $('#lnkProdFolder').href='https://drive.google.com/drive/folders/'+c.prodFolderId; if(c.galFolderId) $('#lnkGalFolder').href='https://drive.google.com/drive/folders/'+c.galFolderId; if(c.thumbsFolderId) $('#lnkThumbsFolder').href='https://drive.google.com/drive/folders/'+c.thumbsFolderId; }
  function saveSettings(){ const c=loadCfg(); c.apiBase=$('#apiBase').value.trim(); c.sheetId=$('#sheetId').value.trim(); c.prodFolderId=$('#prodFolderId').value.trim(); c.galFolderId=$('#galFolderId').value.trim(); c.thumbsFolderId=$('#thumbsFolderId').value.trim(); saveCfg(c); $('#saveStatus').textContent='Saved locally'; updateLinks(); }

  async function pushFolders(){ try{ const c=loadCfg(); const json = await apiPost({ action:'setFolders', prodFolderId:c.prodFolderId, galFolderId:c.galFolderId, thumbsFolderId:c.thumbsFolderId }); $('#saveStatus').textContent = json.ok? 'Folder IDs saved to API' : 'Failed: '+(json.error||''); }catch(e){ $('#saveStatus').textContent = 'Failed to push'; } }

  // Load data tables
  async function loadDashboard(){ try{ const stats = await apiGet({ action:'stats' }); $('#kpiProducts').textContent = stats.products||0; $('#kpiPaymentsToday').textContent = stats.paymentsToday||0; $('#kpiGallery').textContent = stats.gallery||0; }catch(e){ /* ignore */ } }
  async function loadProducts(){ const t=$('#tblProducts tbody'); t.innerHTML=''; try{ const json=await apiGet({ action:'products' }); (json.products||[]).forEach(p=>{ const tr=document.createElement('tr'); tr.innerHTML = `<td>${p.sku}</td><td>${p.name}</td><td>R${Number(p.price).toLocaleString('en-ZA')}</td><td>${p.active?'Yes':'No'}</td><td>${p.imageUrl?'<img src="'+p.imageUrl+'" alt="" style="height:28px">':''}</td>`; t.appendChild(tr); }); }catch(e){ t.innerHTML='<tr><td colspan="5">Failed to load</td></tr>'; } }
  async function loadGallery(){ const t=$('#tblGallery tbody'); t.innerHTML=''; try{ const json=await apiGet({ action:'gallery' }); (json.gallery||[]).forEach(g=>{ const tr=document.createElement('tr'); tr.innerHTML = `<td>${g.thumbUrl?'<img src="'+g.thumbUrl+'" alt="" style="height:40px">':''}</td><td>${g.caption||''}</td><td>${g.sku||''}</td>`; t.appendChild(tr); }); }catch(e){ t.innerHTML='<tr><td colspan="3">Failed to load</td></tr>'; } }
  async function loadPayments(){ const t=$('#tblPayments tbody'); t.innerHTML=''; try{ const json=await apiGet({ action:'payments' }); (json.payments||[]).forEach(r=>{ const tr=document.createElement('tr'); tr.innerHTML = `<td>${r.Timestamp||''}</td><td>${r.InvoiceNo||''}</td><td>${r.OrderID||''}</td><td>${r.Email||''}</td><td>${r.SKU||''}</td><td>R${Number(r.TotalInclVAT||0).toLocaleString('en-ZA')}</td><td><button class="btn btn-outline" data-inv="${r.InvoiceNo||''}" data-email="${r.Email||''}">Resend Invoice</button></td>`; t.appendChild(tr); }); t.querySelectorAll('button').forEach(b=> b.addEventListener('click', async ()=>{ const inv=b.dataset.inv; try{ const res=await apiPost({ action:'resendInvoice', invoiceNo:inv, email:b.dataset.email }); b.textContent = res.ok? 'Sent ✔' : 'Failed'; }catch(e){ b.textContent='Failed'; } })); }catch(e){ t.innerHTML='<tr><td colspan="7">Failed to load</td></tr>'; } }
  async function loadLogs(){ const t=$('#tblLogs tbody'); t.innerHTML=''; try{ const json=await apiGet({ action:'priceLog' }); (json.logs||[]).forEach(r=>{ const tr=document.createElement('tr'); tr.innerHTML = `<td>${r.Timestamp||''}</td><td>${r.SKU||''}</td><td>R${Number(r.OldPrice||0).toLocaleString('en-ZA')}</td><td>R${Number(r.NewPrice||0).toLocaleString('en-ZA')}</td><td>${r.ChangedBy||''}</td><td>${r.SourceIP||''}</td>`; t.appendChild(tr); }); }catch(e){ t.innerHTML='<tr><td colspan="6">Failed to load</td></tr>'; } }

  // Sync buttons
  async function syncProducts(){ const st=$('#syncStatus'); st.textContent='Syncing product images…'; try{ const c=loadCfg(); const res=await apiPost({ action:'syncProducts', folderId:c.prodFolderId }); st.textContent = res.ok? `Updated ${res.updated||0} entries` : 'Failed'; loadProducts(); }catch(e){ st.textContent='Failed'; } }
  async function syncGallery(){ const st=$('#syncStatus'); st.textContent='Syncing gallery…'; try{ const c=loadCfg(); const res=await apiPost({ action:'syncGallery', folderIdGallery:c.galFolderId, folderIdThumbs:c.thumbsFolderId }); st.textContent = res.ok? `Synced ${res.count||0} items` : 'Failed'; loadGallery(); }catch(e){ st.textContent='Failed'; } }

  function bindActions(){ $('#btnSyncProducts').addEventListener('click', syncProducts); $('#btnSyncGallery').addEventListener('click', syncGallery); $('#btnSyncGallery2').addEventListener('click', syncGallery); $('#btnSaveSettings').addEventListener('click', saveSettings); $('#btnPushFolders').addEventListener('click', pushFolders); }

  async function initApp(){ bindNav(); bindActions(); loadSettingsForm(); await loadDashboard(); await loadProducts(); await loadGallery(); await loadPayments(); await loadLogs(); }

  // Auto attempt session
  async function boot(){ bindLogin(); const k = adminKey(); if(!k){ return; } try{ const ok = await apiGet({ action:'auth' }); if(ok && ok.ok){ document.getElementById('login').style.display='none'; initApp(); } }catch(e){ /* stay on login */ }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
