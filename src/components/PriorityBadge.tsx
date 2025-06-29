import React from 'react';
import { TaskPriority, PRIORITY_CONFIG } from '../types';
import { AlertTriangle, ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface PriorityBadgeProps {
  priority: TaskPriority;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const PriorityIcon: React.FC<{ priority: TaskPriority; size: number }> = ({ priority, size }) => {
  const iconProps = { size, strokeWidth: 2 };
  
  switch (priority) {
    case 'critical':
      return <AlertTriangle {...iconProps} className="text-red-600" />;
    case 'high':
      return <ArrowUp {...iconProps} className="text-orange-600" />;
    case 'medium':
      return <Minus {...iconProps} className="text-blue-600" />;
    case 'low':
      return <ArrowDown {...iconProps} className="text-gray-600" />;
    default:
      return <Minus {...iconProps} className="text-gray-600" />;
  }
};

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ 
  priority, 
  size = 'md', 
  showIcon = true, 
  className = '' 
}) => {
  const config = PRIORITY_CONFIG[priority];
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSize = {
    sm: 12,
    md: 14,
    lg: 16
  };

  return (
    <span 
      className={`inline-flex items-center gap-1 font-medium rounded-full ${config.color} ${sizeClasses[size]} ${className}`}
      title={`${config.label} Priority`}
    >
      {showIcon && <PriorityIcon priority={priority} size={iconSize[size]} />}
      <span>{config.label}</span>
    </span>
  );
};

interface PrioritySelectorProps {
  currentPriority: TaskPriority;
  onPriorityChange: (priority: TaskPriority) => void;
  disabled?: boolean;
  className?: string;
}

export const PrioritySelector: React.FC<PrioritySelectorProps> = ({
  currentPriority,
  onPriorityChange,
  disabled = false,
  className = ''
}) => {
  const priorities: TaskPriority[] = ['low', 'medium', 'high', 'critical'];

  return (
    <select
      value={currentPriority}
      onChange={(e) => onPriorityChange(e.target.value as TaskPriority)}
      disabled={disabled}
      className={`
        block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
        focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 
        disabled:bg-gray-100 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {priorities.map(priority => {
        const config = PRIORITY_CONFIG[priority];
        return (
          <option key={priority} value={priority}>
            {config.label}
          </option>
        );
      })}
    </select>
  );
};
