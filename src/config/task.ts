export const TASK_REMINDER_INTERVAL = parseInt(process.env.TASK_REMINDER_INTERVAL);
export const TASK_REMINDER_UNITS = process.env.TASK_REMINDER_UNITS as 'h' | 'm' | 'd';
export const TASK_REMINDER_REPEATS = parseInt(process.env.TASK_REMINDER_REPEATS);
export const TASK_REMINDER_ESCALATE_AFTER = parseInt(process.env.TASK_REMINDER_ESCALATE_AFTER);
export const TASK_REMINDER_STOP_AFTER = parseInt(process.env.TASK_REMINDER_STOP_AFTER);
