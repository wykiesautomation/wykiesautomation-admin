import { CONFIG } from './config.js';
export async function apiGet(path, params = {}) {
  const url = new URL(CONFIG.API_BASE, window.location.origin);
  url.searchParams.set('path', path);
  for (const [k,v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { method: 'GET', headers: { 'X-Requested-With':'WA-Admin' } });
  return await res.json();
}
export async function apiPost(path, body = {}) {
  const url = new URL(CONFIG.API_BASE, window.location.origin);
  url.searchParams.set('path', path);
  const res = await fetch(url.toString(), {
    method: 'POST', headers: { 'Content-Type':'application/json','X-Requested-With':'WA-Admin' }, body: JSON.stringify(body)
  });
  return await res.json();
}
export async function googleAuthVerify(idToken){ return apiPost('google-auth', { idToken }); }
