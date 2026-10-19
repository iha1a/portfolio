'use strict';

// Products are drawn as SVG (lipstick, bottle, palette, brush) in their own shade colours.
const PRODUCTS = [
  { id: 'l1', cat: 'lips', name: 'Velvet Matte Lipstick', price: 18, rating: 4.8, kind: 'lip', shades: ['#9c2f48', '#c74a66', '#b5655a', '#7a2b3a'] },
  { id: 'l2', cat: 'lips', name: 'Glass Shine Gloss', price: 14, rating: 4.6, kind: 'gloss', shades: ['#e49a8f', '#d77a87', '#f2b5a6'] },
  { id: 'f1', cat: 'face', name: 'Skin Tint Foundation', price: 29, rating: 4.7, kind: 'bottle', shades: ['#f3d2bd', '#e2b294', '#c98e6b', '#9a6545', '#6b4430'] },
  { id: 'f2', cat: 'face', name: 'Soft Blur Concealer', price: 19, rating: 4.5, kind: 'bottle', shades: ['#f1d4c2', '#d8a988', '#b07a58', '#7d5038'] },
  { id: 'f3', cat: 'face', name: 'Cream Blush Stick', price: 21, rating: 4.9, kind: 'lip', shades: ['#e27d78', '#d06a7a', '#c97b5a'] },
  { id: 'e1', cat: 'eyes', name: 'Nude Dreams Palette', price: 34, rating: 4.8, kind: 'palette', shades: ['#e8c3a8', '#c58c6d', '#8d5a46', '#4f3128', '#d4a373', '#a86a5a'] },
  { id: 'e2', cat: 'eyes', name: 'Lift & Curl Mascara', price: 16, rating: 4.4, kind: 'bottle', shades: ['#1b1416', '#3b2a22'] },
  { id: 't1', cat: 'tools', name: 'Blending Brush Duo', price: 22, rating: 4.7, kind: 'brush', shades: ['#c9a15b', '#26181a'] },
];
const CATS = [['all', 'All'], ['face', 'Face'], ['lips', 'Lips'], ['eyes', 'Eyes'], ['tools', 'Tools']];
const FOUNDATION = {
  // tone -> undertone -> [shade name, hex]
  fair: { cool: ['110C Porcelain', '#f6dccb'], neutral: ['120N Ivory', '#f3d2bd'], warm: ['130W Vanilla', '#f2cfae'] },
  light: { cool: ['210C Rose Beige', '#e9bfa6'], neutral: ['220N Sand', '#e2b294'], warm: ['230W Honey', '#e1ad84'] },
  medium: { cool: ['310C Almond', '#c98e74'], neutral: ['320N Caramel', '#c98e6b'], warm: ['330W Golden', '#c8905a'] },
  deep: { cool: ['410C Mocha', '#8d5b4a'], neutral: ['420N Chestnut', '#9a6545'], warm: ['430W Amber', '#9b6a3e'] },
  rich: { cool: ['510C Espresso', '#5e3a31'], neutral: ['520N Cocoa', '#6b4430'], warm: ['530W Bronze', '#704a2a'] },
};
const TYPE_TIP = { dry: 'Prep with a hydrating primer and use the Skin Tint for a dewy finish.', oily: 'Set the T-zone with loose powder; the Soft Blur Concealer stays matte all day.', combo: 'Use primer on the T-zone only and build coverage where you need it.' };
const LOOKS = [
  { name: 'Everyday Fresh', desc: 'Skin tint, cream blush and gloss.', ids: ['f1', 'f3', 'l2'], bg: 'linear-gradient(140deg,#d99b88,#b5655a)' },
  { name: 'Evening Glam', desc: 'Matte red lip and a warm smoky eye.', ids: ['l1', 'e1', 'e2'], bg: 'linear-gradient(140deg,#7a2b3a,#26181a)' },
  { name: 'Soft Nude', desc: 'Concealer, nude palette and blending brush.', ids: ['f2', 'e1', 't1'], bg: 'linear-gradient(140deg,#c58c6d,#8d5a46)' },
];

const $ = (s) => document.querySelector(s);
let cat = 'all';
const shadeOf = {};
let wish = [];
try { wish = JSON.parse(localStorage.getItem('glow_wish') || '[]'); } catch { wish = []; }
const saveWish = () => { try { localStorage.setItem('glow_wish', JSON.stringify(wish)); } catch {} };

function art(p, color, size = 150) {
  const c = color || p.shades[0];
  const shapes = {
    lip: `<rect x="62" y="80" width="36" height="62" rx="4" fill="#c9a15b"/><rect x="66" y="74" width="28" height="10" fill="#a8843f"/><path d="M68 74 V44 Q68 30 92 26 V74Z" fill="${c}"/>`,
    gloss: `<rect x="66" y="58" width="28" height="84" rx="10" fill="${c}" opacity=".85"/><rect x="70" y="30" width="20" height="30" rx="4" fill="#26181a"/><rect x="72" y="70" width="6" height="56" rx="3" fill="#fff" opacity=".45"/>`,
    bottle: `<rect x="56" y="62" width="48" height="80" rx="10" fill="${c}"/><rect x="68" y="40" width="24" height="24" rx="3" fill="#26181a"/><rect x="62" y="96" width="36" height="14" rx="2" fill="#fff" opacity=".55"/>`,
    palette: `<rect x="34" y="46" width="92" height="70" rx="8" fill="#26181a"/>${p.shades.map((s, i) => `<circle cx="${52 + (i % 3) * 28}" cy="${68 + Math.floor(i / 3) * 28}" r="11" fill="${s}"/>`).join('')}`,
    brush: `<path d="M50 140 L96 60" stroke="#26181a" stroke-width="8" stroke-linecap="round"/><path d="M92 66 L104 46" stroke="#c9a15b" stroke-width="10"/><ellipse cx="110" cy="34" rx="12" ry="18" fill="#e8c3a8" transform="rotate(30 110 34)"/><path d="M80 146 L118 76" stroke="#26181a" stroke-width="7" stroke-linecap="round"/><ellipse cx="128" cy="62" rx="9" ry="15" fill="#c58c6d" transform="rotate(30 128 62)"/>`,
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 160 160" aria-hidden="true">${shapes[p.kind]}</svg>`;
}

function renderTabs() {
  $('#tabs').innerHTML = CATS.map(([k, l]) => `<button class="tab" role="tab" type="button" data-cat="${k}" aria-selected="${k === cat}">${l}</button>`).join('');
}
function renderGrid() {
  $('#grid').innerHTML = PRODUCTS.filter((p) => cat === 'all' || p.cat === cat).map((p) => {
    const sel = shadeOf[p.id] ?? 0;
    const fav = wish.includes(p.id);
    return `<article class="prod">
      <div class="prod-img">${art(p, p.shades[sel])}
        <button class="heart" type="button" data-wish="${p.id}" aria-pressed="${fav}" aria-label="${fav ? 'Remove from' : 'Save to'} wishlist: ${p.name}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg></button></div>
      <div class="prod-body">
        <small>${p.cat}</small><h3>${p.name}</h3>
        <div class="shades" role="group" aria-label="Shades">${p.shades.map((s, i) => `<button class="shade" type="button" style="background:${s}" data-p="${p.id}" data-i="${i}" aria-pressed="${i === sel}" aria-label="Shade ${i + 1}"></button>`).join('')}</div>
        <div class="prod-foot"><span class="price">$${p.price}</span><span class="stars" aria-label="Rated ${p.rating} out of 5">★ ${p.rating}</span></div>
      </div></article>`;
  }).join('');
}
function renderWish() {
  $('#wishCount').textContent = wish.length;
  $('#wishEmpty').hidden = wish.length > 0;
  $('#wishList').innerHTML = wish.map((id) => {
    const p = PRODUCTS.find((x) => x.id === id);
    return `<li><span class="mini">${art(p, null, 44)}</span><span><b>${p.name}</b><br><small class="muted">$${p.price}</small></span><button type="button" data-unwish="${id}">Remove</button></li>`;
  }).join('');
}
function toggleWish(id) {
  wish = wish.includes(id) ? wish.filter((x) => x !== id) : [...wish, id];
  saveWish(); renderGrid(); renderWish();
}

function radios(id, name, items) {
  $(id).innerHTML = items.map(([v, label, color]) =>
    `<label class="opt"><input type="radio" name="${name}" value="${v}"><span>${color ? `<i style="background:${color}"></i>` : ''}${label}</span></label>`).join('');
}
radios('#tone', 'tone', [['fair', 'Fair', '#f6dccb'], ['light', 'Light', '#e2b294'], ['medium', 'Medium', '#c98e6b'], ['deep', 'Deep', '#9a6545'], ['rich', 'Rich', '#6b4430']]);
radios('#under', 'under', [['cool', 'Cool (blue veins)'], ['neutral', 'Neutral (both)'], ['warm', 'Warm (green veins)']]);
radios('#type', 'type', [['dry', 'Dry'], ['oily', 'Oily'], ['combo', 'Combination']]);

let lastFocus;
$('#quiz').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const tone = f.get('tone'), under = f.get('under'), type = f.get('type');
  if (!tone || !under || !type) { $('#result').innerHTML = '<p class="err">Please answer all three questions.</p>'; return; }
  const [name, hex] = FOUNDATION[tone][under];
  $('#result').innerHTML = `<div class="match"><span class="dot" style="background:${hex}"></span><div><h3>Your match: ${name}</h3><p>Skin Tint Foundation · ${TYPE_TIP[type]}</p></div></div>`;
});
$('#tabs').addEventListener('click', (e) => { const t = e.target.closest('[data-cat]'); if (t) { cat = t.dataset.cat; renderTabs(); renderGrid(); } });
$('#tabs').addEventListener('keydown', (e) => {
  if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  const i = CATS.findIndex(([k]) => k === cat) + (e.key === 'ArrowRight' ? 1 : -1);
  cat = CATS[(i + CATS.length) % CATS.length][0]; renderTabs(); renderGrid();
  $(`[data-cat="${cat}"]`).focus();
});
$('#grid').addEventListener('click', (e) => {
  const s = e.target.closest('.shade');
  if (s) { shadeOf[s.dataset.p] = +s.dataset.i; renderGrid(); return; }
  const h = e.target.closest('[data-wish]'); if (h) toggleWish(h.dataset.wish);
});
$('#wishList').addEventListener('click', (e) => { const b = e.target.closest('[data-unwish]'); if (b) toggleWish(b.dataset.unwish); });
const openWish = () => { lastFocus = document.activeElement; $('#wish').hidden = false; $('#scrim').hidden = false; $('#closeWish').focus(); };
const closeWish = () => { $('#wish').hidden = true; $('#scrim').hidden = true; lastFocus && lastFocus.focus(); };
$('#wishBtn').addEventListener('click', openWish);
$('#closeWish').addEventListener('click', closeWish);
$('#scrim').addEventListener('click', closeWish);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#wish').hidden) closeWish(); });

$('#lookGrid').innerHTML = LOOKS.map((l, i) => `<div class="look" style="background:${l.bg}"><h3>${l.name}</h3><p>${l.desc}</p><button type="button" data-look="${i}">Save the look</button></div>`).join('');
$('#lookGrid').addEventListener('click', (e) => {
  const b = e.target.closest('[data-look]'); if (!b) return;
  LOOKS[+b.dataset.look].ids.forEach((id) => { if (!wish.includes(id)) wish.push(id); });
  saveWish(); renderGrid(); renderWish(); b.textContent = 'Saved to wishlist';
});

renderTabs(); renderGrid(); renderWish();
