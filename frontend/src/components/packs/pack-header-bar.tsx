"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronRight, Download, Lock, Play, CheckCircle2, AlertTriangle, Radio, Smartphone } from "lucide-react";
import { PackLiveState } from "@/lib/types/api";
import { api } from "@/lib/api/client";

interface PackHeaderBarProps {
  pack: PackLiveState;
  onRefresh?: () => void;
}

export function PackHeaderBar({ pack, onRefresh }: PackHeaderBarProps) {
  const [runningDiag, setRunningDiag] = useState(false);
  const [diagResult, setDiagResult] = useState<string | null>(null);

  const handleRunDiagnostic = async () => {
    setRunningDiag(true);
    setDiagResult(null);
    try {
      const res = await api.runDiagnostics(pack.pack_serial);
      setDiagResult(`Diagnostic complete! Physics re-evaluated (Grade ${res.health_grade}).`);
      if (onRefresh) onRefresh();
      setTimeout(() => setDiagResult(null), 4000);
    } catch (err: any) {
      setDiagResult(`Failed to run diagnostic: ${err.message}`);
      setTimeout(() => setDiagResult(null), 4000);
    } finally {
      setRunningDiag(false);
    }
  };

  const isBle = pack.source_type === "BLE_APP" || pack.source_type === "BLE_ONLY";
  const chemistryStr = pack.cell_voltages.length === 16 ? "48 V 105 Ah · LFP" : "36 V 14 Ah · NMC";

  return (
    <div className="space-y-3">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        <Link href="/packs" className="hover:text-slate-800 transition-colors">
          Battery packs
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 rtl:rotate-180" />
        <span className="text-slate-900 font-mono font-semibold">{pack.pack_serial}</span>
      </div>

      {/* Main Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left: Serial and Metadata Pills */}
        <div>
          <h1 className="text-2xl font-black text-slate-900 font-mono tracking-tight">
            {pack.pack_serial}
          </h1>

          <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
            {/* Freshness / Connectivity */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              {isBle ? (
                <>
                  <Smartphone className="w-3 h-3 text-emerald-600" />
                  BLE sync · 2 h ago
                </>
              ) : (
                <>
                  <Radio className="w-3 h-3 text-emerald-600" />
                  Online · 12 s ago
                </>
              )}
            </span>

            {/* Health Grade */}
            <span
              className={`px-2.5 py-0.5 rounded-full font-bold uppercase ${
                pack.health_grade === "A"
                  ? "bg-emerald-100 text-emerald-800"
                  : pack.health_grade === "B"
                  ? "bg-blue-100 text-blue-800"
                  : pack.health_grade === "C"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              Grade {pack.health_grade}
            </span>

            {/* Critical Alert Pill */}
            {pack.active_critical_alerts > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-red-50 text-red-700 border border-red-200">
                <AlertTriangle className="w-3 h-3 text-red-600" />
                {pack.active_critical_alerts} critical alert
              </span>
            )}

            {/* Chemistry & Voltage */}
            <span className="px-2.5 py-0.5 rounded-full font-mono bg-slate-100 text-slate-700 border border-slate-200">
              {chemistryStr}
            </span>
          </div>
        </div>

        {/* Right Toolbar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Download Report */}
          <button
            onClick={() => window.open(`http://127.0.0.1:8000/v1/reports/monthly`, "_blank")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Download report</span>
          </button>

          {/* Lock pack · Phase 2 */}
          <button
            disabled
            title="Two-person approval and signed MQTT lock command required (Phase 2 feature)"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed opacity-75"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock pack · Phase 2</span>
          </button>

          {/* Run Diagnostic Button */}
          <button
            onClick={handleRunDiagnostic}
            disabled={runningDiag}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${runningDiag ? "animate-spin" : ""}`} />
            <span>{runningDiag ? "Evaluating..." : "Run diagnostic"}</span>
          </button>
        </div>
      </div>

      {diagResult && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{diagResult}</span>
        </div>
      )}
    </div>
  );
}

