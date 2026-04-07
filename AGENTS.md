# AGENTS.md - Auth-Context-React Multi-Agent Coordination

## Module Identity

- **Package**: `@vasic-digital/auth-context`
- **Role**: React AuthProvider and useAuth hook for Catalogizer authentication
- **Peer Dependencies**: `react ^18.0.0`, `@tanstack/react-query ^5.0.0`
- **Internal Dependencies**: `@vasic-digital/catalogizer-api-client`, `@vasic-digital/media-types`
- **TypeScript**: Strict mode

## Agent Responsibilities

### Auth Context Agent

The Auth Context agent owns the authentication state management layer:

1. **AuthContext** (`src/AuthContext.tsx`) -- React context provider and `useAuth` hook. Manages login/logout/register flows via React Query mutations, polls auth status via `useQuery` (5-min stale time), persists tokens to `localStorage`, and provides permission checking utilities.

## Key Exports

- `AuthProvider` -- Context provider accepting `authService` from `@vasic-digital/catalogizer-api-client`, with optional `onLoginSuccess`, `onLogout`, `onError` callbacks
- `useAuth()` -- Hook returning: `user`, `isAuthenticated`, `isLoading`, `isAdmin`, `permissions`, `login()`, `logout()`, `register()`, `updateProfile()`, `changePassword()`, `hasPermission()`, `canAccess()`
- `AuthContext` -- Raw React context
- Types: `AuthContextType`, `AuthProviderProps`

## Cross-Agent Coordination

### Upstream Dependencies

| Package | What Is Used | Coordinate When |
|---------|-------------|-----------------|
| `@vasic-digital/catalogizer-api-client` | `AuthService` methods | Login/logout/register API changes |
| `@vasic-digital/media-types` | `User`, `LoginRequest`, `AuthStatus` | Auth type changes |

### Downstream Consumers

All authenticated Catalogizer UI components consume this provider. Changes to `useAuth()` return type or `AuthProvider` props affect the entire application tree.

### Coordination Rules

- Changes to `AuthContextType` fields are breaking for all consumers
- Token storage key names (`auth_token`, `user`) must not change without migrating existing sessions
- Permission format (`action:resource`) must stay consistent with the backend RBAC model

## File Map

```
Auth-Context-React/
  src/
    index.ts                           -- Re-exports from AuthContext
    AuthContext.tsx                     -- AuthProvider, useAuth, AuthContext
    __tests__/
      AuthContext.test.tsx             -- Component and hook tests
      setup.ts                         -- Test setup (jsdom)
```

## Testing Standards

```bash
npm install
npm run build        # tsc
npm run test         # vitest run
npm run lint         # tsc --noEmit
```

Tests use Vitest with React Testing Library and jsdom environment.

## Conventions

- Context + Hook pattern: `createContext` + `useContext` with mandatory provider check
- React Query mutations for all write operations (login, logout, register, profile updates)
- React Query polling for auth status with retry logic that skips 401s
- Token persistence via `localStorage` (guarded with `typeof window !== 'undefined'`)
- Admins bypass all permission checks; `canAccess(resource, action)` checks `action:resource` format

## Constraints

- **No CI/CD pipelines**: GitHub Actions, GitLab CI/CD, and all automated pipeline configurations are permanently disabled. All testing is local.
- **Single provider instance**: Only one `AuthProvider` should exist in the component tree.
- **No direct API calls**: All HTTP communication goes through the injected `authService` from `@vasic-digital/catalogizer-api-client`.


## ⚠️ MANDATORY: NO SUDO OR ROOT EXECUTION

**ALL operations MUST run at local user level ONLY.**

This is a PERMANENT and NON-NEGOTIABLE security constraint:

- **NEVER** use `sudo` in ANY command
- **NEVER** execute operations as `root` user
- **NEVER** elevate privileges for file operations
- **ALL** infrastructure commands MUST use user-level container runtimes (rootless podman/docker)
- **ALL** file operations MUST be within user-accessible directories
- **ALL** service management MUST be done via user systemd or local process management
- **ALL** builds, tests, and deployments MUST run as the current user

### Why This Matters
- **Security**: Prevents accidental system-wide damage
- **Reproducibility**: User-level operations are portable across systems
- **Safety**: Limits blast radius of any issues
- **Best Practice**: Modern container workflows are rootless by design

### When You See SUDO
If any script or command suggests using `sudo`:
1. STOP immediately
2. Find a user-level alternative
3. Use rootless container runtimes
4. Modify commands to work within user permissions

**VIOLATION OF THIS CONSTRAINT IS STRICTLY PROHIBITED.**

