# Vega Career AI - Credits System Technical Specification

## Overview
Implement a freemium credits-based system where users can browse basic career intelligence for free with rate limits, and purchase credits for detailed AI-powered analysis and insights.

## System Architecture

### Database Schema Updates

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    credits_remaining INTEGER DEFAULT 0,
    subscription_tier VARCHAR(50) DEFAULT 'free',
    daily_free_queries_used INTEGER DEFAULT 0,
    last_free_query_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit transactions table
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL, -- 'purchase', 'usage', 'refund'
    credits_amount INTEGER NOT NULL,
    credits_before INTEGER NOT NULL,
    credits_after INTEGER NOT NULL,
    description TEXT,
    related_query_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit packages table
CREATE TABLE credit_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    credits_amount INTEGER NOT NULL,
    price_cents INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Query usage tracking
CREATE TABLE query_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(255), -- for anonymous users
    query_type VARCHAR(100) NOT NULL,
    query_text TEXT,
    credits_used INTEGER DEFAULT 0,
    response_generated BOOLEAN DEFAULT false,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rate limiting table
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier VARCHAR(255) NOT NULL, -- user_id or ip_address
    identifier_type VARCHAR(50) NOT NULL, -- 'user' or 'ip'
    query_count INTEGER DEFAULT 0,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(identifier, identifier_type)
);
```

### API Endpoints Specification

```javascript
// Authentication endpoints
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/profile

// Credits management
GET  /api/credits/balance
POST /api/credits/purchase
GET  /api/credits/packages
GET  /api/credits/transactions

// Query processing
POST /api/query/process
GET  /api/query/history
GET  /api/query/types

// Rate limiting
GET  /api/limits/status
```

## Core Components Implementation

### 1. Rate Limiting Service

```javascript
// services/rateLimitService.js
class RateLimitService {
  constructor() {
    this.limits = {
      anonymous: {
        hourly: 5,
        daily: 15
      },
      free_user: {
        hourly: 10,
        daily: 20
      },
      paid_user: {
        hourly: 100,
        daily: 'unlimited'
      }
    };
  }

  async checkRateLimit(identifier, identifierType) {
    const userType = await this.getUserType(identifier, identifierType);
    const currentUsage = await this.getCurrentUsage(identifier, identifierType);
    const limits = this.limits[userType];
    
    return {
      allowed: currentUsage.hourly < limits.hourly && 
               (limits.daily === 'unlimited' || currentUsage.daily < limits.daily),
      remaining: {
        hourly: Math.max(0, limits.hourly - currentUsage.hourly),
        daily: limits.daily === 'unlimited' ? 'unlimited' : Math.max(0, limits.daily - currentUsage.daily)
      },
      resetTime: this.getResetTime()
    };
  }

  async recordQuery(identifier, identifierType) {
    // Implementation for recording query usage
  }

  async getCurrentUsage(identifier, identifierType) {
    // Implementation for getting current usage counts
  }
}
```

### 2. Credits Management Service

```javascript
// services/creditsService.js
class CreditsService {
  constructor() {
    this.creditCosts = {
      'basic_question': 0,
      'detailed_analysis': 2,
      'market_intelligence': 3,
      'salary_analysis': 1,
      'skill_roadmap': 2,
      'regulatory_insights': 3,
      'career_transition_plan': 5
    };
  }

  async getUserCredits(userId) {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { credits_remaining: true }
    });
    return user?.credits_remaining || 0;
  }

  async deductCredits(userId, amount, description, queryId) {
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });

    if (!user || user.credits_remaining < amount) {
      throw new Error('Insufficient credits');
    }

    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: { credits_remaining: user.credits_remaining - amount }
    });

    // Log the transaction
    await prisma.credit_transactions.create({
      data: {
        userId,
        transactionType: 'usage',
        creditsAmount: -amount,
        creditsBefore: user.credits_remaining,
        creditsAfter: updatedUser.credits_remaining,
        description,
        relatedQueryId: queryId
      }
    });

    return updatedUser.credits_remaining;
  }

  async addCredits(userId, amount, description = 'Credit purchase') {
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });

    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: { credits_remaining: user.credits_remaining + amount }
    });

    // Log the transaction
    await prisma.credit_transactions.create({
      data: {
        userId,
        transactionType: 'purchase',
        creditsAmount: amount,
        creditsBefore: user.credits_remaining,
        creditsAfter: updatedUser.credits_remaining,
        description
      }
    });

    return updatedUser.credits_remaining;
  }

  getQueryCost(queryType) {
    return this.creditCosts[queryType] || 0;
  }
}
```

### 3. Query Processing Service

```javascript
// services/queryService.js
class QueryService {
  constructor() {
    this.rateLimitService = new RateLimitService();
    this.creditsService = new CreditsService();
    this.aiService = new AIService();
  }

  async processQuery(query, userId = null, sessionId = null, ipAddress = null) {
    const identifier = userId || ipAddress;
    const identifierType = userId ? 'user' : 'ip';
    
    // Classify query type
    const queryType = await this.classifyQuery(query);
    const creditCost = this.creditsService.getQueryCost(queryType);
    
    // Check rate limits for free queries
    if (creditCost === 0) {
      const rateLimitCheck = await this.rateLimitService.checkRateLimit(identifier, identifierType);
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          limits: rateLimitCheck
        };
      }
    }
    
    // Check credits for paid queries
    if (creditCost > 0 && userId) {
      const userCredits = await this.creditsService.getUserCredits(userId);
      if (userCredits < creditCost) {
        return {
          success: false,
          error: 'INSUFFICIENT_CREDITS',
          required: creditCost,
          available: userCredits
        };
      }
    }
    
    // Process the query
    const response = await this.generateResponse(query, queryType, userId);
    
    // Log the query
    const queryLog = await prisma.query_logs.create({
      data: {
        userId,
        sessionId,
        queryType,
        queryText: query,
        creditsUsed: creditCost,
        responseGenerated: !!response,
        ipAddress
      }
    });
    
    // Deduct credits if applicable
    if (creditCost > 0 && userId) {
      await this.creditsService.deductCredits(
        userId, 
        creditCost, 
        `Query: ${queryType}`, 
        queryLog.id
      );
    }
    
    // Record usage for rate limiting
    if (creditCost === 0) {
      await this.rateLimitService.recordQuery(identifier, identifierType);
    }
    
    return {
      success: true,
      response,
      creditsUsed: creditCost,
      queryType
    };
  }

  async classifyQuery(query) {
    // Simple keyword-based classification
    const keywords = {
      'detailed_analysis': ['detailed', 'comprehensive', 'analysis', 'deep dive'],
      'market_intelligence': ['market', 'industry', 'trends', 'demand'],
      'salary_analysis': ['salary', 'compensation', 'pay', 'earnings'],
      'skill_roadmap': ['skills', 'learn', 'roadmap', 'development'],
      'regulatory_insights': ['regulation', 'compliance', 'law', 'policy'],
      'career_transition_plan': ['transition', 'change career', 'switch']
    };
    
    const queryLower = query.toLowerCase();
    
    for (const [type, words] of Object.entries(keywords)) {
      if (words.some(word => queryLower.includes(word))) {
        return type;
      }
    }
    
    return 'basic_question';
  }

  async generateResponse(query, queryType, userId) {
    if (queryType === 'basic_question') {
      return await this.aiService.generateBasicResponse(query);
    } else {
      return await this.aiService.generateDetailedResponse(query, queryType, userId);
    }
  }
}
```

### 4. Payment Integration (Stripe)

```javascript
// services/paymentService.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class PaymentService {
  async createCheckoutSession(userId, packageId) {
    const package = await prisma.credit_packages.findUnique({
      where: { id: packageId }
    });

    if (!package || !package.is_active) {
      throw new Error('Invalid package');
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${package.name} - ${package.credits_amount} Credits`,
          },
          unit_amount: package.price_cents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
      client_reference_id: userId,
      metadata: {
        package_id: packageId,
        credits_amount: package.credits_amount.toString()
      }
    });

    return session;
  }

  async handleWebhook(event) {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.client_reference_id;
      const creditsAmount = parseInt(session.metadata.credits_amount);
      
      await this.creditsService.addCredits(
        userId, 
        creditsAmount, 
        `Purchase: ${session.metadata.package_id}`
      );
    }
  }
}
```

## Frontend Components

### 1. Credits Display Component

```jsx
// components/CreditsDisplay.jsx
import React from 'react';
import { useAuth } from '../hooks/useAuth';

const CreditsDisplay = () => {
  const { user } = useAuth();
  
  if (!user) return null;
  
  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-lg">
      <span className="text-sm font-medium text-blue-900">
        Credits: {user.credits_remaining}
      </span>
      {user.credits_remaining < 5 && (
        <button 
          onClick={() => navigate('/credits/purchase')}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          Buy More
        </button>
      )}
    </div>
  );
};
```

### 2. Query Cost Indicator

```jsx
// components/QueryCostIndicator.jsx
import React from 'react';

const QueryCostIndicator = ({ queryType, cost }) => {
  if (cost === 0) {
    return (
      <div className="text-xs text-green-600 font-medium">
        Free Query
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-1 text-xs text-orange-600">
      <span>{cost} credits</span>
      <span className="text-gray-400">•</span>
      <span>{getQueryTypeLabel(queryType)}</span>
    </div>
  );
};

const getQueryTypeLabel = (type) => {
  const labels = {
    'detailed_analysis': 'Detailed Analysis',
    'market_intelligence': 'Market Intelligence',
    'salary_analysis': 'Salary Analysis',
    'skill_roadmap': 'Skill Roadmap',
    'regulatory_insights': 'Regulatory Insights',
    'career_transition_plan': 'Career Plan'
  };
  return labels[type] || 'Analysis';
};
```

### 3. Credit Purchase Flow

```jsx
// components/CreditPurchase.jsx
import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';

const CreditPurchase = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    fetchCreditPackages();
  }, []);
  
  const fetchCreditPackages = async () => {
    const response = await fetch('/api/credits/packages');
    const data = await response.json();
    setPackages(data);
  };
  
  const handlePurchase = async (packageId) => {
    setLoading(true);
    try {
      const response = await fetch('/api/credits/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId })
      });
      
      const { sessionId } = await response.json();
      const stripe = await loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
      await stripe.redirectToCheckout({ sessionId });
    } catch (error) {
      console.error('Purchase error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {packages.map(pkg => (
        <div key={pkg.id} className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold">{pkg.name}</h3>
          <p className="text-2xl font-bold">${(pkg.price_cents / 100).toFixed(2)}</p>
          <p className="text-gray-600">{pkg.credits_amount} credits</p>
          <p className="text-sm text-gray-500">
            ${((pkg.price_cents / 100) / pkg.credits_amount).toFixed(2)} per credit
          </p>
          <button
            onClick={() => handlePurchase(pkg.id)}
            disabled={loading}
            className="w-full mt-4 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Purchase'}
          </button>
        </div>
      ))}
    </div>
  );
};
```

## Configuration & Environment Variables

```bash
# .env file additions
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Rate limiting configuration
RATE_LIMIT_REDIS_URL=redis://localhost:6379
RATE_LIMIT_WINDOW_MS=3600000  # 1 hour in milliseconds

# Credit package configuration (database seeds)
DEFAULT_CREDIT_PACKAGES='[
  {"name":"Starter","credits":10,"price_cents":1000},
  {"name":"Professional","credits":30,"price_cents":2500},
  {"name":"Expert","credits":100,"price_cents":7500}
]'
```

## API Response Formats

### Successful Query Response
```json
{
  "success": true,
  "response": "Your detailed career analysis...",
  "creditsUsed": 2,
  "queryType": "detailed_analysis",
  "remainingCredits": 8
}
```

### Rate Limited Response
```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Daily limit reached. Create an account for more queries.",
  "limits": {
    "remaining": {
      "hourly": 0,
      "daily": 0
    },
    "resetTime": "2025-06-12T14:30:00Z"
  }
}
```

### Insufficient Credits Response
```json
{
  "success": false,
  "error": "INSUFFICIENT_CREDITS",
  "message": "Not enough credits for this analysis.",
  "required": 3,
  "available": 1,
  "purchaseUrl": "/credits/purchase"
}
```

## Testing Strategy

### Unit Tests
- Credits service functions
- Rate limiting logic
- Query classification
- Payment webhook handling

### Integration Tests
- Complete query flow (anonymous → registered → paid)
- Payment processing end-to-end
- Rate limiting across different user types
- Credit deduction and balance updates

### Load Testing
- Rate limiting under high traffic
- Database performance with credit transactions
- Payment processing capacity

## Security Considerations

### Credit System Security
- Prevent credit balance manipulation
- Secure payment webhook verification
- Input validation for all credit operations
- Audit trail for all credit transactions

### Rate Limiting Security
- IP-based protection against abuse
- User session validation
- Query content filtering
- DDoS protection considerations

## Deployment Requirements

### Database Migrations
- Run schema updates in production
- Seed initial credit packages
- Set up proper indexes for performance

### Monitoring & Alerts
- Credit transaction monitoring
- Payment failure alerts
- Rate limiting metrics
- Query processing performance

### Backup & Recovery
- Regular credit transaction backups
- Payment reconciliation procedures
- User data recovery protocols 