// Real LLM Provider Integrations
// Handles actual API calls to Claude, OpenAI, and Perplexity

import dotenv from 'dotenv';
dotenv.config();

// Provider configurations with real endpoints and pricing
export const PROVIDER_CONFIGS = {
  claude: {
    baseURL: 'https://api.anthropic.com/v1/messages',
    models: {
      'claude-3-sonnet-20240229': {
        name: 'Claude 3 Sonnet',
        input_cost_per_1m: 3.00,    // $3 per 1M input tokens
        output_cost_per_1m: 15.00,  // $15 per 1M output tokens
        credits_per_1k_tokens: 1.0, // Base rate: 1 credit per 1k tokens
        max_tokens: 4096,
        context_window: 200000
      },
      'claude-3-haiku-20240307': {
        name: 'Claude 3 Haiku',
        input_cost_per_1m: 0.25,    // $0.25 per 1M input tokens
        output_cost_per_1m: 1.25,   // $1.25 per 1M output tokens
        credits_per_1k_tokens: 0.5, // Cheaper model: 0.5 credits per 1k tokens
        max_tokens: 4096,
        context_window: 200000
      }
    }
  },
  openai: {
    baseURL: 'https://api.openai.com/v1/chat/completions',
    models: {
      'gpt-4': {
        name: 'GPT-4',
        input_cost_per_1m: 30.00,   // $30 per 1M input tokens
        output_cost_per_1m: 60.00,  // $60 per 1M output tokens
        credits_per_1k_tokens: 3.0, // Premium model: 3x multiplier
        max_tokens: 4096,
        context_window: 8192
      },
      'gpt-3.5-turbo': {
        name: 'GPT-3.5 Turbo',
        input_cost_per_1m: 0.50,    // $0.50 per 1M input tokens
        output_cost_per_1m: 1.50,   // $1.50 per 1M output tokens
        credits_per_1k_tokens: 0.5, // Cheaper model: 0.5 credits per 1k tokens
        max_tokens: 4096,
        context_window: 16385
      }
    }
  },
  perplexity: {
    baseURL: 'https://api.perplexity.ai/chat/completions',
    models: {
      'llama-3.1-sonar-small-128k-online': {
        name: 'Llama 3.1 Sonar Small',
        input_cost_per_1m: 0.20,    // $0.20 per 1M input tokens
        output_cost_per_1m: 0.20,   // $0.20 per 1M output tokens
        credits_per_1k_tokens: 0.5, // Research model: 0.5x multiplier
        max_tokens: 4096,
        context_window: 127072
      },
      'llama-3.1-sonar-large-128k-online': {
        name: 'Llama 3.1 Sonar Large',
        input_cost_per_1m: 1.00,    // $1 per 1M input tokens
        output_cost_per_1m: 1.00,   // $1 per 1M output tokens
        credits_per_1k_tokens: 1.0, // Standard rate
        max_tokens: 4096,
        context_window: 127072
      }
    }
  }
};

// Calculate credits required based on actual token usage and model pricing
export function calculateCreditsRequired(tokens, modelConfig) {
  const inputRatio = modelConfig.input_cost_per_1m / 
    (modelConfig.input_cost_per_1m + modelConfig.output_cost_per_1m);
  const outputRatio = 1 - inputRatio;
  
  // Weight tokens by their relative cost
  const weightedTokens = 
    (tokens.prompt_tokens * inputRatio) + 
    (tokens.completion_tokens * outputRatio);
  
  // Convert to credits (round up to nearest 0.1 credit)
  const credits = (weightedTokens / 1000) * modelConfig.credits_per_1k_tokens;
  return Math.ceil(credits * 10) / 10; // Round to 1 decimal place
}

// Get model configuration
export function getModelConfig(model) {
  for (const [provider, config] of Object.entries(PROVIDER_CONFIGS)) {
    if (config.models[model]) {
      return {
        provider,
        ...config.models[model],
        api_key_configured: isApiKeyConfigured(provider)
      };
    }
  }
  throw new Error(`Model ${model} not found`);
}

// Check if API key is configured for provider
function isApiKeyConfigured(provider) {
  const keyMap = {
    claude: process.env.ANTHROPIC_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    perplexity: process.env.PERPLEXITY_API_KEY
  };
  
  const key = keyMap[provider];
  return key && key !== `your-${provider === 'claude' ? 'anthropic' : provider}-api-key-here`;
}

// Claude API Integration
export async function callClaude(request) {
  const startTime = Date.now();
  
  if (!isApiKeyConfigured('claude')) {
    throw new Error('Anthropic API key not configured');
  }
  
  try {
    const response = await fetch(PROVIDER_CONFIGS.claude.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
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
      request_id: data.id,
      provider: 'claude'
    };
  } catch (error) {
    console.error('Claude API call failed:', error);
    throw error;
  }
}

// OpenAI API Integration
export async function callOpenAI(request) {
  const startTime = Date.now();
  
  if (!isApiKeyConfigured('openai')) {
    throw new Error('OpenAI API key not configured');
  }
  
  try {
    const response = await fetch(PROVIDER_CONFIGS.openai.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
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
      request_id: data.id,
      provider: 'openai'
    };
  } catch (error) {
    console.error('OpenAI API call failed:', error);
    throw error;
  }
}

// Perplexity API Integration
export async function callPerplexity(request) {
  const startTime = Date.now();
  
  if (!isApiKeyConfigured('perplexity')) {
    throw new Error('Perplexity API key not configured');
  }
  
  try {
    const response = await fetch(PROVIDER_CONFIGS.perplexity.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
      },
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
      request_id: data.id,
      provider: 'perplexity'
    };
  } catch (error) {
    console.error('Perplexity API call failed:', error);
    throw error;
  }
}

// Main LLM caller - routes to appropriate provider
export async function callLLMProvider(request) {
  const modelConfig = getModelConfig(request.model);
  
  // Route to appropriate provider
  let response;
  switch (modelConfig.provider) {
    case 'claude':
      response = await callClaude(request);
      break;
    case 'openai':
      response = await callOpenAI(request);
      break;
    case 'perplexity':
      response = await callPerplexity(request);
      break;
    default:
      throw new Error(`Unknown provider: ${modelConfig.provider}`);
  }
  
  // Calculate credits consumed
  const creditsConsumed = calculateCreditsRequired(response.usage, modelConfig);
  
  return {
    ...response,
    usage: {
      ...response.usage,
      credits_consumed: creditsConsumed,
      model_config: {
        name: modelConfig.name,
        credits_per_1k_tokens: modelConfig.credits_per_1k_tokens,
        input_cost_per_1m: modelConfig.input_cost_per_1m,
        output_cost_per_1m: modelConfig.output_cost_per_1m
      }
    }
  };
}

// Get all available providers and their status
export function getAvailableProviders() {
  const providers = [];
  
  for (const [providerName, config] of Object.entries(PROVIDER_CONFIGS)) {
    const models = Object.keys(config.models).map(modelId => ({
      id: modelId,
      name: config.models[modelId].name,
      credits_per_1k_tokens: config.models[modelId].credits_per_1k_tokens,
      max_tokens: config.models[modelId].max_tokens,
      context_window: config.models[modelId].context_window
    }));
    
    providers.push({
      name: providerName,
      models: models,
      status: isApiKeyConfigured(providerName) ? 'available' : 'not_configured',
      api_key_configured: isApiKeyConfigured(providerName)
    });
  }
  
  return providers;
}

// Mock LLM call for testing when no API keys are configured
export async function mockLLMCall(request) {
  const startTime = Date.now();
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
  
  const responseTime = Date.now() - startTime;
  
  // Estimate token usage
  const promptText = request.messages.map(m => m.content).join(' ');
  const promptTokens = Math.ceil(promptText.length / 4);
  const completionTokens = Math.min(request.max_tokens || 1000, Math.ceil(promptTokens * 0.5));
  
  const usage = {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: promptTokens + completionTokens
  };
  
  // Get model config for credit calculation
  const modelConfig = getModelConfig(request.model);
  const creditsConsumed = calculateCreditsRequired(usage, modelConfig);
  
  return {
    choices: [{
      message: {
        role: 'assistant',
        content: `🤖 **MOCK RESPONSE** from ${modelConfig.name}\n\nYour question: "${request.messages[request.messages.length - 1].content}"\n\nThis is a simulated response for testing the credit system. The real API integration is ready - just add your API keys!\n\n**Model Info:**\n- Credits per 1k tokens: ${modelConfig.credits_per_1k_tokens}\n- Input cost: $${modelConfig.input_cost_per_1m}/1M tokens\n- Output cost: $${modelConfig.output_cost_per_1m}/1M tokens\n\n*Add your API keys to .env to get real responses!*`
      }
    }],
    usage: {
      ...usage,
      credits_consumed: creditsConsumed,
      model_config: {
        name: modelConfig.name,
        credits_per_1k_tokens: modelConfig.credits_per_1k_tokens,
        input_cost_per_1m: modelConfig.input_cost_per_1m,
        output_cost_per_1m: modelConfig.output_cost_per_1m
      }
    },
    model: request.model,
    response_time_ms: responseTime,
    request_id: `mock_${Date.now()}`,
    provider: modelConfig.provider,
    is_mock: true
  };
} 