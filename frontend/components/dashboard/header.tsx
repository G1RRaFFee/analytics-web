import type { DashboardView } from "./types";

type DashboardHeaderProps = {
  onSwitchView: (view: DashboardView) => void;
};

export function DashboardHeader({ onSwitchView }: DashboardHeaderProps) {
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[#1a2640] bg-gradient-to-r from-[#0c1220] to-[#0f1a2e] px-4 py-2 sm:px-[18px]">
      <div className="pulse h-2 w-2 shrink-0 rounded-full bg-[#10b981]" />
      <div>
        <h1 className="text-sm font-extrabold text-[#e8edf5]">
          Мониторинг численности населения РФ - КЦтон 2026
        </h1>
        <p className="text-[10px] text-[#3d5275]">
          Данные Росстат • Проекция Lambert Conformal Conic • По методу из Хабр
        </p>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex rounded-lg border border-[#1a2640] bg-[#06090f] p-[3px]">
          <button
            className="view-tab active rounded-md px-3 py-[5px] text-[11px] font-semibold text-[#3d5275] transition-colors"
            id="tabMap"
            onClick={() => onSwitchView("map")}
            type="button"
          >
            Тепловая карта
          </button>
          <button
            className="view-tab rounded-md px-3 py-[5px] text-[11px] font-semibold text-[#3d5275] transition-colors"
            id="tabTable"
            onClick={() => onSwitchView("table")}
            type="button"
          >
            Таблица
          </button>
          <button
            className="view-tab rounded-md px-3 py-[5px] text-[11px] font-semibold text-[#3d5275] transition-colors"
            id="tabTops"
            onClick={() => onSwitchView("tops")}
            type="button"
          >
            Топы МО
          </button>
        </div>
      </div>
    </header>
  );
}
