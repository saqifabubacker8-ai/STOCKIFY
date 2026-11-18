import { api } from '../api.js';
import { $, $$, esc, icon, money, num, date, animateNumber, relTime, typeBadge, emptyState } from '../ui.js';
import { groupedBars, doughnut } from '../charts.js';
import { openMove } from './inventory.js';

const COLORS = ['#2450d6', '#d99a2b', '#12975a', '#7a4fd1', '#d33a4a', '#1ba3b8'];

export default async function (root, ctx) {
  let days = 7, first = true;
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  async function load() {
    const d = await api('/dashboard?days=' + days);
    draw(d); first = false;
  }

  function draw(d) {
    const s = d.stats, anim = first;
    const kpi = (href, ic, tone, label, v, isMoney) => `<a class="card kpi" href="${href}"><div class="kpi-icon ${tone}">${icon(ic)}</div><div><span class="kpi-label">${label}</span><strong data-v="${v}" ${isMoney ? 'data-money' : ''}>0</strong></div></a>`;
    root.innerHTML = `
    <div class="page-head"><div><h1>${greet}, ${esc(ctx.user.name.split(' ')[0])}</h1><p>Here is how the shop stands right now.</p></div>
      <div class="head-actions"><button class="btn" id="d-in">${icon('plus')} Stock in</button><a class="btn primary" href="#/sales">${icon('file')} New invoice</a></div></div>
    <div class="kpis">
      ${kpi('#/products', 'package', 'c-blue', 'Total products', s.totalProducts)}
      ${kpi('#/inventory', 'layers', 'c-ok', 'Units in stock', s.availableStock)}
      ${kpi('#/products?status=low', 'alert', 'c-warn', 'Low stock alerts', s.lowStock)}
      ${kpi('#/products?status=out', 'ban', 'c-bad', 'Out of stock', s.outOfStock)}
      ${kpi('#/reports', 'dollar', 'c-navy', 'Inventory value', s.inventoryValue, true)}
      ${kpi('#/sales', 'trend', 'c-brass', "Today's sales", s.todaySales, true)}
    </div>
    <div class="dash-grid">
      <section class="card"><div class="card-head"><h3>Sales and purchases</h3>
        <div class="seg" id="range"><button data-d="7" class="${days === 7 ? 'on' : ''}">7 days</button><button data-d="30" class="${days === 30 ? 'on' : ''}">30 days</button></div></div>
        <div class="card-body"><div class="legend" style="margin-bottom:6px"><span><i style="background:#2450d6"></i>Sales</span><span><i style="background:#d99a2b"></i>Purchases</span></div>
        <div class="chart-box"><canvas id="c-trend"></canvas></div></div></section>
      <section class="card"><div class="card-head"><h3>Stock value by brand</h3></div><div class="card-body">
        ${d.brands.length ? `<div class="donut-wrap"><div class="chart-box"><canvas id="c-brand"></canvas></div><div class="donut-legend">${d.brands.map((b, i) => `<div><span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:8px;background:${COLORS[i % 6]}"></i>${esc(b.name)}<small>${num(b.units)} units</small></span><b>${money(b.value)}</b></div>`).join('')}</div></div>` : emptyState('package', 'No stock yet', 'Add products to see the split by brand.')}</div></section>
    </div>
    <div class="dash-grid three">
      <section class="card"><div class="card-head"><h3>Needs restocking</h3><a class="btn ghost sm" href="#/products?status=low">View all</a></div><div class="card-body">
        ${d.alerts.length ? d.alerts.map(a => `<div class="list-row"><div class="dot ${a.status === 'out' ? 'c-bad' : 'c-warn'}">${icon(a.status === 'out' ? 'ban' : 'alert')}</div>
          <div class="grow"><b>${esc(a.name)}${a.label ? ' · ' + esc(a.label) : ''}</b><small>${esc(a.sku)} · min ${num(a.minStock)}</small></div>
          <span class="qty ${a.status}">${num(a.quantity)}</span><button class="btn sm" data-restock='${esc(JSON.stringify({ productId: a.productId, variantId: a.variantId, name: a.name, label: a.label, sku: a.sku, quantity: a.quantity }))}'>Restock</button></div>`).join('')
          : emptyState('check', 'All stocked up', 'Nothing is below its minimum level.')}</div></section>
      <section class="card"><div class="card-head"><h3>Recent sales</h3><a class="btn ghost sm" href="#/sales">View all</a></div><div class="card-body">
        ${d.recentSales.length ? d.recentSales.map(x => `<div class="list-row"><div class="dot c-blue">${icon('file')}</div><div class="grow"><b>${esc(x.invoiceNo)}</b><small>${esc(x.customer?.name)} · ${date(x.date)}</small></div><b style="flex:none">${money(x.total)}</b></div>`).join('')
          : emptyState('file', 'No sales yet', 'Create an invoice to see it here.')}</div></section>
      <section class="card"><div class="card-head"><h3>Recent purchases</h3><a class="btn ghost sm" href="#/purchases">View all</a></div><div class="card-body">
        ${d.recentPurchases.length ? d.recentPurchases.map(x => `<div class="list-row"><div class="dot c-brass">${icon('bag')}</div><div class="grow"><b>${esc(x.number)}</b><small>${esc(x.supplier?.name || '')} · ${date(x.date)}</small></div><b style="flex:none">${money(x.total)}</b></div>`).join('')
          : emptyState('bag', 'No purchases yet', 'Record a purchase when stock arrives.')}</div></section>
    </div>
    <section class="card"><div class="card-head"><h3>Live activity</h3></div><div class="card-body">
      ${d.activity.length ? d.activity.map(t => `<div class="list-row">${typeBadge(t.type)}<div class="grow"><b>${esc(t.productName)}${t.variantLabel ? ' · ' + esc(t.variantLabel) : ''}</b><small>${esc(t.reference || t.note)} · ${esc(t.user)}</small></div>
        <span class="${t.delta >= 0 ? 'pos' : 'neg'}">${t.delta > 0 ? '+' : ''}${num(t.delta)}</span><small class="muted" style="width:80px;text-align:right">${relTime(t.createdAt)}</small></div>`).join('')
        : emptyState('activity', 'No activity yet', 'Stock movements will appear here as they happen.')}</div></section>`;

    $$('[data-v]', root).forEach(el => animateNumber(el, Number(el.dataset.v), { isMoney: 'money' in el.dataset, animate: anim }));
    groupedBars($('#c-trend'), d.trend.labels, [{ name: 'Sales', color: '#2450d6', data: d.trend.sales }, { name: 'Purchases', color: '#d99a2b', data: d.trend.purchases }], { fmt: money, animate: anim });
    if (d.brands.length) doughnut($('#c-brand'), d.brands.map((b, i) => ({ label: b.name, value: b.value, color: COLORS[i % 6] })), { fmt: money, centerValue: num(s.availableStock), centerLabel: 'units', animate: anim });
    $('#range').onclick = e => { const b = e.target.closest('[data-d]'); if (b) { days = Number(b.dataset.d); first = false; load(); } };
    $('#d-in').onclick = () => openMove('STOCK_IN');
    $$('[data-restock]', root).forEach(b => b.onclick = () => openMove('STOCK_IN', JSON.parse(b.dataset.restock)));
  }

  await load();
  return { refresh: load };
}
