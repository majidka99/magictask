-- MajiTask: Authentication Tables Migration
-- Date: 2025-07-01
-- Description: Create users, password_reset_tokens, and user_sessions tables with proper indexes and constraints

START TRANSACTION;

-- Users table (core authentication and profiles)
CREATE TABLE IF NOT EXISTS users (
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
  INDEX idx_active (is_active),
  INDEX idx_created_at (created_at)
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
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
CREATE TABLE IF NOT EXISTS user_sessions (
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
  INDEX idx_revoked (revoked_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert default admin user (only if not exists)
INSERT IGNORE INTO users (
  email, 
  password_hash, 
  first_name, 
  last_name, 
  display_name, 
  role, 
  email_verified,
  is_active
) VALUES (
  'majitask.fun@gmail.com',
  '$2b$12$placeholder_hash_replace_with_actual_hash_on_first_run',
  'Admin',
  'User',
  'MajiTask Admin',
  'admin',
  TRUE,
  TRUE
);

-- Verify tables were created
SELECT 
  TABLE_NAME,
  TABLE_ROWS,
  CREATE_TIME
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME IN ('users', 'password_reset_tokens', 'user_sessions');

COMMIT;

-- Display success message
SELECT 'Authentication tables created successfully! 🚀' AS message;
