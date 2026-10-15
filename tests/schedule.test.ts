import assert from 'node:assert/strict';
import { ScheduleTask } from '../src/types/apu';
import { calculateSchedule, validateSchedule, weightedProgress } from '../src/utils/schedule';
import { calculateEarnedValue } from '../src/utils/earnedValue';
import { buildSupplyProgram } from '../src/utils/supplies';
import { calculateStock } from '../src/utils/warehouse';

const tasks: ScheduleTask[] = [
  { id: 'a', code: '01', name: 'Preparación', startDate: '2026-01-01', endDate: '2026-01-03', durationDays: 3, progress: 50, weight: 100, status: 'en_proceso' },
  { id: 'b', code: '02', name: 'Cimentación', startDate: '2026-01-04', endDate: '2026-01-08', durationDays: 5, progress: 0, weight: 200, status: 'planeado', parentId: 'a' },
];

assert.equal(weightedProgress(tasks), 16.67);
assert.equal(calculateSchedule(tasks).totalDays, 8);
assert.deepEqual(validateSchedule(tasks), []);
assert.match(validateSchedule([{ ...tasks[0], parentId: 'a' }]).join(' '), /propio padre/);
assert.match(validateSchedule([{ ...tasks[0], id: 'a', parentId: 'b' }, { ...tasks[1], id: 'b', parentId: 'a' }]).join(' '), /ciclo/);
const project = { wbs: [{ id: 'w1', code: '01', name: 'Trabajo', type: 'chapter' as const, totalPrice: 1000 }], schedule: [{ ...tasks[0], linkedWbsId: 'w1' }], estimates: [{ id: 'e1', number: '1', date: '2026-01-01', status: 'pagada' as const, items: [], subtotal: 200, total: 200 }] } as any;
const earned = calculateEarnedValue(project);
assert.equal(earned.plannedValue, 1000);
assert.equal(earned.earnedValue, 500);
assert.equal(earned.actualCost, 200);
assert.equal(earned.progress, 50);
const resources = [{ id: 'r1', code: 'MAT-01', description: 'Material de prueba', unit: 'm3', type: 'material' as const, baseCost: 10, category: 'Materiales' }];
const supply = buildSupplyProgram({ ...project, concepts: { c1: { id: 'c1', code: 'C-01', description: 'Concepto', unit: 'm2', quantity: 4, directCost: 10, indirectPercent: 0, financingPercent: 0, profitPercent: 0, extraChargesPercent: 0, unitPrice: 10, totalPrice: 40, minorToolsPercent: 0, safetyEquipmentPercent: 0, items: [{ id: 'i1', resourceId: 'r1', code: 'MAT-01', description: 'Material de prueba', unit: 'm3', type: 'material', quantity: 2, unitCost: 10, totalCost: 20 }] } } } as any, resources);
assert.equal(supply[0].totalQuantity, 8);
assert.equal(supply[0].estimatedCost, 80);
assert.deepEqual(calculateStock([{ id: 'm1', date: '2026-01-01', resourceId: 'r1', type: 'entrada', quantity: 10 }, { id: 'm2', date: '2026-01-02', resourceId: 'r1', type: 'salida', quantity: 3 }]), { r1: 7 });
console.log('schedule.test.ts: OK');
