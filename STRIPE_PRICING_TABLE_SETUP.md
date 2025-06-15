# Stripe Pricing Table Setup Guide

## Overview
This guide will help you create a Stripe Pricing Table to enhance your "Buy Credits" experience. The pricing table provides a beautiful, hosted UI that displays all your credit packages in one place.

## Step 1: Create Products in Stripe Dashboard

1. **Log into your Stripe Dashboard**: https://dashboard.stripe.com
2. **Navigate to Products**: Go to "Products" in the left sidebar
3. **Create Products for each credit tier**:

### Starter Package
- **Name**: "Starter Credits"
- **Description**: "Perfect for trying out VegaCareer AI"
- **Price**: $10.00 USD (one-time)
- **Metadata**: Add `credits: 100` and `package_id: starter`

### Professional Package  
- **Name**: "Professional Credits"
- **Description**: "Great for regular users and professionals"
- **Price**: $40.00 USD (one-time)
- **Metadata**: Add `credits: 500` and `package_id: professional`

### Business Package
- **Name**: "Business Credits" 
- **Description**: "Ideal for teams and heavy usage"
- **Price**: $75.00 USD (one-time)
- **Metadata**: Add `credits: 1000` and `package_id: business`

### Enterprise Package
- **Name**: "Enterprise Credits"
- **Description**: "Maximum value for power users"
- **Price**: $140.00 USD (one-time)
- **Metadata**: Add `credits: 2000` and `package_id: enterprise`

## Step 2: Create Pricing Table

1. **Navigate to Pricing Tables**: In Stripe Dashboard, go to "Products" → "Pricing tables"
2. **Click "Create pricing table"**
3. **Add your products**: Select all 4 credit packages you just created
4. **Customize appearance**:
   - **Header**: "Choose Your Credit Package"
   - **Description**: "Select the perfect credit package for your VegaCareer AI needs"
   - **Button text**: "Get Started"
   - **Colors**: Match your brand (blue theme recommended)
5. **Configure settings**:
   - **Allow promotion codes**: Yes (for future discounts)
   - **Collect customer information**: Email address
   - **Success URL**: `https://vegacareer.app/payment-success` (or your domain)
   - **Cancel URL**: `https://vegacareer.app/` (or your domain)

## Step 3: Get Your Pricing Table ID

After creating the pricing table:
1. **Copy the Pricing Table ID**: It will look like `prctbl_1234567890abcdef`
2. **Copy the embed code**: Stripe will provide HTML like:
   ```html
   <script async src="https://js.stripe.com/v3/pricing-table.js"></script>
   <stripe-pricing-table 
     pricing-table-id="prctbl_1234567890abcdef"
     publishable-key="pk_live_51RYsvrJ1V7TuZJ0z4tL4lVz0zVrZPnTi3OFEF0aYWxjtUPKiKoYWt8sP02qzZFVAzt1XrBjNj2i6V9xuCtynpg86005tXMh1zV">
   </stripe-pricing-table>
   ```

## Step 4: Update Environment Variables

Add the pricing table ID to your environment:

### For Local Development (.env.local):
```bash
VITE_STRIPE_PRICING_TABLE_ID="prctbl_your_actual_pricing_table_id"
```

### For Vercel Deployment:
1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add: `VITE_STRIPE_PRICING_TABLE_ID` with your actual pricing table ID

## Step 5: Test the Integration

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Test the pricing table**:
   - Open your app at http://localhost:5173
   - Click "Buy Credits" 
   - Toggle to "Stripe Pricing Table"
   - Click "Open Stripe Pricing Table"
   - Verify it redirects to your Stripe-hosted pricing table

## Step 6: Configure Webhooks (Important!)

To automatically credit users after payment:

1. **In Stripe Dashboard**: Go to "Developers" → "Webhooks"
2. **Add endpoint**: `https://vegacareer.app/api/stripe/webhook` (or your domain)
3. **Select events**:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `invoice.payment_succeeded`
4. **Copy webhook secret**: Add to `STRIPE_WEBHOOK_SECRET` environment variable

## Current Integration Status

✅ **CreditPurchase Component**: Already supports both custom checkout and pricing table
✅ **Environment Variable**: `VITE_STRIPE_PRICING_TABLE_ID` is configured
✅ **Stripe Integration**: Payment intents working with real Stripe API
✅ **Backend API**: All endpoints operational on localhost:3001

## Next Steps

1. **Create the pricing table** in Stripe Dashboard (Steps 1-3 above)
2. **Add the pricing table ID** to your environment variables
3. **Test the integration** locally
4. **Deploy to production** with the new environment variable

## Troubleshooting

### Common Issues:
- **"Pricing table not found"**: Check that your pricing table ID is correct
- **"Invalid publishable key"**: Ensure you're using the correct Stripe publishable key
- **Redirect issues**: Verify your success/cancel URLs are correct

### Testing:
- Use Stripe test mode first with test pricing table
- Test with real credit card numbers in test mode
- Verify webhook delivery in Stripe Dashboard

## Benefits of Pricing Table

✅ **Professional appearance**: Stripe-hosted, mobile-responsive design
✅ **Multiple payment methods**: Credit cards, Apple Pay, Google Pay, etc.
✅ **Automatic tax calculation**: Based on customer location
✅ **Promotion codes**: Built-in discount code support
✅ **Conversion optimization**: Stripe's optimized checkout flow
✅ **Reduced development time**: No custom payment form needed

Your integration is ready - you just need to create the pricing table in Stripe Dashboard and add the ID to your environment variables! 