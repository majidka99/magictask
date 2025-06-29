import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { 
  TaskService, 
  CreateTaskSchema, 
  UpdateTaskSchema, 
  ListTasksSchema,
  CommentSchema,
  BulkSyncSchema,
  ServiceError 
} from './task.service.js';

// Extend Request interface to include user from JWT middleware
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        email: string;
        role: 'user' | 'admin';
        jti: string;
      };
    }
  }
}

// Rate limiting for mutating operations
const mutatingLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100, // 100 requests per 10 minutes per IP
  message: {
    error: 'Too many requests. Please try again later.',
    retryAfter: '10 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit per user if authenticated, otherwise per IP
    return req.user?.userId.toString() || req.ip;
  }
});

// Bulk operations rate limiting (more restrictive)
const bulkLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 bulk operations per hour per user
  message: {
    error: 'Bulk operation limit exceeded. Please try again later.',
    retryAfter: '1 hour'
  },
  keyGenerator: (req) => req.user?.userId.toString() || req.ip
});

// Async handler wrapper to catch errors
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Validation middleware factory
const validateQuery = (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  try {
    req.query = schema.parse(req.query);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: error.errors,
        message: 'Validation failed'
      });
    }
    next(error);
  }
};

const validateBody = (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: error.errors,
        message: 'Validation failed'
      });
    }
    next(error);
  }
};

// Error handler for service errors
const handleServiceError = (error: any, res: Response) => {
  if (error instanceof ServiceError) {
    const statusCode = {
      'NOT_FOUND': 404,
      'FORBIDDEN': 403,
      'CONFLICT': 409,
      'VALIDATION': 400,
      'INTERNAL': 500
    }[error.code] || 500;

    return res.status(statusCode).json({
      error: error.message,
      code: error.code,
      details: error.details,
      message: 'Service error occurred'
    });
  }

  console.error('Unhandled error in task routes:', error);
  return res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  });
};

// Query schema for pagination and filtering
const PaginationQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? Math.min(parseInt(val, 10), 100) : 20)
});

const TaskQuerySchema = ListTasksSchema.extend({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? Math.min(parseInt(val, 10), 100) : 20),
  status: z.string().optional().refine(val => !val || ['todo', 'in_progress', 'done'].includes(val)),
  search: z.string().optional(),
  category: z.string().optional(),
  sortBy: z.string().optional().refine(val => !val || ['created_at', 'updated_at', 'deadline', 'priority', 'title'].includes(val)),
  order: z.string().optional().refine(val => !val || ['asc', 'desc'].includes(val))
});

// UUID validation schema
const UuidParamsSchema = z.object({
  id: z.string().uuid('Invalid task ID format')
});

const router = Router();

/**
 * GET /api/tasks
 * List tasks with filtering, pagination, and sorting
 */
router.get('/', 
  validateQuery(TaskQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const queryParams = req.query as z.infer<typeof TaskQuerySchema>;

    try {
      const result = await TaskService.listTasks(userId, queryParams);
      
      res.json({
        data: result.data,
        meta: result.meta,
        message: `Retrieved ${result.data.length} tasks`
      });
    } catch (error) {
      handleServiceError(error, res);
    }
  })
);

/**
 * POST /api/tasks
 * Create a new task
 */
router.post('/',
  mutatingLimiter,
  validateBody(CreateTaskSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const taskData = req.body as z.infer<typeof CreateTaskSchema>;

    try {
      const task = await TaskService.createTask(userId, taskData);
      
      res.status(201).json({
        data: task,
        meta: { created: true },
        message: 'Task created successfully'
      });
    } catch (error) {
      handleServiceError(error, res);
    }
  })
);

/**
 * GET /api/tasks/:id
 * Get a specific task by ID
 */
router.get('/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    
    try {
      const { id } = UuidParamsSchema.parse(req.params);
      const task = await TaskService.getTaskById(userId, id);
      
      res.json({
        data: task,
        meta: { viewed: true },
        message: 'Task retrieved successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid task ID format',
          details: error.errors,
          message: 'Validation failed'
        });
      }
      handleServiceError(error, res);
    }
  })
);

/**
 * PUT /api/tasks/:id
 * Update a specific task
 */
router.put('/:id',
  mutatingLimiter,
  validateBody(UpdateTaskSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const updateData = req.body as z.infer<typeof UpdateTaskSchema>;

    try {
      const { id } = UuidParamsSchema.parse(req.params);
      const task = await TaskService.updateTask(userId, id, updateData);
      
      res.json({
        data: task,
        meta: { updated: true },
        message: 'Task updated successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid task ID format',
          details: error.errors,
          message: 'Validation failed'
        });
      }
      handleServiceError(error, res);
    }
  })
);

/**
 * DELETE /api/tasks/:id
 * Delete a specific task
 */
router.delete('/:id',
  mutatingLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    try {
      const { id } = UuidParamsSchema.parse(req.params);
      await TaskService.deleteTask(userId, id);
      
      res.json({
        data: null,
        meta: { deleted: true },
        message: 'Task deleted successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid task ID format',
          details: error.errors,
          message: 'Validation failed'
        });
      }
      handleServiceError(error, res);
    }
  })
);

/**
 * POST /api/tasks/:id/comments
 * Add a comment to a task
 */
router.post('/:id/comments',
  mutatingLimiter,
  validateBody(CommentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { body: commentBody, commentType } = req.body as z.infer<typeof CommentSchema>;

    try {
      const { id } = UuidParamsSchema.parse(req.params);
      const comment = await TaskService.addComment(userId, id, commentBody, commentType);
      
      res.status(201).json({
        data: comment,
        meta: { created: true },
        message: 'Comment added successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid task ID format',
          details: error.errors,
          message: 'Validation failed'
        });
      }
      handleServiceError(error, res);
    }
  })
);

/**
 * GET /api/tasks/:id/comments
 * List comments for a task
 */
router.get('/:id/comments',
  validateQuery(PaginationQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { page, limit } = req.query as z.infer<typeof PaginationQuerySchema>;

    try {
      const { id } = UuidParamsSchema.parse(req.params);
      const result = await TaskService.listComments(userId, id, { page, limit });
      
      res.json({
        data: result.data,
        meta: result.meta,
        message: `Retrieved ${result.data.length} comments`
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid task ID format',
          details: error.errors,
          message: 'Validation failed'
        });
      }
      handleServiceError(error, res);
    }
  })
);

/**
 * POST /api/tasks/sync/bulk
 * Bulk sync tasks (primarily for localStorage migration)
 */
router.post('/sync/bulk',
  bulkLimiter,
  validateBody(BulkSyncSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const syncData = req.body as z.infer<typeof BulkSyncSchema>;

    try {
      const result = await TaskService.syncBulk(userId, syncData);
      
      res.json({
        data: result,
        meta: { 
          operation: 'bulk_sync',
          totalTasks: syncData.tasks.length,
          successful: result.imported + result.updated,
          failed: result.errors.length
        },
        message: `Bulk sync completed: ${result.imported} imported, ${result.updated} updated, ${result.conflicts.length} conflicts`
      });
    } catch (error) {
      handleServiceError(error, res);
    }
  })
);

/**
 * Global error handler for the tasks router
 */
router.use((error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Task router error:', {
    path: req.path,
    method: req.method,
    user: req.user?.userId,
    error: error.message,
    stack: error.stack
  });

  if (res.headersSent) {
    return next(error);
  }

  handleServiceError(error, res);
});

export default router;
