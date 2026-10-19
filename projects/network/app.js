'use strict';

const $ = (s) => document.querySelector(s);
const DEFAULTS = [['Staff', 10, 60], ['Guest Wi-Fi', 20, 50], ['Servers', 30, 12], ['Management', 99, 6]];

// ---- IPv4 helpers (32-bit unsigned arithmetic) ----
function ipToInt(ip) {
  const p = ip.trim().split('.');
  if (p.length !== 4 || p.some((x) => !/^\d{1,3}$/.test(x) || +x > 255)) return null;
  return p.reduce((a, x) => a * 256 + +x, 0);
}
const intToIp = (n) => [24, 16, 8, 0].map((s) => Math.floor(n / 2 ** s) % 256).join('.');
const maskOf = (prefix) => (prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0);
function parseCidr(s) {
  const m = /^\s*([\d.]+)\s*\/\s*(\d{1,2})\s*$/.exec(s);
  if (!m || +m[2] > 32) return null;
  const ip = ipToInt(m[1]);
  return ip === null ? null : { ip, prefix: +m[2] };
}
function info(ip, prefix) {
  const size = 2 ** (32 - prefix);
  const net = Math.floor(ip / size) * size;
  const bc = net + size - 1;
  const usable = prefix >= 31 ? (prefix === 32 ? 1 : 2) : size - 2;
  return { net, bc, size, usable, first: prefix >= 31 ? net : net + 1, last: prefix >= 31 ? bc : bc - 1, mask: maskOf(prefix) >>> 0 };
}
// Smallest prefix whose usable host count covers the need.
function prefixFor(hosts) {
  for (let p = 30; p >= 1; p--) if (2 ** (32 - p) - 2 >= hosts) return p;
  return null;
}

// ---- segment rows ----
function addRow([name, vlan, hosts] = ['', '', '']) {
  const div = document.createElement('div');
  div.className = 'r';
  div.innerHTML = `<input aria-label="Segment name" value="${name}" placeholder="Name">
    <input aria-label="VLAN ID" type="number" min="2" max="4094" value="${vlan}" placeholder="VLAN">
    <input aria-label="Hosts needed" type="number" min="1" value="${hosts}" placeholder="Hosts">
    <button class="icon" type="button" aria-label="Remove segment">&times;</button>`;
  div.querySelector('button').addEventListener('click', () => { div.remove(); plan(); });
  $('#rows').appendChild(div);
}
DEFAULTS.forEach(addRow);
$('#add').addEventListener('click', () => { addRow(); $('#rows').lastElementChild.querySelector('input').focus(); });

let current = [];
function plan() {
  const msg = $('#planMsg');
  msg.classList.remove('err');
  const base = parseCidr($('#base').value);
  if (!base) { msg.textContent = 'Enter the block as address/prefix, e.g. 192.168.10.0/24.'; msg.classList.add('err'); return; }
  const block = info(base.ip, base.prefix);
  const segs = [...$('#rows').children].map((r) => {
    const [n, v, h] = r.querySelectorAll('input');
    return { name: n.value.trim() || 'Segment', vlan: +v.value, hosts: +h.value };
  }).filter((s) => s.hosts > 0);
  if (!segs.length) { msg.textContent = 'Add at least one segment.'; msg.classList.add('err'); return; }
  const vlans = segs.map((s) => s.vlan);
  if (vlans.some((v) => !v || v < 2 || v > 4094) || new Set(vlans).size !== vlans.length) {
    msg.textContent = 'Each segment needs its own VLAN ID between 2 and 4094.'; msg.classList.add('err'); return;
  }
  // Largest first keeps every subnet aligned on its own boundary without gaps.
  const sorted = [...segs].sort((a, b) => b.hosts - a.hosts);
  let cursor = block.net;
  const out = [];
  for (const s of sorted) {
    const p = prefixFor(s.hosts);
    if (!p || p < base.prefix) { msg.textContent = `"${s.name}" needs more addresses than the whole block.`; msg.classList.add('err'); return; }
    const size = 2 ** (32 - p);
    cursor = Math.ceil(cursor / size) * size;
    if (cursor + size - 1 > block.bc) { msg.textContent = `Not enough space: the block runs out at "${s.name}". Use a larger block.`; msg.classList.add('err'); return; }
    out.push({ ...s, prefix: p, ...info(cursor, p) });
    cursor += size;
  }
  current = out;
  const used = out.reduce((a, s) => a + s.size, 0);
  msg.textContent = `${out.length} subnets · ${used} of ${block.size} addresses allocated · ${block.size - used} spare for growth.`;
  $('#planOut').innerHTML = `<table><thead><tr><th>Segment</th><th>VLAN</th><th>Network</th><th>Mask</th><th>Gateway</th><th>Host range</th><th>Broadcast</th><th>Hosts needed / usable</th></tr></thead><tbody>
    ${out.map((s) => `<tr><td>${s.name}</td><td>${s.vlan}</td><td class="mono">${intToIp(s.net)}/${s.prefix}</td><td class="mono">${intToIp(s.mask)}</td>
      <td class="mono">${intToIp(s.first)}</td><td class="mono">${intToIp(s.first + 1)} – ${intToIp(s.last)}</td><td class="mono">${intToIp(s.bc)}</td>
      <td><div style="display:flex;gap:8px;align-items:center"><div class="use"><span style="width:${Math.round(s.hosts / s.usable * 100)}%"></span></div>${s.hosts} / ${s.usable}</div></td></tr>`).join('')}
  </tbody></table>`;
  config();
}

function config() {
  const guest = current.find((s) => /guest/i.test(s.name));
  const lines = [
    '! ===== Router R1 =====',
    'hostname R1',
    'service password-encryption',
    'ip domain-name clinic.local',
    'crypto key generate rsa modulus 2048',
    'ip ssh version 2',
    'line vty 0 4',
    ' transport input ssh',
    ' login local',
    ' exec-timeout 10 0',
    '!',
    'interface GigabitEthernet0/1',
    ' no shutdown',
    '!',
  ];
  for (const s of current) {
    lines.push(`interface GigabitEthernet0/1.${s.vlan}`,
      ` description ${s.name}`,
      ` encapsulation dot1Q ${s.vlan}`,
      ` ip address ${intToIp(s.first)} ${intToIp(s.mask)}`);
    if (guest && s === guest) lines.push(' ip access-group GUEST-IN in');
    lines.push('!');
  }
  for (const s of current) {
    lines.push(`ip dhcp excluded-address ${intToIp(s.first)}`,
      `ip dhcp pool ${s.name.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}`,
      ` network ${intToIp(s.net)} ${intToIp(s.mask)}`,
      ` default-router ${intToIp(s.first)}`,
      ' dns-server 1.1.1.1 8.8.8.8',
      '!');
  }
  if (guest) {
    lines.push('ip access-list extended GUEST-IN', ' remark Guests may reach the internet only');
    for (const s of current) if (s !== guest) lines.push(` deny ip ${intToIp(guest.net)} ${intToIp(~guest.mask >>> 0)} ${intToIp(s.net)} ${intToIp(~s.mask >>> 0)}`);
    lines.push(' permit ip any any', '!');
  }
  lines.push('', '! ===== Switch SW1 =====', 'hostname SW1');
  for (const s of current) lines.push(`vlan ${s.vlan}`, ` name ${s.name.replace(/\s+/g, '_')}`);
  lines.push('vlan 999', ' name BLACKHOLE', '!',
    'interface GigabitEthernet0/24',
    ' description Trunk to R1',
    ' switchport mode trunk',
    ' switchport trunk native vlan 999',
    ` switchport trunk allowed vlan ${current.map((s) => s.vlan).join(',')}`,
    '!',
    'ip dhcp snooping',
    `ip dhcp snooping vlan ${current.map((s) => s.vlan).join(',')}`,
    'interface GigabitEthernet0/24',
    ' ip dhcp snooping trust',
    '!',
    'interface range GigabitEthernet0/20 - 23',
    ' description Unused',
    ' switchport access vlan 999',
    ' shutdown');
  $('#cfg').textContent = lines.join('\n');
}

$('#planForm').addEventListener('submit', (e) => { e.preventDefault(); plan(); });
$('#copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#cfg').textContent); $('#copyMsg').textContent = 'Copied.'; }
  catch { $('#copyMsg').textContent = 'Select the text and copy it manually.'; }
});

function calcOne() {
  const c = parseCidr($('#one').value);
  if (!c) { $('#oneOut').innerHTML = '<dt>Error</dt><dd>Use address/prefix, e.g. 10.0.0.5/24</dd>'; return; }
  const i = info(c.ip, c.prefix);
  const cls = c.ip < 2 ** 31 ? 'A' : c.ip < 3 * 2 ** 30 ? 'B' : c.ip < 7 * 2 ** 29 ? 'C' : 'D/E';
  const priv = (c.ip >= ipToInt('10.0.0.0') && c.ip <= ipToInt('10.255.255.255')) || (c.ip >= ipToInt('172.16.0.0') && c.ip <= ipToInt('172.31.255.255')) || (c.ip >= ipToInt('192.168.0.0') && c.ip <= ipToInt('192.168.255.255'));
  const rows = [['Network', `${intToIp(i.net)}/${c.prefix}`], ['Subnet mask', intToIp(i.mask)], ['Wildcard', intToIp(~i.mask >>> 0)],
    ['First host', intToIp(i.first)], ['Last host', intToIp(i.last)], ['Broadcast', intToIp(i.bc)], ['Usable hosts', i.usable.toLocaleString()],
    ['Class / scope', `${cls} · ${priv ? 'private (RFC 1918)' : 'public'}`],
    ['Mask in binary', i.mask.toString(2).padStart(32, '0').match(/.{8}/g).join('.')]];
  $('#oneOut').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
}
$('#one').addEventListener('input', calcOne);

plan(); calcOne();
