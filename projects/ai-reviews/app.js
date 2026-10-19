import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2';

env.allowLocalModels = false; // always fetch the model from the Hugging Face hub (then browser-cached)

const $ = (s) => document.querySelector(s);
const SAMPLE = [
  'The Velvet Matte lipstick lasts all day and the colour is gorgeous. Packaging feels a bit cheap though.',
  'Shade finder matched me perfectly, the foundation looks like real skin.',
  'Delivery took almost two weeks and nobody answered my emails.',
  'Love the palette! The shades blend so easily. Worth every penny.',
  'The mascara smudged by lunchtime, really disappointed.',
  'Great texture, very light and not sticky at all.',
  'Too expensive for such a small tube.',
  'The concealer covers my dark circles completely and stays put for hours.',
  'My order arrived quickly and beautifully wrapped. Customer service was so kind.',
  'The gloss is nice but the smell is too strong for me.',
  'Brush sheds a lot after a few washes.',
  'Perfect shade match, I get compliments every day.',
];
const ASPECTS = {
  Shade: ['shade', 'colour', 'color', 'match', 'tone', 'pigment'],
  Texture: ['texture', 'blend', 'sticky', 'light', 'creamy', 'smooth', 'dry', 'smudg'],
  Longevity: ['last', 'all day', 'hours', 'stays', 'wear', 'fade', 'lunchtime'],
  Packaging: ['packag', 'tube', 'box', 'wrapped', 'bottle', 'cap'],
  Price: ['price', 'expensive', 'cheap', 'penny', 'worth', 'value', 'cost'],
  Delivery: ['deliver', 'arriv', 'shipping', 'order', 'weeks', 'days'],
  Service: ['service', 'support', 'email', 'answer', 'kind', 'staff'],
  Quality: ['quality', 'shed', 'broke', 'smell', 'scent', 'irritat'],
};

let classifier = null;
const status = (t) => ($('#status').textContent = t);

async function load() {
  if (classifier) return classifier;
  const files = {};
  classifier = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english', {
    progress_callback: (p) => {
      if (p.status === 'progress' && p.total) {
        files[p.file] = [p.loaded, p.total];
        const [l, t] = Object.values(files).reduce(([a, b], [x, y]) => [a + x, b + y], [0, 0]);
        $('#prog').style.width = Math.round(l / t * 100) + '%';
        status(`Downloading model… ${(l / 1e6).toFixed(1)} / ${(t / 1e6).toFixed(1)} MB`);
      }
    },
  });
  $('#prog').style.width = '100%';
  return classifier;
}

const sentences = (text) => text.split('\n').map((l) => l.trim()).filter(Boolean)
  .flatMap((r) => r.match(/[^.!?]+[.!?]*/g).map((s) => s.trim()).filter((s) => s.length > 2));
const tagsOf = (s) => Object.entries(ASPECTS).filter(([, kw]) => kw.some((k) => s.toLowerCase().includes(k))).map(([a]) => a);
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function analyse() {
  const text = $('#reviews').value.trim();
  if (!text) { status('Paste some reviews first, or load the sample.'); return; }
  $('#go').disabled = true;
  try {
    const clf = await load();
    const list = sentences(text);
    status(`Analysing ${list.length} sentences on your device…`);
    const t0 = performance.now();
    const out = await clf(list);
    const ms = performance.now() - t0;
    // Signed score: +confidence for positive, −confidence for negative.
    const rows = list.map((s, i) => ({ s, pos: out[i].label === 'POSITIVE', conf: out[i].score, v: (out[i].label === 'POSITIVE' ? 1 : -1) * out[i].score, tags: tagsOf(s) }));
    render(rows, text.split('\n').filter((l) => l.trim()).length, ms);
    status(`Done: ${list.length} sentences in ${Math.round(ms)} ms, nothing left your device.`);
  } catch (e) {
    status('The model could not be loaded. Check your connection and try again.');
  } finally {
    $('#go').disabled = false;
  }
}

function render(rows, reviewCount, ms) {
  const pos = rows.filter((r) => r.pos).length;
  const pct = Math.round(pos / rows.length * 100);
  const aspects = Object.keys(ASPECTS).map((a) => {
    const rs = rows.filter((r) => r.tags.includes(a));
    return { a, n: rs.length, score: rs.length ? Math.round(rs.reduce((x, r) => x + r.v, 0) / rs.length * 100) : null };
  }).filter((x) => x.n).sort((x, y) => y.score - x.score);
  const issues = rows.filter((r) => !r.pos).sort((a, b) => b.conf - a.conf);
  const praise = rows.filter((r) => r.pos).sort((a, b) => b.conf - a.conf).slice(0, 4);
  const item = (r) => `<li><span class="pill ${r.pos ? 'pos' : 'neg'}">${r.pos ? '+' : '−'}${Math.round(r.conf * 100)}%</span><div>${esc(r.s)}${r.tags.length ? `<div class="tags">${r.tags.map((t) => `<span>${t}</span>`).join('')}</div>` : ''}</div></li>`;
  $('#results').innerHTML = `
    <div class="kpis">
      <div class="kpi"><b>${pct}%</b><span>positive sentences</span></div>
      <div class="kpi"><b>${reviewCount}</b><span>reviews · ${rows.length} sentences</span></div>
      <div class="kpi"><b>${Math.round(ms / rows.length)} ms</b><span>per sentence, on device</span></div>
    </div>
    <div class="split" role="img" aria-label="${pct}% positive, ${100 - pct}% negative"><i style="width:${pct}%;background:var(--pos)"></i><i style="width:${100 - pct}%;background:var(--neg)"></i></div>
    <h2>Sentiment by topic</h2>
    <div class="aspects">${aspects.map((x) => `<div class="aspect"><span>${x.a} <small class="status">(${x.n})</small></span>
      <div class="track" role="img" aria-label="${x.a}: ${x.score}"><span class="fill" style="${x.score >= 0 ? `left:50%;width:${x.score / 2}%` : `right:50%;width:${-x.score / 2}%`};background:${x.score >= 0 ? 'var(--pos)' : 'var(--neg)'}"></span></div>
      <span class="score">${x.score > 0 ? '+' : ''}${x.score}</span></div>`).join('')}</div>
    <h2 style="margin-top:22px">What to fix first</h2>
    <ul class="list">${issues.length ? issues.map(item).join('') : '<li class="empty">No complaints found.</li>'}</ul>
    <h2 style="margin-top:22px">What customers love</h2>
    <ul class="list">${praise.map(item).join('')}</ul>`;
}

$('#sample').addEventListener('click', () => { $('#reviews').value = SAMPLE.join('\n'); });
$('#go').addEventListener('click', analyse);
$('#reviews').value = SAMPLE.join('\n');
