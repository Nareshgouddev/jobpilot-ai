# JobPilot AI Monorepo

Production-focused monorepo for:

- Chrome Extension (Manifest V3 + React + Tailwind)
- Node.js Backend (Express + Supabase + Claude API)
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

## Current status

Task 1 completed: monorepo and shared package foundation.
