# Apokolips Dev Workspace — Phase 1

## Supabase project

The Apokolips Website Builder uses the SLIATE-GPA-Calculator Supabase project as its backend:

- Project ref: `qccbsuxomdqdwfnqoycb`
- Project URL: `https://qccbsuxomdqdwfnqoycb.supabase.co`
- Browser key: Supabase publishable key only. Never use a service-role or secret key in this app.

The project also stores GPA Calculator data. Builder objects are isolated in the seven `builder_*` tables and the private `builder-assets` Storage bucket. Existing GPA Calculator tables and records are retained separately.

## Authentication

The Dev page supports email/password registration, sign-in and sign-out using Supabase Auth. A database trigger creates a Builder profile, a default workspace and an owner membership for newly registered users. The existing Apokolips Builder workspaces and websites were migrated from the former Xcontent project.

The six source Builder accounts' workspaces were consolidated under `lakindusathsara65@gmail.com`, as explicitly requested. The destination Auth account itself was retained; no passwords or Auth user records were copied. Website, page, component and version IDs and content were preserved.

If email confirmation is enabled, the Supabase Auth Site URL and Redirect URLs must allow the deployed Dev page origin. The frontend requests confirmation redirects to the current Dev page URL.

## Database

The Builder schema contains:

- `builder_profiles`
- `builder_workspaces`
- `builder_workspace_members`
- `builder_websites`
- `builder_website_pages`
- `builder_page_components`
- `builder_website_versions`

RLS is enabled on every Builder table. Workspace role checks are implemented by narrowly scoped helper functions in the non-exposed `app_private` schema. Trigger functions create the default workspace/profile, create a Home page for new websites, maintain timestamps and snapshot publish events.

A private Storage bucket named `builder-assets` is configured for future media uploads. Its policies scope access to the website ID in the first path segment:

`{website_id}/{file_name}`

Only workspace owners/editors can upload, update or delete assets. Workspace members can read them. The source bucket contained no uploaded objects at migration time.

## Website URL model

Draft website records reserve a unique slug in the `sales` namespace. The intended public address is:

`https://www.sales.apokolips.xyz/{slug}`

Creating a draft does not make that URL live. DNS, TLS, hosting routing and deployment activation remain separate hosting work.

## Frontend configuration

The browser client uses the destination project's public URL and publishable key. Optional Vite overrides:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

No service-role key or database password belongs in the frontend or Git repository.

## Migration and verification

- Created the seven Builder tables and migrated all website content from the former Xcontent project.
- Preserved 6 workspaces, 6 memberships, 3 websites, 5 pages, 39 page components and 3 website versions.
- Consolidated all migrated workspace ownership and website creator references to `lakindusathsara65@gmail.com`.
- Kept the destination GPA Calculator records and existing Auth accounts.
- Enabled RLS and installed 18 Builder table policies plus 4 private Storage policies.
- Created the private `builder-assets` bucket. No media objects were present in the source bucket.
- The former Xcontent Builder data has not yet been deleted. It will be retained until the application change is reviewed, merged and live-verified.

## Remaining deployment configuration

Set the destination Supabase Auth Site URL and Redirect URL allow-list to the actual deployed Dev page origin. Confirm email confirmation works after the frontend change is deployed. Do not add wildcard redirects.

