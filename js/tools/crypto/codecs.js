// RedKit · crypto/codecs.js (split from crypto.js)
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
          <div class="tc-stat" id="${id}-lstat"></div>
        </div>
        <button class="tc-swap" id="${id}-swap" title="Swap direction"><i class="fas fa-right-left"></i></button>
        <div class="tc-pane">
          <div class="tc-head"><span class="tc-label" id="${id}-rlabel">N/A</span><span class="tc-head-btns"><button class="btn btn-ghost tc-copy" id="${id}-dl">Download</button><button class="btn btn-ghost tc-copy" id="${id}-copy">Copy</button></span></div>
          <textarea id="${id}-dst" class="tc-area tc-out" readonly placeholder="result…" spellcheck="false"></textarea>
          <div class="tc-stat" id="${id}-rstat"></div>
        </div>
      </div>
    </div>
    <div class="card" id="${id}-layers-card" style="display:none"><div class="card-title" id="${id}-layers-title">Layered encoding</div><div id="${id}-layers"></div></div>
  </div>
`;

// grow a textarea to fit its content (so long input/output expands the box
// downward instead of scrolling inside it); CSS min-height stays the floor.
const autosize = (el) => { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; };

const wireTranscoder = (id, getCodec, onConvert) => {
  const src = $(`#${id}-src`), dst = $(`#${id}-dst`), ll = $(`#${id}-llabel`), rl = $(`#${id}-rlabel`);
  const layCard = $(`#${id}-layers-card`), layBox = $(`#${id}-layers`), layTitle = $(`#${id}-layers-title`);
  const lstat = $(`#${id}-lstat`), rstat = $(`#${id}-rstat`);
  const stat = (s) => s ? `${[...s].length} chars · ${new TextEncoder().encode(s).length} bytes` : '';
  let dir = 'dec';   // default: left(encoded) → right(Text). 'enc' = left(Text) → right(encoded)
  const relabel = () => {
    const cl = getCodec().codeLabel;
    ll.textContent = dir === 'enc' ? 'Text' : cl;
    rl.textContent = dir === 'enc' ? cl : 'Text';
  };
  // show the input run through the codec 2-4 times (e.g. double/triple URL-encoding for WAF bypass)
  const renderLayers = (input) => {
    if (!layCard) return;
    const fn = dir === 'enc' ? getCodec().enc : getCodec().dec;
    layTitle.textContent = dir === 'enc' ? 'Layered encoding' : 'Layered decoding';
    let cur = input; const rows = [];
    try { cur = fn(cur); } catch (e) { layCard.style.display = 'none'; return; } // x1 (shown in the main pane)
    for (let n = 2; n <= 4; n++) {
      let next; try { next = fn(cur); } catch (e) { break; }
      if (next == null || next === '' || next === cur) break; // error / nothing / fully resolved
      cur = next; rows.push([n, cur]);
    }
    if (!input || !rows.length) { layCard.style.display = 'none'; return; }
    layBox.innerHTML = rows.map(([n, v]) =>
      `<div class="header-row"><span class="h-name">x${n}</span><span class="h-detail mono" style="font-family:'JetBrains Mono',monospace;color:var(--text)">${escapeHtml(v)}</span><button class="btn btn-ghost" data-copy="${escapeHtml(v)}">Copy</button></div>`).join('');
    wireCopyAll(layBox);
    layCard.style.display = 'block';
  };
  const convert = () => {
    const c = getCodec(), fn = dir === 'enc' ? c.enc : c.dec, input = src.value;
    if (input === '') { dst.value = ''; dst.classList.remove('tc-err'); }
    else {
      try { dst.value = fn(input) ?? ''; dst.classList.remove('tc-err'); }
      catch (e) { dst.value = '⚠ ' + (e.message || 'invalid input'); dst.classList.add('tc-err'); }
    }
    autosize(src); autosize(dst);
    if (lstat) lstat.textContent = stat(input);
    if (rstat) rstat.textContent = dst.classList.contains('tc-err') ? '' : stat(dst.value);
    renderLayers(input);
    if (onConvert) onConvert(dir, input, dst.value);
  };
  const dlBtn = $(`#${id}-dl`);
  if (dlBtn) dlBtn.addEventListener('click', () => { if (dst.value && !dst.classList.contains('tc-err')) download(`${id}-output.txt`, dst.value); });
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

// ===== BASE45 (RFC 9285), used by EU Digital COVID certificates =====
const B45_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
const base45Encode = (str) => {
  const bytes = new TextEncoder().encode(str);
  let out = '';
  for (let i = 0; i < bytes.length; i += 2) {
    if (i + 1 < bytes.length) {
      let n = bytes[i] * 256 + bytes[i + 1];           // 2 bytes → 3 base45 chars
      const c = n % 45; n = (n - c) / 45; const d = n % 45; const e = (n - d) / 45;
      out += B45_ALPHABET[c] + B45_ALPHABET[d] + B45_ALPHABET[e];
    } else {
      let n = bytes[i];                                 // 1 byte → 2 base45 chars
      const c = n % 45; const d = (n - c) / 45;
      out += B45_ALPHABET[c] + B45_ALPHABET[d];
    }
  }
  return out;
};
const base45Decode = (str) => {
  // NOTE: space (0x20) is a valid Base45 data character, so only strip line breaks/tabs (paste artifacts), never spaces
  const vals = [...str.replace(/[\r\n\t]/g, '')].map(ch => {
    const v = B45_ALPHABET.indexOf(ch);
    if (v < 0) throw new Error('invalid base45 character');
    return v;
  });
  const bytes = [];
  for (let i = 0; i < vals.length;) {
    const rem = vals.length - i;
    if (rem >= 3) {
      const n = vals[i] + vals[i + 1] * 45 + vals[i + 2] * 2025;
      if (n > 0xffff) throw new Error('invalid base45 group');
      bytes.push((n >> 8) & 0xff, n & 0xff); i += 3;
    } else if (rem === 2) {
      const n = vals[i] + vals[i + 1] * 45;
      if (n > 0xff) throw new Error('invalid base45 tail');
      bytes.push(n & 0xff); i += 2;
    } else throw new Error('invalid base45 length');
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
};

// ===== BASE36 / BASE62 (generic big-integer base, like Base58) =====
const bigBaseEncode = (str, alphabet) => {
  const base = BigInt(alphabet.length);
  const bytes = new TextEncoder().encode(str);
  if (!bytes.length) return '';
  let n = 0n;
  for (const b of bytes) n = n * 256n + BigInt(b);
  let out = '';
  while (n > 0n) { out = alphabet[Number(n % base)] + out; n /= base; }
  for (const b of bytes) { if (b === 0) out = alphabet[0] + out; else break; } // preserve leading zero bytes
  return out;
};
const bigBaseDecode = (str, alphabet) => {
  const base = BigInt(alphabet.length);
  str = str.replace(/\s/g, '');
  if (!str) return '';
  let n = 0n;
  for (const c of str) {
    const idx = alphabet.indexOf(c);
    if (idx === -1) throw new Error('Invalid character: ' + c);
    n = n * base + BigInt(idx);
  }
  const bytes = [];
  while (n > 0n) { bytes.unshift(Number(n & 0xffn)); n >>= 8n; }
  for (const c of str) { if (c === alphabet[0]) bytes.unshift(0); else break; }
  return new TextDecoder().decode(new Uint8Array(bytes));
};
const B36_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const B62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const base36Encode = (s) => bigBaseEncode(s, B36_ALPHABET);
const base36Decode = (s) => bigBaseDecode(s.toUpperCase(), B36_ALPHABET); // Base36 is case-insensitive
const base62Encode = (s) => bigBaseEncode(s, B62_ALPHABET);
const base62Decode = (s) => bigBaseDecode(s, B62_ALPHABET);

// ===== BASE91 (basE91 by Joachim Henke) =====
const B91_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,./:;<=>?@[]^_`{|}~\"";
const base91Encode = (str) => {
  const data = new TextEncoder().encode(str);
  let b = 0, n = 0, out = '';
  for (let i = 0; i < data.length; i++) {
    b |= data[i] << n; n += 8;
    if (n > 13) {
      let v = b & 8191;
      if (v > 88) { b >>= 13; n -= 13; } else { v = b & 16383; b >>= 14; n -= 14; }
      out += B91_ALPHABET[v % 91] + B91_ALPHABET[(v / 91) | 0];
    }
  }
  if (n) { out += B91_ALPHABET[b % 91]; if (n > 7 || b > 90) out += B91_ALPHABET[(b / 91) | 0]; }
  return out;
};
const base91Decode = (str) => {
  let v = -1, b = 0, n = 0; const out = [];
  for (const ch of str) {
    if (/\s/.test(ch)) continue;
    const c = B91_ALPHABET.indexOf(ch);
    if (c === -1) throw new Error('Invalid base91 character: ' + ch);
    if (v < 0) { v = c; }
    else {
      v += c * 91;
      b |= v << n;
      n += (v & 8191) > 88 ? 13 : 14;
      do { out.push(b & 255); b >>= 8; n -= 8; } while (n > 7);
      v = -1;
    }
  }
  if (v >= 0) out.push((b | v << n) & 255);
  return new TextDecoder().decode(new Uint8Array(out));
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
const b64Dec = s => { const t = s.replace(/\s+/g, ''); return decodeURIComponent(escape(atob(t + '='.repeat((4 - t.length % 4) % 4)))); };
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
  base16: { codeLabel: 'Base16 (Hex)', enc: hexEnc, dec: hexDec },
  base32: { codeLabel: 'Base32', enc: base32Encode, dec: base32Decode },
  base36: { codeLabel: 'Base36', enc: base36Encode, dec: base36Decode },
  base45: { codeLabel: 'Base45', enc: base45Encode, dec: base45Decode },
  base58: { codeLabel: 'Base58', enc: base58Encode, dec: base58Decode },
  base62: { codeLabel: 'Base62', enc: base62Encode, dec: base62Decode },
  base64: { codeLabel: 'Base64', enc: b64Enc, dec: b64Dec },
  base85: { codeLabel: 'Base85 / ASCII85', enc: base85Encode, dec: base85Decode },
  base91: { codeLabel: 'Base91', enc: base91Encode, dec: base91Decode },
  url:    { codeLabel: 'URL', enc: encodeURIComponent, dec: decodeURIComponent },
  html:   { codeLabel: 'HTML Entities', enc: htmlEnc, dec: htmlDec },
  hex:    { codeLabel: 'Hex', enc: hexEnc, dec: hexDec },
  binary: { codeLabel: 'Binary', enc: binaryEncode, dec: binaryDecode },
  morse:  { codeLabel: 'Morse', enc: morseEncode, dec: morseDecode },
};

