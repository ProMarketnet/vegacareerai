import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase, signInWithGoogle, signInWithLinkedIn, signOut, getUserProfile } from '../lib/supabase.js'

interface User {
  id: string
  email: string
  name: string
  credits: number
  avatar_url?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  signInWithGoogle: () => Promise<void>
  signInWithLinkedIn: () => Promise<void>
  signOut: () => Promise<void>
  updateCredits: (credits: number) => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within a SupabaseAuthProvider')
  }
  return context
}

export const SupabaseAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !authUser) {
        setUser(null)
        return
      }

      // Get user profile with credits
      const { data: profile, error: profileError } = await getUserProfile(authUser.id)
      
      if (profileError) {
        console.error('Error fetching user profile:', profileError)
        // Create basic user object from auth data
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.name || authUser.email || '',
          credits: 150, // Default credits
          avatar_url: authUser.user_metadata?.avatar_url
        })
        return
      }

      setUser({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        credits: profile.credits,
        avatar_url: authUser.user_metadata?.avatar_url
      })
    } catch (error) {
      console.error('Error refreshing user:', error)
      setUser(null)
    }
  }

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      setIsLoading(true)
      await refreshUser()
      setIsLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await refreshUser()
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      }
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignInWithGoogle = async () => {
    try {
      setIsLoading(true)
      const { error } = await signInWithGoogle()
      if (error) {
        console.error('Google sign-in error:', error)
        throw error
      }
    } catch (error) {
      console.error('Sign in failed:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignInWithLinkedIn = async () => {
    try {
      setIsLoading(true)
      const { error } = await signInWithLinkedIn()
      if (error) {
        console.error('LinkedIn sign-in error:', error)
        throw error
      }
    } catch (error) {
      console.error('Sign in failed:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      setIsLoading(true)
      const { error } = await signOut()
      if (error) {
        console.error('Sign out error:', error)
        throw error
      }
      setUser(null)
    } catch (error) {
      console.error('Sign out failed:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const updateCredits = (credits: number) => {
    if (user) {
      setUser({ ...user, credits })
    }
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signInWithGoogle: handleSignInWithGoogle,
    signInWithLinkedIn: handleSignInWithLinkedIn,
    signOut: handleSignOut,
    updateCredits,
    refreshUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 