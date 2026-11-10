"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
  LabelList,
} from "recharts";
import { AlertCircle } from "lucide-react";

interface CellVoltageBarChartProps {
  voltages: number[];
  weakestCellIndex: number;
  imbalanceMv: number;
}

export function CellVoltageBarChart({
  voltages,
  weakestCellIndex,
  imbalanceMv,
}: CellVoltageBarChartProps) {
  const chartData = voltages.map((v, i) => {
    const cellNum = i + 1; // 1-based physical cell
    const isWeakest = cellNum === weakestCellIndex;
    const isSenseFault = v < 0.5;

    let fill = "#16A34A"; // Healthy green
    if (isSenseFault) {
      fill = "#DC2626"; // Red
    } else if (isWeakest) {
      fill = "#D97706"; // Amber
    }

    return {
      cellName: `${cellNum}`,
      voltage: Number(v.toFixed(2)),
      fill,
      isWeakest,
      isSenseFault,
    };
  });

  const minV = Math.min(...voltages);
  const maxV = Math.max(...voltages);
  const avgV = voltages.reduce((a, b) => a + b, 0) / voltages.length;
  const hasSenseFault = minV < 0.5;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-full flex flex-col justify-between">
      <div>
        {/* Header with Imbalance Badge matching Mockup #2 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
          <h3 className="text-sm font-bold text-slate-900">Cell voltages</h3>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-amber-50 text-amber-800 border border-amber-200">
              Imbalance {Math.round(imbalanceMv)} mV · weakest: cell {weakestCellIndex}
            </span>
          </div>
        </div>

        {/* Subtitle */}
        <p className="text-xs text-slate-500 font-mono mb-4">
          Min {minV.toFixed(2)} V · max {maxV.toFixed(2)} V · average {avgV.toFixed(2)} V
        </p>

        {hasSenseFault && (
          <div className="mb-4 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>CRITICAL: Voltage below 0.5 V detected on cell wiring tap (SENSE_FAULT).</span>
          </div>
        )}

        {/* Responsive Bar Chart */}
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="cellName"
                tick={{ fontSize: 11, fill: "#64748B", fontFamily: "JetBrains Mono" }}
                axisLine={{ stroke: "#E2E8F0" }}
                tickLine={false}
              />
              <YAxis
                domain={[minV > 2.5 ? 2.5 : 0, maxV < 4.2 ? 4.0 : 4.5]}
                tick={{ fontSize: 11, fill: "#64748B", fontFamily: "JetBrains Mono" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `${val}V`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-lg font-mono">
                        <div className="font-bold">Cell {item.cellName}</div>
                        <div className="text-emerald-400">{item.voltage} V</div>
                        {item.isWeakest && (
                          <div className="text-amber-400 text-[10px]">Weakest cell in series</div>
                        )}
                        {item.isSenseFault && (
                          <div className="text-red-400 text-[10px]">Sense Tap Fault (&lt;0.5V)</div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="voltage" radius={[4, 4, 0, 0]}>
                <LabelList
                  dataKey="voltage"
                  position="top"
                  formatter={(val: number) => `${val.toFixed(2)}`}
                  style={{ fontSize: 9, fill: "#64748B", fontFamily: "JetBrains Mono" }}
                />
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>Mapped 1-based channels via BMS firmware profile</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600" /> Healthy
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-600" /> Weakest
          </span>
        </div>
      </div>
    </div>
  );
}

