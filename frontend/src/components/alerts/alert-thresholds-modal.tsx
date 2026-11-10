"use client";

import React, { useState } from "react";
import { X, Sliders, CheckCircle2 } from "lucide-react";

interface AlertThresholdsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AlertThresholdsModal({ isOpen, onClose }: AlertThresholdsModalProps) {
  const [thermalWarning, setThermalWarning] = useState(45);
  const [thermalCritical, setThermalCritical] = useState(55);
  const [tempRate, setTempRate] = useState(2.0);
  const [imbalanceWarning, setImbalanceWarning] = useState(80);
  const [imbalanceCritical, setImbalanceCritical] = useState(150);
  const [undervoltageCutoff, setUndervoltageCutoff] = useState(2.8);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">
              Fleet Alert Thresholds (Cairo fleet)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
          {saved ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <div className="font-bold text-slate-900 text-sm">Thresholds Updated</div>
              <p className="text-slate-500 mt-1">Changes applied to live ingestion engine.</p>
            </div>
          ) : (
            <>
              <p className="text-slate-500">
                Override default EVRaid engineering safety thresholds for this operator fleet.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Thermal Warning (°C)
                  </label>
                  <input
                    type="number"
                    value={thermalWarning}
                    onChange={(e) => setThermalWarning(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Thermal Critical (°C)
                  </label>
                  <input
                    type="number"
                    value={thermalCritical}
                    onChange={(e) => setThermalCritical(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Thermal Runaway Rate Cutoff (°C/min)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={tempRate}
                  onChange={(e) => setTempRate(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Cell Imbalance Warning (mV)
                  </label>
                  <input
                    type="number"
                    value={imbalanceWarning}
                    onChange={(e) => setImbalanceWarning(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Cell Imbalance Critical (mV)
                  </label>
                  <input
                    type="number"
                    value={imbalanceCritical}
                    onChange={(e) => setImbalanceCritical(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Under-Voltage Cutoff (V/cell)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={undervoltageCutoff}
                  onChange={(e) => setUndervoltageCutoff(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm"
                >
                  Save Fleet Thresholds
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

