"use client";

import React from "react";
import { OverviewKpis } from "@/lib/types/api";
import { Radio, HeartPulse, AlertTriangle, BatteryWarning, Repeat } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface OverviewKpiStripProps {
  kpis: OverviewKpis;
}

export function OverviewKpiStrip({ kpis }: OverviewKpiStripProps) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {/* 1. Packs Online */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
          <span>{t("overview.packs_online")}</span>
          <Radio className="w-3.5 h-3.5 text-emerald-600" />
        </div>
        <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
          {kpis.packs_online.online.toLocaleString()}{" "}
          <span className="text-sm font-normal text-slate-400">
            / {kpis.packs_online.total.toLocaleString()}
          </span>
        </div>
        <div className="mt-2 flex items-center">
          <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
            {kpis.packs_online.pct_reported_today}% reported today
          </span>
        </div>
      </div>

      {/* 2. Average SOH */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
          <span>{t("overview.avg_soh")}</span>
          <HeartPulse className="w-3.5 h-3.5 text-blue-600" />
        </div>
        <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
          {kpis.avg_soh.value.toFixed(1)}%
        </div>
        <div className="mt-2 text-[11px] text-slate-500 font-medium">
          <span className="text-amber-700 font-semibold">{kpis.avg_soh.delta_90d} pts</span> in 90 days
        </div>
      </div>

      {/* 3. Open Alerts */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
          <span>{t("overview.open_alerts")}</span>
          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
        </div>
        <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
          {kpis.open_alerts.total}
        </div>
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200/60">
            {kpis.open_alerts.critical} critical
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60">
            {kpis.open_alerts.warning} warning
          </span>
        </div>
      </div>

      {/* 4. Need Charging */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
          <span>{t("overview.need_charging")}</span>
          <BatteryWarning className="w-3.5 h-3.5 text-amber-500" />
        </div>
        <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
          {kpis.need_charging.count} <span className="text-sm font-normal text-slate-400">packs</span>
        </div>
        <div className="mt-2 text-[11px] text-slate-500 font-medium">
          SOC below {kpis.need_charging.threshold_pct}%
        </div>
      </div>

      {/* 5. Avg. Equivalent Cycles */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
          <span>{t("overview.avg_efc")}</span>
          <Repeat className="w-3.5 h-3.5 text-slate-500" />
        </div>
        <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
          {Math.round(kpis.avg_efc.value)}
        </div>
        <div className="mt-2 text-[11px] text-slate-500 font-medium">
          Highest pack: <span className="font-semibold text-slate-700 font-mono">{kpis.avg_efc.highest_pack}</span>
        </div>
      </div>
    </div>
  );
}

