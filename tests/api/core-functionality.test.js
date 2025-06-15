import request from 'supertest';
import app from '../../api/production-server.js';
import { 
  mockUser, 
  mockLLMResponse, 
  mockStripePaymentIntent,
  expectSuccessResponse,
  expectErrorResponse,
  generateTestLLMRequest
} from '../setup.js';

describe('Core Functionality Tests', () => {
  
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health');
      
      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('status', 'OK');
      expect(response.body.data).toHaveProperty('service');
    });
  });

  describe('LLM Providers', () => {
    it('should return available LLM providers', async () => {
      const response = await request(app)
        .get('/api/llm/providers');
      
      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Check provider structure
      const provider = response.body.data[0];
      expect(provider).toHaveProperty('id');
      expect(provider).toHaveProperty('name');
      expect(provider).toHaveProperty('models');
      expect(Array.isArray(provider.models)).toBe(true);
    });
  });

  describe('LLM Query Processing', () => {
    it('should process valid LLM query', async () => {
      const testRequest = generateTestLLMRequest();
      
      const response = await request(app)
        .post('/api/llm/query')
        .send(testRequest);
      
      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('response');
      expect(response.body.data).toHaveProperty('usage');
      expect(response.body.data).toHaveProperty('model');
      expect(response.body.data.usage).toHaveProperty('total_tokens');
      expect(response.body.data.usage).toHaveProperty('credits_consumed');
    });

    it('should reject invalid LLM query - missing messages', async () => {
      const response = await request(app)
        .post('/api/llm/query')
        .send({
          model: 'claude-3-haiku-20240307'
          // missing messages
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation failed');
    });

    it('should reject invalid LLM query - missing model', async () => {
      const response = await request(app)
        .post('/api/llm/query')
        .send({
          messages: [{ role: 'user', content: 'Hello' }]
          // missing model
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should sanitize malicious input', async () => {
      const maliciousRequest = {
        messages: [
          { 
            role: 'user', 
            content: '<script>alert("xss")</script>DROP TABLE users; SELECT * FROM secrets;' 
          }
        ],
        model: 'claude-3-haiku-20240307'
      };
      
      const response = await request(app)
        .post('/api/llm/query')
        .send(maliciousRequest);
      
      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      // Response should not contain the malicious script
      expect(response.body.data.response).not.toContain('<script>');
      expect(response.body.data.response).not.toContain('DROP TABLE');
    });

    it('should handle rate limiting', async () => {
      const testRequest = generateTestLLMRequest();
      
      // Make multiple rapid requests to trigger rate limiting
      const requests = Array(12).fill().map(() => 
        request(app)
          .post('/api/llm/query')
          .send(testRequest)
      );
      
      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Credit Packages', () => {
    it('should return available credit packages', async () => {
      const response = await request(app)
        .get('/api/stripe/packages');
      
      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Check package structure
      const creditPackage = response.body.data[0];
      expect(creditPackage).toHaveProperty('id');
      expect(creditPackage).toHaveProperty('name');
      expect(creditPackage).toHaveProperty('credits');
      expect(creditPackage).toHaveProperty('price');
      expect(creditPackage).toHaveProperty('stripe_price_id');
    });
  });

  describe('Payment Processing', () => {
    it('should create payment intent for valid package', async () => {
      const paymentRequest = {
        package_id: 'starter',
        user_id: mockUser.id
      };
      
      const response = await request(app)
        .post('/api/stripe/create-payment-intent')
        .send(paymentRequest);
      
      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('payment_intent');
      expect(response.body.data.payment_intent).toHaveProperty('client_secret');
    });

    it('should reject payment intent with invalid package', async () => {
      const paymentRequest = {
        package_id: 'invalid-package',
        user_id: mockUser.id
      };
      
      const response = await request(app)
        .post('/api/stripe/create-payment-intent')
        .send(paymentRequest);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject payment intent without user_id', async () => {
      const paymentRequest = {
        package_id: 'starter'
        // missing user_id
      };
      
      const response = await request(app)
        .post('/api/stripe/create-payment-intent')
        .send(paymentRequest);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation failed');
    });

    it('should handle payment verification', async () => {
      const verificationRequest = {
        payment_intent_id: 'pi_test_123456789'
      };
      
      const response = await request(app)
        .post('/api/stripe/verify-payment')
        .send(verificationRequest);
      
      // Should handle the request (may succeed or fail based on Stripe response)
      expect([200, 400].includes(response.status)).toBe(true);
    });
  });

  describe('Security Features', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/health');
      
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });

    it('should reject requests with invalid content type', async () => {
      const response = await request(app)
        .post('/api/llm/query')
        .set('Content-Type', 'text/plain')
        .send('invalid data');
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle large payloads appropriately', async () => {
      const largeContent = 'A'.repeat(50000); // 50KB content
      const largeRequest = {
        messages: [{ role: 'user', content: largeContent }],
        model: 'claude-3-haiku-20240307'
      };
      
      const response = await request(app)
        .post('/api/llm/query')
        .send(largeRequest);
      
      // Should either process or reject gracefully
      expect([200, 400, 413].includes(response.status)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 routes gracefully', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint');
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/llm/query')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');
      
      expect(response.status).toBe(400);
    });
  });

  describe('Performance', () => {
    it('should respond to health check quickly', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/health');
      
      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle concurrent requests', async () => {
      const testRequest = generateTestLLMRequest();
      
      // Make 5 concurrent requests
      const requests = Array(5).fill().map(() => 
        request(app)
          .post('/api/llm/query')
          .send(testRequest)
      );
      
      const responses = await Promise.all(requests);
      
      // All requests should complete (some may be rate limited)
      responses.forEach(response => {
        expect([200, 429].includes(response.status)).toBe(true);
      });
    });
  });
}); 