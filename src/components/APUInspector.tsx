/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ArrowLeft,
  Box,
  HardHat,
  Truck,
  Wrench,
  Layers,
  Plus,
  Trash2,
  DollarSign,
  Calculator,
  ShieldAlert,
  Percent,
  Sliders,
  Check,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { MatrixConcept, MatrixItem, Project, Resource, ResourceType } from '../types/apu';
import { calculateConceptBreakdown, formatCurrency, formatNumber } from '../utils/calculations';

interface APUInspectorProps {
  conceptId: string;
  project: Project;
  resourcesMap: Record<string, Resource>;
  onUpdateConcept: (updatedConcept: MatrixConcept) => void;
  onBackToWBS: () => void;
  onOpenCatalog: () => void;
  currency: string;
}

export const APUInspector: React.FC<APUInspectorProps> = ({
  conceptId,
  project,
  resourcesMap,
  onUpdateConcept,
  onBackToWBS,
  onOpenCatalog,
  currency,
}) => {
  const concept = project.concepts[conceptId];
  const [isDropZoneActive, setIsDropZoneActive] = useState(false);

  if (!concept) {
    return (
      <div className="bg-white rounded-xl p-8 text-center border border-slate-200">
        <p className="text-sm text-slate-600">No se ha seleccionado ningún concepto para inspeccionar.</p>
        <button
          onClick={onBackToWBS}
          className="mt-3 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md font-medium"
        >
          Regresar al Presupuesto WBS
        </button>
      </div>
    );
  }

  const defaultFSR = project.fsrConfig.calculatedFSR || 1.72;
  const breakdown = calculateConceptBreakdown(concept, resourcesMap, defaultFSR, project.markupConfig);

  // Group items by type
  const materials = concept.items.filter((i) => i.type === 'material');
  const labor = concept.items.filter((i) => i.type === 'labor');
  const equipment = concept.items.filter((i) => i.type === 'equipment');
  const auxiliaries = concept.items.filter((i) => i.type === 'auxiliary');
  const subcontracts = concept.items.filter((i) => i.type === 'subcontract');

  // Handle item quantity / yield change
  const handleQuantityChange = (itemId: string, newQty: number) => {
    const updatedItems = concept.items.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          quantity: newQty,
          totalCost: Number((newQty * item.unitCost).toFixed(2)),
        };
      }
      return item;
    });

    onUpdateConcept({
      ...concept,
      items: updatedItems,
    });
  };

  // Handle item unit cost override
  const handleUnitCostChange = (itemId: string, newCost: number) => {
    const updatedItems = concept.items.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          unitCost: newCost,
          totalCost: Number((item.quantity * newCost).toFixed(2)),
        };
      }
      return item;
    });

    onUpdateConcept({
      ...concept,
      items: updatedItems,
    });
  };

  // Delete item
  const handleDeleteItem = (itemId: string) => {
    onUpdateConcept({
      ...concept,
      items: concept.items.filter((i) => i.id !== itemId),
    });
  };

  // Handle Tool & Safety percents
  const handlePercentChange = (field: 'minorToolsPercent' | 'safetyEquipmentPercent', value: number) => {
    onUpdateConcept({
      ...concept,
      [field]: Math.max(0, value),
    });
  };

  // Drop handlers for Drag-and-Drop from catalog
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDropZoneActive(true);
  };

  const handleDragLeave = () => {
    setIsDropZoneActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropZoneActive(false);
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr) {
        const res = JSON.parse(dataStr) as Resource;
        insertResourceIntoConcept(res, res.type === 'labor' ? 0.05 : 1.0);
      }
    } catch (err) {
      console.error('Error dropping resource into concept:', err);
    }
  };

  const insertResourceIntoConcept = (res: Resource, qty: number) => {
    const newItem: MatrixItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      resourceId: res.id,
      code: res.code,
      description: res.description,
      unit: res.unit,
      type: res.type,
      quantity: qty,
      unitCost: res.baseCost,
      totalCost: Number((qty * res.baseCost).toFixed(2)),
    };

    onUpdateConcept({
      ...concept,
      items: [...concept.items, newItem],
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Breadcrumb & Concept Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={onBackToWBS}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-2.5 py-1.5 rounded-md transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a Presupuesto</span>
            </button>
            <span className="text-slate-300">/</span>
            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {concept.code}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenCatalog}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar Insumo desde Catálogo
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
          <div className="md:col-span-8">
            <h1 className="text-base font-bold text-slate-900 leading-snug">
              {concept.description}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <div>
                <span className="font-medium text-slate-600">Unidad de Medida: </span>
                <span className="font-mono font-semibold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                  {concept.unit}
                </span>
              </div>
              <span>·</span>
              <div>
                <span className="font-medium text-slate-600">Volumen en Presupuesto: </span>
                <span className="font-mono font-semibold text-slate-900">
                  {formatNumber(concept.quantity, 2)} {concept.unit}
                </span>
              </div>
              <span>·</span>
              <div>
                <span className="font-medium text-slate-600">Factor FSR Activo: </span>
                <span className="font-mono font-semibold text-emerald-700">
                  {defaultFSR}
                </span>
              </div>
            </div>
          </div>

          {/* Pricing Highlight Pill */}
          <div className="md:col-span-4 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-right">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Precio Unitario de Venta
            </div>
            <div className="text-2xl font-bold font-mono text-blue-600 tabular-nums">
              {formatCurrency(breakdown.unitPrice, currency)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Importe Total: <strong className="font-mono text-slate-900">{formatCurrency(breakdown.totalPrice, currency)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Drag & Drop Hint Banner */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`p-3 rounded-lg border-2 border-dashed transition-all text-center text-xs ${
          isDropZoneActive
            ? 'border-blue-600 bg-blue-50/80 text-blue-800 font-medium scale-[1.01]'
            : 'border-slate-200 bg-slate-50/60 text-slate-500 hover:border-slate-300'
        }`}
      >
        <span className="font-medium text-slate-700">Zona de Soltado Activa: </span>
        Arrastra cualquier material, mano de obra o equipo desde el catálogo lateral y suéltalo aquí para incorporarlo a esta matriz.
      </div>

      {/* Detailed Analysis Breakdown Tables */}
      <div className="space-y-4">
        {/* 1. MATERIALES */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                1. Materiales de Obra
              </h2>
            </div>
            <div className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
              Subtotal: {formatCurrency(breakdown.materialsCost, currency)}
            </div>
          </div>

          <div className="p-0">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/60 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2 w-28">Código</th>
                  <th className="px-4 py-2">Descripción del Material</th>
                  <th className="px-3 py-2 text-center w-16">Unidad</th>
                  <th className="px-3 py-2 text-right w-24">Cantidad</th>
                  <th className="px-3 py-2 text-right w-28">Costo Base</th>
                  <th className="px-4 py-2 text-right w-28">Importe</th>
                  <th className="px-2 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {materials.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-4 text-center text-slate-400 font-sans">
                      Sin materiales asignados en este concepto.
                    </td>
                  </tr>
                ) : (
                  materials.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2 text-slate-600 font-semibold">{item.code}</td>
                      <td className="px-4 py-2 font-sans text-slate-800">{item.description}</td>
                      <td className="px-3 py-2 text-center text-slate-600">{item.unit}</td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          step="0.0001"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(item.id, parseFloat(e.target.value) || 0)}
                          className="w-20 text-right px-1.5 py-0.5 border border-slate-200 rounded font-mono focus:border-blue-500"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitCost}
                          onChange={(e) => handleUnitCostChange(item.id, parseFloat(e.target.value) || 0)}
                          className="w-24 text-right px-1.5 py-0.5 border border-slate-200 rounded font-mono focus:border-blue-500"
                        />
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(item.totalCost, currency)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="Eliminar insumo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. MANO DE OBRA CON FSR */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardHat className="w-4 h-4 text-amber-600" />
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                2. Mano de Obra y Cuadrillas (Aplica FSR: {defaultFSR})
              </h2>
            </div>
            <div className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
              Subtotal con FSR: {formatCurrency(breakdown.laborFSRCost, currency)}
            </div>
          </div>

          <div className="p-0">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/60 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2 w-28">Código</th>
                  <th className="px-4 py-2">Especialidad / Cuadrilla</th>
                  <th className="px-3 py-2 text-center w-16">Unidad</th>
                  <th className="px-3 py-2 text-right w-24">Rendimiento</th>
                  <th className="px-3 py-2 text-right w-28">Salario Base</th>
                  <th className="px-3 py-2 text-right w-28">Salario con FSR</th>
                  <th className="px-4 py-2 text-right w-28">Importe FSR</th>
                  <th className="px-2 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {labor.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-4 text-center text-slate-400 font-sans">
                      Sin mano de obra asignada en este concepto.
                    </td>
                  </tr>
                ) : (
                  labor.map((item) => {
                    const res = resourcesMap[item.resourceId];
                    const itemFSR = res?.fsrFactor || defaultFSR;
                    const realWage = item.unitCost * itemFSR;
                    const itemTotalWithFSR = item.quantity * realWage;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2 text-slate-600 font-semibold">{item.code}</td>
                        <td className="px-4 py-2 font-sans text-slate-800">
                          {item.description}
                          {res?.notes && (
                            <span className="block text-[10px] text-slate-400">{res.notes}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-600">{item.unit}</td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            step="0.0001"
                            min="0"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.id, parseFloat(e.target.value) || 0)}
                            className="w-20 text-right px-1.5 py-0.5 border border-slate-200 rounded font-mono focus:border-blue-500"
                          />
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600">
                          {formatCurrency(item.unitCost, currency)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-emerald-700">
                          {formatCurrency(realWage, currency)}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-slate-900 tabular-nums">
                          {formatCurrency(itemTotalWithFSR, currency)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Eliminar cuadrilla"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Parametric Minor Tools & Safety Equipment Bar */}
          <div className="p-3 bg-amber-50/40 border-t border-amber-100 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5 text-amber-700" />
                <span className="font-medium text-slate-700">Herramienta Menor (% de MO):</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="15"
                  value={concept.minorToolsPercent}
                  onChange={(e) => handlePercentChange('minorToolsPercent', parseFloat(e.target.value) || 0)}
                  className="w-14 px-1.5 py-0.5 text-right border border-amber-300 rounded font-mono bg-white"
                />
                <span className="font-mono text-slate-500">% =</span>
                <span className="font-mono font-semibold text-slate-800">
                  {formatCurrency(breakdown.minorToolsCost, currency)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-medium text-slate-700">Equipo de Protección (% de MO):</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="10"
                  value={concept.safetyEquipmentPercent}
                  onChange={(e) => handlePercentChange('safetyEquipmentPercent', parseFloat(e.target.value) || 0)}
                  className="w-14 px-1.5 py-0.5 text-right border border-blue-300 rounded font-mono bg-white"
                />
                <span className="font-mono text-slate-500">% =</span>
                <span className="font-mono font-semibold text-slate-800">
                  {formatCurrency(breakdown.safetyEquipmentCost, currency)}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 italic">
              Normativa estándar: 3% a 5% herramienta, 2% seguridad personal
            </div>
          </div>
        </div>

        {/* 3. MAQUINARIA Y EQUIPO */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-purple-600" />
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                3. Maquinaria y Equipo (Costo Horario)
              </h2>
            </div>
            <div className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
              Subtotal: {formatCurrency(breakdown.equipmentCost, currency)}
            </div>
          </div>

          <div className="p-0">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/60 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2 w-28">Código</th>
                  <th className="px-4 py-2">Equipo / Maquinaria</th>
                  <th className="px-3 py-2 text-center w-16">Unidad</th>
                  <th className="px-3 py-2 text-right w-24">Rendimiento (Hr)</th>
                  <th className="px-3 py-2 text-right w-28">Costo Horario</th>
                  <th className="px-4 py-2 text-right w-28">Importe</th>
                  <th className="px-2 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {equipment.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-4 text-center text-slate-400 font-sans">
                      Sin maquinaria ni equipo mecánico asignado.
                    </td>
                  </tr>
                ) : (
                  equipment.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2 text-slate-600 font-semibold">{item.code}</td>
                      <td className="px-4 py-2 font-sans text-slate-800">{item.description}</td>
                      <td className="px-3 py-2 text-center text-slate-600">{item.unit}</td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(item.id, parseFloat(e.target.value) || 0)}
                          className="w-20 text-right px-1.5 py-0.5 border border-slate-200 rounded font-mono focus:border-blue-500"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitCost}
                          onChange={(e) => handleUnitCostChange(item.id, parseFloat(e.target.value) || 0)}
                          className="w-24 text-right px-1.5 py-0.5 border border-slate-200 rounded font-mono focus:border-blue-500"
                        />
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(item.totalCost, currency)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="Eliminar equipo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. AUXILIARES Y MEZCLAS */}
        {auxiliaries.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  4. Básicos y Auxiliares (Concretos / Morteros / Mezclas)
                </h2>
              </div>
              <div className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                Subtotal: {formatCurrency(breakdown.auxiliaryCost, currency)}
              </div>
            </div>

            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/60 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2 w-28">Código</th>
                  <th className="px-4 py-2">Mezcla / Auxiliar</th>
                  <th className="px-3 py-2 text-center w-16">Unidad</th>
                  <th className="px-3 py-2 text-right w-24">Cantidad</th>
                  <th className="px-3 py-2 text-right w-28">Costo Base</th>
                  <th className="px-4 py-2 text-right w-28">Importe</th>
                  <th className="px-2 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {auxiliaries.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2 text-slate-600 font-semibold">{item.code}</td>
                    <td className="px-4 py-2 font-sans text-slate-800">{item.description}</td>
                    <td className="px-3 py-2 text-center text-slate-600">{item.unit}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(item.id, parseFloat(e.target.value) || 0)}
                        className="w-20 text-right px-1.5 py-0.5 border border-slate-200 rounded font-mono focus:border-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitCost}
                        onChange={(e) => handleUnitCostChange(item.id, parseFloat(e.target.value) || 0)}
                        className="w-24 text-right px-1.5 py-0.5 border border-slate-200 rounded font-mono focus:border-blue-500"
                      />
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(item.totalCost, currency)}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        title="Eliminar auxiliar"
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

      {/* Sobrecostos Cascading Summary Card */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm border border-slate-800">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Resumen de Integración de Precio Unitario y Sobrecostos
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
          <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
            <span className="text-[10px] text-slate-400 uppercase">Costo Directo (CD)</span>
            <div className="text-sm font-bold font-mono text-white tabular-nums mt-0.5">
              {formatCurrency(breakdown.totalDirectCost, currency)}
            </div>
            <span className="text-[10px] text-slate-400">100.00%</span>
          </div>

          <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
            <span className="text-[10px] text-slate-400 uppercase">
              Indirectos ({(project.markupConfig.indirectOffice + project.markupConfig.indirectField).toFixed(1)}%)
            </span>
            <div className="text-sm font-bold font-mono text-blue-300 tabular-nums mt-0.5">
              +{formatCurrency(breakdown.totalIndirectAmount, currency)}
            </div>
            <span className="text-[10px] text-slate-400">Oficina + Campo</span>
          </div>

          <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
            <span className="text-[10px] text-slate-400 uppercase">
              Financiamiento ({project.markupConfig.financing}%)
            </span>
            <div className="text-sm font-bold font-mono text-purple-300 tabular-nums mt-0.5">
              +{formatCurrency(breakdown.financingAmount, currency)}
            </div>
            <span className="text-[10px] text-slate-400">Costo de capital</span>
          </div>

          <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
            <span className="text-[10px] text-slate-400 uppercase">
              Utilidad ({project.markupConfig.profit}%)
            </span>
            <div className="text-sm font-bold font-mono text-emerald-300 tabular-nums mt-0.5">
              +{formatCurrency(breakdown.profitAmount, currency)}
            </div>
            <span className="text-[10px] text-slate-400">Margen constructor</span>
          </div>

          <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
            <span className="text-[10px] text-slate-400 uppercase">
              Cargos Adic. ({project.markupConfig.extraCharges}%)
            </span>
            <div className="text-sm font-bold font-mono text-amber-300 tabular-nums mt-0.5">
              +{formatCurrency(breakdown.extraChargesAmount, currency)}
            </div>
            <span className="text-[10px] text-slate-400">5 al millar / SFP</span>
          </div>

          <div className="col-span-2 bg-blue-600/20 p-2.5 rounded-lg border border-blue-500/40">
            <span className="text-[10px] text-blue-300 font-semibold uppercase">
              Precio Unitario Final (PU)
            </span>
            <div className="text-lg font-bold font-mono text-blue-400 tabular-nums mt-0.5">
              {formatCurrency(breakdown.unitPrice, currency)} / {concept.unit}
            </div>
            <span className="text-[10px] text-blue-200">
              Factor Multiplicador: {breakdown.markupMultiplier}x
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
