import React from 'react';
import { TaskStatus, STATUS_CONFIG } from '../types';

interface StatusBadgeProps {
  status: TaskStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  size = 'md', 
  showIcon = true, 
  className = '' 
}) => {
  const config = STATUS_CONFIG[status];
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <span 
      className={`inline-flex items-center gap-1 font-medium rounded-full ${config.color} ${sizeClasses[size]} ${className}`}
      title={config.label}
    >
      {showIcon && <span className="leading-none">{config.icon}</span>}
      <span>{config.label}</span>
    </span>
  );
};

interface StatusSelectorProps {
  currentStatus: TaskStatus;
  onStatusChange: (status: TaskStatus) => void;
  validStatuses?: TaskStatus[];
  disabled?: boolean;
  className?: string;
}

export const StatusSelector: React.FC<StatusSelectorProps> = ({
  currentStatus,
  onStatusChange,
  validStatuses,
  disabled = false,
  className = ''
}) => {
  const statusOptions = validStatuses || (['todo', 'in-progress', 'done', 'cancelled'] as TaskStatus[]);

  return (
    <select
      value={currentStatus}
      onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
      disabled={disabled}
      className={`
        block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
        focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 
        disabled:bg-gray-100 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {statusOptions.map(status => {
        const config = STATUS_CONFIG[status];
        return (
          <option key={status} value={status}>
            {config.icon} {config.label}
          </option>
        );
      })}
    </select>
  );
};
