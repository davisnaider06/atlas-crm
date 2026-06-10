"use client";

type TrendPoint = {
  label: string;
  leads: number;
  deals: number;
};

function buildPath(points: number[], width: number, height: number, padding: number) {
  if (points.length === 0) return "";
  const maxValue = Math.max(...points, 1);
  const step = (width - padding * 2) / Math.max(points.length - 1, 1);
  return points
    .map((point, index) => {
      const x = padding + step * index;
      const y = height - padding - (point / maxValue) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

export function LineChart({ trend }: { trend: TrendPoint[] }) {
  const width = 640;
  const height = 220;
  const padding = 24;
  const leadPath = buildPath(trend.map((p) => p.leads), width, height, padding);
  const dealPath = buildPath(trend.map((p) => p.deals), width, height, padding);

  return (
    <div className="chart-shell">
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" aria-hidden="true">
        {[0, 1, 2, 3].map((line) => {
          const y = padding + ((height - padding * 2) / 3) * line;
          return (
            <line
              key={line}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              className="chart-grid-line"
            />
          );
        })}
        {trend.map((point, index) => {
          const x = padding + ((width - padding * 2) / Math.max(trend.length - 1, 1)) * index;
          return (
            <line
              key={point.label}
              x1={x}
              y1={padding}
              x2={x}
              y2={height - padding}
              className="chart-grid-line subtle"
            />
          );
        })}
        <path d={leadPath} className="chart-line primary" />
        <path d={dealPath} className="chart-line secondary" />
      </svg>
      <div className="chart-axis">
        {trend.map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
    </div>
  );
}

export function BarChart({ items }: { items: { label: string; value: number }[] }) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="rockart-bars">
      {items.map((item) => (
        <div key={item.label} className="rockart-bar-group">
          <div className="rockart-bar-track">
            <div
              className="rockart-bar-fill"
              style={{ height: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
