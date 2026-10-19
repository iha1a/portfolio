'use strict';

const PRESETS = [
  { t: 'Best-selling products', d: 'JOIN + GROUP BY', q:
`SELECT p.name, SUM(i.quantity) AS units, ROUND(SUM(i.quantity * i.unit_price), 2) AS revenue
FROM order_items i
JOIN products p ON p.product_id = i.product_id
JOIN orders o   ON o.order_id = i.order_id
WHERE o.status <> 'cancelled'
GROUP BY p.product_id
ORDER BY revenue DESC;` },
  { t: 'Revenue by month', d: 'View + date functions', q:
`SELECT strftime('%Y-%m', ordered_on) AS month,
       COUNT(*) AS orders,
       ROUND(SUM(total), 2) AS revenue
FROM order_totals
WHERE status <> 'cancelled'
GROUP BY month
ORDER BY month;` },
  { t: 'Top customers', d: 'Window function RANK()', q:
`SELECT c.full_name, c.city, ROUND(SUM(t.total), 2) AS spent,
       RANK() OVER (ORDER BY SUM(t.total) DESC) AS rank
FROM customers c
JOIN order_totals t ON t.customer_id = c.customer_id
WHERE t.status <> 'cancelled'
GROUP BY c.customer_id
ORDER BY rank;` },
  { t: 'Customers with no orders', d: 'LEFT JOIN … IS NULL', q:
`SELECT c.full_name, c.email, c.joined_on
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE o.order_id IS NULL;` },
  { t: 'Low stock alert', d: 'Filtering + CASE', q:
`SELECT name, stock,
       CASE WHEN stock < 20 THEN 'Reorder now'
            WHEN stock < 60 THEN 'Watch'
            ELSE 'OK' END AS level
FROM products
ORDER BY stock;` },
  { t: 'Average rating per category', d: 'Subquery + AVG', q:
`SELECT cat.name AS category,
       ROUND(AVG(r.rating), 2) AS avg_rating,
       COUNT(r.review_id) AS reviews
FROM categories cat
JOIN products p ON p.category_id = cat.category_id
LEFT JOIN reviews r ON r.product_id = p.product_id
GROUP BY cat.category_id
ORDER BY avg_rating DESC;` },
  { t: 'Test the stock trigger', d: 'Trigger rejects overselling', q:
`-- Only 12 brushes are in stock, so ordering 50 must fail:
INSERT INTO orders VALUES (99, 1, '2026-07-01', 'paid');
INSERT INTO order_items VALUES (99, 8, 50, 22);` },
];

const $ = (s) => document.querySelector(s);
let SQL, db, schemaText = '';

const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function status(msg, isErr) {
  const s = $('#status');
  s.textContent = msg;
  s.classList.toggle('err', !!isErr);
}

function freshDb() {
  db = new SQL.Database();
  db.exec(schemaText);
}

function run() {
  const q = $('#sql').value.trim();
  if (!q) return;
  const t0 = performance.now();
  try {
    const res = db.exec(q);
    const ms = (performance.now() - t0).toFixed(1);
    if (!res.length) {
      $('#out').innerHTML = '';
      status(`Done in ${ms} ms. ${db.getRowsModified()} row(s) changed.`);
      return;
    }
    const last = res[res.length - 1];
    $('#out').innerHTML = `<table><thead><tr>${last.columns.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead>
      <tbody>${last.values.map((r) => `<tr>${r.map((v) => `<td>${v === null ? '<em>NULL</em>' : esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    status(`${last.values.length} row(s) in ${ms} ms.`);
  } catch (e) {
    $('#out').innerHTML = '';
    status('Error: ' + e.message, true);
  }
}

function renderPresets(active) {
  $('#presets').innerHTML = PRESETS.map((p, i) =>
    `<button type="button" data-i="${i}" aria-pressed="${i === active}">${p.t}<small>${p.d}</small></button>`).join('');
}

$('#presets').addEventListener('click', (e) => {
  const b = e.target.closest('[data-i]'); if (!b) return;
  const i = +b.dataset.i;
  $('#sql').value = PRESETS[i].q;
  renderPresets(i);
  run();
});
$('#run').addEventListener('click', run);
$('#sql').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); } });
$('#reset').addEventListener('click', () => { freshDb(); status('Database reset to the original data.'); $('#out').innerHTML = ''; });

(async () => {
  try {
    const [lib, text] = await Promise.all([
      initSqlJs({ locateFile: (f) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${f}` }),
      fetch('schema.sql').then((r) => r.text()),
    ]);
    SQL = lib; schemaText = text;
    $('#schema').textContent = text;
    freshDb();
    $('#sql').value = PRESETS[0].q;
    renderPresets(0);
    run();
  } catch (e) {
    status('Could not load the database engine. Check your connection and reload.', true);
  }
})();
