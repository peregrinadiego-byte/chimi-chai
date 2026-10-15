/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Table,
  Plus,
  Trash2,
  FileSpreadsheet,
  ChevronRight
} from 'lucide-react';
import { Project } from '../types/apu';

export interface CPMActivity {
  key: string;
  name: string;
  pred: string;
  duration: number;
  es?: number;
  ef?: number;
  ls?: number;
  lf?: number;
  slack?: number;
  critical?: boolean;
  linkedWbsCode?: string;
}

interface ScheduleCPMViewProps {
  project: Project;
  onUpdateProjectSchedule?: (activities: CPMActivity[]) => void;
}

export const ScheduleCPMView: React.FC<ScheduleCPMViewProps> = ({ project }) => {
  const [activeSubTab, setActiveSubTab] = useState<'gantt' | 'cpm' | 'network' | 'activities'>('gantt');
  const [startDate, setStartDate] = useState<string>(project.scheduleStartDate || project.date || new Date().toISOString().split('T')[0]);
  const [calendarMode, setCalendarMode] = useState<'natural' | 'working'>(project.scheduleCalendarMode || 'natural');

  // Activities state initialized with standard construction activities or generated from project WBS
  const [activities, setActivities] = useState<CPMActivity[]>(() => {
    if (project.schedule && project.schedule.length > 0) {
      return project.schedule.map((task) => ({
        key: task.id,
        name: task.name,
        pred: task.predecessorId || '',
        duration: task.durationDays,
        linkedWbsCode: task.linkedWbsId,
      }));
    }
    // Generate from WBS chapters if available
    if (project.wbs && project.wbs.length > 0) {
      const leaves: Array<{ code: string; name: string; totalPrice: number; linkedWbsCode: string }> = [];
      const visit = (nodes: typeof project.wbs) => nodes.forEach((node) => {
        if (node.children?.length) visit(node.children);
        else if (node.type === 'concept') leaves.push({
          code: node.code,
          name: node.name,
          totalPrice: node.totalPrice || 0,
          linkedWbsCode: node.id,
        });
      });
      visit(project.wbs);
      let prevKey = '';
      return (leaves.length ? leaves : project.wbs).map((ch: any, idx) => {
        const key = `ACT-${ch.code || idx + 1}-${idx + 1}`;
        const act: CPMActivity = {
          key,
          name: ch.name,
          pred: prevKey,
          duration: Math.max(1, Math.min(60, Math.round(((ch.totalPrice || 10000) / 20000) * 5) || 5)),
          linkedWbsCode: ch.linkedWbsCode || ch.code,
        };
        prevKey = key;
        return act;
      });
    }

    return [
      { key: 'C1', name: 'Preliminares y Trazo', pred: '', duration: 8 },
      { key: 'C2', name: 'Excavaciones y Cimentación', pred: 'C1', duration: 14 },
      { key: 'C3', name: 'Estructura y Columnas', pred: 'C2', duration: 21 },
      { key: 'C4', name: 'Muros y Albañilería', pred: 'C3', duration: 28 },
      { key: 'C5', name: 'Instalaciones Ocultas', pred: 'C3', duration: 15 },
      { key: 'C6', name: 'Losas y Cubiertas', pred: 'C4', duration: 12 },
      { key: 'C7', name: 'Acabados y Aplanados', pred: 'C6', duration: 20 },
      { key: 'C8', name: 'Pisos y Azulejos', pred: 'C7', duration: 10 },
      { key: 'C9', name: 'Carpintería y Cancelería', pred: 'C8', duration: 8 },
      { key: 'C10', name: 'Limpieza y Entrega', pred: 'C9', duration: 4 },
    ];
  });

  // The schedule is part of the project, so edits survive navigation and restart.
  React.useEffect(() => {
    const allNodes: any[] = [];
    const collect = (nodes: any[]) => nodes.forEach((node) => { allNodes.push(node); if (node.children) collect(node.children); });
    collect(project.wbs);
    const totalBudget = allNodes.reduce((sum, node) => sum + (node.type === 'concept' ? Number(node.totalPrice || 0) : 0), 0);
    const schedule = activities.map((activity) => ({
      id: activity.key,
      code: activity.key,
      name: activity.name,
      predecessorId: activity.pred || undefined,
      durationDays: Math.max(1, Number(activity.duration) || 1),
      progress: 0,
      weight: totalBudget > 0 ? Number(((allNodes.find((node) => node.id === activity.linkedWbsCode)?.totalPrice || 0) / totalBudget * 100).toFixed(4)) : 0,
      status: 'planeado' as const,
      linkedWbsId: activity.linkedWbsCode,
    }));
    const serialized = JSON.stringify(schedule);
    if (JSON.stringify(project.schedule || []) !== serialized) {
      window.dispatchEvent(new CustomEvent('ezapu:schedule-updated', { detail: { schedule, startDate, calendarMode } }));
    }
  }, [activities, project.schedule, project.wbs, startDate, calendarMode]);

  // Topological sorting for cycle detection and sequential computation
  const sortedActivities = useMemo(() => {
    const map = new Map<string, CPMActivity>(activities.map((a) => [a.key, a]));
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: CPMActivity[] = [];

    function visit(k: string) {
      if (visited.has(k)) return;
      if (visiting.has(k)) throw new Error(`Ciclo de dependencias detectado en ${k}`);
      visiting.add(k);
      const a = map.get(k);
      if (a) {
        if (a.pred && map.has(a.pred)) {
          visit(a.pred);
        }
        visiting.delete(k);
        visited.add(k);
        result.push(a);
      }
    }

    try {
      activities.forEach((a) => visit(a.key));
      return { sorted: result, hasCycle: false, cycleError: '' };
    } catch (err: any) {
      return { sorted: activities, hasCycle: true, cycleError: err.message };
    }
  }, [activities]);

  // Compute CPM (Early start, Early finish, Late start, Late finish, Slack, Criticality)
  const cpmRows = useMemo(() => {
    if (sortedActivities.hasCycle) return [];
    const ordered = sortedActivities.sorted;
    const byKey: Record<string, CPMActivity> = {};
    ordered.forEach((a) => {
      byKey[a.key] = { ...a };
    });

    // Forward pass
    ordered.forEach((a) => {
      const es = a.pred && byKey[a.pred] ? byKey[a.pred].ef || 0 : 0;
      byKey[a.key].es = es;
      byKey[a.key].ef = es + Number(a.duration || 0);
    });

    const projectDuration = Math.max(...ordered.map((a) => byKey[a.key].ef || 0), 0);

    // Backward pass
    const succ: Record<string, string[]> = {};
    ordered.forEach((a) => (succ[a.key] = []));
    ordered.forEach((a) => {
      if (a.pred && succ[a.pred]) succ[a.pred].push(a.key);
    });

    [...ordered].reverse().forEach((a) => {
      const s = succ[a.key] || [];
      const lf = s.length ? Math.min(...s.map((k) => byKey[k].ls ?? projectDuration)) : projectDuration;
      byKey[a.key].lf = lf;
      byKey[a.key].ls = lf - Number(a.duration || 0);
      byKey[a.key].slack = (byKey[a.key].ls || 0) - (byKey[a.key].es || 0);
      byKey[a.key].critical = Math.abs(byKey[a.key].slack || 0) < 1e-6;
    });

    return ordered.map((a) => byKey[a.key]);
  }, [sortedActivities]);

  // Date calculation helper
  const addDays = (base: string, days: number, mode: 'natural' | 'working') => {
    const d = new Date(base + 'T00:00:00');
    if (days === 0) return d;
    if (mode === 'natural') {
      d.setDate(d.getDate() + days);
      return d;
    }
    let count = 0;
    while (count < days) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0) count++; // skip sundays
    }
    return d;
  };

  const projectTotalDays = useMemo(() => {
    return Math.max(...cpmRows.map((r) => r.ef || 0), 0);
  }, [cpmRows]);

  const criticalActivitiesCount = useMemo(() => {
    return cpmRows.filter((r) => r.critical).length;
  }, [cpmRows]);

  // Generate activities automatically from current Project's WBS
  const handleRegenerateFromWBS = () => {
    if (!project.wbs || project.wbs.length === 0) {
      alert('No se encontraron capítulos en el WBS del presupuesto activo.');
      return;
    }

    let prevKey = '';
    const generated: CPMActivity[] = [];

    // Check if chapters exist, otherwise use concepts
    project.wbs.forEach((ch, idx) => {
      const key = `ACT-${ch.code || idx + 1}`;
      generated.push({
        key,
        name: ch.name,
        pred: prevKey,
        duration: Math.max(5, Math.min(30, Math.round(((ch.totalPrice || 10000) / 25000) * 5) || 10)),
        linkedWbsCode: ch.code,
      });
      prevKey = key;
    });

    setActivities(generated);
  };

  // Add empty activity
  const handleAddActivity = () => {
    const key = `A-${activities.length + 1}`;
    const lastKey = activities.length > 0 ? activities[activities.length - 1].key : '';
    setActivities([
      ...activities,
      {
        key,
        name: 'Nueva Actividad de Obra',
        pred: lastKey,
        duration: 7,
      },
    ]);
  };

  const handleUpdateActivity = (index: number, field: keyof CPMActivity, value: any) => {
    const updated = [...activities];
    updated[index] = { ...updated[index], [field]: value };
    setActivities(updated);
  };

  const handleDeleteActivity = (index: number) => {
    const toDeleteKey = activities[index].key;
    const updated = activities
      .filter((_, i) => i !== index)
      .map((a) => (a.pred === toDeleteKey ? { ...a, pred: '' } : a));
    setActivities(updated);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
      {/* Top Banner & KPIs */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-orange-50 text-orange-700 rounded-md border border-orange-200">
                <Calendar className="w-4 h-4" />
              </span>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Programa de Obra & Método de Ruta Crítica (CPM)
              </h1>
              <span className="text-xs bg-orange-100 text-orange-800 font-semibold px-2 py-0.5 rounded-full">
                {activities.length} Actividades
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Vinculación automática con partidas de presupuesto, holguras tempranas/tardías y visualización interactiva de Gantt y Red.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const lines = [
                  '"Clave","Actividad","Predecesora","Duración (días)","Inicio Temprano (ES)","Término Temprano (EF)","Inicio Tardío (LS)","Término Tardío (LF)","Holgura (Slack)","Ruta Crítica"',
                  ...cpmRows.map(
                    (r) =>
                      `"${r.key}","${r.name.replace(/"/g, '""')}","${r.pred || ''}","${r.duration}","${r.es}","${r.ef}","${r.ls}","${r.lf}","${r.slack}","${r.critical ? 'CRÍTICA' : 'NO'}"`
                  ),
                ];
                const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `EZAPU_Programa_Obra_CPM_${project.code}_${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              title="Descargar programa y análisis CPM en archivo CSV"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={handleRegenerateFromWBS}
              title="Sincronizar duraciones y actividades a partir de los capítulos del presupuesto"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Sincronizar desde WBS</span>
            </button>

            <button
              onClick={handleAddActivity}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar Tarea</span>
            </button>
          </div>
        </div>

        {/* Schedule Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-100">
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Duración Total del Proyecto
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-bold font-mono text-slate-900">{projectTotalDays}</span>
              <span className="text-xs text-slate-500">días calendario</span>
            </div>
          </div>

          <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200/80">
            <span className="text-[10px] font-semibold text-rose-700 uppercase tracking-wider block">
              Actividades en Ruta Crítica
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-bold font-mono text-rose-800">{criticalActivitiesCount}</span>
              <span className="text-xs text-rose-600">sin holgura (0 días)</span>
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Fecha de Inicio Prevista
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs font-semibold bg-transparent text-slate-900 border-0 focus:outline-none cursor-pointer mt-0.5 font-mono"
            />
          </div>

          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Modo de Calendario
            </span>
            <select
              value={calendarMode}
              onChange={(e) => setCalendarMode(e.target.value as any)}
              className="text-xs font-semibold bg-transparent text-slate-900 border-0 focus:outline-none cursor-pointer mt-0.5"
            >
              <option value="natural">Días Naturales (Continuos)</option>
              <option value="working">Días Laborables (Lunes a Sábado)</option>
            </select>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 mt-4 pt-3 border-t border-slate-100 text-xs font-medium">
          <button
            onClick={() => setActiveSubTab('gantt')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              activeSubTab === 'gantt' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Diagrama de Gantt</span>
          </button>
          <button
            onClick={() => setActiveSubTab('cpm')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              activeSubTab === 'cpm' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-rose-500" />
            <span>Matriz CPM & Holguras</span>
          </button>
          <button
            onClick={() => setActiveSubTab('network')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              activeSubTab === 'network' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            <span>Red de Nodos</span>
          </button>
          <button
            onClick={() => setActiveSubTab('activities')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              activeSubTab === 'activities' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Editor de Actividades</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-auto p-6">
        {sortedActivities.hasCycle && (
          <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-3 text-rose-800 text-xs">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <strong>Error en la secuencia del programa:</strong> {sortedActivities.cycleError}. Revisa las predecesoras para evitar bucles cerrados.
            </div>
          </div>
        )}

        {/* 1. GANTT VIEW */}
        {activeSubTab === 'gantt' && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs">
                <span className="font-semibold text-slate-800">Convención de Colores:</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-rose-600"></span>
                  <span className="text-slate-600">Ruta Crítica (Holgura = 0)</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-blue-600"></span>
                  <span className="text-slate-600">Actividad con Holgura</span>
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3 w-20">Clave</th>
                    <th className="py-2.5 px-3 w-64">Actividad</th>
                    <th className="py-2.5 px-2 w-16 text-center">Duración</th>
                    <th className="py-2.5 px-3 w-40">Fechas (Inicio - Fin)</th>
                    <th className="py-2.5 px-3 min-w-[400px]">Cronograma (Días 0 a {projectTotalDays})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cpmRows.map((row) => {
                    const startD = addDays(startDate, row.es || 0, calendarMode);
                    const finishD = addDays(startDate, Math.max(0, (row.ef || 1) - 1), calendarMode);
                    const leftPct = projectTotalDays > 0 ? ((row.es || 0) / projectTotalDays) * 100 : 0;
                    const widthPct = projectTotalDays > 0 ? (row.duration / projectTotalDays) * 100 : 0;

                    return (
                      <tr key={row.key} className={`hover:bg-slate-50/80 transition-colors ${row.critical ? 'bg-rose-50/30' : ''}`}>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{row.key}</td>
                        <td className="py-2 px-3 font-medium text-slate-800">
                          {row.name}
                          {row.pred && (
                            <span className="text-[10px] text-slate-400 block font-normal">Predecesora: {row.pred}</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-semibold text-slate-700">{row.duration} d</td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                          {startD.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })} al{' '}
                          {finishD.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })}
                        </td>
                        <td className="py-2 px-3">
                          <div className="relative w-full h-5 bg-slate-100 rounded overflow-hidden">
                            <div
                              style={{ left: `${leftPct}%`, width: `${Math.max(2, widthPct)}%` }}
                              className={`absolute top-0 bottom-0 rounded flex items-center justify-center text-[9px] font-mono font-bold text-white shadow-2xs ${
                                row.critical ? 'bg-rose-600' : 'bg-blue-600'
                              }`}
                            >
                              {row.duration >= 5 && `${row.duration}d`}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. CPM MATRIX VIEW */}
        {activeSubTab === 'cpm' && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 text-xs text-slate-600">
              Cálculo riguroso de tiempos según el método CPM: <strong>ES</strong> (Inicio Temprano), <strong>EF</strong> (Término Temprano), <strong>LS</strong> (Inicio Tardío), <strong>LF</strong> (Término Tardío) y <strong>Holgura Total (Slack)</strong>.
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Clave</th>
                  <th className="py-2.5 px-3">Nombre de la Actividad</th>
                  <th className="py-2.5 px-2 text-center">Duración</th>
                  <th className="py-2.5 px-2 text-center font-mono">ES</th>
                  <th className="py-2.5 px-2 text-center font-mono">EF</th>
                  <th className="py-2.5 px-2 text-center font-mono">LS</th>
                  <th className="py-2.5 px-2 text-center font-mono">LF</th>
                  <th className="py-2.5 px-2 text-center font-mono">Holgura</th>
                  <th className="py-2.5 px-3 text-center">Clasificación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {cpmRows.map((r) => (
                  <tr key={r.key} className={`hover:bg-slate-50 ${r.critical ? 'bg-rose-50/40 font-semibold' : ''}`}>
                    <td className="py-2 px-3 font-bold text-slate-900">{r.key}</td>
                    <td className="py-2 px-3 font-sans font-medium text-slate-800">{r.name}</td>
                    <td className="py-2 px-2 text-center">{r.duration}</td>
                    <td className="py-2 px-2 text-center text-slate-600">{r.es}</td>
                    <td className="py-2 px-2 text-center text-slate-600">{r.ef}</td>
                    <td className="py-2 px-2 text-center text-slate-600">{r.ls}</td>
                    <td className="py-2 px-2 text-center text-slate-600">{r.lf}</td>
                    <td className={`py-2 px-2 text-center font-bold ${r.critical ? 'text-rose-600' : 'text-blue-600'}`}>
                      {r.slack}
                    </td>
                    <td className="py-2 px-3 text-center font-sans">
                      {r.critical ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                          Ruta Crítica
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-medium">Holgura disponible</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. NETWORK VIEW */}
        {activeSubTab === 'network' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs overflow-auto min-h-[500px]">
            <div className="text-xs text-slate-500 mb-4">
              Diagrama de Red de Precedencias: Representa visualmente el encadenamiento de tareas con sus indicadores CPM.
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {cpmRows.map((r, i) => (
                <div key={r.key} className="flex items-center gap-3">
                  <div
                    className={`w-48 p-3 rounded-xl border shadow-xs text-xs space-y-1.5 ${
                      r.critical ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900">{r.key}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${r.critical ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                        {r.duration}d
                      </span>
                    </div>
                    <div className="font-medium text-slate-800 truncate" title={r.name}>
                      {r.name}
                    </div>
                    <div className="grid grid-cols-2 text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-100">
                      <div>ES: {r.es} | EF: {r.ef}</div>
                      <div className="text-right">LS: {r.ls} | LF: {r.lf}</div>
                    </div>
                    <div className="text-[10px] font-mono font-semibold pt-0.5 flex justify-between">
                      <span>Holgura:</span>
                      <span className={r.critical ? 'text-rose-600' : 'text-blue-600'}>{r.slack} d</span>
                    </div>
                  </div>

                  {i < cpmRows.length - 1 && (
                    <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. ACTIVITY EDITOR */}
        {activeSubTab === 'activities' && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-600">
                Edita claves, nombres, duraciones y predecesoras directamente en la tabla:
              </span>
              <button
                onClick={handleAddActivity}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nueva Fila</span>
              </button>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3 w-28">Clave</th>
                  <th className="py-2.5 px-3">Actividad</th>
                  <th className="py-2.5 px-3 w-32">Predecesora</th>
                  <th className="py-2.5 px-3 w-28 text-center">Duración (días)</th>
                  <th className="py-2.5 px-2 w-16 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activities.map((act, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={act.key}
                        onChange={(e) => handleUpdateActivity(index, 'key', e.target.value)}
                        className="w-full px-2 py-1 font-mono uppercase border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={act.name}
                        onChange={(e) => handleUpdateActivity(index, 'name', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <select
                        value={act.pred}
                        onChange={(e) => handleUpdateActivity(index, 'pred', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-mono focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">(Ninguna)</option>
                        {activities
                          .filter((a) => a.key !== act.key)
                          .map((a) => (
                            <option key={a.key} value={a.key}>
                              {a.key} - {a.name.slice(0, 20)}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="number"
                        min="1"
                        value={act.duration}
                        onChange={(e) => handleUpdateActivity(index, 'duration', parseInt(e.target.value) || 1)}
                        className="w-20 px-2 py-1 font-mono text-center border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        onClick={() => handleDeleteActivity(index)}
                        className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
