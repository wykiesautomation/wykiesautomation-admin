import { CONFIG } from './config.js';
import { googleAuthVerify } from './api.js';

const roleBadge = document.getElementById('roleBadge');
const signOutBtn = document.getElementById('signOut');

export let ROLE = 'Viewer';
export function setRole(r){
  ROLE = r; roleBadge.textContent = r;
  document.querySelectorAll('[data-role="Admin"]').forEach(el=>{
    el.toggleAttribute('disabled', r!=='Admin');
  });
}

export function renderGoogleButton(){
  const c = document.getElementById('gbtn');
  if (!window.google || !c) return;
  google.accounts.id.initialize({ client_id: CONFIG.GOOGLE_CLIENT_ID, callback: onCredential });
  google.accounts.id.renderButton(c, { theme:'outline', size:'medium', shape:'pill', width:180, text:'signin_with' });
}

async function onCredential(resp){
  try{
    const res = await googleAuthVerify(resp.credential);
    if (!res.ok) throw new Error(res.error||'Auth failed');
    setRole(res.role==='Admin'?'Admin':'Viewer');
    signOutBtn.disabled = false;
  }catch(e){ alert('Sign‑in failed'); }
}

signOutBtn.addEventListener('click', () => {
  try { google.accounts.id.disableAutoSelect(); } catch(e){}
  setRole('Viewer'); signOutBtn.disabled = true;
});
