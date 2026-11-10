"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MapPin,
  BatteryCharging,
  AlertTriangle,
  Sparkles,
  Radio,
  FileSpreadsheet,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface NavItem {
  labelKey: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
}

const navItems: NavItem[] = [
  { labelKey: "nav.overview", href: "/", icon: LayoutDashboard },
  { labelKey: "nav.map", href: "/map", icon: MapPin },
  { labelKey: "nav.packs", href: "/packs", icon: BatteryCharging },
  { labelKey: "nav.alerts", href: "/alerts", icon: AlertTriangle, badge: "3", badgeColor: "bg-red-100 text-red-700" },
  { labelKey: "nav.ai_insights", href: "/ai-insights", icon: Sparkles, badge: "P3", badgeColor: "bg-blue-100 text-blue-700 font-semibold" },
  { labelKey: "nav.devices", href: "/devices", icon: Radio, badge: "P2", badgeColor: "bg-slate-100 text-slate-700" },
  { labelKey: "nav.reports", href: "/reports", icon: FileSpreadsheet },
  { labelKey: "nav.admin", href: "/admin", icon: ShieldCheck },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between h-screen sticky top-0">
      <div>
        {/* Brand Block */}
        <div className="px-6 py-5 border-b border-slate-100">
          <Link href="/" className="inline-block">
            <Image
              src="/evraid.svg"
              alt="evRAID"
              width={140}
              height={61}
              priority
              className="h-8 w-auto object-contain"
            />
          </Link>
          <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mt-1">
            {t("brand.subtitle")}
          </div>
        </div>

        {/* Primary Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-slate-100 text-slate-900 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  {/* Active dot indicator */}
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      isActive ? "bg-emerald-600" : "bg-transparent"
                    )}
                  />
                  <Icon
                    className={cn(
                      "w-4 h-4",
                      isActive ? "text-emerald-600" : "text-slate-400"
                    )}
                  />
                  <span>{t(item.labelKey)}</span>
                </div>

                {item.badge && (
                  <span
                    className={cn(
                      "px-1.5 py-0.5 text-[11px] rounded tracking-wide",
                      item.badgeColor || "bg-slate-100 text-slate-700"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Workspace Footer Card */}
      <div className="p-4 border-t border-slate-100">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">
            <span>{t("workspace.title")}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="font-semibold text-slate-900 flex items-center gap-1.5 truncate">
            <Building2 className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span className="truncate">{t("workspace.operator")}</span>
          </div>
          <div className="text-slate-500 text-[11px] mt-0.5 flex items-center justify-between">
            <span>{t("workspace.fleet")}</span>
            <span className="text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.2 rounded text-[10px]">
              {t("workspace.plan")}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

