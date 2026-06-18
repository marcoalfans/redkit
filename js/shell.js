/* ============================================================
 RedKit - app shell: hash router, category tabs, command
 palette (search), theme + language toggles, tooltips, init.
 Depends on global loadTool() (js/nav.js).
 ============================================================ */
    (function () {
      const tabs = Array.from(document.querySelectorAll('.rk-tab'));
      const sections = Array.from(document.querySelectorAll('.nav-section[data-cat]'));
      const items = Array.from(document.querySelectorAll('.nav-item[data-tool]'));
      const sidebar = document.querySelector('.sidebar');
      const content = document.getElementById('content');
      const titleEl = document.getElementById('currentToolTitle');
      const descEl = document.getElementById('currentToolDesc');

      function show(cat) {
        sections.forEach(s => { s.style.display = s.dataset.cat === cat ? '' : 'none'; });
        tabs.forEach(t => t.classList.toggle('active', t.dataset.cat === cat));
      }
      function syncCat() {
        const active = document.querySelector('.nav-item.active');
        const sec = active && active.closest('.nav-section[data-cat]');
        if (sec) show(sec.dataset.cat);
      }

      // ----- landing / home -----
      function homeHTML() {
        const cards = tabs.map(t => {
          const cat = t.dataset.cat;
          const label = t.textContent.trim();
          const n = sections.filter(s => s.dataset.cat === cat).reduce((a, s) => a + s.querySelectorAll('.nav-item').length, 0);
          return '<button class="welcome-item" data-go="' + cat + '"><div class="welcome-info"><h3>' + label + '</h3><p>' + n + ' tools</p></div></button>';
        }).join('');
        return '<div class="welcome"><div class="welcome-card"><h1>RedKit</h1><p>Pentest &amp; Red Team Toolkit — pick a category to get started.</p><div class="welcome-grid">' + cards + '</div></div></div>';
      }
      function showHome() {
        items.forEach(n => n.classList.remove('active'));
        tabs.forEach(t => t.classList.remove('active'));
        sections.forEach(s => { s.style.display = 'none'; });
        if (titleEl) titleEl.textContent = 'RedKit';
        if (descEl) descEl.textContent = 'Pentest & Red Team Toolkit';
        if (content) {
          content.innerHTML = homeHTML();
          content.querySelectorAll('[data-go]').forEach(el => el.addEventListener('click', () => {
            const tab = tabs.find(t => t.dataset.cat === el.dataset.go);
            if (tab) tab.click();
          }));
        }
      }

      // ----- category tabs (drive the hash; the router renders) -----
      tabs.forEach(t => t.addEventListener('click', () => {
        const sec = sections.find(s => s.dataset.cat === t.dataset.cat);
        const first = sec && sec.querySelector('.nav-item');
        if (first) location.hash = '#/' + first.dataset.tool; else show(t.dataset.cat);
        if (sidebar) sidebar.classList.remove('open');
      }));

      // ----- nav items (drive the hash; the router renders) -----
      items.forEach(it => it.addEventListener('click', () => {
        const want = '#/' + it.dataset.tool;
        if (location.hash !== want && !location.hash.startsWith(want + '/')) location.hash = want;
        if (sidebar) sidebar.classList.remove('open');
      }));

      // ----- deep-link routing (#/<tool>) — single entry point into loadTool -----
      function hashKey() { const m = location.hash.match(/^#\/([\w.-]+)/); return m ? m[1] : null; }
      function route() {
        const key = hashKey();
        if (!key) return false;
        const target = document.querySelector('.nav-item[data-tool="' + key + '"]');
        if (!target) return false;
        const active = document.querySelector('.nav-item.active');
        const hasSub = location.hash.startsWith('#/' + key + '/');
        if (!active || active.dataset.tool !== key || hasSub) loadTool(key);
        syncCat();
        return true;
      }
      window.addEventListener('hashchange', () => { if (!route()) showHome(); });

      // ----- theme toggle -----
      const root = document.documentElement;
      const tbtn = document.getElementById('rkTheme');
      const ticon = document.getElementById('rkThemeIcon');
      function applyTheme(t) { root.setAttribute('data-theme', t); if (ticon) ticon.className = t === 'dark' ? 'fas fa-sun' : 'fas fa-moon'; }
      applyTheme(localStorage.getItem('theme') || 'dark');
      if (tbtn) tbtn.addEventListener('click', () => {
        const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', next); applyTheme(next);
      });

      // ----- language toggle (EN / ID) -----
      const langBtn = document.getElementById('rkLang');
      function syncLangLabel() { if (langBtn && window.getLang) langBtn.textContent = window.getLang() === 'id' ? 'ID' : 'EN'; }
      function rerenderCurrent() {
        const key = hashKey();
        if (key && document.querySelector('.nav-item[data-tool="' + key + '"]')) { loadTool(key); syncCat(); }
        else showHome();
      }
      if (langBtn) langBtn.addEventListener('click', () => {
        const next = (window.getLang && window.getLang() === 'id') ? 'en' : 'id';
        if (window.setLang) window.setLang(next);
        syncLangLabel();
        rerenderCurrent();
      });
      syncLangLabel();

      const ham = document.getElementById('rkHamburger');
      if (ham) ham.addEventListener('click', () => sidebar && sidebar.classList.toggle('open'));

      // floating tooltips (CVSS metric/option descriptions)
      const tipEl = document.createElement('div');
      tipEl.className = 'rk-tip';
      document.body.appendChild(tipEl);
      const showTip = (el) => {
        const txt = el.getAttribute('data-tip');
        if (!txt) return;
        tipEl.textContent = txt;
        tipEl.style.display = 'block';
        const r = el.getBoundingClientRect();
        const tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
        let left = r.left + r.width / 2 - tw / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
        let top = r.top - th - 10;
        if (top < 8) top = r.bottom + 10;
        tipEl.style.left = left + 'px';
        tipEl.style.top = top + 'px';
      };
      const hideTip = () => { tipEl.style.display = 'none'; };
      document.addEventListener('mouseover', (e) => { const el = e.target.closest('[data-tip]'); if (el && el.getAttribute('data-tip')) showTip(el); });
      document.addEventListener('mouseout', (e) => { if (e.target.closest('[data-tip]')) hideTip(); });

      // ----- search (Cmd/Ctrl + K) -----
      const INDEX = items.map(it => ({ key: it.dataset.tool, title: it.textContent.trim(), cat: it.closest('.nav-section').querySelector('.nav-title').textContent }));
      const modal = document.getElementById('rkSearchModal');
      const input = document.getElementById('rkSearchInput');
      const results = document.getElementById('rkSearchResults');
      let cur = [], sel = 0;
      function draw(q) {
        q = q.trim().toLowerCase();
        cur = q ? INDEX.filter(t => t.title.toLowerCase().includes(q) || t.cat.toLowerCase().includes(q) || t.key.includes(q)) : INDEX;
        sel = 0;
        if (!cur.length) { results.innerHTML = '<div class="rk-search-empty">No tools found.</div>'; return; }
        results.innerHTML = cur.map((t, i) => '<div class="rk-result' + (i === 0 ? ' sel' : '') + '" data-i="' + i + '"><span class="rk-result-title">' + t.title + '</span><span class="rk-result-cat">' + t.cat + '</span></div>').join('');
        results.querySelectorAll('.rk-result').forEach(el => {
          const i = +el.dataset.i;
          el.addEventListener('click', () => choose(i));
          el.addEventListener('mousemove', () => setSel(i));
        });
      }
      function setSel(i) { sel = i; results.querySelectorAll('.rk-result').forEach((el, j) => el.classList.toggle('sel', j === i)); const s = results.querySelector('.rk-result.sel'); if (s) s.scrollIntoView({ block: 'nearest' }); }
      function choose(i) { const t = cur[i]; if (!t) return; closeSearch(); location.hash = '#/' + t.key; }
      function openSearch() { modal.classList.add('open'); input.value = ''; draw(''); setTimeout(() => input.focus(), 0); }
      function closeSearch() { modal.classList.remove('open'); }
      const sbtn = document.getElementById('rkSearchBtn');
      if (sbtn) sbtn.addEventListener('click', openSearch);
      if (modal) modal.addEventListener('click', e => { if (e.target === modal) closeSearch(); });
      if (input) {
        input.addEventListener('input', () => draw(input.value));
        input.addEventListener('keydown', e => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setSel(Math.min(sel + 1, cur.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(Math.max(sel - 1, 0)); }
          else if (e.key === 'Enter') { e.preventDefault(); choose(sel); }
        });
      }
      document.addEventListener('keydown', e => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); modal.classList.contains('open') ? closeSearch() : openSearch(); }
        else if (e.key === 'Escape' && modal.classList.contains('open')) closeSearch();
      });

      // ----- init (root shows landing, not a tool) -----
      function init() { if (!route()) showHome(); }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0));
      else setTimeout(init, 0);
    })();
