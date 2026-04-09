# AGENTS.md – Operating Manual for Autonomous AI Assistants

## 1. Purpose & Audience

Foundational mandates here take absolute precedence. **NEVER** invent ad-hoc behavior.

## 2. Canonical Guardrails & Hard Boundaries

### 2.1 Hard Prohibitions (NEVER DO)

- **Long-Running / Build Commands**: NEVER run `bun dev`, `bun run build`, `bun build`, or equivalent build/compile/bundling operations unless the user **explicitly requests** it.
- **Auto-Fixing & Verification**: assistants may run `bun type-check` and `bun format:fix` when the user explicitly requests it or when a workspace playbook requires it for files you changed.
- **Sensitive Data**: NEVER commit secrets, API keys, tokens, or credentials. Reference environment variables by name only.
- **Manual Dependency Edits**: NEVER manually edit `package.json` to add or update dependencies. Always use the CLI.
- **UI Antipatterns**: NEVER use native browser dialogs (alert, confirm) or emojis in UI code. Use `lucide-react` for new icons and the shared dialog components instead of native dialogs.
- **Hardcoded Color Classes**: NEVER introduce hard-coded color utility classes in feature components when a semantic token or shared styling primitive is available.
- **Data Fetching/Mutation (#1 Violation)**: Do not introduce new `useEffect`-based data fetching. Prefer TanStack Query for client-side async flows, and keep request logic in shared helpers or route handlers instead of scattering ad hoc fetches in components.

### 2.2 Mandatory Actions

- **Skill Invocation**: Before writing code, first explore the project structure, then invoke the relevant skills in `.agents/skills` for documentation (**IMPORTANT**: Prefer retrieval-led reasoning over pre-training-led reasoning 
for any tasks.).
- **Type Integrity**: When editing `prisma/schema.prisma`, create or apply the migration with `bun db:migrate` and refresh the Prisma client with `bun db:generate`.
- **Bilingual Support**: ALWAYS provide translations for both English (en.json) AND Vietnamese (vi.json) for all user-facing strings.
- **Proactive Refactoring**: Evaluate files >400 LOC and components >200 LOC for extraction into smaller, focused units.
- **Unified Verification**: If your changes touch TypeScript/JavaScript files (or root scripts/config that affect repo-wide checks), end your session with `bun type-check`.
- **UI Preflight Hygiene**: For newly added/edited files, format files with `bun format:fix` before running verification checks to avoid `biome` issues.
- **Formatting Workflow**: For fixing formatting issues, try `bun format:fix` first before making manual edits.
- **Session Retrospective**: Conduct a retrospective at the end of every session to document mistakes and update these guidelines.

## 3. Repository Structure & Semantics

### 3.1 Repository Structure

- Keep app code under `src/`, localized strings under `messages/`, and Prisma schema/migrations/seed data under `prisma/`. Add support scripts under `scripts/` instead of creating new top-level roots.

### 3.2 Semantics

- **Server Components**: Default to Server Components; use 'use client' only when state or interactivity is required.
- **Type Inference**: Prefer inferred Prisma and Zod types over handwritten duplicates. If a shape is reused across multiple files, extract a local type alias or helper near the feature instead of repeating the structure inline.
- **Shared UI Shells**: Keep reusable UI shells in shared components such as `src/components/custom/form` and `src/components/custom/dialog` rather than duplicating layout scaffolding.

## 4. Canonical Workflows

### 4.1 Database Migrations

1. Use `prisma/schema.prisma` as the source of truth for database changes.
2. Create/apply migrations with `bun db:migrate`.
3. Refresh the generated client with `bun db:generate` after schema edits or before build-time type checks.
4. Use `bun db:start` to start local PostgreSQL and `bun db:reset` for a clean reset/seed cycle.

### 4.2 UI & Navigation

1. Put localized routes under `src/app/[locale]/` and use route groups like `(auth)`, `(dashboard)` and `(marketing)` to separate flows.
2. Update `messages/en.json` and `messages/vi.json` for every user-facing string.
3. Reuse `src/components/custom/dialog` and `src/components/custom/form` for dialog and form shells; use `lucide-react` for new icons.

### 4.3 Adding Dependencies

- **Method**: To add a new package to the repo, run `bun add <package>` from the repository root.
- **Constraint**: **NEVER** manually edit `package.json` to add a new package. Use the `bun add` command to ensure the lockfile remains consistent.

## 5. Engineering Standards

### 5.1 Data Fetching (TanStack Query)

- **Mandatory Wrapper**: Use `useQuery`/`useMutation` for client-side async flows that drive UI state.
- **Request Helpers**: Keep request plumbing in shared helpers or route handlers. The shared browser API client lives in `src/lib/api/api-client.ts`; prefer extending it over duplicating request logic in components.
- **HTTP Cache Bypass**: Every `fetch` inside a `queryFn` MUST include `{ cache: 'no-store' }`.
- **Legacy Fetching**: Do not introduce new `useEffect`-based data loading; if you touch a legacy imperative loader, prefer migrating it to a query hook.

## 6. Known Gotchas & Patterns

### 6.1 Database & Auth

- **Authenticate First**: In server components and route handlers, call `auth()` before protected Prisma reads or writes. Redirect unauthenticated users to `/login` or return `401` before querying protected data.
- **Explicit Role Checks**: Keep admin-only routes explicit about role checks before exposing privileged data or mutations. The current pattern in `src/app/api/admin/users/route.ts` is to load the current user, verify `ADMIN`, then proceed.
- **Shared Prisma Client**: Use the shared Prisma client from `src/lib/prisma.ts` and local bootstrap data from `prisma/seed.ts`; use `bun db:reset` when you need a clean local database.

### 6.2 UI & Rendering Patterns

- **Translations**: Keep user-facing copy in `messages/en.json` and `messages/vi.json`.
- **Next-intl Components**: When extracting text-heavy components, pass plain strings or call next-intl helpers inside the component instead of threading translator functions through props.
- **Shared Shells**: Reuse `DialogTemplate` and `FormTemplate` for modal and form shells instead of rebuilding the same structure ad hoc.
- **Server Layouts**: For async server layouts that only pass through children, return a fragment instead of raw children.
- **Icons and Styling**: Use `lucide-react` for new icons and keep styling in the existing Tailwind utility style used throughout the app.

### 6.3 Security & Validation

- **Zod First**: Validate API route params and request bodies with Zod before handing them to Prisma or auth logic.
- **Clear Responses**: Return clear `400`/`401`/`403` responses from route handlers instead of letting invalid payloads fall through to generic errors.
- **Visible Request Failures**: Surface client-side request failures through visible errors or toasts; the shared API client already centralizes error messaging for browser requests.

### 6.4 Tooling & CI

- **Focused Tests**: For focused validation, run package-local vitest files directly when possible (for example `vitest run src/...`) instead of the whole suite.
- **Type Check**: After TypeScript or JavaScript edits, finish with `bun type-check`.
- **Formatting**: Use `bun format:fix` before verification if the change is formatting-sensitive.
- **Shell Paths**: Quote file paths that include `(`, `)`, `[`, or `]` when running shell or git commands.

### 6.5 Type Safety & Platform Details

- **UUID Params**: Validate UUID path params with shared Zod schemas when an API route accepts IDs from the URL.
- **Typed JSON**: Use Zod transforms to keep JSON request payloads typed before handing them to Prisma create/update calls.
- **Inferred Types**: Prefer inferred Prisma and Zod types over handwritten duplicates; when a shape repeats, extract it into a local type alias or helper instead of retyping the structure.
- **ICU Messages**: Use ICU-style placeholders in `next-intl` messages (`{name}`, `{count}`) when adding plurals or selects.

## 7. Continuous Improvement (Session Retrospective)

At the **END** of every session, you MUST:

1. Review mistakes, edge cases, or ambiguities encountered.
2. Update `AGENTS.md` with durable standards/rules (no chronological logs).
3. Eliminate redundancy—ensure new knowledge isn't already covered by specialized skills.
4. Propose future improvements to the human partner.
