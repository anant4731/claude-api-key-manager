"use client";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

export function Sparkline({
  data,
  color = "var(--color-brand)",
  height = 32,
}: {
  data: { x: string; y: number }[];
  color?: string;
  height?: number;
}) {
  if (data.length === 0) return null;
  return (
    <div style={{ height }} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <YAxis hide domain={["auto", "auto"]} />
          <Line
            type="monotone"
            dataKey="y"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
