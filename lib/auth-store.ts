import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { getCurrentUser, signOut as amplifySignOut, type AuthUser } from 'aws-amplify/auth'

type UserRole = 'ADMIN' | 'USER' | null

interface UserState {
  // State
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  userRole: UserRole
  userGroups: string[]
  
  // Actions
  setUser: (user: AuthUser | null) => void
  setUserRole: (role: UserRole) => void
  setUserGroups: (groups: string[]) => void
  setLoading: (isLoading: boolean) => void
  checkAuthState: () => Promise<void>
  signOut: () => Promise<void>
  clearUser: () => void
  fetchUserRoleFromToken: () => Promise<void>
}

export const useAuthStore = create<UserState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: true,
      userRole: null,
      userGroups: [],

      // Actions
      setUser: (user) => {
        set({ 
          user, 
          isAuthenticated: !!user,
          isLoading: false 
        })
      },

      setUserRole: (role) => {
        set({ userRole: role })
      },

      setUserGroups: (groups) => {
        set({ userGroups: groups })
      },

      setLoading: (isLoading) => {
        set({ isLoading })
      },

      fetchUserRoleFromToken: async () => {
        try {
          const { fetchAuthSession } = await import('aws-amplify/auth')
          const session = await fetchAuthSession()
          const accessToken = session.tokens?.accessToken
          
          if (accessToken) {
            const payload = accessToken.payload
            const groups = payload['cognito:groups'] as string[] || []
            
            // Determine user role based on groups
            let role: UserRole = null
            if (groups.includes('ADMIN')) {
              role = 'ADMIN'
            } else if (groups.includes('USER')) {
              role = 'USER'
            }
            
            set({ 
              userRole: role,
              userGroups: groups 
            })
          }
        } catch (error) {
          console.error('Error fetching user role from token:', error)
          set({ 
            userRole: null,
            userGroups: [] 
          })
        }
      },

      checkAuthState: async () => {
        try {
          set({ isLoading: true })
          const currentUser = await getCurrentUser()
          set({ 
            user: currentUser, 
            isAuthenticated: true,
            isLoading: false 
          })
          
          // Fetch user role after setting user
          await get().fetchUserRoleFromToken()
        } catch {
          console.log('No authenticated user found')
          set({ 
            user: null, 
            isAuthenticated: false,
            isLoading: false,
            userRole: null,
            userGroups: []
          })
        }
      },

      signOut: async () => {
        try {
          await amplifySignOut()
          set({ 
            user: null, 
            isAuthenticated: false,
            isLoading: false,
            userRole: null,
            userGroups: []
          })
        } catch (error) {
          console.error('Error signing out:', error)
        }
      },

      clearUser: () => {
        set({ 
          user: null, 
          isAuthenticated: false,
          isLoading: false,
          userRole: null,
          userGroups: []
        })
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        userRole: state.userRole,
        userGroups: state.userGroups,
      }),
    }
  )
)
