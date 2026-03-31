# Architecture -- Auth-Context-React

## Purpose

React AuthProvider and useAuth hook for Catalogizer authentication. Wraps `@tanstack/react-query` for server state management with support for login, logout, registration, profile management, and permission checking with role-based access control.

## Structure

```
src/
  index.ts                      Re-exports from AuthContext
  AuthContext.tsx                AuthProvider component, useAuth hook, AuthContext
  __tests__/
    AuthContext.test.tsx         Component and hook tests
    setup.ts                    Test setup (jsdom)
```

## Key Components

- **`AuthProvider`** -- React context provider wrapping the app tree with authentication state. Accepts authService, optional callbacks for login success, logout, and errors
- **`useAuth()`** -- Hook returning user, isAuthenticated, isLoading, isAdmin, permissions, login(), logout(), register(), updateProfile(), changePassword(), hasPermission(), canAccess()
- **React Query integration** -- Login/logout/register use `useMutation`; auth status polled via `useQuery` with 5-minute stale time
- **Token persistence** -- localStorage for auth_token and user (guarded with typeof window check)
- **Permission model** -- Admins bypass all checks; canAccess(resource, action) checks `action:resource` format

## Data Flow

```
AuthProvider mounts -> useQuery polls /auth/status every 5 minutes
    |
    login(credentials) -> useMutation -> authService.login() -> store token in localStorage -> refetch status
    |
    useAuth().isAuthenticated -> check user !== null
    useAuth().hasPermission("read:media") -> check permissions array (admins always true)
    |
    logout() -> useMutation -> authService.logout() -> clear localStorage -> refetch status
```

## Dependencies

- React 18+ (peer)
- `@tanstack/react-query` 5+ (peer)
- `@vasic-digital/catalogizer-api-client` -- AuthService
- `@vasic-digital/media-types` -- User, LoginRequest types

## Testing Strategy

Vitest with React Testing Library and jsdom. Tests cover provider rendering, login/logout mutations, permission checking, admin bypass, and error handling callbacks.
