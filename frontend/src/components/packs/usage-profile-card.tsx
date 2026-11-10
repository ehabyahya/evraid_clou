"use client";

import React from "react";
import { UsageProfile } from "@/lib/types/api";

interface UsageProfileCardProps {
  profile: UsageProfile;
}

export function UsageProfileCard({ profile }: UsageProfileCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-full flex flex-col justify-between">
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-0.5">Usage profile</h3>
        <p className="text-xs text-slate-500 mb-4">Depth of discharge per cycle, last 90 days</p>

        {/* DoD Bars */}
        <div className="space-y-2.5">
          {profile.dod_distribution.map((item) => (
            <div key={item.range_label} className="text-xs">
              <div className="flex items-center justify-between text-slate-600 mb-1">
                <span className="font-mono">{item.range_label}</span>
                <span className="font-mono font-medium">{item.pct.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    item.range_label === "80–100%"
                      ? "bg-amber-600"
                      : "bg-emerald-600"
                  }`}
                  style={{ width: `${item.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Metrics matching Mockup #2 */}
      <div className="pt-4 mt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-[10px] text-slate-400 font-medium">Time &gt; 95% SOC</div>
          <div className="text-sm font-bold font-mono text-slate-800 mt-0.5">
            {profile.time_above_95_pct_soc}%
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400 font-medium">Avg charge rate</div>
          <div className="text-sm font-bold font-mono text-slate-800 mt-0.5">
            {profile.avg_charge_c_rate} C
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400 font-medium">Time &gt; 45 °C</div>
          <div className="text-sm font-bold font-mono text-slate-800 mt-0.5">
            {profile.time_above_45c}%
          </div>
        </div>
      </div>
    </div>
  );
}

