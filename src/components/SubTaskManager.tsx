import React, { useState } from 'react';
import { Plus, ChevronDown, ChevronRight, GripVertical, Trash2 } from 'lucide-react';
import { Task } from '../types';
import { StatusBadge } from './StatusBadge';
import { ProgressBar } from './ProgressBar';

interface SubTaskManagerProps {
  parentTask: Task;
  subtasks: Task[];
  onAddSubtask: (parentId: string, title: string, description?: string) => void;
  onUpdateSubtask: (subtaskId: string, updates: Partial<Task>) => void;
  onDeleteSubtask: (parentId: string, subtaskId: string) => void;
  onToggleSubtask: (subtaskId: string) => void;
  className?: string;
}

export const SubTaskManager: React.FC<SubTaskManagerProps> = ({
  parentTask,
  subtasks,
  onAddSubtask,
  onUpdateSubtask,
  onDeleteSubtask,
  onToggleSubtask,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskDescription, setNewSubtaskDescription] = useState('');

  const handleAddSubtask = () => {
    if (newSubtaskTitle.trim()) {
      onAddSubtask(parentTask.id, newSubtaskTitle.trim(), newSubtaskDescription.trim() || undefined);
      setNewSubtaskTitle('');
      setNewSubtaskDescription('');
      setShowAddForm(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddSubtask();
    }
    if (e.key === 'Escape') {
      setShowAddForm(false);
      setNewSubtaskTitle('');
      setNewSubtaskDescription('');
    }
  };

  const completedSubtasks = subtasks.filter(st => st.status === 'done').length;
  const totalSubtasks = subtasks.length;
  const progressPercentage = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return (
    <div className={`border rounded-lg bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )}
          </button>
          
          <h4 className="font-medium text-gray-900">
            Subtasks ({completedSubtasks}/{totalSubtasks})
          </h4>
          
          {totalSubtasks > 0 && (
            <div className="flex items-center gap-2">
              <ProgressBar 
                progress={progressPercentage} 
                size="sm" 
                showPercentage={false}
                className="w-16"
              />
              <span className="text-xs text-gray-500">{progressPercentage}%</span>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1 px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add Subtask
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {/* Add Subtask Form */}
          {showAddForm && (
            <div className="bg-white border border-blue-200 rounded-lg p-4 space-y-3">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Subtask title..."
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <textarea
                value={newSubtaskDescription}
                onChange={(e) => setNewSubtaskDescription(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Description (optional)..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddSubtask}
                  disabled={!newSubtaskTitle.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewSubtaskTitle('');
                    setNewSubtaskDescription('');
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Subtasks List */}
          {subtasks.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <div className="text-gray-400 mb-2">📋</div>
              <p className="text-sm">No subtasks yet</p>
              <p className="text-xs">Break down this task into smaller steps</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto border border-gray-200 rounded p-3 bg-gray-25">
              {subtasks.map((subtask) => (
                <SubTaskItem
                  key={subtask.id}
                  subtask={subtask}
                  onUpdate={onUpdateSubtask}
                  onDelete={() => onDeleteSubtask(parentTask.id, subtask.id)}
                  onToggle={() => onToggleSubtask(subtask.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface SubTaskItemProps {
  subtask: Task;
  onUpdate: (subtaskId: string, updates: Partial<Task>) => void;
  onDelete: () => void;
  onToggle: () => void;
}

const SubTaskItem: React.FC<SubTaskItemProps> = ({
  subtask,
  onUpdate,
  onDelete,
  onToggle
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(subtask.title);
  const [editDescription, setEditDescription] = useState(subtask.description || '');

  const handleSave = () => {
    if (editTitle.trim() && (editTitle !== subtask.title || editDescription !== (subtask.description || ''))) {
      onUpdate(subtask.id, { 
        title: editTitle.trim(),
        description: editDescription.trim() || undefined
      });
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      setEditTitle(subtask.title);
      setEditDescription(subtask.description || '');
      setIsEditing(false);
    }
  };

  const handleStatusChange = (newStatus: any) => {
    onUpdate(subtask.id, { 
      status: newStatus,
      completed: newStatus === 'done',
      completedAt: newStatus === 'done' ? new Date() : undefined
    });
  };

  return (
    <div className={`flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg group hover:border-gray-300 transition-colors ${isEditing ? 'items-start' : 'items-center'}`}>
      {/* Drag Handle */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
        <GripVertical className="w-3 h-3 text-gray-400 cursor-grab" />
      </div>

      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`flex-shrink-0 w-4 h-4 border-2 rounded transition-colors mt-0.5 ${
          subtask.completed
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        {subtask.completed && (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-3">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Subtask title..."
              className="w-full px-3 py-2 border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Description (optional)..."
              rows={2}
              className="w-full px-3 py-2 border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!editTitle.trim()}
                className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditTitle(subtask.title);
                  setEditDescription(subtask.description || '');
                  setIsEditing(false);
                }}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`cursor-pointer ${
              subtask.completed ? 'line-through text-gray-500' : 'text-gray-900'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            <span className="text-sm font-medium">{subtask.title}</span>
            {subtask.description && (
              <p className="text-xs text-gray-600 mt-1">{subtask.description}</p>
            )}
            {!subtask.description && (
              <p className="text-xs text-gray-400 mt-1 italic">Click to add description</p>
            )}
          </div>
        )}
      </div>

      {/* Status Badge */}
      <StatusBadge status={subtask.status} size="sm" showIcon={false} />

      {/* Actions */}
      {!isEditing && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          <select
            value={subtask.status}
            onChange={(e) => {
              e.stopPropagation();
              handleStatusChange(e.target.value);
            }}
            onClick={(e) => e.stopPropagation()}
            className="text-xs border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="todo">Todo</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            title="Delete subtask"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
