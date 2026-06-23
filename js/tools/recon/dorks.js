// RedKit · recon/dorks.js (split from recon.js)
/* ============================================================
   RedKit - Recon & OSINT tools
   Loaded after js/core.js (uses $, el, TOOLS, helpers).
   ============================================================ */


// ===== 1. GOOGLE DORK GENERATOR =====
TOOLS['google-dork'] = {
  title: 'Google Dork Generator',
  desc: 'Build targeted Google dork queries to uncover exposed files, logins, and indexed pages on a domain.',
  render() {
    return `
      <div class="tool">
        ${card('Target', `
          ${field('Domain (e.g., example.com)', `<input type="text" id="gd-domain" placeholder="example.com">`)}
          <button class="btn" id="gd-gen">Generate Dorks</button>
        `)}
        ${card('', resultHead('Generated Dorks', ghostBtn('gd-copy-all', 'Copy All')) +
          `<div class="dork-list" id="gd-list"></div>`, { id: 'gd-results', hidden: true })}
      </div>
    `;
  },
  init() {
    const gen = () => {
      const d = $('#gd-domain').value.trim();
      if (!d) return toast('Enter a domain');
      const dorks = TOOLS['google-dork']._build(d);
      const list = $('#gd-list');
      list.innerHTML = '';
      dorks.forEach(([q, desc]) => {
        const item = el('div', { class: 'dork-item' });
        const wrap = el('div', { class: 'dork-item-wrap' });
        wrap.innerHTML = `<span class="desc">${escapeHtml(desc)}</span><code>${escapeHtml(q)}</code>`;
        item.appendChild(wrap);
        const cBtn = el('button', { class: 'btn btn-ghost', onclick: () => copy(q) }, 'Copy');
        const oBtn = el('button', { class: 'btn btn-ghost', onclick: () => window.open('https://www.google.com/search?q=' + encodeURIComponent(q), '_blank') }, 'Open');
        item.appendChild(cBtn);
        item.appendChild(oBtn);
        list.appendChild(item);
      });
      $('#gd-results').style.display = 'block';
    };
    wireRun('gd-gen', gen, 'gd-domain');
    wireCopy('gd-copy-all', () => TOOLS['google-dork']._build($('#gd-domain').value.trim()).map(([q]) => q).join('\n'));
  },
  _build(d) {
    return [
      [`site:${d}`, 'All indexed pages'],
      [`site:*.${d}`, 'Subdomains'],
      [`site:${d} -www`, 'Excluding www'],
      [`site:${d} (ext:env OR ext:log OR ext:bak OR ext:old OR ext:backup OR ext:sql OR ext:conf OR ext:cfg OR ext:ini OR ext:yml OR ext:yaml OR ext:json OR ext:xml OR ext:txt) OR (intitle:"index of" OR intitle:"phpinfo()" OR intext:"DB_PASSWORD" OR intext:"api_key" OR intext:"BEGIN RSA PRIVATE KEY" OR "fatal error" OR "stack trace")`, 'All-in-one Information Disclosure'],
      [`site:${d} ext:php`, 'PHP files'],
      [`site:${d} ext:asp OR ext:aspx OR ext:jsp`, 'Server-side files'],
      [`site:${d} ext:txt OR ext:log OR ext:bak OR ext:old OR ext:backup`, 'Text/backup files'],
      [`site:${d} ext:xml OR ext:conf OR ext:cnf OR ext:cfg OR ext:ini`, 'Config files'],
      [`site:${d} ext:sql OR ext:dbf OR ext:mdb`, 'Database files'],
      [`site:${d} ext:doc OR ext:docx OR ext:pdf OR ext:xls OR ext:xlsx OR ext:ppt OR ext:pptx`, 'Documents'],
      [`site:${d} ext:env OR ext:yml OR ext:yaml OR ext:json`, 'Environment files'],
      [`site:${d} inurl:admin`, 'Admin panels'],
      [`site:${d} inurl:login OR inurl:signin OR inurl:auth`, 'Login pages'],
      [`site:${d} inurl:register OR inurl:signup OR inurl:sign-up OR inurl:registration OR inurl:create-account`, 'Register / signup pages'],
      [`site:${d} inurl:dashboard`, 'Dashboards'],
      [`site:${d} inurl:wp-content OR inurl:wp-admin`, 'WordPress paths'],
      [`site:${d} inurl:api OR inurl:v1 OR inurl:v2 OR inurl:v3`, 'API endpoints'],
      [`site:${d} inurl:test OR inurl:dev OR inurl:staging OR inurl:beta`, 'Dev environments'],
      [`site:${d} inurl:debug`, 'Debug pages'],
      [`site:${d} inurl:redirect OR inurl:url= OR inurl:next= OR inurl:return=`, 'Open redirect candidates'],
      [`site:${d} inurl:?id= OR inurl:?cat= OR inurl:?page= OR inurl:?file=`, 'Param-driven URLs (SQLi/LFI)'],
      [`site:${d} intitle:"index of"`, 'Directory listings'],
      [`site:${d} intitle:"phpinfo()"`, 'phpinfo pages'],
      [`site:${d} "sql syntax near" OR "syntax error has occurred"`, 'SQL errors'],
      [`site:${d} "Warning: include" OR "Warning: require"`, 'PHP errors / LFI hints'],
      [`site:${d} "fatal error" OR "stack trace"`, 'Stack traces'],
      [`site:${d} intext:"password" OR intext:"passwd"`, 'Password mentions'],
      [`site:${d} "BEGIN RSA PRIVATE KEY"`, 'Private keys'],
      [`site:pastebin.com "${d}"`, 'Pastebin leaks'],
      [`site:github.com "${d}"`, 'GitHub mentions'],
      [`site:trello.com "${d}"`, 'Trello leaks'],
      [`site:s3.amazonaws.com "${d}"`, 'AWS S3 buckets'],
      [`site:blob.core.windows.net "${d}"`, 'Azure Blob Storage'],
      [`site:storage.googleapis.com "${d}"`, 'Google Cloud Storage buckets'],
      [`site:firebasestorage.googleapis.com "${d}"`, 'Firebase Storage'],
      [`site:digitaloceanspaces.com "${d}"`, 'DigitalOcean Spaces'],
      [`site:drive.google.com "${d}"`, 'Public Google Drive files'],
      [`site:docs.google.com "${d}"`, 'Public Google Docs / Sheets / Slides'],
      [`site:onedrive.live.com "${d}"`, 'Public OneDrive files'],
      [`site:1drv.ms "${d}"`, 'OneDrive shortlinks'],
      [`site:dropbox.com "${d}"`, 'Public Dropbox files'],
      [`site:box.com "${d}"`, 'Public Box files'],
      [`site:mega.nz "${d}"`, 'Public MEGA files'],
      [`site:icloud.com "${d}"`, 'Public iCloud shares'],
    ];
  }
};

// ===== 2. SHODAN DORK GENERATOR =====
TOOLS['shodan-dork'] = {
  title: 'Shodan Dork Generator',
  desc: 'Build Shodan queries to map a target exposed hosts, services, and open ports.',
  render() {
    return `
      <div class="tool">
        ${card('Target', `
          <div class="field-row">
            ${field('Domain', `<input type="text" id="sd-domain" placeholder="example.com">`)}
            ${field('IP / CIDR', `<input type="text" id="sd-ip" placeholder="1.2.3.4 or 1.2.3.0/24">`)}
          </div>
          <div class="field-row">
            ${field('Organization', `<input type="text" id="sd-org" placeholder="Acme Corp">`)}
            ${field('SSL/Certificate Name', `<input type="text" id="sd-ssl" placeholder="example.com">`)}
          </div>
          <button class="btn" id="sd-gen">Generate Queries</button>
        `)}
        ${card('', resultHead('Shodan Queries') + `<div class="dork-list" id="sd-list"></div>`, { id: 'sd-results', hidden: true })}
      </div>
    `;
  },
  init() {
    $('#sd-gen').addEventListener('click', () => {
      const d = $('#sd-domain').value.trim();
      const ip = $('#sd-ip').value.trim();
      const org = $('#sd-org').value.trim();
      const ssl = $('#sd-ssl').value.trim();
      const queries = [];

      if (d) {
        queries.push([`hostname:"${d}"`, 'Hosts matching domain']);
        queries.push([`ssl:"${d}"`, 'SSL cert matches domain']);
        queries.push([`ssl.cert.subject.cn:"${d}"`, 'Cert CN matches']);
        queries.push([`http.title:"${d}"`, 'HTTP title contains domain']);
      }
      if (ip) {
        queries.push([`net:${ip}`, 'IP / CIDR range']);
        queries.push([`net:${ip} port:80,443,8080,8443`, 'Web ports on range']);
      }
      if (org) {
        queries.push([`org:"${org}"`, 'By organization']);
        queries.push([`org:"${org}" port:22`, 'SSH on org']);
        queries.push([`org:"${org}" port:3389`, 'RDP on org']);
        queries.push([`org:"${org}" "default password"`, 'Default password mentions']);
      }
      if (ssl) {
        queries.push([`ssl.cert.subject.cn:"${ssl}"`, 'SSL CN match']);
        queries.push([`ssl.cert.issuer.cn:"${ssl}"`, 'SSL issuer CN match']);
      }

      queries.push([`product:"nginx" "200 OK"`, 'nginx servers']);
      queries.push([`product:"Apache" country:"US"`, 'Apache in US']);
      queries.push([`"Server: Microsoft-IIS"`, 'IIS servers']);
      queries.push([`port:9200 elastic`, 'Open Elasticsearch']);
      queries.push([`port:27017 mongodb`, 'Open MongoDB']);
      queries.push([`port:6379 redis`, 'Open Redis']);
      queries.push([`"X-Jenkins" "Set-Cookie: JSESSIONID"`, 'Jenkins panels']);
      queries.push([`title:"Grafana"`, 'Grafana']);
      queries.push([`title:"Kibana"`, 'Kibana']);

      const list = $('#sd-list');
      list.innerHTML = '';
      queries.forEach(([q, desc]) => {
        const item = el('div', { class: 'dork-item' });
        const wrap = el('div', { class: 'dork-item-wrap' });
        wrap.innerHTML = `<span class="desc">${escapeHtml(desc)}</span><code>${escapeHtml(q)}</code>`;
        item.appendChild(wrap);
        item.appendChild(el('button', { class: 'btn btn-ghost', onclick: () => copy(q) }, 'Copy'));
        item.appendChild(el('button', { class: 'btn btn-ghost', onclick: () => window.open('https://www.shodan.io/search?query=' + encodeURIComponent(q), '_blank') }, 'Open'));
        list.appendChild(item);
      });
      $('#sd-results').style.display = 'block';
    });
  }
};

