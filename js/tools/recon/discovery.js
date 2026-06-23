// RedKit · recon/discovery.js (split from recon.js)
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

