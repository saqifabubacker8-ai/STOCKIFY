import { api } from '../api.js';
import { $, $$, esc, icon, modal, toast, confirmDialog } from '../ui.js';

export default async function (root, ctx) {
  const admin = ctx.user.role === 'admin';
  const s = ctx.settings;
  root.innerHTML = `<div class="page-head"><div><h1>Settings</h1><p>Business details shown on invoices, your password and your team.</p></div></div>
    <div class="master-grid"><div style="display:grid;gap:16px">
      <form class="card" id="biz"><div class="card-head"><h3>Business details</h3></div><div class="card-body grid">
        <div class="field"><label>Business name</label><input class="input" name="name" required value="${esc(s.name)}" ${admin ? '' : 'disabled'}></div>
        <div class="field"><label>Address</label><textarea class="input" name="address" ${admin ? '' : 'disabled'}>${esc(s.address)}</textarea></div>
        <div class="grid g2"><div class="field"><label>Phone</label><input class="input" name="phone" value="${esc(s.phone)}" ${admin ? '' : 'disabled'}></div><div class="field"><label>Email</label><input class="input" name="email" value="${esc(s.email)}" ${admin ? '' : 'disabled'}></div></div>
        <div class="field"><label>GSTIN</label><input class="input" name="gstin" maxlength="15" value="${esc(s.gstin)}" ${admin ? '' : 'disabled'}></div>
        <div class="field"><label>Invoice footer note</label><input class="input" name="invoiceNote" value="${esc(s.invoiceNote)}" ${admin ? '' : 'disabled'}></div>
        ${admin ? '<div><button class="btn primary" type="submit">Save business details</button></div>' : '<small class="muted">Only administrators can change these.</small>'}</div></form>
      <form class="card" id="pw"><div class="card-head"><h3>Change password</h3></div><div class="card-body grid">
        <div class="field"><label>Current password</label><input class="input" name="current" type="password" autocomplete="current-password" required></div>
        <div class="field"><label>New password</label><input class="input" name="next" type="password" minlength="8" autocomplete="new-password" required><small>At least 8 characters.</small></div>
        <div><button class="btn dark" type="submit">Update password</button></div></div></form></div>
      ${admin ? `<section class="card"><div class="card-head"><h3>Team</h3><button class="btn primary sm" id="add-u">${icon('plus')} Add user</button></div><div class="card-body" id="users"></div></section>` : ''}</div>`;

  $('#biz').addEventListener('submit', async e => {
    e.preventDefault();
    try { const body = Object.fromEntries(new FormData(e.target)); Object.assign(ctx.settings, await api('/settings', { method: 'PUT', body })); toast('Business details saved'); } catch (err) { toast(err.message, 'error'); }
  });
  $('#pw').addEventListener('submit', async e => {
    e.preventDefault();
    try { await api('/auth/password', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); e.target.reset(); toast('Password updated'); } catch (err) { toast(err.message, 'error'); }
  });

  if (admin) {
    const loadUsers = async () => {
      const users = await api('/auth/users');
      $('#users').innerHTML = users.map(u => `<div class="list-row"><div class="dot c-navy">${icon('check')}</div><div class="grow"><b>${esc(u.name)}</b><small>${esc(u.email)}</small></div><span class="badge ${u.role === 'admin' ? 'info' : 'grey'}">${u.role}</span>
        ${u.id !== ctx.user.id ? `<button class="icon-btn danger" data-u="${u.id}" aria-label="Remove ${esc(u.name)}">${icon('trash')}</button>` : ''}</div>`).join('');
      $$('[data-u]', root).forEach(b => b.onclick = async () => {
        const u = users.find(x => x.id === b.dataset.u);
        if (await confirmDialog(`Remove ${u.name}? They will no longer be able to sign in.`, { confirmText: 'Remove user' })) { try { await api('/auth/users/' + u.id, { method: 'DELETE' }); toast('User removed'); loadUsers(); } catch (err) { toast(err.message, 'error'); } }
      });
    };
    $('#add-u').onclick = () => modal({ title: 'Add user', size: 'sm', submit: 'Add user', body: `<div class="grid"><div class="field"><label>Name</label><input class="input" name="name" required></div><div class="field"><label>Email</label><input class="input" name="email" type="email" required></div>
      <div class="field"><label>Temporary password</label><input class="input" name="password" type="password" minlength="8" required autocomplete="new-password"></div>
      <div class="field"><label>Role</label><select class="input" name="role"><option value="staff">Staff - can sell, buy and move stock</option><option value="admin">Administrator - full access</option></select></div></div>`,
      async onSubmit(f) { await api('/auth/users', { method: 'POST', body: { name: f.name.value, email: f.email.value, password: f.password.value, role: f.role.value } }); toast('User added'); loadUsers(); } });
    await loadUsers();
  }
  return {};
}
