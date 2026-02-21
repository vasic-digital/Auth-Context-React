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

export interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  permissions: string[]
  isAdmin: boolean
  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (data: UpdateProfileRequest) => Promise<void>
  changePassword: (data: ChangePasswordRequest) => Promise<void>
  hasPermission: (permission: string) => boolean
  canAccess: (resource: string, action: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

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
