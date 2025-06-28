import { Clock, MessageSquare, Trash2, CheckSquare, Square, FileText, MapPin } from 'lucide-react';
import { format, isBefore, addDays } from 'date-fns';
import { Task } from '../types';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { ProgressBar } from './ProgressBar';

// Helper function for enhanced date/time formatting
const formatDateTime = (date: Date): string => {
  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
  if (hasTime) {
    return format(date, 'MMM d, h:mm a');
  } else {
    return format(date, 'MMM d, yyyy');
  }
};

interface TaskListProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onToggleComplete: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  getSubtasks?: (parentId: string) => Task[];
  // Bulk operations
  selectedTaskIds?: string[];
  onTaskSelect?: (taskId: string) => void;
  showBulkSelection?: boolean;
}

const TaskList = ({ 
  tasks, 
  onTaskClick, 
  onToggleComplete, 
  onDeleteTask, 
  getSubtasks,
  selectedTaskIds = [],
  onTaskSelect,
  showBulkSelection = false
}: TaskListProps) => {
  const getDeadlineStatus = (deadline?: Date) => {
    if (!deadline) return null;
    
    const now = new Date();
    const tomorrow = addDays(now, 1);
    
    if (isBefore(deadline, now)) {
      return { status: 'overdue', color: 'text-red-500', bgColor: 'bg-red-50' };
    } else if (isBefore(deadline, tomorrow)) {
      return { status: 'due-soon', color: 'text-amber-500', bgColor: 'bg-amber-50' };
    }
    return { status: 'upcoming', color: 'text-blue-500', bgColor: 'bg-blue-50' };
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    // Sort by completion status first (incomplete first)
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    
    // Then by priority (higher priority first)
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    
    // Then by deadline (soonest first)
    if (a.deadline && b.deadline) {
      return a.deadline.getTime() - b.deadline.getTime();
    }
    if (a.deadline && !b.deadline) return -1;
    if (!a.deadline && b.deadline) return 1;
    
    // Finally by creation date (newest first)
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return (
    <div className="space-y-3">
      {sortedTasks.map((task) => {
        const deadlineStatus = getDeadlineStatus(task.deadline);
        
        return (
          <div
            key={task.id}
            className={`card hover:shadow-md transition-shadow cursor-pointer ${
              task.completed ? 'opacity-75' : ''
            } ${selectedTaskIds.includes(task.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
            onClick={() => onTaskClick(task)}
          >
            <div className="flex items-start space-x-4">
              {/* Bulk Selection Checkbox */}
              {showBulkSelection && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTaskSelect?.(task.id);
                  }}
                  className="mt-1 flex-shrink-0 text-blue-600 hover:text-blue-700"
                >
                  {selectedTaskIds.includes(task.id) ? (
                    <CheckSquare className="w-5 h-5" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
              )}

              {/* Completion Checkbox */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleComplete(task.id);
                }}
                className={`mt-1 flex-shrink-0 ${
                  task.completed 
                    ? 'text-green-500 hover:text-green-600' 
                    : 'text-gray-400 hover:text-primary-500'
                }`}
              >
                {task.completed ? (
                  <CheckSquare className="w-5 h-5" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
              </button>

              {/* Task Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className={`font-medium ${
                      task.completed 
                        ? 'text-gray-500 line-through' 
                        : 'text-gray-900'
                    }`}>
                      {task.title}
                    </h3>
                    
                    {task.description && (
                      <p className={`mt-1 text-sm ${
                        task.completed ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {task.description.length > 100 
                          ? `${task.description.substring(0, 100)}...`
                          : task.description
                        }
                      </p>
                    )}

                    {/* Task Meta Info */}
                    <div className="flex items-center flex-wrap gap-2 mt-3">
                      {/* Status Badge */}
                      <StatusBadge status={task.status} size="sm" />
                      
                      {/* Priority Badge */}
                      <PriorityBadge priority={task.priority} size="sm" />
                      
                      {/* Recurring Task Indicator */}
                      {task.isTemplate && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          🔄 Template
                        </span>
                      )}
                      {task.templateId && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          #{task.instanceNumber}
                        </span>
                      )}
                      
                      {/* Category */}
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {task.category}
                      </span>

                      {/* Tags */}
                      {task.tags && task.tags.slice(0, 2).map(tag => (
                        <span 
                          key={tag}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
                        >
                          {tag}
                        </span>
                      ))}
                      {task.tags && task.tags.length > 2 && (
                        <span className="text-xs text-gray-500">
                          +{task.tags.length - 2} more
                        </span>
                      )}

                      {/* Deadline */}
                      {task.deadline && deadlineStatus && (
                        <div className={`flex items-center space-x-1 text-xs ${deadlineStatus.color}`}>
                          <Clock className="w-3 h-3" />
                          <span>
                            {deadlineStatus.status === 'overdue' && 'Overdue: '}
                            {deadlineStatus.status === 'due-soon' && 'Due: '}
                            {formatDateTime(task.deadline)}
                          </span>
                        </div>
                      )}

                      {/* Comments Count */}
                      {task.comments.length > 0 && (
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <MessageSquare className="w-3 h-3" />
                          <span>{task.comments.length}</span>
                        </div>
                      )}

                      {/* Subtasks Count */}
                      {getSubtasks && (() => {
                        const subtasks = getSubtasks(task.id);
                        if (subtasks.length > 0) {
                          const completedSubtasks = subtasks.filter(st => st.status === 'done').length;
                          return (
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <FileText className="w-3 h-3" />
                              <span>{completedSubtasks}/{subtasks.length} subtasks</span>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Location */}
                      {task.location && (
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate max-w-32">{task.location.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    {(task.progress > 0 || task.status === 'in-progress') && (
                      <div className="mt-3">
                        <ProgressBar 
                          progress={task.progress} 
                          size="sm" 
                          showPercentage={false}
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Are you sure you want to delete this task?')) {
                        onDeleteTask(task.id);
                      }
                    }}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TaskList;
