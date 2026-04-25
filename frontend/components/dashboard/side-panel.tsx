import type { MouseEvent } from "react";

type DashboardSidePanelProps = {
  onCloseMo: (event: MouseEvent<HTMLButtonElement>) => void;
};

function DetailKpi({ title, id, accent }: { title: string; id: string; accent: string }) {
  return (
    <div
      className="rounded-[7px] bg-[#101928] px-2.5 py-[7px]"
      style={{ borderLeft: `2px solid ${accent}` }}
    >
      <div className="mb-0.5 text-[8px] uppercase tracking-[0.6px] text-[#3d5275]">{title}</div>
      <div className="font-mono text-[13px] font-extrabold text-[#e8edf5]" id={id}>
        —
      </div>
    </div>
  );
}

function AnalyticsReportControls({
  formatId,
  buttonId,
  statusId,
}: {
  formatId: string;
  buttonId: string;
  statusId: string;
}) {
  return (
    <div className="mt-3 rounded-[10px] border border-[#1a2640] bg-[#0b1120] p-2.5">
      <div className="mb-2 text-[9px] font-bold uppercase tracking-[0.7px] text-[#3d5275]">
        Аналитическая справка
      </div>
      <div className="flex items-center gap-2">
        <select
          className="min-w-[86px] rounded border border-[#243352] bg-[#06090f] px-2 py-1 text-[10px] font-semibold text-[#d8e1ee] outline-none"
          defaultValue="pdf"
          id={formatId}
        >
          <option value="pdf">PDF</option>
          <option value="docx">Word</option>
        </select>
        <button
          className="flex-1 rounded border border-[#1d4ed8] bg-[#0f1f45] px-2 py-1 text-[10px] font-semibold text-[#dbeafe] transition-colors hover:border-[#60a5fa] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          id={buttonId}
          type="button"
        >
          Сформировать и выгрузить
        </button>
      </div>
      <div className="mt-1.5 min-h-[14px] text-[10px] text-[#3d5275]" id={statusId} />
    </div>
  );
}

export function DashboardSidePanel({ onCloseMo }: DashboardSidePanelProps) {
  return (
    <aside className="flex h-full w-full shrink-0 flex-col overflow-hidden border-l border-[#1a2640] bg-[#0c1220] md:w-[420px]">
      <div className="flex flex-1 flex-col items-center justify-center gap-2.5 text-xs text-[#3d5275]" id="sideEmpty">
        <svg fill="none" height="44" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" width="44">
          <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 13l4.553 2.276A1 1 0 0021 21.382V10.618a1 1 0 00-.553-.894L15 7m0 13V7m0 0L9 4" />
        </svg>
        <span>Выберите регион на карте или в таблице</span>
      </div>

      <div className="detail flex-1 overflow-y-auto" id="detRegion">
        <div className="shrink-0 border-b border-[#1a2640] bg-[#101928] px-4 py-3">
          <div className="mb-0.5 flex items-start justify-between gap-2">
            <div>
              <div className="text-[15px] font-extrabold text-[#e8edf5]" id="dRName">
                —
              </div>
              <div className="mt-0.5 text-[10px] text-[#3d5275]" id="dRSub">
                —
              </div>
            </div>
            <div id="dRBadge" />
          </div>
          <AnalyticsReportControls
            buttonId="analyticsRegionDownload"
            formatId="analyticsRegionFormat"
            statusId="analyticsRegionStatus"
          />
        </div>

        <div className="grid grid-cols-1 gap-[5px] p-3 sm:grid-cols-2">
          <DetailKpi accent="#2563eb" id="dRPop" title="Население" />
          <DetailKpi accent="#10b981" id="dRChg" title="Динамика периода" />
          <DetailKpi accent="#8b5cf6" id="dRB" title="Рождаемость" />
          <DetailKpi accent="#f59e0b" id="dRD" title="Смертность" />
          <DetailKpi accent="#ef4444" id="dRNat" title="Ест. прирост" />
          <DetailKpi accent="#06b6d4" id="dRM" title="Миграция" />
        </div>

        <div className="px-3 pb-1.5">
          <div className="ch-t">Динамика населения</div>
          <div className="relative h-[90px]"><canvas id="rLineC" /></div>
        </div>
        <div className="px-3 pb-1.5">
          <div className="ch-t">Демографические коэффициенты ‰</div>
          <div className="relative h-[90px]"><canvas id="rDemoC" /></div>
        </div>
        <div className="px-3 pb-1.5">
          <div className="ch-t">Топ-6 МО по населению</div>
          <div className="relative h-[90px]"><canvas id="rBarC" /></div>
        </div>
        <div className="px-3 pb-1.5">
          <div className="ch-t">Динамика топ-5 МО</div>
          <div className="relative h-[110px]"><canvas id="rCityC" /></div>
        </div>

        <div className="flex items-center justify-between border-y border-[#1a2640] bg-[#101928] px-[14px] py-[5px] text-[9px] font-bold uppercase tracking-[0.6px] text-[#3d5275]">
          Муниципальные образования
        </div>
        <div id="cityList" />
      </div>

      <div className="mo-detail flex-1 overflow-y-auto" id="detMO">
        <div className="shrink-0 border-b border-[#1a2640] bg-[#101928] px-4 py-3">
          <div className="mb-0.5 flex items-start justify-between gap-2">
            <div>
              <div className="text-[15px] font-extrabold text-[#e8edf5]" id="dMName">
                —
              </div>
              <div className="mt-0.5 text-[10px] text-[#3d5275]" id="dMSub">
                —
              </div>
            </div>
            <div id="dMBadge" />
          </div>
          <button
            className="rounded border border-[#243352] bg-[#06090f] px-2 py-0.5 text-[9px] font-semibold text-[#3b82f6] transition-colors hover:border-[#3b82f6]"
            onClick={onCloseMo}
            type="button"
          >
            ← Назад к региону
          </button>
          <AnalyticsReportControls
            buttonId="analyticsMunicipalityDownload"
            formatId="analyticsMunicipalityFormat"
            statusId="analyticsMunicipalityStatus"
          />
        </div>

        <div className="grid grid-cols-1 gap-[5px] p-3 sm:grid-cols-2">
          <DetailKpi accent="#2563eb" id="dMPop" title="Население" />
          <DetailKpi accent="#10b981" id="dMChg" title="Динамика" />
          <DetailKpi accent="#8b5cf6" id="dMB" title="Рождаемость" />
          <DetailKpi accent="#f59e0b" id="dMD" title="Смертность" />
          <DetailKpi accent="#ef4444" id="dMNat" title="Ест. прирост" />
          <DetailKpi accent="#06b6d4" id="dMM" title="Миграция" />
        </div>

        <div className="px-3 pb-1.5">
          <div className="ch-t">Динамика населения МО</div>
          <div className="relative h-[90px]"><canvas id="mLineC" /></div>
        </div>
        <div className="px-3 pb-1.5">
          <div className="ch-t">Демографические коэффициенты ‰</div>
          <div className="relative h-[90px]"><canvas id="mDemoC" /></div>
        </div>
      </div>
    </aside>
  );
}
