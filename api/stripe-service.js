import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Credit packages configuration
export const CREDIT_PACKAGES = [
  {
    id: 'starter',
    credits: 100,
    price: 10.00,
    name: 'Starter Pack',
    description: '100 LLM Credits - Perfect for getting started',
    popular: false,
    bestValue: false
  },
  {
    id: 'professional',
    credits: 500,
    price: 40.00,
    name: 'Professional Pack',
    description: '500 LLM Credits - Great for regular users',
    popular: true,
    bestValue: false
  },
  {
    id: 'business',
    credits: 1000,
    price: 75.00,
    name: 'Business Pack',
    description: '1000 LLM Credits - Best value for power users',
    popular: false,
    bestValue: true
  },
  {
    id: 'enterprise',
    credits: 2000,
    price: 140.00,
    name: 'Enterprise Pack',
    description: '2000 LLM Credits - For heavy usage',
    popular: false,
    bestValue: false
  }
];

/**
 * Create a payment intent for credit purchase
 */
export async function createPaymentIntent(packageId, userId, userEmail) {
  try {
    const creditPackage = CREDIT_PACKAGES.find(pkg => pkg.id === packageId);
    if (!creditPackage) {
      throw new Error('Invalid credit package');
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(creditPackage.price * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        package_id: packageId,
        credits: creditPackage.credits.toString(),
        user_id: userId,
        user_email: userEmail,
        package_name: creditPackage.name
      },
      description: `${creditPackage.name} - ${creditPackage.credits} credits`
    });

    return {
      success: true,
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount: creditPackage.price,
      credits: creditPackage.credits,
      package: creditPackage
    };
  } catch (error) {
    console.error('Stripe payment intent creation failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verify payment and process credit addition
 */
export async function verifyPayment(paymentIntentId) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      return {
        success: true,
        payment: {
          id: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          credits: parseInt(paymentIntent.metadata.credits),
          user_id: paymentIntent.metadata.user_id,
          user_email: paymentIntent.metadata.user_email,
          package_id: paymentIntent.metadata.package_id,
          package_name: paymentIntent.metadata.package_name
        }
      };
    } else {
      return {
        success: false,
        error: `Payment not completed. Status: ${paymentIntent.status}`
      };
    }
  } catch (error) {
    console.error('Payment verification failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handle Stripe webhooks
 */
export async function handleWebhook(body, signature) {
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log(`🔔 Webhook received: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        // Handle Stripe Pricing Table purchases
        const session = event.data.object;
        console.log('✅ Checkout session completed:', session.id);
        
        // Get line items to determine credits purchased
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        const credits = calculateCreditsFromLineItems(lineItems.data);
        
        const checkoutResult = await processCreditsGrant({
          user_id: session.client_reference_id || session.customer_email || `guest_${session.id}`,
          user_email: session.customer_details?.email || session.customer_email,
          credits: credits,
          amount: session.amount_total / 100,
          payment_id: session.payment_intent,
          session_id: session.id,
          payment_method: 'pricing_table'
        });
        
        return {
          success: true,
          event_type: 'checkout_completed',
          session_id: session.id,
          payment_intent_id: session.payment_intent,
          credits: credits,
          user_id: session.client_reference_id || session.customer_email,
          processed: checkoutResult.success
        };

      case 'payment_intent.succeeded':
        // Handle custom payment intent purchases
        const paymentIntent = event.data.object;
        console.log('✅ Payment intent succeeded:', paymentIntent.id);
        
        const paymentResult = await processCreditsGrant({
          user_id: paymentIntent.metadata.user_id,
          user_email: paymentIntent.metadata.user_email,
          credits: parseInt(paymentIntent.metadata.credits),
          amount: paymentIntent.amount / 100,
          payment_id: paymentIntent.id,
          package_id: paymentIntent.metadata.package_id,
          package_name: paymentIntent.metadata.package_name,
          payment_method: 'payment_intent'
        });
        
        return {
          success: true,
          event_type: 'payment_succeeded',
          payment_intent_id: paymentIntent.id,
          credits: parseInt(paymentIntent.metadata.credits),
          user_id: paymentIntent.metadata.user_id,
          processed: paymentResult.success
        };

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        console.log('❌ Payment failed:', failedPayment.id);
        
        return {
          success: true,
          event_type: 'payment_failed',
          payment_intent_id: failedPayment.id,
          user_id: failedPayment.metadata.user_id
        };

      case 'invoice.payment_succeeded':
        // Handle subscription payments (if you add subscriptions later)
        const invoice = event.data.object;
        console.log('✅ Invoice payment succeeded:', invoice.id);
        
        return {
          success: true,
          event_type: 'invoice_paid',
          invoice_id: invoice.id,
          customer_id: invoice.customer
        };

      default:
        console.log(`ℹ️  Unhandled event type: ${event.type}`);
        return {
          success: true,
          event_type: 'unhandled',
          message: `Event ${event.type} received but not processed`
        };
    }
  } catch (error) {
    console.error('❌ Webhook handling failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Calculate credits from Stripe line items
 */
function calculateCreditsFromLineItems(lineItems) {
  let totalCredits = 0;
  
  for (const item of lineItems) {
    // Map price IDs to credits (you'll need to update these with your actual Stripe price IDs)
    const priceToCreditsMap = {
      // Add your actual Stripe price IDs here
      'price_starter': 100,
      'price_professional': 500,
      'price_business': 1000,
      'price_enterprise': 2000
    };
    
    const credits = priceToCreditsMap[item.price.id] || 0;
    totalCredits += credits * item.quantity;
  }
  
  // Fallback: estimate credits based on amount if no mapping found
  if (totalCredits === 0 && lineItems.length > 0) {
    const totalAmount = lineItems.reduce((sum, item) => sum + (item.amount_total / 100), 0);
    totalCredits = Math.floor(totalAmount * 10); // $0.10 per credit
  }
  
  return totalCredits;
}

/**
 * Process credit grant to user account
 * This is where you'd integrate with your database
 */
async function processCreditsGrant(grantData) {
  try {
    console.log('💳 Processing credit grant:', {
      user_id: grantData.user_id,
      credits: grantData.credits,
      amount: grantData.amount,
      payment_method: grantData.payment_method
    });
    
    // TODO: Integrate with your database here
    // Example implementations:
    
    // For Supabase:
    // const { data, error } = await supabase
    //   .from('user_credits')
    //   .upsert({
    //     user_id: grantData.user_id,
    //     credits: grantData.credits,
    //     updated_at: new Date().toISOString()
    //   }, { onConflict: 'user_id' });
    
    // For MongoDB:
    // await db.collection('users').updateOne(
    //   { user_id: grantData.user_id },
    //   { $inc: { credits: grantData.credits } },
    //   { upsert: true }
    // );
    
    // For PostgreSQL:
    // await db.query(`
    //   INSERT INTO user_credits (user_id, credits, last_purchase_amount, last_purchase_date)
    //   VALUES ($1, $2, $3, NOW())
    //   ON CONFLICT (user_id)
    //   DO UPDATE SET 
    //     credits = user_credits.credits + $2,
    //     last_purchase_amount = $3,
    //     last_purchase_date = NOW()
    // `, [grantData.user_id, grantData.credits, grantData.amount]);
    
    // Log the transaction for audit purposes
    console.log('📝 Transaction logged:', {
      timestamp: new Date().toISOString(),
      user_id: grantData.user_id,
      user_email: grantData.user_email,
      credits_granted: grantData.credits,
      amount_paid: grantData.amount,
      payment_id: grantData.payment_id,
      payment_method: grantData.payment_method
    });
    
    // TODO: Send confirmation email
    // await sendCreditPurchaseConfirmation(grantData);
    
    return {
      success: true,
      credits_granted: grantData.credits,
      user_id: grantData.user_id
    };
    
  } catch (error) {
    console.error('❌ Failed to process credit grant:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get all available credit packages
 */
export function getCreditPackages() {
  return CREDIT_PACKAGES;
}

/**
 * Get specific credit package by ID
 */
export function getCreditPackage(packageId) {
  return CREDIT_PACKAGES.find(pkg => pkg.id === packageId);
}

/**
 * Check if Stripe is properly configured
 */
export function isStripeConfigured() {
  return !!(process.env.STRIPE_SECRET_KEY && 
           process.env.STRIPE_PUBLISHABLE_KEY &&
           process.env.STRIPE_SECRET_KEY !== 'your-stripe-secret-key-here');
}

export default {
  createPaymentIntent,
  verifyPayment,
  handleWebhook,
  getCreditPackages,
  getCreditPackage,
  isStripeConfigured,
  CREDIT_PACKAGES
}; 