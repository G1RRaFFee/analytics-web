import dynamic from "next/dynamic";
import type { SortColumn } from "./types";

const DashboardMap = dynamic(
  () => import("./dashboard-map").then((module) => module.DashboardMap),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-[#040810] text-[#8494aa]">
        Загрузка карты...
      </div>
    ),
  },
);

interface SortHeadProps {
  label: string;
  onClick: () => void;
}

const SortHead = ({ label, onClick }: SortHeadProps) => {
  return (
    <span className="cursor-pointer text-right transition-colors hover:text-[#e8edf5]" onClick={onClick}>
      {label} ↕
    </span>
  );
};

interface DashboardViewsProps {
  onSort: (col: SortColumn) => void;
}

export function DashboardViews({ onSort }: DashboardViewsProps) {
  return (
    <section className="relative h-full min-h-[420px]">
      <DashboardMap />

      <div className="absolute inset-0 flex flex-col" id="tableView">
        <div className="grid shrink-0 grid-cols-[1.6fr_80px_75px_60px_60px_60px_70px] border-b border-[#1a2640] bg-[#101928] px-[14px] py-[7px] text-[9px] font-bold uppercase tracking-[0.6px] text-[#3d5275]">
          <span>МО / Регион</span>
          <SortHead label="Население" onClick={() => onSort("pop")} />
          <SortHead label="Динамика" onClick={() => onSort("change")} />
          <SortHead label="Рожд." onClick={() => onSort("b")} />
          <SortHead label="Смерт." onClick={() => onSort("d")} />
          <SortHead label="Мигр." onClick={() => onSort("m")} />
          <SortHead label="Ест.пр" onClick={() => onSort("nat")} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto" id="tblBody" />
      </div>

      <div className="absolute inset-0 flex flex-col" id="topsView">
        <div className="shrink-0 border-b border-[#1a2640] bg-[#101928] px-[14px] py-2 text-[9px] font-bold uppercase tracking-[0.8px] text-[#3d5275]">
          Муниципалитеты с наибольшим ростом / снижением населения за период
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-2">
          <div className="min-h-0 overflow-y-auto border-r border-[#1a2640]">
            <div className="sticky top-0 border-b border-[#1a2640] bg-[#141f30] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.6px] text-[#3d5275]">
              ▲ Наибольший рост
            </div>
            <div id="topGrowth" />
          </div>
          <div className="min-h-0 overflow-y-auto">
            <div className="sticky top-0 border-b border-[#1a2640] bg-[#141f30] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.6px] text-[#3d5275]">
              ▼ Наибольшее снижение
            </div>
            <div id="topDecline" />
          </div>
        </div>
      </div>
    </section>
  );
}
