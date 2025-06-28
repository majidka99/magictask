import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import emailRoutes from './routes/emailRoutes.js';

// Load environment variables from the parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log('🔧 Environment loaded:', {
  SMTP_HOST: process.env.SMTP_HOST || 'NOT SET',
  SMTP_USER: process.env.SMTP_USER || 'NOT SET',
  SMTP_PASS: process.env.SMTP_PASS ? 'SET' : 'NOT SET',
  NODE_ENV: process.env.NODE_ENV || 'NOT SET'
});

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for React app
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://app.majitask.fun', 'https://majitask.fun'] 
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Rate limiting for email API
const emailLimiter = rateLimit({
  windowMs: parseInt(process.env.EMAIL_RATE_WINDOW) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.EMAIL_RATE_LIMIT) || 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many email requests from this IP, please try again later.'
  }
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/email', emailLimiter, emailRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'MajiTask Full-Stack Application'
  });
});

// Serve static files from the dist directory (built React app)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'dist')));
  
  // Handle client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  });
} else {
  // In development, just provide a simple response for non-API routes
  app.get('/', (req, res) => {
    res.json({
      message: 'MajiTask Backend API',
      dev: 'In development mode. Frontend should be running on port 5173',
      endpoints: {
        health: '/api/health',
        email: '/api/email/*'
      }
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MajiTask server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📮 Email API: http://localhost:${PORT}/api/email`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
  } else {
    console.log(`🛠️  Development mode: Frontend should run separately on port 5173`);
  }
});
