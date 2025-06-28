import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { TaskPriority, TaskLocation, TaskStatus, RecurrenceRule } from '../types';
import { PrioritySelector } from './PriorityBadge';
import { DateTimePicker, DateRangePicker, QuickDatePresets } from './DateTimePicker';
import { AddressInput } from './AddressInput';
import RecurrenceConfig from './RecurrenceConfig';

interface SubTaskData {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
}

interface TaskFormData {
  title: string;
  description: string;
  category: string;
  priority: TaskPriority;
  deadline?: Date;
  startDate?: Date;
  endDate?: Date;
  estimatedDuration?: number;
  tags: string[];
  location?: TaskLocation;
  subtasks: SubTaskData[];
  recurrence?: RecurrenceRule;
}

interface TaskFormProps {
  onSubmit: (data: TaskFormData) => void;
  onClose: () => void;
  existingCategories: string[];
  existingTags?: string[];
}

const TaskForm = ({ onSubmit, onClose, existingCategories, existingTags = [] }: TaskFormProps) => {
  console.log('TaskForm loaded with subtask functionality!'); // Debug log
  
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    tags: [],
    subtasks: [],
  });

  const [isNewCategory, setIsNewCategory] = useState(false);
  const [currentTag, setCurrentTag] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [showDeadlineTime, setShowDeadlineTime] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) return;
    
    onSubmit({
      ...formData,
      title: formData.title.trim(),
      description: formData.description.trim(),
      category: formData.category.trim() || 'General',
    });
  };

  const handleCategoryChange = (value: string) => {
    if (value === '__new__') {
      setIsNewCategory(true);
      setFormData({ ...formData, category: '' });
    } else {
      setIsNewCategory(false);
      setFormData({ ...formData, category: value });
    }
  };

  const addTag = () => {
    const tag = currentTag.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({ 
      ...formData, 
      tags: formData.tags.filter(tag => tag !== tagToRemove) 
    });
  };

  const addExistingTag = (tag: string) => {
    if (!formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
    }
  };

  const handleDurationChange = (value: string) => {
    const hours = parseFloat(value) || 0;
    setFormData({ ...formData, estimatedDuration: hours * 60 });
  };

  // Subtask management functions
  const addSubtask = () => {
    const newSubtask: SubTaskData = {
      id: Date.now().toString(),
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
    };
    setFormData({ 
      ...formData, 
      subtasks: [...formData.subtasks, newSubtask] 
    });
  };

  const updateSubtask = (id: string, updates: Partial<SubTaskData>) => {
    setFormData({
      ...formData,
      subtasks: formData.subtasks.map(subtask => 
        subtask.id === id ? { ...subtask, ...updates } : subtask
      )
    });
  };

  const removeSubtask = (id: string) => {
    setFormData({
      ...formData,
      subtasks: formData.subtasks.filter(subtask => subtask.id !== id)
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">Create New Task</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              id="title"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="What needs to be done?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add more details about this task..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Priority and Category Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <PrioritySelector
                currentPriority={formData.priority}
                onPriorityChange={(priority) => setFormData({ ...formData, priority })}
              />
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              {!isNewCategory && existingCategories.length > 0 ? (
                <select
                  value={formData.category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select a category</option>
                  {existingCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                  <option value="__new__">+ Create new category</option>
                </select>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Enter category name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  {existingCategories.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewCategory(false);
                        setFormData({ ...formData, category: '' });
                      }}
                      className="text-sm text-primary-500 hover:text-primary-600"
                    >
                      Choose from existing categories
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Deadline */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Deadline</span>
              <label className="flex items-center gap-1 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={showDeadlineTime}
                  onChange={(e) => setShowDeadlineTime(e.target.checked)}
                  className="rounded"
                />
                Include time
              </label>
            </div>
            <DateTimePicker
              label=""
              value={formData.deadline}
              onChange={(deadline) => setFormData({ ...formData, deadline })}
              placeholder="Set a deadline for this task"
              showTime={showDeadlineTime}
            />
            {/* Quick deadline presets */}
            <div className="mt-2">
              <QuickDatePresets
                onDateSelect={(deadline) => setFormData({ ...formData, deadline })}
              />
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
          >
            <span>{showAdvanced ? '▼' : '▶'}</span>
            Advanced Options
          </button>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
              {/* Start and End Date/Time */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-700">Schedule</h4>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={showTime}
                      onChange={(e) => setShowTime(e.target.checked)}
                      className="rounded"
                    />
                    Include specific times
                  </label>
                </div>
                <DateRangePicker
                  startDate={formData.startDate}
                  endDate={formData.endDate}
                  onStartDateChange={(startDate) => setFormData({ ...formData, startDate })}
                  onEndDateChange={(endDate) => setFormData({ ...formData, endDate })}
                  showTime={showTime}
                />
              </div>

              {/* Estimated Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Duration
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="0"
                    value={formData.estimatedDuration ? (formData.estimatedDuration / 60).toString() : ''}
                    onChange={(e) => handleDurationChange(e.target.value)}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <span className="text-sm text-gray-500">hours</span>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                
                {/* Current tags */}
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Add new tag */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add a tag"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    disabled={!currentTag.trim()}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Add
                  </button>
                </div>

                {/* Existing tags suggestions */}
                {existingTags.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">Existing tags:</p>
                    <div className="flex flex-wrap gap-1">
                      {existingTags
                        .filter(tag => !formData.tags.includes(tag))
                        .slice(0, 8)
                        .map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => addExistingTag(tag)}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                          >
                            + {tag}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Location */}
              <div>
                <AddressInput
                  value={formData.location}
                  onChange={(location) => setFormData({ ...formData, location })}
                  placeholder="Enter task location"
                  label="Location"
                />
              </div>

              {/* Recurring Tasks */}
              <div>
                <RecurrenceConfig
                  recurrence={formData.recurrence}
                  onChange={(recurrence) => setFormData({ ...formData, recurrence })}
                  startDate={formData.deadline}
                />
              </div>

              {/* Subtasks */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Subtasks ({formData.subtasks.length})
                  </label>
                  <button
                    type="button"
                    onClick={addSubtask}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                  >
                    <Plus className="w-4 h-4" />
                    Add Subtask
                  </button>
                </div>

                {formData.subtasks.length > 0 && (
                  <div className="space-y-3 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {formData.subtasks.map((subtask, index) => (
                      <div key={subtask.id} className="bg-white border border-gray-100 rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-2">
                            {/* Subtask Title */}
                            <input
                              type="text"
                              value={subtask.title}
                              onChange={(e) => updateSubtask(subtask.id, { title: e.target.value })}
                              placeholder={`Subtask ${index + 1} title`}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                            />

                            {/* Subtask Description */}
                            <textarea
                              value={subtask.description}
                              onChange={(e) => updateSubtask(subtask.id, { description: e.target.value })}
                              placeholder="Subtask description (optional)"
                              rows={2}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent resize-none"
                            />

                            {/* Subtask Status and Priority */}
                            <div className="flex items-center gap-2">
                              <select
                                value={subtask.status}
                                onChange={(e) => updateSubtask(subtask.id, { status: e.target.value as TaskStatus })}
                                className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="todo">Todo</option>
                                <option value="in-progress">In Progress</option>
                                <option value="done">Done</option>
                                <option value="cancelled">Cancelled</option>
                              </select>

                              <select
                                value={subtask.priority}
                                onChange={(e) => updateSubtask(subtask.id, { priority: e.target.value as TaskPriority })}
                                className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="critical">Critical</option>
                              </select>
                            </div>
                          </div>

                          {/* Remove Subtask Button */}
                          <button
                            type="button"
                            onClick={() => removeSubtask(subtask.id)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Remove subtask"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {formData.subtasks.length === 0 && (
                  <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                    <p className="text-sm">No subtasks added yet</p>
                    <p className="text-xs text-gray-400 mt-1">Click "Add Subtask" to break down this task</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.title.trim()}
              className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskForm;
