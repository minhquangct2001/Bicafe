import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { getCurrentUser, signOut as amplifySignOut, type AuthUser } from 'aws-amplify/auth'

interface UserState {
  // State
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Actions
  setUser: (user: AuthUser | null) => void
  setLoading: (isLoading: boolean) => void
  checkAuthState: () => Promise<void>
  signOut: () => Promise<void>
  clearUser: () => void
}

export const useAuthStore = create<UserState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: true,

      // Actions
      setUser: (user) => {
        set({ 
          user, 
          isAuthenticated: !!user,
          isLoading: false 
        })
      },

      setLoading: (isLoading) => {
        set({ isLoading })
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
        } catch {
          console.log('No authenticated user found')
          set({ 
            user: null, 
            isAuthenticated: false,
            isLoading: false 
          })
        }
      },

      signOut: async () => {
        try {
          await amplifySignOut()
          set({ 
            user: null, 
            isAuthenticated: false,
            isLoading: false 
          })
        } catch (error) {
          console.error('Error signing out:', error)
        }
      },

      clearUser: () => {
        set({ 
          user: null, 
          isAuthenticated: false,
          isLoading: false 
        })
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
