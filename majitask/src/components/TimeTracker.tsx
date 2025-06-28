import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Clock, Timer, TrendingUp, Calendar } from 'lucide-react';
import { Task } from '../types';
import { format, differenceInMinutes } from 'date-fns';

interface TimeEntry {
  id: string;
  taskId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in minutes
  description?: string;
  createdAt: Date;
}

interface TimeTrackerProps {
  task: Task;
  onTimeUpdate: (taskId: string, timeSpent: number) => void;
  className?: string;
}

interface TimeTrackingSummary {
  totalMinutes: number;
  sessionsCount: number;
  averageSession: number;
  todayMinutes: number;
  thisWeekMinutes: number;
}

export const TimeTracker: React.FC<TimeTrackerProps> = ({ task, onTimeUpdate, className = '' }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentSession, setCurrentSession] = useState<TimeEntry | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [sessionDescription, setSessionDescription] = useState('');

  // Load time entries from localStorage
  useEffect(() => {
    const savedEntries = localStorage.getItem(`time-entries-${task.id}`);
    if (savedEntries) {
      const entries = JSON.parse(savedEntries).map((entry: any) => ({
        ...entry,
        startTime: new Date(entry.startTime),
        endTime: entry.endTime ? new Date(entry.endTime) : undefined,
        createdAt: new Date(entry.createdAt)
      }));
      setTimeEntries(entries);
    }

    // Check if there's an active session
    const activeSession = localStorage.getItem(`active-session-${task.id}`);
    if (activeSession) {
      const session = JSON.parse(activeSession);
      session.startTime = new Date(session.startTime);
      setCurrentSession(session);
      setIsTracking(true);
    }
  }, [task.id]);

  // Update elapsed time every second when tracking
  useEffect(() => {
    let interval: number;
    
    if (isTracking && currentSession) {
      interval = setInterval(() => {
        const elapsed = differenceInMinutes(new Date(), currentSession.startTime);
        setElapsedTime(elapsed);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTracking, currentSession]);

  // Save time entries to localStorage
  const saveTimeEntries = (entries: TimeEntry[]) => {
    localStorage.setItem(`time-entries-${task.id}`, JSON.stringify(entries));
    setTimeEntries(entries);
  };

  const startTracking = () => {
    const session: TimeEntry = {
      id: Date.now().toString(),
      taskId: task.id,
      startTime: new Date(),
      description: sessionDescription,
      createdAt: new Date()
    };

    setCurrentSession(session);
    setIsTracking(true);
    setElapsedTime(0);
    
    // Save active session
    localStorage.setItem(`active-session-${task.id}`, JSON.stringify(session));
  };

  const stopTracking = () => {
    if (!currentSession) return;

    const endTime = new Date();
    const duration = differenceInMinutes(endTime, currentSession.startTime);
    
    const completedEntry: TimeEntry = {
      ...currentSession,
      endTime,
      duration
    };

    const updatedEntries = [...timeEntries, completedEntry];
    saveTimeEntries(updatedEntries);

    // Update task with total time
    const totalTime = updatedEntries.reduce((acc, entry) => acc + (entry.duration || 0), 0);
    onTimeUpdate(task.id, totalTime);

    // Clear active session
    localStorage.removeItem(`active-session-${task.id}`);
    
    setCurrentSession(null);
    setIsTracking(false);
    setElapsedTime(0);
    setSessionDescription('');
  };

  const pauseTracking = () => {
    if (isTracking) {
      stopTracking();
    } else if (currentSession) {
      startTracking();
    }
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatTime = (date: Date): string => {
    return format(date, 'HH:mm');
  };

  const calculateSummary = (): TimeTrackingSummary => {
    const totalMinutes = timeEntries.reduce((acc, entry) => acc + (entry.duration || 0), 0);
    const sessionsCount = timeEntries.length;
    const averageSession = sessionsCount > 0 ? totalMinutes / sessionsCount : 0;
    
    const today = new Date();
    const todayEntries = timeEntries.filter(entry => 
      entry.createdAt.toDateString() === today.toDateString()
    );
    const todayMinutes = todayEntries.reduce((acc, entry) => acc + (entry.duration || 0), 0);

    // Calculate this week (simple approximation)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const thisWeekEntries = timeEntries.filter(entry => entry.createdAt >= weekAgo);
    const thisWeekMinutes = thisWeekEntries.reduce((acc, entry) => acc + (entry.duration || 0), 0);

    return {
      totalMinutes,
      sessionsCount,
      averageSession,
      todayMinutes,
      thisWeekMinutes
    };
  };

  const summary = calculateSummary();

  return (
    <div className={`bg-white rounded-lg border p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Timer className="w-5 h-5 text-blue-600" />
          <h3 className="font-medium text-gray-900">Time Tracking</h3>
        </div>
        <div className="text-sm text-gray-500">
          Total: {formatDuration(summary.totalMinutes)}
        </div>
      </div>

      {/* Current Session */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Current Session</span>
          </div>
          <div className="text-lg font-mono font-bold text-gray-900">
            {formatDuration(elapsedTime)}
          </div>
        </div>

        {/* Session Description */}
        {!isTracking && (
          <input
            type="text"
            value={sessionDescription}
            onChange={(e) => setSessionDescription(e.target.value)}
            placeholder="What are you working on? (optional)"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
          />
        )}

        {/* Control Buttons */}
        <div className="flex gap-2">
          {!isTracking ? (
            <button
              onClick={startTracking}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Play className="w-4 h-4" />
              Start
            </button>
          ) : (
            <>
              <button
                onClick={pauseTracking}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                <Pause className="w-4 h-4" />
                Pause
              </button>
              <button
                onClick={stopTracking}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Square className="w-4 h-4" />
                Stop
              </button>
            </>
          )}
        </div>

        {/* Current Session Info */}
        {isTracking && currentSession && (
          <div className="mt-2 p-2 bg-green-50 rounded-lg">
            <div className="text-sm text-green-700">
              Started at {formatTime(currentSession.startTime)}
              {currentSession.description && (
                <span className="block text-green-600">"{currentSession.description}"</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-600">Today</span>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {formatDuration(summary.todayMinutes)}
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-600">Avg Session</span>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {formatDuration(Math.round(summary.averageSession))}
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      {timeEntries.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Sessions</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {timeEntries.slice(-5).reverse().map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-sm bg-gray-50 rounded p-2">
                <div>
                  <div className="text-gray-900">
                    {formatTime(entry.startTime)} - {entry.endTime ? formatTime(entry.endTime) : 'ongoing'}
                  </div>
                  {entry.description && (
                    <div className="text-gray-600 text-xs">"{entry.description}"</div>
                  )}
                </div>
                <div className="font-medium text-gray-900">
                  {formatDuration(entry.duration || 0)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison with Estimate */}
      {task.estimatedDuration && summary.totalMinutes > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-700">
            <div className="flex justify-between mb-1">
              <span>Progress vs Estimate</span>
              <span>{Math.round((summary.totalMinutes / task.estimatedDuration) * 100)}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min((summary.totalMinutes / task.estimatedDuration) * 100, 100)}%`
                }}
              />
            </div>
            <div className="text-xs mt-1">
              {formatDuration(summary.totalMinutes)} of {formatDuration(task.estimatedDuration)} estimated
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
