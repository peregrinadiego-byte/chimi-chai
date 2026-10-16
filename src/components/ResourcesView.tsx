/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Filter,
  Layers,
  Wrench,
  Users,
  HardHat,
  Truck,
  Box,
  Edit2,
  Trash2,
  Check,
  AlertCircle,
  Download,
  Upload,
  RefreshCw,
  Coins,
  FileSpreadsheet
} from 'lucide-react';
import { Resource, ResourceType, Project } from '../types/apu';
import { formatCurrency } from '../utils/calculations';

interface ResourcesViewProps {
  resources: Resource[];
  currency: string;
  project: Project;
  onUpdateResources: (resources: Resource[]) => void;
  onAddNewResource: (resource: Resource) => void;
}

export const ResourcesView: React.FC<ResourcesViewProps> = ({
  resources,
  currency,
  project,
  onUpdateResources,
  onAddNewResource,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterUsedInProject, setFilterUsedInProject] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    unit: 'Pza',
    type: 'material' as ResourceType,
    baseCost: 0,
    category: 'General',
    notes: '',
    fsrFactor: 1.0,
    hourlyOperationCost: 0,
  });

  // Calculate used resources in current project concepts
  const usedResourceMap = useMemo(() => {
    const map = new Map<string, number>();
    Object.values(project.concepts).forEach((concept) => {
      concept.items?.forEach((item) => {
        const count = map.get(item.resourceId) || 0;
        map.set(item.resourceId, count + 1);
      });
    });
    return map;
  }, [project.concepts]);

  // Unique categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    resources.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set).sort();
  }, [resources]);

  // Filtered resources
  const filteredResources = useMemo(() => {
    return resources.filter((item) => {
      const matchesSearch =
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = selectedType === 'all' || item.type === selectedType;
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesUsed = !filterUsedInProject || (usedResourceMap.get(item.id) || 0) > 0;

      return matchesSearch && matchesType && matchesCategory && matchesUsed;
    });
  }, [resources, searchTerm, selectedType, selectedCategory, filterUsedInProject, usedResourceMap]);

  // Count summaries by type
  const typeCounts = useMemo(() => {
    const counts = {
      material: 0,
      labor: 0,
      equipment: 0,
      tool: 0,
      subcontract: 0,
      auxiliary: 0,
    };
    resources.forEach((r) => {
      if (counts[r.type] !== undefined) {
        counts[r.type]++;
      }
    });
    return counts;
  }, [resources]);

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setEditingResource(null);
    setFormData({
      code: `INS-${(resources.length + 1).toString().padStart(4, '0')}`,
      description: '',
      unit: 'PZA',
      type: 'material',
      baseCost: 0,
      category: 'General',
      notes: '',
      fsrFactor: project.fsrConfig.calculatedFSR || 1.72,
      hourlyOperationCost: 0,
    });
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (resource: Resource) => {
    setEditingResource(resource);
    setFormData({
      code: resource.code,
      description: resource.description,
      unit: resource.unit,
      type: resource.type,
      baseCost: resource.baseCost,
      category: resource.category || 'General',
      notes: resource.notes || '',
      fsrFactor: resource.fsrFactor || project.fsrConfig.calculatedFSR || 1.72,
      hourlyOperationCost: resource.hourlyOperationCost || 0,
    });
    setIsModalOpen(true);
  };

  // Submit modal form
  const handleSaveResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.description.trim()) return;

    if (editingResource) {
      // Update
      const updatedList = resources.map((r) =>
        r.id === editingResource.id
          ? {
              ...r,
              code: formData.code.trim().toUpperCase(),
              description: formData.description.trim(),
              unit: formData.unit.trim(),
              type: formData.type,
              baseCost: Number(formData.baseCost) || 0,
              category: formData.category.trim() || 'General',
              notes: formData.notes.trim() || undefined,
              fsrFactor: formData.type === 'labor' ? Number(formData.fsrFactor) || 1 : undefined,
              hourlyOperationCost:
                formData.type === 'equipment' ? Number(formData.hourlyOperationCost) || 0 : undefined,
            }
          : r
      );
      onUpdateResources(updatedList);
    } else {
      // Create new
      const newRes: Resource = {
        id: `res_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim(),
        unit: formData.unit.trim(),
        type: formData.type,
        baseCost: Number(formData.baseCost) || 0,
        category: formData.category.trim() || 'General',
        notes: formData.notes.trim() || undefined,
        fsrFactor: formData.type === 'labor' ? Number(formData.fsrFactor) || 1 : undefined,
        hourlyOperationCost:
          formData.type === 'equipment' ? Number(formData.hourlyOperationCost) || 0 : undefined,
      };
      onAddNewResource(newRes);
    }

    setIsModalOpen(false);
  };

  // Delete resource
  const handleDeleteResource = (resource: Resource) => {
    const timesUsed = usedResourceMap.get(resource.id) || 0;
    if (timesUsed > 0) {
      if (
        !window.confirm(
          `¡Atención! Este insumo (${resource.code}) está siendo utilizado en ${timesUsed} concepto(s) del presupuesto activo. ¿Realmente deseas eliminarlo del catálogo maestro?`
        )
      ) {
        return;
      }
    } else {
      if (!window.confirm(`¿Deseas eliminar el insumo ${resource.code} (${resource.description})?`)) {
        return;
      }
    }

    const updated = resources.filter((r) => r.id !== resource.id);
    onUpdateResources(updated);
  };

  const getTypeBadge = (type: ResourceType) => {
    switch (type) {
      case 'material':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Box className="w-3 h-3 text-blue-600" />
            Material
          </span>
        );
      case 'labor':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Users className="w-3 h-3 text-emerald-600" />
            Mano de Obra
          </span>
        );
      case 'equipment':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Truck className="w-3 h-3 text-amber-600" />
            Maquinaria/Eq.
          </span>
        );
      case 'tool':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-orange-50 text-orange-700 border border-orange-200">
            <Wrench className="w-3 h-3 text-orange-600" />
            Herramienta
          </span>
        );
      case 'subcontract':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <Layers className="w-3 h-3 text-purple-600" />
            Subcontrato
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-50 text-slate-700 border border-slate-200">
            Auxiliar
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
      {/* Top Header & Metrics Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Catálogo Maestro de Insumos</h1>
              <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                {resources.length} insumos totales
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Administración de materiales, cuadrillas, maquinaria, herramientas y subcontratos con costos base y configuración de FSR.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const lines = [
                  '"Código","Descripción","Tipo","Unidad","Costo Base","Categoría","Notas"',
                  ...resources.map(
                    (r) =>
                      `"${r.code}","${r.description.replace(/"/g, '""')}","${r.type}","${r.unit}","${r.baseCost}","${r.category || ''}","${(r.notes || '').replace(/"/g, '""')}"`
                  ),
                ];
                const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `EZAPU_Catalogo_Insumos_${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              title="Descargar lista de insumos en CSV"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Insumo</span>
            </button>
          </div>
        </div>

        {/* Quick Type Stat Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mt-4 pt-3 border-t border-slate-100">
          <button
            onClick={() => setSelectedType(selectedType === 'material' ? 'all' : 'material')}
            className={`p-2 rounded-lg border text-left transition-colors ${
              selectedType === 'material'
                ? 'bg-blue-50 border-blue-300 text-blue-900'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500">Materiales</span>
              <Box className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-base font-bold text-slate-900 mt-0.5">{typeCounts.material}</div>
          </button>

          <button
            onClick={() => setSelectedType(selectedType === 'labor' ? 'all' : 'labor')}
            className={`p-2 rounded-lg border text-left transition-colors ${
              selectedType === 'labor'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500">Mano de Obra</span>
              <Users className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-base font-bold text-slate-900 mt-0.5">{typeCounts.labor}</div>
          </button>

          <button
            onClick={() => setSelectedType(selectedType === 'equipment' ? 'all' : 'equipment')}
            className={`p-2 rounded-lg border text-left transition-colors ${
              selectedType === 'equipment'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500">Maquinaria</span>
              <Truck className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-base font-bold text-slate-900 mt-0.5">{typeCounts.equipment}</div>
          </button>

          <button
            onClick={() => setSelectedType(selectedType === 'tool' ? 'all' : 'tool')}
            className={`p-2 rounded-lg border text-left transition-colors ${
              selectedType === 'tool'
                ? 'bg-orange-50 border-orange-300 text-orange-900'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500">Herramienta</span>
              <Wrench className="w-3.5 h-3.5 text-orange-600" />
            </div>
            <div className="text-base font-bold text-slate-900 mt-0.5">{typeCounts.tool}</div>
          </button>

          <button
            onClick={() => setSelectedType(selectedType === 'subcontract' ? 'all' : 'subcontract')}
            className={`p-2 rounded-lg border text-left transition-colors ${
              selectedType === 'subcontract'
                ? 'bg-purple-50 border-purple-300 text-purple-900'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500">Subcontratos</span>
              <Layers className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="text-base font-bold text-slate-900 mt-0.5">{typeCounts.subcontract}</div>
          </button>

          <button
            onClick={() => setFilterUsedInProject(!filterUsedInProject)}
            className={`p-2 rounded-lg border text-left transition-colors ${
              filterUsedInProject
                ? 'bg-indigo-50 border-indigo-300 text-indigo-900'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500">En Proyecto</span>
              <HardHat className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="text-base font-bold text-slate-900 mt-0.5">{usedResourceMap.size}</div>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código, descripción o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">Todos los Tipos</option>
            <option value="material">Materiales</option>
            <option value="labor">Mano de Obra</option>
            <option value="equipment">Maquinaria y Equipo</option>
            <option value="tool">Herramienta</option>
            <option value="subcontract">Subcontratos</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">Todas las Categorías</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Filter Project Toggle */}
          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer ml-1">
            <input
              type="checkbox"
              checked={filterUsedInProject}
              onChange={(e) => setFilterUsedInProject(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
            />
            <span>Solo en obra activa</span>
          </label>
        </div>

        <div className="text-xs text-slate-500">
          Mostrando <span className="font-semibold text-slate-900">{filteredResources.length}</span> insumo(s)
        </div>
      </div>

      {/* Main Table View */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3 w-28">Código</th>
                <th className="py-2.5 px-3">Descripción</th>
                <th className="py-2.5 px-3 w-32">Tipo</th>
                <th className="py-2.5 px-3 w-28">Categoría</th>
                <th className="py-2.5 px-2 w-16 text-center">Unidad</th>
                <th className="py-2.5 px-3 w-28 text-right">Costo Base</th>
                <th className="py-2.5 px-3 w-28 text-right">Costo Real / FSR</th>
                <th className="py-2.5 px-2 w-24 text-center">En Obra</th>
                <th className="py-2.5 px-3 w-24 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredResources.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-sans">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No se encontraron insumos que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredResources.map((res) => {
                  const timesUsed = usedResourceMap.get(res.id) || 0;
                  const effectiveCost =
                    res.type === 'labor'
                      ? res.baseCost * (res.fsrFactor || project.fsrConfig.calculatedFSR || 1.72)
                      : res.baseCost;

                  return (
                    <tr key={res.id} className="hover:bg-slate-50/80 transition-colors group font-sans">
                      <td className="py-2 px-3 font-mono font-medium text-slate-900">{res.code}</td>
                      <td className="py-2 px-3 text-slate-800 font-medium">
                        <div>{res.description}</div>
                        {res.notes && <div className="text-[11px] text-slate-400 font-normal italic">{res.notes}</div>}
                      </td>
                      <td className="py-2 px-3">{getTypeBadge(res.type)}</td>
                      <td className="py-2 px-3 text-slate-500 text-[11px]">{res.category || '—'}</td>
                      <td className="py-2 px-2 text-center text-slate-600 font-mono">{res.unit}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">
                        {formatCurrency(res.baseCost, currency)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                        {res.type === 'labor' ? (
                          <div>
                            {formatCurrency(effectiveCost, currency)}
                            <div className="text-[10px] text-emerald-600 font-normal">
                              FSR: {(res.fsrFactor || project.fsrConfig.calculatedFSR || 1.72).toFixed(2)}
                            </div>
                          </div>
                        ) : res.type === 'equipment' && res.hourlyOperationCost ? (
                          <div>
                            {formatCurrency(res.baseCost, currency)}
                            <div className="text-[10px] text-amber-600 font-normal">
                              Op: {formatCurrency(res.hourlyOperationCost, currency)}/h
                            </div>
                          </div>
                        ) : (
                          formatCurrency(res.baseCost, currency)
                        )}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {timesUsed > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {timesUsed} matriz/ces
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-300">0</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100">
                          <button
                            onClick={() => handleOpenEditModal(res)}
                            title="Editar insumo"
                            className="p-1 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteResource(res)}
                            title="Eliminar insumo"
                            className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Create/Edit Insumo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                {editingResource ? `Editar Insumo: ${editingResource.code}` : 'Nuevo Insumo al Catálogo'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveResource} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Código / Clave *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="MAT-001"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono uppercase focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Tipo de Recurso</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as ResourceType,
                      })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="material">Material</option>
                    <option value="labor">Mano de Obra</option>
                    <option value="equipment">Maquinaria y Equipo</option>
                    <option value="tool">Herramienta</option>
                    <option value="subcontract">Subcontrato</option>
                    <option value="auxiliary">Básico / Auxiliar</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Descripción del Insumo *</label>
                <textarea
                  required
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción técnica detallada, especificaciones y marca..."
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Unidad *</label>
                  <input
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value.toUpperCase() })}
                    placeholder="M2, KG, JOR..."
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono uppercase focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Costo Base Unitario *</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-slate-400 font-mono">$</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0"
                      value={formData.baseCost}
                      onChange={(e) => setFormData({ ...formData, baseCost: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-6 pr-2.5 py-1.5 border border-slate-300 rounded-md font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {formData.type === 'labor' && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-md space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-900 text-[11px]">Factor Salario Real (FSR)</span>
                    <span className="text-[10px] text-emerald-700">Por defecto del proyecto: {project.fsrConfig.calculatedFSR}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="1.0"
                      value={formData.fsrFactor}
                      onChange={(e) => setFormData({ ...formData, fsrFactor: parseFloat(e.target.value) || 1.0 })}
                      className="w-24 px-2 py-1 bg-white border border-emerald-300 rounded text-xs font-mono"
                    />
                    <span className="text-[11px] text-emerald-800">
                      Costo Real diario: <strong>{formatCurrency(formData.baseCost * formData.fsrFactor, currency)}</strong>
                    </span>
                  </div>
                </div>
              )}

              {formData.type === 'equipment' && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md space-y-2">
                  <span className="font-semibold text-amber-900 text-[11px]">Costo Horario Operativo (opcional)</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.hourlyOperationCost}
                      onChange={(e) =>
                        setFormData({ ...formData, hourlyOperationCost: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="Costo por hora"
                      className="w-32 px-2 py-1 bg-white border border-amber-300 rounded text-xs font-mono"
                    />
                    <span className="text-[11px] text-amber-800">/ hora de operación</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Categoría / Familia</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Concretos, Acero, Plomería..."
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Notas / Proveedor</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Marca, ficha técnica, teléfono..."
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-xs transition-colors"
                >
                  {editingResource ? 'Guardar Cambios' : 'Registrar Insumo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
