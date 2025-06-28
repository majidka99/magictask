import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { query, transaction, queryWithConnection } from '../../db/index.js';
import { RowDataPacket } from 'mysql2';

// DTO Validation Schemas
export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'done']).default('todo'),
  priority: z.number().int().min(1).max(4).default(2),
  category: z.string().max(100).default('General'),
  tags: z.array(z.string()).optional(),
  deadline: z.string().datetime().optional(),
  estimatedDuration: z.number().int().positive().optional(),
  parentId: z.string().uuid().optional(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial();

export const ListTasksSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  search: z.string().optional(),
  category: z.string().optional(),
  sortBy: z.enum(['created_at', 'updated_at', 'deadline', 'priority', 'title']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const CommentSchema = z.object({
  body: z.string().min(1).max(2000),
  commentType: z.enum(['comment', 'status_change', 'system']).default('comment'),
});

export const BulkSyncSchema = z.object({
  tasks: z.array(z.object({
    id: z.string().uuid().optional(),
    title: z.string().min(1).max(255),
    description: z.string().optional(),
    status: z.enum(['todo', 'in_progress', 'done']),
    priority: z.number().int().min(1).max(4),
    category: z.string().max(100),
    tags: z.array(z.string()).optional(),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
    deadline: z.string().datetime().optional(),
    completedAt: z.string().datetime().optional(),
    timeSpent: z.number().int().min(0).optional(),
    estimatedDuration: z.number().int().positive().optional(),
    progress: z.number().int().min(0).max(100).default(0),
  }))
});

// Service Error Types
export class ServiceError extends Error {
  constructor(
    public code: 'NOT_FOUND' | 'FORBIDDEN' | 'CONFLICT' | 'VALIDATION' | 'INTERNAL',
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

// Types
export interface Task extends RowDataPacket {
  id: string;
  user_id: number;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: number;
  progress: number;
  category: string;
  tags?: string[];
  created_at: Date;
  updated_at: Date;
  deadline?: Date;
  completed_at?: Date;
  parent_id?: string;
  subtask_ids?: string[];
  time_spent: number;
  estimated_duration?: number;
  view_count: number;
  edit_count: number;
}

export interface TaskComment extends RowDataPacket {
  id: string;
  task_id: string;
  user_id: number;
  body: string;
  comment_type: 'comment' | 'status_change' | 'system';
  metadata?: any;
  is_edited: boolean;
  created_at: Date;
  updated_at: Date;
  user_name?: string;
  user_email?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Task Service Implementation
export class TaskService {
  /**
   * Create a new task for a user
   */
  static async createTask(userId: number, dto: z.infer<typeof CreateTaskSchema>): Promise<Task> {
    const validatedDto = CreateTaskSchema.parse(dto);
    const taskId = uuidv4();

    try {
      return await transaction(async (conn) => {
        // Check if parent task exists and belongs to user
        if (validatedDto.parentId) {
          const parentTasks = await queryWithConnection<Task>(
            conn,
            'SELECT id, user_id FROM tasks WHERE id = ? AND user_id = ?',
            [validatedDto.parentId, userId]
          );
          
          if (parentTasks.length === 0) {
            throw new ServiceError('NOT_FOUND', 'Parent task not found');
          }
        }

        // Insert the task
        await queryWithConnection(
          conn,
          `INSERT INTO tasks (
            id, user_id, title, description, status, priority, category, 
            tags, deadline, estimated_duration, parent_id, progress
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            taskId,
            userId,
            validatedDto.title,
            validatedDto.description || null,
            validatedDto.status,
            validatedDto.priority,
            validatedDto.category,
            validatedDto.tags ? JSON.stringify(validatedDto.tags) : null,
            validatedDto.deadline || null,
            validatedDto.estimatedDuration || null,
            validatedDto.parentId || null,
            0
          ]
        );

        // Update parent task's subtask_ids if this is a subtask
        if (validatedDto.parentId) {
          const parentTask = await queryWithConnection<Task>(
            conn,
            'SELECT subtask_ids FROM tasks WHERE id = ?',
            [validatedDto.parentId]
          );

          const currentSubtasks = parentTask[0]?.subtask_ids || [];
          const updatedSubtasks = [...currentSubtasks, taskId];

          await queryWithConnection(
            conn,
            'UPDATE tasks SET subtask_ids = ? WHERE id = ?',
            [JSON.stringify(updatedSubtasks), validatedDto.parentId]
          );
        }

        // Record activity (trigger will handle this, but we can add extra metadata)
        await queryWithConnection(
          conn,
          `INSERT INTO task_activity (task_id, action, actor_id, meta) 
           VALUES (?, 'create', ?, ?)`,
          [
            taskId,
            userId,
            JSON.stringify({
              source: 'api',
              hasParent: !!validatedDto.parentId,
              category: validatedDto.category
            })
          ]
        );

        // Fetch and return the created task
        const createdTasks = await queryWithConnection<Task>(
          conn,
          'SELECT * FROM tasks WHERE id = ?',
          [taskId]
        );

        return createdTasks[0];
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Duplicate entry')) {
        throw new ServiceError('CONFLICT', 'A task with this title already exists');
      }
      throw error;
    }
  }

  /**
   * Get a task by ID (user must own the task)
   */
  static async getTaskById(userId: number, taskId: string): Promise<Task> {
    const tasks = await query<Task>(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
      [taskId, userId]
    );

    if (tasks.length === 0) {
      throw new ServiceError('NOT_FOUND', 'Task not found');
    }

    // Increment view count
    await query(
      'UPDATE tasks SET view_count = view_count + 1 WHERE id = ?',
      [taskId]
    );

    return tasks[0];
  }

  /**
   * List tasks with filtering, pagination, and sorting
   */
  static async listTasks(
    userId: number, 
    options: z.infer<typeof ListTasksSchema>
  ): Promise<PaginatedResult<Task>> {
    const validatedOptions = ListTasksSchema.parse(options);
    const { page, limit, status, search, category, sortBy, order } = validatedOptions;
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions = ['user_id = ?'];
    const params = [userId];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    if (search) {
      conditions.push('(title LIKE ? OR description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await query<{ total: number }>(
      `SELECT COUNT(*) as total FROM tasks WHERE ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get paginated tasks
    const tasks = await query<Task>(
      `SELECT * FROM tasks 
       WHERE ${whereClause}
       ORDER BY ${sortBy} ${order.toUpperCase()}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const totalPages = Math.ceil(total / limit);

    return {
      data: tasks,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Update a task (user must own the task)
   */
  static async updateTask(
    userId: number, 
    taskId: string, 
    dto: z.infer<typeof UpdateTaskSchema>
  ): Promise<Task> {
    const validatedDto = UpdateTaskSchema.parse(dto);

    // Check if task exists and belongs to user
    const existingTasks = await query<Task>(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
      [taskId, userId]
    );

    if (existingTasks.length === 0) {
      throw new ServiceError('NOT_FOUND', 'Task not found');
    }

    const existingTask = existingTasks[0];

    // Build update query dynamically
    const updateFields = [];
    const updateParams = [];

    Object.entries(validatedDto).forEach(([key, value]) => {
      if (value !== undefined) {
        switch (key) {
          case 'tags':
            updateFields.push('tags = ?');
            updateParams.push(JSON.stringify(value));
            break;
          case 'estimatedDuration':
            updateFields.push('estimated_duration = ?');
            updateParams.push(value);
            break;
          default:
            updateFields.push(`${key} = ?`);
            updateParams.push(value);
        }
      }
    });

    if (updateFields.length === 0) {
      return existingTask;
    }

    // Handle completion logic
    if (validatedDto.status === 'done' && existingTask.status !== 'done') {
      updateFields.push('completed_at = NOW()');
      updateFields.push('progress = 100');
    } else if (validatedDto.status !== 'done' && existingTask.status === 'done') {
      updateFields.push('completed_at = NULL');
    }

    // Add updated_at
    updateFields.push('updated_at = NOW()');
    updateParams.push(taskId);

    // Execute update
    await query(
      `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    );

    // Record activity (trigger will handle basic logging)
    await query(
      `INSERT INTO task_activity (task_id, action, actor_id, meta) 
       VALUES (?, 'update', ?, ?)`,
      [
        taskId,
        userId,
        JSON.stringify({
          source: 'api',
          updatedFields: Object.keys(validatedDto).filter(k => validatedDto[k] !== undefined)
        })
      ]
    );

    // Return updated task
    const updatedTasks = await query<Task>(
      'SELECT * FROM tasks WHERE id = ?',
      [taskId]
    );

    return updatedTasks[0];
  }

  /**
   * Delete a task (user must own the task)
   */
  static async deleteTask(userId: number, taskId: string): Promise<void> {
    return await transaction(async (conn) => {
      // Check if task exists and belongs to user
      const tasks = await queryWithConnection<Task>(
        conn,
        'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
        [taskId, userId]
      );

      if (tasks.length === 0) {
        throw new ServiceError('NOT_FOUND', 'Task not found');
      }

      const task = tasks[0];

      // Record deletion activity before deleting
      await queryWithConnection(
        conn,
        `INSERT INTO task_activity (task_id, action, actor_id, meta, old_values) 
         VALUES (?, 'delete', ?, ?, ?)`,
        [
          taskId,
          userId,
          JSON.stringify({ source: 'api', taskTitle: task.title }),
          JSON.stringify({
            title: task.title,
            status: task.status,
            category: task.category
          })
        ]
      );

      // Remove from parent's subtask_ids if it's a subtask
      if (task.parent_id) {
        const parentTask = await queryWithConnection<Task>(
          conn,
          'SELECT subtask_ids FROM tasks WHERE id = ?',
          [task.parent_id]
        );

        if (parentTask.length > 0 && parentTask[0].subtask_ids) {
          const updatedSubtasks = parentTask[0].subtask_ids.filter(id => id !== taskId);
          await queryWithConnection(
            conn,
            'UPDATE tasks SET subtask_ids = ? WHERE id = ?',
            [JSON.stringify(updatedSubtasks), task.parent_id]
          );
        }
      }

      // Delete the task (CASCADE will handle comments and activities)
      await queryWithConnection(
        conn,
        'DELETE FROM tasks WHERE id = ?',
        [taskId]
      );
    });
  }

  /**
   * Add a comment to a task
   */
  static async addComment(
    userId: number, 
    taskId: string, 
    body: string,
    commentType: 'comment' | 'status_change' | 'system' = 'comment'
  ): Promise<TaskComment> {
    const validatedComment = CommentSchema.parse({ body, commentType });
    
    // Check if task exists and belongs to user
    const tasks = await query<Task>(
      'SELECT id FROM tasks WHERE id = ? AND user_id = ?',
      [taskId, userId]
    );

    if (tasks.length === 0) {
      throw new ServiceError('NOT_FOUND', 'Task not found');
    }

    const commentId = uuidv4();

    await query(
      `INSERT INTO task_comments (id, task_id, user_id, body, comment_type) 
       VALUES (?, ?, ?, ?, ?)`,
      [commentId, taskId, userId, validatedComment.body, validatedComment.commentType]
    );

    // Fetch and return the created comment with user info
    const comments = await query<TaskComment>(
      `SELECT tc.*, u.first_name, u.last_name, u.email,
              CONCAT(u.first_name, ' ', u.last_name) as user_name
       FROM task_comments tc
       JOIN users u ON tc.user_id = u.id
       WHERE tc.id = ?`,
      [commentId]
    );

    return comments[0];
  }

  /**
   * List comments for a task with pagination
   */
  static async listComments(
    userId: number, 
    taskId: string, 
    options: { page?: number; limit?: number } = {}
  ): Promise<PaginatedResult<TaskComment>> {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    // Check if task exists and belongs to user
    const tasks = await query<Task>(
      'SELECT id FROM tasks WHERE id = ? AND user_id = ?',
      [taskId, userId]
    );

    if (tasks.length === 0) {
      throw new ServiceError('NOT_FOUND', 'Task not found');
    }

    // Get total count
    const countResult = await query<{ total: number }>(
      'SELECT COUNT(*) as total FROM task_comments WHERE task_id = ?',
      [taskId]
    );
    const total = countResult[0].total;

    // Get paginated comments
    const comments = await query<TaskComment>(
      `SELECT tc.*, u.first_name, u.last_name, u.email,
              CONCAT(u.first_name, ' ', u.last_name) as user_name
       FROM task_comments tc
       JOIN users u ON tc.user_id = u.id
       WHERE tc.task_id = ?
       ORDER BY tc.created_at DESC
       LIMIT ? OFFSET ?`,
      [taskId, limit, offset]
    );

    const totalPages = Math.ceil(total / limit);

    return {
      data: comments,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Bulk sync tasks (for localStorage migration)
   */
  static async syncBulk(userId: number, tasksData: z.infer<typeof BulkSyncSchema>): Promise<{
    imported: number;
    updated: number;
    conflicts: string[];
    errors: Array<{ task: any; error: string }>;
  }> {
    const validatedData = BulkSyncSchema.parse(tasksData);
    let imported = 0;
    let updated = 0;
    const conflicts: string[] = [];
    const errors: Array<{ task: any; error: string }> = [];

    return await transaction(async (conn) => {
      for (const taskData of validatedData.tasks) {
        try {
          const taskId = taskData.id || uuidv4();
          
          // Check if task already exists
          const existingTasks = await queryWithConnection<Task>(
            conn,
            'SELECT * FROM tasks WHERE user_id = ? AND (id = ? OR title = ?)',
            [userId, taskId, taskData.title]
          );

          if (existingTasks.length > 0) {
            const existingTask = existingTasks[0];
            const existingUpdatedAt = new Date(existingTask.updated_at);
            const incomingUpdatedAt = taskData.updatedAt ? new Date(taskData.updatedAt) : new Date();

            // Check for conflicts (existing is newer)
            if (existingUpdatedAt > incomingUpdatedAt) {
              conflicts.push(taskId);
              continue;
            }

            // Update existing task
            await queryWithConnection(
              conn,
              `UPDATE tasks SET 
                title = ?, description = ?, status = ?, priority = ?, 
                category = ?, tags = ?, deadline = ?, time_spent = ?,
                estimated_duration = ?, progress = ?, updated_at = ?
               WHERE id = ?`,
              [
                taskData.title,
                taskData.description || null,
                taskData.status,
                taskData.priority,
                taskData.category,
                taskData.tags ? JSON.stringify(taskData.tags) : null,
                taskData.deadline || null,
                taskData.timeSpent || 0,
                taskData.estimatedDuration || null,
                taskData.progress || 0,
                taskData.updatedAt || new Date(),
                existingTask.id
              ]
            );
            updated++;
          } else {
            // Insert new task
            await queryWithConnection(
              conn,
              `INSERT INTO tasks (
                id, user_id, title, description, status, priority, category,
                tags, created_at, updated_at, deadline, completed_at,
                time_spent, estimated_duration, progress
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                taskId,
                userId,
                taskData.title,
                taskData.description || null,
                taskData.status,
                taskData.priority,
                taskData.category,
                taskData.tags ? JSON.stringify(taskData.tags) : null,
                taskData.createdAt || new Date(),
                taskData.updatedAt || new Date(),
                taskData.deadline || null,
                taskData.completedAt || null,
                taskData.timeSpent || 0,
                taskData.estimatedDuration || null,
                taskData.progress || 0
              ]
            );
            imported++;
          }

          // Record sync activity
          await queryWithConnection(
            conn,
            `INSERT INTO task_activity (task_id, action, actor_id, meta) 
             VALUES (?, 'update', ?, ?)`,
            [
              taskId,
              userId,
              JSON.stringify({
                source: 'bulk_sync',
                operation: existingTasks.length > 0 ? 'update' : 'import'
              })
            ]
          );

        } catch (error) {
          errors.push({
            task: taskData,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return { imported, updated, conflicts, errors };
    });
  }
}
