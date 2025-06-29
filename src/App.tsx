import { useState } from 'react';
import { Plus, Search, CheckSquare, Settings, BarChart3, Filter, Users, Database, Book } from 'lucide-react';
import { useTasks } from './hooks/useTasks';
import TaskList from './components/TaskList';
import TaskForm from './components/TaskForm';
import TaskDetail from './components/TaskDetail';
import { EmailSettings } from './components/EmailSettings';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import AdvancedSearch from './components/AdvancedSearch';
import { BulkOperations } from './components/BulkOperations';
import DataManagement from './components/DataManagement';
import DocumentationViewer from './components/DocumentationViewer';
import { Task } from './types';

function App() {
  const {
    tasks,
    allTasks,
    categories,
    allTags,
    filters,
    setFilters,
    addTaskWithSubtasks,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    addTaskComment,
    addSubtask,
    removeSubtask,
    getSubtasks,
    exportToJSON,
    importFromJSON,
    getBackupInfo
  } = useTasks();

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEmailSettings, setShowEmailSettings] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showDataManagement, setShowDataManagement] = useState(false);
  const [showDocumentation, setShowDocumentation] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [showBulkMode, setShowBulkMode] = useState(false);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setFilters({ ...filters, search: term });
  };

  const handleFilterCategory = (category: string) => {
    setFilters({ 
      ...filters, 
      category: category === 'all' ? undefined : category 
    });
  };

  const handleFilterCompleted = (completed: boolean | undefined) => {
    setFilters({ ...filters, completed });
  };

  // Bulk operations handlers
  const handleToggleBulkMode = () => {
    setShowBulkMode(!showBulkMode);
    setSelectedTaskIds([]);
  };

  const handleTaskSelect = (taskId: string) => {
    if (selectedTaskIds.includes(taskId)) {
      setSelectedTaskIds(selectedTaskIds.filter(id => id !== taskId));
    } else {
      setSelectedTaskIds([...selectedTaskIds, taskId]);
    }
  };

  const handleBulkUpdate = (taskIds: string[], updates: Partial<Task>) => {
    taskIds.forEach(taskId => {
      updateTask(taskId, updates);
    });
  };

  const handleBulkDelete = (taskIds: string[]) => {
    taskIds.forEach(taskId => {
      deleteTask(taskId);
    });
  };

  // Time tracking handler
  const handleTimeUpdate = (taskId: string, timeSpent: number) => {
    updateTask(taskId, { 
      // Store time spent in task metadata or custom field
      timeSpent: timeSpent 
    });
  };

  // Data management handlers
  const handleDataImport = async (file: File) => {
    const importedTasks = await importFromJSON(file);
    console.log(`✅ Successfully imported ${importedTasks.length} tasks`);
  };

  const completedCount = tasks.filter(task => task.completed).length;
  const pendingCount = tasks.filter(task => !task.completed).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckSquare className="w-8 h-8 text-primary-500" />
              <h1 className="text-2xl font-bold text-gray-900">MajiTask</h1>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAnalytics(true)}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                title="Analytics Dashboard"
              >
                <BarChart3 className="w-5 h-5" />
              </button>
              <button
                onClick={handleToggleBulkMode}
                className={`p-2 rounded-lg ${
                  showBulkMode 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
                title={showBulkMode ? "Exit Bulk Mode" : "Bulk Operations"}
              >
                <Users className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowEmailSettings(true)}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                title="Email Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowDataManagement(true)}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                title="Data Management"
              >
                <Database className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowDocumentation(true)}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                title="Documentation"
              >
                <Book className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowTaskForm(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Task</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="card">
            <h3 className="text-sm font-medium text-gray-600">Pending Tasks</h3>
            <p className="text-2xl font-bold text-primary-500">{pendingCount}</p>
          </div>
          <div className="card">
            <h3 className="text-sm font-medium text-gray-600">Completed</h3>
            <p className="text-2xl font-bold text-green-500">{completedCount}</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="card mb-6">
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Advanced Search Button */}
            <button
              onClick={() => setShowAdvancedSearch(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              title="Advanced Search & Filters"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Advanced</span>
            </button>

            {/* Category Filter */}
            <select
              value={filters.category || 'all'}
              onChange={(e) => handleFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            {/* Completion Filter */}
            <select
              value={filters.completed === undefined ? 'all' : filters.completed ? 'completed' : 'pending'}
              onChange={(e) => {
                const value = e.target.value;
                handleFilterCompleted(
                  value === 'all' ? undefined : value === 'completed'
                );
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Tasks</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Bulk Operations */}
        {showBulkMode && (
          <BulkOperations
            tasks={tasks}
            selectedTaskIds={selectedTaskIds}
            onSelectionChange={setSelectedTaskIds}
            onBulkUpdate={handleBulkUpdate}
            onBulkDelete={handleBulkDelete}
            categories={categories}
            allTags={allTags}
          />
        )}

        {/* Task List */}
        <TaskList
          tasks={tasks}
          onTaskClick={setSelectedTask}
          onToggleComplete={toggleTaskCompletion}
          onDeleteTask={deleteTask}
          getSubtasks={getSubtasks}
          selectedTaskIds={selectedTaskIds}
          onTaskSelect={handleTaskSelect}
          showBulkSelection={showBulkMode}
        />

        {/* Empty State */}
        {tasks.length === 0 && (
          <div className="text-center py-12">
            <CheckSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
            <p className="text-gray-600 mb-4">
              {Object.keys(filters).length > 0 
                ? "Try adjusting your filters or search term"
                : "Get started by creating your first task"
              }
            </p>
            {Object.keys(filters).length === 0 && (
              <button
                onClick={() => setShowTaskForm(true)}
                className="btn-primary"
              >
                Create Your First Task
              </button>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      {showTaskForm && (
        <TaskForm
          onSubmit={(data) => {
            // Create the task with subtasks in a single operation
            addTaskWithSubtasks(
              data.title, 
              data.description, 
              data.category, 
              data.deadline,
              data.priority,
              data.startDate,
              data.endDate,
              data.location,
              data.subtasks,
              data.recurrence
            );
            
            setShowTaskForm(false);
          }}
          onClose={() => setShowTaskForm(false)}
          existingCategories={categories}
          existingTags={allTags}
        />
      )}

      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={updateTask}
          onAddComment={addTaskComment}
          onDelete={deleteTask}
          onToggleComplete={toggleTaskCompletion}
          subtasks={getSubtasks(selectedTask.id)}
          onAddSubtask={addSubtask}
          onUpdateSubtask={updateTask}
          onDeleteSubtask={removeSubtask}
          onToggleSubtask={toggleTaskCompletion}
          onTimeUpdate={handleTimeUpdate}
        />
      )}

      {/* Email Settings Modal */}
      <EmailSettings
        isOpen={showEmailSettings}
        onClose={() => setShowEmailSettings(false)}
      />

      {/* Analytics Dashboard Modal */}
      <AnalyticsDashboard
        tasks={allTasks}
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
      />

      {/* Advanced Search Modal */}
      <AdvancedSearch
        filters={filters}
        onFiltersChange={setFilters}
        categories={categories}
        allTags={allTags}
        isOpen={showAdvancedSearch}
        onClose={() => setShowAdvancedSearch(false)}
      />

      {/* Data Management Modal */}
      {showDataManagement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Data Management</h2>
              <button
                onClick={() => setShowDataManagement(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <DataManagement
                onExport={exportToJSON}
                onImport={handleDataImport}
                backupInfo={getBackupInfo()}
              />
            </div>
          </div>
        </div>
      )}

      {/* Documentation Viewer Modal */}
      <DocumentationViewer
        isOpen={showDocumentation}
        onClose={() => setShowDocumentation(false)}
      />
    </div>
  );
}

export default App;
