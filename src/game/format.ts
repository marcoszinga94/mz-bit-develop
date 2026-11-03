export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60)
    .toString()
    .padStart(2, '0');
  const secs = (total % 60).toString().padStart(2, '0');
  return `${minutes}:${secs}`;
}
