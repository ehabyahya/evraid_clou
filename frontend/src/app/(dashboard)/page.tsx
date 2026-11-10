"use client";

import React, { useEffect, useState } from "react";
import { FleetOverviewResponse } from "@/lib/types/api";
import { api } from "@/lib/api/client";
import { OverviewKpiStrip } from "@/components/overview/overview-kpi-strip";
import { HealthGradeDistribution } from "@/components/overview/health-grade-distribution";
import { FleetSohTrendChart } from "@/components/overview/fleet-soh-trend-chart";
import { OpenCriticalAlertsCard } from "@/components/overview/open-critical-alerts-card";
import { PacksNeedingAttentionCard } from "@/components/overview/packs-needing-attention-card";
import { useI18n } from "@/lib/i18n";
import { RefreshCw } from "lucide-react";

export default function OverviewPage() {
  const { t } = useI18n();
  const [data, setData] = useState<FleetOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await api.getFleetOverview(1);
      setData(res);
    } catch (err) {
      console.error("Error loading fleet overview:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    // 30s polling per PRD p95 telemetry latency requirements
    const interval = setInterval(() => loadData(), 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
        <div className="text-sm font-semibold text-slate-700">Loading Fleet Overview...</div>
        <p className="text-xs text-slate-400 mt-1">Connecting to EVRaid Cloud Telemetry Stream</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Page Header matching Mockup #1 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {t("overview.title")}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {data.kpis.packs_online.total} packs · {t("overview.subtitle")}
          </p>
        </div>

        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="self-start sm:self-auto flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-emerald-600" : "text-slate-400"}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Row 1 — 5 KPI Summary Cards */}
      <OverviewKpiStrip kpis={data.kpis} />

      {/* Row 2 — Fleet Health Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HealthGradeDistribution grades={data.health_grades} />
        <FleetSohTrendChart data={data.soh_12m_trend} />
      </div>

      {/* Row 3 — Actionable Operational Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OpenCriticalAlertsCard alerts={data.open_critical_alerts} />
        <PacksNeedingAttentionCard packs={data.packs_needing_attention} />
      </div>
    </div>
  );
}

