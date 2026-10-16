/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project, WBSNode, MatrixConcept, MatrixItem, Resource } from '../types/apu';
import categoriesData from '../data/plantillas-apu/categories.json';

export interface TemplateCategory {
  name: string;
  slug: string;
  conceptCount: number;
  matrixCount: number;
  linkedConceptCount: number;
  chapterCount: number;
  matrixSharded?: boolean;
  matrixManifest?: string;
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = categoriesData as TemplateCategory[];

/**
 * Builds a full EZ-APU Project from a Costos-APU template structure and matrix sharded data
 */
export function buildProjectFromTemplate(
  templateName: string,
  structureJson: any,
  matricesJson: Record<string, any>,
  existingResources: Resource[]
): { project: Project; newResources: Resource[] } {
  const projectId = `proj_tpl_${Date.now()}`;
  const concepts: Record<string, MatrixConcept> = {};
  const newResourcesMap = new Map<string, Resource>();

  // Index existing resources by code for fast lookup
  const resourceCodeMap = new Map<string, Resource>();
  existingResources.forEach((r) => resourceCodeMap.set(r.code, r));

  // Map of chapters to concepts
  const chapterNodes: WBSNode[] = [];
  const chapterCodeToNode: Record<string, WBSNode> = {};

  if (structureJson.chapters && Array.isArray(structureJson.chapters)) {
    structureJson.chapters.forEach((ch: any, idx: number) => {
      const chCode = ch.code || `${idx + 1}`;
      const chNode: WBSNode = {
        id: `node_ch_${chCode}`,
        code: chCode,
        name: ch.name || `Capítulo ${chCode}`,
        type: 'chapter',
        isExpanded: idx === 0, // expand first chapter
        children: [],
      };
      chapterCodeToNode[chCode] = chNode;
      chapterNodes.push(chNode);
    });
  }

  // Parse each concept
  const rawConcepts = structureJson.concepts || [];
  rawConcepts.forEach((c: any, index: number) => {
    const conceptId = `con_${c.code || index}`;
    const matrixData = matricesJson[c.code];

    const items: MatrixItem[] = [];
    let minorTools = 3;
    let safetyEquipment = 2;

    if (matrixData && matrixData.components) {
      // 1. Materials
      if (Array.isArray(matrixData.components.materials)) {
        matrixData.components.materials.forEach((mat: any, mIdx: number) => {
          let res = resourceCodeMap.get(mat.code) || newResourcesMap.get(mat.code);
          if (!res) {
            res = {
              id: `res_mat_${mat.code}`,
              code: mat.code,
              description: mat.description,
              unit: mat.unit,
              type: 'material',
              baseCost: Number(mat.basePrice) || 0,
              category: 'Materiales',
            };
            newResourcesMap.set(mat.code, res);
          }

          items.push({
            id: `item_m_${conceptId}_${mIdx}`,
            resourceId: res.id,
            code: mat.code,
            description: mat.description,
            unit: mat.unit,
            type: 'material',
            quantity: Number(mat.quantity) || 0,
            unitCost: Number(mat.basePrice) || 0,
            totalCost: Number(mat.amount) || (Number(mat.quantity) * Number(mat.basePrice)),
          });
        });
      }

      // 2. Labor
      if (Array.isArray(matrixData.components.labor)) {
        matrixData.components.labor.forEach((lab: any, lIdx: number) => {
          let res = resourceCodeMap.get(lab.code) || newResourcesMap.get(lab.code);
          if (!res) {
            res = {
              id: `res_lab_${lab.code}`,
              code: lab.code,
              description: lab.description,
              unit: lab.unit,
              type: 'labor',
              baseCost: Number(lab.basePrice) || 0,
              category: 'Mano de Obra',
              fsrFactor: 1.0,
            };
            newResourcesMap.set(lab.code, res);
          }

          items.push({
            id: `item_l_${conceptId}_${lIdx}`,
            resourceId: res.id,
            code: lab.code,
            description: lab.description,
            unit: lab.unit,
            type: 'labor',
            quantity: Number(lab.quantity) || 0,
            unitCost: Number(lab.basePrice) || 0,
            totalCost: Number(lab.amount) || (Number(lab.quantity) * Number(lab.basePrice)),
          });
        });
      }

      // 3. Equipment & Tools
      if (Array.isArray(matrixData.components.equipmentTools)) {
        matrixData.components.equipmentTools.forEach((eq: any, eIdx: number) => {
          if (eq.code === '%MO1') {
            minorTools = Number(eq.quantity) * 100 || 3;
            return;
          }
          if (eq.code === '%MO5') {
            safetyEquipment = Number(eq.quantity) * 100 || 2;
            return;
          }

          let res = resourceCodeMap.get(eq.code) || newResourcesMap.get(eq.code);
          if (!res) {
            res = {
              id: `res_eq_${eq.code}`,
              code: eq.code,
              description: eq.description,
              unit: eq.unit,
              type: 'equipment',
              baseCost: Number(eq.basePrice) || 0,
              category: 'Maquinaria y Equipo',
            };
            newResourcesMap.set(eq.code, res);
          }

          items.push({
            id: `item_e_${conceptId}_${eIdx}`,
            resourceId: res.id,
            code: eq.code,
            description: eq.description,
            unit: eq.unit,
            type: 'equipment',
            quantity: Number(eq.quantity) || 0,
            unitCost: Number(eq.basePrice) || 0,
            totalCost: Number(eq.amount) || (Number(eq.quantity) * Number(eq.basePrice)),
          });
        });
      }

      // 4. Basics / Auxiliaries
      if (Array.isArray(matrixData.components.basics)) {
        matrixData.components.basics.forEach((bas: any, bIdx: number) => {
          let res = resourceCodeMap.get(bas.code) || newResourcesMap.get(bas.code);
          if (!res) {
            res = {
              id: `res_bas_${bas.code}`,
              code: bas.code,
              description: bas.description,
              unit: bas.unit,
              type: 'auxiliary',
              baseCost: Number(bas.basePrice) || 0,
              category: 'Básicos',
            };
            newResourcesMap.set(bas.code, res);
          }

          items.push({
            id: `item_b_${conceptId}_${bIdx}`,
            resourceId: res.id,
            code: bas.code,
            description: bas.description,
            unit: bas.unit,
            type: 'auxiliary',
            quantity: Number(bas.quantity) || 0,
            unitCost: Number(bas.basePrice) || 0,
            totalCost: Number(bas.amount) || (Number(bas.quantity) * Number(bas.basePrice)),
          });
        });
      }
    }

    const directCost = Number(c.baseUnitPrice) || (matrixData ? Number(matrixData.directCost) : 0);
    const quantity = Number(c.quantity) || 1;
    const totalPrice = directCost * quantity;

    const matrixConcept: MatrixConcept = {
      id: conceptId,
      code: c.code,
      description: c.description,
      unit: c.unit,
      quantity: quantity,
      directCost: directCost,
      indirectPercent: 12.5,
      financingPercent: 1.5,
      profitPercent: 10.0,
      extraChargesPercent: 0.5,
      unitPrice: directCost,
      totalPrice: totalPrice,
      items: items,
      minorToolsPercent: minorTools,
      safetyEquipmentPercent: safetyEquipment,
    };

    concepts[conceptId] = matrixConcept;

    // Attach to WBS
    const wbsNode: WBSNode = {
      id: `node_con_${c.code}`,
      code: c.code,
      name: c.description,
      type: 'concept',
      unit: c.unit,
      quantity: quantity,
      unitPrice: directCost,
      totalPrice: totalPrice,
      conceptId: conceptId,
    };

    const targetChapter = chapterCodeToNode[c.chapterCode];
    if (targetChapter) {
      if (!targetChapter.children) targetChapter.children = [];
      targetChapter.children.push(wbsNode);
    } else {
      // Default to root or first chapter
      if (chapterNodes.length > 0) {
        if (!chapterNodes[0].children) chapterNodes[0].children = [];
        chapterNodes[0].children.push(wbsNode);
      } else {
        chapterNodes.push(wbsNode);
      }
    }
  });

  const project: Project = {
    id: projectId,
    name: templateName,
    code: `OBRA-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    client: 'Cliente Demo',
    location: 'México',
    date: new Date().toISOString().split('T')[0],
    currency: 'MXN',
    markupConfig: {
      indirectOffice: 7.5,
      indirectField: 5.0,
      financing: 1.5,
      profit: 10.0,
      extraCharges: 0.5,
    },
    fsrConfig: {
      calendarDays: 365,
      sundays: 52,
      paidVacationDays: 12,
      vacationPremiumDays: 3,
      yearEndBonusDays: 15,
      officialHolidays: 8,
      customaryHolidays: 3,
      imssInfonavitRate: 28.5,
      calculatedFSR: 1.72,
    },
    wbs: chapterNodes,
    concepts: concepts,
    professionalFees: undefined,
    lastModified: new Date().toISOString(),
  };

  return {
    project,
    newResources: Array.from(newResourcesMap.values()),
  };
}
