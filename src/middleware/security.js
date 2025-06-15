import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { logWarning } from '../utils/logger.js';

// CORS configuration
export const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://vegacareer.app',
      'https://testing-vega.vercel.app'
    ];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logWarning('CORS blocked request', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Rate limiting configurations
export const rateLimiters = {
  // General API rate limit
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retry_after: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logWarning('Rate limit exceeded', {
        ip: req.ip,
        url: req.url,
        user_agent: req.get('User-Agent')
      });
      res.status(429).json({
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        retry_after: 15 * 60
      });
    }
  }),

  // Strict rate limit for LLM queries
  llmQuery: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 LLM requests per minute
    message: {
      success: false,
      message: 'Too many LLM queries, please slow down.',
      retry_after: 60
    },
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      return req.user?.id || req.ip;
    }
  }),

  // Payment endpoints rate limit
  payment: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // limit each IP to 5 payment requests per minute
    message: {
      success: false,
      message: 'Too many payment attempts, please try again later.',
      retry_after: 60
    }
  }),

  // Auth endpoints rate limit
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 auth attempts per 15 minutes
    message: {
      success: false,
      message: 'Too many authentication attempts, please try again later.',
      retry_after: 15 * 60
    }
  })
};

// Helmet security configuration
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "https://js.stripe.com"],
      connectSrc: [
        "'self'",
        "https://api.stripe.com",
        "https://api.anthropic.com",
        "https://api.openai.com",
        "https://api.perplexity.ai"
      ],
      frameSrc: ["https://js.stripe.com"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for Stripe compatibility
});

// IP whitelist for admin endpoints
export const adminIPWhitelist = (req, res, next) => {
  const allowedIPs = process.env.ADMIN_IPS?.split(',') || [];
  const clientIP = req.ip || req.connection.remoteAddress;
  
  if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
    logWarning('Admin access denied', { ip: clientIP, url: req.url });
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }
  
  next();
};

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      user_agent: req.get('User-Agent'),
      user_id: req.user?.id
    };
    
    if (res.statusCode >= 400) {
      logWarning('HTTP Error', logData);
    }
  });
  
  next();
};

// API key validation middleware
export const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
  
  if (validApiKeys.length > 0 && !validApiKeys.includes(apiKey)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid API key'
    });
  }
  
  next();
};

// Content type validation
export const validateContentType = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    if (!req.is('application/json')) {
      return res.status(400).json({
        success: false,
        message: 'Content-Type must be application/json'
      });
    }
  }
  next();
};

// Request size limit
export const requestSizeLimit = (limit = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxSize = parseInt(limit.replace(/\D/g, '')) * (limit.includes('mb') ? 1024 * 1024 : 1024);
    
    if (contentLength > maxSize) {
      return res.status(413).json({
        success: false,
        message: 'Request entity too large'
      });
    }
    
    next();
  };
};

export default {
  corsOptions,
  rateLimiters,
  helmetConfig,
  adminIPWhitelist,
  requestLogger,
  validateApiKey,
  validateContentType,
  requestSizeLimit
}; 