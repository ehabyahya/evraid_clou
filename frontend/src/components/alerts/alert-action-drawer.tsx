"use client";

import React, { useState } from "react";
import Link from "next/link";
import { DetailedAlert } from "@/lib/types/api";
import { api } from "@/lib/api/client";
import {
  AlertTriangle,
  CheckCircle2,
  Send,
  ExternalLink,
  ShieldAlert,
  Clock,
} from "lucide-react";

interface AlertActionDrawerProps {
  alert: DetailedAlert | null;
  onAlertUpdated: (updated: DetailedAlert) => void;
}

export function AlertActionDrawer({
  alert,
  onAlertUpdated,
}: AlertActionDrawerProps) {
  const [assignee, setAssignee] = useState("Field team A");
  const [priority, setPriority] = useState<"Urgent" | "High" | "Normal">("Urgent");
  const [due, setDue] = useState("Today 18:00");
  const [notes, setNotes] = useState("");
  const [escalate, setEscalate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!alert) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs">
        Select an alert from the table to view engineering diagnosis and dispatch work orders.
      </div>
    );
  }

  const handleAcknowledge = async () => {
    setLoading(true);
    try {
      const res = await api.acknowledgeAlert(alert.id);
      onAlertUpdated(res);
      setFeedback("Alert acknowledged! SLA timestamp recorded.");
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback(`Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.assignAlert(alert.id, {
        assign_to: assignee,
        priority,
        due_date: due,
        notes: notes.trim() || undefined,
        escalate_to_evraid: escalate,
      });
      onAlertUpdated(res);
      setFeedback(`Work order dispatched to ${assignee}! Added to Kanban.`);
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      setFeedback(`Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
      {/* Top Severity and Age Banner */}
      <div className="flex items-center justify-between">
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
            alert.severity === "CRITICAL"
              ? "bg-red-50 text-red-700 border border-red-200"
              : alert.severity === "WARNING"
              ? "bg-amber-50 text-amber-800 border border-amber-200"
              : "bg-blue-50 text-blue-700 border border-blue-200"
          }`}
        >
          {alert.severity} · raised {new Date(alert.raised_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>

        <span className="text-[11px] font-mono text-slate-400">
          ID: {alert.id}
        </span>
      </div>

      {/* Title & Target Details */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 leading-snug">
          {alert.alert_name}
        </h2>
        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
          <Link
            href={`/packs/${alert.pack_serial}`}
            className="font-mono font-bold text-emerald-700 hover:underline flex items-center gap-1"
          >
            <span>Pack {alert.pack_serial}</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
          {alert.vehicle_id && (
            <span className="font-mono">· vehicle {alert.vehicle_id}</span>
          )}
          {alert.location_label && <span>· {alert.location_label}</span>}
        </div>
      </div>

      {/* Recommended Action Red Callout Box matching Mockup #3 */}
      <div className="p-3.5 bg-red-50/80 border border-red-200 rounded-xl text-xs space-y-1">
        <div className="font-bold text-red-900 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>Recommended action</span>
        </div>
        <p className="text-red-800 leading-relaxed font-medium">
          {alert.recommended_action}
        </p>
      </div>

      {/* Delivery Audit Line */}
      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <span>{alert.delivery_channels.join(", ")}</span>
      </div>

      {feedback && (
        <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Work Order Form */}
      <form onSubmit={handleCreateWorkOrder} className="pt-3 border-t border-slate-100 space-y-3 text-xs">
        <div className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400">
          Create Work Order
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Assign to</label>
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Field team A">Field team A (Zamalek / Dokki)</option>
              <option value="Field team B">Field team B (New Cairo)</option>
              <option value="Ops desk">Ops desk / Depot charging</option>
              <option value="EVRaid Engineering">EVRaid Tier-2 Engineering</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500 font-semibold"
            >
              <option value="Urgent">Urgent (SLA &lt; 2h)</option>
              <option value="High">High (Same day)</option>
              <option value="Normal">Normal</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Due</label>
          <input
            type="text"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 font-mono focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Notes / Instructions</label>
          <textarea
            rows={2}
            placeholder="Field dispatch notes, safety precautions, or depot bay assignment..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Escalate Checkbox */}
        <label className="flex items-center gap-2 text-slate-700 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={escalate}
            onChange={(e) => setEscalate(e.target.checked)}
            className="rounded text-emerald-600 focus:ring-emerald-500"
          />
          <span className="font-semibold text-slate-900">
            Escalate to EVRaid support queue (Warranty claim)
          </span>
        </label>

        {/* Buttons */}
        <div className="pt-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleAcknowledge}
            disabled={loading || alert.status === "Acknowledged"}
            className="px-3 py-1.5 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
          >
            {alert.status === "Acknowledged" ? "Acknowledged ✓" : "Acknowledge"}
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <Send className="w-3 h-3" />
            <span>Create work order</span>
          </button>
        </div>
      </form>
    </div>
  );
}

