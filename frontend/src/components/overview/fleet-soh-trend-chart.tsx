"use client";

import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { MonthlySohTrendPoint } from "@/lib/types/api";
import { useI18n } from "@/lib/i18n";

interface FleetSohTrendChartProps {
  data: MonthlySohTrendPoint[];
}

export function FleetSohTrendChart({ data }: FleetSohTrendChartProps) {
  const { t } = useI18n();
  const latest = data[data.length - 1];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-slate-900">{t("overview.soh_trend")}</h3>
          {latest && (
            <span className="text-xs font-bold font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
              Current: {latest.avg_soh}%
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Fleet-wide average degradation trajectory (measured monthly)
        </p>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#64748B" }}
                axisLine={{ stroke: "#E2E8F0" }}
                tickLine={false}
              />
              <YAxis
                domain={[85, 100]}
                tick={{ fontSize: 11, fill: "#64748B" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as MonthlySohTrendPoint;
                    return (
                      <div className="bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-lg font-mono">
                        <div>{item.month}</div>
                        <div className="text-emerald-400 font-bold">{item.avg_soh}% avg SOH</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="avg_soh"
                stroke="#16A34A"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#16A34A" }}
                activeDot={{ r: 5, fill: "#16A34A", stroke: "#FFFFFF", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>Target: SOH &gt; 80% through Month 36</span>
        <span>Fade rate: ~0.4% / month</span>
      </div>
    </div>
  );
}

