# Apokolips Domain Management

## Current capability

- Workspace-scoped records for custom apex domains, customer-owned subdomains, and Apokolips subdomains.
- A website association, globally unique hostname constraint, and a per-domain DNS TXT ownership challenge.
- Owner/editor-only create and remove controls; workspace viewers can inspect records.
- Domain normalization supports case-insensitive input, optional HTTP(S) schemes, trailing DNS dots, and internationalized hostnames converted to IDNA ASCII.
- Status-aware filtering and status messaging for `pending_setup`, `verified`, `active`, and `suspended`.
- Database row-level security restricts records to members of their workspace. Only owners and editors may create or remove records.

## Hosting limitation

The current production endpoint is a static/shared host at `www.sales.apokolips.xyz`, and customer sites are addressed by URL path, for example `www.sales.apokolips.xyz/<site-slug>`.

The dashboard and database are now connected, and domain requests can be registered. However, this deployment does not yet include:
- Hostname-aware routing or a multi-tenant reverse proxy.
- Server-side DNS TXT verification.
- Automated SSL certificate issuance and renewal.

Therefore new requests remain **Pending setup**. Do not point a customer domain at the shared host, and do not represent a request as live, until a hostname routing target and certificate process are deployed.

## Supabase migrations

The production Supabase project has these migrations applied:
- `20261117112409_domain_management_foundation`
- `20261117112451_domain_management_validation`

The foundation migration creates `public.builder_domains` with RLS, owner/editor write policies, workspace-member read policy, explicit authenticated grants, and indexes. The validation migration keeps the hostname expression valid for DNS labels and indexes the creator foreign key.

## TXT challenge

Each request stores a random value in `verification_token`. The intended TXT owner name is `_apokolips-verify.<registered-domain>`.

The dashboard currently displays the TXT name and value so a customer or support operator can configure and inspect it. DNS lookup and verification are not automated yet; the UI does not claim a record has been checked.

## Verification

Run `npm test` to execute the hostname normalization and validation regression tests. Run `npm run build` to build the existing index, developer workspace, and sales app.
