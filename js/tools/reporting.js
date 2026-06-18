/* ============================================================
   RedKit - Reporting tools (CVSS, report template, notationer)
   Loaded after js/core.js (uses $, el, TOOLS, helpers).
   ============================================================ */

// ============================================================
// REPORTING TOOLS
// ============================================================

// ===== CVSS 3.1 CALCULATOR =====
const CVSS31_METRICS = {
  AV: { name: 'Attack Vector', opts: [['N','Network'],['A','Adjacent'],['L','Local'],['P','Physical']], values: { N:0.85, A:0.62, L:0.55, P:0.2 } },
  AC: { name: 'Attack Complexity', opts: [['L','Low'],['H','High']], values: { L:0.77, H:0.44 } },
  PR: { name: 'Privileges Required', opts: [['N','None'],['L','Low'],['H','High']], values: { N:0.85, L:0.62, H:0.27 } },
  UI: { name: 'User Interaction', opts: [['N','None'],['R','Required']], values: { N:0.85, R:0.62 } },
  S: { name: 'Scope', opts: [['U','Unchanged'],['C','Changed']] },
  C: { name: 'Confidentiality', opts: [['H','High'],['L','Low'],['N','None']], values: { H:0.56, L:0.22, N:0 } },
  I: { name: 'Integrity', opts: [['H','High'],['L','Low'],['N','None']], values: { H:0.56, L:0.22, N:0 } },
  A: { name: 'Availability', opts: [['H','High'],['L','Low'],['N','None']], values: { H:0.56, L:0.22, N:0 } },
};

const calcCVSS31 = (sel) => {
  const { AV, AC, PR, UI, S, C, I, A } = sel;
  if (!AV || !AC || !PR || !UI || !S || !C || !I || !A) return null;

  // PR adjusted for changed scope
  const prVals = { U: { N:0.85, L:0.62, H:0.27 }, C: { N:0.85, L:0.68, H:0.5 } };
  const prScore = prVals[S][PR];

  const iss = 1 - ((1 - CVSS31_METRICS.C.values[C]) * (1 - CVSS31_METRICS.I.values[I]) * (1 - CVSS31_METRICS.A.values[A]));
  const impact = S === 'U' ? 6.42 * iss : 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15);
  const exploitability = 8.22 * CVSS31_METRICS.AV.values[AV] * CVSS31_METRICS.AC.values[AC] * prScore * CVSS31_METRICS.UI.values[UI];
  let base;
  if (impact <= 0) base = 0;
  else if (S === 'U') base = Math.min(impact + exploitability, 10);
  else base = Math.min(1.08 * (impact + exploitability), 10);
  base = Math.ceil(base * 10) / 10;
  return base;
};

const severityFromScore = (s) => {
  if (s == null) return ['none', 'N/A'];
  if (s === 0) return ['none', 'None'];
  if (s < 4) return ['low', 'Low'];
  if (s < 7) return ['medium', 'Medium'];
  if (s < 9) return ['high', 'High'];
  return ['critical', 'Critical'];
};
const SEV_COLOR = { none: '#8b949e', low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' };

// ----- CVSS per-option icons: AV keeps chandanbn sprite; the rest are clean inline SVGs -----
const G = '#23a34a', PG = '#cdeed7', D = '#1f2328';  // deep green (High), pale green (Low), dark outline
const CVSS_SVG = {
  bolt: `<svg viewBox="0 0 24 24"><path d="M13 3L5 14h6l-1 7 8-11h-6z" fill="${G}" stroke="${D}" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  puzzle: `<svg viewBox="0 0 24 24"><path d="M6 5h4a2 2 0 1 1 4 0h4v4a2 2 0 1 0 0 4v4h-4a2 2 0 1 0-4 0H6v-4a2 2 0 1 1 0-4z" fill="${G}" stroke="${D}" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  ban: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="${PG}" stroke="${D}" stroke-width="1.6"/><path d="M6 6l12 12" fill="none" stroke="${D}" stroke-width="1.6"/></svg>`,
  flag: `<svg viewBox="0 0 24 24"><path d="M6 21V4" fill="none" stroke="${D}" stroke-width="1.6" stroke-linecap="round"/><path d="M6 4h11l-2 4 2 4H6z" fill="${G}" stroke="${D}" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  unlock: `<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2" fill="${PG}" stroke="${D}" stroke-width="1.6"/><path d="M8 11V8a4 4 0 0 1 7-2.6" fill="none" stroke="${D}" stroke-width="1.6"/></svg>`,
  user: `<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="${G}" stroke="${D}" stroke-width="1.6"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0z" fill="${G}" stroke="${D}" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  usershield: `<svg viewBox="0 0 24 24"><circle cx="9.5" cy="8" r="3.3" fill="none" stroke="${D}" stroke-width="1.6"/><path d="M3.5 20.5a6.5 6.5 0 0 1 10-5" fill="none" stroke="${D}" stroke-width="1.6"/><path d="M18 12.5l3.2 1.1v2.9c0 2.1-1.6 3.2-3.2 3.7-1.6-.5-3.2-1.6-3.2-3.7v-2.9z" fill="${G}" stroke="${D}" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  pointer: `<svg viewBox="0 0 24 24"><path d="M5 3l6 18 2-7 7-2z" fill="${G}" stroke="${D}" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  box: `<svg viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="2" fill="${G}" stroke="${D}" stroke-width="1.6"/></svg>`,
  boxshift: `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="10" height="10" rx="2" fill="${G}" stroke="${D}" stroke-width="1.6"/><path d="M11 18h8M19 18l-3-3M19 18l-3 3" fill="none" stroke="${D}" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  lock: `<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2" fill="${G}" stroke="${D}" stroke-width="1.6"/><path d="M8 11V8a4 4 0 1 1 8 0v3" fill="none" stroke="${D}" stroke-width="1.6"/></svg>`,
  pencil: `<svg viewBox="0 0 24 24"><path d="M4 20l4-1L19 8l-3-3L5 16z" fill="${G}" stroke="${D}" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  penciloff: `<svg viewBox="0 0 24 24"><path d="M4 20l4-1L19 8l-3-3L5 16z" fill="${PG}" stroke="${D}" stroke-width="1.6" stroke-linejoin="round"/><path d="M3 3l18 18" fill="none" stroke="${D}" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  power: `<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8.5" fill="${G}" stroke="${D}" stroke-width="1.6"/><path d="M12 5v6" fill="none" stroke="${D}" stroke-width="1.6" stroke-linecap="round"/><path d="M8.3 9a5 5 0 1 0 7.4 0" fill="none" stroke="${D}" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  poweroff: `<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8.5" fill="${PG}" stroke="${D}" stroke-width="1.6"/><path d="M12 5v6" fill="none" stroke="${D}" stroke-width="1.6" stroke-linecap="round"/><path d="M8.3 9a5 5 0 1 0 7.4 0" fill="none" stroke="${D}" stroke-width="1.6" stroke-linecap="round"/><path d="M4 4l16 16" fill="none" stroke="${D}" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  lockLow: `<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2" fill="${PG}" stroke="${D}" stroke-width="1.6"/><path d="M8 11V8a4 4 0 1 1 8 0v3" fill="none" stroke="${D}" stroke-width="1.6"/></svg>`,
  pencilLow: `<svg viewBox="0 0 24 24"><path d="M4 20l4-1L19 8l-3-3L5 16z" fill="${PG}" stroke="${D}" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  powerLow: `<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8.5" fill="${PG}" stroke="${D}" stroke-width="1.6"/><path d="M12 5v6" fill="none" stroke="${D}" stroke-width="1.6" stroke-linecap="round"/><path d="M8.3 9a5 5 0 1 0 7.4 0" fill="none" stroke="${D}" stroke-width="1.6" stroke-linecap="round"/></svg>`,
};
const cvssOptToken = (key, val) => {
  const map = {
    AC: { L: 'bolt', H: 'puzzle' },
    AT: { N: 'ban', P: 'flag' },
    PR: { N: 'unlock', L: 'user', H: 'usershield' },
    UI: { N: 'ban', R: 'pointer', P: 'pointer', A: 'pointer' },
    S:  { U: 'box', C: 'boxshift' },
  }[key];
  if (map) return map[val] || '';
  const dim = { C: 'c', VC: 'c', SC: 'c', I: 'i', VI: 'i', SI: 'i', A: 'a', VA: 'a', SA: 'a' }[key];
  if (dim === 'c') return val === 'N' ? 'unlock' : val === 'L' ? 'lockLow' : 'lock';
  if (dim === 'i') return val === 'N' ? 'penciloff' : val === 'L' ? 'pencilLow' : 'pencil';
  if (dim === 'a') return val === 'N' ? 'poweroff' : val === 'L' ? 'powerLow' : 'power';
  return '';
};
const optIcon = (key, val) => {
  if (key === 'AV') return '<span class="cvico-wrap"><i class="cvico AV' + val + '"></i></span>';
  const t = cvssOptToken(key, val);
  return t && CVSS_SVG[t] ? '<span class="cvico-wrap cvico-svg">' + CVSS_SVG[t] + '</span>' : '';
};
const TT_ALIAS = { C: 'VC', I: 'VI', A: 'VA' };
// use Indonesian tooltips when lang=id, falling back to English for any untranslated key
const ttTable = () => ((window.getLang && window.getLang() === 'id' && window.CVSS_TT_ID) ? window.CVSS_TT_ID : (window.CVSS_TT || {}));
const ttMetric = (k) => { const t = ttTable(), e = window.CVSS_TT || {}; return t[k] || t[TT_ALIAS[k]] || e[k] || e[TT_ALIAS[k]] || ''; };
const ttOption = (k, v) => { const t = ttTable(), e = window.CVSS_TT || {}; return t[k + ':' + v] || t[(TT_ALIAS[k] || k) + ':' + v] || e[k + ':' + v] || e[(TT_ALIAS[k] || k) + ':' + v] || ''; };
const readCvssHash = (ver, keys) => {
  const m = location.hash.match(new RegExp('CVSS:' + ver.replace('.', '\\.') + '/([^#?]*)'));
  const out = {};
  if (m) m[1].split('/').forEach(p => { const a = p.split(':'); if (a[0] && a[1] && keys.includes(a[0])) out[a[0]] = a[1]; });
  return out;
};
const writeCvssHash = (toolKey, ver, sel, order) => {
  const pairs = order.filter(k => sel[k]).map(k => k + ':' + sel[k]);
  history.replaceState(null, '', pairs.length ? ('#/' + toolKey + '/CVSS:' + ver + '/' + pairs.join('/')) : ('#/' + toolKey));
};

TOOLS['3.1'] = {
  title: 'CVSS 3.1 Calculator',
  desc: 'Score vulnerability severity with the CVSS 3.1 base metrics.',
  render() {
    const renderMetric = (key) => {
      const m = CVSS31_METRICS[key];
      return `
        <div class="metric">
          <div class="metric-label" data-tip="${escapeHtml(ttMetric(key))}">${m.name} (${key})</div>
          <div class="metric-options" data-key="${key}">
            ${m.opts.map(([v, l]) => `<button class="metric-btn" data-val="${v}" data-tip="${escapeHtml(ttOption(key, v))}">${optIcon(key, v)}${l}</button>`).join('')}
          </div>
        </div>
      `;
    };
    return `
      <div class="tool">
        <div class="cvss-grid">
          ${card('', `
            <div class="metric-group">
              <h4>Base Metrics</h4>
              ${['AV','AC','PR','UI','S','C','I','A'].map(renderMetric).join('')}
            </div>
            <button class="btn btn-secondary" id="cvss31-reset">Reset</button>
          `)}
          ${card('Score', `
            <div class="cvss-score" id="cvss31-score">0.0</div>
            <div style="text-align:center;margin-bottom:14px"><span class="severity-badge sev-none" id="cvss31-sev">None</span></div>
            <div class="cvss-vector" id="cvss31-vector">CVSS:3.1/...</div>
            <div class="btn-row" style="margin-top:12px">
              <button class="btn btn-secondary" id="cvss31-copy-vec">Copy Vector</button>
              <button class="btn btn-secondary" id="cvss31-copy-score">Copy Score</button>
            </div>
          `, { style: 'position:sticky;top:0' })}
        </div>
      </div>
    `;
  },
  init() {
    const sel = {};
    const update = () => {
      const score = calcCVSS31(sel);
      const [cls, label] = severityFromScore(score);
      const scoreEl = $('#cvss31-score');
      scoreEl.textContent = score == null ? '-' : score.toFixed(1);
      scoreEl.style.color = SEV_COLOR[cls] || 'var(--text-mute)';
      const sev = $('#cvss31-sev');
      sev.className = `severity-badge sev-${cls}`;
      sev.textContent = label;
      const order = ['AV','AC','PR','UI','S','C','I','A'];
      const v = 'CVSS:3.1/' + order.map(k => `${k}:${sel[k] || '?'}`).join('/');
      $('#cvss31-vector').textContent = v;
      writeCvssHash('3.1', '3.1', sel, order);
    };
    $$('.metric-options').forEach(group => {
      const key = group.dataset.key;
      group.addEventListener('click', e => {
        if (!e.target.matches('.metric-btn')) return;
        sel[key] = e.target.dataset.val;
        $$('.metric-btn', group).forEach(b => b.classList.toggle('active', b === e.target));
        update();
      });
    });
    $('#cvss31-reset').addEventListener('click', () => {
      Object.keys(sel).forEach(k => delete sel[k]);
      $$('.metric-btn').forEach(b => b.classList.remove('active'));
      update();
    });
    wireCopy('cvss31-copy-vec', () => $('#cvss31-vector').textContent);
    wireCopy('cvss31-copy-score', () => $('#cvss31-score').textContent);
    const preOrder = ['AV','AC','PR','UI','S','C','I','A'];
    Object.assign(sel, readCvssHash('3.1', preOrder));
    $$('.metric-options').forEach(group => { const k = group.dataset.key; const btn = sel[k] && $(`.metric-btn[data-val="${sel[k]}"]`, group); if (btn) btn.classList.add('active'); });
    update();
  }
};

// ===== CVSS 4.0 CALCULATOR (simplified) =====
const CVSS40_METRICS = {
  AV: { name: 'Attack Vector', opts: [['N','Network'],['A','Adjacent'],['L','Local'],['P','Physical']] },
  AC: { name: 'Attack Complexity', opts: [['L','Low'],['H','High']] },
  AT: { name: 'Attack Requirements', opts: [['N','None'],['P','Present']] },
  PR: { name: 'Privileges Required', opts: [['N','None'],['L','Low'],['H','High']] },
  UI: { name: 'User Interaction', opts: [['N','None'],['P','Passive'],['A','Active']] },
  VC: { name: 'Vulnerable Confidentiality', opts: [['H','High'],['L','Low'],['N','None']] },
  VI: { name: 'Vulnerable Integrity', opts: [['H','High'],['L','Low'],['N','None']] },
  VA: { name: 'Vulnerable Availability', opts: [['H','High'],['L','Low'],['N','None']] },
  SC: { name: 'Subsequent Confidentiality', opts: [['H','High'],['L','Low'],['N','None']] },
  SI: { name: 'Subsequent Integrity', opts: [['H','High'],['L','Low'],['N','None']] },
  SA: { name: 'Subsequent Availability', opts: [['H','High'],['L','Low'],['N','None']] },
};

// CVSS 4.0 — official FIRST.org base scoring (bundled in cvss4.js from FIRSTdotorg/cvss-v4-calculator)
const calcCVSS40 = (sel) => (window.calcCVSS40Official ? window.calcCVSS40Official(sel) : null);

TOOLS['4.0'] = {
  title: 'CVSS 4.0 Calculator',
  desc: 'Score vulnerability severity with the CVSS 4.0 base metrics.',
  render() {
    const renderMetric = (key) => {
      const m = CVSS40_METRICS[key];
      return `
        <div class="metric">
          <div class="metric-label" data-tip="${escapeHtml(ttMetric(key))}">${m.name} (${key})</div>
          <div class="metric-options" data-key="${key}">
            ${m.opts.map(([v, l]) => `<button class="metric-btn" data-val="${v}" data-tip="${escapeHtml(ttOption(key, v))}">${optIcon(key, v)}${l}</button>`).join('')}
          </div>
        </div>
      `;
    };
    return `
      <div class="tool">
        <div class="cvss-grid">
          ${card('', `
            <div class="metric-group">
              <h4>Exploitability</h4>
              ${['AV','AC','AT','PR','UI'].map(renderMetric).join('')}
            </div>
            <div class="metric-group">
              <h4>Vulnerable System Impact</h4>
              ${['VC','VI','VA'].map(renderMetric).join('')}
            </div>
            <div class="metric-group">
              <h4>Subsequent System Impact</h4>
              ${['SC','SI','SA'].map(renderMetric).join('')}
            </div>
            <button class="btn btn-secondary" id="cvss40-reset">Reset</button>
          `)}
          ${card('Score', `
            <div class="cvss-score" id="cvss40-score">0.0</div>
            <div style="text-align:center;margin-bottom:14px"><span class="severity-badge sev-none" id="cvss40-sev">None</span></div>
            <div class="cvss-vector" id="cvss40-vector">CVSS:4.0/...</div>
            <div class="btn-row" style="margin-top:12px">
              <button class="btn btn-secondary" id="cvss40-copy-vec">Copy Vector</button>
              <button class="btn btn-secondary" id="cvss40-copy-score">Copy Score</button>
            </div>
          `, { style: 'position:sticky;top:0' })}
        </div>
      </div>
    `;
  },
  init() {
    const sel = {};
    const update = () => {
      const score = calcCVSS40(sel);
      const [cls, label] = severityFromScore(score);
      const scoreEl = $('#cvss40-score');
      scoreEl.textContent = score == null ? '-' : score.toFixed(1);
      scoreEl.style.color = SEV_COLOR[cls] || 'var(--text-mute)';
      const sev = $('#cvss40-sev');
      sev.className = `severity-badge sev-${cls}`;
      sev.textContent = label;
      const order = ['AV','AC','AT','PR','UI','VC','VI','VA','SC','SI','SA'];
      const v = 'CVSS:4.0/' + order.map(k => `${k}:${sel[k] || '?'}`).join('/');
      $('#cvss40-vector').textContent = v;
      writeCvssHash('4.0', '4.0', sel, order);
    };
    $$('.metric-options').forEach(group => {
      const key = group.dataset.key;
      group.addEventListener('click', e => {
        if (!e.target.matches('.metric-btn')) return;
        sel[key] = e.target.dataset.val;
        $$('.metric-btn', group).forEach(b => b.classList.toggle('active', b === e.target));
        update();
      });
    });
    $('#cvss40-reset').addEventListener('click', () => {
      Object.keys(sel).forEach(k => delete sel[k]);
      $$('.metric-btn').forEach(b => b.classList.remove('active'));
      update();
    });
    wireCopy('cvss40-copy-vec', () => $('#cvss40-vector').textContent);
    wireCopy('cvss40-copy-score', () => $('#cvss40-score').textContent);
    const preOrder = ['AV','AC','AT','PR','UI','VC','VI','VA','SC','SI','SA'];
    Object.assign(sel, readCvssHash('4.0', preOrder));
    $$('.metric-options').forEach(group => { const k = group.dataset.key; const btn = sel[k] && $(`.metric-btn[data-val="${sel[k]}"]`, group); if (btn) btn.classList.add('active'); });
    update();
  }
};

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
            ${field('Score', `<div class="rt-out-box"><span class="rt-score" id="rt-score">—</span></div>`)}
            ${field('Severity', `<div class="rt-out-box"><span class="severity-badge sev-none" id="rt-sevbadge">—</span></div>`)}
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
      if (score == null || isNaN(score)) { scoreEl.textContent = '—'; scoreEl.style.color = 'var(--text-mute)'; badge.className = 'severity-badge sev-none'; badge.textContent = '—'; return; }
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
      const sevLine = (severity && severity !== '—') ? `${severity}${score !== '—' ? ` — CVSS ${ver} ${score}` : ''}` : 'N/A';
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
      $('#rt-score').textContent = '—';
      $('#rt-sevbadge').className = 'severity-badge sev-none';
      $('#rt-sevbadge').textContent = '—';
    });
    wireCopy('rt-copy', () => $('#rt-output').textContent);
    $('#rt-dl').addEventListener('click', () => {
      const name = ($('#rt-name').value || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      download(`${name}.md`, $('#rt-output').textContent, 'text/markdown');
    });
  }
};

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

