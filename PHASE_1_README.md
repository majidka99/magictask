# 🔐 Phase 1: Authentication & User Foundation

This phase implements the core authentication system with MariaDB backend and React frontend components, all integrated into the main `majitask/` directory.

## 📁 Final Integrated Structure

```
majitask/                            # 🏠 Main application root
├── server/                          # 🖥️ Backend (Node.js/Express)
│   ├── index.js                     # Main server with auth integration
│   ├── db/
│   │   └── pool.ts                  # MariaDB connection pool
│   ├── modules/
│   │   └── auth/
│   │       ├── auth.service.ts      # Auth business logic & JWT
│   │       └── auth.routes.js       # Auth API endpoints  
│   ├── routes/
│   │   └── emailRoutes.js           # Existing email routes
│   └── services/
│       └── emailService.js          # Existing email service
├── src/                             # 🎨 Frontend (React/TypeScript)
│   ├── components/
│   │   ├── ProtectedRoute.tsx       # Route protection HOC
│   │   └── [existing components]
│   ├── modules/
│   │   └── auth/
│   │       └── useAuth.tsx          # Zustand auth store & context
│   ├── hooks/
│   ├── types/
│   └── utils/
├── migrations/                      # 🗃️ Database migrations
│   └── 20250701_create_auth_tables.sql
├── package.json                     # All dependencies (unified)
├── .env                            # Environment configuration
├── .env.example                    # Environment template
└── [existing config files]
```

**✅ Integration Complete:**
- All backend auth code moved to `majitask/server/modules/auth/`
- All frontend auth code moved to `majitask/src/modules/auth/`
- Auth routes integrated into existing Express server
- Dependencies unified in main `package.json`
- No separate backend/frontend directories needed

## 🗄️ Database Schema

### Core Tables
- **users**: Authentication, profiles, roles (user/admin)
- **password_reset_tokens**: Secure password reset workflow
- **user_sessions**: JWT session management & blacklisting

### Features
- ✅ Bcrypt password hashing (12 rounds)
- ✅ JWT access (15m) + refresh (7d) tokens
- ✅ Token blacklisting via database
- ✅ Password strength validation
- ✅ Default admin user creation

## 🔧 Backend Features

### AuthService Methods
```typescript
// Password management
hashPassword(password)
verifyPassword(password, hash)
validatePassword(password)  // 8+ chars, upper, lower, number, special

// Authentication
register(userData)
login(email, password)
refreshToken(refreshToken)
logout(jti)

// Password reset
generatePasswordResetToken(email)
resetPassword(token, newPassword)

// Profile management
getUserById(id)
updateProfile(userId, updates)
changePassword(userId, currentPassword, newPassword)

// Session management
getUserSessions(userId)
revokeSession(userId, sessionId)
```

### API Endpoints
```
POST /api/auth/register       # User registration
POST /api/auth/login          # User login  
POST /api/auth/logout         # Revoke session
POST /api/auth/refresh        # Refresh tokens
POST /api/auth/forgot-password # Request password reset
POST /api/auth/reset-password  # Reset with token
GET  /api/auth/verify-email    # Email verification (placeholder)
POST /api/auth/resend-verification # Resend verification (placeholder)
```

### Security Features
- 🛡️ Rate limiting: 5 requests/15min on auth endpoints
- 🔒 CORS protection with configurable origins
- 🛡️ Helmet security headers
- 📝 Slow query logging (>300ms)
- 🔄 Graceful shutdown handling

## ⚛️ Frontend Features

### useAuth Hook
```typescript
const {
  user,                    // Current user object
  isAuthenticated,         // Boolean auth status
  isLoading,              // Loading state
  login,                  // Login function
  register,               // Registration function
  logout,                 // Logout function
  refreshToken,           // Manual token refresh
  getSessions,            // Get user sessions
  revokeSession,          // Revoke specific session
  updateProfile,          // Update user profile
  changePassword,         // Change password
  error,                  // Error state
  clearError             // Clear error state
} = useAuth();
```

### Route Protection
```tsx
// Basic authentication required
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>

// Admin role required
<ProtectedRoute requiredRole="admin">
  <AdminPanel />
</ProtectedRoute>

// Convenience components
<AdminRoute><AdminPanel /></AdminRoute>
<UserRoute><UserDashboard /></UserRoute>

// HOC pattern
const ProtectedDashboard = withAuth(Dashboard, 'admin');
```

### State Management
- 🔄 Zustand store with localStorage persistence
- ⏰ Automatic token refresh (1min before expiry)
- 🔄 Token rotation on refresh
- 📱 Multi-tab synchronization
- 🌐 Authenticated fetch wrapper

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run migrate
npm run dev
```

### 2. Frontend Setup  
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with API URL
npm run dev
```

### 3. Database Migration
```bash
# Run the migration script
cd backend
mysql -u your_user -p your_db < migrations/20250701_create_auth_tables.sql
```

## 🔑 Environment Variables

### Backend (.env)
```env
DB_HOST=localhost
DB_USER=majitask_user
DB_PASSWORD=secure_password
DB_NAME=majitask
JWT_SECRET=32-char-minimum-secret
JWT_REFRESH_SECRET=32-char-minimum-secret
PORT=3863
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:3863
VITE_APP_NAME=MajiTask
```

## 🧪 Testing Authentication

### Registration
```bash
curl -X POST http://localhost:3863/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Login
```bash
curl -X POST http://localhost:3863/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com", 
    "password": "SecurePass123!"
  }'
```

## 🎯 Next Steps

Phase 1 provides the foundation. Next phases will add:

- **Phase 2**: Task CRUD API with user relationships
- **Phase 3**: Frontend storage abstraction & migration wizard  
- **Phase 4**: Admin dashboard & user management
- **Phase 5**: Email services & verification
- **Phase 6**: Testing & deployment

## 🔧 Development Notes

- TypeScript errors are expected until dependencies are installed
- Default admin user password hash needs to be updated on first run
- Email verification endpoints are placeholders (implement in Phase 5)
- Rate limiting uses in-memory store (consider Redis for production)
- JWT secrets should be 32+ characters in production

---

**✅ Phase 1 Complete**: Secure authentication foundation with JWT, password reset, session management, and role-based access control.
