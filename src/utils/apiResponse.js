import { logError, logInfo } from './logger.js';

// Standard API response structure
export class ApiResponse {
  constructor(success = true, data = null, message = '', errors = []) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.errors = errors;
    this.timestamp = new Date().toISOString();
  }

  static success(data, message = 'Success') {
    return new ApiResponse(true, data, message);
  }

  static error(message, errors = [], statusCode = 500) {
    const response = new ApiResponse(false, null, message, errors);
    response.statusCode = statusCode;
    return response;
  }

  static validationError(errors) {
    return new ApiResponse(false, null, 'Validation failed', errors);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiResponse(false, null, message, [], 401);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiResponse(false, null, message, [], 403);
  }

  static notFound(message = 'Resource not found') {
    return new ApiResponse(false, null, message, [], 404);
  }

  static rateLimited(message = 'Rate limit exceeded') {
    return new ApiResponse(false, null, message, [], 429);
  }

  static insufficientCredits(required, available) {
    return new ApiResponse(false, {
      required_credits: required,
      available_credits: available
    }, 'Insufficient credits', [], 402);
  }
}

// Error handler middleware
export const errorHandler = (error, req, res, next) => {
  logError(error, {
    url: req.url,
    method: req.method,
    user_id: req.user?.id,
    ip: req.ip
  });

  // Handle specific error types
  if (error.name === 'ValidationError') {
    const response = ApiResponse.validationError(error.details);
    return res.status(400).json(response);
  }

  if (error.name === 'UnauthorizedError') {
    const response = ApiResponse.unauthorized();
    return res.status(401).json(response);
  }

  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    const response = ApiResponse.rateLimited();
    return res.status(429).json(response);
  }

  if (error.code === 'INSUFFICIENT_CREDITS') {
    const response = ApiResponse.insufficientCredits(
      error.required,
      error.available
    );
    return res.status(402).json(response);
  }

  // Default server error
  const response = ApiResponse.error(
    process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message
  );
  
  res.status(500).json(response);
};

// Success response helper
export const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  const response = ApiResponse.success(data, message);
  logInfo('API Success', {
    status: statusCode,
    message,
    data_type: typeof data
  });
  res.status(statusCode).json(response);
};

// Error response helper
export const sendError = (res, message, statusCode = 500, errors = []) => {
  const response = ApiResponse.error(message, errors, statusCode);
  res.status(statusCode).json(response);
}; 