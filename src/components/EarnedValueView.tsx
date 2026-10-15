import React, { useMemo } from 'react';
import { Activity, TrendingUp } from 'lucide-react';
import { Project } from '../types/apu';
import { calculateEarnedValue, earnedValueTimeline } from '../utils/earnedValue';

interface EarnedValueViewProps { project: Project; }

export const EarnedValueView: React.FC<EarnedValueViewProps> = ({ project }) => {
  const metrics = useMemo(() => calculateEarnedValue(project), [project]);
  const timeline = useMemo(() => earnedValueTimeline(project), [project]);
  const money = (value: number) => value.toLocaleString('es-MX', { style: 'currency', currency: project.currency });
  return <section className="max-w-7xl mx-auto px-4 lg:px-6 py-6"><div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
    <div className="flex items-center gap-2 mb-5"><Activity className="w-5 h-5 text-violet-600" /><div><h1 className="text-base font-bold">Valor ganado y desempeño</h1><p className="text-xs text-slate-500 mt-1">Indicadores calculados con la programación y las estimaciones disponibles.</p></div></div>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">{[['PV', money(metrics.plannedValue)], ['EV', money(metrics.earnedValue)], ['AC', money(metrics.actualCost)], ['SPI', metrics.spi.toFixed(2)], ['CPI', metrics.cpi.toFixed(2)]].map(([label, value]) => <div key={label} className="border rounded-lg p-3"><div className="text-[11px] text-slate-500 font-semibold">{label}</div><div className="text-lg font-mono font-bold text-slate-900 mt-1">{value}</div></div>)}</div>
    <div className="border rounded-lg p-4"><div className="flex justify-between text-xs mb-2"><span className="font-semibold">Avance físico ponderado</span><span>{metrics.progress.toFixed(1)}%</span></div><div className="h-4 bg-slate-100 rounded overflow-hidden"><div className="h-full bg-violet-500" style={{ width: `${Math.min(100, metrics.progress)}%` }} /></div><p className="text-xs text-slate-500 mt-3 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" />PV y EV usan importes de actividades vinculadas; AC usa estimaciones registradas. Vinculadas: {metrics.linkedTasks}. Sin vincular: {metrics.unlinkedTasks}.</p></div>
    <div className="border rounded-lg p-4 mt-4"><h2 className="text-xs font-semibold text-slate-700 mb-3">Curva S acumulada</h2>{timeline.length === 0 ? <p className="text-xs text-slate-400">Vincula actividades con fechas e importes para generar la curva.</p> : <div className="space-y-2">{timeline.reduce<Array<{ date: string; planned: number; earned: number }>>((points, point) => { const previous = points[points.length - 1]; points.push({ date: point.date, planned: (previous?.planned || 0) + point.planned, earned: (previous?.earned || 0) + point.earned }); return points; }, []).map((point) => <div key={point.date} className="grid grid-cols-[100px_1fr_90px_90px] items-center gap-2 text-xs"><span className="text-slate-500">{point.date}</span><div className="h-3 bg-slate-100 rounded overflow-hidden"><div className="h-full bg-violet-400" style={{ width: `${metrics.plannedValue ? point.earned / metrics.plannedValue * 100 : 0}%` }} /></div><span className="text-right text-slate-600">EV {money(point.earned)}</span><span className="text-right text-slate-500">PV {money(point.planned)}</span></div>)}</div>}</div>
  </div></section>;
};
