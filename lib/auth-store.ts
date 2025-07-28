import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { getCurrentUser, signOut as amplifySignOut, type AuthUser, fetchAuthSession } from 'aws-amplify/auth'
import { generateClient } from 'aws-amplify/data'
import { type Schema } from '@/amplify/data/resource'

const client = generateClient<Schema>()

type UserRole = 'ADMIN' | 'USER' | null

interface UserProfile {
  id?: string
  userId: string
  name: string
  email: string
  phone?: string
  role: UserRole
  createdAt?: string
  updatedAt?: string
}

interface UserState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  userRole: UserRole
  userGroups: string[]
  userProfile: UserProfile | null
  
  setUser: (user: AuthUser | null) => void
  setUserRole: (role: UserRole) => void
  setUserGroups: (groups: string[]) => void
  setUserProfile: (profile: UserProfile | null) => void
  setLoading: (isLoading: boolean) => void
  checkAuthState: () => Promise<void>
  fetchAndSetUserProfile: () => Promise<UserProfile | null | undefined>
  signOut: () => Promise<void>
  clearUser: () => void
  fetchUserRoleFromToken: () => Promise<void>
}

export const useAuthStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      userRole: null,
      userGroups: [],
      userProfile: null,

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

      setUserProfile: (profile) => {
        set({ userProfile: profile })
      },

      setLoading: (isLoading) => {
        set({ isLoading })
      },

      fetchUserRoleFromToken: async () => {
        try {
          const session = await fetchAuthSession()
          const accessToken = session.tokens?.accessToken
          
          if (accessToken) {
            const payload = accessToken.payload
            const groups = payload['cognito:groups'] as string[] || []
            
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
          
          await get().fetchUserRoleFromToken()
          await get().fetchAndSetUserProfile()
        } catch {
          set({ 
            user: null, 
            isAuthenticated: false,
            isLoading: false,
            userRole: null,
            userGroups: [],
            userProfile: null
          })
        }
      },

      fetchAndSetUserProfile: async () => {
        try {
          const { user } = get()
          if (!user?.userId) {
            console.log('No user found, cannot fetch profile')
            return
          }

          console.log('Fetching user profile for:', user.userId)

          const { data: profiles } = await client.models.UserProfile.list({
            filter: { userId: { eq: user.userId } }
          })

          if (profiles && profiles.length > 0) {
            const profile = profiles[0]
            const userProfile: UserProfile = {
              id: profile.id,
              userId: profile.userId,
              name: profile.name || '',
              email: profile.email || '',
              phone: profile.phone || '',
              role: (profile.role as UserRole) || 'USER',
              createdAt: profile.createdAt || '',
              updatedAt: profile.updatedAt || ''
            }
            set({ userProfile })
            console.log('User profile loaded into store:', userProfile)
            return userProfile
          } else {
            const { data: newProfile, errors } = await client.models.UserProfile.create({
              userId: user.userId,
              email: user?.signInDetails?.loginId || '',
              name: user?.signInDetails?.loginId?.split('@')[0] || 'User',
              role: 'USER'
            })

            if (errors) {
              console.error('Error creating user profile:', errors)
              return null
            } else if (newProfile) {
              const userProfile: UserProfile = {
                id: newProfile.id,
                userId: newProfile.userId,
                name: newProfile.name || '',
                email: newProfile.email || '',
                phone: newProfile.phone || '',
                role: (newProfile.role as UserRole) || 'USER',
                createdAt: newProfile.createdAt || '',
                updatedAt: newProfile.updatedAt || ''
              }
              
              set({ userProfile })
              console.log('New user profile created and stored:', userProfile)
              return userProfile
            }
          }
        } catch (error) {
          console.error('Error fetching user profile:', error)
          return null
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
            userGroups: [],
            userProfile: null
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
          userGroups: [],
          userProfile: null
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
        userProfile: state.userProfile,
      }),
    }
  )
)
