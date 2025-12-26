
const SHEET_ID = '12qRMe6pAPVaQtosZBnhVtpMwyNks7W8uY9PX1mF620k';
const PRODUCTS_SHEET = 'Products';
const PAYMENTS_SHEET = 'Payments';
const LOGS_SHEET = 'Logs';

function getProps(){ return PropertiesService.getScriptProperties(); }
function sheet(name){ return SpreadsheetApp.openById(SHEET_ID).getSheetByName(name); }
function now(){ return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'); }
function json(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function doGet(e){
  const op = (e.parameter.op||'').toLowerCase();
  if(op==='products') return json({products:listProducts()});
  if(op==='product') return json({product:getProduct(e.parameter.sku)});
  if(op==='createpayment') return json(createPayment(e.parameter));
  if(op==='payments') return json({records:listPayments()});
  if(op==='settings') return json(getSettings());
  if(op==='stats') return json(getStats());
  if(op==='logs') return json({records:listLogs()});
  if(op==='setactive') { setActive(e.parameter.sku, e.parameter.active==='true'); return json({ok:true}); }
  if(op==='resendinvoice'){ return json(resendInvoice(e.parameter.invoice, e.parameter.email)); }
  if(op==='invoice'){ return json(getInvoice(e.parameter.invoice)); }
  if(op==='adminlogin'){ return json(adminLogin(e.parameter.email)); }
  return json({error:'unknown op'});
}

function doPost(e){
  if(e.parameter && e.parameter.itn){ return json(handleItn(e)); }
  return json({status:'ok'});
}

function listProducts(){
  const s = sheet(PRODUCTS_SHEET); const rows = s.getDataRange().getValues();
  const head = rows.shift(); const idx = Object.fromEntries(head.map((h,i)=>[h,i]));
  return rows.map(r=>({
    sku:r[idx['sku']]||'', name:r[idx['name']]||'', price:r[idx['price']]||'',
    summary:r[idx['summary']]||'', description:r[idx['description']]||'', imageUrl:r[idx['imageUrl']]||'',
    trialUrl:r[idx['trialUrl']]||'', docUrl:r[idx['docUrl']]||'', active:r[idx['active']]||''
  }));
}
function getProduct(sku){ return listProducts().find(p=>p.sku===sku)||{}; }
function setActive(sku, active){
  const s = sheet(PRODUCTS_SHEET); const rows = s.getDataRange().getValues();
  const head = rows.shift(); const idx = Object.fromEntries(head.map((h,i)=>[h,i]));
  for(let r=0;r<rows.length;r++){
    if(rows[r][idx['sku']]===sku){ s.getRange(r+2, idx['active']+1).setValue(active); log('SET_ACTIVE', sku, `active=${active}`); break; }
  }
}

function listPayments(){
  const s = sheet(PAYMENTS_SHEET); const rows = s.getDataRange().getValues();
  const head = rows.shift(); const idx = Object.fromEntries(head.map((h,i)=>[h,i]));
  return rows.map(r=>Object.fromEntries(Object.keys(idx).map(k=>[k, r[idx[k]]])));
}
function listLogs(){
  const s = sheet(LOGS_SHEET); const rows = s.getDataRange().getValues();
  const head = rows.shift(); const idx = Object.fromEntries(head.map((h,i)=>[h,i]));
  return rows.map(r=>Object.fromEntries(Object.keys(idx).map(k=>[k, r[idx[k]]])));
}

function getSettings(){
  const p = getProps();
  return { env:p.getProperty('ENV')||'sandbox', notify_url:p.getProperty('NOTIFY_URL')||'' };
}
function getStats(){
  const products = listProducts();
  const activeProducts = products.filter(p=>String(p.active).toLowerCase()==='true').length;
  const payments24h = listPayments().filter(x=>{ try{ return (new Date(x.Timestamp)) > new Date(Date.now()-24*3600*1000); }catch(e){ return false; } }).length;
  return { activeProducts, payments24h };
}

function adminLogin(email){
  const allowed = (getProps().getProperty('ADMIN_EMAIL')||'').toLowerCase();
  if(!email || email.toLowerCase()!==allowed) return {error:'not allowed'};
  const token = Utilities.base64EncodeWebSafe(JSON.stringify({email, ts:Date.now()}));
  return { token };
}

function createPayment(params){
  const p = getProps();
  const env = (params.env||p.getProperty('ENV')||'sandbox');
  const sku = params.sku; const email = params.email;
  const prod = getProduct(sku);
  const amount = prod && prod.price ? Number(prod.price) : 0;
  const fields = {
    merchant_id:p.getProperty('PAYFAST_MERCHANT_ID'),
    merchant_key:p.getProperty('PAYFAST_MERCHANT_KEY'),
    amount:amount.toFixed(2),
    item_name: `${prod.name||sku}`,
    return_url:p.getProperty('RETURN_URL')||p.getProperty('NOTIFY_URL'),
    cancel_url:p.getProperty('CANCEL_URL')||p.getProperty('RETURN_URL'),
    notify_url:p.getProperty('NOTIFY_URL'),
    email_address: email,
    custom_str1: sku
  };
  const sig = sign(fields, p.getProperty('PAYFAST_PASSPHRASE'));
  fields.signature = sig;
  const processUrl = env==='live' ? 'https://www.payfast.co.za/eng/process' : 'https://sandbox.payfast.co.za/eng/process';
  return { processUrl, fields };
}

function sign(fields, passphrase){
  const esc = Object.keys(fields).sort().map(k=>`${k}=${encodeURIComponent(fields[k])}`).join('&');
  const toHash = esc + (passphrase?`&passphrase=${encodeURIComponent(passphrase)}`:'');
  return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, toHash).map(b=>('0'+(b&0xFF).toString(16)).slice(-2)).join('');
}

function handleItn(e){
  const p = getProps();
  const payload = e.postData ? e.postData.contents : '';
  const parts = {};
  (payload||'').split('&').forEach(x=>{ const [k,v] = x.split('='); parts[k]=decodeURIComponent(v||''); });
  const sigClient = parts['signature']; delete parts['signature'];
  const sigServer = sign(parts, p.getProperty('PAYFAST_PASSPHRASE'));
  if(sigClient!==sigServer) return { status:'invalid signature' };
  const s = sheet(PAYMENTS_SHEET);
  const head = s.getRange(1,1,1,s.getLastColumn()).getValues()[0];
  const idx = Object.fromEntries(head.map((h,i)=>[h,i]));
  const row = [];
  row[idx['Timestamp']] = now();
  row[idx['InvoiceNo']] = makeInvoiceNo(parts);
  row[idx['OrderID']] = parts['m_payment_id']||'';
  row[idx['pf_payment_id']] = parts['pf_payment_id']||'';
  row[idx['Email']] = parts['email_address']||'';
  row[idx['SKU']] = parts['custom_str1']||'';
  row[idx['TotalInclVAT']] = parts['amount']||'';
  row[idx['ReleasedAt']] = parts['payment_date']||'';
  s.appendRow(row);
  log('ITN_COMPLETE', row[idx['SKU']], `invoice=${row[idx['InvoiceNo']]}`);
  const pdfId = createInvoicePdf(row[idx['InvoiceNo']], row[idx['Email']], row[idx['SKU']], Number(parts['amount']||0));
  emailInvoice(row[idx['Email']], pdfId);
  emailInvoice('wykiesautomation@gmail.com', pdfId);
  return { status:'ok' };
}
function makeInvoiceNo(parts){ const base = (parts['pf_payment_id']||'PF') + '-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss'); return 'INV-' + base.slice(-10); }
function createInvoicePdf(inv, email, sku, amount){
  const year = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy');
  const folderName = `Invoices/${year}`; const root = DriveApp.getRootFolder();
  let folder; const it = root.getFoldersByName(folderName); folder = it.hasNext()?it.next():root.createFolder(folderName);
  const html = HtmlService.createTemplateFromFile('InvoiceTemplate').evaluate().getContent()
    .replace('{{INV}}', inv).replace('{{EMAIL}}', email).replace('{{SKU}}', sku).replace('{{AMOUNT}}', amount.toFixed(2));
  const doc = DocumentApp.create(inv); doc.getBody().appendParagraph(html);
  const file = DriveApp.getFileById(doc.getId()); const pdf = file.getAs('application/pdf');
  const saved = folder.createFile(pdf).setName(inv + '.pdf'); return saved.getId();
}
function emailInvoice(to, fileId){ const file = DriveApp.getFileById(fileId); GmailApp.sendEmail(to, 'Invoice', 'Please find your invoice attached.', {attachments:[file]}); }
function getInvoice(inv){
  const year = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy'); const folderName = `Invoices/${year}`;
  const it = DriveApp.getRootFolder().getFoldersByName(folderName); if(!it.hasNext()) return {error:'not found'};
  const folder = it.next(); const files = folder.getFilesByName(inv + '.pdf'); if(!files.hasNext()) return {error:'not found'};
  const file = files.next(); return { id:file.getId(), name:file.getName() };
}
function resendInvoice(inv, email){ const info = getInvoice(inv); if(info && info.id){ emailInvoice(email, info.id); return {status:'sent', invoice:inv}; } return {status:'not found'}; }
function log(event, sku, notes){ const s = sheet(LOGS_SHEET); s.appendRow([now(), event, sku||'', Session.getActiveUser().getEmail(), notes||'']); }
