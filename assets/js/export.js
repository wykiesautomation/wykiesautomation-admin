// CSV export for Price Log
let _priceLogCache = [];
export function setPriceLogCache(rows){ _priceLogCache = Array.isArray(rows)? rows : []; }
function toCsvValue(v){ if(v==null) return ''; const s=String(v); if(/[",
]/.test(s)) return '"'+s.replace(/"/g,'""')+'"'; return s; }
export function exportPriceLogCsv(){
  const rows = _priceLogCache || [];
  const headers = ['when','product','old','new','who','note'];
  const lines = [headers.join(',')];
  for(const r of rows){ lines.push([r.when,r.product,r.old,r.new,r.who,(r.note||'')].map(toCsvValue).join(',')); }
  const blob = new Blob([lines.join('
')+'
'], { type:'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const ts = new Date().toISOString().replace(/[:T]/g,'-').slice(0,19);
  a.href = url; a.download = `price-log-${ts}.csv`; a.style.display='none';
  document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 200);
}
