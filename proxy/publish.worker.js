export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/publish' && request.method === 'POST') {
      try {
        const idToken = request.headers.get('X-ID-Token');
        if (!idToken) return new Response(JSON.stringify({ok:false, error:'Missing ID token'}), {status:401, headers:{'content-type':'application/json'}});
        // Verify with Google tokeninfo
        const verify = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken));
        if (!verify.ok) return new Response(JSON.stringify({ok:false, error:'Invalid token'}), {status:401, headers:{'content-type':'application/json'}});
        const info = await verify.json();
        const allowed = (info.email||'').toLowerCase() === 'wykiesautomation@gmail.com' && info.aud === env.GOOGLE_CLIENT_ID;
        if (!allowed) return new Response(JSON.stringify({ok:false, error:'Not allowlisted'}), {status:403, headers:{'content-type':'application/json'}});

        // TODO: Implement GitHub commit of products.json using env.GITHUB_TOKEN, env.GH_OWNER, env.GH_REPO
        // For now, respond Not Implemented to prevent accidental writes
        return new Response(JSON.stringify({ok:false, error:'Publish not implemented. Wire GitHub commit logic.'}), {status:501, headers:{'content-type':'application/json'}});
      } catch (err) {
        return new Response(JSON.stringify({ok:false, error:String(err)}), {status:500, headers:{'content-type':'application/json'}});
      }
    }
    return new Response('Not Found', {status:404});
  }
};
