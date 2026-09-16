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
- **Proactive Refactoring**: Evaluate files >400 LOC and components >200 LOC for extraction into smaller, focused units.
- **Session Retrospective**: Conduct a retrospective at the end of every session to document mistakes and update these guidelines.

## 3. Repository Structure & Semantics

### 3.1 Repository Structure

- Keep app code under `src/`, localized strings under `messages/`, and Prisma schema/migrations/seed data under `prisma/`. Add support scripts under `scripts/` instead of creating new top-level roots.

### 3.2 Semantics

- **Server Components**: Default to Server Components; use 'use client' only when state or interactivity is required.
- **Type Inference**: Prefer inferred Prisma and Zod types over handwritten duplicates. If a shape is reused across multiple files, extract a local type alias or helper near the feature instead of repeating the structure inline.
- **Vendor UI Boundaries**: Do not edit components inside `src/components/ai-elements` or `src/components/ui` during implementation, refactoring, or bug fixes unless the user explicitly asks for changes there, because those directories are installed vendor primitives from Vercel AI Elements and shadcn/ui.

## 4. Canonical Workflows

### 4.1 Database Migrations

1. Use `prisma/schema.prisma` as the source of truth for database changes.
2. In `prisma/schema.prisma`, keep Prisma enum and model names in PascalCase and Prisma field names in camelCase.
3. Map every Prisma model, enum-backed database value where applicable, and field that persists to a database object to snake_case database names with `@@map`/`@map`; physical table, column, index, and constraint names in migrations must also be snake_case.
4. Create/apply migrations with `bun db:migrate`.
5. Ensure new Prisma migration directory timestamps are later than the latest migration on the PR base branch; rename/regenerate local migration directories before pushing if main has advanced.
6. Refresh the generated client with `bun db:generate` after schema edits or before build-time type checks.
7. Use `bun db:start` to start local PostgreSQL and `bun db:reset` for a clean reset/seed cycle.

### 4.2 UI & Navigation

1. Put localized routes under `src/app/[locale]/` and use route groups like `(auth)`, `(dashboard)` and `(marketing)` to separate flows.
2. Update `messages/en.json` and `messages/vi.json` for every user-facing string.
3. Reuse `src/components/custom/dialog` and `src/components/custom/form` for dialog and form shells; use `lucide-react` for new icons.

## 5. Engineering Standards

### 5.1 Data Fetching (TanStack Query)

- **Mandatory Wrapper**: Use `useQuery`/`useMutation` for client-side async flows that drive UI state.
- **Request Helpers**: Keep request plumbing in shared helpers or route handlers. The shared browser API client lives in `src/lib/api/api-client.ts`; prefer extending it over duplicating request logic in components.
- **HTTP Cache Bypass**: Every `fetch` inside a `queryFn` MUST include `{ cache: 'no-store' }`.

## 6. Known Gotchas & Patterns

### 6.1 Database & Auth

- **Authenticate First**: In server components and route handlers, call `auth()` before protected Prisma reads or writes. Redirect unauthenticated users to `/login` or return `401` before querying protected data.
- **Composable Auth Wrappers**: Keep `withRoles(...)` and `withPermissions(...)` self-sufficient. They must be usable directly on route handlers without wrapping them in `withAuth(...)`, while still accepting a forwarded session when composed under another auth-aware wrapper.

### 6.2 UI & Rendering Patterns

- **Next-intl Components**: When extracting text-heavy components, pass plain strings or call next-intl helpers inside the component instead of threading translator functions through props.
- **SSR Page Entries**: Keep `src/app/**/page.tsx` as Server Components by NEVER adding 'use client' on top of them. Move only interactive logic into focused local client islands.
- **Embedded Editor Shells**: Do not place full-page editor chrome with sticky bars or negative horizontal margins inside cards. Expose an embedded appearance with local borders, a non-sticky toolbar, and a constrained writing height.
- **Tabular Lists**: Use the shared `Table` components for list-style layouts instead of custom row divs to keep alignment consistent.
- **Server Layouts**: For async server layouts that only pass through children, return a fragment instead of raw children.
- **Tooltip Provider**: When using `Tooltip` from `src/components/ui/tooltip.tsx`, do not wrap it in another `TooltipProvider`; `src/providers/client-providers.tsx` already provides the app-wide wrapper.
- **Icon Availability**: When introducing a new `lucide-react` icon, verify the installed package exports it; use a generic available icon when brand-specific icons are absent.
- **JSX Curly Braces**: Literally render double curly braces `{{` and `}}` in JSX text by quoting them, like `{'{{placeholder}}'}`, to prevent the JSX compiler from parsing them as JS object shorthand syntax.
- **Research Citations**: For AI research/chat responses with numbered citations, derive source metadata from AI SDK `source-url` parts and web-search tool outputs in shared helpers, then render inline citation UI from that normalized source list instead of hardcoding source parsing in components.
- **Study Modes**: When adding or removing a Study mode, update the shared Zod mode schema, mode selector cards, mode-specific system prompts, and both locale files together so the UI, API validation, and prompt behavior stay synchronized.
- **Interactive Content Prompts**: Keep generated activity instructions aligned with the structured output schema and sandbox CSP; do not advertise CDNs or external libraries unless the renderer, sanitizer, and CSP are deliberately updated together.
- **Dialog Width Overrides**: `DialogContent` sets `sm:max-w-sm` by default; custom dialog wrappers must pass responsive variant classes (such as `sm:max-w-xl` or `sm:max-w-2xl`) rather than base `max-w-*` classes so that `tailwind-merge` properly overrides the default breakpoint width.
- **Optimistic Chat Submission**: On chat submission from the landing view or active chat, immediately clear the composer and render the user's message with an active thinking indicator before awaiting chat creation or attachment uploads, rolling back with toast feedback only if the request rejects.

### 6.3 Security & Validation

- **Zod First**: Validate API route params and request bodies with Zod before handing them to Prisma or auth logic.
- **Clear Responses**: Return clear `400`/`401`/`403` responses from route handlers instead of letting invalid payloads fall through to generic errors.
- **Visible Request Failures**: Surface client-side request failures through visible errors or toasts; the shared API client already centralizes error messaging for browser requests.
- **Swagger Placement**: Keep each route handler's Swagger JSDoc block immediately above the exported `GET`/`POST`/`PUT`/`PATCH`/`DELETE` handler it documents; split multi-method route docs into one block per handler.
- **Swagger Coverage**: Document every exported API route method with its authentication, path parameters, validated request body, and the response statuses actually returned by the handler; describe both initialization and confirmation for presigned upload flows.
- **API Key Overrides**: When a service method accepts an `apiKey` override, prefer it over environment variables and cover the override with a focused unit test.
- **Long Request Timeouts**: The shared browser API client aborts after 20s, which silently fails long server work (PPTX export, image generation) as `status: undefined` with an "unexpected error" message. Pass an explicit per-request `timeout` for any endpoint that rasterizes slides or calls a generative model, and set a matching `maxDuration` on the route so the server is not cut off first.
- **Upstream Provider Errors**: Never discard an upstream provider's response body when raising an error; include the status and message so the cause is diagnosable instead of surfacing a bare status code. Image providers refuse entire regions (Google AI Studio returns 400 "User location is not supported", OpenAI 403 "Country, region, or territory not supported"), so image generation must try a fallback model chain rather than one hard-coded model.
- **Server HTML Sanitization**: `isomorphic-dompurify` with JSDOM 27+ can fail in Vercel's CommonJS server runtime because `html-encoding-sniffer` requires ESM-only `@exodus/bytes`. Keep the root JSDOM override at `25.0.1`; when Bun's hoisted linker is used, pin its compatible `cssstyle` baseline (`4.1.0`) too.

### 6.4 Tooling & CI

- **Focused Tests**: For focused validation, run package-local vitest files directly when possible (for example `vitest run src/...`) instead of the whole suite.
- **Test Scope Discipline**: Keep tests focused on durable behavior the project wants to preserve. Remove exploratory, speculative, or TDD-only scaffolding when it no longer represents required coverage.
- **Type Check**: After TypeScript or JavaScript edits, finish with `bun type-check`.
- **Formatting**: Use `bun format:fix` before verification if the change is formatting-sensitive.
- **Biome Scope**: Keep repo-wide Biome checks focused on repo-owned code. Exclude checked-in skill/example bundles (such as `.agents/**`) and vendor primitive directories like `src/components/ai-elements`, `src/components/ui`, and Tiptap primitive/icon/template packages unless the team explicitly chooses to maintain those files as first-party code.
- **Shell Paths**: Quote file paths that include `(`, `)`, `[`, or `]` when running shell or git commands.
- **API Client Paths**: The shared browser API client already targets the `/api` base URL, so request paths should start at `v1/...` instead of `api/v1/...`.
- **LocalStorage Spies**: When mocking or spying on `localStorage` in Vitest tests, target `window.localStorage` directly instead of `Storage.prototype` because `setup.ts` overrides `window.localStorage` via property descriptor.

### 6.5 Type Safety & Platform Details

- **UUID Params**: Validate UUID path params with shared Zod schemas when an API route accepts IDs from the URL.
- **Typed JSON**: Use Zod transforms to keep JSON request payloads typed before handing them to Prisma create/update calls.
- **Lesson Content Payloads**: Lesson editors must load and save only Tiptap JSON documents (`{"type":"doc","content":[...]}`); AI generation may emit transient lesson HTML only if it is converted to Tiptap JSON before persistence.
- **Assignment First Upload**: In student assignment views, treat a missing submission as an upload-ready pre-draft state because the upload initialization endpoint creates the draft submission; only require an existing `DRAFT` submission for the final submit action.
- **ICU Messages**: Use ICU-style placeholders in `next-intl` messages (`{name}`, `{count}`) when adding plurals or selects.
- **Generated Prisma Sync**: If `src/generated/prisma` and `prisma/schema.prisma` drift, rerun `bun db:generate` before assuming a storage or Prisma-backed service is broken.
- **Prisma Unknown Arguments**: If Prisma reports an unknown field on a model, verify the checked-in schema and regenerated client first; do not rename application code until the generated types and schema agree.
- **Zod Schema Imports**: In shared validation schema modules, prefer `import * as z from 'zod'` to match existing schema files and avoid Bun/Vitest named-export interop issues.

### 6.6 Storage & Uploads

- **Direct Uploads for Large Files**: Avoid routing binary file uploads (e.g. presentation templates, zips, pptx files, or large assets) directly through Next.js API route handlers when deploying to serverless platforms (like Vercel) or VPS setups. Doing so triggers the 4.5MB request body limit (on Vercel) or Nginx's default 1MB limit, along with function timeout limits. Instead, upload files directly from the client side (using S3/MinIO presigned URLs or direct HTTP posts to independent utility backend services with CORS configured).
- Upload Confirmation Fallback: When an uploaded file does not exist on the remote bucket during `confirmUpload`, explicitly delete the pending database entry to roll back the state.
- **Bucket Initialization**: When adding new buckets to the storage config, ensure they are also added to `docker-compose.yml` initialization scripts (`minio-init` and `minio-reset`).
- **Preview Delivery**: For inventory previews, prefer signed URLs over fetching full blobs into browser memory, and provide UI fallbacks when inline rendering fails.
- **Signed URL Caching**: Cache object keys rather than signed URLs, and re-sign per request; caching URLs serves expired links. Responses containing signed URLs must use `Cache-Control: private, no-store`.
- **Resilient S3 Client Initializers**: Always provide fallback checks to standard AWS environment variables (`AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) when namespaced variables (e.g. `AWS_S3_REGION`) are missing to prevent startup failures on custom local dev configurations.

## 7. Continuous Improvement (Session Retrospective)

At the **END** of every session, you MUST:

1. Review mistakes, edge cases, or ambiguities encountered.
2. Update `AGENTS.md` only with durable, high-value standards/rules (no chronological logs); do not add low-value, overly specific, or one-off observations that should not become future agent rules.
3. Eliminate redundancy—ensure new knowledge isn't already covered by specialized skills.
4. Propose future improvements to the human partner.
