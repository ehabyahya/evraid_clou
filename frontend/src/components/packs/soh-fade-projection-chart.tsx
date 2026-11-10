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
  ReferenceLine,
} from "recharts";
import { SohProjectionPoint } from "@/lib/types/api";

interface SohFadeProjectionChartProps {
  data: SohProjectionPoint[];
  monthsTo80Pct?: number;
}

export function SohFadeProjectionChart({
  data,
  monthsTo80Pct = 8,
}: SohFadeProjectionChartProps) {
  // Split into measured historical points vs projected points
  const chartData = data.map((d) => ({
    month: d.month,
    measuredSoh: !d.is_projection ? d.soh_pct : null,
    projectedSoh: d.is_projection ? d.soh_pct : null,
    // Connect the boundary point so the line is continuous
    allSoh: d.soh_pct,
    isProjection: d.is_projection,
  }));

  // Ensure last measured connects to first projected
  const lastMeasuredIndex = chartData.map((d) => d.measuredSoh).lastIndexOf(
    chartData.find((d) => d.measuredSoh !== null)?.measuredSoh || 0
  );
  if (lastMeasuredIndex >= 0 && lastMeasuredIndex + 1 < chartData.length) {
    chartData[lastMeasuredIndex].projectedSoh = chartData[lastMeasuredIndex].allSoh;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-full flex flex-col justify-between">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
          <h3 className="text-sm font-bold text-slate-900">
            SOH history and remaining life
          </h3>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
            Reaches 80% in ~{monthsTo80Pct} months (est.)
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Physics-based estimate · linear fade model until AI model (Phase 3)
        </p>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 15, right: 15, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#64748B", fontFamily: "JetBrains Mono" }}
                axisLine={{ stroke: "#E2E8F0" }}
                tickLine={false}
              />
              <YAxis
                domain={[75, 102]}
                tick={{ fontSize: 11, fill: "#64748B", fontFamily: "JetBrains Mono" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-lg font-mono">
                        <div>{item.month}</div>
                        <div className="text-emerald-400 font-bold">
                          {item.allSoh}% SOH
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.isProjection ? "Projected Linear Fade" : "Measured Telemetry"}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {/* 80% EOL Threshold */}
              <ReferenceLine
                y={80}
                stroke="#DC2626"
                strokeDasharray="4 4"
                label={{
                  value: "80% End of First Life",
                  position: "insideTopLeft",
                  fill: "#DC2626",
                  fontSize: 10,
                  fontFamily: "JetBrains Mono",
                }}
              />
              {/* Measured SOH (Solid Emerald) */}
              <Line
                type="monotone"
                dataKey="measuredSoh"
                stroke="#16A34A"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#16A34A" }}
                connectNulls={false}
              />
              {/* Projected SOH (Dashed Emerald) */}
              <Line
                type="monotone"
                dataKey="projectedSoh"
                stroke="#16A34A"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 2.5, fill: "#16A34A" }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>Assumes current 0.92 cycle/day usage cadence</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-emerald-600 inline-block" /> Measured
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-emerald-600 border-b border-dashed inline-block" /> Projected
          </span>
        </div>
      </div>
    </div>
  );
}

