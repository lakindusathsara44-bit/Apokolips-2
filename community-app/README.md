# Apokolips Community

A separate React + TypeScript + Vite application embedded as a static GitHub Pages entry point.

## Structure

- \`community-app/src/main.tsx\` — React application and community interactions
- \`community-app/src/styles.css\` — responsive dark UI
- \`community-app/src/supabase.ts\` — browser-safe Supabase client
- \`community-app/Community.chat.html\` — Vite HTML input
- \`Community.chat.html\` — generated public entry point at the repository root
- \`assets/community/\` — generated JavaScript and CSS bundles
- \`community-app/supabase/community_schema.sql\` — community database schema and RLS policies

## Build

From the repository root:

\`\`\`bash
npm install
npm run build:community
\`\`\`

The dedicated GitHub Actions workflow builds and type-checks the app on pull requests. After changes reach \`main\`, it commits the generated page and bundle so GitHub Pages can serve the static output.

## Data and security

The app uses a browser-safe Supabase publishable key. Do not add a service-role or secret key to this repository. Public reads are enabled for community content; creating posts, commenting, voting, and editing a profile require a signed-in user. Row Level Security enforces ownership in the database.

The community uses its own \`community_*\` tables. It does not reuse the blog's reaction/comment tables.
