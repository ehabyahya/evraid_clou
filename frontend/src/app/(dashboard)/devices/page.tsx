"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DeviceModuleItem } from "@/lib/types/api";
import { api } from "@/lib/api/client";
import {
  Radio,
  Cpu,
  Signal,
  Lock,
  Upload,
  Sparkles,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function DevicesPage() {
  const [modules, setModules] = useState<DeviceModuleItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkSerial, setLinkSerial] = useState("");
  const [linkImei, setLinkImei] = useState("");
  const [linking, setLinking] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState(false);

  const loadModules = async () => {
    setLoading(true);
    try {
      const res = await api.getModules();
      setModules(res);
    } catch (err) {
      console.error("Error loading modules:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModules();
  }, []);

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkSerial || !linkImei) return;
    setLinking(true);
    try {
      await api.linkModule({ pack_serial: linkSerial.trim(), imei: linkImei.trim() });
      setLinkSuccess(true);
      setTimeout(() => {
        setLinkSuccess(false);
        setLinkModalOpen(false);
        setLinkSerial("");
        setLinkImei("");
        loadModules();
      }, 1200);
    } catch (err) {
      alert("Failed to link module");
    } finally {
      setLinking(false);
    }
  };

  const filteredModules = modules.filter(
    (m) =>
      m.imei.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.pack_serial && m.pack_serial.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.vehicle_id && m.vehicle_id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Devices, OTA &amp; Remote Control
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            4G / LTE-M telematics modules, BMS firmware inventory, and cryptographic commands
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setLinkModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm"
          >
            <Radio className="w-3.5 h-3.5 text-slate-500" />
            <span>Link / Swap Module</span>
          </button>

          <button
            onClick={() => alert("Bulk CSV module provisioning active in MVP.")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Import modules (CSV)</span>
          </button>
        </div>
      </div>

      {/* Phase 2 Governance Blue Banner matching Mockup #4 */}
      <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
        <div className="flex items-center gap-2.5">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white uppercase tracking-wider">
            Phase 2
          </span>
          <span className="font-medium">
            Every OTA campaign and fleet-wide lock needs approval from two people. All commands are cryptographically signed and logged in immutable audit records.
          </span>
        </div>
        <span className="text-blue-700 font-bold hidden sm:inline">RFC-6749 Compliant</span>
      </div>

      {/* Row 1 — 4 Device KPI Cards matching Mockup #4 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Modules Connected */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            <span>MODULES CONNECTED</span>
            <Radio className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
            1,198
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            <span className="text-amber-700 font-semibold">2</span> offline over 6 h
          </div>
        </div>

        {/* 2. BMS Firmware Current */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            <span>BMS FIRMWARE CURRENT</span>
            <Cpu className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
            78%
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Latest version: <span className="font-semibold text-slate-800 font-mono">2.5.0</span>
          </div>
        </div>

        {/* 3. Weak Signal */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            <span>WEAK SIGNAL</span>
            <Signal className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
            37
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Fell back to 2G this week
          </div>
        </div>

        {/* 4. Packs Locked */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            <span>PACKS LOCKED</span>
            <Lock className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
            2
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Theft report · safety hold
          </div>
        </div>
      </div>

      {/* Row 2 — Device Registry & Phase 2 Preview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2/3 width) — Device Registry Table (Active in MVP — FR-5) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 rtl:left-auto rtl:right-3" />
              <input
                type="text"
                placeholder="Search Serial, IMEI or SIM..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <span className="text-xs font-mono text-slate-400">
              {filteredModules.length} modules active
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Pack</th>
                  <th className="py-3 px-4">Module IMEI</th>
                  <th className="py-3 px-4">Network</th>
                  <th className="py-3 px-4">Signal</th>
                  <th className="py-3 px-4">BMS Firmware</th>
                  <th className="py-3 px-4">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredModules.map((m) => (
                  <tr key={m.imei} className="hover:bg-slate-50 transition-colors">
                    {/* Pack */}
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {m.pack_serial ? (
                        <Link
                          href={`/packs/${m.pack_serial}`}
                          className="hover:text-emerald-600 hover:underline flex items-center gap-1"
                        >
                          <span>{m.pack_serial}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </Link>
                      ) : (
                        <span className="text-slate-400 font-normal italic">Unlinked Spare</span>
                      )}
                    </td>

                    {/* Masked IMEI */}
                    <td className="py-3 px-4 text-slate-700">
                      ••••{m.imei.slice(-4)}
                    </td>

                    {/* Network */}
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.network === "LTE-M"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60"
                            : "bg-amber-50 text-amber-800 border border-amber-200/60"
                        }`}
                      >
                        {m.network}
                      </span>
                    </td>

                    {/* Signal */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5" title={`${m.rssi_dbm} dBm`}>
                        <div className="flex items-end gap-0.5 h-3">
                          {[1, 2, 3, 4].map((bar) => (
                            <div
                              key={bar}
                              className={`w-1 rounded-xs ${
                                bar <= m.signal_bars
                                  ? bar <= 2
                                    ? "bg-amber-500"
                                    : "bg-emerald-600"
                                  : "bg-slate-200"
                              }`}
                              style={{ height: `${bar * 25}%` }}
                            />
                          ))}
                        </div>
                        <span className="text-[11px] text-slate-500">{m.rssi_dbm} dBm</span>
                      </div>
                    </td>

                    {/* BMS Firmware */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-900 font-semibold">{m.bms_firmware}</span>
                        {m.has_fw_update && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-700">
                            Update
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Last Seen */}
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {m.last_seen_str}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right (1/3 width) — Phase 2 Preview Cards matching Mockup #4 */}
        <div className="space-y-4">
          {/* OTA Campaign Card (Phase 2 Preview) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">OTA Campaign (Staged Rollout)</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                Phase 2
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Target BMS Firmware: <span className="font-bold text-slate-800 font-mono">v2.5.0</span> · Rollout policy with auto-rollback on canary faults.
            </p>

            {/* Stepper matching Mockup #4 */}
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <span className="font-semibold text-emerald-900">1. Pilot · 10 packs</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                  Done ✓
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-between">
                <span className="font-semibold text-blue-900">2. 10% of fleet (120 packs)</span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded animate-pulse">
                  Running (84%)
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-slate-400">
                <span>3. 50% of fleet</span>
                <span className="text-[10px]">Waiting</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-slate-400">
                <span>4. Full fleet</span>
                <span className="text-[10px]">Waiting</span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                disabled
                className="flex-1 py-1.5 text-xs font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed opacity-75"
              >
                Pause Campaign
              </button>
              <button
                disabled
                className="flex-1 py-1.5 text-xs font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed opacity-75"
              >
                Roll Back
              </button>
            </div>
          </div>

          {/* Remote Control / Lock Card (Phase 2 Preview) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900">Two-Person Remote Lock</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                Phase 2
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Isolates the discharge contactors remotely via signed MQTT telematics packet. Requires secondary approval.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pack serial</label>
                <input
                  type="text"
                  placeholder="e.g. EVR-48105-0142"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason</label>
                <select className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800">
                  <option>Theft or loss</option>
                  <option>Safety hold (Thermal event)</option>
                  <option>Payment delinquency</option>
                </select>
              </div>

              <button
                disabled
                className="w-full py-2 bg-slate-100 text-slate-400 border border-slate-200 rounded-lg text-xs font-semibold cursor-not-allowed opacity-75"
              >
                Request lock · needs 2nd approval
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Link Module Modal */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Link Telematics Module</h3>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">
              Associate cellular 4G/LTE-M module IMEI with battery pack serial
            </p>

            {linkSuccess ? (
              <div className="py-6 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <div className="font-bold text-slate-900 text-sm">Module Linked Successfully!</div>
              </div>
            ) : (
              <form onSubmit={handleLinkSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Battery Pack Serial *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. EVR-48105-0142"
                    value={linkSerial}
                    onChange={(e) => setLinkSerial(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Module IMEI *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 860432049104471"
                    value={linkImei}
                    onChange={(e) => setLinkImei(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                    required
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setLinkModalOpen(false)}
                    className="px-3 py-1.5 font-semibold text-slate-600 rounded-lg hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={linking}
                    className="px-4 py-1.5 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm"
                  >
                    {linking ? "Linking..." : "Link Module"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

