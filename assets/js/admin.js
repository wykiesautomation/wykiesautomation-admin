
// Admin core helpers
const toast = (msg)=>{ const t=document.getElementById('toast'); t.textContent=msg; t.style.display='block'; setTimeout(()=>t.style.display='none', 2500); };
const openTab = (id)=>{ document.querySelectorAll('.tab').forEach(el=>el.classList.remove('active')); document.getElementById(id).classList.add('active'); };

async function getCfg(){ return fetch('config.json').then(r=>r.json()); }
