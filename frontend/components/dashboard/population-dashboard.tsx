"use client";

import { useEffect, type MouseEvent } from "react";
import Script from "next/script";
import { DashboardFilters } from "./filters";
import { DashboardHeader } from "./header";
import { DashboardKpiBar } from "./kpi-bar";
import { DashboardSidePanel } from "./side-panel";
import type { DashboardView, SortColumn } from "./types";
import { DashboardViews } from "./views";

declare global {
  interface Window {
    closeMO?: () => void;
    setPeriod?: (button: HTMLButtonElement) => void;
    sortTbl?: (column: SortColumn) => void;
    switchView?: (view: DashboardView) => void;
    __PF_API_BASE__?: string;
  }
}

export function PopulationDashboard() {
  useEffect(() => {
    window.__PF_API_BASE__ = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
  }, []);

  const handleSwitchView = (view: DashboardView) => {
    window.switchView?.(view);
  };

  const handleSetPeriod = (event: MouseEvent<HTMLButtonElement>) => {
    window.setPeriod?.(event.currentTarget);
  };

  const handleSort = (column: SortColumn) => {
    window.sortTbl?.(column);
  };

  const handleCloseMo = () => {
    window.closeMO?.();
  };

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[#06090f] text-[#e8edf5]">
      <DashboardHeader onSwitchView={handleSwitchView} />
      <DashboardFilters onSetPeriod={handleSetPeriod} />
      <DashboardKpiBar />

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <div className="min-h-0 flex-1 overflow-hidden">
          <DashboardViews onSort={handleSort} />
        </div>
        <DashboardSidePanel onCloseMo={handleCloseMo} />
      </main>

      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"
        strategy="afterInteractive"
      />
      <Script src="/population-dashboard.js?v=2026-04-25-2" strategy="lazyOnload" />
    </div>
  );
}
