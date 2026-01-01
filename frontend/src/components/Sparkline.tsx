interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillColor?: string;
  strokeWidth?: number;
  max?: number;
  min?: number;
}

export function Sparkline({
  data,
  width = 100,
  height = 30,
  color = 'var(--color-accent)',
  fillColor,
  strokeWidth = 1.5,
  max,
  min = 0,
}: SparklineProps) {
  if (data.length < 2) {
    return (
      <svg width={width} height={height}>
        <rect width={width} height={height} fill="var(--color-widget-border)" opacity={0.3} rx={2} />
      </svg>
    );
  }

  // Calculate bounds
  const dataMax = max ?? Math.max(...data, 1);
  const dataMin = min;
  const range = dataMax - dataMin || 1;

  // Padding
  const padding = 2;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  // Generate path points
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * graphWidth;
    const y = padding + graphHeight - ((value - dataMin) / range) * graphHeight;
    return { x, y };
  });

  // Create SVG path
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Create fill path (closes the path at the bottom)
  const fillPath = fillColor
    ? `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`
    : '';

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Background */}
      <rect width={width} height={height} fill="var(--color-widget-border)" opacity={0.2} rx={2} />

      {/* Fill area */}
      {fillColor && (
        <path d={fillPath} fill={fillColor} opacity={0.3} />
      )}

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Current value dot */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={2.5}
        fill={color}
      />
    </svg>
  );
}
