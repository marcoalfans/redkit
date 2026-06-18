# RedKit

**Pentest & Red Team Toolkit** — a fast, fully **client-side** collection of offensive-security helpers: encoders/decoders, hash tools, JWT, payload libraries, recon helpers, and reporting/CVSS calculators. No backend, no tracking — everything runs in your browser.

🔗 **Live:** https://marcoalfans.github.io/redkit/

## Tools

- **Recon & OSINT** — Google/Shodan dork generators, subdomain finder, JS file analyzer, security header analyzer, DNS lookup, URL parser, IP/domain info
- **Encoding** — Magic auto-detect, Base (Base64/32/58/85), URL, HTML, Hex, Binary, Morse, PowerShell encoder
- **Hashing** — hash generator, hash identifier, JWT decoder/editor, classic ciphers
- **Payloads & Web Exploitation** — XSS & SQLi libraries, CSRF PoC, IDOR/CSRF-bypass/SSRF/path-traversal helpers, GraphQL helper, DoS payload generator, reverse shell generator
- **Reporting** — CVSS 3.1 & 4.0 calculators, report template, notationer

Bilingual UI (EN / ID) via the in-page language toggle.

## Stack

Vanilla JavaScript, no build step, deployable as a static site (GitHub Pages).

```
index.html                 entry + <script> load order
assets/                    styles.css, favicon.svg, cvssicons.png
js/
  core.js                  helpers ($, el, escapeHtml, toast, copy, download)
                           + UI builders (card/field/resultHead/ghostBtn/wireCopy/wireRun)
                           + const TOOLS = {}          (loaded first)
  i18n.js                  EN/ID dictionary + translator
  shell.js                 hash router, search (⌘K), theme + language toggles
  nav.js                   per-tool EXAMPLES + loadTool   (loaded last)
  mascot.js
  tools/                   recon.js · crypto.js · payloads.js · reporting.js
                           _template.js  (starter for new tools)
  data/                    cvss-tips.en.js · cvss-tips.id.js · cvss4.js · rsg-data.js
docs/ADDING-A-TOOL.md      how to add a tool
```

## Adding a tool

Copy `js/tools/_template.js` into the matching category file, add a nav button in
`index.html`, and (optionally) an `EXAMPLES` entry + Indonesian strings. Full steps
in [`docs/ADDING-A-TOOL.md`](docs/ADDING-A-TOOL.md).

## Credits

RedKit builds on the HackTools toolkit by the **redlimit** team ([tools.redlimit.id](https://tools.redlimit.id/)), of which the author is a contributor.

## Disclaimer

For **authorized** security testing, research, and education only. You are responsible for how you use it.
