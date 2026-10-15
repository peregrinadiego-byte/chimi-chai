import { ScheduleTask } from '../types/apu';

export interface ScheduleBar extends ScheduleTask {
  offsetPct: number;
  widthPct: number;
}

export interface ScheduleSummary {
  startDate?: string;
  endDate?: string;
  totalDays: number;
  weightedProgress: number;
  bars: ScheduleBar[];
}

export function validateSchedule(tasks: ScheduleTask[]): string[] {
  const errors: string[] = [];
  const ids = new Set(tasks.map((task) => task.id));

  for (const task of tasks) {
    if (task.parentId && !ids.has(task.parentId)) errors.push(`La actividad ${task.code} tiene un padre inexistente.`);
    if (task.predecessorId && !ids.has(task.predecessorId)) errors.push(`La actividad ${task.code} tiene una predecesora inexistente.`);
    if (task.parentId === task.id) errors.push(`La actividad ${task.code} no puede ser su propio padre.`);
    if (task.predecessorId === task.id) errors.push(`La actividad ${task.code} no puede ser su propia predecesora.`);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    const task = byId.get(id);
    const cycle: boolean = Boolean(task?.parentId && visit(task.parentId));
    visiting.delete(id);
    visited.add(id);
    return cycle;
  };
  for (const task of tasks) if (visit(task.id)) errors.push('Existe un ciclo en la jerarquía de actividades.');
  return [...new Set(errors)];
}

function dateValue(value?: string): number | undefined {
  if (!value) return undefined;
  const time = Date.parse(`${value}T00:00:00`);
  return Number.isNaN(time) ? undefined : time;
}

export function calculateSchedule(tasks: ScheduleTask[], amounts: Record<string, number> = {}): ScheduleSummary {
  const dated = tasks
    .map((task) => ({ task, start: dateValue(task.startDate), end: dateValue(task.endDate) }))
    .filter((row): row is { task: ScheduleTask; start: number; end: number } =>
      row.start !== undefined && row.end !== undefined,
    );

  if (!dated.length) {
    return { totalDays: 0, weightedProgress: weightedProgress(tasks, amounts), bars: [] };
  }

  const start = Math.min(...dated.map((row) => row.start));
  const end = Math.max(...dated.map((row) => row.end));
  const totalDays = Math.max(1, Math.round((end - start) / 86400000) + 1);

  const bars = dated.map(({ task, start: taskStart, end: taskEnd }) => ({
    ...task,
    offsetPct: ((taskStart - start) / 86400000 / totalDays) * 100,
    widthPct: (Math.max(1, Math.round((taskEnd - taskStart) / 86400000) + 1) / totalDays) * 100,
  }));

  return {
    startDate: new Date(start).toISOString().slice(0, 10),
    endDate: new Date(end).toISOString().slice(0, 10),
    totalDays,
    weightedProgress: weightedProgress(tasks, amounts),
    bars,
  };
}

export function weightedProgress(tasks: ScheduleTask[], amounts: Record<string, number> = {}): number {
  const valueOf = (task: ScheduleTask) => amounts[task.id] || Math.max(0, task.weight || 0);
  const totalWeight = tasks.reduce((sum, task) => sum + valueOf(task), 0);
  if (!totalWeight) return 0;
  const earned = tasks.reduce(
    (sum, task) => sum + Math.min(100, Math.max(0, task.progress || 0)) * valueOf(task),
    0,
  );
  return Number((earned / totalWeight).toFixed(2));
}
