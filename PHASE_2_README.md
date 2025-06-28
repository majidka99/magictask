# MajiTask Phase 2: Backend API & Database Integration

## Overview

Phase 2 implements a complete backend API with MariaDB integration, user authentication, hybrid storage system, and migration capabilities. This phase transforms MajiTask from a localStorage-only application to a full-stack solution with robust data persistence and synchronization.

## 🚀 Key Features Implemented

### Backend Infrastructure
- **MariaDB Database Integration** with connection pooling and query optimization
- **RESTful Task Management API** with full CRUD operations
- **JWT Authentication System** with access and refresh tokens
- **Data Migration Endpoints** for localStorage to database migration
- **Background Synchronization** between frontend and backend
- **Hybrid Storage System** with automatic API/localStorage fallback

### Database Schema
- **Tasks Table** with comprehensive fields (title, description, priority, status, etc.)
- **Task Comments** with user attribution and timestamps
- **Task Activity Logging** for audit trails
- **User Authentication Tables** (from Phase 1)
- **Database Triggers** for automatic activity logging

### Frontend Enhancements
- **Zustand State Management** with optimistic updates
- **Repository Pattern** for data access abstraction
- **Web Worker Synchronization** for background data sync
- **Hybrid Storage Adapter** with automatic fallback mechanisms

## 📁 Project Structure

```
majitask/
├── server/
│   ├── db/
│   │   └── index.ts                    # Database connection and utilities
│   ├── modules/
│   │   ├── auth/
│   │   │   └── auth.service.ts         # Authentication middleware
│   │   ├── tasks/
│   │   │   ├── task.service.ts         # Task business logic
│   │   │   └── task.routes.ts          # Task API endpoints
│   │   └── migration/
│   │       └── localstorage.routes.ts  # Migration endpoints
│   └── index.js                        # Express server setup
├── src/
│   ├── repositories/
│   │   └── taskRepository.ts           # Data access layer
│   ├── store/
│   │   └── useTasksStore.ts           # Zustand state management
│   └── workers/
│       └── syncWorker.ts              # Background sync worker
├── migrations/
│   └── 20250702_create_tasks_tables.sql # Database schema
├── .env.example                        # Environment configuration
├── setup-phase2.sh                    # Setup script
└── test-api.sh                        # API testing script
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- MariaDB 10.5+ server running
- Git (for cloning)

### 1. Environment Configuration

Copy the environment template:
```bash
cp .env.example .env
```

Update `.env` with your actual values:
```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=majitask_user
DB_PASSWORD=your_secure_password_here
DB_NAME=majitask

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_REFRESH_SECRET=your-super-secret-refresh-key-minimum-32-characters-long

# Server Configuration
PORT=3863
NODE_ENV=development
API_BASE_URL=http://localhost:3863
FRONTEND_URL=http://localhost:5173
```

### 2. Database Setup

Create the database and user:
```sql
CREATE DATABASE majitask CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'majitask_user'@'localhost' IDENTIFIED BY 'your_secure_password_here';
GRANT ALL PRIVILEGES ON majitask.* TO 'majitask_user'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Quick Setup

Run the automated setup script:
```bash
chmod +x setup-phase2.sh
./setup-phase2.sh
```

### 4. Manual Setup

If you prefer manual setup:

```bash
# Install dependencies
npm install

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

## 🏗️ Architecture

### Database Layer (`server/db/index.ts`)
- **Connection Pooling**: Efficient MariaDB connection management
- **Query Helpers**: Standardized query execution with error handling
- **Transaction Support**: ACID compliance for complex operations
- **Slow Query Logging**: Performance monitoring and optimization
- **Graceful Shutdown**: Clean connection closure on app termination

### Service Layer (`server/modules/tasks/task.service.ts`)
- **Business Logic**: Core task management operations
- **Data Validation**: Zod schema validation for all inputs
- **Error Handling**: Custom ServiceError classes with proper HTTP codes
- **Activity Logging**: Automatic tracking of task modifications
- **Comment Management**: Full CRUD operations for task comments

### API Layer (`server/modules/tasks/task.routes.ts`)
- **RESTful Design**: Standard HTTP methods and status codes
- **JWT Authentication**: Secure user identification and authorization
- **Rate Limiting**: Protection against API abuse (5 requests per 15 minutes)
- **Input Validation**: Request body and parameter validation
- **Error Responses**: Consistent error format across all endpoints

### Frontend State Management (`src/store/useTasksStore.ts`)
- **Zustand Store**: Lightweight state management with TypeScript
- **Optimistic Updates**: Immediate UI feedback with rollback on failure
- **Filtering & Sorting**: Client-side data manipulation
- **Sync Status**: Real-time indication of data synchronization state
- **Error Handling**: User-friendly error messages and recovery

### Repository Pattern (`src/repositories/taskRepository.ts`)
- **Adapter Pattern**: Unified interface for API and localStorage access
- **Automatic Fallback**: Seamless switching between storage methods
- **Conflict Resolution**: Smart handling of data conflicts during sync
- **Cache Management**: Intelligent caching for performance optimization

### Background Synchronization (`src/workers/syncWorker.ts`)
- **Web Worker**: Non-blocking background data synchronization
- **Periodic Sync**: Automatic sync every 60 seconds when online
- **Online Detection**: Network status monitoring for sync optimization
- **Status Reporting**: Real-time sync status updates to main thread
- Supports various localStorage export formats
- Conflict detection (server newer than import)
- Detailed error reporting
- Preview mode for safe planning
- Comprehensive logging

## 🔌 API Documentation

### Base URL
```
http://localhost:3863/api
```

### Authentication
All task endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Task Endpoints

#### GET /api/tasks
Get all tasks for authenticated user
```bash
curl -H "Authorization: Bearer <token>" \
     http://localhost:3863/api/tasks
```

**Query Parameters:**
- `status` - Filter by status (todo, in_progress, completed, cancelled)
- `priority` - Filter by priority (1-5)
- `category` - Filter by category
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `sortBy` - Sort field (created_at, due_date, priority, title)
- `order` - Sort order (asc, desc)

#### POST /api/tasks
Create a new task
```bash
curl -X POST \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Complete Phase 2",
       "description": "Implement backend API",
       "priority": "high",
       "status": "in_progress",
       "due_date": "2025-01-15T10:00:00Z"
     }' \
     http://localhost:3863/api/tasks
```

#### PUT /api/tasks/:id
Update an existing task
```bash
curl -X PUT \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Updated Task Title",
       "status": "completed"
     }' \
     http://localhost:3863/api/tasks/123e4567-e89b-12d3-a456-426614174000
```

#### DELETE /api/tasks/:id
Delete a task
```bash
curl -X DELETE \
     -H "Authorization: Bearer <token>" \
     http://localhost:3863/api/tasks/123e4567-e89b-12d3-a456-426614174000
```

### Task Comments

#### GET /api/tasks/:id/comments
Get comments for a task
```bash
curl -H "Authorization: Bearer <token>" \
     http://localhost:3863/api/tasks/123e4567-e89b-12d3-a456-426614174000/comments
```

#### POST /api/tasks/:id/comments
Add a comment to a task
```bash
curl -X POST \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{
       "content": "This task is progressing well"
     }' \
     http://localhost:3863/api/tasks/123e4567-e89b-12d3-a456-426614174000/comments
```

### Bulk Operations

#### POST /api/tasks/bulk-sync
Synchronize multiple tasks
```bash
curl -X POST \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{
       "tasks": [
         {
           "id": "temp-1",
           "title": "New Task",
           "status": "todo"
         }
       ]
     }' \
     http://localhost:3863/api/tasks/bulk-sync
```

### Migration Endpoints

#### POST /api/migration/localstorage
Migrate localStorage data to database
```bash
curl -X POST \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{
       "tasks": [
         {
           "id": "local-task-1",
           "title": "Existing Local Task",
           "status": "todo",
           "created_at": "2025-01-01T00:00:00Z"
         }
       ],
       "options": {
         "preview": false,
         "conflict_resolution": "merge"
       }
     }' \
     http://localhost:3863/api/migration/localstorage
```
## ⚛️ Frontend Implementation

### Hybrid Repository Pattern (`src/repositories/taskRepository.ts`)
```typescript
class TaskRepository {
  // Automatic adapter switching
  private apiAdapter: ApiAdapter      // Server communication
  private localAdapter: LocalStorageAdapter  // Offline fallback
  
  // Unified interface
  async getAll(filters?: TaskFilters): Promise<PaginatedResult<Task>>
  async get(id: string): Promise<Task>
  async create(taskDto: CreateTaskDto): Promise<Task>
  async update(id: string, updates: UpdateTaskDto): Promise<Task>
  async remove(id: string): Promise<void>
  async addComment(taskId: string, body: string): Promise<TaskComment>
  async sync(): Promise<SyncResult | null>
}

// Automatic failover logic:
• Online + authenticated → API adapter
• Offline or network error → LocalStorage adapter
• Seamless switching based on connectivity
```

### State Management (`src/store/useTasksStore.ts`)
```typescript
// Zustand store with optimistic updates
const useTasksStore = create<TaskState>(() => ({
  // Data state
  tasks: Task[]
  currentTask: Task | null
  comments: Record<string, TaskComment[]>
  
  // UI state
  isLoading: boolean
  filters: TaskFilters
  pagination: PaginationMeta
  
  // Actions with optimistic updates
  createTask(dto) → Promise<Task>      // Immediate UI update
  updateTask(id, updates) → Promise<Task>  // Optimistic, rollback on error
  deleteTask(id) → Promise<void>       // Remove from UI, restore on error
  
  // Advanced features
  setFilters(filters) → void           // Auto-refetch
  sync() → Promise<SyncResult>         // Background sync
}))

// Computed selectors
export const useTasksSelectors = () => ({
  todoTasks, inProgressTasks, doneTasks
  tasksByCategory, overdueTasks, tasksDueToday
  stats: { total, completed, overdue, ... }
})
```

### Background Sync Worker (`src/workers/syncWorker.ts`)
```typescript
// Web Worker for background synchronization
class SyncWorker {
  // Automatic 60-second sync cycles
  // Connectivity detection
  // Error handling and recovery
  // Progress reporting to main thread
}

// Usage in main thread:
const worker = new Worker('/src/workers/syncWorker.ts')
worker.postMessage({ type: 'init', data: { token, apiBaseUrl } })

// Receives status updates:
worker.onmessage = ({ data }) => {
  // { status: 'synced', data: { sent: 5, received: 3, conflicts: [] } }
}
```

## 📊 API Response Formats

### Standard Response Structure
```json
{
  "data": T,                    // Response payload
  "meta": {                     // Metadata
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "message": "Operation successful"
}
```

### Error Response Structure
```json
{
  "error": "Validation failed",
  "code": "VALIDATION",
  "details": [
    {
      "field": "title",
      "message": "Title is required"
    }
  ],
  "success": false
}
```

### Migration Response
```json
{
  "success": true,
  "importedCount": 45,
  "updatedCount": 12,
  "conflictIds": ["task-uuid-1", "task-uuid-2"],
  "skippedCount": 2,
  "errorCount": 0,
  "message": "Migration completed successfully",
  "metadata": {
    "migrationTimestamp": "2025-06-28T10:30:00Z",
    "totalTasks": 59,
    "processingTimeMs": 1250
  }
}
```

## 🚀 Setup & Installation

### 1. Install Dependencies
```bash
cd majitask
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your database credentials and JWT secrets
```

### 3. Database Migration
```bash
# Run Phase 1 + Phase 2 migrations
npm run migrate:all

# Or individually:
npm run migrate:auth    # Phase 1 tables
npm run migrate:tasks   # Phase 2 tables
```

### 4. Development
```bash
# Start backend server (port 3863)
npm run dev:server

# Start frontend dev server (port 5173) - in another terminal
npm run dev
```

### 5. Production Build
```bash
npm run build
npm start
```

## 🧪 Testing

### API Testing Script
Use the provided test script to verify all endpoints:
```bash
chmod +x test-api.sh
./test-api.sh
```

### Manual Testing
1. **Authentication**: Register/login user via Phase 1 endpoints
2. **Task CRUD**: Create, read, update, delete tasks
3. **Comments**: Add and retrieve task comments
4. **Migration**: Test localStorage to database migration
5. **Sync**: Verify background synchronization works

### Database Verification
Check data integrity directly in MariaDB:
```sql
USE majitask;

-- View all tasks
SELECT * FROM tasks;

-- View task comments
SELECT * FROM task_comments;

-- View activity log
SELECT * FROM task_activity;
```

## 🔒 Security Features

### Authentication & Authorization
- **JWT Tokens**: Secure stateless authentication
- **Refresh Tokens**: Long-lived session management
- **User Isolation**: Tasks are user-specific and isolated
- **Token Validation**: All protected endpoints verify JWT tokens

### Input Validation
- **Zod Schemas**: Runtime type checking and validation
- **SQL Injection Prevention**: Parameterized queries only
- **XSS Protection**: Input sanitization and encoding
- **Rate Limiting**: API abuse prevention

### Data Protection
- **Password Hashing**: bcrypt with configurable rounds
- **Environment Variables**: Sensitive data externalized
- **Database SSL**: Optional encrypted database connections
- **CORS Configuration**: Cross-origin request control

## 📊 Performance Optimizations

### Database
- **Connection Pooling**: Reuse database connections efficiently
- **Indexed Columns**: Fast lookups on user_id and status
- **Query Optimization**: Efficient JOIN operations and WHERE clauses
- **Slow Query Monitoring**: Automatic logging of performance issues

### API
- **Async Operations**: Non-blocking request handling
- **Bulk Operations**: Reduce round-trips with batch processing
- **Caching Headers**: Browser caching for static responses
- **Compression**: Gzip compression for response payloads

### Frontend
- **Web Workers**: Background sync without UI blocking
- **Optimistic Updates**: Immediate UI feedback
- **Local Caching**: Reduce unnecessary API calls
- **Lazy Loading**: Load data only when needed

## 🚀 Deployment Considerations

### Environment Variables
Ensure all production values are set:
- Strong JWT secrets (minimum 32 characters)
- Secure database credentials
- HTTPS URLs for production
- Appropriate CORS origins

### Database Setup
- Enable SSL connections in production
- Configure proper backup strategies
- Set up monitoring and alerting
- Optimize MariaDB configuration for load

### Server Configuration
- Use process manager (PM2) for Node.js
- Configure reverse proxy (nginx)
- Set up SSL/TLS certificates
- Enable request/response logging

## 🔄 Migration Strategy

Phase 2 provides seamless migration from localStorage to database:

1. **Data Export**: Extract tasks from browser localStorage
2. **Conflict Detection**: Identify duplicates and conflicts
3. **Preview Mode**: Show migration results before applying
4. **Batch Processing**: Handle large datasets efficiently
5. **Rollback Support**: Undo migration if issues occur

## 📈 Monitoring & Logging

### Application Logs
- **Slow Queries**: Database performance monitoring
- **API Requests**: Request/response logging with timing
- **Error Tracking**: Detailed error logs with stack traces
- **Authentication Events**: Login/logout activity logging

### Health Checks
- **Database Connectivity**: Monitor connection pool status
- **API Endpoint Health**: Verify all endpoints are responsive
- **Sync Status**: Background synchronization monitoring
- **Memory Usage**: Track application resource consumption

## 🔮 Future Enhancements

### Phase 3 Candidates
- **Real-time Updates**: WebSocket integration for live collaboration
- **Advanced Search**: Full-text search with filters and sorting
- **File Attachments**: Upload and associate files with tasks
- **Team Collaboration**: Shared tasks and workspaces
- **Mobile App**: React Native application
- **Admin Dashboard**: User and system management interface

### Performance Improvements
- **Redis Caching**: Cache frequently accessed data
- **Database Clustering**: Horizontal scaling for high load
- **CDN Integration**: Static asset delivery optimization
- **GraphQL API**: More efficient data fetching

## 🛠️ Development Scripts

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Run database migrations
npm run migrate

# Build for production
npm run build

# Start production server
npm start

# Run API tests
npm run test:api

# Check TypeScript types
npm run type-check

# Format code
npm run format

# Lint code
npm run lint
```

## 📝 Contributing

1. Follow TypeScript best practices
2. Use Zod for all data validation
3. Implement proper error handling
4. Add comprehensive logging
5. Write tests for new features
6. Update documentation for changes

## 📞 Support

For issues or questions regarding Phase 2 implementation:
1. Check the logs for detailed error messages
2. Verify environment configuration
3. Test database connectivity
4. Review API endpoint responses
5. Check network connectivity for sync issues

---

**Phase 2 Status**: ✅ Complete  
**Next Phase**: Frontend UI Integration (Phase 3)  
**Last Updated**: January 2025
