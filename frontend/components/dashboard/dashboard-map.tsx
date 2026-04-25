export function DashboardMap() {
  return (
    <div className="absolute inset-0 flex flex-col" id="mapView">
      <div className="relative flex-1 overflow-hidden bg-[#040810]" id="mapCtr">
        <svg className="absolute inset-0 h-full w-full" id="mapSvg" xmlns="http://www.w3.org/2000/svg">
          <g id="regG" />
        </svg>
      </div>
      <div id="tip" />
    </div>
  );
}
