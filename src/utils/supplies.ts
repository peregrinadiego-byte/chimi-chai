import { Project, Resource } from '../types/apu';

export interface SupplyProgramRow {
  resourceId: string;
  code: string;
  description: string;
  unit: string;
  type: string;
  totalQuantity: number;
  estimatedCost: number;
}

export function buildSupplyProgram(project: Project, resources: Resource[]): SupplyProgramRow[] {
  const map = new Map<string, SupplyProgramRow>();
  Object.values(project.concepts).forEach((concept) => {
    concept.items.forEach((item) => {
      const resource = resources.find((candidate) => candidate.id === item.resourceId);
      if (!resource) return;
      const quantity = (concept.quantity || 0) * (item.quantity || 0);
      const current = map.get(resource.id) || { resourceId: resource.id, code: resource.code, description: resource.description, unit: resource.unit, type: resource.type, totalQuantity: 0, estimatedCost: 0 };
      current.totalQuantity += quantity;
      current.estimatedCost += quantity * (item.unitCost || resource.baseCost || 0);
      map.set(resource.id, current);
    });
  });
  return [...map.values()].sort((a, b) => a.type.localeCompare(b.type) || a.code.localeCompare(b.code)).map((row) => ({ ...row, totalQuantity: Number(row.totalQuantity.toFixed(4)), estimatedCost: Number(row.estimatedCost.toFixed(2)) }));
}
