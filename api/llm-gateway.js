// Vega Career AI - LLM Gateway API
// Handles credit consumption and routes requests to AI providers

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

// Credit calculation utility
function calculateCreditsRequired(tokens, config) {
  const inputRatio = config.input_cost_per_1m_tokens / 
    (config.input_cost_per_1m_tokens + config.output_cost_per_1m_tokens);
  const outputRatio = 1 - inputRatio;
  
  const weightedTokens = 
    (tokens.prompt_tokens * inputRatio) + 
    (tokens.completion_tokens * outputRatio);
  
  return Math.ceil((weightedTokens / 1000) * config.credits_per_1k_tokens * 100) / 100;
}

// Rate limiting check
async function checkRateLimit(userId, ipAddress) {
  try {
    const result = await prisma.$queryRaw`
      SELECT check_rate_limit(${userId}::uuid, ${ipAddress}::inet) as rate_limit_result
    `;
    return JSON.parse(result[0].rate_limit_result);
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return { allowed: false, error: 'Rate limit check failed' };
  }
}

// Record rate limit usage
async function recordRateLimitUsage(userId, ipAddress) {
  try {
    await prisma.$queryRaw`
      SELECT record_rate_limit_usage(${userId}::uuid, ${ipAddress}::inet)
    `;
  } catch (error) {
    console.error('Failed to record rate limit usage:', error);
  }
}

// Get user credit balance
async function getUserCreditBalance(userId) {
  try {
    const result = await prisma.$queryRaw`
      SELECT get_user_credit_balance(${userId}::uuid) as balance_result
    `;
    return JSON.parse(result[0].balance_result);
  } catch (error) {
    console.error('Failed to get credit balance:', error);
    return { success: false, error: 'Failed to get credit balance' };
  }
}

// Get provider configuration
async function getProviderConfig(provider, model) {
  try {
    const config = await prisma.llm_provider_configs.findFirst({
      where: {
        provider: provider,
        model: model,
        is_active: true
      }
    });
    
    if (!config) {
      throw new Error(`Provider configuration not found for ${provider} ${model}`);
    }
    
    return config;
  } catch (error) {
    console.error('Failed to get provider config:', error);
    throw error;
  }
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

// Call Perplexity API
async function callPerplexity(request) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(PROVIDERS.perplexity.baseURL, {
      method: 'POST',
      headers: PROVIDERS.perplexity.headers,
      body: JSON.stringify({
        model: request.model,
        max_tokens: request.max_tokens || 1000,
        messages: request.messages,
        temperature: request.temperature || 0.7
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${errorData}`);
    }
    
    const data = await response.json();
    const responseTime = Date.now() - startTime;
    
    return {
      choices: data.choices,
      usage: data.usage,
      model: request.model,
      response_time_ms: responseTime,
      request_id: data.id
    };
  } catch (error) {
    console.error('Perplexity API call failed:', error);
    throw error;
  }
}

// Call OpenAI API
async function callOpenAI(request) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(PROVIDERS.openai.baseURL, {
      method: 'POST',
      headers: PROVIDERS.openai.headers,
      body: JSON.stringify({
        model: request.model,
        max_tokens: request.max_tokens || 1000,
        messages: request.messages,
        temperature: request.temperature || 0.7
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }
    
    const data = await response.json();
    const responseTime = Date.now() - startTime;
    
    return {
      choices: data.choices,
      usage: data.usage,
      model: request.model,
      response_time_ms: responseTime,
      request_id: data.id
    };
  } catch (error) {
    console.error('OpenAI API call failed:', error);
    throw error;
  }
}

// Route request to appropriate provider
async function callLLMProvider(request) {
  switch (request.provider) {
    case 'claude':
      return await callClaude(request);
    case 'perplexity':
      return await callPerplexity(request);
    case 'openai':
      return await callOpenAI(request);
    default:
      throw new Error(`Unsupported provider: ${request.provider}`);
  }
}

// Consume credits
async function consumeCredits(userId, amount, description, usageData) {
  try {
    const result = await prisma.$queryRaw`
      SELECT consume_credits(
        ${userId}::uuid,
        ${amount}::decimal,
        ${description}::text,
        ${JSON.stringify(usageData)}::jsonb
      ) as consumption_result
    `;
    
    return JSON.parse(result[0].consumption_result);
  } catch (error) {
    console.error('Failed to consume credits:', error);
    throw error;
  }
}

// Main LLM Gateway Handler
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { provider, model, messages, max_tokens, temperature, user_id, query_type } = req.body;
    
    // Validate required fields
    if (!provider || !model || !messages) {
      return res.status(400).json({ 
        error: 'Missing required fields: provider, model, messages' 
      });
    }
    
    // Get client IP
    const clientIP = req.headers['x-forwarded-for'] || 
                    req.headers['x-real-ip'] || 
                    req.connection.remoteAddress || 
                    '127.0.0.1';
    
    // Check rate limits
    const rateLimitResult = await checkRateLimit(user_id, clientIP);
    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        rate_limit: rateLimitResult
      });
    }
    
    // Get provider configuration
    const config = await getProviderConfig(provider, model);
    
    // Estimate credits needed
    const estimatedTokens = estimateTokens(messages, max_tokens);
    const estimatedCredits = calculateCreditsRequired(estimatedTokens, config);
    
    // Check if user has sufficient credits (for paid queries)
    if (user_id && estimatedCredits > 0) {
      const balanceResult = await getUserCreditBalance(user_id);
      if (!balanceResult.success) {
        return res.status(400).json({ error: balanceResult.error });
      }
      
      const totalAvailable = balanceResult.balance + balanceResult.daily_free_credits_remaining;
      if (totalAvailable < estimatedCredits) {
        return res.status(402).json({
          error: 'Insufficient credits',
          required: estimatedCredits,
          available: balanceResult.balance,
          daily_free_remaining: balanceResult.daily_free_credits_remaining
        });
      }
    }
    
    // Make LLM API call
    const llmRequest = {
      provider,
      model,
      messages,
      max_tokens,
      temperature
    };
    
    const llmResponse = await callLLMProvider(llmRequest);
    
    // Calculate actual credits consumed
    const actualCredits = calculateCreditsRequired(llmResponse.usage, config);
    
    // Consume credits and log usage
    let consumptionResult = null;
    if (user_id) {
      const usageData = {
        provider,
        model,
        prompt_tokens: llmResponse.usage.prompt_tokens,
        completion_tokens: llmResponse.usage.completion_tokens,
        total_tokens: llmResponse.usage.total_tokens,
        request_id: llmResponse.request_id,
        response_time_ms: llmResponse.response_time_ms,
        status: 'completed',
        query_type: query_type || 'general'
      };
      
      consumptionResult = await consumeCredits(
        user_id,
        actualCredits,
        `${provider} ${model} request`,
        usageData
      );
      
      if (!consumptionResult.success) {
        return res.status(402).json({
          error: 'Credit consumption failed',
          details: consumptionResult.error
        });
      }
    }
    
    // Record rate limit usage
    await recordRateLimitUsage(user_id, clientIP);
    
    // Return response with credit information
    const response = {
      choices: llmResponse.choices,
      usage: {
        ...llmResponse.usage,
        credits_consumed: actualCredits,
        credits_estimated: estimatedCredits
      },
      model: llmResponse.model,
      request_id: llmResponse.request_id,
      provider: provider
    };
    
    // Add credit balance info for authenticated users
    if (user_id && consumptionResult) {
      response.credit_info = {
        new_balance: consumptionResult.new_balance,
        used_free_credit: consumptionResult.used_free_credit,
        daily_free_remaining: consumptionResult.daily_free_remaining
      };
    }
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('LLM Gateway error:', error);
    
    // Log failed usage if we have user_id
    if (req.body.user_id && req.body.provider && req.body.model) {
      try {
        const usageData = {
          provider: req.body.provider,
          model: req.body.model,
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
          status: 'failed',
          error_message: error.message,
          query_type: req.body.query_type || 'general'
        };
        
        await prisma.llm_usage.create({
          data: {
            user_id: req.body.user_id,
            provider: req.body.provider,
            model: req.body.model,
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
            credits_consumed: 0,
            status: 'failed',
            error_message: error.message,
            query_type: req.body.query_type || 'general'
          }
        });
      } catch (logError) {
        console.error('Failed to log error usage:', logError);
      }
    }
    
    return res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
}

// Export utility functions for testing
export {
  calculateCreditsRequired,
  estimateTokens,
  checkRateLimit,
  getUserCreditBalance,
  getProviderConfig
}; 