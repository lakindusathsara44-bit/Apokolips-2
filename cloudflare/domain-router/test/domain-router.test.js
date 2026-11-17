import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest } from '../src/index.js';

const env = {
  SUPABASE_URL: 'https://project-ref.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_public_key',
  ORIGIN_BASE: 'https://www.sales.apokolips.xyz'
};

function fakeFetch({ active = true, originStatus = 200 } = {}) {
  const calls = [];
  const fetcher = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    calls.push({ url: url.toString(), init });

    if (url.hostname === 'project-ref.supabase.co') {
      if (url.pathname.endsWith('/builder_domains')) {
        return Response.json(active ? [{ website_id: 'website-123' }] : []);
      }
    }
    if (url.hostname === 'www.sales.apokolips.xyz') {
      return new Response(url.pathname === '/sales.html' ? '<div id="sales-root"></div>' : 'bundle-content', {
        status: originStatus,
        headers: { 'content-type': url.pathname.endsWith('.js') ? 'text/javascript' : 'text/html' }
      });
    }
    throw new Error('Unexpected origin: ' + url.hostname);
  };
  return { fetcher, calls };
}

test('serves the published sales app for a registered active custom hostname', async () => {
  const mock = fakeFetch();
  const response = await handleRequest(new Request('https://shop.customer.example/about'), env, mock.fetcher);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /sales-root/);
  assert.equal(mock.calls.some(call => call.url.includes('domain=eq.shop.customer.example')), true);
  assert.equal(mock.calls.at(-1).url, 'https://www.sales.apokolips.xyz/sales.html');
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('returns 404 for a hostname that is not active in the registry', async () => {
  const mock = fakeFetch({ active: false });
  const response = await handleRequest(new Request('https://unknown.example/'), env, mock.fetcher);
  assert.equal(response.status, 404);
  assert.match(await response.text(), /not connected/i);
  assert.equal(mock.calls.length, 1);
});

test('proxies only the shared sales asset prefix to the static origin', async () => {
  const mock = fakeFetch();
  const response = await handleRequest(new Request('https://customer.example/assets/sales/sales.js'), env, mock.fetcher);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'bundle-content');
  assert.equal(mock.calls.length, 1);
  assert.equal(mock.calls[0].url, 'https://www.sales.apokolips.xyz/assets/sales/sales.js');
});

test('rejects mutation methods', async () => {
  const mock = fakeFetch();
  const response = await handleRequest(new Request('https://customer.example/', { method: 'POST' }), env, mock.fetcher);
  assert.equal(response.status, 405);
  assert.equal(mock.calls.length, 0);
});

test('fails closed when required runtime configuration is missing', async () => {
  const response = await handleRequest(new Request('https://customer.example/'), {
    SUPABASE_URL: env.SUPABASE_URL
  }, async () => { throw new Error('must not call fetch'); });
  assert.equal(response.status, 503);
});

test('returns 502 when the static origin fails after a valid lookup', async () => {
  const response = await handleRequest(
    new Request('https://customer.example/'),
    env,
    async input => {
      const url = new URL(typeof input === 'string' ? input : input.url);
      if (url.hostname === 'project-ref.supabase.co') return Response.json([{ website_id: 'website-123' }]);
      throw new Error('origin offline');
    }
  );
  assert.equal(response.status, 502);
  assert.match(await response.text(), /static_origin_unavailable/);
});
