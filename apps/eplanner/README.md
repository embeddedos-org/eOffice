# Eplanner

The **Eplanner** app is part of the **eOffice Suite** — an open-source AI-powered office productivity stack with built-in eBot LLM integration.

## Status

`v3.0.0` — community release.

## Develop

```bash
# From repo root
pnpm install
pnpm --filter eplanner dev
```

The app boots on `http://localhost:5173` by default (Vite). Hot reload is enabled.

## Test

```bash
pnpm --filter eplanner test     # if vitest is configured
pnpm --filter eplanner build    # production bundle (dist/)
```

## Architecture

See the top-level [eOffice README](../../README.md) for the suite overview and the
[shared packages](../../packages/) (`@eoffice/core`, `@eoffice/server`, `@eoffice/ebot-client`)
that this app consumes.

## License

MIT — see [LICENSE](../../LICENSE) at repo root.
