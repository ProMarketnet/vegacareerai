#!/bin/bash

# VegaCareer AI - Stripe Webhook Setup Script
# This script helps you set up Stripe webhooks for local development and production

echo "🚀 VegaCareer AI - Stripe Webhook Setup"
echo "======================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}This script will help you set up Stripe webhooks for your credit system.${NC}"
echo ""

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo -e "${YELLOW}⚠️  Stripe CLI not found. Installing...${NC}"
    echo "Please install Stripe CLI from: https://stripe.com/docs/stripe-cli"
    echo "Or run: brew install stripe/stripe-cli/stripe (on macOS)"
    echo ""
    read -p "Press Enter after installing Stripe CLI to continue..."
fi

# Login to Stripe CLI
echo -e "${BLUE}🔐 Logging into Stripe CLI...${NC}"
stripe login

# Get webhook endpoint secret for local development
echo ""
echo -e "${BLUE}🔗 Setting up local webhook forwarding...${NC}"
echo "This will forward Stripe webhook events to your local server."
echo ""

# Start webhook forwarding in background
echo -e "${GREEN}Starting webhook forwarding to localhost:3001/api/stripe/webhook${NC}"
echo "Keep this terminal open while developing locally."
echo ""

# Instructions for production setup
echo -e "${YELLOW}📋 PRODUCTION SETUP INSTRUCTIONS:${NC}"
echo "=================================="
echo ""
echo "1. Go to your Stripe Dashboard: https://dashboard.stripe.com"
echo "2. Navigate to: Developers → Webhooks"
echo "3. Click '+ Add endpoint'"
echo "4. Set Endpoint URL to: https://vegacareer.app/api/stripe/webhook"
echo "5. Select these events:"
echo "   - checkout.session.completed"
echo "   - payment_intent.succeeded"
echo "   - invoice.payment_succeeded"
echo "6. Click 'Add endpoint'"
echo "7. Copy the webhook signing secret (whsec_...)"
echo "8. Add it to your Vercel environment variables as STRIPE_WEBHOOK_SECRET"
echo ""

echo -e "${GREEN}✅ Setup complete! Your webhook handler is ready.${NC}"
echo ""
echo -e "${BLUE}💡 Next steps:${NC}"
echo "1. Create products in Stripe Dashboard"
echo "2. Create pricing table and get the ID"
echo "3. Add VITE_STRIPE_PRICING_TABLE_ID to your environment"
echo "4. Test the complete flow!"
echo ""

# Start the webhook forwarding
echo -e "${GREEN}🎯 Starting webhook forwarding...${NC}"
stripe listen --forward-to localhost:3001/api/stripe/webhook 