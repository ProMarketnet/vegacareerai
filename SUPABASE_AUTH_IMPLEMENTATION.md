# 🚀 Supabase Authentication Implementation for VegaCareer AI

## Why Supabase is Perfect for Your App

### ✅ **Key Benefits:**
- **PostgreSQL Native** - Matches your existing Prisma setup
- **Built-in Auth** - Gmail, LinkedIn, and 20+ providers
- **Real-time Features** - Live credit updates
- **Row Level Security** - Automatic data protection
- **Generous Free Tier** - 50,000 monthly active users
- **Open Source** - No vendor lock-in

## 📋 Implementation Plan

### Phase 1: Setup Supabase Project

```bash
# 1. Install Supabase
npm install @supabase/supabase-js

# 2. Install auth helpers for React
npm install @supabase/auth-helpers-react
```

### Phase 2: Environment Configuration

```env
# Add to .env.local
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### Phase 3: Supabase Client Setup

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Phase 4: Auth Context (Replace Current)

```typescript
// src/contexts/SupabaseAuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithLinkedIn: () => Promise<void>
  signOut: () => Promise<void>
  credits: number
  updateCredits: (newCredits: number) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [credits, setCredits] = useState(0)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserCredits(session.user.id)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchUserCredits(session.user.id)
        } else {
          setCredits(0)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserCredits = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('credits_remaining')
        .eq('id', userId)
        .single()
      
      if (error) throw error
      setCredits(data?.credits_remaining || 0)
    } catch (error) {
      console.error('Error fetching credits:', error)
    }
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) throw error
  }

  const signInWithLinkedIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const updateCredits = (newCredits: number) => {
    setCredits(newCredits)
  }

  const value = {
    user,
    session,
    loading,
    signInWithGoogle,
    signInWithLinkedIn,
    signOut,
    credits,
    updateCredits
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
```

### Phase 5: Database Schema Migration

```sql
-- Run in Supabase SQL Editor
-- This extends your existing schema for Supabase auth

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id::uuid);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id::uuid);

CREATE POLICY "Users can view own transactions" ON credit_transactions
  FOR SELECT USING (auth.uid() = user_id::uuid);

CREATE POLICY "Users can view own query logs" ON query_logs
  FOR SELECT USING (auth.uid() = user_id::uuid);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, name, credits_remaining)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    10 -- Free credits for new users
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### Phase 6: Auth Callback Page

```typescript
// src/pages/AuthCallback.tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Auth callback error:', error)
        navigate('/login?error=auth_failed')
        return
      }

      if (data.session) {
        navigate('/')
      } else {
        navigate('/login')
      }
    }

    handleAuthCallback()
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-xl text-gray-600">Completing sign in...</p>
      </div>
    </div>
  )
}
```

### Phase 7: Login Component

```typescript
// src/components/LoginModal.tsx
import React from 'react'
import { useAuth } from '../contexts/SupabaseAuthContext'
import { FaGoogle, FaLinkedin } from 'react-icons/fa'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { signInWithGoogle, signInWithLinkedIn } = useAuth()

  if (!isOpen) return null

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('Google sign in error:', error)
    }
  }

  const handleLinkedInSignIn = async () => {
    try {
      await signInWithLinkedIn()
    } catch (error) {
      console.error('LinkedIn sign in error:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Sign in to VegaCareer AI
          </h2>
          <p className="text-gray-600">
            Get personalized career insights powered by AI
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <FaGoogle className="w-5 h-5 mr-3 text-red-500" />
            Continue with Google
          </button>

          <button
            onClick={handleLinkedInSignIn}
            className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <FaLinkedin className="w-5 h-5 mr-3 text-blue-600" />
            Continue with LinkedIn
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Continue as guest
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Phase 8: Update Backend Integration

```javascript
// api/supabase-middleware.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const authenticateUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    req.user = user
    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(500).json({ error: 'Authentication failed' })
  }
}

// Update credit balance
export const updateUserCredits = async (userId, newBalance) => {
  const { error } = await supabase
    .from('users')
    .update({ credits_remaining: newBalance })
    .eq('id', userId)
  
  if (error) throw error
}
```

## 🔧 **Quick Setup Steps:**

### 1. **Create Supabase Project**
```bash
# Go to https://supabase.com
# Create new project
# Copy URL and anon key
```

### 2. **Configure OAuth Providers**
```bash
# In Supabase Dashboard:
# Authentication → Providers
# Enable Google OAuth
# Enable LinkedIn OAuth
# Add your OAuth credentials
```

### 3. **Set Redirect URLs**
```bash
# In OAuth provider settings:
# Google: https://your-project.supabase.co/auth/v1/callback
# LinkedIn: https://your-project.supabase.co/auth/v1/callback
```

### 4. **Install Dependencies**
```bash
npm install @supabase/supabase-js @supabase/auth-helpers-react react-icons
```

## 🎯 **Migration from Current Auth**

### Replace Current Files:
1. `src/contexts/AuthContext.tsx` → `src/contexts/SupabaseAuthContext.tsx`
2. Update `src/App.tsx` to use new auth provider
3. Add login modal component
4. Update backend to use Supabase auth middleware

### Benefits You'll Get:
- ✅ **Real Gmail/LinkedIn OAuth** (not mock)
- ✅ **Automatic user management**
- ✅ **Real-time credit updates**
- ✅ **Secure database access**
- ✅ **Production-ready authentication**

## 🚀 **Ready to Implement?**

This setup will give you:
1. **Professional OAuth** with Google and LinkedIn
2. **Seamless integration** with your existing credit system
3. **Real-time features** for live updates
4. **Production-grade security** with RLS
5. **Easy scaling** as your user base grows

Would you like me to start implementing this step by step? 