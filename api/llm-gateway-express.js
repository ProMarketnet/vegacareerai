// Vega Career AI - LLM Gateway Express Router
// Handles credit consumption and routes requests to AI providers

import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// LLM Provider Configurations
const PROVIDERS = {
  claude: {
    baseURL: 'https://api.anthropic.com/v1/messages',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    }
  },
  perplexity: {
    baseURL: 'https://api.perplexity.ai/chat/completions',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
    }
  },
  openai: {
    baseURL: 'https://api.openai.com/v1/chat/completions',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    }
  }
};

// Mock database functions for now (will be replaced with actual DB calls)
async function checkRateLimit(userId, ipAddress) {
  // Mock implementation - always allow for now
  return { allowed: true, remaining: 100 };
}

async function getUserCreditBalance(userId) {
  // Mock implementation - return 100 credits for now
  return { success: true, balance: 100 };
}

// Estimate token usage (simplified)
function estimateTokens(messages, maxTokens = 1000) {
  const promptText = messages.map(m => m.content).join(' ');
  const promptTokens = Math.ceil(promptText.length / 4); // Rough estimate: 4 chars per token
  const completionTokens = Math.min(maxTokens, Math.ceil(promptTokens * 0.5)); // Estimate response length
  
  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: promptTokens + completionTokens
  };
}

// Call Claude API
async function callClaude(request) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(PROVIDERS.claude.baseURL, {
      method: 'POST',
      headers: PROVIDERS.claude.headers,
      body: JSON.stringify({
        model: request.model,
        max_tokens: request.max_tokens || 1000,
        messages: request.messages,
        temperature: request.temperature || 0.7
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorData}`);
    }
    
    const data = await response.json();
    const responseTime = Date.now() - startTime;
    
    return {
      choices: [{
        message: {
          role: 'assistant',
          content: data.content[0].text
        }
      }],
      usage: {
        prompt_tokens: data.usage.input_tokens,
        completion_tokens: data.usage.output_tokens,
        total_tokens: data.usage.input_tokens + data.usage.output_tokens
      },
      model: request.model,
      response_time_ms: responseTime,
      request_id: data.id
    };
  } catch (error) {
    console.error('Claude API call failed:', error);
    throw error;
  }
}

// Mock LLM call for testing
async function mockLLMCall(request) {
  const startTime = Date.now();
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
  
  const responseTime = Date.now() - startTime;
  const usage = estimateTokens(request.messages, request.max_tokens);
  
  return {
    choices: [{
      message: {
        role: 'assistant',
        content: `This is a mock response from ${request.model}. Your question was: "${request.messages[request.messages.length - 1].content}". This is a simulated response for testing the credit system.`
      }
    }],
    usage: usage,
    model: request.model,
    response_time_ms: responseTime,
    request_id: `mock_${Date.now()}`
  };
}

// Routes
router.get('/providers', (req, res) => {
  res.json({
    providers: [
      {
        name: 'claude',
        models: ['claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
        status: process.env.ANTHROPIC_API_KEY ? 'available' : 'not_configured'
      },
      {
        name: 'perplexity',
        models: ['llama-3.1-sonar-small-128k-online', 'llama-3.1-sonar-large-128k-online'],
        status: process.env.PERPLEXITY_API_KEY ? 'available' : 'not_configured'
      },
      {
        name: 'openai',
        models: ['gpt-4', 'gpt-3.5-turbo'],
        status: process.env.OPENAI_API_KEY ? 'available' : 'not_configured'
      }
    ]
  });
});

router.post('/query', async (req, res) => {
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
    
    // Get client IP
    const clientIP = req.ip || req.connection.remoteAddress || '127.0.0.1';
    
    // Check rate limits
    const rateLimitResult = await checkRateLimit(user_id, clientIP);
    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retry_after: 3600
      });
    }
    
    // Check credit balance (if user is authenticated)
    if (user_id) {
      const balanceResult = await getUserCreditBalance(user_id);
      if (!balanceResult.success || balanceResult.balance <= 0) {
        return res.status(402).json({
          error: 'Insufficient credits',
          message: 'Please purchase more credits to continue',
          current_balance: balanceResult.balance || 0
        });
      }
    }
    
    // Prepare request
    const llmRequest = {
      messages,
      model,
      max_tokens: max_tokens || 1000,
      temperature: temperature || 0.7
    };
    
    // Call LLM (using mock for now)
    let llmResponse;
    
    // Check if we have API keys configured
    const provider = model.includes('claude') ? 'claude' : 
                    model.includes('gpt') ? 'openai' : 
                    model.includes('llama') ? 'perplexity' : 'mock';
    
    if (provider === 'claude' && process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your-anthropic-api-key-here') {
      llmResponse = await callClaude(llmRequest);
    } else {
      // Use mock response for testing
      llmResponse = await mockLLMCall(llmRequest);
    }
    
    // Calculate credits consumed (simplified for now)
    const creditsConsumed = Math.ceil(llmResponse.usage.total_tokens / 1000);
    
    // Return response
    res.json({
      success: true,
      response: llmResponse.choices[0].message.content,
      usage: {
        ...llmResponse.usage,
        credits_consumed: creditsConsumed,
        response_time_ms: llmResponse.response_time_ms
      },
      model: llmResponse.model,
      request_id: llmResponse.request_id
    });
    
  } catch (error) {
    console.error('LLM query error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process LLM query',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.get('/test', (req, res) => {
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

export default router; 