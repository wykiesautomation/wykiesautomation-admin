// tab switching
const tabs = document.querySelectorAll('.tabs a');
const sections = {
  dashboard: document.getElementById('tab-dashboard'),
  catalog: document.getElementById('tab-catalog'),
  prices: document.getElementById('tab-prices'),
  payments: document.getElementById('tab-payments'),
  analytics: document.getElementById('tab-analytics'),
  pages: document.getElementById('tab-pages'),
  settings: document.getElementById('tab-settings'),
  audit: document.getElementById('tab-audit')
};
for (const a of tabs){ a.addEventListener('click',()=>{ document.querySelector('.tabs a.active')?.classList.remove('active'); a.classList.add('active'); document.querySelector('.tab.active')?.classList.remove('active'); sections[a.dataset.tab].classList.add('active'); }); }
