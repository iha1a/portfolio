'use strict';

const $ = (s) => document.querySelector(s);
const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

// ---------- tabs (arrow keys move between them, per the ARIA tabs pattern) ----------
const tabs = [...document.querySelectorAll('[role="tab"]')];
function select(tab) {
  tabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
  });
  tab.focus();
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => select(t));
  t.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') select(tabs[(i + 1) % tabs.length]);
    if (e.key === 'ArrowLeft') select(tabs[(i - 1 + tabs.length) % tabs.length]);
  });
});

// ---------- password audit ----------
const COMMON = ['123456', 'password', '123456789', '12345678', '12345', 'qwerty', 'abc123', 'password1', '111111', '123123', 'admin', 'letmein', 'welcome', 'monkey', 'dragon', 'iloveyou', 'sunshine', 'princess', 'football', 'master', 'qwerty123', '1q2w3e4r', 'superman', 'trustno1', 'baseball', 'shadow', 'azerty', '000000', 'passw0rd', 'hello123'];
const KEYBOARD = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890', 'qazwsx'];
const LEET = { '0': 'o', '1': 'l', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's' };
const WORDS = ['apple', 'river', 'cloud', 'tiger', 'lemon', 'orbit', 'maple', 'pixel', 'coral', 'storm', 'amber', 'cedar', 'delta', 'ember', 'frost', 'grape', 'honey', 'ivory', 'jolly', 'koala', 'lunar', 'mango', 'noble', 'ocean', 'piano', 'quartz', 'raven', 'solar', 'tulip', 'umbra', 'velvet', 'willow', 'yarrow', 'zebra', 'canyon', 'falcon', 'meadow', 'nectar', 'olive', 'pepper'];

function analyse(pw) {
  const f = [];
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/\d/.test(pw)) pool += 10;
  if (/[^A-Za-z0-9]/.test(pw)) pool += 33;
  let bits = pw.length * Math.log2(pool || 1);
  const lower = pw.toLowerCase();
  const unleet = lower.replace(/[013457@$]/g, (c) => LEET[c]);

  if (COMMON.includes(lower) || COMMON.includes(unleet)) { f.push(['bad', 'This is one of the most common passwords; attackers try it first.']); bits = Math.min(bits, 4); }
  else {
    // A common password with a few characters added ("Password123!") is still cracked within seconds by rule-based attacks.
    const base = COMMON.filter((c) => c.length >= 5 && /[a-z]/.test(c)).find((c) => unleet.includes(c));
    if (base) { f.push(['bad', `Built around the common password "${base}"; adding numbers or symbols barely helps.`]); bits = Math.min(bits, 22); }
  }
  if (pw.length < 8) f.push(['bad', 'Shorter than 8 characters.']);
  else if (pw.length < 12) f.push(['warn', 'Fine, but 12+ characters is much stronger.']);
  else f.push(['ok', `Good length (${pw.length} characters).`]);
  if (/(.)\1{2,}/.test(pw)) { f.push(['warn', 'Repeated characters (e.g. "aaa") are easy to guess.']); bits -= 8; }
  for (const row of KEYBOARD) for (let i = 0; i + 4 <= row.length; i++) {
    if (lower.includes(row.slice(i, i + 4))) { f.push(['warn', `Keyboard pattern "${row.slice(i, i + 4)}" detected.`]); bits -= 10; i = row.length; }
  }
  if (/(19|20)\d{2}/.test(pw)) { f.push(['warn', 'Looks like it contains a year; dates are guessable.']); bits -= 6; }
  if (/^[A-Z][a-z]+\d+[!@#$%^&*]?$/.test(pw)) { f.push(['warn', 'Classic "Word123!" shape, which cracking tools try early.']); bits -= 10; }
  if (unleet !== lower && COMMON.some((c) => unleet.includes(c))) f.push(['warn', 'Letter swaps like 0→o or @→a don\'t fool cracking tools.']);
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  f.push([kinds >= 3 ? 'ok' : 'warn', `Uses ${kinds} of 4 character types.`]);
  bits = Math.max(0, bits);
  return { bits, pool, f };
}
function crackTime(bits) {
  const sec = 2 ** bits / 2 / 1e10;
  const units = [['century', 3.15e9], ['year', 3.15e7], ['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]];
  if (sec < 1) return 'instantly';
  for (const [u, s] of units) if (sec >= s) {
    const n = sec / s;
    if (n > 1e6) return 'longer than the universe exists';
    return `${n < 10 ? n.toFixed(1) : Math.round(n).toLocaleString()} ${u === 'century' ? (n >= 2 ? 'centuries' : 'century') : u + (n >= 2 ? 's' : '')}`;
  }
}
function renderPw() {
  const pw = $('#pw').value;
  $('#breach').disabled = !pw;
  $('#breachOut').textContent = '';
  if (!pw) { $('#bar').style.width = '0'; $('#verdict').textContent = 'Start typing to see the analysis.'; $('#findings').innerHTML = '<li class="muted">No password yet.</li>'; ['#ent', '#crack', '#pool'].forEach((s) => ($(s).textContent = '—')); return; }
  const { bits, pool, f } = analyse(pw);
  const levels = [[28, 'Very weak', 'var(--bad)'], [40, 'Weak', 'var(--bad)'], [60, 'Fair', 'var(--warn)'], [80, 'Strong', 'var(--accent)'], [Infinity, 'Very strong', 'var(--accent)']];
  const [, label, color] = levels.find(([max]) => bits < max);
  $('#bar').style.width = Math.min(100, bits / 100 * 100) + '%';
  $('#bar').style.background = color;
  $('#verdict').textContent = label;
  $('#verdict').style.color = color;
  $('#ent').textContent = bits.toFixed(0) + ' bits';
  $('#crack').textContent = crackTime(bits);
  $('#pool').textContent = pool;
  $('#findings').innerHTML = f.map(([k, t]) => `<li class="${k}">${t}</li>`).join('');
}
$('#pw').addEventListener('input', renderPw);
$('#show').addEventListener('click', (e) => {
  const showing = $('#pw').type === 'text';
  $('#pw').type = showing ? 'password' : 'text';
  e.target.textContent = showing ? 'Show' : 'Hide';
  e.target.setAttribute('aria-pressed', !showing);
});

// Breach check with k-anonymity: only the first 5 hex chars of the SHA-1 hash leave the device.
$('#breach').addEventListener('click', async () => {
  const out = $('#breachOut');
  out.style.color = '';
  out.textContent = 'Checking…';
  try {
    const h = hex(await crypto.subtle.digest('SHA-1', enc.encode($('#pw').value))).toUpperCase();
    const prefix = h.slice(0, 5), suffix = h.slice(5);
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, { headers: { 'Add-Padding': 'true' } });
    if (!res.ok) throw new Error(res.status);
    const line = (await res.text()).split('\n').find((l) => l.startsWith(suffix));
    const count = line ? +line.split(':')[1] : 0;
    if (count > 0) { out.style.color = 'var(--bad)'; out.textContent = `Found in ${count.toLocaleString()} leaked passwords. Do not use it. (Sent only "${prefix}…")`; }
    else { out.style.color = 'var(--accent)'; out.textContent = `Not found in known breaches. (Sent only the prefix "${prefix}", never the password.)`; }
  } catch {
    out.textContent = 'Could not reach the breach database. Check your connection.';
  }
});

function passphrase() {
  const r = crypto.getRandomValues(new Uint32Array(5));
  const words = [...r.slice(0, 4)].map((n) => WORDS[n % WORDS.length]);
  words[r[4] % 4] = words[r[4] % 4][0].toUpperCase() + words[r[4] % 4].slice(1);
  return words.join('-') + '-' + (r[4] % 90 + 10);
}
$('#regen').addEventListener('click', () => ($('#gen').textContent = passphrase()));
$('#gen').textContent = passphrase();

// ---------- phishing URL analyser ----------
const SUS_TLDS = ['top', 'xyz', 'tk', 'ml', 'ga', 'cf', 'gq', 'zip', 'mov', 'click', 'country', 'work', 'support'];
const SHORTENERS = ['bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'is.gd', 'ow.ly', 'cutt.ly', 'rb.gy'];
const BRANDS = ['paypal', 'apple', 'google', 'microsoft', 'amazon', 'facebook', 'instagram', 'netflix', 'bank', 'whatsapp', 'outlook'];
const LURES = ['login', 'verify', 'secure', 'account', 'update', 'confirm', 'password', 'wallet', 'suspend', 'unlock'];

function scanUrl(raw) {
  const hits = [];
  let u;
  try { u = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : 'http://' + raw); } catch { return { error: 'That is not a valid link.' }; }
  const host = u.hostname.toLowerCase();
  const parts = host.split('.');
  const tld = parts[parts.length - 1];
  const sld = parts.slice(-2).join('.');
  const add = (w, t) => hits.push([w, t]);
  if (u.protocol !== 'https:') add(15, 'Not using HTTPS, so traffic can be read or altered.');
  if (u.username || raw.includes('@')) add(30, 'Contains "@": everything before it is ignored, a classic way to disguise the real site.');
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) add(25, 'Uses a raw IP address instead of a domain name.');
  if (host.startsWith('xn--') || host.includes('.xn--')) add(25, 'Punycode domain: may imitate another site with look-alike letters.');
  if (SUS_TLDS.includes(tld)) add(15, `".${tld}" is a top-level domain often abused for phishing.`);
  if (SHORTENERS.includes(sld)) add(15, 'Link shortener hides the real destination.');
  if (parts.length > 4) add(10, `Many subdomains (${parts.length - 2}), often used to bury the real domain.`);
  if ((host.match(/-/g) || []).length >= 2) add(10, 'Several hyphens in the domain.');
  const unleet = host.replace(/[0134]/g, (c) => ({ 0: 'o', 1: 'l', 3: 'e', 4: 'a' }[c]));
  for (const b of BRANDS) {
    const inHost = unleet.includes(b);
    const isReal = sld.startsWith(b + '.');
    if (inHost && !isReal) { add(30, `Mentions "${b}" but the real domain is "${sld}".`); break; }
  }
  const lure = LURES.filter((w) => (host + u.pathname).toLowerCase().includes(w));
  if (lure.length) add(Math.min(20, lure.length * 8), `Pressure words: ${lure.join(', ')}.`);
  if (raw.length > 90) add(5, 'Unusually long link.');
  const score = Math.min(100, hits.reduce((a, [w]) => a + w, 0));
  return { u, host, sld, hits, score };
}
function renderUrl() {
  const raw = $('#url').value.trim();
  if (!raw) return;
  const r = scanUrl(raw);
  if (r.error) { $('#urlOut').innerHTML = `<p class="note" style="color:var(--bad)">${r.error}</p>`; return; }
  const [label, color, advice] = r.score >= 50 ? ['Likely phishing', 'var(--bad)', 'Do not open it or enter any details.']
    : r.score >= 20 ? ['Suspicious', 'var(--warn)', 'Check the sender and type the address yourself instead.']
      : ['Looks safe', 'var(--accent)', 'No common warning signs found. Stay careful with what you enter.'];
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  $('#urlOut').innerHTML = `<div class="score"><div class="ring" style="--p:${r.score};--c:${color}"><b>${r.score}</b></div>
    <div><h3 style="color:${color}">${label}</h3><p>${advice}</p></div></div>
    <p class="parts">Real domain: <b>${esc(r.sld)}</b> · host: ${esc(r.host)} · protocol: ${r.u.protocol.replace(':', '')}</p>
    <ul class="findings">${r.hits.length ? r.hits.map(([w, t]) => `<li class="${w >= 25 ? 'bad' : 'warn'}">${esc(t)}</li>`).join('') : '<li class="ok">No red flags detected.</li>'}</ul>`;
}
$('#scan').addEventListener('click', renderUrl);
$('#url').addEventListener('keydown', (e) => { if (e.key === 'Enter') renderUrl(); });
document.querySelectorAll('[data-url]').forEach((b) => b.addEventListener('click', () => { $('#url').value = b.dataset.url; renderUrl(); }));

// ---------- AES-GCM encryption ----------
const b64 = (bytes) => btoa(String.fromCharCode(...bytes));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function deriveKey(pass, salt) {
  const base = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
const msg = (t, bad) => { $('#encMsg').textContent = t; $('#encMsg').style.color = bad ? 'var(--bad)' : 'var(--accent)'; };
$('#encBtn').addEventListener('click', async () => {
  const text = $('#plain').value, pass = $('#key').value;
  if (!text || !pass) return msg('Write a message and a passphrase first.', true);
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await deriveKey(pass, salt), enc.encode(text)));
  $('#cipher').value = b64(new Uint8Array([...salt, ...iv, ...data]));
  msg('Encrypted. Only someone with the passphrase can read it.');
});
$('#decBtn').addEventListener('click', async () => {
  const pass = $('#key').value;
  try {
    const all = unb64($('#cipher').value.trim());
    if (all.length < 29 || !pass) throw new Error();
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.slice(16, 28) }, await deriveKey(pass, all.slice(0, 16)), all.slice(28));
    $('#plain').value = new TextDecoder().decode(plain);
    msg('Decrypted and verified: the message was not altered.');
    updateSha();
  } catch { msg('Wrong passphrase, or the ciphertext was changed. Decryption refused.', true); }
});
async function updateSha() {
  const t = $('#plain').value;
  $('#sha').textContent = t ? hex(await crypto.subtle.digest('SHA-256', enc.encode(t))) : '—';
}
$('#plain').addEventListener('input', updateSha);
