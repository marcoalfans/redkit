// RedKit · payloads/library.js (split from payloads.js)
// ===== XSS PAYLOAD LIBRARY =====
// ===== Shared Payload Library Renderer =====
// Data sourced from 1000+ real bug bounty reports across multiple resources.
const PL_CREDIT = `Data sourced from <b>1000+ real bug bounty reports</b>, public writeups, PortSwigger, HackTricks, PayloadsAllTheThings, and curated personal notes. Use only on systems you are authorized to test.`;

const renderPayloadLibrary = (cardTitle, sections, tips) => {
  const sectionsHtml = sections.map((sec, sIdx) => `
    <div class="pl-cat" data-cat>
      ${escapeHtml(sec.name)}
      ${sec.note ? `<div class="pl-cat-note">${escapeHtml(sec.note)}</div>` : ''}
    </div>
    <div class="payload-list">
      ${sec.items.map(it => {
        const p = it.p, d = it.d || '';
        const j = JSON.stringify(p).replace(/"/g, '&quot;');
        const main = it.link
          ? `<a class="pl-link" href="${escapeHtml(p)}" target="_blank" rel="noopener noreferrer">${escapeHtml(p)}</a>`
          : `<code>${escapeHtml(p)}</code>`;
        const desc = it.recommended
          ? `<span class="pl-desc"><strong class="pl-recommended">${escapeHtml(d)}</strong></span>`
          : `<span class="pl-desc">${escapeHtml(d)}</span>`;
        return `
          <div class="payload-item" data-payload>
            ${main}
            ${desc}
            <button class="btn btn-ghost" data-copy="${j}">Copy</button>
          </div>
        `;
      }).join('')}
    </div>
  `).join('');

  const tipsHtml = (tips || []).map(t => `<div class="pl-tip"><b>${escapeHtml(t.title)}:</b> ${escapeHtml(t.body)}</div>`).join('');

  return `
    <div class="tool">
      <div class="card">
        <div class="card-title">${escapeHtml(cardTitle)}</div>
        <div class="pl-credit">${PL_CREDIT}</div>
        <input type="text" class="input pl-search" placeholder="Filter payloads..." data-pl-search>
        ${tipsHtml}
        ${sectionsHtml}
      </div>
    </div>
  `;
};

const initPayloadLibrary = () => {
  const root = $('#content'); // scope to the tool pane (NOT the sidebar, which also uses [data-cat])
  wireCopyAll(root);
  const search = $('[data-pl-search]', root);
  if (search) {
    search.addEventListener('input', () => {
      const q = search.value.toLowerCase();
      $$('[data-payload]', root).forEach(item => {
        item.style.display = !q || item.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
      // hide empty categories
      $$('[data-cat]', root).forEach(cat => {
        const n = cat.nextElementSibling;
        if (!n) return;
        const visible = $$('[data-payload]', n).some(i => i.style.display !== 'none');
        cat.style.display = visible ? '' : 'none';
        n.style.display = visible ? '' : 'none';
      });
    });
  }
};

