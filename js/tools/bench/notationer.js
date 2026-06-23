// RedKit · bench/notationer.js
// ===== NOTATIONER (code naming-convention converter) =====
TOOLS['notationer'] = {
  title: 'Notationer',
  desc: 'Convert identifiers between camelCase, snake_case, kebab-case, and more.',
  render() {
    return `
      <div class="tool">
        ${card('Input', field('One identifier or phrase per line', `<textarea id="not-in" placeholder="userProfileId\nmax retry count\nHTTP-Response-Code"></textarea>`))}
        <div id="not-out"></div>
      </div>
    `;
  },
  init() {
    const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
    const up = s => s.toUpperCase();
    const toWords = s => s
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .replace(/[_\-.\/\\\s]+/g, ' ')
      .trim().toLowerCase().split(/\s+/).filter(Boolean);
    const FORMATS = [
      ['camelCase',            w => w.map((x, i) => i ? cap(x) : x).join('')],
      ['PascalCase',           w => w.map(cap).join('')],
      ['snake_case',           w => w.join('_')],
      ['SCREAMING_SNAKE_CASE', w => w.map(up).join('_')],
      ['kebab-case',           w => w.join('-')],
      ['Train-Case',           w => w.map(cap).join('-')],
      ['dot.case',             w => w.join('.')],
      ['path/case',            w => w.join('/')],
      ['Title Case',           w => w.map(cap).join(' ')],
      ['Sentence case',        w => w.length ? cap(w[0]) + (w.length > 1 ? ' ' + w.slice(1).join(' ') : '') : ''],
      ['lower case',           w => w.join(' ')],
      ['UPPER CASE',           w => w.map(up).join(' ')],
      ['nospacelower',         w => w.join('')],
      ['NOSPACEUPPER',         w => w.map(up).join('')],
    ];
    const out = $('#not-out');
    let cur = 0;
    const render = () => {
      const lines = $('#not-in').value.split('\n').map(l => l.trim()).filter(Boolean);
      if (!lines.length) { out.innerHTML = ''; return; }
      const words = lines.map(toWords);
      out.innerHTML = `
        <div class="card">
          <div class="not-formats">${FORMATS.map(([name], i) => `<button class="not-fmt" data-i="${i}">${escapeHtml(name)}</button>`).join('')}</div>
          <div class="result-header"><h4 class="not-fmt-title"></h4><button class="btn btn-ghost" id="not-copy">Copy</button></div>
          <pre class="not-pre mono" id="not-result"></pre>
        </div>`;
      const show = (i) => {
        cur = i;
        const [name, fn] = FORMATS[i];
        const conv = words.map(fn);
        $('#not-result', out).textContent = conv.join('\n');
        $('.not-fmt-title', out).textContent = name;
        $$('.not-fmt', out).forEach((b, j) => b.classList.toggle('active', j === i));
      };
      $$('.not-fmt', out).forEach(b => b.addEventListener('click', () => show(+b.dataset.i)));
      $('#not-copy', out).addEventListener('click', () => copy($('#not-result', out).textContent));
      show(Math.min(cur, FORMATS.length - 1));
    };
    $('#not-in').addEventListener('input', render);
    render();
  }
};
