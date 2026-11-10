"use client";

import React from "react";
import Link from "next/link";
import { PackNeedingAttentionItem } from "@/lib/types/api";
import { ArrowRight, Wrench } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface PacksNeedingAttentionCardProps {
  packs: PackNeedingAttentionItem[];
}

export function PacksNeedingAttentionCard({ packs }: PacksNeedingAttentionCardProps) {
  const { t } = useI18n();

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">{t("overview.packs_attention")}</h3>
          </div>
          <Link
            href="/packs"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 group"
          >
            <span>{t("overview.all_packs")}</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform rtl:group-hover:-translate-x-0.5" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {packs.map((p) => (
            <div key={p.pack_serial} className="py-3 flex items-center justify-between text-xs">
              <div className="min-w-0 pr-2">
                <Link
                  href={`/packs/${p.pack_serial}`}
                  className="font-mono font-bold text-slate-900 hover:text-emerald-600 truncate block"
                >
                  {p.pack_serial}
                </Link>
                <div className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-2">
                  <span>{p.status}</span>
                  {p.vehicle_id && (
                    <span className="text-slate-400 font-mono">· {p.vehicle_id}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right">
                  <div className="font-mono font-bold text-slate-900">{p.soh_pct}% SOH</div>
                  <div className="text-[10px] text-slate-400 font-mono">{p.cycles} cycles</div>
                </div>

                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                    p.health_grade === "D"
                      ? "bg-red-100 text-red-700 border border-red-200"
                      : p.health_grade === "C"
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : "bg-blue-100 text-blue-700 border border-blue-200"
                  }`}
                >
                  {p.health_grade}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400">
        Ranked by lowest SOH and highest cell voltage imbalance.
      </div>
    </div>
  );
}

