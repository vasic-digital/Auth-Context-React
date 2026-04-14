import { describe, it, expect } from 'vitest'
import {
  AuthProvider,
  useAuth,
  AuthContext,
} from '../index'

describe('index exports', () => {
  it('exports AuthProvider component', () => {
    expect(AuthProvider).toBeDefined()
    expect(typeof AuthProvider).toBe('function')
  })

  it('exports useAuth hook', () => {
    expect(useAuth).toBeDefined()
    expect(typeof useAuth).toBe('function')
  })

  it('exports AuthContext', () => {
    expect(AuthContext).toBeDefined()
  })
})
