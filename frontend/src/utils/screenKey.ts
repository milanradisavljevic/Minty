export function buildScreenKey(width: number, height: number) {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const orientation = width >= height ? 'landscape' : 'portrait';
  return `${width}x${height}@dpr${dpr.toFixed(2)}-${orientation}`;
}
