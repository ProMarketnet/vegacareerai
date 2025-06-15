import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'LLM Credit System API is running!',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      llm: '/api/llm/*',
      auth: '/api/auth/*',
      credits: '/api/credits/*',
      users: '/api/users/*'
    }
  });
});

// Import and use route handlers
try {
  // Import the LLM gateway Express router
  const { default: llmGateway } = await import('./llm-gateway-express.js');
  app.use('/api/llm', llmGateway);
  console.log('✅ LLM Gateway loaded');
} catch (error) {
  console.warn('⚠️  LLM Gateway not loaded:', error.message);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 LLM Credit System API Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`💾 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   GET  /api/test - API test`);
  console.log(`   POST /api/llm/query - LLM queries`);
  console.log(`   GET  /api/llm/providers - Available providers`);
});

export default app; 