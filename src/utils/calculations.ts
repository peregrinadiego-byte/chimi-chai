/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FSRConfig, MarkupConfig, MatrixConcept, MatrixItem, Project, Resource, ResourceExplosionItem, WBSNode } from '../types/apu';

/**
 * Calculates the Factor de Salario Real (FSR) according to standard Mexican LFT & IMSS formulas.
 */
export function calculateFSR(config: FSRConfig): number {
  const daysPaid = config.calendarDays + config.yearEndBonusDays + config.vacationPremiumDays;
  const nonWorkingDays = config.sundays + config.paidVacationDays + config.officialHolidays + config.customaryHolidays;
  const daysWorked = Math.max(1, config.calendarDays - nonWorkingDays);

  const baseRatio = daysPaid / daysWorked;
  const imssFactor = 1 + (config.imssInfonavitRate / 100);

  // Standard FSR formula: (Tp / Tl) * (1 + Prestaciones)
  const calculated = baseRatio * imssFactor;
  return Number(calculated.toFixed(4));
}

export interface MatrixCostBreakdown {
  materialsCost: number;
  laborDirectCost: number;
  laborFSRCost: number;
  equipmentCost: number;
  minorToolsCost: number;
  safetyEquipmentCost: number;
  auxiliaryCost: number;
  subcontractCost: number;
  totalDirectCost: number;
  indirectOfficeAmount: number;
  indirectFieldAmount: number;
  totalIndirectAmount: number;
  financingAmount: number;
  profitAmount: number;
  extraChargesAmount: number;
  unitPrice: number;
  totalPrice: number;
  markupMultiplier: number;
}

/**
 * Calculates the complete unit price breakdown of an APU concept.
 */
export function calculateConceptBreakdown(
  concept: MatrixConcept,
  resourcesMap: Record<string, Resource>,
  defaultFSR: number,
  markup: MarkupConfig
): MatrixCostBreakdown {
  let materialsCost = 0;
  let laborDirectCost = 0;
  let laborFSRCost = 0;
  let equipmentCost = 0;
  let auxiliaryCost = 0;
  let subcontractCost = 0;

  for (const item of concept.items) {
    const itemQty = Number(item.quantity) || 0;
    const itemUnitCost = Number(item.unitCost) || 0;
    const baseSubtotal = itemQty * itemUnitCost;

    if (item.type === 'material') {
      materialsCost += baseSubtotal;
    } else if (item.type === 'labor') {
      laborDirectCost += baseSubtotal;
      const res = resourcesMap[item.resourceId];
      const appliedFSR = res?.fsrFactor || defaultFSR || 1.72;
      laborFSRCost += baseSubtotal * appliedFSR;
    } else if (item.type === 'equipment') {
      equipmentCost += baseSubtotal;
    } else if (item.type === 'auxiliary') {
      auxiliaryCost += baseSubtotal;
    } else if (item.type === 'subcontract') {
      subcontractCost += baseSubtotal;
    } else {
      materialsCost += baseSubtotal;
    }
  }

  // Calculate Minor Tools and Safety Equipment based on Labor with FSR
  const minorToolsPercent = Number(concept.minorToolsPercent) || 0;
  const safetyEquipmentPercent = Number(concept.safetyEquipmentPercent) || 0;
  const minorToolsCost = laborFSRCost * (minorToolsPercent / 100);
  const safetyEquipmentCost = laborFSRCost * (safetyEquipmentPercent / 100);

  const totalDirectCost =
    materialsCost +
    laborFSRCost +
    equipmentCost +
    minorToolsCost +
    safetyEquipmentCost +
    auxiliaryCost +
    subcontractCost;

  // Sobrecostos Cascading
  const indirectOfficeAmount = totalDirectCost * ((Number(markup.indirectOffice) || 0) / 100);
  const indirectFieldAmount = totalDirectCost * ((Number(markup.indirectField) || 0) / 100);
  const totalIndirectAmount = indirectOfficeAmount + indirectFieldAmount;

  const costWithIndirects = totalDirectCost + totalIndirectAmount;
  const financingAmount = costWithIndirects * ((Number(markup.financing) || 0) / 100);

  const costWithFinancing = costWithIndirects + financingAmount;
  const profitAmount = costWithFinancing * ((Number(markup.profit) || 0) / 100);

  const costWithProfit = costWithFinancing + profitAmount;
  const extraChargesAmount = costWithProfit * ((Number(markup.extraCharges) || 0) / 100);

  const unitPrice = costWithProfit + extraChargesAmount;
  const totalPrice = unitPrice * (Number(concept.quantity) || 0);
  const markupMultiplier = totalDirectCost > 0 ? unitPrice / totalDirectCost : 1;

  return {
    materialsCost: Number(materialsCost.toFixed(2)),
    laborDirectCost: Number(laborDirectCost.toFixed(2)),
    laborFSRCost: Number(laborFSRCost.toFixed(2)),
    equipmentCost: Number(equipmentCost.toFixed(2)),
    minorToolsCost: Number(minorToolsCost.toFixed(2)),
    safetyEquipmentCost: Number(safetyEquipmentCost.toFixed(2)),
    auxiliaryCost: Number(auxiliaryCost.toFixed(2)),
    subcontractCost: Number(subcontractCost.toFixed(2)),
    totalDirectCost: Number(totalDirectCost.toFixed(2)),
    indirectOfficeAmount: Number(indirectOfficeAmount.toFixed(2)),
    indirectFieldAmount: Number(indirectFieldAmount.toFixed(2)),
    totalIndirectAmount: Number(totalIndirectAmount.toFixed(2)),
    financingAmount: Number(financingAmount.toFixed(2)),
    profitAmount: Number(profitAmount.toFixed(2)),
    extraChargesAmount: Number(extraChargesAmount.toFixed(2)),
    unitPrice: Number(unitPrice.toFixed(2)),
    totalPrice: Number(totalPrice.toFixed(2)),
    markupMultiplier: Number(markupMultiplier.toFixed(4)),
  };
}

/**
 * Recalculates entire project WBS tree and updates total prices.
 */
export function recalculateProject(project: Project, resourcesMap: Record<string, Resource>): Project {
  const fsr = calculateFSR(project.fsrConfig);
  const updatedConcepts = { ...project.concepts };

  // Recalculate each concept
  for (const conceptId of Object.keys(updatedConcepts)) {
    const concept = updatedConcepts[conceptId];
    const breakdown = calculateConceptBreakdown(concept, resourcesMap, fsr, project.markupConfig);
    updatedConcepts[conceptId] = {
      ...concept,
      directCost: breakdown.totalDirectCost,
      indirectPercent: project.markupConfig.indirectOffice + project.markupConfig.indirectField,
      financingPercent: project.markupConfig.financing,
      profitPercent: project.markupConfig.profit,
      extraChargesPercent: project.markupConfig.extraCharges,
      unitPrice: breakdown.unitPrice,
      totalPrice: breakdown.unitPrice * (concept.quantity || 0),
    };
  }

  // Recursively recalculate WBS nodes
  const updatedWBS = recalculateWBSNodes(project.wbs, updatedConcepts);

  return {
    ...project,
    fsrConfig: {
      ...project.fsrConfig,
      calculatedFSR: fsr,
    },
    concepts: updatedConcepts,
    wbs: updatedWBS,
    lastModified: new Date().toISOString(),
  };
}

function recalculateWBSNodes(nodes: WBSNode[], concepts: Record<string, MatrixConcept>): WBSNode[] {
  return nodes.map((node) => {
    if (node.type === 'concept' && node.conceptId && concepts[node.conceptId]) {
      const concept = concepts[node.conceptId];
      const qty = node.quantity !== undefined ? node.quantity : concept.quantity;
      const unitPrice = concept.unitPrice;
      const totalPrice = Number((qty * unitPrice).toFixed(2));
      return {
        ...node,
        unit: concept.unit,
        quantity: qty,
        unitPrice,
        totalPrice,
      };
    }

    if (node.children && node.children.length > 0) {
      const recalculatedChildren = recalculateWBSNodes(node.children, concepts);
      const totalFromChildren = recalculatedChildren.reduce((sum, child) => sum + (child.totalPrice || 0), 0);
      return {
        ...node,
        children: recalculatedChildren,
        totalPrice: Number(totalFromChildren.toFixed(2)),
      };
    }

    return {
      ...node,
      totalPrice: node.totalPrice || 0,
    };
  });
}

/**
 * Calculates grand total and statistics of the budget.
 */
export function getBudgetTotals(project: Project): {
  grandTotal: number;
  totalDirectCost: number;
  totalConcepts: number;
  totalChapters: number;
} {
  const grandTotal = project.wbs.reduce((acc, node) => acc + (node.totalPrice || 0), 0);
  let totalDirectCost = 0;
  let totalConcepts = 0;
  let totalChapters = 0;

  function countAndSum(nodes: WBSNode[]) {
    for (const node of nodes) {
      if (node.type === 'chapter' || node.type === 'subchapter') {
        totalChapters++;
        if (node.children) countAndSum(node.children);
      } else if (node.type === 'concept' && node.conceptId && project.concepts[node.conceptId]) {
        totalConcepts++;
        const c = project.concepts[node.conceptId];
        totalDirectCost += (c.directCost || 0) * (node.quantity || c.quantity || 0);
      }
    }
  }

  countAndSum(project.wbs);

  return {
    grandTotal: Number(grandTotal.toFixed(2)),
    totalDirectCost: Number(totalDirectCost.toFixed(2)),
    totalConcepts,
    totalChapters,
  };
}

/**
 * Calculates the consolidation / explosion of all resources required in the project.
 */
export function calculateExplosion(project: Project, resourcesMap: Record<string, Resource>): ResourceExplosionItem[] {
  const map: Record<string, ResourceExplosionItem> = {};

  function traverseWBS(nodes: WBSNode[]) {
    for (const node of nodes) {
      if (node.type === 'concept' && node.conceptId && project.concepts[node.conceptId]) {
        const concept = project.concepts[node.conceptId];
        const conceptBudgetQty = Number(node.quantity !== undefined ? node.quantity : concept.quantity) || 0;

        for (const item of concept.items) {
          const itemQty = Number(item.quantity) || 0;
          const totalQty = itemQty * conceptBudgetQty;
          const res = resourcesMap[item.resourceId];
          const unitCost = Number(item.unitCost) || res?.baseCost || 0;

          if (!map[item.resourceId]) {
            map[item.resourceId] = {
              resourceId: item.resourceId,
              code: item.code || res?.code || 'N/A',
              description: item.description || res?.description || '',
              unit: item.unit || res?.unit || '',
              type: item.type || res?.type || 'material',
              unitCost,
              totalQuantity: 0,
              totalAmount: 0,
              usedInConceptsCount: 0,
            };
          }

          map[item.resourceId].totalQuantity += totalQty;
          map[item.resourceId].totalAmount += totalQty * unitCost;
          map[item.resourceId].usedInConceptsCount += 1;
        }
      }
      if (node.children) {
        traverseWBS(node.children);
      }
    }
  }

  traverseWBS(project.wbs);

  return Object.values(map)
    .map((item) => ({
      ...item,
      totalQuantity: Number(item.totalQuantity.toFixed(4)),
      totalAmount: Number(item.totalAmount.toFixed(2)),
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);
}

/**
 * Format currency to MXN / USD style.
 */
export function formatCurrency(amount: number, currency = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency === '$' || !currency ? 'MXN' : currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

/**
 * Format numeric values with fixed decimals.
 */
export function formatNumber(val: number, decimals = 2): string {
  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val || 0);
}
