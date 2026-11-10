"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api/client";
import { PackListItem } from "@/lib/types/api";
import {
  Search,
  Filter,
  ArrowUpDown,
  Radio,
  Smartphone,
  ChevronRight,
  Battery,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

function PacksListContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [selectedChemistry, setSelectedChemistry] = useState<string>("");
  const [selectedConnectivity, setSelectedConnectivity] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("last_seen");
  const [sortOrder, setSortOrder] = useState<string>("desc");

  const [packs, setPacks] = useState<PackListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchPacks = async () => {
    setLoading(true);
    try {
      const res = await api.getPacks({
        q: query || undefined,
        grade: selectedGrade || undefined,
        chemistry: selectedChemistry || undefined,
        connectivity: selectedConnectivity || undefined,
        status: selectedStatus || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page: 1,
        page_size: 50,
      });
      setPacks(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error("Error fetching packs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPacks();
  }, [selectedGrade, selectedChemistry, selectedConnectivity, selectedStatus, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPacks();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Battery Packs
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {total} registered packs across Cairo fleet · live telemetry and diagnostics
          </p>
        </div>

        <button
          onClick={fetchPacks}
          className="self-start sm:self-auto flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-600" : "text-slate-400"}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 rtl:left-auto rtl:right-3" />
            <input
              type="text"
              placeholder="Search by Serial (EVR-...), IMEI, BLE name or Vehicle ID..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-mono"
            />
          </form>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Grade Filter */}
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="">All Health Grades</option>
              <option value="A">Grade A (≥90%)</option>
              <option value="B">Grade B (80–90%)</option>
              <option value="C">Grade C (70–80%)</option>
              <option value="D">Grade D (&lt;70%)</option>
            </select>

            {/* Chemistry Filter */}
            <select
              value={selectedChemistry}
              onChange={(e) => setSelectedChemistry(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="">All Chemistries</option>
              <option value="LFP">LFP (LiFePO4)</option>
              <option value="NMC">NMC</option>
            </select>

            {/* Connectivity Filter */}
            <select
              value={selectedConnectivity}
              onChange={(e) => setSelectedConnectivity(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="">All Connectivity</option>
              <option value="LTEM_ACTIVE">LTE-M Module</option>
              <option value="BLE_ONLY">BLE App Only</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="">All Statuses</option>
              <option value="need_charging">Need Charging (SOC &lt; 20%)</option>
              <option value="critical_alert">Active Critical Alert</option>
            </select>
          </div>
        </div>

        {/* Sort Chips */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">Sort by:</span>
          {[
            { id: "last_seen", label: "Last Seen" },
            { id: "soh_pct", label: "SOH %" },
            { id: "soc_pct", label: "SOC %" },
            { id: "efc", label: "Cycles" },
            { id: "imbalance_mv", label: "Imbalance (mV)" },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => {
                if (sortBy === s.id) {
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                } else {
                  setSortBy(s.id);
                  setSortOrder("desc");
                }
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                sortBy === s.id
                  ? "bg-slate-900 text-white font-semibold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>{s.label}</span>
              {sortBy === s.id && (
                <span className="text-[10px] font-mono">
                  {sortOrder === "asc" ? "↑" : "↓"}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Packs Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Pack Serial</th>
                <th className="py-3 px-4">Vehicle</th>
                <th className="py-3 px-4">Grade</th>
                <th className="py-3 px-4">SOH</th>
                <th className="py-3 px-4">SOC</th>
                <th className="py-3 px-4">Voltage / Current</th>
                <th className="py-3 px-4">Imbalance</th>
                <th className="py-3 px-4">Temp</th>
                <th className="py-3 px-4">Connectivity</th>
                <th className="py-3 px-4">Last Seen</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                    Loading packs...
                  </td>
                </tr>
              ) : packs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    No battery packs match your search or filter criteria.
                  </td>
                </tr>
              ) : (
                packs.map((p) => {
                  const isDischarging = p.pack_current_a < 0;
                  return (
                    <tr
                      key={p.pack_serial}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    >
                      {/* Serial */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        <Link
                          href={`/packs/${p.pack_serial}`}
                          className="hover:text-emerald-600 block"
                        >
                          {p.pack_serial}
                        </Link>
                        <div className="text-[10px] font-normal text-slate-400">
                          {p.commercial_name}
                        </div>
                      </td>

                      {/* Vehicle */}
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {p.vehicle_id || "Unassigned"}
                      </td>

                      {/* Health Grade */}
                      <td className="py-3 px-4">
                        <span
                          className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-xs ${
                            p.health_grade === "A"
                              ? "bg-emerald-100 text-emerald-800"
                              : p.health_grade === "B"
                              ? "bg-blue-100 text-blue-800"
                              : p.health_grade === "C"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {p.health_grade}
                        </span>
                      </td>

                      {/* SOH */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {p.soh_pct.toFixed(1)}%
                      </td>

                      {/* SOC */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span
                            className={`font-bold ${
                              p.soc_pct < 20 ? "text-amber-600" : "text-slate-900"
                            }`}
                          >
                            {p.soc_pct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-16 bg-slate-100 rounded-full h-1 mt-1 overflow-hidden">
                          <div
                            className={`h-full ${
                              p.soc_pct < 20 ? "bg-amber-500" : "bg-emerald-600"
                            }`}
                            style={{ width: `${p.soc_pct}%` }}
                          />
                        </div>
                      </td>

                      {/* Voltage & Current */}
                      <td className="py-3 px-4 font-mono text-slate-700">
                        <div>{p.pack_voltage_v.toFixed(1)} V</div>
                        <div
                          className={`text-[11px] ${
                            isDischarging ? "text-amber-600" : "text-emerald-600"
                          }`}
                        >
                          {p.pack_current_a > 0 ? "+" : ""}
                          {p.pack_current_a.toFixed(1)} A
                        </div>
                      </td>

                      {/* Imbalance */}
                      <td className="py-3 px-4 font-mono">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                            p.imbalance_mv > 100
                              ? "bg-amber-50 text-amber-800"
                              : "text-slate-700"
                          }`}
                        >
                          {Math.round(p.imbalance_mv)} mV
                        </span>
                      </td>

                      {/* Temp */}
                      <td className="py-3 px-4 font-mono">
                        <span
                          className={`font-semibold ${
                            p.max_temperature_c > 45 ? "text-red-600" : "text-slate-700"
                          }`}
                        >
                          {p.max_temperature_c.toFixed(0)} °C
                        </span>
                      </td>

                      {/* Connectivity */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                          {p.connectivity_mode === "LTEM_ACTIVE" ? (
                            <>
                              <Radio className="w-3 h-3 text-emerald-600" />
                              LTE-M
                            </>
                          ) : (
                            <>
                              <Smartphone className="w-3 h-3 text-blue-600" />
                              BLE App
                            </>
                          )}
                        </span>
                      </td>

                      {/* Last Seen */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {new Date(p.last_seen_utc).toLocaleTimeString()}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/packs/${p.pack_serial}`}
                          className="inline-flex items-center justify-center p-1.5 text-slate-400 group-hover:text-emerald-600 group-hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function PacksListPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <div className="text-sm font-semibold text-slate-700">Loading battery packs inventory...</div>
        </div>
      }
    >
      <PacksListContent />
    </Suspense>
  );
}

