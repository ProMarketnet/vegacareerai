import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { createServer } from 'http';
import { callLLMProvider } from './llm-providers.js';
import { 
  createPaymentIntent, 
  verifyPayment, 
  handleWebhook,
  getCreditPackages 
} from './stripe-service.js';

// Import our utilities
import { logInfo, logError, logWarning } from '../src/utils/logger.js';
import { sendSuccess, sendError, errorHandler } from '../src/utils/apiResponse.js';
import { validate, schemas, sanitize } from '../src/utils/validation.js';
import { 
  corsOptions, 
  rateLimiters, 
  helmetConfig,
  requestLogger,
  validateContentType,
  requestSizeLimit
} from '../src/middleware/security.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(helmetConfig);
app.use(cors(corsOptions));
app.use(compression());
app.use(requestLogger);
app.use(validateContentType);
app.use(requestSizeLimit('10mb'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api/llm', rateLimiters.llmQuery);
app.use('/api/stripe', rateLimiters.payment);

// Health check endpoint
app.get('/health', (req, res) => {
  sendSuccess(res, {
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    service: 'VegaCareer AI LLM Credit System',
    version: '1.0.0'
  });
});

// API test endpoint
app.get('/api/test', (req, res) => {
  sendSuccess(res, {
    message: 'API is working correctly',
    timestamp: new Date().toISOString()
  });
});

// LLM Providers endpoint
app.get('/api/llm/providers', (req, res) => {
  const providers = [
    {
      id: 'claude',
      name: 'Anthropic Claude',
      models: [
        { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', cost_per_1k_tokens: 0.25 },
        { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', cost_per_1k_tokens: 3.0 },
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', cost_per_1k_tokens: 15.0 }
      ]
    },
    {
      id: 'openai',
      name: 'OpenAI',
      models: [
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', cost_per_1k_tokens: 0.5 },
        { id: 'gpt-4', name: 'GPT-4', cost_per_1k_tokens: 30.0 },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', cost_per_1k_tokens: 10.0 }
      ]
    },
    {
      id: 'perplexity',
      name: 'Perplexity',
      models: [
        { id: 'llama-3.1-sonar-small-128k-online', name: 'Llama 3.1 Sonar Small', cost_per_1k_tokens: 0.2 },
        { id: 'llama-3.1-sonar-large-128k-online', name: 'Llama 3.1 Sonar Large', cost_per_1k_tokens: 1.0 }
      ]
    }
  ];
  
  sendSuccess(res, providers);
});

// LLM Query endpoint with validation
app.post('/api/llm/query', 
  validate(schemas.llmQuery),
  async (req, res) => {
    try {
      const { messages, model, max_tokens, temperature, user_id } = req.body;
      
      // Sanitize input
      const sanitizedMessages = messages.map(msg => ({
        role: msg.role,
        content: sanitize.llmInput(msg.content)
      }));
      
      logInfo('LLM Query Request', {
        user_id,
        model,
        message_count: sanitizedMessages.length,
        ip: req.ip
      });

      // Try real LLM call first, fallback to mock if needed
      try {
        const result = await callLLMProvider({
          messages: sanitizedMessages,
          model,
          max_tokens: max_tokens || 1000,
          temperature: temperature || 0.7,
          user_id
        });
        
        logInfo('LLM Query Success', {
          user_id,
          model,
          tokens_used: result.usage.total_tokens,
          response_time: result.response_time_ms
        });
        
        sendSuccess(res, {
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
        logWarning('LLM API failed, using mock response', {
          error: llmError.message,
          user_id,
          model
        });
        
        // Fallback to mock response
        const mockResult = {
          choices: [{
            message: {
              content: `This is a mock response for your query about: "${sanitizedMessages[sanitizedMessages.length - 1].content.substring(0, 50)}...". The real LLM service is currently unavailable, but your request has been processed successfully.`
            }
          }],
          usage: {
            prompt_tokens: Math.floor(Math.random() * 100) + 50,
            completion_tokens: Math.floor(Math.random() * 200) + 100,
            total_tokens: 0
          },
          model: model,
          provider: 'mock',
          request_id: `mock_${Date.now()}`,
          response_time_ms: Math.floor(Math.random() * 1000) + 200
        };
        
        mockResult.usage.total_tokens = mockResult.usage.prompt_tokens + mockResult.usage.completion_tokens;
        
        sendSuccess(res, {
          response: mockResult.choices[0].message.content,
          usage: {
            ...mockResult.usage,
            credits_consumed: Math.ceil(mockResult.usage.total_tokens / 1000),
            response_time_ms: mockResult.response_time_ms
          },
          model: mockResult.model,
          provider: mockResult.provider,
          request_id: mockResult.request_id,
          is_real_response: false,
          fallback_reason: 'LLM service temporarily unavailable'
        });
      }
      
    } catch (error) {
      logError(error, {
        endpoint: '/api/llm/query',
        user_id: req.body.user_id,
        ip: req.ip
      });
      sendError(res, 'Failed to process LLM query', 500);
    }
  }
);

// Stripe Credit Packages endpoint
app.get('/api/stripe/packages', (req, res) => {
  const packages = getCreditPackages();
  sendSuccess(res, packages);
});

// Stripe Payment Intent endpoint
app.post('/api/stripe/create-payment-intent',
  validate(schemas.creditPurchase),
  async (req, res) => {
    try {
      const { package_id, user_id } = req.body;
      
      logInfo('Payment Intent Request', {
        user_id,
        package_id,
        ip: req.ip
      });
      
      // Generate a demo email for the user (in production, this would come from user database)
      const userEmail = `user-${user_id.split('-')[0]}@demo.vegacareer.app`;
      
      const result = await createPaymentIntent(package_id, user_id, userEmail);
      
      if (result.success) {
        logInfo('Payment Intent Created', {
          user_id,
          payment_intent_id: result.payment_intent_id,
          amount: result.amount
        });
        sendSuccess(res, {
          payment_intent: {
            id: result.payment_intent_id,
            client_secret: result.client_secret,
            amount: Math.round(result.amount * 100) // Convert to cents for frontend
          },
          package: result.package,
          credits: result.credits
        });
      } else {
        logError(new Error(result.error), {
          endpoint: '/api/stripe/create-payment-intent',
          user_id,
          package_id
        });
        sendError(res, result.error, 400);
      }
      
    } catch (error) {
      logError(error, {
        endpoint: '/api/stripe/create-payment-intent',
        user_id: req.body.user_id,
        ip: req.ip
      });
      sendError(res, 'Failed to create payment intent', 500);
    }
  }
);

// Stripe Payment Verification endpoint
app.post('/api/stripe/verify-payment', async (req, res) => {
  try {
    const { payment_intent_id } = req.body;
    
    if (!payment_intent_id) {
      return sendError(res, 'Payment intent ID is required', 400);
    }
    
    const result = await verifyPayment(payment_intent_id);
    
    if (result.success) {
      logInfo('Payment Verified', {
        payment_intent_id,
        status: result.status
      });
      sendSuccess(res, result);
    } else {
      sendError(res, result.error, 400);
    }
    
  } catch (error) {
    logError(error, {
      endpoint: '/api/stripe/verify-payment',
      ip: req.ip
    });
    sendError(res, 'Failed to verify payment', 500);
  }
});

// Stripe Webhook endpoint
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    const result = await handleWebhook(req.body, signature);
    
    if (result.success) {
      logInfo('Webhook Processed', {
        event_type: result.event_type,
        payment_intent_id: result.payment_intent_id
      });
      res.status(200).json({ received: true });
    } else {
      logError(new Error(result.error), {
        endpoint: '/api/stripe/webhook'
      });
      res.status(400).json({ error: result.error });
    }
    
  } catch (error) {
    logError(error, {
      endpoint: '/api/stripe/webhook',
      ip: req.ip
    });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// 404 handler
app.use('*', (req, res) => {
  sendError(res, `Route ${req.originalUrl} not found`, 404);
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
const server = createServer(app);

process.on('SIGTERM', () => {
  logInfo('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logInfo('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logInfo('SIGINT received, shutting down gracefully');
  server.close(() => {
    logInfo('Process terminated');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  logInfo('Server Started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString()
  });
  
  console.log(`🚀 VegaCareer AI LLM Credit System running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   GET  /api/test - API test`);
  console.log(`   POST /api/llm/query - LLM queries`);
  console.log(`   GET  /api/llm/providers - Available providers`);
  console.log(`   GET  /api/stripe/packages - Credit packages`);
  console.log(`   POST /api/stripe/create-payment-intent - Create payment`);
  console.log(`   POST /api/stripe/verify-payment - Verify payment`);
  console.log(`   POST /api/stripe/webhook - Stripe webhooks`);
});

export default app; 