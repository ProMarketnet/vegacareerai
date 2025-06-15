# Stripe Integration Setup Guide

## Credit Packages to Create in Stripe

### Package 1: Starter Pack
- **Credits**: 100
- **Price**: $10.00
- **Description**: "100 LLM Credits - Perfect for getting started"

### Package 2: Professional Pack  
- **Credits**: 500
- **Price**: $40.00
- **Description**: "500 LLM Credits - Great for regular users"
- **Badge**: "Most Popular"

### Package 3: Business Pack
- **Credits**: 1000  
- **Price**: $75.00
- **Description**: "1000 LLM Credits - Best value for power users"
- **Badge**: "Best Value"

### Package 4: Enterprise Pack
- **Credits**: 2000
- **Price**: $140.00  
- **Description**: "2000 LLM Credits - For heavy usage"

## Stripe Products Setup

1. Go to Stripe Dashboard → Products
2. Create 4 products with the above details
3. Set up one-time payment prices for each
4. Copy the Price IDs (price_xxx) for integration

## Environment Variables Needed

```env
# Stripe API Keys
STRIPE_TEST_PUBLISHABLE_KEY=pk_test_...
STRIPE_TEST_SECRET_KEY=sk_test_...
STRIPE_LIVE_PUBLISHABLE_KEY=pk_live_...
STRIPE_LIVE_SECRET_KEY=sk_live_...

# Stripe Webhook Secret
STRIPE_WEBHOOK_SECRET=whsec_...

# Credit Package Price IDs
STRIPE_PRICE_100_CREDITS=price_...
STRIPE_PRICE_500_CREDITS=price_...
STRIPE_PRICE_1000_CREDITS=price_...
STRIPE_PRICE_2000_CREDITS=price_...
```

## UX/UI Components to Build

### 1. Credit Dashboard
- Current balance display
- Usage statistics
- Recent transactions

### 2. Credit Purchase Modal
- 4-tier pricing cards
- "Most Popular" and "Best Value" badges
- Stripe Checkout integration

### 3. Payment Success Page
- Confirmation message
- Credits added notification
- Receipt download

### 4. Credit History
- Transaction list
- Purchase dates
- Credit amounts 