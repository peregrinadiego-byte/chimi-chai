/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  X,
  FileSpreadsheet,
  Search,
  Download,
  Box,
  HardHat,
  Truck,
  Layers,
  Wrench,
  ArrowLeft,
  PieChart as PieIcon,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Project, Resource, ResourceExplosionItem, ResourceType } from '../types/apu';
import { calculateExplosion, formatCurrency, formatNumber } from '../utils/calculations';
import { exportExplosionToCSV } from '../utils/exportUtils';

interface ResourceExplosionViewProps {
  project: Project;
  resourcesMap: Record<string, Resource>;
  currency: string;
  onBackToWBS?: () => void;
  isModal?: boolean;
  onClose?: () => void;
}

const CATEGORY_COLORS: Record<string, { fill: string; border: string; bg: string; text: string }> = {
  material: { fill: '#2563eb', border: '#1d4ed8', bg: 'bg-blue-50', text: 'text-blue-700' },
  labor: { fill: '#d97706', border: '#b45309', bg: 'bg-amber-50', text: 'text-amber-700' },
  equipment: { fill: '#9333ea', border: '#7e22ce', bg: 'bg-purple-50', text: 'text-purple-700' },
  auxiliary: { fill: '#059669', border: '#047857', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  subcontract: { fill: '#475569', border: '#334155', bg: 'bg-slate-100', text: 'text-slate-700' },
};

export const ResourceExplosionView: React.FC<ResourceExplosionViewProps> = ({
  project,
  resourcesMap,
  currency,
  onBackToWBS,
  isModal = false,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const items = useMemo(() => {
    return calculateExplosion(project, resourcesMap);
  }, [project, resourcesMap]);

  // Totals by category
  const totalMaterials = items.filter((i) => i.type === 'material').reduce((acc, i) => acc + i.totalAmount, 0);
  const totalLabor = items.filter((i) => i.type === 'labor').reduce((acc, i) => acc + i.totalAmount, 0);
  const totalEquipment = items.filter((i) => i.type === 'equipment').reduce((acc, i) => acc + i.totalAmount, 0);
  const totalAuxiliaries = items.filter((i) => i.type === 'auxiliary').reduce((acc, i) => acc + i.totalAmount, 0);
  const grandTotal = items.reduce((acc, i) => acc + i.totalAmount, 0);

  // Prepare chart data
  const chartData = useMemo(() => {
    const rawData = [
      {
        name: 'Materiales',
        typeKey: 'material',
        value: totalMaterials,
        color: CATEGORY_COLORS.material.fill,
        count: items.filter((i) => i.type === 'material').length,
      },
      {
        name: 'Mano de Obra',
        typeKey: 'labor',
        value: totalLabor,
        color: CATEGORY_COLORS.labor.fill,
        count: items.filter((i) => i.type === 'labor').length,
      },
      {
        name: 'Maquinaria y Equipo',
        typeKey: 'equipment',
        value: totalEquipment,
        color: CATEGORY_COLORS.equipment.fill,
        count: items.filter((i) => i.type === 'equipment').length,
      },
      {
        name: 'Auxiliares y Mezclas',
        typeKey: 'auxiliary',
        value: totalAuxiliaries,
        color: CATEGORY_COLORS.auxiliary.fill,
        count: items.filter((i) => i.type === 'auxiliary').length,
      },
    ].filter((item) => item.value > 0);

    return rawData.map((d) => ({
      ...d,
      percent: grandTotal > 0 ? (d.value / grandTotal) * 100 : 0,
    }));
  }, [totalMaterials, totalLabor, totalEquipment, totalAuxiliaries, grandTotal, items]);

  // Filter items for table
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === 'all' || item.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [items, searchTerm, selectedType]);

  // Top 5 most expensive supplies for Pareto analysis
  const topSupplies = useMemo(() => {
    return items.slice(0, 5);
  }, [items]);

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

  const handlePieClick = (data: any) => {
    const key = data?.typeKey || data?.payload?.typeKey;
    if (key) {
      setSelectedType((prev) => (prev === key ? 'all' : key));
    }
  };

  // Custom Recharts tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white px-3 py-2 rounded-lg shadow-xl text-xs border border-slate-700 pointer-events-none">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }}></span>
            <span className="font-semibold text-slate-200">{data.name}</span>
          </div>
          <div className="font-mono text-sm font-bold text-emerald-400 tabular-nums">
            {formatCurrency(data.value, currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {data.percent.toFixed(2)}% del costo directo · {data.count} insumos
          </div>
          <div className="text-[10px] text-blue-300 mt-1 font-sans">
            Clic para filtrar en la tabla
          </div>
        </div>
      );
    }
    return null;
  };

  const content = (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onBackToWBS && (
            <button
              onClick={onBackToWBS}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-2.5 py-1.5 rounded-md transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a Presupuesto</span>
            </button>
          )}
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-purple-600" />
              Explosión de Insumos y Distribución de Costos
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Consolidación cuantitativa y analítica de recursos para la obra: <strong className="text-slate-700">{project.name}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportExplosionToCSV(project, resourcesMap)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
          {isModal && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* DATA VISUALIZATION PANEL: Recharts Interactive Pie Chart + KPI Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Recharts Donut Pie Chart */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Distribución de Costo Directo
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">Interactivo</span>
          </div>

          <div className="h-64 w-full relative mt-2 flex items-center justify-center">
            {chartData.length === 0 ? (
              <p className="text-xs text-slate-400">No hay costos para graficar.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomTooltip />} />
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    onClick={(entry: any) => handlePieClick(entry)}
                    cursor="pointer"
                    animationDuration={600}
                  >
                    {chartData.map((entry, index) => {
                      const isFilterActive = selectedType === entry.typeKey;
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          stroke={isFilterActive ? '#0f172a' : '#ffffff'}
                          strokeWidth={isFilterActive ? 3 : 2}
                          className="transition-all hover:opacity-80"
                        />
                      );
                    })}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}

            {/* Center Label inside Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                Costo Directo
              </span>
              <span className="text-xs font-bold font-mono text-slate-900 tabular-nums">
                {formatCurrency(grandTotal, currency)}
              </span>
              <span className="text-[9px] text-slate-400">100% Obra</span>
            </div>
          </div>

          {/* Interactive Legend with click to filter */}
          <div className="mt-2 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
            {chartData.map((entry) => {
              const isSelected = selectedType === entry.typeKey;
              return (
                <button
                  key={entry.typeKey}
                  onClick={() => handlePieClick(entry)}
                  className={`flex items-center justify-between p-2 rounded-lg text-left transition-all border ${
                    isSelected
                      ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                      : 'border-slate-100 bg-slate-50/80 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate mr-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="truncate font-medium text-[11px]">{entry.name}</span>
                  </div>
                  <span
                    className={`font-mono text-[11px] font-bold tabular-nums ${
                      isSelected ? 'text-emerald-300' : 'text-slate-900'
                    }`}
                  >
                    {entry.percent.toFixed(1)}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Key Cost Categories & Pareto Analysis (Top 5 Insumos) */}
        <div className="lg:col-span-7 space-y-4">
          {/* 4 Category Metric Cards */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div
              onClick={() => setSelectedType(selectedType === 'material' ? 'all' : 'material')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                selectedType === 'material'
                  ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                  : 'border-slate-200 bg-white hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-blue-700 uppercase flex items-center gap-1">
                  <Box className="w-3.5 h-3.5" /> Materiales
                </span>
                <span className="font-mono text-xs font-bold text-blue-700">
                  {grandTotal > 0 ? ((totalMaterials / grandTotal) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="text-base font-bold font-mono text-slate-900 tabular-nums mt-1">
                {formatCurrency(totalMaterials, currency)}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {items.filter((i) => i.type === 'material').length} insumos requeridos
              </span>
            </div>

            <div
              onClick={() => setSelectedType(selectedType === 'labor' ? 'all' : 'labor')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                selectedType === 'labor'
                  ? 'border-amber-600 bg-amber-50/60 ring-2 ring-amber-500/20'
                  : 'border-slate-200 bg-white hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-amber-700 uppercase flex items-center gap-1">
                  <HardHat className="w-3.5 h-3.5" /> Mano de Obra
                </span>
                <span className="font-mono text-xs font-bold text-amber-700">
                  {grandTotal > 0 ? ((totalLabor / grandTotal) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="text-base font-bold font-mono text-slate-900 tabular-nums mt-1">
                {formatCurrency(totalLabor, currency)}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {items.filter((i) => i.type === 'labor').length} categorías / cuadrillas
              </span>
            </div>

            <div
              onClick={() => setSelectedType(selectedType === 'equipment' ? 'all' : 'equipment')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                selectedType === 'equipment'
                  ? 'border-purple-600 bg-purple-50/60 ring-2 ring-purple-500/20'
                  : 'border-slate-200 bg-white hover:border-purple-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-purple-700 uppercase flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5" /> Maquinaria y Equipo
                </span>
                <span className="font-mono text-xs font-bold text-purple-700">
                  {grandTotal > 0 ? ((totalEquipment / grandTotal) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="text-base font-bold font-mono text-slate-900 tabular-nums mt-1">
                {formatCurrency(totalEquipment, currency)}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {items.filter((i) => i.type === 'equipment').length} máquinas y equipos
              </span>
            </div>

            <div
              onClick={() => setSelectedType(selectedType === 'auxiliary' ? 'all' : 'auxiliary')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                selectedType === 'auxiliary'
                  ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 bg-white hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-700 uppercase flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" /> Auxiliares y Mezclas
                </span>
                <span className="font-mono text-xs font-bold text-emerald-700">
                  {grandTotal > 0 ? ((totalAuxiliaries / grandTotal) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="text-base font-bold font-mono text-slate-900 tabular-nums mt-1">
                {formatCurrency(totalAuxiliaries, currency)}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {items.filter((i) => i.type === 'auxiliary').length} mezclas de obra
              </span>
            </div>
          </div>

          {/* Pareto Analysis: Top Critical Supplies */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                Insumos Críticos con Mayor Incidencia (Ley de Pareto)
              </span>
              <span className="text-[10px] text-slate-400">Mayor impacto económico</span>
            </div>

            <div className="space-y-2 mt-3">
              {topSupplies.map((item, idx) => {
                const percentOfTotal = grandTotal > 0 ? (item.totalAmount / grandTotal) * 100 : 0;
                return (
                  <div key={item.resourceId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 truncate mr-2">
                        <span className="font-mono text-[10px] font-semibold text-slate-600 bg-slate-100 px-1 py-0.2 rounded shrink-0">
                          #{idx + 1} {item.code}
                        </span>
                        <span className="truncate text-slate-800 text-[11px]">{item.description}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                        <span className="font-semibold text-slate-900 tabular-nums">
                          {formatCurrency(item.totalAmount, currency)}
                        </span>
                        <span className="text-blue-600 font-bold w-12 text-right">
                          {percentOfTotal.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(2, percentOfTotal * 2.5))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Table Search & Filter Toolbar */}
        <div className="p-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código, descripción o insumo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-1 text-xs">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'material', label: 'Materiales' },
              { id: 'labor', label: 'Mano de Obra' },
              { id: 'equipment', label: 'Maquinaria' },
              { id: 'auxiliary', label: 'Auxiliares' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedType(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  selectedType === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Detailed Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/70 text-[11px] font-semibold text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5 w-10 text-center">Tipo</th>
                <th className="px-3 py-2.5 w-28">Código</th>
                <th className="px-4 py-2.5">Descripción Completa del Insumo</th>
                <th className="px-3 py-2.5 text-center w-16">Unidad</th>
                <th className="px-3 py-2.5 text-right w-24">Costo Base</th>
                <th className="px-3 py-2.5 text-right w-28">Volumen Total</th>
                <th className="px-4 py-2.5 text-right w-32">Importe Acumulado</th>
                <th className="px-3 py-2.5 text-right w-20">% Total</th>
                <th className="px-3 py-2.5 text-center w-16">APUs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400 font-sans">
                    No se encontraron insumos con los criterios de búsqueda seleccionados.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const itemIncidence = grandTotal > 0 ? ((item.totalAmount / grandTotal) * 100).toFixed(2) : '0.00';
                  return (
                    <tr key={item.resourceId} className="hover:bg-slate-50/70">
                      <td className="px-3 py-2 text-center">{getTypeIcon(item.type)}</td>
                      <td className="px-3 py-2 text-slate-700 font-semibold">{item.code}</td>
                      <td className="px-4 py-2 font-sans text-slate-800 leading-snug">{item.description}</td>
                      <td className="px-3 py-2 text-center text-slate-600">{item.unit}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                        {formatCurrency(item.unitCost, currency)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900 tabular-nums">
                        {formatNumber(item.totalQuantity, 3)}
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-slate-900 tabular-nums">
                        {formatCurrency(item.totalAmount, currency)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600 tabular-nums font-sans">
                        {itemIncidence}%
                      </td>
                      <td className="px-3 py-2 text-center text-slate-500 font-sans">
                        {item.usedInConceptsCount}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-900 text-white flex items-center justify-between text-xs">
          <span className="text-slate-300">
            Mostrando <strong>{filteredItems.length}</strong> de <strong>{items.length}</strong> insumos consolidados
          </span>
          <div className="flex items-center gap-3">
            <span className="text-slate-400">Total Directo Consolidado:</span>
            <span className="font-mono text-sm font-bold text-emerald-400 tabular-nums">
              {formatCurrency(grandTotal, currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-y-auto p-4">
          {content}
        </div>
      </div>
    );
  }

  return content;
};

// Export backward compatible alias
export const ResourceExplosionModal = ResourceExplosionView;
