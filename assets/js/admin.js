
const demoPayments = [
  {ts:'2025-12-24 10:00', inv:'INV-2025-00001', order:'ORD-abc123', pf:'1234567', email:'buyer@example.com', sku:'WA-01', total:'R1,499'},
];

const demoProducts = [
  {sku:'WA-01', name:'3D Printer Control V1', price:1499, img:'/assets/img/wa-01.png', active:true},
  {sku:'WA-02', name:'Plasma Cutter Control V1', price:2499, img:'/assets/img/wa-02.png', active:true},
];

function qs(s){return document.querySelector(s)}
function qsa(s){return [...document.querySelectorAll(s)]}

function switchTab(tab){
  qsa('.tab').forEach(t=>t.setAttribute('aria-selected', String(t===tab)))
  qsa('.panel').forEach(p=>p.setAttribute('aria-hidden','true'))
  const id = tab.dataset.panel
  qs('#panel-'+id).setAttribute('aria-hidden','false')
}

document.addEventListener('DOMContentLoaded',()=>{
  qsa('.tab').forEach(tab=>tab.addEventListener('click',()=>switchTab(tab)))

  const pt = qs('#productsTable tbody')
  demoProducts.forEach(p=>{
    const tr = document.createElement('tr')
    tr.innerHTML = `<td>${p.sku}</td><td contenteditable>${p.name}</td><td contenteditable>${p.price}</td><td><img src="${p.img}" alt="${p.sku}" style="height:34px"></td><td><input type="checkbox" ${p.active?'checked':''}></td>`
    pt.appendChild(tr)
  })

  const gal = qs('#adminGallery')
  demoProducts.forEach(p=>{
    const li = document.createElement('li')
    li.className='gallery-item'
    li.innerHTML = `<div class="media"><img src="${p.img}" alt="${p.name}"></div><div class="caption">${p.sku} · ${p.name}</div>`
    gal.appendChild(li)
  })

  const payT = qs('#paymentsTable tbody')
  demoPayments.forEach(x=>{
    const tr = document.createElement('tr')
    tr.innerHTML = `<td>${x.ts}</td><td>${x.inv}</td><td>${x.order}</td><td>${x.pf}</td><td>${x.email}</td><td>${x.sku}</td><td>${x.total}</td><td><button>Resend Invoice</button></td>`
    payT.appendChild(tr)
  })
})
