import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'gray';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  size = 'md',
  showPercentage = true,
  color = 'blue',
  className = ''
}) => {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.max(0, Math.min(100, progress));
  
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    gray: 'bg-gray-500'
  };

  // Auto-select color based on progress
  const getProgressColor = () => {
    if (color !== 'blue') return color; // Use provided color if not default
    
    if (clampedProgress === 100) return 'green';
    if (clampedProgress >= 75) return 'blue';
    if (clampedProgress >= 25) return 'orange';
    return 'red';
  };

  const progressColor = getProgressColor();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex-1 bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`${sizeClasses[size]} ${colorClasses[progressColor]} transition-all duration-300 ease-out`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showPercentage && (
        <span className="text-sm font-medium text-gray-600 min-w-[3rem] text-right">
          {clampedProgress}%
        </span>
      )}
    </div>
  );
};

interface ProgressEditorProps {
  progress: number;
  onProgressChange: (progress: number) => void;
  disabled?: boolean;
  className?: string;
}

export const ProgressEditor: React.FC<ProgressEditorProps> = ({
  progress,
  onProgressChange,
  disabled = false,
  className = ''
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-700">Progress</label>
        <span className="text-sm text-gray-500">{progress}%</span>
      </div>
      
      <div className="flex items-center gap-2">
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={progress}
          onChange={(e) => onProgressChange(parseInt(e.target.value))}
          disabled={disabled}
          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
        />
        <input
          type="number"
          min="0"
          max="100"
          value={progress}
          onChange={(e) => onProgressChange(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
          disabled={disabled}
          className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
        />
      </div>
      
      <ProgressBar progress={progress} size="sm" showPercentage={false} />
    </div>
  );
};
