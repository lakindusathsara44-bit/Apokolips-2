# Apokolips customer website URL routing

## Required public URL format

Customer projects are published using this hostname and path format:

`https://www.sales.apokolips.xyz/{project-slug}`

Example:

`https://www.sales.apokolips.xyz/usersnameofproject1`

## Routing model

- `www.sales.apokolips.xyz` is the shared public hosting endpoint for the Sales website namespace.
- The first path segment is the unique, normalized project slug.
- The hosting router resolves the hostname and slug to a published deployment record.
- The project slug is unique within its hostname namespace. It is not an account ID and must not expose private user information.
- Each project can serve its own nested paths, for example `/usersnameofproject1/about` and `/usersnameofproject1/contact`.
- Unknown slugs return a branded 404 page. Unpublished projects must never be served publicly.

## Suggested database fields

`website_domains`: `id`, `website_id`, `hostname`, `is_primary`, `verification_status`, `created_at`.

`websites`: `id`, `workspace_id`, `name`, `slug`, `hosting_namespace`, `publish_status`, `active_deployment_id`.

Add a unique constraint on `(hosting_namespace, slug)`. Normalize slugs to lowercase ASCII letters, digits and hyphens. Reserve platform paths such as `/api`, `/assets`, `/admin` and `/health`.

## DNS and edge routing

Configure the DNS record for `www.sales.apokolips.xyz` to point to the Apokolips hosting edge. The edge must route requests by both hostname and first path segment. Configure TLS for the hostname at the edge. A DNS record alone does not create a website or publish a project.

If more namespaces are introduced, provision each hostname explicitly or use a carefully scoped wildcard DNS record with matching TLS coverage.

## Security requirements

- Resolve only published deployments.
- Never trust a project slug as authorization to edit a website.
- Keep dashboard and editor APIs authenticated and enforce workspace membership using database RLS.
- Serve published static assets from an isolated public deployment store.
- Do not execute customer-authored JavaScript in the platform dashboard origin.
- Validate path segments and prevent traversal, encoded separator and reserved-route collisions.

## Current implementation status

The `Dev` page is a frontend foundation preview. Project creation in this page is local to the browser session. Supabase persistence, authentication, the routing edge, DNS, TLS provisioning and production deployment are not connected yet.
