// RedKit · payloads/unicode.js
// ===== UNICODE / HOMOGLYPH / PUNYCODE =====
// Punycode (RFC 3492) — self-contained, used for IDN encode/decode.
const punycode = (() => {
  const maxInt = 2147483647, base = 36, tMin = 1, tMax = 26, skew = 38, damp = 700, initialBias = 72, initialN = 128, delim = '-';
  const baseMinusTMin = base - tMin;
  const decodeUcs2 = (s) => { const out = []; let i = 0; while (i < s.length) { const v = s.charCodeAt(i++); if (v >= 0xD800 && v <= 0xDBFF && i < s.length) { const e = s.charCodeAt(i++); if ((e & 0xFC00) === 0xDC00) out.push(((v & 0x3FF) << 10) + (e & 0x3FF) + 0x10000); else { out.push(v); i--; } } else out.push(v); } return out; };
  const basicToDigit = (cp) => { if (cp - 0x30 < 0x0A) return cp - 0x16; if (cp - 0x41 < 0x1A) return cp - 0x41; if (cp - 0x61 < 0x1A) return cp - 0x61; return base; };
  const digitToBasic = (d) => d + 22 + 75 * (d < 26 ? 1 : 0);
  const adapt = (delta, n, first) => { delta = first ? Math.floor(delta / damp) : delta >> 1; delta += Math.floor(delta / n); let k = 0; for (; delta > (baseMinusTMin * tMax >> 1); k += base) delta = Math.floor(delta / baseMinusTMin); return Math.floor(k + (baseMinusTMin + 1) * delta / (delta + skew)); };
  const decode = (input) => {
    const output = []; let n = initialN, i = 0, bias = initialBias;
    let basic = input.lastIndexOf(delim); if (basic < 0) basic = 0;
    for (let j = 0; j < basic; j++) { if (input.charCodeAt(j) >= 0x80) throw new Error('not-basic'); output.push(input.charCodeAt(j)); }
    for (let idx = basic > 0 ? basic + 1 : 0; idx < input.length;) {
      const oldi = i;
      for (let w = 1, k = base; ; k += base) {
        if (idx >= input.length) throw new Error('invalid input');
        const digit = basicToDigit(input.charCodeAt(idx++)); if (digit >= base) throw new Error('invalid input');
        i += digit * w; const t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
        if (digit < t) break; w *= base - t;
      }
      const out = output.length + 1; bias = adapt(i - oldi, out, oldi === 0);
      n += Math.floor(i / out); i %= out; output.splice(i++, 0, n);
    }
    return String.fromCodePoint(...output);
  };
  const encode = (input) => {
    const output = [], inp = decodeUcs2(input);
    let n = initialN, delta = 0, bias = initialBias;
    for (const cp of inp) if (cp < 0x80) output.push(String.fromCharCode(cp));
    const basicLen = output.length; let handled = basicLen;
    if (basicLen) output.push(delim);
    while (handled < inp.length) {
      let m = maxInt; for (const cp of inp) if (cp >= n && cp < m) m = cp;
      const h2 = handled + 1; if (m - n > Math.floor((maxInt - delta) / h2)) throw new Error('overflow');
      delta += (m - n) * h2; n = m;
      for (const cp of inp) {
        if (cp < n && ++delta > maxInt) throw new Error('overflow');
        if (cp === n) {
          let q = delta;
          for (let k = base; ; k += base) { const t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias); if (q < t) break; const qt = q - t, bt = base - t; output.push(String.fromCharCode(digitToBasic(t + qt % bt))); q = Math.floor(qt / bt); }
          output.push(String.fromCharCode(digitToBasic(q))); bias = adapt(delta, h2, handled === basicLen); delta = 0; handled++;
        }
      }
      delta++; n++;
    }
    return output.join('');
  };
  const toASCII = (domain) => domain.split('.').map(l => /[^\x00-\x7F]/.test(l) ? 'xn--' + encode(l) : l).join('.');
  const toUnicode = (domain) => domain.split('.').map(l => /^xn--/i.test(l) ? (() => { try { return decode(l.slice(4)); } catch (e) { return l; } })() : l).join('.');
  return { encode, decode, toASCII, toUnicode };
})();

// ASCII char -> visually-confusable Unicode lookalikes (curated, IDN-relevant)
const HOMOGLYPHS = {
  a: ['а', 'ɑ', 'α', 'ａ'], b: ['Ь', 'Ƅ', 'ｂ'], c: ['с', 'ϲ', 'ⅽ', 'ｃ'], d: ['ԁ', 'ⅾ', 'ｄ'],
  e: ['е', 'ė', 'ｅ'], f: ['ｆ'], g: ['ɡ', 'ｇ'], h: ['һ', 'ｈ'], i: ['і', 'ı', 'ⅰ'], j: ['ј', 'ｊ'],
  k: ['κ', 'ｋ'], l: ['ӏ', 'ⅼ', 'ｌ'], m: ['м', 'ｍ'], n: ['ո', 'ｎ'], o: ['о', 'ο', 'ｏ', '০'],
  p: ['р', 'ρ', 'ｐ'], q: ['ԛ', 'ｑ'], r: ['г', 'ｒ'], s: ['ѕ', 'ｓ'], t: ['τ', 'ｔ'], u: ['υ', 'ս', 'ｕ'],
  v: ['ѵ', 'ⅴ', 'ｖ'], w: ['ԝ', 'ｗ'], x: ['х', 'ⅹ', 'ｘ'], y: ['у', 'ʏ', 'ｙ'], z: ['ｚ'],
  '0': ['О', 'Ο', '০'], '1': ['Ⅰ', 'ⅼ', '１'], '2': ['２'], '3': ['Ʒ', '３'], '5': ['Ѕ'], '6': ['б'],
};
const CONFUSABLE_TO_ASCII = (() => { const m = {}; for (const [a, list] of Object.entries(HOMOGLYPHS)) for (const g of list) if (!(g in m)) m[g] = a; return m; })();

const INVISIBLE = {
  '​': 'ZERO WIDTH SPACE', '‌': 'ZERO WIDTH NON-JOINER', '‍': 'ZERO WIDTH JOINER',
  '⁠': 'WORD JOINER', '﻿': 'BYTE ORDER MARK', '­': 'SOFT HYPHEN', '᠎': 'MONGOLIAN VOWEL SEPARATOR',
  '‎': 'LEFT-TO-RIGHT MARK', '‏': 'RIGHT-TO-LEFT MARK', '‪': 'LEFT-TO-RIGHT EMBEDDING',
  '‭': 'LEFT-TO-RIGHT OVERRIDE', '‮': 'RIGHT-TO-LEFT OVERRIDE', '⁦': 'LEFT-TO-RIGHT ISOLATE',
  '⁩': 'POP DIRECTIONAL ISOLATE', ' ': 'NO-BREAK SPACE', '⠀': 'BRAILLE PATTERN BLANK',
};

const SCRIPT_RANGES = [
  [0x0041, 0x024F, 'Latin'], [0x0370, 0x03FF, 'Greek'], [0x0400, 0x04FF, 'Cyrillic'], [0x0500, 0x052F, 'Cyrillic'],
  [0x0530, 0x058F, 'Armenian'], [0x0590, 0x05FF, 'Hebrew'], [0x0600, 0x06FF, 'Arabic'], [0x0900, 0x097F, 'Devanagari'],
  [0x2150, 0x218F, 'Number Forms'], [0x3040, 0x309F, 'Hiragana'], [0x30A0, 0x30FF, 'Katakana'],
  [0x4E00, 0x9FFF, 'Han'], [0xAC00, 0xD7AF, 'Hangul'], [0xFF00, 0xFFEF, 'Fullwidth/Halfwidth'],
];
const scriptOf = (cp) => { if (cp < 0x80) return 'ASCII'; for (const [lo, hi, name] of SCRIPT_RANGES) if (cp >= lo && cp <= hi) return name; return 'Other'; };

const uniInfo = (ch) => {
  const cp = ch.codePointAt(0);
  const hex = 'U+' + cp.toString(16).toUpperCase().padStart(4, '0');
  return { ch, cp, hex, ascii: cp < 0x80, invisible: INVISIBLE[ch] || null, confusableOf: CONFUSABLE_TO_ASCII[ch] || null, script: scriptOf(cp) };
};
const asciiSkeleton = (text) => [...text].map(c => INVISIBLE[c] ? '' : (CONFUSABLE_TO_ASCII[c] || c)).join('');
const stripInvisible = (text) => [...text].filter(c => !INVISIBLE[c]).join('');

const homoglyphVariants = (text) => {
  const chars = [...text], variants = [];
  let full = '', changed = 0;
  for (const c of chars) { const o = HOMOGLYPHS[c.toLowerCase()]; if (o && o[0]) { full += o[0]; changed++; } else full += c; }
  if (changed) variants.push(full);
  chars.forEach((c, i) => { const o = HOMOGLYPHS[c.toLowerCase()]; if (!o) return; o.forEach(g => { const v = chars.slice(); v[i] = g; variants.push(v.join('')); }); });
  return [...new Set(variants)].filter(v => v !== text).slice(0, 40);
};

TOOLS['unicode'] = {
  title: 'Unicode / Homoglyph',
  desc: 'Inspect characters, spot confusable and invisible spoofing, and convert IDN punycode.',
  render() {
    return `
      <div class="tool">
        ${card('Input', `
          ${field('Text or domain', `<textarea id="uni-in" class="tc-area" rows="3" placeholder="paypal.com" autocomplete="off" spellcheck="false"></textarea>`)}
          <div class="not-formats" id="uni-tabs">
            <button class="not-fmt active" data-tab="inspect">Inspect</button>
            <button class="not-fmt" data-tab="homoglyph">Homoglyphs</button>
            <button class="not-fmt" data-tab="punycode">Punycode</button>
          </div>
        `)}
        ${card('', `<div id="uni-out"></div>`)}
      </div>`;
  },
  init() {
    const out = $('#uni-out');
    let tab = 'inspect';

    const renderInspect = (text) => {
      if (!text) return '<div class="mg-empty">Type or paste text to inspect.</div>';
      const chars = [...text].map(uniInfo);
      const nNon = chars.filter(c => !c.ascii && !c.invisible).length;
      const nConf = chars.filter(c => c.confusableOf).length;
      const nInv = chars.filter(c => c.invisible).length;
      const scripts = [...new Set(chars.filter(c => !c.invisible).map(c => c.script))];
      const nonAsciiScripts = scripts.filter(s => s !== 'ASCII');
      const mixed = scripts.includes('ASCII') && nonAsciiScripts.length > 0;
      const warns = [];
      if (nConf) warns.push(`${nConf} confusable character${nConf > 1 ? 's' : ''} that mimic ASCII`);
      if (nInv) warns.push(`${nInv} invisible / zero-width character${nInv > 1 ? 's' : ''}`);
      if (mixed) warns.push(`Mixed-script string (${scripts.join(', ')}): possible spoofing`);
      const chip = (c) => {
        const cls = c.invisible ? 'uni-inv' : c.confusableOf ? 'uni-conf' : c.ascii ? 'uni-ascii' : 'uni-non';
        const glyph = c.invisible ? '·' : (c.ch === ' ' ? '␠' : escapeHtml(c.ch));
        const tip = c.invisible ? `${c.hex} ${c.invisible}` : c.confusableOf ? `${c.hex} ${c.script} · looks like "${c.confusableOf}"` : `${c.hex} ${c.script}`;
        return `<span class="uni-ch ${cls}" data-tip="${escapeHtml(tip)}"><span class="uni-glyph">${glyph}</span><span class="uni-cp">${c.hex}</span></span>`;
      };
      const skel = asciiSkeleton(text);
      return `
        <div class="uni-summary">
          <span><b>${chars.length}</b> chars</span>
          <span><b>${nNon}</b> non-ASCII</span>
          <span><b>${nConf}</b> confusable</span>
          <span><b>${nInv}</b> invisible</span>
          <span>scripts: ${escapeHtml(scripts.join(', '))}</span>
        </div>
        ${warns.length ? `<div class="uni-warn">⚠ ${warns.map(escapeHtml).join('<br>⚠ ')}</div>` : '<div class="uni-ok">✓ Plain ASCII. No confusables or invisible characters.</div>'}
        <div class="uni-chips">${chars.map(chip).join('')}</div>
        ${(nConf || nInv) ? `
          <div class="result-header" style="margin-top:16px"><h4>ASCII skeleton</h4><button class="btn btn-ghost" data-copy="${escapeHtml(skel)}">Copy</button></div>
          <pre class="not-pre mono">${escapeHtml(skel)}</pre>
          <div class="btn-row" style="margin-top:10px">
            <button class="btn btn-secondary" data-act="strip">Strip invisible</button>
            <button class="btn btn-secondary" data-act="nfkc">Normalize (NFKC)</button>
          </div>` : ''}
      `;
    };

    const renderHomoglyph = (text) => {
      const seed = text.trim().split(/\s+/)[0] || '';
      if (!seed) return '<div class="mg-empty">Enter a word or domain to generate lookalikes.</div>';
      const vars = homoglyphVariants(seed);
      if (!vars.length) return '<div class="mg-empty">No homoglyphs available for these characters (try a-z, 0-9).</div>';
      return `
        <div class="uni-summary"><span>${vars.length} lookalike${vars.length > 1 ? 's' : ''} of <b>${escapeHtml(seed)}</b> — visually similar, different codepoints</span></div>
        <div class="payload-list">
          ${vars.map(v => {
            let puny = ''; try { puny = punycode.toASCII(v); } catch (e) { puny = '(invalid)'; }
            return `<div class="payload-item uni-row">
              <code class="uni-variant">${escapeHtml(v)}</code>
              <span class="pl-desc">punycode: <code>${escapeHtml(puny)}</code></span>
              <button class="btn btn-ghost" data-copy="${escapeHtml(v)}">Copy</button>
              <button class="btn btn-ghost" data-copy="${escapeHtml(puny)}">Copy xn--</button>
            </div>`;
          }).join('')}
        </div>`;
    };

    const renderPuny = (text) => {
      const d = text.trim();
      if (!d) return '<div class="mg-empty">Enter a domain to convert (e.g. xn--80ak6aa92e.com or münchen.de).</div>';
      let ascii = '', uni = '';
      try { ascii = punycode.toASCII(d); } catch (e) { ascii = '⚠ ' + e.message; }
      try { uni = punycode.toUnicode(d); } catch (e) { uni = '⚠ ' + e.message; }
      return `
        <div class="result-header"><h4>To ASCII (Punycode)</h4><button class="btn btn-ghost" data-copy="${escapeHtml(ascii)}">Copy</button></div>
        <pre class="not-pre mono">${escapeHtml(ascii)}</pre>
        <div class="result-header" style="margin-top:16px"><h4>To Unicode</h4><button class="btn btn-ghost" data-copy="${escapeHtml(uni)}">Copy</button></div>
        <pre class="not-pre mono">${escapeHtml(uni)}</pre>`;
    };

    const run = () => {
      const text = $('#uni-in').value;
      out.innerHTML = tab === 'homoglyph' ? renderHomoglyph(text) : tab === 'punycode' ? renderPuny(text) : renderInspect(text);
      wireCopyAll(out);
      $$('[data-act]', out).forEach(b => b.addEventListener('click', () => {
        const v = $('#uni-in');
        v.value = b.dataset.act === 'strip' ? stripInvisible(v.value) : v.value.normalize('NFKC');
        run();
      }));
    };

    wireTabs($('#uni-tabs'), 'tab', v => { tab = v; run(); });
    $('#uni-in').addEventListener('input', run);
    run();
  }
};
