/* ============================================================
   RedKit - Recon & OSINT tools
   Loaded after js/core.js (uses $, el, TOOLS, helpers).
   ============================================================ */


// ===== 1. GOOGLE DORK GENERATOR =====
TOOLS['google-dork'] = {
  title: 'Google Dork Generator',
  desc: 'Build targeted Google dork queries to uncover exposed files, logins, and indexed pages on a domain.',
  render() {
    return `
      <div class="tool">
        ${card('Target', `
          ${field('Domain (e.g., example.com)', `<input type="text" id="gd-domain" placeholder="example.com">`)}
          <button class="btn" id="gd-gen">Generate Dorks</button>
        `)}
        ${card('', resultHead('Generated Dorks', ghostBtn('gd-copy-all', 'Copy All')) +
          `<div class="dork-list" id="gd-list"></div>`, { id: 'gd-results', hidden: true })}
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
    wireRun('gd-gen', gen, 'gd-domain');
    wireCopy('gd-copy-all', () => TOOLS['google-dork']._build($('#gd-domain').value.trim()).map(([q]) => q).join('\n'));
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
  desc: 'Build Shodan queries to map a target exposed hosts, services, and open ports.',
  render() {
    return `
      <div class="tool">
        ${card('Target', `
          <div class="field-row">
            ${field('Domain', `<input type="text" id="sd-domain" placeholder="example.com">`)}
            ${field('IP / CIDR', `<input type="text" id="sd-ip" placeholder="1.2.3.4 or 1.2.3.0/24">`)}
          </div>
          <div class="field-row">
            ${field('Organization', `<input type="text" id="sd-org" placeholder="Acme Corp">`)}
            ${field('SSL/Certificate Name', `<input type="text" id="sd-ssl" placeholder="example.com">`)}
          </div>
          <button class="btn" id="sd-gen">Generate Queries</button>
        `)}
        ${card('', resultHead('Shodan Queries') + `<div class="dork-list" id="sd-list"></div>`, { id: 'sd-results', hidden: true })}
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
  desc: 'Enumerate a domain subdomains from public certificate transparency logs.',
  render() {
    return `
      <div class="tool">
        ${card('Target Domain', `
          ${field('Root domain (e.g., example.com)', `<input type="text" id="sf-domain" placeholder="example.com">`)}
          <button class="btn" id="sf-search">Search Subdomains</button>
          <span id="sf-timer" style="margin-left:12px;color:var(--text-mute);font-size:12px">Uses crt.sh - may take 10–30s</span>
        `)}
        ${card('', resultHead(`Subdomains <span id="sf-count" style="color:var(--text-mute);font-weight:400"></span>`, `<div>${ghostBtn('sf-copy')}${ghostBtn('sf-download', 'Download')}</div>`) +
          `<div class="result-box" id="sf-output"></div>`, { id: 'sf-results', hidden: true })}
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
    wireCopy('sf-copy', () => (TOOLS['subdomain-finder']._last || []).join('\n'));
    $('#sf-download').addEventListener('click', () => {
      const d = $('#sf-domain').value.trim() || 'subdomains';
      download(`${d}-subdomains.txt`, (TOOLS['subdomain-finder']._last || []).join('\n'));
    });
  }
};

// ===== 4. JS FILE ANALYZER =====
TOOLS['js-analyzer'] = {
  title: 'JS File Analyzer',
  desc: 'Extract endpoints, secrets, and interesting strings from JavaScript source.',
  render() {
    return `
      <div class="tool">
        ${card('JavaScript Source', `
          ${field('Paste JS source code (Right Click -> View Page Source or CTRL + U)', `<textarea id="js-input" rows="10" placeholder="// paste js source here..."></textarea>`)}
          <button class="btn" id="js-analyze">Analyze</button>
        `)}
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
        const cardEl = el('div', { class: 'card' });
        cardEl.innerHTML = `<div class="card-title">${escapeHtml(k)} (${v.length})</div><div class="result-box">${v.map(escapeHtml).join('\n')}</div>`;
        out.appendChild(cardEl);
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
  desc: 'Review HTTP response headers and flag missing or weak security controls.',
  render() {
    return `
      <div class="tool">
        ${card(`Fetch from URL <span style="color:var(--text-mute);font-weight:400;font-size:11px">(experimental)</span>`, `
          ${field('Domain or URL', `<input type="text" id="hdr-url" placeholder="example.com or https://example.com">`)}
          <button class="btn" id="hdr-fetch">Fetch &amp; Analyze</button>
          <div id="hdr-fetch-status" style="margin-top:8px;font-size:12px;color:var(--text-mute)"></div>
        `)}
        ${card('HTTP Response Headers', `
          ${field('Paste raw response headers', `<textarea id="hdr-input" rows="12" placeholder="HTTP/1.1 200 OK
Server: nginx
Content-Type: text/html
..."></textarea>`)}
          <button class="btn" id="hdr-analyze">Analyze Headers</button>
        `)}
        ${card('', `
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
        `, { id: 'hdr-grade-card', hidden: true })}
        ${card('', resultHead('Analysis') + `<div class="header-result" id="hdr-output"></div>`, { id: 'hdr-results', hidden: true })}
        ${card('', resultHead(`Recommendations <span id="hdr-recs-count" style="color:var(--text-mute);font-weight:400"></span>`, `<button class="btn btn-secondary" id="hdr-recs-toggle">Show More Info</button>`) +
          `<div id="hdr-recs" style="display:none"></div>`, { id: 'hdr-recs-card', hidden: true })}
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
  desc: 'Look up any DNS record type quickly over encrypted DNS over HTTPS.',
  render() {
    return `
      <div class="tool">
        ${card('DNS Query', `
          <div class="field-row">
            ${field('Domain', `<input type="text" id="dns-domain" placeholder="example.com">`)}
            ${field('Record Type', `<select id="dns-type">
                <option>A</option><option>AAAA</option><option>CNAME</option>
                <option>MX</option><option>TXT</option><option>NS</option>
                <option>SOA</option><option>CAA</option><option>SRV</option><option>PTR</option>
                <option value="ALL">ALL</option>
              </select>`)}
          </div>
          <button class="btn" id="dns-lookup">Lookup</button>
        `)}
        ${card('', resultHead('Records') + `<div class="result-box" id="dns-output"></div>`, { id: 'dns-results', hidden: true })}
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
  desc: 'Decompose any URL into its scheme, host, path, query, and fragment.',
  render() {
    return `
      <div class="tool">
        ${card('URL', `
          ${field('', `<input type="text" id="up-input" placeholder="https://user:pass@example.com:8080/path?key=value#frag">`)}
          <button class="btn" id="up-parse">Parse</button>
        `)}
        ${card('Components', `<dl class="info-grid" id="up-output"></dl>`, { id: 'up-results', hidden: true })}
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
  desc: 'Look up geolocation, network, and ASN details for an IP or domain.',
  render() {
    return `
      <div class="tool">
        ${card('Target', `
          ${field('IP address or domain', `<input type="text" id="ipi-input" placeholder="8.8.8.8 or example.com">`)}
          <button class="btn" id="ipi-lookup">Lookup</button>
        `)}
        ${card('Info', `<dl class="info-grid" id="ipi-output"></dl>`, { id: 'ipi-results', hidden: true })}
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

// ===== NMAP / CURL COMMAND BUILDER =====
const sh = (s) => "'" + String(s).replace(/'/g, "'\\''") + "'"; // shell-safe single-quote

TOOLS['cmd-builder'] = {
  title: 'Nmap / curl Builder',
  desc: 'Build Nmap scans and curl requests from a form, with copy-ready commands.',
  render() {
    return `
      <div class="tool">
        ${card('Command Builder', `
          <div class="not-formats" id="cb-tabs">
            <button class="not-fmt active" data-b="nmap">Nmap</button>
            <button class="not-fmt" data-b="curl">curl</button>
            <button class="not-fmt" data-b="converter">curl → code</button>
          </div>
          <div id="cb-form"></div>
        `)}
        ${card('', `<div class="result-header"><h4 id="cb-outlabel">Command</h4>${ghostBtn('cb-copy')}</div><pre class="not-pre mono" id="cb-out"></pre>`)}
      </div>`;
  },
  init() {
    const chk = (id, label, on) => `<label class="pe-chk"><input type="checkbox" id="${id}"${on ? ' checked' : ''}> ${label}</label>`;
    const v = id => ($('#' + id) ? $('#' + id).value.trim() : '');
    const c = id => !!($('#' + id) && $('#' + id).checked);

    const NMAP = {
      form: () => `
        ${field('Target(s)', `<input type="text" id="nm-target" value="scanme.nmap.org" placeholder="host, CIDR, or 10.0.0.1-50">`)}
        <div class="field-row">
          ${field('Scan type', `<select id="nm-scan">
            <option value="-sS">TCP SYN (-sS)</option>
            <option value="-sT">TCP connect (-sT)</option>
            <option value="-sU">UDP (-sU)</option>
            <option value="-sn">Ping / host discovery (-sn)</option>
            <option value="-sA">TCP ACK (-sA)</option>
          </select>`)}
          ${field('Ports', `<select id="nm-ports">
            <option value="">Default (top 1000)</option>
            <option value="--top-ports 100">Top 100</option>
            <option value="-F">Fast 100 (-F)</option>
            <option value="-p-">All 65535 (-p-)</option>
          </select>`)}
        </div>
        ${field('Custom ports (overrides above)', `<input type="text" id="nm-pcustom" placeholder="e.g. 22,80,443,8000-8100">`)}
        <div class="field"><label>Options</label><div class="pe-flags">
          ${chk('nm-sv', '-sV version', true)}${chk('nm-o', '-O OS')}${chk('nm-a', '-A aggressive')}${chk('nm-sc', '-sC default scripts')}
          ${chk('nm-open', '--open', true)}${chk('nm-pn', '-Pn no ping')}${chk('nm-n', '-n no DNS')}${chk('nm-v', '-v verbose', true)}
        </div></div>
        <div class="field-row">
          ${field('Timing', `<select id="nm-timing"><option>-T2</option><option>-T3</option><option selected>-T4</option><option>-T5</option></select>`)}
          ${field('NSE script', `<input type="text" id="nm-script" placeholder="e.g. vuln, http-title">`)}
        </div>
        ${field('Output basename (-oA)', `<input type="text" id="nm-out" placeholder="writes name.nmap / .gnmap / .xml">`)}
      `,
      build: () => {
        const parts = ['nmap'];
        const scan = v('nm-scan'); if (scan) parts.push(scan);
        const agg = c('nm-a');
        if (agg) parts.push('-A');
        if (c('nm-sv') && !agg) parts.push('-sV');
        if (c('nm-o') && !agg) parts.push('-O');
        if (c('nm-sc') && !agg) parts.push('-sC');
        const pc = v('nm-pcustom'); if (pc) parts.push('-p ' + pc); else if (v('nm-ports')) parts.push(v('nm-ports'));
        if (c('nm-open')) parts.push('--open');
        if (c('nm-pn')) parts.push('-Pn');
        if (c('nm-n')) parts.push('-n');
        if (c('nm-v')) parts.push('-v');
        if (v('nm-timing')) parts.push(v('nm-timing'));
        const s = v('nm-script'); if (s) parts.push('--script ' + s);
        const o = v('nm-out'); if (o) parts.push('-oA ' + o);
        parts.push(v('nm-target') || 'TARGET');
        return parts.join(' ');
      }
    };

    const CURL = {
      form: () => `
        ${field('URL', `<input type="text" id="cu-url" placeholder="https://target.com/api/login">`)}
        <div class="field-row">
          ${field('Method', `<select id="cu-method">${['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map(m => `<option>${m}</option>`).join('')}</select>`)}
          ${field('Content-Type', `<select id="cu-ct">
            <option value="">(none)</option>
            <option value="application/json">application/json</option>
            <option value="application/x-www-form-urlencoded">x-www-form-urlencoded</option>
            <option value="multipart/form-data">multipart/form-data</option>
          </select>`)}
        </div>
        ${field('Body / data (-d)', `<textarea id="cu-data" rows="3" placeholder='{"user":"admin","pass":"x"}'></textarea>`)}
        ${field('Extra headers (one per line: Key: Value)', `<textarea id="cu-headers" rows="2" placeholder="X-Api-Key: abc123"></textarea>`)}
        <div class="field-row">
          ${field('Authorization (Bearer)', `<input type="text" id="cu-auth" placeholder="token, adds Authorization: Bearer ...">`)}
          ${field('Cookie (-b)', `<input type="text" id="cu-cookie" placeholder="session=...">`)}
        </div>
        <div class="field-row">
          ${field('User-Agent', `<input type="text" id="cu-ua" placeholder="Mozilla/5.0 ...">`)}
          ${field('Proxy (-x)', `<input type="text" id="cu-proxy" placeholder="http://127.0.0.1:8080 (Burp)">`)}
        </div>
        <div class="field"><label>Options</label><div class="pe-flags">
          ${chk('cu-k', '-k insecure')}${chk('cu-l', '-L follow', true)}${chk('cu-i', '-i include')}${chk('cu-s', '-s silent')}
          ${chk('cu-v', '-v verbose')}${chk('cu-comp', '--compressed')}${chk('cu-g', '-G data as query')}
        </div></div>
        ${field('Output file (-o)', `<input type="text" id="cu-out" placeholder="e.g. resp.json">`)}
      `,
      build: () => {
        const parts = ['curl'];
        if (c('cu-k')) parts.push('-k');
        if (c('cu-l')) parts.push('-L');
        if (c('cu-i')) parts.push('-i');
        if (c('cu-s')) parts.push('-s');
        if (c('cu-v')) parts.push('-v');
        if (c('cu-comp')) parts.push('--compressed');
        if (c('cu-g')) parts.push('-G');
        const m = v('cu-method'); if (m && m !== 'GET') parts.push('-X ' + m);
        const ct = v('cu-ct'); if (ct) parts.push('-H ' + sh('Content-Type: ' + ct));
        const auth = v('cu-auth'); if (auth) parts.push('-H ' + sh('Authorization: Bearer ' + auth));
        const ua = v('cu-ua'); if (ua) parts.push('-A ' + sh(ua));
        const ck = v('cu-cookie'); if (ck) parts.push('-b ' + sh(ck));
        v('cu-headers').split('\n').map(l => l.trim()).filter(Boolean).forEach(h => parts.push('-H ' + sh(h)));
        const data = v('cu-data'); if (data) parts.push((c('cu-g') ? '--data-urlencode ' : '-d ') + sh(data));
        const o = v('cu-out'); if (o) parts.push('-o ' + sh(o));
        const proxy = v('cu-proxy'); if (proxy) parts.push('-x ' + sh(proxy));
        parts.push(sh(v('cu-url') || 'URL'));
        return parts.join(' ');
      }
    };

    // ----- curl -> code converter -----
    // shell tokenizer: respects single/double quotes, backslash, and \<newline> line continuations
    const tokenize = (s) => {
      s = s.replace(/\\\r?\n/g, ' ');
      const out = []; let cur = '', inS = false, inD = false, has = false, i = 0;
      while (i < s.length) {
        const ch = s[i];
        if (inS) { if (ch === "'") inS = false; else cur += ch; i++; continue; }
        if (inD) {
          if (ch === '\\' && i + 1 < s.length && '"\\$`'.includes(s[i + 1])) { cur += s[i + 1]; i += 2; continue; }
          if (ch === '"') inD = false; else cur += ch; i++; continue;
        }
        if (ch === "'") { inS = true; has = true; i++; continue; }
        if (ch === '"') { inD = true; has = true; i++; continue; }
        if (ch === '\\' && i + 1 < s.length) { cur += s[i + 1]; i += 2; has = true; continue; }
        if (/\s/.test(ch)) { if (cur || has) { out.push(cur); cur = ''; has = false; } i++; continue; }
        cur += ch; has = true; i++;
      }
      if (cur || has) out.push(cur);
      return out;
    };
    const parseCurl = (raw) => {
      const t = tokenize(raw.trim());
      if (!t.length) return null;
      let i = (t[0] === 'curl') ? 1 : 0;
      const r = { method: '', url: '', headers: [], data: [], get: false, insecure: false, follow: false, proxy: '', user: '' };
      const arg = () => t[++i] || '';
      for (; i < t.length; i++) {
        const a = t[i];
        if (a === '-X' || a === '--request') r.method = arg();
        else if (a === '-H' || a === '--header') r.headers.push(arg());
        else if (a === '-A' || a === '--user-agent') r.headers.push('User-Agent: ' + arg());
        else if (a === '-e' || a === '--referer') r.headers.push('Referer: ' + arg());
        else if (a === '-b' || a === '--cookie') r.headers.push('Cookie: ' + arg());
        else if (a === '-u' || a === '--user') r.user = arg();
        else if (a === '-x' || a === '--proxy') r.proxy = arg();
        else if (a === '--data-urlencode') r.data.push(arg());
        else if (a === '-d' || a === '--data' || a === '--data-raw' || a === '--data-ascii' || a === '--data-binary') r.data.push(arg());
        else if (a === '-G' || a === '--get') r.get = true;
        else if (a === '-k' || a === '--insecure') r.insecure = true;
        else if (a === '-L' || a === '--location') r.follow = true;
        else if (a === '-o' || a === '--output') arg();
        else if (a.startsWith('-')) { /* ignore -s -v -i -O --compressed etc. */ }
        else if (!r.url) r.url = a;
      }
      if (!r.method) r.method = r.data.length ? 'POST' : 'GET';
      return r;
    };
    const splitH = (h) => { const x = h.indexOf(':'); return x < 0 ? [h.trim(), ''] : [h.slice(0, x).trim(), h.slice(x + 1).trim()]; };
    const php = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
    const J = JSON.stringify;
    const cvGen = {
      python: (r) => {
        const L = ['import requests', '', `url = ${J(r.url)}`];
        if (r.headers.length) { L.push('headers = {'); r.headers.forEach(h => { const [k, v] = splitH(h); L.push(`    ${J(k)}: ${J(v)},`); }); L.push('}'); }
        const body = r.data.join('&');
        if (body && !r.get) L.push(`data = ${J(body)}`);
        const a = ['url']; if (r.headers.length) a.push('headers=headers');
        if (body && !r.get) a.push('data=data');
        if (body && r.get) a.push(`params=${J(body)}`);
        if (r.user) { const [u, ...p] = r.user.split(':'); a.push(`auth=(${J(u)}, ${J(p.join(':'))})`); }
        if (r.proxy) a.push(`proxies={"http": ${J(r.proxy)}, "https": ${J(r.proxy)}}`);
        if (r.insecure) a.push('verify=False');
        L.push('', `response = requests.request(${J(r.method)}, ${a.join(', ')})`, 'print(response.status_code)', 'print(response.text)');
        return L.join('\n');
      },
      javascript: (r) => {
        const body = r.data.join('&');
        const o = [`  method: ${J(r.method)}`];
        if (r.headers.length) o.push(`  headers: {\n${r.headers.map(h => { const [k, v] = splitH(h); return `    ${J(k)}: ${J(v)}`; }).join(',\n')}\n  }`);
        if (body && !r.get) o.push(`  body: ${J(body)}`);
        const url = (body && r.get) ? `${J(r.url)} + "?" + ${J(body)}` : J(r.url);
        return `fetch(${url}, {\n${o.join(',\n')}\n})\n  .then(res => res.text())\n  .then(console.log)\n  .catch(console.error);`;
      },
      node: (r) => {
        const body = r.data.join('&');
        const L = ["const axios = require('axios');", '', 'axios({', `  method: ${J(r.method.toLowerCase())},`, `  url: ${J(r.url)},`];
        if (r.headers.length) L.push(`  headers: {\n${r.headers.map(h => { const [k, v] = splitH(h); return `    ${J(k)}: ${J(v)}`; }).join(',\n')}\n  },`);
        if (body && !r.get) L.push(`  data: ${J(body)},`);
        if (body && r.get) L.push(`  params: new URLSearchParams(${J(body)}),`);
        L.push('})', '  .then(res => console.log(res.data))', '  .catch(err => console.error(err));');
        return L.join('\n');
      },
      php: (r) => {
        const body = r.data.join('&');
        const L = ['<?php', '$ch = curl_init();', `curl_setopt($ch, CURLOPT_URL, ${php(r.url)});`, 'curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);', `curl_setopt($ch, CURLOPT_CUSTOMREQUEST, ${php(r.method)});`];
        if (r.headers.length) L.push(`curl_setopt($ch, CURLOPT_HTTPHEADER, [${r.headers.map(php).join(', ')}]);`);
        if (body) L.push(`curl_setopt($ch, CURLOPT_POSTFIELDS, ${php(body)});`);
        if (r.user) L.push(`curl_setopt($ch, CURLOPT_USERPWD, ${php(r.user)});`);
        if (r.proxy) L.push(`curl_setopt($ch, CURLOPT_PROXY, ${php(r.proxy)});`);
        if (r.follow) L.push('curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);');
        if (r.insecure) L.push('curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);', 'curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);');
        L.push('$response = curl_exec($ch);', 'curl_close($ch);', 'echo $response;');
        return L.join('\n');
      },
      go: (r) => {
        const body = r.data.join('&');
        const imp = ['\t"fmt"', '\t"io"', '\t"net/http"']; if (body) imp.push('\t"strings"');
        const L = ['package main', '', 'import (', ...imp, ')', '', 'func main() {', `\turl := ${J(r.url)}`];
        if (body) L.push(`\tpayload := strings.NewReader(${J(body)})`);
        L.push(`\treq, _ := http.NewRequest(${J(r.method)}, url, ${body ? 'payload' : 'nil'})`);
        r.headers.forEach(h => { const [k, v] = splitH(h); L.push(`\treq.Header.Add(${J(k)}, ${J(v)})`); });
        L.push('\tclient := &http.Client{}', '\tres, _ := client.Do(req)', '\tdefer res.Body.Close()', '\tbody, _ := io.ReadAll(res.Body)', '\tfmt.Println(string(body))', '}');
        return L.join('\n');
      },
    };
    const CV_LANGS = [['python', 'Python'], ['javascript', 'JavaScript'], ['node', 'Node.js'], ['php', 'PHP'], ['go', 'Go']];
    let cvLang = 'python';
    const CONVERTER = {
      form: () => `
        ${field('curl command', `<textarea id="cv-in" rows="5" placeholder="curl 'https://api.example.com/login' -X POST -H 'Content-Type: application/json' -d '{&quot;user&quot;:&quot;admin&quot;}'"></textarea>`)}
        <div class="not-formats" id="cv-langs">${CV_LANGS.map(([id, n]) => `<button class="not-fmt cv-lang${id === cvLang ? ' active' : ''}" data-lang="${id}">${n}</button>`).join('')}</div>
      `,
      build: () => {
        const raw = v('cv-in');
        if (!raw.trim()) return '# paste a curl command above';
        const r = parseCurl(raw);
        if (!r || !r.url) return '# could not find a URL in that curl command';
        try { return cvGen[cvLang](r); } catch (e) { return '# error: ' + e.message; }
      }
    };

    const builders = { nmap: NMAP, curl: CURL, converter: CONVERTER };
    let tab = 'nmap';
    const update = () => {
      $('#cb-outlabel').textContent = tab === 'converter' ? 'Code' : 'Command';
      $('#cb-out').textContent = builders[tab].build();
    };
    const mount = () => {
      $('#cb-form').innerHTML = builders[tab].form();
      $$('#cb-form input, #cb-form select, #cb-form textarea').forEach(e => { e.addEventListener('input', update); e.addEventListener('change', update); });
      $$('#cb-form .cv-lang').forEach(b => b.addEventListener('click', () => {
        cvLang = b.dataset.lang;
        $$('#cb-form .cv-lang').forEach(x => x.classList.toggle('active', x === b));
        update();
      }));
      if (window.translateUI) window.translateUI();
      update();
    };
    $$('.not-fmt', $('#cb-tabs')).forEach(b => b.addEventListener('click', () => {
      tab = b.dataset.b;
      $$('.not-fmt', $('#cb-tabs')).forEach(x => x.classList.toggle('active', x === b));
      mount();
    }));
    wireCopy('cb-copy', () => $('#cb-out').textContent);
    mount();
  }
};

// ===== HTTP STATUS & PORT REFERENCE =====
const HTTP_STATUS = [
  [100, 'Continue', 'Headers received; client should send the request body.'],
  [101, 'Switching Protocols', 'Server is switching protocols (e.g. to WebSocket).'],
  [103, 'Early Hints', 'Preload hints sent before the final response.'],
  [200, 'OK', 'Standard success.'],
  [201, 'Created', 'Resource created (check the Location header).'],
  [202, 'Accepted', 'Accepted for async processing.'],
  [204, 'No Content', 'Success with no body; common for DELETE / PUT.'],
  [206, 'Partial Content', 'Range request served; probe Range header handling.'],
  [301, 'Moved Permanently', 'Permanent redirect; inspect Location for open-redirect.'],
  [302, 'Found', 'Temporary redirect; classic open-redirect sink.'],
  [303, 'See Other', 'Redirect to a GET resource after POST.'],
  [304, 'Not Modified', 'Cached copy is still valid (conditional request).'],
  [307, 'Temporary Redirect', 'Like 302 but keeps the method/body.'],
  [308, 'Permanent Redirect', 'Like 301 but keeps the method/body.'],
  [400, 'Bad Request', 'Malformed request; often from injection / bad parsing.'],
  [401, 'Unauthorized', 'Authentication required or failed (check WWW-Authenticate).'],
  [403, 'Forbidden', 'Access denied; try bypasses: X-Original-URL, ..;/, path case, verb change.'],
  [404, 'Not Found', 'No such resource; fuzz for hidden paths.'],
  [405, 'Method Not Allowed', 'Verb blocked; try GET/POST/PUT/PATCH/DELETE/HEAD (check Allow).'],
  [406, 'Not Acceptable', 'Server cannot match the Accept header.'],
  [407, 'Proxy Authentication Required', 'Auth needed at a proxy.'],
  [408, 'Request Timeout', 'Client too slow; relevant to time-based / Slowloris.'],
  [409, 'Conflict', 'State conflict; watch for race conditions.'],
  [410, 'Gone', 'Resource permanently removed.'],
  [411, 'Length Required', 'Content-Length header is required.'],
  [413, 'Payload Too Large', 'Body exceeds the server limit (DoS / upload limit).'],
  [414, 'URI Too Long', 'URL exceeds the limit; relevant to long-URL attacks.'],
  [415, 'Unsupported Media Type', 'Content-Type rejected; try alternates to bypass filters.'],
  [418, "I'm a Teapot", 'Joke code (RFC 2324); sometimes a WAF/bot block tell.'],
  [421, 'Misdirected Request', 'Wrong server for this connection; HTTP/2 host confusion.'],
  [422, 'Unprocessable Content', 'Validation failed on a well-formed request.'],
  [426, 'Upgrade Required', 'Client must switch protocols.'],
  [429, 'Too Many Requests', 'Rate limited; try IP rotation, casing, or header tricks to bypass.'],
  [431, 'Request Header Fields Too Large', 'Headers exceed the limit.'],
  [451, 'Unavailable For Legal Reasons', 'Blocked for legal/censorship reasons.'],
  [500, 'Internal Server Error', 'Unhandled error; stack traces here often leak internals.'],
  [501, 'Not Implemented', 'Method/feature not supported by the server.'],
  [502, 'Bad Gateway', 'Bad upstream response; possible SSRF / proxy misconfig.'],
  [503, 'Service Unavailable', 'Overloaded or down; watch for Retry-After.'],
  [504, 'Gateway Timeout', 'Upstream timed out; useful signal for blind SSRF / time-based.'],
  [505, 'HTTP Version Not Supported', 'Server rejects the HTTP version.'],
  [507, 'Insufficient Storage', 'Server out of storage (WebDAV).'],
  [508, 'Loop Detected', 'Infinite loop in processing (WebDAV).'],
  [511, 'Network Authentication Required', 'Captive portal wants authentication.'],
  [444, 'No Response (nginx)', 'nginx closed the connection with no response.'],
  [499, 'Client Closed Request (nginx)', 'Client disconnected before the server replied.'],
  [520, 'Unknown Error (Cloudflare)', 'Origin returned something unexpected to Cloudflare.'],
  [521, 'Web Server Is Down (Cloudflare)', 'Origin refused the connection; hint to find the origin IP.'],
  [522, 'Connection Timed Out (Cloudflare)', 'Cloudflare could not reach the origin.'],
  [523, 'Origin Is Unreachable (Cloudflare)', 'Origin host unreachable.'],
  [525, 'SSL Handshake Failed (Cloudflare)', 'TLS handshake with the origin failed.'],
];
const HTTP_CLASS = { 1: 'Informational', 2: 'Success', 3: 'Redirection', 4: 'Client Error', 5: 'Server Error' };
const COMMON_PORTS = [
  [21, 'TCP', 'FTP', 'File transfer; check anon login and cleartext creds.'],
  [22, 'TCP', 'SSH', 'Remote shell; banner-grab, key/user enum, weak creds.'],
  [23, 'TCP', 'Telnet', 'Cleartext remote shell; high-value, often default creds.'],
  [25, 'TCP', 'SMTP', 'Mail; user enum (VRFY), open relay.'],
  [53, 'TCP/UDP', 'DNS', 'Name resolution; try zone transfer (AXFR).'],
  [69, 'UDP', 'TFTP', 'No-auth file transfer; grab configs.'],
  [80, 'TCP', 'HTTP', 'Web; the main app attack surface.'],
  [110, 'TCP', 'POP3', 'Cleartext mail retrieval.'],
  [111, 'TCP/UDP', 'RPCbind', 'Portmapper; enumerate RPC services / NFS.'],
  [123, 'UDP', 'NTP', 'Time; monlist amplification.'],
  [135, 'TCP', 'MSRPC', 'Windows RPC endpoint mapper.'],
  [139, 'TCP', 'NetBIOS-SSN', 'Legacy Windows file sharing.'],
  [143, 'TCP', 'IMAP', 'Cleartext mail access.'],
  [161, 'UDP', 'SNMP', 'Device mgmt; try community strings public/private.'],
  [389, 'TCP', 'LDAP', 'Directory; anon bind, user enum.'],
  [443, 'TCP', 'HTTPS', 'Web over TLS; inspect cert for hostnames.'],
  [445, 'TCP', 'SMB', 'Windows file sharing; EternalBlue, null sessions, shares.'],
  [465, 'TCP', 'SMTPS', 'SMTP over TLS.'],
  [500, 'UDP', 'IKE/IPsec', 'VPN; aggressive-mode PSK capture.'],
  [512, 'TCP', 'rexec', 'Legacy remote exec.'],
  [513, 'TCP', 'rlogin', 'Legacy remote login; trust abuse.'],
  [514, 'UDP', 'syslog', 'Log collection; injection / spoofing.'],
  [587, 'TCP', 'SMTP (submission)', 'Authenticated mail submission.'],
  [623, 'UDP', 'IPMI', 'Out-of-band mgmt; auth bypass, hash dump.'],
  [636, 'TCP', 'LDAPS', 'LDAP over TLS.'],
  [873, 'TCP', 'rsync', 'File sync; often unauthenticated modules.'],
  [993, 'TCP', 'IMAPS', 'IMAP over TLS.'],
  [995, 'TCP', 'POP3S', 'POP3 over TLS.'],
  [1080, 'TCP', 'SOCKS', 'Proxy; open proxy / pivot.'],
  [1099, 'TCP', 'Java RMI', 'Deserialization RCE.'],
  [1433, 'TCP', 'MSSQL', 'SQL Server; xp_cmdshell, weak sa.'],
  [1521, 'TCP', 'Oracle DB', 'TNS; SID enum, default creds.'],
  [1723, 'TCP', 'PPTP', 'Legacy VPN.'],
  [2049, 'TCP', 'NFS', 'Network file share; no_root_squash exports.'],
  [2375, 'TCP', 'Docker API', 'Unauth Docker daemon = host RCE.'],
  [2379, 'TCP', 'etcd', 'K8s key-value store; secrets if unauth.'],
  [3128, 'TCP', 'Squid Proxy', 'HTTP proxy; open proxy / SSRF pivot.'],
  [3306, 'TCP', 'MySQL', 'Database; weak/empty root.'],
  [3389, 'TCP', 'RDP', 'Windows remote desktop; BlueKeep, weak creds.'],
  [4444, 'TCP', 'Metasploit', 'Default Meterpreter handler port.'],
  [4505, 'TCP', 'SaltStack', 'Salt master; CVE-2020-11651 auth bypass.'],
  [5432, 'TCP', 'PostgreSQL', 'Database; weak creds, COPY TO/FROM RCE.'],
  [5601, 'TCP', 'Kibana', 'ES dashboard; old RCEs, data exposure.'],
  [5672, 'TCP', 'AMQP/RabbitMQ', 'Message queue; guest/guest default.'],
  [5900, 'TCP', 'VNC', 'Remote desktop; no/weak auth.'],
  [5984, 'TCP', 'CouchDB', 'NoSQL; unauth admin, CVE-2017-12635.'],
  [5985, 'TCP', 'WinRM', 'Windows remote mgmt; creds = shell (evil-winrm).'],
  [6379, 'TCP', 'Redis', 'Often no auth; RCE via module / cron / SSH key write.'],
  [6443, 'TCP', 'Kubernetes API', 'Cluster control; anon access = takeover.'],
  [7001, 'TCP', 'WebLogic', 'Java app server; many deserialization RCEs.'],
  [8000, 'TCP', 'HTTP-alt', 'Dev servers / apps.'],
  [8080, 'TCP', 'HTTP-proxy/alt', 'Tomcat, proxies, dev apps.'],
  [8443, 'TCP', 'HTTPS-alt', 'Alt TLS web / admin consoles.'],
  [8086, 'TCP', 'InfluxDB', 'Time-series DB; unauth queries.'],
  [8089, 'TCP', 'Splunk', 'Mgmt API; RCE via app upload.'],
  [8500, 'TCP', 'Consul', 'Service mesh; unauth = RCE via services.'],
  [8888, 'TCP', 'Jupyter/alt', 'Notebooks = code execution if open.'],
  [9000, 'TCP', 'PHP-FPM/SonarQube', 'FastCGI RCE; or SonarQube.'],
  [9092, 'TCP', 'Kafka', 'Message broker; unauth topic access.'],
  [9200, 'TCP', 'Elasticsearch', 'Often unauth; data dump, old RCEs.'],
  [9418, 'TCP', 'Git', 'git:// protocol; repo exposure.'],
  [10000, 'TCP', 'Webmin', 'Admin panel; CVE-2019-15107 RCE.'],
  [11211, 'TCP', 'Memcached', 'No auth; cache dump, UDP amplification.'],
  [15672, 'TCP', 'RabbitMQ Mgmt', 'Web UI; guest/guest default.'],
  [27017, 'TCP', 'MongoDB', 'Often no auth; full DB read/write.'],
  [50070, 'TCP', 'Hadoop HDFS', 'NameNode UI; unauth, YARN RCE nearby.'],
];

TOOLS['http-ref'] = {
  title: 'HTTP & Port Reference',
  desc: 'Searchable reference of HTTP status codes and common ports, with pentest notes.',
  render() {
    return `
      <div class="tool">
        ${card('Reference', `
          <div class="not-formats" id="ref-tabs">
            <button class="not-fmt active" data-t="status">HTTP Status</button>
            <button class="not-fmt" data-t="ports">Ports</button>
          </div>
          <input type="text" class="input ref-search" id="ref-search" placeholder="Filter by code, name, service or keyword..." autocomplete="off">
          <div id="ref-body"></div>
        `)}
      </div>`;
  },
  init() {
    const statusBody = () => {
      let html = '', last = 0;
      [...HTTP_STATUS].sort((a, b) => a[0] - b[0]).forEach(([code, name, desc]) => {
        const cls = Math.floor(code / 100);
        if (cls !== last) { html += `<div class="ref-group">${cls}xx ${HTTP_CLASS[cls]}</div>`; last = cls; }
        html += `<div class="ref-row" data-f="${escapeHtml((code + ' ' + name + ' ' + desc).toLowerCase())}"><code class="ref-code ref-${cls}xx">${code}</code><span class="ref-name">${escapeHtml(name)}</span><span class="ref-desc">${escapeHtml(desc)}</span></div>`;
      });
      return html;
    };
    const portsBody = () => COMMON_PORTS.map(([port, proto, svc, desc]) =>
      `<div class="ref-row" data-f="${escapeHtml((port + ' ' + proto + ' ' + svc + ' ' + desc).toLowerCase())}"><code class="ref-code">${port}</code><span class="ref-name">${escapeHtml(svc)} <span class="ref-proto">${proto}</span></span><span class="ref-desc">${escapeHtml(desc)}</span></div>`
    ).join('');
    const body = $('#ref-body'), search = $('#ref-search');
    let tab = 'status';
    const filter = () => {
      const q = search.value.trim().toLowerCase();
      let any = false;
      $$('.ref-row', body).forEach(r => { const show = !q || r.dataset.f.includes(q); r.style.display = show ? '' : 'none'; if (show) any = true; });
      $$('.ref-group', body).forEach(g => { let n = g.nextElementSibling, vis = false; while (n && !n.classList.contains('ref-group')) { if (n.classList.contains('ref-row') && n.style.display !== 'none') { vis = true; break; } n = n.nextElementSibling; } g.style.display = vis ? '' : 'none'; });
      let em = $('.ref-empty', body); if (!any) { if (!em) { em = el('div', { class: 'ref-empty' }, 'No matches.'); body.appendChild(em); } em.style.display = ''; } else if (em) em.style.display = 'none';
    };
    const mount = () => { body.innerHTML = tab === 'ports' ? portsBody() : statusBody(); filter(); };
    $$('.not-fmt', $('#ref-tabs')).forEach(b => b.addEventListener('click', () => {
      tab = b.dataset.t;
      $$('.not-fmt', $('#ref-tabs')).forEach(x => x.classList.toggle('active', x === b));
      mount();
    }));
    search.addEventListener('input', filter);
    mount();
  }
};

