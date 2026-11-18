import { api } from '../api.js';
import { $, esc, icon, num, dateTime, debounce, modal, toast, typeBadge, TYPES, emptyState, skeleton } from '../ui.js';
import { itemPicker, invalidateItems } from '../picker.js';

const MOVES = [
  ['STOCK_IN', 'Stock in (received)', 'Quantity received'], ['STOCK_OUT', 'Stock out (issued)', 'Quantity issued'],
  ['ADJUSTMENT', 'Adjustment (stock count)', 'Counted quantity on the shelf'], ['DAMAGED', 'Damaged / write-off', 'Quantity damaged'],
  ['RETURN_IN', 'Customer return (add back)', 'Quantity returned'], ['RETURN_OUT', 'Return to supplier (remove)', 'Quantity sent back']
];

export function openMove(type = 'STOCK_IN', item = null) {
  let sel = item;
  modal({
    title: 'Record stock movement', submit: 'Record movement',
    body: `<div class="grid g2"><div class="field"><label>Movement</label><select class="input" name="type">${MOVES.map(m => `<option value="${m[0]}" ${m[0] === type ? 'selected' : ''}>${m[1]}</option>`).join('')}</select></div>
      <div class="field"><label for="mq" id="mql"></label><input class="input" id="mq" name="quantity" type="number" min="0" step="1" required></div></div>
      <div class="field" style="margin-top:14px"><label>Product</label><div data-picker></div><div data-sel></div></div>
      <div class="grid g2" style="margin-top:14px"><div class="field"><label>Reference (optional)</label><input class="input" name="reference" maxlength="60" placeholder="Bill or challan no."></div>
      <div class="field"><label>Note (optional)</label><input class="input" name="note" maxlength="300"></div></div>`,
    onOpen(el) {
      const f = $('form', el), show = () => {
        $('[data-sel]', el).innerHTML = sel ? `<div class="selected-item"><div><b>${esc(sel.name)}${sel.label ? ' · ' + esc(sel.label) : ''}</b><small class="block muted">${esc(sel.sku)}</small></div><div><small class="muted">In stock</small> <span class="qty ${sel.status || ''}">${num(sel.quantity)}</span></div></div>` : '';
      };
      const label = () => { $('#mql', el).textContent = MOVES.find(m => m[0] === f.type.value)[2]; };
      f.type.onchange = label; label(); show();
      itemPicker($('[data-picker]', el), { onPick: i => { sel = i; show(); $('#mq', el).focus(); } });
    },
    async onSubmit(f) {
      if (!sel) throw new Error('Choose a product first.');
      const r = await api('/inventory/move', { method: 'POST', body: { productId: sel.productId, variantId: sel.variantId, type: f.type.value, quantity: f.quantity.value, reference: f.reference.value, note: f.note.value } });
      toast(`Stock updated. Balance is now ${num(r.balance)}.`);
      invalidateItems(); window.dispatchEvent(new Event('stockify:refresh'));
    }
  });
}

export default async function (root, ctx) {
  const f = { type: '', q: '', from: '', to: '', product: ctx.query.product || '' };
  root.innerHTML = `<div class="page-head"><div><h1>Inventory</h1><p>Every stock movement, with the balance after each one.</p></div>
    <div class="head-actions">${MOVES.map(m => `<button class="btn ${m[0] === 'STOCK_IN' ? 'primary' : ''}" data-m="${m[0]}">${m[0] === 'STOCK_IN' ? icon('plus') + ' ' : ''}${m[1].split(' (')[0]}</button>`).join('')}</div></div>
    <div class="card toolbar"><div class="search">${icon('search')}<input class="input" id="q" placeholder="Search product, SKU, reference…" aria-label="Search"></div>
      <select class="input" id="type" aria-label="Type"><option value="">All movements</option>${Object.entries(TYPES).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select>
      <input class="input" id="from" type="date" style="width:auto" aria-label="From"><input class="input" id="to" type="date" style="width:auto" aria-label="To">
      ${f.product ? '<button class="btn sm" id="clear">Show all products</button>' : ''}</div>
    <div class="card"><div class="table-wrap" id="out">${skeleton(5)}</div></div>`;
  root.querySelectorAll('[data-m]').forEach(b => b.onclick = () => openMove(b.dataset.m));

  async function load() {
    const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v));
    const rows = await api('/inventory/transactions?' + qs);
    $('#out').innerHTML = rows.length ? `<table class="table"><thead><tr><th>When</th><th>Movement</th><th>Product</th><th class="num">Change</th><th class="num">Balance</th><th>Reference / note</th><th>By</th></tr></thead><tbody>
      ${rows.map(t => `<tr><td>${dateTime(t.createdAt)}</td><td>${typeBadge(t.type)}</td><td><b>${esc(t.productName)}</b><small>${esc(t.sku)}${t.variantLabel ? ' · ' + esc(t.variantLabel) : ''}</small></td>
        <td class="num"><span class="${t.delta >= 0 ? 'pos' : 'neg'}">${t.delta > 0 ? '+' : ''}${num(t.delta)}</span></td><td class="num"><b>${num(t.balance)}</b></td>
        <td>${esc(t.reference)}<small>${esc(t.note)}</small></td><td>${esc(t.user)}</td></tr>`).join('')}</tbody></table>`
      : emptyState('activity', 'No movements found', 'Try another filter, or record a stock movement.');
  }
  const reload = debounce(() => { f.q = $('#q').value; f.type = $('#type').value; f.from = $('#from').value; f.to = $('#to').value; load(); }, 250);
  ['q', 'type', 'from', 'to'].forEach(id => $('#' + id).addEventListener('input', reload));
  const clear = $('#clear'); if (clear) clear.onclick = () => { location.hash = '#/inventory'; };
  await load();
  return { refresh: load };
}
