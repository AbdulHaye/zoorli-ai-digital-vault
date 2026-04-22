interface User {
  id: string
  email: string
  username?: string
  firstName?: string
  lastName?: string
  role?: string
  profilePictureUrl?: string | null
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
  isEmailVerified?: boolean
  emailVerificationToken?: string | null
  emailVerificationExpires?: string | null
  createdAt?: string
  updatedAt?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

type AuthListener = (authState: AuthState) => void

class AuthManager {
  private static instance: AuthManager
  private authState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: false
  }
  private listeners: AuthListener[] = []
  private initialized = false

  private constructor() {
    this.initialize()
  }

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager()
    }
    return AuthManager.instance
  }

  private initialize() {
    if (this.initialized) return
    this.initialized = true
    
    console.log('AuthManager initializing...')
    
    // Check for existing auth token
    const token = localStorage.getItem('auth_token')
    console.log('Found token in localStorage:', token ? `${token.substring(0, 20)}...` : null)
    
    if (token) {
      console.log('Validating existing token...')
      this.validateToken(token)
    } else {
      console.log('No token found, staying unauthenticated')
    }
  }

  private async validateToken(token: string) {
    console.log('validateToken called with token:', token ? `${token.substring(0, 20)}...` : null)
    this.setState({ isLoading: true })
    
    try {
      console.log('Making validate request to /api/auth/validate')
      const response = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      console.log('Validate response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('Validate response data:', result)
        this.setState({
          user: result.data.user,
          isAuthenticated: true,
          isLoading: false
        })
        console.log('Token validation successful, user authenticated')
      } else {
        console.log('Token validation failed, removing token')
        // Invalid token, remove it
        localStorage.removeItem('auth_token')
        this.setState({
          user: null,
          isAuthenticated: false,
          isLoading: false
        })
      }
    } catch (error) {
      console.log('Token validation error:', error)
      localStorage.removeItem('auth_token')
      this.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false
      })
    }
  }

  private setState(newState: Partial<AuthState>) {
    this.authState = { ...this.authState, ...newState }
    this.notifyListeners()
  }

  getCurrentUser(): User | null {
    return this.authState.user
  }

  isAuthenticated(): boolean {
    return this.authState.isAuthenticated
  }

  isLoading(): boolean {
    return this.authState.isLoading
  }

  getState(): AuthState {
    return this.authState
  }

  getAuthHeaders(): Record<string, string> {
    // Check for both static and dynamic token keys
    let token = localStorage.getItem('auth_token')
    
    // If static key doesn't exist, look for dynamic key pattern
    if (!token) {
      const allKeys = Object.keys(localStorage)
      console.log('getAuthHeaders: all localStorage keys:', allKeys)
      const authTokenKey = allKeys.find(key => key.startsWith('auth-token-'))
      if (authTokenKey) {
        token = localStorage.getItem(authTokenKey)
        console.log('getAuthHeaders: found dynamic token key:', authTokenKey)
      }
    }
    
    console.log('getAuthHeaders: final token:', token ? `${token.substring(0, 20)}...` : null)
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  login(user: User, token?: string): void {
    console.log('AuthManager.login called with:', { user, tokenExists: !!token })
    if (token) {
      localStorage.setItem('auth_token', token)
      console.log('Token stored in localStorage:', localStorage.getItem('auth_token'))
    }
    
    this.setState({
      user,
      isAuthenticated: true,
      isLoading: false
    })
    console.log('Auth state after login:', this.authState)
  }

  logout(): void {
    const userId = this.authState.user?.id;
    
    // Remove auth token
    localStorage.removeItem('auth_token');
    
    // Clear user-specific chat history to prevent data leakage
    if (userId) {
      localStorage.removeItem(`zorli-ai-chat-history-${userId}`);
    }
    
    this.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false
    });
  }

  async refreshUser(): Promise<void> {
    const token = localStorage.getItem('auth_token')
    if (token) {
      await this.validateToken(token)
    }
  }

  subscribe(listener: AuthListener): () => void {
    this.listeners.push(listener)
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener({ ...this.authState }))
  }
}

export const auth = AuthManager.getInstance()
export type { User, AuthState, AuthListener }