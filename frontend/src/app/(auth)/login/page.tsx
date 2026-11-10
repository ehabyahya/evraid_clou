"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Lock, Mail, ShieldCheck, ArrowRight, Building2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@demo-operator.com");
  const [password, setPassword] = useState("••••••••••••");
  const [role, setRole] = useState("Customer Admin");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // If Admin role, route to 2FA challenge per PRD FR-6
    setTimeout(() => {
      if (role.includes("Admin")) {
        router.push("/verify-2fa");
      } else {
        router.push("/");
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-xl space-y-6">
        {/* Brand Block */}
        <div className="text-center flex flex-col items-center">
          <Image
            src="/evraid.svg"
            alt="evRAID"
            width={160}
            height={70}
            priority
            className="h-10 w-auto object-contain mx-auto"
          />
          <div className="text-[11px] font-bold tracking-widest text-slate-400 uppercase mt-2">
            FLEET PLATFORM
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-4">Sign in to your operator workspace</h2>
          <p className="text-xs text-slate-500 mt-1">
            Multi-tenant access for fleet managers, technicians and EVRaid support
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Operator Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 rtl:left-auto rtl:right-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 rtl:left-auto rtl:right-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Demo Role (RBAC Simulation)</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Customer Admin">Customer Admin (Requires 2FA)</option>
              <option value="Fleet Manager">Fleet Manager</option>
              <option value="Field Technician">Field Technician</option>
              <option value="EVRaid Super-Admin">EVRaid Super-Admin (Requires 2FA)</option>
              <option value="EVRaid Support Engineer">EVRaid Support Engineer</option>
              <option value="Executive Viewer">Executive Viewer (Read-Only)</option>
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50 text-xs"
            >
              <span>{loading ? "Authenticating..." : "Sign In to Workspace"}</span>
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </button>
          </div>
        </form>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>256-bit TLS Encrypted</span>
          </span>
          <span className="font-mono">EVRaid Cloud v0.1.0</span>
        </div>
      </div>
    </div>
  );
}

