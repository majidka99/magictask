import { 
  Task, 
  RecurrenceRule, 
  WeekDay
} from '../types';
import { 
  addDays, 
  addWeeks, 
  addMonths, 
  addYears, 
  getDay, 
  getDaysInMonth,
  isBefore,
  isAfter,
  setDay,
  setDate,
  isWeekend
} from 'date-fns';

export class RecurrenceService {
  /**
   * Calculate the next due date based on recurrence rule
   */
  static calculateNextDueDate(
    currentDate: Date, 
    recurrence: RecurrenceRule,
    occurrenceCount: number = 0
  ): Date | null {
    if (recurrence.endDate && isAfter(currentDate, recurrence.endDate)) {
      return null;
    }

    if (recurrence.maxOccurrences && occurrenceCount >= recurrence.maxOccurrences) {
      return null;
    }

    let nextDate = new Date(currentDate);

    switch (recurrence.type) {
      case 'daily':
        nextDate = addDays(currentDate, recurrence.interval);
        break;
        
      case 'weekly':
        nextDate = this.calculateNextWeeklyDate(currentDate, recurrence);
        break;
        
      case 'monthly':
        nextDate = this.calculateNextMonthlyDate(currentDate, recurrence);
        break;
        
      case 'yearly':
        nextDate = addYears(currentDate, recurrence.interval);
        break;
    }

    // Skip weekends if requested
    if (recurrence.skipWeekends && isWeekend(nextDate)) {
      // Move to next Monday
      const dayOfWeek = getDay(nextDate);
      const daysToAdd = dayOfWeek === 0 ? 1 : 2; // Sunday -> Monday, Saturday -> Monday
      nextDate = addDays(nextDate, daysToAdd);
    }

    return nextDate;
  }

  /**
   * Calculate next weekly recurrence date
   */
  private static calculateNextWeeklyDate(
    currentDate: Date, 
    recurrence: RecurrenceRule
  ): Date {
    if (!recurrence.daysOfWeek || recurrence.daysOfWeek.length === 0) {
      // Default to same day of week
      return addWeeks(currentDate, recurrence.interval);
    }

    const currentDayOfWeek = getDay(currentDate);
    const sortedDays = [...recurrence.daysOfWeek].sort((a, b) => a - b);
    
    // Find next day in current week
    const nextDayInWeek = sortedDays.find(day => day > currentDayOfWeek);
    
    if (nextDayInWeek !== undefined) {
      // Next occurrence is this week
      return setDay(currentDate, nextDayInWeek);
    } else {
      // Next occurrence is next interval week(s)
      const weeksToAdd = recurrence.interval;
      const nextWeekDate = addWeeks(currentDate, weeksToAdd);
      return setDay(nextWeekDate, sortedDays[0]);
    }
  }

  /**
   * Calculate next monthly recurrence date
   */
  private static calculateNextMonthlyDate(
    currentDate: Date, 
    recurrence: RecurrenceRule
  ): Date {
    if (recurrence.monthlyType === 'date' && recurrence.dayOfMonth) {
      // Same date each month (e.g., 15th of every month)
      let nextDate = addMonths(currentDate, recurrence.interval);
      const targetDay = recurrence.dayOfMonth;
      const daysInNextMonth = getDaysInMonth(nextDate);
      
      // Handle cases where target day doesn't exist (e.g., Feb 31st)
      const actualDay = Math.min(targetDay, daysInNextMonth);
      return setDate(nextDate, actualDay);
    } else if (recurrence.monthlyType === 'day' && recurrence.weekOfMonth) {
      // Same day of week in same week of month (e.g., first Monday)
      return this.calculateNextMonthlyDayDate(currentDate, recurrence);
    }
    
    // Default: same date next month
    return addMonths(currentDate, recurrence.interval);
  }

  /**
   * Calculate next monthly day-based recurrence (e.g., "second Tuesday")
   */
  private static calculateNextMonthlyDayDate(
    currentDate: Date,
    recurrence: RecurrenceRule
  ): Date {
    const targetDayOfWeek = getDay(currentDate);
    const targetWeek = recurrence.weekOfMonth!;
    
    let nextMonth = addMonths(currentDate, recurrence.interval);
    
    if (targetWeek === -1) {
      // Last occurrence of the day in the month
      return this.getLastDayOfWeekInMonth(nextMonth, targetDayOfWeek);
    } else {
      // Nth occurrence of the day in the month
      return this.getNthDayOfWeekInMonth(nextMonth, targetDayOfWeek, targetWeek);
    }
  }

  /**
   * Get the nth occurrence of a day of week in a month
   */
  private static getNthDayOfWeekInMonth(
    date: Date, 
    dayOfWeek: number, 
    weekNumber: number
  ): Date {
    const firstOfMonth = setDate(date, 1);
    const firstDayOfWeek = getDay(firstOfMonth);
    
    let targetDate = firstOfMonth;
    const daysToAdd = (dayOfWeek - firstDayOfWeek + 7) % 7 + (weekNumber - 1) * 7;
    targetDate = addDays(targetDate, daysToAdd);
    
    return targetDate;
  }

  /**
   * Get the last occurrence of a day of week in a month
   */
  private static getLastDayOfWeekInMonth(date: Date, dayOfWeek: number): Date {
    const lastOfMonth = setDate(date, getDaysInMonth(date));
    const lastDayOfWeek = getDay(lastOfMonth);
    
    const daysToSubtract = (lastDayOfWeek - dayOfWeek + 7) % 7;
    return addDays(lastOfMonth, -daysToSubtract);
  }

  /**
   * Generate a new task instance from a template
   */
  static generateTaskInstance(
    template: Task, 
    dueDate: Date, 
    instanceNumber: number
  ): Task {
    const now = new Date();
    
    return {
      ...template,
      id: this.generateInstanceId(template.id, instanceNumber),
      isTemplate: false,
      templateId: template.id,
      instanceNumber,
      recurrence: undefined, // Instances don't have recurrence rules
      deadline: dueDate,
      startDate: template.startDate ? dueDate : undefined,
      endDate: template.endDate ? dueDate : undefined,
      createdAt: now,
      updatedAt: now,
      status: 'todo',
      progress: 0,
      completed: false,
      completedAt: undefined,
      comments: [], // Start with empty comments
      timeSpent: 0, // Reset time tracking
      subtaskIds: [] // Will be handled separately if needed
    };
  }

  /**
   * Generate subtask instances for a task instance
   */
  static generateSubtaskInstances(
    templateSubtasks: Task[],
    parentInstance: Task
  ): Task[] {
    return templateSubtasks.map((subtaskTemplate, index) => {
      const subtaskInstance = this.generateTaskInstance(
        subtaskTemplate,
        parentInstance.deadline || new Date(),
        parentInstance.instanceNumber || 1
      );
      
      subtaskInstance.parentId = parentInstance.id;
      subtaskInstance.id = `${parentInstance.id}-sub-${index}`;
      
      return subtaskInstance;
    });
  }

  /**
   * Generate unique instance ID
   */
  private static generateInstanceId(templateId: string, instanceNumber: number): string {
    return `${templateId}-instance-${instanceNumber}`;
  }

  /**
   * Check if a task should generate its next instance
   */
  static shouldGenerateNextInstance(task: Task): boolean {
    if (!task.isTemplate || !task.recurrence || !task.nextDueDate) {
      return false;
    }

    const now = new Date();
    const tomorrow = addDays(now, 1);
    
    // Generate next instance if due date is tomorrow or earlier
    return isBefore(task.nextDueDate, tomorrow);
  }

  /**
   * Update template's next due date
   */
  static updateTemplateNextDueDate(
    template: Task, 
    currentInstanceCount: number
  ): Date | null {
    if (!template.recurrence || !template.nextDueDate) {
      return null;
    }

    return this.calculateNextDueDate(
      template.nextDueDate,
      template.recurrence,
      currentInstanceCount
    );
  }

  /**
   * Get human-readable recurrence description
   */
  static getRecurrenceDescription(recurrence: RecurrenceRule): string {
    const { type, interval, daysOfWeek, dayOfMonth, monthlyType, weekOfMonth } = recurrence;
    
    const intervalText = interval === 1 ? '' : `every ${interval} `;
    
    switch (type) {
      case 'daily':
        return interval === 1 ? 'Daily' : `Every ${interval} days`;
        
      case 'weekly':
        if (daysOfWeek && daysOfWeek.length > 0) {
          const dayNames = daysOfWeek.map(day => this.getDayName(day)).join(', ');
          return `${intervalText}week on ${dayNames}`;
        }
        return `${intervalText}week`;
        
      case 'monthly':
        if (monthlyType === 'date' && dayOfMonth) {
          return `${intervalText}month on the ${this.getOrdinal(dayOfMonth)}`;
        } else if (monthlyType === 'day' && weekOfMonth) {
          const weekText = weekOfMonth === -1 ? 'last' : this.getOrdinal(weekOfMonth);
          return `${intervalText}month on the ${weekText} [day]`;
        }
        return `${intervalText}month`;
        
      case 'yearly':
        return interval === 1 ? 'Yearly' : `Every ${interval} years`;
        
      default:
        return 'Custom recurrence';
    }
  }

  /**
   * Helper: Get day name
   */
  private static getDayName(dayOfWeek: WeekDay): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek];
  }

  /**
   * Helper: Get ordinal number (1st, 2nd, 3rd, etc.)
   */
  private static getOrdinal(num: number): string {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const remainder = num % 100;
    return num + (suffixes[(remainder - 20) % 10] || suffixes[remainder] || suffixes[0]);
  }

  /**
   * Validate recurrence rule
   */
  static validateRecurrenceRule(recurrence: RecurrenceRule): string[] {
    const errors: string[] = [];

    if (recurrence.interval < 1) {
      errors.push('Interval must be at least 1');
    }

    if (recurrence.type === 'weekly') {
      if (recurrence.daysOfWeek && recurrence.daysOfWeek.length === 0) {
        errors.push('At least one day must be selected for weekly recurrence');
      }
    }

    if (recurrence.type === 'monthly') {
      if (recurrence.monthlyType === 'date') {
        if (!recurrence.dayOfMonth || recurrence.dayOfMonth < 1 || recurrence.dayOfMonth > 31) {
          errors.push('Day of month must be between 1 and 31');
        }
      } else if (recurrence.monthlyType === 'day') {
        if (!recurrence.weekOfMonth || (recurrence.weekOfMonth < 1 && recurrence.weekOfMonth !== -1) || recurrence.weekOfMonth > 4) {
          errors.push('Week of month must be 1-4 or -1 for last');
        }
      }
    }

    if (recurrence.endDate && recurrence.maxOccurrences) {
      errors.push('Cannot specify both end date and max occurrences');
    }

    return errors;
  }
}
