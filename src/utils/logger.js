import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'vega-career-ai' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Structured logging methods
export const logError = (error, context = {}) => {
  logger.error({
    message: error.message,
    stack: error.stack,
    ...context
  });
};

export const logInfo = (message, data = {}) => {
  logger.info({ message, ...data });
};

export const logWarning = (message, data = {}) => {
  logger.warn({ message, ...data });
};

export const logLLMUsage = (usage) => {
  logger.info('LLM Usage', {
    provider: usage.provider,
    model: usage.model,
    tokens: usage.total_tokens,
    credits: usage.credits_consumed,
    response_time: usage.response_time_ms,
    user_id: usage.user_id
  });
};

export const logPayment = (payment) => {
  logger.info('Payment Event', {
    event_type: payment.event_type,
    amount: payment.amount,
    user_id: payment.user_id,
    payment_intent_id: payment.payment_intent_id
  });
};

export default logger; 