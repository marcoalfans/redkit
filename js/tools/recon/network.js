// RedKit · recon/network.js (split from recon.js)
// ===== 6. DNS LOOKUP =====
TOOLS['dns-lookup'] = {
  title: 'DNS Lookup',
  desc: 'Look up any DNS record type quickly over encrypted DNS over HTTPS.',
  render() {
    return `
      <div class="tool">
        ${card('DNS Query', `
          <div class="field-row">
            ${field('Domain', `<input type="text" id="dns-domain" placeholder="example.com">`)}
            ${field('Record Type', `<select id="dns-type">
                <option>A</option><option>AAAA</option><option>CNAME</option>
                <option>MX</option><option>TXT</option><option>NS</option>
                <option>SOA</option><option>CAA</option><option>SRV</option><option>PTR</option>
                <option value="ALL">ALL</option>
              </select>`)}
          </div>
          <button class="btn" id="dns-lookup">Lookup</button>
        `)}
        ${card('', resultHead('Records') + `<div class="result-box" id="dns-output"></div>`, { id: 'dns-results', hidden: true })}
      </div>
    `;
  },
  init() {
    const lookup = async (domain, type) => {
      const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`, {
        headers: { 'Accept': 'application/dns-json' }
      });
      return r.json();
    };
    $('#dns-lookup').addEventListener('click', async () => {
      const d = $('#dns-domain').value.trim();
      const t = $('#dns-type').value;
      if (!d) return toast('Enter a domain');
      const out = $('#dns-output');
      out.textContent = 'Querying...';
      $('#dns-results').style.display = 'block';

      try {
        const types = t === 'ALL' ? ['A','AAAA','CNAME','MX','TXT','NS','SOA','CAA'] : [t];
        const results = {};
        for (const tp of types) {
          const data = await lookup(d, tp);
          if (data.Answer) results[tp] = data.Answer;
        }
        let str = '';
        Object.entries(results).forEach(([tp, recs]) => {
          str += `=== ${tp} ===\n`;
          recs.forEach(r => str += `  ${r.name}  ${r.TTL}  ${r.data}\n`);
          str += '\n';
        });
        out.textContent = str || 'No records found.';
      } catch (e) {
        out.textContent = 'Error: ' + e.message;
      }
    });
  }
};

// ===== 7. URL PARSER =====
TOOLS['url-parser'] = {
  title: 'URL Parser',
  desc: 'Decompose any URL into its scheme, host, path, query, and fragment.',
  render() {
    return `
      <div class="tool">
        ${card('URL', `
          ${field('', `<input type="text" id="up-input" placeholder="https://user:pass@example.com:8080/path?key=value#frag">`)}
          <button class="btn" id="up-parse">Parse</button>
        `)}
        ${card('Components', `<dl class="info-grid" id="up-output"></dl>`, { id: 'up-results', hidden: true })}
      </div>
    `;
  },
  init() {
    $('#up-parse').addEventListener('click', () => {
      const v = $('#up-input').value.trim();
      if (!v) return toast('Enter a URL');
      try {
        const u = new URL(v);
        const out = $('#up-output');
        const parts = {
          'Protocol': u.protocol,
          'Username': u.username || '(none)',
          'Password': u.password || '(none)',
          'Hostname': u.hostname,
          'Port': u.port || '(default)',
          'Pathname': u.pathname,
          'Search': u.search || '(none)',
          'Hash': u.hash || '(none)',
          'Origin': u.origin,
        };
        out.innerHTML = '';
        Object.entries(parts).forEach(([k, val]) => {
          out.innerHTML += `<dt>${k}</dt><dd>${escapeHtml(val)}</dd>`;
        });
        if (u.search) {
          const params = new URLSearchParams(u.search);
          out.innerHTML += `<dt style="grid-column:1/-1;margin-top:8px;color:var(--accent)">Query Parameters</dt>`;
          for (const [k, val] of params) {
            out.innerHTML += `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(val)}</dd>`;
          }
        }
        $('#up-results').style.display = 'block';
      } catch (e) {
        toast('Invalid URL');
      }
    });
  }
};

// ===== 8. IP / DOMAIN INFO =====
TOOLS['ip-info'] = {
  title: 'IP / Domain Info',
  desc: 'Look up geolocation, network, and ASN details for an IP or domain.',
  render() {
    return `
      <div class="tool">
        ${card('Target', `
          ${field('IP address or domain', `<input type="text" id="ipi-input" placeholder="8.8.8.8 or example.com">`)}
          <button class="btn" id="ipi-lookup">Lookup</button>
        `)}
        ${card('Info', `<dl class="info-grid" id="ipi-output"></dl>`, { id: 'ipi-results', hidden: true })}
      </div>
    `;
  },
  init() {
    // If user passes a domain, resolve it via Cloudflare DoH first.
    const resolveToIp = async (host) => {
      if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(host) || host.includes(':')) return host;
      const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=A`, {
        headers: { 'Accept': 'application/dns-json' }
      });
      const d = await r.json();
      const a = (d.Answer || []).find(x => x.type === 1);
      if (!a) throw new Error('Could not resolve domain to IP');
      return a.data;
    };

    // Try multiple CORS-friendly providers as fallbacks.
    const providers = [
      {
        name: 'ipapi.co',
        url: ip => `https://ipapi.co/${ip}/json/`,
        parse: d => {
          if (d.error) throw new Error(d.reason || 'lookup failed');
          return {
            'IP': d.ip, 'Version': d.version,
            'Country': d.country_name ? `${d.country_name} (${d.country_code})` : null,
            'Region': d.region, 'City': d.city, 'Postal': d.postal,
            'Latitude': d.latitude, 'Longitude': d.longitude, 'Timezone': d.timezone,
            'ISP': d.org, 'ASN': d.asn,
          };
        }
      },
      {
        name: 'ipwho.is',
        url: ip => `https://ipwho.is/${ip}`,
        parse: d => {
          if (d.success === false) throw new Error(d.message || 'lookup failed');
          return {
            'IP': d.ip, 'Type': d.type,
            'Country': d.country ? `${d.country} (${d.country_code})` : null,
            'Region': d.region, 'City': d.city,
            'Latitude': d.latitude, 'Longitude': d.longitude,
            'Timezone': d.timezone?.id, 'ISP': d.connection?.isp,
            'ASN': d.connection?.asn, 'Org': d.connection?.org,
          };
        }
      },
    ];

    $('#ipi-lookup').addEventListener('click', async () => {
      const v = $('#ipi-input').value.trim();
      if (!v) return toast('Enter an IP or domain');
      const out = $('#ipi-output');
      out.innerHTML = '<dt>Loading...</dt><dd></dd>';
      $('#ipi-results').style.display = 'block';

      let ip;
      try {
        ip = await resolveToIp(v);
      } catch (e) {
        out.innerHTML = `<dt>Error</dt><dd>${escapeHtml(e.message)}</dd>`;
        return;
      }

      let lastErr;
      for (const p of providers) {
        try {
          const r = await fetch(p.url(ip));
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const d = await r.json();
          const fields = p.parse(d);
          out.innerHTML = '';
          if (v !== ip) out.innerHTML += `<dt>Resolved</dt><dd>${escapeHtml(v)} → ${escapeHtml(ip)}</dd>`;
          Object.entries(fields).forEach(([k, val]) => {
            if (val != null && val !== '') out.innerHTML += `<dt>${k}</dt><dd>${escapeHtml(String(val))}</dd>`;
          });
          out.innerHTML += `<dt style="color:var(--text-mute)">Source</dt><dd style="color:var(--text-mute)">${p.name}</dd>`;
          return;
        } catch (e) {
          lastErr = e;
        }
      }
      out.innerHTML = `<dt>Error</dt><dd>All providers failed: ${escapeHtml(lastErr?.message || 'unknown')}</dd>`;
    });
  }
};

