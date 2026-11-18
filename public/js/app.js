import { api, session } from './api.js';
import { $, $$, esc, icon, toast, debounce, initials, skeleton } from './ui.js';
import { invalidateItems } from './picker.js';

const NAV = [
  ['dashboard', 'Dashboard', 'grid'], ['products', 'Products', 'package'], ['inventory', 'Inventory', 'activity'],
  ['purchases', 'Purchases', 'bag'], ['sales', 'Sales & Invoices', 'file'], ['suppliers', 'Suppliers', 'truck'],
  ['masters', 'Brands & Categories', 'tag'], ['reports', 'Reports', 'chart'], ['settings', 'Settings', 'settings']
];
const state = { settings: {}, current: null, es: null, routeId: 0 };
const app = $('#app');

function showLogin() {
  state.es && state.es.close(); state.current = null;
  document.title = 'Sign in - STOCKIFY';
  app.innerHTML = `<div class="login">
    <section class="login-art"><div class="logo"><span class="logo-mark">${icon('layers')}</span>STOCKIFY</div>
      <div><h1>Know exactly what is on your shelves.</h1><p>Hardware stock, purchases and invoices for Sleek and Ebco fittings in one place.</p></div>
      <ul><li>${icon('check')} Variant-level stock with low-stock alerts</li><li>${icon('check')} Purchases and invoices update inventory instantly</li><li>${icon('check')} Reports ready for Excel</li></ul></section>
    <section class="login-form"><form id="login" novalidate><div><h2>Sign in</h2><p class="muted">Use your STOCKIFY account.</p></div>
      <div class="err" id="err" role="alert"></div>
      <div class="field"><label for="em">Email</label><input class="input" id="em" type="email" autocomplete="username" required></div>
      <div class="field"><label for="pw">Password</label><input class="input" id="pw" type="password" autocomplete="current-password" required></div>
      <button class="btn primary" type="submit">Sign in</button></form></section></div>`;
  $('#login').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('button', e.target), err = $('#err'); err.classList.remove('show'); btn.disabled = true;
    try {
      const r = await api('/auth/login', { method: 'POST', body: { email: $('#em').value, password: $('#pw').value } });
      session.set(r.token, r.user); await boot();
    } catch (ex) { err.textContent = ex.message; err.classList.add('show'); btn.disabled = false; }
  });
}

function showShell() {
  const u = session.user;
  app.innerHTML = `<div class="shell">
    <aside class="sidebar" id="sidebar"><div class="logo"><span class="logo-mark">${icon('layers')}</span><div>STOCKIFY<small>Hardware inventory</small></div></div>
      <nav class="nav" aria-label="Main">${NAV.map(([k, l, i]) => `<a href="#/${k}" data-k="${k}">${icon(i)}<span>${l}</span></a>`).join('')}</nav>
      <div class="side-foot"><div class="avatar">${esc(initials(u.name))}</div><div><b>${esc(u.name)}</b><span>${esc(u.role)}</span></div>
        <button class="icon-btn" id="logout" aria-label="Sign out" title="Sign out">${icon('logout')}</button></div></aside>
    <div class="backdrop" id="backdrop"></div>
    <div class="main"><header class="topbar"><button class="icon-btn menu-btn" id="menu" aria-label="Menu">${icon('menu')}</button>
      <div class="search">${icon('search')}<input class="input" id="gsearch" placeholder="Search products or SKU…" aria-label="Search products"></div>
      <div class="live" id="live"><i></i><span>Live</span></div></header><main id="view"></main></div></div>`;
  const side = $('#sidebar'), back = $('#backdrop');
  const toggle = open => { side.classList.toggle('open', open); back.classList.toggle('open', open); };
  $('#menu').onclick = () => toggle(true); back.onclick = () => toggle(false);
  $('#logout').onclick = () => { session.clear(); showLogin(); };
  $('#gsearch').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.value.trim()) { location.hash = '#/products?q=' + encodeURIComponent(e.target.value.trim()); e.target.value = ''; } });
  $('.nav').addEventListener('click', () => toggle(false));
  connectLive();
  route();
}

async function route() {
  if (!$('#view')) return;
  const [path, qs] = location.hash.replace(/^#\/?/, '').split('?');
  const key = NAV.some(n => n[0] === path) ? path : 'dashboard';
  if (path !== key) { location.hash = '#/' + key; return; }
  $$('.nav a').forEach(a => a.classList.toggle('on', a.dataset.k === key));
  document.title = NAV.find(n => n[0] === key)[1] + ' - STOCKIFY';
  const view = $('#view'), id = ++state.routeId;
  state.current = null;
  view.classList.remove('page-in'); void view.offsetWidth; view.classList.add('page-in');
  view.innerHTML = skeleton(5);
  window.scrollTo(0, 0);
  try {
    const mod = await import(`./pages/${key}.js`);
    const page = await mod.default(view, { settings: state.settings, user: session.user, query: Object.fromEntries(new URLSearchParams(qs || '')) });
    if (id === state.routeId) state.current = page || null;
  } catch (e) {
    if (id !== state.routeId) return;
    view.innerHTML = `<div class="card empty"><div class="ring">${icon('alert')}</div><h3>This page could not load</h3><p>${esc(e.message)}</p><button class="btn primary" id="retry">Try again</button></div>`;
    $('#retry').onclick = route;
  }
}

function connectLive() {
  state.es && state.es.close();
  const live = $('#live'), refresh = debounce(() => state.current && state.current.refresh && state.current.refresh(), 350);
  const es = new EventSource('/api/events?token=' + encodeURIComponent(session.token));
  es.addEventListener('stock', () => { invalidateItems(); refresh(); live.classList.add('flash'); setTimeout(() => live.classList.remove('flash'), 1200); });
  es.onopen = () => live.classList.remove('off');
  es.onerror = () => live.classList.add('off');
  state.es = es;
}

window.addEventListener('hashchange', route);
window.addEventListener('stockify:logout', () => { toast('Your session ended. Please sign in again.', 'info'); showLogin(); });
window.addEventListener('stockify:refresh', () => { invalidateItems(); state.current && state.current.refresh && state.current.refresh(); });

async function boot() {
  if (!session.token) return showLogin();
  try {
    session.set(session.token, await api('/auth/me'));
    state.settings = await api('/settings');
    showShell();
  } catch { showLogin(); }
}
boot();
