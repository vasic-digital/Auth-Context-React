# Changelog — @vasic-digital/auth-context

## [0.1.0] — 2026-02-21

### Added
- `AuthProvider` with `authService` dependency injection
- `useAuth()` hook: user, isAuthenticated, isLoading, isAdmin, permissions
- login, logout, register, updateProfile, changePassword mutations
- hasPermission, canAccess permission helpers
- onLoginSuccess, onLogout, onError callbacks
- localStorage token persistence
