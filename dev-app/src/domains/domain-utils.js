const DOMAIN_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const AP_OKOLIPS_SUFFIX = '.apokolips.xyz';

const RESERVED_APOKOLIPS_DOMAINS = new Set([
  'apokolips.xyz',
  'www.apokolips.xyz',
  'sales.apokolips.xyz',
  'www.sales.apokolips.xyz',
  'constantine.apokolips.xyz',
  'www.constantine.apokolips.xyz',
  'learn.english.apokolips.xyz',
  'www.learn.english.apokolips.xyz',
  'gpa.calculator.apokolips.xyz',
  'www.gpa.calculator.apokolips.xyz',
  'dev.apokolips.xyz',
  'www.dev.apokolips.xyz',
  'api.apokolips.xyz',
  'admin.apokolips.xyz',
  'assets.apokolips.xyz',
  'static.apokolips.xyz'
]);

const RESERVED_APOKOLIPS_LABELS = new Set([
  'www', 'sales', 'dev', 'api', 'admin', 'app', 'mail', 'ftp',
  'cdn', 'assets', 'static', 'status', 'support'
]);

export const DOMAIN_STATUSES = [
  { value: 'pending_setup', label: 'Pending setup' },
  { value: 'verified', label: 'Verified' },
  { value: 'provisioning', label: 'Provisioning' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' }
];

export function normalizeDomain(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const withoutScheme = raw.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  // Keep path/query/credential input intact so validation rejects it instead
  // of silently registering a different hostname than the user entered.
  if (/[/?#@]/.test(withoutScheme) || withoutScheme.includes('\\') || withoutScheme.includes(':')) return withoutScheme.toLowerCase();

  const withoutFinalDot = withoutScheme.replace(/\.$/, '');
  try {
    const parsed = new URL('https://' + withoutFinalDot);
    if (parsed.pathname !== '/' || parsed.search || parsed.hash || parsed.username || parsed.password || parsed.port) {
      return withoutFinalDot.toLowerCase();
    }
    return parsed.hostname.toLowerCase().replace(/\.$/, '');
  } catch {
    return withoutFinalDot.toLowerCase();
  }
}

export function validateDomainInput(value, kind) {
  const domain = normalizeDomain(value);

  if (!['custom_domain', 'custom_subdomain', 'apokolips_subdomain'].includes(kind)) {
    return { domain, error: 'Choose a supported domain type.' };
  }
  if (!DOMAIN_RE.test(domain) || domain.includes('..') || /^(?:\d{1,3}\.){3}\d{1,3}$/.test(domain)) {
    return { domain, error: 'Enter a valid hostname, for example example.com or shop.example.com.' };
  }

  const isApokolipsDomain = domain === 'apokolips.xyz' || domain.endsWith(AP_OKOLIPS_SUFFIX);
  if (kind === 'apokolips_subdomain' && !domain.endsWith(AP_OKOLIPS_SUFFIX)) {
    return { domain, error: 'Apokolips subdomains must end with .apokolips.xyz.' };
  }
  if (kind !== 'apokolips_subdomain' && isApokolipsDomain) {
    return { domain, error: 'Choose Apokolips subdomain for addresses under apokolips.xyz.' };
  }
  if (kind === 'apokolips_subdomain') {
    const prefix = domain.slice(0, -AP_OKOLIPS_SUFFIX.length);
    if (!prefix || RESERVED_APOKOLIPS_LABELS.has(prefix) || RESERVED_APOKOLIPS_DOMAINS.has(domain)) {
      return { domain, error: 'That Apokolips address is reserved for platform services.' };
    }
  }

  return { domain, error: '' };
}

export function makeVerificationToken(cryptoProvider = globalThis.crypto) {
  if (!cryptoProvider?.getRandomValues) {
    throw new Error('Secure random number generation is unavailable in this browser.');
  }
  const bytes = new Uint8Array(24);
  cryptoProvider.getRandomValues(bytes);
  return 'apokolips-verification=' + Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function domainTypeLabel(kind) {
  return ({
    custom_domain: 'Custom domain',
    custom_subdomain: 'Your subdomain',
    apokolips_subdomain: 'Apokolips subdomain'
  })[kind] || 'Domain';
}

export function domainStatusLabel(status) {
  return DOMAIN_STATUSES.find(item => item.value === status)?.label || 'Unknown status';
}

export function domainStatusNote(status) {
  return ({
    pending_setup: 'Add the TXT ownership record, then request verification. Routing and SSL are still pending.',
    verified: 'Ownership is verified. Start hostname and SSL provisioning to continue.',
    provisioning: 'Cloudflare is validating the hostname and SSL certificate. Add the requested DNS records, then check status again.',
    active: 'This hostname is active on Apokolips hosting.',
    suspended: 'This hostname is suspended. Contact Apokolips support before changing DNS.'
  })[status] || 'The domain status is not recognised. Contact Apokolips support.';
}
