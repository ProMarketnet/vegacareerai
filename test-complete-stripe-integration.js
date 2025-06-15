#!/usr/bin/env node

/**
 * VegaCareer AI - Complete Stripe Integration Test
 * Tests payment intents, webhooks, and credit packages
 */

import fetch from 'node-fetch';
import chalk from 'chalk';

const API_BASE = 'http://localhost:3001';

console.log(chalk.blue.bold('🚀 VegaCareer AI - Complete Stripe Integration Test'));
console.log(chalk.blue('=' .repeat(60)));

// Test 1: Health Check
async function testHealthCheck() {
  console.log(chalk.yellow('\n🏥 Testing Health Check...'));
  
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log(chalk.green('✅ Health check passed'));
      console.log(chalk.gray(`   Service: ${data.data.service}`));
      console.log(chalk.gray(`   Environment: ${data.data.environment}`));
      return true;
    } else {
      console.log(chalk.red('❌ Health check failed'));
      return false;
    }
  } catch (error) {
    console.log(chalk.red('❌ Health check error:', error.message));
    return false;
  }
}

// Test 2: Credit Packages
async function testCreditPackages() {
  console.log(chalk.yellow('\n📦 Testing Credit Packages...'));
  
  try {
    const response = await fetch(`${API_BASE}/api/stripe/packages`);
    const data = await response.json();
    
    if (response.ok && data.success && data.data.length > 0) {
      console.log(chalk.green(`✅ Found ${data.data.length} credit packages`));
      data.data.forEach(pkg => {
        console.log(chalk.gray(`   ${pkg.name}: $${pkg.price} for ${pkg.credits} credits`));
      });
      return data.data;
    } else {
      console.log(chalk.red('❌ Failed to fetch credit packages'));
      return null;
    }
  } catch (error) {
    console.log(chalk.red('❌ Credit packages error:', error.message));
    return null;
  }
}

// Test 3: Payment Intent Creation
async function testPaymentIntentCreation() {
  console.log(chalk.yellow('\n💳 Testing Payment Intent Creation...'));
  
  try {
    const response = await fetch(`${API_BASE}/api/stripe/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        package_id: 'professional',
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        user_email: 'test@vegacareer.app'
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success && data.data.payment_intent.client_secret) {
      console.log(chalk.green('✅ Payment intent created successfully'));
      console.log(chalk.gray(`   Payment Intent ID: ${data.data.payment_intent.id}`));
      console.log(chalk.gray(`   Amount: $${data.data.payment_intent.amount / 100}`));
      console.log(chalk.gray(`   Credits: ${data.data.credits}`));
      console.log(chalk.gray(`   Client Secret: ${data.data.payment_intent.client_secret.substring(0, 30)}...`));
      return data.data;
    } else {
      console.log(chalk.red('❌ Failed to create payment intent'));
      console.log(chalk.red(`   Error: ${data.message || 'Unknown error'}`));
      return null;
    }
  } catch (error) {
    console.log(chalk.red('❌ Payment intent creation error:', error.message));
    return null;
  }
}

// Test 4: Webhook Endpoint (with proper signature)
async function testWebhookEndpoint() {
  console.log(chalk.yellow('\n🔗 Testing Webhook Endpoint...'));
  
  // Create a mock webhook event with proper structure
  const mockEvent = {
    id: 'evt_test_webhook_' + Date.now(),
    object: 'event',
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_test_payment_intent',
        amount: 4000, // $40.00
        currency: 'usd',
        status: 'succeeded',
        metadata: {
          userId: '550e8400-e29b-41d4-a716-446655440000',
          credits: '500',
          packageId: 'professional'
        }
      }
    },
    created: Math.floor(Date.now() / 1000)
  };
  
  try {
    // Note: This will fail signature verification, but we can test the endpoint structure
    const response = await fetch(`${API_BASE}/api/stripe/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test-signature-will-fail'
      },
      body: JSON.stringify(mockEvent)
    });
    
    // We expect this to fail due to signature verification
    if (response.status === 400) {
      console.log(chalk.yellow('⚠️  Webhook endpoint reachable (signature verification working)'));
      console.log(chalk.gray('   This is expected - real webhooks need valid signatures'));
      return true;
    } else {
      console.log(chalk.red('❌ Unexpected webhook response'));
      return false;
    }
  } catch (error) {
    console.log(chalk.red('❌ Webhook test error:', error.message));
    return false;
  }
}

// Test 5: LLM Query (to verify credit system integration)
async function testLLMQuery() {
  console.log(chalk.yellow('\n🤖 Testing LLM Query...'));
  
  try {
    const response = await fetch(`${API_BASE}/api/llm/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'Hello, this is a test query for VegaCareer AI!' }
        ],
        model: 'claude-3-haiku-20240307',
        user_id: '550e8400-e29b-41d4-a716-446655440000'
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log(chalk.green('✅ LLM query successful'));
      console.log(chalk.gray(`   Model: ${data.data.model}`));
      console.log(chalk.gray(`   Response: ${data.data.content ? data.data.content.substring(0, 100) + '...' : 'Mock response'}`));
      return true;
    } else {
      console.log(chalk.red('❌ LLM query failed'));
      return false;
    }
  } catch (error) {
    console.log(chalk.red('❌ LLM query error:', error.message));
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log(chalk.cyan('\n🧪 Running Complete Integration Tests...\n'));
  
  const results = {
    health: await testHealthCheck(),
    packages: await testCreditPackages(),
    paymentIntent: await testPaymentIntentCreation(),
    webhook: await testWebhookEndpoint(),
    llmQuery: await testLLMQuery()
  };
  
  // Summary
  console.log(chalk.blue('\n' + '='.repeat(60)));
  console.log(chalk.blue.bold('📊 Test Results Summary'));
  console.log(chalk.blue('='.repeat(60)));
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✅' : '❌';
    const color = passed ? chalk.green : chalk.red;
    console.log(color(`${icon} ${test.charAt(0).toUpperCase() + test.slice(1)} Test`));
  });
  
  console.log(chalk.blue('\n' + '='.repeat(60)));
  
  if (passed === total) {
    console.log(chalk.green.bold(`🎉 ALL TESTS PASSED! (${passed}/${total})`));
    console.log(chalk.green('Your Stripe integration is working perfectly!'));
    console.log(chalk.cyan('\n🚀 Next Steps:'));
    console.log(chalk.cyan('1. Set up your Stripe Pricing Table ID'));
    console.log(chalk.cyan('2. Test real payments in your frontend'));
    console.log(chalk.cyan('3. Deploy to production'));
  } else {
    console.log(chalk.yellow.bold(`⚠️  PARTIAL SUCCESS (${passed}/${total} tests passed)`));
    console.log(chalk.yellow('Some components need attention.'));
  }
  
  console.log(chalk.blue('\n' + '='.repeat(60)));
}

// Run the tests
runAllTests().catch(console.error); 