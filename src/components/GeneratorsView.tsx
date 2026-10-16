/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Download,
  Printer,
  Link,
  CheckCircle2,
  Building,
  User,
  MapPin,
  Calendar,
  Layers,
  ChevronRight,
  Calculator,
  ArrowRight,
  Info
} from 'lucide-react';
import { Project, GeneratorSheet, GeneratorRow, MatrixConcept } from '../types/apu';
import { formatCurrency } from '../utils/calculations';

interface GeneratorsViewProps {
  project: Project;
  onUpdateProject: (project: Project) => void;
  selectedConceptId?: string;
  onSelectConcept?: (conceptId: string) => void;
}

const GENERATORS_TEMPLATE_NAME = 'NUMEROS_GENERADORES-ALTATA_GAMBOA_RUELAS';

export const GeneratorsView: React.FC<GeneratorsViewProps> = ({
  project,
  onUpdateProject,
  selectedConceptId,
  onSelectConcept,
}) => {
  // All concepts in project as a list
  const conceptsList = useMemo(() => {
    return Object.values(project.concepts || {});
  }, [project.concepts]);

  // Active concept id
  const [activeConceptId, setActiveConceptId] = useState<string>(() => {
    if (selectedConceptId && project.concepts[selectedConceptId]) {
      return selectedConceptId;
    }
    return conceptsList.length > 0 ? conceptsList[0].id : '';
  });

  useEffect(() => {
    if (selectedConceptId && project.concepts[selectedConceptId]) {
      setActiveConceptId(selectedConceptId);
    }
  }, [selectedConceptId, project.concepts]);

  const activeConcept = project.concepts[activeConceptId] || conceptsList[0];

  // Find or initialize generator sheet for the active concept
  const currentSheet: GeneratorSheet = useMemo(() => {
    if (!activeConcept) {
      return {
        id: 'gen_empty',
        conceptId: '',
        conceptCode: '',
        conceptDescription: '',
        unit: 'M2',
        partida: 'PRELIMINARES',
        contratista: 'Luis Alberto Gamboa Ruelas',
        direccion: project.location || 'Altata, Navolato, Sinaloa.',
        obraNombre: project.name || 'Casa Altata',
        clienteNombre: project.client || 'Cliente Particular',
        fecha: project.date || new Date().toISOString().slice(0, 10),
        rows: [],
        totalVolume: 0,
        responsableEmpresa: 'Arq. Luis Diego Peregrina García',
        responsableContratante: 'Supervisión de Obra',
        templateName: GENERATORS_TEMPLATE_NAME,
      };
    }

    const saved = project.generators?.[activeConcept.id];
    if (saved) {
      // La ficha conserva sus mediciones, pero su identificación siempre se
      // actualiza con la obra, cliente y concepto actualmente seleccionados.
      return {
        ...saved,
        conceptId: activeConcept.id,
        conceptCode: activeConcept.code,
        conceptDescription: activeConcept.description,
        unit: activeConcept.unit,
        obraNombre: project.name || saved.obraNombre,
        clienteNombre: project.client || saved.clienteNombre,
        direccion: project.location || saved.direccion,
        templateName: saved.templateName || GENERATORS_TEMPLATE_NAME,
      };
    }

    // Default template rows inspired by ALTATA_GAMBOA_RUELAS
    const defaultRows: GeneratorRow[] = [
      {
        id: `row_1`,
        eje: 'A-G',
        tramoDesde: '1',
        tramoHasta: '9',
        largo: 16.0,
        ancho: 7.5,
        alto: 1.0,
        piezas: 1,
        subtotal: 120.0,
        observaciones: 'Tramo principal de desplante',
      },
      {
        id: `row_2`,
        eje: '1-4',
        tramoDesde: 'A',
        tramoHasta: 'C',
        largo: 4.5,
        ancho: 3.2,
        alto: 1.0,
        piezas: 1,
        subtotal: 14.4,
        observaciones: 'Área posterior',
      },
    ];

    const total = defaultRows.reduce((sum, r) => sum + r.subtotal, 0);

    return {
      id: `gen_${activeConcept.id}`,
      conceptId: activeConcept.id,
      conceptCode: activeConcept.code,
      conceptDescription: activeConcept.description,
      unit: activeConcept.unit,
      partida: 'PRELIMINARES Y CIMENTACIÓN',
      contratista: 'Luis Alberto Gamboa Ruelas',
      direccion: project.location || 'Altata, Navolato, Sinaloa.',
      obraNombre: project.name || 'Casa Altata',
      clienteNombre: project.client || 'Dependencia / Contratante',
      fecha: project.date || new Date().toISOString().slice(0, 10),
      rows: defaultRows,
      totalVolume: total,
      responsableEmpresa: 'Arq. Luis Diego Peregrina García',
      responsableContratante: 'Supervisión de Obra / Cliente',
      templateName: GENERATORS_TEMPLATE_NAME,
    };
  }, [activeConcept, project.generators, project.name, project.client, project.location, project.date]);

  // Update rows or header fields
  const handleUpdateSheet = (updatedSheet: GeneratorSheet) => {
    const totalVolume = updatedSheet.rows.reduce((sum, r) => sum + (Number(r.subtotal) || 0), 0);
    const finalSheet = {
      ...updatedSheet,
      totalVolume: Number(totalVolume.toFixed(3)),
    };

    const newGenerators = {
      ...(project.generators || {}),
      [finalSheet.conceptId]: finalSheet,
    };

    onUpdateProject({
      ...project,
      generators: newGenerators,
    });
  };

  // Add row
  const handleAddRow = () => {
    const newRow: GeneratorRow = {
      id: `row_${Date.now()}`,
      eje: 'EJE',
      tramoDesde: '1',
      tramoHasta: '2',
      largo: 1.0,
      ancho: 1.0,
      alto: 1.0,
      piezas: 1,
      subtotal: 1.0,
      observaciones: '',
    };
    handleUpdateSheet({
      ...currentSheet,
      rows: [...currentSheet.rows, newRow],
    });
  };

  // Update individual row cell
  const handleUpdateRow = (rowId: string, field: keyof GeneratorRow, val: any) => {
    const updatedRows = currentSheet.rows.map((row) => {
      if (row.id !== rowId) return row;
      const updated = { ...row, [field]: val };

      // Recompute subtotal
      const largo = Number(field === 'largo' ? val : updated.largo) || 0;
      const ancho = Number(field === 'ancho' ? val : updated.ancho) || 0;
      const alto = Number(field === 'alto' ? val : updated.alto) || 0;
      const piezas = Number(field === 'piezas' ? val : updated.piezas) || 1;

      let subtotal = 0;
      const unitUpper = (currentSheet.unit || '').toUpperCase();
      if (unitUpper === 'M3') {
        subtotal = largo * ancho * alto * piezas;
      } else if (unitUpper === 'M2') {
        subtotal = largo * ancho * (alto || 1) * piezas;
      } else if (unitUpper === 'M' || unitUpper === 'ML') {
        subtotal = largo * piezas;
      } else {
        subtotal = piezas * (largo || 1);
      }

      updated.subtotal = Number(subtotal.toFixed(3));
      return updated;
    });

    handleUpdateSheet({
      ...currentSheet,
      rows: updatedRows,
    });
  };

  // Delete row
  const handleDeleteRow = (rowId: string) => {
    handleUpdateSheet({
      ...currentSheet,
      rows: currentSheet.rows.filter((r) => r.id !== rowId),
    });
  };

  // Link volume directly to concept in budget
  const handleLinkVolumeToBudget = () => {
    if (!activeConcept) return;

    const roundedVolume = Number(currentSheet.totalVolume.toFixed(3));
    const updatedConcept: MatrixConcept = {
      ...activeConcept,
      quantity: roundedVolume,
      totalPrice: Number((roundedVolume * activeConcept.unitPrice).toFixed(2)),
    };

    // Update WBS tree nodes too
    function updateWBSQty(nodes: any[]): any[] {
      return nodes.map((n) => {
        if (n.conceptId === activeConcept.id) {
          return {
            ...n,
            quantity: roundedVolume,
            totalPrice: Number((roundedVolume * (n.unitPrice || 0)).toFixed(2)),
          };
        }
        if (n.children) {
          return { ...n, children: updateWBSQty(n.children) };
        }
        return n;
      });
    }

    onUpdateProject({
      ...project,
      concepts: {
        ...project.concepts,
        [activeConcept.id]: updatedConcept,
      },
      wbs: updateWBSQty(project.wbs),
      generators: {
        ...(project.generators || {}),
        [activeConcept.id]: currentSheet,
      },
    });

    alert(
      `¡Volumen vinculado con éxito!\n\nEl concepto "${activeConcept.code}" ahora tiene una cantidad de ${roundedVolume} ${activeConcept.unit} en el presupuesto WBS.`
    );
  };

  // Export current sheet to CSV
  const handleExportCSV = () => {
    const lines = [
      `"NÚMEROS GENERADORES DE OBRA - FORMATO OFICIAL"`,
      `"Obra:","${project.name}","Contratista:","${currentSheet.contratista}"`,
      `"Cliente:","${project.client}","Ubicación:","${currentSheet.direccion}"`,
      `"Fecha:","${currentSheet.fecha}","Clave Concepto:","${activeConcept?.code || ''}"`,
      `"Concepto:","${(activeConcept?.description || '').replace(/"/g, '""')}"`,
      `"Unidad:","${currentSheet.unit}"`,
      '',
      `"Eje","Tramo Desde","Tramo Hasta","Largo","Ancho","Alto","Pzas","Total (${currentSheet.unit})","Observaciones"`,
      ...currentSheet.rows.map(
        (r) =>
          `"${r.eje}","${r.tramoDesde}","${r.tramoHasta}","${r.largo}","${r.ancho}","${r.alto}","${r.piezas}","${r.subtotal}","${(r.observaciones || '').replace(/"/g, '""')}"`
      ),
      '',
      `"","","","","","TOTAL VOLUMEN GENERADO:","","${currentSheet.totalVolume}","${currentSheet.unit}"`,
    ];

    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Se conserva el nombre institucional como base y se agrega el concepto
    // para que cada ficha quede identificada al descargarse.
    const safeConcept = (activeConcept?.code || 'CONCEPTO').replace(/[^a-zA-Z0-9_-]+/g, '_');
    a.download = `${GENERATORS_TEMPLATE_NAME}_${safeConcept}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  Números Generadores & Ficha de Volúmenes
                </h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                  PLANTILLA: ALTATA_GAMBOA_RUELAS
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Memoria de cálculo de cantidades por tramos, ejes y dimensiones, vinculada a los conceptos del presupuesto.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLinkVolumeToBudget}
              title="Actualizar la cantidad del concepto en el presupuesto con el total generado"
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
            >
              <Link className="w-3.5 h-3.5" />
              <span>Vincular Volumen a Presupuesto</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Exportar Ficha</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace: Left sidebar concepts selector + Right Excel generator sheet */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left concept selector */}
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              Conceptos de Obra ({conceptsList.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conceptsList.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">No hay conceptos en la obra.</div>
            ) : (
              conceptsList.map((c) => {
                const isSelected = c.id === activeConceptId;
                const gen = project.generators?.[c.id];
                const hasGen = Boolean(gen && gen.rows.length > 0);

                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveConceptId(c.id)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-2xs font-medium'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold">{c.code}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                        {c.quantity} {c.unit}
                      </span>
                    </div>
                    <div className="truncate text-slate-600 text-[11px] mt-1">{c.description}</div>
                    {hasGen && (
                      <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold mt-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Generado: {gen?.totalVolume} {c.unit}</span>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Generator Sheet (Exact Altata Gamboa Ruelas Layout) */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
          <div className="bg-white border border-slate-300 shadow-sm rounded-lg w-full max-w-5xl p-8 space-y-4 text-slate-800">
            {/* Header Box (Altata Gamboa Ruelas Style) */}
            <div className="border-2 border-slate-800 p-4 rounded-md space-y-3">
              <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-slate-900 text-white rounded font-extrabold flex items-center justify-center text-sm font-mono">
                    NG
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold tracking-tight text-slate-900 uppercase">
                      NÚMEROS GENERADORES DE OBRA
                    </h2>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block">
                      Cédula de Cuantificación y Control Físico
                    </span>
                  </div>
                </div>

                <div className="text-right text-xs">
                  <span className="text-slate-400 block text-[10px] font-mono">FECHA</span>
                  <input
                    type="date"
                    value={currentSheet.fecha}
                    onChange={(e) => handleUpdateSheet({ ...currentSheet, fecha: e.target.value })}
                    className="font-mono font-bold text-slate-900 border-0 bg-transparent text-right focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Identification Grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-slate-900 w-28 shrink-0">Contratista:</span>
                  <input
                    type="text"
                    value={currentSheet.contratista}
                    onChange={(e) => handleUpdateSheet({ ...currentSheet, contratista: e.target.value })}
                    className="flex-1 font-medium border-b border-slate-300 focus:border-blue-500 focus:outline-none px-1"
                  />
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-slate-900 w-28 shrink-0">Obra / Proyecto:</span>
                  <span className="flex-1 font-bold text-blue-700 border-b border-slate-200 px-1 truncate">
                    {project.name}
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-slate-900 w-28 shrink-0">Dirección:</span>
                  <input
                    type="text"
                    value={currentSheet.direccion}
                    onChange={(e) => handleUpdateSheet({ ...currentSheet, direccion: e.target.value })}
                    className="flex-1 font-medium border-b border-slate-300 focus:border-blue-500 focus:outline-none px-1"
                  />
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-slate-900 w-28 shrink-0">Cliente / Dep.:</span>
                  <span className="flex-1 font-medium text-slate-800 border-b border-slate-200 px-1 truncate">
                    {project.client}
                  </span>
                </div>
              </div>

              {/* Concept Data Strip */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-slate-900 bg-white px-2 py-0.5 border border-slate-300 rounded">
                      CLAVE: {activeConcept?.code || '—'}
                    </span>
                    <span className="font-semibold text-slate-700">UNIDAD: {activeConcept?.unit || 'M2'}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Cantidad actual en presupuesto: <strong className="font-mono text-slate-900">{activeConcept?.quantity} {activeConcept?.unit}</strong>
                  </div>
                </div>

                <div className="text-slate-800 font-medium text-[11px] pt-1 leading-snug">
                  {activeConcept?.description}
                </div>
              </div>
            </div>

            {/* Calculations Table (Altata Gamboa Ruelas Columns) */}
            <div className="border border-slate-300 rounded-md overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider text-center">
                    <th rowSpan={2} className="py-2 px-2 border-r border-slate-800 w-28">Localización (Eje)</th>
                    <th colSpan={2} className="py-1 px-2 border-r border-slate-800 border-b border-slate-800">Tramo</th>
                    <th colSpan={3} className="py-1 px-2 border-r border-slate-800 border-b border-slate-800">Dimensiones (m)</th>
                    <th rowSpan={2} className="py-2 px-2 border-r border-slate-800 w-16">Pzas</th>
                    <th rowSpan={2} className="py-2 px-3 border-r border-slate-800 w-28 text-right bg-blue-900">
                      Total ({currentSheet.unit})
                    </th>
                    <th rowSpan={2} className="py-2 px-3">Observaciones / Referencia</th>
                    <th rowSpan={2} className="py-2 px-2 w-10 text-center"></th>
                  </tr>
                  <tr className="bg-slate-800 text-slate-200 font-semibold text-[9px] uppercase tracking-wider text-center">
                    <th className="py-1 px-1 border-r border-slate-700 w-16">Desde</th>
                    <th className="py-1 px-1 border-r border-slate-700 w-16">Hasta</th>
                    <th className="py-1 px-1 border-r border-slate-700 w-16">Largo</th>
                    <th className="py-1 px-1 border-r border-slate-700 w-16">Ancho</th>
                    <th className="py-1 px-1 border-r border-slate-700 w-16">Alto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  {currentSheet.rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={row.eje}
                          onChange={(e) => handleUpdateRow(row.id, 'eje', e.target.value)}
                          placeholder="A-G"
                          className="w-full text-center uppercase font-bold text-slate-800 bg-transparent focus:bg-white focus:outline-none"
                        />
                      </td>
                      <td className="p-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={row.tramoDesde}
                          onChange={(e) => handleUpdateRow(row.id, 'tramoDesde', e.target.value)}
                          placeholder="1"
                          className="w-full text-center font-medium text-slate-700 bg-transparent focus:bg-white focus:outline-none"
                        />
                      </td>
                      <td className="p-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={row.tramoHasta}
                          onChange={(e) => handleUpdateRow(row.id, 'tramoHasta', e.target.value)}
                          placeholder="9"
                          className="w-full text-center font-medium text-slate-700 bg-transparent focus:bg-white focus:outline-none"
                        />
                      </td>
                      <td className="p-1 border-r border-slate-200">
                        <input
                          type="number"
                          step="0.01"
                          value={row.largo}
                          onChange={(e) => handleUpdateRow(row.id, 'largo', parseFloat(e.target.value) || 0)}
                          className="w-full text-center text-slate-900 bg-transparent focus:bg-white focus:outline-none"
                        />
                      </td>
                      <td className="p-1 border-r border-slate-200">
                        <input
                          type="number"
                          step="0.01"
                          value={row.ancho}
                          onChange={(e) => handleUpdateRow(row.id, 'ancho', parseFloat(e.target.value) || 0)}
                          className="w-full text-center text-slate-900 bg-transparent focus:bg-white focus:outline-none"
                        />
                      </td>
                      <td className="p-1 border-r border-slate-200">
                        <input
                          type="number"
                          step="0.01"
                          value={row.alto}
                          onChange={(e) => handleUpdateRow(row.id, 'alto', parseFloat(e.target.value) || 0)}
                          className="w-full text-center text-slate-900 bg-transparent focus:bg-white focus:outline-none"
                        />
                      </td>
                      <td className="p-1 border-r border-slate-200">
                        <input
                          type="number"
                          min="1"
                          value={row.piezas}
                          onChange={(e) => handleUpdateRow(row.id, 'piezas', parseInt(e.target.value) || 1)}
                          className="w-full text-center text-slate-900 bg-transparent focus:bg-white focus:outline-none"
                        />
                      </td>
                      <td className="p-1 border-r border-slate-200 text-right pr-3 font-bold text-slate-900 bg-blue-50/40">
                        {row.subtotal.toFixed(3)}
                      </td>
                      <td className="p-1 font-sans text-xs">
                        <input
                          type="text"
                          value={row.observaciones || ''}
                          onChange={(e) => handleUpdateRow(row.id, 'observaciones', e.target.value)}
                          placeholder="Notas o croquis de apoyo..."
                          className="w-full text-slate-600 bg-transparent focus:bg-white focus:outline-none px-1"
                        />
                      </td>
                      <td className="p-1 text-center">
                        <button
                          onClick={() => handleDeleteRow(row.id)}
                          className="p-1 text-slate-300 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-slate-800 font-mono text-xs">
                    <td colSpan={7} className="py-2 px-3 text-right font-bold text-slate-700 font-sans uppercase">
                      TOTAL VOLUMEN GENERADO:
                    </td>
                    <td className="py-2 px-3 text-right font-extrabold text-blue-900 text-sm bg-blue-100/60 border-r border-slate-300">
                      {currentSheet.totalVolume.toFixed(3)}
                    </td>
                    <td colSpan={2} className="py-2 px-3 font-sans font-bold text-slate-800">
                      {currentSheet.unit}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div className="p-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <button
                  onClick={handleAddRow}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded transition-colors shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar Fila de Localización</span>
                </button>

                <div className="text-[11px] text-slate-500">
                  Total de filas computadas: <strong>{currentSheet.rows.length}</strong>
                </div>
              </div>
            </div>

            {/* Signature Block (Altata Gamboa Ruelas Style) */}
            <div className="grid grid-cols-2 gap-12 pt-8 text-center text-xs">
              <div className="space-y-1">
                <div className="border-b border-slate-800 pb-8 font-semibold text-slate-800">
                  {currentSheet.responsableEmpresa}
                </div>
                <span className="font-bold uppercase tracking-wider text-slate-700 text-[10px] block">
                  Responsable de la Empresa Contratista
                </span>
              </div>

              <div className="space-y-1">
                <div className="border-b border-slate-800 pb-8 font-semibold text-slate-800">
                  {currentSheet.responsableContratante}
                </div>
                <span className="font-bold uppercase tracking-wider text-slate-700 text-[10px] block">
                  Definido por Parte Contratante / Supervisión
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
