import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { TaskRepository, Task, TaskComment, CreateTaskDto, UpdateTaskDto, TaskFilters, PaginatedResult, SyncResult } from '../repositories/taskRepository';

// Store state interface
interface TaskState {
  // Data
  tasks: Task[];
  currentTask: Task | null;
  comments: Record<string, TaskComment[]>; // taskId -> comments
  
  // UI state
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isSyncing: boolean;
  
  // Filters and pagination
  filters: TaskFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  
  // Error handling
  error: string | null;
  lastSyncResult: SyncResult | null;
  
  // Actions
  fetchTasks: (filters?: TaskFilters) => Promise<void>;
  fetchTask: (id: string) => Promise<void>;
  createTask: (taskDto: CreateTaskDto) => Promise<Task>;
  updateTask: (id: string, updates: UpdateTaskDto) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  
  // Comments
  fetchComments: (taskId: string, options?: { page?: number; limit?: number }) => Promise<void>;
  addComment: (taskId: string, body: string) => Promise<TaskComment>;
  
  // Filters and pagination
  setFilters: (filters: Partial<TaskFilters>) => void;
  resetFilters: () => void;
  setPage: (page: number) => Promise<void>;
  
  // Sync operations
  sync: () => Promise<SyncResult | null>;
  
  // Utility actions
  clearError: () => void;
  refreshTasks: () => Promise<void>;
  
  // Optimistic updates
  optimisticUpdateTask: (id: string, updates: Partial<Task>) => void;
  revertOptimisticUpdate: (id: string, originalTask: Task) => void;
}

// Default state values
const defaultFilters: TaskFilters = {
  status: undefined,
  search: '',
  category: undefined,
  sortBy: 'updatedAt',
  order: 'desc',
  page: 1,
  limit: 20
};

const defaultPagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false
};

// Initialize repository
const taskRepository = new TaskRepository();

// Create store with Zustand
export const useTasksStore = create<TaskState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        tasks: [],
        currentTask: null,
        comments: {},
        isLoading: false,
        isCreating: false,
        isUpdating: false,
        isDeleting: false,
        isSyncing: false,
        filters: defaultFilters,
        pagination: defaultPagination,
        error: null,
        lastSyncResult: null,

        // Fetch tasks with filters and pagination
        fetchTasks: async (filters?: TaskFilters) => {
          const currentState = get();
          const mergedFilters = { ...currentState.filters, ...filters };
          
          set({ isLoading: true, error: null });
          
          try {
            const result = await taskRepository.getAll(mergedFilters);
            
            set({
              tasks: result.data,
              pagination: result.meta,
              filters: mergedFilters,
              isLoading: false
            });
          } catch (error) {
            console.error('Error fetching tasks:', error);
            set({
              error: error instanceof Error ? error.message : 'Failed to fetch tasks',
              isLoading: false
            });
          }
        },

        // Fetch a single task
        fetchTask: async (id: string) => {
          set({ isLoading: true, error: null });
          
          try {
            const task = await taskRepository.get(id);
            
            set((state) => ({
              currentTask: task,
              tasks: state.tasks.map(t => t.id === id ? task : t),
              isLoading: false
            }));
          } catch (error) {
            console.error('Error fetching task:', error);
            set({
              error: error instanceof Error ? error.message : 'Failed to fetch task',
              isLoading: false
            });
          }
        },

        // Create a new task with optimistic update
        createTask: async (taskDto: CreateTaskDto) => {
          set({ isCreating: true, error: null });
          
          // Optimistic update - create temporary task
          const tempId = `temp_${Date.now()}`;
          const tempTask: Task = {
            id: tempId,
            title: taskDto.title,
            description: taskDto.description,
            status: taskDto.status || 'todo',
            priority: taskDto.priority || 2,
            progress: 0,
            category: taskDto.category || 'General',
            tags: taskDto.tags,
            createdAt: new Date(),
            updatedAt: new Date(),
            deadline: taskDto.deadline ? new Date(taskDto.deadline) : undefined,
            parentId: taskDto.parentId,
            subtaskIds: [],
            timeSpent: 0,
            estimatedDuration: taskDto.estimatedDuration,
            viewCount: 0,
            editCount: 0
          };

          set((state) => ({
            tasks: [tempTask, ...state.tasks]
          }));

          try {
            const createdTask = await taskRepository.create(taskDto);
            
            set((state) => ({
              tasks: state.tasks.map(t => t.id === tempId ? createdTask : t),
              isCreating: false
            }));

            return createdTask;
          } catch (error) {
            console.error('Error creating task:', error);
            
            // Revert optimistic update
            set((state) => ({
              tasks: state.tasks.filter(t => t.id !== tempId),
              error: error instanceof Error ? error.message : 'Failed to create task',
              isCreating: false
            }));
            
            throw error;
          }
        },

        // Update a task with optimistic update
        updateTask: async (id: string, updates: UpdateTaskDto) => {
          const currentState = get();
          const originalTask = currentState.tasks.find(t => t.id === id);
          
          if (!originalTask) {
            throw new Error('Task not found');
          }

          set({ isUpdating: true, error: null });

          // Optimistic update
          const optimisticTask = {
            ...originalTask,
            ...updates,
            updatedAt: new Date()
          };

          set((state) => ({
            tasks: state.tasks.map(t => t.id === id ? optimisticTask : t),
            currentTask: state.currentTask?.id === id ? optimisticTask : state.currentTask
          }));

          try {
            const updatedTask = await taskRepository.update(id, updates);
            
            set((state) => ({
              tasks: state.tasks.map(t => t.id === id ? updatedTask : t),
              currentTask: state.currentTask?.id === id ? updatedTask : state.currentTask,
              isUpdating: false
            }));

            return updatedTask;
          } catch (error) {
            console.error('Error updating task:', error);
            
            // Revert optimistic update
            set((state) => ({
              tasks: state.tasks.map(t => t.id === id ? originalTask : t),
              currentTask: state.currentTask?.id === id ? originalTask : state.currentTask,
              error: error instanceof Error ? error.message : 'Failed to update task',
              isUpdating: false
            }));
            
            throw error;
          }
        },

        // Delete a task with optimistic update
        deleteTask: async (id: string) => {
          const currentState = get();
          const taskToDelete = currentState.tasks.find(t => t.id === id);
          
          if (!taskToDelete) {
            throw new Error('Task not found');
          }

          set({ isDeleting: true, error: null });

          // Optimistic update - remove from UI
          set((state) => ({
            tasks: state.tasks.filter(t => t.id !== id),
            currentTask: state.currentTask?.id === id ? null : state.currentTask,
            comments: Object.fromEntries(
              Object.entries(state.comments).filter(([taskId]) => taskId !== id)
            )
          }));

          try {
            await taskRepository.remove(id);
            set({ isDeleting: false });
          } catch (error) {
            console.error('Error deleting task:', error);
            
            // Revert optimistic update
            set((state) => ({
              tasks: [...state.tasks, taskToDelete].sort((a, b) => 
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
              ),
              error: error instanceof Error ? error.message : 'Failed to delete task',
              isDeleting: false
            }));
            
            throw error;
          }
        },

        // Fetch comments for a task
        fetchComments: async (taskId: string, options?: { page?: number; limit?: number }) => {
          set({ isLoading: true, error: null });
          
          try {
            const result = await taskRepository.getComments(taskId, options);
            
            set((state) => ({
              comments: {
                ...state.comments,
                [taskId]: options?.page && options.page > 1 
                  ? [...(state.comments[taskId] || []), ...result.data]
                  : result.data
              },
              isLoading: false
            }));
          } catch (error) {
            console.error('Error fetching comments:', error);
            set({
              error: error instanceof Error ? error.message : 'Failed to fetch comments',
              isLoading: false
            });
          }
        },

        // Add a comment with optimistic update
        addComment: async (taskId: string, body: string) => {
          // Optimistic update - add temporary comment
          const tempComment: TaskComment = {
            id: `temp_${Date.now()}`,
            taskId,
            userId: 0,
            body,
            commentType: 'comment',
            isEdited: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            userName: 'You'
          };

          set((state) => ({
            comments: {
              ...state.comments,
              [taskId]: [tempComment, ...(state.comments[taskId] || [])]
            }
          }));

          try {
            const createdComment = await taskRepository.addComment(taskId, body);
            
            set((state) => ({
              comments: {
                ...state.comments,
                [taskId]: state.comments[taskId]?.map(c => 
                  c.id === tempComment.id ? createdComment : c
                ) || [createdComment]
              }
            }));

            return createdComment;
          } catch (error) {
            console.error('Error adding comment:', error);
            
            // Revert optimistic update
            set((state) => ({
              comments: {
                ...state.comments,
                [taskId]: state.comments[taskId]?.filter(c => c.id !== tempComment.id) || []
              },
              error: error instanceof Error ? error.message : 'Failed to add comment'
            }));
            
            throw error;
          }
        },

        // Set filters and refetch
        setFilters: (filters: Partial<TaskFilters>) => {
          const currentState = get();
          const newFilters = { ...currentState.filters, ...filters, page: 1 };
          
          set({ filters: newFilters });
          currentState.fetchTasks(newFilters);
        },

        // Reset filters to default
        resetFilters: () => {
          set({ filters: defaultFilters });
          get().fetchTasks(defaultFilters);
        },

        // Set page and refetch
        setPage: async (page: number) => {
          const currentState = get();
          const newFilters = { ...currentState.filters, page };
          
          set({ filters: newFilters });
          await currentState.fetchTasks(newFilters);
        },

        // Sync with server
        sync: async () => {
          set({ isSyncing: true, error: null });
          
          try {
            const result = await taskRepository.sync();
            
            set({
              lastSyncResult: result,
              isSyncing: false
            });

            // Refresh tasks after sync
            if (result && (result.imported > 0 || result.updated > 0)) {
              await get().refreshTasks();
            }

            return result;
          } catch (error) {
            console.error('Error syncing tasks:', error);
            set({
              error: error instanceof Error ? error.message : 'Failed to sync tasks',
              isSyncing: false
            });
            
            throw error;
          }
        },

        // Utility actions
        clearError: () => set({ error: null }),

        refreshTasks: async () => {
          const currentState = get();
          await currentState.fetchTasks(currentState.filters);
        },

        // Optimistic update helpers
        optimisticUpdateTask: (id: string, updates: Partial<Task>) => {
          set((state) => ({
            tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t),
            currentTask: state.currentTask?.id === id 
              ? { ...state.currentTask, ...updates } 
              : state.currentTask
          }));
        },

        revertOptimisticUpdate: (id: string, originalTask: Task) => {
          set((state) => ({
            tasks: state.tasks.map(t => t.id === id ? originalTask : t),
            currentTask: state.currentTask?.id === id ? originalTask : state.currentTask
          }));
        }
      }),
      {
        name: 'majitask-tasks-store',
        partialize: (state) => ({
          // Only persist essential data, not loading states
          tasks: state.tasks,
          filters: state.filters,
          lastSyncResult: state.lastSyncResult
        })
      }
    ),
    {
      name: 'tasks-store'
    }
  )
);

// Selectors for computed values
export const useTasksSelectors = () => {
  const store = useTasksStore();
  
  return {
    // Get tasks by status
    todoTasks: store.tasks.filter(t => t.status === 'todo'),
    inProgressTasks: store.tasks.filter(t => t.status === 'in_progress'),
    doneTasks: store.tasks.filter(t => t.status === 'done'),
    
    // Get tasks by category
    tasksByCategory: store.tasks.reduce((acc, task) => {
      const category = task.category || 'Uncategorized';
      if (!acc[category]) acc[category] = [];
      acc[category].push(task);
      return acc;
    }, {} as Record<string, Task[]>),
    
    // Get overdue tasks
    overdueTasks: store.tasks.filter(t => 
      t.deadline && 
      new Date(t.deadline) < new Date() && 
      t.status !== 'done'
    ),
    
    // Get tasks due today
    tasksDueToday: store.tasks.filter(t => {
      if (!t.deadline || t.status === 'done') return false;
      const today = new Date();
      const deadline = new Date(t.deadline);
      return deadline.toDateString() === today.toDateString();
    }),
    
    // Get high priority tasks
    highPriorityTasks: store.tasks.filter(t => t.priority >= 3),
    
    // Get subtasks for a parent task
    getSubtasks: (parentId: string) => 
      store.tasks.filter(t => t.parentId === parentId),
    
    // Get task statistics
    stats: {
      total: store.tasks.length,
      completed: store.tasks.filter(t => t.status === 'done').length,
      inProgress: store.tasks.filter(t => t.status === 'in_progress').length,
      todo: store.tasks.filter(t => t.status === 'todo').length,
      overdue: store.tasks.filter(t => 
        t.deadline && 
        new Date(t.deadline) < new Date() && 
        t.status !== 'done'
      ).length
    }
  };
};

export default useTasksStore;
