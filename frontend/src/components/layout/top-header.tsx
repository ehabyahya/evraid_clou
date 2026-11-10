"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Download, Plus, Globe } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { RegisterPackModal } from "./register-pack-modal";

export function TopHeader() {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const [searchVal, setSearchVal] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      router.push(`/packs?q=${encodeURIComponent(searchVal.trim())}`);
    }
  };

  const handleExport = () => {
    window.open("http://127.0.0.1:8000/v1/reports/export/csv", "_blank");
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-30">
        {/* Left Eyebrow & Status */}
        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>DEMO OPERATOR</span>
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="text-slate-800">CAIRO FLEET</span>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live · 12 s ago
          </span>
        </div>

        {/* Right Actions Toolbar */}
        <div className="flex items-center gap-3">
          {/* Quick Search */}
          <form onSubmit={handleSearch} className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 rtl:left-auto rtl:right-3" />
            <input
              type="text"
              placeholder={t("actions.search")}
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="w-56 pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-mono rtl:pl-3 rtl:pr-9"
            />
          </form>

          {/* Bilingual Language Switcher */}
          <button
            onClick={() => setLocale(locale === "en" ? "ar" : "en")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
            title="Toggle English / Arabic (RTL)"
          >
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span>{locale === "en" ? "العربية" : "English"}</span>
          </button>

          {/* Export Report Button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{t("actions.export_report")}</span>
          </button>

          {/* Primary Action Button */}
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t("actions.register_pack")}</span>
          </button>
        </div>
      </header>

      <RegisterPackModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => window.location.reload()}
      />
    </>
  );
}

