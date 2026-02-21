# API Reference — @vasic-digital/auth-context

## `AuthProvider`

```tsx
<AuthProvider
  authService={client.auth}
  onLoginSuccess={(user) => void}
  onLogout={() => void}
  onError={(error) => void}
>
  {children}
</AuthProvider>
```

## `useAuth()`

Returns `AuthContextType`:

| Field | Type | Description |
|-------|------|-------------|
| user | User \| null | Authenticated user or null |
| isAuthenticated | boolean | Whether user is logged in |
| isLoading | boolean | Auth status query loading |
| isAdmin | boolean | user.role.name === 'Admin' or role_id === 1 |
| permissions | string[] | User permission list |
| login(data) | Promise<void> | Authenticate with credentials |
| logout() | Promise<void> | End session |
| register(data) | Promise<void> | Create new account |
| updateProfile(data) | Promise<void> | Update user profile |
| changePassword(data) | Promise<void> | Change password |
| hasPermission(p) | boolean | Check single permission |
| canAccess(r, a) | boolean | Check `action:resource` permission |
