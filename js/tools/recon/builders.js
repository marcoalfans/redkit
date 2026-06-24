// RedKit · recon/builders.js (split from recon.js)
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
    const chk = (id, label, on, t) => `<label class="pe-chk"${t ? ` data-tip="${escapeHtml(t)}"` : ''}><input type="checkbox" id="${id}"${on ? ' checked' : ''}> ${label}</label>`;
    const tip = (label, t) => `<span class="cb-tip" data-tip="${escapeHtml(t)}">${label}</span>`; // dotted-underline label with a hover tooltip
    const v = id => ($('#' + id) ? $('#' + id).value.trim() : '');
    const c = id => !!($('#' + id) && $('#' + id).checked);

    const NMAP = {
      form: () => `
        ${field(tip('Target(s)', 'Hosts to scan. Accepts a hostname, an IP, a CIDR like 10.0.0.0/24, or a range like 10.0.0.1-50. Separate several with spaces.'), `<input type="text" id="nm-target" value="scanme.nmap.org" placeholder="host, CIDR, or 10.0.0.1-50">`)}
        <div class="field-row">
          ${field(tip('Scan type', 'How Nmap probes ports. SYN is the fast default, connect works without root, UDP scans UDP services, Ping only checks if hosts are up, ACK maps firewall rules.'), `<select id="nm-scan">
            <option value="-sS">TCP SYN (-sS)</option>
            <option value="-sT">TCP connect (-sT)</option>
            <option value="-sU">UDP (-sU)</option>
            <option value="-sn">Ping / host discovery (-sn)</option>
            <option value="-sA">TCP ACK (-sA)</option>
          </select>`)}
          ${field(tip('Ports', 'Which ports to scan. The default covers the top 1000 most common ports.'), `<select id="nm-ports">
            <option value="">Default (top 1000)</option>
            <option value="--top-ports 100">Top 100</option>
            <option value="-F">Fast 100 (-F)</option>
            <option value="-p-">All 65535 (-p-)</option>
          </select>`)}
        </div>
        ${field(tip('Custom ports (overrides above)', 'Exact ports to scan, overriding the dropdown. Example: 22,80,443,8000-8100.'), `<input type="text" id="nm-pcustom" placeholder="e.g. 22,80,443,8000-8100">`)}
        <div class="field"><label>Options</label><div class="pe-flags">
          ${chk('nm-sv', '-sV version', true, 'Probe open ports to identify the running service and its version.')}${chk('nm-o', '-O OS', false, 'Guess the target operating system from its network fingerprint.')}${chk('nm-a', '-A aggressive', false, 'Turn on OS detection, version detection, default scripts, and traceroute together.')}${chk('nm-sc', '-sC default scripts', false, 'Run the default set of safe scripts against open ports.')}
          ${chk('nm-open', '--open', true, 'Show only open ports and hide closed or filtered ones.')}${chk('nm-pn', '-Pn no ping', false, 'Skip host discovery and assume the target is online. Useful when ping is blocked.')}${chk('nm-n', '-n no DNS', false, 'Do not resolve hostnames. This speeds up the scan.')}${chk('nm-v', '-v verbose', true, 'Print more detail while the scan runs.')}
        </div></div>
        <div class="field-row">
          ${field(tip('Timing', 'Scan speed. Higher is faster but noisier and less reliable. T4 is a good default, T2 is stealthier.'), `<select id="nm-timing"><option>-T2</option><option>-T3</option><option selected>-T4</option><option>-T5</option></select>`)}
          ${field(tip('NSE script', 'Run Nmap Scripting Engine scripts by name or category, such as vuln or http-title.'), `<input type="text" id="nm-script" placeholder="e.g. vuln, http-title">`)}
        </div>
        ${field(tip('Output basename (-oA)', 'Save the results to three files at once: name.nmap, name.gnmap, and name.xml.'), `<input type="text" id="nm-out" placeholder="writes name.nmap / .gnmap / .xml">`)}
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
        ${field(tip('URL', 'The full address to request, including https:// and any path or query string.'), `<input type="text" id="cu-url" placeholder="https://target.com/api/login">`)}
        <div class="field-row">
          ${field(tip('Method', 'HTTP verb to send. GET reads, POST sends data, PUT and PATCH update, DELETE removes.'), `<select id="cu-method">${['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map(m => `<option>${m}</option>`).join('')}</select>`)}
          ${field(tip('Content-Type', 'Format of the request body. JSON and form-urlencoded are the most common.'), `<select id="cu-ct">
            <option value="">(none)</option>
            <option value="application/json">application/json</option>
            <option value="application/x-www-form-urlencoded">x-www-form-urlencoded</option>
            <option value="multipart/form-data">multipart/form-data</option>
          </select>`)}
        </div>
        ${field(tip('Body / data (-d)', 'Payload sent with the request. This switches curl to POST unless you pick another method.'), `<textarea id="cu-data" rows="3" placeholder='{"user":"admin","pass":"x"}'></textarea>`)}
        ${field(tip('Extra headers (one per line: Key: Value)', 'Extra request headers, one per line, written as Name: value.'), `<textarea id="cu-headers" rows="2" placeholder="X-Api-Key: abc123"></textarea>`)}
        <div class="field-row">
          ${field(tip('Authorization (Bearer)', 'A bearer token. This adds an Authorization: Bearer header for you.'), `<input type="text" id="cu-auth" placeholder="token, adds Authorization: Bearer ...">`)}
          ${field(tip('Cookie (-b)', 'Cookies to send with the request, for example session=abc123.'), `<input type="text" id="cu-cookie" placeholder="session=...">`)}
        </div>
        <div class="field-row">
          ${field(tip('User-Agent', 'Override the User-Agent string the server sees.'), `<input type="text" id="cu-ua" placeholder="Mozilla/5.0 ...">`)}
          ${field(tip('Proxy (-x)', 'Send the request through a proxy, for example Burp on http://127.0.0.1:8080.'), `<input type="text" id="cu-proxy" placeholder="http://127.0.0.1:8080 (Burp)">`)}
        </div>
        <div class="field"><label>Options</label><div class="pe-flags">
          ${chk('cu-k', '-k insecure', false, 'Skip TLS certificate verification. Handy for self-signed or intercepted HTTPS.')}${chk('cu-l', '-L follow', true, 'Follow HTTP redirects automatically.')}${chk('cu-i', '-i include', false, 'Include the response headers in the output.')}${chk('cu-s', '-s silent', false, 'Hide the progress meter and error messages.')}
          ${chk('cu-v', '-v verbose', false, 'Show the full request and response, including headers, for debugging.')}${chk('cu-comp', '--compressed', false, 'Ask for and decode gzip or deflate compressed responses.')}${chk('cu-g', '-G data as query', false, 'Send the data fields in the URL query string instead of the body.')}
        </div></div>
        ${field(tip('Output file (-o)', 'Save the response body to a file instead of printing it.'), `<input type="text" id="cu-out" placeholder="e.g. resp.json">`)}
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
      const out = []; let cur = '', inS = false, inD = false, inA = false, has = false, i = 0;
      const ansi = { n: '\n', t: '\t', r: '\r', '\\': '\\', "'": "'", '"': '"' };
      while (i < s.length) {
        const ch = s[i];
        if (inA) { // ANSI-C quoting $'...' (Chrome "Copy as cURL")
          if (ch === '\\' && i + 1 < s.length) { const n = s[i + 1]; cur += (n in ansi ? ansi[n] : n); i += 2; continue; }
          if (ch === "'") inA = false; else cur += ch; i++; continue;
        }
        if (inS) { if (ch === "'") inS = false; else cur += ch; i++; continue; }
        if (inD) {
          if (ch === '\\' && i + 1 < s.length && '"\\$`'.includes(s[i + 1])) { cur += s[i + 1]; i += 2; continue; }
          if (ch === '"') inD = false; else cur += ch; i++; continue;
        }
        if (ch === '$' && s[i + 1] === "'") { inA = true; has = true; i += 2; continue; }
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
      wireTabs($('#cb-form'), 'lang', v => { cvLang = v; update(); });
      if (window.translateUI) window.translateUI();
      update();
    };
    wireTabs($('#cb-tabs'), 'b', v => { tab = v; mount(); });
    wireCopy('cb-copy', () => $('#cb-out').textContent);
    mount();
  }
};


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
    wireTabs($('#ref-tabs'), 't', v => { tab = v; mount(); });
    search.addEventListener('input', filter);
    mount();
  }
};

