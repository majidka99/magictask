import { Task } from '../types';

const STORAGE_KEY = 'majitask-data';
const BACKUP_KEY = 'majitask-backup';
const VERSION_KEY = 'majitask-version';
const CURRENT_VERSION = '2.0.0';

export interface DataBackup {
  version: string;
  timestamp: number;
  tasks: Task[];
  metadata: {
    exportDate: string;
    totalTasks: number;
    totalSubtasks: number;
  };
}

/**
 * Enhanced save with automatic backup
 */
export const saveWithBackup = (tasks: Task[]): void => {
  try {
    // Save current data
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
    
    // Create backup every time we save
    const backup: DataBackup = {
      version: CURRENT_VERSION,
      timestamp: Date.now(),
      tasks: tasks,
      metadata: {
        exportDate: new Date().toISOString(),
        totalTasks: tasks.filter(t => !t.parentId).length,
        totalSubtasks: tasks.filter(t => t.parentId).length,
      }
    };
    
    localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
    
    console.log(`✅ Data saved successfully. Tasks: ${tasks.length}, Backup created: ${new Date().toLocaleString()}`);
  } catch (error) {
    console.error('❌ Failed to save data:', error);
    // Try to save to backup location if primary save fails
    try {
      localStorage.setItem(`${BACKUP_KEY}-emergency`, JSON.stringify(tasks));
      console.log('📋 Emergency backup created');
    } catch (backupError) {
      console.error('❌ Emergency backup also failed:', backupError);
    }
  }
};

/**
 * Enhanced load with recovery capabilities
 */
export const loadWithRecovery = (): Task[] => {
  try {
    // Try to load primary data
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const tasks = JSON.parse(data);
      console.log(`✅ Loaded ${tasks.length} tasks from primary storage`);
      return parseTasks(tasks);
    }
    
    // Try to load from backup
    console.log('⚠️ Primary storage empty, attempting backup recovery...');
    return loadFromBackup();
    
  } catch (error) {
    console.error('❌ Error loading from primary storage:', error);
    console.log('🔄 Attempting backup recovery...');
    return loadFromBackup();
  }
};

/**
 * Load data from backup
 */
export const loadFromBackup = (): Task[] => {
  try {
    const backupData = localStorage.getItem(BACKUP_KEY);
    if (backupData) {
      const backup: DataBackup = JSON.parse(backupData);
      console.log(`🔄 Restored ${backup.tasks.length} tasks from backup (${new Date(backup.timestamp).toLocaleString()})`);
      return parseTasks(backup.tasks);
    }
    
    // Try emergency backup
    const emergencyData = localStorage.getItem(`${BACKUP_KEY}-emergency`);
    if (emergencyData) {
      const tasks = JSON.parse(emergencyData);
      console.log(`🚨 Restored ${tasks.length} tasks from emergency backup`);
      return parseTasks(tasks);
    }
    
    console.log('📝 No backup data found, starting fresh');
    return [];
    
  } catch (error) {
    console.error('❌ Error loading from backup:', error);
    return [];
  }
};

/**
 * Parse and normalize task data
 */
const parseTasks = (tasks: any[]): Task[] => {
  return tasks.map((task: any) => ({
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
    
    // Ensure backward compatibility
    completed: task.status ? task.status === 'done' : task.completed,
    
    // Handle comments
    comments: (task.comments || []).map((comment: any) => ({
      ...comment,
      createdAt: new Date(comment.createdAt)
    }))
  }));
};

/**
 * Export data to JSON file
 */
export const exportToJSON = (tasks: Task[]): void => {
  try {
    const backup: DataBackup = {
      version: CURRENT_VERSION,
      timestamp: Date.now(),
      tasks: tasks,
      metadata: {
        exportDate: new Date().toISOString(),
        totalTasks: tasks.filter(t => !t.parentId).length,
        totalSubtasks: tasks.filter(t => t.parentId).length,
      }
    };
    
    const dataStr = JSON.stringify(backup, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `majitask-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    console.log('📥 Data exported to JSON file');
  } catch (error) {
    console.error('❌ Failed to export data:', error);
  }
};

/**
 * Import data from JSON file
 */
export const importFromJSON = (file: File): Promise<Task[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        // Check if it's a backup file
        if (data.version && data.tasks) {
          console.log(`📤 Importing backup from ${data.metadata?.exportDate || 'unknown date'}`);
          resolve(parseTasks(data.tasks));
        } else if (Array.isArray(data)) {
          // Direct task array
          console.log(`📤 Importing ${data.length} tasks from file`);
          resolve(parseTasks(data));
        } else {
          reject(new Error('Invalid file format'));
        }
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

/**
 * Get backup information
 */
export const getBackupInfo = (): { hasBackup: boolean; timestamp?: number; taskCount?: number } => {
  try {
    const backupData = localStorage.getItem(BACKUP_KEY);
    if (backupData) {
      const backup: DataBackup = JSON.parse(backupData);
      return {
        hasBackup: true,
        timestamp: backup.timestamp,
        taskCount: backup.tasks.length
      };
    }
  } catch (error) {
    console.error('Error getting backup info:', error);
  }
  
  return { hasBackup: false };
};

/**
 * Clear all data (with confirmation)
 */
export const clearAllData = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(BACKUP_KEY);
  localStorage.removeItem(`${BACKUP_KEY}-emergency`);
  localStorage.removeItem(VERSION_KEY);
  console.log('🗑️ All data cleared');
};
