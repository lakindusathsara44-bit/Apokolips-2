# Apokolips Domain Management

## Supported address types

- **Custom apex domain:** \`example.com\`
- **Customer-owned subdomain:** \`shop.example.com\`
- **Apokolips subdomain:** \`myproject.apokolips.xyz\`

Every address is connected to one website in the workspace. A hostname is globally unique across Apokolips. Only workspace owners and editors can add, verify, provision, or remove domains; viewers can inspect their workspace's records.

## Domain lifecycle

\`pending_setup -> verified -> provisioning -> active\`

A domain may also be \`suspended\`.

1. **Pending setup:** a custom domain shows the unique \`_apokolips-verify.<domain>\` TXT name and token. Apokolips checks the exact token through a public DNS-over-HTTPS lookup.
2. **Verified:** the TXT record has been found. This confirms control of the hostname; it does not mean the site is already live.
3. **Provisioning:** the domain is registered with Cloudflare for SaaS, the platform shows the CNAME target and certificate validation records, and the customer completes the requested DNS records.
4. **Active:** Apokolips marks the host active only after Cloudflare reports both the custom hostname and its SSL certificate active **and** the Apokolips Worker routing flag is enabled. Public host lookup is limited to active domains linked to published websites.

Apokolips subdomains do not ask customers to publish a TXT record. They stay pending until platform wildcard DNS and Worker routing are ready, then the authenticated domain-control function verifies and activates them.

## Components in this repository

- \`dev-app/src/domains/\`: workspace domain dashboard, validation and status handling.
- \`supabase/functions/domain-control/index.ts\`: authenticated DNS verification and Cloudflare custom-hostname provisioning.
- \`supabase/migrations/\`: workspace RLS, column-level browser grants, lifecycle state and Cloudflare metadata.
- \`cloudflare/domain-router/\`: Cloudflare Worker that resolves active hostnames and routes website requests to the existing static Sales app.
- \`sales-app/src/main.jsx\`: supports both the legacy shared path (\`www.sales.apokolips.xyz/<site-slug>/<page>\`) and custom-host paths (\`https://customer-domain/<page>\`).

The Edge Function is deployed to Supabase as \`domain-control\` with JWT verification enabled. It is currently version 7.

## Cloudflare setup still required

The Worker and provisioning code are committed, but the Cloudflare zone, Cloudflare for SaaS configuration, Worker route and API credentials have **not** been connected in the Cloudflare account. The production DNS records have not been changed. Do not direct customer traffic to an assumed target.

To enable the routing layer:

1. Add the \`apokolips.xyz\` provider zone to the Cloudflare account and complete Cloudflare's zone activation process. Recreate and verify the existing DNS records before changing nameservers. Do not remove or alter the existing \`www.sales.apokolips.xyz\` GitHub Pages record.
2. Enable Cloudflare for SaaS for the provider zone and configure the fallback origin. Cloudflare's Worker-as-fallback-origin pattern uses an originless \`AAAA 100::\` record for the fallback hostname.
3. Deploy \`cloudflare/domain-router\` with Wrangler. Set the \`SUPABASE_PUBLISHABLE_KEY\` Worker secret. The Worker uses the Supabase public Data API only; no service-role key is placed in the Worker.
4. In the provider zone, route \`*/*\` to the domain-router Worker. Add a more-specific \`www.sales.apokolips.xyz/*\` route with no Worker so the existing GitHub Pages host remains a direct static origin and Worker subrequests do not loop back into the router.
5. Configure these Supabase Edge Function secrets:
   - \`CLOUDFLARE_API_TOKEN\`
   - \`CLOUDFLARE_ZONE_ID\`
   - \`CLOUDFLARE_CNAME_TARGET\` (the CNAME target shown by Cloudflare for SaaS)
   - \`APOKOLIPS_WILDCARD_ROUTING_READY=true\` only after the Worker route and wildcard DNS have been verified.
6. Create a least-privilege Cloudflare API token for the zone. The custom-hostname API requires **SSL and Certificates Write**; status refresh also needs read access. Keep the token in Supabase Edge Function secrets and never commit it.
7. Test with a disposable hostname. Register it in Apokolips, add the Apokolips TXT verification record, verify ownership, provision the Cloudflare hostname, add the Cloudflare CNAME and SSL validation records, then use **Check provisioning status**. Do not enable the global routing flag until the test host serves the intended published website and HTTPS works.

Cloudflare references:
- [Workers as your fallback origin](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/advanced-settings/worker-as-origin/)
- [Create a custom hostname](https://developers.cloudflare.com/api/resources/custom_hostnames/methods/create/)
- [Worker route patterns](https://developers.cloudflare.com/workers/configuration/routing/routes/)
- [Cloudflare API token permissions](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)

### Customer DNS instructions

After Cloudflare returns the actual CNAME target, customers should create the requested CNAME record and every validation record displayed in the dashboard. The target is not guessed or hardcoded. For an apex/root domain, the customer's DNS provider must support ALIAS/ANAME or CNAME flattening (or equivalent apex proxying); a conventional DNS CNAME cannot be placed at the zone apex.

Do not show a domain as live before the Cloudflare hostname and SSL statuses are both active and the Worker route is ready.

## Security model

- Browser users can insert only the domain-request columns. They cannot update lifecycle status, provider IDs, SSL state or routing targets. They also cannot delete registry rows directly; removal must pass through the authenticated Edge Function so a provisioned Cloudflare hostname is removed first.
- Authenticated workspace access is protected with RLS. Owners/editors may insert and remove; workspace members can read their own requests.
- Anonymous public routing can read only \`domain\`, \`website_id\`, and \`status\`, and the policy returns only active domains attached to published Sales websites. TXT tokens and provider validation metadata are not exposed to anonymous visitors.
- The Edge Function validates the user's bearer token and rechecks owner/editor membership before DNS or Cloudflare operations. Cloudflare credentials and Supabase service credentials remain server-side.
- The Worker allows only GET/HEAD, resolves the incoming hostname against the active domain registry, and serves the static Sales entry point only for an active registered hostname.

## Database migrations

The production Supabase project has these migrations applied:

- \`20261117112409_domain_management_foundation\`
- \`20261117112451_domain_management_validation\`
- \`20261117114018_domain_hostname_provisioning\`
- \`20261117114312_domain_hostname_verification_metadata\`

## Verification

Run \`npm test\` for domain-input and Worker routing tests. Run \`npm run build\` to build the landing page, Dev workspace and Sales app.

The Worker and Edge Function source are kept in the repository. Production DNS and Cloudflare routing remain a separate account-level activation step; no nameserver or live DNS changes are performed by this code change.
