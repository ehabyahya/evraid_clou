"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ShieldAlert, ArrowRight, CheckCircle2 } from "lucide-react";

export default function Verify2faPage() {
  const router = useRouter();
  const [code, setCode] = useState("849201");
  const [loading, setLoading] = useState(false);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      router.push("/");
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-xl space-y-6 text-center">
        <Image
          src="/evraid.svg"
          alt="evRAID"
          width={130}
          height={56}
          priority
          className="h-8 w-auto object-contain mx-auto"
        />
        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100 shadow-sm">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900">Two-Factor Authentication</h2>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Mandatory security check for Admin roles (FR-6). Enter the 6-digit TOTP code from your authenticator app.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-48 text-center text-2xl font-black tracking-widest px-4 py-2 border-2 border-emerald-500 rounded-xl font-mono focus:outline-none focus:ring-4 focus:ring-emerald-500/20 text-slate-900"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50 text-xs"
          >
            <span>{loading ? "Verifying..." : "Verify & Access Platform"}</span>
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400">
          Didn&apos;t receive code? Contact EVRaid security administrator.
        </div>
      </div>
    </div>
  );
}

