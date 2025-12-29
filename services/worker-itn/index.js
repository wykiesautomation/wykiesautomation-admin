// Wykies Automation Worker — ITN + CMS proxy + Admin
export default { async fetch(request, env) {
  const url = new URL(request.url);
  if (request.method === 'OPTIONS') return cors(new Response('', { status: 204 }));
  if (url.pathname === '/payfast/itn' && request.method === 'POST') return itn(request, env);
  if (url.pathname.startsWith('/cms/')) return cms(request, env);
  if (url.pathname === '/admin/change-price' && request.method === 'POST') return adminChangePrice(request, env);
  if (url.pathname === '/admin/save-product' && request.method === 'POST') return adminSaveProduct(request, env);
  if (url.pathname === '/admin/resend-invoice' && request.method === 'POST') return adminResend(request, env);
  return new Response('Not found', { status: 404 });
}}

function cors(res){
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-admin-email');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  return res;
}

async function cms(request, env){
  const url = new URL(request.url);
  const action = url.pathname.split('/')[2]; // products | priceLog | payments
  const target = `${env.APPSCRIPT_BASE}?action=${action}`;
  const resp = await fetch(target, { method: 'GET' });
  const text = await resp.text();
  return cors(new Response(text, { headers: { 'Content-Type':'application/json' } }));
}

async function adminChangePrice(request, env){
  if (!(await isAdmin(request, env))) return cors(new Response(JSON.stringify({ ok:false, reason:'unauthorized' }), { status: 401 }));
  const body = await request.json();
  const target = `${env.APPSCRIPT_BASE}?action=changeprice`;
  const r = await fetch(target, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(Object.assign({}, body, { adminEmail: env.ADMIN_EMAIL })) });
  return cors(new Response(await r.text(), { headers: { 'Content-Type':'application/json' } }));
}

async function adminSaveProduct(request, env){
  if (!(await isAdmin(request, env))) return cors(new Response(JSON.stringify({ ok:false, reason:'unauthorized' }), { status: 401 }));
  const body = await request.json();
  const r = await fetch(`${env.APPSCRIPT_BASE}?action=saveproduct`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(Object.assign({}, body, { adminEmail: env.ADMIN_EMAIL })) });
  return cors(new Response(await r.text(), { headers: { 'Content-Type':'application/json' } }));
}

async function adminResend(request, env){
  if (!(await isAdmin(request, env))) return cors(new Response(JSON.stringify({ ok:false, reason:'unauthorized' }), { status: 401 }));
  const body = await request.json();
  const r = await fetch(`${env.APPSCRIPT_BASE}?action=resendinvoice`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(Object.assign({}, body, { adminEmail: env.ADMIN_EMAIL })) });
  return cors(new Response(await r.text(), { headers: { 'Content-Type':'application/json' } }));
}

async function isAdmin(request, env){
  const hdr = request.headers.get('x-admin-email') || '';
  return hdr && env.ADMIN_EMAIL && hdr === env.ADMIN_EMAIL;
}

async function itn(request, env){
  const form = await request.formData();
  const params = {}; for (const [k,v] of form.entries()) params[k]=v;
  // Verify signature
  const signature = params['signature'] || '';
  const filtered = Object.keys(params).filter(k=>k!=='signature' && params[k]!=='' && params[k]!==null && params[k]!==undefined).sort();
  const base = filtered.map(k=> `${k}=${encodeURIComponent(params[k]).replace(/%20/g,'+')}`).join('&') + `&passphrase=${encodeURIComponent(env.PAYFAST_PASSPHRASE).replace(/%20/g,'+')}`;
  const digest = md5(base);
  if (!signature || digest.toLowerCase() !== signature.toLowerCase()) {
    return cors(new Response(JSON.stringify({ ok:false, reason:'invalid_signature' }), { status: 400, headers: { 'Content-Type':'application/json' } }));
  }
  if (params['merchant_id'] !== env.PAYFAST_MERCHANT_ID) {
    return cors(new Response(JSON.stringify({ ok:false, reason:'invalid_merchant' }), { status: 400, headers: { 'Content-Type':'application/json' } }));
  }
  // Log + invoice via Apps Script
  const payload = { pfRef: params['pf_payment_id'] || params['payment_id'] || 'pf-unknown', pfStatus: params['payment_status']||'UNKNOWN', amountGross: params['amount_gross']||params['amount']||'0', productId: params['m_payment_id']||'', buyerEmail: params['email_address']||'', original: params };
  await fetch(`${env.APPSCRIPT_BASE}?action=logitn`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
  const inv = await fetch(`${env.APPSCRIPT_BASE}?action=invoice`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
  const text = await inv.text();
  return cors(new Response(text, { headers: { 'Content-Type':'application/json' } }));
}

// Minimal MD5 (RFC 1321) implementation — public domain
function md5(str){
  function cmn(q,a,b,x,s,t){a=((a+q)|0)+((x+t)|0);return(((a<<s)|(a>>> (32-s)))+b)|0}
  function ff(a,b,c,d,x,s,t){return cmn((b&c)|((~b)&d),a,b,x,s,t)}
  function gg(a,b,c,d,x,s,t){return cmn((b&d)|(c&(~d)),a,b,x,s,t)}
  function hh(a,b,c,d,x,s,t){return cmn(b^c^d,a,b,x,s,t)}
  function ii(a,b,c,d,x,s,t){return cmn(c^(b|(~d)),a,b,x,s,t)}
  function md5cycle(x,k){
    var a=x[0],b=x[1],c=x[2],d=x[3];
    a=ff(a,b,c,d,k[0],7,-680876936);d=ff(d,a,b,c,k[1],12,-389564586);c=ff(c,d,a,b,k[2],17,606105819);b=ff(b,c,d,a,k[3],22,-1044525330);
    a=ff(a,b,c,d,k[4],7,-176418897);d=ff(d,a,b,c,k[5],12,1200080426);c=ff(c,d,a,b,k[6],17,-1473231341);b=ff(b,c,d,a,k[7],22,-45705983);
    a=ff(a,b,c,d,k[8],7,1770035416);d=ff(d,a,b,c,k[9],12,-1958414417);c=ff(c,d,a,b,k[10],17,-42063);b=ff(b,c,d,a,k[11],22,-1990404162);
    a=ff(a,b,c,d,k[12],7,1804603682);d=ff(d,a,b,c,k[13],12,-40341101);c=ff(c,d,a,b,k[14],17,-1502002290);b=ff(b,c,d,a,k[15],22,1236535329);
    a=gg(a,b,c,d,k[1],5,-165796510);d=gg(d,a,b,c,k[6],9,-1069501632);c=gg(c,d,a,b,k[11],14,643717713);b=gg(b,c,d,a,k[0],20,-373897302);
    a=gg(a,b,c,d,k[5],5,-701558691);d=gg(d,a,b,c,k[10],9,38016083);c=gg(c,d,a,b,k[15],14,-660478335);b=gg(b,c,d,a,k[4],20,-405537848);
    a=gg(a,b,c,d,k[9],5,568446438);d=gg(d,a,b,c,k[14],9,-1019803690);c=gg(c,d,a,b,k[3],14,-187363961);b=gg(b,c,d,a,k[8],20,1163531501);
    a=gg(a,b,c,d,k[13],5,-1444681467);d=gg(d,a,b,c,k[2],9,-51403784);c=gg(c,d,a,b,k[7],14,1735328473);b=gg(b,c,d,a,k[12],20,-1926607734);
    a=hh(a,b,c,d,k[5],4,-378558);d=hh(d,a,b,c,k[8],11,-2022574463);c=hh(c,d,a,b,k[11],16,1839030562);b=hh(b,c,d,a,k[14],23,-35309556);
    a=hh(a,b,c,d,k[1],4,-1530992060);d=hh(d,a,b,c,k[4],11,1272893353);c=hh(c,d,a,b,k[7],16,-155497632);b=hh(b,c,d,a,k[10],23,-1094730640);
    a=hh(a,b,c,d,k[13],4,681279174);d=hh(d,a,b,c,k[0],11,-358537222);c=hh(c,d,a,b,k[3],16,-722521979);b=hh(b,c,d,a,k[6],23,76029189);
    a=ii(a,b,c,d,k[0],6,-198630844);d=ii(d,a,b,c,k[7],10,1126891415);c=ii(c,d,a,b,k[14],15,-1416354905);b=ii(b,c,d,a,k[5],21,-57434055);
    a=ii(a,b,c,d,k[12],6,1700485571);d=ii(d,a,b,c,k[3],10,-1894986606);c=ii(c,d,a,b,k[10],15,-1051523);b=ii(b,c,d,a,k[1],21,-2054922799);
    a=ii(a,b,c,d,k[8],6,1873313359);d=ii(d,a,b,c,k[15],10,-30611744);c=ii(c,d,a,b,k[6],15,-1560198380);b=ii(b,c,d,a,k[13],21,1309151649);
    x[0]=add32(a,x[0]);x[1]=add32(b,x[1]);x[2]=add32(c,x[2]);x[3]=add32(d,x[3]);
  }
  function md51(s){ let n=s.length, state=[1732584193,-271733879,-1732584194,271733878], i; for(i=64;i<=n;i+=64) md5cycle(state, md5blk(s.substring(i-64,i))); s=s.substring(i-64); let tail=new Array(16).fill(0); for(i=0;i<s.length;i++) tail[i>>2] |= s.charCodeAt(i) << ((i%4)<<3); tail[i>>2] |= 0x80 << ((i%4)<<3); if(i>55){ md5cycle(state, tail); tail=new Array(16).fill(0);} tail[14]=n*8; md5cycle(state, tail); return state; }
  function md5blk(s){ let md5blks=[]; for(let i=0;i<64;i+=4){ md5blks[i>>2] = s.charCodeAt(i) + (s.charCodeAt(i+1)<<8) + (s.charCodeAt(i+2)<<16) + (s.charCodeAt(i+3)<<24);} return md5blks; }
  function rhex(n){ let s="", j=0; for(; j<4; j++) s += ((n >> (j*8+4)) & 0x0F).toString(16) + ((n >> (j*8)) & 0x0F).toString(16); return s; }
  function hex(x){ for(let i=0;i<x.length;i++) x[i]=rhex(x[i]); return x.join(''); }
  function add32(a,b){ return (a + b) & 0xFFFFFFFF; }
  return hex(md51(str));
}
