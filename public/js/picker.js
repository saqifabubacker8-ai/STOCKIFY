import { api } from './api.js';
import { $, esc, num, money, icon, debounce } from './ui.js';

let cache = null;
export const invalidateItems = () => { cache = null; };
export const loadItems = async () => (cache ||= await api('/products/items'));

// Search box that lists every sellable SKU (variants included) with live stock.
export function itemPicker(root, { onPick, placeholder = 'Search product name, SKU or brand…' }) {
  root.classList.add('picker');
  root.innerHTML = `<div class="search">${icon('search')}<input class="input" placeholder="${esc(placeholder)}" autocomplete="off"></div><div class="picker-list"></div>`;
  const input = $('input', root), list = $('.picker-list', root);
  const render = async () => {
    const items = await loadItems(), q = input.value.trim().toLowerCase();
    const res = items.filter(i => !q || `${i.name} ${i.sku} ${i.label} ${i.brand}`.toLowerCase().includes(q)).slice(0, 30);
    list.innerHTML = res.length ? res.map(i => `<button type="button" class="picker-item" data-k="${i.productId}|${i.variantId || ''}">
      <div><b>${esc(i.name)}</b>${i.label ? ` <span class="muted">· ${esc(i.label)}</span>` : ''}<small>${esc(i.sku)} · ${esc(i.brand || '')}</small></div>
      <span class="qty ${i.status}">${num(i.quantity)}</span></button>`).join('') : '<div class="picker-empty">No matching items</div>';
    list.classList.add('open');
  };
  input.addEventListener('input', debounce(render, 120));
  input.addEventListener('focus', render);
  input.addEventListener('blur', () => setTimeout(() => list.classList.remove('open'), 160));
  input.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });
  list.addEventListener('mousedown', async e => {
    const b = e.target.closest('.picker-item'); if (!b) return;
    e.preventDefault();
    const [pid, vid] = b.dataset.k.split('|'), items = await loadItems();
    onPick(items.find(i => i.productId === pid && (i.variantId || '') === vid));
    input.value = ''; list.classList.remove('open');
  });
}

// Editable invoice/purchase lines: pick items, edit quantity and price, totals update live.
export function lineEditor(root, { priceField, showStock = false, onChange = () => {} }) {
  const rows = [];
  root.innerHTML = `<div data-pick></div><div class="table-wrap card"><table class="table"><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Price (₹)</th><th class="num">Amount</th><th></th></tr></thead><tbody></tbody></table></div>`;
  const body = $('tbody', root);
  itemPicker($('[data-pick]', root), { onPick: item => {
    const ex = rows.find(r => r.item.productId === item.productId && r.item.variantId === item.variantId);
    if (ex) ex.qty++; else rows.push({ item, qty: 1, price: item[priceField] || 0 });
    draw();
  } });
  function draw() {
    body.innerHTML = rows.length ? rows.map((r, i) => `<tr data-i="${i}"><td><b>${esc(r.item.name)}</b>${r.item.label ? ` <span class="muted">· ${esc(r.item.label)}</span>` : ''}
      <small>${esc(r.item.sku)}${showStock ? ` · ${num(r.item.quantity)} in stock` : ''}</small></td>
      <td class="num"><input class="input sm" data-f="qty" type="number" min="1" step="1" value="${r.qty}" aria-label="Quantity"></td>
      <td class="num"><input class="input sm" data-f="price" type="number" min="0" step="0.01" value="${r.price}" aria-label="Price"></td>
      <td class="num amt">${money(r.qty * r.price)}</td><td><button type="button" class="icon-btn danger" data-rm aria-label="Remove">${icon('x')}</button></td></tr>`).join('')
      : '<tr><td colspan="5" class="empty-row">Search above to add items</td></tr>';
    onChange();
  }
  body.addEventListener('input', e => {
    const tr = e.target.closest('tr'), f = e.target.dataset.f; if (!tr || !f) return;
    const r = rows[tr.dataset.i]; r[f] = Number(e.target.value) || 0;
    $('.amt', tr).textContent = money(r.qty * r.price); onChange();
  });
  body.addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (b) { rows.splice(b.closest('tr').dataset.i, 1); draw(); } });
  draw();
  return {
    get: () => rows.map(r => ({ productId: r.item.productId, variantId: r.item.variantId || undefined, quantity: r.qty, price: r.price })),
    subtotal: () => rows.reduce((a, r) => a + r.qty * r.price, 0),
    count: () => rows.length,
    overStock: () => rows.find(r => showStock && r.qty > r.item.quantity)
  };
}
