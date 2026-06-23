// RedKit · bench/chmod.js
// ===== CHMOD CALCULATOR =====
TOOLS['chmod'] = {
  title: 'Chmod Calculator',
  desc: 'Convert Unix file permissions between octal, symbolic and checkboxes, with the chmod command.',
  render() {
    const row = (key, label) => `<tr>
      <td class="chmod-role">${label}</td>
      <td><input type="checkbox" id="${key}r"></td>
      <td><input type="checkbox" id="${key}w"></td>
      <td><input type="checkbox" id="${key}x"></td>
    </tr>`;
    const outRow = (label, id, withCopy) => `<div class="ts-row"><span class="ts-label">${label}</span><code class="ts-val" id="${id}"></code>${withCopy ? `<button class="btn btn-ghost" data-cp="${id}">Copy</button>` : ''}</div>`;
    return `
      <div class="tool">
        ${card('Permissions', `
          <table class="chmod-grid">
            <tr><th></th><th>Read (4)</th><th>Write (2)</th><th>Execute (1)</th></tr>
            ${row('o', 'Owner')}
            ${row('g', 'Group')}
            ${row('t', 'Others')}
          </table>
          ${field('Special bits', `<div class="pe-flags">
            <label class="pe-chk"><input type="checkbox" id="suid"> setuid (4000)</label>
            <label class="pe-chk"><input type="checkbox" id="sgid"> setgid (2000)</label>
            <label class="pe-chk"><input type="checkbox" id="sticky"> sticky (1000)</label>
          </div>`)}
          <div class="field-row">
            ${field('Octal', `<input type="text" id="chmod-oct" maxlength="4" placeholder="755" autocomplete="off">`)}
            ${field('Apply to (filename)', `<input type="text" id="chmod-file" value="file" autocomplete="off">`)}
          </div>
        `)}
        ${card('', `${outRow('Symbolic', 'chmod-sym', true)}${outRow('chmod command', 'chmod-cmd', true)}`)}
      </div>`;
  },
  init() {
    const C = id => $('#' + id);
    const on = id => C(id).checked;
    const TRIP = [['o', 'suid', 's'], ['g', 'sgid', 's'], ['t', 'sticky', 't']];
    const compute = () => {
      const dig = k => (on(k + 'r') ? 4 : 0) + (on(k + 'w') ? 2 : 0) + (on(k + 'x') ? 1 : 0);
      const sp = (on('suid') ? 4 : 0) + (on('sgid') ? 2 : 0) + (on('sticky') ? 1 : 0);
      const octal = (sp ? sp : '') + '' + dig('o') + dig('g') + dig('t');
      const sym = TRIP.map(([k, spId, sc]) => {
        let s = (on(k + 'r') ? 'r' : '-') + (on(k + 'w') ? 'w' : '-');
        s += on(spId) ? (on(k + 'x') ? sc : sc.toUpperCase()) : (on(k + 'x') ? 'x' : '-');
        return s;
      }).join('');
      return { octal, sym };
    };
    const draw = (skipOctal) => {
      const r = compute();
      if (!skipOctal) C('chmod-oct').value = r.octal;
      C('chmod-sym').textContent = r.sym;
      C('chmod-cmd').textContent = `chmod ${r.octal} ${C('chmod-file').value.trim() || 'file'}`;
    };
    const setFromOctal = () => {
      const v = C('chmod-oct').value.replace(/[^0-7]/g, '').slice(-4).padStart(4, '0');
      const sp = +v[0], n = [+v[1], +v[2], +v[3]];
      ['o', 'g', 't'].forEach((k, i) => { C(k + 'r').checked = !!(n[i] & 4); C(k + 'w').checked = !!(n[i] & 2); C(k + 'x').checked = !!(n[i] & 1); });
      C('suid').checked = !!(sp & 4); C('sgid').checked = !!(sp & 2); C('sticky').checked = !!(sp & 1);
      draw(true);
    };
    ['or', 'ow', 'ox', 'gr', 'gw', 'gx', 'tr', 'tw', 'tx', 'suid', 'sgid', 'sticky'].forEach(id => C(id).addEventListener('change', () => draw(false)));
    C('chmod-file').addEventListener('input', () => draw(false));
    C('chmod-oct').addEventListener('input', setFromOctal);
    wireCopyRefs($('#content'));
    draw(false);
  }
};
