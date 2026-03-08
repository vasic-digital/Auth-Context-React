# CLAUDE.md - Auth-Context-React

## Overview

React AuthProvider and useAuth hook for Catalogizer authentication, wrapping `@tanstack/react-query` for server state management.

**Package**: `@vasic-digital/auth-context`

## Build & Test

```bash
npm install
npm run build        # tsc
npm run test         # vitest run
npm run lint         # tsc --noEmit
npm run clean        # rm -rf dist
```

## Code Style

- TypeScript strict mode
- PascalCase components, camelCase functions
- Imports grouped: React, third-party (`@tanstack/react-query`), internal (`@vasic-digital/*`)
- Tests: Vitest with React Testing Library and jsdom environment

## Package Structure

| Path | Purpose |
|------|---------|
| `src/index.ts` | Re-exports from AuthContext |
| `src/AuthContext.tsx` | AuthProvider component, useAuth hook, AuthContext |
| `src/__tests__/AuthContext.test.tsx` | Component and hook tests |
| `src/__tests__/setup.ts` | Test setup (jsdom) |

## Key Exports

- `AuthProvider` -- React context provider; wraps app tree with authentication state. Accepts `authService` (from `@vasic-digital/catalogizer-api-client`), optional callbacks: `onLoginSuccess`, `onLogout`, `onError`
- `useAuth()` -- Hook returning `AuthContextType` with `user`, `isAuthenticated`, `isLoading`, `isAdmin`, `permissions`, `login()`, `logout()`, `register()`, `updateProfile()`, `changePassword()`, `hasPermission()`, `canAccess()`
- `AuthContext` -- Raw React context (default export)
- `AuthContextType` -- Type for the context value
- `AuthProviderProps` -- Type for AuthProvider props

## Dependencies

- **Peer**: `react ^18.0.0`, `@tanstack/react-query ^5.0.0`
- **Internal**: `@vasic-digital/catalogizer-api-client` (AuthService), `@vasic-digital/media-types` (User, LoginRequest, etc.)

## Design Patterns

- **Context + Hook**: `createContext` + `useContext` wrapper with mandatory provider check
- **React Query mutations**: Login, logout, register, updateProfile, changePassword each use `useMutation` for async state
- **React Query polling**: Auth status fetched via `useQuery` with 5-minute stale time, retry logic skips 401s
- **Token persistence**: `localStorage` for `auth_token` and `user` (guarded with `typeof window !== 'undefined'`)
- **Permission model**: Admins bypass all checks; `canAccess(resource, action)` checks `action:resource` format

## Commit Style

Conventional Commits: `feat(auth-context): description`
