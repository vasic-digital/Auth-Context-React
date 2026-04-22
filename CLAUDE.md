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


## ⚠️ MANDATORY: NO SUDO OR ROOT EXECUTION

**ALL operations MUST run at local user level ONLY.**

This is a PERMANENT and NON-NEGOTIABLE security constraint:

- **NEVER** use `sudo` in ANY command
- **NEVER** use `su` in ANY command
- **NEVER** execute operations as `root` user
- **NEVER** elevate privileges for file operations
- **ALL** infrastructure commands MUST use user-level container runtimes (rootless podman/docker)
- **ALL** file operations MUST be within user-accessible directories
- **ALL** service management MUST be done via user systemd or local process management
- **ALL** builds, tests, and deployments MUST run as the current user

### Container-Based Solutions
When a build or runtime environment requires system-level dependencies, use containers instead of elevation:

- **Use the `Containers` submodule** (`https://github.com/vasic-digital/Containers`) for containerized build and runtime environments
- **Add the `Containers` submodule as a Git dependency** and configure it for local use within the project
- **Build and run inside containers** to avoid any need for privilege escalation
- **Rootless Podman/Docker** is the preferred container runtime

### Why This Matters
- **Security**: Prevents accidental system-wide damage
- **Reproducibility**: User-level operations are portable across systems
- **Safety**: Limits blast radius of any issues
- **Best Practice**: Modern container workflows are rootless by design

### When You See SUDO
If any script or command suggests using `sudo` or `su`:
1. STOP immediately
2. Find a user-level alternative
3. Use rootless container runtimes
4. Use the `Containers` submodule for containerized builds
5. Modify commands to work within user permissions

**VIOLATION OF THIS CONSTRAINT IS STRICTLY PROHIBITED.**


