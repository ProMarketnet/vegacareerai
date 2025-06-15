import '@testing-library/jest-dom';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.PERPLEXITY_API_KEY = 'test-perplexity-key';
process.env.STRIPE_SECRET_KEY = 'sk_test_123';
process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_123';

// Mock console methods in tests
global.console = {
  ...console,
  // Uncomment to suppress console.log in tests
  // log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Mock fetch globally
global.fetch = jest.fn();

// Mock timers
jest.useFakeTimers();

// Common test utilities
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  credits: 100
};

export const mockLLMResponse = {
  choices: [{
    message: {
      role: 'assistant',
      content: 'This is a test response'
    }
  }],
  usage: {
    prompt_tokens: 10,
    completion_tokens: 20,
    total_tokens: 30
  },
  model: 'test-model',
  response_time_ms: 500,
  request_id: 'test-request-id'
};

export const mockStripePaymentIntent = {
  id: 'pi_test_123',
  amount: 1000,
  currency: 'usd',
  status: 'succeeded',
  metadata: {
    user_id: 'test-user-id',
    credits: '100'
  }
};

// Database mock helpers
export const mockDatabase = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  creditTransaction: {
    create: jest.fn(),
    findMany: jest.fn()
  },
  llmUsage: {
    create: jest.fn(),
    findMany: jest.fn()
  }
};

// API response helpers
export const expectSuccessResponse = (response) => {
  expect(response.body).toHaveProperty('success', true);
  expect(response.body).toHaveProperty('data');
  expect(response.body).toHaveProperty('timestamp');
};

export const expectErrorResponse = (response, statusCode = 500) => {
  expect(response.status).toBe(statusCode);
  expect(response.body).toHaveProperty('success', false);
  expect(response.body).toHaveProperty('message');
  expect(response.body).toHaveProperty('timestamp');
};

// Test data generators
export const generateTestUser = (overrides = {}) => ({
  id: 'test-user-' + Math.random().toString(36).substr(2, 9),
  email: `test${Math.random().toString(36).substr(2, 5)}@example.com`,
  name: 'Test User',
  credits: 100,
  created_at: new Date(),
  ...overrides
});

export const generateTestLLMRequest = (overrides = {}) => ({
  messages: [{ role: 'user', content: 'Test message' }],
  model: 'claude-3-haiku-20240307',
  max_tokens: 1000,
  temperature: 0.7,
  ...overrides
});

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
  fetch.mockClear();
});

// Cleanup after all tests
afterAll(() => {
  jest.restoreAllMocks();
}); 