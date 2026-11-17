# Apokolips Domain Management

## Included in this phase

- Workspace-scoped domain request registry for custom apex domains, customer-owned subdomains, and `*.apokolips.xyz` subdomains.
- Website association, unique-domain constraint, generated TXT ownership challenge, and workspace-member RLS.
- Owner/editor-only create and remove controls; viewers can inspect requests.
- Dashboard clearly labels every new request as **Pending setup**.

## Existing-hosting limitation

The current production endpoint is a static/shared host at `www.sales.apokolips.xyz` and customer sites are addressed by URL path. This deployment does not currently include wildcard host routing, a domain-aware reverse proxy, automated DNS lookup/verification, or automated certificate provisioning. Therefore this phase deliberately does **not** mark any domain verified or active and does not instruct customers to point production traffic at the shared endpoint.

To complete activation, the platform needs a hostname-aware routing layer (for example, an edge proxy/worker or hosting provider feature), a server-side DNS TXT verifier, and automated certificate issuance/renewal. Once that infrastructure is selected and deployed, the existing registry can be extended to transition `pending_setup -> verified -> active`.

## Apply the migration

Run `supabase/migrations/20261117120000_domain_management_foundation.sql` against the connected Supabase project after the existing builder migrations. No service-role key or secrets are required by the browser client.

## TXT challenge

Each request stores a unique value in `verification_token`. The intended TXT owner name is `_apokolips-verify.<registered-domain>`. DNS verification is a later server-side step; the dashboard currently displays the challenge for support review and does not claim it has been checked.
