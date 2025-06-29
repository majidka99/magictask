import express from 'express';
import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService, registerSchema, loginSchema, passwordResetSchema, resetPasswordSchema, TokenPayload } from './auth.service.js';

const router = express.Router();

// Rate limiting configuration
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    error: 'Too many authentication attempts, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many authentication attempts, please try again later',
      retryAfter: '15 minutes'
    });
  }
});

// Apply rate limiting to sensitive endpoints
router.use('/login', authRateLimit);
router.use('/register', authRateLimit);
router.use('/forgot-password', authRateLimit);
router.use('/reset-password', authRateLimit);

// Helper function to get device info from request
const getDeviceInfo = (req: Request) => ({
  userAgent: req.get('User-Agent') || 'Unknown',
  acceptLanguage: req.get('Accept-Language'),
  platform: req.get('Sec-CH-UA-Platform'),
  mobile: req.get('Sec-CH-UA-Mobile') === '?1'
});

// Helper function to get client IP
const getClientIP = (req: Request): string => {
  return (
    req.get('X-Forwarded-For')?.split(',')[0] ||
    req.get('X-Real-IP') ||
    req.socket.remoteAddress ||
    'unknown'
  );
};

/**
 * POST /api/auth/register
 * Register new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const user = await AuthService.register(req.body);
    
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        role: user.role,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      });
    }
    
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Registration failed'
    });
  }
});

/**
 * POST /api/auth/login
 * User login
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const deviceInfo = getDeviceInfo(req);
    const ipAddress = getClientIP(req);
    
    const { accessToken, refreshToken, user } = await AuthService.login(
      req.body,
      deviceInfo,
      ipAddress
    );
    
    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        role: user.role,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      });
    }
    
    res.status(401).json({
      error: error instanceof Error ? error.message : 'Login failed'
    });
  }
});

/**
 * POST /api/auth/logout
 * User logout (revoke session)
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const token = req.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const payload = await AuthService.verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    await AuthService.logout(payload.jti);
    
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }
    
    const deviceInfo = getDeviceInfo(req);
    const ipAddress = getClientIP(req);
    
    const tokens = await AuthService.refreshToken(refreshToken, deviceInfo, ipAddress);
    
    res.json({
      message: 'Token refreshed successfully',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: tokens.user.id,
        email: tokens.user.email,
        firstName: tokens.user.firstName,
        lastName: tokens.user.lastName,
        displayName: tokens.user.displayName,
        role: tokens.user.role,
        emailVerified: tokens.user.emailVerified
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      error: error instanceof Error ? error.message : 'Token refresh failed'
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const validated = passwordResetSchema.parse(req.body);
    
    const token = await AuthService.generatePasswordResetToken(validated.email);
    
    // TODO: Send email with reset link
    // For now, log the token (remove in production)
    console.log(`Password reset token for ${validated.email}: ${token}`);
    
    // Always return success to prevent email enumeration
    res.json({
      message: 'If an account with this email exists, a password reset link has been sent.'
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      });
    }
    
    // Always return success to prevent email enumeration
    res.json({
      message: 'If an account with this email exists, a password reset link has been sent.'
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    await AuthService.resetPassword(req.body);
    
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Password reset error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      });
    }
    
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Password reset failed'
    });
  }
});

/**
 * GET /api/auth/verify-email
 * Verify email address (placeholder)
 */
router.get('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Verification token is required' });
    }
    
    // TODO: Implement email verification logic
    res.json({ message: 'Email verification endpoint - to be implemented' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(400).json({ error: 'Email verification failed' });
  }
});

/**
 * POST /api/auth/resend-verification
 * Resend verification email (placeholder)
 */
router.post('/resend-verification', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // TODO: Implement resend verification logic
    res.json({ message: 'Verification email resent (if account exists)' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

// Middleware to authenticate JWT token
export const authenticateToken = async (req: Request & { user?: TokenPayload }, res: Response, next: Function) => {
  try {
    const authHeader = req.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    if (!token) {
      return res.status(401).json({ error: 'Access token is required' });
    }
    
    const payload = await AuthService.verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    req.user = payload;
    next();
  } catch (error) {
    console.error('Token authentication error:', error);
    res.status(401).json({ error: 'Token authentication failed' });
  }
};

// Middleware to check user role
export const requireRole = (role: 'admin' | 'user') => {
  return (req: Request & { user?: TokenPayload }, res: Response, next: Function) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (req.user.role !== role && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

export default router;
