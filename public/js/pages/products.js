import { api } from '../api.js';
import { $, $$, esc, icon, money, num, modal, toast, confirmDialog, debounce, options, statusBadge, thumb, emptyState, skeleton } from '../ui.js';
import { invalidateItems } from '../picker.js';
import { openMove } from './inventory.js';

const readImage = file => new Promise((res, rej) => {
  const fr = new FileReader();
  fr.onload = () => {
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, 640 / Math.max(im.width, im.height)), c = document.createElement('canvas');
      c.width = im.width * k; c.height = im.height * k; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      res(c.toDataURL('image/jpeg', 0.82));
    };
    im.onerror = () => rej(new Error('That file is not a readable image.')); im.src = fr.result;
  };
  fr.onerror = rej; fr.readAsDataURL(file);
});

const variantRow = (v = {}, editing = false) => `<div class="var-row" data-id="${v._id || ''}">
  <input class="input" name="vsku" placeholder="Variant SKU" value="${esc(v.sku)}" required aria-label="Variant SKU">
  <input class="input" name="vsize" placeholder="Size" value="${esc(v.size)}" aria-label="Size">
  <input class="input" name="vfinish" placeholder="Finish" value="${esc(v.finish)}" aria-label="Finish">
  <input class="input" name="vconf" placeholder="Configuration" value="${esc(v.configuration)}" aria-label="Configuration">
  <input class="input" name="vcost" type="number" min="0" step="0.01" placeholder="Cost" value="${v.purchasePrice ?? ''}" aria-label="Purchase price">
  <input class="input" name="vprice" type="number" min="0" step="0.01" placeholder="Price" value="${v.sellingPrice ?? ''}" aria-label="Selling price">
  <input class="input" name="vqty" type="number" min="0" step="1" placeholder="Qty" value="${v.quantity ?? ''}" ${editing && v._id ? 'readonly title="Change stock from Inventory"' : ''} aria-label="Quantity">
  <input class="input" name="vmin" type="number" min="0" step="1" placeholder="Min" value="${v.minStock ?? ''}" aria-label="Minimum stock">
  <button type="button" class="icon-btn danger" data-rm aria-label="Remove variant">${icon('x')}</button></div>`;

export default async function (root, ctx) {
  const admin = ctx.user.role === 'admin';
  const [brands, cats] = await Promise.all([api('/brands'), api('/categories')]);
  const f = { q: ctx.query.q || '', brand: '', category: '', status: ctx.query.status || '' };
  let view = localStorage.getItem('stockify_pview') || 'grid', list = [];

  root.innerHTML = `<div class="page-head"><div><h1>Products</h1><p>Everything you stock, with live quantities.</p></div>${admin ? `<button class="btn primary" id="add">${icon('plus')} Add product</button>` : ''}</div>
    <div class="card toolbar"><div class="search">${icon('search')}<input class="input" id="q" value="${esc(f.q)}" placeholder="Search name, SKU, material, finish…" aria-label="Search products"></div>
      <select class="input" id="brand" aria-label="Brand">${options(brands, '', 'All brands')}</select>
      <select class="input" id="cat" aria-label="Category">${options(cats, '', 'All categories')}</select>
      <select class="input" id="status" aria-label="Stock status"><option value="">Any stock level</option><option value="ok">In stock</option><option value="low">Low stock</option><option value="out">Out of stock</option></select>
      <div class="seg" id="viewseg"><button data-v="grid" aria-label="Card view">${icon('grid')}</button><button data-v="table" aria-label="Table view">${icon('grid2')}</button></div></div>
    <div id="out">${skeleton(4)}</div>`;
  $('#status').value = f.status;

  async function load() {
    list = await api('/products?' + new URLSearchParams(Object.entries(f).filter(([, v]) => v)));
    draw();
  }

  function draw() {
    $$('#viewseg button').forEach(b => b.classList.toggle('on', b.dataset.v === view));
    const out = $('#out');
    if (!list.length) {
      const filtered = Object.values(f).some(Boolean);
      out.innerHTML = `<div class="card">${emptyState('package', filtered ? 'No products match' : 'No products yet', filtered ? 'Try clearing a filter or searching for something else.' : 'Add your first product to start tracking stock.', admin && !filtered ? `<button class="btn primary" id="add2">${icon('plus')} Add product</button>` : '')}</div>`;
      const a2 = $('#add2'); if (a2) a2.onclick = () => openForm(); return;
    }
    const acts = p => `<button class="icon-btn" data-a="in" data-id="${p._id}" title="Stock in" aria-label="Stock in">${icon('plus')}</button>${admin ? `<button class="icon-btn" data-a="edit" data-id="${p._id}" title="Edit" aria-label="Edit">${icon('edit')}</button><button class="icon-btn danger" data-a="del" data-id="${p._id}" title="Delete" aria-label="Delete">${icon('trash')}</button>` : ''}`;
    if (view === 'grid') {
      out.innerHTML = `<div class="products">${list.map(p => {
        const pct = Math.min(100, Math.round(p.quantity / Math.max(1, (p.minStock || 1) * 3) * 100));
        return `<article class="card pcard" data-a="view" data-id="${p._id}"><div class="thumb-wrap">${thumb(p)}<span class="brand-tag">${esc(p.brand?.name)}</span><span class="status-tag">${statusBadge(p.status)}</span></div>
          <div class="pcard-body"><h3>${esc(p.name)}</h3><span class="sku">${esc(p.sku)} · ${esc(p.category?.name)}</span>
          <div class="meter" title="${num(p.quantity)} in stock"><i class="${p.status}" style="width:${p.status === 'out' ? 0 : Math.max(pct, 6)}%"></i></div>
          <span class="muted sm">${num(p.quantity)} in stock${p.variants.length ? ` across ${p.variants.length} variants` : ''}</span></div>
          <div class="pcard-foot"><span class="price">${p.variants.length ? 'from ' : ''}${money(p.variants.length ? Math.min(...p.variants.map(v => v.sellingPrice || p.sellingPrice)) : p.sellingPrice)}</span><div>${acts(p)}</div></div></article>`;
      }).join('')}</div>`;
    } else {
      out.innerHTML = `<div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Product</th><th>Brand</th><th>Category</th><th class="num">Cost</th><th class="num">Price</th><th class="num">Stock</th><th>Status</th><th></th></tr></thead><tbody>
        ${list.map(p => `<tr class="click" data-a="view" data-id="${p._id}"><td><div class="cell-product">${thumb(p, true)}<div><b>${esc(p.name)}</b><small>${esc(p.sku)}${p.variants.length ? ` · ${p.variants.length} variants` : ''}</small></div></div></td>
          <td>${esc(p.brand?.name)}</td><td>${esc(p.category?.name)}<small>${esc(p.subcategory)}</small></td><td class="num">${money(p.purchasePrice)}</td><td class="num">${money(p.sellingPrice)}</td>
          <td class="num"><b>${num(p.quantity)}</b></td><td>${statusBadge(p.status)}</td><td style="white-space:nowrap">${acts(p)}</td></tr>`).join('')}</tbody></table></div></div>`;
    }
  }

  async function openView(id) {
    const p = await api('/products/' + id);
    const rows = p.variants.length ? p.variants.map(v => ({ sku: v.sku, label: [v.size, v.finish, v.configuration].filter(Boolean).join(' / ') || '-', q: v.quantity, min: v.minStock, cost: v.purchasePrice, price: v.sellingPrice })) : [];
    modal({ title: 'Product details', size: 'lg', body: `
      <div class="detail-top">${thumb(p)}<div><h2 style="font-size:20px">${esc(p.name)}</h2><p class="muted">${esc(p.sku)}</p><div style="margin-top:8px;display:flex;gap:8px;align-items:center">${statusBadge(p.status)}<span class="badge info">${esc(p.brand?.name)}</span></div></div></div>
      <div class="detail-grid">${[['Category', p.category?.name], ['Subcategory', p.subcategory], ['Dimensions', p.dimensions], ['Material', p.material], ['Finish', p.finish], ['Total stock', num(p.quantity)], ['Purchase price', money(p.purchasePrice)], ['Selling price', money(p.sellingPrice)], ['Minimum stock', num(p.minStock)]].map(([k, v]) => `<div><span>${k}</span><b>${esc(v) || '-'}</b></div>`).join('')}</div>
      ${p.description ? `<p class="muted">${esc(p.description)}</p>` : ''}
      ${rows.length ? `<div class="section-title">Variants</div><div class="card table-wrap"><table class="table"><thead><tr><th>SKU</th><th>Variant</th><th class="num">Stock</th><th class="num">Min</th><th class="num">Cost</th><th class="num">Price</th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${esc(r.sku)}</b></td><td>${esc(r.label)}</td><td class="num"><span class="qty ${r.q <= 0 ? 'out' : r.q <= r.min ? 'low' : ''}">${num(r.q)}</span></td><td class="num">${num(r.min)}</td><td class="num">${money(r.cost)}</td><td class="num">${money(r.price)}</td></tr>`).join('')}</tbody></table></div>` : ''}
      <div class="modal-foot"><a class="btn" href="#/inventory?product=${p._id}" data-close>${icon('activity')} Stock history</a><button type="button" class="btn" id="v-in">${icon('plus')} Stock in</button>${admin ? `<button type="button" class="btn primary" id="v-edit">${icon('edit')} Edit</button>` : ''}</div>`,
      onOpen(el, ctl) {
        $('#v-in', el).onclick = () => { ctl.close(); openMove('STOCK_IN', p.variants.length ? null : { productId: p._id, variantId: null, name: p.name, sku: p.sku, label: '', quantity: p.quantity, status: p.status }); };
        const e = $('#v-edit', el); if (e) e.onclick = () => { ctl.close(); openForm(p); };
      } });
  }

  function openForm(p) {
    let image = p?.image || '';
    const editing = !!p;
    modal({ title: editing ? 'Edit product' : 'Add product', size: 'xl', submit: editing ? 'Save changes' : 'Add product', body: `
      <div class="img-pick"><div data-thumb>${thumb({ name: p?.name || 'New', image })}</div><div><label class="btn sm" for="img" style="cursor:pointer">${icon('plus')} Upload image</label><input id="img" type="file" accept="image/*" hidden><button type="button" class="btn sm ghost" id="img-x">Remove</button><small class="block muted" style="margin-top:4px">Resized automatically. JPG or PNG.</small></div></div>
      <div class="grid g3" style="margin-top:16px">
        <div class="field" style="grid-column:span 2"><label>Product name</label><input class="input" name="name" required maxlength="120" value="${esc(p?.name)}"></div>
        <div class="field"><label>SKU / product code</label><input class="input" name="sku" required maxlength="40" value="${esc(p?.sku)}" style="text-transform:uppercase"></div>
        <div class="field"><label>Brand</label><select class="input" name="brand" required>${options(brands, p?.brand?._id, 'Select brand')}</select></div>
        <div class="field"><label>Category</label><select class="input" name="category" required>${options(cats, p?.category?._id, 'Select category')}</select></div>
        <div class="field"><label>Subcategory</label><input class="input" name="subcategory" list="subs" value="${esc(p?.subcategory)}"><datalist id="subs"></datalist></div>
        <div class="field"><label>Dimensions</label><input class="input" name="dimensions" placeholder="e.g. 450 x 500 mm" value="${esc(p?.dimensions)}"></div>
        <div class="field"><label>Material</label><input class="input" name="material" value="${esc(p?.material)}"></div>
        <div class="field"><label>Finish</label><input class="input" name="finish" value="${esc(p?.finish)}"></div>
        <div class="field"><label>Purchase price (₹)</label><input class="input" name="purchasePrice" type="number" min="0" step="0.01" required value="${p?.purchasePrice ?? ''}"></div>
        <div class="field"><label>Selling price (₹)</label><input class="input" name="sellingPrice" type="number" min="0" step="0.01" required value="${p?.sellingPrice ?? ''}"></div>
        <div class="field"><label>Minimum stock level</label><input class="input" name="minStock" type="number" min="0" step="1" required value="${p?.minStock ?? 0}"></div>
        <div class="field"><label>${editing ? 'Current quantity' : 'Opening quantity'}</label><input class="input" name="quantity" type="number" min="0" step="1" value="${p?.quantity ?? 0}" ${editing ? 'readonly' : ''}><small id="qnote">${editing ? 'Change stock from Inventory.' : ''}</small></div>
        <div class="field" style="grid-column:span 2"><label>Description</label><input class="input" name="description" maxlength="400" value="${esc(p?.description)}"></div></div>
      <div class="section-title"><span>Variants <small class="muted" style="font-weight:500">(sizes, finishes or configurations, each with its own SKU and stock)</small></span><button type="button" class="btn sm" id="add-var">${icon('plus')} Add variant</button></div>
      <div class="var-head"><span>SKU</span><span>Size</span><span>Finish</span><span>Configuration</span><span>Cost ₹</span><span>Price ₹</span><span>Qty</span><span>Min</span><span></span></div>
      <div id="vars">${(p?.variants || []).map(v => variantRow(v, editing)).join('')}</div>`,
      onOpen(el) {
        const form = $('form', el);
        const syncSubs = () => { const c = cats.find(x => x._id === form.category.value); $('#subs', el).innerHTML = (c?.subcategories || []).map(s => `<option value="${esc(s)}">`).join(''); };
        const syncQty = () => { if (!editing) { const v = $$('.var-row', el).length > 0; form.quantity.disabled = v; $('#qnote', el).textContent = v ? 'Calculated from the variants below.' : ''; } };
        form.category.onchange = syncSubs; syncSubs(); syncQty();
        $('#add-var', el).onclick = () => { $('#vars', el).insertAdjacentHTML('beforeend', variantRow({}, false)); syncQty(); $('#vars .var-row:last-child input', el).focus(); };
        $('#vars', el).onclick = e => { const b = e.target.closest('[data-rm]'); if (b) { b.closest('.var-row').remove(); syncQty(); } };
        $('#img', el).onchange = async e => {
          try { image = await readImage(e.target.files[0]); $('[data-thumb]', el).innerHTML = thumb({ name: form.name.value || 'New', image }); } catch (err) { toast(err.message, 'error'); }
        };
        $('#img-x', el).onclick = () => { image = ''; $('[data-thumb]', el).innerHTML = thumb({ name: form.name.value || 'New', image }); };
      },
      async onSubmit(form) {
        const val = (r, n) => r.querySelector(`[name=${n}]`).value;
        const variants = $$('.var-row', form).map(r => ({ _id: r.dataset.id || undefined, sku: val(r, 'vsku'), size: val(r, 'vsize'), finish: val(r, 'vfinish'), configuration: val(r, 'vconf'),
          purchasePrice: val(r, 'vcost') === '' ? form.purchasePrice.value : val(r, 'vcost'), sellingPrice: val(r, 'vprice') === '' ? form.sellingPrice.value : val(r, 'vprice'),
          quantity: val(r, 'vqty') || 0, minStock: val(r, 'vmin') === '' ? form.minStock.value : val(r, 'vmin') }));
        const body = { image, variants };
        ['name', 'sku', 'brand', 'category', 'subcategory', 'dimensions', 'material', 'finish', 'description', 'purchasePrice', 'sellingPrice', 'minStock', 'quantity'].forEach(k => { body[k] = form[k].value; });
        await api(editing ? '/products/' + p._id : '/products', { method: editing ? 'PUT' : 'POST', body });
        toast(editing ? 'Product updated' : 'Product added');
        invalidateItems(); load();
      } });
  }

  const reload = debounce(() => { f.q = $('#q').value; f.brand = $('#brand').value; f.category = $('#cat').value; f.status = $('#status').value; load(); }, 220);
  ['q', 'brand', 'cat', 'status'].forEach(id => $('#' + id).addEventListener('input', reload));
  $('#viewseg').onclick = e => { const b = e.target.closest('[data-v]'); if (b) { view = b.dataset.v; localStorage.setItem('stockify_pview', view); draw(); } };
  const add = $('#add'); if (add) add.onclick = () => openForm();
  $('#out').addEventListener('click', async e => {
    const t = e.target.closest('[data-a]'); if (!t) return;
    e.stopPropagation();
    const id = t.dataset.id, p = list.find(x => x._id === id);
    if (t.dataset.a === 'view') openView(id);
    else if (t.dataset.a === 'edit') openForm(await api('/products/' + id));
    else if (t.dataset.a === 'in') openMove('STOCK_IN', p.variants.length ? null : { productId: p._id, variantId: null, name: p.name, sku: p.sku, label: '', quantity: p.quantity, status: p.status });
    else if (t.dataset.a === 'del' && await confirmDialog(`Delete "${p.name}"? Its stock history is kept, but the product cannot be recovered.`, { confirmText: 'Delete product' })) {
      try { await api('/products/' + id, { method: 'DELETE' }); toast('Product deleted'); invalidateItems(); load(); } catch (err) { toast(err.message, 'error'); }
    }
  });

  await load();
  return { refresh: load };
}
