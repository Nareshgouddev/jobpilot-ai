# JobPilot AI Monorepo

Production-focused monorepo for:

- Chrome Extension (Manifest V3 + React + Tailwind)
- Node.js Backend (Express + Supabase + OpenRouter API)
- Shared TypeScript package (types + Zod schemas)

## Workspace layout

- `apps/extension` - MV3 extension UI and scripts
- `apps/backend` - API server and AI orchestration
- `packages/shared` - shared contracts and validation

## Prerequisites

- Node.js 20.11+
- npm 10+

## Quick start

```bash
npm install
npm run test
```

## Environment

Copy `.env.example` values into your local environment.

## CI/CD

GitHub Actions workflows are defined in `.github/workflows`:

- `ci.yml`: runs typecheck, test, and build on pull requests and pushes to `main`/`develop`
- `release.yml`: runs full verification on semantic tags (`v*.*.*`), packages extension/backend artifacts, and publishes a GitHub Release

## Current status

Tasks 1-12 implemented: monorepo foundation, backend + extension functionality, testing, security hardening, and CI/CD automation.
