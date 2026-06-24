// RedKit · privesc/gtfobins.js
// ===== GTFOBINS (Linux privilege escalation) =====
// Data: js/data/gtfobins-data.js (const GTFOBINS), reverse/bind shells excluded (use the Reverse Shell Generator).
TOOLS['gtfobins'] = {
  title: 'GTFOBins (Linux Privesc)',
  desc: 'Look up Linux binaries abusable for privilege escalation (sudo, SUID, capabilities) with copy-ready commands, or paste your enumeration output to flag what is exploitable.',
  render() {
    return `
      <div class="tool">
        <div class="explainer">
          <span class="explainer-q">What is this?</span>
          <span class="explainer-body">GTFOBins lists standard Linux binaries that can be abused to escalate privileges or break out of a restricted shell. Browse a binary to see how, or paste your enumeration output (sudo -l, a SUID find, or getcap) into Analyze and it flags which entries are exploitable. Reverse and bind shells are intentionally left out; use the Reverse Shell Generator for those.</span>
        </div>
        <div class="not-formats" id="gtf-tabs">
          <button class="not-fmt active" data-m="browse">Browse</button>
          <button class="not-fmt" data-m="analyze">Analyze output</button>
        </div>
        <div id="gtf-body"></div>
        <p class="gtf-credit" data-noi18n>Data from <a href="https://gtfobins.github.io" target="_blank" rel="noopener">GTFOBins</a> (CC BY 3.0).</p>
      </div>`;
  },
  init() {
    const body = $('#gtf-body');
    const byName = new Map(GTFOBINS.map(b => [b.n, b]));
    const CTXLBL = { sudo: 'sudo', suid: 'SUID', capabilities: 'caps', unprivileged: 'unpriv' };
    const FN_OPTS = ['shell', 'command', 'file-read', 'file-write', 'upload', 'download', 'library-load', 'inherit', 'privilege-escalation'];

    // render the command for a given privilege context (sudo prepends `sudo`; suid/caps use their override code when present)
    const cmdFor = (e, ctx) => {
      const ov = e.x && e.x[ctx];
      let code = (typeof ov === 'string' && ov) ? ov : e.c;
      if (ctx === 'sudo' && !/^\s*sudo\b/.test(code)) code = 'sudo ' + code;
      return code;
    };
    const fnHtml = (e, ctx) => {
      const ctxs = e.x ? Object.keys(e.x) : ['unprivileged'];
      const useCtx = ctx || (ctxs.includes('sudo') ? 'sudo' : ctxs.includes('suid') ? 'suid' : ctxs[0]);
      const cmd = cmdFor(e, useCtx);
      const badges = ctxs.map(c => `<span class="gtf-ctx gtf-ctx-${c}">${CTXLBL[c] || c}</span>`).join('');
      return `<div class="gtf-fn">
        <div class="gtf-fn-head"><span class="gtf-fnname">${escapeHtml(e.fn)}</span>${badges}<button class="btn btn-ghost gtf-cp" data-copy="${escapeHtml(cmd)}">Copy</button></div>
        <pre class="not-pre mono gtf-code">${escapeHtml(cmd)}</pre>
        ${e.cm ? `<div class="gtf-note">${escapeHtml(e.cm)}</div>` : ''}
      </div>`;
    };
    const binCard = (name, entries, ctx) => `<div class="gtf-card"><div class="gtf-binname">${escapeHtml(name)}</div>${entries.map(e => fnHtml(e, ctx)).join('')}</div>`;

    // ----- Browse -----
    const renderBrowse = () => {
      const q = $('#gtf-q').value.trim().toLowerCase(), ctx = $('#gtf-ctx').value, fnF = $('#gtf-fn').value;
      const res = $('#gtf-results');
      if (!q && !ctx && !fnF) { res.innerHTML = '<div class="mg-empty">Search a binary, or pick a context / function to list matches.</div>'; return; }
      let count = 0; const cards = [];
      for (const b of GTFOBINS) {
        if (q && !b.n.includes(q)) continue;
        const entries = b.f.filter(e => (!ctx || (e.x && ctx in e.x)) && (!fnF || e.fn === fnF));
        if (!entries.length) continue;
        count++;
        if (cards.length < 40) cards.push(binCard(b.n, entries, ctx));
      }
      if (!count) { res.innerHTML = '<div class="mg-empty">No binary matches.</div>'; return; }
      const head = count > cards.length
        ? `<div class="gtf-summary">Showing ${cards.length} of ${count} matches. Refine your search.</div>`
        : `<div class="gtf-summary">${count} match${count > 1 ? 'es' : ''}.</div>`;
      res.innerHTML = head + cards.join('');
      wireCopyAll(res);
    };

    // ----- Analyze pasted enumeration output -----
    const detectCtx = (raw) => /cap_[a-z]/i.test(raw) ? 'capabilities'
      : /nopasswd|\(all\)|\(root\)|may run the following|sudo\s+-l/i.test(raw) ? 'sudo' : 'suid';
    const extractBins = (raw) => {
      const set = new Set();
      raw.split(/[\s,;|]+/).forEach(tok => {
        let t = tok.trim(); if (!t) return;
        if (t.includes('/')) t = t.split('/').pop();
        t = t.replace(/[(),:=*]/g, '');
        if (/^[a-z0-9][a-z0-9._+-]*$/i.test(t) && t.length <= 40) set.add(t.toLowerCase());
      });
      return [...set];
    };
    const matchBin = (name) => {
      if (byName.has(name)) return byName.get(name);
      const s = name.replace(/\d+(\.\d+)*$/, '');   // python3.8 -> python, ruby2.7 -> ruby
      if (s && s !== name && byName.has(s)) return byName.get(s);
      return null;
    };
    const renderAnalyze = () => {
      const raw = $('#gtf-paste').value, out = $('#gtf-analysis');
      if (!raw.trim()) { out.innerHTML = '<div class="mg-empty">Paste sudo -l, a SUID find, or getcap output above.</div>'; return; }
      let ctx = $('#gtf-actx').value; if (ctx === 'auto') ctx = detectCtx(raw);
      const names = extractBins(raw), hits = [], misses = [];
      for (const name of names) {
        const b = matchBin(name);
        const entries = b ? b.f.filter(e => e.x && ctx in e.x) : [];
        if (entries.length) hits.push({ b, entries }); else misses.push(name);
      }
      const ctxName = CTXLBL[ctx] || ctx;
      let html = `<div class="gtf-summary">Treated as <b>${ctxName}</b> · <b>${hits.length}</b> of ${names.length} candidate binar${names.length === 1 ? 'y' : 'ies'} exploitable.</div>`;
      html += hits.length ? hits.map(h => binCard(h.b.n, h.entries, ctx)).join('')
        : `<div class="mg-empty">No GTFOBins technique found for these in the ${ctxName} context.</div>`;
      if (misses.length) html += `<div class="gtf-note">Not in GTFOBins (for this context): ${escapeHtml(misses.slice(0, 50).join(', '))}</div>`;
      out.innerHTML = html;
      wireCopyAll(out);
    };

    const mountBrowse = () => {
      body.innerHTML = `
        ${card('', `<div class="field-row gtf-controls">
          ${field('Search binary', `<input type="text" id="gtf-q" placeholder="e.g. find, vim, tar, python" autocomplete="off">`)}
          ${field('Context', `<select id="gtf-ctx"><option value="">Any</option><option value="sudo">sudo</option><option value="suid">SUID</option><option value="capabilities">capabilities</option></select>`)}
          ${field('Function', `<select id="gtf-fn"><option value="">Any</option>${FN_OPTS.map(f => `<option value="${f}">${f}</option>`).join('')}</select>`)}
        </div>`)}
        <div id="gtf-results"></div>`;
      $('#gtf-q').addEventListener('input', renderBrowse);
      $('#gtf-ctx').addEventListener('change', renderBrowse);
      $('#gtf-fn').addEventListener('change', renderBrowse);
      renderBrowse();
    };
    const mountAnalyze = () => {
      body.innerHTML = `
        ${card('', `
          ${field('Paste enumeration output', `<textarea id="gtf-paste" rows="6" placeholder="sudo -l    /    find / -perm -4000 -type f 2>/dev/null    /    getcap -r / 2>/dev/null"></textarea>`)}
          ${field('Treat as', `<select id="gtf-actx"><option value="auto">Auto-detect</option><option value="sudo">sudo</option><option value="suid">SUID</option><option value="capabilities">capabilities</option></select>`)}
        `)}
        <div id="gtf-analysis"></div>`;
      let t; $('#gtf-paste').addEventListener('input', () => { clearTimeout(t); t = setTimeout(renderAnalyze, 150); });
      $('#gtf-actx').addEventListener('change', renderAnalyze);
      renderAnalyze();
    };

    $$('#gtf-tabs .not-fmt').forEach(btn => btn.addEventListener('click', () => {
      $$('#gtf-tabs .not-fmt').forEach(b => b.classList.toggle('active', b === btn));
      btn.dataset.m === 'browse' ? mountBrowse() : mountAnalyze();
    }));
    mountBrowse();
  }
};
