import { api, download } from '../api.js';
import { $, $$, esc, icon, money, num, today, toast, emptyState, loader } from '../ui.js';

const REPORTS = [
  ['inventory', 'Inventory', 'layers', 'Every SKU with quantity, cost and stock value.', false],
  ['low-stock', 'Low stock', 'alert', 'Items at or below their minimum level, with the shortfall.', false],
  ['brand-wise', 'Brand-wise stock', 'tag', 'Units and value grouped by brand.', false],
  ['purchases', 'Purchases', 'bag', 'Purchase orders in a date range.', true],
  ['sales', 'Sales', 'file', 'Completed invoices with gross profit.', true]
];

export default async function (root) {
  let key = 'inventory', rep = null;
  const d0 = new Date(); d0.setDate(1);
  const range = { from: d0.toISOString().slice(0, 10), to: today() };
  root.innerHTML = `<div class="page-head"><div><h1>Reports</h1><p>Preview a report here, then download it as an Excel file.</p></div></div>
    <div class="reports"><div class="card rep-list" id="list">${REPORTS.map(r => `<button data-k="${r[0]}">${icon(r[2])}<span>${r[1]}</span></button>`).join('')}</div>
    <section class="card"><div class="card-head"><div><h3 id="title"></h3><p class="muted" id="desc"></p></div><button class="btn primary" id="xl">${icon('download')} Download Excel</button></div>
      <div class="card-body"><div class="toolbar" id="dates" style="padding:0 0 12px;margin:0"><label class="muted">From <input class="input" id="from" type="date" style="width:auto" value="${range.from}"></label><label class="muted">To <input class="input" id="to" type="date" style="width:auto" value="${range.to}"></label></div><div class="table-wrap" id="out"></div></div></section></div>`;

  const qs = () => { const r = REPORTS.find(x => x[0] === key); return r[4] ? `from=${$('#from').value}&to=${$('#to').value}` : ''; };
  const cell = (c, v) => (v === undefined || v === null ? '' : c.fmt === 'money' ? money(v) : c.fmt === 'int' ? num(v) : esc(v));

  async function load() {
    const r = REPORTS.find(x => x[0] === key);
    $$('#list button').forEach(b => b.classList.toggle('on', b.dataset.k === key));
    $('#title').textContent = r[1] + ' report'; $('#desc').textContent = r[3];
    $('#dates').style.display = r[4] ? '' : 'none';
    $('#out').innerHTML = loader();
    try { rep = await api(`/reports/${key}?${qs()}`); } catch (e) { $('#out').innerHTML = emptyState('alert', 'Could not build the report', e.message); return; }
    const cols = rep.columns;
    $('#out').innerHTML = rep.rows.length ? `<table class="table"><thead><tr>${cols.map(c => `<th class="${c.fmt ? 'num' : ''}">${esc(c.header)}</th>`).join('')}</tr></thead><tbody>
      ${rep.rows.map(row => `<tr>${cols.map(c => `<td class="${c.fmt ? 'num' : ''}">${cell(c, row[c.key])}</td>`).join('')}</tr>`).join('')}</tbody>
      ${Object.keys(rep.totals).length ? `<tfoot><tr>${cols.map((c, i) => `<td class="${c.fmt ? 'num' : ''}"><b>${i === 0 ? 'Total' : rep.totals[c.key] !== undefined ? cell(c, rep.totals[c.key]) : ''}</b></td>`).join('')}</tr></tfoot>` : ''}</table>`
      : emptyState('chart', 'Nothing to report', 'There is no data for this report and period.');
  }
  $('#list').onclick = e => { const b = e.target.closest('[data-k]'); if (b) { key = b.dataset.k; load(); } };
  ['from', 'to'].forEach(id => $('#' + id).addEventListener('change', load));
  $('#xl').onclick = async e => {
    const b = e.currentTarget; b.disabled = true;
    try { await download(`/reports/${key}?format=xlsx&${qs()}`, `sk-accessories-${key}-${today()}.xlsx`); toast('Excel file downloaded'); } catch (err) { toast(err.message, 'error'); }
    b.disabled = false;
  };
  await load();
  return { refresh: load };
}
