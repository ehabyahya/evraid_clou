"use client";

import React from "react";
import { PackLiveState } from "@/lib/types/api";
import { Zap, Battery, Activity, Flame, Repeat, Gauge } from "lucide-react";

interface PackLiveKpiStripProps {
  pack: PackLiveState;
}

export function PackLiveKpiStrip({ pack }: PackLiveKpiStripProps) {
  const isLfp = pack.cell_voltages.length === 16;
  const ratedAh = isLfp ? 105 : 14;
  const currentCapacityAh = ((pack.soh_pct / 100) * ratedAh).toFixed(1);
  const nominalVoltage = isLfp ? "51.2 V · 16S" : "36.0 V · 10S";
  const isDischarging = pack.pack_current_a < 0;
  const isHighTemp = pack.max_temperature_c > 45;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {/* 1. SOC */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
          <span>SOC</span>
          <Battery className="w-3.5 h-3.5 text-emerald-600" />
        </div>
        <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
          {pack.soc_pct.toFixed(0)}%
        </div>
        <div className="mt-2.5 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full ${
              pack.soc_pct < 20
                ? "bg-amber-500"
                : pack.soc_pct > 80
                ? "bg-emerald-600"
                : "bg-emerald-500"
            }`}
            style={{ width: `${pack.soc_pct}%` }}
          />
        </div>
      </div>

      {/* 2. SOH (Capacity) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
          <span>SOH (CAPACITY)</span>
          <Activity className="w-3.5 h-3.5 text-blue-600" />
        </div>
        <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
          {pack.soh_pct.toFixed(1)}%
        </div>
        <div className="mt-2 text-[11px] text-slate-500 font-mono">
          {currentCapacityAh} of {ratedAh} Ah
        </div>
      </div>

      {/* 3. Equivalent Cycles */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
          <span>EQUIVALENT CYCLES</span>
          <Repeat className="w-3.5 h-3.5 text-slate-500" />
        </div>
        <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
          412
        </div>
        <div className="mt-2 text-[11px] text-slate-500 font-mono">
          ≈ 2.2 MWh throughput
        </div>
      </div>

      {/* 4. Pack Voltage */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
          <span>PACK VOLTAGE</span>
          <Gauge className="w-3.5 h-3.5 text-slate-600" />
        </div>
        <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
          {pack.pack_voltage_v.toFixed(1)} V
        </div>
        <div className="mt-2 text-[11px] text-slate-500 font-mono">
          Nominal {nominalVoltage}
        </div>
      </div>

      {/* 5. Current */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
          <span>CURRENT</span>
          <Zap className="w-3.5 h-3.5 text-amber-500" />
        </div>
        <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
          {pack.pack_current_a.toFixed(1)} A
        </div>
        <div className="mt-2 text-[11px] font-semibold text-slate-600 flex items-center gap-1">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isDischarging ? "bg-amber-500" : "bg-emerald-500"
            }`}
          />
          <span>{isDischarging ? "Discharging" : pack.pack_current_a === 0 ? "Idle" : "Charging"}</span>
        </div>
      </div>

      {/* 6. Max Temperature */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
          <span>MAX TEMPERATURE</span>
          <Flame className={`w-3.5 h-3.5 ${isHighTemp ? "text-red-600" : "text-slate-400"}`} />
        </div>
        <div
          className={`text-2xl font-black tracking-tight font-mono ${
            isHighTemp ? "text-red-600" : "text-slate-900"
          }`}
        >
          {pack.max_temperature_c.toFixed(0)} °C
        </div>
        <div className="mt-2 text-[11px] text-red-600 font-medium truncate" title="+2.1 °C/min, sensor T3">
          +2.1 °C/min, sensor T3
        </div>
      </div>
    </div>
  );
}

