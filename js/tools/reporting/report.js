// RedKit · reporting/report.js (split from reporting.js)
// ===== REPORT TEMPLATE =====
const VULN_TYPES = [
  'Cross-Site Scripting (XSS)',
  'SQL Injection',
  'Cross-Site Request Forgery (CSRF)',
  'Insecure Direct Object Reference (IDOR)',
  'Server-Side Request Forgery (SSRF)',
  'Remote Code Execution (RCE)',
  'Local File Inclusion (LFI)',
  'Remote File Inclusion (RFI)',
  'XML External Entity (XXE)',
  'Open Redirect',
  'Account Takeover (ATO)',
  'Authentication Bypass',
  'Authorization Bypass / Privilege Escalation',
  'Information Disclosure',
  'Sensitive Data Exposure',
  'Subdomain Takeover',
  'Clickjacking',
  'Race Condition',
  'Business Logic Flaw',
  'Denial of Service (DoS)',
  'Improper Input Validation',
  'Broken Access Control',
  'Insecure Deserialization',
  'Server-Side Template Injection (SSTI)',
  'Command Injection',
  'Path Traversal',
  'CRLF Injection',
  'HTTP Request Smuggling',
  'Cache Poisoning',
  'CORS Misconfiguration',
  'JWT Vulnerability',
  'GraphQL Vulnerability',
  'Web3 / Smart Contract Issue',
];

TOOLS['report-template'] = {
  title: 'Report Template',
  desc: 'Build a clean, structured vulnerability report ready to submit.',
  render() {
    return `
      <div class="tool">
        ${card('Vulnerability Details', `
          ${field('Vulnerability Name', `<input type="text" id="rt-name" placeholder="e.g. Stored XSS in user profile bio">`)}
          ${field('Vulnerability Type', `<input type="text" id="rt-type" list="rt-type-list" placeholder="Select or type a vulnerability type" autocomplete="off">
            <datalist id="rt-type-list">${VULN_TYPES.map(t => `<option value="${escapeHtml(t)}"></option>`).join('')}</datalist>`)}
          <div class="rt-cvss-row">
            ${field('CVSS Ver.', `<select id="rt-cvssver">
                <option value="3.1">CVSS 3.1</option>
                <option value="4.0">CVSS 4.0</option>
              </select>`)}
            ${field('CVSS Vector', `<input type="text" id="rt-vector" placeholder="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H">`)}
            ${field('Score', `<div class="rt-out-box"><span class="rt-score" id="rt-score">N/A</span></div>`)}
            ${field('Severity', `<div class="rt-out-box"><span class="severity-badge sev-none" id="rt-sevbadge">N/A</span></div>`)}
          </div>
          ${field('Affected URL(s)', `<div id="rt-urls">
              <div class="rt-url-row">
                <input type="text" class="rt-url" placeholder="https://target.com/affected/endpoint">
                <button type="button" class="rt-url-rm" title="Remove">&times;</button>
              </div>
            </div>
            <button type="button" class="btn btn-secondary rt-url-add" id="rt-url-add">+ Add URL</button>`)}
          ${field('Description', `<textarea id="rt-desc" rows="4" placeholder="Describe the vulnerability..."></textarea>`)}
          ${field('Impact', `<textarea id="rt-impact" rows="4" placeholder="Describe the impact and risk..."></textarea>`)}
          ${field('Remediation', `<textarea id="rt-rem" rows="3" placeholder="How to fix..."></textarea>`)}
          ${field('References', `<div id="rt-refs">
              <div class="rt-url-row">
                <input type="text" class="rt-ref" placeholder="OWASP / CWE / CVE link...">
                <button type="button" class="rt-url-rm" title="Remove">&times;</button>
              </div>
            </div>
            <button type="button" class="btn btn-secondary rt-url-add" id="rt-ref-add">+ Add Reference</button>`)}
          ${field('Proof of Concept', `<textarea id="rt-poc" rows="6" placeholder="Step 1...&#10;Step 2...&#10;Request/Payload..."></textarea>`)}
          <div class="btn-row">
            <button class="btn" id="rt-gen">Generate Report</button>
            <button class="btn btn-secondary" id="rt-clear">Clear</button>
          </div>
        `)}
        ${card('', resultHead('Report (Markdown)', `<div>${ghostBtn('rt-copy')}${ghostBtn('rt-dl', 'Download .md')}</div>`) +
          `<div class="result-box" id="rt-output"></div>`, { id: 'rt-results', hidden: true })}
      </div>
    `;
  },
  init() {
    const computeCvss = () => {
      const raw = $('#rt-vector').value.trim();
      const vm = raw.match(/CVSS:(3\.1|3\.0|4\.0)/i);
      if (vm) $('#rt-cvssver').value = vm[1].charAt(0) === '4' ? '4.0' : '3.1';
      const ver = $('#rt-cvssver').value;
      const sel = {};
      raw.replace(/^CVSS:[0-9.]+\//i, '').split('/').forEach(p => { const a = p.split(':'); if (a[0] && a[1]) sel[a[0].trim().toUpperCase()] = a[1].trim().toUpperCase(); });
      const score = ver === '4.0' ? calcCVSS40(sel) : calcCVSS31(sel);
      const scoreEl = $('#rt-score'), badge = $('#rt-sevbadge');
      if (score == null || isNaN(score)) { scoreEl.textContent = 'N/A'; scoreEl.style.color = 'var(--text-mute)'; badge.className = 'severity-badge sev-none'; badge.textContent = 'N/A'; return; }
      const [cls, label] = severityFromScore(score);
      scoreEl.textContent = score.toFixed(1);
      scoreEl.style.color = SEV_COLOR[cls] || 'var(--text-mute)';
      badge.className = 'severity-badge sev-' + cls;
      badge.textContent = label;
    };
    $('#rt-vector').addEventListener('input', computeCvss);
    $('#rt-cvssver').addEventListener('change', computeCvss);

    // Affected URL(s) + References: dynamic add/remove rows
    const wireRm = (btn) => btn.addEventListener('click', () => {
      const row = btn.closest('.rt-url-row'), box = row.parentElement;
      if (box.children.length > 1) row.remove(); else row.querySelector('input').value = '';
    });
    const addRow = (box, cls, ph) => {
      const row = document.createElement('div');
      row.className = 'rt-url-row';
      row.innerHTML = '<input type="text" class="' + cls + '" placeholder="' + ph + '"><button type="button" class="rt-url-rm" title="Remove">&times;</button>';
      box.appendChild(row);
      wireRm(row.querySelector('.rt-url-rm'));
      row.querySelector('input').focus();
    };
    $$('.rt-url-rm').forEach(wireRm);
    $('#rt-url-add').addEventListener('click', () => addRow($('#rt-urls'), 'rt-url', 'https://target.com/affected/endpoint'));
    $('#rt-ref-add').addEventListener('click', () => addRow($('#rt-refs'), 'rt-ref', 'OWASP / CWE / CVE link...'));

    $('#rt-gen').addEventListener('click', () => {
      const score = $('#rt-score').textContent;
      const severity = $('#rt-sevbadge').textContent;
      const ver = $('#rt-cvssver').value;
      const vector = $('#rt-vector').value.trim();
      const sevLine = (severity && severity !== 'N/A') ? `${severity}${score !== 'N/A' ? `, CVSS ${ver} ${score}` : ''}` : 'N/A';
      const multi = (cls) => { const a = $$(cls).map(i => i.value.trim()).filter(Boolean); return a.length === 0 ? 'N/A' : a.length === 1 ? a[0] : a.map(x => '- ' + x).join('\n'); };
      const urlOut = multi('.rt-url');
      const refOut = multi('.rt-ref');
      const fields = {
        name: $('#rt-name').value,
        type: $('#rt-type').value,
        desc: $('#rt-desc').value,
        impact: $('#rt-impact').value,
        rem: $('#rt-rem').value,
        poc: $('#rt-poc').value,
      };
      const id = window.getLang && window.getLang() === 'id';
      const H = id
        ? { report: 'Laporan Kerentanan', name: 'Nama Kerentanan', type: 'Jenis Kerentanan', sev: 'Tingkat Keparahan', vec: 'Vektor CVSS', url: 'URL Terdampak', desc: 'Deskripsi', impact: 'Dampak', rem: 'Remediasi', refs: 'Referensi', poc: 'Proof of Concept' }
        : { report: 'Vulnerability Report', name: 'Vulnerability Name', type: 'Vulnerability Type', sev: 'Severity', vec: 'CVSS Vector', url: 'Affected URL', desc: 'Description', impact: 'Impact', rem: 'Remediation', refs: 'References', poc: 'Proof of Concept' };
      const md = `# ${fields.name || H.report}

## ${H.name}
${fields.name}

## ${H.type}
${fields.type}

## ${H.sev}
${sevLine}

## ${H.vec}
${vector ? '`' + vector + '`' : 'N/A'}

## ${H.url}
${urlOut}

## ${H.desc}
${fields.desc}

## ${H.impact}
${fields.impact}

## ${H.rem}
${fields.rem}

## ${H.refs}
${refOut}

## ${H.poc}
${fields.poc}
`;
      $('#rt-output').textContent = md;
      $('#rt-results').style.display = 'block';
    });
    $('#rt-clear').addEventListener('click', () => {
      ['rt-name','rt-vector','rt-desc','rt-impact','rt-rem','rt-poc'].forEach(id => $(`#${id}`).value = '');
      ['#rt-urls','#rt-refs'].forEach(sel => { const box = $(sel); Array.from(box.children).slice(1).forEach(r => r.remove()); box.querySelector('input').value = ''; });
      $('#rt-score').textContent = 'N/A';
      $('#rt-sevbadge').className = 'severity-badge sev-none';
      $('#rt-sevbadge').textContent = 'N/A';
    });
    wireCopy('rt-copy', () => $('#rt-output').textContent);
    $('#rt-dl').addEventListener('click', () => {
      const name = ($('#rt-name').value || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      download(`${name}.md`, $('#rt-output').textContent, 'text/markdown');
    });
  }
};
