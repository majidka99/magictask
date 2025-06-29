import React, { useState } from 'react';
import { Search, Filter, X, Calendar, Tag, Flag, Users, Clock, Save, Trash2 } from 'lucide-react';
import { TaskFilters, TaskStatus, TaskPriority } from '../types';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';

interface AdvancedSearchProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  categories: string[];
  allTags: string[];
  isOpen: boolean;
  onClose: () => void;
}

interface SavedFilter {
  id: string;
  name: string;
  filters: TaskFilters;
  createdAt: Date;
}

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  filters,
  onFiltersChange,
  categories,
  allTags,
  isOpen,
  onClose
}) => {
  const [localFilters, setLocalFilters] = useState<TaskFilters>(filters);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => {
    const saved = localStorage.getItem('majitask-saved-filters');
    return saved ? JSON.parse(saved) : [];
  });
  const [filterName, setFilterName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  const handleApply = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleClear = () => {
    const clearedFilters: TaskFilters = {};
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const handleSaveFilter = () => {
    if (!filterName.trim()) return;
    
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName.trim(),
      filters: { ...localFilters },
      createdAt: new Date()
    };
    
    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem('majitask-saved-filters', JSON.stringify(updated));
    setFilterName('');
    setShowSaveForm(false);
  };

  const handleLoadFilter = (savedFilter: SavedFilter) => {
    setLocalFilters(savedFilter.filters);
    onFiltersChange(savedFilter.filters);
    onClose();
  };

  const handleDeleteSavedFilter = (filterId: string) => {
    const updated = savedFilters.filter(f => f.id !== filterId);
    setSavedFilters(updated);
    localStorage.setItem('majitask-saved-filters', JSON.stringify(updated));
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setLocalFilters({
      ...localFilters,
      [field]: value ? new Date(value) : undefined
    });
  };

  const toggleTag = (tag: string) => {
    const currentTags = (localFilters.search || '').split(' ').filter(t => t.startsWith('#')).map(t => t.slice(1));
    const otherTerms = (localFilters.search || '').split(' ').filter(t => !t.startsWith('#')).join(' ').trim();
    
    let newTags;
    if (currentTags.includes(tag)) {
      newTags = currentTags.filter(t => t !== tag);
    } else {
      newTags = [...currentTags, tag];
    }
    
    const tagString = newTags.map(t => `#${t}`).join(' ');
    const newSearch = [otherTerms, tagString].filter(Boolean).join(' ').trim();
    
    setLocalFilters({
      ...localFilters,
      search: newSearch || undefined
    });
  };

  const activeFiltersCount = Object.keys(localFilters).filter(key => {
    const value = localFilters[key as keyof TaskFilters];
    return value !== undefined && value !== '' && value !== false;
  }).length;

  if (!isOpen) return null;

  const StatusSelector: React.FC<{ value?: TaskStatus; onChange: (status?: TaskStatus) => void }> = ({ value, onChange }) => (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange(undefined)}
        className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
          !value ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        }`}
      >
        Any Status
      </button>
      {(['todo', 'in-progress', 'done', 'cancelled'] as TaskStatus[]).map(status => (
        <button
          key={status}
          onClick={() => onChange(status)}
          className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
            value === status ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <StatusBadge status={status} size="sm" />
        </button>
      ))}
    </div>
  );

  const PrioritySelector: React.FC<{ value?: TaskPriority; onChange: (priority?: TaskPriority) => void }> = ({ value, onChange }) => (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange(undefined)}
        className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
          !value ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        }`}
      >
        Any Priority
      </button>
      {(['low', 'medium', 'high', 'critical'] as TaskPriority[]).map(priority => (
        <button
          key={priority}
          onClick={() => onChange(priority)}
          className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
            value === priority ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <PriorityBadge priority={priority} size="sm" />
        </button>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Filter className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Advanced Search & Filters</h2>
            {activeFiltersCount > 0 && (
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {activeFiltersCount} active
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-160px)] overflow-y-auto space-y-6">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="w-4 h-4 inline mr-2" />
              Text Search
            </label>
            <input
              type="text"
              value={localFilters.search || ''}
              onChange={(e) => setLocalFilters({ ...localFilters, search: e.target.value || undefined })}
              placeholder="Search in title, description, comments... Use #tag for tags"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Tip: Use #tag to search for specific tags (e.g., #work #urgent)
            </p>
          </div>

          {/* Quick Tag Selection */}
          {allTags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Tag className="w-4 h-4 inline mr-2" />
                Quick Tag Selection
              </label>
              <div className="flex flex-wrap gap-2">
                {allTags.slice(0, 12).map(tag => {
                  const isSelected = (localFilters.search || '').includes(`#${tag}`);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                        isSelected 
                          ? 'bg-blue-600 text-white border-blue-600' 
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Flag className="w-4 h-4 inline mr-2" />
              Status
            </label>
            <StatusSelector 
              value={localFilters.status} 
              onChange={(status) => setLocalFilters({ ...localFilters, status })}
            />
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Flag className="w-4 h-4 inline mr-2" />
              Priority
            </label>
            <PrioritySelector 
              value={localFilters.priority} 
              onChange={(priority) => setLocalFilters({ ...localFilters, priority })}
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-2" />
              Category
            </label>
            <select
              value={localFilters.category || ''}
              onChange={(e) => setLocalFilters({ ...localFilters, category: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Start Date (After)
              </label>
              <input
                type="date"
                value={localFilters.startDate ? localFilters.startDate.toISOString().split('T')[0] : ''}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                End Date (Before)
              </label>
              <input
                type="date"
                value={localFilters.endDate ? localFilters.endDate.toISOString().split('T')[0] : ''}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Special Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-2" />
              Special Filters
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={localFilters.hasDeadline || false}
                  onChange={(e) => setLocalFilters({ ...localFilters, hasDeadline: e.target.checked || undefined })}
                  className="rounded mr-2"
                />
                Has Deadline
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={localFilters.overdue || false}
                  onChange={(e) => setLocalFilters({ ...localFilters, overdue: e.target.checked || undefined })}
                  className="rounded mr-2"
                />
                Overdue Tasks
              </label>
            </div>
          </div>

          {/* Saved Filters */}
          {savedFilters.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Save className="w-4 h-4 inline mr-2" />
                Saved Filters
              </label>
              <div className="space-y-2">
                {savedFilters.map(savedFilter => (
                  <div key={savedFilter.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">{savedFilter.name}</h4>
                      <p className="text-xs text-gray-500">
                        {Object.keys(savedFilter.filters).length} filters • 
                        Created {savedFilter.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleLoadFilter(savedFilter)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => handleDeleteSavedFilter(savedFilter.id)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save Current Filter */}
          {activeFiltersCount > 0 && (
            <div>
              {!showSaveForm ? (
                <button
                  onClick={() => setShowSaveForm(true)}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Save className="w-4 h-4" />
                  Save Current Filter
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    placeholder="Filter name..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleSaveFilter}
                    disabled={!filterName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setShowSaveForm(false); setFilterName(''); }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={handleClear}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Clear All
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearch;
