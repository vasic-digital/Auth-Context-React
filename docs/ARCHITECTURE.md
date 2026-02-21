# Architecture — @vasic-digital/auth-context

## Overview

React context provider and hook that wraps `@vasic-digital/catalogizer-api-client`'s `AuthService` with `@tanstack/react-query` for server state management. Designed to be injected at the app root.

## Design Patterns

- **Facade**: `AuthProvider` hides query/mutation complexity behind simple async functions
- **Observer**: Callbacks (`onLoginSuccess`, `onLogout`, `onError`) follow the observer pattern — no toast library coupling
- **Dependency Injection**: `authService` is passed as a prop, making testing trivial
- **Strategy**: `hasPermission` and `canAccess` implement permission-checking strategies

## Design Principles

- **No side effects in consumer**: All localStorage operations are inside `AuthProvider`
- **Testable**: Pass a mocked `AuthService` to test any component that uses `useAuth`
- **Decoupled**: No dependency on `react-hot-toast` or any notification library
