/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Calculator,
  Layers,
  FileSpreadsheet,
  FolderKanban,
  SlidersHorizontal,
  Box,
  Download,
  FileText
  , TrendingUp
} from 'lucide-react';
import { Project } from '../types/apu';
import { formatCurrency, getBudgetTotals } from '../utils/calculations';

export type ActiveTab = 'wbs' | 'apu' | 'explosion' | 'schedule' | 'estimates' | 'operations' | 'earned';

interface TopNavbarProps {
  project: Project;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isCatalogOpen: boolean;
  onToggleCatalog: () => void;
  onOpenMarkupModal: () => void;
  onOpenProjectsModal: () => void;
  onExportExcel: () => void;
  onExportCSV: () => void;
  hasSelectedConcept: boolean;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  project,
  activeTab,
  onSelectTab,
  isCatalogOpen,
  onToggleCatalog,
  onOpenMarkupModal,
  onOpenProjectsModal,
  onExportExcel,
  onExportCSV,
  hasSelectedConcept,
}) => {
  const totals = getBudgetTotals(project);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 h-14 flex items-center justify-between gap-6">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              EZ
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
              EZ-APU
            </span>
          </div>

          <span className="text-slate-300">/</span>

          <button
            onClick={onOpenProjectsModal}
            title="Gestionar o cambiar proyecto"
            className="group flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors max-w-[200px] truncate"
          >
            <FolderKanban className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="font-medium truncate">{project.name}</span>
          </button>
        </div>

        {/* Zone 2: Navigation Links / Segmented View Selectors */}
        <nav className="flex items-center gap-1 text-xs font-medium text-slate-600">
          <button
            onClick={() => onSelectTab('wbs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'wbs'
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Presupuesto WBS</span>
          </button>

          <button
            onClick={() => onSelectTab('apu')}
            disabled={!hasSelectedConcept}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'apu'
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : hasSelectedConcept
                ? 'hover:text-slate-900 hover:bg-slate-50'
                : 'text-slate-300 cursor-not-allowed'
            }`}
          >
            <Calculator className="w-3.5 h-3.5 text-emerald-600" />
            <span>Matriz APU Detallada</span>
          </button>

          <button
            onClick={() => onSelectTab('explosion')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'explosion'
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" />
            <span>Explosión Insumos</span>
          </button>

          <button
            onClick={() => onSelectTab('schedule')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'schedule'
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-orange-600" />
            <span>Programación</span>
          </button>

          <button
            onClick={() => onSelectTab('estimates')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'estimates' ? 'bg-slate-100 text-slate-900 font-semibold' : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
            <span>Estimaciones</span>
          </button>

          <button onClick={() => onSelectTab('operations')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${activeTab === 'operations' ? 'bg-slate-100 text-slate-900 font-semibold' : 'hover:text-slate-900 hover:bg-slate-50'}`}>
            <Box className="w-3.5 h-3.5 text-amber-600" /><span>Operación</span>
          </button>

          <button onClick={() => onSelectTab('earned')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${activeTab === 'earned' ? 'bg-slate-100 text-slate-900 font-semibold' : 'hover:text-slate-900 hover:bg-slate-50'}`}>
            <TrendingUp className="w-3.5 h-3.5 text-violet-600" /><span>Valor ganado</span>
          </button>
        </nav>

        {/* Zone 3: Primary Actions & Utilities */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Sobrecostos & FSR Button */}
          <button
            onClick={onOpenMarkupModal}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors whitespace-nowrap"
            title="Configurar Indirectos, Financiamiento, Utilidad y FSR"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span>Sobrecostos & FSR ({project.fsrConfig.calculatedFSR})</span>
          </button>

          {/* Export Dropdown / Trigger */}
          <button
            onClick={onExportExcel}
            title="Descargar Presupuesto formateado en Excel"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 rounded-md border border-emerald-200 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Exportar Excel</span>
          </button>

          {/* Toggle Catalog Drawer Button */}
          <button
            onClick={onToggleCatalog}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shadow-xs ${
              isCatalogOpen
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>Catálogo</span>
            <kbd className="text-[10px] bg-black/20 px-1 py-0.2 rounded font-mono">Alt+C</kbd>
          </button>
        </div>
      </div>
    </header>
  );
};
