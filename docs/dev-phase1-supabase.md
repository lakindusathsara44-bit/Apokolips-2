# Apokolips Dev Workspace — Phase 1

## Supabase project

The Builder foundation is isolated inside the existing Apokolips Supabase project:

- Project ref: `oqyfvvwplvbmmursbpkd`
- Region: `ap-southeast-1`
- Project URL: `https://oqyfvvwplvbmmursbpkd.supabase.co`
- Browser key: Supabase publishable key only. Never use a service-role or secret key in this app.

The project already contains other Apokolips services. Builder objects therefore use the `builder_*` table prefix and do not modify the existing application tables.

## Authentication

The Dev page supports email/password registration, sign-in and sign-out using Supabase Auth. On account creation, a database trigger creates a Builder profile, a default workspace and an owner membership. Existing Auth users were backfilled with the same Builder records.

If email confirmation is enabled in Supabase Auth, users must confirm their email before signing in. The Auth redirect allow-list should include the deployed Dev page origin.

## Database

The migrations create:

- `builder_profiles`
- `builder_workspaces`
- `builder_workspace_members`
- `builder_websites`
- `builder_website_pages`
- `builder_page_components`
- `builder_website_versions`

RLS is enabled on every Builder table. Workspace role checks are implemented by narrowly scoped read-only helper functions in the non-exposed `app_private` schema. Trigger functions are also stored there and have execution revoked from client roles.

A private Storage bucket named `builder-assets` is created for future media uploads. Its policies scope access to the website ID in the first path segment:

`{website_id}/{file_name}`

Only workspace owners/editors can upload, update or delete assets. Workspace members can read them.

## Website URL model

Draft website records reserve a unique slug in the `sales` namespace. The intended public address is:

`https://www.sales.apokolips.xyz/{slug}`

Creating a draft does not make that URL live. DNS, TLS, hosting routing and deployment activation remain future hosting work.

## Frontend configuration

The browser client uses the project's public URL and publishable key. Optional Vite overrides:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

No service-role key or database password belongs in the frontend or Git repository.

## Current Phase 1 scope

Implemented: Auth UI, workspace loading, website draft creation, persistent project listing, unique slug validation, automatic Home page, RLS policies and private asset bucket.

Not yet implemented: drag-and-drop editor, advanced source editor, custom domains, production publishing, DNS/SSL provisioning, billing and hosting usage metering.

## Security notes

The Supabase Security Advisor currently reports two pre-existing tables outside the Builder scope with RLS enabled but no policies (`apokolips_blog_media_events` and `apokolips_payments`) and a project-wide warning that leaked-password protection is disabled. The Builder tables themselves have RLS policies. Review and resolve those existing project findings separately.
