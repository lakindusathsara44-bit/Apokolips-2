# Apokolips customer website URL routing

## Public URL formats

The existing shared hosting URL remains:

\`https://www.sales.apokolips.xyz/{project-slug}/{page-slug}\`

After a customer hostname is verified, provisioned and active, the same published website can be served as:

- \`https://example.com/\` — homepage
- \`https://example.com/about\` — a published page
- \`https://shop.example.com/\` — the homepage on a customer-owned subdomain
- \`https://project.apokolips.xyz/\` — an Apokolips subdomain after wildcard routing is enabled

The site identifier is resolved from the active domain registry. A request hostname is never treated as authorization to edit a website.

## Request path

1. Cloudflare for SaaS receives the custom hostname traffic.
2. A Cloudflare Worker route (\`*/*\`) invokes \`cloudflare/domain-router/src/index.js\`.
3. The Worker resolves the exact hostname against \`public.builder_domains\` using the anonymous Data API policy. The policy returns only active domains attached to published Sales websites.
4. The Worker serves the existing \`sales.html\` application from the current GitHub Pages origin and proxies static assets from \`/assets/sales/\`.
5. \`sales-app/src/main.jsx\` resolves the website by the active hostname for custom-host requests, or by the existing project slug for the legacy shared-host URL.
6. The Sales app loads only published pages and components from Supabase.

Unregistered, pending, provisioning, suspended, unpublished or unknown hostnames are not served as customer websites.

## Routing and origin safeguards

- Keep \`www.sales.apokolips.xyz\` as the existing static origin.
- On the Cloudflare provider zone, route \`*/*\` to the Worker and add a more-specific \`www.sales.apokolips.xyz/*\` route with Worker set to None. The specific exclusion prevents a Worker request to the static origin from looping back through the wildcard route.
- The Worker allows only GET and HEAD requests.
- The Worker does not execute customer-authored JavaScript in the platform origin. Published pages are rendered by the existing React Sales application.
- Public Data API grants expose only the hostname, website ID and active status columns from the domain registry; TXT challenge tokens and Cloudflare provider details are not public.
- Worker and Edge Function configuration must be completed before the dashboard marks a hostname active.

## Current implementation and deployment boundary

The repository now contains:
- Domain registry and RLS migrations.
- Authenticated \`domain-control\` Edge Function for TXT ownership verification and Cloudflare hostname/SSL provisioning.
- Cloudflare Worker source and Node routing tests.
- Sales app hostname-based resolution for active custom domains.
- Workspace UI actions to verify DNS, provision the hostname and refresh Cloudflare status.

The Supabase Edge Function and database migrations have been deployed to the connected Supabase project. The Cloudflare Worker source is committed but has **not** been deployed to a Cloudflare account. Cloudflare for SaaS, the \`apokolips.xyz\` provider zone, the Worker route, and the required Cloudflare API token and CNAME target remain to be configured. Existing DNS records have not been changed.

See [domain-management.md](./domain-management.md) for the exact setup checklist and required secrets.
