
<!-- Login UI -->
<section id="admin-panel" style="padding:1rem;border:1px solid #333;margin-top:1rem;">
  <h3>Login</h3>
  <div>
    <label>Email:</label>
    <input id="admin-email" type="email" value="wykiesautomation@gmail.com">
  </div>
  <div id="password-row" style="margin-top:0.5rem;">
    <label>Password:</label>
    <input id="admin-pass" type="password" placeholder="Enter admin password">
  </div>
  <button id="btn-login" style="margin-top:0.75rem;">Sign in</button>
  <span id="signed-badge" style="display:none;margin-left:0.75rem;padding:0.25rem 0.5rem;border-radius:6px;background:#2e7d32;color:#fff;font-size:0.9rem;">Signed in</span>
  <div id="login-status" style="margin-top:0.5rem;color:#aaa;"></div>
</section>

<script>
  const BACKEND_URL = 'https://script.google.com/macros/s/XXXXXXXX/exec'; // your Web App URL

  function getToken() { return localStorage.getItem('wa_admin_token') || ''; }
  function setToken(t) { localStorage.setItem('wa_admin_token', t); }
  function clearToken() { localStorage.removeItem('wa_admin_token'); }

  function decodeTokenPayload(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = atob(payloadB64);
      return JSON.parse(json);
    } catch (_) { return null; }
  }
  function isTokenValid() {
    const t = getToken();
    const payload = decodeTokenPayload(t);
    if (!payload || !payload.exp) return false;
    const now = Math.floor(Date.now()/1000);
    return payload.exp > now;
  }

  async function apiGet(action, params={}) {
    const qs = new URLSearchParams({ action, ...params });
    const res = await fetch(`${BACKEND_URL}?${qs.toString()}`, { method: 'GET' });
    return res.json();
  }
  async function apiPost(action, data={}) {
    const body = { ...data };
    const token = getToken();
    if (token) body.token = token;
    const res = await fetch(`${BACKEND_URL}?action=${encodeURIComponent(action)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return res.json();
  }

  // UI state helpers
  function showSignedInUI(emailText='') {
    document.getElementById('password-row').style.display = 'none';
    document.getElementById('btn-login').style.display = 'none';
    document.getElementById('signed-badge').style.display = 'inline-block';
    const statusEl = document.getElementById('login-status');
    statusEl.textContent = emailText ? `Signed in as ${emailText}` : 'Signed in.';
    statusEl.style.color = '#8bc34a';
  }
  function showSignedOutUI(msg='') {
    document.getElementById('password-row').style.display = 'block';
    document.getElementById('btn-login').style.display = 'inline-block';
    document.getElementById('signed-badge').style.display = 'none';
    const statusEl = document.getElementById('login-status');
    statusEl.textContent = msg || 'Please sign in.';
    statusEl.style.color = '#ccc';
  }

  // Silent token verification on load (passwordless if token is valid)
  async function initAdminAuth() {
    if (isTokenValid()) {
      // Verify with backend (admin_status)
      const out = await apiGet('admin_status', { token: getToken() }); // token via query is OK
      if (out.ok) {
        showSignedInUI(out.email || 'admin');
        return;
      }
    }
    // No token or invalid ⇒ signed out state
    showSignedOutUI();
  }

  async function handleLoginClick() {
    const email = document.getElementById('admin-email').value.trim();
    const pass  = document.getElementById('admin-pass').value;
    const statusEl = document.getElementById('login-status');

    statusEl.textContent = 'Signing in…';
    statusEl.style.color = '#ccc';

    const out = await apiPost('login', { email, pass });
    if (out.ok && out.token) {
      setToken(out.token);
      showSignedInUI(email);
    } else {
      clearToken();
      showSignedOutUI('Login failed: ' + (out.message || out.error || 'unknown'));
    }
  }

  document.getElementById('btn-login').addEventListener('click', handleLoginClick);
  window.addEventListener('DOMContentLoaded', initAdminAuth);
</script>
