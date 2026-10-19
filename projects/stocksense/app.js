'use strict';

const $ = (s) => document.querySelector(s);
const WEEKS = 26, HORIZON = 6;
const SERVICE = [[0.90, 1.28], [0.95, 1.645], [0.975, 1.96], [0.99, 2.33]];

// Deterministic pseudo-random numbers so the demo data is the same on every visit.
function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }
const gauss = (r) => Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());

const SPEC = [
  ['Skin Tint Foundation', 'Face', 120, 1.2, 0.18, 260, 29],
  ['Velvet Matte Lipstick', 'Lips', 95, 0.6, 0.25, 140, 18],
  ['Nude Dreams Palette', 'Eyes', 40, -0.4, 0.2, 38, 34],
  ['Lift & Curl Mascara', 'Eyes', 80, 0.2, 0.15, 210, 16],
  ['Soft Blur Concealer', 'Face', 70, 1.5, 0.2, 90, 19],
  ['Glass Shine Gloss', 'Lips', 55, 0, 0.3, 160, 14],
  ['Blending Brush Duo', 'Tools', 22, 0.3, 0.25, 12, 22],
  ['Cream Blush Stick', 'Face', 48, 0.9, 0.22, 75, 21],
  ['Sunscreen SPF 50', 'Face', 60, 2.4, 0.2, 70, 15],
  ['Makeup Remover', 'Care', 65, -0.2, 0.12, 400, 9],
];
const PRODUCTS = SPEC.map(([name, cat, base, trend, noise, stock, price], i) => {
  const r = rng(i * 97 + 13);
  const sales = [];
  for (let w = 0; w < WEEKS; w++) {
    const season = 1 + 0.12 * Math.sin((w / 13) * Math.PI * 2 + i);
    sales.push(Math.max(0, Math.round((base + trend * w) * season * (1 + noise * gauss(r) * 0.5))));
  }
  sales[8 + (i * 5) % 14] = Math.round(sales[8 + (i * 5) % 14] * 2.6); // one promotion-like spike per product
  return { id: i, name, cat, stock, price, sales };
});

// Holt's linear (double) exponential smoothing, with alpha/beta tuned by grid search on one-step errors.
function holt(y, a, b) {
  let level = y[0], trend = y[1] - y[0];
  const fitted = [y[0]];
  for (let t = 1; t < y.length; t++) {
    const f = level + trend;
    fitted.push(f);
    const prev = level;
    level = a * y[t] + (1 - a) * f;
    trend = b * (level - prev) + (1 - b) * trend;
  }
  return { level, trend, fitted };
}
function fit(y) {
  let best = null;
  for (let a = 0.05; a <= 0.95; a += 0.05) for (let b = 0.01; b <= 0.5; b += 0.04) {
    const { fitted } = holt(y, a, b);
    let sse = 0;
    for (let t = 2; t < y.length; t++) sse += (y[t] - fitted[t]) ** 2;
    if (!best || sse < best.sse) best = { a, b, sse };
  }
  return best;
}
function analyse(p, leadWeeks, z, orderCost, holdCost) {
  // First pass finds anomalies; they are replaced by the fitted value before the final fit.
  const first = fit(p.sales);
  const f1 = holt(p.sales, first.a, first.b).fitted;
  const err1 = p.sales.map((v, t) => v - f1[t]).slice(2);
  const mean = err1.reduce((s, e) => s + e, 0) / err1.length;
  const sd = Math.sqrt(err1.reduce((s, e) => s + (e - mean) ** 2, 0) / err1.length);
  const anomalies = p.sales.map((v, t) => (t > 1 && Math.abs(v - f1[t] - mean) > 2.5 * sd ? t : -1)).filter((t) => t >= 0);
  const clean = p.sales.map((v, t) => (anomalies.includes(t) ? Math.round(f1[t]) : v));
  const m = fit(clean);
  const h = holt(clean, m.a, m.b);
  const res = clean.map((v, t) => v - h.fitted[t]).slice(2);
  const sigma = Math.sqrt(res.reduce((s, e) => s + e * e, 0) / res.length);
  const forecast = Array.from({ length: HORIZON }, (_, k) => Math.max(0, h.level + h.trend * (k + 1)));
  const weekly = forecast[0];
  const next4 = forecast.slice(0, 4).reduce((s, v) => s + v, 0);
  const safety = z * sigma * Math.sqrt(leadWeeks);
  const leadDemand = forecast.slice(0, leadWeeks).reduce((s, v) => s + v, 0) + Math.max(0, leadWeeks - HORIZON) * forecast[HORIZON - 1];
  const rop = leadDemand + safety;
  const eoq = Math.sqrt((2 * weekly * 52 * orderCost) / holdCost);
  const coverWeeks = weekly > 0 ? p.stock / weekly : Infinity;
  const status = p.stock <= safety ? 'critical' : p.stock <= rop ? 'reorder' : coverWeeks > 16 ? 'overstock' : 'healthy';
  return { ...m, sigma, forecast, next4, safety, rop, eoq, coverWeeks, status, anomalies, trendPct: (h.trend * 4 / Math.max(1, weekly)) * 100 };
}

const STATUS = {
  critical: ['Critical: below safety stock', 'var(--bad)'],
  reorder: ['Reorder now', 'var(--warn)'],
  overstock: ['Overstocked', 'var(--fc)'],
  healthy: ['Healthy', 'var(--ok)'],
};
let current = 0;
const settings = () => ({ lead: +$('#lead').value, z: SERVICE[+$('#svc').value][1], svc: SERVICE[+$('#svc').value][0], oc: Math.max(1, +$('#oc').value || 1), hc: Math.max(0.1, +$('#hc').value || 0.1) });
const all = () => { const s = settings(); return PRODUCTS.map((p) => ({ p, r: analyse(p, s.lead, s.z, s.oc, s.hc) })); };

function chart(p, r) {
  const W = 800, H = 300, L = 40, R = 10, T = 14, B = 28;
  const n = WEEKS + HORIZON;
  const hi = r.forecast.map((v, k) => v + 1.96 * r.sigma * Math.sqrt(k + 1));
  const lo = r.forecast.map((v, k) => Math.max(0, v - 1.96 * r.sigma * Math.sqrt(k + 1)));
  const max = Math.max(...p.sales, ...hi) * 1.1;
  const x = (i) => L + (i / (n - 1)) * (W - L - R);
  const y = (v) => T + (1 - v / max) * (H - T - B);
  let g = '';
  for (let k = 0; k <= 4; k++) { const v = (max / 4) * k; g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${Math.round(v)}</text>`; }
  for (let w = 0; w < n; w += 4) g += `<text x="${x(w)}" y="${H - 8}" text-anchor="middle">W${w + 1}</text>`;
  g += `<line x1="${x(WEEKS - 1)}" x2="${x(WEEKS - 1)}" y1="${T}" y2="${H - B}" stroke="var(--muted)" stroke-dasharray="4 4"/><text x="${x(WEEKS - 1) + 6}" y="${T + 10}">today</text>`;
  const band = [...hi.map((v, k) => `${x(WEEKS + k)},${y(v)}`), ...lo.map((v, k) => `${x(WEEKS + k)},${y(v)}`).reverse()];
  g += `<polygon points="${x(WEEKS - 1)},${y(p.sales[WEEKS - 1])} ${band.join(' ')}" fill="color-mix(in srgb,var(--fc) 18%,transparent)"/>`;
  g += `<polyline fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" points="${p.sales.map((v, i) => `${x(i)},${y(v)}`).join(' ')}"/>`;
  g += `<polyline fill="none" stroke="var(--fc)" stroke-width="2.5" stroke-dasharray="7 5" points="${x(WEEKS - 1)},${y(p.sales[WEEKS - 1])} ${r.forecast.map((v, k) => `${x(WEEKS + k)},${y(v)}`).join(' ')}"/>`;
  g += `<line x1="${L}" x2="${W - R}" y1="${y(r.rop / Math.max(1, settings().lead))}" y2="${y(r.rop / Math.max(1, settings().lead))}" stroke="var(--warn)" stroke-width="1" stroke-dasharray="2 4" opacity=".7"/>`;
  r.anomalies.forEach((t) => { g += `<circle cx="${x(t)}" cy="${y(p.sales[t])}" r="6" fill="var(--bad)" stroke="var(--card)" stroke-width="2"><title>Week ${t + 1}: ${p.sales[t]} units (anomaly, excluded from the model)</title></circle>`; });
  $('#chart').innerHTML = g;
  $('#chart').setAttribute('aria-label', `${p.name}: 26 weeks of sales and a 6-week forecast`);
}

function render() {
  const s = settings();
  $('#leadOut').textContent = `${s.lead} week${s.lead > 1 ? 's' : ''}`;
  $('#svcOut').textContent = `${Math.round(s.svc * 1000) / 10}%`;
  const rows = all();
  const q = $('#filter').value.trim().toLowerCase();
  $('#plist').innerHTML = rows.filter(({ p }) => !q || p.name.toLowerCase().includes(q)).map(({ p, r }) =>
    `<li><button type="button" role="option" data-id="${p.id}" aria-selected="${p.id === current}"><span>${p.name}</span><span class="dot" style="background:${STATUS[r.status][1]}" title="${STATUS[r.status][0]}"></span></button></li>`).join('');
  const { p, r } = rows[current];
  $('#pName').textContent = p.name;
  $('#pMeta').textContent = `${p.cat} · $${p.price} per unit · last week sold ${p.sales[WEEKS - 1]}`;
  $('#pStatus').textContent = STATUS[r.status][0];
  $('#pStatus').style.cssText = `color:${STATUS[r.status][1]};background:color-mix(in srgb,${STATUS[r.status][1]} 14%,transparent)`;
  $('#kStock').textContent = p.stock;
  $('#kCover').textContent = r.coverWeeks === Infinity ? 'no demand' : `≈ ${r.coverWeeks.toFixed(1)} weeks of cover`;
  $('#kFc').textContent = Math.round(r.next4);
  $('#kTrend').textContent = `${r.trendPct >= 0 ? '▲' : '▼'} ${Math.abs(r.trendPct).toFixed(1)}% trend per month`;
  $('#kRop').textContent = Math.round(r.rop);
  $('#kSafety').textContent = `incl. ${Math.round(r.safety)} safety stock`;
  $('#kEoq').textContent = Math.round(r.eoq);
  $('#kWhen').textContent = r.status === 'critical' || r.status === 'reorder' ? 'order today' : r.status === 'overstock' ? 'pause orders' : `order in ≈ ${Math.max(0, Math.floor((p.stock - r.rop) / Math.max(1, r.forecast[0])))} weeks`;
  $('#modelInfo').textContent = `Model: Holt (α = ${r.a.toFixed(2)}, β = ${r.b.toFixed(2)}), forecast error σ = ${r.sigma.toFixed(1)} units/week, ${r.anomalies.length} anomal${r.anomalies.length === 1 ? 'y' : 'ies'} excluded. Dotted orange line: reorder point per week of lead time.`;
  chart(p, r);
  const order = { critical: 0, reorder: 1, overstock: 2, healthy: 3 };
  const alerts = rows.filter(({ r }) => r.status !== 'healthy').sort((a, b) => order[a.r.status] - order[b.r.status]);
  $('#alerts').innerHTML = alerts.length ? alerts.map(({ p, r }) => `<li><span class="dot" style="background:${STATUS[r.status][1]}"></span><div><button type="button" data-id="${p.id}">${p.name}</button><br>
    <span class="muted">${r.status === 'overstock' ? `${r.coverWeeks.toFixed(0)} weeks of stock: pause orders or run a promotion.` : `${p.stock} on hand vs reorder point ${Math.round(r.rop)}: order ${Math.round(r.eoq)} units.`}</span></div></li>`).join('')
    : '<li class="muted">All products are healthy.</li>';
}

document.addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (b) { current = +b.dataset.id; render(); } });
['#lead', '#svc', '#oc', '#hc'].forEach((s) => $(s).addEventListener('input', render));
$('#filter').addEventListener('input', render);
render();
