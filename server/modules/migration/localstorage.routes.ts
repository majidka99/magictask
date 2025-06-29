import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { TaskService, BulkSyncSchema, ServiceError } from '../tasks/task.service.js';

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

// Local storage task export schema
const LocalStorageTaskSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'done']),
  priority: z.number().int().min(1).max(4),
  progress: z.number().int().min(0).max(100).default(0),
  category: z.string().max(100).default('General'),
  tags: z.array(z.string()).optional(),
  
  // Timestamps - handle various formats from localStorage
  createdAt: z.union([
    z.string().datetime(),
    z.string().refine(val => !isNaN(Date.parse(val)), 'Invalid date format'),
    z.number().refine(val => val > 0, 'Invalid timestamp')
  ]).optional().transform(val => {
    if (!val) return new Date().toISOString();
    if (typeof val === 'number') return new Date(val).toISOString();
    return new Date(val).toISOString();
  }),
  
  updatedAt: z.union([
    z.string().datetime(),
    z.string().refine(val => !isNaN(Date.parse(val)), 'Invalid date format'),
    z.number().refine(val => val > 0, 'Invalid timestamp')
  ]).optional().transform(val => {
    if (!val) return new Date().toISOString();
    if (typeof val === 'number') return new Date(val).toISOString();
    return new Date(val).toISOString();
  }),
  
  deadline: z.union([
    z.string().datetime(),
    z.string().refine(val => !isNaN(Date.parse(val)), 'Invalid date format'),
    z.number().refine(val => val > 0, 'Invalid timestamp')
  ]).optional().transform(val => {
    if (!val) return undefined;
    if (typeof val === 'number') return new Date(val).toISOString();
    return new Date(val).toISOString();
  }),
  
  completedAt: z.union([
    z.string().datetime(),
    z.string().refine(val => !isNaN(Date.parse(val)), 'Invalid date format'),
    z.number().refine(val => val > 0, 'Invalid timestamp')
  ]).optional().transform(val => {
    if (!val) return undefined;
    if (typeof val === 'number') return new Date(val).toISOString();
    return new Date(val).toISOString();
  }),
  
  // Time tracking
  timeSpent: z.number().int().min(0).default(0),
  estimatedDuration: z.number().int().positive().optional(),
  
  // Hierarchy (for future support)
  parentId: z.string().optional(),
  subtaskIds: z.array(z.string()).optional(),
  
  // Metadata
  viewCount: z.number().int().min(0).default(0),
  editCount: z.number().int().min(0).default(0),
  
  // Location data (for future support)
  location: z.object({
    address: z.string().optional(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number()
    }).optional(),
    timezone: z.string().optional()
  }).optional()
});

// Migration request schema
const LocalStorageMigrationSchema = z.object({
  tasks: z.array(LocalStorageTaskSchema),
  metadata: z.object({
    exportedAt: z.string().datetime().optional(),
    version: z.string().optional(),
    userAgent: z.string().optional(),
    totalTasks: z.number().int().min(0).optional()
  }).optional()
});

// Async handler wrapper
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
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
      success: false
    });
  }

  console.error('Migration endpoint error:', error);
  return res.status(500).json({
    error: 'Internal server error during migration',
    success: false
  });
};

// Validation middleware
const validateMigrationBody = (req: Request, res: Response, next: any) => {
  try {
    req.body = LocalStorageMigrationSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid migration data format',
        details: error.errors,
        success: false,
        message: 'Please ensure your exported data is valid and try again'
      });
    }
    next(error);
  }
};

const router = Router();

/**
 * POST /api/migration/localstorage
 * Import tasks from localStorage export
 */
router.post('/localstorage',
  validateMigrationBody,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { tasks: localTasks, metadata } = req.body as z.infer<typeof LocalStorageMigrationSchema>;

    // Log migration attempt
    console.log(`🔄 Starting localStorage migration for user ${userId}:`, {
      taskCount: localTasks.length,
      exportedAt: metadata?.exportedAt,
      version: metadata?.version,
      userAgent: req.get('User-Agent'),
      clientIP: req.ip
    });

    if (localTasks.length === 0) {
      return res.json({
        success: true,
        importedCount: 0,
        updatedCount: 0,
        conflictIds: [],
        skippedCount: 0,
        errorCount: 0,
        message: 'No tasks to import'
      });
    }

    try {
      // Transform localStorage tasks to the format expected by TaskService
      const transformedTasks = localTasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        category: task.category,
        tags: task.tags,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        deadline: task.deadline,
        completedAt: task.completedAt,
        timeSpent: task.timeSpent,
        estimatedDuration: task.estimatedDuration,
        progress: task.progress,
        parentId: task.parentId,
        subtaskIds: task.subtaskIds,
        viewCount: task.viewCount,
        editCount: task.editCount,
        location: task.location
      }));

      // Use TaskService bulk sync
      const result = await TaskService.syncBulk(userId, { tasks: transformedTasks });

      // Log migration results
      console.log(`✅ Migration completed for user ${userId}:`, {
        imported: result.imported,
        updated: result.updated,
        conflicts: result.conflicts.length,
        errors: result.errors.length,
        totalProcessed: localTasks.length
      });

      // Prepare detailed response
      const response = {
        success: true,
        importedCount: result.imported,
        updatedCount: result.updated,
        conflictIds: result.conflicts,
        skippedCount: result.conflicts.length,
        errorCount: result.errors.length,
        totalTasks: localTasks.length,
        message: `Migration completed: ${result.imported} imported, ${result.updated} updated, ${result.conflicts.length} conflicts`,
        
        // Include metadata for debugging
        metadata: {
          migrationTimestamp: new Date().toISOString(),
          userAgent: req.get('User-Agent'),
          originalExportDate: metadata?.exportedAt,
          originalVersion: metadata?.version,
          processingTimeMs: Date.now() - Date.parse(req.headers['x-request-start'] as string || '0')
        },

        // Include conflict details if any
        ...(result.conflicts.length > 0 && {
          conflicts: {
            ids: result.conflicts,
            reason: 'Server version is newer than imported version',
            recommendation: 'Review conflicted tasks manually to avoid data loss'
          }
        }),

        // Include error details if any
        ...(result.errors.length > 0 && {
          errors: result.errors.map(err => ({
            task: {
              id: err.task.id,
              title: err.task.title
            },
            error: err.error,
            suggestion: 'Check task data format and try again'
          }))
        })
      };

      // Set appropriate status code based on results
      const statusCode = result.errors.length > 0 ? 207 : 200; // 207 Multi-Status for partial success
      
      res.status(statusCode).json(response);

    } catch (error) {
      console.error(`❌ Migration failed for user ${userId}:`, error);
      
      // Log error details for debugging
      console.error('Migration error details:', {
        userId,
        taskCount: localTasks.length,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });

      handleServiceError(error, res);
    }
  })
);

/**
 * GET /api/migration/status
 * Check migration capabilities and user stats
 */
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  try {
    // Get user's current task count for reference
    const userTasks = await TaskService.listTasks(userId, { limit: 1 });
    
    res.json({
      success: true,
      capabilities: {
        supportsLocalStorageImport: true,
        maxTasksPerBatch: 1000,
        supportedFormats: ['localStorage-json'],
        supportedFields: [
          'title', 'description', 'status', 'priority', 'category', 'tags',
          'createdAt', 'updatedAt', 'deadline', 'completedAt',
          'timeSpent', 'estimatedDuration', 'progress'
        ]
      },
      currentUserStats: {
        existingTasks: userTasks.meta.total,
        canImport: true
      },
      recommendations: {
        backup: 'Consider exporting your current tasks before importing',
        conflicts: 'Review conflicts carefully to avoid data loss',
        largeImports: 'For imports over 100 tasks, consider doing them in batches'
      }
    });
  } catch (error) {
    console.error('Error getting migration status:', error);
    handleServiceError(error, res);
  }
}));

/**
 * POST /api/migration/preview
 * Preview what would be imported without actually importing
 */
router.post('/preview',
  validateMigrationBody,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { tasks: localTasks } = req.body as z.infer<typeof LocalStorageMigrationSchema>;

    try {
      // Analyze what would happen without actually importing
      const analysis = {
        totalTasks: localTasks.length,
        newTasks: 0,
        potentialUpdates: 0,
        potentialConflicts: 0,
        invalidTasks: 0,
        categories: new Set<string>(),
        dateRange: {
          earliest: null as string | null,
          latest: null as string | null
        },
        statusDistribution: {
          todo: 0,
          'in_progress': 0,
          done: 0
        }
      };

      // Get existing tasks for conflict detection
      const existingTasks = await TaskService.listTasks(userId, { limit: 1000 });
      const existingTaskTitles = new Set(existingTasks.data.map(t => t.title));
      const existingTaskIds = new Set(existingTasks.data.map(t => t.id));

      // Analyze each task
      localTasks.forEach(task => {
        // Category analysis
        analysis.categories.add(task.category);
        
        // Status distribution
        analysis.statusDistribution[task.status]++;
        
        // Date range analysis
        const createdAt = new Date(task.createdAt).toISOString();
        if (!analysis.dateRange.earliest || createdAt < analysis.dateRange.earliest) {
          analysis.dateRange.earliest = createdAt;
        }
        if (!analysis.dateRange.latest || createdAt > analysis.dateRange.latest) {
          analysis.dateRange.latest = createdAt;
        }
        
        // Conflict analysis
        if (task.id && existingTaskIds.has(task.id)) {
          analysis.potentialConflicts++;
        } else if (existingTaskTitles.has(task.title)) {
          analysis.potentialUpdates++;
        } else {
          analysis.newTasks++;
        }
      });

      res.json({
        success: true,
        preview: {
          ...analysis,
          categories: Array.from(analysis.categories),
          estimatedDuration: `${Math.ceil(localTasks.length / 10)} seconds`,
          warnings: [
            ...(analysis.potentialConflicts > 0 ? [`${analysis.potentialConflicts} tasks may have conflicts`] : []),
            ...(analysis.potentialUpdates > 0 ? [`${analysis.potentialUpdates} tasks may be updated`] : []),
            ...(localTasks.length > 100 ? ['Large import - consider reviewing in batches'] : [])
          ]
        },
        recommendations: [
          'Review the preview carefully before proceeding',
          'Backup your current tasks if you have many potential conflicts',
          'Import during low-activity periods for best performance'
        ]
      });

    } catch (error) {
      console.error('Error generating migration preview:', error);
      handleServiceError(error, res);
    }
  })
);

export default router;
