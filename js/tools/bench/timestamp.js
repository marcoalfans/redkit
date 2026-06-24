// RedKit · bench/timestamp.js
// ===== TIMESTAMP CONVERTER =====
const TS_TZS = (() => {
  try { return Intl.supportedValuesOf('timeZone'); } catch (e) { return ['UTC', 'America/New_York', 'Europe/London', 'Europe/Berlin', 'Asia/Jakarta', 'Asia/Tokyo', 'Australia/Sydney']; }
})();
const TS_LOCAL_TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return 'UTC'; } })();

// parse arbitrary input -> epoch milliseconds (or NaN). digit-length picks the unit.
const tsParse = (raw) => {
  raw = raw.trim();
  if (!raw) return Date.now();
  if (raw.toLowerCase() === 'now') return Date.now();
  if (/^-?\d+$/.test(raw)) {
    const digits = raw.replace('-', '').length;
    const n = Number(raw);
    if (digits <= 11) return n * 1000;        // seconds
    if (digits <= 14) return n;               // milliseconds
    if (digits <= 17) return Math.floor(n / 1000);   // microseconds
    return Math.floor(n / 1e6);               // nanoseconds
  }
  const t = Date.parse(raw);
  return isNaN(t) ? NaN : t;
};

const tsRelative = (ms) => {
  try {
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
    const diff = ms - Date.now(), abs = Math.abs(diff);
    const units = [['year', 31536e6], ['month', 2592e6], ['week', 6048e5], ['day', 864e5], ['hour', 36e5], ['minute', 6e4], ['second', 1e3]];
    for (const [u, per] of units) if (abs >= per || u === 'second') return rtf.format(Math.round(diff / per), u);
  } catch (e) { return ''; }
};
const tsInTz = (d, tz) => { try { return new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'long', timeZone: tz }).format(d); } catch (e) { return 'N/A'; } };
const tsIsoWeek = (d) => { const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const ys = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return { week: Math.ceil(((t - ys) / 864e5 + 1) / 7), year: t.getUTCFullYear() }; };
const tsDayOfYear = (d) => Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 0)) / 864e5);

let tsTick = null; // single live-clock interval; cleared on each (re)init to avoid leaks
TOOLS['timestamp'] = {
  title: 'Timestamp Converter',
  desc: 'Convert between Unix epoch, ISO 8601 and human dates, across time zones, with a live clock.',
  render() {
    const rows = [
      ['Unix (seconds)', 'ts-sec'], ['Unix (milliseconds)', 'ts-ms'], ['ISO 8601 (UTC)', 'ts-iso'],
      ['UTC', 'ts-utc'], ['Local time', 'ts-local'], ['Timezone', 'ts-tz'], ['Relative', 'ts-rel'],
      ['Day of week', 'ts-dow'], ['Day of year', 'ts-doy'], ['ISO week', 'ts-week'], ['Quarter', 'ts-q'],
    ];
    return `
      <div class="tool">
        ${card('Input', `
          ${field('Timestamp or date', `<input type="text" id="ts-in" placeholder="1700000000, 2024-01-02T03:04:05Z, or 'now'" autocomplete="off">`)}
          <div class="ts-controls">
            <button class="btn btn-secondary" id="ts-now">Now (live)</button>
            ${field('Timezone', `<select id="ts-tzsel">${TS_TZS.map(z => `<option value="${z}"${z === TS_LOCAL_TZ ? ' selected' : ''}>${z}</option>`).join('')}</select>`)}
          </div>
        `)}
        ${card('', `<div class="ts-warn" id="ts-err" style="display:none">⚠ Could not parse that date.</div>
          <div class="ts-rows">${rows.map(([l, id]) => `<div class="ts-row"><span class="ts-label">${l}</span><code class="ts-val" id="${id}"></code><button class="btn btn-ghost" data-cp="${id}">Copy</button></div>`).join('')}</div>`,
          { id: 'ts-results' })}
      </div>`;
  },
  init() {
    const set = (id, v) => { const e = $('#' + id); if (e) e.textContent = v; };
    const update = () => {
      const raw = $('#ts-in').value;
      const ms = tsParse(raw);
      const err = $('#ts-err'), rows = $('.ts-rows');
      if (isNaN(ms)) { err.style.display = ''; rows.style.display = 'none'; return; }
      err.style.display = 'none'; rows.style.display = '';
      const d = new Date(ms), tz = $('#ts-tzsel').value, wk = tsIsoWeek(d);
      set('ts-sec', Math.floor(ms / 1000));
      set('ts-ms', ms);
      set('ts-iso', d.toISOString());
      set('ts-utc', d.toUTCString());
      set('ts-local', d.toString());
      set('ts-tz', tsInTz(d, tz));
      set('ts-rel', tsRelative(ms));
      set('ts-dow', d.toLocaleDateString(undefined, { weekday: 'long', timeZone: 'UTC' }));
      set('ts-doy', tsDayOfYear(d) + ' / ' + (((d.getUTCFullYear() % 4 === 0 && d.getUTCFullYear() % 100 !== 0) || d.getUTCFullYear() % 400 === 0) ? 366 : 365));
      set('ts-week', `${wk.year}-W${String(wk.week).padStart(2, '0')}`);
      set('ts-q', 'Q' + (Math.floor(d.getUTCMonth() / 3) + 1) + ' ' + d.getUTCFullYear());
    };
    $('#ts-in').addEventListener('input', update);
    $('#ts-tzsel').addEventListener('change', update);
    $('#ts-now').addEventListener('click', () => { $('#ts-in').value = ''; update(); });
    wireCopyRefs($('#ts-results'));
    // live tick: keeps "now" + relative current. Clear any prior interval first
    // (re-init via language toggle / re-render would otherwise stack intervals).
    clearInterval(tsTick);
    tsTick = setInterval(() => { if (!$('#ts-in')) { clearInterval(tsTick); return; } update(); }, 1000);
    update();
  }
};
