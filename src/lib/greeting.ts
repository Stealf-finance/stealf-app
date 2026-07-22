export function getGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  return 'Good evening';
}
