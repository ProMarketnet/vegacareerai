import Joi from 'joi';

// Common validation schemas
export const schemas = {
  // LLM Query validation
  llmQuery: Joi.object({
    messages: Joi.array().items(
      Joi.object({
        role: Joi.string().valid('user', 'assistant', 'system').required(),
        content: Joi.string().min(1).max(10000).required()
      })
    ).min(1).max(50).required(),
    model: Joi.string().min(1).max(100).required(),
    max_tokens: Joi.number().integer().min(1).max(4000).optional(),
    temperature: Joi.number().min(0).max(2).optional(),
    user_id: Joi.string().uuid().optional()
  }),

  // Credit purchase validation
  creditPurchase: Joi.object({
    package_id: Joi.string().required(),
    user_id: Joi.string().uuid().required(),
    payment_method_id: Joi.string().optional()
  }),

  // User registration validation
  userRegistration: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(128).required(),
    name: Joi.string().min(1).max(100).required(),
    company: Joi.string().max(100).optional()
  }),

  // Pagination validation
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort_by: Joi.string().valid('created_at', 'updated_at', 'name').default('created_at'),
    sort_order: Joi.string().valid('asc', 'desc').default('desc')
  })
};

// Validation middleware factory
export const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
        timestamp: new Date().toISOString()
      });
    }

    // Replace request data with validated data
    req[property] = value;
    next();
  };
};

// Sanitization helpers
export const sanitize = {
  // Remove HTML tags and dangerous characters
  html: (input) => {
    if (typeof input !== 'string') return input;
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  },

  // Sanitize SQL-like inputs
  sql: (input) => {
    if (typeof input !== 'string') return input;
    return input
      .replace(/['";\\]/g, '')
      .replace(/\b(DROP|DELETE|INSERT|UPDATE|SELECT|UNION|ALTER|CREATE)\b/gi, '')
      .trim();
  },

  // Sanitize user input for LLM queries
  llmInput: (input) => {
    if (typeof input !== 'string') return input;
    return input
      .replace(/\x00/g, '') // Remove null bytes
      .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .trim()
      .substring(0, 10000); // Limit length
  }
};

// Rate limiting validation
export const validateRateLimit = (identifier, limits) => {
  const errors = [];
  
  if (!identifier) {
    errors.push({ field: 'identifier', message: 'Rate limit identifier required' });
  }
  
  if (limits && limits.requests_per_hour && limits.requests_per_hour > 1000) {
    errors.push({ field: 'rate_limit', message: 'Rate limit too high' });
  }
  
  return errors;
};

// Credit validation
export const validateCredits = (required, available) => {
  const errors = [];
  
  if (typeof required !== 'number' || required < 0) {
    errors.push({ field: 'credits_required', message: 'Invalid credits required' });
  }
  
  if (typeof available !== 'number' || available < 0) {
    errors.push({ field: 'credits_available', message: 'Invalid credits available' });
  }
  
  if (required > available) {
    errors.push({ 
      field: 'credits', 
      message: 'Insufficient credits',
      required,
      available
    });
  }
  
  return errors;
};

// API key validation
export const validateApiKey = (apiKey, provider) => {
  const patterns = {
    openai: /^sk-[a-zA-Z0-9]{48,}$/,
    anthropic: /^sk-ant-api03-[a-zA-Z0-9_-]{95}$/,
    perplexity: /^pplx-[a-zA-Z0-9]{32,}$/
  };
  
  if (!apiKey) return false;
  if (!patterns[provider]) return true; // Unknown provider, assume valid
  
  return patterns[provider].test(apiKey);
};

export default { schemas, validate, sanitize }; 