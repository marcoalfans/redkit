// RedKit · payloads/revshell.js (split from payloads.js)
// ===== REVERSE SHELL GENERATOR (data bundled from 0dayCTF/reverse-shell-generator) =====
const RSG_TYPES = [['ReverseShell', 'Reverse'], ['BindShell', 'Bind'], ['MSFVenom', 'MSFVenom'], ['HoaxShell', 'HoaxShell']];
TOOLS['revshell'] = {
  title: 'Reverse Shell Generator',
  desc: 'Generate reverse, bind, MSFVenom, and HoaxShell payloads with encoding and listeners.',
  render() {
    const D = window.rsgData || { shells: [], listenerCommands: [] };
    const shells = D.shells || [];
    return `
      <div class="tool">
        <div class="rsg-top">
          ${card('Connection', `<div class="rsg-conn-fields">${field('IP / Interface', `<input type="text" id="rsg-ip" value="10.10.14.1">`)}${field('Port', `<input type="text" id="rsg-port" value="9001">`)}</div>`, { cls: 'rsg-conn' })}
          ${card('Listener', `
            <div class="rsg-listener-row">
              ${field('Listener', `<select id="rsg-listener">${(D.listenerCommands || []).map((l, i) => `<option value="${i}">${escapeHtml(l[0])}</option>`).join('')}</select>`)}
              <div class="rsg-outwrap">
                ${resultHead('Command', ghostBtn('rsg-lcopy'))}
                <pre class="not-pre mono" id="rsg-lout"></pre>
              </div>
            </div>
          `)}
        </div>
        ${card('Payload', `
          <div class="rsg-cfg">
            ${field('Shell', `<select id="rsg-shell">${shells.map(s => `<option${s === 'bash' ? ' selected' : ''}>${s}</option>`).join('')}</select>`)}
            ${field('Encoding', `<select id="rsg-enc"><option value="none">None</option><option value="b64">Base64</option><option value="url">URL Encode</option><option value="url2">Double URL</option></select>`)}
            ${field('OS', `<select id="rsg-os"><option value="all">All</option><option value="linux">Linux</option><option value="windows">Windows</option><option value="mac">Mac</option></select>`)}
          </div>
          <div class="rsg-tabs" id="rsg-tabs">${RSG_TYPES.map((t, i) => `<button class="rsg-tab${i === 0 ? ' active' : ''}" data-type="${t[0]}">${t[1]}</button>`).join('')}</div>
          <input type="text" id="rsg-search" placeholder="Filter payloads..." autocomplete="off" style="margin:10px 0 16px">
          <div class="rsg-grid">
            <div class="rsg-list" id="rsg-list"></div>
            <div class="rsg-outwrap">
              <div class="result-header"><h4 id="rsg-name">N/A</h4>${ghostBtn('rsg-copy')}</div>
              <pre class="not-pre mono" id="rsg-out"></pre>
            </div>
          </div>
        `)}
      </div>`;
  },
  init() {
    const D = window.rsgData;
    if (!D) { $('#rsg-out').textContent = 'Reverse-shell data failed to load.'; return; }
    const fixUrl = s => encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
    const b64 = s => { try { return btoa(unescape(encodeURIComponent(s))); } catch (e) { return btoa(s); } };
    const subst = (cmd) => {
      const ip = $('#rsg-ip').value.trim() || 'IP';
      const port = $('#rsg-port').value.trim() || 'PORT';
      const shell = $('#rsg-shell').value;
      return cmd.replace(/\{ip\}/g, ip).replace(/\{port\}/g, port).replace(/\{shell\}/g, shell);
    };
    const encode = (cmd) => {
      const c = subst(cmd), mode = $('#rsg-enc').value;
      if (mode === 'b64') return b64(c);
      if (mode === 'url') return fixUrl(c);
      if (mode === 'url2') return fixUrl(fixUrl(c));
      return c;
    };
    let activeType = 'ReverseShell', selected = null;
    const listEl = $('#rsg-list');
    const matches = () => {
      const os = $('#rsg-os').value, q = $('#rsg-search').value.trim().toLowerCase();
      return D.reverseShellCommands.filter(it => it.meta.includes(activeType)
        && (os === 'all' || it.meta.includes(os))
        && (!q || it.name.toLowerCase().includes(q)));
    };
    const renderOut = () => {
      if (!selected) { $('#rsg-name').textContent = 'N/A'; $('#rsg-out').textContent = ''; return; }
      $('#rsg-name').textContent = selected.name;
      $('#rsg-out').textContent = encode(selected.command);
    };
    const renderList = () => {
      const items = matches();
      if (items.length) selected = (selected && items.find(x => x.name === selected.name)) || items[0];
      else selected = null;
      listEl.innerHTML = items.length
        ? items.map((it, i) => `<button class="rsg-item${selected && it.name === selected.name ? ' active' : ''}" data-i="${i}">${escapeHtml(it.name)}</button>`).join('')
        : '<div class="rsg-empty">No payloads match.</div>';
      $$('.rsg-item', listEl).forEach((b, i) => b.addEventListener('click', () => {
        selected = items[i];
        $$('.rsg-item', listEl).forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        renderOut();
      }));
      renderOut();
    };
    const renderListener = () => {
      const l = D.listenerCommands[+$('#rsg-listener').value];
      const ip = $('#rsg-ip').value.trim() || 'IP', port = $('#rsg-port').value.trim() || 'PORT';
      $('#rsg-lout').textContent = l[1].replace(/\{ip\}/g, ip).replace(/\{port\}/g, port);
    };
    $$('.rsg-tab').forEach(t => t.addEventListener('click', () => {
      activeType = t.dataset.type;
      $$('.rsg-tab').forEach(x => x.classList.toggle('active', x === t));
      selected = null;
      renderList();
    }));
    $('#rsg-ip').addEventListener('input', () => { renderOut(); renderListener(); });
    $('#rsg-port').addEventListener('input', () => { renderOut(); renderListener(); });
    $('#rsg-shell').addEventListener('change', renderOut);
    $('#rsg-enc').addEventListener('change', renderOut);
    $('#rsg-os').addEventListener('change', renderList);
    $('#rsg-search').addEventListener('input', renderList);
    $('#rsg-listener').addEventListener('change', renderListener);
    wireCopy('rsg-copy', () => $('#rsg-out').textContent);
    wireCopy('rsg-lcopy', () => $('#rsg-lout').textContent);
    renderList();
    renderListener();
  }
};

