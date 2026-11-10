"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PackLiveState, PackHistoryResponse } from "@/lib/types/api";
import { api } from "@/lib/api/client";
import { PackHeaderBar } from "@/components/packs/pack-header-bar";
import { PackLiveKpiStrip } from "@/components/packs/pack-live-kpi-strip";
import { CellVoltageBarChart } from "@/components/packs/cell-voltage-bar-chart";
import { SohFadeProjectionChart } from "@/components/packs/soh-fade-projection-chart";
import { UsageProfileCard } from "@/components/packs/usage-profile-card";
import { AbuseWarrantyCard } from "@/components/packs/abuse-warranty-card";
import { PackDeviceInfoCard } from "@/components/packs/pack-device-info-card";
import { PackLocationHistoryTab } from "@/components/packs/pack-location-history-tab";
import { PackRawTelemetryTab } from "@/components/packs/pack-raw-telemetry-tab";
import { RefreshCw, AlertCircle, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default function PackDetailPage() {
  const params = useParams();
  const serial = decodeURIComponent(String(params?.serial || "EVR-48105-0142"));

  const [liveState, setLiveState] = useState<PackLiveState | null>(null);
  const [history, setHistory] = useState<PackHistoryResponse | null>(null);
  const [activeTab, setActiveTab] = useState<
    "live" | "usage" | "alerts" | "location" | "raw"
  >("live");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPackData = async () => {
    try {
      const [live, hist] = await Promise.all([
        api.getPackLiveState(serial),
        api.getPackHistory(serial),
      ]);
      setLiveState(live);
      setHistory(hist);
      setError(null);
    } catch (err: any) {
      console.error("Error loading pack details:", err);
      setError(err.message || "Failed to load pack live telemetry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackData();
    const interval = setInterval(loadPackData, 15000); // 15s refresh for live telemetry
    return () => clearInterval(interval);
  }, [serial]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
        <div className="text-sm font-semibold text-slate-700">Loading Pack Telemetry...</div>
        <p className="text-xs text-slate-400 mt-1 font-mono">{serial}</p>
      </div>
    );
  }

  if (error || !liveState) {
    return (
      <div className="py-16 text-center max-w-md mx-auto">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Pack Telemetry Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4 font-mono">{serial}</p>
        <p className="text-xs text-slate-600 bg-red-50 p-3 rounded-lg border border-red-200 mb-6">
          {error}
        </p>
        <Link
          href="/packs"
          className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm"
        >
          Return to Battery Packs List
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Identity Header matching Mockup #2 */}
      <PackHeaderBar pack={liveState} onRefresh={loadPackData} />

      {/* Sub-Navigation Tabs matching Mockup #2 */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
        {[
          { id: "live", label: "Live & health" },
          { id: "usage", label: "Usage" },
          { id: "alerts", label: `Alerts (${liveState.recent_alerts.length})` },
          { id: "location", label: "Location history" },
          { id: "raw", label: "Raw telemetry" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 -mb-px border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-emerald-600 text-emerald-700 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Live & Health (Mockup #2 Main View) */}
      {activeTab === "live" && (
        <div className="space-y-6">
          {/* Row 1 — 6 Live Metric Cards */}
          <PackLiveKpiStrip pack={liveState} />

          {/* Row 2 — Diagnostic Charts (Cell Voltages & SOH Fade Projection) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CellVoltageBarChart
              voltages={liveState.cell_voltages}
              weakestCellIndex={liveState.weakest_cell_index}
              imbalanceMv={liveState.imbalance_mv}
            />
            <SohFadeProjectionChart
              data={history?.soh_history_and_projection || []}
              monthsTo80Pct={history?.months_to_80_pct_eol || 8}
            />
          </div>

          {/* Row 3 — 3 Three-Column Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {history && <UsageProfileCard profile={history.usage_profile} />}
            <AbuseWarrantyCard
              warrantyStatus={liveState.warranty_status}
              abuseEventsCount={liveState.abuse_events_count}
            />
            <PackDeviceInfoCard
              chemistry={liveState.cell_voltages.length === 16 ? "LFP" : "NMC"}
              seriesCount={liveState.cell_voltages.length}
              ratedCapacityAh={liveState.cell_voltages.length === 16 ? 105 : 14}
            />
          </div>

          {/* Row 4 — Alert History Table matching Mockup #2 */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Alert history</h3>
                <p className="text-xs text-slate-500">
                  Recent safety faults, balance warnings, and temperature rise events
                </p>
              </div>
              <Link
                href="/alerts"
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <span>Open in alerts</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium uppercase text-[10px] tracking-wider">
                    <th className="pb-2">Raised</th>
                    <th className="pb-2">Alert</th>
                    <th className="pb-2">Severity</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Handled by</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {liveState.recent_alerts.map((a, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2.5 font-mono text-slate-500">
                        {new Date(a.timestamp_utc).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 font-semibold text-slate-900">
                        {a.message}
                        {a.sensor_label && (
                          <span className="ml-2 font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-normal">
                            {a.sensor_label}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            a.severity === "CRITICAL"
                              ? "bg-red-50 text-red-700 border border-red-200/60"
                              : "bg-amber-50 text-amber-800 border border-amber-200/60"
                          }`}
                        >
                          {a.severity}
                        </span>
                      </td>
                      <td className="py-2.5 font-medium text-slate-700">Open</td>
                      <td className="py-2.5 text-slate-500">
                        {i === 0 ? "Field technician" : "Depot desk"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Usage */}
      {activeTab === "usage" && history && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <UsageProfileCard profile={history.usage_profile} />
          <AbuseWarrantyCard
            warrantyStatus={liveState.warranty_status}
            abuseEventsCount={liveState.abuse_events_count}
          />
        </div>
      )}

      {/* Tab: Alerts */}
      {activeTab === "alerts" && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Pack Alert Log</h3>
          <div className="space-y-3">
            {liveState.recent_alerts.map((a, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between"
              >
                <div>
                  <div className="font-bold text-slate-900 text-sm">{a.message}</div>
                  <div className="text-xs text-slate-600 mt-1">{a.recommended_action}</div>
                  <div className="mt-2 text-[11px] text-slate-400 font-mono">
                    Condition: {a.condition_type} · Measured: {a.measured_value} · Threshold: {a.threshold_value}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                  {a.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Location History */}
      {activeTab === "location" && history && (
        <PackLocationHistoryTab trail={history.location_trail} />
      )}

      {/* Tab: Raw Telemetry */}
      {activeTab === "raw" && history && (
        <PackRawTelemetryTab samples={history.raw_telemetry} />
      )}
    </div>
  );
}

