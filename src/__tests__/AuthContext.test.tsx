import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '../AuthContext'
import type { AuthService } from '@vasic-digital/catalogizer-api-client'
import type { User, AuthStatus, LoginResponse } from '@vasic-digital/media-types'
import React from 'react'

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    first_name: 'Admin',
    last_name: 'User',
    role_id: 1,
    role: { id: 1, name: 'Admin', description: 'Administrator', permissions: ['*'], is_system: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeAuthService(overrides: Partial<AuthService> = {}): AuthService {
  return {
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    getStatus: vi.fn(),
    refreshToken: vi.fn(),
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
    ...overrides,
  } as unknown as AuthService
}

function Wrapper({ authService, children, onLoginSuccess, onLogout, onError }: {
  authService: AuthService
  children: React.ReactNode
  onLoginSuccess?: (user: User) => void
  onLogout?: () => void
  onError?: (error: Error) => void
}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={client}>
      <AuthProvider authService={authService} onLoginSuccess={onLoginSuccess} onLogout={onLogout} onError={onError}>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  )
}

function AuthConsumer() {
  const { user, isAuthenticated, isAdmin, permissions } = useAuth()
  return (
    <div>
      <span data-testid="user">{user?.username ?? 'none'}</span>
      <span data-testid="auth">{String(isAuthenticated)}</span>
      <span data-testid="admin">{String(isAdmin)}</span>
      <span data-testid="perms">{permissions.join(',')}</span>
    </div>
  )
}

describe('AuthContext', () => {
  let authService: AuthService

  beforeEach(() => {
    authService = makeAuthService()
    localStorage.clear()
  })

  it('provides unauthenticated state when status returns false', async () => {
    const status: AuthStatus = { authenticated: false }
    vi.mocked(authService.getStatus).mockResolvedValue(status)

    render(
      <Wrapper authService={authService}>
        <AuthConsumer />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByTestId('auth').textContent).toBe('false')
      expect(screen.getByTestId('user').textContent).toBe('none')
    })
  })

  it('provides authenticated state when status returns user', async () => {
    const user = makeUser()
    const status: AuthStatus = { authenticated: true, user, permissions: ['read', 'write'] }
    vi.mocked(authService.getStatus).mockResolvedValue(status)

    render(
      <Wrapper authService={authService}>
        <AuthConsumer />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByTestId('auth').textContent).toBe('true')
      expect(screen.getByTestId('user').textContent).toBe('admin')
      expect(screen.getByTestId('perms').textContent).toBe('read,write')
    })
  })

  it('isAdmin is true when role name is Admin', async () => {
    const user = makeUser()
    const status: AuthStatus = { authenticated: true, user }
    vi.mocked(authService.getStatus).mockResolvedValue(status)

    render(
      <Wrapper authService={authService}>
        <AuthConsumer />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByTestId('admin').textContent).toBe('true')
    })
  })

  it('useAuth throws outside of AuthProvider', () => {
    const OffContext = () => {
      const { user } = useAuth()
      return <span>{user?.username}</span>
    }
    expect(() => render(<OffContext />)).toThrow('useAuth must be used within an AuthProvider')
  })

  it('hasPermission returns true for admin user', async () => {
    const user = makeUser()
    const status: AuthStatus = { authenticated: true, user }
    vi.mocked(authService.getStatus).mockResolvedValue(status)

    let permResult: boolean | null = null
    function PermChecker() {
      const { hasPermission } = useAuth()
      permResult = hasPermission('read:media')
      return null
    }

    render(
      <Wrapper authService={authService}>
        <PermChecker />
      </Wrapper>
    )

    await waitFor(() => {
      expect(permResult).toBe(true)
    })
  })

  it('canAccess returns true for admin user', async () => {
    const user = makeUser()
    const status: AuthStatus = { authenticated: true, user }
    vi.mocked(authService.getStatus).mockResolvedValue(status)

    let accessResult: boolean | null = null
    function AccessChecker() {
      const { canAccess } = useAuth()
      accessResult = canAccess('media', 'delete')
      return null
    }

    render(
      <Wrapper authService={authService}>
        <AccessChecker />
      </Wrapper>
    )

    await waitFor(() => {
      expect(accessResult).toBe(true)
    })
  })

  describe('login', () => {
    it('calls authService.login and sets user on success', async () => {
      const user = makeUser({ username: 'newuser' })
      const loginResp: LoginResponse = {
        user,
        session_token: 'tok-123',
        refresh_token: 'ref-123',
        expires_at: '2025-01-01T00:00:00Z',
      }
      // Initially unauthenticated; after login, getStatus returns authenticated
      // (login's onSuccess calls invalidateQueries which re-fetches status)
      let statusCallCount = 0
      vi.mocked(authService.getStatus).mockImplementation(() => {
        statusCallCount++
        if (statusCallCount <= 1) {
          return Promise.resolve({ authenticated: false })
        }
        return Promise.resolve({ authenticated: true, user })
      })
      vi.mocked(authService.login).mockResolvedValue(loginResp)

      let loginFn: ((data: { username: string; password: string }) => Promise<void>) | null = null
      function LoginCaller() {
        const { login, user: currentUser } = useAuth()
        loginFn = login
        return <span data-testid="current-user">{currentUser?.username ?? 'none'}</span>
      }

      render(
        <Wrapper authService={authService}>
          <LoginCaller />
        </Wrapper>
      )

      await waitFor(() => {
        expect(loginFn).not.toBeNull()
      })

      await act(async () => {
        await loginFn!({ username: 'newuser', password: 'pass' })
      })

      expect(authService.login).toHaveBeenCalledWith({ username: 'newuser', password: 'pass' })

      await waitFor(() => {
        expect(screen.getByTestId('current-user').textContent).toBe('newuser')
      })
    })

    it('stores auth_token and user in localStorage on login', async () => {
      const user = makeUser()
      const loginResp: LoginResponse = {
        user,
        session_token: 'tok-abc',
        refresh_token: 'ref-abc',
        expires_at: '2025-01-01T00:00:00Z',
      }
      vi.mocked(authService.getStatus).mockResolvedValue({ authenticated: false })
      vi.mocked(authService.login).mockResolvedValue(loginResp)

      let loginFn: ((data: { username: string; password: string }) => Promise<void>) | null = null
      function LoginCaller() {
        const { login } = useAuth()
        loginFn = login
        return null
      }

      render(
        <Wrapper authService={authService}>
          <LoginCaller />
        </Wrapper>
      )

      await waitFor(() => {
        expect(loginFn).not.toBeNull()
      })

      await act(async () => {
        await loginFn!({ username: 'admin', password: 'pass' })
      })

      expect(localStorage.getItem('auth_token')).toBe('tok-abc')
      expect(localStorage.getItem('user')).toBe(JSON.stringify(user))
    })

    it('calls onLoginSuccess callback after successful login', async () => {
      const user = makeUser()
      const loginResp: LoginResponse = {
        user,
        session_token: 'tok-cb',
        refresh_token: 'ref-cb',
        expires_at: '2025-01-01T00:00:00Z',
      }
      vi.mocked(authService.getStatus).mockResolvedValue({ authenticated: false })
      vi.mocked(authService.login).mockResolvedValue(loginResp)

      const onLoginSuccess = vi.fn()
      let loginFn: ((data: { username: string; password: string }) => Promise<void>) | null = null
      function LoginCaller() {
        const { login } = useAuth()
        loginFn = login
        return null
      }

      render(
        <Wrapper authService={authService} onLoginSuccess={onLoginSuccess}>
          <LoginCaller />
        </Wrapper>
      )

      await waitFor(() => {
        expect(loginFn).not.toBeNull()
      })

      await act(async () => {
        await loginFn!({ username: 'admin', password: 'pass' })
      })

      expect(onLoginSuccess).toHaveBeenCalledWith(user)
    })

    it('calls onError callback on login failure', async () => {
      const loginError = new Error('Invalid credentials')
      vi.mocked(authService.getStatus).mockResolvedValue({ authenticated: false })
      vi.mocked(authService.login).mockRejectedValue(loginError)

      const onError = vi.fn()
      let loginFn: ((data: { username: string; password: string }) => Promise<void>) | null = null
      function LoginCaller() {
        const { login } = useAuth()
        loginFn = login
        return null
      }

      render(
        <Wrapper authService={authService} onError={onError}>
          <LoginCaller />
        </Wrapper>
      )

      await waitFor(() => {
        expect(loginFn).not.toBeNull()
      })

      await act(async () => {
        try {
          await loginFn!({ username: 'bad', password: 'wrong' })
        } catch {
          // Expected to throw from mutateAsync
        }
      })

      expect(onError).toHaveBeenCalledWith(loginError)
    })
  })

  describe('logout', () => {
    it('clears user state and localStorage on logout', async () => {
      const user = makeUser()
      vi.mocked(authService.getStatus).mockResolvedValue({ authenticated: true, user })
      vi.mocked(authService.logout).mockResolvedValue(undefined)

      // Pre-populate localStorage to verify removal
      localStorage.setItem('auth_token', 'existing-token')
      localStorage.setItem('user', JSON.stringify(user))

      let logoutFn: (() => Promise<void>) | null = null
      function LogoutCaller() {
        const { logout, isAuthenticated } = useAuth()
        logoutFn = logout
        return <span data-testid="is-auth">{String(isAuthenticated)}</span>
      }

      render(
        <Wrapper authService={authService}>
          <LogoutCaller />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('is-auth').textContent).toBe('true')
      })

      await act(async () => {
        await logoutFn!()
      })

      expect(authService.logout).toHaveBeenCalled()
      expect(localStorage.getItem('auth_token')).toBeNull()
      expect(localStorage.getItem('user')).toBeNull()
    })

    it('calls onLogout callback', async () => {
      const user = makeUser()
      vi.mocked(authService.getStatus).mockResolvedValue({ authenticated: true, user })
      vi.mocked(authService.logout).mockResolvedValue(undefined)

      const onLogout = vi.fn()
      let logoutFn: (() => Promise<void>) | null = null
      function LogoutCaller() {
        const { logout } = useAuth()
        logoutFn = logout
        return null
      }

      render(
        <Wrapper authService={authService} onLogout={onLogout}>
          <LogoutCaller />
        </Wrapper>
      )

      await waitFor(() => {
        expect(logoutFn).not.toBeNull()
      })

      await act(async () => {
        await logoutFn!()
      })

      expect(onLogout).toHaveBeenCalled()
    })

    it('clears user and localStorage even when logout API call fails', async () => {
      const user = makeUser()
      vi.mocked(authService.getStatus).mockResolvedValue({ authenticated: true, user, permissions: ['read'] })
      vi.mocked(authService.logout).mockRejectedValue(new Error('Network error'))

      // Pre-populate localStorage
      localStorage.setItem('auth_token', 'tok-to-clear')
      localStorage.setItem('user', 'old-user')

      const onLogout = vi.fn()
      let logoutFn: (() => Promise<void>) | null = null
      function LogoutCaller() {
        const { logout, isAuthenticated } = useAuth()
        logoutFn = logout
        return <span data-testid="is-auth">{String(isAuthenticated)}</span>
      }

      render(
        <Wrapper authService={authService} onLogout={onLogout}>
          <LogoutCaller />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('is-auth').textContent).toBe('true')
      })

      await act(async () => {
        try {
          await logoutFn!()
        } catch {
          // Expected rejection from mutateAsync
        }
      })

      // onSettled runs even on error, so storage is still cleared
      expect(localStorage.getItem('auth_token')).toBeNull()
      expect(localStorage.getItem('user')).toBeNull()
      expect(onLogout).toHaveBeenCalled()
    })
  })

  describe('register', () => {
    it('calls authService.register', async () => {
      vi.mocked(authService.getStatus).mockResolvedValue({ authenticated: false })
      vi.mocked(authService.register).mockResolvedValue(makeUser({ username: 'newuser' }))

      let registerFn: ((data: { username: string; email: string; password: string; first_name: string; last_name: string }) => Promise<void>) | null = null
      function RegisterCaller() {
        const { register } = useAuth()
        registerFn = register
        return null
      }

      render(
        <Wrapper authService={authService}>
          <RegisterCaller />
        </Wrapper>
      )

      await waitFor(() => {
        expect(registerFn).not.toBeNull()
      })

      const regData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'pass123',
        first_name: 'New',
        last_name: 'User',
      }

      await act(async () => {
        await registerFn!(regData)
      })

      expect(authService.register).toHaveBeenCalledWith(regData)
    })

    it('calls onError callback on register failure', async () => {
      const regError = new Error('Username taken')
      vi.mocked(authService.getStatus).mockResolvedValue({ authenticated: false })
      vi.mocked(authService.register).mockRejectedValue(regError)

      const onError = vi.fn()
      let registerFn: ((data: { username: string; email: string; password: string; first_name: string; last_name: string }) => Promise<void>) | null = null
      function RegisterCaller() {
        const { register } = useAuth()
        registerFn = register
        return null
      }

      render(
        <Wrapper authService={authService} onError={onError}>
          <RegisterCaller />
        </Wrapper>
      )

      await waitFor(() => {
        expect(registerFn).not.toBeNull()
      })

      await act(async () => {
        try {
          await registerFn!({
            username: 'taken',
            email: 'taken@example.com',
            password: 'pass',
            first_name: 'A',
            last_name: 'B',
          })
        } catch {
          // Expected from mutateAsync
        }
      })

      expect(onError).toHaveBeenCalledWith(regError)
    })
  })

  describe('updateProfile', () => {
    it('calls authService.updateProfile and updates user state', async () => {
      const user = makeUser()
      const updatedUser = makeUser({ first_name: 'Updated' })
      vi.mocked(authService.getStatus).mockResolvedValue({ authenticated: true, user })
      vi.mocked(authService.updateProfile).mockResolvedValue(updatedUser)

      let updateFn: ((data: { first_name?: string }) => Promise<void>) | null = null
      function UpdateCaller() {
        const { updateProfile, user: currentUser } = useAuth()
        updateFn = updateProfile
        return <span data-testid="first-name">{currentUser?.first_name ?? 'none'}</span>
      }

      render(
        <Wrapper authService={authService}>
          <UpdateCaller />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('first-name').textContent).toBe('Admin')
      })

      await act(async () => {
        await updateFn!({ first_name: 'Updated' })
      })

      expect(authService.updateProfile).toHaveBeenCalledWith({ first_name: 'Updated' })
      expect(screen.getByTestId('first-name').textContent).toBe('Updated')
    })

    it('calls onError callback on updateProfile failure', async () => {
      const user = makeUser()
      const updateError = new Error('Update failed')
      vi.mocked(authService.getStatus).mockResolvedValue({ authenticated: true, user })
      vi.mocked(authService.updateProfile).mockRejectedValue(updateError)

      const onError = vi.fn()
      let updateFn: ((data: { first_name?: string }) => Promise<void>) | null = null
      function UpdateCaller() {
        const { updateProfile } = useAuth()
        updateFn = updateProfile
        return null
      }

      render(
        <Wrapper authService={authService} onError={onError}>
          <UpdateCaller />
        </Wrapper>
      )

      await waitFor(() => {
        expect(updateFn).not.toBeNull()
      })

      await act(async () => {
        try {
          await updateFn!({ first_name: 'Fail' })
        } catch {
          // Expected from mutateAsync
        }
      })

      expect(onError).toHaveBeenCalledWith(updateError)
    })
  })

  describe('changePassword', () => {
    it('calls authService.changePassword', async () => {
      const user = makeUser()
      vi.mocked(authService.getStatus).mockResolvedValue({ authenticated: true, user })
      vi.mocked(authService.changePassword).mockResolvedValue(undefined)

      let changePwFn: ((data: { current_password: string; new_password: string }) => Promise<void>) | null = null
      function ChangePasswordCaller() {
        const { changePassword } = useAuth()
        changePwFn = changePassword
        return null
      }

      render(
        <Wrapper authService={authService}>
          <ChangePasswordCaller />
        </Wrapper>
      )

      await waitFor(() => {
        expect(changePwFn).not.toBeNull()
      })

      const changeData = { current_password: 'old123', new_password: 'new456' }
      await act(async () => {
        await changePwFn!(changeData)
      })

      expect(authService.changePassword).toHaveBeenCalledWith(changeData)
    })

    it('calls onError callback on changePassword failure', async () => {
      const user = makeUser()
      const cpError = new Error('Wrong current password')
      vi.mocked(authService.getStatus).mockResolvedValue({ authenticated: true, user })
      vi.mocked(authService.changePassword).mockRejectedValue(cpError)

      const onError = vi.fn()
      let changePwFn: ((data: { current_password: string; new_password: string }) => Promise<void>) | null = null
      function ChangePasswordCaller() {
        const { changePassword } = useAuth()
        changePwFn = changePassword
        return null
      }

      render(
        <Wrapper authService={authService} onError={onError}>
          <ChangePasswordCaller />
        </Wrapper>
      )

      await waitFor(() => {
        expect(changePwFn).not.toBeNull()
      })

      await act(async () => {
        try {
          await changePwFn!({ current_password: 'wrong', new_password: 'new' })
        } catch {
          // Expected
        }
      })

      expect(onError).toHaveBeenCalledWith(cpError)
    })
  })

  describe('permissions for non-admin users', () => {
    it('hasPermission returns true for granted permission', async () => {
      const user = makeUser({ role_id: 2, role: { id: 2, name: 'Viewer', description: 'Viewer', permissions: ['read'], is_system: false, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' } })
      const status: AuthStatus = { authenticated: true, user, permissions: ['read:media', 'write:media'] }
      vi.mocked(authService.getStatus).mockResolvedValue(status)

      let permResult: boolean | null = null
      function PermChecker() {
        const { hasPermission } = useAuth()
        permResult = hasPermission('read:media')
        return null
      }

      render(
        <Wrapper authService={authService}>
          <PermChecker />
        </Wrapper>
      )

      await waitFor(() => {
        expect(permResult).toBe(true)
      })
    })

    it('hasPermission returns false for missing permission on non-admin', async () => {
      const user = makeUser({ role_id: 2, role: { id: 2, name: 'Viewer', description: 'Viewer', permissions: ['read'], is_system: false, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' } })
      const status: AuthStatus = { authenticated: true, user, permissions: ['read:media'] }
      vi.mocked(authService.getStatus).mockResolvedValue(status)

      let permResult: boolean | null = null
      function PermChecker() {
        const { hasPermission } = useAuth()
        permResult = hasPermission('delete:media')
        return null
      }

      render(
        <Wrapper authService={authService}>
          <PermChecker />
        </Wrapper>
      )

      await waitFor(() => {
        expect(permResult).toBe(false)
      })
    })

    it('canAccess returns true for non-admin with action:resource permission', async () => {
      const user = makeUser({ role_id: 2, role: { id: 2, name: 'Editor', description: 'Editor', permissions: [], is_system: false, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' } })
      const status: AuthStatus = { authenticated: true, user, permissions: ['edit:collections'] }
      vi.mocked(authService.getStatus).mockResolvedValue(status)

      let accessResult: boolean | null = null
      function AccessChecker() {
        const { canAccess } = useAuth()
        accessResult = canAccess('collections', 'edit')
        return null
      }

      render(
        <Wrapper authService={authService}>
          <AccessChecker />
        </Wrapper>
      )

      await waitFor(() => {
        expect(accessResult).toBe(true)
      })
    })

    it('canAccess returns false for non-admin without matching permission', async () => {
      const user = makeUser({ role_id: 2, role: { id: 2, name: 'Viewer', description: 'Viewer', permissions: [], is_system: false, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' } })
      const status: AuthStatus = { authenticated: true, user, permissions: ['read:media'] }
      vi.mocked(authService.getStatus).mockResolvedValue(status)

      let accessResult: boolean | null = null
      function AccessChecker() {
        const { canAccess } = useAuth()
        accessResult = canAccess('collections', 'delete')
        return null
      }

      render(
        <Wrapper authService={authService}>
          <AccessChecker />
        </Wrapper>
      )

      await waitFor(() => {
        expect(accessResult).toBe(false)
      })
    })

    it('canAccess returns true for non-admin with admin:system permission', async () => {
      const user = makeUser({ role_id: 2, role: { id: 2, name: 'SuperViewer', description: 'Super', permissions: [], is_system: false, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' } })
      const status: AuthStatus = { authenticated: true, user, permissions: ['admin:system'] }
      vi.mocked(authService.getStatus).mockResolvedValue(status)

      let accessResult: boolean | null = null
      function AccessChecker() {
        const { canAccess } = useAuth()
        accessResult = canAccess('anything', 'any_action')
        return null
      }

      render(
        <Wrapper authService={authService}>
          <AccessChecker />
        </Wrapper>
      )

      await waitFor(() => {
        expect(accessResult).toBe(true)
      })
    })
  })

  describe('isAdmin detection', () => {
    it('isAdmin is true when role_id is 1 even without role object', async () => {
      const user = makeUser({ role_id: 1, role: null })
      const status: AuthStatus = { authenticated: true, user }
      vi.mocked(authService.getStatus).mockResolvedValue(status)

      render(
        <Wrapper authService={authService}>
          <AuthConsumer />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('admin').textContent).toBe('true')
      })
    })

    it('isAdmin is false for non-admin role', async () => {
      const user = makeUser({ role_id: 2, role: { id: 2, name: 'Viewer', description: 'Viewer', permissions: [], is_system: false, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' } })
      const status: AuthStatus = { authenticated: true, user }
      vi.mocked(authService.getStatus).mockResolvedValue(status)

      render(
        <Wrapper authService={authService}>
          <AuthConsumer />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('admin').textContent).toBe('false')
      })
    })
  })

  describe('auth status edge cases', () => {
    it('sets empty permissions when status has no permissions field', async () => {
      const user = makeUser()
      const status: AuthStatus = { authenticated: true, user }
      vi.mocked(authService.getStatus).mockResolvedValue(status)

      render(
        <Wrapper authService={authService}>
          <AuthConsumer />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('perms').textContent).toBe('')
      })
    })

    it('sets user to null when status is authenticated false', async () => {
      const status: AuthStatus = { authenticated: false }
      vi.mocked(authService.getStatus).mockResolvedValue(status)

      render(
        <Wrapper authService={authService}>
          <AuthConsumer />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('none')
        expect(screen.getByTestId('auth').textContent).toBe('false')
      })
    })

    it('isLoading is true while auth status query is in flight', async () => {
      let resolveStatus: ((value: AuthStatus) => void) | null = null
      vi.mocked(authService.getStatus).mockImplementation(
        () => new Promise<AuthStatus>((resolve) => { resolveStatus = resolve })
      )

      function LoadingChecker() {
        const { isLoading } = useAuth()
        return <span data-testid="loading">{String(isLoading)}</span>
      }

      render(
        <Wrapper authService={authService}>
          <LoadingChecker />
        </Wrapper>
      )

      // While the query is pending, isLoading should be true
      expect(screen.getByTestId('loading').textContent).toBe('true')

      // Resolve the status query
      await act(async () => {
        resolveStatus!({ authenticated: false })
      })

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false')
      })
    })
  })
})
