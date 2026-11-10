"use client";

import React, { useState } from "react";
import { X, QrCode, Upload, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api/client";

interface RegisterPackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RegisterPackModal({ isOpen, onClose, onSuccess }: RegisterPackModalProps) {
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");
  const [serial, setSerial] = useState("");
  const [commercialName, setCommercialName] = useState("LADRIX Golf Cart 51.2V 105Ah");
  const [chemistry, setChemistry] = useState<"LFP" | "NMC">("LFP");
  const [seriesCount, setSeriesCount] = useState(16);
  const [capacityAh, setCapacityAh] = useState(105);
  const [voltage, setVoltage] = useState(51.2);
  const [vehicleId, setVehicleId] = useState("");
  const [imei, setImei] = useState("");
  const [connectivity, setConnectivity] = useState<"LTEM_ACTIVE" | "BLE_ONLY">("LTEM_ACTIVE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serial) {
      setError("Please enter a pack serial number");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.registerPack({
        serial_number: serial.trim(),
        commercial_name: commercialName,
        chemistry,
        series_count: seriesCount,
        rated_capacity_ah: capacityAh,
        nominal_voltage: voltage,
        vehicle_id: vehicleId.trim() || undefined,
        module_imei: imei.trim() || undefined,
        connectivity_mode: connectivity,
        fleet_id: 1,
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        if (onSuccess) onSuccess();
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to register pack");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Register Battery Pack</h3>
            <p className="text-xs text-slate-500">Provision a new pack to Demo Operator · Cairo fleet</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-6 pt-2">
          <button
            onClick={() => setActiveTab("single")}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "single"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Single Pack (Serial / QR)
          </button>
          <button
            onClick={() => setActiveTab("bulk")}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "bulk"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Bulk CSV Import
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3 animate-bounce" />
              <div className="text-base font-bold text-slate-900">Pack Registered Successfully!</div>
              <p className="text-xs text-slate-500 mt-1">Serial: {serial} is now active in Cairo fleet.</p>
            </div>
          ) : activeTab === "single" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pack Serial Number *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. EVR-48105-0143"
                    value={serial}
                    onChange={(e) => setSerial(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    required
                  />
                  <button
                    type="button"
                    title="Scan QR Code"
                    className="absolute right-2 top-2 p-1 text-slate-400 hover:text-slate-600"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Chemistry</label>
                  <select
                    value={chemistry}
                    onChange={(e) => {
                      const c = e.target.value as "LFP" | "NMC";
                      setChemistry(c);
                      if (c === "LFP") {
                        setSeriesCount(16);
                        setVoltage(51.2);
                        setCapacityAh(105);
                        setCommercialName("LADRIX Golf Cart 51.2V 105Ah");
                      } else {
                        setSeriesCount(10);
                        setVoltage(36.0);
                        setCapacityAh(14);
                        setCommercialName("LADRIX Kick Scooter 36V 14Ah");
                      }
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="LFP">LFP (LiFePO4)</option>
                    <option value="NMC">NMC</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Series Count (S)</label>
                  <input
                    type="number"
                    value={seriesCount}
                    onChange={(e) => setSeriesCount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rated Ah</label>
                  <input
                    type="number"
                    value={capacityAh}
                    onChange={(e) => setCapacityAh(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal Voltage (V)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={voltage}
                    onChange={(e) => setVoltage(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle ID</label>
                  <input
                    type="text"
                    placeholder="e.g. SC-2215"
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Module IMEI</label>
                  <input
                    type="text"
                    placeholder="e.g. 860432049104499"
                    value={imei}
                    onChange={(e) => setImei(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Connectivity Mode</label>
                <div className="flex gap-4">
                  <label className="flex items-center text-xs font-medium text-slate-700">
                    <input
                      type="radio"
                      name="conn"
                      checked={connectivity === "LTEM_ACTIVE"}
                      onChange={() => setConnectivity("LTEM_ACTIVE")}
                      className="mr-1.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    LTE-M Cellular Module
                  </label>
                  <label className="flex items-center text-xs font-medium text-slate-700">
                    <input
                      type="radio"
                      name="conn"
                      checked={connectivity === "BLE_ONLY"}
                      onChange={() => setConnectivity("BLE_ONLY")}
                      className="mr-1.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    BLE App Only
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? "Registering..." : "Register Pack"}
                </button>
              </div>
            </form>
          ) : (
            <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-xl hover:border-emerald-500 transition-colors cursor-pointer">
              <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-800">Drag & drop CSV file or browse</div>
              <p className="text-xs text-slate-400 mt-1">Columns: serial_number, model_code, vehicle_id, module_imei</p>
              <button
                type="button"
                onClick={() => alert("CSV bulk import processed 25 packs successfully.")}
                className="mt-4 px-4 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm"
              >
                Upload CSV Sample
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

