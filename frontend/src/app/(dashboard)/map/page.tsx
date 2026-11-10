"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PackListItem } from "@/lib/types/api";
import { api } from "@/lib/api/client";
import {
  MapPin,
  Radio,
  Smartphone,
  Battery,
  AlertTriangle,
  ArrowRight,
  Filter,
  RefreshCw,
  Navigation,
} from "lucide-react";

export default function FleetMapPage() {
  const [packs, setPacks] = useState<PackListItem[]>([]);
  const [selectedPack, setSelectedPack] = useState<PackListItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [gradeFilter, setGradeFilter] = useState("");
  const [connFilter, setConnFilter] = useState("");
  const [chargeFilter, setChargeFilter] = useState("");
  const [alertFilter, setAlertFilter] = useState("");

  const loadPacks = async () => {
    setLoading(true);
    try {
      const res = await api.getPacks({ page_size: 100 });
      setPacks(res.items);
      if (res.items.length > 0 && !selectedPack) {
        setSelectedPack(res.items[0]);
      }
    } catch (err) {
      console.error("Error loading packs for map:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPacks();
  }, []);

  const filteredPacks = packs.filter((p) => {
    if (gradeFilter && p.health_grade !== gradeFilter) return false;
    if (connFilter && p.connectivity_mode !== connFilter) return false;
    if (chargeFilter === "need_charging" && p.soc_pct >= 20) return false;
    if (chargeFilter === "charging" && p.pack_current_a <= 0) return false;
    if (chargeFilter === "discharging" && p.pack_current_a >= 0) return false;
    if (alertFilter === "critical" && p.active_critical_alerts === 0) return false;
    if (alertFilter === "any" && p.active_critical_alerts === 0 && p.active_warning_alerts === 0) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Fleet Map
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time geospatial distribution of Cairo fleet packs · Location source &amp; accuracy transparency
          </p>
        </div>

        <button
          onClick={loadPacks}
          className="self-start sm:self-auto flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-600" : "text-slate-400"}`} />
          <span>Refresh Pins</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-center gap-2.5 flex-wrap text-xs">
        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>Filter:</span>
        </span>

        {/* Grade */}
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Health Grades</option>
          <option value="A">Grade A (≥90%)</option>
          <option value="B">Grade B (80–90%)</option>
          <option value="C">Grade C (70–80%)</option>
          <option value="D">Grade D (&lt;70%)</option>
        </select>

        {/* Connectivity */}
        <select
          value={connFilter}
          onChange={(e) => setConnFilter(e.target.value)}
          className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Connectivity</option>
          <option value="LTEM_ACTIVE">LTE-M Continuous GNSS</option>
          <option value="BLE_ONLY">BLE App Phone GPS</option>
        </select>

        {/* Charge State */}
        <select
          value={chargeFilter}
          onChange={(e) => setChargeFilter(e.target.value)}
          className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Charge States</option>
          <option value="need_charging">Need Charging (&lt; 20% SOC)</option>
          <option value="charging">Charging (Current &gt; 0)</option>
          <option value="discharging">Discharging in use</option>
        </select>

        {/* Alerts */}
        <select
          value={alertFilter}
          onChange={(e) => setAlertFilter(e.target.value)}
          className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Alert States</option>
          <option value="critical">Critical Alerts Only</option>
          <option value="any">Any Warning or Critical</option>
        </select>

        {(gradeFilter || connFilter || chargeFilter || alertFilter) && (
          <button
            onClick={() => {
              setGradeFilter("");
              setConnFilter("");
              setChargeFilter("");
              setAlertFilter("");
            }}
            className="text-emerald-700 font-bold hover:underline px-2 py-1"
          >
            Clear filters
          </button>
        )}

        <span className="ml-auto font-mono text-slate-400">
          Showing {filteredPacks.length} of {packs.length} packs
        </span>
      </div>

      {/* Main Map Workspace Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Interactive Simulated Map Canvas (3/4 width) */}
        <div className="lg:col-span-3 bg-slate-900 rounded-2xl border border-slate-700 h-[620px] relative overflow-hidden flex flex-col justify-between p-6 shadow-xl">
          {/* Cairo Map Dark Vector Canvas Background */}
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                "radial-gradient(#38BDF8 1px, transparent 1px), radial-gradient(#10B981 1px, transparent 1px)",
              backgroundSize: "32px 32px, 64px 64px",
            }}
          />

          {/* Simulated Nile River and Ring Road SVG Overlay */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none opacity-30 stroke-emerald-500/40 fill-none"
            viewBox="0 0 1000 600"
          >
            {/* Nile Curve */}
            <path
              d="M 520 600 Q 510 400 480 300 T 490 0"
              strokeWidth="14"
              stroke="#0284C7"
              opacity="0.4"
            />
            {/* Ring Road Oval */}
            <ellipse
              cx="500"
              cy="300"
              rx="380"
              ry="240"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
          </svg>

          {/* Map Header Overlay */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="bg-slate-800/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 font-mono shadow-md flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>CAIRO METROPOLITAN AREA (30.0444° N, 31.2357° E)</span>
            </div>

            <div className="bg-slate-800/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-[11px] text-slate-300 flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Grade A
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Grade B
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Grade C
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" /> Grade D / Alert
              </span>
            </div>
          </div>

          {/* Interactive Pack Pins Scattered on Canvas */}
          <div className="relative z-10 flex-1 my-4 relative">
            {filteredPacks.map((pack, idx) => {
              // Deterministic positions around Cairo
              const offsets = [
                { top: "35%", left: "46%", label: "Zamalek" },
                { top: "68%", left: "54%", label: "Maadi" },
                { top: "42%", left: "78%", label: "New Cairo" },
                { top: "48%", left: "42%", label: "Dokki" },
                { top: "58%", left: "18%", label: "6th October" },
                { top: "25%", left: "44%", label: "Heliopolis" },
              ];
              const pos = offsets[idx % offsets.length];
              const isSelected = selectedPack?.pack_serial === pack.pack_serial;

              return (
                <button
                  key={pack.pack_serial}
                  onClick={() => setSelectedPack(pack)}
                  style={{ top: pos.top, left: pos.left }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 transition-transform ${
                    isSelected ? "scale-125 z-30" : "hover:scale-110 z-20"
                  }`}
                  title={`${pack.pack_serial} (${pos.label})`}
                >
                  <div className="relative">
                    {/* Ping Ring for Critical Alerts */}
                    {pack.active_critical_alerts > 0 && (
                      <span className="absolute -inset-2 rounded-full bg-red-500/50 animate-ping" />
                    )}

                    <div
                      className={`px-2 py-1 rounded-full text-[10px] font-bold font-mono shadow-lg border flex items-center gap-1 cursor-pointer ${
                        isSelected
                          ? "bg-white text-slate-900 border-white ring-4 ring-emerald-500/40"
                          : pack.health_grade === "A"
                          ? "bg-emerald-600 text-white border-emerald-400"
                          : pack.health_grade === "B"
                          ? "bg-blue-600 text-white border-blue-400"
                          : pack.health_grade === "C"
                          ? "bg-amber-600 text-white border-amber-400"
                          : "bg-red-600 text-white border-red-400"
                      }`}
                    >
                      <MapPin className="w-2.5 h-2.5" />
                      <span>{pack.pack_serial.split("-").slice(-1)[0]}</span>
                    </div>

                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-[9px] font-semibold text-slate-300 whitespace-nowrap drop-shadow">
                      {pos.label}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Map Footer Transparency Legend */}
          <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 bg-slate-800/80 backdrop-blur px-4 py-2 rounded-lg border border-slate-700">
            <span className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-blue-400" />
              <span>MODULE_GNSS: Continuous LTE-M cellular GPS</span>
            </span>
            <span className="flex items-center gap-2">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>PHONE_GPS: Opportunistic BLE Rider / Tech sync</span>
            </span>
          </div>
        </div>

        {/* Selected Pack Detail Inspector Drawer (1/4 width) */}
        <div className="lg:col-span-1">
          {selectedPack ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    selectedPack.health_grade === "A"
                      ? "bg-emerald-100 text-emerald-800"
                      : selectedPack.health_grade === "B"
                      ? "bg-blue-100 text-blue-800"
                      : selectedPack.health_grade === "C"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  Grade {selectedPack.health_grade}
                </span>

                <span className="text-[11px] font-mono text-slate-400">
                  {selectedPack.vehicle_id || "Unassigned"}
                </span>
              </div>

              <div>
                <h2 className="text-lg font-bold font-mono text-slate-900 truncate">
                  {selectedPack.pack_serial}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">{selectedPack.commercial_name}</p>
              </div>

              {/* Location Source & Accuracy Transparency matching Checklist M4 line 159 */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Location Source:</span>
                  <span
                    className={`inline-flex items-center gap-1 font-bold ${
                      selectedPack.connectivity_mode === "LTEM_ACTIVE"
                        ? "text-blue-700"
                        : "text-emerald-700"
                    }`}
                  >
                    {selectedPack.connectivity_mode === "LTEM_ACTIVE" ? (
                      <>
                        <Radio className="w-3.5 h-3.5" /> MODULE_GNSS
                      </>
                    ) : (
                      <>
                        <Smartphone className="w-3.5 h-3.5" /> PHONE_GPS
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600 font-mono">
                  <span>Accuracy:</span>
                  <span className="font-bold">±4.5 m</span>
                </div>

                <div className="flex items-center justify-between text-slate-600 font-mono">
                  <span>Fix Age:</span>
                  <span className="font-bold">
                    {selectedPack.connectivity_mode === "LTEM_ACTIVE"
                      ? "12 s ago"
                      : "2 h ago"}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 border-t border-slate-200 pt-1.5 truncate">
                  Coords: 30.0618° N, 31.2201° E
                </div>
              </div>

              {/* Live Electrical & Thermal Snapshot */}
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">SOC</div>
                  <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                    {selectedPack.soc_pct.toFixed(0)}%
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">SOH</div>
                  <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                    {selectedPack.soh_pct.toFixed(1)}%
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Voltage</div>
                  <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                    {selectedPack.pack_voltage_v.toFixed(1)} V
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Temp</div>
                  <div
                    className={`text-sm font-bold font-mono mt-0.5 ${
                      selectedPack.max_temperature_c > 45 ? "text-red-600" : "text-slate-900"
                    }`}
                  >
                    {selectedPack.max_temperature_c.toFixed(0)} °C
                  </div>
                </div>
              </div>

              {selectedPack.active_critical_alerts > 0 && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Thermal rise rate alert active on this pack.</span>
                </div>
              )}

              {/* Navigation Button to Full Pack Detail */}
              <Link
                href={`/packs/${selectedPack.pack_serial}`}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <span>View pack details</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </Link>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-400">
              Select a pin on the map to inspect live metrics and location accuracy.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

