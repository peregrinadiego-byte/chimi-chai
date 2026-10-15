/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ResourceType = 'material' | 'labor' | 'equipment' | 'tool' | 'auxiliary' | 'subcontract';

export interface Resource {
  id: string;
  code: string;
  description: string;
  unit: string;
  type: ResourceType;
  baseCost: number;
  category: string;
  notes?: string;
  fsrFactor?: number; // Optional specific FSR for labor
  hourlyOperationCost?: number; // For machinery
}

export interface WorkerCategory {
  id: string;
  code: string;
  title: string;
  baseDailySalary: number;
  fsrFactor: number;
  realDailySalary: number;
}

export interface MatrixItem {
  id: string;
  resourceId: string;
  code: string;
  description: string;
  unit: string;
  type: ResourceType;
  quantity: number; // Rendimiento / consumo por unidad de concepto
  unitCost: number; // Costo base o costo real
  totalCost: number; // quantity * unitCost
  customYieldFormula?: string;
}

export interface MatrixConcept {
  id: string;
  code: string;
  description: string;
  unit: string;
  quantity: number; // Volumen de obra en el presupuesto
  directCost: number;
  indirectPercent: number;
  financingPercent: number;
  profitPercent: number;
  extraChargesPercent: number;
  unitPrice: number;
  totalPrice: number;
  items: MatrixItem[];
  minorToolsPercent: number; // % sobre mano de obra (ej. 3% o 5%)
  safetyEquipmentPercent: number; // % sobre mano de obra (ej. 2%)
}

export type WBSNodeType = 'chapter' | 'subchapter' | 'concept';

export interface WBSNode {
  id: string;
  code: string;
  name: string;
  type: WBSNodeType;
  unit?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  children?: WBSNode[];
  conceptId?: string;
  isExpanded?: boolean;
}

export interface MarkupConfig {
  indirectOffice: number; // e.g. 7.5%
  indirectField: number; // e.g. 5.0%
  financing: number; // e.g. 1.5%
  profit: number; // e.g. 10.0%
  extraCharges: number; // e.g. 0.5% (5 al millar)
}

export interface FSRConfig {
  calendarDays: number; // 365
  sundays: number; // 52
  paidVacationDays: number; // 12 (primer año según reforma)
  vacationPremiumDays: number; // 3 (25% sobre vacaciones)
  yearEndBonusDays: number; // 15 (Aguinaldo)
  officialHolidays: number; // 8
  customaryHolidays: number; // 3 (lluvia, día de la santa cruz, condiciones clima)
  imssInfonavitRate: number; // 28.5%
  calculatedFSR: number; // Factor resultante (ej. 1.72)
}

export interface Project {
  id: string;
  name: string;
  code: string;
  client: string;
  location: string;
  date: string;
  currency: string;
  markupConfig: MarkupConfig;
  fsrConfig: FSRConfig;
  wbs: WBSNode[];
  concepts: Record<string, MatrixConcept>;
  /** Optional M2 schedule data; kept optional for backward-compatible imports. */
  schedule?: ScheduleTask[];
  scheduleStartDate?: string;
  scheduleCalendarMode?: 'natural' | 'working';
  estimates?: Estimate[];
  supplies?: SupplyOrder[];
  warehouseMovements?: WarehouseMovement[];
  /** Datos de la encomienda y honorarios que originaron la obra. */
  professionalFees?: ProfessionalFees;
  lastModified: string;
}

export interface ProfessionalFees {
  professionalName?: string;
  professionalLicense?: string;
  serviceType: 'arquitectura' | 'urbanismo' | 'dro';
  genreName: string;
  surfaceArea: number;
  baseConstructionCost: number;
  regionalFactor: number;
  honorarium: number;
  scopePercent: number;
  createdAt: string;
}

export interface EstimateItem {
  conceptId: string;
  quantity: number;
  amount: number;
}

export interface Estimate {
  id: string;
  number: string;
  date: string;
  status: 'borrador' | 'presentada' | 'pagada';
  items: EstimateItem[];
  subtotal: number;
  total: number;
  notes?: string;
}

export interface SupplyOrder {
  id: string;
  date: string;
  resourceId: string;
  quantity: number;
  received: number;
  status: 'pendiente' | 'parcial' | 'recibida';
  notes?: string;
}

export interface WarehouseMovement {
  id: string;
  date: string;
  resourceId: string;
  type: 'entrada' | 'salida';
  quantity: number;
  reference?: string;
}

export type ScheduleTaskStatus = 'planeado' | 'en_proceso' | 'terminado' | 'detenido';

export interface ScheduleTask {
  id: string;
  code: string;
  name: string;
  parentId?: string;
  predecessorId?: string;
  startDate?: string;
  endDate?: string;
  durationDays: number;
  progress: number;
  weight: number;
  responsible?: string;
  status: ScheduleTaskStatus;
  notes?: string;
  linkedWbsId?: string;
}

export interface ResourceExplosionItem {
  resourceId: string;
  code: string;
  description: string;
  unit: string;
  type: ResourceType;
  unitCost: number;
  totalQuantity: number;
  totalAmount: number;
  usedInConceptsCount: number;
}
