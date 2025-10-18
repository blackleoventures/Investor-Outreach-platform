// Date and time utility functions

/**
 * Get current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Calculate duration in milliseconds from start time
 */
export function calculateDuration(startTime: number): number {
  return Date.now() - startTime;
}

/**
 * Format duration from milliseconds to readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
}

/**
 * Check if current time is within specified time window
 */
export function isWithinTimeWindow(
  startHour: number,
  endHour: number,
  timezone: string = 'Asia/Kolkata'
): boolean {
  const now = new Date();
  const hour = now.getHours();
  return hour >= startHour && hour < endHour;
}

/**
 * Add hours to a date
 */
export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Add minutes to a date
 */
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

/**
 * Get time elapsed since timestamp (in milliseconds)
 */
export function getTimeSince(timestamp: string): number {
  return Date.now() - new Date(timestamp).getTime();
}

/**
 * Get hours elapsed since timestamp
 */
export function getHoursSince(timestamp: string): number {
  return getTimeSince(timestamp) / (60 * 60 * 1000);
}

/**
 * Get days elapsed since timestamp
 */
export function getDaysSince(timestamp: string): number {
  return getTimeSince(timestamp) / (24 * 60 * 60 * 1000);
}

/**
 * Get minutes elapsed since timestamp
 */
export function getMinutesSince(timestamp: string): number {
  return getTimeSince(timestamp) / (60 * 1000);
}

/**
 * Check if a timestamp is older than X hours
 */
export function isOlderThanHours(timestamp: string, hours: number): boolean {
  return getHoursSince(timestamp) > hours;
}

/**
 * Check if a timestamp is older than X days
 */
export function isOlderThanDays(timestamp: string, days: number): boolean {
  return getDaysSince(timestamp) > days;
}

/**
 * Format date to readable string
 */
export function formatDate(dateString: string, locale: string = 'en-IN'): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Format datetime to readable string
 */
export function formatDateTime(dateString: string, locale: string = 'en-IN'): string {
  const date = new Date(dateString);
  return date.toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Get start of day timestamp
 */
export function getStartOfDay(date: Date = new Date()): Date {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
}

/**
 * Get end of day timestamp
 */
export function getEndOfDay(date: Date = new Date()): Date {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
}

/**
 * Check if date is today
 */
export function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}

/**
 * Check if date is weekend
 */
export function isWeekend(date: Date = new Date()): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export function getRelativeTime(timestamp: string): string {
  const ms = getTimeSince(timestamp);
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
}

/**
 * Parse ISO string to Date safely
 */
export function parseDate(dateString: string): Date | null {
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Check if timestamp is valid
 */
export function isValidTimestamp(timestamp: string): boolean {
  return parseDate(timestamp) !== null;
}

/**
 * Get timestamp for X hours from now
 */
export function getTimestampAfterHours(hours: number): string {
  return addHours(new Date(), hours).toISOString();
}

/**
 * Get timestamp for X days from now
 */
export function getTimestampAfterDays(days: number): string {
  return addDays(new Date(), days).toISOString();
}
