/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  ClipboardList,
  Plus,
  Trash2,
  Printer,
  Download,
  Building,
  FileCheck2,
  DollarSign,
  ChevronRight,
  Eye,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { Estimate, Project, MatrixConcept } from '../types/apu';
import { formatCurrency } from '../utils/calculations';

interface EstimatesViewProps {
  project: Project;
  onUpdateProject: (project: Project) => void;
  onExport: () => void;
}

export const EstimatesView: React.FC<EstimatesViewProps> = ({ project, onUpdateProject, onExport }) => {
  const estimates = project.estimates || [];
  const concepts = Object.values(project.concepts);

  // Form State
  const [number, setNumber] = useState(String(estimates.length + 1).padStart(3, '0'));
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [conceptId, setConceptId] = useState(concepts[0]?.id || '');
  const [quantity, setQuantity] = useState('1');
  const [selectedEstimateId, setSelectedEstimateId] = useState<string>(estimates[0]?.id || '');

  const accumulated = useMemo(
    () => estimates.reduce((sum, estimate) => sum + (estimate.total || 0), 0),
    [estimates]
  );

  // Active selected estimate for detailed ficha view
  const activeEstimate = estimates.find((e) => e.id === selectedEstimateId) || estimates[0];

  const addEstimate = (event: React.FormEvent) => {
    event.preventDefault();
    const concept = project.concepts[conceptId];
    const qty = Math.max(0, Number(quantity) || 0);
    if (!concept || !qty) return;

    // Use concept unitPrice or directCost
    const pu = concept.unitPrice || concept.directCost || 0;
    const amount = Number((qty * pu).toFixed(2));

    const generator = project.generators?.[conceptId];
    const estimate: Estimate = {
      id: `est_${Date.now()}`,
      number,
      date,
      status: 'borrador',
      items: [{
        conceptId,
        quantity: qty,
        amount,
        generatorSheetId: generator?.id,
        generatorVolume: generator?.totalVolume,
      }],
      subtotal: amount,
      total: amount,
      notes: `Estimación ordinaria correspondiente al concepto ${concept.code}`,
    };

    const newEstimates = [...estimates, estimate];
    onUpdateProject({
      ...project,
      estimates: newEstimates,
      lastModified: new Date().toISOString(),
    });

    setSelectedEstimateId(estimate.id);
    setNumber(String(newEstimates.length + 1).padStart(3, '0'));
    setQuantity('1');
  };

  // Quick fill quantity from Generator if available
  const handleFillFromGenerator = () => {
    const gen = project.generators?.[conceptId];
    if (gen && gen.totalVolume > 0) {
      setQuantity(String(gen.totalVolume));
    } else {
      const c = project.concepts[conceptId];
      if (c) setQuantity(String(c.quantity));
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
              <ClipboardList className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  Control y Fichas de Estimaciones de Obra
                </h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                  {estimates.length} Estimaciones
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Cobro de avance físico respaldado por precios unitarios y números generadores.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right text-xs pr-2 border-r border-slate-200">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">Total Estimado Acumulado</span>
              <strong className="text-base text-slate-900 font-mono font-bold">
                {formatCurrency(accumulated, project.currency)}
              </strong>
            </div>

            <button
              onClick={onExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Imprimir Ficha</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Create & List */}
        <div className="w-[480px] bg-white border-r border-slate-200 flex flex-col overflow-y-auto p-5 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              Nueva Estimación Ordinaria
            </span>

            <form onSubmit={addEstimate} className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Núm. Estimación</label>
                  <input
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Fecha de Corte</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Concepto de Obra</label>
                <select
                  value={conceptId}
                  onChange={(e) => setConceptId(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-slate-800"
                >
                  <option value="">Seleccionar concepto...</option>
                  {concepts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} · {c.description.slice(0, 45)}... ({formatCurrency(c.unitPrice, project.currency)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-slate-600 font-medium mb-1">Cantidad a Estimar</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md font-mono font-bold"
                  />
                </div>

                <div className="pt-5">
                  <button
                    type="button"
                    onClick={handleFillFromGenerator}
                    title="Cargar cantidad desde el Número Generador calculado"
                    className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-md text-[11px] font-semibold whitespace-nowrap"
                  >
                    Cargar de Generador
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Generar Estimación</span>
              </button>
            </form>
          </div>

          {/* List of Estimates */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Historial de Estimaciones
            </span>

            {estimates.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                No hay estimaciones registradas.
              </div>
            ) : (
              estimates.map((est) => {
                const isSelected = est.id === (activeEstimate?.id || selectedEstimateId);
                return (
                  <div
                    key={est.id}
                    onClick={() => setSelectedEstimateId(est.id)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-300 shadow-2xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">ESTIMACIÓN #{est.number}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{est.date}</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-800">
                        {formatCurrency(est.total, project.currency)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                      <select
                        value={est.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          onUpdateProject({
                            ...project,
                            estimates: estimates.map((item) =>
                              item.id === est.id ? { ...item, status: e.target.value as any } : item
                            ),
                          })
                        }
                        className="px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200 bg-white"
                      >
                        <option value="borrador">Borrador</option>
                        <option value="presentada">Presentada</option>
                        <option value="pagada">Pagada</option>
                      </select>

                      <button
                        title="Eliminar"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`¿Deseas eliminar la estimación #${est.number}?`)) {
                            onUpdateProject({
                              ...project,
                              estimates: estimates.filter((item) => item.id !== est.id),
                            });
                          }
                        }}
                        className="text-slate-300 hover:text-rose-600 p-1 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Detailed Ficha de Estimación (Formal Document) */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
          {activeEstimate ? (
            <div className="bg-white border border-slate-300 shadow-sm rounded-lg w-full max-w-4xl p-8 space-y-4 text-slate-800">
              {/* Header Box */}
              <div className="border-2 border-slate-800 p-4 rounded-md space-y-3">
                <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-emerald-700 text-white rounded font-extrabold flex items-center justify-center text-sm font-mono">
                      EST
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold tracking-tight text-slate-900 uppercase">
                        ESTIMACIÓN DE TRABAJOS EJECUTADOS #{activeEstimate.number}
                      </h2>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block">
                        Cédula de Liquidación Periódica de Obra
                      </span>
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    <span className="text-slate-400 block text-[10px] font-mono">ESTATUS</span>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        activeEstimate.status === 'pagada'
                          ? 'bg-emerald-100 text-emerald-800'
                          : activeEstimate.status === 'presentada'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {activeEstimate.status}
                    </span>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">OBRA:</span>
                    <strong className="text-slate-900 block font-semibold">{project.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">CLIENTE / DEPENDENCIA:</span>
                    <strong className="text-slate-900 block font-semibold">{project.client}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">UBICACIÓN:</span>
                    <span className="text-slate-700 block">{project.location}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">FECHA DE CORTE:</span>
                    <span className="font-mono text-slate-800 font-medium">{activeEstimate.date}</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-300 rounded-md overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3 w-28">Clave</th>
                      <th className="py-2.5 px-3">Concepto Ejecutado</th>
                      <th className="py-2.5 px-2 text-center w-16">Unidad</th>
                      <th className="py-2.5 px-3 text-right w-24">Cantidad</th>
                      <th className="py-2.5 px-3 text-right w-28">P.U. Autorizado</th>
                      <th className="py-2.5 px-2 text-center w-24">Soporte</th>
                      <th className="py-2.5 px-3 text-right w-32 bg-emerald-900">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-xs">
                    {activeEstimate.items.map((item, idx) => {
                      const concept = project.concepts[item.conceptId];
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{concept?.code || item.conceptId}</td>
                          <td className="py-2.5 px-3 font-sans font-medium text-slate-800">
                            {concept?.description || 'Concepto de obra'}
                          </td>
                          <td className="py-2.5 px-2 text-center text-slate-600 font-sans">{concept?.unit || '—'}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">{item.quantity}</td>
                          <td className="py-2.5 px-3 text-right text-slate-700">
                            {formatCurrency(concept?.unitPrice || 0, project.currency)}
                          </td>
                          <td className="py-2.5 px-2 text-center font-sans">
                            {item.generatorSheetId ? (
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800" title={`Volumen generado: ${item.generatorVolume ?? item.quantity} ${concept?.unit || ''}`}>
                                N. generador
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Manual</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-900 bg-emerald-50/40">
                            {formatCurrency(item.amount, project.currency)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-slate-800 font-mono text-xs font-bold">
                      <td colSpan={6} className="py-3 px-3 text-right font-sans uppercase">
                        TOTAL ESTIMACIÓN #{activeEstimate.number}:
                      </td>
                      <td className="py-3 px-3 text-right text-sm text-emerald-900 bg-emerald-100/60">
                        {formatCurrency(activeEstimate.total, project.currency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-12 pt-8 text-center text-xs">
                <div className="space-y-1">
                  <div className="border-b border-slate-800 pb-8 font-semibold text-slate-800">
                    Contratista de Obra
                  </div>
                  <span className="font-bold uppercase tracking-wider text-slate-700 text-[10px] block">
                    Por la Empresa Ejecutora
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="border-b border-slate-800 pb-8 font-semibold text-slate-800">
                    Supervisión / Residencia de Obra
                  </div>
                  <span className="font-bold uppercase tracking-wider text-slate-700 text-[10px] block">
                    Aprobó para Pago
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs">
              Selecciona una estimación para visualizar su ficha técnica formal.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
