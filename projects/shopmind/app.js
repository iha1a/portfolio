import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2';

env.allowLocalModels = false;

const P = [
  ['Trail Runner X2', 'sport', 74, 'Lightweight running shoes with cushioned soles for long runs and trails.', '#22c55e'],
  ['CloudWalk Sneakers', 'fashion', 62, 'Comfortable everyday sneakers with memory foam for walking all day.', '#a3a3a3'],
  ['Thermo Steel Bottle', 'home', 24, 'Insulated steel bottle that keeps coffee or tea hot for 12 hours.', '#f97316'],
  ['Smart Fitness Band', 'tech', 49, 'Tracks steps, heart rate and sleep; water resistant, a week of battery.', '#06b6d4'],
  ['Noise-Cancel Headphones', 'tech', 129, 'Wireless over-ear headphones with noise cancelling for travel and focus.', '#6366f1'],
  ['Yoga Mat Pro', 'sport', 38, 'Non-slip thick mat for yoga, pilates and home workouts.', '#a855f7'],
  ['Pour-Over Coffee Set', 'home', 45, 'Glass dripper, kettle and filters for brewing great coffee at home.', '#92400e'],
  ['Silk Sleep Mask', 'beauty', 19, 'Soft silk eye mask that blocks light for deeper sleep while travelling.', '#ec4899'],
  ['Hydrating Face Serum', 'beauty', 32, 'Hyaluronic serum for dry skin, light and fast absorbing.', '#38bdf8'],
  ['Velvet Matte Lipstick', 'beauty', 18, 'Long-lasting matte red lipstick for evenings and special occasions.', '#be123c'],
  ['Wool Winter Scarf', 'fashion', 35, 'Warm merino wool scarf for cold winter days.', '#b45309'],
  ['Rain Shell Jacket', 'fashion', 89, 'Waterproof breathable jacket for rain, hiking and cycling.', '#0ea5e9'],
  ['Portable Power Bank', 'tech', 29, 'Pocket charger that charges a phone three times on the go.', '#64748b'],
  ['Desk Plant Kit', 'home', 22, 'Self-watering pot with herbs to grow on your desk.', '#16a34a'],
  ['Scented Soy Candle', 'home', 16, 'Calming lavender candle for a cosy, relaxing evening.', '#c084fc'],
  ['Running Belt', 'sport', 21, 'Slim waist belt that holds your phone and keys while running.', '#111827'],
  ['Mechanical Keyboard', 'tech', 79, 'Compact keyboard with tactile switches for typing and coding.', '#334155'],
  ['Leather Card Wallet', 'fashion', 27, 'Slim leather wallet, a classic gift for him or her.', '#7c2d12'],
  ['Kids Story Projector', 'kids', 34, 'Night light that projects stories and stars on the ceiling for children.', '#facc15'],
  ['Building Blocks Set', 'kids', 42, 'Creative construction set for children aged six and up.', '#ef4444'],
  ['Sunscreen SPF 50', 'beauty', 15, 'Light sunscreen for face and body, protects at the beach and outdoors.', '#fbbf24'],
  ['Camping Lantern', 'sport', 31, 'Rechargeable LED lantern for camping, hiking and power cuts.', '#f59e0b'],
  ['Espresso Cups Set', 'home', 26, 'Four double-walled glass cups that keep espresso hot.', '#78350f'],
  ['Wireless Earbuds', 'tech', 59, 'Small earbuds with a charging case, great for the gym and running.', '#0f172a'],
].map(([name, cat, price, desc, color], id) => ({ id, name, cat, price, desc, color }));
const CAT_WORDS = { sport: ['sport', 'run', 'gym', 'workout', 'fitness', 'hiking', 'camping'], tech: ['tech', 'gadget', 'electronic'], home: ['home', 'kitchen', 'house'], beauty: ['beauty', 'skin', 'makeup', 'skincare'], fashion: ['fashion', 'clothes', 'wear', 'outfit'], kids: ['kid', 'child', 'children', 'son', 'daughter', 'baby'] };
const IDEAS = ['a gift for a runner under $60', 'something to keep coffee hot', 'I travel a lot and can\'t sleep on planes', 'stay dry while hiking', 'gift for a 7 year old', 'relaxing evening at home'];
const ICONS = {
  sport: '<path d="M4 16c3 0 4-6 8-6s5 6 8 6" /><circle cx="12" cy="6" r="2.5"/>',
  tech: '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M10 18h4"/>',
  home: '<path d="M4 11 12 4l8 7v9H4z"/><path d="M10 20v-5h4v5"/>',
  beauty: '<path d="M10 3h4v6h-4zM8 9h8v12H8z"/>',
  fashion: '<path d="M8 4 4 7l2 4 2-1v10h8V10l2 1 2-4-4-3c0 2-2 3-4 3S8 6 8 4z"/>',
  kids: '<rect x="4" y="10" width="7" height="7" rx="1"/><rect x="13" y="10" width="7" height="7" rx="1"/><rect x="8.5" y="3" width="7" height="7" rx="1"/>',
};

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const icon = (p, size = '') => `<div class="pic" style="background:${p.color}1f;color:${p.color}"><svg ${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">${ICONS[p.cat]}</svg></div>`;

// ---------- AI: sentence embeddings ----------
let embed = null, vecs = null;
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
async function initAI() {
  try {
    embed = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    const out = await embed(P.map((p) => `${p.name}. ${p.desc} Category: ${p.cat}.`), { pooling: 'mean', normalize: true });
    vecs = out.tolist();
    $('#aiState').classList.add('ready');
    $('#aiState').lastChild.textContent = 'AI ready · on device';
  } catch {
    $('#aiState').lastChild.textContent = 'AI offline · keyword mode';
  }
}

// Pull a budget and category out of the sentence, then rank the rest by meaning.
function constraints(q) {
  const t = q.toLowerCase();
  const under = t.match(/(?:under|below|less than|max|up to|<)\s*\$?\s*(\d+)/);
  const over = t.match(/(?:over|above|more than|at least|>)\s*\$?\s*(\d+)/);
  const cat = Object.entries(CAT_WORDS).find(([, w]) => w.some((x) => t.includes(x)));
  return { max: under ? +under[1] : Infinity, min: over ? +over[1] : 0, cat: cat ? cat[0] : null };
}
async function rank(q) {
  const c = constraints(q);
  let scored;
  if (vecs) {
    // Budget phrases and "gift for" carry no meaning about the product itself, so they are removed before embedding.
    const core = q.replace(/(?:under|below|less than|max|up to|over|above|more than|at least|[<>])\s*\$?\s*\d+\s*\$?/gi, ' ')
      .replace(/\b(?:a |an )?(?:gift|present)s?\b(?:\s+(?:for|to))?/gi, ' ').replace(/\s+/g, ' ').trim() || q;
    const qv = (await embed(core, { pooling: 'mean', normalize: true })).tolist()[0];
    scored = P.map((p, i) => ({ p, s: dot(qv, vecs[i]) + (c.cat && p.cat === c.cat ? 0.08 : 0) }));
  } else {
    const words = q.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
    scored = P.map((p) => { const t = (p.name + ' ' + p.desc + ' ' + p.cat).toLowerCase(); return { p, s: words.filter((w) => t.includes(w)).length / (words.length || 1) }; });
  }
  return { c, list: scored.filter(({ p }) => p.price <= c.max && p.price >= c.min).sort((a, b) => b.s - a.s) };
}
function similar(p, n = 3) {
  if (!vecs) return P.filter((x) => x.cat === p.cat && x.id !== p.id).slice(0, n).map((x) => ({ p: x, s: 0 }));
  return P.filter((x) => x.id !== p.id).map((x) => ({ p: x, s: dot(vecs[p.id], vecs[x.id]) })).sort((a, b) => b.s - a.s).slice(0, n);
}

// ---------- rendering ----------
function cards(list, showMatch) {
  $('#grid').innerHTML = list.map(({ p, s }) => `<button class="card" type="button" data-id="${p.id}" aria-label="${esc(p.name)}, $${p.price}">
    ${icon(p)}${showMatch && vecs ? `<span class="match">${Math.round(Math.max(0, s) * 100)}% match</span>` : ''}
    <div class="cbody"><small>${p.cat}</small><h3>${esc(p.name)}</h3><span class="price">$${p.price}</span></div></button>`).join('');
}
async function search(q) {
  if (!q.trim()) return;
  $('#resultsTitle').textContent = `Results for "${q}"`;
  const { c, list } = await rank(q);
  const top = list.slice(0, 8);
  const bits = [];
  if (c.max < Infinity) bits.push(`under $${c.max}`);
  if (c.cat) bits.push(`category: ${c.cat}`);
  $('#resultsInfo').textContent = `${vecs ? 'AI semantic ranking' : 'Keyword ranking'}${bits.length ? ' · ' + bits.join(' · ') : ''}`;
  cards(top, true);
}

// ---------- assistant ----------
function say(html, who = 'bot') {
  const d = document.createElement('div');
  d.className = 'msg ' + who; d.innerHTML = html;
  $('#chat').appendChild(d); $('#chat').scrollTop = $('#chat').scrollHeight;
  return d;
}
async function ask(q) {
  say(esc(q), 'me');
  const typing = say('<span class="typing"><i></i><i></i><i></i></span>');
  const t = q.toLowerCase();
  let reply;
  if (/^(hi|hello|hey|salam|marhaba)\b/.test(t)) reply = 'Hi! Tell me who you\'re shopping for or what problem you want to solve, and your budget.';
  else if (/(cart|basket|total)/.test(t)) { const sum = cart.reduce((a, id) => a + P[id].price, 0); reply = cart.length ? `You have ${cart.length} item(s) for $${sum}.` : 'Your cart is empty for now.'; }
  else if (/(cheap|cheapest|lowest price)/.test(t)) { const p = [...P].sort((a, b) => a.price - b.price).slice(0, 3); reply = picks('Our most affordable picks:', p.map((x) => ({ p: x }))); }
  else {
    const { c, list } = await rank(q);
    const top = list.slice(0, 3);
    reply = top.length
      ? picks(`Here's what fits best${c.max < Infinity ? ` within $${c.max}` : ''}:`, top)
      : `I couldn't find anything${c.max < Infinity ? ` under $${c.max}` : ''}. Want me to try a higher budget?`;
  }
  await new Promise((r) => setTimeout(r, 450));
  typing.innerHTML = reply;
}
const picks = (title, list) => `${title}<div class="picks">${list.map(({ p }) => `<button type="button" data-id="${p.id}"><span>${esc(p.name)}</span><b>$${p.price}</b></button>`).join('')}</div>`;

// ---------- product modal ----------
let lastFocus;
function openProduct(id) {
  const p = P[id];
  lastFocus = document.activeElement;
  $('#mBody').innerHTML = `<div class="m-grid">${icon(p)}<div><small class="muted">${p.cat.toUpperCase()}</small><h3 id="mTitle">${esc(p.name)}</h3><p>${esc(p.desc)}</p>
    <p style="font-size:22px;font-weight:800;color:var(--ink)">$${p.price}</p><button class="add" type="button" data-add="${p.id}">Add to cart</button></div></div>
    <div class="similar"><h4>${vecs ? 'Similar items (AI)' : 'More in this category'}</h4><div class="row">${similar(p).map(({ p: x, s }) => `<button type="button" data-id="${x.id}">${vecs ? `<small>${Math.round(s * 100)}% similar</small>` : ''}${esc(x.name)}<br><b>$${x.price}</b></button>`).join('')}</div></div>`;
  $('#modal').hidden = false;
  $('#closeModal').focus();
}
const closeModal = () => { $('#modal').hidden = true; lastFocus && lastFocus.focus(); };

// ---------- cart with AI bundle suggestion ----------
let cart = [];
try { cart = JSON.parse(localStorage.getItem('shopmind_cart') || '[]'); } catch { cart = []; }
function renderCart() {
  try { localStorage.setItem('shopmind_cart', JSON.stringify(cart)); } catch {}
  $('#cartCount').textContent = cart.length;
  $('#cartEmpty').hidden = cart.length > 0;
  $('#total').textContent = '$' + cart.reduce((a, id) => a + P[id].price, 0);
  $('#lines').innerHTML = cart.map((id, i) => `<li><span>${esc(P[id].name)}</span><span>$${P[id].price} <button type="button" data-rm="${i}" aria-label="Remove ${esc(P[id].name)}">&times;</button></span></li>`).join('');
  // Suggest the item closest to the whole cart (mean of item vectors) that isn't in it yet.
  if (cart.length && vecs) {
    const mean = vecs[0].map((_, k) => cart.reduce((a, id) => a + vecs[id][k], 0) / cart.length);
    const best = P.filter((p) => !cart.includes(p.id)).map((p) => ({ p, s: dot(mean, vecs[p.id]) })).sort((a, b) => b.s - a.s)[0];
    $('#bundle').innerHTML = `<div class="bundle"><b>Complete your cart</b><br>Shoppers with these items often add <b>${esc(best.p.name)}</b> ($${best.p.price}).<br><button type="button" data-add="${best.p.id}">Add it</button></div>`;
  } else $('#bundle').innerHTML = '';
}
const openCart = () => { lastFocus = document.activeElement; $('#cart').hidden = false; $('#scrim').hidden = false; $('#closeCart').focus(); };
const closeCart = () => { $('#cart').hidden = true; $('#scrim').hidden = true; lastFocus && lastFocus.focus(); };

// ---------- events ----------
document.addEventListener('click', (e) => {
  const add = e.target.closest('[data-add]');
  if (add) { cart.push(+add.dataset.add); renderCart(); add.textContent = 'Added'; return; }
  const rm = e.target.closest('[data-rm]');
  if (rm) { cart.splice(+rm.dataset.rm, 1); renderCart(); return; }
  const card = e.target.closest('[data-id]');
  if (card) openProduct(+card.dataset.id);
});
$('#searchForm').addEventListener('submit', (e) => { e.preventDefault(); search($('#q').value); });
$('#askForm').addEventListener('submit', (e) => { e.preventDefault(); const v = $('#askInput').value.trim(); if (v) { $('#askInput').value = ''; ask(v); } });
$('#ideas').innerHTML = IDEAS.map((i) => `<button type="button">${esc(i)}</button>`).join('');
$('#ideas').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { $('#q').value = b.textContent; search(b.textContent); } });
$('#cartBtn').addEventListener('click', openCart);
$('#closeCart').addEventListener('click', closeCart);
$('#scrim').addEventListener('click', closeCart);
$('#closeModal').addEventListener('click', closeModal);
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!$('#modal').hidden) closeModal(); else if (!$('#cart').hidden) closeCart(); } });

cards(P.slice(0, 8).map((p) => ({ p, s: 0 })), false);
renderCart();
say('Hi! I\'m the ShopMind assistant. Tell me what you need, e.g. "a gift for my dad who loves coffee, under $50".');
initAI().then(renderCart);
