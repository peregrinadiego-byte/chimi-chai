import React, { useMemo, useState } from 'react';
import { CalendarRange, Check, Plus, Trash2 } from 'lucide-react';
import { Project, ScheduleTask, ScheduleTaskStatus } from '../types/apu';
import { calculateSchedule, validateSchedule } from '../utils/schedule';

interface ScheduleViewProps {
  project: Project;
  onUpdateProject: (project: Project) => void;
  onExport: () => void;
}

const today = new Date().toISOString().slice(0, 10);

function flattenBudget(nodes: Project['wbs']): Array<{ id: string; label: string; amount: number }> {
  return nodes.flatMap((node) => [
    { id: node.id, label: `${node.code} · ${node.name}`, amount: node.totalPrice || 0 },
    ...(node.children ? flattenBudget(node.children) : []),
  ]);
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({ project, onUpdateProject, onExport }) => {
  const tasks = project.schedule || [];
  const budgetNodes = useMemo(() => flattenBudget(project.wbs), [project.wbs]);
  const budgetAmounts = useMemo(
    () => Object.fromEntries(tasks.map((task) => [task.id, budgetNodes.find((node) => node.id === task.linkedWbsId)?.amount || 0])),
    [tasks, budgetNodes],
  );
  const summary = useMemo(() => calculateSchedule(tasks, budgetAmounts), [tasks, budgetAmounts]);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [weight, setWeight] = useState('1');
  const [linkedWbsId, setLinkedWbsId] = useState('');
  const [parentId, setParentId] = useState('');
  const [predecessorId, setPredecessorId] = useState('');
  const [responsible, setResponsible] = useState('');

  const updateTasks = (nextTasks: ScheduleTask[]) => {
    onUpdateProject({ ...project, schedule: nextTasks, lastModified: new Date().toISOString() });
  };

  const updateTask = (taskId: string, changes: Partial<ScheduleTask>) => {
    const nextTasks = tasks.map((task) => (task.id === taskId ? { ...task, ...changes } : task));
    const errors = validateSchedule(nextTasks);
    if (errors.length) {
      alert(errors.join('\n'));
      return;
    }
    updateTasks(nextTasks);
  };

  const addTask = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    const durationDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
    const nextTasks: ScheduleTask[] = [
      ...tasks,
      {
        id: `task_${Date.now()}`,
        code: String(tasks.length + 1).padStart(2, '0'),
        name: name.trim(),
        startDate,
        endDate,
        durationDays,
        progress: 0,
        weight: Number(weight) || 1,
        status: 'planeado' as const,
        linkedWbsId: linkedWbsId || undefined,
        parentId: parentId || undefined,
        predecessorId: predecessorId || undefined,
        responsible: responsible.trim() || undefined,
      },
    ];
    const errors = validateSchedule(nextTasks);
    if (errors.length) {
      alert(errors.join('\n'));
      return;
    }
    updateTasks(nextTasks);
    setName('');
    setLinkedWbsId('');
    setParentId('');
    setPredecessorId('');
    setResponsible('');
  };

  const setProgress = (task: ScheduleTask, progress: number) => {
    const status: ScheduleTaskStatus = progress >= 100 ? 'terminado' : progress > 0 ? 'en_proceso' : 'planeado';
    updateTasks(tasks.map((item) => (item.id === task.id ? { ...item, progress, status } : item)));
  };

  return (
    <section className="max-w-7xl mx-auto px-4 lg:px-6 py-6 space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CalendarRange className="w-5 h-5 text-blue-600" /> Programación de obra
            </h1>
            <p className="text-xs text-slate-500 mt-1">Módulo M2 · tareas, fechas, avance y Gantt.</p>
          </div><button onClick={onExport} className="px-3 py-1.5 border rounded-md text-xs">Exportar CSV</button>
          <div className="text-right text-xs">
            <div className="font-semibold text-slate-800">Avance ponderado: {summary.weightedProgress}%</div>
            <div className="text-slate-500">{summary.startDate || 'Sin fecha'} → {summary.endDate || 'Sin fecha'}</div>
          </div>
        </div>

        <form onSubmit={addTask} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_0.7fr_1.5fr_1.5fr] gap-2 items-end mb-5">
          <label className="text-xs text-slate-600">Actividad<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre de la actividad" className="mt-1 w-full px-2 py-1.5 border rounded-md text-sm" /></label>
          <label className="text-xs text-slate-600">Inicio<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 w-full px-2 py-1.5 border rounded-md text-sm" /></label>
          <label className="text-xs text-slate-600">Fin<input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 w-full px-2 py-1.5 border rounded-md text-sm" /></label>
          <label className="text-xs text-slate-600">Peso<input type="number" min="0.01" step="0.01" value={weight} onChange={(e) => setWeight(e.target.value)} className="mt-1 w-full px-2 py-1.5 border rounded-md text-sm" /></label>
          <label className="text-xs text-slate-600">Partida / concepto<select value={linkedWbsId} onChange={(e) => setLinkedWbsId(e.target.value)} className="mt-1 w-full px-2 py-1.5 border rounded-md text-sm"><option value="">Sin vincular</option>{budgetNodes.map((node) => <option key={node.id} value={node.id}>{node.label} · ${node.amount.toFixed(2)}</option>)}</select></label>
          <label className="text-xs text-slate-600">Actividad padre<select value={parentId} onChange={(e) => setParentId(e.target.value)} className="mt-1 w-full px-2 py-1.5 border rounded-md text-sm"><option value="">Actividad raíz</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.code} · {task.name}</option>)}</select></label>
          <label className="text-xs text-slate-600">Predecesora<select value={predecessorId} onChange={(e) => setPredecessorId(e.target.value)} className="mt-1 w-full px-2 py-1.5 border rounded-md text-sm"><option value="">Sin predecesora</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.code} · {task.name}</option>)}</select></label>
          <label className="text-xs text-slate-600">Responsable<input value={responsible} onChange={(e) => setResponsible(e.target.value)} placeholder="Responsable" className="mt-1 w-full px-2 py-1.5 border rounded-md text-sm" /></label>
          <button className="px-3 py-2 bg-blue-600 text-white rounded-md text-xs font-semibold flex items-center justify-center gap-1"><Plus className="w-3.5 h-3.5" />Agregar</button>
        </form>

        {summary.bars.length > 0 && (
          <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
            <div className="px-3 py-2 bg-slate-50 text-xs font-semibold text-slate-600">Diagrama de Gantt</div>
            {summary.bars.map((task) => (
              <div key={task.id} className="grid grid-cols-[minmax(180px,1fr)_3fr] gap-3 items-center px-3 py-2 border-t border-slate-100">
                <span className="text-xs text-slate-700 truncate">{task.code} · {task.name}</span>
                <div className="h-6 bg-slate-100 rounded relative overflow-hidden">
                  <div className="absolute h-full bg-blue-500 rounded" style={{ left: `${task.offsetPct}%`, width: `${Math.max(task.widthPct, 1)}%` }}>
                    <div className="h-full bg-emerald-500/80" style={{ width: `${task.progress}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-[55px_1fr_130px_120px_100px_100px_120px_40px] px-3 py-2 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase"><span>Clave</span><span>Actividad</span><span>Fechas</span><span>Responsable</span><span>Estado</span><span>Avance</span><span>Importe</span><span /></div>
          {tasks.length === 0 && <div className="p-6 text-center text-sm text-slate-400">Aún no hay actividades programadas.</div>}
          {tasks.map((task) => (
            <div key={task.id} className="grid grid-cols-[55px_1fr_130px_120px_100px_100px_120px_40px] items-center gap-2 px-3 py-2 border-t border-slate-100 text-xs">
              <span className="font-mono text-slate-500">{task.code}</span>
              <input value={task.name} onChange={(e) => updateTask(task.id, { name: e.target.value })} className="min-w-0 px-1 py-1 border border-transparent hover:border-slate-200 focus:border-blue-300 rounded font-medium text-slate-800" />
              <span className="text-slate-500 flex gap-1"><input type="date" value={task.startDate || ''} onChange={(e) => updateTask(task.id, { startDate: e.target.value || undefined })} className="w-[62px] px-0.5 border rounded" /><input type="date" value={task.endDate || ''} onChange={(e) => updateTask(task.id, { endDate: e.target.value || undefined })} className="w-[62px] px-0.5 border rounded" /></span>
              <input value={task.responsible || ''} onChange={(e) => updateTask(task.id, { responsible: e.target.value || undefined })} placeholder="—" className="min-w-0 px-1 py-1 border border-transparent hover:border-slate-200 focus:border-blue-300 rounded text-slate-600" />
              <select value={task.status} onChange={(e) => updateTask(task.id, { status: e.target.value as ScheduleTaskStatus })} className="px-1 py-1 border rounded capitalize text-slate-600"><option value="planeado">Planeado</option><option value="en_proceso">En proceso</option><option value="terminado">Terminado</option><option value="detenido">Detenido</option></select>
              <label className="flex items-center gap-1"><input type="number" min="0" max="100" value={task.progress} onChange={(e) => setProgress(task, Number(e.target.value))} className="w-16 px-1 py-1 border rounded" />%</label>
              <span className="font-mono text-slate-600">{budgetAmounts[task.id] ? budgetAmounts[task.id].toLocaleString('es-MX', { style: 'currency', currency: project.currency }) : '—'}</span>
              <button title="Eliminar actividad" onClick={() => updateTasks(tasks.filter((item) => item.id !== task.id).map((item) => ({ ...item, parentId: item.parentId === task.id ? undefined : item.parentId, predecessorId: item.predecessorId === task.id ? undefined : item.predecessorId })))} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
