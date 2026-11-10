"use client";

import React from "react";
import Link from "next/link";
import { WorkOrder } from "@/lib/types/api";
import { Clock, User, ShieldCheck } from "lucide-react";

interface WorkOrdersKanbanProps {
  workOrders: WorkOrder[];
}

export function WorkOrdersKanban({ workOrders }: WorkOrdersKanbanProps) {
  const columns = [
    { id: "TO DO", label: "TO DO", color: "bg-slate-100 border-slate-300" },
    { id: "IN PROGRESS", label: "IN PROGRESS", color: "bg-blue-50 border-blue-200" },
    { id: "WAITING ON EVRAID", label: "WAITING ON EVRAID", color: "bg-purple-50 border-purple-200" },
    { id: "DONE THIS WEEK", label: "DONE THIS WEEK", color: "bg-emerald-50 border-emerald-200" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-slate-400">
          Work Orders Board
        </h3>
        <span className="text-xs font-mono text-slate-400">{workOrders.length} active work orders</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((col) => {
          const cards = workOrders.filter(
            (w) => w.status.toUpperCase() === col.id.toUpperCase()
          );

          return (
            <div
              key={col.id}
              className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 flex flex-col min-h-[220px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 text-xs font-bold text-slate-700">
                <span>{col.label}</span>
                <span className="px-1.5 py-0.2 bg-white border border-slate-200 rounded text-[10px] font-mono">
                  {cards.length}
                </span>
              </div>

              {/* Card List */}
              <div className="space-y-2.5 flex-1">
                {cards.length === 0 ? (
                  <div className="py-8 text-center text-[11px] text-slate-400">
                    No orders in this lane
                  </div>
                ) : (
                  cards.map((card) => (
                    <div
                      key={card.id}
                      className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs hover:border-slate-300 transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-mono text-slate-400 font-bold">{card.id}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded font-bold ${
                            card.priority === "Urgent"
                              ? "bg-red-50 text-red-700"
                              : card.priority === "High"
                              ? "bg-amber-50 text-amber-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {card.priority}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-slate-900 leading-snug">
                        {card.title}
                      </div>

                      {card.status === "WAITING ON EVRAID" && (
                        <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Evidence attached</span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[100px]">{card.assigned_to}</span>
                        </span>
                        {card.due_date && (
                          <span className="flex items-center gap-1 font-mono text-slate-400">
                            <Clock className="w-3 h-3" />
                            <span>{card.due_date}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

