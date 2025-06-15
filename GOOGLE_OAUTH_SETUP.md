# Google OAuth Setup for Supabase

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API (or Google Identity API)

## Step 2: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. If prompted, configure the OAuth consent screen first:
   - Choose **External** user type
   - Fill in required fields:
     - App name: "VegaCareer AI"
     - User support email: your email
     - Developer contact information: your email
   - Add scopes: `email`, `profile`, `openid`
   - Add test users if needed

4. Create OAuth client ID:
   - Application type: **Web application**
   - Name: "VegaCareer AI Web Client"
   - Authorized redirect URIs: 
     ```
     https://bidujojvzgsdgxrqekfu.supabase.co/auth/v1/callback
     ```

## Step 3: Get Your Credentials

After creating the OAuth client, you'll get:
- **Client ID**: `123456789-abcdefghijklmnop.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-your-client-secret`

## Step 4: Configure Supabase

In your Supabase dashboard:
1. Go to **Authentication** → **Providers** → **Google**
2. Enable Google provider
3. Enter your **Client ID** and **Client Secret**
4. The redirect URL should be: `https://bidujojvzgsdgxrqekfu.supabase.co/auth/v1/callback`

## Step 5: Update Environment Variables

Create a `.env.local` file with:
```env
NEXT_PUBLIC_SUPABASE_URL="https://bidujojvzgsdgxrqekfu.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
```

## Important Notes

- The redirect URI in Google Cloud Console must exactly match the one in Supabase
- Your Supabase project URL is: `https://bidujojvzgsdgxrqekfu.supabase.co`
- The callback URL is always: `https://YOUR_SUPABASE_URL/auth/v1/callback` 