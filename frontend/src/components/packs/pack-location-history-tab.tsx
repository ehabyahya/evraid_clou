"use client";

import React from "react";
import { LocationTrailPoint } from "@/lib/types/api";
import { MapPin, Navigation, Radio, Smartphone } from "lucide-react";

interface PackLocationHistoryTabProps {
  trail: LocationTrailPoint[];
}

export function PackLocationHistoryTab({ trail }: PackLocationHistoryTabProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Location Trail &amp; GNSS History</h3>
          <p className="text-xs text-slate-500">
            Transparency between continuous cellular GNSS and opportunistic BLE app fixes
          </p>
        </div>
        <span className="text-xs font-mono text-slate-500">{trail.length} recent waypoints</span>
      </div>

      {/* Simulated Map Visual Breadcrumb */}
      <div className="h-64 bg-slate-100 rounded-xl border border-slate-200 relative overflow-hidden flex items-center justify-center p-4">
        {/* Map Grid Pattern */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(#94A3B8 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        {/* Trail Polyline Representation */}
        <div className="relative z-10 w-full max-w-lg space-y-3">
          <div className="flex items-center justify-between px-4 py-2 bg-white/90 backdrop-blur rounded-lg border border-slate-200 shadow-sm text-xs font-mono">
            <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Latest Fix: 30.0618° N, 31.2201° E
            </span>
            <span className="text-slate-500">Zamalek, Cairo · Speed: 18.5 km/h</span>
          </div>

          <div className="grid grid-cols-5 gap-2 text-center text-[10px] font-mono">
            {trail.map((pt, i) => (
              <div
                key={i}
                className="bg-white/80 p-2 rounded border border-slate-200 shadow-xs"
              >
                <div className="text-slate-400">Pt #{i + 1}</div>
                <div className="font-bold text-slate-700 truncate">{pt.lat.toFixed(3)}, {pt.lng.toFixed(3)}</div>
                <div className="text-[9px] text-emerald-600 mt-0.5">{pt.source}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Waypoint Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <th className="pb-2">Timestamp</th>
              <th className="pb-2">Coordinates</th>
              <th className="pb-2">Fix Source</th>
              <th className="pb-2">Speed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {trail.map((t, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="py-2.5 text-slate-700">
                  {new Date(t.timestamp_utc).toLocaleTimeString()}
                </td>
                <td className="py-2.5 text-slate-900 font-bold">
                  {t.lat.toFixed(4)}° N, {t.lng.toFixed(4)}° E
                </td>
                <td className="py-2.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                      t.source === "MODULE_GNSS"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {t.source === "MODULE_GNSS" ? (
                      <Radio className="w-3 h-3" />
                    ) : (
                      <Smartphone className="w-3 h-3" />
                    )}
                    {t.source}
                  </span>
                </td>
                <td className="py-2.5 text-slate-600">
                  {t.speed_kmh ? `${t.speed_kmh} km/h` : "Stationary"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

