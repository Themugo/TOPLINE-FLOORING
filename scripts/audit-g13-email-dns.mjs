import { setTimeout as delay } from 'node:timers/promises';

const domain = (process.env.TOPLINE_EMAIL_DOMAIN || 'toplinefloorandwaterproofing.co.ke').toLowerCase();
const selector = process.env.TOPLINE_DKIM_SELECTOR?.trim();
const resolvers = [
  { name: 'Cloudflare', url: 'https://cloudflare-dns.com/dns-query' },
  { name: 'Google', url: 'https://dns.google/resolve' },
];
const validDomain = /^[a-z0-9.-]+\.[a-z]{2,}$/i;
if (!validDomain.test(domain)) throw new Error('Invalid TOPLINE_EMAIL_DOMAIN.');
const queries = [
  { key: 'MX', name: domain, type: 'MX' },
  { key: 'SPF', name: domain, type: 'TXT' },
  { key: 'DMARC', name: `_dmarc.${domain}`, type: 'TXT' },
  ...(selector ? [{ key: 'DKIM', name: `${selector}._domainkey.${domain}`, type: 'TXT' }] : []),
];
async function query(resolver, name, type) {
  const url = new URL(resolver.url);
  url.searchParams.set('name', name);
  url.searchParams.set('type', type);
  const response = await fetch(url, {
    headers: { accept: 'application/dns-json' },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`${resolver.name} DNS HTTP ${response.status}`);
  const body = await response.json();
  return { status: body.Status, answers: (body.Answer || []).map(x => x.data), authenticated: body.AD === true };
}
const output = { domain, checked_at_utc: new Date().toISOString(), selectors: selector ? [selector] : [], resolvers: {}, findings: [] };
for (const resolver of resolvers) {
  output.resolvers[resolver.name] = {};
  for (const item of queries) {
    try {
      output.resolvers[resolver.name][item.key] = { name: item.name, ...(await query(resolver, item.name, item.type)) };
    } catch (error) {
      output.resolvers[resolver.name][item.key] = { name: item.name, error: String(error.message || error) };
    }
  }
}
const flatten = (answers=[]) => answers.map(x => String(x).replace(/^"|"$/g,''));
for (const resolver of resolvers) {
  const data = output.resolvers[resolver.name];
  const txt = flatten(data.SPF?.answers);
  const spf = txt.filter(x => /^v=spf1(?:\s|$)/i.test(x));
  const dmarc = flatten(data.DMARC?.answers).filter(x => /^v=DMARC1(?:\s|;|$)/i.test(x));
  const mx = data.MX?.answers || [];
  output.findings.push({ resolver: resolver.name, check: 'MX', status: data.MX?.error ? 'UNKNOWN_NETWORK' : mx.length ? 'FOUND' : 'NOT_FOUND', records: mx });
  output.findings.push({ resolver: resolver.name, check: 'SPF', status: data.SPF?.error ? 'UNKNOWN_NETWORK' : spf.length === 1 ? 'FOUND_SINGLE' : spf.length === 0 ? 'MISSING' : 'MULTIPLE_INVALID', records: spf });
  output.findings.push({ resolver: resolver.name, check: 'SPF_TERMINAL_POLICY', status: data.SPF?.error ? 'UNKNOWN_NETWORK' : spf.length===1 && /(?:~all|-all)\s*$/i.test(spf[0]) ? 'PASS' : 'REVIEW', detail: 'Do not add a second SPF TXT record. Confirm every legitimate sender before changing the terminal policy.' });
  output.findings.push({ resolver: resolver.name, check: 'DMARC', status: data.DMARC?.error ? 'UNKNOWN_NETWORK' : dmarc.length===1 ? 'FOUND' : dmarc.length===0 ? 'MISSING' : 'MULTIPLE_INVALID', records: dmarc });
  output.findings.push({ resolver: resolver.name, check: 'DMARC_POLICY', status: data.DMARC?.error ? 'UNKNOWN_NETWORK' : dmarc.length===1 && /(?:^|;)\s*p=(quarantine|reject)(?:;|$)/i.test(dmarc[0]) ? 'ENFORCED' : dmarc.length===1 ? 'MONITOR_OR_WEAK' : 'UNVERIFIED' });
  if (selector) {
    const dkim = flatten(data.DKIM?.answers);
    output.findings.push({ resolver: resolver.name, check: 'DKIM', status: data.DKIM?.error ? 'UNKNOWN_NETWORK' : dkim.some(x => /(?:v=DKIM1|p=)/i.test(x)) ? 'KEY_FOUND' : 'NOT_CONFIRMED', records: dkim });
  } else {
    output.findings.push({ resolver: resolver.name, check: 'DKIM', status: 'SELECTOR_REQUIRED', detail: 'Use the exact selector shown in Brevo or in the DKIM-Signature s= header. Selectors cannot be reliably discovered by guessing.' });
  }
}
const out = process.env.TOPLINE_EMAIL_DNS_REPORT || 'artifacts/g13-email-deliverability/dns-audit.json';
const fs = await import('node:fs');
const path = await import('node:path');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(output, null, 2)+'\n');
console.log(JSON.stringify(output,null,2));
if (output.findings.some(x => ['MISSING','MULTIPLE_INVALID'].includes(x.status))) process.exitCode = 1;
if (output.findings.some(x => x.status === 'UNKNOWN_NETWORK')) process.exitCode = 2;
