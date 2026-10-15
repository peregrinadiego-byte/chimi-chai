/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Plus,
  GripVertical,
  Pin,
  PinOff,
  Layers,
  Wrench,
  Users,
  HardHat,
  Truck,
  Box,
  Check,
  Sparkles
} from 'lucide-react';
import { Resource, ResourceType } from '../types/apu';
import { formatCurrency } from '../utils/calculations';

interface CatalogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isPinned: boolean;
  onTogglePin: () => void;
  resources: Resource[];
  currency: string;
  onInsertResource: (resource: Resource, quantity: number) => void;
  onAddNewResource: (resource: Resource) => void;
  activeConceptName?: string;
}

export const CatalogDrawer: React.FC<CatalogDrawerProps> = ({
  isOpen,
  onClose,
  isPinned,
  onTogglePin,
  resources,
  currency,
  onInsertResource,
  onAddNewResource,
  activeConceptName,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [insertedId, setInsertedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New resource form state
  const [newCode, setNewCode] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newUnit, setNewUnit] = useState('Pza');
  const [newType, setNewType] = useState<ResourceType>('material');
  const [newCost, setNewCost] = useState('0');
  const [newCategory, setNewCategory] = useState('General');

  // Filter resources
  const filteredResources = useMemo(() => {
    return resources.filter((item) => {
      const matchesSearch =
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = selectedType === 'all' || item.type === selectedType;

      return matchesSearch && matchesType;
    });
  }, [resources, searchTerm, selectedType]);

  const handleDragStart = (e: React.DragEvent, item: Resource) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.setData('text/plain', item.code);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleQuickInsert = (item: Resource) => {
    const defaultQty = item.type === 'labor' ? 0.05 : 1.0;
    onInsertResource(item, defaultQty);
    setInsertedId(item.id);
    setTimeout(() => setInsertedId(null), 1500);
  };

  const handleCreateResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newDesc.trim()) return;

    const res: Resource = {
      id: `custom_${Date.now()}`,
      code: newCode.trim().toUpperCase(),
      description: newDesc.trim(),
      unit: newUnit.trim(),
      type: newType,
      baseCost: parseFloat(newCost) || 0,
      category: newCategory.trim() || 'Personalizado',
    };

    onAddNewResource(res);
    setShowAddModal(false);
    setNewCode('');
    setNewDesc('');
    setNewCost('0');
  };

  const getTypeIcon = (type: ResourceType) => {
    switch (type) {
      case 'material':
        return <Box className="w-3.5 h-3.5 text-blue-600" />;
      case 'labor':
        return <HardHat className="w-3.5 h-3.5 text-amber-600" />;
      case 'equipment':
        return <Truck className="w-3.5 h-3.5 text-purple-600" />;
      case 'auxiliary':
        return <Layers className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <Wrench className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  const getTypeLabel = (type: ResourceType) => {
    switch (type) {
      case 'material':
        return 'Material';
      case 'labor':
        return 'Mano de Obra';
      case 'equipment':
        return 'Maquinaria';
      case 'auxiliary':
        return 'Auxiliar';
      default:
        return 'Insumo';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <aside
        className={`fixed top-0 right-0 z-40 h-full w-96 max-w-[90vw] bg-white border-l border-slate-200 shadow-2xl flex flex-col transition-transform duration-200 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Catálogo Maestro de Insumos"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-semibold shadow-sm">
              <Box className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 leading-tight">Catálogo de Insumos</h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span>{resources.length} disponibles</span>
                <span>·</span>
                <span className="text-blue-600 font-medium">Arrastra o inserta</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onTogglePin}
              title={isPinned ? 'Desanclar panel lateral' : 'Fijar panel lateral'}
              className={`p-1.5 rounded-md transition-colors ${
                isPinned ? 'bg-blue-100 text-blue-700' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              title="Cerrar catálogo (Alt+C)"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active Context Banner */}
        {activeConceptName ? (
          <div className="px-4 py-2 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between text-xs">
            <div className="truncate mr-2">
              <span className="text-blue-600 font-medium">Concepto Activo: </span>
              <span className="text-slate-700 truncate">{activeConceptName}</span>
            </div>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-mono px-1.5 py-0.5 rounded shrink-0">
              Listo para insertar
            </span>
          </div>
        ) : (
          <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-200 text-xs text-slate-600">
            Selecciona un concepto en el presupuesto para insertar con un clic.
          </div>
        )}

        {/* Search Bar & Add Button */}
        <div className="p-3 border-b border-slate-100 space-y-2 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código, descripción o material..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Segmented Filter Control */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] scrollbar-none">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'material', label: 'Materiales' },
              { id: 'labor', label: 'Mano Obra' },
              { id: 'equipment', label: 'Equipo' },
              { id: 'auxiliary', label: 'Auxiliares' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedType(tab.id)}
                className={`px-2.5 py-1 rounded-md whitespace-nowrap transition-colors ${
                  selectedType === tab.id
                    ? 'bg-slate-900 text-white font-medium shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Resources List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredResources.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Box className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-700">No se encontraron insumos</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Prueba con otro término de búsqueda o crea uno nuevo.
              </p>
            </div>
          ) : (
            filteredResources.map((item) => {
              const isJustInserted = insertedId === item.id;
              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  className={`group relative bg-white border rounded-lg p-2.5 text-xs transition-all cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-xs ${
                    isJustInserted ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 shrink-0" />
                      <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        {item.code}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                        {getTypeIcon(item.type)}
                        <span>{item.unit}</span>
                      </span>
                    </div>

                    <div className="font-mono text-xs font-semibold text-slate-900 shrink-0 tabular-nums">
                      {formatCurrency(item.baseCost, currency)}
                    </div>
                  </div>

                  <p className="mt-1.5 text-slate-700 line-clamp-2 text-[11px] leading-relaxed pl-5">
                    {item.description}
                  </p>

                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between pl-5">
                    <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                      {item.category || getTypeLabel(item.type)}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleQuickInsert(item)}
                      disabled={isJustInserted}
                      className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                        isJustInserted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700'
                      }`}
                    >
                      {isJustInserted ? (
                        <>
                          <Check className="w-3 h-3" /> Insertado
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" /> Insertar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with "Nuevo Insumo" Button */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 shrink-0">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full py-2 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            Crear Nuevo Insumo Maestro
          </button>
        </div>
      </aside>

      {/* Modal: Crear Insumo */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Crear Insumo en Catálogo</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateResource} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Código</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. MAT-TUB-01"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Tipo de Insumo</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as ResourceType)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md"
                  >
                    <option value="material">Material</option>
                    <option value="labor">Mano de Obra</option>
                    <option value="equipment">Maquinaria y Equipo</option>
                    <option value="auxiliary">Auxiliar / Mezcla</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Descripción Completa</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Especificaciones, marca, norma..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Unidad</label>
                  <input
                    type="text"
                    required
                    placeholder="m2, Ton, Pza..."
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Costo Base ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newCost}
                    onChange={(e) => setNewCost(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Categoría</label>
                  <input
                    type="text"
                    placeholder="Instalaciones"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs"
                >
                  Guardar en Catálogo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
