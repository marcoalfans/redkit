// RedKit · crypto/jwt.js (split from crypto.js)
// ===== JWT DECODER =====
TOOLS['jwt'] = {
  title: 'JWT Decoder / Editor',
  desc: 'Decode, edit, and re-sign JSON Web Tokens, including alg none and weak-secret attacks.',
  render() {
    return `
      <div class="tool">
        ${card('JWT Token', `
          ${field('', `<textarea id="jwt-input" rows="4" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."></textarea>`)}
          <div class="btn-row">
            <button class="btn" id="jwt-decode">Decode &amp; Edit</button>
          </div>
        `)}
        ${card('Decoded', `<div id="jwt-output"></div>`, { id: 'jwt-results', hidden: true })}
        ${card('Edit &amp; Re-sign Token', `
          <p style="color:var(--text-mute);font-size:12px;margin-bottom:12px">Modify the header or payload below, then rebuild a new token. Use <strong>alg=none</strong> to test missing-signature bugs, or <strong>HS256</strong> with a guessed secret to forge a valid token.</p>
          ${field('Header (JSON)', `<textarea id="jwt-edit-header" rows="4" class="mono"></textarea>`)}
          ${field('Payload (JSON)', `<textarea id="jwt-edit-payload" rows="6" class="mono"></textarea>`)}
          <div class="field-row">
            ${field('Signing', `<select id="jwt-sign-alg">
                <option value="none">alg=none (no signature)</option>
                <option value="HS256">HS256 (HMAC-SHA256)</option>
                <option value="HS384">HS384 (HMAC-SHA384)</option>
                <option value="HS512">HS512 (HMAC-SHA512)</option>
                <option value="keep">Keep original signature</option>
              </select>`)}
            ${field('Secret (HMAC only)', `<input type="text" id="jwt-secret" placeholder="secret / leak / weak-key">`)}
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
        `, { id: 'jwt-editor', hidden: true })}
      </div>
    `;
  },
  init() {
    // ===== Base64url helpers =====
    const b64uDecode = (s) => {
      const norm = s.replace(/-/g, '+').replace(/_/g, '/');
      const pad = norm + '='.repeat((4 - norm.length % 4) % 4);
      return decodeURIComponent(escape(atob(pad))); // UTF-8 aware
    };
    const b64uEncode = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); // UTF-8 aware
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

      const signingInput = `${b64uEncode(JSON.stringify(header))}.${b64uEncode(JSON.stringify(payload))}`;

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

    wireCopy('jwt-copy-new', () => $('#jwt-output-token').value);
  }
};

