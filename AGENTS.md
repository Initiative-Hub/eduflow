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
- **Composable Auth Wrappers**: Keep `withRoles(...)` and `withPermissions(...)` self-sufficient. They must be usable directly on route handlers without wrapping them in `withAuth(...)`, while still accepting a forwarded session when composed under another auth-aware wrapper.
- **Shared Prisma Client**: Use the shared Prisma client from `src/lib/prisma.ts` and local bootstrap data from `prisma/seed.ts`; use `bun db:reset` when you need a clean local database.

### 6.2 UI & Rendering Patterns

- **Translations**: Keep user-facing copy in `messages/en.json` and `messages/vi.json`.
- **Next-intl Components**: When extracting text-heavy components, pass plain strings or call next-intl helpers inside the component instead of threading translator functions through props.
- **SSR Page Entries**: Keep `src/app/**/page.tsx` as Server Components by NEVER adding 'use client' on top of them. Move only interactive logic into focused local client islands.
- **Shared Shells**: Reuse `DialogTemplate` and `FormTemplate` for modal and form shells instead of rebuilding the same structure ad hoc.
- **Embedded Editor Shells**: Do not place full-page editor chrome with sticky bars or negative horizontal margins inside cards. Expose an embedded appearance with local borders, a non-sticky toolbar, and a constrained writing height.
- **Pipeline Step Panels**: In generation/progress dialogs, render step-specific detail panels only while their step is active; add explicit step navigation before showing historical step details.
- **Planner Recommendation State**: When async planning derives a secondary UI state such as `recommendedCollection`, clear that state at the start of each new run and on fallback/error paths so the UI never shows a stale result from a previous request.
- **Dialog Success Flow**: When a dialog triggers an async mutation, close it via `onOpenChange(false)` before navigation and guard entry points with the mutation pending state to avoid duplicate opens/submits.
- **Tabular Lists**: Use the shared `Table` components for list-style layouts instead of custom row divs to keep alignment consistent.
- **Server Layouts**: For async server layouts that only pass through children, return a fragment instead of raw children.
- **Icons and Styling**: Use `lucide-react` for new icons and keep styling in the existing Tailwind utility style used throughout the app.
- **Icon Availability**: When introducing a new `lucide-react` icon, verify the installed package exports it; use a generic available icon when brand-specific icons are absent.
- **JSX Curly Braces**: Literally render double curly braces `{{` and `}}` in JSX text by quoting them, like `{'{{placeholder}}'}`, to prevent the JSX compiler from parsing them as JS object shorthand syntax.
- **Research Citations**: For AI research/chat responses with numbered citations, derive source metadata from AI SDK `source-url` parts and web-search tool outputs in shared helpers, then render inline citation UI from that normalized source list instead of hardcoding source parsing in components.
- **Study Modes**: When adding or removing a Study mode, update the shared Zod mode schema, mode selector cards, mode-specific system prompts, and both locale files together so the UI, API validation, and prompt behavior stay synchronized.
- **Interactive Content Prompts**: Keep generated activity instructions aligned with the structured output schema and sandbox CSP; do not advertise CDNs or external libraries unless the renderer, sanitizer, and CSP are deliberately updated together.
- **Dropped Slides**: Hiding a slide from presentation must be a reversible attribute on the `.slide` element plus a navigation runtime injected into the saved deck HTML, because the vendored deck script iterates every `.slide`. Never delete slide markup to hide a slide. Presenting reuses the editor document (fullscreen only expands the editor container), so slide visibility must never be gated on an "is editing" or "is presenting" flag; rely on the deck's existing rule that only the `active` slide is visible, and reach hidden slides by activating them directly.
- **Generated Slide DOM Edits**: In the generated-slide iframe editor, target only leaf SVG `text`/`tspan` nodes, resolve the active slide at action time, preserve SVG structure/IDs/layout, change only `src`/`href` when replacing images, keep generated image bytes in deck-scoped storage instead of saved HTML, and strip temporary controls/selection/editor attributes before persistence.

### 6.3 Security & Validation

- **Zod First**: Validate API route params and request bodies with Zod before handing them to Prisma or auth logic.
- **Clear Responses**: Return clear `400`/`401`/`403` responses from route handlers instead of letting invalid payloads fall through to generic errors.
- **Visible Request Failures**: Surface client-side request failures through visible errors or toasts; the shared API client already centralizes error messaging for browser requests.
- **Swagger Placement**: Keep each route handler's Swagger JSDoc block immediately above the exported `GET`/`POST`/`PUT`/`PATCH`/`DELETE` handler it documents; split multi-method route docs into one block per handler.
- **Swagger Coverage**: Document every exported API route method with its authentication, path parameters, validated request body, and the response statuses actually returned by the handler; describe both initialization and confirmation for presigned upload flows.
- **API Key Overrides**: When a service method accepts an `apiKey` override, prefer it over environment variables and cover the override with a focused unit test.
- **Long Request Timeouts**: The shared browser API client aborts after 20s, which silently fails long server work (PPTX export, image generation) as `status: undefined` with an "unexpected error" message. Pass an explicit per-request `timeout` for any endpoint that rasterizes slides or calls a generative model, and set a matching `maxDuration` on the route so the server is not cut off first.
- **Upstream Provider Errors**: Never discard an upstream provider's response body when raising an error; include the status and message so the cause is diagnosable instead of surfacing a bare status code. Image providers refuse entire regions (Google AI Studio returns 400 "User location is not supported", OpenAI 403 "Country, region, or territory not supported"), so image generation must try a fallback model chain rather than one hard-coded model.

### 6.4 Tooling & CI

- **Focused Tests**: For focused validation, run package-local vitest files directly when possible (for example `vitest run src/...`) instead of the whole suite.
- **Test Scope Discipline**: Keep tests focused on durable behavior the project wants to preserve. Remove exploratory, speculative, or TDD-only scaffolding when it no longer represents required coverage.
- **Type Check**: After TypeScript or JavaScript edits, finish with `bun type-check`.
- **Formatting**: Use `bun format:fix` before verification if the change is formatting-sensitive.
- **Biome Scope**: Keep repo-wide Biome checks focused on repo-owned code. Exclude checked-in skill/example bundles (such as `.agents/**`) and vendor primitive directories like `src/components/ai-elements`, `src/components/ui`, and Tiptap primitive/icon/template packages unless the team explicitly chooses to maintain those files as first-party code.
- **Shell Paths**: Quote file paths that include `(`, `)`, `[`, or `]` when running shell or git commands.
- **API Client Paths**: The shared browser API client already targets the `/api` base URL, so request paths should start at `v1/...` instead of `api/v1/...`.

### 6.5 Type Safety & Platform Details

- **UUID Params**: Validate UUID path params with shared Zod schemas when an API route accepts IDs from the URL.
- **Typed JSON**: Use Zod transforms to keep JSON request payloads typed before handing them to Prisma create/update calls.
- **Lesson Content Payloads**: Lesson editors must load and save only Tiptap JSON documents (`{"type":"doc","content":[...]}`); AI generation may emit transient lesson HTML only if it is converted to Tiptap JSON before persistence.
- **Assignment First Upload**: In student assignment views, treat a missing submission as an upload-ready pre-draft state because the upload initialization endpoint creates the draft submission; only require an existing `DRAFT` submission for the final submit action.
- **Inferred Types**: Prefer inferred Prisma and Zod types over handwritten duplicates; when a shape repeats, extract it into a local type alias or helper instead of retyping the structure.
- **ICU Messages**: Use ICU-style placeholders in `next-intl` messages (`{name}`, `{count}`) when adding plurals or selects.
- **Generated Prisma Sync**: If `src/generated/prisma` and `prisma/schema.prisma` drift, rerun `bun db:generate` before assuming a storage or Prisma-backed service is broken.
- **Prisma Unknown Arguments**: If Prisma reports an unknown field on a model, verify the checked-in schema and regenerated client first; do not rename application code until the generated types and schema agree.
- **Zod Schema Imports**: In shared validation schema modules, prefer `import * as z from 'zod'` to match existing schema files and avoid Bun/Vitest named-export interop issues.

### 6.6 Storage & Uploads

- **Direct Uploads for Large Files**: Avoid routing binary file uploads (e.g. presentation templates, zips, pptx files, or large assets) directly through Next.js API route handlers when deploying to serverless platforms (like Vercel) or VPS setups. Doing so triggers the 4.5MB request body limit (on Vercel) or Nginx's default 1MB limit, along with function timeout limits. Instead, upload files directly from the client side (using S3/MinIO presigned URLs or direct HTTP posts to independent utility backend services with CORS configured).
- Upload Confirmation Fallback: When an uploaded file does not exist on the remote bucket during `confirmUpload`, explicitly delete the pending database entry to roll back the state.
- **Bucket Initialization**: When adding new buckets to the storage config, ensure they are also added to `docker-compose.yml` initialization scripts (`minio-init` and `minio-reset`).
- **Preview Delivery**: For inventory previews, prefer signed URLs over fetching full blobs into browser memory, and provide UI fallbacks when inline rendering fails.
- **Template Preview Rasterization**: Serve slide template previews as PNGs rasterized once by the Python service and cached in the collection's S3 bucket, delivered as signed URLs and rendered with lazy-loaded `<img>`. Never return SVG markup for galleries: it inflates the API response and forces a live SVG layout tree per slide. Key previews by their category directory, never by file name, because every category stores its layout as `standard.svg`. Rasterize them at import time rather than on first open, and serve them by listing the cached preview keys so the picker neither downloads the whole collection nor waits on rasterization; rebuild only when a category is missing its preview.
- **Signed URL Caching**: Cache object keys rather than signed URLs, and re-sign per request; caching URLs serves expired links. Responses containing signed URLs must use `Cache-Control: private, no-store`.
- **Resilient S3 Client Initializers**: Always provide fallback checks to standard AWS environment variables (`AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) when namespaced variables (e.g. `AWS_S3_REGION`) are missing to prevent startup failures on custom local dev configurations.
- **S3-First Multi-Bucket Templates**: Slide templates are stored in two distinct S3 buckets under the `templates/` prefix:
  - System default collections (e.g., `vintage`, `clean_light`, `pastel_pop`, `starter`, `neon_dark` and the base `templates` layout categories) belong in the system default templates bucket (`AWS_S3_DEFAULT_TEMPLATES_BUCKET`, i.e., `eduflow-default-template`).
  - User-uploaded custom templates must remain isolated and persist inside the custom templates bucket (`AWS_S3_TEMPLATES_BUCKET`, i.e., `eduflow-template`).
  - The backend slide service lists collections and downloads layouts dynamically from these buckets on demand, caching them locally under `SLIDE_TEMPLATES_DIR`. Local static layout files in `external-services/templates` are no longer required and can be deleted safely after they are uploaded to S3.
  - Keep slide usage guidance in each `CATEGORY/category.json` as the source of truth. Top-level `collection.json` should keep collection-wide style metadata such as name, description, palette, and `image_style`, and it may also mirror a `categories` block for browsing or distribution when needed. When loading template metadata at runtime, prefer `collection.json.categories` first and fall back to each `CATEGORY/category.json` for any missing fields.
  - For standard built-in planning in the Next.js app, prefer the checked-in `config/slide-layout-guidance.json` file. Use dynamic template category metadata only for custom collections or as a fallback when the local planning guidance is incomplete.
  - In the presentation planner, the `auto` style picker must recommend only built-in default style collections. Never include user-uploaded custom template collections in the AI auto-pick candidate list.
  - For built-in auto-style selection, higher-education, university lecture, student-feedback, and research-presentation topics should bias toward `rmit_red_modern` over generic light themes such as `clean_light`.
  - When the planning prompt explicitly requests a built-in style collection by name or alias (for example, "use the RMIT template" or just `rmit_red_modern`), treat that request as authoritative in `auto` mode and override softer topic-based style heuristics.
  - When live template inventory is missing some built-in default collections, merge it with the checked-in built-in style registry before planning or resolving `auto` recommendations so explicit built-in style requests still remain selectable.
  - Always paginate S3 listings for templates and other prefixes; `list_objects_v2` truncates at 1000 keys, which silently hides collections and produces partial local template caches.
  - Reconcile cached template collections against S3 instead of trusting the presence of any local `.svg`, and resolve a missing collection to the base `templates` library rather than an empty directory so generation fails with an actionable message.
  - **Brand Template Imports**: PPTX template extraction accepts a `source` of `auto`, `layouts`, or `slides`. Corporate/brand templates keep their designs in the Slide Master's layouts, so `layouts` (or `auto`) is required to capture them; validate the value in both the route and the service. After importing, compare the classifier's category list against the created folder count and surface a warning, because two layouts sharing a category name overwrite each other.
  - **OpenRouter Failover**: Keep `OPENROUTER_API_KEY` set in the Python service `.env` and in deployed secrets. `slide-skills` fails over to OpenRouter when OpenAI returns quota (429) or auth (401) errors, so a missing key turns a billing issue into a full generation outage. The web app's root `.env` is not visible to the Python service.
  - **Binding/Slot Name Bridging**: Let `slide-skills` map caller binding names (`heading`, `body_text`) onto a template's real slot names (`title`, `title_2`, `body`) via `resolve_binding_aliases`; do not duplicate that mapping in the service. Any wrapper around `select_and_fill_slide` must only fill slots the library left empty — overwriting a resolved value replaces the library's per-line list for indexed placeholders (`title_2.1`, `.2`) with a raw string, which silently leaves every indexed slot unfilled.
  - **Surface Generation Warnings**: Log every per-slide warning deck generation returns, but only alert the user about ones that mean visible damage (a skipped slide, a failed image). `dropped bindings` warnings are expected noise, because the binding flattener emits many alias spellings of the same value and every unused spelling is reported even when the slide rendered correctly.
  - **Slide Content Depth**: After planning, detect content slides the model left with only a heading and run a focused second pass to fill them from the lesson. Exempt cover and divider layouts (capacity <= 1, or a divider/cover style name) so they legitimately stay title-only, merge enriched bindings over the originals instead of replacing them, and never fail planning when enrichment errors.
  - **Layout Capacity Awareness**: Extracted brand templates are often sparse, so a layout may expose only a `title` slot. Include each category's `text_slots`/`capacity` (from `category_map()`) in the planning prompt and mark title-only layouts as dividers that must receive no bindings; otherwise planned body content is silently dropped and the slide renders as a heading on an empty background. Log `dropped bindings` warnings returned by deck generation instead of discarding them.
  - **System Template Style Registration**: When adding a new system-wide default style collection (e.g. `illustrative_culture`, `minimalist_gradient`), register it in the following places so S3 requests are routed to the default templates bucket and explicit style prompts resolve correctly:
    1. **`slide_service.py`**: Add it to `DEFAULT_COLLECTIONS` and the fallback descriptions dictionary; the shared set also controls custom/default routing and cleanup exemptions.
    2. **`SlideService.ts`**: Add it to `DEFAULT_TEMPLATE_COLLECTIONS` in the template previews resolver.
    3. **`PresentationService.ts`**: Register it in `STYLE_COLLECTIONS` with a prompt-optimized description, and add a readable spelling to `STYLE_COLLECTION_ALIASES`.
    4. **`upload_templates_to_s3.py`**: Add it to `DEFAULT_COLLECTIONS` when no-argument uploads should include the new built-in style.
    After publishing, verify both `/slides/templates/collections` and `/slides/templates/<collection>/previews` against the running slide service.

## 7. Continuous Improvement (Session Retrospective)

At the **END** of every session, you MUST:

1. Review mistakes, edge cases, or ambiguities encountered.
2. Update `AGENTS.md` only with durable, high-value standards/rules (no chronological logs); do not add low-value, overly specific, or one-off observations that should not become future agent rules.
3. Eliminate redundancy—ensure new knowledge isn't already covered by specialized skills.
4. Propose future improvements to the human partner.
