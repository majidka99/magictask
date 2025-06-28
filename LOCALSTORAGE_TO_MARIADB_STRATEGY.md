# 🚀 MajiTask: Complete System Migration & Enhancement Strategy
## LocalStorage → MariaDB + Full Authentication & Admin System

## Current Architecture Analysis

### ✅ What We Have:
- **Complex Task Data Structure**: Rich tasks with subtasks, comments, recurrence, location, time tracking
- **Real-time Persistence**: Every change immediately saved to localStorage
- **Offline-First**: Works without internet connection
- **Advanced Features**: Recurring tasks, email notifications, backup/restore, hierarchical tasks
- **Production Deployment**: Ansible-based deployment with Nginx, Let's Encrypt, systemd
- **Domain Ready**: app.majitask.fun configured with backend port 3863

### 🎯 Enhanced Migration Goals:
1. **🔐 Multi-User Authentication** - Secure registration, login, JWT, password reset
2. **👥 User Management** - Profile management, role-based access (user/admin)
3. **🛠️ Admin Dashboard** - Complete user administration, analytics, audit logging
4. **🔄 Cross-device Sync** - Same tasks on all devices/browsers per user
5. **💾 Data Persistence** - No data loss on browser clear/reinstall
6. **🔒 Security** - Proper authentication, authorization, password management
7. **📈 Scalability** - Support future enterprise features
8. **⚡ Performance** - Fast loading and updates
9. **🛡️ Reliability** - Robust error handling and offline support
10. **🎯 Zero Downtime** - Seamless migration without service interruption

## 🚀 **Migration Strategy Options**

### **Option 1: Big Bang Migration (High Risk)**
- Replace all localStorage calls with API calls at once
- **Pros**: Clean, complete solution
- **Cons**: High risk, complex rollback, potential data loss

### **Option 2: Gradual Hybrid Approach (RECOMMENDED)**
- Implement dual-mode support (localStorage + API)
- Phase out localStorage gradually
- **Pros**: Safe, testable, rollback friendly
- **Cons**: More complex code temporarily

### **Option 3: Background Sync (Medium Risk)**
- Keep localStorage as primary, sync to DB in background
- **Pros**: Maintains offline-first approach
- **Cons**: Complex conflict resolution

## 🏗️ **Enhanced Implementation: Multi-User + Hybrid Approach**

## 🏗️ **Complete Implementation: Multi-User System + Hybrid Migration**

### **Phase 1: Authentication & User Management Foundation** 
#### **1.1 Enhanced Database Schema**
```sql
-- 👤 Users table (core authentication and profiles)
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  display_name VARCHAR(150),
  role ENUM('user', 'admin') DEFAULT 'user',
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token VARCHAR(255) NULL,
  last_password_change TIMESTAMP NULL,
  failed_login_attempts INT DEFAULT 0,
  locked_until TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_active (is_active),
  INDEX idx_verification_token (email_verification_token)
);

-- 🔑 Password reset tokens (secure password recovery)
CREATE TABLE password_reset_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_token (token),
  INDEX idx_user_id (user_id),
  INDEX idx_expires (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 🎫 User sessions/JWT tokens (session management & security)
CREATE TABLE user_sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_jti VARCHAR(255) NOT NULL UNIQUE, -- JWT ID claim
  device_info JSON, -- {browser, os, device_type, screen_resolution}
  ip_address VARCHAR(45),
  location_info JSON, -- {country, city, timezone}
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP NULL,
  revoked_reason VARCHAR(100) NULL, -- 'logout', 'admin_revoke', 'expired', 'security'
  
  INDEX idx_user_id (user_id),
  INDEX idx_token_jti (token_jti),
  INDEX idx_expires (expires_at),
  INDEX idx_last_used (last_used_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 📋 Enhanced Tasks table (with user relationships and collaboration)
CREATE TABLE tasks (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL, -- Owner of the task
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status ENUM('todo', 'in-progress', 'done', 'cancelled') DEFAULT 'todo',
  priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  progress INT DEFAULT 0,
  category VARCHAR(100) NOT NULL,
  tags JSON,
  
  -- Dates (stored as TIMESTAMP for timezone support)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deadline TIMESTAMP NULL,
  start_date TIMESTAMP NULL,
  end_date TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  
  -- Hierarchy (nested tasks and subtasks)
  parent_id VARCHAR(36),
  subtask_ids JSON, -- Array of subtask IDs for quick access
  hierarchy_level INT DEFAULT 0, -- For performance optimization
  
  -- Location (stored as JSON for flexibility)
  location JSON, -- {address, coordinates: {lat, lng}, placeId, timezone}
  
  -- Recurrence (stored as JSON for complex patterns)
  is_template BOOLEAN DEFAULT FALSE,
  recurrence_rule JSON, -- {type, interval, days, until, count}
  template_id VARCHAR(36),
  next_due_date TIMESTAMP NULL,
  instance_number INT,
  
  -- Time tracking and estimation
  time_spent INT DEFAULT 0, -- minutes
  estimated_duration INT, -- minutes
  actual_duration INT, -- minutes (when completed)
  time_entries JSON, -- [{start, end, description, auto_tracked}]
  
  -- Collaboration and sharing (future feature ready)
  shared_with JSON, -- Array of user IDs who can view/edit
  created_by INT, -- Who created this task (for shared tasks)
  permission_level ENUM('view', 'edit', 'admin') DEFAULT 'edit',
  
  -- File attachments and links
  attachments JSON, -- [{filename, url, type, size, uploaded_by, uploaded_at}]
  external_links JSON, -- [{url, title, description}]
  
  -- Analytics and metadata
  view_count INT DEFAULT 0,
  edit_count INT DEFAULT 0,
  completion_streak INT DEFAULT 0,
  
  -- Indexes for performance
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_priority (priority),
  INDEX idx_deadline (deadline),
  INDEX idx_created_at (created_at),
  INDEX idx_parent_id (parent_id),
  INDEX idx_template_id (template_id),
  INDEX idx_created_by (created_by),
  INDEX idx_next_due_date (next_due_date),
  INDEX idx_category (category),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES tasks(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 💬 Enhanced Comments table (with user attribution and threading)
CREATE TABLE comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id VARCHAR(36) NOT NULL,
  user_id INT NOT NULL, -- Who wrote the comment
  parent_comment_id INT NULL, -- For threaded comments
  text TEXT NOT NULL,
  comment_type ENUM('comment', 'status_change', 'assignment', 'system') DEFAULT 'comment',
  metadata JSON, -- {old_status, new_status, mentioned_users, etc.}
  is_edited BOOLEAN DEFAULT FALSE,
  edit_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_task_id (task_id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_parent_comment_id (parent_comment_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- 📊 Admin audit log (comprehensive tracking of admin actions)
CREATE TABLE admin_audit_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admin_user_id INT NOT NULL,
  action VARCHAR(100) NOT NULL, -- 'user_created', 'password_reset', 'user_disabled', etc.
  target_user_id INT, -- User being acted upon
  target_resource_type VARCHAR(50), -- 'user', 'task', 'comment', 'system'
  target_resource_id VARCHAR(255), -- ID of the resource
  old_values JSON, -- Previous state for rollback capability
  new_values JSON, -- New state
  details JSON, -- Additional action details
  ip_address VARCHAR(45),
  user_agent TEXT,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_admin_user_id (admin_user_id),
  INDEX idx_target_user_id (target_user_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at),
  INDEX idx_target_resource (target_resource_type, target_resource_id),
  FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 📈 User analytics and statistics
CREATE TABLE user_statistics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  stat_date DATE NOT NULL,
  tasks_created INT DEFAULT 0,
  tasks_completed INT DEFAULT 0,
  time_tracked_minutes INT DEFAULT 0,
  login_count INT DEFAULT 0,
  most_productive_hour INT NULL, -- 0-23
  productivity_score DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_user_date (user_id, stat_date),
  INDEX idx_user_id (user_id),
  INDEX idx_stat_date (stat_date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 🔔 Notification preferences and queue
CREATE TABLE user_notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  notification_type VARCHAR(50) NOT NULL, -- 'task_due', 'task_assigned', 'system_alert'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  action_url VARCHAR(500) NULL,
  is_read BOOLEAN DEFAULT FALSE,
  delivered_via JSON, -- ['email', 'browser', 'mobile']
  metadata JSON, -- Additional context data
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP NULL,
  
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at),
  INDEX idx_notification_type (notification_type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 🏷️ Tag management and analytics
CREATE TABLE task_tags (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  tag_name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#6B7280', -- Hex color code
  usage_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_user_tag (user_id, tag_name),
  INDEX idx_user_id (user_id),
  INDEX idx_usage_count (usage_count),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert default admin user (run once)
INSERT INTO users (email, password_hash, first_name, last_name, display_name, role, email_verified) 
VALUES ('majitask.fun@gmail.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/6X6Zr6FQdBtKaVTTa', 'Admin', 'User', 'MajiTask Admin', 'admin', TRUE);
```

#### **1.2 Backend Authentication System (Express.js)**
```javascript
// 🔐 Authentication middleware and utilities
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const validator = require('validator');

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRES_IN = '15m'; // Short-lived access token
const JWT_REFRESH_EXPIRES_IN = '7d'; // Longer refresh token

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs for auth
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Password validation rules
const passwordRules = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true
};

// 🛡️ Authentication utilities
class AuthService {
  static async hashPassword(password) {
    return await bcrypt.hash(password, 12);
  }
  
  static async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }
  
  static validatePassword(password) {
    if (password.length < passwordRules.minLength) {
      throw new Error(`Password must be at least ${passwordRules.minLength} characters long`);
    }
    if (passwordRules.requireUppercase && !/[A-Z]/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }
    if (passwordRules.requireLowercase && !/[a-z]/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }
    if (passwordRules.requireNumbers && !/\d/.test(password)) {
      throw new Error('Password must contain at least one number');
    }
    if (passwordRules.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new Error('Password must contain at least one special character');
    }
    return true;
  }
  
  static generateTokens(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      jti: crypto.randomUUID()
    };
    
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
    
    return { accessToken, refreshToken, jti: payload.jti };
  }
  
  static async verifyToken(token, secret = JWT_SECRET) {
    try {
      return jwt.verify(token, secret);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
}

// 🔒 Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }
    
    const decoded = await AuthService.verifyToken(token);
    
    // Check if token is blacklisted (revoked session)
    const session = await db.query(
      'SELECT id FROM user_sessions WHERE token_jti = ? AND revoked_at IS NULL AND expires_at > NOW()',
      [decoded.jti]
    );
    
    if (session.length === 0) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }
    
    // Update last used timestamp
    await db.query(
      'UPDATE user_sessions SET last_used_at = NOW() WHERE token_jti = ?',
      [decoded.jti]
    );
    
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
};

// 👑 Admin-only middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// 🔑 User self-access or admin middleware
const requireSelfOrAdmin = (req, res, next) => {
  const targetUserId = parseInt(req.params.userId || req.params.id);
  if (req.user.userId !== targetUserId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};
```

#### **1.3 Authentication API Endpoints**
```javascript
// 🔐 Authentication routes (/api/auth)
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password, firstName, lastName, displayName } = req.body;
    
    // Input validation
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    
    AuthService.validatePassword(password);
    
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }
    
    // Check if user already exists
    const existingUser = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'User already exists with this email' });
    }
    
    // Create user
    const passwordHash = await AuthService.hashPassword(password);
    const verificationToken = crypto.randomUUID();
    
    const result = await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, display_name, email_verification_token) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [email, passwordHash, firstName, lastName, displayName || `${firstName} ${lastName}`, verificationToken]
    );
    
    const userId = result.insertId;
    
    // Send verification email
    await emailService.sendVerificationEmail(email, verificationToken, firstName);
    
    // Log admin action if admin created this user
    if (req.user && req.user.role === 'admin') {
      await logAdminAction(req.user.userId, 'user_created', userId, null, { email, firstName, lastName }, req);
    }
    
    res.status(201).json({
      message: 'User created successfully. Please check your email for verification.',
      userId
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password, rememberMe = false } = req.body;
    const clientInfo = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      // Add device detection logic here
    };
    
    // Get user
    const users = await db.query(
      'SELECT * FROM users WHERE email = ? AND is_active = TRUE',
      [email]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const user = users[0];
    
    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({ 
        error: 'Account is temporarily locked due to multiple failed login attempts',
        lockedUntil: user.locked_until
      });
    }
    
    // Verify password
    const isValidPassword = await AuthService.verifyPassword(password, user.password_hash);
    
    if (!isValidPassword) {
      // Increment failed attempts
      const failedAttempts = user.failed_login_attempts + 1;
      const lockDuration = failedAttempts >= 5 ? 30 : 0; // Lock for 30 minutes after 5 failed attempts
      
      await db.query(
        `UPDATE users SET 
         failed_login_attempts = ?,
         locked_until = ${lockDuration > 0 ? 'DATE_ADD(NOW(), INTERVAL ? MINUTE)' : 'NULL'}
         WHERE id = ?`,
        lockDuration > 0 ? [failedAttempts, lockDuration, user.id] : [failedAttempts, user.id]
      );
      
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Generate tokens
    const { accessToken, refreshToken, jti } = AuthService.generateTokens(user);
    
    // Create session record
    await db.query(
      `INSERT INTO user_sessions (user_id, token_jti, device_info, ip_address, expires_at)
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
      [user.id, jti, JSON.stringify(clientInfo), req.ip]
    );
    
    // Reset failed login attempts and update last login
    await db.query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = ?',
      [user.id]
    );
    
    // Set secure HTTP-only cookie for refresh token if rememberMe
    if (rememberMe) {
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
    }
    
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        displayName: user.display_name,
        role: user.role,
        emailVerified: user.email_verified
      },
      accessToken,
      refreshToken: rememberMe ? undefined : refreshToken // Don't send in response if using cookie
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Revoke current session
    await db.query(
      'UPDATE user_sessions SET revoked_at = NOW(), revoked_reason = ? WHERE token_jti = ?',
      ['logout', req.user.jti]
    );
    
    // Clear refresh token cookie
    res.clearCookie('refreshToken');
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    
    // Check if user exists
    const users = await db.query('SELECT * FROM users WHERE email = ? AND is_active = TRUE', [email]);
    
    if (users.length === 0) {
      // Don't reveal if email exists or not
      return res.json({ message: 'If the email exists, a password reset link has been sent.' });
    }
    
    const user = users[0];
    const resetToken = crypto.randomUUID();
    
    // Store reset token (expires in 1 hour)
    await db.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at, ip_address, user_agent)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR), ?, ?)`,
      [user.id, resetToken, req.ip, req.get('User-Agent')]
    );
    
    // Send reset email
    await emailService.sendPasswordResetEmail(user.email, resetToken, user.first_name);
    
    res.json({ message: 'If the email exists, a password reset link has been sent.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    AuthService.validatePassword(newPassword);
    
    // Verify reset token
    const tokens = await db.query(
      `SELECT prt.*, u.email, u.first_name FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = ? AND prt.expires_at > NOW() AND prt.used_at IS NULL`,
      [token]
    );
    
    if (tokens.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    const resetToken = tokens[0];
    const passwordHash = await AuthService.hashPassword(newPassword);
    
    // Update password
    await db.query(
      'UPDATE users SET password_hash = ?, last_password_change = NOW() WHERE id = ?',
      [passwordHash, resetToken.user_id]
    );
    
    // Mark token as used
    await db.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?',
      [resetToken.id]
    );
    
    // Revoke all user sessions (force re-login everywhere)
    await db.query(
      'UPDATE user_sessions SET revoked_at = NOW(), revoked_reason = ? WHERE user_id = ? AND revoked_at IS NULL',
      ['password_reset', resetToken.user_id]
    );
    
    // Send confirmation email
    await emailService.sendPasswordChangeConfirmation(resetToken.email, resetToken.first_name);
    
    res.json({ message: 'Password reset successfully. Please log in with your new password.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }
    
    // Find user with this verification token
    const users = await db.query(
      'SELECT * FROM users WHERE email_verification_token = ? AND email_verified = FALSE',
      [token]
    );
    
    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid or already used verification token' });
    }
    
    const user = users[0];
    
    // Mark email as verified
    await db.query(
      'UPDATE users SET email_verified = TRUE, email_verification_token = NULL WHERE id = ?',
      [user.id]
    );
    
    res.json({ message: 'Email verified successfully. You can now fully use your account.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### **1.4 Frontend Authentication System (React/TypeScript)**
```typescript
// 🔐 Authentication Context and Hooks
interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
  createdAt: Date;
  lastLogin: Date;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  confirmPasswordReset: (token: string, newPassword: string) => Promise<void>;
  updateProfile: (updates: ProfileUpdates) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshToken: () => Promise<void>;
  resendVerification: () => Promise<void>;
  // Session management
  getSessions: () => Promise<UserSession[]>;
  revokeSession: (sessionId: number) => Promise<void>;
  revokeAllOtherSessions: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  displayName?: string;
}

interface ProfileUpdates {
  firstName?: string;
  lastName?: string;
  displayName?: string;
}

interface UserSession {
  id: number;
  deviceInfo: {
    browser?: string;
    os?: string;
    deviceType?: string;
  };
  ipAddress: string;
  location?: {
    country?: string;
    city?: string;
  };
  createdAt: Date;
  lastUsedAt: Date;
  isCurrent: boolean;
}

// 🔑 Auth Service (API communication)
class AuthService {
  private static baseURL = `${import.meta.env.VITE_API_BASE_URL}/api/auth`;
  private static profileURL = `${import.meta.env.VITE_API_BASE_URL}/api/profile`;
  
  static async login(email: string, password: string, rememberMe = false) {
    const response = await fetch(`${this.baseURL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // For refresh token cookies
      body: JSON.stringify({ email, password, rememberMe })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }
    
    return response.json();
  }
  
  static async register(userData: RegisterData) {
    const response = await fetch(`${this.baseURL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }
    
    return response.json();
  }
  
  static async logout() {
    const token = TokenService.getAccessToken();
    const response = await fetch(`${this.baseURL}/logout`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Logout failed');
    }
    
    return response.json();
  }
  
  static async refreshToken() {
    const refreshToken = TokenService.getRefreshToken();
    const response = await fetch(`${this.baseURL}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ refreshToken })
    });
    
    if (!response.ok) {
      throw new Error('Token refresh failed');
    }
    
    return response.json();
  }
  
  static async updateProfile(updates: ProfileUpdates) {
    const token = TokenService.getAccessToken();
    const response = await fetch(`${this.profileURL}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Profile update failed');
    }
    
    return response.json();
  }
  
  static async changePassword(currentPassword: string, newPassword: string) {
    const token = TokenService.getAccessToken();
    const response = await fetch(`${this.profileURL}/password`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Password change failed');
    }
    
    return response.json();
  }
  
  static async getSessions(): Promise<UserSession[]> {
    const token = TokenService.getAccessToken();
    const response = await fetch(`${this.profileURL}/sessions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch sessions');
    }
    
    const data = await response.json();
    return data.sessions;
  }
  
  static async revokeSession(sessionId: number) {
    const token = TokenService.getAccessToken();
    const response = await fetch(`${this.profileURL}/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error('Failed to revoke session');
    }
    
    return response.json();
  }
}

// 🎫 Token Management Service
class TokenService {
  private static ACCESS_TOKEN_KEY = 'majitask_access_token';
  private static REFRESH_TOKEN_KEY = 'majitask_refresh_token';
  
  static getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }
  
  static setAccessToken(token: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
  }
  
  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }
  
  static setRefreshToken(token: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
  }
  
  static clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }
  
  static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }
  
  static getTokenPayload(token: string): any {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }
}

// 🛡️ Auth Context Provider
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Initialize auth state on app load
  useEffect(() => {
    initializeAuth();
  }, []);
  
  const initializeAuth = async () => {
    try {
      const accessToken = TokenService.getAccessToken();
      
      if (!accessToken) {
        setIsLoading(false);
        return;
      }
      
      // Check if token is expired
      if (TokenService.isTokenExpired(accessToken)) {
        try {
          await refreshToken();
        } catch {
          TokenService.clearTokens();
          setIsLoading(false);
          return;
        }
      }
      
      // Get user info from token
      const payload = TokenService.getTokenPayload(accessToken);
      if (payload) {
        // Fetch full user profile
        const userProfile = await AuthService.getCurrentUser();
        setUser(userProfile);
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      TokenService.clearTokens();
    } finally {
      setIsLoading(false);
    }
  };
  
  const login = async (email: string, password: string, rememberMe = false) => {
    try {
      const response = await AuthService.login(email, password, rememberMe);
      
      TokenService.setAccessToken(response.accessToken);
      if (response.refreshToken) {
        TokenService.setRefreshToken(response.refreshToken);
      }
      
      setUser(response.user);
    } catch (error) {
      throw error;
    }
  };
  
  const register = async (userData: RegisterData) => {
    try {
      await AuthService.register(userData);
      // Note: User will need to verify email before login
    } catch (error) {
      throw error;
    }
  };
  
  const logout = async () => {
    try {
      await AuthService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      TokenService.clearTokens();
      setUser(null);
    }
  };
  
  const refreshToken = async () => {
    try {
      const response = await AuthService.refreshToken();
      TokenService.setAccessToken(response.accessToken);
      
      if (response.refreshToken) {
        TokenService.setRefreshToken(response.refreshToken);
      }
    } catch (error) {
      TokenService.clearTokens();
      setUser(null);
      throw error;
    }
  };
  
  const updateProfile = async (updates: ProfileUpdates) => {
    try {
      const response = await AuthService.updateProfile(updates);
      setUser(prev => prev ? { ...prev, ...response.user } : null);
    } catch (error) {
      throw error;
    }
  };
  
  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      await AuthService.changePassword(currentPassword, newPassword);
    } catch (error) {
      throw error;
    }
  };
  
  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    resetPassword: AuthService.resetPassword,
    confirmPasswordReset: AuthService.confirmPasswordReset,
    updateProfile,
    changePassword,
    refreshToken,
    resendVerification: AuthService.resendVerification,
    getSessions: AuthService.getSessions,
    revokeSession: AuthService.revokeSession,
    revokeAllOtherSessions: AuthService.revokeAllOtherSessions
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 🪝 Custom hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

#### **1.5 Authentication UI Components**
```typescript
// 🔐 Login Form Component
export const LoginForm: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await login(formData.email, formData.password, formData.rememberMe);
      navigate('/dashboard');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to MajiTask
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
              create a new account
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                checked={formData.rememberMe}
                onChange={(e) => setFormData(prev => ({ ...prev, rememberMe: e.target.checked }))}
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>
            
            <div className="text-sm">
              <Link to="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
                Forgot your password?
              </Link>
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 🛡️ Protected Route Component
export const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  requiredRole?: 'admin';
  redirectTo?: string;
}> = ({ children, requiredRole, redirectTo = '/login' }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }
  
  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">You don't have permission to access this page.</p>
          <Link to="/dashboard" className="text-indigo-600 hover:text-indigo-500">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
};

// 👤 User Profile Management Component
export const UserProfile: React.FC = () => {
  const { user, updateProfile, changePassword, getSessions, revokeSession } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    displayName: user?.displayName || ''
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  useEffect(() => {
    if (activeTab === 'sessions') {
      loadSessions();
    }
  }, [activeTab]);
  
  const loadSessions = async () => {
    try {
      const sessionData = await getSessions();
      setSessions(sessionData);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };
  
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await updateProfile(profileForm);
      // Show success message
    } catch (error) {
      // Show error message
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      // Show error: passwords don't match
      return;
    }
    
    setIsLoading(true);
    
    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      // Show success message
    } catch (error) {
      // Show error message
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRevokeSession = async (sessionId: number) => {
    try {
      await revokeSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error('Failed to revoke session:', error);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Account Settings</h1>
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'profile', name: 'Profile', icon: '👤' },
            { id: 'password', name: 'Password', icon: '🔒' },
            { id: 'sessions', name: 'Sessions', icon: '🖥️' },
            { id: 'notifications', name: 'Notifications', icon: '🔔' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon} {tab.name}
            </button>
          ))}
        </nav>
      </div>
      
      {/* Tab Content */}
      {activeTab === 'profile' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">Profile Information</h2>
          
          <form onSubmit={handleProfileUpdate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <input
                  type="text"
                  value={profileForm.firstName}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, firstName: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                <input
                  type="text"
                  value={profileForm.lastName}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, lastName: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Display Name</label>
              <input
                type="text"
                value={profileForm.displayName}
                onChange={(e) => setProfileForm(prev => ({ ...prev, displayName: e.target.value }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
              />
              <p className="mt-1 text-sm text-gray-500">Email cannot be changed after registration</p>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Add other tab contents (password, sessions, notifications) */}
    </div>
  );
};
```

#### **1.6 Admin Dashboard & Management System**
```typescript
// 🛠️ Admin Dashboard Component
export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  interface AdminUserView {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: 'user' | 'admin';
    isActive: boolean;
    emailVerified: boolean;
    taskCount: number;
    lastLogin: Date | null;
    createdAt: Date;
  }
  
  interface SystemStats {
    totalUsers: number;
    activeUsers: number;
    totalTasks: number;
    completedTasks: number;
    systemHealth: 'healthy' | 'warning' | 'critical';
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
  }
  
  interface AuditLogEntry {
    id: number;
    adminUser: {
      id: number;
      displayName: string;
      email: string;
    };
    action: string;
    targetUser?: {
      id: number;
      displayName: string;
      email: string;
    };
    details: any;
    ipAddress: string;
    createdAt: Date;
    success: boolean;
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              🛠️ Admin Dashboard
            </h2>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="mt-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Overview', icon: '📊' },
                { id: 'users', name: 'User Management', icon: '👥' },
                { id: 'tasks', name: 'Task Analytics', icon: '📋' },
                { id: 'system', name: 'System Health', icon: '⚙️' },
                { id: 'audit', name: 'Audit Log', icon: '📜' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon} {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>
        
        {/* Tab Content */}
        <div className="mt-8">
          {activeTab === 'overview' && <AdminOverview stats={systemStats} />}
          {activeTab === 'users' && <UserManagement users={users} onUsersChange={setUsers} />}
          {activeTab === 'tasks' && <TaskAnalytics />}
          {activeTab === 'system' && <SystemHealth />}
          {activeTab === 'audit' && <AuditLog logs={auditLogs} />}
        </div>
      </div>
    </div>
  );
};

// 📊 Admin Overview Component
const AdminOverview: React.FC<{ stats: SystemStats | null }> = ({ stats }) => {
  if (!stats) {
    return <div>Loading system statistics...</div>;
  }
  
  const healthColor = stats.systemHealth === 'healthy' ? 'green' : 
                     stats.systemHealth === 'warning' ? 'yellow' : 'red';
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Key Metrics Cards */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">👥</span>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.totalUsers}</dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-5 py-3">
          <div className="text-sm">
            <span className="text-green-600 font-medium">{stats.activeUsers}</span>
            <span className="text-gray-500"> active users</span>
          </div>
        </div>
      </div>
      
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">📋</span>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Tasks</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.totalTasks}</dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-5 py-3">
          <div className="text-sm">
            <span className="text-green-600 font-medium">{stats.completedTasks}</span>
            <span className="text-gray-500"> completed</span>
          </div>
        </div>
      </div>
      
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className={`text-2xl text-${healthColor}-500`}>⚙️</span>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">System Health</dt>
                <dd className={`text-lg font-medium text-${healthColor}-600 capitalize`}>
                  {stats.systemHealth}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">📈</span>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Daily Active</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.dailyActiveUsers}</dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-5 py-3">
          <div className="text-sm">
            <span className="text-gray-500">
              Weekly: {stats.weeklyActiveUsers} | Monthly: {stats.monthlyActiveUsers}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// 👥 User Management Component
const UserManagement: React.FC<{
  users: AdminUserView[];
  onUsersChange: (users: AdminUserView[]) => void;
}> = ({ users, onUsersChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const handleCreateUser = async (userData: any) => {
    try {
      const response = await AdminService.createUser(userData);
      onUsersChange([...users, response.user]);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };
  
  const handleToggleUserStatus = async (userId: number) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;
      
      await AdminService.updateUserStatus(userId, !user.isActive);
      onUsersChange(users.map(u => 
        u.id === userId ? { ...u, isActive: !u.isActive } : u
      ));
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  };
  
  const handleSendPasswordReset = async (userId: number) => {
    try {
      await AdminService.sendPasswordReset(userId);
      // Show success message
    } catch (error) {
      console.error('Failed to send password reset:', error);
    }
  };
  
  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg leading-6 font-medium text-gray-900">User Management</h3>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Create User
          </button>
        </div>
        
        <div className="mt-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            {selectedUsers.length > 0 && (
              <div className="flex space-x-2">
                <button className="bg-gray-600 text-white px-3 py-2 rounded-md text-sm hover:bg-gray-700">
                  Bulk Actions ({selectedUsers.length})
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedUsers(filteredUsers.map(u => u.id));
                    } else {
                      setSelectedUsers([]);
                    }
                  }}
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tasks
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers([...selectedUsers, user.id]);
                      } else {
                        setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                      }
                    }}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center">
                        <span className="text-white font-medium">
                          {user.firstName[0]}{user.lastName[0]}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      {!user.emailVerified && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          Unverified
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.role === 'admin' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role === 'admin' ? '👑 Admin' : '👤 User'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {user.isActive ? '✅ Active' : '❌ Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.taskCount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.lastLogin ? formatDistance(user.lastLogin, new Date(), { addSuffix: true }) : 'Never'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleToggleUserStatus(user.id)}
                      className={`${
                        user.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
                      }`}
                    >
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleSendPasswordReset(user.id)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Reset Password
                    </button>
                    <button className="text-gray-600 hover:text-gray-900">
                      View Tasks
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 🔧 Admin Service (API communication)
class AdminService {
  private static baseURL = `${import.meta.env.VITE_API_BASE_URL}/api/admin`;
  
  static async getSystemStats(): Promise<SystemStats> {
    const token = TokenService.getAccessToken();
    const response = await fetch(`${this.baseURL}/analytics`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch system statistics');
    }
    
    return response.json();
  }
  
  static async getAllUsers(): Promise<AdminUserView[]> {
    const token = TokenService.getAccessToken();
    const response = await fetch(`${this.baseURL}/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }
    
    const data = await response.json();
    return data.users;
  }
  
  static async createUser(userData: any) {
    const token = TokenService.getAccessToken();
    const response = await fetch(`${this.baseURL}/users`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create user');
    }
    
    return response.json();
  }
  
  static async updateUserStatus(userId: number, isActive: boolean) {
    const token = TokenService.getAccessToken();
    const response = await fetch(`${this.baseURL}/users/${userId}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ isActive })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update user status');
    }
    
    return response.json();
  }
  
  static async sendPasswordReset(userId: number) {
    const token = TokenService.getAccessToken();
    const response = await fetch(`${this.baseURL}/users/${userId}/reset-password`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error('Failed to send password reset');
    }
    
    return response.json();
  }
  
  static async getAuditLog(page = 1, limit = 50): Promise<AuditLogEntry[]> {
    const token = TokenService.getAccessToken();
    const response = await fetch(`${this.baseURL}/audit-log?page=${page}&limit=${limit}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch audit log');
    }
    
    const data = await response.json();
    return data.logs;
  }
}
```

### **Phase 2: API Layer Development with User Context**
#### **2.1 Enhanced Task API Endpoints**
```javascript
// 📋 Task Management API (/api/tasks)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      status, 
      priority, 
      category, 
      search, 
      page = 1, 
      limit = 50,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      includeTags,
      dateRange 
    } = req.query;
    
    let query = `
      SELECT t.*, 
             COUNT(c.id) as comment_count,
             GROUP_CONCAT(c.text ORDER BY c.created_at DESC LIMIT 3) as recent_comments
      FROM tasks t
      LEFT JOIN comments c ON t.id = c.task_id
      WHERE t.user_id = ?
    `;
    
    const params = [req.user.userId];
    
    // Add filters
    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }
    
    if (priority) {
      query += ' AND t.priority = ?';
      params.push(priority);
    }
    
    if (category) {
      query += ' AND t.category = ?';
      params.push(category);
    }
    
    if (search) {
      query += ' AND (t.title LIKE ? OR t.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (dateRange) {
      const { start, end } = JSON.parse(dateRange);
      query += ' AND t.created_at BETWEEN ? AND ?';
      params.push(start, end);
    }
    
    query += ' GROUP BY t.id';
    query += ` ORDER BY t.${sortBy} ${sortOrder}`;
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    
    const tasks = await db.query(query, params);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM tasks t 
      WHERE t.user_id = ? ${status ? 'AND t.status = ?' : ''}
    `;
    const countParams = [req.user.userId];
    if (status) countParams.push(status);
    
    const [{ total }] = await db.query(countQuery, countParams);
    
    res.json({
      tasks: tasks.map(transformTaskFromDB),
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: tasks.length,
        totalItems: total
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const taskData = req.body;
    const taskId = crypto.randomUUID();
    
    // Validate required fields
    if (!taskData.title || !taskData.category) {
      return res.status(400).json({ error: 'Title and category are required' });
    }
    
    // Transform frontend task to DB format
    const dbTask = transformTaskForDB(taskData, req.user.userId, taskId);
    
    const result = await db.query(
      `INSERT INTO tasks (
        id, user_id, title, description, status, priority, progress, category, 
        tags, deadline, start_date, end_date, parent_id, subtask_ids, 
        location, is_template, recurrence_rule, template_id, next_due_date, 
        instance_number, time_spent, estimated_duration, attachments, 
        external_links, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dbTask.id, dbTask.user_id, dbTask.title, dbTask.description,
        dbTask.status, dbTask.priority, dbTask.progress, dbTask.category,
        JSON.stringify(dbTask.tags), dbTask.deadline, dbTask.start_date,
        dbTask.end_date, dbTask.parent_id, JSON.stringify(dbTask.subtask_ids),
        JSON.stringify(dbTask.location), dbTask.is_template,
        JSON.stringify(dbTask.recurrence_rule), dbTask.template_id,
        dbTask.next_due_date, dbTask.instance_number, dbTask.time_spent,
        dbTask.estimated_duration, JSON.stringify(dbTask.attachments),
        JSON.stringify(dbTask.external_links), dbTask.created_by
      ]
    );
    
    // Get the created task with full details
    const [createdTask] = await db.query(
      'SELECT * FROM tasks WHERE id = ?',
      [taskId]
    );
    
    // Log creation for analytics
    await updateUserStatistics(req.user.userId, 'task_created');
    
    res.status(201).json({
      message: 'Task created successfully',
      task: transformTaskFromDB(createdTask)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Migration endpoint for localStorage data
router.post('/migrate', authenticateToken, async (req, res) => {
  try {
    const { tasks, comments } = req.body;
    
    if (!Array.isArray(tasks)) {
      return res.status(400).json({ error: 'Tasks must be an array' });
    }
    
    const migratedTasks = [];
    const migratedComments = [];
    
    // Start transaction
    await db.beginTransaction();
    
    try {
      // Migrate tasks
      for (const task of tasks) {
        const dbTask = transformTaskForDB(task, req.user.userId, task.id);
        
        await db.query(
          `INSERT INTO tasks (
            id, user_id, title, description, status, priority, progress, category, 
            tags, deadline, start_date, end_date, parent_id, subtask_ids, 
            location, is_template, recurrence_rule, template_id, next_due_date, 
            instance_number, time_spent, estimated_duration, attachments, 
            external_links, created_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            dbTask.id, dbTask.user_id, dbTask.title, dbTask.description,
            dbTask.status, dbTask.priority, dbTask.progress, dbTask.category,
            JSON.stringify(dbTask.tags), dbTask.deadline, dbTask.start_date,
            dbTask.end_date, dbTask.parent_id, JSON.stringify(dbTask.subtask_ids),
            JSON.stringify(dbTask.location), dbTask.is_template,
            JSON.stringify(dbTask.recurrence_rule), dbTask.template_id,
            dbTask.next_due_date, dbTask.instance_number, dbTask.time_spent,
            dbTask.estimated_duration, JSON.stringify(dbTask.attachments),
            JSON.stringify(dbTask.external_links), dbTask.created_by,
            task.createdAt, task.updatedAt
          ]
        );
        
        migratedTasks.push(task.id);
      }
      
      // Migrate comments if provided
      if (comments && Array.isArray(comments)) {
        for (const comment of comments) {
          await db.query(
            'INSERT INTO comments (task_id, user_id, text, created_at) VALUES (?, ?, ?, ?)',
            [comment.taskId, req.user.userId, comment.text, comment.createdAt]
          );
          migratedComments.push(comment.id);
        }
      }
      
      await db.commit();
      
      // Log successful migration
      await logAdminAction(
        req.user.userId, 
        'data_migration', 
        req.user.userId, 
        null, 
        { tasksCount: migratedTasks.length, commentsCount: migratedComments.length }, 
        req
      );
      
      res.json({
        message: 'Data migration completed successfully',
        migratedTasks: migratedTasks.length,
        migratedComments: migratedComments.length
      });
      
    } catch (error) {
      await db.rollback();
      throw error;
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### **Phase 3: Frontend Storage Abstraction + Hybrid Mode**
#### **3.1 Enhanced Storage Abstraction Layer**
```typescript
// 🔄 Storage Adapter Interface (with authentication context)
interface TaskStorage {
  // Core task operations (user-scoped)
  getAllTasks(): Promise<Task[]>
  getTask(id: string): Promise<Task | null>
  createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task>
  updateTask(id: string, updates: Partial<Task>): Promise<Task>
  deleteTask(id: string): Promise<void>
  
  // Comment operations
  getTaskComments(taskId: string): Promise<Comment[]>
  addComment(taskId: string, text: string): Promise<Comment>
  updateComment(commentId: number, text: string): Promise<Comment>
  deleteComment(commentId: number): Promise<void>
  
  // Bulk operations
  bulkCreateTasks(tasks: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Task[]>
  bulkUpdateTasks(updates: { id: string; updates: Partial<Task> }[]): Promise<Task[]>
  bulkDeleteTasks(taskIds: string[]): Promise<void>
  
  // Analytics and statistics
  getUserStatistics(): Promise<UserTaskStatistics>
  getTasksByCategory(): Promise<{ [category: string]: number }>
  getTasksByStatus(): Promise<{ [status: string]: number }>
  
  // Data management
  exportData(): Promise<string>
  importData(data: string): Promise<{ success: boolean; errors?: string[] }>
  
  // Migration-specific
  migrateFromLocalStorage?(): Promise<{ success: boolean; migratedCount: number }>
  validateDataIntegrity?(): Promise<{ isValid: boolean; issues: string[] }>
}

// 🌐 API Storage Adapter (authenticated)
class AuthenticatedAPIAdapter implements TaskStorage {
  private baseURL = `${import.meta.env.VITE_API_BASE_URL}/api`;
  
  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const token = TokenService.getAccessToken();
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    });
    
    if (response.status === 401) {
      // Token expired, try to refresh
      try {
        await AuthService.refreshToken();
        // Retry request with new token
        const newToken = TokenService.getAccessToken();
        return fetch(`${this.baseURL}${endpoint}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${newToken}`,
            ...options.headers
          }
        });
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = '/login';
        throw new Error('Authentication failed');
      }
    }
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return response.json();
  }
  
  async getAllTasks(): Promise<Task[]> {
    const data = await this.makeRequest('/tasks');
    return data.tasks.map(this.transformTaskFromAPI);
  }
  
  async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const apiTask = this.transformTaskForAPI(taskData);
    const data = await this.makeRequest('/tasks', {
      method: 'POST',
      body: JSON.stringify(apiTask)
    });
    return this.transformTaskFromAPI(data.task);
  }
  
  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const apiUpdates = this.transformTaskForAPI(updates);
    const data = await this.makeRequest(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(apiUpdates)
    });
    return this.transformTaskFromAPI(data.task);
  }
  
  async deleteTask(id: string): Promise<void> {
    await this.makeRequest(`/tasks/${id}`, { method: 'DELETE' });
  }
  
  async migrateFromLocalStorage(): Promise<{ success: boolean; migratedCount: number }> {
    try {
      // Get data from localStorage
      const localStorageData = localStorage.getItem('majitask_data');
      if (!localStorageData) {
        return { success: true, migratedCount: 0 };
      }
      
      const parsedData = JSON.parse(localStorageData);
      const tasks = parsedData.tasks || [];
      const comments = parsedData.comments || [];
      
      // Send to migration endpoint
      const result = await this.makeRequest('/tasks/migrate', {
        method: 'POST',
        body: JSON.stringify({ tasks, comments })
      });
      
      return {
        success: true,
        migratedCount: result.migratedTasks
      };
    } catch (error) {
      console.error('Migration failed:', error);
      return { success: false, migratedCount: 0 };
    }
  }
  
  private transformTaskForAPI(task: Partial<Task>) {
    return {
      ...task,
      deadline: task.deadline?.toISOString(),
      start_date: task.startDate?.toISOString(),
      end_date: task.endDate?.toISOString(),
      completed_at: task.completedAt?.toISOString(),
      next_due_date: task.nextDueDate?.toISOString(),
      tags: JSON.stringify(task.tags || []),
      subtask_ids: JSON.stringify(task.subtaskIds || []),
      location: task.location ? JSON.stringify(task.location) : null,
      recurrence_rule: task.recurrence ? JSON.stringify(task.recurrence) : null,
      attachments: task.attachments ? JSON.stringify(task.attachments) : null,
      external_links: task.externalLinks ? JSON.stringify(task.externalLinks) : null
    };
  }
  
  private transformTaskFromAPI(apiTask: any): Task {
    return {
      ...apiTask,
      deadline: apiTask.deadline ? new Date(apiTask.deadline) : undefined,
      startDate: apiTask.start_date ? new Date(apiTask.start_date) : undefined,
      endDate: apiTask.end_date ? new Date(apiTask.end_date) : undefined,
      completedAt: apiTask.completed_at ? new Date(apiTask.completed_at) : undefined,
      nextDueDate: apiTask.next_due_date ? new Date(apiTask.next_due_date) : undefined,
      tags: typeof apiTask.tags === 'string' ? JSON.parse(apiTask.tags) : (apiTask.tags || []),
      subtaskIds: typeof apiTask.subtask_ids === 'string' ? JSON.parse(apiTask.subtask_ids) : (apiTask.subtask_ids || []),
      location: apiTask.location ? (typeof apiTask.location === 'string' ? JSON.parse(apiTask.location) : apiTask.location) : undefined,
      recurrence: apiTask.recurrence_rule ? (typeof apiTask.recurrence_rule === 'string' ? JSON.parse(apiTask.recurrence_rule) : apiTask.recurrence_rule) : undefined,
      attachments: apiTask.attachments ? (typeof apiTask.attachments === 'string' ? JSON.parse(apiTask.attachments) : apiTask.attachments) : [],
      externalLinks: apiTask.external_links ? (typeof apiTask.external_links === 'string' ? JSON.parse(apiTask.external_links) : apiTask.external_links) : [],
      createdAt: new Date(apiTask.created_at),
      updatedAt: new Date(apiTask.updated_at)
    };
  }
}

// 💾 Enhanced LocalStorage Adapter (with migration support)
class LocalStorageAdapter implements TaskStorage {
  private storageKey = 'majitask_data';
  
  async getAllTasks(): Promise<Task[]> {
    const data = this.loadData();
    return data.tasks || [];
  }
  
  async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const task: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const data = this.loadData();
    data.tasks = [...(data.tasks || []), task];
    this.saveData(data);
    
    return task;
  }
  
  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const data = this.loadData();
    const taskIndex = data.tasks?.findIndex(t => t.id === id) ?? -1;
    
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }
    
    const updatedTask = {
      ...data.tasks[taskIndex],
      ...updates,
      updatedAt: new Date()
    };
    
    data.tasks[taskIndex] = updatedTask;
    this.saveData(data);
    
    return updatedTask;
  }
  
  async deleteTask(id: string): Promise<void> {
    const data = this.loadData();
    data.tasks = data.tasks?.filter(t => t.id !== id) || [];
    this.saveData(data);
  }
  
  async exportData(): Promise<string> {
    const data = this.loadData();
    return JSON.stringify(data, null, 2);
  }
  
  private loadData() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : { tasks: [], comments: [] };
    } catch (error) {
      console.error('Failed to load localStorage data:', error);
      return { tasks: [], comments: [] };
    }
  }
  
  private saveData(data: any) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save localStorage data:', error);
      throw new Error('Storage save failed');
    }
  }
  
  // Additional methods for comments, bulk operations, etc.
  async getTaskComments(taskId: string): Promise<Comment[]> {
    const data = this.loadData();
    return (data.comments || []).filter((c: Comment) => c.taskId === taskId);
  }
  
  async addComment(taskId: string, text: string): Promise<Comment> {
    const comment: Comment = {
      id: Date.now(),
      taskId,
      text,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const data = this.loadData();
    data.comments = [...(data.comments || []), comment];
    this.saveData(data);
    
    return comment;
  }
}

// 🎛️ Storage Manager (hybrid mode controller)
class StorageManager {
  private adapter: TaskStorage;
  private fallbackAdapter: TaskStorage;
  private isOnline: boolean = navigator.onLine;
  
  constructor(
    private authAdapter: AuthenticatedAPIAdapter,
    private localAdapter: LocalStorageAdapter,
    private authContext: AuthContextType
  ) {
    this.updateAdapter();
    
    // Listen for auth state changes
    this.authContext.onAuthStateChange?.(() => {
      this.updateAdapter();
    });
    
    // Listen for online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.updateAdapter();
      this.syncPendingChanges();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.updateAdapter();
    });
  }
  
  private updateAdapter() {
    if (this.authContext.isAuthenticated && this.isOnline) {
      this.adapter = this.authAdapter;
      this.fallbackAdapter = this.localAdapter;
    } else {
      this.adapter = this.localAdapter;
      this.fallbackAdapter = this.authContext.isAuthenticated ? this.authAdapter : undefined;
    }
  }
  
  async getAllTasks(): Promise<Task[]> {
    try {
      return await this.adapter.getAllTasks();
    } catch (error) {
      console.warn('Primary adapter failed, trying fallback:', error);
      if (this.fallbackAdapter) {
        return await this.fallbackAdapter.getAllTasks();
      }
      throw error;
    }
  }
  
  async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    try {
      const task = await this.adapter.createTask(taskData);
      
      // If using API, also save locally for offline access
      if (this.adapter === this.authAdapter && this.fallbackAdapter) {
        try {
          await this.fallbackAdapter.createTask(taskData);
        } catch (error) {
          console.warn('Failed to save to fallback adapter:', error);
        }
      }
      
      return task;
    } catch (error) {
      // If API fails but we're authenticated, save locally and queue for sync
      if (this.adapter === this.authAdapter && this.fallbackAdapter) {
        const task = await this.fallbackAdapter.createTask(taskData);
        this.queueForSync('create', task);
        return task;
      }
      throw error;
    }
  }
  
  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    try {
      const task = await this.adapter.updateTask(id, updates);
      
      // Update fallback if available
      if (this.fallbackAdapter) {
        try {
          await this.fallbackAdapter.updateTask(id, updates);
        } catch (error) {
          console.warn('Failed to update fallback adapter:', error);
        }
      }
      
      return task;
    } catch (error) {
      if (this.adapter === this.authAdapter && this.fallbackAdapter) {
        const task = await this.fallbackAdapter.updateTask(id, updates);
        this.queueForSync('update', { id, updates });
        return task;
      }
      throw error;
    }
  }
  
  async deleteTask(id: string): Promise<void> {
    try {
      await this.adapter.deleteTask(id);
      
      // Delete from fallback if available
      if (this.fallbackAdapter) {
        try {
          await this.fallbackAdapter.deleteTask(id);
        } catch (error) {
          console.warn('Failed to delete from fallback adapter:', error);
        }
      }
    } catch (error) {
      if (this.adapter === this.authAdapter && this.fallbackAdapter) {
        await this.fallbackAdapter.deleteTask(id);
        this.queueForSync('delete', { id });
        return;
      }
      throw error;
    }
  }
  
  private pendingSync: any[] = [];
  
  private queueForSync(operation: string, data: any) {
    this.pendingSync.push({
      operation,
      data,
      timestamp: new Date()
    });
    
    // Save pending sync operations to localStorage
    localStorage.setItem('majitask_pending_sync', JSON.stringify(this.pendingSync));
  }
  
  private async syncPendingChanges() {
    if (!this.authContext.isAuthenticated || !this.isOnline) return;
    
    try {
      const pending = JSON.parse(localStorage.getItem('majitask_pending_sync') || '[]');
      
      for (const item of pending) {
        try {
          switch (item.operation) {
            case 'create':
              await this.authAdapter.createTask(item.data);
              break;
            case 'update':
              await this.authAdapter.updateTask(item.data.id, item.data.updates);
              break;
            case 'delete':
              await this.authAdapter.deleteTask(item.data.id);
              break;
          }
        } catch (error) {
          console.error('Failed to sync item:', item, error);
        }
      }
      
      // Clear pending sync after successful sync
      localStorage.removeItem('majitask_pending_sync');
      this.pendingSync = [];
    } catch (error) {
      console.error('Failed to sync pending changes:', error);
    }
  }
  
  // Migration method
  async performMigration(): Promise<{ success: boolean; migratedCount: number }> {
    if (!this.authContext.isAuthenticated) {
      throw new Error('User must be authenticated to perform migration');
    }
    
    try {
      const result = await this.authAdapter.migrateFromLocalStorage?.();
      
      if (result?.success) {
        // Clear localStorage after successful migration
        localStorage.removeItem('majitask_data');
        console.log(`Successfully migrated ${result.migratedCount} tasks`);
      }
      
      return result || { success: false, migratedCount: 0 };
    } catch (error) {
      console.error('Migration failed:', error);
      return { success: false, migratedCount: 0 };
    }
  }
}

// 🪝 Enhanced Task Hook with Authentication
export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  
  const authContext = useAuth();
  const storageManager = useMemo(() => {
    const authAdapter = new AuthenticatedAPIAdapter();
    const localAdapter = new LocalStorageAdapter();
    return new StorageManager(authAdapter, localAdapter, authContext);
  }, [authContext]);
  
  // Load tasks when auth state changes
  useEffect(() => {
    loadTasks();
  }, [authContext.isAuthenticated]);
  
  const loadTasks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const loadedTasks = await storageManager.getAllTasks();
      setTasks(loadedTasks);
      setLastSync(new Date());
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load tasks');
      console.error('Failed to load tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const createTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newTask = await storageManager.createTask(taskData);
      setTasks(prev => [...prev, newTask]);
      return newTask;
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  };
  
  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const updatedTask = await storageManager.updateTask(id, updates);
      setTasks(prev => prev.map(task => task.id === id ? updatedTask : task));
      return updatedTask;
    } catch (error) {
      console.error('Failed to update task:', error);
      throw error;
    }
  };
  
  const deleteTask = async (id: string) => {
    try {
      await storageManager.deleteTask(id);
      setTasks(prev => prev.filter(task => task.id !== id));
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  };
  
  const performMigration = async () => {
    try {
      const result = await storageManager.performMigration();
      if (result.success) {
        // Reload tasks after migration
        await loadTasks();
      }
      return result;
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  };
  
  return {
    tasks,
    isLoading,
    error,
    lastSync,
    loadTasks,
    createTask,
    updateTask,
    deleteTask,
    performMigration,
    // Additional computed values
    tasksByStatus: useMemo(() => groupBy(tasks, 'status'), [tasks]),
    tasksByCategory: useMemo(() => groupBy(tasks, 'category'), [tasks]),
    completedTasksCount: useMemo(() => tasks.filter(t => t.status === 'done').length, [tasks]),
    pendingTasksCount: useMemo(() => tasks.filter(t => t.status !== 'done').length, [tasks])
  };
};
```

### **Phase 4: Migration Process & User Onboarding**
#### **4.1 User Registration & Data Migration Flow**
```typescript
// 🚀 Migration Wizard Component
export const MigrationWizard: React.FC = () => {
  const [step, setStep] = useState(1);
  const [migrationData, setMigrationData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { performMigration } = useTasks();
  const { user } = useAuth();
  
  useEffect(() => {
    // Check if user has localStorage data
    const localData = localStorage.getItem('majitask_data');
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        setMigrationData(parsed);
      } catch (error) {
        console.error('Failed to parse localStorage data:', error);
      }
    }
  }, []);
  
  const handleMigration = async () => {
    setIsProcessing(true);
    try {
      const result = await performMigration();
      if (result.success) {
        setStep(4); // Success step
      } else {
        setStep(5); // Error step
      }
    } catch (error) {
      console.error('Migration failed:', error);
      setStep(5); // Error step
    } finally {
      setIsProcessing(false);
    }
  };
  
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              🎉 Welcome to MajiTask Cloud!
            </h2>
            <p className="text-gray-600 mb-6">
              Your account has been created successfully. Let's set up your tasks.
            </p>
            {migrationData && migrationData.tasks?.length > 0 ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">
                  📋 We found {migrationData.tasks.length} existing tasks!
                </h3>
                <p className="text-blue-700">
                  Would you like to transfer your existing tasks to your cloud account?
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">
                  🚀 Start Fresh
                </h3>
                <p className="text-gray-700">
                  You can start creating tasks right away with your new cloud account.
                </p>
              </div>
            )}
            <div className="flex space-x-4 justify-center">
              {migrationData && migrationData.tasks?.length > 0 && (
                <button
                  onClick={() => setStep(2)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                >
                  Transfer Existing Tasks
                </button>
              )}
              <button
                onClick={() => setStep(4)}
                className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700"
              >
                Start Fresh
              </button>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              📊 Preview Your Data
            </h2>
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-3">Tasks to be transferred:</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {migrationData.tasks?.slice(0, 10).map((task: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="font-medium">{task.title}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      task.status === 'done' ? 'bg-green-100 text-green-800' :
                      task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                ))}
                {migrationData.tasks?.length > 10 && (
                  <p className="text-gray-500 text-sm">
                    ... and {migrationData.tasks.length - 10} more tasks
                  </p>
                )}
              </div>
            </div>
            <div className="flex space-x-4 justify-center">
              <button
                onClick={() => setStep(1)}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
              >
                Proceed with Transfer
              </button>
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              🔄 Transferring Your Tasks
            </h2>
            <p className="text-gray-600 mb-6">
              Please wait while we securely transfer your tasks to the cloud...
            </p>
            {isProcessing ? (
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-500">Transferring data...</p>
              </div>
            ) : (
              <button
                onClick={handleMigration}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
              >
                Start Transfer
              </button>
            )}
          </div>
        );
        
      case 4:
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-green-600 mb-4">
              ✅ Setup Complete!
            </h2>
            <p className="text-gray-600 mb-6">
              {migrationData ? 
                'Your tasks have been successfully transferred to the cloud.' :
                'Your account is ready to use.'
              }
            </p>
            <p className="text-gray-600 mb-6">
              Your tasks will now sync across all your devices automatically.
            </p>
            <Link
              to="/dashboard"
              className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 inline-block"
            >
              Go to Dashboard
            </Link>
          </div>
        );
        
      case 5:
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              ❌ Transfer Failed
            </h2>
            <p className="text-gray-600 mb-6">
              We encountered an issue transferring your tasks. Don't worry - your local data is safe.
            </p>
            <p className="text-gray-600 mb-6">
              You can try again later or contact support for assistance.
            </p>
            <div className="flex space-x-4 justify-center">
              <button
                onClick={() => setStep(3)}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
              >
                Try Again
              </button>
              <Link
                to="/dashboard"
                className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 inline-block"
              >
                Continue to Dashboard
              </Link>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white shadow rounded-lg p-8">
          {renderStep()}
        </div>
        
        {/* Progress indicator */}
        <div className="flex justify-center space-x-2">
          {[1, 2, 3, 4].map((stepNum) => (
            <div
              key={stepNum}
              className={`w-3 h-3 rounded-full ${
                step >= stepNum ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
```

### **Phase 5: Admin Features & System Monitoring**
#### **5.1 Complete Admin Dashboard Implementation**
(Admin components already covered above)

#### **5.2 System Health Monitoring**
```typescript
// 🔍 System Health Component
const SystemHealth: React.FC = () => {
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  interface SystemHealthData {
    database: {
      status: 'healthy' | 'warning' | 'critical';
      responseTime: number;
      connections: number;
      maxConnections: number;
    };
    api: {
      status: 'healthy' | 'warning' | 'critical';
      responseTime: number;
      requestsPerMinute: number;
      errorRate: number;
    };
    storage: {
      status: 'healthy' | 'warning' | 'critical';
      diskUsage: number;
      freeSpace: number;
    };
    memory: {
      status: 'healthy' | 'warning' | 'critical';
      usage: number;
      available: number;
    };
  }
  
  useEffect(() => {
    loadHealthData();
    const interval = setInterval(loadHealthData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);
  
  const loadHealthData = async () => {
    try {
      const data = await AdminService.getSystemHealth();
      setHealthData(data);
    } catch (error) {
      console.error('Failed to load system health:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading) {
    return <div>Loading system health...</div>;
  }
  
  if (!healthData) {
    return <div>Failed to load system health data</div>;
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'critical': return '❌';
      default: return '❓';
    }
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Database Health */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          🗃️ Database Health
          <span className={`ml-2 ${getStatusColor(healthData.database.status)}`}>
            {getStatusIcon(healthData.database.status)}
          </span>
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-500">Response Time:</span>
            <span className="font-medium">{healthData.database.responseTime}ms</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Connections:</span>
            <span className="font-medium">
              {healthData.database.connections}/{healthData.database.maxConnections}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${(healthData.database.connections / healthData.database.maxConnections) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      {/* API Health */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          🌐 API Health
          <span className={`ml-2 ${getStatusColor(healthData.api.status)}`}>
            {getStatusIcon(healthData.api.status)}
          </span>
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-500">Response Time:</span>
            <span className="font-medium">{healthData.api.responseTime}ms</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Requests/min:</span>
            <span className="font-medium">{healthData.api.requestsPerMinute}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Error Rate:</span>
            <span className={`font-medium ${healthData.api.errorRate > 5 ? 'text-red-600' : 'text-green-600'}`}>
              {healthData.api.errorRate.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
      
      {/* Storage Health */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          💾 Storage Health
          <span className={`ml-2 ${getStatusColor(healthData.storage.status)}`}>
            {getStatusIcon(healthData.storage.status)}
          </span>
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-500">Disk Usage:</span>
            <span className="font-medium">{healthData.storage.diskUsage.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Free Space:</span>
            <span className="font-medium">{(healthData.storage.freeSpace / 1024 / 1024 / 1024).toFixed(1)} GB</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${healthData.storage.diskUsage > 80 ? 'bg-red-600' : 'bg-green-600'}`}
              style={{ width: `${healthData.storage.diskUsage}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      {/* Memory Health */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          🧠 Memory Health
          <span className={`ml-2 ${getStatusColor(healthData.memory.status)}`}>
            {getStatusIcon(healthData.memory.status)}
          </span>
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-500">Usage:</span>
            <span className="font-medium">{healthData.memory.usage.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Available:</span>
            <span className="font-medium">{(healthData.memory.available / 1024 / 1024 / 1024).toFixed(1)} GB</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${healthData.memory.usage > 80 ? 'bg-red-600' : 'bg-green-600'}`}
              style={{ width: `${healthData.memory.usage}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};
```

## 🔧 **Technical Implementation Details**

### **Enhanced Database Schema Design**
```sql
-- Users table (core authentication and profiles)
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  display_name VARCHAR(150),
  role ENUM('user', 'admin') DEFAULT 'user',
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_active (is_active)
);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_token (token),
  INDEX idx_user_id (user_id),
  INDEX idx_expires (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User sessions/JWT tokens (for token blacklisting and session management)
CREATE TABLE user_sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_jti VARCHAR(255) NOT NULL UNIQUE, -- JWT ID claim
  device_info JSON, -- Browser, OS, etc.
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP NULL,
  
  INDEX idx_user_id (user_id),
  INDEX idx_token_jti (token_jti),
  INDEX idx_expires (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Enhanced Tasks table (with user relationships)
CREATE TABLE tasks (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL, -- Owner of the task
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status ENUM('todo', 'in-progress', 'done', 'cancelled') DEFAULT 'todo',
  priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  progress INT DEFAULT 0,
  category VARCHAR(100) NOT NULL,
  tags JSON,
  
  -- Dates (stored as TIMESTAMP for timezone support)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deadline TIMESTAMP NULL,
  start_date TIMESTAMP NULL,
  end_date TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  
  -- Hierarchy
  parent_id VARCHAR(36),
  subtask_ids JSON, -- Array of subtask IDs for quick access
  
  -- Location (stored as JSON for flexibility)
  location JSON, -- {address, coordinates: {lat, lng}, placeId}
  
  -- Recurrence (stored as JSON)
  is_template BOOLEAN DEFAULT FALSE,
  recurrence_rule JSON,
  template_id VARCHAR(36),
  next_due_date TIMESTAMP NULL,
  instance_number INT,
  
  -- Time tracking
  time_spent INT DEFAULT 0, -- minutes
  estimated_duration INT, -- minutes
  
  -- Collaboration (future feature)
  shared_with JSON, -- Array of user IDs who can view/edit
  created_by INT, -- Who created this task (for shared tasks)
  
  -- Indexes for performance
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_deadline (deadline),
  INDEX idx_created_at (created_at),
  INDEX idx_parent_id (parent_id),
  INDEX idx_template_id (template_id),
  INDEX idx_created_by (created_by),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES tasks(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Enhanced Comments table (with user attribution)
CREATE TABLE comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id VARCHAR(36) NOT NULL,
  user_id INT NOT NULL, -- Who wrote the comment
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_task_id (task_id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Admin audit log (track admin actions)
CREATE TABLE admin_audit_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admin_user_id INT NOT NULL,
  action VARCHAR(100) NOT NULL, -- 'user_created', 'password_reset', 'user_disabled', etc.
  target_user_id INT, -- User being acted upon
  details JSON, -- Additional action details
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_admin_user_id (admin_user_id),
  INDEX idx_target_user_id (target_user_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default admin user (run once)
INSERT INTO users (email, password_hash, first_name, last_name, display_name, role, email_verified) 
VALUES ('majitask.fun@gmail.com', '$2b$12$placeholder_hash', 'Admin', 'User', 'MajiTask Admin', 'admin', TRUE);
```

### **Enhanced API Endpoints Design**
```
# Authentication Endpoints
POST   /api/auth/register       - User registration
POST   /api/auth/login          - User login
POST   /api/auth/logout         - User logout (invalidate token)
POST   /api/auth/refresh        - Refresh JWT token
POST   /api/auth/forgot-password - Request password reset
POST   /api/auth/reset-password - Reset password with token
GET    /api/auth/verify-email   - Verify email address
POST   /api/auth/resend-verification - Resend verification email

# User Profile Endpoints
GET    /api/profile             - Get current user profile
PUT    /api/profile             - Update user profile
PUT    /api/profile/password    - Change password (authenticated)
GET    /api/profile/sessions    - Get active sessions
DELETE /api/profile/sessions/:id - Revoke specific session

# Task Endpoints (user-scoped)
GET    /api/tasks              - Get user's tasks with filters
POST   /api/tasks              - Create new task for current user
GET    /api/tasks/:id          - Get specific task (if user owns it)
PUT    /api/tasks/:id          - Update task (if user owns it)
DELETE /api/tasks/:id          - Delete task (if user owns it)

GET    /api/tasks/:id/comments - Get task comments
POST   /api/tasks/:id/comments - Add comment to task

POST   /api/tasks/bulk         - Bulk create/update user's tasks
DELETE /api/tasks/bulk         - Bulk delete user's tasks

POST   /api/migrate            - Migrate user's localStorage data
GET    /api/export             - Export user's tasks as JSON
POST   /api/import             - Import tasks for user

GET    /api/tasks/statistics   - Get user's task statistics
POST   /api/tasks/recurring    - Process user's recurring tasks

# Admin Endpoints (admin role required)
GET    /api/admin/users        - Get all users (paginated)
POST   /api/admin/users        - Create new user
GET    /api/admin/users/:id    - Get specific user details
PUT    /api/admin/users/:id    - Update user (name, role, status)
DELETE /api/admin/users/:id    - Disable/Delete user
POST   /api/admin/users/:id/reset-password - Force password reset
POST   /api/admin/users/:id/send-verification - Resend verification

GET    /api/admin/tasks        - Get all tasks across all users
GET    /api/admin/users/:id/tasks - Get specific user's tasks
POST   /api/admin/users/:id/tasks/transfer - Transfer tasks to another user

GET    /api/admin/analytics    - System-wide analytics
GET    /api/admin/audit-log    - Admin action audit log
GET    /api/admin/system-health - System health and performance

# Public/Health Endpoints
GET    /api/health             - System health check
GET    /api/version            - API version info
```

### **Frontend Storage Adapter**
```typescript
// Abstract interface
interface TaskStorage {
  getAllTasks(): Promise<Task[]>
  getTask(id: string): Promise<Task | null>
  createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task>
  updateTask(id: string, updates: Partial<Task>): Promise<Task>
  deleteTask(id: string): Promise<void>
  addComment(taskId: string, text: string): Promise<Comment>
  exportData(): Promise<string>
  importData(data: string): Promise<void>
}

// API implementation
class APIStorageAdapter implements TaskStorage {
  private baseURL = process.env.VITE_API_BASE_URL + '/api'
  
  async getAllTasks(): Promise<Task[]> {
    const response = await fetch(`${this.baseURL}/tasks`)
    if (!response.ok) throw new Error('Failed to fetch tasks')
    const data = await response.json()
    return this.transformTasksFromAPI(data)
  }
  
  async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const response = await fetch(`${this.baseURL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.transformTaskForAPI(taskData))
    })
    if (!response.ok) throw new Error('Failed to create task')
    const data = await response.json()
    return this.transformTaskFromAPI(data)
  }
  
  // ... other methods
  
  private transformTaskForAPI(task: Partial<Task>) {
    // Convert dates to ISO strings, handle nested objects
    return {
      ...task,
      deadline: task.deadline?.toISOString(),
      start_date: task.startDate?.toISOString(),
      end_date: task.endDate?.toISOString(),
      completed_at: task.completedAt?.toISOString(),
      next_due_date: task.nextDueDate?.toISOString(),
      location: task.location ? JSON.stringify(task.location) : null,
      tags: JSON.stringify(task.tags || []),
      subtask_ids: JSON.stringify(task.subtaskIds || []),
      recurrence_rule: task.recurrence ? JSON.stringify(task.recurrence) : null
    }
  }
  
  private transformTaskFromAPI(apiTask: any): Task {
    // Convert back from API format
    return {
      ...apiTask,
      deadline: apiTask.deadline ? new Date(apiTask.deadline) : undefined,
      startDate: apiTask.start_date ? new Date(apiTask.start_date) : undefined,
      endDate: apiTask.end_date ? new Date(apiTask.end_date) : undefined,
      completedAt: apiTask.completed_at ? new Date(apiTask.completed_at) : undefined,
      nextDueDate: apiTask.next_due_date ? new Date(apiTask.next_due_date) : undefined,
      location: apiTask.location ? JSON.parse(apiTask.location) : undefined,
      tags: apiTask.tags ? JSON.parse(apiTask.tags) : [],
      subtaskIds: apiTask.subtask_ids ? JSON.parse(apiTask.subtask_ids) : [],
      recurrence: apiTask.recurrence_rule ? JSON.parse(apiTask.recurrence_rule) : undefined,
      createdAt: new Date(apiTask.created_at),
      updatedAt: new Date(apiTask.updated_at)
    }
  }
}
```

## 🛡️ **Risk Mitigation & Safety Measures**

### **Data Safety & Integrity**
1. **📦 Pre-Migration Backup**
   ```typescript
   // Automatic backup before any migration
   const createBackup = () => {
     const data = localStorage.getItem('majitask_data');
     if (data) {
       const backup = {
         data: JSON.parse(data),
         timestamp: new Date().toISOString(),
         version: '1.0'
       };
       localStorage.setItem('majitask_backup', JSON.stringify(backup));
       return backup;
     }
   };
   ```

2. **🔍 Data Validation & Integrity Checks**
   - Pre-migration data validation
   - Post-migration comparison between localStorage and API data
   - Checksum verification for critical data
   - Rollback capability with 30-day backup retention

3. **🔄 Gradual Rollout Strategy**
   - Feature flags for controlled rollout
   - A/B testing for migration process
   - Canary deployment for new users first
   - Monitor error rates and user feedback

### **Performance Considerations**
1. **⚡ Optimized Data Loading**
   ```typescript
   // Lazy loading and pagination
   const usePaginatedTasks = (pageSize = 50) => {
     const [tasks, setTasks] = useState<Task[]>([]);
     const [hasMore, setHasMore] = useState(true);
     
     const loadMore = async () => {
       const page = Math.ceil(tasks.length / pageSize) + 1;
       const newTasks = await storage.getTasks({ page, limit: pageSize });
       setTasks(prev => [...prev, ...newTasks]);
       setHasMore(newTasks.length === pageSize);
     };
     
     return { tasks, loadMore, hasMore };
   };
   ```

2. **📈 Caching Strategy**
   - React Query for server state management
   - Optimistic updates for immediate UI feedback
   - Background sync for conflict resolution
   - Cache invalidation strategies

3. **🌐 Connection Handling**
   ```typescript
   // Robust connection management
   class ConnectionManager {
     private retryAttempts = 0;
     private maxRetries = 3;
     
     async makeRequest(request: () => Promise<any>): Promise<any> {
       try {
         return await request();
       } catch (error) {
         if (this.retryAttempts < this.maxRetries) {
           this.retryAttempts++;
           await this.delay(1000 * this.retryAttempts); // Exponential backoff
           return this.makeRequest(request);
         }
         throw error;
       }
     }
     
     private delay(ms: number) {
       return new Promise(resolve => setTimeout(resolve, ms));
     }
   }
   ```

### **Security & Authentication**
1. **🔐 Multi-Layer Security**
   - JWT with short expiration times (15 minutes)
   - Refresh token rotation
   - Session management and tracking
   - Rate limiting on all endpoints
   - Input validation and sanitization

2. **🛡️ Protection Against Common Attacks**
   - CSRF protection with SameSite cookies
   - XSS prevention with Content Security Policy
   - SQL injection prevention with parameterized queries
   - Password strength requirements and hashing (bcrypt)

3. **📊 Security Monitoring**
   - Failed login attempt tracking
   - Suspicious activity detection
   - Admin audit logging
   - Real-time security alerts

### **User Experience & Support**
1. **📢 Migration Communication**
   ```typescript
   // In-app notification system
   const MigrationNotice: React.FC = () => (
     <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
       <div className="flex">
         <div className="flex-shrink-0">
           <span className="text-2xl">🚀</span>
         </div>
         <div className="ml-3">
           <p className="text-sm text-blue-700">
             <strong>Exciting news!</strong> Your tasks will now sync across all your devices.
             <Link to="/migration" className="font-medium underline">
               Learn more about the upgrade
             </Link>
           </p>
         </div>
       </div>
     </div>
   );
   ```

2. **💡 Progressive Enhancement**
   - Graceful degradation for older browsers
   - Offline-first functionality maintained
   - Clear error messages and recovery options
   - Help documentation and tutorials

3. **🔄 Rollback Plan**
   - Immediate rollback capability
   - Data export functionality at any time
   - Alternative access methods during issues
   - Support ticket system for assistance

## 📅 **Implementation Timeline & Phases**

### **Week 1-2: Foundation & Backend Development**
- [x] Database schema design and creation
- [x] User authentication API development
- [x] Basic CRUD endpoints for tasks
- [x] JWT implementation and session management
- [x] Admin API endpoints
- [ ] Email service integration
- [ ] Rate limiting and security middleware
- [ ] Unit tests for API endpoints

### **Week 3: Frontend Authentication System**
- [ ] Authentication context and state management
- [ ] Login/Registration forms
- [ ] Password reset functionality
- [ ] User profile management
- [ ] Route protection implementation
- [ ] Token refresh mechanism
- [ ] Form validation and error handling

### **Week 4: Storage Abstraction & Migration**
- [ ] Storage adapter pattern implementation
- [ ] API storage adapter with authentication
- [ ] Enhanced localStorage adapter
- [ ] Hybrid storage manager
- [ ] Migration wizard component
- [ ] Data validation and integrity checks
- [ ] Offline synchronization logic

### **Week 5: Admin Dashboard**
- [ ] Admin dashboard layout and navigation
- [ ] User management interface
- [ ] System health monitoring
- [ ] Audit log viewer
- [ ] Task analytics across users
- [ ] Bulk operations interface
- [ ] Admin-specific API endpoints

### **Week 6: Testing & Quality Assurance**
- [ ] End-to-end testing with Cypress
- [ ] Migration testing with sample data
- [ ] Performance testing and optimization
- [ ] Security audit and penetration testing
- [ ] Cross-browser compatibility testing
- [ ] Mobile responsiveness testing
- [ ] Load testing for concurrent users

### **Week 7: Deployment & Migration**
- [ ] Production environment setup
- [ ] SSL certificate configuration
- [ ] Database migration scripts
- [ ] Backup and recovery procedures
- [ ] Monitoring and alerting setup
- [ ] Performance monitoring
- [ ] User acceptance testing

### **Week 8: Launch & Support**
- [ ] Soft launch with beta users
- [ ] Migration assistance and support
- [ ] Documentation and help center
- [ ] Bug fixes and improvements
- [ ] Performance optimization
- [ ] Full production launch
- [ ] Post-launch monitoring and support

## 🎯 **Success Metrics & KPIs**

### **Technical Metrics**
- [ ] **Data Integrity**: 100% task preservation during migration
- [ ] **Performance**: < 2s load time for 1000+ tasks
- [ ] **Uptime**: 99.9% API availability
- [ ] **Security**: Zero data breaches or unauthorized access
- [ ] **Cross-device Sync**: < 5s sync time across devices

### **User Experience Metrics**
- [ ] **Migration Success Rate**: > 95% successful migrations
- [ ] **User Satisfaction**: > 90% positive feedback
- [ ] **Support Tickets**: < 5% of users require assistance
- [ ] **Feature Adoption**: > 80% of users use new features
- [ ] **Retention Rate**: > 95% user retention post-migration

### **Business Metrics**
- [ ] **User Growth**: 25% increase in new user registrations
- [ ] **Engagement**: 40% increase in daily active users
- [ ] **Task Creation**: 30% increase in tasks created per user
- [ ] **Cross-device Usage**: 60% of users access from multiple devices
- [ ] **Support Efficiency**: 50% reduction in support response time

## � **Current Project Structure**

The project is now properly organized with all code integrated in the main `majitask/` directory:

```
/home/thor/Documents/MajiTask/
├── majitask/                          # 🏠 Main application root
│   ├── server/                        # 🖥️ Backend (Node.js/Express)
│   │   ├── index.js                   # Main server entry point
│   │   ├── db/
│   │   │   └── pool.ts               # MariaDB connection pool
│   │   ├── modules/
│   │   │   └── auth/
│   │   │       ├── auth.service.ts   # Authentication business logic
│   │   │       └── auth.routes.js    # Auth API endpoints
│   │   ├── routes/
│   │   │   └── emailRoutes.js        # Email API routes
│   │   └── services/
│   │       └── emailService.js       # Email service
│   ├── src/                          # 🎨 Frontend (React/TypeScript)
│   │   ├── components/
│   │   │   ├── ProtectedRoute.tsx    # Route protection HOC
│   │   │   └── [other components]
│   │   ├── modules/
│   │   │   └── auth/
│   │   │       └── useAuth.tsx       # Auth context & Zustand store
│   │   ├── hooks/
│   │   ├── types/
│   │   └── utils/
│   ├── migrations/                   # 🗃️ Database migrations
│   │   └── 20250701_create_auth_tables.sql
│   ├── package.json                  # All dependencies (backend + frontend)
│   ├── .env                         # Environment configuration
│   └── [other config files]
├── ansible/                          # 🚀 Deployment scripts
└── docs/                            # 📚 Documentation & strategy
```

**✅ All Authentication Components Are Now Properly Integrated:**
- Backend auth is in `majitask/server/modules/auth/`
- Frontend auth is in `majitask/src/modules/auth/`
- Protection component is in `majitask/src/components/`
- Database pool is in `majitask/server/db/`
- Migrations are in `majitask/migrations/`
- All dependencies are unified in `majitask/package.json`

## �🚀 **Next Steps & Future Enhancements**

### **Phase 2 Features (Post-Launch)**
1. **👥 Collaboration Features**
   - Task sharing between users
   - Team workspaces
   - Real-time collaboration
   - Comment mentions and notifications

2. **📱 Mobile Application**
   - React Native mobile app
   - Push notifications
   - Offline synchronization
   - Mobile-specific UI/UX

3. **🤖 AI & Automation**
   - Smart task suggestions
   - Automated recurring task creation
   - Priority prediction
   - Time estimation improvements

4. **📊 Advanced Analytics**
   - Productivity insights
   - Time tracking analysis
   - Goal setting and progress tracking
   - Custom reporting

5. **🔌 Third-party Integrations**
   - Calendar synchronization (Google, Outlook)
   - Email integration
   - Slack/Teams notifications
   - File storage integration (Google Drive, Dropbox)

### **Enterprise Features (Future)**
1. **🏢 Multi-tenant Architecture**
   - Organization management
   - Role-based permissions
   - Custom branding
   - Enterprise SSO

2. **📈 Advanced Reporting**
   - Team productivity dashboards
   - Resource allocation insights
   - Performance benchmarking
   - Custom analytics

3. **🛡️ Enhanced Security**
   - Two-factor authentication
   - Audit logging for compliance
   - Data encryption at rest
   - GDPR compliance tools

## 📚 **Documentation & Resources**

### **Developer Documentation**
- [ ] API documentation with OpenAPI/Swagger
- [ ] Database schema documentation
- [ ] Frontend component library
- [ ] Deployment and configuration guides
- [ ] Security best practices
- [ ] Performance optimization guidelines

### **User Documentation**
- [ ] User onboarding guide
- [ ] Migration troubleshooting
- [ ] Feature tutorials and tips
- [ ] FAQ and common issues
- [ ] Video tutorials
- [ ] Mobile app usage guide

### **Admin Documentation**
- [ ] Admin dashboard user guide
- [ ] User management procedures
- [ ] System monitoring guidelines
- [ ] Backup and recovery procedures
- [ ] Security incident response
- [ ] Performance tuning guide

---

## 🎉 **Conclusion**

This comprehensive strategy provides a robust, future-proof migration path from localStorage to MariaDB while adding full user authentication, role-based access control, and admin management capabilities. The hybrid approach ensures zero data loss and maintains offline functionality while enabling cross-device synchronization and multi-user support.

**Key Benefits:**
- 🔒 **Secure**: Industry-standard authentication and authorization
- 📱 **Cross-platform**: Seamless sync across all devices
- 🛡️ **Reliable**: Comprehensive error handling and rollback capabilities
- 👥 **Scalable**: Multi-user architecture ready for enterprise features
- 🚀 **Future-ready**: Modular design for easy feature expansion
- 💪 **Robust**: Extensive testing and monitoring capabilities

**Ready to begin implementation?** Start with Phase 1 (Authentication & User Management) or any specific component that aligns with your immediate priorities!
