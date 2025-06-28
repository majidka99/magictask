import React, { useState } from 'react';
import { RotateCcw, Calendar, X } from 'lucide-react';
import { RecurrenceRule, RecurrenceType, WeekDay } from '../types';
import { RecurrenceService } from '../utils/recurrenceService';

interface RecurrenceConfigProps {
  recurrence?: RecurrenceRule;
  onChange: (recurrence: RecurrenceRule | undefined) => void;
  startDate?: Date;
}

const WEEKDAYS: { value: WeekDay; label: string; short: string }[] = [
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
  { value: 0, label: 'Sunday', short: 'Sun' }
];

const WEEK_POSITIONS = [
  { value: 1, label: 'First' },
  { value: 2, label: 'Second' },
  { value: 3, label: 'Third' },
  { value: 4, label: 'Fourth' },
  { value: -1, label: 'Last' }
];

export const RecurrenceConfig: React.FC<RecurrenceConfigProps> = ({
  recurrence,
  onChange,
  startDate
}) => {
  const [isEnabled, setIsEnabled] = useState(!!recurrence);

  const handleToggle = (enabled: boolean) => {
    setIsEnabled(enabled);
    if (!enabled) {
      onChange(undefined);
    } else {
      // Create default recurrence rule
      const defaultRule: RecurrenceRule = {
        type: 'weekly',
        interval: 1,
        daysOfWeek: startDate ? [new Date(startDate).getDay() as WeekDay] : [1] // Default to Monday
      };
      onChange(defaultRule);
    }
  };

  const updateRecurrence = (updates: Partial<RecurrenceRule>) => {
    if (!recurrence) return;
    
    const updated: RecurrenceRule = {
      ...recurrence,
      ...updates
    };

    // Clear type-specific fields when type changes
    if (updates.type && updates.type !== recurrence.type) {
      delete updated.daysOfWeek;
      delete updated.dayOfMonth;
      delete updated.monthlyType;
      delete updated.weekOfMonth;
      
      // Set defaults for new type
      if (updates.type === 'weekly') {
        updated.daysOfWeek = [1]; // Monday
      } else if (updates.type === 'monthly') {
        updated.monthlyType = 'date';
        updated.dayOfMonth = startDate ? startDate.getDate() : 1;
      }
    }

    onChange(updated);
  };

  const handleDayToggle = (day: WeekDay) => {
    if (!recurrence?.daysOfWeek) return;
    
    const currentDays = recurrence.daysOfWeek;
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort((a, b) => a - b);
    
    // Ensure at least one day is selected
    if (newDays.length > 0) {
      updateRecurrence({ daysOfWeek: newDays });
    }
  };

  const getRecurrencePreview = (): string => {
    if (!recurrence) return '';
    
    try {
      return RecurrenceService.getRecurrenceDescription(recurrence);
    } catch {
      return 'Invalid recurrence pattern';
    }
  };

  const validateRule = (): string[] => {
    if (!recurrence) return [];
    return RecurrenceService.validateRecurrenceRule(recurrence);
  };

  const errors = validateRule();

  return (
    <div className="space-y-4">
      {/* Toggle Recurring */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => handleToggle(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Make this a recurring task</span>
          </div>
        </label>
      </div>

      {isEnabled && recurrence && (
        <div className="pl-7 space-y-4 border-l-2 border-blue-100">
          {/* Recurrence Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Repeat every
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="99"
                value={recurrence.interval}
                onChange={(e) => updateRecurrence({ interval: parseInt(e.target.value) || 1 })}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <select
                value={recurrence.type}
                onChange={(e) => updateRecurrence({ type: e.target.value as RecurrenceType })}
                className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="daily">day(s)</option>
                <option value="weekly">week(s)</option>
                <option value="monthly">month(s)</option>
                <option value="yearly">year(s)</option>
              </select>
            </div>
          </div>

          {/* Weekly Options */}
          {recurrence.type === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                On days
              </label>
              <div className="flex gap-1">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => handleDayToggle(day.value)}
                    className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                      recurrence.daysOfWeek?.includes(day.value)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {day.short}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Monthly Options */}
          {recurrence.type === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Repeat by
              </label>
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={recurrence.monthlyType === 'date'}
                    onChange={() => updateRecurrence({ 
                      monthlyType: 'date',
                      dayOfMonth: startDate ? startDate.getDate() : 1
                    })}
                    className="text-blue-600"
                  />
                  <span className="text-sm">Day of month</span>
                  {recurrence.monthlyType === 'date' && (
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={recurrence.dayOfMonth || 1}
                      onChange={(e) => updateRecurrence({ dayOfMonth: parseInt(e.target.value) || 1 })}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm ml-2"
                    />
                  )}
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={recurrence.monthlyType === 'day'}
                    onChange={() => updateRecurrence({ 
                      monthlyType: 'day',
                      weekOfMonth: 1
                    })}
                    className="text-blue-600"
                  />
                  <span className="text-sm">Day of week</span>
                  {recurrence.monthlyType === 'day' && (
                    <div className="flex items-center gap-2 ml-2">
                      <select
                        value={recurrence.weekOfMonth || 1}
                        onChange={(e) => updateRecurrence({ weekOfMonth: parseInt(e.target.value) })}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        {WEEK_POSITIONS.map(pos => (
                          <option key={pos.value} value={pos.value}>{pos.label}</option>
                        ))}
                      </select>
                      <span className="text-sm text-gray-600">
                        {startDate ? WEEKDAYS.find(d => d.value === startDate.getDay())?.label : 'day'}
                      </span>
                    </div>
                  )}
                </label>
              </div>
            </div>
          )}

          {/* Advanced Options */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="skipWeekends"
                checked={recurrence.skipWeekends || false}
                onChange={(e) => updateRecurrence({ skipWeekends: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="skipWeekends" className="text-sm text-gray-700">
                Skip weekends
              </label>
            </div>
          </div>

          {/* End Conditions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End condition
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={!recurrence.endDate && !recurrence.maxOccurrences}
                  onChange={() => updateRecurrence({ endDate: undefined, maxOccurrences: undefined })}
                  className="text-blue-600"
                />
                <span className="text-sm">Never</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={!!recurrence.endDate}
                  onChange={() => updateRecurrence({ 
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    maxOccurrences: undefined 
                  })}
                  className="text-blue-600"
                />
                <span className="text-sm">On date</span>
                {recurrence.endDate && (
                  <input
                    type="date"
                    value={recurrence.endDate.toISOString().split('T')[0]}
                    onChange={(e) => updateRecurrence({ endDate: new Date(e.target.value) })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm ml-2"
                  />
                )}
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={!!recurrence.maxOccurrences}
                  onChange={() => updateRecurrence({ 
                    maxOccurrences: 10,
                    endDate: undefined 
                  })}
                  className="text-blue-600"
                />
                <span className="text-sm">After</span>
                {recurrence.maxOccurrences && (
                  <div className="flex items-center gap-1 ml-2">
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={recurrence.maxOccurrences}
                      onChange={(e) => updateRecurrence({ maxOccurrences: parseInt(e.target.value) || 1 })}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <span className="text-sm text-gray-600">occurrences</span>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Pattern Preview</span>
            </div>
            <p className="text-sm text-blue-700">{getRecurrencePreview()}</p>
          </div>

          {/* Validation Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <X className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">Configuration Issues</span>
              </div>
              <ul className="text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecurrenceConfig;
