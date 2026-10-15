/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  Edit2,
  Check,
  TrendingUp,
  Layers,
  Sparkles,
  ArrowDownToLine
} from 'lucide-react';
import { MatrixConcept, Project, Resource, WBSNode } from '../types/apu';
import { formatCurrency, formatNumber, getBudgetTotals } from '../utils/calculations';

interface WBSTreeViewProps {
  project: Project;
  onSelectConcept: (conceptId: string) => void;
  selectedConceptId?: string;
  onUpdateProject: (updated: Project) => void;
  onAddConceptToChapter: (chapterId: string, resourceOrConcept?: Resource) => void;
  currency: string;
}

export const WBSTreeView: React.FC<WBSTreeViewProps> = ({
  project,
  onSelectConcept,
  selectedConceptId,
  onUpdateProject,
  onAddConceptToChapter,
  currency,
}) => {
  const totals = getBudgetTotals(project);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editQty, setEditQty] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [dragOverChapterId, setDragOverChapterId] = useState<string | null>(null);

  // Toggle chapter expansion
  const toggleExpand = (nodeId: string) => {
    function updateNodes(nodes: WBSNode[]): WBSNode[] {
      return nodes.map((n) => {
        if (n.id === nodeId) {
          return { ...n, isExpanded: !n.isExpanded };
        }
        if (n.children) {
          return { ...n, children: updateNodes(n.children) };
        }
        return n;
      });
    }
    onUpdateProject({ ...project, wbs: updateNodes(project.wbs) });
  };

  // Add new chapter
  const handleAddChapter = () => {
    const nextNum = (project.wbs.length + 1).toString().padStart(2, '0');
    const newChapter: WBSNode = {
      id: `chap_${Date.now()}`,
      code: nextNum,
      name: `NUEVO CAPÍTULO DE OBRA ${nextNum}`,
      type: 'chapter',
      isExpanded: true,
      children: [],
      totalPrice: 0,
    };
    onUpdateProject({ ...project, wbs: [...project.wbs, newChapter] });
  };

  // Delete node
  const handleDeleteNode = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Estás seguro de eliminar este elemento y sus subniveles?')) return;

    function filterNodes(nodes: WBSNode[]): WBSNode[] {
      return nodes
        .filter((n) => n.id !== nodeId)
        .map((n) => (n.children ? { ...n, children: filterNodes(n.children) } : n));
    }
    onUpdateProject({ ...project, wbs: filterNodes(project.wbs) });
  };

  // Duplicate concept
  const handleDuplicateConcept = (node: WBSNode, e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type !== 'concept' || !node.conceptId || !project.concepts[node.conceptId]) return;

    const originalConcept = project.concepts[node.conceptId];
    const newConceptId = `con_${Date.now()}`;
    const duplicatedConcept: MatrixConcept = {
      ...originalConcept,
      id: newConceptId,
      code: `${originalConcept.code}-COPIA`,
      description: `${originalConcept.description} (Copia)`,
    };

    const newWBSNode: WBSNode = {
      ...node,
      id: `wbs_${Date.now()}`,
      code: `${node.code}-C`,
      name: `${node.name} (Copia)`,
      conceptId: newConceptId,
    };

    function insertNode(nodes: WBSNode[]): WBSNode[] {
      return nodes.map((n) => {
        if (n.children) {
          const index = n.children.findIndex((c) => c.id === node.id);
          if (index !== -1) {
            const nextChildren = [...n.children];
            nextChildren.splice(index + 1, 0, newWBSNode);
            return { ...n, children: nextChildren };
          }
          return { ...n, children: insertNode(n.children) };
        }
        return n;
      });
    }

    onUpdateProject({
      ...project,
      concepts: { ...project.concepts, [newConceptId]: duplicatedConcept },
      wbs: insertNode(project.wbs),
    });
  };

  // Start inline editing
  const startEdit = (node: WBSNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNodeId(node.id);
    setEditName(node.name);
    setEditQty((node.quantity || 0).toString());
    setEditUnit(node.unit || '');
  };

  // Save inline edit
  const saveEdit = (nodeId: string) => {
    const qty = parseFloat(editQty) || 0;
    function updateNodes(nodes: WBSNode[]): WBSNode[] {
      return nodes.map((n) => {
        if (n.id === nodeId) {
          return {
            ...n,
            name: editName,
            quantity: n.type === 'concept' ? qty : n.quantity,
            unit: n.type === 'concept' ? editUnit : n.unit,
            totalPrice: n.type === 'concept' ? Number((qty * (n.unitPrice || 0)).toFixed(2)) : n.totalPrice,
          };
        }
        if (n.children) {
          return { ...n, children: updateNodes(n.children) };
        }
        return n;
      });
    }

    const updatedWBS = updateNodes(project.wbs);
    const updatedConcepts = { ...project.concepts };

    // Also update concept definition if applicable
    for (const cId in updatedConcepts) {
      if (updatedConcepts[cId].id === editingNodeId || updatedConcepts[cId].code === editName) {
        updatedConcepts[cId].quantity = qty;
        updatedConcepts[cId].unit = editUnit;
        updatedConcepts[cId].totalPrice = qty * updatedConcepts[cId].unitPrice;
      }
    }

    onUpdateProject({
      ...project,
      wbs: updatedWBS,
      concepts: updatedConcepts,
    });
    setEditingNodeId(null);
  };

  // Handle Drag Over / Drop from Catalog
  const handleDragOver = (e: React.DragEvent, chapterId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (dragOverChapterId !== chapterId) {
      setDragOverChapterId(chapterId);
    }
  };

  const handleDragLeave = () => {
    setDragOverChapterId(null);
  };

  const handleDropOnChapter = (e: React.DragEvent, chapterId: string) => {
    e.preventDefault();
    setDragOverChapterId(null);
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr) {
        const item = JSON.parse(dataStr) as Resource;
        onAddConceptToChapter(chapterId, item);
      }
    } catch (err) {
      console.error('Error handling drop on chapter:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Presupuesto Total
          </span>
          <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-0.5">
            {formatCurrency(totals.grandTotal, currency)}
          </div>
          <span className="text-[11px] text-slate-400">Total con sobrecostos e impuestos</span>
        </div>

        <div>
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Costo Directo Base
          </span>
          <div className="text-xl font-bold text-slate-700 font-mono tabular-nums mt-0.5">
            {formatCurrency(totals.totalDirectCost, currency)}
          </div>
          <span className="text-[11px] text-slate-400">Materiales + MO + Equipos</span>
        </div>

        <div>
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Sobrecostos Ponderados
          </span>
          <div className="text-xl font-bold text-blue-600 font-mono tabular-nums mt-0.5">
            {totals.totalDirectCost > 0
              ? `+${(((totals.grandTotal - totals.totalDirectCost) / totals.totalDirectCost) * 100).toFixed(1)}%`
              : '0.0%'}
          </div>
          <span className="text-[11px] text-slate-400">Indirectos + Financ. + Utilidad</span>
        </div>

        <div>
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Estructura de Obra
          </span>
          <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-0.5">
            {totals.totalChapters} cap. / {totals.totalConcepts} matrices
          </div>
          <span className="text-[11px] text-slate-400">Niveles jerárquicos WBS</span>
        </div>
      </div>

      {/* Main WBS Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Estructura Jerárquica de Partidas y Conceptos (WBS)
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAddChapter}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo Capítulo
            </button>
          </div>
        </div>

        {/* Tree Table Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-slate-100/70 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
          <div className="col-span-6 md:col-span-5">Código y Descripción</div>
          <div className="col-span-1 text-center">Unidad</div>
          <div className="col-span-1 text-right">Cantidad</div>
          <div className="col-span-2 text-right">P.U. Venta</div>
          <div className="col-span-2 text-right">Importe Total</div>
        </div>

        {/* Tree Table Rows */}
        <div className="divide-y divide-slate-100">
          {project.wbs.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-700">El presupuesto no tiene capítulos aún</p>
              <button
                onClick={handleAddChapter}
                className="mt-3 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                Crear Primer Capítulo
              </button>
            </div>
          ) : (
            project.wbs.map((chapter) => {
              const isDragTarget = dragOverChapterId === chapter.id;
              const chapterIncidence = totals.grandTotal > 0
                ? (((chapter.totalPrice || 0) / totals.grandTotal) * 100).toFixed(1)
                : '0.0';

              return (
                <div key={chapter.id} className="group/chap">
                  {/* Chapter Header Row */}
                  <div
                    onDragOver={(e) => handleDragOver(e, chapter.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDropOnChapter(e, chapter.id)}
                    className={`grid grid-cols-12 gap-2 px-4 py-2.5 items-center transition-colors cursor-pointer ${
                      isDragTarget
                        ? 'bg-blue-100 border-2 border-dashed border-blue-500'
                        : 'bg-slate-50/80 hover:bg-slate-100/90'
                    }`}
                    onClick={() => toggleExpand(chapter.id)}
                  >
                    <div className="col-span-6 md:col-span-5 flex items-center gap-2">
                      <button
                        type="button"
                        className="text-slate-500 hover:text-slate-800 p-0.5"
                      >
                        {chapter.isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      <Folder className="w-4 h-4 text-blue-600 shrink-0" />

                      <span className="font-mono text-xs font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {chapter.code}
                      </span>

                      {editingNodeId === chapter.id ? (
                        <div
                          className="flex items-center gap-1 flex-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="px-2 py-1 text-xs border border-blue-500 rounded bg-white w-full font-semibold"
                          />
                          <button
                            onClick={() => saveEdit(chapter.id)}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {chapter.name}
                        </span>
                      )}
                    </div>

                    <div className="col-span-1 text-center text-xs text-slate-400">—</div>
                    <div className="col-span-1 text-right text-xs text-slate-400">
                      {chapter.children?.length || 0} conc.
                    </div>
                    <div className="col-span-2 text-right text-xs text-slate-500">
                      Incidencia: <span className="font-mono font-medium">{chapterIncidence}%</span>
                    </div>

                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                        {formatCurrency(chapter.totalPrice || 0, currency)}
                      </span>

                      {/* Chapter Actions */}
                      <div className="opacity-0 group-hover/chap:opacity-100 flex items-center gap-1 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddConceptToChapter(chapter.id);
                          }}
                          title="Añadir concepto a este capítulo"
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => startEdit(chapter, e)}
                          title="Renombrar capítulo"
                          className="p-1 text-slate-500 hover:bg-slate-200 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteNode(chapter.id, e)}
                          title="Eliminar capítulo"
                          className="p-1 text-rose-500 hover:bg-rose-100 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Chapter Concepts Children */}
                  {chapter.isExpanded && chapter.children && (
                    <div className="divide-y divide-slate-100 pl-4 bg-white">
                      {chapter.children.length === 0 ? (
                        <div
                          onDragOver={(e) => handleDragOver(e, chapter.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDropOnChapter(e, chapter.id)}
                          className="py-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 m-2 rounded-lg bg-slate-50/50"
                        >
                          <p>Capítulo vacío. Arrastra insumos o haz clic en:</p>
                          <button
                            onClick={() => onAddConceptToChapter(chapter.id)}
                            className="mt-1.5 px-2.5 py-1 text-xs text-blue-600 hover:underline font-medium inline-flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Agregar Concepto de Obra
                          </button>
                        </div>
                      ) : (
                        chapter.children.map((conceptNode) => {
                          const isSelected = selectedConceptId === conceptNode.conceptId;
                          const incidence = totals.grandTotal > 0
                            ? (((conceptNode.totalPrice || 0) / totals.grandTotal) * 100).toFixed(1)
                            : '0.0';

                          return (
                            <div
                              key={conceptNode.id}
                              onClick={() => {
                                if (conceptNode.conceptId) {
                                  onSelectConcept(conceptNode.conceptId);
                                }
                              }}
                              className={`group/row grid grid-cols-12 gap-2 px-4 py-2 items-center text-xs transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-50/80 border-l-4 border-l-blue-600'
                                  : 'hover:bg-slate-50/80'
                              }`}
                            >
                              {/* Description & Code */}
                              <div className="col-span-6 md:col-span-5 flex items-center gap-2 pl-4">
                                <span className="font-mono text-[11px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                                  {conceptNode.code}
                                </span>

                                {editingNodeId === conceptNode.id ? (
                                  <div
                                    className="flex items-center gap-1 flex-1"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="text"
                                      value={editName}
                                      onChange={(e) => setEditName(e.target.value)}
                                      className="px-2 py-0.5 text-xs border border-blue-500 rounded bg-white w-full"
                                    />
                                    <button
                                      onClick={() => saveEdit(conceptNode.id)}
                                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-slate-800 truncate leading-snug">
                                    {conceptNode.name}
                                  </span>
                                )}
                              </div>

                              {/* Unit */}
                              <div className="col-span-1 text-center font-mono text-slate-600">
                                {editingNodeId === conceptNode.id ? (
                                  <input
                                    type="text"
                                    value={editUnit}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => setEditUnit(e.target.value)}
                                    className="w-12 px-1 text-center text-xs border border-blue-500 rounded"
                                  />
                                ) : (
                                  conceptNode.unit || 'm2'
                                )}
                              </div>

                              {/* Quantity */}
                              <div className="col-span-1 text-right font-mono tabular-nums text-slate-800">
                                {editingNodeId === conceptNode.id ? (
                                  <input
                                    type="number"
                                    value={editQty}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => setEditQty(e.target.value)}
                                    className="w-16 px-1 text-right text-xs border border-blue-500 rounded"
                                  />
                                ) : (
                                  formatNumber(conceptNode.quantity || 0, 2)
                                )}
                              </div>

                              {/* Unit Price */}
                              <div className="col-span-2 text-right font-mono tabular-nums text-slate-700">
                                {formatCurrency(conceptNode.unitPrice || 0, currency)}
                              </div>

                              {/* Total Amount & Row Actions */}
                              <div className="col-span-2 flex items-center justify-end gap-2">
                                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                                  {formatCurrency(conceptNode.totalPrice || 0, currency)}
                                </span>

                                <div className="opacity-0 group-hover/row:opacity-100 flex items-center gap-1 transition-opacity">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (conceptNode.conceptId) onSelectConcept(conceptNode.conceptId);
                                    }}
                                    title="Inspeccionar Matriz APU"
                                    className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => startEdit(conceptNode, e)}
                                    title="Editar datos"
                                    className="p-1 text-slate-500 hover:bg-slate-200 rounded"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => handleDuplicateConcept(conceptNode, e)}
                                    title="Duplicar concepto"
                                    className="p-1 text-slate-500 hover:bg-slate-200 rounded"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteNode(conceptNode.id, e)}
                                    title="Eliminar concepto"
                                    className="p-1 text-rose-500 hover:bg-rose-100 rounded"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Table Footer Grand Total */}
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-900 text-white font-semibold text-xs border-t border-slate-800">
          <div className="col-span-8 text-right uppercase tracking-wider text-slate-300">
            Gran Total Presupuesto de Obra:
          </div>
          <div className="col-span-4 text-right font-mono text-sm tabular-nums text-emerald-400 font-bold">
            {formatCurrency(totals.grandTotal, currency)}
          </div>
        </div>
      </div>
    </div>
  );
};
