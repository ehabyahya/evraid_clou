"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DetailedAlert, WorkOrder } from "@/lib/types/api";
import { api } from "@/lib/api/client";
import { AlertActionDrawer } from "@/components/alerts/alert-action-drawer";
import { WorkOrdersKanban } from "@/components/alerts/work-orders-kanban";
import { AlertThresholdsModal } from "@/components/alerts/alert-thresholds-modal";
import {
  Sliders,
  Plus,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<DetailedAlert[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<DetailedAlert | null>(null);
  const [activeFilter, setActiveFilter] = useState<
    "open" | "critical" | "warning" | "info" | "assigned_to_me" | "closed"
  >("open");
  const [thresholdsModalOpen, setThresholdsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [alertsRes, woRes] = await Promise.all([
        api.getAlerts({
          status:
            activeFilter === "open"
              ? "open"
              : activeFilter === "closed"
              ? "closed"
              : undefined,
          severity:
            activeFilter === "critical"
              ? "CRITICAL"
              : activeFilter === "warning"
              ? "WARNING"
              : activeFilter === "info"
              ? "INFO"
              : undefined,
          assignee:
            activeFilter === "assigned_to_me" ? "assigned_to_me" : undefined,
        }),
        api.getWorkOrders(),
      ]);
      setAlerts(alertsRes);
      setWorkOrders(woRes);
      if (alertsRes.length > 0 && !selectedAlert) {
        setSelectedAlert(alertsRes[0]);
      }
    } catch (err) {
      console.error("Error loading alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeFilter]);

  const handleAlertUpdated = (updated: DetailedAlert) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a))
    );
    setSelectedAlert(updated);
    api.getWorkOrders().then(setWorkOrders);
  };

  const openCount = 23;
  const criticalCount = 3;
  const warningCount = 12;
  const infoCount = 8;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Alerts &amp; Work Orders
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {openCount} open alerts · {workOrders.length} work orders in progress
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setThresholdsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Alert thresholds</span>
          </button>

          <button
            onClick={() => {
              if (selectedAlert) {
                // Focus work order form
                const el = document.querySelector("textarea");
                if (el) el.focus();
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New work order</span>
          </button>
        </div>
      </div>

      {/* Filter Pills matching Mockup #3 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
        {[
          { id: "open", label: `Open · ${openCount}` },
          { id: "critical", label: `Critical · ${criticalCount}` },
          { id: "warning", label: `Warning · ${warningCount}` },
          { id: "info", label: `Info · ${infoCount}` },
          { id: "assigned_to_me", label: "Assigned to me" },
          { id: "closed", label: "Closed" },
        ].map((pill) => (
          <button
            key={pill.id}
            onClick={() => setActiveFilter(pill.id as any)}
            className={`px-3 py-1.5 rounded-full transition-colors whitespace-nowrap ${
              activeFilter === pill.id
                ? "bg-slate-900 text-white font-bold"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Split Master-Detail Workspace matching Mockup #3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2/3 width) — Alerts Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Alert</th>
                  <th className="py-3 px-4">Pack</th>
                  <th className="py-3 px-4">Raised</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assignee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                      Loading alerts...
                    </td>
                  </tr>
                ) : alerts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No alerts match the selected filter.
                    </td>
                  </tr>
                ) : (
                  alerts.map((a) => {
                    const isSelected = selectedAlert?.id === a.id;
                    return (
                      <tr
                        key={a.id}
                        onClick={() => setSelectedAlert(a)}
                        className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                          isSelected ? "bg-slate-50/90 font-medium" : ""
                        }`}
                      >
                        {/* Severity */}
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              a.severity === "CRITICAL"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : a.severity === "WARNING"
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {a.severity}
                          </span>
                        </td>

                        {/* Title & Sensor */}
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <div>{a.alert_name}</div>
                          {a.sensor_label && (
                            <div className="text-[10px] text-slate-400 font-mono font-normal">
                              {a.sensor_label}
                            </div>
                          )}
                        </td>

                        {/* Pack */}
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          <Link
                            href={`/packs/${a.pack_serial}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:text-emerald-600 hover:underline flex items-center gap-1"
                          >
                            <span>{a.pack_serial}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </Link>
                        </td>

                        {/* Raised */}
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {a.age_str}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              a.status === "New"
                                ? "bg-red-50 text-red-700"
                                : a.status === "Acknowledged"
                                ? "bg-amber-50 text-amber-800"
                                : a.status === "In progress"
                                ? "bg-blue-50 text-blue-800"
                                : "bg-emerald-50 text-emerald-800"
                            }`}
                          >
                            {a.status}
                          </span>
                        </td>

                        {/* Assignee */}
                        <td className="py-3 px-4 text-slate-600">
                          {a.assignee || (
                            <span className="text-slate-300 italic">Unassigned</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-400">
            <span>SLA: Critical alerts must be acknowledged within 60 minutes.</span>
            <span>Total: {alerts.length} visible</span>
          </div>
        </div>

        {/* Right (1/3 width) — Selected Alert Detail & Action Panel */}
        <div className="lg:col-span-1">
          <AlertActionDrawer
            alert={selectedAlert}
            onAlertUpdated={handleAlertUpdated}
          />
        </div>
      </div>

      {/* Bottom Section — Work Orders Kanban */}
      <WorkOrdersKanban workOrders={workOrders} />

      {/* Modal */}
      <AlertThresholdsModal
        isOpen={thresholdsModalOpen}
        onClose={() => setThresholdsModalOpen(false)}
      />
    </div>
  );
}

