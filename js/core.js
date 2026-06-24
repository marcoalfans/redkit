/* ============================================================
   RedKit - Pentest & Red Team Toolkit
   ============================================================ */

// ===== Helpers =====
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const el = (tag, attrs = {}, children = []) => {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  });
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (c == null) return;
    e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return e;
};

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, m => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[m]));

const toast = (msg) => {
  let t = $('#toast');
  if (!t) { t = el('div', { id: 'toast', class: 'toast' }); document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 1800);
};

const copy = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied to clipboard');
  } catch {
    toast('Copy failed');
  }
};

const download = (filename, content, mime = 'text/plain') => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// ============================================================
// UI BUILDERS, shared markup helpers used by every tool.
// See js/tools/_template.js for how to use them in a new tool.
// ============================================================

// <div class="card"[ id][ style]> [<div class="card-title">title</div>] inner </div>
// opts: { id, hidden (→ display:none), cls (extra classes), style }
const card = (title, inner = '', opts = {}) => {
  const cls = 'card' + (opts.cls ? ' ' + opts.cls : '');
  const idA = opts.id ? ` id="${opts.id}"` : '';
  const styleA = opts.hidden ? ' style="display:none"' : (opts.style ? ` style="${opts.style}"` : '');
  const head = title ? `<div class="card-title">${title}</div>` : '';
  return `<div class="${cls}"${idA}${styleA}>${head}${inner}</div>`;
};

// <div class="field"> [<label>label</label>] inner </div>
const field = (label, inner) => `<div class="field">${label ? `<label>${label}</label>` : ''}${inner}</div>`;

// a ghost button (default text "Copy")
const ghostBtn = (id, label = 'Copy') => `<button class="btn btn-ghost" id="${id}">${label}</button>`;

// <div class="result-header"><h4>title</h4> buttons </div>
const resultHead = (title, buttons = '') => `<div class="result-header"><h4>${title}</h4>${buttons}</div>`;

// wire a copy button to a value or a function returning text
const wireCopy = (btnId, getText) => { const b = $('#' + btnId); if (b) b.addEventListener('click', () => copy(typeof getText === 'function' ? getText() : getText)); };

// run `fn` on click of #btnId and (optionally) Enter inside #inputId
const wireRun = (btnId, fn, inputId) => {
  const b = $('#' + btnId); if (b) b.addEventListener('click', fn);
  if (inputId) { const i = $('#' + inputId); if (i) i.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); fn(); } }); }
};

// tab strip: toggles .active on the .not-fmt buttons in `container`, calls onSelect(value, btn)
const wireTabs = (container, attr, onSelect) => {
  const btns = $$('.not-fmt', container);
  btns.forEach(b => b.addEventListener('click', () => {
    btns.forEach(x => x.classList.toggle('active', x === b));
    onSelect(b.dataset[attr], b);
  }));
};

// copy-button delegation: data-copy holds the literal text; data-cp holds an element id to read
const wireCopyAll = (root) => $$('[data-copy]', root || document).forEach(b => b.addEventListener('click', () => copy(b.getAttribute('data-copy'))));
const wireCopyRefs = (root) => $$('[data-cp]', root || document).forEach(b => b.addEventListener('click', () => { const t = $('#' + b.dataset.cp); if (t) copy(t.textContent); }));

// ============================================================
// TOOLS REGISTRY
// ============================================================
const TOOLS = {};
