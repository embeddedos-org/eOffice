# Repository Guidance for Agents

## Scope and architecture

eOffice is a pnpm-managed TypeScript and React monorepo. The Vite shell lives in
`src/`, individual productivity applications and shared app code in `apps/`,
shared libraries and services in `packages/`, browser builds in `browser/`, the
Electron wrapper in `desktop/`, integrations in `extensions/`, and Playwright
coverage in `e2e/`. A change to shared editing, storage, or collaboration
contracts can affect several applications and must be checked across consumers.

Follow the specialist role briefs in [`.ai/`](./.ai/) and the handoff protocol in
[`HANDOFF.md`](./HANDOFF.md). The implementer must not act as the approving
reviewer. Keep app-specific work within its workspace package and avoid broad
formatting or generated-lockfile churn.

## Build and validation

Use the pinned package manager from `package.json`.

- Install with `pnpm install --frozen-lockfile`.
- Run unit tests with `pnpm test`.
- Run lint and type checks with `pnpm lint` and `pnpm type-check`.
- Build the web application with `pnpm build`.
- Run `pnpm test:e2e` for user workflows or cross-application behavior.
- Use `pnpm build:pwa` or `pnpm build:extension` when those delivery targets
  change.

Report any skipped browser, Electron, or platform validation and the missing
runtime. Preserve accessible keyboard and screen-reader behavior in UI changes.

## Change discipline

Keep workspace dependencies declared in the owning package, preserve persisted
document compatibility, and treat file import/export, HTML rendering, auth, and
collaboration inputs as untrusted. Do not commit `node_modules`, build output,
credentials, user documents, or generated packages.

Every human-authored pull request must use a GitHub-recognized closing keyword
for an issue in this repository, for example `Fixes #123`. Cross-repository
issues and plain issue mentions do not satisfy the linked-issue policy. Follow
[`.github/PULL_REQUEST_TEMPLATE.md`](./.github/PULL_REQUEST_TEMPLATE.md), and
keep the published Wiki snapshot in [`docs/wiki/`](./docs/wiki/) synchronized
when Wiki content changes.
