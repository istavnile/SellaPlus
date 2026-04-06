'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';

interface DataPoint {
  date: string;
  grossSales: number;
  label: string;
}

interface SalesChartProps {
  data: any[]; // Daily sales data from API
  type: 'bar' | 'area';
  grouping: string; // 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'
}

const money = (n: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(n);

export function SalesChart({ data, type, grouping }: SalesChartProps) {
  
  // Aggregate data based on grouping
  const aggregated = useMemo(() => {
    if (!data.length) return [];
    
    const groups: Record<string, { total: number; label: string; date: string }> = {};

    data.forEach(d => {
       const date = new Date(d.date + 'T12:00:00');
       let key = '';
       let label = '';

       if (grouping === 'day') {
           key = d.date;
           label = date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
       } else if (grouping === 'week') {
           // Get start of week
           const start = new Date(date);
           start.setDate(date.getDate() - date.getDay());
           key = start.toISOString().split('T')[0];
           label = `Sem. ${start.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}`;
       } else if (grouping === 'month') {
           key = `${date.getFullYear()}-${date.getMonth() + 1}`;
           label = date.toLocaleDateString('es-PE', { month: 'short', year: 'numeric' });
       } else if (grouping === 'quarter') {
           const q = Math.floor(date.getMonth() / 3) + 1;
           key = `${date.getFullYear()}-Q${q}`;
           label = `Trim. ${q} ${date.getFullYear()}`;
       } else if (grouping === 'year') {
           key = `${date.getFullYear()}`;
           label = `${date.getFullYear()}`;
       } else {
           // Defaults to day if hour not supported by data
           key = d.date;
           label = date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
       }

       if (!groups[key]) groups[key] = { total: 0, label, date: d.date };
       groups[key].total += Number(d.grossSales || 0);
    });

    return Object.values(groups).sort((a,b) => a.date.localeCompare(b.date)).slice(-30);
  }, [data, grouping]);

  const maxVal = useMemo(() => Math.max(...aggregated.map(v => v.total), 1), [aggregated]);

  // SVG Calculations
  const width  = 800;
  const height = 240;
  const pl = 80;
  const pr = 30;
  const pt = 20;
  const pb = 40;
  const chartW = width - pl - pr;
  const chartH = height - pt - pb;

  const points = useMemo(() => {
    return aggregated.map((d, i) => {
      const x = pl + (i * (chartW / Math.max(aggregated.length - 1, 1)));
      const y = height - pb - (d.total / maxVal) * chartH;
      return { x, y, val: d.total, label: d.label };
    });
  }, [aggregated, maxVal, chartW, chartH]);

  const areaPath = useMemo(() => {
    if (points.length < 2) return { line: "", area: "" };
    let d = `M ${points[0].x} ${points[0].y}`;
    points.slice(1).forEach(p => {
       d += ` L ${p.x} ${p.y}`;
    });
    // For area, close the path to the bottom
    const closed = `${d} L ${points[points.length-1].x} ${height - pb} L ${points[0].x} ${height - pb} Z`;
    return { line: d, area: closed };
  }, [points, height, pb]);

  return (
    <div className="w-full flex flex-col pt-5 relative min-h-[300px]">
       {aggregated.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">Sin datos para mostrar</div>
       ) : (
          <>
            <div className="relative flex-1 overflow-visible">
               <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                  {/* Grid lines & Y-Axis Labels */}
                  {[0, 0.25, 0.5, 0.75, 1].map(v => {
                    const yPos = height - pb - v * chartH;
                    return (
                      <g key={v}>
                        <text x={pl - 12} y={yPos + 4} fontSize="11" fill="#9ca3af" textAnchor="end" className="font-medium tracking-tight">
                          {money(maxVal * v)}
                        </text>
                        <line 
                          x1={pl} y1={yPos}
                          x2={width - pr} y2={yPos}
                          stroke="#f1f5f9" strokeWidth="1"
                        />
                      </g>
                    );
                  })}

                  {type === 'area' && (
                    <>
                      <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d={areaPath.area} fill="url(#areaGradient)" />
                      <path d={areaPath.line} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      
                      {/* Dots */}
                      {points.map((p, i) => (
                        <g key={i} className="group/dot cursor-pointer">
                           <circle cx={p.x} cy={p.y} r="4" fill="white" stroke="#2563eb" strokeWidth="2" className="transition-all group-hover/dot:r-6" />
                           <title>{p.label}: {money(p.val)}</title>
                        </g>
                      ))}
                    </>
                  )}

                  {type === 'bar' && (
                    points.map((p, i) => {
                      const barW = (chartW / aggregated.length) * 0.7;
                      return (
                        <rect 
                          key={i}
                          x={p.x - barW/2}
                          y={p.y}
                          width={barW}
                          height={Math.max(0, height - pb - p.y)}
                          fill="#2563eb"
                          rx="2"
                          className="hover:fill-blue-700 transition-colors cursor-pointer"
                        >
                          <title>{p.label}: {money(p.val)}</title>
                        </rect>
                      );
                    })
                  )}
               </svg>
            </div>

            {/* Labels */}
            <div className="absolute bottom-0 w-full flex justify-between px-2 overflow-hidden" style={{ paddingLeft: `${(pl/width)*100}%`, paddingRight: `${(pr/width)*100}%` }}>
               {aggregated.filter((_, i) => aggregated.length < 10 || i % Math.ceil(aggregated.length / 8) === 0).map((d, i) => (
                  <span key={i} className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">{d.label}</span>
               ))}
            </div>
          </>
       )}
    </div>
  );
}
