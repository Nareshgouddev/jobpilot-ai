# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JobPilot AI is a monorepo containing:
- **Chrome Extension** (Manifest V3) - React + Tailwind UI that scrapes job listings and captures user actions
- **Node.js Backend** - Express API with Supabase + OpenRouter for AI-powered job data processing
- **Shared Package** - Zod schemas for type-safe contracts between extension and backend

## Commands

```bash
npm install          # Install all workspace dependencies
npm run build       # Build all workspaces
npm run dev         # Run dev mode for all workspaces (backend: tsx watch, extension: vite build --watch)
npm run test        # Run tests (vitest) across all workspaces
npm run typecheck   # TypeScript type checking across all workspaces

# Single workspace
npm run dev --workspace @jobpilot/backend
npm run dev --workspace @jobpilot/extension
npm run test --workspace @jobpilot/shared
```

## Architecture

### Workspace Structure
```
apps/extension/   - Chrome MV3 extension (React + Tailwind + Vite)
apps/backend/     - Express API server (tsx for dev, tsc for build)
packages/shared/  - Zod schemas only, imported by both apps
```

### Backend Architecture (`apps/backend/src/`)
- `server.ts` - Entry point, creates app and listens on PORT
- `app.ts` - Express app factory, composes all middleware/routes
- `config/env.ts` - Environment variable validation via Zod
- `config/logger.ts` - Pino logger instance
- `auth/` - JWT token validation and require-auth middleware
- `ai/` - OpenRouter client, prompt builder, retry logic, response parser, generation service
- `db/` - Supabase client, repositories (job, profile, generation), typed errors
- `routes/` - Express routers (auth, core, health)
- `middleware/` - Security (CORS, CSP, helmet, rate limiting), audit logging, error handling

### Extension Architecture (`apps/extension/src/`)
- `background.ts` - Service worker entry (Chrome extension runtime)
- `content.ts` - Content script for DOM scraping
- `entrypoints/popup/` - Extension popup UI (React)
- `entrypoints/options/` - Extension options page (React)
- `lib/` - API client, storage, config, DOM scraper, capture guards

### Shared Contract
The `packages/shared` package exports Zod schemas used for:
- Validating environment variables in backend
- Validating API request/response payloads between extension and backend
- Type inference via `z.infer<typeof schema>`

### Security Model
- Backend uses JWT authentication (RS256) with issuer/audience validation
- Extension and backend share a secret for extension-to-backend auth
- Strict CORS policy restricts origin to `chrome-extension://`
- CSP middleware applies Content-Security-Policy headers
- Rate limiting on auth endpoints (stricter) and general endpoints

### Key Dependencies
- Backend: Express, Supabase, OpenRouter SDK, Pino logging, Helmet, Zod
- Extension: React 18, Tailwind CSS, Vite, jsdom for testing
- Shared: Zod only

## Environment Setup

Copy `.env.example` to `.env.local` (or `.env` for backend). Required variables:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` - Supabase project
- `JWT_SECRET` - For signing/verifying JWTs
- `EXTENSION_SHARED_SECRET` - Shared secret for extension-backend auth
- `CORS_ORIGIN` - Must be `chrome-extension://<your-extension-id>`
- `VITE_API_BASE_URL` (extension) - Backend URL (e.g., `http://localhost:4000`)
