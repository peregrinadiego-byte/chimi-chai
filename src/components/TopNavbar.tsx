/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Calculator,
  Layers,
  FileSpreadsheet,
  FolderKanban,
  SlidersHorizontal,
  Box,
  Download,
  FileText
  , TrendingUp, PanelRightClose, PanelRightOpen
} from 'lucide-react';
import { Project } from '../types/apu';
import { formatCurrency, getBudgetTotals } from '../utils/calculations';

export type ActiveTab =
  | 'honorarios'
  | 'wbs'
  | 'apu'
  | 'generators'
  | 'resources'
  | 'explosion'
  | 'schedule'
  | 'estimates'
  | 'operations'
  | 'earned';

interface TopNavbarProps {
  project: Project;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isCatalogOpen: boolean;
  onToggleCatalog: () => void;
  onOpenMarkupModal: () => void;
  onOpenProjectsModal: () => void;
  onOpenTemplatesModal?: () => void;
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
  onOpenTemplatesModal,
  onExportExcel,
  onExportCSV,
  hasSelectedConcept,
}) => {
  const [isModulesCollapsed, setIsModulesCollapsed] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="w-full px-4 lg:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left Side: Brand & Active Project Badge */}
        <div className="flex items-center gap-2.5 shrink-0">
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
            className="group flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-md hover:bg-slate-100 transition-colors max-w-[220px] truncate border border-slate-200/60"
          >
            <FolderKanban className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="font-semibold truncate">{project.name}</span>
          </button>
        </div>

        {/* Right Side: All Modules and Action Buttons Grouped */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar justify-end flex-1">
          {/* Main Navigation Modules */}
          <div className={`fixed left-3 top-[4.5rem] z-40 flex flex-col gap-1 text-xs font-medium text-slate-600 bg-white/95 backdrop-blur p-1.5 rounded-xl border border-slate-200 shadow-lg max-h-[calc(100vh-5.5rem)] overflow-y-auto ${isModulesCollapsed ? 'w-12' : 'w-48'}`}>
            <button
              type="button"
              onClick={() => setIsModulesCollapsed((current) => !current)}
              className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-slate-600 hover:bg-slate-100 border-b border-slate-200"
              title={isModulesCollapsed ? 'Mostrar módulos' : 'Contraer módulos'}
              aria-label={isModulesCollapsed ? 'Mostrar módulos' : 'Contraer módulos'}
            >
              {isModulesCollapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
              {!isModulesCollapsed && <span className="font-semibold">Módulos</span>}
            </button>
            <nav className={`flex gap-1 text-xs font-medium bg-slate-100/80 p-1 rounded-lg border border-slate-200/80 ${isModulesCollapsed ? 'flex-col' : 'flex-col'}`}>
            <button
              onClick={() => onSelectTab('honorarios')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'honorarios'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Calculator className="w-3.5 h-3.5 text-indigo-600" />
              {!isModulesCollapsed && <span>Honorarios</span>}
            </button>

            <button
              onClick={() => onSelectTab('wbs')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'wbs'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              {!isModulesCollapsed && <span>Presupuesto</span>}
            </button>

            <button
              onClick={() => onSelectTab('apu')}
              disabled={!hasSelectedConcept}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'apu'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : hasSelectedConcept
                  ? 'hover:text-slate-900 hover:bg-white/60'
                  : 'text-slate-300 cursor-not-allowed'
              }`}
            >
              <Calculator className="w-3.5 h-3.5 text-emerald-600" />
              {!isModulesCollapsed && <span>Matriz APU</span>}
            </button>

            <button
              onClick={() => onSelectTab('generators')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'generators'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
              {!isModulesCollapsed && <span>Generadores</span>}
            </button>

            <button
              onClick={() => onSelectTab('resources')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'resources'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Box className="w-3.5 h-3.5 text-cyan-600" />
              {!isModulesCollapsed && <span>Insumos</span>}
            </button>

            <button
              onClick={() => onSelectTab('explosion')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'explosion'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" />
              {!isModulesCollapsed && <span>Explosión</span>}
            </button>

            <button
              onClick={() => onSelectTab('schedule')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'schedule'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-orange-600" />
              {!isModulesCollapsed && <span>Programa CPM</span>}
            </button>

            <button
              onClick={() => onSelectTab('estimates')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'estimates'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              {!isModulesCollapsed && <span>Estimaciones</span>}
            </button>

            <button
              onClick={() => onSelectTab('operations')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'operations'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Box className="w-3.5 h-3.5 text-amber-600" />
              {!isModulesCollapsed && <span>Operación</span>}
            </button>

            <button
              onClick={() => onSelectTab('earned')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'earned'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-violet-600" />
              {!isModulesCollapsed && <span>Valor Ganado</span>}
            </button>
            </nav>
          </div>

          {/* Action Tools on the Far Right */}
          <div className="flex items-center gap-1.5 shrink-0 pl-1">
            {onOpenTemplatesModal && (
              <button
                onClick={onOpenTemplatesModal}
                title="Cargar obra modelo desde Catálogo 2022"
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors whitespace-nowrap"
              >
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Plantillas Base</span>
              </button>
            )}

            <button
              onClick={onOpenMarkupModal}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors whitespace-nowrap"
              title="Configurar Indirectos, Financiamiento, Utilidad y FSR"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>FSR ({project.fsrConfig.calculatedFSR})</span>
            </button>

            <button
              onClick={onExportExcel}
              title="Descargar Presupuesto formateado en Excel"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 rounded-md border border-emerald-200 transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel</span>
            </button>

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
      </div>
    </header>
  );
};
