# AGENTS.md – Operating Manual for Autonomous AI Assistants

## 1. Purpose & Audience

Foundational mandates here take absolute precedence. **NEVER** invent ad-hoc behavior.

## 2. Canonical Guardrails & Hard Boundaries

### 2.1 Hard Prohibitions (NEVER DO)

- **Long-Running / Build Commands**: NEVER run `bun dev`, `bun run build`, `bun build`, or equivalent build/compile/bundling operations unless the user **explicitly requests** it.
- **Sensitive Data**: NEVER commit secrets, API keys, tokens, or credentials. Reference environment variables by name only.
- **Secret Remediation**: If a secret is found in code, remove it immediately and ask the user to rotate it; never reprint the value.
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
- **Vendor UI Boundaries**: Do not edit components inside `src/components/ai-elements` or `src/components/ui` during implementation, refactoring, or bug fixes unless the user explicitly asks for changes there, because those directories are installed vendor primitives from Vercel AI Elements and shadcn/ui.

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
- **SSR Page Entries**: Keep `src/app/**/page.tsx` as Server Components by NEVER adding 'use client' on top of them. Move only interactive logic into focused local client islands.
- **Shared Shells**: Reuse `DialogTemplate` and `FormTemplate` for modal and form shells instead of rebuilding the same structure ad hoc.
- **Pipeline Step Panels**: In generation/progress dialogs, render step-specific detail panels only while their step is active; add explicit step navigation before showing historical step details.
- **Dialog Success Flow**: When a dialog triggers an async mutation, close it via `onOpenChange(false)` before navigation and guard entry points with the mutation pending state to avoid duplicate opens/submits.
- **Tabular Lists**: Use the shared `Table` components for list-style layouts instead of custom row divs to keep alignment consistent.
- **Server Layouts**: For async server layouts that only pass through children, return a fragment instead of raw children.
- **Icons and Styling**: Use `lucide-react` for new icons and keep styling in the existing Tailwind utility style used throughout the app.
- **Icon Availability**: When introducing a new `lucide-react` icon, verify the installed package exports it; use a generic available icon when brand-specific icons are absent.
- **JSX Curly Braces**: Literally render double curly braces `{{` and `}}` in JSX text by quoting them, like `{'{{placeholder}}'}`, to prevent the JSX compiler from parsing them as JS object shorthand syntax.
- **Research Citations**: For AI research/chat responses with numbered citations, derive source metadata from AI SDK `source-url` parts and web-search tool outputs in shared helpers, then render inline citation UI from that normalized source list instead of hardcoding source parsing in components.
- **Generated Suggestions**: When AI routes stream `data-suggestions` parts for clickable follow-ups, make system prompts explicitly tell the model not to print follow-up questions, JSON, markdown chips, or numbered suggestion lists in the visible assistant response.
- **Grouped Citation UI**: Keep multi-source citation markers such as `[1, 2]` as a single inline trigger that previews the first source, shows the additional source count, and exposes the full source set in a clickable hover-card carousel.
- **Citation Labels**: Keep citation hover-card labels such as source counts localized through `next-intl`; do not hardcode English fallback copy in citation UI components.
- **Citation Link Hover**: Use subtle semantic hover states such as `hover:bg-muted/60` for citation source cards; avoid saturated accent fills that compete with the citation content.
- **Citation Source Identity**: Prefer source favicons from web-search metadata for citation identity marks, with a generic `lucide-react` icon only as a fallback.
- **Remote Favicons**: Render arbitrary citation favicons with `next/image` and `unoptimized` unless the remote domains are explicitly configured in `next.config`.
- **Search Favicons**: Enable favicon metadata on web-search tools when citation UI depends on source identity, and provide a deterministic domain favicon fallback for older results without favicon metadata.
- **Study Modes**: When adding or removing a Study mode, update the shared Zod mode schema, mode selector cards, mode-specific system prompts, and both locale files together so the UI, API validation, and prompt behavior stay synchronized.

### 6.3 Security & Validation

- **Zod First**: Validate API route params and request bodies with Zod before handing them to Prisma or auth logic.
- **Clear Responses**: Return clear `400`/`401`/`403` responses from route handlers instead of letting invalid payloads fall through to generic errors.
- **Visible Request Failures**: Surface client-side request failures through visible errors or toasts; the shared API client already centralizes error messaging for browser requests.
- **Swagger Placement**: Keep each route handler's Swagger JSDoc block immediately above the exported `GET`/`POST`/`PUT`/`PATCH`/`DELETE` handler it documents; split multi-method route docs into one block per handler.
- **API Key Overrides**: When a service method accepts an `apiKey` override, prefer it over environment variables and cover the override with a focused unit test.

### 6.4 Tooling & CI

- **Focused Tests**: For focused validation, run package-local vitest files directly when possible (for example `vitest run src/...`) instead of the whole suite.
- **Test Scope Discipline**: Keep tests focused on durable behavior the project wants to preserve. Remove exploratory, speculative, or TDD-only scaffolding when it no longer represents required coverage.
- **Type Check**: After TypeScript or JavaScript edits, finish with `bun type-check`.
- **Formatting**: Use `bun format:fix` before verification if the change is formatting-sensitive.
- **Shell Paths**: Quote file paths that include `(`, `)`, `[`, or `]` when running shell or git commands.
- **API Client Paths**: The shared browser API client already targets the `/api` base URL, so request paths should start at `v1/...` instead of `api/v1/...`.

### 6.5 Type Safety & Platform Details

- **UUID Params**: Validate UUID path params with shared Zod schemas when an API route accepts IDs from the URL.
- **Typed JSON**: Use Zod transforms to keep JSON request payloads typed before handing them to Prisma create/update calls.
- **Lesson Content Payloads**: Lesson editors must load and save only Tiptap JSON documents (`{"type":"doc","content":[...]}`); AI generation may emit transient lesson HTML only if it is converted to Tiptap JSON before persistence.
- **Inferred Types**: Prefer inferred Prisma and Zod types over handwritten duplicates; when a shape repeats, extract it into a local type alias or helper instead of retyping the structure.
- **ICU Messages**: Use ICU-style placeholders in `next-intl` messages (`{name}`, `{count}`) when adding plurals or selects.
- **Generated Prisma Sync**: If `src/generated/prisma` and `prisma/schema.prisma` drift, rerun `bun db:generate` before assuming a storage or Prisma-backed service is broken.
- **Prisma Unknown Arguments**: If Prisma reports an unknown field on a model, verify the checked-in schema and regenerated client first; do not rename application code until the generated types and schema agree.

### 6.6 Storage & Uploads

- **Upload Confirmation Fallback**: When an uploaded file does not exist on the remote bucket during `confirmUpload`, explicitly delete the pending database entry to roll back the state.
- **Bucket Initialization**: When adding new buckets to the storage config, ensure they are also added to `docker-compose.yml` initialization scripts (`minio-init` and `minio-reset`).
- **Preview Delivery**: For inventory previews, prefer signed URLs over fetching full blobs into browser memory, and provide UI fallbacks when inline rendering fails.

## 7. Continuous Improvement (Session Retrospective)

At the **END** of every session, you MUST:

1. Review mistakes, edge cases, or ambiguities encountered.
2. Update `AGENTS.md` only with durable, high-value standards/rules (no chronological logs); do not add low-value, overly specific, or one-off observations that should not become future agent rules.
3. Eliminate redundancy—ensure new knowledge isn't already covered by specialized skills.
4. Propose future improvements to the human partner.
