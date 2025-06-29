import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { query, queryOne } from '../../db/pool.js';

// Environment variables validation
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key';
const BCRYPT_ROUNDS = 12;

// Zod validation schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  displayName: z.string().max(150).optional()
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

export const passwordResetSchema = z.object({
  email: z.string().email('Invalid email format')
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

// Types
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  role: 'user' | 'admin';
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

export interface TokenPayload {
  userId: number;
  email: string;
  role: 'user' | 'admin';
  jti: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface SessionInfo {
  id: number;
  deviceInfo?: any;
  ipAddress?: string;
  createdAt: Date;
  expiresAt: Date;
}

export class AuthService {
  /**
   * Validate password strength
   */
  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT tokens (access and refresh)
   */
  static async generateTokens(user: User, deviceInfo?: any, ipAddress?: string): Promise<AuthTokens> {
    const jti = crypto.randomUUID();
    
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      jti
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: '15m',
      issuer: 'majitask-api',
      audience: 'majitask-app'
    });

    const refreshToken = jwt.sign(
      { userId: user.id, jti },
      JWT_REFRESH_SECRET,
      {
        expiresIn: '7d',
        issuer: 'majitask-api',
        audience: 'majitask-app'
      }
    );

    // Store session in database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await query(
      `INSERT INTO user_sessions (user_id, token_jti, device_info, ip_address, expires_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [user.id, jti, JSON.stringify(deviceInfo), ipAddress, expiresAt]
    );

    return {
      accessToken,
      refreshToken,
      user
    };
  }

  /**
   * Verify JWT token and check blacklist
   */
  static async verifyToken(token: string): Promise<TokenPayload | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
      
      // Check if token is blacklisted (session revoked)
      const session = await queryOne(
        'SELECT revoked_at FROM user_sessions WHERE token_jti = ? AND expires_at > NOW()',
        [decoded.jti]
      );

      if (!session || session.revoked_at) {
        return null;
      }

      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Verify refresh token
   */
  static async verifyRefreshToken(token: string): Promise<{ userId: number; jti: string } | null> {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as { userId: number; jti: string };
      
      // Check if session exists and is not revoked
      const session = await queryOne(
        'SELECT id FROM user_sessions WHERE token_jti = ? AND expires_at > NOW() AND revoked_at IS NULL',
        [decoded.jti]
      );

      return session ? decoded : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Register new user
   */
  static async register(data: z.infer<typeof registerSchema>): Promise<User> {
    // Validate input
    const validated = registerSchema.parse(data);
    
    // Validate password strength
    const passwordValidation = this.validatePassword(validated.password);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Check if user already exists
    const existingUser = await queryOne(
      'SELECT id FROM users WHERE email = ?',
      [validated.email.toLowerCase()]
    );

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await this.hashPassword(validated.password);

    // Create user
    const [result] = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, display_name) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        validated.email.toLowerCase(),
        passwordHash,
        validated.firstName,
        validated.lastName,
        validated.displayName || `${validated.firstName} ${validated.lastName}`
      ]
    );

    // Get created user
    const user = await queryOne<User>(
      'SELECT id, email, first_name as firstName, last_name as lastName, display_name as displayName, role, is_active as isActive, email_verified as emailVerified, created_at as createdAt, updated_at as updatedAt FROM users WHERE id = ?',
      [(result as any).insertId]
    );

    if (!user) {
      throw new Error('Failed to create user');
    }

    return user;
  }

  /**
   * Login user
   */
  static async login(data: z.infer<typeof loginSchema>, deviceInfo?: any, ipAddress?: string): Promise<AuthTokens> {
    const validated = loginSchema.parse(data);

    // Get user
    const user = await queryOne<User & { password_hash: string }>(
      `SELECT id, email, password_hash, first_name as firstName, last_name as lastName, 
       display_name as displayName, role, is_active as isActive, email_verified as emailVerified, 
       created_at as createdAt, updated_at as updatedAt 
       FROM users WHERE email = ? AND is_active = TRUE`,
      [validated.email.toLowerCase()]
    );

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(validated.password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    // Remove password hash from user object
    const { password_hash, ...userWithoutPassword } = user;

    return this.generateTokens(userWithoutPassword, deviceInfo, ipAddress);
  }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string, deviceInfo?: any, ipAddress?: string): Promise<AuthTokens> {
    const decoded = await this.verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new Error('Invalid refresh token');
    }

    // Get user
    const user = await queryOne<User>(
      `SELECT id, email, first_name as firstName, last_name as lastName, 
       display_name as displayName, role, is_active as isActive, email_verified as emailVerified, 
       created_at as createdAt, updated_at as updatedAt 
       FROM users WHERE id = ? AND is_active = TRUE`,
      [decoded.userId]
    );

    if (!user) {
      throw new Error('User not found or inactive');
    }

    // Revoke old session
    await query(
      'UPDATE user_sessions SET revoked_at = NOW() WHERE token_jti = ?',
      [decoded.jti]
    );

    return this.generateTokens(user, deviceInfo, ipAddress);
  }

  /**
   * Logout user (revoke session)
   */
  static async logout(jti: string): Promise<void> {
    await query(
      'UPDATE user_sessions SET revoked_at = NOW() WHERE token_jti = ?',
      [jti]
    );
  }

  /**
   * Generate password reset token
   */
  static async generatePasswordResetToken(email: string): Promise<string> {
    const user = await queryOne(
      'SELECT id FROM users WHERE email = ? AND is_active = TRUE',
      [email.toLowerCase()]
    );

    if (!user) {
      // Don't reveal if user exists
      return crypto.randomBytes(32).toString('hex');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate previous reset tokens
    await query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL',
      [user.id]
    );

    // Create new reset token
    await query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, token, expiresAt]
    );

    return token;
  }

  /**
   * Reset password using token
   */
  static async resetPassword(data: z.infer<typeof resetPasswordSchema>): Promise<void> {
    const validated = resetPasswordSchema.parse(data);

    // Validate password strength
    const passwordValidation = this.validatePassword(validated.password);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Find valid reset token
    const resetToken = await queryOne(
      `SELECT rt.user_id, rt.id 
       FROM password_reset_tokens rt 
       WHERE rt.token = ? AND rt.expires_at > NOW() AND rt.used_at IS NULL`,
      [validated.token]
    );

    if (!resetToken) {
      throw new Error('Invalid or expired reset token');
    }

    // Hash new password
    const passwordHash = await this.hashPassword(validated.password);

    // Update password and mark token as used
    await query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [passwordHash, resetToken.user_id]
    );

    await query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?',
      [resetToken.id]
    );

    // Revoke all sessions for this user (force re-login)
    await query(
      'UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
      [resetToken.user_id]
    );
  }

  /**
   * Get user sessions
   */
  static async getUserSessions(userId: number): Promise<SessionInfo[]> {
    const sessions = await query<SessionInfo>(
      `SELECT id, device_info as deviceInfo, ip_address as ipAddress, 
       created_at as createdAt, expires_at as expiresAt 
       FROM user_sessions 
       WHERE user_id = ? AND expires_at > NOW() AND revoked_at IS NULL 
       ORDER BY created_at DESC`,
      [userId]
    );

    return sessions;
  }

  /**
   * Revoke specific session
   */
  static async revokeSession(userId: number, sessionId: number): Promise<void> {
    await query(
      'UPDATE user_sessions SET revoked_at = NOW() WHERE id = ? AND user_id = ?',
      [sessionId, userId]
    );
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: number): Promise<User | null> {
    return queryOne<User>(
      `SELECT id, email, first_name as firstName, last_name as lastName, 
       display_name as displayName, role, is_active as isActive, email_verified as emailVerified, 
       created_at as createdAt, updated_at as updatedAt, last_login as lastLogin 
       FROM users WHERE id = ? AND is_active = TRUE`,
      [id]
    );
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: number, updates: {
    firstName?: string;
    lastName?: string;
    displayName?: string;
  }): Promise<User | null> {
    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.firstName) {
      updateFields.push('first_name = ?');
      values.push(updates.firstName);
    }

    if (updates.lastName) {
      updateFields.push('last_name = ?');
      values.push(updates.lastName);
    }

    if (updates.displayName) {
      updateFields.push('display_name = ?');
      values.push(updates.displayName);
    }

    if (updateFields.length === 0) {
      return this.getUserById(userId);
    }

    values.push(userId);

    await query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );

    return this.getUserById(userId);
  }

  /**
   * Change user password
   */
  static async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    // Get current password hash
    const user = await queryOne<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = ? AND is_active = TRUE',
      [userId]
    );

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValidPassword = await this.verifyPassword(currentPassword, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password strength
    const passwordValidation = this.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Hash new password
    const passwordHash = await this.hashPassword(newPassword);

    // Update password
    await query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [passwordHash, userId]
    );

    // Revoke all sessions except current one would be handled in the route
  }
}

// Authentication middleware for protecting routes
export const authenticateToken = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }
    
    const decoded = AuthService.verifyToken(token);
    
    // Check if token is blacklisted (revoked session)
    const session = await query(
      'SELECT id FROM user_sessions WHERE token_jti = ? AND revoked_at IS NULL AND expires_at > NOW()',
      [decoded.jti]
    );
    
    if (session.length === 0) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }
    
    // Update last used timestamp
    await query(
      'UPDATE user_sessions SET last_used_at = NOW() WHERE token_jti = ?',
      [decoded.jti]
    );
    
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: error instanceof Error ? error.message : 'Invalid token' });
  }
};

// Admin-only middleware
export const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// User self-access or admin middleware
export const requireSelfOrAdmin = (req: any, res: any, next: any) => {
  const targetUserId = parseInt(req.params.userId || req.params.id);
  if (req.user.userId !== targetUserId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};
