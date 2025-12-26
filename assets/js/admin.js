/* Admin dashboard skeleton (no secrets) */
const CFG = {
  domain: 'admin.wykiesautomation.co.za',
  sheetId: '12qRMe6pAPVaQtosZBnhVtpMwyNks7W8uY9PX1mF620k',
  appsScriptUrl: '<YOUR_APPS_SCRIPT_WEBAPP_URL>',
  adminAllowedEmails: ['wykiesautomation@gmail.com'],
  roles: ['Admin','Viewer']
};

const tabs = document.querySelectorAll('.tabs button');
const sections = document.querySelectorAll('.tab');

tabs.forEach(btn=>btn.addEventListener('click',()=>{
  const id = btn.dataset.tab;
  sections.forEach(s=>s.classList.toggle('active', s.id===id));
}));

function toast(msg){
  const t = document.createElement('div');
  t.className='toast'; t.textContent=msg; document.body.appendChild(t);
  setTimeout(()=>t.remove(), 2500);
}

document.getElementById('products').innerHTML = '<h2>Products</h2><p>Editable grid loads from Google Sheets (Apps Script).</p>';
document.getElementById('gallery').innerHTML = '<h2>Gallery</h2><p>Drag-and-drop upload with captions and order.</p>';
document.getElementById('payments').innerHTML = '<h2>Payments</h2><p>Read-only verified ITN records with Resend Invoice action.</p>';
document.getElementById('logs').innerHTML = '<h2>Logs</h2><p>Audit trail for price changes and admin actions.</p>';
