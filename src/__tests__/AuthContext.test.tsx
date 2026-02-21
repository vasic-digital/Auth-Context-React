import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '../AuthContext'
import type { AuthService } from '@vasic-digital/catalogizer-api-client'
import type { User, AuthStatus } from '@vasic-digital/media-types'
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

function Wrapper({ authService, children }: { authService: AuthService; children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={client}>
      <AuthProvider authService={authService}>{children}</AuthProvider>
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
})
