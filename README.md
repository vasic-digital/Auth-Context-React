# @vasic-digital/auth-context

React `AuthProvider` and `useAuth` hook for Catalogizer authentication. Wraps `@tanstack/react-query` for server state with support for login, logout, registration, profile management, and permission checking.

## Install

```bash
npm install @vasic-digital/auth-context @vasic-digital/media-types @vasic-digital/catalogizer-api-client
npm install @tanstack/react-query react
```

## Usage

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CatalogizerClient } from '@vasic-digital/catalogizer-api-client'
import { AuthProvider, useAuth } from '@vasic-digital/auth-context'

const client = new CatalogizerClient({ baseURL: 'http://localhost:8080' })
const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider
        authService={client.auth}
        onLoginSuccess={(user) => console.log('Logged in:', user.username)}
        onLogout={() => console.log('Logged out')}
      >
        <YourApp />
      </AuthProvider>
    </QueryClientProvider>
  )
}

function YourApp() {
  const { user, isAuthenticated, isAdmin, login, logout, hasPermission } = useAuth()

  if (!isAuthenticated) {
    return <button onClick={() => login({ username: 'admin', password: 'secret' })}>Login</button>
  }

  return (
    <div>
      <p>Hello, {user?.first_name}</p>
      {isAdmin && <p>You are an admin</p>}
      {hasPermission('read:media') && <p>Can read media</p>}
      <button onClick={logout}>Logout</button>
    </div>
  )
}
```

## API

### `AuthProvider` Props

| Prop | Type | Description |
|------|------|-------------|
| `authService` | `AuthService` | From `@vasic-digital/catalogizer-api-client` |
| `children` | `ReactNode` | Your app tree |
| `onLoginSuccess?` | `(user: User) => void` | Callback after successful login |
| `onLogout?` | `() => void` | Callback after logout |
| `onError?` | `(error: Error) => void` | Callback on auth errors |

### `useAuth()` Returns

| Field | Type | Description |
|-------|------|-------------|
| `user` | `User \| null` | Current authenticated user |
| `isAuthenticated` | `boolean` | Whether user is logged in |
| `isLoading` | `boolean` | Auth status loading |
| `isAdmin` | `boolean` | Whether user has Admin role |
| `permissions` | `string[]` | User permission list |
| `login(data)` | `Promise<void>` | Log in with credentials |
| `logout()` | `Promise<void>` | Log out |
| `register(data)` | `Promise<void>` | Register new account |
| `updateProfile(data)` | `Promise<void>` | Update profile |
| `changePassword(data)` | `Promise<void>` | Change password |
| `hasPermission(p)` | `boolean` | Check a specific permission |
| `canAccess(resource, action)` | `boolean` | Check `action:resource` permission |

## License

MIT
