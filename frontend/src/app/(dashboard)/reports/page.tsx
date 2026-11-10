"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { api } from "@/lib/api/client";
import {
  FileSpreadsheet,
  Download,
  Printer,
  CheckCircle2,
  Calendar,
  Building2,
  RefreshCw,
  FileText,
} from "lucide-react";

export default function ReportsPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await api.getMonthlyReport(1);
      setReport(res);
    } catch (err) {
      console.error("Error loading monthly report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleDownloadCsv = () => {
    window.open("http://127.0.0.1:8000/v1/reports/export/csv", "_blank");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Fleet Health Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Monthly compliance summaries, degradation metrics, and executive asset audit
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Download CSV Data</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {loading || !report ? (
        <div className="py-24 text-center">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <div className="text-sm font-semibold text-slate-700">Generating Monthly Report...</div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-8 max-w-4xl mx-auto print:border-none print:shadow-none print:p-0">
          {/* Document Header */}
          <div className="border-b border-slate-200 pb-6 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Image
                  src="/evraid.svg"
                  alt="evRAID"
                  width={140}
                  height={61}
                  priority
                  className="h-8 w-auto object-contain"
                />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2 border-l border-slate-200">
                  FLEET PLATFORM
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-3">
                Monthly Battery Fleet Health &amp; Warranty Report
              </h2>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Period: {report.report_period}</span>
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{report.operator} ({report.fleet})</span>
                </span>
              </div>
            </div>

            <div className="text-right text-xs font-mono text-slate-400">
              <div>Generated: {new Date(report.generated_at).toLocaleDateString()}</div>
              <div>Report ID: REP-2026-OCT-01</div>
            </div>
          </div>

          {/* Executive Summary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Fleet Size</div>
              <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                {report.fleet_size}
              </div>
              <div className="text-[11px] text-emerald-700 font-medium mt-1">
                {report.reporting_rate_pct}% daily reporting
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Average SOH</div>
              <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                {report.average_soh_pct}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {report.soh_degradation_90d} pts in 90 days
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Throughput</div>
              <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                {report.total_energy_delivered_mwh} <span className="text-xs font-normal text-slate-400">MWh</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Delivered to wheels</div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Critical Safety Alerts</div>
              <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                {report.active_critical_alerts_count}
              </div>
              <div className="text-[11px] text-amber-700 font-medium mt-1">
                {report.warranty_claims_in_review} claim in review
              </div>
            </div>
          </div>

          {/* Health Grade Distribution Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-slate-400">
              Health Grade Breakdown
            </h3>
            <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Grade</th>
                  <th className="p-3">SOH Criteria</th>
                  <th className="p-3">Packs Count</th>
                  <th className="p-3">Fleet %</th>
                  <th className="p-3">Recommended Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.grade_distribution.map((g: any) => (
                  <tr key={g.grade}>
                    <td className="p-3 font-bold font-mono text-slate-900">Grade {g.grade}</td>
                    <td className="p-3 text-slate-600">{g.label}</td>
                    <td className="p-3 font-mono font-bold">{g.count}</td>
                    <td className="p-3 font-mono">{g.pct}%</td>
                    <td className="p-3 text-slate-700">
                      {g.grade === "A"
                        ? "Active · Prime Tier"
                        : g.grade === "B"
                        ? "Active · Normal"
                        : g.grade === "C"
                        ? "Needs Balancing · Secondary"
                        : "Quarantine / Review"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* EVRaid Engineering Recommendations */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-slate-400">
              EVRaid Engineering Advisory &amp; Action Items
            </h3>
            <div className="space-y-2">
              {report.recommendations.map((rec: string, i: number) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 flex items-start gap-2.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Signoff */}
          <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
            <div>Report verified by EVRaid Physics Diagnostics Engine v0.1.0</div>
            <div className="font-mono">EVRaid Cloud · Cairo Operations</div>
          </div>
        </div>
      )}
    </div>
  );
}

