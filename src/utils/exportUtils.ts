/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project, Resource, ResourceExplosionItem, WBSNode } from '../types/apu';
import { calculateExplosion, formatCurrency, getBudgetTotals } from './calculations';

/**
 * Downloads a text file (CSV or JSON) to the user's browser.
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports Budget (Presupuesto General) to CSV.
 */
export function exportBudgetToCSV(project: Project): void {
  const lines: string[] = [];
  lines.push(`"PRESUPUESTO GENERAL DE OBRA: ${project.name}"`);
  lines.push(`"Cliente: ${project.client}","Ubicación: ${project.location}","Fecha: ${project.date}"`);
  lines.push(`"Moneda: ${project.currency}"`);
  lines.push('');
  lines.push('"Nivel","Código","Concepto / Descripción","Unidad","Cantidad","P.U. Directo","P.U. Venta","Importe Total"');

  function processNodes(nodes: WBSNode[], level = 1) {
    for (const node of nodes) {
      if (node.type === 'chapter' || node.type === 'subchapter') {
        lines.push(`"${level}","${node.code}","${node.name.replace(/"/g, '""')}","","","","","${(node.totalPrice || 0).toFixed(2)}"`);
        if (node.children) processNodes(node.children, level + 1);
      } else if (node.type === 'concept') {
        const c = project.concepts[node.conceptId || ''];
        const directCost = c ? c.directCost.toFixed(2) : '0.00';
        lines.push(
          `"${level}","${node.code}","${node.name.replace(/"/g, '""')}","${node.unit || ''}","${node.quantity || 0}","${directCost}","${(node.unitPrice || 0).toFixed(2)}","${(node.totalPrice || 0).toFixed(2)}"`
        );
      }
    }
  }

  processNodes(project.wbs);
  const totals = getBudgetTotals(project);
  lines.push('');
  lines.push(`"","","GRAN TOTAL PRESUPUESTO","","","","","${totals.grandTotal.toFixed(2)}"`);

  downloadFile('\uFEFF' + lines.join('\n'), `Presupuesto_${project.code}_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
}

function exportRows(filename: string, rows: string[][]): void {
  const csv = '\ufeff' + rows.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  downloadFile(csv, filename, 'text/csv;charset=utf-8');
}

export function exportScheduleToCSV(project: Project): void {
  exportRows(`EZAPU_Programacion_${project.code}.csv`, [
    ['Clave', 'Actividad', 'Inicio', 'Fin', 'Duracion', 'Avance', 'Peso', 'Responsable', 'Estado'],
    ...(project.schedule || []).map((task) => [task.code, task.name, task.startDate || '', task.endDate || '', String(task.durationDays), `${task.progress}%`, String(task.weight), task.responsible || '', task.status]),
  ]);
}

export function exportEstimatesToCSV(project: Project): void {
  exportRows(`EZAPU_Estimaciones_${project.code}.csv`, [
    ['Numero', 'Fecha', 'Estado', 'Subtotal', 'Total'],
    ...(project.estimates || []).map((estimate) => [estimate.number, estimate.date, estimate.status, String(estimate.subtotal), String(estimate.total)]),
  ]);
}

export function exportOperationsToCSV(project: Project, resources: Resource[]): void {
  const resourceName = (id: string) => resources.find((resource) => resource.id === id)?.description || id;
  exportRows(`EZAPU_Operacion_${project.code}.csv`, [
    ['Tipo', 'Fecha', 'Recurso', 'Cantidad', 'Recibido', 'Estado'],
    ...(project.supplies || []).map((item) => ['Suministro', item.date, resourceName(item.resourceId), String(item.quantity), String(item.received), item.status]),
    ...(project.warehouseMovements || []).map((item) => ['Bodega', item.date, resourceName(item.resourceId), String(item.quantity), '', item.type]),
  ]);
}

/**
 * Exports Resource Explosion to CSV.
 */
export function exportExplosionToCSV(project: Project, resourcesMap: Record<string, Resource>): void {
  const items: ResourceExplosionItem[] = calculateExplosion(project, resourcesMap);
  const lines: string[] = [];
  lines.push(`"EXPLOSIÓN CONSOLIDADA DE INSUMOS: ${project.name}"`);
  lines.push(`"Fecha: ${project.date}","Moneda: ${project.currency}"`);
  lines.push('');
  lines.push('"Tipo","Código","Descripción","Unidad","Costo Unitario","Cantidad Total Requerida","Importe Total","No. Conceptos en que participa"');

  for (const item of items) {
    lines.push(
      `"${item.type.toUpperCase()}","${item.code}","${item.description.replace(/"/g, '""')}","${item.unit}","${item.unitCost.toFixed(2)}","${item.totalQuantity.toFixed(4)}","${item.totalAmount.toFixed(2)}","${item.usedInConceptsCount}"`
    );
  }

  const grandTotal = items.reduce((sum, i) => sum + i.totalAmount, 0);
  lines.push('');
  lines.push(`"","","TOTAL GENERAL DE INSUMOS","","","","${grandTotal.toFixed(2)}",""`);

  downloadFile('\uFEFF' + lines.join('\n'), `Explosion_Insumos_${project.code}_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Exports a high-fidelity, styled Excel document (.xls via XML/HTML spreadsheet).
 */
export function exportBudgetToExcelHTML(project: Project): void {
  const totals = getBudgetTotals(project);

  let rowsHtml = '';
  function generateRows(nodes: WBSNode[], depth = 0) {
    for (const node of nodes) {
      if (node.type === 'chapter') {
        rowsHtml += `
          <tr style="background-color: #1e293b; color: #ffffff; font-weight: bold;">
            <td style="padding: 8px; border: 1px solid #cbd5e1;">${node.code}</td>
            <td colspan="4" style="padding: 8px; border: 1px solid #cbd5e1;">${node.name}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">${formatCurrency(node.totalPrice || 0, project.currency)}</td>
          </tr>
        `;
        if (node.children) generateRows(node.children, depth + 1);
      } else if (node.type === 'subchapter') {
        rowsHtml += `
          <tr style="background-color: #f1f5f9; color: #0f172a; font-weight: 600;">
            <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">${node.code}</td>
            <td colspan="4" style="padding: 6px 8px; border: 1px solid #cbd5e1;">${node.name}</td>
            <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">${formatCurrency(node.totalPrice || 0, project.currency)}</td>
          </tr>
        `;
        if (node.children) generateRows(node.children, depth + 1);
      } else if (node.type === 'concept') {
        const c = project.concepts[node.conceptId || ''];
        rowsHtml += `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-family: monospace;">${node.code}</td>
            <td style="padding: 6px 8px; border: 1px solid #e2e8f0;">${node.name}</td>
            <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: center;">${node.unit || ''}</td>
            <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: right; font-family: monospace;">${node.quantity || 0}</td>
            <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: right; font-family: monospace;">${formatCurrency(node.unitPrice || 0, project.currency)}</td>
            <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: right; font-family: monospace; font-weight: 600;">${formatCurrency(node.totalPrice || 0, project.currency)}</td>
          </tr>
        `;
      }
    }
  }

  generateRows(project.wbs);

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; }
        table { border-collapse: collapse; width: 100%; }
        th { background-color: #0f172a; color: white; padding: 10px 8px; text-align: left; }
        .header-box { margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
      </style>
    </head>
    <body>
      <div class="header-box">
        <h2 style="margin: 0; color: #1e293b;">${project.name}</h2>
        <p style="margin: 4px 0; color: #64748b;"><strong>Cliente:</strong> ${project.client} | <strong>Ubicación:</strong> ${project.location} | <strong>Fecha:</strong> ${project.date}</p>
        <p style="margin: 4px 0; color: #64748b;"><strong>Factor de Salario Real (FSR):</strong> ${project.fsrConfig.calculatedFSR} | <strong>Indirectos Totales:</strong> ${(project.markupConfig.indirectOffice + project.markupConfig.indirectField).toFixed(1)}% | <strong>Utilidad:</strong> ${project.markupConfig.profit}%</p>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 100px;">Código</th>
            <th>Concepto de Obra</th>
            <th style="width: 70px; text-align: center;">Unidad</th>
            <th style="width: 100px; text-align: right;">Cantidad</th>
            <th style="width: 120px; text-align: right;">P.U. Venta</th>
            <th style="width: 140px; text-align: right;">Importe</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
        <tfoot>
          <tr style="background-color: #2563eb; color: #ffffff; font-weight: bold; font-size: 13pt;">
            <td colspan="5" style="padding: 12px; text-align: right;">GRAN TOTAL PRESUPUESTO:</td>
            <td style="padding: 12px; text-align: right;">${formatCurrency(totals.grandTotal, project.currency)}</td>
          </tr>
        </tfoot>
      </table>
    </body>
    </html>
  `;

  downloadFile(html, `Presupuesto_${project.code}_${new Date().toISOString().slice(0, 10)}.xls`, 'application/vnd.ms-excel');
}
