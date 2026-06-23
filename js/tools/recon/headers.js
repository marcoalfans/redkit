// RedKit · recon/headers.js (split from recon.js)
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
      const grade2Key = grade2; // grade2 is only ever A/B/C
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

