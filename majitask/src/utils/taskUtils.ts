import { TaskStatus, TaskPriority, Task, VALID_STATUS_TRANSITIONS } from '../types';

// Status validation and transitions
export const isValidStatusTransition = (from: TaskStatus, to: TaskStatus): boolean => {
  return VALID_STATUS_TRANSITIONS[from].includes(to);
};

export const getNextValidStatuses = (currentStatus: TaskStatus): TaskStatus[] => {
  return VALID_STATUS_TRANSITIONS[currentStatus];
};

// Task status utilities
export const isTaskCompleted = (task: Task): boolean => {
  return task.status === 'done';
};

export const isTaskOverdue = (task: Task): boolean => {
  if (!task.deadline) return false;
  return new Date() > new Date(task.deadline) && task.status !== 'done';
};

export const isTaskInProgress = (task: Task): boolean => {
  return task.status === 'in-progress';
};

// Progress calculation
export const calculateTaskProgress = (task: Task, subtasks: Task[] = []): number => {
  // If task has subtasks, calculate progress based on subtask completion
  if (task.subtaskIds && task.subtaskIds.length > 0) {
    const taskSubtasks = subtasks.filter(st => task.subtaskIds.includes(st.id));
    if (taskSubtasks.length === 0) return task.progress || 0;
    
    const completedSubtasks = taskSubtasks.filter(st => st.status === 'done').length;
    return Math.round((completedSubtasks / taskSubtasks.length) * 100);
  }
  
  // Manual progress or status-based progress
  if (task.progress !== undefined) return task.progress;
  
  // Default status-based progress
  switch (task.status) {
    case 'todo': return 0;
    case 'in-progress': return 50;
    case 'done': return 100;
    case 'cancelled': return 0;
    default: return 0;
  }
};

// Date utilities
export const formatTaskDate = (date: Date | undefined): string => {
  if (!date) return '';
  
  const now = new Date();
  const taskDate = new Date(date);
  const diffTime = taskDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0) return `In ${diffDays} days`;
  if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
  
  return taskDate.toLocaleDateString();
};

export const formatDateTime = (date: Date | undefined): string => {
  if (!date) return '';
  
  return new Date(date).toLocaleString();
};

export const getDaysUntilDeadline = (deadline: Date | undefined): number | null => {
  if (!deadline) return null;
  
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffTime = deadlineDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Task duration utilities
export const formatDuration = (minutes: number | undefined): string => {
  if (!minutes) return '';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

export const parseDurationToMinutes = (duration: string): number => {
  const hourMatch = duration.match(/(\d+)h/);
  const minuteMatch = duration.match(/(\d+)m/);
  
  const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
  const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;
  
  return hours * 60 + minutes;
};

// Priority utilities
export const comparePriority = (a: TaskPriority, b: TaskPriority): number => {
  const priorities = { low: 1, medium: 2, high: 3, critical: 4 };
  return priorities[b] - priorities[a]; // Higher priority first
};

// Task sorting utilities
export const sortTasksByPriority = (tasks: Task[]): Task[] => {
  return [...tasks].sort((a, b) => comparePriority(a.priority, b.priority));
};

export const sortTasksByDeadline = (tasks: Task[]): Task[] => {
  return [...tasks].sort((a, b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });
};

export const sortTasksByStatus = (tasks: Task[]): Task[] => {
  const statusOrder = { 'in-progress': 1, 'todo': 2, 'done': 3, 'cancelled': 4 };
  return [...tasks].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
};

// Task validation
export const validateTask = (task: Partial<Task>): string[] => {
  const errors: string[] = [];
  
  if (!task.title?.trim()) {
    errors.push('Title is required');
  }
  
  if (task.startDate && task.endDate && new Date(task.startDate) > new Date(task.endDate)) {
    errors.push('Start date cannot be after end date');
  }
  
  if (task.deadline && task.endDate && new Date(task.deadline) < new Date(task.endDate)) {
    errors.push('Deadline cannot be before end date');
  }
  
  if (task.progress !== undefined && (task.progress < 0 || task.progress > 100)) {
    errors.push('Progress must be between 0 and 100');
  }
  
  return errors;
};
