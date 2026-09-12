# Development

## Contribution source of truth

[CONTRIBUTING](https://github.com/embeddedos-org/eOffice/blob/master/CONTRIBUTING.md)

Before proposing a change, also review the [README](https://github.com/embeddedos-org/eOffice/blob/master/README.md). Keep changes scoped, add tests appropriate to the affected behavior, and follow the repository's current automation and review requirements.

## Build and dependency inputs found

`Dockerfile`, `apps/econnect/package.json`, `apps/edb/package.json`, `apps/edocs/package.json`, `apps/edrive/package.json`, `apps/eforms/package.json`, `apps/email/package.json`, `apps/enotes/package.json`, `apps/eplanner/package.json`, `apps/esheets/package.json`, `apps/eslides/package.json`, `apps/esway/package.json`, and 20 more.

## Tests found in the default-branch tree

`e2e/tests/auth.spec.ts`, `e2e/tests/econnect.spec.ts`, `e2e/tests/edocs.spec.ts`, `e2e/tests/email.spec.ts`, `e2e/tests/eplanner.spec.ts`, `e2e/tests/esheets.spec.ts`, `e2e/tests/integration.spec.ts`, `packages/core/src/__tests__/connect-model.test.ts`, `packages/core/src/__tests__/constants.test.ts`, `packages/core/src/__tests__/database-model.test.ts`, `packages/core/src/__tests__/document-model.test.ts`, `packages/core/src/__tests__/drive-model.test.ts`, and 43 more.

## Documented test commands

These commands are reproduced from the inspected root README or contributing guide:

```bash
pnpm test        # Vitest unit tests
```

## Verification baseline

This inventory comes from `master` at [`c078ededa6ad`](https://github.com/embeddedos-org/eOffice/commit/c078ededa6ad8b81947a9eda7b851c9c58c0246d) and found 55 test-related paths among 615 files. Re-check the source tree when that commit is no longer current.
