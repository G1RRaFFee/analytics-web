function KpiCard({
  title,
  valueId,
  subId,
  accent,
  subText,
}: {
  title: string;
  valueId: string;
  subId?: string;
  accent: string;
  subText?: string;
}) {
  return (
    <div
      className="min-w-[118px] shrink-0 rounded-[7px] border border-[#1a2640] bg-[#0c1220] px-2.5 py-1.5"
      style={{ borderLeft: `2px solid ${accent}` }}
    >
      <div className="mb-0.5 text-[8px] uppercase tracking-[0.6px] text-[#3d5275]">{title}</div>
      <div className="font-mono text-sm font-extrabold text-[#e8edf5]" id={valueId}>
        —
      </div>
      {subId ? (
        <div className="mt-px text-[8px] text-[#8494aa]" id={subId} />
      ) : (
        <div className="mt-px text-[8px] text-[#8494aa]">{subText}</div>
      )}
    </div>
  );
}

export function DashboardKpiBar() {
  return (
    <section className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-[#1a2640] px-4 py-1.5 sm:px-[18px]">
      <KpiCard accent="#2563eb" subId="kTotalSub" title="Население РФ" valueId="kTotal" />
      <KpiCard accent="#10b981" subId="kPSub" title="Динамика периода" valueId="kChange" />
      <KpiCard accent="#8b5cf6" subText="на 1000 чел. ‰" title="Ср. рождаемость" valueId="kBirth" />
      <KpiCard accent="#f59e0b" subText="на 1000 чел. ‰" title="Ср. смертность" valueId="kDeath" />
      <KpiCard accent="#ef4444" subText="рожд. - смерт. ‰" title="Ест. прирост" valueId="kNat" />
      <KpiCard accent="#06b6d4" subText="на 1000 чел. ‰" title="Ср. миграция" valueId="kMig" />
      <KpiCard accent="#84cc16" subId="kGrowSub" title="Растущих регионов" valueId="kGrow" />
    </section>
  );
}
