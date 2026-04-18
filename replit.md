# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### Cute Pomodoro Timer (`artifacts/pomodoro`)
- **Preview path**: `/`
- **Type**: React + Vite (frontend-only, no backend)
- **Features**:
  - 25/5 min Pomodoro cycles (fully customizable)
  - Animated SVG progress circle with glow effect
  - Dark/light pastel mode toggle (persisted in localStorage)
  - Cute animated characters that react to timer state (focusing cat, relaxing flower, sleeping, done)
  - Pastel pink & purple palette
  - Pacifico + Nunito fonts
  - Floating background decorations, sparkle animations
  - Cycle tracking with dots indicator
  - Settings modal with custom work/break/long break durations and cycles per long break
  - Session counter

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
