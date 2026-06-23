// RedKit · crypto/encoders.js (split from crypto.js)
// ----- Combined Base tool (Base16/32/36/45/58/62/64/85/91 in one, ordered by radix) -----
const BASE_TYPES = [['base16', 'Base16 (Hex)'], ['base32', 'Base32'], ['base36', 'Base36'], ['base45', 'Base45'], ['base58', 'Base58'], ['base62', 'Base62'], ['base64', 'Base64'], ['base85', 'Base85 / ASCII85'], ['base91', 'Base91']];
TOOLS['base'] = {
  title: 'Base Encoding',
  desc: 'Encode and decode text across Base16, Base32, Base36, Base45, Base58, Base62, Base64, Base85, and Base91 in one place.',
  render: () => transcoderTemplate('base', {
    typeSelect: `<select id="base-type">${BASE_TYPES.map(([v, l]) => `<option value="${v}"${v === 'base64' ? ' selected' : ''}>${l}</option>`).join('')}</select>`,
  }),
  init: () => wireTranscoder('base', () => CODECS[$('#base-type').value] || CODECS.base64),
};

// xxd-style hex dump: "offset  hex bytes  ASCII" (16 bytes/row), capped to keep the DOM light
const hexdump = (bytes) => {
  const max = Math.min(bytes.length, 8192), lines = [];
  for (let i = 0; i < max; i += 16) {
    const slice = bytes.slice(i, i + 16);
    const hex = slice.map(b => b.toString(16).padStart(2, '0')).join(' ');
    const ascii = slice.map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '.').join('');
    lines.push(i.toString(16).padStart(8, '0') + '  ' + hex.padEnd(47) + '  ' + ascii);
  }
  if (bytes.length > max) lines.push(`… ${bytes.length - max} more bytes`);
  return lines.join('\n');
};

// ----- Single-scheme transcoder tools -----
TOOLS['url-encode']  = { title: 'URL Encode/Decode',  desc: 'Decode and encode URL percent-encoding, with double/triple/quadruple layers for WAF bypass.', render: () => transcoderTemplate('urlc'),  init: () => wireTranscoder('urlc', () => CODECS.url) };
TOOLS['html-encode'] = { title: 'HTML Encode/Decode', desc: 'Encode and decode HTML entities for safe markup and payloads.',           render: () => transcoderTemplate('htm'),   init: () => wireTranscoder('htm', () => CODECS.html) };
TOOLS['hex']         = {
  title: 'Hex Encode/Decode',
  desc: 'Convert between text and hexadecimal bytes, with a hex dump (offset / hex / ASCII).',
  render: () => transcoderTemplate('hex') + `<div class="tool"><div class="card" id="hex-dump-card" style="display:none"><div class="result-header"><h4>Hex dump</h4><button class="btn btn-ghost" id="hex-dump-copy">Copy</button></div><pre class="hexdump mono" id="hex-dump"></pre></div></div>`,
  init() {
    wireTranscoder('hex', () => CODECS.hex, (dir, input) => {
      const cardEl = $('#hex-dump-card'), pre = $('#hex-dump');
      let bytes;
      if (dir === 'dec') {
        const clean = input.replace(/[^0-9a-fA-F]/g, '');
        if (clean.length % 2) { cardEl.style.display = 'none'; return; }
        bytes = (clean.match(/../g) || []).map(h => parseInt(h, 16));
      } else {
        bytes = [...new TextEncoder().encode(input)];
      }
      if (!bytes.length) { cardEl.style.display = 'none'; return; }
      pre.textContent = hexdump(bytes);
      cardEl.style.display = 'block';
    });
    wireCopy('hex-dump-copy', () => $('#hex-dump').textContent);
  }
};
TOOLS['binary']      = { title: 'Binary Encode/Decode', desc: 'Convert text to 8-bit binary and back.',          render: () => transcoderTemplate('bin'),   init: () => wireTranscoder('bin', () => CODECS.binary) };
TOOLS['morse']       = { title: 'Morse Code',         desc: 'Convert text to and from International Morse code.', render: () => transcoderTemplate('morse'), init: () => wireTranscoder('morse', () => CODECS.morse) };

