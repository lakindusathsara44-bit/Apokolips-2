# Apokolips Dev Workspace — Phase 1

## Supabase project

The Apokolips Website Builder uses the SLIATE-GPA-Calculator Supabase project as its backend:

- Project ref: `qccbsuxomdqdwfnqoycb`
- Project URL: `https://qccbsuxomdqdwfnqoycb.supabase.co`
- Browser key: Supabase publishable key only. Never use a service-role or secret key in this app.

The project also stores GPA Calculator data. Builder records are isolated in the seven `builder_*` tables. The current Media Library uses the public `apokolips-media` Storage bucket; an empty private `builder-assets` bucket also remains from the initial migration but is not used by the frontend. Existing GPA Calculator tables and records are retained separately.

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

The Media Library uses the public Storage bucket `apokolips-media`, matching `dev-app/src/builder/MediaLibrary.jsx`. It allows the file types supported by the UI and files up to 100 MB. Object paths are scoped by website ID in the first path segment:

`{website_id}/{timestamp}-{index}-{file_name}`

Authenticated workspace members can list their website's files; owners/editors can upload and delete. The bucket is public so `getPublicUrl()` previews work, meaning anyone who knows a file URL can read that file. The source bucket contained no uploaded objects at migration time. The separate private `builder-assets` bucket is currently unused and empty.

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
- Enabled RLS and installed 22 Builder table policies and 3 `apokolips-media` Storage policies.
- Matched the source `apokolips-media` bucket settings (public, 100 MB limit, supported MIME types); the source bucket contained zero media objects.
- The initial empty private `builder-assets` bucket remains unused; the frontend continues to use `apokolips-media`.
- After the destination migration and production build were verified, the seven former Xcontent `builder_*` tables, Builder-specific functions, auth trigger and Storage policies were removed. The six original Xcontent Auth users were retained, and unrelated Xcontent tables/services were not modified.

## Remaining deployment configuration

The frontend bundle now points to the destination project and the GitHub Pages production build/deployment completed. The destination Supabase Auth Site URL and Redirect URL allow-list still need a dashboard-side check against the deployed Dev page origin; confirm email verification works before relying on new-user confirmation flows. Do not add wildcard redirects.

