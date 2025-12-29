// == Wykies Automation — Apps Script Web App ==
// Deploy: New deployment → Web app → Execute as me; Anyone with link
// Sheets: Products, PriceLog, Payments, Forms

const SHEET_ID = '12qRMe6pAPVaQtosZBnhVtpMwyNks7W8uY9PX1mF620k';
const ADMIN_EMAIL = 'wykiesautomation@gmail.com';
const CACHE_TTL = 600; // seconds

function doOptions(e){ return cors_({ ok:true }); }

function doGet(e){
  const action = (e.parameter.action||'').toLowerCase();
  if(action==='products') return cors_(json_(getProducts_()));
  if(action==='pricelog') return cors_(json_(getPriceLog_()));
  if(action==='payments') return cors_(json_(getPayments_()));
  return cors_(json_({ ok:false, reason:'unknown_action' }));
}

function doPost(e){
  const action = (e.parameter.action||'').toLowerCase();
  const body = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
  if(action==='logitn') return cors_(json_(logITN_(body)));
  if(action==='invoice') return cors_(json_(generateInvoice_(body)));
  if(action==='resendinvoice') return cors_(json_(resendInvoice_(body)));
  if(action==='changeprice') return requireAdmin_(e) ? cors_(json_(changePrice_(body))) : forbidden_();
  if(action==='saveproduct') return requireAdmin_(e) ? cors_(json_(saveProduct_(body))) : forbidden_();
  if(action==='submitform') return cors_(json_(submitForm_(body)));
  return cors_(json_({ ok:false, reason:'unknown_action' }));
}

function requireAdmin_(e){
  const hdrs = e && e.parameter ? e.parameter : {};
  const email = (e && e.postData && e.postData.type==='application/json' && JSON.parse(e.postData.contents).adminEmail) || (e && e.parameter['x-admin-email']) || '';
  // Web Apps can't read custom headers in e; Worker will add admin checks. Keep a fallback param for internal calls.
  return email===ADMIN_EMAIL;
}

function cors_(out){
  const o = out || ContentService.createTextOutput('');
  o.setMimeType(ContentService.MimeType.JSON);
  // Apps Script TextOutput cannot set arbitrary headers; when proxied via Worker, CORS is handled there.
  return o;
}

function json_(obj){ return ContentService.createTextOutput(JSON.stringify(obj)); }

function getProducts_(){
  const cache = CacheService.getScriptCache();
  const hit = cache.get('products');
  if(hit) return JSON.parse(hit);
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName('Products');
  const vals = sh.getDataRange().getValues(); const [h,...rows]=vals; const idx = index_(h);
  const list = rows.filter(r=>r[idx.id]).map(r=>({ id:r[idx.id], slug:r[idx.slug], name:r[idx.name], description:r[idx.description], priceVatIncl:r[idx.priceVatIncl], imagesJSON:r[idx.imagesJSON], active:r[idx.active], lastUpdatedISO:r[idx.lastUpdatedISO] }));
  cache.put('products', JSON.stringify(list), CACHE_TTL); return list;
}

function getPriceLog_(){
  const cache = CacheService.getScriptCache(); const hit=cache.get('pricelog'); if(hit) return JSON.parse(hit);
  const ss = SpreadsheetApp.openById(SHEET_ID); const sh = ss.getSheetByName('PriceLog');
  const vals = sh.getDataRange().getValues(); const [h,...rows]=vals; const idx=index_(h);
  const list = rows.filter(r=>r[idx.productId]).map(r=>({ productId:r[idx.productId], oldPrice:r[idx.oldPrice], newPrice:r[idx.newPrice], changedBy:r[idx.changedBy], changedAtISO:r[idx.changedAtISO], note:r[idx.note], sourceIP:r[idx.sourceIP] })).slice(-50).reverse();
  cache.put('pricelog', JSON.stringify(list), CACHE_TTL); return list;
}

function getPayments_(){
  const ss = SpreadsheetApp.openById(SHEET_ID); const sh = ss.getSheetByName('Payments');
  const vals = sh.getDataRange().getValues(); const [h,...rows]=vals; const idx=index_(h);
  return rows.filter(r=>r[idx.pfRef]).map(r=>({ timestampISO:r[idx.timestampISO], pfRef:r[idx.pfRef], pfStatus:r[idx.pfStatus], amount:r[idx.amount], productId:r[idx.productId], buyerEmail:r[idx.buyerEmail], mPaymentId:r[idx.mPaymentId], invoiceUrl:r[idx.invoiceUrl], rawJSON:r[idx.rawJSON] })).slice(-100).reverse();
}

function changePrice_(body){
  const { productId, newPrice } = body; if(!productId||!newPrice) return { ok:false, reason:'missing_params' };
  const ss = SpreadsheetApp.openById(SHEET_ID); const psh = ss.getSheetByName('Products');
  const pvals = psh.getDataRange().getValues(); const [ph,...prows]=pvals; const pidx=index_(ph);
  let found=false; for(let i=0;i<prows.length;i++){ if(prows[i][pidx.id]===productId){ const old=prows[i][pidx.priceVatIncl]; psh.getRange(i+2, pidx.priceVatIncl+1).setValue(newPrice); psh.getRange(i+2, pidx.lastUpdatedISO+1).setValue(new Date().toISOString()); appendPriceLog_(productId, old, newPrice, 'admin'); found=true; break; }}
  CacheService.getScriptCache().remove('products'); CacheService.getScriptCache().remove('pricelog');
  return { ok:found };
}

function saveProduct_(body){
  const ss = SpreadsheetApp.openById(SHEET_ID); const sh = ss.getSheetByName('Products');
  const vals = sh.getDataRange().getValues(); const [h,...rows]=vals; const idx=index_(h);
  const row = rows.findIndex(r=>r[idx.id]===body.id);
  if(row>=0){ // update
    if(body.name!==undefined) sh.getRange(row+2, idx.name+1).setValue(body.name);
    if(body.priceVatIncl!==undefined) sh.getRange(row+2, idx.priceVatIncl+1).setValue(body.priceVatIncl);
    if(body.active!==undefined) sh.getRange(row+2, idx.active+1).setValue(body.active);
    sh.getRange(row+2, idx.lastUpdatedISO+1).setValue(new Date().toISOString());
  }else{ // create
    sh.appendRow([body.id, body.slug||'', body.name||'', body.description||'', body.priceVatIncl||0, body.imagesJSON||'[]', body.active!==false, new Date().toISOString()]);
  }
  CacheService.getScriptCache().remove('products');
  return { ok:true };
}

function appendPriceLog_(productId, oldPrice, newPrice, changedBy){
  const ss = SpreadsheetApp.openById(SHEET_ID); const sh = ss.getSheetByName('PriceLog');
  sh.appendRow([productId, oldPrice, newPrice, changedBy||'admin', new Date().toISOString(), '', Session.getActiveUser().getEmail()||'']);
}

function logITN_(payload){
  const ss = SpreadsheetApp.openById(SHEET_ID); const sh = ss.getSheetByName('Payments');
  sh.appendRow([new Date().toISOString(), payload.pfRef, payload.pfStatus, payload.amountGross, payload.productId, payload.buyerEmail, payload.mPaymentId||'', '', JSON.stringify(payload.original||{})]);
  return { ok:true };
}

function generateInvoice_(payload){
  // Minimal invoice stub; replace with branded template later
  const pfRef = payload.pfRef || ('pf-'+Date.now());
  const folder = _ensureInvoiceFolder_();
  const doc = DocumentApp.create('INV-'+pfRef);
  const body = doc.getBody();
  body.appendParagraph('Wykies Automation — Tax Invoice').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('Invoice: '+pfRef);
  body.appendParagraph('Buyer: '+(payload.buyerEmail||''));
  body.appendParagraph('Product: '+(payload.productId||''));
  body.appendParagraph('Amount: R '+(payload.amountGross||''));
  doc.saveAndClose();
  const pdf = DriveApp.getFileById(doc.getId()).getAs('application/pdf');
  const file = folder.createFile(pdf).setName('INV-'+pfRef+'.pdf');
  const url = file.getUrl();
  // Update Payments.invoiceUrl
  const ss = SpreadsheetApp.openById(SHEET_ID); const sh = ss.getSheetByName('Payments');
  const vals = sh.getDataRange().getValues(); const [h,...rows]=vals; const idx=index_(h);
  for(let i=0;i<rows.length;i++){ if(rows[i][idx.pfRef]===pfRef){ sh.getRange(i+2, idx.invoiceUrl+1).setValue(url); break; } }
  // Email buyer + admin
  if(payload.buyerEmail) MailApp.sendEmail(payload.buyerEmail, 'Your Wykies Automation Invoice '+pfRef, 'Thank you for your purchase. Invoice: '+url);
  MailApp.sendEmail('wykiesautomation@gmail.com', 'Invoice generated '+pfRef, 'Invoice: '+url);
  return { ok:true, invoiceUrl:url };
}

function resendInvoice_(payload){
  const msg = 'Resend request for '+(payload.pfRef||'')+' → '+(payload.buyerEmail||'');
  MailApp.sendEmail('wykiesautomation@gmail.com', 'Resend invoice', msg);
  if(payload.buyerEmail) MailApp.sendEmail(payload.buyerEmail, 'Your invoice '+(payload.pfRef||''), 'We are re-sending the invoice as requested.');
  return { ok:true };
}

function submitForm_(body){
  const ss = SpreadsheetApp.openById(SHEET_ID); const sh = ss.getSheetByName('Forms');
  sh.appendRow([new Date().toISOString(), body.type||'contact', body.name||'', body.email||'', body.message||'', body.productId||'', JSON.stringify(body||{})]);
  return { ok:true };
}

function index_(header){ const idx={}; header.forEach((h,i)=>idx[h]=i); return idx; }

function _ensureInvoiceFolder_(){
  const root = DriveApp.getFoldersByName('Invoices');
  const base = root.hasNext()? root.next(): DriveApp.createFolder('Invoices');
  const y = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy');
  const m = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM');
  const yf = getOrCreate_(base, y); const mf = getOrCreate_(yf, m); return mf;
}
function getOrCreate_(parent, name){ const it = parent.getFoldersByName(name); return it.hasNext()? it.next(): parent.createFolder(name); }
