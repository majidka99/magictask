import React, { useMemo } from 'react';
import { BarChart3, TrendingUp, Clock, Target, Calendar, Activity } from 'lucide-react';
import { Task, TaskPriority, TaskStatus } from '../types';
import { ProgressBar } from './ProgressBar';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval, subDays, isToday, isYesterday } from 'date-fns';

interface AnalyticsDashboardProps {
  tasks: Task[];
  isOpen: boolean;
  onClose: () => void;
}

interface ProductivityMetrics {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  averageCompletionTime: number;
  overdueTasks: number;
  tasksThisWeek: number;
  completedThisWeek: number;
  weeklyCompletionRate: number;
  priorityDistribution: Record<TaskPriority, number>;
  statusDistribution: Record<TaskStatus, number>;
  categoryProductivity: { category: string; total: number; completed: number; rate: number }[];
  dailyActivity: { date: string; completed: number; created: number }[];
  timeToComplete: { category: string; avgHours: number }[];
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ tasks, isOpen, onClose }) => {
  const metrics = useMemo((): ProductivityMetrics => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const last7Days = eachDayOfInterval({ start: subDays(now, 6), end: now });

    // Basic metrics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const overdueTasks = tasks.filter(t => 
      t.deadline && new Date(t.deadline) < now && t.status !== 'done'
    ).length;

    // Weekly metrics
    const tasksThisWeek = tasks.filter(t => 
      isWithinInterval(t.createdAt, { start: weekStart, end: weekEnd })
    ).length;
    const completedThisWeek = tasks.filter(t => 
      t.completedAt && isWithinInterval(t.completedAt, { start: weekStart, end: weekEnd })
    ).length;
    const weeklyCompletionRate = tasksThisWeek > 0 ? (completedThisWeek / tasksThisWeek) * 100 : 0;

    // Time to completion
    const completedWithTimes = tasks.filter(t => t.completedAt && t.status === 'done');
    const totalCompletionTime = completedWithTimes.reduce((acc, task) => {
      const hours = (task.completedAt!.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60);
      return acc + hours;
    }, 0);
    const averageCompletionTime = completedWithTimes.length > 0 ? totalCompletionTime / completedWithTimes.length : 0;

    // Priority distribution
    const priorityDistribution: Record<TaskPriority, number> = {
      low: 0, medium: 0, high: 0, critical: 0
    };
    tasks.forEach(task => {
      priorityDistribution[task.priority]++;
    });

    // Status distribution
    const statusDistribution: Record<TaskStatus, number> = {
      todo: 0, 'in-progress': 0, done: 0, cancelled: 0
    };
    tasks.forEach(task => {
      statusDistribution[task.status]++;
    });

    // Category productivity
    const categoryMap = new Map<string, { total: number; completed: number }>();
    tasks.forEach(task => {
      const current = categoryMap.get(task.category) || { total: 0, completed: 0 };
      categoryMap.set(task.category, {
        total: current.total + 1,
        completed: current.completed + (task.status === 'done' ? 1 : 0)
      });
    });
    
    const categoryProductivity = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      total: data.total,
      completed: data.completed,
      rate: data.total > 0 ? (data.completed / data.total) * 100 : 0
    })).sort((a, b) => b.rate - a.rate);

    // Daily activity
    const dailyActivity = last7Days.map(date => {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const completed = tasks.filter(t => 
        t.completedAt && t.completedAt >= dayStart && t.completedAt <= dayEnd
      ).length;

      const created = tasks.filter(t => 
        t.createdAt >= dayStart && t.createdAt <= dayEnd
      ).length;

      return {
        date: isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : format(date, 'EEE'),
        completed,
        created
      };
    });

    // Time to complete by category
    const categoryTimes = new Map<string, number[]>();
    completedWithTimes.forEach(task => {
      const hours = (task.completedAt!.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60);
      const times = categoryTimes.get(task.category) || [];
      times.push(hours);
      categoryTimes.set(task.category, times);
    });

    const timeToComplete = Array.from(categoryTimes.entries()).map(([category, times]) => ({
      category,
      avgHours: times.reduce((a, b) => a + b, 0) / times.length
    })).sort((a, b) => a.avgHours - b.avgHours);

    return {
      totalTasks,
      completedTasks,
      completionRate,
      averageCompletionTime,
      overdueTasks,
      tasksThisWeek,
      completedThisWeek,
      weeklyCompletionRate,
      priorityDistribution,
      statusDistribution,
      categoryProductivity,
      dailyActivity,
      timeToComplete
    };
  }, [tasks]);

  if (!isOpen) return null;

  const MetricCard: React.FC<{ 
    title: string; 
    value: string | number; 
    subtitle?: string; 
    icon: React.ReactNode; 
    color?: string;
    trend?: { value: number; isPositive: boolean };
  }> = ({ title, value, subtitle, icon, color = 'text-blue-600', trend }) => (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`${color} bg-opacity-10 p-2 rounded-lg`}>
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-600">{title}</h3>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className={`w-4 h-4 ${!trend.isPositive && 'rotate-180'}`} />
            <span className="text-sm font-medium">{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
    </div>
  );

  const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-50 rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-white border-b">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Productivity Analytics</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard
              title="Total Tasks"
              value={metrics.totalTasks}
              icon={<Target className="w-5 h-5" />}
              color="text-blue-600"
            />
            <MetricCard
              title="Completion Rate"
              value={`${metrics.completionRate.toFixed(1)}%`}
              subtitle={`${metrics.completedTasks} of ${metrics.totalTasks} tasks`}
              icon={<Activity className="w-5 h-5" />}
              color="text-green-600"
            />
            <MetricCard
              title="Overdue Tasks"
              value={metrics.overdueTasks}
              icon={<Clock className="w-5 h-5" />}
              color="text-red-600"
            />
            <MetricCard
              title="This Week"
              value={`${metrics.weeklyCompletionRate.toFixed(1)}%`}
              subtitle={`${metrics.completedThisWeek} of ${metrics.tasksThisWeek} tasks`}
              icon={<Calendar className="w-5 h-5" />}
              color="text-purple-600"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Activity */}
            <ChartCard title="Daily Activity (Last 7 Days)">
              <div className="space-y-3">
                {metrics.dailyActivity.map((day, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 w-16">{day.date}</span>
                    <div className="flex-1 mx-4">
                      <div className="flex gap-1">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${Math.max((day.completed / Math.max(...metrics.dailyActivity.map(d => d.completed))) * 100, 5)}%` }}
                          />
                        </div>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${Math.max((day.created / Math.max(...metrics.dailyActivity.map(d => d.created))) * 100, 5)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 w-20 text-right">
                      <span className="text-green-600">{day.completed}</span>
                      <span className="text-gray-400 mx-1">/</span>
                      <span className="text-blue-600">{day.created}</span>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-2 bg-green-500 rounded-full"></div>
                    <span>Completed</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-2 bg-blue-500 rounded-full"></div>
                    <span>Created</span>
                  </div>
                </div>
              </div>
            </ChartCard>

            {/* Category Productivity */}
            <ChartCard title="Category Productivity">
              <div className="space-y-3">
                {metrics.categoryProductivity.slice(0, 6).map((cat, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{cat.category}</span>
                      <span className="text-sm text-gray-600">
                        {cat.completed}/{cat.total} ({cat.rate.toFixed(1)}%)
                      </span>
                    </div>
                    <ProgressBar 
                      progress={cat.rate} 
                      size="sm" 
                      showPercentage={false}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            </ChartCard>

            {/* Status Distribution */}
            <ChartCard title="Status Distribution">
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(metrics.statusDistribution).map(([status, count]) => {
                  const colors = {
                    'todo': 'text-gray-600 bg-gray-100',
                    'in-progress': 'text-blue-600 bg-blue-100',
                    'done': 'text-green-600 bg-green-100',
                    'cancelled': 'text-red-600 bg-red-100'
                  };
                  const labels = {
                    'todo': 'To Do',
                    'in-progress': 'In Progress',
                    'done': 'Done',
                    'cancelled': 'Cancelled'
                  };
                  return (
                    <div key={status} className={`p-3 rounded-lg ${colors[status as TaskStatus]}`}>
                      <div className="text-lg font-bold">{count}</div>
                      <div className="text-sm font-medium">{labels[status as TaskStatus]}</div>
                    </div>
                  );
                })}
              </div>
            </ChartCard>

            {/* Priority Distribution */}
            <ChartCard title="Priority Distribution">
              <div className="space-y-3">
                {Object.entries(metrics.priorityDistribution).map(([priority, count]) => {
                  const colors = {
                    'low': 'bg-gray-400',
                    'medium': 'bg-blue-500',
                    'high': 'bg-orange-500',
                    'critical': 'bg-red-500'
                  };
                  const maxCount = Math.max(...Object.values(metrics.priorityDistribution));
                  const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  return (
                    <div key={priority} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 capitalize w-20">{priority}</span>
                      <div className="flex-1 mx-4 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${colors[priority as TaskPriority]}`}
                          style={{ width: `${Math.max(percentage, 5)}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </ChartCard>
          </div>

          {/* Insights */}
          <div className="mt-6 bg-white rounded-lg border p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Productivity Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Average completion time: <strong>{metrics.averageCompletionTime.toFixed(1)} hours</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Best performing category: <strong>{metrics.categoryProductivity[0]?.category || 'N/A'}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>Most common priority: <strong>{Object.entries(metrics.priorityDistribution).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}</strong></span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>This week completion rate: <strong>{metrics.weeklyCompletionRate.toFixed(1)}%</strong></span>
                </div>
                {metrics.overdueTasks > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span>⚠️ You have <strong>{metrics.overdueTasks} overdue task{metrics.overdueTasks > 1 ? 's' : ''}</strong></span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  <span>Total active categories: <strong>{metrics.categoryProductivity.length}</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
