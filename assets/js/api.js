
// api.js — thin client for Apps Script (v1.1)
export const cfg = {
  execUrl: 'REPLACE_WITH_APPS_SCRIPT_EXEC_URL',
  clientId: 'REPLACE_WITH_GOOGLE_CLIENT_ID'
};

let idToken = null; // Google ID token
export function setToken(t){ idToken=t; }

async function call(op, method='GET', body=null, params={}){
  const url = new URL(cfg.execUrl);
  if(op) url.searchParams.set('op', op);
  Object.entries(params).forEach(([k,v])=>{ if(v!==undefined&&v!==null&&String(v)!=='') url.searchParams.set(k,v); });
  const res = await fetch(url.toString(), { method, headers: Object.assign({'Content-Type':'application/json'}, idToken? {'X-ID-TOKEN': idToken}:{}) , body: body? JSON.stringify(body): null });
  if(!res.ok){ throw new Error(await res.text()); }
  return res.json();
}

export const api = {
  authVerify: (token)=> fetch(cfg.execUrl+'?op=auth_verify',{method:'POST',headers:{'Content-Type':'application/json'}, body: JSON.stringify({idToken:token})}).then(r=>r.json()),
  // products
  productsList: ()=> call('products_list'),
  productsUpsert: (p)=> call('products_upsert','POST',p),
  productsDelete: (sku)=> call('products_delete','POST',{sku}),
  // gallery
  galleryUpload: (payload)=> call('gallery_upload','POST',payload),
  galleryList: ()=> call('gallery_list','GET',null,{published:0}),
  galleryReorder: (orderedIds)=> call('gallery_reorder','POST',{orderedIds}),
  galleryBulk: (action, ids) => call('gallery_bulk','POST',{action, ids}),
  // payments
  paymentsList: (from,to,status)=> call('payments_list','GET',null,{from,to,status}),
  invoiceResend: (orderId)=> call('invoice_resend','POST',{orderId})
};
