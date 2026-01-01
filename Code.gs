/**
 * Wykies Automation — Admin & CMS API (Pages & Gallery + stubs)
 * Sheet ID: 12qRMe6pAPVaQtosZBnhVtpMwyNks7W8uY9PX1mF620k
 * Tabs: Pages(slug,title,content), Gallery(filename,caption,order,url?)
 */
const CONFIG = {
  SHEET_ID: '12qRMe6pAPVaQtosZBnhVtpMwyNks7W8uY9PX1mF620k',
  ALLOWLIST: ['wykiesautomation@gmail.com'],
  CORS_ORIGINS: ['https://wykiesautomation.co.za', 'https://admin.wykiesautomation.co.za']
};

function okJSON(obj, origin) {
  const out = ContentService.createTextOutput(JSON.stringify(obj||{}))
    .setMimeType(ContentService.MimeType.JSON);
  if(origin){
    out.setHeader('Access-Control-Allow-Origin', origin);
    out.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    out.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  }
  return out;
}
function badJSON(msg, origin, status){ return okJSON({error:msg||'error', status:status||400}, origin); }
function getOrigin_(e){ const o = (e && e.parameter && e.parameter.origin) || ''; return CONFIG.CORS_ORIGINS.includes(o) ? o : '*'; }
function openSheet_(){ return SpreadsheetApp.openById(CONFIG.SHEET_ID); }
function readRows_(name){ const sh=openSheet_().getSheetByName(name); if(!sh) return []; const vals=sh.getDataRange().getValues(); if(!vals.length) return []; const headers=vals.shift().map(h=>String(h).trim()); return vals.map(r=>{ const o={}; headers.forEach((h,i)=>o[h]=r[i]); return o; }); }
function appendRow_(name, obj){ const ss=openSheet_(); const sh=ss.getSheetByName(name)||ss.insertSheet(name); const range=sh.getDataRange(); let headers=[]; if(range.getNumRows()>=1){ headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String); } else { headers=Object.keys(obj); sh.getRange(1,1,1,headers.length).setValues([headers]); } const row=headers.map(h=> obj[h]!==undefined? obj[h] : ''); sh.getRange(sh.getLastRow()+1,1,1,headers.length).setValues([row]); }
function isAllowed_(email){ return email && CONFIG.ALLOWLIST.indexOf(email)>=0; }

function doGet(e){
  const origin=getOrigin_(e); const action=(e&&e.parameter&&e.parameter.action)||'ping';
  try{
    if(action==='ping') return okJSON({ok:true, ts:new Date().toISOString()}, origin);
    if(action==='pages'){
      const rows=readRows_('Pages').map(p=>({slug:String(p.slug||'').trim(), title:String(p.title||'').trim(), content:String(p.content||'').trim()})).filter(p=>p.slug);
      return okJSON(rows, origin);
    }
    if(action==='gallery'){
      const rows=readRows_('Gallery').map(g=>({filename:String(g.filename||'').trim(), caption:String(g.caption||'').trim(), order:Number(g.order||0), url:String(g.url||'').trim()})).filter(g=>g.filename||g.url);
      return okJSON(rows, origin);
    }
    if(action==='catalog'){
      const rows=readRows_('Products').map(p=>({id:String(p.id||'').trim(), name:String(p.name||'').trim(), price:Number(p.price||0), status:String(p.status||'active').trim(), images:(()=>{ try{ return JSON.parse(String(p.images||'[]')); }catch(e){ return []; } })(), summary:String(p.summary||'').trim()})).filter(p=>p.id);
      return okJSON(rows, origin);
    }
    return badJSON('Unknown action', origin, 404);
  }catch(err){ return badJSON('Server error: '+err, origin, 500); }
}

function doPost(e){
  const origin=getOrigin_(e); let data={};
  try{ if(e.postData && e.postData.contents){ data=JSON.parse(e.postData.contents); } }catch(err){ return badJSON('Invalid JSON', origin, 400); }
  const action=(e&&e.parameter&&e.parameter.action)||data.action||'';
  try{
    if(action==='savePage'){
      const {slug, title, content, email} = data; if(!isAllowed_(email)) return badJSON('Forbidden', origin, 403); if(!slug) return badJSON('Missing slug', origin, 400);
      const ss=openSheet_(); const sh=ss.getSheetByName('Pages')||ss.insertSheet('Pages'); const range=sh.getDataRange(); let headers=[];
      if(range.getNumRows()>=1){ headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String); } else { headers=['slug','title','content']; sh.getRange(1,1,1,headers.length).setValues([headers]); }
      const vals=sh.getDataRange().getValues(); let rowIndex=-1; for(let r=1; r<vals.length; r++){ if(String(vals[r][headers.indexOf('slug')]).trim()===String(slug).trim()){ rowIndex=r+1; break; } }
      const payload=[slug, title||'', content||'']; if(rowIndex>1){ sh.getRange(rowIndex,1,1,headers.length).setValues([payload]); } else { sh.getRange(sh.getLastRow()+1,1,1,headers.length).setValues([payload]); }
      appendRow_('Audit', {when:new Date(), user:email||'', action:'savePage', details:slug});
      return okJSON({message:'Saved'}, origin);
    }
    if(action==='checkout'){ return badJSON('Checkout stub — implement PayFast signing in Script Properties.', origin, 501); }
    if(action==='resendInvoice'){ return badJSON('ResendInvoice stub — implement PDF + Gmail.', origin, 501); }
    return badJSON('Unknown action', origin, 404);
  }catch(err){ return badJSON('Server error: '+err, origin, 500); }
}

function doOptions(e){ const origin=getOrigin_(e); const out=ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT); out.setHeader('Access-Control-Allow-Origin', origin); out.setHeader('Access-Control-Allow-Headers','Content-Type'); out.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS'); return out; }
