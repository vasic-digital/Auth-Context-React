import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { User, LoginRequest, RegisterRequest, ChangePasswordRequest, UpdateProfileRequest } from '@vasic-digital/media-types'
import type { AuthService } from '@vasic-digital/catalogizer-api-client'

/**
 * Shape of the authentication context value provided by AuthProvider
 * and consumed via the useAuth hook.
 */
export interface AuthContextType {
  /** The currently authenticated user, or null if logged out. */
  user: User | null
  /** Whether a user is currently logged in. */
  isAuthenticated: boolean
  /** True while the initial auth status check is in flight. */
  isLoading: boolean
  /** Permission strings granted to the current user. */
  permissions: string[]
  /** Whether the current user has the Admin role. */
  isAdmin: boolean
  /** Logs in with the given credentials. */
  login: (data: LoginRequest) => Promise<void>
  /** Registers a new user account. */
  register: (data: RegisterRequest) => Promise<void>
  /** Logs out and clears stored tokens. */
  logout: () => Promise<void>
  /** Updates the current user's profile fields. */
  updateProfile: (data: UpdateProfileRequest) => Promise<void>
  /** Changes the current user's password. */
  changePassword: (data: ChangePasswordRequest) => Promise<void>
  /** Checks whether the current user has a specific permission. */
  hasPermission: (permission: string) => boolean
  /** Checks whether the current user can perform an action on a resource. */
  canAccess: (resource: string, action: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Hook that returns the current authentication context. Must be called
 * within an AuthProvider tree; throws if no provider is found.
 *
 * @returns The AuthContextType with user state, auth actions, and permission helpers.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export interface AuthProviderProps {
  /** The AuthService instance from @vasic-digital/catalogizer-api-client */
  authService: AuthService
  children: ReactNode
  /** Optional callback fired on successful login */
  onLoginSuccess?: (user: User) => void
  /** Optional callback fired on logout */
  onLogout?: () => void
  /** Optional callback fired on auth errors */
  onError?: (error: Error) => void
}

/**
 * Context provider that manages authentication state via React Query mutations
 * and queries. Wraps the component tree with user session data, login/logout
 * actions, and permission checking utilities.
 *
 * @param props - AuthProviderProps
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({
  authService,
  children,
  onLoginSuccess,
  onLogout,
  onError,
}) => {
  const [user, setUser] = useState<User | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])
  const queryClient = useQueryClient()

  const { data: authStatus, isLoading } = useQuery({
    queryKey: ['auth-status'],
    queryFn: () => authService.getStatus(),
    retry: (failureCount, error: unknown) => {
      if ((error as { status?: number })?.status === 401) return false
      return failureCount < 2
    },
    staleTime: 1000 * 60 * 5,
  })

  useEffect(() => {
    if (authStatus?.authenticated && authStatus.user) {
      setUser(authStatus.user)
      setPermissions(authStatus.permissions ?? [])
    } else {
      setUser(null)
      setPermissions([])
    }
  }, [authStatus])

  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => authService.login(data),
    onSuccess: (data) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', data.session_token)
        localStorage.setItem('user', JSON.stringify(data.user))
      }
      setUser(data.user)
      queryClient.invalidateQueries({ queryKey: ['auth-status'] })
      onLoginSuccess?.(data.user)
    },
    onError: (error: Error) => {
      onError?.(error)
    },
  })

  const registerMutation = useMutation({
    mutationFn: (data: RegisterRequest) => authService.register(data),
    onError: (error: Error) => {
      onError?.(error)
    },
  })

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user')
      }
      setUser(null)
      setPermissions([])
      queryClient.clear()
      onLogout?.()
    },
  })

  const updateProfileMutation = useMutation({
    mutationFn: (data: UpdateProfileRequest) => authService.updateProfile(data),
    onSuccess: (updatedUser) => {
      setUser(updatedUser)
      queryClient.invalidateQueries({ queryKey: ['auth-status'] })
    },
    onError: (error: Error) => {
      onError?.(error)
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: (data: ChangePasswordRequest) => authService.changePassword(data),
    onError: (error: Error) => {
      onError?.(error)
    },
  })

  const isUserAdmin = user?.role?.name === 'Admin' || user?.role_id === 1

  const hasPermission = (permission: string): boolean => {
    if (isUserAdmin) return true
    return permissions.includes(permission)
  }

  const canAccess = (resource: string, action: string): boolean => {
    const permission = `${action}:${resource}`
    return hasPermission(permission) || hasPermission('admin:system')
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    permissions,
    isAdmin: isUserAdmin,
    login: async (data) => { await loginMutation.mutateAsync(data) },
    register: async (data) => { await registerMutation.mutateAsync(data) },
    logout: async () => { await logoutMutation.mutateAsync() },
    updateProfile: async (data) => { await updateProfileMutation.mutateAsync(data) },
    changePassword: async (data) => { await changePasswordMutation.mutateAsync(data) },
    hasPermission,
    canAccess,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext
