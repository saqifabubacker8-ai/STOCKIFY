const P = {
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
  package: '<path d="M16.5 9.4 7.5 4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12"/>',
  activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  tag: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
  truck: '<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
  bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  settings: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  printer: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  dollar: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  ban: '<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>',
  trend: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  grid2: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>'
};
export const icon = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
export const money = n => inr.format(n || 0);
export const num = n => new Intl.NumberFormat('en-IN').format(n || 0);
export const date = d => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');
export const dateTime = d => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-');
export const today = () => new Date().toISOString().slice(0, 10);
export const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export const initials = s => String(s || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
export function relTime(d) {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + ' h ago'; return date(d);
}
export const options = (list, sel, ph) => (ph !== undefined ? `<option value="">${esc(ph)}</option>` : '') +
  list.map(o => `<option value="${esc(o._id ?? o.value)}" ${String(o._id ?? o.value) === String(sel) ? 'selected' : ''}>${esc(o.name ?? o.label)}</option>`).join('');

const STATUS = { ok: ['ok', 'In stock'], low: ['low', 'Low stock'], out: ['out', 'Out of stock'] };
export const statusBadge = s => `<span class="badge ${STATUS[s][0]}">${STATUS[s][1]}</span>`;
export const TYPES = {
  STOCK_IN: ['Stock in', 'in'], PURCHASE: ['Purchase', 'in'], RETURN_IN: ['Customer return', 'in'], OPENING: ['Opening stock', 'info'],
  STOCK_OUT: ['Stock out', 'out'], SALE: ['Sale', 'out'], DAMAGED: ['Damaged', 'out'], RETURN_OUT: ['Supplier return', 'out'], ADJUSTMENT: ['Adjustment', 'low']
};
export const typeBadge = t => `<span class="badge ${(TYPES[t] || ['', 'grey'])[1]}">${(TYPES[t] || [t])[0]}</span>`;

const hues = [215, 160, 28, 275, 345, 190, 45];
export function thumb(p, mini) {
  const h = hues[(p.name || '').length % hues.length];
  return `<div class="thumb ${mini ? 'mini' : ''}" style="background:linear-gradient(135deg,hsl(${h} 55% 32%),hsl(${h + 25} 60% 22%))">${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy">` : esc(initials(p.name))}</div>`;
}
export const emptyState = (ic, title, text, action = '') => `<div class="empty"><div class="ring">${icon(ic)}</div><h3>${esc(title)}</h3><p>${esc(text)}</p>${action}</div>`;
export const skeleton = (rows = 4) => `<div style="display:grid;gap:12px">${Array.from({ length: rows }, () => '<div class="skel" style="height:56px"></div>').join('')}</div>`;
export const loader = () => '<div class="empty"><span class="spinner"></span></div>';

export function toast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = 'toast ' + type; t.setAttribute('role', 'status');
  t.innerHTML = `${icon(type === 'error' ? 'alert' : 'check')}<span>${esc(msg)}</span>`;
  $('#toasts').append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 260); }, type === 'error' ? 5000 : 3000);
}

export function animateNumber(el, to, { isMoney = false, duration = 900, animate = true } = {}) {
  const fmt = v => (isMoney ? money(Math.round(v)) : num(Math.round(v)));
  if (!animate || matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  const step = t => { const k = Math.min(1, (t - t0) / duration); el.textContent = fmt(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

export function modal({ title, body, submit = 'Save', size = 'md', danger = false, onOpen, onSubmit, onClose }) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="modal-head"><h3>${esc(title)}</h3><button class="icon-btn no-print" data-close aria-label="Close">${icon('x')}</button></div>
    <form class="modal-body">${body}${onSubmit ? `<div class="modal-foot no-print"><button type="button" class="btn" data-close>Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" type="submit">${esc(submit)}</button></div>` : ''}</form></div>`;
  $('#modal-root').append(wrap);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => wrap.classList.add('show'));
  const form = $('form', wrap);
  const ctl = { el: wrap, form, close() {
    if (ctl.closed) return; ctl.closed = true;
    wrap.classList.remove('show'); document.removeEventListener('keydown', esc_);
    setTimeout(() => { wrap.remove(); if (!$('#modal-root').children.length) document.body.style.overflow = ''; }, 180);
    onClose && onClose();
  } };
  const esc_ = e => { if (e.key === 'Escape' && $('#modal-root').lastElementChild === wrap) ctl.close(); };
  document.addEventListener('keydown', esc_);
  wrap.addEventListener('mousedown', e => { if (e.target === wrap) ctl.close(); });
  wrap.addEventListener('click', e => { if (e.target.closest('[data-close]')) ctl.close(); });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!onSubmit || !form.reportValidity()) return;
    const btn = $('[type=submit]', form); btn.disabled = true;
    try { if ((await onSubmit(form, ctl)) !== false) ctl.close(); }
    catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; }
  });
  onOpen && onOpen(wrap, ctl);
  const first = $('input:not([type=hidden]),select', form); first && !matchMedia('(max-width:900px)').matches && first.focus();
  return ctl;
}

export const confirmDialog = (message, { title = 'Please confirm', confirmText = 'Confirm', danger = true } = {}) =>
  new Promise(res => {
    let done = false;
    modal({ title, size: 'sm', submit: confirmText, danger, body: `<p>${esc(message)}</p>`,
      onSubmit() { done = true; res(true); }, onClose() { if (!done) res(false); } });
  });
