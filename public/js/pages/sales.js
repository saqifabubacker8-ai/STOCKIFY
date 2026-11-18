import { api } from '../api.js';
import { $, $$, esc, icon, money, num, date, today, modal, toast, confirmDialog, debounce, emptyState, skeleton } from '../ui.js';
import { lineEditor, invalidateItems } from '../picker.js';

export function invoiceHtml(s, biz) {
  return `<div class="invoice"><header><div><h2>${esc(biz.name)}</h2><div class="muted">${esc(biz.address)}</div><div class="muted">${[biz.phone, biz.email].filter(Boolean).map(esc).join(' · ')}</div>${biz.gstin ? `<div class="muted">GSTIN: ${esc(biz.gstin)}</div>` : ''}</div>
    <div class="meta"><h2>${s.status === 'Cancelled' ? 'CANCELLED' : 'INVOICE'}</h2><b>${esc(s.invoiceNo)}</b><div class="muted">${date(s.date)}</div><div class="muted">Paid by ${esc(s.paymentMode)}</div></div></header>
    <div style="margin-bottom:14px"><span class="muted sm">Billed to</span><div><b>${esc(s.customer?.name)}</b></div><div class="muted">${[s.customer?.phone, s.customer?.address].filter(Boolean).map(esc).join(' · ')}</div>${s.customer?.gstin ? `<div class="muted">GSTIN: ${esc(s.customer.gstin)}</div>` : ''}</div>
    <div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>Item</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead><tbody>
    ${s.items.map((i, n) => `<tr><td>${n + 1}</td><td><b>${esc(i.name)}</b><small>${esc(i.sku)}</small></td><td class="num">${num(i.quantity)}</td><td class="num">${money(i.price)}</td><td class="num">${money(i.total)}</td></tr>`).join('')}</tbody></table></div>
    <div class="totals"><div><span>Subtotal</span><span>${money(s.subtotal)}</span></div>${s.discount ? `<div><span>Discount</span><span>- ${money(s.discount)}</span></div>` : ''}${s.tax ? `<div><span>GST (${s.taxRate}%)</span><span>${money(s.tax)}</span></div>` : ''}<div class="grand"><span>Total</span><span>${money(s.total)}</span></div></div>
    <p class="muted" style="margin-top:22px">${esc(biz.invoiceNote)}</p></div>`;
}

export function showInvoice(s, biz) {
  modal({ title: 'Invoice ' + s.invoiceNo, size: 'lg', body: invoiceHtml(s, biz) + `<div class="modal-foot no-print"><button type="button" class="btn" data-close>Close</button><button type="button" class="btn primary" id="print">${icon('printer')} Print invoice</button></div>`,
    onOpen: el => { $('#print', el).onclick = () => window.print(); } });
}

export default async function (root, ctx) {
  const admin = ctx.user.role === 'admin';
  const f = { q: '', status: '', from: '', to: '' };
  let list = [];
  root.innerHTML = `<div class="page-head"><div><h1>Sales and invoices</h1><p>Create an invoice and stock is reduced straight away.</p></div><button class="btn primary" id="add">${icon('plus')} New invoice</button></div>
    <div class="card toolbar"><div class="search">${icon('search')}<input class="input" id="q" placeholder="Search invoice no, customer or phone…" aria-label="Search"></div>
      <select class="input" id="st" aria-label="Status"><option value="">All invoices</option><option>Completed</option><option>Cancelled</option></select>
      <input class="input" id="from" type="date" style="width:auto" aria-label="From"><input class="input" id="to" type="date" style="width:auto" aria-label="To"></div>
    <div class="card"><div class="table-wrap" id="out">${skeleton(5)}</div></div>`;

  async function load() {
    list = await api('/sales?' + new URLSearchParams(Object.entries(f).filter(([, v]) => v)));
    $('#out').innerHTML = list.length ? `<table class="table"><thead><tr><th>Date</th><th>Invoice</th><th>Customer</th><th>Payment</th><th class="num">Total</th><th>Status</th><th></th></tr></thead><tbody>
      ${list.map(s => `<tr class="click" data-id="${s._id}"><td>${date(s.date)}</td><td><b>${esc(s.invoiceNo)}</b></td><td>${esc(s.customer?.name)}<small>${esc(s.customer?.phone)}</small></td><td>${esc(s.paymentMode)}</td><td class="num"><b>${money(s.total)}</b></td>
      <td><span class="badge ${s.status === 'Completed' ? 'ok' : 'grey'}">${s.status}</span></td><td style="white-space:nowrap"><button class="icon-btn" data-print="${s._id}" aria-label="View invoice">${icon('printer')}</button>${admin && s.status === 'Completed' ? `<button class="icon-btn danger" data-cancel="${s._id}" aria-label="Cancel invoice" title="Cancel invoice">${icon('ban')}</button>` : ''}</td></tr>`).join('')}</tbody></table>`
      : emptyState('file', 'No invoices found', 'Create your first invoice to see it here.', `<button class="btn primary" id="add2">${icon('plus')} New invoice</button>`);
    const a2 = $('#add2'); if (a2) a2.onclick = openForm;
  }

  function openForm() {
    let lines;
    modal({ title: 'New invoice', size: 'xl', submit: 'Create invoice', body: `
      <div class="grid g4"><div class="field"><label>Customer name</label><input class="input" name="cname" maxlength="80" placeholder="Walk-in Customer"></div><div class="field"><label>Phone</label><input class="input" name="cphone" inputmode="tel"></div>
        <div class="field"><label>GSTIN (optional)</label><input class="input" name="cgstin" maxlength="15"></div><div class="field"><label>Date</label><input class="input" name="date" type="date" value="${today()}" required></div></div>
      <div class="field" style="margin-top:14px"><label>Address (optional)</label><input class="input" name="caddr" maxlength="200"></div>
      <div class="section-title">Items</div><div id="lines"></div>
      <div class="grid g3" style="margin-top:14px;align-items:start"><div class="field"><label>Payment</label><select class="input" name="pay"><option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option><option>Credit</option></select></div>
        <div class="field"><label>Discount (₹)</label><input class="input" name="discount" type="number" min="0" step="0.01" value="0"></div><div class="field"><label>GST %</label><input class="input" name="rate" type="number" min="0" max="100" step="0.01" value="18"></div></div>
      <div class="summary"><div><span>Subtotal</span><span id="s-sub"></span></div><div><span>Discount</span><span id="s-dis"></span></div><div><span>GST</span><span id="s-tax"></span></div><div class="total"><span>Total</span><span id="s-tot"></span></div></div>`,
      onOpen(el) {
        const form = $('form', el);
        const calc = () => {
          const sub = lines.subtotal(), dis = Math.min(Math.max(Number(form.discount.value) || 0, 0), sub), tax = (sub - dis) * (Number(form.rate.value) || 0) / 100;
          $('#s-sub', el).textContent = money(sub); $('#s-dis', el).textContent = '- ' + money(dis); $('#s-tax', el).textContent = money(tax); $('#s-tot', el).textContent = money(sub - dis + tax);
        };
        lines = lineEditor($('#lines', el), { priceField: 'price', showStock: true, onChange: calc });
        form.discount.oninput = calc; form.rate.oninput = calc; calc();
      },
      async onSubmit(form) {
        if (!lines.count()) throw new Error('Add at least one item.');
        const over = lines.overStock();
        if (over) throw new Error(`Only ${over.item.quantity} of ${over.item.name} in stock.`);
        const s = await api('/sales', { method: 'POST', body: { customer: { name: form.cname.value, phone: form.cphone.value, gstin: form.cgstin.value, address: form.caddr.value }, date: form.date.value,
          paymentMode: form.pay.value, discount: form.discount.value, taxRate: form.rate.value, items: lines.get() } });
        toast(`Invoice ${s.invoiceNo} created. Stock updated.`); invalidateItems(); load(); setTimeout(() => showInvoice(s, ctx.settings), 250);
      } });
  }

  const reload = debounce(() => { f.q = $('#q').value; f.status = $('#st').value; f.from = $('#from').value; f.to = $('#to').value; load(); }, 250);
  ['q', 'st', 'from', 'to'].forEach(id => $('#' + id).addEventListener('input', reload));
  $('#add').onclick = openForm;
  $('#out').addEventListener('click', async e => {
    const c = e.target.closest('[data-cancel]');
    if (c) {
      e.stopPropagation(); const s = list.find(x => x._id === c.dataset.cancel);
      if (await confirmDialog(`Cancel invoice ${s.invoiceNo}? The items go back into stock.`, { confirmText: 'Cancel invoice' })) {
        try { await api(`/sales/${s._id}/cancel`, { method: 'PATCH' }); toast('Invoice cancelled and stock restored'); invalidateItems(); load(); } catch (err) { toast(err.message, 'error'); }
      }
      return;
    }
    const tr = e.target.closest('tr[data-id]'); if (tr) showInvoice(list.find(x => x._id === tr.dataset.id), ctx.settings);
  });
  await load();
  return { refresh: load };
}
