"use client";

import React, { useState, useEffect } from "react";
import { FirmwareProfileMapping } from "@/lib/types/api";
import { api } from "@/lib/api/client";
import {
  ShieldCheck,
  Cpu,
  Database,
  FileText,
  Save,
  CheckCircle2,
  RefreshCw,
  Download,
  AlertCircle,
} from "lucide-react";

export default function AdminPage() {
  const [mappings, setMappings] = useState<FirmwareProfileMapping[]>([]);
  const [selectedMapping, setSelectedMapping] = useState<FirmwareProfileMapping | null>(null);
  const [channelMapInput, setChannelMapInput] = useState("");
  const [descriptionInput, setDescriptionInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadMappings = async () => {
    setLoading(true);
    try {
      const res = await api.getFirmwareMappings();
      setMappings(res);
      if (res.length > 0 && !selectedMapping) {
        setSelectedMapping(res[0]);
        setChannelMapInput(res[0].cell_channel_map.join(", "));
        setDescriptionInput(res[0].description || "");
      }
    } catch (err) {
      console.error("Error loading firmware mappings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMappings();
  }, []);

  const handleSelectMapping = (m: FirmwareProfileMapping) => {
    setSelectedMapping(m);
    setChannelMapInput(m.cell_channel_map.join(", "));
    setDescriptionInput(m.description || "");
    setSaveSuccess(false);
  };

  const handleSaveMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMapping) return;

    try {
      const parsedChannels = channelMapInput
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n));

      setSaving(true);
      const updated = await api.updateFirmwareMapping({
        ...selectedMapping,
        cell_channel_map: parsedChannels,
        description: descriptionInput,
      });

      setMappings((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m))
      );
      setSelectedMapping(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`Failed to save mapping: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              EVRaid Super-Admin Console
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            BMS firmware hardware profiles, physical cell channel mapping, and audit logging
          </p>
        </div>

        <button
          onClick={() => alert("Downloading R&D Anonymised Telemetry Dataset (JSON Lines)...")}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export Anonymised R&amp;D Dataset</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Firmware Profiles List */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">BMS Firmware Profiles</h3>
            <span className="text-xs font-mono text-slate-400">{mappings.length} profiles</span>
          </div>

          <div className="space-y-2">
            {mappings.map((m) => {
              const isSelected = selectedMapping?.id === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => handleSelectMapping(m)}
                  className={`w-full text-left p-3 rounded-lg border transition-all text-xs font-mono ${
                    isSelected
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>{m.firmware_version}</span>
                    <span
                      className={`text-[10px] font-normal px-1.5 py-0.2 rounded ${
                        isSelected ? "bg-slate-800 text-emerald-400" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {m.bms_model_code.split("-")[1] || "BMS"}
                    </span>
                  </div>
                  <div
                    className={`text-[11px] mt-1 truncate ${
                      isSelected ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    {m.description || m.bms_model_code}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Physical Cell Channel Map Editor (2/3 width) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
          {selectedMapping ? (
            <form onSubmit={handleSaveMapping} className="space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-mono">
                    {selectedMapping.firmware_version}
                  </h3>
                  <div className="text-slate-500 mt-0.5">
                    Model: <span className="font-mono text-slate-800 font-semibold">{selectedMapping.bms_model_code}</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-full text-[11px] border border-emerald-200">
                  {selectedMapping.current_sign_convention}
                </span>
              </div>

              {saveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Channel mapping updated successfully! Ingestion normalizer updated.</span>
                </div>
              )}

              {/* Channel Map Field */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Ordered Physical Cell Channel Map (1..S mapped to raw AFE channels) *
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Comma-separated list of raw channel indices. For example, 10S on 16-channel BMS:
                  <code className="ml-1 bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">1, 2, 3, 4, 5, 6, 7, 8, 9, 16</code>
                </p>
                <input
                  type="text"
                  value={channelMapInput}
                  onChange={(e) => setChannelMapInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-sm focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Description / Notes</label>
                <textarea
                  rows={3}
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-blue-600" />
                  <span>Ingestion Engine Behavior</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  The edge frame normalizer uses this map to index raw voltages. Cells not in this array are marked unused and filtered from diagnostics and cell imbalance calculations.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? "Saving Map..." : "Save Firmware Profile"}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              Select a firmware profile to inspect and edit cell channel mappings.
            </div>
          )}
        </div>
      </div>

      {/* Audit Log Viewer */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Immutable Audit Log (FR-6)</h3>
          <span className="text-xs font-mono text-slate-400">Append-Only Ledger</span>
        </div>

        <div className="overflow-x-auto text-xs font-mono">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase">
                <th className="pb-2">Timestamp</th>
                <th className="pb-2">Actor</th>
                <th className="pb-2">Action</th>
                <th className="pb-2">Target</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-2.5 text-slate-500">2026-11-08 14:02:12 UTC</td>
                <td className="py-2.5 font-bold">ops_lead@rabbit.com</td>
                <td className="py-2.5">ACKNOWLEDGE_ALERT</td>
                <td className="py-2.5">ALT-2026-001 (EVR-48105-0142)</td>
                <td className="py-2.5 text-emerald-600 font-bold">SUCCESS</td>
              </tr>
              <tr>
                <td className="py-2.5 text-slate-500">2026-11-08 13:45:00 UTC</td>
                <td className="py-2.5 font-bold">admin@evraid.com</td>
                <td className="py-2.5">UPDATE_FIRMWARE_MAPPING</td>
                <td className="py-2.5">SWP10_V2.1.0 (channel 16)</td>
                <td className="py-2.5 text-emerald-600 font-bold">SUCCESS</td>
              </tr>
              <tr>
                <td className="py-2.5 text-slate-500">2026-11-08 12:10:30 UTC</td>
                <td className="py-2.5 font-bold">system_ingest</td>
                <td className="py-2.5">INGEST_TELEMETRY_BATCH</td>
                <td className="py-2.5">120 records (Cairo Fleet)</td>
                <td className="py-2.5 text-emerald-600 font-bold">ACCEPTED</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

