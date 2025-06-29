import React from 'react';
import { Calendar, Clock } from 'lucide-react';

// Enhanced Time Picker with better UX
interface TimePickerProps {
  label: string;
  value?: Date;
  onChange: (date: Date | undefined) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  includeSeconds?: boolean;
  use24Hour?: boolean;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  label,
  value,
  onChange,
  disabled = false,
  className = '',
  placeholder: _ = "Select time",
  includeSeconds = false,
  use24Hour = false
}) => {
  const formatTime = (date: Date | undefined): string => {
    if (!date) return '';
    
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    
    if (use24Hour) {
      const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      return includeSeconds ? `${timeStr}:${String(seconds).padStart(2, '0')}` : timeStr;
    } else {
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const timeStr = `${displayHours}:${String(minutes).padStart(2, '0')}`;
      return includeSeconds ? `${timeStr}:${String(seconds).padStart(2, '0')} ${ampm}` : `${timeStr} ${ampm}`;
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeStr = e.target.value;
    if (!timeStr) {
      onChange(undefined);
      return;
    }

    const now = value || new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    const newDate = new Date(now);
    newDate.setHours(hours, minutes, 0, 0);
    
    onChange(newDate);
  };

  const getInputTimeValue = (date: Date | undefined): string => {
    if (!date) return '';
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <div className={`space-y-1 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
          <Clock className="h-4 w-4 text-gray-400" />
        </div>
        
        <input
          type="time"
          value={getInputTimeValue(value)}
          onChange={handleTimeChange}
          disabled={disabled}
          className={`
            block w-full pl-10 ${value ? 'pr-10' : 'pr-3'} py-2 border border-gray-300 rounded-md shadow-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-100 disabled:cursor-not-allowed
            text-sm appearance-none
          `}
        />
        
        {value && !disabled && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 z-10"
            title="Clear time"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        )}
      </div>
      
      {value && (
        <p className="text-xs text-gray-500">
          {formatTime(value)}
        </p>
      )}
    </div>
  );
};

// Combined Date and Time Picker for better UX
interface DateTimeWithTimePickerProps {
  label: string;
  value?: Date;
  onChange: (date: Date | undefined) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  showTimeSeconds?: boolean;
  use24Hour?: boolean;
}

export const DateTimeWithTimePicker: React.FC<DateTimeWithTimePickerProps> = ({
  label,
  value,
  onChange,
  disabled = false,
  className = '',
  placeholder: _ ,
  showTimeSeconds: _2 = false,
  use24Hour: _3 = false
}) => {
  const handleDateChange = (newDate: Date | undefined) => {
    if (!newDate) {
      onChange(undefined);
      return;
    }
    
    // If we have an existing value, preserve the time
    if (value) {
      const combinedDate = new Date(newDate);
      combinedDate.setHours(value.getHours(), value.getMinutes(), value.getSeconds());
      onChange(combinedDate);
    } else {
      // Set default time to 00:00
      newDate.setHours(0, 0, 0, 0);
      onChange(newDate);
    }
  };

  const handleTimeChange = (timeDate: Date | undefined) => {
    if (!timeDate) {
      // If clearing time but have date, keep date but clear time
      if (value) {
        const dateOnly = new Date(value);
        dateOnly.setHours(0, 0, 0, 0);
        onChange(dateOnly);
      }
      return;
    }
    
    // If we have a date, update its time; otherwise create new date with today's date
    const baseDate = value ? new Date(value) : new Date();
    baseDate.setHours(timeDate.getHours(), timeDate.getMinutes(), timeDate.getSeconds());
    onChange(baseDate);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <DateTimePicker
        label="Date"
        value={value}
        onChange={handleDateChange}
        disabled={disabled}
        showTime={false}
      />
      <SimpleTimeInput
        label="Time"
        value={value}
        onChange={handleTimeChange}
        disabled={disabled}
      />
      {value && (
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          <strong>Selected:</strong> {value.toLocaleString()}
        </div>
      )}
    </div>
  );
};

interface DateTimePickerProps {
  label: string;
  value?: Date;
  onChange: (date: Date | undefined) => void;
  showTime?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  min?: string;
  max?: string;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  label,
  value,
  onChange,
  showTime = false,
  disabled = false,
  className = '',
  placeholder,
  min,
  max
}) => {
  const formatDateTimeLocal = (date: Date | undefined): string => {
    if (!date) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    if (showTime) {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } else {
      return `${year}-${month}-${day}`;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value;
    if (!dateStr) {
      onChange(undefined);
      return;
    }
    
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      onChange(undefined);
      return;
    }
    
    onChange(date);
  };

  const clearDate = () => {
    onChange(undefined);
  };

  return (
    <div className={`space-y-1 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
          {showTime ? (
            <Clock className="h-4 w-4 text-gray-400" />
          ) : (
            <Calendar className="h-4 w-4 text-gray-400" />
          )}
        </div>
        
        <input
          type={showTime ? 'datetime-local' : 'date'}
          value={formatDateTimeLocal(value)}
          onChange={handleChange}
          disabled={disabled}
          placeholder={placeholder}
          min={min}
          max={max}
          className={`
            block w-full pl-10 ${value ? 'pr-10' : 'pr-3'} py-2 border border-gray-300 rounded-md shadow-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-100 disabled:cursor-not-allowed
            text-sm appearance-none
          `}
        />
        
        {value && !disabled && (
          <button
            type="button"
            onClick={clearDate}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 z-10"
            title="Clear date"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        )}
      </div>
      
      {value && (
        <p className="text-xs text-gray-500">
          {value.toLocaleString()}
        </p>
      )}
    </div>
  );
};

interface DateRangePickerProps {
  startDate?: Date;
  endDate?: Date;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  showTime?: boolean;
  disabled?: boolean;
  className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  showTime = false,
  disabled = false,
  className = ''
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {showTime ? (
          <>
            <DateTimeWithTimePicker
              label="Start Date & Time"
              value={startDate}
              onChange={onStartDateChange}
              disabled={disabled}
            />
            
            <DateTimeWithTimePicker
              label="End Date & Time"
              value={endDate}
              onChange={onEndDateChange}
              disabled={disabled}
            />
          </>
        ) : (
          <>
            <DateTimePicker
              label="Start Date"
              value={startDate}
              onChange={onStartDateChange}
              showTime={false}
              disabled={disabled}
              max={endDate ? endDate.toISOString().split('T')[0] : undefined}
            />
            
            <DateTimePicker
              label="End Date"
              value={endDate}
              onChange={onEndDateChange}
              showTime={false}
              disabled={disabled}
              min={startDate ? startDate.toISOString().split('T')[0] : undefined}
            />
          </>
        )}
      </div>
      
      {/* Time Duration Display */}
      {startDate && endDate && (
        <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span><strong>Duration:</strong></span>
            <span>{calculateDuration(startDate, endDate)}</span>
          </div>
          {showTime && (
            <div className="mt-1 text-xs">
              From: {startDate.toLocaleString()} → To: {endDate.toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper function to calculate duration
const calculateDuration = (start: Date, end: Date): string => {
  const diffMs = end.getTime() - start.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = Math.floor(diffHours / 24);
  const remainingHours = Math.floor(diffHours % 24);
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ${remainingHours}h ${diffMinutes}m`;
  } else if (remainingHours > 0) {
    return `${remainingHours}h ${diffMinutes}m`;
  } else {
    return `${diffMinutes}m`;
  }
};

// Quick date preset buttons
interface QuickDatePresetsProps {
  onDateSelect: (date: Date) => void;
  className?: string;
}

export const QuickDatePresets: React.FC<QuickDatePresetsProps> = ({
  onDateSelect,
  className = ''
}) => {
  const presets = [
    { label: 'Today', getValue: () => new Date() },
    { label: 'Tomorrow', getValue: () => { const d = new Date(); d.setDate(d.getDate() + 1); return d; } },
    { label: 'Next Week', getValue: () => { const d = new Date(); d.setDate(d.getDate() + 7); return d; } },
    { label: 'Next Month', getValue: () => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d; } }
  ];

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {presets.map(preset => (
        <button
          key={preset.label}
          type="button"
          onClick={() => onDateSelect(preset.getValue())}
          className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
};

// Simple Time Input without overlapping elements
interface SimpleTimeInputProps {
  label: string;
  value?: Date;
  onChange: (date: Date | undefined) => void;
  disabled?: boolean;
  className?: string;
}

export const SimpleTimeInput: React.FC<SimpleTimeInputProps> = ({
  label,
  value,
  onChange,
  disabled = false,
  className = ''
}) => {
  // Helper to get hour and minute
  const getHourMinute = (date: Date | undefined) => {
    if (!date) return { hour: '', minute: '' };
    return {
      hour: String(date.getHours()).padStart(2, '0'),
      minute: String(date.getMinutes()).padStart(2, '0'),
    };
  };
  const { hour, minute } = getHourMinute(value);

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newHour = parseInt(e.target.value, 10);
    const newDate = value ? new Date(value) : new Date();
    newDate.setHours(newHour, value ? newDate.getMinutes() : 0, 0, 0);
    onChange(newDate);
  };
  const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMinute = parseInt(e.target.value, 10);
    const newDate = value ? new Date(value) : new Date();
    newDate.setMinutes(newMinute, 0, 0);
    onChange(newDate);
  };
  const handleClear = () => {
    onChange(undefined);
  };
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {value && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="mb-1 text-xs text-gray-500 hover:text-gray-700"
        >
          Clear
        </button>
      )}
      <div className="flex gap-2 items-center">
        <select
          value={hour}
          onChange={handleHourChange}
          disabled={disabled}
          className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
        >
          <option value="">HH</option>
          {[...Array(24).keys()].map(h => (
            <option key={h} value={String(h).padStart(2, '0')}>{String(h).padStart(2, '0')}</option>
          ))}
        </select>
        <span>:</span>
        <select
          value={minute}
          onChange={handleMinuteChange}
          disabled={disabled}
          className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
        >
          <option value="">MM</option>
          {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => (
            <option key={m} value={String(m).padStart(2, '0')}>{String(m).padStart(2, '0')}</option>
          ))}
        </select>
      </div>
      {value && (
        <p className="text-xs text-gray-500">
          Selected: {value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
    </div>
  );
};
