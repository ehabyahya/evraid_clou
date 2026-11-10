"use client";

import React, { useState } from "react";
import { RawTelemetrySample } from "@/lib/types/api";
import { ChevronDown, ChevronRight, Terminal } from "lucide-react";

interface PackRawTelemetryTabProps {
  samples: RawTelemetrySample[];
}

export function PackRawTelemetryTab({ samples }: PackRawTelemetryTabProps) {
  const [expandedSeq, setExpandedSeq] = useState<number | null>(
    samples[0]?.sequence_num || null
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Raw Telemetry Inspector</h3>
          <p className="text-xs text-slate-500">
            Immutable normalized CAN/BLE/LTE-M telemetry packets with raw payload JSON
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
          <Terminal className="w-3.5 h-3.5 text-slate-500" />
          <span>TimescaleDB Canonical Stream</span>
        </div>
      </div>

      <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
        {samples.map((s) => {
          const isExpanded = expandedSeq === s.sequence_num;
          return (
            <div key={s.sequence_num} className="text-xs">
              {/* Row Header */}
              <button
                onClick={() =>
                  setExpandedSeq(isExpanded ? null : s.sequence_num)
                }
                className="w-full px-4 py-3 bg-slate-50/50 hover:bg-slate-100/60 flex items-center justify-between transition-colors text-left font-mono"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                  <span className="font-bold text-slate-800">
                    Seq #{s.sequence_num}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-600">
                    {new Date(s.timestamp_utc).toLocaleTimeString()}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-200 text-slate-700">
                    {s.source_type}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-slate-600">
                  <span>{s.voltage_v.toFixed(1)} V</span>
                  <span className={s.current_a < 0 ? "text-amber-600" : "text-emerald-600"}>
                    {s.current_a > 0 ? "+" : ""}{s.current_a.toFixed(1)} A
                  </span>
                  <span>{s.soc_pct.toFixed(0)}% SOC</span>
                  <span>{s.max_temp_c.toFixed(0)} °C</span>
                </div>
              </button>

              {/* Expanded JSON Inspector */}
              {isExpanded && (
                <div className="p-4 bg-slate-900 text-slate-200 overflow-x-auto">
                  <pre className="text-[11px] font-mono leading-relaxed">
                    {JSON.stringify(
                      {
                        sequence_num: s.sequence_num,
                        timestamp_utc: s.timestamp_utc,
                        source_type: s.source_type,
                        source_id: s.source_id,
                        electrical: {
                          pack_voltage_v: s.voltage_v,
                          pack_current_a: s.current_a,
                          soc_pct: s.soc_pct,
                          soh_pct: s.soh_pct,
                          imbalance_mv: s.imbalance_mv,
                        },
                        thermal: {
                          max_cell_temp_c: s.max_temp_c,
                        },
                        raw_payload_jsonb: s.raw_payload,
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

