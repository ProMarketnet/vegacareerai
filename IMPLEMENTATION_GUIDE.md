# Vega Career AI - Implementation Guide

## 🚀 **Quick Start Implementation**

This guide will help you implement the complete LLM credit management system based on the technical documentation.

## **Phase 1: Database Setup (30 minutes)**

### 1.1 Database Creation
```bash
# Create PostgreSQL database
createdb vegacareerai

# Or using Supabase (recommended)
# 1. Go to https://supabase.com
# 2. Create new project
# 3. Copy connection string
```

### 1.2 Run Database Schema
```bash
# Execute schema creation
psql -d vegacareerai -f database/schema.sql

# Execute functions
psql -d vegacareerai -f database/functions.sql
```

### 1.3 Verify Database Setup
```sql
-- Check tables created
\dt

-- Verify functions
\df

-- Test sample data
SELECT * FROM credit_packages;
SELECT * FROM llm_provider_configs;
```

## **Phase 2: Environment Configuration (15 minutes)**

### 2.1 Copy Environment File
```bash
cp env.example .env.local
```

### 2.2 Configure Required Variables
```bash
# Database
DATABASE_URL="your-postgres-connection-string"

# LLM Providers (get at least one)
ANTHROPIC_API_KEY="sk-ant-api03-..."
PERPLEXITY_API_KEY="pplx-..."
OPENAI_API_KEY="sk-..."

# Stripe (for payments)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
```

## **Phase 3: API Implementation (45 minutes)**

### 3.1 Install Dependencies
```bash
npm install @prisma/client stripe @anthropic-ai/sdk
```

### 3.2 Set Up Prisma
```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push
```

### 3.3 Test LLM Gateway
```bash
# Test the API endpoint
curl -X POST http://localhost:3000/api/llm-gateway \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "claude",
    "model": "claude-3-sonnet",
    "messages": [{"role": "user", "content": "Hello"}],
    "user_id": "test-user-123"
  }'
```

## **Phase 4: Frontend Integration (30 minutes)**

### 4.1 Create Credit Balance Component
```typescript
// components/CreditBalance.tsx
import { useEffect, useState } from 'react';

export function CreditBalance({ userId }: { userId: string }) {
  const [balance, setBalance] = useState(null);
  
  useEffect(() => {
    fetch(`/api/credits/balance?user_id=${userId}`)
      .then(res => res.json())
      .then(setBalance);
  }, [userId]);
  
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="font-semibold">Credit Balance</h3>
      <p className="text-2xl font-bold">{balance?.balance || 0}</p>
      <p className="text-sm text-gray-600">
        {balance?.daily_free_credits_remaining || 0} free credits remaining today
      </p>
    </div>
  );
}
```

### 4.2 Create LLM Chat Component
```typescript
// components/LLMChat.tsx
import { useState } from 'react';

export function LLMChat({ userId }: { userId: string }) {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  
  const sendMessage = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/llm-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'claude',
          model: 'claude-3-sonnet',
          messages: [{ role: 'user', content: message }],
          user_id: userId
        })
      });
      
      const data = await res.json();
      setResponse(data.choices[0].message.content);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask me anything about your career..."
        className="w-full p-3 border rounded-lg"
        rows={3}
      />
      <button
        onClick={sendMessage}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded-lg disabled:opacity-50"
      >
        {loading ? 'Thinking...' : 'Send'}
      </button>
      {response && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <p>{response}</p>
        </div>
      )}
    </div>
  );
}
```

## **Phase 5: Payment Integration (60 minutes)**

### 5.1 Set Up Stripe Products
```bash
# Create products in Stripe Dashboard or via CLI
stripe products create --name "Starter Pack" --description "100 credits"
stripe prices create --product prod_xxx --unit-amount 1000 --currency usd
```

### 5.2 Create Payment API
```typescript
// api/credits/purchase.js
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { package_id, user_id } = req.body;
  
  try {
    // Get package details
    const package = await prisma.credit_packages.findUnique({
      where: { id: package_id }
    });
    
    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: package.price_usd * 100, // Convert to cents
      currency: 'usd',
      metadata: {
        user_id,
        package_id,
        credits: package.credits.toString()
      }
    });
    
    res.json({ client_secret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### 5.3 Handle Stripe Webhooks
```typescript
// api/webhooks/stripe.js
import { buffer } from 'micro';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  const sig = req.headers['stripe-signature'];
  const body = await buffer(req);
  
  try {
    const event = stripe.webhooks.constructEvent(
      body, 
      sig, 
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const { user_id, credits } = paymentIntent.metadata;
      
      // Add credits to user account
      await prisma.$queryRaw`
        SELECT add_credits(
          ${user_id}::uuid,
          ${parseFloat(credits)}::decimal,
          'Stripe payment',
          ${paymentIntent.id}
        )
      `;
    }
    
    res.json({ received: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export const config = { api: { bodyParser: false } };
```

## **Phase 6: Testing & Validation (30 minutes)**

### 6.1 Create Test User
```sql
-- Create test user
SELECT create_user_account(
  'test@example.com',
  NULL,
  'Test User',
  NULL
);

-- Add test credits
SELECT add_credits(
  (SELECT id FROM users WHERE email = 'test@example.com'),
  10.00,
  'Test credits'
);
```

### 6.2 Test Credit Consumption
```bash
# Test LLM request with credit consumption
curl -X POST http://localhost:3000/api/llm-gateway \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "claude",
    "model": "claude-3-sonnet",
    "messages": [{"role": "user", "content": "What is machine learning?"}],
    "user_id": "your-test-user-id"
  }'
```

### 6.3 Verify Database Updates
```sql
-- Check credit balance
SELECT get_user_credit_balance('your-test-user-id');

-- Check usage logs
SELECT * FROM llm_usage WHERE user_id = 'your-test-user-id';

-- Check transactions
SELECT * FROM credit_transactions WHERE user_id = 'your-test-user-id';
```

## **Phase 7: Production Deployment (45 minutes)**

### 7.1 Deploy Database
```bash
# For Supabase
# 1. Run schema.sql in Supabase SQL editor
# 2. Run functions.sql in Supabase SQL editor
# 3. Set up Row Level Security policies

# For Railway/Render
# 1. Create PostgreSQL service
# 2. Run migrations
# 3. Set up connection pooling
```

### 7.2 Deploy Application
```bash
# For Vercel
vercel --prod

# For Railway
railway up

# For Render
# Connect GitHub repo and deploy
```

### 7.3 Configure Production Environment
```bash
# Set production environment variables
vercel env add DATABASE_URL
vercel env add ANTHROPIC_API_KEY
vercel env add STRIPE_SECRET_KEY
# ... etc
```

### 7.4 Set Up Monitoring
```bash
# Add error tracking
npm install @sentry/nextjs

# Add analytics
npm install @vercel/analytics

# Set up uptime monitoring
# Use services like UptimeRobot or Pingdom
```

## **Phase 8: Advanced Features (Optional)**

### 8.1 Add LinkedIn OAuth
```typescript
// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth';
import LinkedInProvider from 'next-auth/providers/linkedin';

export default NextAuth({
  providers: [
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Create user account in database
      await prisma.$queryRaw`
        SELECT create_user_account(
          ${user.email},
          ${profile.id},
          ${user.name},
          ${user.image}
        )
      `;
      return true;
    }
  }
});
```

### 8.2 Add Usage Analytics Dashboard
```typescript
// components/AnalyticsDashboard.tsx
import { useEffect, useState } from 'react';

export function AnalyticsDashboard({ userId }: { userId: string }) {
  const [analytics, setAnalytics] = useState(null);
  
  useEffect(() => {
    fetch(`/api/analytics?user_id=${userId}`)
      .then(res => res.json())
      .then(setAnalytics);
  }, [userId]);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold">Total Requests</h3>
        <p className="text-3xl font-bold">{analytics?.totals.requests || 0}</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold">Credits Consumed</h3>
        <p className="text-3xl font-bold">{analytics?.totals.credits_consumed || 0}</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold">Avg Response Time</h3>
        <p className="text-3xl font-bold">{analytics?.totals.avg_response_time_ms || 0}ms</p>
      </div>
    </div>
  );
}
```

## **Troubleshooting Guide**

### Common Issues

#### 1. Database Connection Issues
```bash
# Check connection
psql $DATABASE_URL -c "SELECT 1"

# Verify environment variables
echo $DATABASE_URL
```

#### 2. API Key Issues
```bash
# Test Claude API
curl -X POST https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-3-sonnet","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'
```

#### 3. Credit Consumption Issues
```sql
-- Check user account exists
SELECT * FROM credit_accounts WHERE user_id = 'your-user-id';

-- Check provider configs
SELECT * FROM llm_provider_configs WHERE is_active = true;

-- Check recent transactions
SELECT * FROM credit_transactions ORDER BY created_at DESC LIMIT 10;
```

#### 4. Rate Limiting Issues
```sql
-- Check rate limits
SELECT check_rate_limit('your-user-id'::uuid, '127.0.0.1'::inet);

-- Reset rate limits (if needed)
DELETE FROM rate_limits WHERE created_at < NOW() - INTERVAL '1 hour';
```

## **Performance Optimization**

### 1. Database Optimization
```sql
-- Add additional indexes for performance
CREATE INDEX CONCURRENTLY idx_llm_usage_user_created ON llm_usage(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_credit_transactions_user_created ON credit_transactions(user_id, created_at DESC);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM llm_usage WHERE user_id = 'test' ORDER BY created_at DESC LIMIT 10;
```

### 2. API Optimization
```typescript
// Add response caching
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Add caching headers for static responses
  const response = NextResponse.next();
  
  if (request.nextUrl.pathname.startsWith('/api/credits/packages')) {
    response.headers.set('Cache-Control', 'public, max-age=3600');
  }
  
  return response;
}
```

### 3. Frontend Optimization
```typescript
// Add React Query for data fetching
import { useQuery } from '@tanstack/react-query';

function useCreditBalance(userId: string) {
  return useQuery({
    queryKey: ['creditBalance', userId],
    queryFn: () => fetch(`/api/credits/balance?user_id=${userId}`).then(res => res.json()),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
```

## **Security Checklist**

- [ ] Environment variables secured
- [ ] Database connection encrypted
- [ ] API rate limiting enabled
- [ ] Input validation implemented
- [ ] SQL injection prevention (using parameterized queries)
- [ ] CORS configured properly
- [ ] Stripe webhooks verified
- [ ] User authentication implemented
- [ ] Error messages don't leak sensitive data
- [ ] Logging configured (without sensitive data)

## **Monitoring & Alerts**

### Set Up Alerts
```typescript
// Add error monitoring
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

// Add custom metrics
Sentry.addBreadcrumb({
  message: 'Credit consumed',
  level: 'info',
  data: { userId, credits: amount }
});
```

### Health Check Endpoint
```typescript
// api/health.js
export default async function handler(req, res) {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Check external APIs
    const claudeStatus = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'HEAD',
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY }
    });
    
    res.status(200).json({
      status: 'healthy',
      database: 'connected',
      claude_api: claudeStatus.ok ? 'connected' : 'error',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
```

---

## **🎉 Congratulations!**

You now have a fully functional LLM credit management system with:

- ✅ **$0.10 per credit pricing**
- ✅ **Multi-provider LLM support** (Claude, Perplexity, OpenAI)
- ✅ **Dynamic credit consumption** based on token usage
- ✅ **Free daily credits** (10 per day)
- ✅ **Rate limiting** for abuse prevention
- ✅ **Stripe payment integration**
- ✅ **Comprehensive analytics**
- ✅ **Production-ready architecture**

**Next Steps:**
1. Test thoroughly with real users
2. Monitor usage patterns and costs
3. Optimize pricing based on data
4. Add more advanced features as needed

**Support:** If you encounter issues, check the troubleshooting guide or review the database logs for detailed error information. 