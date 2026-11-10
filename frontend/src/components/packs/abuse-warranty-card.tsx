"use client";

import React from "react";
import { ShieldCheck, AlertCircle, AlertTriangle } from "lucide-react";

interface AbuseWarrantyCardProps {
  warrantyStatus: string;
  abuseEventsCount: number;
}

export function AbuseWarrantyCard({
  warrantyStatus,
  abuseEventsCount,
}: AbuseWarrantyCardProps) {
  // Counters matching Mockup #2
  const counters = [
    { label: "Deep discharge (< 2.50 V)", count: 0 },
    { label: "Over-current (> 100 A)", count: 2 },
    { label: "Non-approved charger profile", count: 0 },
    { label: "Over-temperature while charging (> 45 °C)", count: 1 },
  ];

  const isValid = warrantyStatus.toLowerCase() === "valid";
  const isReview = warrantyStatus.toLowerCase().includes("review");

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-0.5">
          <h3 className="text-sm font-bold text-slate-900">
            Abuse events &amp; warranty evidence
          </h3>
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Stored permanently, visible to EVRaid support
        </p>

        <div className="divide-y divide-slate-100 text-xs">
          {counters.map((c) => (
            <div key={c.label} className="py-2.5 flex items-center justify-between">
              <span className="text-slate-600">{c.label}</span>
              <span
                className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                  c.count > 0 ? "bg-amber-50 text-amber-800" : "text-slate-400"
                }`}
              >
                {c.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Advisory Status Badge */}
      <div className="pt-4 border-t border-slate-100">
        <div
          className={`flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold ${
            isValid
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60"
              : isReview
              ? "bg-amber-50 text-amber-800 border border-amber-200/60"
              : "bg-red-50 text-red-800 border border-red-200/60"
          }`}
        >
          <div className="flex items-center gap-2">
            {isValid ? (
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            )}
            <span>Warranty status: {warrantyStatus}</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-normal">
            Advisory
          </span>
        </div>
      </div>
    </div>
  );
}

