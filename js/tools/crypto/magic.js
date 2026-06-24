// RedKit · crypto/magic.js (split from crypto.js)
// ===== MAGIC, auto-detect encoding(s), CyberChef-style =====
const rot13 = s => s.replace(/[a-zA-Z]/g, c => { const b = c <= 'Z' ? 65 : 97; return String.fromCharCode((c.charCodeAt(0) - b + 13) % 26 + b); });
const rot47 = s => s.replace(/[!-~]/g, c => String.fromCharCode(33 + (c.charCodeAt(0) - 33 + 47) % 94));
const b64urlDec = s => b64Dec(s.replace(/-/g, '+').replace(/_/g, '/'));
const decBytesDec = (s) => {
  const nums = s.trim().split(/[\s,]+/).map(x => parseInt(x, 10));
  if (!nums.length || nums.some(n => !Number.isInteger(n) || n < 0 || n > 0x10FFFF)) throw new Error('not decimal bytes');
  return nums.map(n => String.fromCodePoint(n)).join('');
};
const jwtDecode = (s) => {
  const parts = s.trim().split('.');
  const dec = x => b64Dec(x.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.stringify({ header: JSON.parse(dec(parts[0])), payload: JSON.parse(dec(parts[1])) }, null, 2);
};
// Shannon entropy (bits/char), low ≈ plain text, ~4 ≈ base64/hex, ~7.5+ ≈ encrypted/compressed
const shannonEntropy = (s) => {
  if (!s) return 0;
  const f = {}; for (const c of s) f[c] = (f[c] || 0) + 1;
  const n = s.length; let h = 0;
  for (const k in f) { const p = f[k] / n; h -= p * Math.log2(p); }
  return h;
};
// label what a decoded string looks like, for a quick "this is the answer" hint
const sniffType = (s) => {
  const t = s.trim();
  if (!t) return null;
  if ((t[0] === '{' || t[0] === '[')) { try { JSON.parse(t); return 'JSON'; } catch (e) {} }
  if (/^-----BEGIN [^-]+-----/.test(t)) return 'PEM';
  if (/^eyJ[A-Za-z0-9_-]+\.eyJ/.test(t)) return 'JWT';
  if (/^https?:\/\/\S+$/i.test(t)) return 'URL';
  if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(t)) return 'Email';
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(t)) return 'IPv4';
  if (/^<(\?xml|!doctype|html|svg|[a-z]+[\s>/])/i.test(t)) return 'XML/HTML';
  if (/[a-z0-9_]{2,}\{[^}]{2,}\}/i.test(t)) return 'flag';
  return null;
};
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
  if (/[a-z0-9_]+\{[^}]{2,}\}/i.test(s)) score += 0.4;   // flag{...}
  const sp = spaces / n; if (sp > 0.04 && sp < 0.25) score += 0.05;
  if (letters / n > 0.5) score += 0.05;
  if (sniffType(s)) score += 0.5;   // recognized structured output (URL, Email, IPv4, JSON, JWT, PEM, …) → likely the answer
  return score;
};
const MAGIC_OPS = [
  { label: 'Decode JWT',  test: s => /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/.test(s.trim()), run: jwtDecode },
  { label: 'From Base64', test: s => { const t = s.replace(/\s+/g, ''); return /^[A-Za-z0-9+/]{8,}={0,2}$/.test(t) && t.length % 4 !== 1; }, run: b64Dec },
  { label: 'From Base64 (URL-safe)', test: s => { const t = s.replace(/\s+/g, ''); return /[-_]/.test(t) && /^[A-Za-z0-9_-]{8,}={0,2}$/.test(t); }, run: b64urlDec },
  { label: 'From Hex',    test: s => { const t = s.replace(/\s+/g, ''); return /^[0-9a-fA-F]{4,}$/.test(t) && t.length % 2 === 0; }, run: hexDec },
  { label: 'From Decimal', test: s => /^\s*\d{1,7}([\s,]+\d{1,7}){2,}\s*$/.test(s), run: decBytesDec },
  { label: 'From Base32', test: s => /^[A-Z2-7]{8,}=*$/i.test(s.replace(/\s+/g, '')), run: base32Decode },
  { label: 'From Binary', test: s => /^[01\s]{8,}$/.test(s) && s.replace(/[^01]/g, '').length % 8 === 0, run: binaryDecode },
  { label: 'URL Decode',  test: s => /%[0-9a-fA-F]{2}/.test(s), run: decodeURIComponent },
  { label: 'HTML Decode', test: s => /&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/.test(s), run: htmlDec },
  { label: 'From Base58', test: s => /^[1-9A-HJ-NP-Za-km-z]{6,}$/.test(s.replace(/\s+/g, '')), run: base58Decode },
  { label: 'From Base85', test: s => { const t = s.replace(/\s+/g, ''); return /^[\x21-\x75]{5,}$/.test(t) && /[a-z]/i.test(t) && /[!-/:-@[-`]/.test(t); }, run: base85Decode },
  { label: 'From Base45', test: s => { const t = s.replace(/[\r\n\t]/g, ''); return t.length >= 4 && t.length % 3 !== 1 && /^[0-9A-Z $%*+\-.\/:]+$/.test(t) && /[ $%*+\-.\/:]/.test(t); }, run: base45Decode },
  { label: 'From Morse',  test: s => /^[.\-/\s]{3,}$/.test(s) && /[.\-]/.test(s), run: morseDecode },
  { label: 'ROT13',       test: s => { const a = (s.match(/[a-z]/gi) || []).length; return a >= 3 && a / s.length > 0.6; }, run: rot13 },
  { label: 'ROT47',       test: s => { const t = s.replace(/\s/g, ''); if (t.length < 6) return false; const p = (t.match(/[!-~]/g) || []).length; return /\s/.test(s.trim()) && p / t.length > 0.95 && /[!-/:-@[-`{-~]/.test(t); }, run: rot47 },
];
const magicSearch = (input, maxDepth = 8) => {
  const results = [], seen = new Set();
  const walk = (str, depth, chain) => {
    if (depth > maxDepth || results.length > 400) return;
    for (const op of MAGIC_OPS) {
      if (chain.length > 0 && /ROT/.test(op.label)) continue; // ROT ciphers only make sense at the top level
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
  desc: 'Auto-detect and recursively decode nested encodings, with entropy analysis and output-type detection.',
  render: () => `
    <div class="tool">
      ${card('Input', field('Paste encoded / obfuscated data', `<textarea id="magic-in" class="tc-area" placeholder="e.g. ZmxhZ3tyZWRraXRfbWFnaWN9" autocomplete="off" spellcheck="false"></textarea>`) + `<div id="magic-info" class="mg-info" data-noi18n></div>`)}
      ${card('', resultHead('Detected candidates', `<label class="mg-depth" title="How many nested decode layers to search">max depth <select id="magic-depth">${[1, 2, 3, 4, 5, 6, 8, 10, 12].map(d => `<option value="${d}"${d === 8 ? ' selected' : ''}>${d}</option>`).join('')}</select></label>`) + `<div id="magic-out"></div>`)}
    </div>`,
  init() {
    const box = $('#magic-out'), info = $('#magic-info');
    const run = () => {
      const v = $('#magic-in').value.trim();
      if (!v) { info.innerHTML = ''; box.innerHTML = '<div class="mg-empty">Waiting for input…</div>'; return; }
      // input analysis: size, entropy, and which top-level ops match
      const ent = shannonEntropy(v);
      const entHint = ent < 3.5 ? 'low / repetitive' : ent < 5 ? 'text / hex range' : ent < 6.2 ? 'base64 range' : 'high, random/encrypted?';
      const matched = MAGIC_OPS.filter(op => !/ROT/.test(op.label) && (() => { try { return op.test(v); } catch (e) { return false; } })()).map(op => op.label);
      info.innerHTML =
        `<span class="mg-chip">${[...v].length} chars</span>` +
        `<span class="mg-chip" title="Shannon entropy, bits per character">entropy ${ent.toFixed(2)} · ${entHint}</span>` +
        (printableScore(v) > 1.12 ? `<span class="mg-chip mg-chip-warn" title="The input itself reads as plain text, decode candidates below may be spurious">input already looks readable</span>` : '') +
        (matched.length ? `<span class="mg-chip-label">matches:</span>` + matched.map(m => `<span class="mg-chip mg-chip-op">${escapeHtml(m)}</span>`).join('')
                        : `<span class="mg-chip-label">no encoding pattern matched the input</span>`);
      const res = magicSearch(v, parseInt($('#magic-depth').value, 10) || 8);
      if (!res.length) { box.innerHTML = '<div class="mg-empty">No nested decoding found, the input may be plaintext, encrypted, or compressed. Try the Base / Hex tools manually.</div>'; return; }
      box.innerHTML = res.map((r, i) => {
        const conf = Math.max(4, Math.min(100, Math.round(r.score * 55)));
        const out = escapeHtml(r.output.length > 600 ? r.output.slice(0, 600) + '…' : r.output);
        const type = sniffType(r.output);
        return `<div class="mg-cand${i === 0 ? ' mg-top' : ''}">
          <div class="mg-chain">${r.chain.map(c => `<span class="mg-op">${escapeHtml(c)}</span>`).join('<span class="mg-arr">→</span>')}
            ${type ? `<span class="mg-badge">${escapeHtml(type)}</span>` : ''}
            <span class="mg-conf">${conf}%</span>
            <button class="btn btn-ghost mg-copy" data-i="${i}">Copy</button></div>
          <div class="mg-confbar" title="${conf}% confidence"><div class="mg-conffill" style="width:${conf}%"></div></div>
          <pre class="not-pre mono mg-result">${out}</pre>
        </div>`;
      }).join('');
      $$('.mg-copy', box).forEach(b => b.addEventListener('click', () => copy(res[+b.dataset.i].output)));
    };
    let t; $('#magic-in').addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 160); });
    $('#magic-depth').addEventListener('change', run);
    run();
  },
};

