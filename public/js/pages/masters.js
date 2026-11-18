import { api } from '../api.js';
import { $, $$, esc, icon, modal, toast, confirmDialog, emptyState } from '../ui.js';

export default async function (root, ctx) {
  const admin = ctx.user.role === 'admin';
  async function load() {
    const [brands, cats] = await Promise.all([api('/brands'), api('/categories')]);
    root.innerHTML = `<div class="page-head"><div><h1>Brands and categories</h1><p>Add or change these any time. Products pick them from the lists below.</p></div></div>
    <div class="master-grid">
      <section class="card"><div class="card-head"><h3>Brands</h3>${admin ? `<button class="btn primary sm" id="add-b">${icon('plus')} Add brand</button>` : ''}</div><div class="card-body">
        ${brands.length ? brands.map(b => `<div class="list-row"><div class="dot c-navy">${icon('tag')}</div><div class="grow"><b>${esc(b.name)}</b><small>${b.productCount} product${b.productCount === 1 ? '' : 's'}${b.description ? ' · ' + esc(b.description) : ''}</small></div>
          ${admin ? `<button class="icon-btn" data-eb="${b._id}" aria-label="Edit ${esc(b.name)}">${icon('edit')}</button><button class="icon-btn danger" data-db="${b._id}" aria-label="Delete ${esc(b.name)}">${icon('trash')}</button>` : ''}</div>`).join('')
          : emptyState('tag', 'No brands yet', 'Add the brands you stock.')}</div></section>
      <section class="card"><div class="card-head"><h3>Categories</h3>${admin ? `<button class="btn primary sm" id="add-c">${icon('plus')} Add category</button>` : ''}</div><div class="card-body">
        ${cats.length ? cats.map(c => `<div class="list-row" style="align-items:flex-start"><div class="dot c-brass">${icon('grid2')}</div><div class="grow"><b>${esc(c.name)}</b><small>${c.productCount} product${c.productCount === 1 ? '' : 's'}</small>
          <div class="pill-row" style="margin-top:6px">${c.subcategories.map(s => `<span class="pill">${esc(s)}</span>`).join('') || '<small>No subcategories</small>'}</div></div>
          ${admin ? `<button class="icon-btn" data-ec="${c._id}" aria-label="Edit ${esc(c.name)}">${icon('edit')}</button><button class="icon-btn danger" data-dc="${c._id}" aria-label="Delete ${esc(c.name)}">${icon('trash')}</button>` : ''}</div>`).join('')
          : emptyState('grid2', 'No categories yet', 'Add categories such as Wardrobe Fittings.')}</div></section></div>`;

    const brandForm = b => modal({ title: b ? 'Edit brand' : 'Add brand', size: 'sm', submit: b ? 'Save changes' : 'Add brand',
      body: `<div class="field"><label>Brand name</label><input class="input" name="name" required maxlength="60" value="${esc(b?.name)}"></div><div class="field" style="margin-top:12px"><label>Description (optional)</label><input class="input" name="description" maxlength="120" value="${esc(b?.description)}"></div>`,
      async onSubmit(f) { await api(b ? '/brands/' + b._id : '/brands', { method: b ? 'PUT' : 'POST', body: { name: f.name.value, description: f.description.value } }); toast(b ? 'Brand updated' : 'Brand added'); load(); } });
    const catForm = c => modal({ title: c ? 'Edit category' : 'Add category', size: 'sm', submit: c ? 'Save changes' : 'Add category',
      body: `<div class="field"><label>Category name</label><input class="input" name="name" required maxlength="60" value="${esc(c?.name)}"></div><div class="field" style="margin-top:12px"><label>Subcategories</label><textarea class="input" name="subs" placeholder="Separate with commas, e.g. Hinges, Drawer Channels">${esc((c?.subcategories || []).join(', '))}</textarea></div>`,
      async onSubmit(f) { await api(c ? '/categories/' + c._id : '/categories', { method: c ? 'PUT' : 'POST', body: { name: f.name.value, subcategories: f.subs.value } }); toast(c ? 'Category updated' : 'Category added'); load(); } });
    const del = (kind, id, list) => async () => {
      const item = list.find(x => x._id === id);
      if (await confirmDialog(`Delete "${item.name}"? This cannot be undone.`, { confirmText: 'Delete' })) {
        try { await api(`/${kind}/${id}`, { method: 'DELETE' }); toast('Deleted'); load(); } catch (e) { toast(e.message, 'error'); }
      }
    };
    if (admin) {
      $('#add-b')?.addEventListener('click', () => brandForm());
      $('#add-c')?.addEventListener('click', () => catForm());
      $$('[data-eb]', root).forEach(b => b.onclick = () => brandForm(brands.find(x => x._id === b.dataset.eb)));
      $$('[data-ec]', root).forEach(b => b.onclick = () => catForm(cats.find(x => x._id === b.dataset.ec)));
      $$('[data-db]', root).forEach(b => b.onclick = del('brands', b.dataset.db, brands));
      $$('[data-dc]', root).forEach(b => b.onclick = del('categories', b.dataset.dc, cats));
    }
  }
  await load();
  return { refresh: load };
}
