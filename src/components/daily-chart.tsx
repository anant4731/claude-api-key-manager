"use client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatUsd } from "@/lib/utils";

export function DailyChart({
  data,
}: {
  data: { date: string; cost: number; tokens: number }[];
}) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-[var(--color-fg-subtle)]">
        No activity in the last 14 days
      </div>
    );
  }
  return (
    <div className="h-48 sm:h-56 -mx-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="brand-fill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="var(--color-brand)"
                stopOpacity={0.4}
              />
              <stop
                offset="95%"
                stopColor="var(--color-brand)"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="var(--color-border)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: "var(--color-fg-subtle)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: string) => v.slice(5)}
          />
          <YAxis
            tick={{ fill: "var(--color-fg-subtle)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v: number) => formatUsd(v)}
          />
          <Tooltip
            cursor={{ stroke: "var(--color-border-strong)" }}
            contentStyle={{
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border-strong)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--color-fg-muted)" }}
            formatter={(value, name) => {
              const num = typeof value === "number" ? value : Number(value ?? 0);
              if (name === "cost") return [formatUsd(num), "Cost"];
              return [String(value ?? ""), String(name ?? "")];
            }}
          />
          <Area
            type="monotone"
            dataKey="cost"
            stroke="var(--color-brand)"
            strokeWidth={2}
            fill="url(#brand-fill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
