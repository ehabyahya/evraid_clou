"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Coins,
  Hourglass,
  Zap,
  ArrowRight,
  ShieldAlert,
  BatteryCharging,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
} from "recharts";

export default function AiInsightsPage() {
  const forecastData = [
    { month: "Nov 26", avgSoh: 91.4, lowerBand: 90.8, upperBand: 92.0 },
    { month: "Jan 27", avgSoh: 90.3, lowerBand: 89.4, upperBand: 91.2 },
    { month: "Mar 27", avgSoh: 89.1, lowerBand: 87.9, upperBand: 90.3 },
    { month: "May 27", avgSoh: 88.0, lowerBand: 86.5, upperBand: 89.5 },
    { month: "Jul 27", avgSoh: 86.8, lowerBand: 85.0, upperBand: 88.6 },
    { month: "Sep 27", avgSoh: 85.5, lowerBand: 83.4, upperBand: 87.6 },
    { month: "Nov 27", avgSoh: 84.2, lowerBand: 81.8, upperBand: 86.6 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              AI Insights &amp; Fleet Intelligence
            </h1>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700">
              Phase 3 Preview
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Machine learning remaining useful life (RUL), residual asset valuation, and predictive maintenance
          </p>
        </div>
      </div>

      {/* Phase 3 Gate Banner matching Mockup #5 */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl flex items-center justify-between text-xs text-blue-950 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold">Phase 3 Intelligence Gate</div>
            <p className="text-blue-700 mt-0.5">
              Available once at least 12 months of field data across ≥ 1,000 packs is collected in the EVRaid telemetry lake. Previewing with physics and empirical baseline models.
            </p>
          </div>
        </div>
        <span className="font-mono text-blue-600 font-bold hidden md:inline">
          Data Gate: 68% collected
        </span>
      </div>

      {/* Row 1 — 5 KPI Cards matching Mockup #5 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Residual Value */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            <span>FLEET RESIDUAL VALUE</span>
            <Coins className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-slate-900 tracking-tight font-mono">
            EGP 4,280,000
          </div>
          <div className="mt-2 text-[11px] text-emerald-700 font-semibold">
            86% of initial capex
          </div>
        </div>

        {/* 2. Reach 80% SOH in 90 Days */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            <span>REACH 80% IN 90 DAYS</span>
            <Hourglass className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-black text-slate-900 tracking-tight font-mono">
            14 <span className="text-xs font-normal text-slate-400">packs</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Predictive retirement radar
          </div>
        </div>

        {/* 3. High Failure Risk */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            <span>HIGH FAILURE RISK, 30D</span>
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
          </div>
          <div className="text-xl font-black text-slate-900 tracking-tight font-mono text-red-600">
            3 <span className="text-xs font-normal text-slate-400">packs</span>
          </div>
          <div className="mt-2 text-[11px] text-red-600 font-semibold">
            Pre-fault signature match
          </div>
        </div>

        {/* 4. Avg Remaining Life */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            <span>AVG. REMAINING LIFE</span>
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl font-black text-slate-900 tracking-tight font-mono">
            2.4 years
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Across active fleet
          </div>
        </div>

        {/* 5. Energy Efficiency */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            <span>ENERGY EFFICIENCY</span>
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-slate-900 tracking-tight font-mono">
            91.2%
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Depot charge round-trip
          </div>
        </div>
      </div>

      {/* Row 2 — 12-Month Forecast with Confidence Interval & Residual Value */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Forecast Line Chart with Confidence Band */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Fleet SOH forecast, next 12 months
              </h3>
              <p className="text-xs text-slate-500">
                P90 / P50 / P10 confidence intervals based on weather and route load
              </p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
              Monte Carlo Model
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B", fontFamily: "JetBrains Mono" }} />
                <YAxis domain={[80, 95]} tick={{ fontSize: 11, fill: "#64748B", fontFamily: "JetBrains Mono" }} tickFormatter={(v) => `${v}%`} />
                <Tooltip />
                <Line type="monotone" dataKey="upperBand" stroke="#93C5FD" strokeDasharray="2 2" strokeWidth={1} dot={false} name="Optimistic (P90)" />
                <Line type="monotone" dataKey="avgSoh" stroke="#2563EB" strokeWidth={2.5} name="Expected (P50)" />
                <Line type="monotone" dataKey="lowerBand" stroke="#93C5FD" strokeDasharray="2 2" strokeWidth={1} dot={false} name="Pessimistic (P10)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Projected fleet average at Month 36: 84.2% SOH</span>
            <span>Error band: ±2.4%</span>
          </div>
        </div>

        {/* Residual Value & Second Life Repurposing Table matching Mockup #5 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-900">
                Residual Value &amp; Second Life Opportunities
              </h3>
              <Coins className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Repurposing valuation before recycling to maximize battery asset lifetime ROI
            </p>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Keep in Light-Mobility</div>
                  <div className="text-slate-500 text-[11px]">SOH &gt; 80% · Kick scooters and e-mopeds</div>
                </div>
                <div className="text-right font-mono">
                  <div className="font-bold text-emerald-700">1,092 packs</div>
                  <div className="text-[10px] text-slate-400">EGP 3,822,000</div>
                </div>
              </div>

              <div className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Second Life: Stationary Storage</div>
                  <div className="text-slate-500 text-[11px]">70% ≤ SOH &lt; 80% · Solar microgrids &amp; backup</div>
                </div>
                <div className="text-right font-mono">
                  <div className="font-bold text-blue-700">84 packs</div>
                  <div className="text-[10px] text-slate-400">EGP 378,000</div>
                </div>
              </div>

              <div className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Recycle (Black Mass Refining)</div>
                  <div className="text-slate-500 text-[11px]">SOH &lt; 70% or cell mechanical damage</div>
                </div>
                <div className="text-right font-mono">
                  <div className="font-bold text-slate-700">24 packs</div>
                  <div className="text-[10px] text-slate-400">EGP 80,000</div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-800 text-[11px] font-medium flex items-center justify-between">
            <span>Estimated second-life revenue uplift:</span>
            <span className="font-bold font-mono">+18.5% over pure recycling</span>
          </div>
        </div>
      </div>

      {/* Row 3 — Predictive Maintenance & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Predictive Maintenance High-Risk Table */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Predictive Maintenance (High Risk, 30 Days)
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
              3 Packs
            </span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {[
              {
                serial: "EVR-48015-0892",
                risk: "Internal micro-short signature on cell 9",
                confidence: "94%",
                action: "Schedule depot teardown before next charge",
              },
              {
                serial: "EVR-036007-0341",
                risk: "Accelerated impedance rise on cell tap 3",
                confidence: "88%",
                action: "Check busbar torque and cell weld resistance",
              },
              {
                serial: "EVR-48105-0142",
                risk: "Imbalance divergent trend during high-rate discharge",
                confidence: "82%",
                action: "Perform overnight passive top-balancing cycle",
              },
            ].map((p) => (
              <div key={p.serial} className="py-2.5 flex items-center justify-between">
                <div>
                  <Link
                    href={`/packs/${p.serial}`}
                    className="font-mono font-bold text-slate-900 hover:text-emerald-600"
                  >
                    {p.serial}
                  </Link>
                  <div className="text-slate-600 text-[11px] mt-0.5">{p.risk}</div>
                  <div className="text-[10px] text-amber-700 font-medium mt-0.5">
                    Recommended: {p.action}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-700">
                    {p.confidence} Conf.
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4 Usage Recommendations Cards matching Mockup #5 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              AI Operational Usage Recommendations
            </h3>
            <span className="text-xs text-slate-400 font-mono">Fleet-Wide Optimization</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <div className="font-bold text-slate-900">Cap Depot Charge to 95%</div>
              <p className="text-[11px] text-slate-500">
                Reduces calendar fade by 22% during Egyptian summer months.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <div className="font-bold text-slate-900">Throttle Fast Charge &gt; 42 °C</div>
              <p className="text-[11px] text-slate-500">
                Arrests irreversible cathode phase transitions on 13S NMC packs.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <div className="font-bold text-slate-900">Night Depot Balancing Schedule</div>
              <p className="text-[11px] text-slate-500">
                Run 4-hour passive bleed on 84 Grade C packs to recover 40–80 mV delta.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <div className="font-bold text-slate-900">Swap Vehicle SC-2210 Pack</div>
              <p className="text-[11px] text-slate-500">
                Rotate heavy-discharge golf carts with low-utilization security patrol packs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

