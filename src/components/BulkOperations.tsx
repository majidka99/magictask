import React, { useState } from 'react';
import { CheckSquare, Square, Trash2, Tag, X } from 'lucide-react';
import { Task, TaskStatus, TaskPriority } from '../types';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';

interface BulkOperationsProps {
  tasks: Task[];
  selectedTaskIds: string[];
  onSelectionChange: (taskIds: string[]) => void;
  onBulkUpdate: (taskIds: string[], updates: Partial<Task>) => void;
  onBulkDelete: (taskIds: string[]) => void;
  categories: string[];
  allTags: string[];
}

export const BulkOperations: React.FC<BulkOperationsProps> = ({
  tasks,
  selectedTaskIds,
  onSelectionChange,
  onBulkUpdate,
  onBulkDelete,
  categories
}) => {
  const [newTag, setNewTag] = useState('');

  const selectedTasks = tasks.filter(task => selectedTaskIds.includes(task.id));
  const hasSelection = selectedTaskIds.length > 0;

  const handleSelectAll = () => {
    if (selectedTaskIds.length === tasks.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(tasks.map(task => task.id));
    }
  };

  const handleToggleTask = (taskId: string) => {
    if (selectedTaskIds.includes(taskId)) {
      onSelectionChange(selectedTaskIds.filter(id => id !== taskId));
    } else {
      onSelectionChange([...selectedTaskIds, taskId]);
    }
  };

  const handleBulkStatusChange = (status: TaskStatus) => {
    onBulkUpdate(selectedTaskIds, { 
      status, 
      completed: status === 'done',
      completedAt: status === 'done' ? new Date() : undefined
    });
    onSelectionChange([]);
  };

  const handleBulkPriorityChange = (priority: TaskPriority) => {
    onBulkUpdate(selectedTaskIds, { priority });
    onSelectionChange([]);
  };

  const handleBulkCategoryChange = (category: string) => {
    onBulkUpdate(selectedTaskIds, { category });
    onSelectionChange([]);
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedTaskIds.length} task(s)?`)) {
      onBulkDelete(selectedTaskIds);
      onSelectionChange([]);
    }
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    
    selectedTaskIds.forEach(taskId => {
      const task = tasks.find(t => t.id === taskId);
      if (task && !task.tags.includes(newTag.trim())) {
        const updatedTags = [...task.tags, newTag.trim()];
        onBulkUpdate([taskId], { tags: updatedTags });
      }
    });
    
    setNewTag('');
    onSelectionChange([]);
  };

  const handleRemoveTag = (tag: string) => {
    selectedTaskIds.forEach(taskId => {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.tags.includes(tag)) {
        const updatedTags = task.tags.filter(t => t !== tag);
        onBulkUpdate([taskId], { tags: updatedTags });
      }
    });
    
    onSelectionChange([]);
  };

  const getCommonTags = () => {
    if (selectedTasks.length === 0) return [];
    
    const allSelectedTags = selectedTasks.map(task => task.tags);
    const commonTags = allSelectedTags[0]?.filter(tag => 
      allSelectedTags.every(taskTags => taskTags.includes(tag))
    ) || [];
    
    return commonTags;
  };

  const BulkActionButton: React.FC<{
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    variant?: 'primary' | 'danger' | 'secondary';
  }> = ({ onClick, icon, label, variant = 'secondary' }) => {
    const baseClasses = "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors";
    const variantClasses = {
      primary: "bg-blue-600 text-white hover:bg-blue-700",
      danger: "bg-red-600 text-white hover:bg-red-700",
      secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200"
    };

    return (
      <button
        onClick={onClick}
        className={`${baseClasses} ${variantClasses[variant]}`}
      >
        {icon}
        <span>{label}</span>
      </button>
    );
  };

  if (!hasSelection) {
    return (
      <div className="bg-white rounded-lg border p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="text-gray-400 hover:text-blue-600"
              title="Select all tasks"
            >
              <Square className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-500">
              Select tasks to perform bulk operations
            </span>
          </div>
          <span className="text-xs text-gray-400">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} total
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-4 mb-4 border-blue-200 bg-blue-50">
      <div className="space-y-4">
        {/* Selection Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="text-blue-600 hover:text-blue-700"
              title={selectedTaskIds.length === tasks.length ? "Deselect all" : "Select all tasks"}
            >
              {selectedTaskIds.length === tasks.length ? (
                <CheckSquare className="w-5 h-5" />
              ) : (
                <Square className="w-5 h-5" />
              )}
            </button>
            <span className="text-sm font-medium text-blue-900">
              {selectedTaskIds.length} task{selectedTaskIds.length !== 1 ? 's' : ''} selected
            </span>
          </div>
          <button
            onClick={() => onSelectionChange([])}
            className="text-gray-400 hover:text-gray-600"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          {/* Status Actions */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-600 mr-2">Status:</span>
            <button
              onClick={() => handleBulkStatusChange('todo')}
              className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
            >
              <StatusBadge status="todo" size="sm" />
            </button>
            <button
              onClick={() => handleBulkStatusChange('in-progress')}
              className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
            >
              <StatusBadge status="in-progress" size="sm" />
            </button>
            <button
              onClick={() => handleBulkStatusChange('done')}
              className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
            >
              <StatusBadge status="done" size="sm" />
            </button>
          </div>

          {/* Priority Actions */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-600 mr-2">Priority:</span>
            {(['low', 'medium', 'high', 'critical'] as TaskPriority[]).map(priority => (
              <button
                key={priority}
                onClick={() => handleBulkPriorityChange(priority)}
                className="px-2 py-1 rounded text-xs hover:bg-gray-100"
              >
                <PriorityBadge priority={priority} size="sm" />
              </button>
            ))}
          </div>

          {/* Category Action */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-600 mr-2">Category:</span>
            <select
              onChange={(e) => e.target.value && handleBulkCategoryChange(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1"
              defaultValue=""
            >
              <option value="">Change category...</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Delete Action */}
          <BulkActionButton
            onClick={handleBulkDelete}
            icon={<Trash2 className="w-4 h-4" />}
            label="Delete"
            variant="danger"
          />
        </div>

        {/* Tag Management */}
        <div className="border-t pt-3">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Tags</span>
          </div>
          
          {/* Common Tags */}
          {getCommonTags().length > 0 && (
            <div className="mb-2">
              <span className="text-xs text-gray-500 mr-2">Common tags:</span>
              <div className="inline-flex flex-wrap gap-1">
                {getCommonTags().map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleRemoveTag(tag)}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs hover:bg-red-100 hover:text-red-700"
                    title={`Remove #${tag} from selected tasks`}
                  >
                    #{tag}
                    <X className="w-3 h-3" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add Tag */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add tag to selected tasks..."
              className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
            />
            <button
              onClick={handleAddTag}
              disabled={!newTag.trim()}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Tag
            </button>
          </div>
        </div>

        {/* Selected Tasks Preview */}
        {selectedTasks.length <= 5 && (
          <div className="border-t pt-3">
            <span className="text-xs text-gray-500 mb-2 block">Selected tasks:</span>
            <div className="space-y-1">
              {selectedTasks.map(task => (
                <div key={task.id} className="flex items-center gap-2 text-sm">
                  <button
                    onClick={() => handleToggleTask(task.id)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <CheckSquare className="w-4 h-4" />
                  </button>
                  <span className={task.completed ? 'line-through text-gray-500' : 'text-gray-900'}>
                    {task.title}
                  </span>
                  <StatusBadge status={task.status} size="sm" />
                  <PriorityBadge priority={task.priority} size="sm" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
