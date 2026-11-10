"use client";

import React from "react";
import { HealthGradeBar } from "@/lib/types/api";
import { useI18n } from "@/lib/i18n";

interface HealthGradeDistributionProps {
  grades: HealthGradeBar[];
}

export function HealthGradeDistribution({ grades }: HealthGradeDistributionProps) {
  const { t } = useI18n();

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-slate-900">{t("overview.health_distribution")}</h3>
        </div>
        <p className="text-xs text-slate-500 mb-6">{t("overview.health_distribution_sub")}</p>

        <div className="space-y-4">
          {grades.map((g) => (
            <div key={g.grade} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: g.color }}
                  />
                  <span>
                    Grade {g.grade} <span className="font-normal text-slate-400">· {g.label}</span>
                  </span>
                </span>
                <span className="font-mono text-slate-600 font-medium">
                  {g.count} packs <span className="text-slate-400 font-normal">({g.pct.toFixed(0)}%)</span>
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${g.pct}%`,
                    backgroundColor: g.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 mt-6 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>Updated automatically on every ingestion cycle</span>
        <span className="font-mono">Total: 1,200 packs</span>
      </div>
    </div>
  );
}

