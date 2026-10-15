/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, SlidersHorizontal, HardHat, Percent, Check, RefreshCw, Info } from 'lucide-react';
import { FSRConfig, MarkupConfig, Project } from '../types/apu';
import { calculateFSR } from '../utils/calculations';

interface MarkupModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onSave: (updatedMarkup: MarkupConfig, updatedFSR: FSRConfig) => void;
}

export const MarkupModal: React.FC<MarkupModalProps> = ({
  isOpen,
  onClose,
  project,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'markup' | 'fsr'>('markup');

  const [markup, setMarkup] = useState<MarkupConfig>({ ...project.markupConfig });
  const [fsr, setFsr] = useState<FSRConfig>({ ...project.fsrConfig });

  if (!isOpen) return null;

  const currentFSR = calculateFSR(fsr);

  const daysPaid = fsr.calendarDays + fsr.yearEndBonusDays + fsr.vacationPremiumDays;
  const nonWorkingDays = fsr.sundays + fsr.paidVacationDays + fsr.officialHolidays + fsr.customaryHolidays;
  const daysWorked = Math.max(1, fsr.calendarDays - nonWorkingDays);

  const handleSave = () => {
    onSave(markup, { ...fsr, calculatedFSR: currentFSR });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 leading-tight">
                Sobrecostos y Factor de Salario Real (FSR)
              </h2>
              <p className="text-xs text-slate-500">
                Parámetros regulatorios y porcentajes de indirectos aplicados a todo el presupuesto
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 px-4 pt-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('markup')}
            className={`px-3 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'markup'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-md'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Factores de Sobrecosto (Indirectos y Utilidad)
          </button>
          <button
            onClick={() => setActiveTab('fsr')}
            className={`px-3 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'fsr'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-md'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Calculadora de Salario Real (FSR LFT / IMSS)
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'markup' ? (
            <div className="space-y-4 text-xs">
              <div className="bg-blue-50/70 border border-blue-100 rounded-lg p-3 text-slate-700 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p>
                  Los porcentajes de sobrecosto se aplican en cascada al costo directo de cada matriz de precio unitario:
                  <strong className="block text-blue-900 mt-0.5">
                    Costo Directo → + Indirectos → + Financiamiento → + Utilidad → + Cargos Adicionales = Precio Unitario
                  </strong>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 border border-slate-200 rounded-lg space-y-1 bg-white">
                  <label className="font-semibold text-slate-900 block">
                    Indirectos de Oficina Central (%)
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Gastos administrativos, rentas de corporativo, honorarios directivos, contabilidad.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={markup.indirectOffice}
                      onChange={(e) => setMarkup({ ...markup, indirectOffice: parseFloat(e.target.value) || 0 })}
                      className="w-24 px-2 py-1.5 border border-slate-200 rounded font-mono text-right text-xs"
                    />
                    <span className="font-mono text-slate-500">%</span>
                  </div>
                </div>

                <div className="p-3.5 border border-slate-200 rounded-lg space-y-1 bg-white">
                  <label className="font-semibold text-slate-900 block">
                    Indirectos de Campo / Obra (%)
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Supervisión residente, bodega temporal, energía provisional, velador, fletes.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={markup.indirectField}
                      onChange={(e) => setMarkup({ ...markup, indirectField: parseFloat(e.target.value) || 0 })}
                      className="w-24 px-2 py-1.5 border border-slate-200 rounded font-mono text-right text-xs"
                    />
                    <span className="font-mono text-slate-500">%</span>
                  </div>
                </div>

                <div className="p-3.5 border border-slate-200 rounded-lg space-y-1 bg-white">
                  <label className="font-semibold text-slate-900 block">
                    Costo de Financiamiento (%)
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Costo de capital de trabajo por desfase entre estimaciones cobradas y nómina pagada.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={markup.financing}
                      onChange={(e) => setMarkup({ ...markup, financing: parseFloat(e.target.value) || 0 })}
                      className="w-24 px-2 py-1.5 border border-slate-200 rounded font-mono text-right text-xs"
                    />
                    <span className="font-mono text-slate-500">%</span>
                  </div>
                </div>

                <div className="p-3.5 border border-slate-200 rounded-lg space-y-1 bg-white">
                  <label className="font-semibold text-slate-900 block">
                    Utilidad de la Empresa (%)
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Ganancia neta esperada del contratista antes del impuesto sobre la renta (ISR).
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={markup.profit}
                      onChange={(e) => setMarkup({ ...markup, profit: parseFloat(e.target.value) || 0 })}
                      className="w-24 px-2 py-1.5 border border-slate-200 rounded font-mono text-right text-xs"
                    />
                    <span className="font-mono text-slate-500">%</span>
                  </div>
                </div>

                <div className="p-3.5 border border-slate-200 rounded-lg space-y-1 bg-white md:col-span-2">
                  <label className="font-semibold text-slate-900 block">
                    Cargos Adicionales (Inspección / 5 al millar) (%)
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Retenciones por supervisión gubernamental (Secretaría de la Función Pública, etc.)
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      value={markup.extraCharges}
                      onChange={(e) => setMarkup({ ...markup, extraCharges: parseFloat(e.target.value) || 0 })}
                      className="w-24 px-2 py-1.5 border border-slate-200 rounded font-mono text-right text-xs"
                    />
                    <span className="font-mono text-slate-500">%</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              {/* FSR Result Card */}
              <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                    Factor de Salario Real Calculado
                  </span>
                  <div className="text-3xl font-bold font-mono text-emerald-400 tabular-nums">
                    {currentFSR}
                  </div>
                  <span className="text-xs text-slate-300">
                    Por cada $1.00 de salario nominal pagado, el costo real para la empresa es de ${currentFSR}
                  </span>
                </div>

                <div className="text-right text-xs space-y-1 font-mono text-slate-300">
                  <div>Días Pagados (Tp): <strong className="text-white">{daysPaid}</strong></div>
                  <div>Días Trabajados (Tl): <strong className="text-white">{daysWorked}</strong></div>
                  <div>Relación Tp/Tl: <strong className="text-white">{(daysPaid / daysWorked).toFixed(4)}</strong></div>
                </div>
              </div>

              {/* FSR Inputs Form */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="p-2.5 border border-slate-200 rounded-lg bg-white">
                  <label className="block text-[11px] font-medium text-slate-700">Días Calendario</label>
                  <input
                    type="number"
                    value={fsr.calendarDays}
                    onChange={(e) => setFsr({ ...fsr, calendarDays: parseInt(e.target.value) || 365 })}
                    className="w-full mt-1 px-2 py-1 border border-slate-200 rounded font-mono text-xs"
                  />
                </div>

                <div className="p-2.5 border border-slate-200 rounded-lg bg-white">
                  <label className="block text-[11px] font-medium text-slate-700">Domingos</label>
                  <input
                    type="number"
                    value={fsr.sundays}
                    onChange={(e) => setFsr({ ...fsr, sundays: parseInt(e.target.value) || 52 })}
                    className="w-full mt-1 px-2 py-1 border border-slate-200 rounded font-mono text-xs"
                  />
                </div>

                <div className="p-2.5 border border-slate-200 rounded-lg bg-white">
                  <label className="block text-[11px] font-medium text-slate-700">Días Aguinaldo</label>
                  <input
                    type="number"
                    value={fsr.yearEndBonusDays}
                    onChange={(e) => setFsr({ ...fsr, yearEndBonusDays: parseInt(e.target.value) || 15 })}
                    className="w-full mt-1 px-2 py-1 border border-slate-200 rounded font-mono text-xs"
                  />
                </div>

                <div className="p-2.5 border border-slate-200 rounded-lg bg-white">
                  <label className="block text-[11px] font-medium text-slate-700">Días Vacaciones (Ley)</label>
                  <input
                    type="number"
                    value={fsr.paidVacationDays}
                    onChange={(e) => setFsr({ ...fsr, paidVacationDays: parseInt(e.target.value) || 12 })}
                    className="w-full mt-1 px-2 py-1 border border-slate-200 rounded font-mono text-xs"
                  />
                </div>

                <div className="p-2.5 border border-slate-200 rounded-lg bg-white">
                  <label className="block text-[11px] font-medium text-slate-700">Prima Vacacional (Días)</label>
                  <input
                    type="number"
                    value={fsr.vacationPremiumDays}
                    onChange={(e) => setFsr({ ...fsr, vacationPremiumDays: parseFloat(e.target.value) || 3 })}
                    className="w-full mt-1 px-2 py-1 border border-slate-200 rounded font-mono text-xs"
                  />
                </div>

                <div className="p-2.5 border border-slate-200 rounded-lg bg-white">
                  <label className="block text-[11px] font-medium text-slate-700">Festivos Oficiales</label>
                  <input
                    type="number"
                    value={fsr.officialHolidays}
                    onChange={(e) => setFsr({ ...fsr, officialHolidays: parseInt(e.target.value) || 8 })}
                    className="w-full mt-1 px-2 py-1 border border-slate-200 rounded font-mono text-xs"
                  />
                </div>

                <div className="p-2.5 border border-slate-200 rounded-lg bg-white">
                  <label className="block text-[11px] font-medium text-slate-700">Costumbre / Clima</label>
                  <input
                    type="number"
                    value={fsr.customaryHolidays}
                    onChange={(e) => setFsr({ ...fsr, customaryHolidays: parseInt(e.target.value) || 3 })}
                    className="w-full mt-1 px-2 py-1 border border-slate-200 rounded font-mono text-xs"
                  />
                </div>

                <div className="p-2.5 border border-slate-200 rounded-lg bg-white col-span-2">
                  <label className="block text-[11px] font-medium text-slate-700">
                    Cuotas Obrero-Patronales IMSS + Infonavit (% SBC)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={fsr.imssInfonavitRate}
                    onChange={(e) => setFsr({ ...fsr, imssInfonavitRate: parseFloat(e.target.value) || 28.5 })}
                    className="w-full mt-1 px-2 py-1 border border-slate-200 rounded font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Los cambios se aplicarán inmediatamente a todas las matrices del proyecto.
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Guardar y Recalcular
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
