import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatVoltage(v: number): string {
  return `${v.toFixed(2)} V`;
}

export function formatCurrent(a: number): string {
  return `${a > 0 ? "+" : ""}${a.toFixed(1)} A`;
}

export function formatTemp(c: number): string {
  return `${c.toFixed(1)} °C`;
}

export function formatPercent(p: number): string {
  return `${p.toFixed(1)}%`;
}

export function formatCycles(efc: number): string {
  return Math.round(efc).toLocaleString();
}

