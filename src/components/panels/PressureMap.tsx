import { useState, useMemo } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import type { PressureData, CountryPressure, PressureTier } from '../../types';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const NUMERIC_TO_ISO: Record<string, string> = {
  '840': 'US', '124': 'CA', '826': 'GB', '276': 'DE', '528': 'NL',
  '36':  'AU', '554': 'NZ', '250': 'FR', '380': 'IT', '410': 'KR',
  '76':  'BR', '710': 'ZA', '208': 'DK', '756': 'CH', '752': 'SE',
  '246': 'FI', '724': 'ES', '620': 'PT', '158': 'TW', '344': 'HK',
  '608': 'PH', '156': 'CN',
};

const TIER_COLORS: Record<PressureTier, string> = {
  Critical: '#dc2626',
  High:     '#f59e0b',
  Medium:   '#1d4ed8',
  Low:      '#1e3a5f',
};

const NO_DATA_COLOR = '#1e293b';

interface TooltipState {
  x: number;
  y: number;
  country: CountryPressure;
}

interface Props {
  pressure: PressureData;
  showTrueVacanciesOnly: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GeoFeature = Record<string, any>;

function tierBadgeClass(tier: PressureTier): string {
  const map: Record<PressureTier, string> = {
    Critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    High:     'bg-amber-500/20 text-amber-400 border-amber-500/30',
    Medium:   'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Low:      'bg-slate-700/40 text-slate-400 border-slate-600/40',
  };
  return `inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${map[tier]}`;
}

export default function PressureMap({ pressure }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const countryMap = useMemo(() => {
    const m: Record<string, CountryPressure> = {};
    for (const c of pressure.countries) m[c.iso_code] = c;
    return m;
  }, [pressure.countries]);

  const { global_summary: gs } = pressure;
  const highestCountry = pressure.countries.find((c) => c.iso_code === gs.highest_pressure_country);

  return (
    <div className="space-y-4">
      {/* Summary callouts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Highest Pressure Market</p>
          <p className="text-white text-lg font-bold">
            {highestCountry?.country_name ?? gs.highest_pressure_country}
          </p>
          {highestCountry && (
            <p className="text-slate-400 text-sm">
              Pressure score:{' '}
              <span className="text-red-400 font-semibold">{highestCountry.pressure_score.toFixed(1)}</span>
              {' · '}{highestCountry.req_count} reqs · {highestCountry.total_openings} openings
            </p>
          )}
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Critical Markets</p>
          <p className="text-white text-lg font-bold">
            {gs.critical_count} {gs.critical_count === 1 ? 'country' : 'countries'}
          </p>
          <p className="text-slate-400 text-sm">
            require urgent sourcing attention · {gs.high_count} additional high-pressure markets
          </p>
        </div>
      </div>

      {/* Map */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 relative overflow-hidden">
        {/* Legend */}
        <div className="flex items-center gap-4 px-3 pt-2 pb-1 flex-wrap">
          {(['Low', 'Medium', 'High', 'Critical'] as PressureTier[]).map((tier) => (
            <div key={tier} className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: TIER_COLORS[tier] }} />
              <span className="text-slate-400 text-xs">{tier}</span>
            </div>
          ))}
          <span className="flex items-center gap-1.5 ml-auto">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: NO_DATA_COLOR }} />
            <span className="text-slate-500 text-xs">No data</span>
          </span>
        </div>

        <ComposableMap projectionConfig={{ scale: 140 }} style={{ width: '100%', height: 'auto' }}>
          <Geographies geography={GEO_URL}>
            {({ geographies }: { geographies: GeoFeature[] }) =>
              geographies.map((geo: GeoFeature) => {
                const numericId = String(parseInt(String(geo.id)));
                const iso       = NUMERIC_TO_ISO[numericId];
                const data      = iso ? countryMap[iso] : undefined;
                const fill      = data ? TIER_COLORS[data.pressure_tier] : NO_DATA_COLOR;
                const hasData   = !!data;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fill}
                    stroke={hasData ? '#475569' : '#1e293b'}
                    strokeWidth={hasData ? 0.8 : 0.3}
                    style={{
                      default: { outline: 'none' },
                      hover:   { outline: 'none', opacity: 0.8, cursor: hasData ? 'pointer' : 'default' },
                      pressed: { outline: 'none' },
                    }}
                    onMouseEnter={(e: React.MouseEvent) => {
                      if (data) setTooltip({ x: e.clientX, y: e.clientY, country: data });
                    }}
                    onMouseMove={(e: React.MouseEvent) => {
                      if (data) setTooltip((t) => t ? { ...t, x: e.clientX, y: e.clientY } : null);
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>

        {tooltip && (
          <div
            className="fixed z-50 pointer-events-none bg-slate-800 border border-slate-600 rounded-lg shadow-xl px-3 py-2 text-xs"
            style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
          >
            <p className="text-white font-semibold text-sm mb-1">{tooltip.country.country_name}</p>
            <p className="text-slate-300">
              Pressure score:{' '}
              <span className="text-white font-bold">{tooltip.country.pressure_score.toFixed(1)}</span>
            </p>
            <p className="text-slate-300">
              {tooltip.country.req_count} reqs · {tooltip.country.total_openings} openings
            </p>
            <p className="text-slate-300">Median days open: {tooltip.country.median_days_open}</p>
            <div className="mt-1">
              <span className={tierBadgeClass(tooltip.country.pressure_tier)}>
                {tooltip.country.pressure_tier}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Country table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">Country</th>
              <th className="text-right px-4 py-3">Reqs</th>
              <th className="text-right px-4 py-3 hidden sm:table-cell">Openings</th>
              <th className="text-right px-4 py-3 hidden md:table-cell">Median Days</th>
              <th className="text-right px-4 py-3">Score</th>
              <th className="text-center px-4 py-3">Tier</th>
            </tr>
          </thead>
          <tbody>
            {pressure.countries.map((c) => (
              <tr
                key={c.iso_code}
                className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
              >
                <td className="px-4 py-2.5 text-white font-medium">
                  <span className="text-slate-500 text-xs mr-2">{c.iso_code}</span>
                  {c.country_name}
                </td>
                <td className="px-4 py-2.5 text-right text-slate-300">{c.req_count}</td>
                <td className="px-4 py-2.5 text-right text-slate-300 hidden sm:table-cell">
                  {c.total_openings}
                </td>
                <td className="px-4 py-2.5 text-right text-slate-300 hidden md:table-cell">
                  {c.median_days_open}d
                </td>
                <td className="px-4 py-2.5 text-right font-semibold text-white">
                  {c.pressure_score.toFixed(1)}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className={tierBadgeClass(c.pressure_tier)}>{c.pressure_tier}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
