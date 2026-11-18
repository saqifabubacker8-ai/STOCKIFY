const pick = (o, keys) => keys.reduce((a, k) => { if (o && o[k] !== undefined) a[k] = o[k]; return a; }, {});
const escapeRx = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const round2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const statusOf = (q, min) => (q <= 0 ? 'out' : q <= min ? 'low' : 'ok');

function productStatus(p) {
  if (p.variants && p.variants.length) {
    const s = p.variants.map(v => statusOf(v.quantity, v.minStock));
    if (s.every(x => x === 'out')) return 'out';
    return s.every(x => x === 'ok') ? 'ok' : 'low';
  }
  return statusOf(p.quantity, p.minStock);
}

// One row per sellable SKU (a variant, or the product itself when it has no variants)
function flatten(products) {
  const out = [];
  for (const p of products) {
    const base = { productId: p._id, name: p.name, brand: p.brand && p.brand.name, category: p.category && p.category.name };
    if (p.variants && p.variants.length) {
      for (const v of p.variants) {
        out.push({
          ...base, variantId: v._id, sku: v.sku,
          label: [v.size, v.finish, v.configuration].filter(Boolean).join(' / '),
          quantity: v.quantity, minStock: v.minStock,
          cost: v.purchasePrice || p.purchasePrice || 0, price: v.sellingPrice || p.sellingPrice || 0,
          status: statusOf(v.quantity, v.minStock)
        });
      }
    } else {
      out.push({
        ...base, variantId: null, sku: p.sku, label: '', quantity: p.quantity, minStock: p.minStock,
        cost: p.purchasePrice || 0, price: p.sellingPrice || 0, status: statusOf(p.quantity, p.minStock)
      });
    }
  }
  return out;
}

const dateRange = q => {
  const d = {};
  if (q.from) d.$gte = new Date(q.from + 'T00:00:00');
  if (q.to) d.$lte = new Date(q.to + 'T23:59:59.999');
  return Object.keys(d).length ? d : null;
};

module.exports = { pick, escapeRx, round2, statusOf, productStatus, flatten, dateRange };
