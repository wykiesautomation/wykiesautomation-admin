
let CONFIG = null;
let token = null; // JWT from Apps Script

async function loadConfig() {
  const res = await fetch('config.json');
  CONFIG = await res.json();
}

async function login() {
  const form = document.getElementById('loginForm');
  const status = document.getElementById('loginStatus');
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    status.textContent = 'Signing in…';
    const payload = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch(`${CONFIG.apiBase}?action=admin_login`, {
        method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data && data.token) { token = data.token; status.textContent='OK'; }
      else { status.textContent = data?.message || 'Login failed'; }
    } catch(err) { status.textContent = 'Login error'; console.error(err); }
  });
}

async function bindProductForm() {
  const form = document.getElementById('productForm');
  const status = document.getElementById('productStatus');
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault(); if(!token) { status.textContent='Login required'; return; }
    const payload = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch(`${CONFIG.apiBase}?action=admin_save_product`, {
        method:'POST', headers: { 'Content-Type':'application/json','Authorization':`Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      status.textContent = data?.message || 'Saved';
      form.reset();
    } catch(err) { status.textContent='Error'; console.error(err); }
  });
}

async function bindGalleryForm() {
  const form = document.getElementById('galleryForm');
  const status = document.getElementById('galleryStatus');
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault(); if(!token) { status.textContent='Login required'; return; }
    const payload = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch(`${CONFIG.apiBase}?action=admin_add_image`, {
        method:'POST', headers: { 'Content-Type':'application/json','Authorization':`Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      status.textContent = data?.message || 'Added';
      form.reset();
    } catch(err) { status.textContent='Error'; console.error(err); }
  });
}

(async () => {
  await loadConfig();
  await login();
  await bindProductForm();
  await bindGalleryForm();
})();
