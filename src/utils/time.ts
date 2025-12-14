/**
 * Format a timestamp as a relative time string (e.g., "3 hours ago", "1 month ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return seconds === 1 ? '1 second ago' : `${seconds} seconds ago`;
  if (minutes < 60) return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  if (days < 7) return days === 1 ? '1 day ago' : `${days} days ago`;
  if (weeks < 4) return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`;
  return years === 1 ? '1 year ago' : `${years} years ago`;
}
