/* ============================================================
   RedKit - i18n (EN / ID)
   Translates feature text only (tool descriptions, field labels,
   placeholders, tooltips and explanatory UI). English is the source;
   a DOM pass swaps known phrases to Indonesian when lang = id, so any
   string not in the dictionary (payloads, code, vectors) is left as is.
   ============================================================ */
(function () {
  const DICT = {
    // ---------- Tool descriptions (currentToolDesc) ----------
    'Build targeted Google dork queries to uncover exposed files, logins, and indexed pages on a domain.': 'Susun query Google dork yang tertarget untuk menemukan file, halaman login, dan halaman terindeks yang terekspos pada sebuah domain.',
    'Build Shodan queries to map a target exposed hosts, services, and open ports.': 'Susun query Shodan untuk memetakan host, layanan, dan port terbuka milik target.',
    'Enumerate a domain subdomains from public certificate transparency logs.': 'Enumerasi subdomain sebuah domain dari log certificate transparency publik.',
    'Extract endpoints, secrets, and interesting strings from JavaScript source.': 'Ekstrak endpoint, secret, dan string menarik dari kode sumber JavaScript.',
    'Review HTTP response headers and flag missing or weak security controls.': 'Tinjau header respons HTTP dan tandai kontrol keamanan yang hilang atau lemah.',
    'Look up any DNS record type quickly over encrypted DNS over HTTPS.': 'Cari semua jenis record DNS dengan cepat melalui DNS over HTTPS yang terenkripsi.',
    'Decompose any URL into its scheme, host, path, query, and fragment.': 'Uraikan URL apa pun menjadi scheme, host, path, query, dan fragment-nya.',
    'Look up geolocation, network, and ASN details for an IP or domain.': 'Cari detail geolokasi, jaringan, dan ASN dari sebuah IP atau domain.',
    'Encode and decode text across Base64, Base32, Base58, and Base85 in one place.': 'Encode dan decode teks dengan Base64, Base32, Base58, dan Base85 dalam satu tempat.',
    'Encode and decode URL percent-encoding as you type.': 'Encode dan decode URL percent-encoding secara langsung saat kamu mengetik.',
    'Encode and decode HTML entities for safe markup and payloads.': 'Encode dan decode HTML entity untuk markup dan payload yang aman.',
    'Convert text to hexadecimal bytes and back.': 'Ubah teks menjadi byte heksadesimal dan sebaliknya.',
    'Convert text to 8-bit binary and back.': 'Ubah teks menjadi biner 8-bit dan sebaliknya.',
    'Convert text to and from International Morse code.': 'Ubah teks dari dan ke kode Morse internasional.',
    'Detect unknown encodings and decode them automatically, including nested layers.': 'Deteksi encoding yang tidak diketahui dan decode secara otomatis, termasuk lapisan bertingkat.',
    'Generate MD5, SHA-1, SHA-256, SHA-512, and more from any input.': 'Hasilkan MD5, SHA-1, SHA-256, SHA-512, dan lainnya dari input apa pun.',
    'Identify an unknown hash by its length, character set, and format.': 'Identifikasi hash yang tidak diketahui berdasarkan panjang, kumpulan karakter, dan formatnya.',
    'Decode, edit, and re-sign JSON Web Tokens, including alg none and weak-secret attacks.': 'Decode, ubah, dan tanda tangani ulang JSON Web Token, termasuk serangan alg none dan secret lemah.',
    'Encrypt and decrypt classic ciphers including ROT13, Caesar, Atbash, and reverse.': 'Enkripsi dan dekripsi cipher klasik seperti ROT13, Caesar, Atbash, dan reverse.',
    'Turn a raw HTTP request into a working CSRF proof-of-concept form.': 'Ubah request HTTP mentah menjadi form proof-of-concept CSRF yang siap pakai.',
    'Generate large repeated payloads to test input validation limits.': 'Hasilkan payload berulang berukuran besar untuk menguji batas validasi input.',
    'A curated library of Cross-Site Scripting payloads, bypasses, and techniques.': 'Pustaka kurasi payload, bypass, dan teknik Cross-Site Scripting.',
    'A curated library of SQL Injection payloads and privilege escalation techniques.': 'Pustaka kurasi payload SQL Injection dan teknik eskalasi hak akses.',
    'Find and exploit Insecure Direct Object References with proven test patterns.': 'Temukan dan eksploitasi Insecure Direct Object Reference dengan pola uji yang teruji.',
    'Proven techniques to defeat CSRF protections and bypass token defenses.': 'Teknik teruji untuk menembus proteksi CSRF dan mem-bypass pertahanan token.',
    'Path traversal and file disclosure payloads, including server quirks and WAF bypasses.': 'Payload path traversal dan file disclosure, termasuk keanehan server dan bypass WAF.',
    'Exploit GraphQL APIs with ready-made introspection, IDOR, DoS, and injection queries.': 'Eksploitasi API GraphQL dengan query introspection, IDOR, DoS, dan injection siap pakai.',
    'Server-Side Request Forgery payloads for cloud metadata, internal hosts, and filter bypasses.': 'Payload Server-Side Request Forgery untuk metadata cloud, host internal, dan bypass filter.',
    'Score vulnerability severity with the CVSS 3.1 base metrics.': 'Nilai tingkat keparahan kerentanan dengan base metric CVSS 3.1.',
    'Score vulnerability severity with the CVSS 4.0 base metrics.': 'Nilai tingkat keparahan kerentanan dengan base metric CVSS 4.0.',
    'Build a clean, structured vulnerability report ready to submit.': 'Susun laporan kerentanan yang rapi dan terstruktur, siap dikirim.',
    'Convert identifiers between camelCase, snake_case, kebab-case, and more.': 'Ubah penamaan identifier antara camelCase, snake_case, kebab-case, dan lainnya.',
    'Generate reverse, bind, MSFVenom, and HoaxShell payloads with encoding and listeners.': 'Hasilkan payload reverse, bind, MSFVenom, dan HoaxShell lengkap dengan encoding dan listener.',
    'Encode a PowerShell command into multiple execution and obfuscation variants.': 'Encode perintah PowerShell menjadi berbagai varian eksekusi dan obfuscation.',

    // ---------- Field labels ----------
    'Affected URL(s)': 'URL Terdampak',
    'Caesar shift (for Caesar cipher)': 'Geser Caesar (untuk cipher Caesar)',
    'Command to encode': 'Perintah untuk di-encode',
    'CVSS Vector': 'Vektor CVSS',
    'CVSS Ver.': 'Versi CVSS',
    'Description': 'Deskripsi',
    'Domain (e.g., example.com)': 'Domain (mis. example.com)',
    'Domain or URL': 'Domain atau URL',
    'Encoding': 'Encoding',
    'Filename': 'Nama File',
    'Impact': 'Dampak',
    'IP address or domain': 'Alamat IP atau domain',
    'IP / Interface': 'IP / Antarmuka',
    'New Token': 'Token Baru',
    'One identifier or phrase per line': 'Satu identifier atau frasa per baris',
    'Organization': 'Organisasi',
    'Paste encoded / obfuscated data': 'Tempel data ter-encode / ter-obfuscate',
    'Paste JS source code (Right Click -> View Page Source or CTRL + U)': 'Tempel kode sumber JS (Klik Kanan -> View Page Source atau CTRL + U)',
    'Paste raw response headers': 'Tempel header respons mentah',
    'Paste the raw request (request line + headers + blank line + body)': 'Tempel request mentah (baris request + header + baris kosong + body)',
    'Record Type': 'Jenis Record',
    'References': 'Referensi',
    'Remediation': 'Remediasi',
    'Repetition count': 'Jumlah pengulangan',
    'Root domain (e.g., example.com)': 'Domain utama (mis. example.com)',
    'Score': 'Skor',
    'Secret (HMAC only)': 'Secret (khusus HMAC)',
    'Separator (optional)': 'Pemisah (opsional)',
    'Severity': 'Tingkat Keparahan',
    'Signing': 'Penandatanganan',
    'SSL/Certificate Name': 'Nama SSL/Sertifikat',
    'Submission': 'Pengiriman',
    'Text input': 'Input teks',
    'Vulnerability Name': 'Nama Kerentanan',
    'Vulnerability Type': 'Jenis Kerentanan',

    // ---------- Section / card / result headings ----------
    'Analysis': 'Analisis',
    'Components': 'Komponen',
    'Connection': 'Koneksi',
    'Decoded': 'Hasil Decode',
    'Detected candidates': 'Kandidat terdeteksi',
    'DNS Query': 'Query DNS',
    'Edit & Re-sign Token': 'Ubah & Tanda Tangani Ulang Token',
    'Fetch from URL': 'Ambil dari URL',
    'Generated Dorks': 'Dork yang Dihasilkan',
    'Generated PoC': 'PoC yang Dihasilkan',
    'Hash Information': 'Informasi Hash',
    'HTTP Response Headers': 'Header Respons HTTP',
    'Info': 'Info',
    'Input': 'Input',
    'JavaScript Source': 'Kode Sumber JavaScript',
    'JWT Token': 'Token JWT',
    'No findings': 'Tidak ada temuan',
    'Output': 'Output',
    'Payload Configuration': 'Konfigurasi Payload',
    'PowerShell Command': 'Perintah PowerShell',
    'Preview': 'Pratinjau',
    'Raw HTTP Request': 'Request HTTP Mentah',
    'Recommendations': 'Rekomendasi',
    'Records': 'Record',
    'Report (Markdown)': 'Laporan (Markdown)',
    'Shodan Queries': 'Query Shodan',
    'Subdomains': 'Subdomain',
    'Target': 'Target',
    'Target Domain': 'Domain Target',
    'Vulnerability Details': 'Detail Kerentanan',

    // ---------- CVSS metric group + metric names ----------
    'Base Metrics': 'Base Metric',
    'Exploitability': 'Exploitability',
    'Attack Vector': 'Vektor Serangan',
    'Attack Complexity': 'Kompleksitas Serangan',
    'Attack Requirements': 'Persyaratan Serangan',
    'Privileges Required': 'Hak Akses Dibutuhkan',
    'User Interaction': 'Interaksi Pengguna',
    'Scope': 'Cakupan',
    'Confidentiality': 'Kerahasiaan',
    'Integrity': 'Integritas',
    'Availability': 'Ketersediaan',
    'Vulnerable Confidentiality': 'Kerahasiaan (Sistem Rentan)',
    'Vulnerable Integrity': 'Integritas (Sistem Rentan)',
    'Vulnerable Availability': 'Ketersediaan (Sistem Rentan)',
    'Subsequent Confidentiality': 'Kerahasiaan (Sistem Lanjutan)',
    'Subsequent Integrity': 'Integritas (Sistem Lanjutan)',
    'Subsequent Availability': 'Ketersediaan (Sistem Lanjutan)',
    'Vulnerable System Impact': 'Dampak Sistem Rentan',
    'Subsequent System Impact': 'Dampak Sistem Lanjutan',

    // ---------- Buttons ----------
    '+ Add Reference': '+ Tambah Referensi',
    '+ Add URL': '+ Tambah URL',
    'Analyze': 'Analisis',
    'Analyze Headers': 'Analisis Header',
    'Clear': 'Bersihkan',
    'Copy': 'Salin',
    'Copy All': 'Salin Semua',
    'Copy Score': 'Salin Skor',
    'Copy Vector': 'Salin Vektor',
    'Decode & Edit': 'Decode & Ubah',
    'Download': 'Unduh',
    'Fetch & Analyze': 'Ambil & Analisis',
    'Generate': 'Hasilkan',
    'Generate & Download': 'Hasilkan & Unduh',
    'Generate Dorks': 'Hasilkan Dork',
    'Generate Hashes': 'Hasilkan Hash',
    'Generate Queries': 'Hasilkan Query',
    'Generate Report': 'Hasilkan Laporan',
    'Identify': 'Identifikasi',
    'Lookup': 'Cari',
    'Parse': 'Urai',
    'Rebuild Token': 'Bangun Ulang Token',
    'Reset': 'Reset',
    'Search Subdomains': 'Cari Subdomain',
    'Show More Info': 'Tampilkan Info Lainnya',
    'Try Common Secrets': 'Coba Secret Umum',

    // ---------- Prose placeholders ----------
    'Describe the impact and risk...': 'Jelaskan dampak dan risikonya...',
    'Describe the vulnerability...': 'Jelaskan kerentanannya...',
    'enter text...': 'masukkan teks...',
    'How to fix...': 'Cara memperbaiki...',
    'Filter payloads...': 'Filter payload...',
    'result…': 'hasil…',
    'type or paste…': 'ketik atau tempel…',
    'Select or type a vulnerability type': 'Pilih atau ketik jenis kerentanan',
    'e.g. Stored XSS in user profile bio': 'misal. Stored XSS pada bio profil pengguna',
    'OWASP / CWE / CVE link...': 'Tautan OWASP / CWE / CVE...',
    'paste hash here (e.g. 5d41402abc4b2a76b9719d911017c592)': 'tempel hash di sini (mis. 5d41402abc4b2a76b9719d911017c592)',
    '// paste js source here...': '// tempel kode js di sini...',
    'Step 1...\nStep 2...\nRequest/Payload...': 'Langkah 1...\nLangkah 2...\nRequest/Payload...',
  };

  const getLang = () => localStorage.getItem('lang') || 'en';
  const setLang = (l) => { localStorage.setItem('lang', l); document.documentElement.setAttribute('data-lang', l); };

  // swap a trimmed phrase while preserving surrounding whitespace
  const trText = (s) => { const k = s.trim(); if (!k) return s; const v = DICT[k]; return v === undefined ? s : s.replace(k, v); };
  const ATTRS = ['placeholder', 'data-tip', 'title'];
  const trEl = (e) => ATTRS.forEach(a => { if (e.hasAttribute && e.hasAttribute(a)) { const val = e.getAttribute(a), k = val.trim(); if (DICT[k] !== undefined) e.setAttribute(a, val.replace(k, DICT[k])); } });

  const translateNode = (root) => {
    if (getLang() !== 'id' || !root) return;
    if (root.nodeType === 3) { root.nodeValue = trText(root.nodeValue); return; }
    if (root.nodeType !== 1) return;
    trEl(root);
    root.querySelectorAll('[placeholder],[data-tip],[title]').forEach(trEl);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const arr = []; let n; while ((n = w.nextNode())) arr.push(n);
    arr.forEach(t => { t.nodeValue = trText(t.nodeValue); });
  };

  // re-translate the active tool's pane + description (called by loadTool)
  const translateUI = () => {
    document.documentElement.setAttribute('data-lang', getLang());
    if (getLang() !== 'id') return;
    translateNode(document.getElementById('currentToolDesc'));
    translateNode(document.getElementById('content'));
  };

  // dynamically inserted results (Generate, Lookup, ...) are translated on the fly
  let observer = null;
  const ensureObserver = () => {
    if (observer) return;
    const content = document.getElementById('content');
    if (!content) return;
    observer = new MutationObserver(muts => {
      if (getLang() !== 'id') return;
      for (const m of muts) m.addedNodes.forEach(translateNode);
    });
    observer.observe(content, { childList: true, subtree: true });
  };

  window.getLang = getLang;
  window.setLang = setLang;
  window.translateUI = translateUI;

  document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.setAttribute('data-lang', getLang());
    ensureObserver();
  });
})();
