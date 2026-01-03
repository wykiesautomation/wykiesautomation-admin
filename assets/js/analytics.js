// Simple canvas charts without external libs
import { apiGet } from './api.js';

function drawLineChart(canvas, points, color='#2F76FF'){
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height; ctx.clearRect(0,0,w,h);
  // axes
  ctx.strokeStyle = '#273447'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(40,10); ctx.lineTo(40,h-30); ctx.lineTo(w-10,h-30); ctx.stroke();
  if (!points.length) return;
  const xs = points.map(p=>p.x), ys = points.map(p=>p.y);
  const xmin = 0, xmax = points.length-1; const ymin = 0, ymax = Math.max(...ys)*1.1 || 1;
  function sx(i){ return 40 + (w-60) * (i - xmin) / (xmax - xmin || 1); }
  function sy(v){ return (h-30) - (h-50) * (v - ymin) / (ymax - ymin || 1); }
  // grid
  ctx.strokeStyle = '#1d2838'; for(let i=0;i<=4;i++){ const yy = 10 + (h-40)*i/4; ctx.beginPath(); ctx.moveTo(40,yy); ctx.lineTo(w-10,yy); ctx.stroke(); }
  // line
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx(0), sy(points[0].y));
  for(let i=1;i<points.length;i++){ ctx.lineTo(sx(i), sy(points[i].y)); }
  ctx.stroke();
}

function drawBarChart(canvas, labels, values){
  const ctx = canvas.getContext('2d'); const w=canvas.width, h=canvas.height; ctx.clearRect(0,0,w,h);
  const max = Math.max(1, ...values) * 1.1; const barW = (w-60) / (values.length||1);
  // axes
  ctx.strokeStyle = '#273447'; ctx.beginPath(); ctx.moveTo(40,10); ctx.lineTo(40,h-30); ctx.lineTo(w-10,h-30); ctx.stroke();
  // bars
  for(let i=0;i<values.length;i++){
    const x = 40 + i*barW + 8; const bh = (h-50) * (values[i]/max); const y = (h-30) - bh;
    ctx.fillStyle = '#2F76FF'; ctx.fillRect(x,y, barW-16, bh);
  }
  // x labels (trim)
  ctx.fillStyle='#AAB6C5'; ctx.font='12px Inter'; ctx.textAlign='center';
  for(let i=0;i<labels.length;i++){
    const x = 40 + i*barW + (barW/2); const label = String(labels[i]).slice(0,8);
    ctx.fillText(label, x, h-12);
  }
}

export async function loadAnalytics(){
  // expected endpoints
  // /api?path=analytics/revenue-daily  → { ok:true, data: [{ date:'2026-01-01', revenue: 1234 }, ...] }
  // /api?path=analytics/top-products   → { ok:true, data: [{ id:'WA-02', name:'GSM', qty: 12, revenue: 31188 }, ...] }
  // /api?path=analytics/summary-7d     → { ok:true, data: { revenue: 12345, orders: 10, top: 'WA-02 GSM' } }

  const revEl = document.getElementById('rev7');
  const ordEl = document.getElementById('orders7');
  const topEl = document.getElementById('topProd');

  // Summary
  try{
    const s = await apiGet('analytics/summary-7d');
    const sum = s.data || { revenue:0, orders:0, top:'—' };
    revEl.textContent = 'R ' + (sum.revenue||0);
    ordEl.textContent = sum.orders||0;
    topEl.textContent = sum.top || '—';
  }catch{ revEl.textContent='R 0'; ordEl.textContent='0'; topEl.textContent='—'; }

  // Revenue by day
  try{
    const r = await apiGet('analytics/revenue-daily');
    const rows = (r.data||[]).slice(-30);
    const pts = rows.map((v,i)=>({ x:i, y:Number(v.revenue||0) }));
    drawLineChart(document.getElementById('cRevenue'), pts, '#2F76FF');
  }catch{ drawLineChart(document.getElementById('cRevenue'), [], '#2F76FF'); }

  // Sales by product
  try{
    const r2 = await apiGet('analytics/top-products');
    const rows2 = (r2.data||[]).slice(0,12);
    const labels = rows2.map(v=>v.id||v.name||'Prod');
    const values = rows2.map(v=>Number(v.qty||0));
    drawBarChart(document.getElementById('cProducts'), labels, values);
  }catch{ drawBarChart(document.getElementById('cProducts'), [], []); }
}
