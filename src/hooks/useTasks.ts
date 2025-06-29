import { useState, useEffect, useMemo } from 'react';
import { Task, TaskFilters, TaskStatus, TaskPriority, TaskStatistics, TaskLocation, RecurrenceRule } from '../types';
import { 
  createTask, 
  addComment,
  updateTaskStatus,
  createSubtask,
  updateTaskProgress,
  addTaskTag,
  removeTaskTag,
  linkSubtask,
  unlinkSubtask,
  createRecurringTask,
  processRecurringTasks
} from '../utils/taskManager';
import { 
  saveWithBackup,
  loadWithRecovery,
  exportToJSON,
  importFromJSON,
  getBackupInfo
} from '../utils/dataBackup';
import { 
  isTaskOverdue
} from '../utils/taskUtils';
import { emailService } from '../utils/emailService';

// Helper function to check if email notifications are enabled
const isEmailNotificationEnabled = (type: string): boolean => {
  return localStorage.getItem(`emailNotif_${type}`) === 'true';
};

// Helper function to get user email
const getUserEmail = (): string | null => {
  return localStorage.getItem('userEmail');
};

// Helper function to send email notification
const sendEmailNotification = async (type: 'taskCreated' | 'taskDeadline' | 'taskCompleted', task: Task) => {
  const userEmail = getUserEmail();
  if (!userEmail || !isEmailNotificationEnabled(type)) {
    return;
  }

  try {
    const notificationType = type === 'taskCreated' ? 'task-created' :
                           type === 'taskDeadline' ? 'task-deadline-reminder' :
                           'task-completed';
    
    await emailService.sendTaskNotification({
      type: notificationType,
      taskData: task,
      recipientEmail: userEmail
    });
  } catch (error) {
    console.error('Failed to send email notification:', error);
    // Don't throw error - email failures shouldn't break task operations
  }
};

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filters, setFilters] = useState<TaskFilters>({});

  // Load tasks from localStorage on mount with recovery
  useEffect(() => {
    const savedTasks = loadWithRecovery();
    setTasks(savedTasks);
    
    // Log backup status
    const backupInfo = getBackupInfo();
    if (backupInfo.hasBackup) {
      console.log(`💾 Backup available: ${backupInfo.taskCount} tasks from ${new Date(backupInfo.timestamp || 0).toLocaleString()}`);
    }
  }, []);

  // Process recurring tasks daily and save
  useEffect(() => {
    if (tasks.length > 0) {
      // Process recurring tasks to generate new instances
      const processedTasks = processRecurringTasks(tasks);
      if (processedTasks.length > tasks.length) {
        console.log(`🔄 Generated ${processedTasks.length - tasks.length} new recurring task instances`);
        setTasks(processedTasks);
      }
      
      // Save tasks with backup whenever tasks change
      saveWithBackup(tasks);
    }
  }, [tasks]);

  // Set up daily recurring task processing
  useEffect(() => {
    const checkRecurringTasks = () => {
      if (tasks.length > 0) {
        const processedTasks = processRecurringTasks(tasks);
        if (processedTasks.length > tasks.length) {
          console.log(`🔄 Daily check: Generated ${processedTasks.length - tasks.length} new recurring task instances`);
          setTasks(processedTasks);
        }
      }
    };

    // Check every hour for new recurring tasks
    const interval = setInterval(checkRecurringTasks, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [tasks]);

  // Save tasks with backup whenever tasks change (moved to processing effect)
  // useEffect(() => {
  //   if (tasks.length > 0) {
  //     saveWithBackup(tasks);
  //   }
  // }, [tasks]);

  const addTask = (
    title: string, 
    description: string, 
    category: string, 
    deadline?: Date,
    priority: TaskPriority = 'medium',
    startDate?: Date,
    endDate?: Date,
    location?: TaskLocation
  ) => {
    const newTask = createTask(title, description, category, deadline, priority, startDate, endDate, location);
    setTasks(prev => [newTask, ...prev]);
    
    // Send email notification for task creation
    sendEmailNotification('taskCreated', newTask);
    
    return newTask;
  };

  // New function to create a task with subtasks in a single operation
  const addTaskWithSubtasks = (
    title: string, 
    description: string, 
    category: string, 
    deadline?: Date,
    priority: TaskPriority = 'medium',
    startDate?: Date,
    endDate?: Date,
    location?: TaskLocation,
    subtasksData: Array<{title: string; description?: string; status: TaskStatus; priority: TaskPriority}> = [],
    recurrence?: RecurrenceRule
  ) => {
    let newTask: Task;

    if (recurrence) {
      // Create recurring task template
      newTask = createRecurringTask(
        title, 
        description, 
        category, 
        recurrence,
        deadline,
        priority,
        startDate,
        endDate,
        location
      );
    } else {
      // Create regular task
      newTask = createTask(title, description, category, deadline, priority, startDate, endDate, location);
    }
    
    // Create subtasks
    const subtasks: Task[] = [];
    const subtaskIds: string[] = [];
    
    subtasksData.forEach(subtaskData => {
      if (subtaskData.title.trim()) {
        const subtask = createSubtask(newTask, subtaskData.title, subtaskData.description || '');
        // Apply the form data properties
        subtask.status = subtaskData.status;
        subtask.priority = subtaskData.priority;
        subtasks.push(subtask);
        subtaskIds.push(subtask.id);
      }
    });
    
    // Update parent task with subtask IDs
    const updatedParentTask = { ...newTask, subtaskIds };
    
    // Add all tasks in a single state update
    setTasks(prev => [updatedParentTask, ...subtasks, ...prev]);
    
    // Send email notification for task creation
    sendEmailNotification('taskCreated', updatedParentTask);
    
    return updatedParentTask;
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, ...updates, updatedAt: new Date() }
        : task
    ));
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => {
      // Also delete all subtasks
      const taskToDelete = prev.find(t => t.id === taskId);
      if (taskToDelete) {
        return prev.filter(task => 
          task.id !== taskId && 
          !taskToDelete.subtaskIds.includes(task.id) &&
          task.parentId !== taskId
        );
      }
      return prev.filter(task => task.id !== taskId);
    });
  };

  const changeTaskStatus = (taskId: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? updateTaskStatus(task, newStatus, prev)
        : task
    ));
  };

  const changeTaskProgress = (taskId: string, progress: number) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? updateTaskProgress(task, progress)
        : task
    ));
  };

  const toggleTaskCompletion = (taskId: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const newStatus = task.completed ? 'todo' : 'done';
        const updatedTask = updateTaskStatus(task, newStatus, prev);
        
        // Send email notification for task completion
        if (newStatus === 'done') {
          sendEmailNotification('taskCompleted', updatedTask);
        }
        
        return updatedTask;
      }
      return task;
    }));
  };

  const addSubtask = (parentTaskId: string, title: string, description: string = '') => {
    const parentTask = tasks.find(t => t.id === parentTaskId);
    if (!parentTask) return null;

    const subtask = createSubtask(parentTask, title, description);
    const updatedParent = linkSubtask(parentTask, subtask.id);
    
    setTasks(prev => [
      subtask,
      ...prev.map(task => task.id === parentTaskId ? updatedParent : task)
    ]);
    
    return subtask;
  };

  const removeSubtask = (parentTaskId: string, subtaskId: string) => {
    setTasks(prev => {
      const updatedTasks = prev.map(task => 
        task.id === parentTaskId ? unlinkSubtask(task, subtaskId) : task
      );
      return updatedTasks.filter(task => task.id !== subtaskId);
    });
  };

  const addTag = (taskId: string, tag: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? addTaskTag(task, tag) : task
    ));
  };

  const removeTag = (taskId: string, tag: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? removeTaskTag(task, tag) : task
    ));
  };

  const addTaskComment = (taskId: string, commentText: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? addComment(task, commentText)
        : task
    ));
  };

  // Enhanced filtering with memoization for performance
  const filteredTasks = useMemo(() => {
    // Start with main tasks only (filter out subtasks)
    const mainTasksOnly = tasks.filter(task => !task.parentId);
    
    return mainTasksOnly.filter(task => {
      // Category filter
      if (filters.category && task.category !== filters.category) return false;
      
      // Status filter (enhanced)
      if (filters.status && task.status !== filters.status) return false;
      
      // Priority filter
      if (filters.priority && task.priority !== filters.priority) return false;
      
      // Backward compatibility for completed filter
      if (filters.completed !== undefined && task.completed !== filters.completed) return false;
      
      // Date range filter
      if (filters.startDate && task.startDate && new Date(task.startDate) < new Date(filters.startDate)) return false;
      if (filters.endDate && task.endDate && new Date(task.endDate) > new Date(filters.endDate)) return false;
      
      // Deadline filter
      if (filters.hasDeadline !== undefined) {
        const hasDeadline = !!task.deadline;
        if (hasDeadline !== filters.hasDeadline) return false;
      }
      
      // Overdue filter
      if (filters.overdue !== undefined) {
        const isOverdue = isTaskOverdue(task);
        if (isOverdue !== filters.overdue) return false;
      }
      
      // Search filter (enhanced)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return task.title.toLowerCase().includes(searchLower) ||
               task.description.toLowerCase().includes(searchLower) ||
               task.category.toLowerCase().includes(searchLower) ||
               task.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
               task.comments.some(comment => comment.text.toLowerCase().includes(searchLower));
      }
      
      return true;
    });
  }, [tasks, filters]);

  // Calculate statistics based on main tasks only
  const statistics = useMemo((): TaskStatistics => {
    const mainTasksOnly = tasks.filter(task => !task.parentId);
    const total = mainTasksOnly.length;
    const todo = mainTasksOnly.filter(t => t.status === 'todo').length;
    const inProgress = mainTasksOnly.filter(t => t.status === 'in-progress').length;
    const done = mainTasksOnly.filter(t => t.status === 'done').length;
    const cancelled = mainTasksOnly.filter(t => t.status === 'cancelled').length;
    const overdue = mainTasksOnly.filter(t => isTaskOverdue(t)).length;
    
    return { total, todo, inProgress, done, cancelled, overdue };
  }, [tasks]);

  // Get all unique categories and tags from main tasks only
  const categories = useMemo(() => [...new Set(tasks.filter(task => !task.parentId).map(task => task.category))], [tasks]);
  const allTags = useMemo(() => [...new Set(tasks.filter(task => !task.parentId).flatMap(task => task.tags))], [tasks]);

  // Get subtasks for a specific parent task
  const getSubtasks = (parentTaskId: string) => {
    const parentTask = tasks.find(t => t.id === parentTaskId);
    if (!parentTask) return [];
    return tasks.filter(t => parentTask.subtaskIds.includes(t.id));
  };

  // Get main tasks (tasks without parents)
  const mainTasks = useMemo(() => tasks.filter(task => !task.parentId), [tasks]);

  return {
    // Task data
    tasks: filteredTasks,
    allTasks: tasks,
    mainTasks,
    statistics,
    
    // Metadata
    categories,
    allTags,
    filters,
    
    // Basic operations
    setFilters,
    addTask,
    addTaskWithSubtasks,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    addTaskComment,
    
    // Enhanced operations
    changeTaskStatus,
    changeTaskProgress,
    addSubtask,
    removeSubtask,
    addTag,
    removeTag,
    getSubtasks,
    
    // Data management
    exportToJSON: () => exportToJSON(tasks),
    importFromJSON,
    getBackupInfo
  };
};
