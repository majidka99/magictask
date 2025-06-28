import { Task, Comment, TaskStatus, TaskPriority, TaskLocation, RecurrenceRule } from '../types';
import { calculateTaskProgress } from './taskUtils';
import { RecurrenceService } from './recurrenceService';

const STORAGE_KEY = 'majitask-data';

export const saveToStorage = (tasks: Task[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
};

export const loadFromStorage = (): Task[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const parsed = JSON.parse(data);
    return parsed.map((task: any) => ({
      ...task,
      // Handle date fields
      createdAt: new Date(task.createdAt),
      updatedAt: new Date(task.updatedAt),
      deadline: task.deadline ? new Date(task.deadline) : undefined,
      startDate: task.startDate ? new Date(task.startDate) : undefined,
      endDate: task.endDate ? new Date(task.endDate) : undefined,
      completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
      
      // Handle new fields with defaults
      status: task.status || (task.completed ? 'done' : 'todo'),
      priority: task.priority || 'medium',
      progress: task.progress !== undefined ? task.progress : (task.completed ? 100 : 0),
      subtaskIds: task.subtaskIds || [],
      tags: task.tags || [],
      location: task.location || undefined,
      
      // Recurring task fields with defaults
      isTemplate: task.isTemplate || false,
      recurrence: task.recurrence || undefined,
      templateId: task.templateId || undefined,
      nextDueDate: task.nextDueDate ? new Date(task.nextDueDate) : undefined,
      instanceNumber: task.instanceNumber || undefined,
      
      // Ensure backward compatibility
      completed: task.status ? task.status === 'done' : task.completed,
      
      // Handle comments
      comments: task.comments.map((comment: any) => ({
        ...comment,
        createdAt: new Date(comment.createdAt)
      }))
    }));
  } catch (error) {
    console.error('Error loading tasks from storage:', error);
    return [];
  }
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const createTask = (
  title: string,
  description: string,
  category: string,
  deadline?: Date,
  priority: TaskPriority = 'medium',
  startDate?: Date,
  endDate?: Date,
  location?: TaskLocation,
  recurrence?: RecurrenceRule
): Task => {
  const now = new Date();
  const isTemplate = !!recurrence;
  
  return {
    id: generateId(),
    title,
    description,
    category,
    deadline,
    
    // Enhanced Status Management
    status: 'todo' as TaskStatus,
    priority,
    progress: 0,
    
    // Enhanced Date/Time Management
    startDate,
    endDate,
    estimatedDuration: undefined,
    
    // Hierarchy & Organization
    parentId: undefined,
    subtaskIds: [],
    tags: [],
    
    // Location Management
    location,
    
    // Recurring Tasks
    isTemplate,
    recurrence,
    templateId: undefined,
    nextDueDate: isTemplate && deadline ? deadline : undefined,
    instanceNumber: undefined,
    
    // Metadata
    createdAt: now,
    updatedAt: now,
    completedAt: undefined,
    
    // Comments
    comments: [],
    
    // Time tracking
    timeSpent: 0,
    
    // Backward compatibility
    completed: false
  };
};

export const addComment = (task: Task, text: string): Task => {
  const comment: Comment = {
    id: generateId(),
    text,
    createdAt: new Date()
  };
  
  return {
    ...task,
    comments: [...task.comments, comment],
    updatedAt: new Date()
  };
};

export const updateTaskStatus = (task: Task, newStatus: TaskStatus, allTasks: Task[] = []): Task => {
  const now = new Date();
  const updatedTask = {
    ...task,
    status: newStatus,
    updatedAt: now,
    completed: newStatus === 'done', // Maintain backward compatibility
    completedAt: newStatus === 'done' ? now : (newStatus === 'todo' ? undefined : task.completedAt),
    progress: calculateTaskProgress({ ...task, status: newStatus }, allTasks)
  };

  return updatedTask;
};

export const createSubtask = (
  parentTask: Task,
  title: string,
  description: string = ''
): Task => {
  const subtask = createTask(title, description, parentTask.category);
  return {
    ...subtask,
    parentId: parentTask.id,
    priority: parentTask.priority, // Inherit parent priority
    deadline: parentTask.deadline, // Inherit parent deadline
  };
};

export const updateTaskProgress = (task: Task, progress: number): Task => {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  
  // Auto-update status based on progress
  let newStatus = task.status;
  if (clampedProgress === 0 && task.status !== 'cancelled') {
    newStatus = 'todo';
  } else if (clampedProgress > 0 && clampedProgress < 100 && task.status === 'todo') {
    newStatus = 'in-progress';
  } else if (clampedProgress === 100) {
    newStatus = 'done';
  }

  return {
    ...task,
    progress: clampedProgress,
    status: newStatus,
    completed: newStatus === 'done',
    updatedAt: new Date(),
    completedAt: newStatus === 'done' ? new Date() : undefined
  };
};

export const addTaskTag = (task: Task, tag: string): Task => {
  if (task.tags.includes(tag)) return task;
  
  return {
    ...task,
    tags: [...task.tags, tag],
    updatedAt: new Date()
  };
};

export const removeTaskTag = (task: Task, tag: string): Task => {
  return {
    ...task,
    tags: task.tags.filter(t => t !== tag),
    updatedAt: new Date()
  };
};

export const linkSubtask = (parentTask: Task, subtaskId: string): Task => {
  if (parentTask.subtaskIds.includes(subtaskId)) return parentTask;
  
  return {
    ...parentTask,
    subtaskIds: [...parentTask.subtaskIds, subtaskId],
    updatedAt: new Date()
  };
};

export const unlinkSubtask = (parentTask: Task, subtaskId: string): Task => {
  return {
    ...parentTask,
    subtaskIds: parentTask.subtaskIds.filter(id => id !== subtaskId),
    updatedAt: new Date()
  };
};

// Recurring Task Management Functions

/**
 * Create a recurring task template
 */
export const createRecurringTask = (
  title: string,
  description: string,
  category: string,
  recurrence: RecurrenceRule,
  deadline?: Date,
  priority: TaskPriority = 'medium',
  startDate?: Date,
  endDate?: Date,
  location?: TaskLocation
): Task => {
  const template = createTask(
    title, 
    description, 
    category, 
    deadline, 
    priority, 
    startDate, 
    endDate, 
    location, 
    recurrence
  );
  
  // Set the first due date
  if (deadline) {
    template.nextDueDate = deadline;
  }
  
  return template;
};

/**
 * Generate next instance from a recurring task template
 */
export const generateTaskInstance = (
  template: Task,
  allTasks: Task[]
): Task | null => {
  if (!template.isTemplate || !template.recurrence || !template.nextDueDate) {
    return null;
  }

  // Count existing instances
  const existingInstances = allTasks.filter(t => t.templateId === template.id);
  const instanceNumber = existingInstances.length + 1;

  // Generate the instance
  const instance = RecurrenceService.generateTaskInstance(
    template,
    template.nextDueDate,
    instanceNumber
  );

  return instance;
};

/**
 * Update template's next due date after generating an instance
 */
export const updateTemplateNextDueDate = (
  template: Task,
  allTasks: Task[]
): Task => {
  if (!template.isTemplate || !template.recurrence || !template.nextDueDate) {
    return template;
  }

  const instanceCount = allTasks.filter(t => t.templateId === template.id).length;
  const nextDueDate = RecurrenceService.updateTemplateNextDueDate(template, instanceCount);

  return {
    ...template,
    nextDueDate: nextDueDate || undefined,
    updatedAt: new Date()
  };
};

/**
 * Check all templates and generate instances that are due
 */
export const processRecurringTasks = (tasks: Task[]): Task[] => {
  const templates = tasks.filter(t => t.isTemplate);
  const newTasks: Task[] = [];

  templates.forEach(template => {
    if (RecurrenceService.shouldGenerateNextInstance(template)) {
      const instance = generateTaskInstance(template, tasks);
      if (instance) {
        newTasks.push(instance);
        
        // Update template's next due date
        const updatedTemplate = updateTemplateNextDueDate(template, [...tasks, instance]);
        const templateIndex = tasks.findIndex(t => t.id === template.id);
        if (templateIndex !== -1) {
          tasks[templateIndex] = updatedTemplate;
        }
      }
    }
  });

  return [...tasks, ...newTasks];
};

/**
 * Pause/resume a recurring task template
 */
export const toggleTemplateActive = (template: Task): Task => {
  if (!template.isTemplate) return template;
  
  return {
    ...template,
    // We can use a custom flag or manipulate nextDueDate to pause
    nextDueDate: template.nextDueDate ? undefined : new Date(),
    updatedAt: new Date()
  };
};

/**
 * Update recurring task template (affects future instances only)
 */
export const updateRecurringTemplate = (
  template: Task,
  updates: Partial<Task>,
  applyToExistingInstances: boolean = false,
  allTasks: Task[] = []
): Task[] => {
  if (!template.isTemplate) return [template];

  const updatedTemplate = {
    ...template,
    ...updates,
    updatedAt: new Date()
  };

  const updatedTasks = [updatedTemplate];

  if (applyToExistingInstances) {
    // Update existing incomplete instances
    const instances = allTasks.filter(t => 
      t.templateId === template.id && 
      t.status !== 'done' && 
      t.status !== 'cancelled'
    );

    instances.forEach(instance => {
      const updatedInstance = {
        ...instance,
        ...updates,
        // Preserve instance-specific fields
        id: instance.id,
        isTemplate: false,
        templateId: instance.templateId,
        instanceNumber: instance.instanceNumber,
        recurrence: undefined,
        updatedAt: new Date()
      };
      updatedTasks.push(updatedInstance);
    });
  }

  return updatedTasks;
};

/**
 * Delete recurring task template and optionally its instances
 */
export const deleteRecurringTemplate = (
  templateId: string,
  deleteInstances: boolean,
  allTasks: Task[]
): string[] => {
  const idsToDelete = [templateId];

  if (deleteInstances) {
    const instanceIds = allTasks
      .filter(t => t.templateId === templateId)
      .map(t => t.id);
    idsToDelete.push(...instanceIds);
  }

  return idsToDelete;
};

/**
 * Get recurrence summary for a template
 */
export const getRecurrenceSummary = (template: Task): string => {
  if (!template.isTemplate || !template.recurrence) {
    return 'Not recurring';
  }

  return RecurrenceService.getRecurrenceDescription(template.recurrence);
};
