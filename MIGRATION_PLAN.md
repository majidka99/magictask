# MajiTask v3.0 - LocalStorage to MariaDB Migration Plan

## Current State Analysis

### ✅ What's Working:
- Ansible scripts with MariaDB setup (02_mariadb.yaml)
- Node.js backend with Express server
- React frontend with localStorage-based task management
- Domain configuration for majitask.fun

### 🎯 Migration Goals:
1. Change domain from majitask.fun → app.majitask.fun
2. Replace localStorage with MariaDB backend
3. Maintain all existing functionality
4. Zero data loss during migration

## Phase 1: Domain Configuration Update

### Changes Required:
1. **Update Ansible Variables**
   - Change domain_name from "majitask.fun" to "app.majitask.fun"
   - Update Let's Encrypt configuration
   - Update Nginx configuration

### Files to Modify:
- `ansible/00_majitask_master.yaml` (line 6)
- `ansible/03_nginx.yaml` (line 19)
- `ansible/04_letsencrypt.yaml` (domain references)
- `ansible/11_majitask_app_deployment.yaml` (line 6 and API URLs)

## Phase 2: Database Schema Design

### Tables Required:
```sql
-- Users table (for future authentication)
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tasks table (main task storage)
CREATE TABLE tasks (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status ENUM('todo', 'in-progress', 'done', 'cancelled') DEFAULT 'todo',
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  progress INT DEFAULT 0,
  tags JSON,
  
  -- Dates
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deadline TIMESTAMP NULL,
  start_date TIMESTAMP NULL,
  end_date TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  
  -- Location
  location_address TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  
  -- Recurrence
  is_template BOOLEAN DEFAULT FALSE,
  recurrence_rule JSON,
  template_id VARCHAR(36),
  next_due_date TIMESTAMP NULL,
  instance_number INT,
  
  -- Relationships
  subtask_ids JSON,
  
  -- User association (for future multi-user support)
  user_id INT DEFAULT 1,
  
  INDEX idx_status (status),
  INDEX idx_user_id (user_id),
  INDEX idx_deadline (deadline),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Comments table
CREATE TABLE comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id VARCHAR(36) NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
```

## Phase 3: Backend API Development

### New API Endpoints to Create:
```
GET    /api/tasks           - Get all tasks
POST   /api/tasks           - Create new task
GET    /api/tasks/:id       - Get specific task
PUT    /api/tasks/:id       - Update task
DELETE /api/tasks/:id       - Delete task

GET    /api/tasks/:id/comments - Get task comments
POST   /api/tasks/:id/comments - Add comment

POST   /api/migrate         - Migrate localStorage data to DB
GET    /api/export          - Export tasks as JSON
POST   /api/import          - Import tasks from JSON
```

### Database Service Layer:
- Create `server/services/taskService.js`
- Create `server/services/databaseService.js`
- Create `server/routes/taskRoutes.js`
- Add MySQL/MariaDB connection with `mysql2` package

## Phase 4: Frontend Updates

### Changes Required:
1. **Update taskManager.ts**
   - Replace localStorage functions with API calls
   - Maintain same interface for existing components
   - Add migration helper functions

2. **Update package.json**
   - Add axios or fetch for API calls
   - Update build scripts if needed

3. **Environment Configuration**
   - Update API URLs to point to app.majitask.fun

## Phase 5: Migration Strategy

### Safe Migration Process:
1. **Backup Current Data**: Export localStorage to JSON
2. **Deploy New Backend**: With migration endpoint
3. **Frontend Compatibility**: Support both localStorage and API
4. **Data Migration**: Transfer localStorage → MariaDB
5. **Switch Over**: Disable localStorage, use only API
6. **Cleanup**: Remove localStorage fallback code

## Phase 6: Deployment & Testing

### Testing Checklist:
- [ ] All CRUD operations work
- [ ] Task comments functionality
- [ ] Recurring tasks work correctly
- [ ] Location features intact
- [ ] Real-time updates
- [ ] Data persistence
- [ ] Performance benchmarks

### Deployment Steps:
1. Update DNS: Point app.majitask.fun to server
2. Run updated Ansible playbook
3. Deploy updated application
4. Test migration endpoint
5. Monitor logs and performance

## Risk Mitigation

### Backup Strategy:
1. Full database backups before migration
2. Export localStorage data before deployment
3. Rollback plan to previous version
4. Database rollback scripts

### Progressive Deployment:
1. Deploy backend changes first
2. Test API endpoints independently  
3. Deploy frontend with dual-mode support
4. Migrate data in controlled batches
5. Monitor each step carefully

## Timeline Estimate

- **Phase 1 (Domain)**: 1-2 hours
- **Phase 2 (Schema)**: 2-3 hours  
- **Phase 3 (Backend)**: 6-8 hours
- **Phase 4 (Frontend)**: 4-6 hours
- **Phase 5 (Migration)**: 3-4 hours
- **Phase 6 (Deploy/Test)**: 2-3 hours

**Total**: 18-26 hours

## Next Steps

1. **Start with Phase 1**: Update domain configuration
2. **Test domain changes**: Ensure SSL works with app.majitask.fun
3. **Design database schema**: Refine table structure
4. **Plan API interface**: Define exact endpoints and data formats
5. **Begin backend development**: Start with database connection and basic CRUD

Would you like to proceed with Phase 1 (domain update) first?
