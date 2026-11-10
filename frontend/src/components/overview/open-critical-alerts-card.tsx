"use client";

import React from "react";
import Link from "next/link";
import { CriticalAlertOverviewItem } from "@/lib/types/api";
import { ArrowRight, AlertCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface OpenCriticalAlertsCardProps {
  alerts: CriticalAlertOverviewItem[];
}

export function OpenCriticalAlertsCard({ alerts }: OpenCriticalAlertsCardProps) {
  const { t } = useI18n();

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-bold text-slate-900">{t("overview.open_critical")}</h3>
          </div>
          <Link
            href="/alerts"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 group"
          >
            <span>{t("overview.all_alerts")}</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform rtl:group-hover:-translate-x-0.5" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {alerts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No open critical alerts in fleet.
            </div>
          ) : (
            alerts.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                <div className="min-w-0 pr-3">
                  <Link
                    href={`/packs/${item.pack_serial}`}
                    className="font-mono font-bold text-slate-900 hover:text-emerald-600 truncate block"
                  >
                    {item.pack_serial}
                  </Link>
                  <div className="text-slate-600 truncate mt-0.5 flex items-center gap-1.5">
                    <span>{item.alert_name}</span>
                    {item.sensor_label && (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                        {item.sensor_label}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-[11px] text-slate-400 font-mono">{item.age_str}</span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      item.status === "Unassigned"
                        ? "bg-red-50 text-red-700 border border-red-200/60"
                        : "bg-amber-50 text-amber-800 border border-amber-200/60"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400">
        Dispatched automatically via SMS, email and dashboard notification.
      </div>
    </div>
  );
}

