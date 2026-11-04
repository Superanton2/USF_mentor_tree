export function logEvent(level: 'info' | 'error', message: string, context: object = {}): void {
  const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...context });
  (level === 'error' ? console.error : console.log)(line);
}
