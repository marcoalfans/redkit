# RedKit

**Pentest & Red Team Toolkit** — a fast, fully **client-side** collection of offensive-security helpers: encoders/decoders, hash tools, JWT, payload libraries, recon helpers, and reporting/CVSS calculators. No backend, no tracking — everything runs in your browser.

🔗 **Live:** https://marcoalfans.github.io/redkit/

## Tools

- **Recon & OSINT** — Google/Shodan dork generators, subdomain finder, JS file analyzer, security header analyzer, DNS lookup, URL parser, IP/domain info
- **Encoding** — Base64, URL, HTML, Hex, Base32, Base58, Base85/ASCII85, Binary, Morse
- **Crypto & Hash** — hash generator, hash identifier, JWT decoder/editor, classic ciphers
- **Payloads & Web Exploitation** — XSS & SQLi libraries, CSRF PoC, IDOR/CSRF-bypass/SSRF/LFI helpers, GraphQL helper, DoS payload generator
- **Reporting** — CVSS 3.1 & 4.0 calculators, report template

## Stack

Vanilla JavaScript, single-file app (`app.js`) + `styles.css`. No build step, deployable as a static site.

## Credits

RedKit builds on the HackTools toolkit by the **redlimit** team ([tools.redlimit.id](https://tools.redlimit.id/)), of which the author is a contributor.

## Disclaimer

For **authorized** security testing, research, and education only. You are responsible for how you use it.
