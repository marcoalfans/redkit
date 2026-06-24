// RedKit · crypto/hashing.js (split from crypto.js)
// ===== HASH GENERATOR =====
TOOLS['hash'] = {
  title: 'Hash Generator',
  desc: 'Generate MD5, SHA-1, SHA-256, SHA-512, and more from any input.',
  render() {
    return `
      <div class="tool">
        ${card('Input', `
          ${field('', `<textarea id="hash-input" placeholder="enter text..."></textarea>`)}
          <button class="btn" id="hash-gen">Generate Hashes</button>
        `)}
        ${card('Hashes', `<div id="hash-output"></div>`, { id: 'hash-results', hidden: true })}
      </div>
    `;
  },
  init() {
    $('#hash-gen').addEventListener('click', () => {
      const txt = $('#hash-input').value;
      const algos = ['MD5', 'SHA1', 'SHA224', 'SHA256', 'SHA384', 'SHA512', 'SHA3', 'RIPEMD160'];
      const out = $('#hash-output');
      out.innerHTML = '';
      if (typeof CryptoJS === 'undefined') {
        out.innerHTML = '<div class="header-row"><span class="h-detail">Hash library failed to load, check your connection and retry.</span></div>';
        $('#hash-results').style.display = 'block';
        return;
      }
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
        ${card('Hash', `
          ${field('', `<textarea id="hid-input" rows="3" placeholder="paste hash here (e.g. 5d41402abc4b2a76b9719d911017c592)"></textarea>`)}
          <div class="btn-row">
            <button class="btn" id="hid-id">Identify</button>
            <button class="btn btn-secondary" id="hid-clear">Clear</button>
          </div>
        `)}
        ${card('Hash Information', `
          <dl class="info-grid" id="hid-info"></dl>
          <div class="rec-section-label" style="margin-top:18px">Possible Hash Types</div>
          <div class="payload-list" id="hid-output"></div>
        `, { id: 'hid-results', hidden: true })}
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

