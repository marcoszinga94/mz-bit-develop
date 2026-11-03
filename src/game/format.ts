export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60)
    .toString()
    .padStart(2, '0');
  const secs = (total % 60).toString().padStart(2, '0');
  return `${minutes}:${secs}`;
}

/**
 * Formatea un valor como potencia de dos: 8 → "2**3", 9.2 → "2**3.2".
 * Se usa para mostrar estadísticas con estética binaria.
 */
export function pow2Label(value: number, digits = 1): string {
  if (!Number.isFinite(value) || value <= 0) return '2**-∞';
  const exponent = Math.log2(value);
  const rounded = Math.round(exponent);
  const text =
    Math.abs(exponent - rounded) < 0.03
      ? String(rounded)
      : exponent.toFixed(digits);
  return `2**${text}`;
}
