#!/usr/bin/env node

/**
 * VegaCareer AI - Stripe Webhook Integration Test
 * This script helps you set up and test your Stripe webhook integration
 */

import fetch from 'node-fetch';
import chalk from 'chalk';

const API_BASE = 'http://localhost:3001';

console.log(chalk.blue.bold('🚀 VegaCareer AI - Stripe Webhook Integration Test'));
console.log(chalk.blue('=' .repeat(60)));

// Test webhook endpoint
async function testWebhookEndpoint() {
  console.log(chalk.yellow('\n📡 Testing Webhook Endpoint...'));
  
  try {
    const response = await fetch(`${API_BASE}/api/stripe/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test-signature'
      },
      body: JSON.stringify({
        id: 'evt_test_webhook',
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_payment_intent',
            amount: 4000,
            currency: 'usd',
            metadata: {
              user_id: '550e8400-e29b-41d4-a716-446655440000',
              credits: '500',
              package_id: 'professional'
            }
          }
        }
      })
    });

    if (response.ok) {
      console.log(chalk.green('✅ Webhook endpoint is accessible'));
    } else {
      console.log(chalk.red(`❌ Webhook endpoint error: ${response.status}`));
    }
  } catch (error) {
    console.log(chalk.red(`❌ Webhook endpoint failed: ${error.message}`));
  }
}

// Instructions for setting up webhook
function showWebhookSetupInstructions() {
  console.log(chalk.cyan.bold('\n🔧 Stripe Webhook Setup Instructions'));
  console.log(chalk.cyan('=' .repeat(40)));
  
  console.log(chalk.white('\n1. Go to your Stripe Dashboard:'));
  console.log(chalk.blue('   https://dashboard.stripe.com/webhooks'));
  
  console.log(chalk.white('\n2. Click "Add endpoint"'));
  
  console.log(chalk.white('\n3. For local development, use:'));
  console.log(chalk.green('   http://localhost:3001/api/stripe/webhook'));
  
  console.log(chalk.white('\n4. For production (Vercel), use:'));
  console.log(chalk.green('   https://vegacareer.app/api/stripe/webhook'));
  
  console.log(chalk.white('\n5. Select these events to listen for:'));
  console.log(chalk.yellow('   • checkout.session.completed'));
  console.log(chalk.yellow('   • payment_intent.succeeded'));
  console.log(chalk.yellow('   • payment_intent.payment_failed'));
  
  console.log(chalk.white('\n6. After creating the endpoint, copy the "Signing secret"'));
  console.log(chalk.white('   It will look like: whsec_...'));
  
  console.log(chalk.white('\n7. Add it to your environment variables:'));
  console.log(chalk.green('   STRIPE_WEBHOOK_SECRET="whsec_your_signing_secret_here"'));
}

// Show current environment status
function showEnvironmentStatus() {
  console.log(chalk.magenta.bold('\n🔍 Current Environment Status'));
  console.log(chalk.magenta('=' .repeat(35)));
  
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  console.log(chalk.white('\nStripe Configuration:'));
  console.log(`${stripeSecretKey ? chalk.green('✅') : chalk.red('❌')} STRIPE_SECRET_KEY: ${stripeSecretKey ? 'Set' : 'Missing'}`);
  console.log(`${stripePublishableKey ? chalk.green('✅') : chalk.red('❌')} NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: ${stripePublishableKey ? 'Set' : 'Missing'}`);
  console.log(`${webhookSecret ? chalk.green('✅') : chalk.red('❌')} STRIPE_WEBHOOK_SECRET: ${webhookSecret ? 'Set' : 'Missing'}`);
  
  if (!webhookSecret) {
    console.log(chalk.red('\n⚠️  STRIPE_WEBHOOK_SECRET is missing!'));
    console.log(chalk.yellow('   This is required for webhook signature verification.'));
  }
}

// Test Stripe CLI setup (if available)
async function testStripeCLI() {
  console.log(chalk.green.bold('\n🔧 Stripe CLI Setup (Optional for Local Development)'));
  console.log(chalk.green('=' .repeat(55)));
  
  console.log(chalk.white('\nFor local webhook testing, you can use Stripe CLI:'));
  console.log(chalk.blue('1. Install Stripe CLI: https://stripe.com/docs/stripe-cli'));
  console.log(chalk.blue('2. Login: stripe login'));
  console.log(chalk.blue('3. Forward events: stripe listen --forward-to localhost:3001/api/stripe/webhook'));
  console.log(chalk.blue('4. The CLI will show you a webhook signing secret to use locally'));
}

// Main test function
async function runTests() {
  showEnvironmentStatus();
  await testWebhookEndpoint();
  showWebhookSetupInstructions();
  testStripeCLI();
  
  console.log(chalk.green.bold('\n✨ Next Steps:'));
  console.log(chalk.white('1. Set up your webhook endpoint in Stripe Dashboard'));
  console.log(chalk.white('2. Copy the webhook signing secret'));
  console.log(chalk.white('3. Add STRIPE_WEBHOOK_SECRET to your environment'));
  console.log(chalk.white('4. Restart your server'));
  console.log(chalk.white('5. Test a real payment to trigger the webhook'));
  
  console.log(chalk.blue('\n🔗 Useful Links:'));
  console.log(chalk.blue('• Stripe Dashboard: https://dashboard.stripe.com'));
  console.log(chalk.blue('• Webhook Guide: https://stripe.com/docs/webhooks'));
  console.log(chalk.blue('• Stripe CLI: https://stripe.com/docs/stripe-cli'));
}

// Run the tests
runTests().catch(console.error); 