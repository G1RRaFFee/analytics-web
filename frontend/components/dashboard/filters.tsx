import type { MouseEvent } from "react";

type DashboardFiltersProps = {
  onSetPeriod: (event: MouseEvent<HTMLButtonElement>) => void;
};

export function DashboardFilters({ onSetPeriod }: DashboardFiltersProps) {
  return (
    <section className="flex shrink-0 flex-wrap items-end gap-2 border-b border-[#1a2640] bg-[#0c1220] px-4 py-[7px] sm:px-[18px]">
      <div className="flex flex-col gap-0.5">
        <p className="text-[9px] font-bold uppercase tracking-[0.8px] text-[#3d5275]">
          Поиск МО / региона
        </p>
        <div className="srch-wrap relative">
          <input
            autoComplete="off"
            className="h-8 w-[200px] rounded-[7px] border border-[#243352] bg-[#06090f] px-[10px] text-xs text-[#e8edf5] outline-none transition-colors focus:border-[#3b82f6]"
            id="srchInp"
            placeholder="Начните вводить..."
            type="text"
          />
          <div
            className="srch-dd absolute left-0 top-full z-[500] max-h-[200px] w-[300px] overflow-y-auto rounded-b-lg border border-[#243352] bg-[#101928]"
            id="srchDd"
          />
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        <p className="text-[9px] font-bold uppercase tracking-[0.8px] text-[#3d5275]">Субъект РФ</p>
        <select
          className="min-w-[120px] cursor-pointer rounded-[7px] border border-[#243352] bg-[#06090f] px-2 py-[5px] text-xs text-[#e8edf5] outline-none transition-colors hover:border-[#3b82f6]"
          id="regFilter"
        >
          <option value="">Все регионы</option>
        </select>
      </div>

      <div className="flex flex-col gap-0.5">
        <p className="text-[9px] font-bold uppercase tracking-[0.8px] text-[#3d5275]">Тип МО</p>
        <select
          className="min-w-[120px] cursor-pointer rounded-[7px] border border-[#243352] bg-[#06090f] px-2 py-[5px] text-xs text-[#e8edf5] outline-none transition-colors hover:border-[#3b82f6]"
          id="typeFilter"
        >
          <option value="">Все типы</option>
        </select>
      </div>

      <div className="flex flex-col gap-0.5">
        <p className="text-[9px] font-bold uppercase tracking-[0.8px] text-[#3d5275]">Год</p>
        <div className="flex items-center gap-1.5">
          <div
            className="font-mono min-w-[52px] rounded-md border border-[#2563eb] bg-[#06090f] px-[10px] py-0.5 text-center text-base font-bold text-[#3b82f6]"
            id="yrBadge"
          >
            2023
          </div>
          <input
            className="h-1 w-[150px] cursor-pointer appearance-none rounded bg-[#243352]"
            id="yrSlider"
            max="2023"
            min="2010"
            step="1"
            type="range"
            defaultValue="2023"
          />
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        <p className="text-[9px] font-bold uppercase tracking-[0.8px] text-[#3d5275]">Период динамики</p>
        <div className="flex gap-[3px]">
          <button
            className="period-btn active rounded-[5px] border border-[#243352] bg-[#06090f] px-2 py-1 text-[10px] font-semibold text-[#3d5275] transition-colors"
            data-p="2015-2023"
            onClick={onSetPeriod}
            type="button"
          >
            2015→23
          </button>
          <button
            className="period-btn rounded-[5px] border border-[#243352] bg-[#06090f] px-2 py-1 text-[10px] font-semibold text-[#3d5275] transition-colors"
            data-p="2020-2023"
            onClick={onSetPeriod}
            type="button"
          >
            2020→23
          </button>
          <button
            className="period-btn rounded-[5px] border border-[#243352] bg-[#06090f] px-2 py-1 text-[10px] font-semibold text-[#3d5275] transition-colors"
            data-p="2015-2020"
            onClick={onSetPeriod}
            type="button"
          >
            2015→20
          </button>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-[5px]" id="mapLeg">
        <span className="text-[9px] text-[#3d5275]">Убыль</span>
        <div
          className="h-[9px] w-[100px] rounded border border-[#243352]"
          style={{
            background:
              "linear-gradient(to right, #ef4444, #f59e0b, #3b82f6, #10b981)",
          }}
        />
        <span className="text-[9px] text-[#3d5275]">Рост</span>
      </div>
    </section>
  );
}
