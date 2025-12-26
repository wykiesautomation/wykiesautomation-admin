
// 2.gs — Handlers & Router for Wykies Automation Admin API

function doPost(e){
  try{
    const action = (e.parameter && e.parameter.action ? e.parameter.action : '').toLowerCase();

    if(action==='login'){
      let email = e.parameter && e.parameter.email ? e.parameter.email : '';
      let pass  = e.parameter && e.parameter.pass  ? e.parameter.pass  : '';
      if(e.postData && e.postData.type==='application/json'){
        const body = JSON.parse(e.postData.contents||'{}');
        email = body.email || email; pass = body.pass || pass;
      }
      if(email !== ADMIN_EMAIL) return jsonResponse({ ok:false, message:'Invalid email' });
      if(sha256Hex(pass) !== ADMIN_PASS_SHA256) return jsonResponse({ ok:false, message:'Invalid password' });
      const token = issueToken(email, TOKEN_TTL_HOURS);
      return jsonResponse({ ok:true, token, ttl_hours:TOKEN_TTL_HOURS });
    }

    if(action==='save_product'){
      requireAuthFromEvent(e);
      const data = (e.postData && e.postData.type==='application/json')
        ? JSON.parse(e.postData.contents||'{}')
        : { id:e.parameter.id, name:e.parameter.name, price:e.parameter.price, desc:e.parameter.desc };
      if(!data.id || !data.name || data.price===undefined) throw new Error('Missing fields');
      return jsonResponse(saveProduct(data));
    }

    if(action==='add_image'){
      requireAuthFromEvent(e);
      const data = (e.postData && e.postData.type==='application/json')
        ? JSON.parse(e.postData.contents||'{}')
        : { url:e.parameter.url, alt:e.parameter.alt };
      if(!data.url) throw new Error('Missing image URL');
      return jsonResponse(addImage(data));
    }

    if(action==='delete_product'){
      requireAuthFromEvent(e);
      const id = (e.postData && e.postData.type==='application/json')
        ? (JSON.parse(e.postData.contents||'{}').id || '')
        : (e.parameter.id || '');
      if(!id) throw new Error('Missing product id');
      return jsonResponse(deleteProduct(id));
    }

    if(action==='delete_image'){
      requireAuthFromEvent(e);
      const url = (e.postData && e.postData.type==='application/json')
        ? (JSON.parse(e.postData.contents||'{}').url || '')
        : (e.parameter.url || '');
      if(!url) throw new Error('Missing image url');
      return jsonResponse(deleteImage(url));
    }

    return jsonResponse({ ok:false, message:'Unknown action' });
  }catch(err){
    return jsonResponse({ ok:false, error:String(err.message||err) });
  }
}

function doGet(e){
  try{
    const action = (e.parameter && e.parameter.action ? e.parameter.action : '').toLowerCase();

    if(action==='ping') return jsonResponse({ ok:true, service:'Wykies Admin API', time:new Date().toISOString() });
    if(action==='products') return jsonResponse({ ok:true, products:listProducts() });
    if(action==='images') return jsonResponse({ ok:true, images:listImages() });
    if(action==='admin_status'){
      const email = requireAuthFromEvent(e);
      return jsonResponse({ ok:true, email });
    }

    return jsonResponse({ ok:false, message:'Unknown action' });
  }catch(err){
    return jsonResponse({ ok:false, error:String(err.message||err) });
  }
}
