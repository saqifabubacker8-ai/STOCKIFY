// Tiny canvas charts (no external libraries): grouped bars and a doughnut, both animated with hover tooltips.
const ease = t => 1 - Math.pow(1 - t, 3);
const short = v => (v >= 1e7 ? (v / 1e7).toFixed(1) + 'Cr' : v >= 1e5 ? (v / 1e5).toFixed(1) + 'L' : v >= 1e3 ? (v / 1e3).toFixed(1) + 'k' : String(Math.round(v)));
const niceMax = v => { const p = Math.pow(10, Math.floor(Math.log10(v))); return Math.ceil(v / p) * p; };
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function setup(c) {
  const r = c.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  c.width = r.width * dpr; c.height = r.height * dpr;
  const g = c.getContext('2d'); g.scale(dpr, dpr);
  return { g, w: r.width, h: r.height };
}
function tipFor(canvas) {
  let t = canvas.parentElement.querySelector('.chart-tip');
  if (!t) { t = document.createElement('div'); t.className = 'chart-tip'; canvas.parentElement.append(t); }
  return t;
}
const showTip = (tip, x, y, html) => { tip.innerHTML = html; tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.style.opacity = 1; };

export function groupedBars(canvas, labels, series, { fmt = String, animate = true } = {}) {
  const pad = { l: 46, r: 6, t: 10, b: 26 };
  const max = niceMax(Math.max(1, ...series.flatMap(s => s.data)));
  let prog = animate && !reduce() ? 0 : 1, hover = -1;
  const tip = tipFor(canvas);
  const draw = () => {
    const { g, w, h } = setup(canvas), iw = w - pad.l - pad.r, ih = h - pad.t - pad.b, gw = iw / labels.length;
    const bw = Math.max(3, Math.min(22, gw / (series.length + 1)));
    g.font = '11px Manrope, system-ui, sans-serif'; g.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + ih - ih * i / 4;
      g.strokeStyle = '#e8ecf3'; g.beginPath(); g.moveTo(pad.l, y); g.lineTo(w - pad.r, y); g.stroke();
      g.fillStyle = '#8a94a8'; g.textAlign = 'right'; g.fillText(short(max * i / 4), pad.l - 8, y);
    }
    labels.forEach((l, i) => {
      const cx = pad.l + gw * i + gw / 2, x0 = cx - (bw * series.length) / 2;
      if (i === hover) { g.fillStyle = 'rgba(36,80,214,.07)'; g.fillRect(pad.l + gw * i, pad.t, gw, ih); }
      series.forEach((s, j) => {
        const bh = ih * (s.data[i] / max) * ease(prog);
        g.fillStyle = s.color; g.beginPath();
        g.roundRect ? g.roundRect(x0 + bw * j, pad.t + ih - bh, bw - 2, bh, [4, 4, 0, 0]) : g.rect(x0 + bw * j, pad.t + ih - bh, bw - 2, bh);
        g.fill();
      });
      if (labels.length <= 10 || i % Math.ceil(labels.length / 8) === 0) { g.fillStyle = '#8a94a8'; g.textAlign = 'center'; g.fillText(l, cx, h - 10); }
    });
  };
  const loop = () => { prog = Math.min(1, prog + 0.05); draw(); if (prog < 1 && canvas.isConnected) requestAnimationFrame(loop); };
  loop();
  canvas.onmousemove = e => {
    const r = canvas.getBoundingClientRect(), gw = (r.width - pad.l - pad.r) / labels.length;
    const i = Math.floor((e.clientX - r.left - pad.l) / gw);
    if (i < 0 || i >= labels.length) return canvas.onmouseleave();
    if (i !== hover) { hover = i; if (prog >= 1) draw(); }
    showTip(tip, pad.l + gw * i + gw / 2, e.clientY - r.top, `<b>${labels[i]}</b>` + series.map(s => `<br><span style="color:${s.color}">&#9632;</span> ${s.name}: ${fmt(s.data[i])}`).join(''));
  };
  canvas.onmouseleave = () => { hover = -1; tip.style.opacity = 0; if (prog >= 1) draw(); };
  const ro = new ResizeObserver(() => { if (!canvas.isConnected) return ro.disconnect(); if (prog >= 1) draw(); });
  ro.observe(canvas.parentElement);
}

export function doughnut(canvas, items, { centerLabel = '', centerValue = '', fmt = String, animate = true } = {}) {
  const total = items.reduce((a, i) => a + i.value, 0);
  let prog = animate && !reduce() ? 0 : 1, hover = -1;
  const tip = tipFor(canvas);
  const geom = () => { const r = canvas.getBoundingClientRect(); return { cx: r.width / 2, cy: r.height / 2, R: Math.min(r.width, r.height) / 2 - 6 }; };
  const draw = () => {
    const { g, w, h } = setup(canvas), { cx, cy, R } = geom();
    if (!total) { g.strokeStyle = '#e8ecf3'; g.lineWidth = 22; g.beginPath(); g.arc(cx, cy, R - 11, 0, 7); g.stroke(); }
    let a = -Math.PI / 2;
    items.forEach((it, i) => {
      const sweep = (it.value / total) * Math.PI * 2 * ease(prog);
      g.strokeStyle = it.color; g.lineWidth = i === hover ? 28 : 22; g.lineCap = 'butt';
      g.beginPath(); g.arc(cx, cy, R - 14, a, a + Math.max(0, sweep - 0.02)); g.stroke(); a += sweep;
    });
    g.fillStyle = '#14213d'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '800 22px Manrope, system-ui, sans-serif'; g.fillText(centerValue, cx, cy - 6);
    g.fillStyle = '#6b7690'; g.font = '600 12px Manrope, system-ui, sans-serif'; g.fillText(centerLabel, cx, cy + 16);
  };
  const loop = () => { prog = Math.min(1, prog + 0.04); draw(); if (prog < 1 && canvas.isConnected) requestAnimationFrame(loop); };
  loop();
  canvas.onmousemove = e => {
    const r = canvas.getBoundingClientRect(), { cx, cy, R } = geom(), x = e.clientX - r.left - cx, y = e.clientY - r.top - cy, d = Math.hypot(x, y);
    let idx = -1;
    if (total && d > R - 30 && d < R + 4) {
      let ang = Math.atan2(y, x) + Math.PI / 2; if (ang < 0) ang += Math.PI * 2;
      let acc = 0; items.forEach((it, i) => { const s = (it.value / total) * Math.PI * 2; if (ang >= acc && ang < acc + s) idx = i; acc += s; });
    }
    if (idx !== hover) { hover = idx; draw(); }
    if (idx < 0) tip.style.opacity = 0;
    else showTip(tip, e.clientX - r.left, e.clientY - r.top, `<b>${items[idx].label}</b><br>${fmt(items[idx].value)} (${Math.round(items[idx].value / total * 100)}%)`);
  };
  canvas.onmouseleave = () => { hover = -1; tip.style.opacity = 0; draw(); };
}
