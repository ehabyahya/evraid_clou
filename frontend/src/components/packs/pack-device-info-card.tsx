"use client";

import React from "react";
import { Cpu } from "lucide-react";

interface PackDeviceInfoCardProps {
  chemistry?: string;
  seriesCount?: number;
  ratedCapacityAh?: number;
  bmsModel?: string;
  bmsFirmware?: string;
  moduleImei?: string;
  vehicleId?: string;
  commissionedDate?: string;
}

export function PackDeviceInfoCard({
  chemistry = "LFP",
  seriesCount = 16,
  ratedCapacityAh = 105,
  bmsModel = "Smart BMS 48 V 105 A",
  bmsFirmware = "2.4.1",
  moduleImei = "860432049104471",
  vehicleId = "SC-2210",
  commissionedDate = "Jul 2025",
}: PackDeviceInfoCardProps) {
  const maskedImei = moduleImei
    ? `••••${moduleImei.slice(-4)}`
    : "BLE App Only";

  const rows = [
    { label: "Chemistry · configuration", value: `${chemistry} · ${seriesCount}S` },
    { label: "Rated capacity", value: `${ratedCapacityAh} Ah` },
    { label: "BMS", value: bmsModel },
    { label: "BMS firmware", value: bmsFirmware },
    { label: "Telematics module", value: `IMEI ${maskedImei}` },
    { label: "Vehicle", value: vehicleId },
    { label: "Commissioned", value: commissionedDate },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-0.5">
          <h3 className="text-sm font-bold text-slate-900">Pack and device</h3>
          <Cpu className="w-4 h-4 text-slate-500" />
        </div>
        <p className="text-xs text-slate-500 mb-4">Hardware specs and physical mapping</p>

        <div className="divide-y divide-slate-100 text-xs">
          {rows.map((r) => (
            <div key={r.label} className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500">{r.label}</span>
              <span className="font-mono font-semibold text-slate-800 text-right">
                {r.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>Hardware profile locked</span>
        <span>EVRaid Certified</span>
      </div>
    </div>
  );
}

