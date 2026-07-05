# Production launch runbook

This document is the supervised checklist for launching Bloom CRM on Vercel + hosted Supabase with exactly two private users:

| Person | Role | Capabilities |
|--------|------|--------------|
| Alex | `admin` | Full CRM + user management + admin tools + permanent delete + dataset imports (CLI only) |
| Sam | `outreach_editor` | Full everyday CRM (orgs, contacts, outreach, activities, tasks, notes) — no admin/import/permanent delete |

**Do not run the data transfer or create production users until you have reviewed a dry-run report and confirmed the target Supabase project URL.**

---

## 1. Prerequisites

- Local Supabase with the real Saskatchewan CRM data (`supabase start`, migrations applied, importer already run locally).
- A **separate** hosted Supabase project for production (never share DB credentials between preview/dev and production).
- Vercel project linked to this repo, production branch `production`, domain `crm.bloomboys.online`.
- Node.js LTS, `npm install` completed in this repo.

---

## 2. Hosted Supabase setup

### 2.1 Create the project

1. Create a new Supabase project in the desired region.
2. Note the **Project URL**, **anon key**, **service role key**, and **database connection string** (Settings → Database → URI, use the pooler or direct connection as you prefer for scripts).

### 2.2 Apply migrations

From your machine, link the CLI to the production project (or run SQL manually in the dashboard):

```sh
supabase link --project-ref <your-project-ref>
supabase db push
```

Every migration in `supabase/migrations/` must be applied, including:

- `20260705010000_role_based_access_control_enum.sql` — adds `admin` and `outreach_editor` to `permission_level`
- `20260705010100_role_based_access_control_rls.sql` — broadens everyday CRM access, adds admin-only gates

Verify in the SQL editor:

```sql
select enum_range(null::permission_level);
-- should include owner, admin, outreach_editor
```

### 2.3 Auth configuration

In Supabase Dashboard → Authentication → Providers → Email:

- **Enable** email sign-in.
- **Disable** public sign-up (invite/admin-created users only).

In Authentication → URL configuration:

| Setting | Value |
|---------|-------|
| Site URL | `https://crm.bloomboys.online` |
| Redirect URLs | `https://crm.bloomboys.online/**`, `http://localhost:3000/**` (for local dev against the same project, if ever needed) |

No SMTP provider is required — the app does not send email; users log activities manually after sending mail outside the app.

---

## 3. Environment variables

### 3.1 Classification

| Variable | Where | Browser-safe? |
|----------|-------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel (Production + Preview), `.env.local` | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel (Production + Preview), `.env.local` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Local scripts only — **never** in Vercel | **No** |
| `SUPABASE_URL` | Local scripts only | No |
| `DATABASE_URL` | Local scripts only | No |
| `SOURCE_DATABASE_URL` | Local data-transfer dry-run/run only | No |
| `TARGET_DATABASE_URL` | Local data-transfer dry-run/run only | No |

Copy `.env.example` to `.env.local` for local development. Production Vercel needs only the two `NEXT_PUBLIC_*` variables pointing at the **production** Supabase project.

**Preview deployments** must use a **different** Supabase project (or local Supabase) — never production credentials in Preview environment variables.

### 3.2 Vercel production settings

1. Vercel project → Settings → Git → Production branch: `production`.
2. Settings → Domains → add `crm.bloomboys.online`.
3. Settings → Environment Variables → Production:
   - `NEXT_PUBLIC_SUPABASE_URL` = production project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = production anon key

---

## 4. Session refresh (`proxy.ts`)

Next.js 16 uses `proxy.ts` at the repo root (not `middleware.ts`) to refresh Supabase auth cookies on every request. No extra configuration is required beyond setting the public Supabase env vars in Vercel.

---

## 5. Create production users (before data transfer)

Create Alex and Sam **before** running the data transfer so profile IDs can be matched by email when remapping `created_by` / `user_id` columns.

Build the admin scripts:

```sh
npm run admin:build
```

### 5.1 Why these scripts use a direct database connection

`profiles` rows are not writable through PostgREST with the service role by design — everyday reads/writes go through the `authenticated` role + RLS. Admin scripts therefore:

1. Create the auth user via the Supabase Auth Admin API (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`).
2. Upsert the matching `profiles` row via a direct Postgres connection (`DATABASE_URL`).

### 5.2 Alex (admin)

```sh
SUPABASE_URL=https://<project-ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
DATABASE_URL='postgresql://postgres.<ref>:<password>@<host>:5432/postgres' \
  npm run admin:create-user -- \
    --email alex@example.com \
    --name "Alex" \
    --role admin \
    --confirm-production
```

Save the printed temporary password securely. Optionally pass `--password` instead of auto-generating one.

**Tip:** If you want production profile IDs to match local IDs (so the transfer needs no remapping), pass `--id <local-profile-uuid>` when creating the user. Look up local IDs with:

```sql
select id, email from public.profiles;
```

### 5.3 Sam (outreach editor)

```sh
SUPABASE_URL=https://<project-ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
DATABASE_URL='postgresql://postgres.<ref>:<password>@<host>:5432/postgres' \
  npm run admin:create-user -- \
    --email sam@example.com \
    --name "Sam" \
    --role outreach_editor \
    --confirm-production
```

---

## 6. Data transfer (one time, supervised)

The transfer script copies CRM domain data from **local** Postgres to **production** Postgres. It never runs from CI or the deployed app.

### 6.1 Safety properties

- `SOURCE_DATABASE_URL` must be local (`127.0.0.1` / `localhost`).
- `TARGET_DATABASE_URL` must not be local unless `--allow-local-target` is passed (rehearsal only).
- Refuses to write if target tables already have rows (unless `--force`).
- `profiles`, `profile_preferences`, `saved_views`, and `record_type_registry` are **not** copied.
- Profile and record-type foreign keys are remapped before insert.
- The write phase is a single transaction — failure rolls back everything.

### 6.2 Dry run (required)

```sh
npm run data-transfer:build

SOURCE_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
TARGET_DATABASE_URL='postgresql://postgres.<ref>:<password>@<host>:5432/postgres' \
  npm run data-transfer:dry-run
```

Read the printed report carefully. Confirm row counts match expectations and that every source profile referenced in CRM data maps to a production profile (by id or email).

### 6.3 Live run

Only after dry-run approval:

```sh
SOURCE_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
TARGET_DATABASE_URL='postgresql://postgres.<ref>:<password>@<host>:5432/postgres' \
  npm run data-transfer:run
```

---

## 7. Deploy to production

After users exist, data is transferred, and Vercel env vars are set:

```sh
git push origin production
```

Vercel builds from the `production` branch and serves `crm.bloomboys.online`.

---

## 8. Post-launch verification checklist

### Auth

- [ ] Public sign-up is disabled in Supabase.
- [ ] Alex can sign in at `https://crm.bloomboys.online/sign-in`.
- [ ] Sam can sign in with outreach_editor account.
- [ ] Unknown/inactive accounts are rejected at sign-in.

### Alex (admin)

- [ ] Admin Tools visible in navigation.
- [ ] User management page lists both users.
- [ ] Can archive then permanently delete a test record.
- [ ] Can run importer CLI locally (in-app import UI does not exist yet).

### Sam (outreach_editor)

- [ ] Admin Tools **not** visible.
- [ ] Can create/edit/archive/restore organizations and contacts.
- [ ] Can log outbound email and see follow-up task created (+3 business days).
- [ ] Appears in owner/assignee dropdowns.
- [ ] Cannot call user-management server actions (verify via UI absence; RLS blocks direct API abuse).

### Data integrity

- [ ] Saskatchewan organizations, contacts, activities, tasks, and outreach statuses present.
- [ ] Follow-up due dates and overdue indicators correct.
- [ ] Activity timeline loads for a known contact.

### Environment isolation

- [ ] Preview deployments use non-production Supabase credentials.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is not set in Vercel.

---

## 9. Local RLS test fixtures

For integration tests against local Supabase:

```sh
npm run admin:seed-local-fixtures
npm run integration:test
```

This creates test users with fixed emails/passwords documented in `tests/integration/role-based-access-control.test.ts`. Do not run seed fixtures against production.

---

## 10. Roles reference

| `permission_level` | App role | Everyday CRM | Archive | Permanent delete | User mgmt | Imports |
|--------------------|----------|--------------|---------|------------------|-----------|---------|
| `owner` (legacy) | admin | ✓ | ✓ | ✓ | ✓ | CLI |
| `admin` | admin | ✓ | ✓ | ✓ | ✓ | CLI |
| `outreach_editor` | outreach_editor | ✓ | ✓ | ✗ | ✗ | ✗ |

Enforcement layers: `lib/auth/roles.ts` + `lib/auth/authorize.ts` (server actions), RLS functions `current_profile_is_active_owner()` and `current_profile_is_admin()` (database).

---

## 11. Rollback notes

- **Bad deploy:** revert the Vercel deployment or push a fix to `production`.
- **Bad data transfer:** restore production database from a Supabase backup taken immediately before the transfer. The transfer script's transactional write means you should never have a partial import, but a bad full import still requires restore.
- **Locked out of admin:** use Supabase SQL editor with service role / direct Postgres to set a profile's `permission_level` to `admin` and `status` to `active`.
