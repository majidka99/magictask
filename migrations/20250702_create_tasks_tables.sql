-- Migration: Create Tasks Tables
-- Date: 2025-07-02
-- Description: Create tasks, task_comments, and task_activity tables with proper relationships

START TRANSACTION;

-- Enable UUID generation (if not already enabled)
-- SET @uuid_function_exists = (SELECT COUNT(*) FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_NAME = 'UUID');
-- Note: MySQL 8.0+ has UUID() function built-in, MariaDB 10.6+ supports it

-- 📋 Tasks table - Core task management with user relationships
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(36) PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    status ENUM('todo', 'in_progress', 'done') NOT NULL DEFAULT 'todo',
    priority TINYINT NOT NULL DEFAULT 2 COMMENT '1=Low, 2=Medium, 3=High, 4=Critical',
    progress INT DEFAULT 0 COMMENT 'Percentage complete 0-100',
    category VARCHAR(100) DEFAULT 'General',
    tags JSON NULL COMMENT 'Array of tag strings',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deadline TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    
    -- Task hierarchy support
    parent_id VARCHAR(36) NULL,
    subtask_ids JSON NULL COMMENT 'Array of subtask IDs for quick access',
    
    -- Time tracking
    time_spent INT DEFAULT 0 COMMENT 'Minutes spent on task',
    estimated_duration INT NULL COMMENT 'Estimated minutes to complete',
    
    -- Location data (for future features)
    location JSON NULL COMMENT 'Location data: {address, coordinates, timezone}',
    
    -- Recurrence support (for future features)
    recurrence_rule JSON NULL COMMENT 'Recurrence pattern data',
    is_template BOOLEAN DEFAULT FALSE,
    template_id VARCHAR(36) NULL,
    
    -- Metadata
    view_count INT DEFAULT 0,
    edit_count INT DEFAULT 0,
    
    -- Indexes for performance
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_created_at (created_at),
    INDEX idx_updated_at (updated_at),
    INDEX idx_deadline (deadline),
    INDEX idx_parent_id (parent_id),
    INDEX idx_template_id (template_id),
    INDEX idx_category (category),
    
    -- Unique constraint to prevent duplicate task titles per user
    UNIQUE KEY unique_user_title (user_id, title),
    
    -- Foreign key constraints
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES tasks(id) ON DELETE SET NULL
);

-- 💬 Task Comments table - User comments and discussions on tasks
CREATE TABLE IF NOT EXISTS task_comments (
    id VARCHAR(36) PRIMARY KEY,
    task_id VARCHAR(36) NOT NULL,
    user_id INT NOT NULL,
    body TEXT NOT NULL,
    comment_type ENUM('comment', 'status_change', 'system') DEFAULT 'comment',
    metadata JSON NULL COMMENT 'Additional comment context data',
    is_edited BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_task_id (task_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_comment_type (comment_type),
    
    -- Foreign key constraints
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 📊 Task Activity table - Audit trail of all task operations
CREATE TABLE IF NOT EXISTS task_activity (
    id VARCHAR(36) PRIMARY KEY,
    task_id VARCHAR(36) NOT NULL,
    action ENUM('create', 'update', 'delete', 'comment', 'status_change', 'assign', 'complete') NOT NULL,
    actor_id INT NOT NULL COMMENT 'User who performed the action',
    meta JSON NULL COMMENT 'Action-specific metadata and context',
    
    -- Change tracking
    old_values JSON NULL COMMENT 'Previous values before change',
    new_values JSON NULL COMMENT 'New values after change',
    
    -- Context
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_task_id (task_id),
    INDEX idx_actor_id (actor_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at),
    INDEX idx_task_action (task_id, action),
    
    -- Foreign key constraints
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 🏷️ Task Tags table - User-specific tag management
CREATE TABLE IF NOT EXISTS task_tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    tag_name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#6B7280' COMMENT 'Hex color code',
    usage_count INT DEFAULT 0 COMMENT 'Number of tasks using this tag',
    description TEXT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Unique constraint per user
    UNIQUE KEY unique_user_tag (user_id, tag_name),
    
    -- Indexes
    INDEX idx_user_id (user_id),
    INDEX idx_usage_count (usage_count),
    INDEX idx_tag_name (tag_name),
    
    -- Foreign key
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 📈 Task Statistics table - Daily aggregated task metrics per user
CREATE TABLE IF NOT EXISTS task_statistics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    stat_date DATE NOT NULL,
    
    -- Daily metrics
    tasks_created INT DEFAULT 0,
    tasks_completed INT DEFAULT 0,
    tasks_updated INT DEFAULT 0,
    comments_added INT DEFAULT 0,
    time_tracked_minutes INT DEFAULT 0,
    
    -- Productivity metrics
    productivity_score DECIMAL(5,2) DEFAULT 0.00,
    focus_time_minutes INT DEFAULT 0,
    most_productive_hour TINYINT NULL COMMENT '0-23 hour',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint
    UNIQUE KEY unique_user_date (user_id, stat_date),
    
    -- Indexes
    INDEX idx_user_id (user_id),
    INDEX idx_stat_date (stat_date),
    INDEX idx_productivity_score (productivity_score),
    
    -- Foreign key
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create triggers for automatic activity logging
DELIMITER $$

-- Trigger for task creation
CREATE TRIGGER IF NOT EXISTS tr_task_insert_activity 
AFTER INSERT ON tasks
FOR EACH ROW
BEGIN
    INSERT INTO task_activity (task_id, action, actor_id, meta, new_values)
    VALUES (
        NEW.id, 
        'create', 
        NEW.user_id,
        JSON_OBJECT('title', NEW.title, 'category', NEW.category),
        JSON_OBJECT(
            'title', NEW.title,
            'description', NEW.description,
            'status', NEW.status,
            'priority', NEW.priority,
            'category', NEW.category
        )
    );
END$$

-- Trigger for task updates
CREATE TRIGGER IF NOT EXISTS tr_task_update_activity 
AFTER UPDATE ON tasks
FOR EACH ROW
BEGIN
    DECLARE changed_fields JSON DEFAULT JSON_OBJECT();
    DECLARE old_values JSON DEFAULT JSON_OBJECT();
    DECLARE new_values JSON DEFAULT JSON_OBJECT();
    
    -- Track what fields changed
    IF OLD.title != NEW.title THEN
        SET changed_fields = JSON_SET(changed_fields, '$.title', TRUE);
        SET old_values = JSON_SET(old_values, '$.title', OLD.title);
        SET new_values = JSON_SET(new_values, '$.title', NEW.title);
    END IF;
    
    IF OLD.status != NEW.status THEN
        SET changed_fields = JSON_SET(changed_fields, '$.status', TRUE);
        SET old_values = JSON_SET(old_values, '$.status', OLD.status);
        SET new_values = JSON_SET(new_values, '$.status', NEW.status);
    END IF;
    
    IF OLD.priority != NEW.priority THEN
        SET changed_fields = JSON_SET(changed_fields, '$.priority', TRUE);
        SET old_values = JSON_SET(old_values, '$.priority', OLD.priority);
        SET new_values = JSON_SET(new_values, '$.priority', NEW.priority);
    END IF;
    
    -- Only log if something actually changed
    IF JSON_LENGTH(changed_fields) > 0 THEN
        INSERT INTO task_activity (task_id, action, actor_id, meta, old_values, new_values)
        VALUES (
            NEW.id,
            CASE 
                WHEN OLD.status != NEW.status THEN 'status_change'
                ELSE 'update'
            END,
            NEW.user_id,
            changed_fields,
            old_values,
            new_values
        );
        
        -- Update edit count
        UPDATE tasks SET edit_count = edit_count + 1 WHERE id = NEW.id;
    END IF;
END$$

-- Trigger for comment creation
CREATE TRIGGER IF NOT EXISTS tr_comment_insert_activity 
AFTER INSERT ON task_comments
FOR EACH ROW
BEGIN
    INSERT INTO task_activity (task_id, action, actor_id, meta)
    VALUES (
        NEW.task_id,
        'comment',
        NEW.user_id,
        JSON_OBJECT('comment_id', NEW.id, 'comment_type', NEW.comment_type)
    );
END$$

DELIMITER ;

-- Insert some default categories for new users (optional)
-- This would typically be handled in application code during user registration

COMMIT;
