# Adding a new tool to RedKit

RedKit is a single-page, no-build app. A "tool" is one entry in the global
`TOOLS` registry with a `render()` (returns HTML) and an optional `init()`
(wires events after the HTML is inserted). The hash router (`js/shell.js`)
calls `loadTool(key)` which renders the tool into `#content`.

## File layout

```
index.html              entry (markup + <script> load order)
assets/                 styles.css, favicon.svg, cvssicons.png
js/
  core.js               $ , el, escapeHtml, toast, copy, download,
                        UI builders (card/field/ghostBtn/resultHead/wireCopy/wireRun),
                        const TOOLS = {}        ← loaded FIRST
  i18n.js               EN/ID dictionary + translator
  data/                 cvss-tips.en.js, cvss-tips.id.js, cvss4.js, rsg-data.js
  tools/                each category is a folder of small files (loaded in listed order)
    recon/              dorks, discovery, headers, network, builders
    crypto/             codecs (shared infra), encoders, magic, hashing, jwt, ciphers, text
    payloads/           generators, library (shared infra), web, api, revshell, injection
    reporting/          cvss, report
    _template.js        copy-paste starter (NOT loaded)
  nav.js                EXAMPLES + loadTool          ← loaded LAST (before shell.js)
  shell.js              router, search, theme + language toggles
  mascot.js
```

Load order matters only at the boundaries: `core.js` (defines `TOOLS`) must be
first, and `nav.js` (defines `loadTool`) after every `tools/**/*.js`. Tool
definitions reference helpers at runtime, so file order is mostly free — the one
rule is that shared infra evaluated at top level must load before its dependents:
within `crypto/`, `codecs.js` (defines the codec primitives + `CODECS`/`BASE_TYPES`,
which other files capture) loads first; within `payloads/`, `library.js` (the
`renderPayloadLibrary`/`initPayloadLibrary` helpers) loads before the libraries
that use them. Each file is registered as its own `<script>` in `index.html`.

## Steps

1. **Register the tool.** Copy the block in `js/tools/_template.js` into the
   file under the category folder it belongs to (e.g. `js/tools/crypto/text.js`),
   or add a new file there and register it as a `<script>` in `index.html`.
   Pick a unique kebab-case `key`
   (`TOOLS['my-tool']`) and unique element ids.

2. **Add the nav button** in `index.html`, inside the matching
   `.nav-section`:
   ```html
   <button class="nav-item" data-tool="my-tool">My Tool</button>
   ```
   The `data-tool` value MUST equal the `TOOLS` key. The tool is now reachable
   at `#/my-tool` and via search (⌘K).

3. **(Optional) Example button.** Add an entry to `EXAMPLES` in `js/nav.js`
   to populate sample input when the topbar "Example" button is clicked:
   ```js
   'my-tool': () => { exFill('mt-in', 'sample'); exClick('mt-run'); },
   ```

4. **(Optional) Indonesian translation.** Any new user-facing English string
   (label, placeholder, button, heading, the tool `desc`) stays English in ID
   mode unless you add it to `DICT` in `js/i18n.js`. The key must match the
   rendered text exactly (use `&` not `&amp;`, real newlines, straight quotes).

## Conventions

- Use the `card()` / `field()` / `resultHead()` / `ghostBtn()` builders for
  markup, and `wireCopy()` / `wireRun()` for wiring, so tools stay consistent.
- Wrap raw/generated output in `.result-box` or `<pre>` — the i18n pass never
  touches those, so decoded data or payloads are never mistranslated.
- Put labelled key/value output in a `<dl class="info-grid">` (its labels get
  translated, values do not).
- Escape any user-controlled text with `escapeHtml()` before inserting as HTML.
- Hash deep-links: write to `location.hash` for shareable state (see the CVSS
  tools for `#/3.1/CVSS:3.1/...`).
