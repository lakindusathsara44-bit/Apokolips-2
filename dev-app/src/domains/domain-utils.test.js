import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeDomain,
  validateDomainInput,
  makeVerificationToken,
  domainStatusLabel,
  domainStatusNote
} from './domain-utils.js';

test('normalizes schemes, case and a trailing DNS dot', () => {
  assert.equal(normalizeDomain(' HTTPS://ExAmPle.COM./ '), 'example.com');
});

test('normalizes internationalized domains to ASCII IDNA form', () => {
  assert.equal(normalizeDomain('bücher.de'), 'xn--bcher-kva.de');
});

test('rejects paths, credentials, ports and malformed hostnames', () => {
  for (const value of ['example.com/path', 'user@example.com', 'example.com:8080', 'example.com:443', 'example..com', 'not a domain', '127.0.0.1']) {
    assert.notEqual(validateDomainInput(value, 'custom_domain').error, '');
  }
});

test('accepts custom apex and customer-owned subdomain hostnames', () => {
  assert.equal(validateDomainInput('example.com', 'custom_domain').error, '');
  assert.equal(validateDomainInput('shop.example.com', 'custom_subdomain').error, '');
});

test('requires Apokolips addresses to use the platform suffix', () => {
  assert.equal(validateDomainInput('myproject.apokolips.xyz', 'apokolips_subdomain').error, '');
  assert.notEqual(validateDomainInput('myproject.example.com', 'apokolips_subdomain').error, '');
  assert.notEqual(validateDomainInput('myproject.apokolips.xyz', 'custom_domain').error, '');
});

test('protects platform-owned hostnames', () => {
  for (const value of ['sales.apokolips.xyz', 'www.sales.apokolips.xyz', 'learn.english.apokolips.xyz', 'api.apokolips.xyz']) {
    assert.notEqual(validateDomainInput(value, 'apokolips_subdomain').error, '');
  }
});

test('generates a database-compatible verification token', () => {
  const fakeCrypto = { getRandomValues(bytes) { bytes.fill(15); return bytes; } };
  assert.equal(makeVerificationToken(fakeCrypto), 'apokolips-verification=' + '0f'.repeat(24));
});

test('maps known statuses and makes future states explicit', () => {
  assert.equal(domainStatusLabel('active'), 'Active');
  assert.equal(domainStatusLabel('provisioning'), 'Provisioning');
  assert.match(domainStatusNote('verified'), /not live/i);
  assert.equal(domainStatusLabel('unexpected'), 'Unknown status');
});
