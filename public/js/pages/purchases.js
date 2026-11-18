import { api } from '../api.js';
import { $, $$, esc, icon, money, num, date, today, modal, toast, debounce, options, emptyState, skeleton } from '../ui.js';
import { lineEditor, invalidateItems } from '../picker.js';

export default async function (root) {
  const f = { q: '', supplier: '', from: '', to: '' };
  let suppliers = [], list = [];
  root.innerHTML = `<div class="page-head"><div><h1>Purchases</h1><p>Record stock bought from suppliers. Quantities update as soon as you save.</p></div><button class="btn primary" id="add">${icon('plus')} New purchase</button></div>
    <div class="card toolbar"><div class="search">${icon('search')}<input class="input" id="q" placeholder="Search PO or supplier invoice no…" aria-label="Search"></div><select class="input" id="sup" aria-label="Supplier"></select>
      <input class="input" id="from" type="date" style="width:auto" aria-label="From"><input class="input" id="to" type="date" style="width:auto" aria-label="To"></div>
    <div class="card"><div class="table-wrap" id="out">${skeleton(5)}</div></div>`;

  async function load() {
    [suppliers, list] = await Promise.all([api('/suppliers'), api('/purchases?' + new URLSearchParams(Object.entries(f).filter(([, v]) => v)))]);
    $('#sup').innerHTML = options(suppliers, f.supplier, 'All suppliers');
    $('#out').innerHTML = list.length ? `<table class="table"><thead><tr><th>Date</th><th>PO no.</th><th>Supplier</th><th>Supplier invoice</th><th class="num">Items</th><th class="num">Total</th></tr></thead><tbody>
      ${list.map(p => `<tr class="click" data-id="${p._id}"><td>${date(p.date)}</td><td><b>${esc(p.number)}</b></td><td>${esc(p.supplier?.name)}</td><td>${esc(p.supplierInvoice) || '-'}</td><td class="num">${p.items.length}</td><td class="num"><b>${money(p.total)}</b></td></tr>`).join('')}</tbody></table>`
      : emptyState('bag', 'No purchases found', 'Record a purchase when new stock arrives and it will be added to inventory.', `<button class="btn primary" id="add2">${icon('plus')} New purchase</button>`);
    const a2 = $('#add2'); if (a2) a2.onclick = openForm;
  }

  function openView(p) {
    modal({ title: 'Purchase ' + p.number, size: 'lg', body: `<p class="muted">${esc(p.supplier?.name)} · ${date(p.date)}${p.supplierInvoice ? ' · Invoice ' + esc(p.supplierInvoice) : ''}</p>
      <div class="card table-wrap" style="margin-top:12px"><table class="table"><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Amount</th></tr></thead><tbody>
      ${p.items.map(i => `<tr><td><b>${esc(i.name)}</b><small>${esc(i.sku)}</small></td><td class="num">${num(i.quantity)}</td><td class="num">${money(i.price)}</td><td class="num">${money(i.total)}</td></tr>`).join('')}</tbody></table></div>
      <div class="summary"><div class="total"><span>Total</span><span>${money(p.total)}</span></div></div>${p.notes ? `<p class="muted" style="margin-top:12px">${esc(p.notes)}</p>` : ''}` });
  }

  function openForm() {
    let lines;
    modal({ title: 'New purchase', size: 'xl', submit: 'Save purchase', body: `
      <div class="grid g3"><div class="field"><label>Supplier</label><select class="input" name="supplier" required>${options(suppliers, '', suppliers.length ? 'Select supplier' : 'Add a supplier first')}</select></div>
        <div class="field"><label>Supplier invoice no.</label><input class="input" name="supplierInvoice" maxlength="40"></div><div class="field"><label>Date</label><input class="input" name="date" type="date" value="${today()}" required></div></div>
      <div class="section-title">Items received</div><div id="lines"></div>
      <div class="grid g2" style="margin-top:14px"><div class="field"><label>Notes (optional)</label><textarea class="input" name="notes" maxlength="500"></textarea></div>
        <div class="summary" style="margin-top:0"><div class="total"><span>Total</span><span id="tot">${money(0)}</span></div></div></div>`,
      onOpen(el) { lines = lineEditor($('#lines', el), { priceField: 'cost', onChange: () => { $('#tot', el).textContent = money(lines.subtotal()); } }); },
      async onSubmit(form) {
        if (!lines.count()) throw new Error('Add at least one item.');
        const p = await api('/purchases', { method: 'POST', body: { supplier: form.supplier.value, supplierInvoice: form.supplierInvoice.value, date: form.date.value, notes: form.notes.value, items: lines.get() } });
        toast(`Purchase ${p.number} saved. Stock updated.`); invalidateItems(); load();
      } });
  }

  const reload = debounce(() => { f.q = $('#q').value; f.supplier = $('#sup').value; f.from = $('#from').value; f.to = $('#to').value; load(); }, 250);
  ['q', 'sup', 'from', 'to'].forEach(id => $('#' + id).addEventListener('input', reload));
  $('#add').onclick = openForm;
  $('#out').addEventListener('click', e => { const tr = e.target.closest('tr[data-id]'); if (tr) openView(list.find(p => p._id === tr.dataset.id)); });
  await load();
  return { refresh: load };
}
