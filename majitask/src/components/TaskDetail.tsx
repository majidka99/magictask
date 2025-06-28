import { useState } from 'react';
import { X, Calendar, Clock, MessageSquare, Edit2, Trash2, CheckSquare, Square, Send, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { Task } from '../types';
import { StatusBadge, StatusSelector } from './StatusBadge';
import { PriorityBadge, PrioritySelector } from './PriorityBadge';
import { ProgressBar, ProgressEditor } from './ProgressBar';
import { SubTaskManager } from './SubTaskManager';
import { AddressInput } from './AddressInput';
import { TimeTracker } from './TimeTracker';
import { RecurrenceService } from '../utils/recurrenceService';

// Helper functions for enhanced date/time formatting
const formatDateTime = (date: Date): string => {
  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
  if (hasTime) {
    return format(date, 'MMM d, yyyy \'at\' h:mm a');
  } else {
    return format(date, 'MMM d, yyyy');
  }
};

const calculateTaskDuration = (start: Date, end: Date): string => {
  const diffMs = end.getTime() - start.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = Math.floor(diffHours / 24);
  const remainingHours = Math.floor(diffHours % 24);
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ${remainingHours}h ${diffMinutes}m`;
  } else if (remainingHours > 0) {
    return `${remainingHours}h ${diffMinutes}m`;
  } else {
    return `${diffMinutes}m`;
  }
};

interface TaskDetailProps {
  task: Task;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onAddComment: (taskId: string, comment: string) => void;
  onDelete: (taskId: string) => void;
  onToggleComplete: (taskId: string) => void;
  // Subtask props
  subtasks: Task[];
  onAddSubtask: (parentId: string, title: string, description?: string) => void;
  onUpdateSubtask: (subtaskId: string, updates: Partial<Task>) => void;
  onDeleteSubtask: (parentId: string, subtaskId: string) => void;
  onToggleSubtask: (subtaskId: string) => void;
  // Time tracking
  onTimeUpdate: (taskId: string, timeSpent: number) => void;
}

const TaskDetail = ({ 
  task, 
  onClose, 
  onUpdate, 
  onAddComment, 
  onDelete, 
  onToggleComplete,
  subtasks,
  onAddSubtask,
  onUpdateSubtask,
  onDeleteSubtask,
  onToggleSubtask,
  onTimeUpdate
}: TaskDetailProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: task.title,
    description: task.description,
    deadline: task.deadline,
    status: task.status,
    priority: task.priority,
    progress: task.progress,
    location: task.location,
  });
  const [newComment, setNewComment] = useState('');

  const handleSaveEdit = () => {
    onUpdate(task.id, {
      title: editData.title.trim(),
      description: editData.description.trim(),
      deadline: editData.deadline,
      status: editData.status,
      priority: editData.priority,
      progress: editData.progress,
      location: editData.location,
      completed: editData.status === 'done', // Update completed for backward compatibility
    });
    setIsEditing(false);
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      onAddComment(task.id, newComment.trim());
      setNewComment('');
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      onDelete(task.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-white flex-shrink-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onToggleComplete(task.id)}
              className={`${
                task.completed 
                  ? 'text-green-500 hover:text-green-600' 
                  : 'text-gray-400 hover:text-primary-500'
              }`}
            >
              {task.completed ? (
                <CheckSquare className="w-6 h-6" />
              ) : (
                <Square className="w-6 h-6" />
              )}
            </button>
            
            {isEditing ? (
              <input
                type="text"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                className="text-xl font-semibold text-gray-900 bg-transparent border-b border-primary-500 focus:outline-none"
                autoFocus
              />
            ) : (
              <h2 className={`text-xl font-semibold ${
                task.completed ? 'text-gray-500 line-through' : 'text-gray-900'
              }`}>
                {task.title}
              </h2>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="btn-primary py-1 px-3 text-sm"
                >
                  Save
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDelete}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
          {/* Task Info */}
          <div className="space-y-4">
            {/* Status and Priority Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                {isEditing ? (
                  <StatusSelector
                    currentStatus={editData.status}
                    onStatusChange={(status) => setEditData({ ...editData, status })}
                    className="w-full"
                  />
                ) : (
                  <StatusBadge status={task.status} size="md" />
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                {isEditing ? (
                  <PrioritySelector
                    currentPriority={editData.priority}
                    onPriorityChange={(priority) => setEditData({ ...editData, priority })}
                    className="w-full"
                  />
                ) : (
                  <PriorityBadge priority={task.priority} size="md" />
                )}
              </div>

              {/* Progress */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Progress</label>
                {isEditing ? (
                  <ProgressEditor
                    progress={editData.progress}
                    onProgressChange={(progress) => setEditData({ ...editData, progress })}
                  />
                ) : (
                  <ProgressBar progress={task.progress} size="md" />
                )}
              </div>
            </div>

            {/* Recurring Task Information */}
            {(task.isTemplate || task.templateId) && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🔄</span>
                  <h3 className="text-sm font-medium text-purple-800">
                    {task.isTemplate ? 'Recurring Task Template' : 'Recurring Task Instance'}
                  </h3>
                </div>
                
                {task.isTemplate && task.recurrence && (
                  <div className="space-y-2 text-sm">
                    <p className="text-purple-700">
                      <strong>Pattern:</strong> {(() => {
                        try {
                          return RecurrenceService.getRecurrenceDescription(task.recurrence);
                        } catch {
                          return 'Custom recurrence pattern';
                        }
                      })()}
                    </p>
                    {task.nextDueDate && (
                      <p className="text-purple-700">
                        <strong>Next Due:</strong> {formatDateTime(task.nextDueDate)}
                      </p>
                    )}
                  </div>
                )}
                
                {task.templateId && (
                  <div className="space-y-2 text-sm">
                    <p className="text-indigo-700">
                      <strong>Instance #{task.instanceNumber}</strong> of recurring task
                    </p>
                    <p className="text-indigo-600 text-xs">
                      This task was automatically generated from a recurring template
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Category, Tags and Dates */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {task.category}
                </span>
                
                {task.deadline && (
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    {isEditing ? (
                      <input
                        type="datetime-local"
                        value={editData.deadline ? format(editData.deadline, "yyyy-MM-dd'T'HH:mm") : ''}
                        onChange={(e) => setEditData({ 
                          ...editData, 
                          deadline: e.target.value ? new Date(e.target.value) : undefined 
                        })}
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    ) : (
                      <span>Due: {formatDateTime(task.deadline)}</span>
                    )}
                  </div>
                )}

                {/* Enhanced Date Information */}
                {task.startDate && (
                  <div className="flex items-center space-x-1">
                    <span className="text-green-600">▶</span>
                    <span>Start: {formatDateTime(task.startDate)}</span>
                  </div>
                )}

                {task.endDate && (
                  <div className="flex items-center space-x-1">
                    <span className="text-red-600">◀</span>
                    <span>End: {formatDateTime(task.endDate)}</span>
                  </div>
                )}

                {/* Duration Display */}
                {task.startDate && task.endDate && (
                  <div className="flex items-center space-x-1 text-blue-600">
                    <Calendar className="w-4 h-4" />
                    <span>Duration: {calculateTaskDuration(task.startDate, task.endDate)}</span>
                  </div>
                )}

                {task.estimatedDuration && (
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>
                      Est: {Math.floor(task.estimatedDuration / 60)}h {task.estimatedDuration % 60}m
                    </span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-gray-500">Tags:</span>
                  {task.tags.map(tag => (
                    <span 
                      key={tag}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Location */}
              {(task.location || isEditing) && (
                <div>
                  {isEditing ? (
                    <AddressInput
                      value={editData.location}
                      onChange={(location) => setEditData({ ...editData, location })}
                      label="Location"
                      placeholder="Enter task location"
                    />
                  ) : task.location ? (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-sm text-gray-700">{task.location.address}</span>
                        {task.location.coordinates && (
                          <div className="mt-1">
                            <a
                              href={`https://www.google.com/maps?q=${task.location.coordinates.lat},${task.location.coordinates.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                              View on Google Maps
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
              {isEditing ? (
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  placeholder="Add a description..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              ) : (
                <p className={`text-gray-600 whitespace-pre-wrap ${
                  task.completed ? 'line-through opacity-75' : ''
                }`}>
                  {task.description || 'No description provided.'}
                </p>
              )}
            </div>

            {/* Subtasks Section */}
            {task.status !== 'cancelled' && (
              <div className="mt-6">
                <SubTaskManager
                  parentTask={task}
                  subtasks={subtasks}
                  onAddSubtask={onAddSubtask}
                  onUpdateSubtask={onUpdateSubtask}
                  onDeleteSubtask={onDeleteSubtask}
                  onToggleSubtask={onToggleSubtask}
                />
              </div>
            )}

            {/* Time Tracking Section */}
            {task.status !== 'cancelled' && task.status !== 'done' && (
              <div className="mt-6">
                <TimeTracker
                  task={task}
                  onTimeUpdate={onTimeUpdate}
                />
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div className="border-t pt-6">
            <div className="flex items-center space-x-2 mb-4">
              <MessageSquare className="w-5 h-5 text-gray-400" />
              <h3 className="font-medium text-gray-900">
                Progress Comments ({task.comments.length})
              </h3>
            </div>

            {/* Comment Input */}
            <div className="flex space-x-3 mb-4">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a progress comment..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddComment();
                  }
                }}
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="btn-primary px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Comments List */}
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {task.comments.length === 0 ? (
                <p className="text-gray-500 text-sm italic">
                  No comments yet. Add your first progress update!
                </p>
              ) : (
                task.comments
                  .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                  .map((comment) => (
                    <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-700 text-sm">{comment.text}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(comment.createdAt, 'MMM d, yyyy \'at\' h:mm a')}
                      </p>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
