import { Project } from '../types/apu';

export interface EarnedValueMetrics {
  plannedValue: number;
  earnedValue: number;
  actualCost: number;
  spi: number;
  cpi: number;
  progress: number;
  linkedTasks: number;
  unlinkedTasks: number;
}

export interface EarnedValuePoint { date: string; planned: number; earned: number; }

export function calculateEarnedValue(project: Project): EarnedValueMetrics {
  const flatten = (nodes: Project['wbs']): Array<{ id: string; amount: number }> => nodes.flatMap((node) => [{ id: node.id, amount: node.totalPrice || 0 }, ...(node.children ? flatten(node.children) : [])]);
  const amounts = new Map(flatten(project.wbs).map((node) => [node.id, node.amount]));
  const tasks = project.schedule || [];
  const linked = tasks.filter((task) => task.linkedWbsId && amounts.has(task.linkedWbsId));
  const plannedValue = linked.reduce((sum, task) => sum + (amounts.get(task.linkedWbsId as string) || 0), 0);
  const earnedValue = linked.reduce((sum, task) => sum + (amounts.get(task.linkedWbsId as string) || 0) * Math.min(100, Math.max(0, task.progress || 0)) / 100, 0);
  const actualCost = (project.estimates || []).reduce((sum, estimate) => sum + estimate.total, 0);
  return {
    plannedValue,
    earnedValue,
    actualCost,
    spi: plannedValue ? earnedValue / plannedValue : 0,
    cpi: actualCost ? earnedValue / actualCost : 0,
    progress: plannedValue ? earnedValue / plannedValue * 100 : 0,
    linkedTasks: linked.length,
    unlinkedTasks: tasks.length - linked.length,
  };
}

export function earnedValueTimeline(project: Project): EarnedValuePoint[] {
  const amountById = new Map<string, number>();
  const flatten = (nodes: Project['wbs']) => nodes.forEach((node) => { amountById.set(node.id, node.totalPrice || 0); if (node.children) flatten(node.children); });
  flatten(project.wbs);
  return (project.schedule || []).filter((task) => task.linkedWbsId && amountById.has(task.linkedWbsId) && task.endDate).sort((a, b) => (a.endDate || '').localeCompare(b.endDate || '')).map((task) => ({ date: task.endDate as string, planned: amountById.get(task.linkedWbsId as string) || 0, earned: (amountById.get(task.linkedWbsId as string) || 0) * Math.min(100, Math.max(0, task.progress || 0)) / 100 }));
}
