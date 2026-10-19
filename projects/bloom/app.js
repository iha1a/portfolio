'use strict';

// Catalogue. Each bouquet is drawn as SVG from its flower type and colours, so the shop needs no image files.
const BOUQUETS = [
  { id: 'blush', name: 'Blush Romance', desc: 'Garden roses and spray roses in soft pink.', price: 48, type: 'rose', colors: ['#f29bb0', '#e0607e', '#f7c6d1'], occasion: 'love', pop: 98, tag: 'Bestseller' },
  { id: 'sunny', name: 'Sunny Morning', desc: 'Bright sunflowers with chamomile.', price: 39, type: 'sun', colors: ['#f4b942', '#f7cf5c', '#e9a72a'], occasion: 'thanks', pop: 90 },
  { id: 'tulip', name: 'Tulip Parade', desc: 'Twenty Dutch tulips in spring colours.', price: 42, type: 'tulip', colors: ['#ef6f6c', '#f4a259', '#c86b98'], occasion: 'birthday', pop: 86, tag: 'New' },
  { id: 'peony', name: 'Peony Cloud', desc: 'Lush peonies, seasonal and fragrant.', price: 64, type: 'peony', colors: ['#f7b7c7', '#f193ad', '#fbd4de'], occasion: 'love', pop: 95 },
  { id: 'lav', name: 'Lavender Calm', desc: 'Lavender and lisianthus in lilac tones.', price: 36, type: 'daisy', colors: ['#b39ddb', '#9575cd', '#d1c4e9'], occasion: 'sympathy', pop: 70 },
  { id: 'white', name: 'Pure White', desc: 'White roses and eucalyptus, elegant and calm.', price: 52, type: 'rose', colors: ['#fdfaf6', '#efe7dd', '#ffffff'], occasion: 'sympathy', pop: 75 },
  { id: 'coral', name: 'Coral Party', desc: 'Gerberas and roses in coral and orange.', price: 45, type: 'daisy', colors: ['#ff8a65', '#ff7043', '#ffab91'], occasion: 'birthday', pop: 88 },
  { id: 'thanks', name: 'Thank You Mix', desc: 'A cheerful mix of seasonal stems.', price: 34, type: 'tulip', colors: ['#f4b942', '#e0607e', '#9575cd'], occasion: 'thanks', pop: 80 },
];
const OCCASIONS = [['all', 'All'], ['love', 'Love'], ['birthday', 'Birthday'], ['thanks', 'Thank you'], ['sympathy', 'Sympathy']];
const SIZES = { S: 1, M: 1.35, L: 1.8 };
const FREE_SHIPPING = 60;

const $ = (s) => document.querySelector(s);
const money = (n) => '$' + n.toFixed(n % 1 ? 2 : 0);

function flower(type, c, x, y, s) {
  const g = `transform="translate(${x} ${y}) scale(${s})"`;
  if (type === 'sun') {
    let petals = '';
    for (let i = 0; i < 12; i++) petals += `<ellipse cx="0" cy="-15" rx="5" ry="11" fill="${c}" transform="rotate(${i * 30})"/>`;
    return `<g ${g}>${petals}<circle r="9" fill="#6b4226"/></g>`;
  }
  if (type === 'tulip') return `<g ${g}><path d="M-11 -4 C-12 -22 -4 -24 0 -16 C4 -24 12 -22 11 -4 C9 8 -9 8 -11 -4Z" fill="${c}"/><path d="M0 -16 C-3 -6 -3 2 0 6 C3 2 3 -6 0 -16Z" fill="#000" opacity=".08"/></g>`;
  if (type === 'daisy') {
    let petals = '';
    for (let i = 0; i < 10; i++) petals += `<ellipse cx="0" cy="-12" rx="4.5" ry="9" fill="${c}" transform="rotate(${i * 36})"/>`;
    return `<g ${g}>${petals}<circle r="6" fill="#f4b942"/></g>`;
  }
  if (type === 'peony') return `<g ${g}><circle r="16" fill="${c}"/><circle r="11" fill="#fff" opacity=".25"/><path d="M-9 -2 C-5 -12 5 -12 9 -2 M-6 4 C-2 -4 2 -4 6 4" stroke="#000" stroke-opacity=".12" stroke-width="2" fill="none"/></g>`;
  // rose
  return `<g ${g}><circle r="14" fill="${c}"/><path d="M0 -8 C8 -8 8 4 0 4 C-6 4 -6 -4 0 -4 C3 -4 3 0 0 0" stroke="#000" stroke-opacity=".18" stroke-width="2" fill="none"/></g>`;
}

function bouquetSVG(b, cls = '') {
  const spots = [[100, 70, 1.25], [70, 88, 1.05], [130, 88, 1.05], [84, 56, .95], [118, 54, .95], [100, 98, 1], [56, 66, .85], [144, 66, .85]];
  const stems = spots.map(([x, y]) => `<path d="M${x} ${y + 10} L100 170" stroke="#4f7d5a" stroke-width="2.4"/>`).join('');
  const leaves = '<path d="M100 150 C70 140 60 120 62 112 C80 116 92 130 100 150Z M100 150 C130 140 140 120 138 112 C120 116 108 130 100 150Z" fill="#6a9e74"/>';
  const heads = spots.map(([x, y, s], i) => flower(b.type, b.colors[i % b.colors.length], x, y, s)).join('');
  const wrap = '<path d="M64 130 L136 130 L116 196 L84 196Z" fill="#e8d5c4"/><path d="M84 160 L116 160" stroke="#c9a98f" stroke-width="5"/>';
  return `<svg class="${cls}" viewBox="0 0 200 200" role="img" aria-label="${b.name} bouquet">${stems}${leaves}${heads}${wrap}</svg>`;
}

// ---- state (cart persists between visits) ----
let cart = [];
try { cart = JSON.parse(localStorage.getItem('bloom_cart') || '[]'); } catch { cart = []; }
const save = () => { try { localStorage.setItem('bloom_cart', JSON.stringify(cart)); } catch {} };
const chosenSize = {};
let occasion = 'all';

function renderFilters() {
  $('#filters').innerHTML = OCCASIONS.map(([k, label]) =>
    `<button class="chip" type="button" data-occ="${k}" aria-pressed="${k === occasion}">${label}</button>`).join('');
}

function renderGrid() {
  const q = $('#q').value.trim().toLowerCase();
  const sort = $('#sort').value;
  let list = BOUQUETS.filter((b) => (occasion === 'all' || b.occasion === occasion) &&
    (!q || (b.name + ' ' + b.desc).toLowerCase().includes(q)));
  list.sort((a, b) => sort === 'low' ? a.price - b.price : sort === 'high' ? b.price - a.price : b.pop - a.pop);
  $('#empty').hidden = list.length > 0;
  $('#grid').innerHTML = list.map((b) => {
    const size = chosenSize[b.id] || 'M';
    return `<article class="item">
      <div class="pic" style="background:${b.colors[0]}22">${b.tag ? `<span class="tag">${b.tag}</span>` : ''}${bouquetSVG(b)}</div>
      <div class="info">
        <h3>${b.name}</h3><p>${b.desc}</p>
        <div class="buy">
          <span class="price">${money(b.price * SIZES[size])}</span>
          <div class="sizes" role="group" aria-label="Size for ${b.name}">
            ${Object.keys(SIZES).map((s) => `<button type="button" data-size="${s}" data-id="${b.id}" aria-pressed="${s === size}">${s}</button>`).join('')}
          </div>
        </div>
        <button class="add" type="button" data-add="${b.id}">Add to bag</button>
      </div>
    </article>`;
  }).join('');
}

function renderCart() {
  const n = cart.reduce((a, l) => a + l.qty, 0);
  $('#count').textContent = n;
  const total = cart.reduce((a, l) => a + l.qty * l.price, 0);
  $('#subtotal').textContent = money(total);
  $('#cartEmpty').hidden = cart.length > 0;
  $('#checkout').disabled = cart.length === 0;
  $('#shipNote').textContent = cart.length === 0 ? '' : total >= FREE_SHIPPING
    ? 'You get free delivery.' : `Add ${money(FREE_SHIPPING - total)} more for free delivery.`;
  $('#lines').innerHTML = cart.map((l, i) => {
    const b = BOUQUETS.find((x) => x.id === l.id);
    return `<li class="line">
      <div class="thumb" style="background:${b.colors[0]}22">${bouquetSVG(b)}</div>
      <div><h3>${b.name}</h3><small>Size ${l.size} · ${money(l.price)}</small>
        <div class="qty"><button type="button" data-dec="${i}" aria-label="Remove one ${b.name}">−</button><span>${l.qty}</span><button type="button" data-inc="${i}" aria-label="Add one ${b.name}">+</button></div></div>
      <b>${money(l.price * l.qty)}</b>
    </li>`;
  }).join('');
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), 2200);
}

// ---- cart drawer with focus handling ----
let lastFocus = null;
function openCart() {
  lastFocus = document.activeElement;
  $('#cart').hidden = false; $('#scrim').hidden = false;
  $('#closeCart').focus();
}
function closeCart() {
  $('#cart').hidden = true; $('#scrim').hidden = true;
  if (lastFocus) lastFocus.focus();
}
document.addEventListener('keydown', (e) => {
  if ($('#cart').hidden) return;
  if (e.key === 'Escape') closeCart();
  if (e.key === 'Tab') {
    const f = [...$('#cart').querySelectorAll('button:not([disabled])')];
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }
});

// ---- events ----
$('#filters').addEventListener('click', (e) => {
  const b = e.target.closest('[data-occ]'); if (!b) return;
  occasion = b.dataset.occ; renderFilters(); renderGrid();
});
$('#q').addEventListener('input', renderGrid);
$('#sort').addEventListener('change', renderGrid);
$('#grid').addEventListener('click', (e) => {
  const s = e.target.closest('[data-size]');
  if (s) { chosenSize[s.dataset.id] = s.dataset.size; renderGrid(); return; }
  const a = e.target.closest('[data-add]'); if (!a) return;
  const b = BOUQUETS.find((x) => x.id === a.dataset.add);
  const size = chosenSize[b.id] || 'M';
  const price = Math.round(b.price * SIZES[size] * 100) / 100;
  const line = cart.find((l) => l.id === b.id && l.size === size);
  line ? line.qty++ : cart.push({ id: b.id, size, price, qty: 1 });
  save(); renderCart();
  const btn = $('#openCart'); btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump');
  toast(`${b.name} (${size}) added to your bag`);
});
$('#lines').addEventListener('click', (e) => {
  const inc = e.target.closest('[data-inc]'), dec = e.target.closest('[data-dec]');
  if (inc) cart[+inc.dataset.inc].qty++;
  if (dec) { const i = +dec.dataset.dec; if (--cart[i].qty <= 0) cart.splice(i, 1); }
  if (inc || dec) { save(); renderCart(); }
});
$('#openCart').addEventListener('click', openCart);
$('#closeCart').addEventListener('click', closeCart);
$('#scrim').addEventListener('click', closeCart);
$('#checkout').addEventListener('click', () => {
  cart = []; save(); renderCart(); closeCart();
  toast('Thank you! This is a demo shop, so no order was placed.');
});
$('#subForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = $('#email').value.trim();
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  $('#subMsg').textContent = ok ? 'You are subscribed. See you on Friday!' : 'Please enter a valid email address.';
  if (ok) $('#subForm').reset();
});

$('#heroArt').innerHTML = bouquetSVG(BOUQUETS[3], 'sway');
renderFilters(); renderGrid(); renderCart();
