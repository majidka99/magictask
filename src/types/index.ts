export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

// Recurring task types
export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type MonthlyType = 'date' | 'day'; // "15th" vs "second Tuesday"
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sunday, 1=Monday, etc.

export interface RecurrenceRule {
  type: RecurrenceType;
  interval: number; // every N days/weeks/months/years
  daysOfWeek?: WeekDay[]; // for weekly recurrence
  dayOfMonth?: number; // 1-31 for monthly date-based
  monthlyType?: MonthlyType; // 'date' or 'day'
  weekOfMonth?: number; // 1-4, -1 for last (for monthly day-based)
  endDate?: Date; // when to stop recurring
  maxOccurrences?: number; // alternative to endDate
  skipWeekends?: boolean; // skip Saturday/Sunday for work tasks
}

// Location interface for Google Places integration
export interface TaskLocation {
  address: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  placeId?: string; // Google Place ID for additional details
}

export interface Task {
  id: string;
  title: string;
  description: string;
  
  // Enhanced Status Management
  status: TaskStatus;
  priority: TaskPriority;
  progress: number; // 0-100%
  
  // Enhanced Date/Time Management
  startDate?: Date;
  endDate?: Date;
  deadline?: Date;
  estimatedDuration?: number; // in minutes
  
  // Hierarchy & Organization
  parentId?: string; // For subtasks
  subtaskIds: string[]; // Array of subtask IDs
  category: string;
  tags: string[];
  
  // Location Management
  location?: TaskLocation;
  
  // Recurring Tasks
  isTemplate: boolean; // true for recurring task templates
  recurrence?: RecurrenceRule; // only for templates
  templateId?: string; // links generated tasks to their template
  nextDueDate?: Date; // when next instance should be created (for templates)
  instanceNumber?: number; // which occurrence this is (for instances)
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  
  // Comments
  comments: Comment[];
  
  // Time tracking
  timeSpent?: number; // Total time spent in minutes
  
  // Backward compatibility
  completed: boolean; // Derived from status === 'done'
}

export interface Comment {
  id: string;
  text: string;
  createdAt: Date;
}

export interface TaskFilters {
  category?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  hasDeadline?: boolean;
  overdue?: boolean;
  // Backward compatibility
  completed?: boolean;
}

export interface SubTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  parentTaskId: string;
  order: number;
  estimatedDuration?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskStatistics {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  cancelled: number;
  overdue: number;
}

// Status transition rules
export const VALID_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  'todo': ['in-progress', 'cancelled'],
  'in-progress': ['done', 'todo', 'cancelled'],
  'done': ['todo'], // Allow reopening completed tasks
  'cancelled': ['todo'] // Allow reactivating cancelled tasks
};

// Priority levels with colors
export const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-800', order: 1 },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-800', order: 2 },
  high: { label: 'High', color: 'bg-orange-100 text-orange-800', order: 3 },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-800', order: 4 }
};

// Status configuration
export const STATUS_CONFIG = {
  'todo': { label: 'To Do', color: 'bg-gray-100 text-gray-800', icon: '📋' },
  'in-progress': { label: 'In Progress', color: 'bg-blue-100 text-blue-800', icon: '⚡' },
  'done': { label: 'Done', color: 'bg-green-100 text-green-800', icon: '✅' },
  'cancelled': { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: '❌' }
};
