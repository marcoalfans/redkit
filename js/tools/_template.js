/* ============================================================
   RedKit - NEW TOOL TEMPLATE  (reference only — NOT loaded)
   ------------------------------------------------------------
   To add a tool, copy the block below into the right category
   file (js/tools/recon|crypto|payloads|reporting.js), rename the
   id + element ids, then follow docs/ADDING-A-TOOL.md.

   Shared helpers available everywhere (defined in js/core.js):
     $(sel) / $$(sel)      querySelector / querySelectorAll(array)
     el(tag, attrs, kids)  build a DOM node
     escapeHtml(s)         escape user text before putting in HTML
     toast(msg)            transient notification
     copy(text)            copy to clipboard (+ toast)
     download(name, text)  save a file
     card(title, inner, opts)   .card wrapper; opts={id, hidden, cls, style}
     field(label, inner)        .field wrapper (label + input)
     ghostBtn(id, label)        a .btn.btn-ghost
     resultHead(title, btns)    .result-header (title + buttons)
     wireCopy(btnId, getText)   wire a copy button (text or fn)
     wireRun(btnId, fn, inId)   run fn on click + Enter inside #inId

   i18n: put RAW output in .result-box / <pre> (auto NOT translated).
         put labelled output in .info-grid. Add Indonesian strings
         for any new UI text to DICT in js/i18n.js.
   ============================================================ */

TOOLS['my-tool'] = {
  title: 'My Tool',                                   // shown in topbar (NOT translated)
  desc: 'One-line branding sentence describing what the tool does.', // translated if added to DICT
  render() {
    return `
      <div class="tool">
        ${card('Input', `
          ${field('Some label', `<input type="text" id="mt-in" placeholder="enter text...">`)}
          <button class="btn" id="mt-run">Generate</button>
        `)}
        ${card('', resultHead('Output', ghostBtn('mt-copy')) +
          `<div class="result-box" id="mt-out"></div>`, { id: 'mt-results', hidden: true })}
      </div>`;
  },
  init() {
    wireRun('mt-run', () => {
      const v = $('#mt-in').value.trim();
      if (!v) return toast('Enter some text');
      $('#mt-out').textContent = v.toUpperCase();   // ← your logic here
      $('#mt-results').style.display = 'block';
    }, 'mt-in');
    wireCopy('mt-copy', () => $('#mt-out').textContent);
  },
};
