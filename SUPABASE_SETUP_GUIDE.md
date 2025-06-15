# 🚀 Supabase Authentication Setup for VegaCareer AI

## Why Supabase is Perfect for Your App

✅ **PostgreSQL Native** - Perfect match for your existing setup  
✅ **Built-in OAuth** - Gmail, LinkedIn, and 20+ providers  
✅ **Real-time Features** - Live credit updates  
✅ **Generous Free Tier** - 50,000 monthly active users  
✅ **No Server Required** - Perfect for Vite React apps  

## 📋 Step-by-Step Setup

### 1. Install Supabase Dependencies

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-react
```

### 2. Supabase Project Configuration

From your screenshot, I can see you're setting up Google OAuth. Complete these steps:

#### A. Google OAuth Setup (You're doing this now!)
- ✅ **Client ID**: Add your Google OAuth Client ID
- ✅ **Client Secret**: Add your Google OAuth Client Secret  
- ✅ **Redirect URL**: `https://bidujojvzgsdgxrqekfu.supabase.co/auth/v1/callback`

#### B. LinkedIn OAuth Setup (Next)
1. Go to **Authentication > Providers > LinkedIn**
2. Enable LinkedIn provider
3. Add your LinkedIn Client ID and Secret
4. Use same redirect URL pattern

### 3. Environment Variables

Add to your `.env.local`:

```env
# Supabase Configuration
VITE_SUPABASE_URL="https://bidujojvzgsdgxrqekfu.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key-here"

# Keep existing Stripe variables
VITE_STRIPE_PUBLISHABLE_KEY="pk_live_51RYsvrJ1V7TuZJ0z4tL4lVz0zVrZPnTi3OFEF0aYWxjtUPKiKoYWt8sP02qzZFVAzt1XrBjNj2i6V9xuCtynpg86005tXMh1zV"
VITE_API_URL="http://localhost:3001"
```

### 4. Database Schema

Your Supabase database needs a `users` table with credits:

```sql
-- Create users table with credit system
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  credits INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see/edit their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, name, credits)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    150  -- Starting credits
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user record on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

## 🔧 Implementation Files

I'll create the implementation files for you next. The key components will be:

1. **Supabase Client** - Connection and configuration
2. **Auth Context** - React authentication state management  
3. **Auth Components** - Login/logout UI components
4. **Protected Routes** - Secure your credit system
5. **Credit Integration** - Connect with your existing Stripe system

## 🎯 Next Steps

1. **Complete Google OAuth setup** (you're doing this now)
2. **Get your Supabase keys** from Project Settings > API
3. **Set up LinkedIn OAuth** 
4. **Run the database schema** in SQL Editor
5. **Install dependencies and update code**

Ready to proceed with the implementation? 