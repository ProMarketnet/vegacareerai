# 🚀 Development Guide - VegaCareer AI

## 📋 Table of Contents
- [Quick Start](#quick-start)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Strategy](#testing-strategy)
- [Security Guidelines](#security-guidelines)
- [Performance Optimization](#performance-optimization)
- [Deployment Process](#deployment-process)
- [Monitoring & Debugging](#monitoring--debugging)

## 🏃‍♂️ Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- Redis (optional, for caching)
- Git

### Environment Setup
```bash
# Clone and install
git clone <repository>
cd vegacareerai
npm install

# Environment configuration
cp .env.example .env
# Edit .env with your API keys and database URL

# Database setup
npm run db:migrate
npm run db:generate

# Start development servers
npm run dev:full
```

## 🔄 Development Workflow

### Branch Strategy
```bash
main          # Production-ready code
develop       # Integration branch
feature/*     # Feature development
hotfix/*      # Critical fixes
release/*     # Release preparation
```

### Daily Workflow
```bash
# 1. Start development
npm run dev:full

# 2. Run tests during development
npm run test:watch

# 3. Before committing
npm run lint:fix
npm run format
npm run test:coverage

# 4. Commit with conventional commits
git commit -m "feat: add user authentication"
```

### Code Review Checklist
- [ ] Tests pass (`npm run test`)
- [ ] Code coverage > 70%
- [ ] No linting errors (`npm run lint`)
- [ ] Security audit clean (`npm run audit:security`)
- [ ] Performance impact assessed
- [ ] Documentation updated

## 📏 Code Standards

### File Structure
```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   ├── forms/          # Form components
│   └── widgets/        # Business logic widgets
├── hooks/              # Custom React hooks
├── services/           # API services
├── utils/              # Helper functions
├── middleware/         # Express middleware
└── types/              # TypeScript definitions

api/
├── routes/             # API route handlers
├── middleware/         # API middleware
├── services/           # Business logic
└── utils/              # API utilities
```

### Naming Conventions
```javascript
// Files: kebab-case
user-profile.js
credit-purchase.jsx

// Components: PascalCase
const UserProfile = () => {}
const CreditPurchase = () => {}

// Functions: camelCase
const getUserCredits = () => {}
const processPayment = () => {}

// Constants: SCREAMING_SNAKE_CASE
const API_BASE_URL = 'https://api.example.com'
const MAX_RETRY_ATTEMPTS = 3
```

### API Design Standards
```javascript
// ✅ Good API Response
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "timestamp": "2024-01-01T00:00:00Z"
}

// ✅ Good Error Response
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ],
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## 🧪 Testing Strategy

### Test Types
1. **Unit Tests** - Individual functions/components
2. **Integration Tests** - API endpoints
3. **E2E Tests** - User workflows
4. **Performance Tests** - Load testing

### Testing Commands
```bash
npm run test              # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
npm run test:ci           # CI/CD pipeline
```

### Test Structure
```javascript
// tests/api/llm-query.test.js
import request from 'supertest';
import app from '../../api/simple-server.js';
import { mockUser, expectSuccessResponse } from '../setup.js';

describe('LLM Query API', () => {
  describe('POST /api/llm/query', () => {
    it('should process valid LLM query', async () => {
      const response = await request(app)
        .post('/api/llm/query')
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
          model: 'claude-3-haiku-20240307'
        });
      
      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('response');
    });
  });
});
```

### Coverage Requirements
- **Minimum**: 70% overall coverage
- **Critical paths**: 90% coverage (payments, auth)
- **New features**: 80% coverage required

## 🔒 Security Guidelines

### Input Validation
```javascript
import { validate, schemas } from '../utils/validation.js';

// Always validate inputs
app.post('/api/llm/query', 
  validate(schemas.llmQuery),
  async (req, res) => {
    // req.body is now validated and sanitized
  }
);
```

### Security Headers
```javascript
import { helmetConfig, corsOptions } from '../middleware/security.js';

app.use(helmetConfig);
app.use(cors(corsOptions));
```

### Rate Limiting
```javascript
import { rateLimiters } from '../middleware/security.js';

// Apply appropriate rate limits
app.use('/api/llm', rateLimiters.llmQuery);
app.use('/api/stripe', rateLimiters.payment);
```

### Environment Variables
```bash
# ✅ Good - Specific and descriptive
ANTHROPIC_API_KEY=sk-ant-api03-...
DATABASE_URL=postgresql://...
STRIPE_SECRET_KEY=sk_live_...

# ❌ Bad - Generic or exposed
API_KEY=secret123
DB_PASSWORD=password
```

## ⚡ Performance Optimization

### Database Optimization
```sql
-- Add indexes for common queries
CREATE INDEX CONCURRENTLY idx_llm_usage_user_created 
ON llm_usage(user_id, created_at DESC);

-- Monitor slow queries
EXPLAIN ANALYZE SELECT * FROM llm_usage 
WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10;
```

### API Optimization
```javascript
// Response caching
app.get('/api/llm/providers', 
  cache('5 minutes'),
  getProviders
);

// Request compression
app.use(compression());

// Connection pooling
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Frontend Optimization
```javascript
// Code splitting
const CreditPurchase = lazy(() => import('./CreditPurchase'));

// Memoization
const ExpensiveComponent = memo(({ data }) => {
  const processedData = useMemo(() => 
    processData(data), [data]
  );
  return <div>{processedData}</div>;
});
```

## 🚀 Deployment Process

### Pre-deployment Checklist
- [ ] All tests pass
- [ ] Security audit clean
- [ ] Performance benchmarks met
- [ ] Database migrations ready
- [ ] Environment variables configured
- [ ] Monitoring alerts configured

### Deployment Commands
```bash
# Production build
npm run build

# Database migration
npm run db:migrate

# Deploy to Vercel
vercel --prod

# Health check
curl https://vegacareer.app/api/health
```

### Rollback Strategy
```bash
# Quick rollback
vercel rollback

# Database rollback (if needed)
npx prisma migrate reset
```

## 📊 Monitoring & Debugging

### Logging
```javascript
import { logInfo, logError, logLLMUsage } from '../utils/logger.js';

// Structured logging
logInfo('User action', { 
  user_id: userId, 
  action: 'credit_purchase',
  amount: 100 
});

// Error logging with context
logError(error, { 
  endpoint: '/api/llm/query',
  user_id: userId,
  request_id: requestId 
});
```

### Health Monitoring
```javascript
// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    environment: process.env.NODE_ENV,
    database: 'connected', // Check DB connection
    redis: 'connected'     // Check Redis connection
  });
});
```

### Performance Monitoring
```javascript
// Response time tracking
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      logWarning('Slow request', {
        url: req.url,
        method: req.method,
        duration: `${duration}ms`
      });
    }
  });
  next();
});
```

### Debug Commands
```bash
# View logs
npm run logs:error
npm run logs:combined

# Database inspection
npm run db:studio

# Performance profiling
node --inspect api/simple-server.js
```

## 🔧 Development Tools

### Recommended VS Code Extensions
- ESLint
- Prettier
- Thunder Client (API testing)
- GitLens
- Error Lens

### Git Hooks (Husky)
```bash
# Install husky
npm install --save-dev husky

# Pre-commit hook
npx husky add .husky/pre-commit "npm run lint && npm run test"
```

### Environment Management
```bash
# Development
NODE_ENV=development

# Staging
NODE_ENV=staging

# Production
NODE_ENV=production
```

## 📚 Additional Resources

- [API Documentation](./API_DOCUMENTATION.md)
- [Database Schema](./database/schema.sql)
- [Security Guidelines](./SECURITY.md)
- [Deployment Guide](./DEPLOYMENT.md)

---

**Remember**: Always prioritize security, performance, and maintainability in your development process. When in doubt, ask for a code review! 