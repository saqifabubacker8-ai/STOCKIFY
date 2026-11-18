import { api } from '../api.js';
import { $, $$, esc, icon, modal, toast, confirmDialog, emptyState, debounce, skeleton } from '../ui.js';

export default async function (root, ctx) {
  const admin = ctx.user.role === 'admin';
  let all = [];
  root.innerHTML = `<div class="page-head"><div><h1>Suppliers</h1><p>The people you buy from. Pick one when recording a purchase.</p></div>${admin ? `<button class="btn primary" id="add">${icon('plus')} Add supplier</button>` : ''}</div>
    <div class="card toolbar"><div class="search">${icon('search')}<input class="input" id="q" placeholder="Search suppliers…" aria-label="Search suppliers"></div></div>
    <div class="card"><div class="table-wrap" id="out">${skeleton(4)}</div></div>`;

  const form = s => modal({ title: s ? 'Edit supplier' : 'Add supplier', size: 'md', submit: s ? 'Save changes' : 'Add supplier',
    body: `<div class="grid g2"><div class="field"><label>Supplier name</label><input class="input" name="name" required value="${esc(s?.name)}"></div><div class="field"><label>Contact person</label><input class="input" name="contactPerson" value="${esc(s?.contactPerson)}"></div>
      <div class="field"><label>Phone</label><input class="input" name="phone" inputmode="tel" value="${esc(s?.phone)}"></div><div class="field"><label>Email</label><input class="input" name="email" type="email" value="${esc(s?.email)}"></div>
      <div class="field"><label>GSTIN</label><input class="input" name="gstin" maxlength="15" value="${esc(s?.gstin)}"></div></div>
      <div class="field" style="margin-top:14px"><label>Address</label><textarea class="input" name="address">${esc(s?.address)}</textarea></div>`,
    async onSubmit(f) {
      const body = Object.fromEntries(['name', 'contactPerson', 'phone', 'email', 'gstin', 'address'].map(k => [k, f[k].value]));
      await api(s ? '/suppliers/' + s._id : '/suppliers', { method: s ? 'PUT' : 'POST', body }); toast(s ? 'Supplier updated' : 'Supplier added'); load();
    } });

  function draw() {
    const q = $('#q').value.trim().toLowerCase();
    const list = all.filter(s => !q || `${s.name} ${s.contactPerson} ${s.phone} ${s.email}`.toLowerCase().includes(q));
    $('#out').innerHTML = list.length ? `<table class="table"><thead><tr><th>Supplier</th><th>Contact</th><th>GSTIN</th><th>Address</th>${admin ? '<th></th>' : ''}</tr></thead><tbody>
      ${list.map(s => `<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.contactPerson)}<small>${esc(s.phone)}${s.email ? ' · ' + esc(s.email) : ''}</small></td><td>${esc(s.gstin) || '-'}</td><td>${esc(s.address) || '-'}</td>
      ${admin ? `<td style="white-space:nowrap"><button class="icon-btn" data-e="${s._id}" aria-label="Edit">${icon('edit')}</button><button class="icon-btn danger" data-d="${s._id}" aria-label="Delete">${icon('trash')}</button></td>` : ''}</tr>`).join('')}</tbody></table>`
      : emptyState('truck', all.length ? 'No suppliers match' : 'No suppliers yet', all.length ? 'Try a different search.' : 'Add your first supplier to start recording purchases.', admin && !all.length ? `<button class="btn primary" id="add2">${icon('plus')} Add supplier</button>` : '');
    $$('[data-e]', root).forEach(b => b.onclick = () => form(all.find(s => s._id === b.dataset.e)));
    $$('[data-d]', root).forEach(b => b.onclick = async () => {
      const s = all.find(x => x._id === b.dataset.d);
      if (await confirmDialog(`Delete supplier "${s.name}"?`, { confirmText: 'Delete' })) { try { await api('/suppliers/' + s._id, { method: 'DELETE' }); toast('Supplier deleted'); load(); } catch (e) { toast(e.message, 'error'); } }
    });
    const a2 = $('#add2'); if (a2) a2.onclick = () => form();
  }
  async function load() { all = await api('/suppliers'); draw(); }
  $('#q').addEventListener('input', debounce(draw, 150));
  const add = $('#add'); if (add) add.onclick = () => form();
  await load();
  return { refresh: load };
}
