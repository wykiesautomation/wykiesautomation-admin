
(async function(){
  const cfg = await getCfg();
  async function load(){
    let items=[];
    try{ const res = await fetch(cfg.appsScriptUrl + '?action=gallery'); items = await res.json(); }
    catch(e){ items = Array.from({length:6}).map((_,i)=>({caption:'Gallery '+(i+1), imageUrl:'../assets/img/gallery/gallery-0'+(i+1)+'.png'})); }
    const list = document.getElementById('gallery-list'); list.innerHTML='';
    items.forEach(it=>{ const d=document.createElement('div'); d.innerHTML=`<img src="${it.imageUrl}" alt="${it.caption}" style="width:100%; border-radius:8px;"/><small class="muted">${it.caption}</small>`; list.appendChild(d); });
  }
  window.uploadGallery = async function(){
    const files = document.getElementById('gallery-file').files;
    if(!files.length){ toast('Choose images'); return; }
    const fd = new FormData(); Array.from(files).forEach(f=>fd.append('file', f));
    try{ const res = await fetch(cfg.appsScriptUrl + '?action=upload_gallery', {method:'POST', body: fd}); const data = await res.json(); toast(data.message||'Uploaded'); load(); }
    catch(e){ toast('Upload failed'); }
  }
  load();
})();
