
/** login.gs — Google Apps Script Web App **/
var SHEET_ID = '12qRMe6pAPVaQtosBnhVtpMwyNks7W8uY9PX1mF620k'; // <-- your Sheet ID
var ADMIN_ALLOW = 'wykiesautomation@gmail.com'; // default admin

function doGet(e){ return route(e, 'GET'); }
function doPost(e){ return route(e, 'POST'); }

function route(e, method){
  var entity = (e.parameter.entity||'').toLowerCase();
  try{
    if(method==='POST' && entity==='login') return json(login(JSON.parse(e.postData.contents||'{}')));
    if(method==='POST' && entity==='verify') return json(verify(JSON.parse(e.postData.contents||'{}')));
    if(method==='POST' && entity==='logout') return json(logout(JSON.parse(e.postData.contents||'{}')));
    // Auth gate for data endpoints
    var authEmail = requireAuth(e, method);
    if(entity==='products' && method==='GET') return json(getProducts());
    if(entity==='products' && method==='POST') return json(saveProduct(JSON.parse(e.postData.contents||'{}')));
    if(entity==='gallery'  && method==='GET') return json(getGallery());
    if(entity==='gallery'  && method==='POST'){
      var body = JSON.parse(e.postData.contents||'{}');
      if(body.items) return json(saveGalleryOrder(body.items));
      else return json(addGallery(body));
    }
    if(entity==='payments' && method==='GET') return json(getPayments());
    if(entity==='resend'   && method==='GET') return json({ok:true, invoiceNo:e.parameter.invoiceNo||''});
    if(entity==='set_password' && method==='POST') return json(setPassword(JSON.parse(e.postData.contents||'{}')));
    return json({error:'Unknown entity'});
  }catch(err){ return json({error:String(err)}); }
}

/** ===== Auth (email+password) ===== **/
function login(payload){
  var email = String(payload.email||'').trim().toLowerCase();
  var plain = String(payload.password||'');
  if(!email || !plain) return {ok:false,error:'Missing email/password'};
  var user = findUser(email);
  if(!user) return {ok:false,error:'User not found'};
  var hash = sha256(plain + user.salt);
  if(hash !== user.hash) return {ok:false,error:'Wrong password'};
  var token = Utilities.getUuid();
  saveToken(token, email, hoursFromNow(8));
  return {ok:true, token:token, email:email};
}

function verify(payload){
  var token = String(payload.token||'');
  var row = findToken(token);
  if(!row) return {ok:false};
  if(new Date(row.expiresAt).getTime() < Date.now()) return {ok:false};
  return {ok:true, email:row.email};
}

function logout(payload){
  var token = String(payload.token||'');
  deleteToken(token);
  return {ok:true};
}

function requireAuth(e, method){
  var token = '';
  if(method==='GET') token = (e.parameter.token||'');
  if(method==='POST'){
    try{ var body = JSON.parse(e.postData.contents||'{}'); token = String(body.token||''); }catch(err){}
  }
  // Also support Authorization: Bearer <token>
  var hdrs = e && e.parameter && e.parameter['headers'];
  var authHeader = (e && e.headers && e.headers['Authorization']) || null; // Apps Script doesn't expose request headers reliably
  if(!token && authHeader){ var parts = String(authHeader).split(' '); if(parts.length===2) token = parts[1]; }
  var row = findToken(token);
  if(!row) throw 'Unauthorized';
  if(new Date(row.expiresAt).getTime() < Date.now()) throw 'Token expired';
  return row.email;
}

/** ===== Users & Tokens storage ===== **/
function findUser(email){
  var ss = SpreadsheetApp.openById(SHEET_ID); var sh = ss.getSheetByName('Users');
  if(!sh){ sh = ss.insertSheet('Users'); sh.appendRow(['Email','Hash','Salt','Role','Active']); }
  var vals = sh.getDataRange().getValues();
  for(var r=1;r<vals.length;r++){
    if(String(vals[r][0]).trim().toLowerCase()===email){
      return {email:email, hash:String(vals[r][1]), salt:String(vals[r][2]), role:String(vals[r][3]||'Admin'), active:(String(vals[r][4]).toUpperCase()==='TRUE')};
    }
  }
  return null;
}

function setPassword(payload){
  // Admin bootstrap to create/update a user password securely
  var adminSecret = PropertiesService.getScriptProperties().getProperty('ADMIN_SECRET');
  if(!adminSecret) return {ok:false,error:'ADMIN_SECRET not set in Script Properties'};
  if(String(payload.adminSecret||'') !== String(adminSecret)) return {ok:false,error:'Forbidden'};
  var email = String(payload.email||'').trim().toLowerCase();
  var plain = String(payload.password||'');
  if(!email || !plain) return {ok:false,error:'Missing email/password'};
  var salt = Utilities.getUuid().slice(0,8);
  var hash = sha256(plain + salt);
  var ss = SpreadsheetApp.openById(SHEET_ID); var sh = ss.getSheetByName('Users');
  if(!sh){ sh = ss.insertSheet('Users'); sh.appendRow(['Email','Hash','Salt','Role','Active']); }
  var vals = sh.getDataRange().getValues();
  var updated = false;
  for(var r=1;r<vals.length;r++){
    if(String(vals[r][0]).trim().toLowerCase()===email){
      sh.getRange(r+1,1,1,5).setValues([[email, hash, salt, 'Admin', true]]);
      updated = true; break;
    }
  }
  if(!updated) sh.appendRow([email, hash, salt, 'Admin', true]);
  return {ok:true, email:email};
}

function saveToken(token, email, expires){
  var ss = SpreadsheetApp.openById(SHEET_ID); var sh = ss.getSheetByName('Tokens');
  if(!sh){ sh = ss.insertSheet('Tokens'); sh.appendRow(['Token','Email','ExpiresAt','CreatedAt']); }
  sh.appendRow([token, email, expires.toISOString(), new Date()]);
}
function findToken(token){
  if(!token) return null;
  var ss = SpreadsheetApp.openById(SHEET_ID); var sh = ss.getSheetByName('Tokens');
  if(!sh) return null; var vals = sh.getDataRange().getValues();
  for(var r=1;r<vals.length;r++){
    if(String(vals[r][0])===token){ return {token:token, email:String(vals[r][1]), expiresAt:String(vals[r][2])}; }
  }
  return null;
}
function deleteToken(token){
  var ss = SpreadsheetApp.openById(SHEET_ID); var sh = ss.getSheetByName('Tokens'); if(!sh) return;
  var vals = sh.getDataRange().getValues();
  for(var r=1;r<vals.length;r++){
    if(String(vals[r][0])===token){ sh.deleteRow(r+1); return; }
  }
}
function hoursFromNow(h){ var d = new Date(); d.setHours(d.getHours()+h); return d; }
function sha256(s){ var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s); return Utilities.base64Encode(raw); }

/** ===== Data endpoints (same as before, with auth) ===== **/
function getProducts(){
  var ss = SpreadsheetApp.openById(SHEET_ID); var sh = ss.getSheetByName('Products');
  var vals = sh.getDataRange().getValues(); var hdr = vals.shift(); var idx = indexMap(hdr);
  return vals.map(function(r){ return {
    sku:r[idx.sku], name:r[idx.name], price:r[idx.price], summary:r[idx.summary], description:r[idx.description], imageUrl:r[idx.imageUrl], trialUrl:r[idx.trialUrl], docUrl:r[idx.docUrl], active:(r[idx.active]===true || String(r[idx.active]).toUpperCase()==='TRUE')
  }; });
}
function saveProduct(body){
  var ss = SpreadsheetApp.openById(SHEET_ID); var sh = ss.getSheetByName('Products');
  var finder = sh.createTextFinder(body.sku).matchCase(false).findNext();
  var data = [body.sku, body.name||'', body.price||'', body.summary||'', body.description||'', body.imageUrl||'', body.trialUrl||'', body.docUrl||'', true];
  if(finder){ sh.getRange(finder.getRow(),1,1,data.length).setValues([data]); } else { sh.appendRow(data); }
  return {ok:true};
}
function getGallery(){
  var ss = SpreadsheetApp.openById(SHEET_ID); var sh = ss.getSheetByName('Gallery');
  var vals = sh.getDataRange().getValues(); var hdr = vals.shift(); var idx = indexMap(hdr);
  return vals.map(function(r){ return {imageUrl:r[idx.imageUrl], caption:r[idx.caption]}; });
}
function addGallery(body){
  var ss = SpreadsheetApp.openById(SHEET_ID); var sh = ss.getSheetByName('Gallery');
  sh.appendRow([body.imageUrl||'', body.caption||'']);
  return {ok:true};
}
function saveGalleryOrder(items){
  var ss = SpreadsheetApp.openById(SHEET_ID); var sh = ss.getSheetByName('Gallery');
  var hdr = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  var orderCol = hdr.indexOf('Order')+1; if(orderCol===0){ sh.insertColumnAfter(sh.getLastColumn()); orderCol = sh.getLastColumn(); sh.getRange(1,orderCol).setValue('Order'); }
  var vals = sh.getDataRange().getValues();
  for(var i=0;i<items.length;i++){
    var url = items[i].imageUrl; var ord = items[i].order;
    for(var r=1;r<vals.length;r++){ if(vals[r][0]===url){ sh.getRange(r+1,orderCol).setValue(ord); break; } }
  }
  return {ok:true};
}
function getPayments(){
  var ss = SpreadsheetApp.openById(SHEET_ID); var sh = ss.getSheetByName('Payments');
  var vals = sh.getDataRange().getValues(); var hdr = vals.shift(); var idx = indexMap(hdr);
  return vals.map(function(r){ return {
    timestamp:r[idx.Timestamp], invoiceNo:r[idx.InvoiceNo], orderId:r[idx.OrderID], pf_payment_id:r[idx.pf_payment_id], email:r[idx.Email], sku:r[idx.SKU], totalInclVAT:r[idx.TotalInclVAT], releasedAt:r[idx.ReleasedAt]
  }; });
}
function indexMap(hdr){ var m={}; for(var i=0;i<hdr.length;i++){ m[String(hdr[i]).trim()] = i; } return m; }

function json(obj){ return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
