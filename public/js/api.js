const KEY = 'sk_accessories_session';
export const session = {
  get token() { try { return JSON.parse(localStorage.getItem(KEY)).token; } catch { return null; } },
  get user() { try { return JSON.parse(localStorage.getItem(KEY)).user; } catch { return null; } },
  set(token, user) { localStorage.setItem(KEY, JSON.stringify({ token, user })); },
  clear() { localStorage.removeItem(KEY); }
};

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch('/api' + path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(session.token ? { Authorization: 'Bearer ' + session.token } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  if (res.status === 401 && !path.startsWith('/auth/login')) { session.clear(); window.dispatchEvent(new Event('stockify:logout')); }
  return res;
}

export async function api(path, opts) {
  const res = await request(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed.');
  return data;
}

export async function download(path, filename) {
  const res = await request(path);
  if (!res.ok) throw new Error('Could not create the file.');
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
