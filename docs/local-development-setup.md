# Bloom Boys CRM Local Development Setup

Planning status: documentation only. This document does not create environment files, install packages, scaffold the app, configure Supabase, or expose secrets.

## Purpose

Document the planned local setup for Alex's Mac once implementation begins.

## Current Repository State

The repository currently contains approved documentation and source/audit data. No `package.json` was present during this planning pass, so app scaffolding remains a future implementation step.

Do not modify:

- `phase-1/`
- `phase-2/`
- `audit-output/`

## Prerequisites

Install or confirm:

- macOS command line tools: `xcode-select --install`
- Homebrew
- Git
- Node.js LTS through `nvm`
- npm, unless the implementation team explicitly chooses another package manager
- Docker Desktop
- Supabase CLI
- GitHub CLI, optional but recommended
- Vercel CLI, optional for local deployment workflows
- A code editor

Recommended Node policy:

- Pin the project Node version during app scaffolding with `.nvmrc`.
- Use the active Node.js LTS chosen at implementation time.
- Avoid relying on a globally unpinned Node version.

## Planned Setup Steps

These commands are documentation for the future implementation phase. Do not run them as part of this planning pass.

1. Open the repository.

```sh
cd /Users/alex/Developer/bloom_crm
```

2. Confirm source folders are present.

```sh
ls docs phase-1 phase-2 audit-output
```

3. Install Node through `nvm` after the project pins a version.

```sh
nvm install
nvm use
```

4. Install app dependencies after the Next.js scaffold exists.

```sh
npm install
```

5. Install or update Supabase CLI.

```sh
brew install supabase/tap/supabase
```

6. Start Docker Desktop.

7. Initialize Supabase locally only during implementation.

```sh
supabase init
supabase start
```

8. Create local environment variables from a future example file. Do not commit secrets.

```sh
cp .env.example .env.local
```

9. Run migrations after they exist.

```sh
supabase db reset
```

10. Generate database types after migrations exist.

```sh
supabase gen types typescript --local
```

11. Run the importer in dry-run mode after it exists.

```sh
npm run import:dry-run
```

12. Start the app after it exists.

```sh
npm run dev
```

## Environment Variables

Environment variables are not created now.

Future variables likely include:

- Supabase URL.
- Supabase anon key.
- Supabase service role key for server-only importer and maintenance tasks.
- App URL.
- Vercel deployment values.

Rules:

- Never commit `.env.local`.
- Never expose service-role keys to browser code.
- Keep production secrets only in Supabase and Vercel dashboards.
- Use separate values for local, preview, and production.

## Local Data Rules

Local development may use:

- Safe imported copies of Phase 1 and Phase 2 source rows.
- Generated test data.
- Redacted fixtures.

Local development must not:

- Modify files in `phase-1/`, `phase-2/`, or `audit-output/`.
- Treat ZIP duplicates as import inputs.
- Overwrite source evidence history.
- Use production secrets.

## Git Workflow

Recommended:

- Use feature branches.
- Keep migrations small and ordered.
- Review schema and RLS changes carefully.
- Run tests before merging.
- Use Vercel preview deployments after app scaffold exists.

## Troubleshooting Targets

Common local checks:

- Docker is running.
- Supabase local services are healthy.
- Node version matches `.nvmrc`.
- Environment variables are present locally.
- RLS tests use the intended persona.
- Import dry run points at unpacked CSVs, not ZIPs.

## Decisions

- Use local Supabase through Docker.
- Use Node through `nvm` with a pinned project version.
- Use npm unless a later implementation decision chooses another package manager.
- Keep source data folders read-only by convention.
- Do not create environment files during planning.

## Alternatives Considered

- Global Node without pinning: rejected because reproducibility matters.
- Remote Supabase only for development: rejected because migrations, RLS, and importer tests need local iteration.
- Committing local env files: rejected because secrets must remain private.
- Importing directly from ZIP files: rejected because approved source is unpacked CSVs.

## Recommended Approach

When implementation begins:

1. Scaffold the app.
2. Pin Node version.
3. Add dependencies.
4. Initialize Supabase locally.
5. Create migrations.
6. Add local env from an example.
7. Run migrations and tests.
8. Run importer dry-run.
9. Start app locally.

## Risks

- Supabase CLI and Docker versions can drift across machines.
- Local secrets can accidentally leak if `.gitignore` is incomplete.
- Import dry runs can become slow if run against full data every time.
- Developers may accidentally point importer at ZIP duplicates without guardrails.
- Missing `.nvmrc` can cause inconsistent dependency installs.

## Acceptance Criteria

- A new developer can prepare Alex's Mac for implementation without secrets in docs.
- Setup steps are explicit but not executed in planning.
- Source data folders remain untouched.
- Local Supabase can run migrations and tests once created.
- Environment boundaries are clear.

## Dependencies

- Future Next.js scaffold.
- Future `package.json`.
- Future `.nvmrc`.
- Future Supabase config.
- Future `.env.example`.
- Docker Desktop.
- Supabase CLI.

## What Remains Intentionally Deferred

- App scaffolding.
- Package installation.
- Supabase initialization.
- Environment files.
- Local seed data.
- Running the dev server.
