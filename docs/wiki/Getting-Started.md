# Getting Started

## Repository purpose

eOffice — Open-Source Office Suite

## First steps

1. Read the [README](https://github.com/embeddedos-org/eOffice/blob/master/README.md) for the project's supported setup and usage path.
2. Clone the repository and enter its directory:

```bash
git clone https://github.com/embeddedos-org/eOffice.git
cd eOffice
```

3. Check the root project inputs below before installing dependencies or selecting a build tool.
4. Review [Development](Development) before changing code, and [Security](Security) before reporting a vulnerability.

## Root project inputs

- `Dockerfile`: Container build definition.
- `docker-compose.yml`: Docker Compose definition.
- `package.json`: Node.js package manifest.
- `pnpm-lock.yaml`: pnpm dependency lock.

## Scope note

The default branch inspected for this page was `master` at [`c078ededa6ad`](https://github.com/embeddedos-org/eOffice/commit/c078ededa6ad8b81947a9eda7b851c9c58c0246d). This page intentionally does not invent a universal build command when the repository's own documentation does not provide one.
