/** Apps Script: Wykies Admin CMS (Products + Invoices + Google Sign-In) **/

function doGet(e) {
  const action = e.parameter.action || '';
  const sheetId = e.parameter.sheetId;
  if (!sheetId) return jsonResp(false, null, 'Missing sheetId');
  try {
    const ss = SpreadsheetApp.openById(sheetId);

    if (action === 'listProducts') {
      const sh = getSheet(ss, 'products');
      const rows = sh.getDataRange().getValues();
      const head = rows.shift();
      const idx = indexOfHead(head);
      const items = rows.map(r => ({
        SKU: r[idx.SKU] || '',
        Name: r[idx.Name] || '',
        PriceIncl: Number(r[idx.PriceIncl] || 0),
        UpdatedAt: r[idx.UpdatedAt] || '',
        Images: parseJsonSafe(r[idx.ImagesJSON])
      }));
      const q = (e.parameter.q || '').toLowerCase();
      let filtered = items;
      if (q) filtered = items.filter(p => String(p.SKU).toLowerCase().includes(q) || String(p.Name).toLowerCase().includes(q));
      const sort = e.parameter.sort || 'name_asc';
      filtered.sort(makeSorter(sort));
      const page = Number(e.parameter.page || 1), pageSize = Number(e.parameter.pageSize || 25);
      const start = (page - 1) * pageSize; const data = filtered.slice(start, start + pageSize);
      return jsonResp(true, { data: data, total: filtered.length });
    }

    if (action === 'getProduct') {
      const sku = e.parameter.sku || '';
      const p = findProduct(ss, sku);
      if (!p) return jsonResp(false, null, 'SKU not found');
      return jsonResp(true, { data: p });
    }

    if (action === 'listInvoices') {
      const inv = getSheet(ss, 'invoices');
      const rows = inv.getDataRange().getValues();
      const head = rows.shift();
      const idx = headIndex(head);
      const items = rows.map(r => ({
        InvoiceNo: r[idx.InvoiceNo] || '',
        Date: toIsoDate(r[idx.Date]),
        CustomerName: r[idx.CustomerName] || '',
        Email: r[idx.Email] || '',
        Subtotal: Number(r[idx.Subtotal] || 0),
        VAT: Number(r[idx.VAT] || 0),
        TotalIncl: Number(r[idx.TotalIncl] || 0),
        Paid: !!r[idx.Paid],
        PdfUrl: r[idx.PdfUrl] || '',
        ReleasedAt: r[idx.ReleasedAt] || '',
        PaymentRef: r[idx.PaymentRef] || ''
      }));
      const q = (e.parameter.q || '').toLowerCase();
      let filtered = items;
      if (q) filtered = items.filter(x => String(x.InvoiceNo).toLowerCase().includes(q) || String(x.Email).toLowerCase().includes(q) || String(x.CustomerName).toLowerCase().includes(q));
      const sort = e.parameter.sort || 'date_desc';
      filtered.sort(invSorter(sort));
      const page = Number(e.parameter.page || 1), sz = Number(e.parameter.pageSize || 25);
      const start = (page - 1) * sz; const data = filtered.slice(start, start + sz);
      return jsonResp(true, { data: data, total: filtered.length });
    }

    if (action === 'getInvoice') {
      const invoiceNo = e.parameter.invoiceNo || '';
      const inv = getByInvoice(ss, invoiceNo);
      if (!inv) return jsonResp(false, null, 'Not found');
      return jsonResp(true, { data: inv.header, items: inv.items });
    }

    if (action === 'verifyToken') {
      const v = verifyIdToken(e.parameter.idToken || '', e.parameter.expectedClientId || '');
      if (!v.ok) return jsonResp(false, null, v.error);
      return jsonResp(true, { email: v.email, aud: v.aud, exp: v.exp });
    }

    return jsonResp(false, null, 'Unknown action');
  } catch (err) { return jsonResp(false, null, err.message); }
}

function doPost(e) {
  const isMultipart = e.postData?.type?.startsWith('multipart/');
  let body = {}; try { if (!isMultipart) body = JSON.parse(e.postData.contents||'{}'); } catch(_) {}
  const action = (body.action || e.parameter.action || '').trim();
  let sheetId = (body.sheetId || e.parameter.sheetId);
  if (!sheetId) return jsonResp(false, null, 'Missing sheetId');
  let idToken = body.idToken || e.parameter.idToken || '';
  let expectedClientId = body.expectedClientId || e.parameter.expectedClientId || '';

  try {
    if (action === 'verifyToken') {
      const v = verifyIdToken(idToken, expectedClientId);
      if (!v.ok) return jsonResp(false, null, v.error);
      return jsonResp(true, { email: v.email, aud: v.aud, exp: v.exp });
    }

    const writes = ['addProduct','updateProduct','deleteProduct','logPriceChange','uploadImage','createInvoice','updateInvoice','deleteInvoice','generateInvoicePdf','emailInvoice','markInvoicePaid'];
    if (writes.includes(action)) {
      const v = verifyIdToken(idToken, expectedClientId);
      if (!v.ok) return jsonResp(false, null, v.error);
      if (!isAllowlisted(v.email)) return jsonResp(false, null, 'Not allowlisted');
    }

    const ss = SpreadsheetApp.openById(sheetId);

    if (action === 'addProduct' || action === 'updateProduct') {
      const sh = getSheet(ss, 'products');
      ensureProductHeaders(sh);
      const SKU = body.SKU; const Name = body.Name; const PriceIncl = Number(body.PriceIncl || 0);
      if (!SKU || !Name) return jsonResp(false, null, 'SKU & Name required');
      const head = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
      const idx = indexOfHead(head);
      const dataRange = sh.getRange(2,1,Math.max(0, sh.getLastRow()-1), sh.getLastColumn());
      const rows = dataRange.getValues();
      let rowIndex = -1;
      for (let i=0;i<rows.length;i++) if (String(rows[i][idx.SKU]) === SKU) { rowIndex = i+2; break; }
      const now = new Date();
      if (rowIndex === -1) {
        sh.appendRow([SKU, Name, PriceIncl, now, JSON.stringify([])]);
      } else {
        const existingImages = sh.getRange(rowIndex, idx.ImagesJSON+1).getValue();
        sh.getRange(rowIndex, idx.Name+1).setValue(Name);
        sh.getRange(rowIndex, idx.PriceIncl+1).setValue(PriceIncl);
        sh.getRange(rowIndex, idx.UpdatedAt+1).setValue(now);
        sh.getRange(rowIndex, idx.ImagesJSON+1).setValue(existingImages || JSON.stringify([]));
      }
      return jsonResp(true, { ok:true });
    }

    if (action === 'deleteProduct') {
      const sh = getSheet(ss, 'products'); ensureProductHeaders(sh);
      const SKU = body.SKU; const head = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0]; const idx = indexOfHead(head);
      const dataRange = sh.getRange(2,1,Math.max(0, sh.getLastRow()-1), sh.getLastColumn()); const rows = dataRange.getValues();
      for (let i=0;i<rows.length;i++) { if (String(rows[i][idx.SKU]) === SKU) { sh.deleteRow(i+2); return jsonResp(true, { ok:true }); } }
      return jsonResp(false, null, 'SKU not found');
    }

    if (action === 'logPriceChange') {
      const logSh = getSheet(ss, 'price_log'); ensureHeaders(logSh, ['Timestamp','SKU','OldPrice','NewPrice','Email']);
      logSh.appendRow([new Date(), body.SKU, '', Number(body.PriceIncl||0), Session.getActiveUser().getEmail()]);
      return jsonResp(true, { ok:true });
    }

    if (action === 'uploadImage') {
      const parts = Utilities.parseMultipart(e.postData.contents, e.postData.type) || [];
      const fields = {}; const files = [];
      parts.forEach(p => { if (p.fileName) files.push(p); else if (p.name) fields[p.name]=p.contents; });
      const driveFolderId = fields.driveFolderId; const SKU = fields.SKU; if (!driveFolderId || !SKU) return jsonResp(false, null, 'Missing params');
      const folder = DriveApp.getFolderById(driveFolderId);
      const urls = [];
      files.forEach(f => { const blob = Utilities.newBlob(f.bytes, f.contentType, f.fileName); const file = folder.createFile(blob); file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); urls.push(file.getUrl()); });
      const sh = getSheet(ss, 'products'); ensureProductHeaders(sh); const head = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0]; const idx = indexOfHead(head);
      const dataRange = sh.getRange(2,1,Math.max(0, sh.getLastRow()-1), sh.getLastColumn()); const rows = dataRange.getValues();
      for (let i=0;i<rows.length;i++) {
        if (String(rows[i][idx.SKU]) === SKU) {
          const rowIndex = i+2; const imagesJSON = sh.getRange(rowIndex, idx.ImagesJSON+1).getValue() || '[]';
          const images = parseJsonSafe(imagesJSON) || []; urls.forEach(u => images.push(u));
          sh.getRange(rowIndex, idx.ImagesJSON+1).setValue(JSON.stringify(images)); sh.getRange(rowIndex, idx.UpdatedAt+1).setValue(new Date());
          break;
        }
      }
      return jsonResp(true, { uploaded: urls.length, urls });
    }

    if (action === 'createInvoice') {
      const newNo = handleCreateInvoice_(ss, body);
      return jsonResp(true, { InvoiceNo: newNo });
    }

    if (action === 'updateInvoice') {
      const hdr = { InvoiceNo: body.InvoiceNo, Date: body.Date || toIsoDate(new Date()), CustomerName: body.CustomerName || '', Email: body.Email || '' };
      const items = Array.isArray(body.Items) ? body.Items : [];
      const totals = computeTotals(items);
      upsertInvoice(ss, hdr, items, totals);
      return jsonResp(true, { InvoiceNo: hdr.InvoiceNo });
    }

    if (action === 'deleteInvoice') {
      deleteInvoice(ss, body.InvoiceNo); return jsonResp(true, { InvoiceNo: body.InvoiceNo });
    }

    if (action === 'generateInvoicePdf') {
      const invoiceNo = body.InvoiceNo; const driveFolderId = body.driveFolderId; const inv = getByInvoice(ss, invoiceNo); if (!inv) return jsonResp(false, null, 'Not found');
      const url = generatePdf(ss, inv, driveFolderId);
      const sh = getSheet(ss, 'invoices'); const row = findRowByKey(sh, 'InvoiceNo', invoiceNo); if (row) sh.getRange(row, colIndex(sh, 'PdfUrl')).setValue(url);
      return jsonResp(true, { PdfUrl: url });
    }

    if (action === 'emailInvoice') {
      const invoiceNo = body.InvoiceNo; const inv = getByInvoice(ss, invoiceNo); if (!inv) return jsonResp(false, null, 'Not found');
      if (!inv.header.PdfUrl) {
        const url = generatePdf(ss, inv, body.driveFolderId); inv.header.PdfUrl = url; const invSh=getSheet(ss,'invoices'); const row=findRowByKey(invSh,'InvoiceNo',invoiceNo); if(row) invSh.getRange(row, colIndex(invSh,'PdfUrl')).setValue(inv.header.PdfUrl);
      }
      const fileId = getFileIdFromUrl(inv.header.PdfUrl); if (!fileId) return jsonResp(false, null, 'PDF missing');
      const blob = DriveApp.getFileById(fileId).getBlob().setName(`Invoice-${invoiceNo}.pdf`);
      const to = inv.header.Email; const cc = 'wykiesautomation@gmail.com';
      MailApp.sendEmail({ to, cc, subject: `Invoice ${invoiceNo}`, htmlBody: htmlEmail(inv), attachments: [blob] });
      return jsonResp(true, { emailed: true });
    }

    if (action === 'markInvoicePaid') {
      const invSh = getSheet(ss, 'invoices'); const row = findRowByKey(invSh, 'InvoiceNo', body.InvoiceNo); if (!row) return jsonResp(false, null, 'Not found');
      invSh.getRange(row, colIndex(invSh, 'Paid')).setValue(true);
      invSh.getRange(row, colIndex(invSh, 'ReleasedAt')).setValue(new Date());
      return jsonResp(true, { InvoiceNo: body.InvoiceNo, Paid: true });
    }

    return jsonResp(false, null, 'Unknown action');
  } catch (err) { return jsonResp(false, null, err.message); }
}

/** Numbering (Sequential, monthly) **/
function handleCreateInvoice_(ss, body) {
  const invoiceNo = genInvoiceNoMonthly(ss); // swap to genInvoiceNoGlobal(ss) if you prefer
  const finalNo = body.InvoiceNo && String(body.InvoiceNo).trim() !== '' ? String(body.InvoiceNo).trim() : invoiceNo;
  assertInvoiceUnique_(ss, finalNo);
  const hdr = { InvoiceNo: finalNo, Date: body.Date || toIsoDate(new Date()), CustomerName: body.CustomerName || '', Email: body.Email || '' };
  const items = Array.isArray(body.Items) ? body.Items : [];
  const totals = computeTotals(items);
  upsertInvoice(ss, hdr, items, totals);
  return finalNo;
}

function genInvoiceNoGlobal(ss) {
  const lock = LockService.getScriptLock(); lock.waitLock(5000);
  try { const settings = getOrCreateSheet(ss, 'settings'); ensurePair(settings, 'invoice_counter', 0, 1); if (!settings.getRange(1,1).getValue()) settings.getRange(1,1).setValue('invoice_counter'); const current = Number(settings.getRange(1,2).getValue() || 0); const next = current + 1; settings.getRange(1,2).setValue(next); const y = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy'); return `WA-${y}-${String(next).padStart(6,'0')}`; } finally { lock.releaseLock(); }
}
function genInvoiceNoMonthly(ss) {
  const lock = LockService.getScriptLock(); lock.waitLock(5000);
  try { const settings = getOrCreateSheet(ss, 'settings'); ensurePair(settings, 'invoice_month_key', '', 2); ensurePair(settings, 'invoice_counter', 0, 1); const tz = Session.getScriptTimeZone(); const now = new Date(); const y = Utilities.formatDate(now, tz, 'yyyy'); const m = Utilities.formatDate(now, tz, 'MM'); const monthKey = `${y}-${m}`; const stored = String(settings.getRange(2,2).getValue() || ''); let counter = Number(settings.getRange(1,2).getValue() || 0); if (stored !== monthKey) { settings.getRange(2,2).setValue(monthKey); counter = 0; } counter += 1; settings.getRange(1,2).setValue(counter); return `WA-${y}${m}-${String(counter).padStart(3,'0')}`; } finally { lock.releaseLock(); }
}

/** Sheets + Products helpers **/
function getSheet(ss, name){ return ss.getSheetByName(name) || ss.insertSheet(name); }
function ensureProductHeaders(sh){ ensureHeaders(sh, ['SKU','Name','PriceIncl','UpdatedAt','ImagesJSON']); }
function ensureHeaders(sh, expected){ const headRange = sh.getRange(1,1,1,Math.max(sh.getLastColumn(), expected.length)); let head = headRange.getValues()[0]; if (head.filter(Boolean).length===0){ sh.getRange(1,1,1,expected.length).setValues([expected]); return; } const map = {}; head.forEach((h,i)=>map[String(h).trim()]=i); expected.forEach(h=>{ if (map[h]==null){ sh.insertColumnAfter(sh.getLastColumn()); const col=sh.getLastColumn(); sh.getRange(1,col).setValue(h); } }); }
function indexOfHead(head){ const map={}; head.forEach((h,i)=>map[String(h).trim()]=i); return { SKU: map.SKU ?? 0, Name: map.Name ?? 1, PriceIncl: map.PriceIncl ?? 2, UpdatedAt: map.UpdatedAt ?? 3, ImagesJSON: map.ImagesJSON ?? 4 }; }
function parseJsonSafe(s){ try{ return JSON.parse(s); }catch(_){ return []; } }
function makeSorter(code){ const dir = code.endsWith('_desc')? -1 : 1; if (code.startsWith('name')) return (a,b)=> dir * String(a.Name).localeCompare(String(b.Name)); if (code.startsWith('price')) return (a,b)=> dir * (Number(a.PriceIncl)-Number(b.PriceIncl)); if (code.startsWith('sku')) return (a,b)=> dir * String(a.SKU).localeCompare(String(b.SKU)); if (code.startsWith('updated')) return (a,b)=> dir * (new Date(a.UpdatedAt) - new Date(b.UpdatedAt)); return (a,b)=> dir * String(a.Name).localeCompare(String(b.Name)); }
function findProduct(ss, sku){ const sh = getSheet(ss,'products'); ensureProductHeaders(sh); const head = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0]; const idx = indexOfHead(head); const rows = sh.getRange(2,1,Math.max(0, sh.getLastRow()-1), sh.getLastColumn()).getValues(); for (let i=0;i<rows.length;i++){ if (String(rows[i][idx.SKU])===sku){ return { SKU: rows[i][idx.SKU], Name: rows[i][idx.Name], PriceIncl: Number(rows[i][idx.PriceIncl]||0) }; } } return null; }

/** Invoices helpers **/
function headIndex(head){ const m={}; head.forEach((h,i)=>m[String(h).trim()]=i); return m; }
function toIsoDate(d){ if(!d) return ''; const dt = (d instanceof Date)? d : new Date(d); return Utilities.formatDate(dt, Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function computeTotals(items){ const subtotal = items.reduce((s,it)=> s + Number(it.Qty||1)*Number(it.UnitPriceIncl||0), 0); const vat = subtotal * 0.15; const total = subtotal + vat; return { Subtotal: subtotal, VAT: vat, TotalIncl: total }; }
function upsertInvoice(ss, hdr, items, totals){ const invSh=getSheet(ss,'invoices'); const itemsSh=getSheet(ss,'invoice_items'); ensureHeaders(invSh, ['InvoiceNo','Date','CustomerName','Email','Subtotal','VAT','TotalIncl','Paid','PdfUrl','ReleasedAt','PaymentRef']); ensureHeaders(itemsSh, ['InvoiceNo','SKU','Name','Qty','UnitPriceIncl','LineTotalIncl']); const row = findRowByKey(invSh,'InvoiceNo', hdr.InvoiceNo); const vals=[hdr.InvoiceNo, toIsoDate(hdr.Date), hdr.CustomerName, hdr.Email, totals.Subtotal, totals.VAT, totals.TotalIncl, false, '', '', '']; if(!row) invSh.appendRow(vals); else invSh.getRange(row,1,1,vals.length).setValues([vals]);
  // rebuild items for this invoice: simple approach (clear & append)
  const data = itemsSh.getDataRange().getValues(); const head = data.shift(); const keep = data.filter(r => String(r[0]) !== hdr.InvoiceNo);
  itemsSh.clear(); itemsSh.getRange(1,1,1,6).setValues([['InvoiceNo','SKU','Name','Qty','UnitPriceIncl','LineTotalIncl']]);
  if (keep.length) itemsSh.getRange(2,1,keep.length,keep[0].length).setValues(keep);
  const rows = items.map(it => [hdr.InvoiceNo, it.SKU||'', it.Name||'', Number(it.Qty||1), Number(it.UnitPriceIncl||0), Number((it.Qty||1)*(it.UnitPriceIncl||0))]);
  if (rows.length) itemsSh.getRange(itemsSh.getLastRow()+1,1,rows.length,rows[0].length).setValues(rows);
}
function deleteInvoice(ss, invoiceNo){ const invSh=getSheet(ss,'invoices'); const itemsSh=getSheet(ss,'invoice_items'); const r=findRowByKey(invSh,'InvoiceNo',invoiceNo); if(r) invSh.deleteRow(r); // remove items
  const data = itemsSh.getDataRange().getValues(); if (data.length>1){ const head=data.shift(); const keep = data.filter(x=> String(x[0])!==invoiceNo); itemsSh.clear(); itemsSh.getRange(1,1,1,6).setValues([head]); if(keep.length) itemsSh.getRange(2,1,keep.length,keep[0].length).setValues(keep); }
}
function findRowByKey(sh, key, value){ const head = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0]; const idx = headIndex(head); const col = idx[key]; if(col==null) return null; const rows = sh.getRange(2,1,Math.max(0, sh.getLastRow()-1), sh.getLastColumn()).getValues(); for(let i=0;i<rows.length;i++){ if(String(rows[i][col])===String(value)) return i+2; } return null; }
function colIndex(sh, key){ const head = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0]; const idx = headIndex(head); if (idx[key]==null) { sh.insertColumnAfter(sh.getLastColumn()); const c = sh.getLastColumn(); sh.getRange(1,c).setValue(key); return c; } return idx[key]+1; }

/** PDF + Email **/
function generatePdf(ss, inv, driveFolderId){ const folder = DriveApp.getFolderById(driveFolderId); const doc = DocumentApp.create(`Invoice ${inv.header.InvoiceNo}`); const body = doc.getBody(); body.appendParagraph('Wykies Automation').setHeading(DocumentApp.ParagraphHeading.HEADING1); body.appendParagraph(`Invoice: ${inv.header.InvoiceNo}`).setHeading(DocumentApp.ParagraphHeading.HEADING2); body.appendParagraph(`Date: ${inv.header.Date}`); body.appendParagraph(`Customer: ${inv.header.CustomerName}`); body.appendParagraph(`Email: ${inv.header.Email}`); body.appendParagraph(''); const table = body.appendTable([['SKU','Name','Qty','Unit (incl.)','Line Total']]); inv.items.forEach(it => { table.appendTableRow().appendTableCell(String(it.SKU||'')).appendTableCell(String(it.Name||'')).appendTableCell(String(it.Qty||1)).appendTableCell(fmtMoney(it.UnitPriceIncl||0)).appendTableCell(fmtMoney(it.LineTotalIncl|| (Number(it.Qty||1)*Number(it.UnitPriceIncl||0)))); }); body.appendParagraph(''); body.appendParagraph(`Subtotal: ${fmtMoney(inv.header.Subtotal||0)}`); body.appendParagraph(`VAT (15%): ${fmtMoney(inv.header.VAT||0)}`); body.appendParagraph(`Total (incl.): ${fmtMoney(inv.header.TotalIncl||0)}`); doc.saveAndClose(); const file = DriveApp.getFileById(doc.getId()); const pdfBlob = file.getAs(MimeType.PDF).setName(`Invoice-${inv.header.InvoiceNo}.pdf`); const pdfFile = folder.createFile(pdfBlob); pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); file.setTrashed(true); return pdfFile.getUrl(); }
function fmtMoney(v){ return 'R ' + Utilities.formatString('%.2f', Number(v||0)); }
function getFileIdFromUrl(url){ const m = String(url||'').match(/[-\w]{25,}/); return m ? m[0] : null; }
function htmlEmail(inv){ return `<div style="font-family:Arial, sans-serif;"><h2>Invoice ${inv.header.InvoiceNo}</h2><p>Dear ${inv.header.CustomerName},</p><p>Please find attached your invoice.</p><p><strong>Total (incl.):</strong> ${fmtMoney(inv.header.TotalIncl||0)}</p><p>Regards,<br/>Wykies Automation</p></div>`; }

/** Auth **/
function verifyIdToken(idToken, expectedClientId) { try { if (!idToken) return { ok:false, error:'Missing idToken' }; const url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken); const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true }); if (resp.getResponseCode() !== 200) return { ok:false, error:'Invalid token' }; const info = JSON.parse(resp.getContentText()); const aud = info.aud; const iss = info.iss; const email = info.email; const exp = Number(info.exp || 0) * 1000; if (!email) return { ok:false, error:'No email in token' }; if (expectedClientId && aud !== expectedClientId) return { ok:false, error:'aud mismatch' }; if (iss !== 'accounts.google.com' && iss !== 'https://accounts.google.com') return { ok:false, error:'iss mismatch' }; if (Date.now() > exp) return { ok:false, error:'Token expired' }; return { ok:true, email, aud, exp }; } catch (err) { return { ok:false, error: err.message }; } }
function isAllowlisted(email){ return ['wykiesautomation@gmail.com'].includes(String(email||'').toLowerCase()); }

/** Sorters **/
function invSorter(code){ const dir = code.endsWith('_desc')? -1 : 1; if (code.startsWith('date')) return (a,b)=> dir * (new Date(a.Date) - new Date(b.Date)); if (code.startsWith('total')) return (a,b)=> dir * (Number(a.TotalIncl) - Number(b.TotalIncl)); if (code.startsWith('paid')) return (a,b)=> dir * ((a.Paid?1:0) - (b.Paid?1:0)); return (a,b)=> dir * (new Date(a.Date) - new Date(b.Date)); }

/** Utilities **/
function getOrCreateSheet(ss, name){ return ss.getSheetByName(name) || ss.insertSheet(name); }
function ensurePair(sh, label, defaultValue, row) { const a = sh.getRange(row,1).getValue(); const b = sh.getRange(row,2).getValue(); if (!a) sh.getRange(row,1).setValue(label); if (b === '' || b === null) sh.getRange(row,2).setValue(defaultValue); }
function jsonResp(ok, obj, error){ const payload = JSON.stringify({ ok, ...(obj||{}), error }); return ContentService.createTextOutput(payload).setMimeType(ContentService.MimeType.JSON); }
