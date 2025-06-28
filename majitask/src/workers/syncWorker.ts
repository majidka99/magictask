/**
 * Background Sync Worker
 * Handles periodic synchronization between localStorage and API
 * Runs every 60 seconds when online
 */

// Worker scope types
declare const self: DedicatedWorkerGlobalScope;

interface SyncMessage {
  type: 'status' | 'sync' | 'error';
  status?: 'checking' | 'synced' | 'offline' | 'error';
  data?: {
    sent: number;
    received: number;
    conflicts: string[];
    timestamp: string;
  };
  error?: string;
}

interface SyncResult {
  imported: number;
  updated: number;
  conflicts: string[];
  errors: Array<{ task: any; error: string }>;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: number;
  progress: number;
  category: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  deadline?: Date;
  completedAt?: Date;
  parentId?: string;
  subtaskIds?: string[];
  timeSpent: number;
  estimatedDuration?: number;
  viewCount: number;
  editCount: number;
}

class SyncWorker {
  private syncInterval: number | null = null;
  private isRunning = false;
  private readonly SYNC_INTERVAL_MS = 60 * 1000; // 60 seconds
  private readonly STORAGE_KEY = 'majitask_tasks';
  private lastSyncTime: number = 0;

  constructor() {
    this.start();
    this.setupMessageListener();
  }

  /**
   * Setup message listener for communication with main thread
   */
  private setupMessageListener(): void {
    self.addEventListener('message', (event) => {
      const { type, data } = event.data;

      switch (type) {
        case 'start':
          this.start();
          break;
        case 'stop':
          this.stop();
          break;
        case 'sync-now':
          this.performSync();
          break;
        case 'terminate':
          this.terminate();
          break;
        case 'config':
          if (data.syncInterval) {
            this.stop();
            this.start(data.syncInterval);
          }
          break;
        default:
          console.warn('Unknown message type:', type);
      }
    });
  }

  /**
   * Start the sync worker
   */
  private start(intervalMs: number = this.SYNC_INTERVAL_MS): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.postMessage({
      type: 'status',
      status: 'checking',
      data: {
        sent: 0,
        received: 0,
        conflicts: [],
        timestamp: new Date().toISOString()
      }
    });

    // Perform initial sync
    this.performSync();

    // Set up recurring sync
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, intervalMs);

    console.log('🔄 Sync worker started with interval:', intervalMs + 'ms');
  }

  /**
   * Stop the sync worker
   */
  private stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    console.log('⏹️ Sync worker stopped');
  }

  /**
   * Terminate the worker
   */
  private terminate(): void {
    this.stop();
    self.close();
  }

  /**
   * Perform synchronization with the server
   */
  private async performSync(): Promise<void> {
    const now = Date.now();
    
    // Post status update
    this.postMessage({
      type: 'status',
      status: 'checking'
    });

    try {
      // Check if we're online
      if (!this.isOnline()) {
        this.postMessage({
          type: 'status',
          status: 'offline',
          data: {
            sent: 0,
            received: 0,
            conflicts: [],
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Get authentication token from shared storage (if available)
      const token = await this.getAuthToken();
      if (!token) {
        this.postMessage({
          type: 'status',
          status: 'offline',
          data: {
            sent: 0,
            received: 0,
            conflicts: [],
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Get local tasks to sync
      const localTasks = await this.getLocalTasks();
      
      if (localTasks.length === 0) {
        this.postMessage({
          type: 'status',
          status: 'synced',
          data: {
            sent: 0,
            received: 0,
            conflicts: [],
            timestamp: new Date().toISOString()
          }
        });
        this.lastSyncTime = now;
        return;
      }

      // Filter tasks that have been modified since last sync
      const tasksToSync = localTasks.filter(task => {
        const updatedTime = new Date(task.updatedAt).getTime();
        return updatedTime > this.lastSyncTime;
      });

      if (tasksToSync.length === 0) {
        this.postMessage({
          type: 'status',
          status: 'synced',
          data: {
            sent: 0,
            received: 0,
            conflicts: [],
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Perform sync with server
      const syncResult = await this.syncWithServer(token, tasksToSync);

      // Update last sync time
      this.lastSyncTime = now;

      // Post success status
      this.postMessage({
        type: 'status',
        status: 'synced',
        data: {
          sent: tasksToSync.length,
          received: syncResult.imported + syncResult.updated,
          conflicts: syncResult.conflicts,
          timestamp: new Date().toISOString()
        }
      });

      console.log('✅ Sync completed:', {
        sent: tasksToSync.length,
        imported: syncResult.imported,
        updated: syncResult.updated,
        conflicts: syncResult.conflicts.length
      });

    } catch (error) {
      console.error('❌ Sync failed:', error);
      
      this.postMessage({
        type: 'status',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown sync error'
      });
    }
  }

  /**
   * Check if the worker context has network connectivity
   */
  private isOnline(): boolean {
    // In a worker context, we don't have direct access to navigator.onLine
    // We'll simulate this by trying a simple network request
    return true; // We'll check connectivity in the actual sync attempt
  }

  /**
   * Get authentication token from storage
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      // In a worker, we can't access localStorage directly
      // We would need the main thread to pass the token or use a shared storage mechanism
      // For now, we'll return null and handle this in the main thread
      return null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  /**
   * Get local tasks from storage
   */
  private async getLocalTasks(): Promise<Task[]> {
    try {
      // In a real implementation, this would access the storage mechanism
      // For now, return empty array as we can't access localStorage from worker
      return [];
    } catch (error) {
      console.error('Error getting local tasks:', error);
      return [];
    }
  }

  /**
   * Sync tasks with the server
   */
  private async syncWithServer(token: string, tasks: Task[]): Promise<SyncResult> {
    const apiBaseUrl = 'http://localhost:3863/api'; // This should be configurable
    
    const response = await fetch(`${apiBaseUrl}/tasks/sync/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ tasks })
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Post message to main thread
   */
  private postMessage(message: SyncMessage): void {
    self.postMessage(message);
  }
}

// Enhanced version that can work with the main thread
class EnhancedSyncWorker {
  private syncInterval: number | null = null;
  private isRunning = false;
  private readonly SYNC_INTERVAL_MS = 60 * 1000; // 60 seconds
  private lastSyncTime: number = 0;
  private authToken: string | null = null;
  private apiBaseUrl: string = '';

  constructor() {
    this.setupMessageListener();
  }

  private setupMessageListener(): void {
    self.addEventListener('message', (event) => {
      const { type, data } = event.data;

      switch (type) {
        case 'init':
          this.authToken = data.token;
          this.apiBaseUrl = data.apiBaseUrl;
          this.start();
          break;
        case 'update-token':
          this.authToken = data.token;
          break;
        case 'start':
          this.start();
          break;
        case 'stop':
          this.stop();
          break;
        case 'sync-now':
          this.performSync(data.tasks || []);
          break;
        case 'terminate':
          this.terminate();
          break;
        default:
          console.warn('Unknown message type:', type);
      }
    });
  }

  private start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    
    // Request initial data from main thread
    this.postMessage({
      type: 'request-sync-data'
    });

    // Set up recurring sync requests
    this.syncInterval = setInterval(() => {
      this.postMessage({
        type: 'request-sync-data'
      });
    }, this.SYNC_INTERVAL_MS);

    console.log('🔄 Enhanced sync worker started');
  }

  private stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    console.log('⏹️ Enhanced sync worker stopped');
  }

  private terminate(): void {
    this.stop();
    self.close();
  }

  private async performSync(tasks: Task[] = []): Promise<void> {
    this.postMessage({
      type: 'status',
      status: 'checking'
    });

    try {
      // Check if we have necessary data
      if (!this.authToken || !this.apiBaseUrl) {
        this.postMessage({
          type: 'status',
          status: 'offline',
          data: {
            sent: 0,
            received: 0,
            conflicts: [],
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Check network connectivity
      if (!await this.checkConnectivity()) {
        this.postMessage({
          type: 'status',
          status: 'offline',
          data: {
            sent: 0,
            received: 0,
            conflicts: [],
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (tasks.length === 0) {
        this.postMessage({
          type: 'status',
          status: 'synced',
          data: {
            sent: 0,
            received: 0,
            conflicts: [],
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Filter tasks modified since last sync
      const now = Date.now();
      const tasksToSync = tasks.filter(task => {
        const updatedTime = new Date(task.updatedAt).getTime();
        return updatedTime > this.lastSyncTime;
      });

      if (tasksToSync.length === 0) {
        this.postMessage({
          type: 'status',
          status: 'synced',
          data: {
            sent: 0,
            received: 0,
            conflicts: [],
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Perform sync
      const syncResult = await this.syncWithServer(tasksToSync);
      this.lastSyncTime = now;

      this.postMessage({
        type: 'status',
        status: 'synced',
        data: {
          sent: tasksToSync.length,
          received: syncResult.imported + syncResult.updated,
          conflicts: syncResult.conflicts,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Enhanced sync failed:', error);
      
      this.postMessage({
        type: 'status',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown sync error'
      });
    }
  }

  private async checkConnectivity(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/health`, {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async syncWithServer(tasks: Task[]): Promise<SyncResult> {
    const response = await fetch(`${this.apiBaseUrl}/tasks/sync/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify({ tasks })
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  private postMessage(message: any): void {
    self.postMessage(message);
  }
}

// Initialize the enhanced worker
const syncWorker = new EnhancedSyncWorker();

// Handle unhandled errors
self.addEventListener('error', (event) => {
  console.error('🚨 Worker error:', event.error);
  self.postMessage({
    type: 'status',
    status: 'error',
    error: event.error?.message || 'Worker error occurred'
  });
});

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Worker unhandled rejection:', event.reason);
  self.postMessage({
    type: 'status',
    status: 'error',
    error: event.reason?.message || 'Worker promise rejection'
  });
  event.preventDefault();
});

export {}; // Make this a module
