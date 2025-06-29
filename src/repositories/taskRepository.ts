import { TokenService } from '../modules/auth/useAuth';

// Types
export interface Task {
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

export interface TaskComment {
  id: string;
  taskId: string;
  userId: number;
  body: string;
  commentType: 'comment' | 'status_change' | 'system';
  metadata?: any;
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
  userName?: string;
  userEmail?: string;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'done';
  priority?: number;
  category?: string;
  tags?: string[];
  deadline?: string;
  estimatedDuration?: number;
  parentId?: string;
}

export interface UpdateTaskDto extends Partial<CreateTaskDto> {}

export interface TaskFilters {
  status?: string;
  search?: string;
  category?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
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

export interface ApiResponse<T> {
  data: T;
  meta?: any;
  message: string;
}

export interface SyncResult {
  imported: number;
  updated: number;
  conflicts: string[];
  errors: Array<{ task: any; error: string }>;
}

/**
 * Storage adapter interface for different persistence strategies
 */
interface StorageAdapter {
  getAll(filters?: TaskFilters): Promise<PaginatedResult<Task>>;
  get(id: string): Promise<Task>;
  create(task: CreateTaskDto): Promise<Task>;
  update(id: string, updates: UpdateTaskDto): Promise<Task>;
  remove(id: string): Promise<void>;
  addComment(taskId: string, body: string): Promise<TaskComment>;
  getComments(taskId: string, options?: { page?: number; limit?: number }): Promise<PaginatedResult<TaskComment>>;
  sync?(tasks: Task[]): Promise<SyncResult>;
}

/**
 * LocalStorage adapter for offline functionality
 * Stores tasks in browser localStorage with basic CRUD operations
 */
class LocalStorageAdapter implements StorageAdapter {
  private readonly STORAGE_KEY = 'majitask_tasks';
  private readonly COMMENTS_KEY = 'majitask_comments';

  private getTasks(): Task[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading tasks from localStorage:', error);
      return [];
    }
  }

  private saveTasks(tasks: Task[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error('Error saving tasks to localStorage:', error);
    }
  }

  private getComments(): TaskComment[] {
    try {
      const data = localStorage.getItem(this.COMMENTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading comments from localStorage:', error);
      return [];
    }
  }

  private saveComments(comments: TaskComment[]): void {
    try {
      localStorage.setItem(this.COMMENTS_KEY, JSON.stringify(comments));
    } catch (error) {
      console.error('Error saving comments to localStorage:', error);
    }
  }

  private generateId(): string {
    return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private applyFilters(tasks: Task[], filters?: TaskFilters): Task[] {
    let filtered = [...tasks];

    if (filters?.status) {
      filtered = filtered.filter(task => task.status === filters.status);
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower)
      );
    }

    if (filters?.category) {
      filtered = filtered.filter(task => task.category === filters.category);
    }

    // Sort
    const sortBy = filters?.sortBy || 'createdAt';
    const order = filters?.order || 'desc';
    
    filtered.sort((a, b) => {
      let aVal = a[sortBy as keyof Task];
      let bVal = b[sortBy as keyof Task];

      if (aVal instanceof Date) aVal = aVal.getTime();
      if (bVal instanceof Date) bVal = bVal.getTime();
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (order === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    return filtered;
  }

  async getAll(filters?: TaskFilters): Promise<PaginatedResult<Task>> {
    const tasks = this.getTasks();
    const filtered = this.applyFilters(tasks, filters);
    
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);
    
    return {
      data: paginated,
      meta: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
        hasNext: offset + limit < filtered.length,
        hasPrev: page > 1
      }
    };
  }

  async get(id: string): Promise<Task> {
    const tasks = this.getTasks();
    const task = tasks.find(t => t.id === id);
    
    if (!task) {
      throw new Error('Task not found');
    }

    // Increment view count
    task.viewCount = (task.viewCount || 0) + 1;
    this.saveTasks(tasks);

    return task;
  }

  async create(taskDto: CreateTaskDto): Promise<Task> {
    const tasks = this.getTasks();
    const now = new Date();
    
    const task: Task = {
      id: this.generateId(),
      title: taskDto.title,
      description: taskDto.description,
      status: taskDto.status || 'todo',
      priority: taskDto.priority || 2,
      progress: 0,
      category: taskDto.category || 'General',
      tags: taskDto.tags,
      createdAt: now,
      updatedAt: now,
      deadline: taskDto.deadline ? new Date(taskDto.deadline) : undefined,
      parentId: taskDto.parentId,
      subtaskIds: [],
      timeSpent: 0,
      estimatedDuration: taskDto.estimatedDuration,
      viewCount: 0,
      editCount: 0
    };

    tasks.push(task);
    this.saveTasks(tasks);

    return task;
  }

  async update(id: string, updates: UpdateTaskDto): Promise<Task> {
    const tasks = this.getTasks();
    const taskIndex = tasks.findIndex(t => t.id === id);
    
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }

    const task = tasks[taskIndex];
    const updatedTask = {
      ...task,
      ...updates,
      updatedAt: new Date(),
      editCount: (task.editCount || 0) + 1
    };

    if (updates.status === 'done' && task.status !== 'done') {
      updatedTask.completedAt = new Date();
      updatedTask.progress = 100;
    } else if (updates.status !== 'done' && task.status === 'done') {
      updatedTask.completedAt = undefined;
    }

    if (updates.deadline) {
      updatedTask.deadline = new Date(updates.deadline);
    }

    tasks[taskIndex] = updatedTask;
    this.saveTasks(tasks);

    return updatedTask;
  }

  async remove(id: string): Promise<void> {
    const tasks = this.getTasks();
    const filteredTasks = tasks.filter(t => t.id !== id);
    
    if (filteredTasks.length === tasks.length) {
      throw new Error('Task not found');
    }

    this.saveTasks(filteredTasks);

    // Also remove associated comments
    const comments = this.getComments();
    const filteredComments = comments.filter(c => c.taskId !== id);
    this.saveComments(filteredComments);
  }

  async addComment(taskId: string, body: string): Promise<TaskComment> {
    // Verify task exists
    await this.get(taskId);

    const comments = this.getComments();
    const comment: TaskComment = {
      id: this.generateId(),
      taskId,
      userId: 0, // Local user ID
      body,
      commentType: 'comment',
      isEdited: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      userName: 'Local User'
    };

    comments.push(comment);
    this.saveComments(comments);

    return comment;
  }

  async getComments(taskId: string, options?: { page?: number; limit?: number }): Promise<PaginatedResult<TaskComment>> {
    const comments = this.getComments();
    const taskComments = comments.filter(c => c.taskId === taskId);
    
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const offset = (page - 1) * limit;
    const paginated = taskComments
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(offset, offset + limit);

    return {
      data: paginated,
      meta: {
        page,
        limit,
        total: taskComments.length,
        totalPages: Math.ceil(taskComments.length / limit),
        hasNext: offset + limit < taskComments.length,
        hasPrev: page > 1
      }
    };
  }
}

/**
 * API adapter for server-side persistence
 * Communicates with the backend API using authenticated requests
 */
class ApiAdapter implements StorageAdapter {
  private readonly baseURL = `${import.meta.env.VITE_API_BASE_URL}/api/tasks`;

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = TokenService.getAccessToken();
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async getAll(filters?: TaskFilters): Promise<PaginatedResult<Task>> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const endpoint = params.toString() ? `?${params}` : '';
    const response = await this.request<PaginatedResult<Task>>(endpoint);
    
    return response.data;
  }

  async get(id: string): Promise<Task> {
    const response = await this.request<Task>(`/${id}`);
    return response.data;
  }

  async create(taskDto: CreateTaskDto): Promise<Task> {
    const response = await this.request<Task>('', {
      method: 'POST',
      body: JSON.stringify(taskDto)
    });
    return response.data;
  }

  async update(id: string, updates: UpdateTaskDto): Promise<Task> {
    const response = await this.request<Task>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    return response.data;
  }

  async remove(id: string): Promise<void> {
    await this.request<null>(`/${id}`, {
      method: 'DELETE'
    });
  }

  async addComment(taskId: string, body: string): Promise<TaskComment> {
    const response = await this.request<TaskComment>(`/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body, commentType: 'comment' })
    });
    return response.data;
  }

  async getComments(taskId: string, options?: { page?: number; limit?: number }): Promise<PaginatedResult<TaskComment>> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    
    const endpoint = `/${taskId}/comments${params.toString() ? `?${params}` : ''}`;
    const response = await this.request<PaginatedResult<TaskComment>>(endpoint);
    
    return response.data;
  }

  async sync(tasks: Task[]): Promise<SyncResult> {
    const response = await this.request<SyncResult>('/sync/bulk', {
      method: 'POST',
      body: JSON.stringify({ tasks })
    });
    return response.data;
  }
}

/**
 * TaskRepository - Main interface for task operations
 * Automatically switches between API and LocalStorage based on connectivity
 */
export class TaskRepository {
  private apiAdapter = new ApiAdapter();
  private localAdapter = new LocalStorageAdapter();
  private currentAdapter: StorageAdapter = this.apiAdapter;

  constructor() {
    this.updateAdapter();
    
    // Listen for online/offline events
    window.addEventListener('online', () => this.updateAdapter());
    window.addEventListener('offline', () => this.updateAdapter());
  }

  /**
   * Determine which adapter to use based on connectivity and authentication
   */
  private updateAdapter(): void {
    const isOnline = navigator.onLine;
    const hasToken = !!TokenService.getAccessToken();
    
    // Use API adapter if online and authenticated, otherwise use local storage
    this.currentAdapter = (isOnline && hasToken) ? this.apiAdapter : this.localAdapter;
  }

  /**
   * Execute operation with fallback to localStorage on failure
   */
  private async withFallback<T>(
    operation: () => Promise<T>,
    fallbackOperation?: () => Promise<T>
  ): Promise<T> {
    try {
      // Always try to use the most appropriate adapter
      this.updateAdapter();
      return await operation();
    } catch (error) {
      console.warn('Primary operation failed, attempting fallback:', error);
      
      // If we were using API and it failed, try localStorage
      if (this.currentAdapter === this.apiAdapter && fallbackOperation) {
        this.currentAdapter = this.localAdapter;
        return await fallbackOperation();
      }
      
      throw error;
    }
  }

  /**
   * Get all tasks with filtering and pagination
   */
  async getAll(filters?: TaskFilters): Promise<PaginatedResult<Task>> {
    return this.withFallback(
      () => this.currentAdapter.getAll(filters),
      () => this.localAdapter.getAll(filters)
    );
  }

  /**
   * Get a specific task by ID
   */
  async get(id: string): Promise<Task> {
    return this.withFallback(
      () => this.currentAdapter.get(id),
      () => this.localAdapter.get(id)
    );
  }

  /**
   * Create a new task
   */
  async create(taskDto: CreateTaskDto): Promise<Task> {
    return this.withFallback(
      () => this.currentAdapter.create(taskDto),
      () => this.localAdapter.create(taskDto)
    );
  }

  /**
   * Update an existing task
   */
  async update(id: string, updates: UpdateTaskDto): Promise<Task> {
    return this.withFallback(
      () => this.currentAdapter.update(id, updates),
      () => this.localAdapter.update(id, updates)
    );
  }

  /**
   * Delete a task
   */
  async remove(id: string): Promise<void> {
    return this.withFallback(
      () => this.currentAdapter.remove(id),
      () => this.localAdapter.remove(id)
    );
  }

  /**
   * Add a comment to a task
   */
  async addComment(taskId: string, body: string): Promise<TaskComment> {
    return this.withFallback(
      () => this.currentAdapter.addComment(taskId, body),
      () => this.localAdapter.addComment(taskId, body)
    );
  }

  /**
   * Get comments for a task
   */
  async getComments(taskId: string, options?: { page?: number; limit?: number }): Promise<PaginatedResult<TaskComment>> {
    return this.withFallback(
      () => this.currentAdapter.getComments(taskId, options),
      () => this.localAdapter.getComments(taskId, options)
    );
  }

  /**
   * Sync local tasks with the server
   * Only available when using API adapter
   */
  async sync(): Promise<SyncResult | null> {
    if (this.currentAdapter !== this.apiAdapter || !('sync' in this.currentAdapter)) {
      console.warn('Sync is only available when connected to the API');
      return null;
    }

    // Get all local tasks to sync
    const localTasks = await this.localAdapter.getAll({ limit: 1000 });
    
    if (localTasks.data.length === 0) {
      return { imported: 0, updated: 0, conflicts: [], errors: [] };
    }

    return this.apiAdapter.sync!(localTasks.data);
  }

  /**
   * Get the current adapter type for debugging
   */
  getCurrentAdapterType(): 'api' | 'local' {
    return this.currentAdapter === this.apiAdapter ? 'api' : 'local';
  }

  /**
   * Force refresh of adapter selection
   */
  refreshAdapter(): void {
    this.updateAdapter();
  }
}
