import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { callLLMProvider, getAvailableProviders, mockLLMCall } from './llm-providers.js';
import stripeService from './stripe-service.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'LLM Credit System API is running!',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      llm: '/api/llm/*',
      auth: '/api/auth/*',
      credits: '/api/credits/*',
      users: '/api/users/*'
    }
  });
});

// LLM Test Routes
app.get('/api/llm/test', (req, res) => {
  res.json({
    message: 'LLM Gateway is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    api_keys_configured: {
      anthropic: !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your-anthropic-api-key-here',
      openai: !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here',
      perplexity: !!process.env.PERPLEXITY_API_KEY && process.env.PERPLEXITY_API_KEY !== 'your-perplexity-api-key-here'
    }
  });
});

app.get('/api/llm/providers', (req, res) => {
  try {
    const providers = getAvailableProviders();
    res.json({ providers });
  } catch (error) {
    console.error('Error getting providers:', error);
    res.status(500).json({
      error: 'Failed to get providers',
      message: error.message
    });
  }
});

// Real LLM query endpoint with fallback to mock
app.post('/api/llm/query', async (req, res) => {
  try {
    const { messages, model, max_tokens, temperature, user_id } = req.body;
    
    // Validate request
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Messages array is required'
      });
    }
    
    if (!model) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Model is required'
      });
    }

    // Try real LLM call first, fallback to mock if API keys not configured
    try {
      const result = await callLLMProvider({
        messages,
        model,
        max_tokens: max_tokens || 1000,
        temperature: temperature || 0.7,
        user_id
      });
      
      res.json({
        success: true,
        response: result.choices[0].message.content,
        usage: {
          prompt_tokens: result.usage.prompt_tokens,
          completion_tokens: result.usage.completion_tokens,
          total_tokens: result.usage.total_tokens,
          credits_consumed: result.credits_consumed,
          response_time_ms: result.response_time_ms
        },
        model: result.model,
        provider: result.provider,
        request_id: result.request_id,
        is_real_response: true
      });
      
    } catch (llmError) {
      console.log('Real LLM call failed, using mock response:', llmError.message);
      
      // Fallback to mock response
      const mockResult = await mockLLMCall({
        messages,
        model,
        max_tokens: max_tokens || 1000,
        temperature: temperature || 0.7
      });
      
      res.json({
        success: true,
        response: mockResult.choices[0].message.content,
        usage: {
          prompt_tokens: mockResult.usage.prompt_tokens,
          completion_tokens: mockResult.usage.completion_tokens,
          total_tokens: mockResult.usage.total_tokens,
          credits_consumed: mockResult.credits_consumed,
          response_time_ms: mockResult.response_time_ms
        },
        model: mockResult.model,
        provider: 'mock',
        request_id: mockResult.request_id,
        is_real_response: false,
        fallback_reason: llmError.message
      });
    }
    
  } catch (error) {
    console.error('LLM query error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process LLM query',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Stripe endpoints
app.get('/api/stripe/packages', (req, res) => {
  try {
    const packages = stripeService.getCreditPackages();
    res.json({
      success: true,
      packages,
      stripe_configured: stripeService.isStripeConfigured()
    });
  } catch (error) {
    console.error('Failed to get credit packages:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/stripe/create-payment-intent', async (req, res) => {
  try {
    const { package_id, user_id, user_email } = req.body;
    
    if (!package_id || !user_id || !user_email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: package_id, user_id, user_email'
      });
    }

    const result = await stripeService.createPaymentIntent(package_id, user_id, user_email);
    res.json(result);
  } catch (error) {
    console.error('Failed to create payment intent:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/stripe/verify-payment', async (req, res) => {
  try {
    const { payment_intent_id } = req.body;
    
    if (!payment_intent_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing payment_intent_id'
      });
    }

    const result = await stripeService.verifyPayment(payment_intent_id);
    res.json(result);
  } catch (error) {
    console.error('Failed to verify payment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/stripe/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    const result = await stripeService.handleWebhook(req.body, signature);
    
    if (result.success) {
      res.json({ received: true });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Webhook handling failed:', error);
    res.status(400).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 LLM Credit System API Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`💾 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   GET  /api/test - API test`);
  console.log(`   POST /api/llm/query - LLM queries (real/mock hybrid)`);
  console.log(`   GET  /api/llm/providers - Available providers`);
  console.log(`   GET  /api/llm/test - LLM gateway test`);
  console.log(`   GET  /api/stripe/packages - Credit packages`);
  console.log(`   POST /api/stripe/create-payment-intent - Create payment`);
  console.log(`   POST /api/stripe/verify-payment - Verify payment`);
  console.log(`   POST /api/stripe/webhook - Stripe webhooks`);
});

export default app; 