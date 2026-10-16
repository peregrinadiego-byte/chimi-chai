/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ActiveTab,
  TopNavbar
} from './components/TopNavbar';
import { CatalogDrawer } from './components/CatalogDrawer';
import { WBSTreeView } from './components/WBSTreeView';
import { APUInspector } from './components/APUInspector';
import { MarkupModal } from './components/MarkupModal';
import { ResourceExplosionModal } from './components/ResourceExplosionModal';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { FSRConfig, MarkupConfig, MatrixConcept, MatrixItem, Project, Resource, WBSNode, ScheduleTask } from './types/apu';
import { INITIAL_PROJECT, MASTER_RESOURCES } from './data/seedData';
import { recalculateProject } from './utils/calculations';
import { exportBudgetToCSV, exportBudgetToExcelHTML, exportEstimatesToCSV, exportOperationsToCSV, exportScheduleToCSV } from './utils/exportUtils';
import { ScheduleCPMView } from './components/ScheduleCPMView';
import { EstimatesView } from './components/EstimatesView';
import { OperationsView } from './components/OperationsView';
import { EarnedValueView } from './components/EarnedValueView';
import { ResourcesView } from './components/ResourcesView';
import { HonorariosView } from './components/HonorariosView';
import { TemplateSelectorModal } from './components/TemplateSelectorModal';
import { GeneratorsView } from './components/GeneratorsView';
import { loadPersistedProject, saveProject } from './utils/persistence';

export default function App() {
  // Load Project from localStorage or default seed
  const [project, setProject] = useState<Project>(() => {
    try {
      const saved = localStorage.getItem('ezapu_active_project');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not parse saved project:', e);
    }
    return INITIAL_PROJECT;
  });

  // Load Catalog Resources from localStorage or master seed
  const [resources, setResources] = useState<Resource[]>(() => {
    try {
      const saved = localStorage.getItem('ezapu_master_resources');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not parse saved resources:', e);
    }
    return MASTER_RESOURCES;
  });

  // UI state
  const [activeTab, setActiveTab] = useState<ActiveTab>('wbs');
  const [selectedConceptId, setSelectedConceptId] = useState<string>('con_trazo');
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isCatalogPinned, setIsCatalogPinned] = useState(false);

  // Modals state
  const [showMarkupModal, setShowMarkupModal] = useState(false);
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);

  // Memoized map of resources for fast lookups
  const resourcesMap = useMemo(() => {
    const map: Record<string, Resource> = {};
    for (const r of resources) {
      map[r.id] = r;
    }
    return map;
  }, [resources]);

  // Recalculate project on mount or whenever markup / items change
  const handleUpdateProject = useCallback((updated: Project) => {
  const recalculated = recalculateProject(updated, resourcesMap);
  setProject(recalculated);

  try {
    void saveProject(recalculated);
  } catch (e) {
    console.warn('Failed to save project to localStorage:', e);
  }
}, [resourcesMap]);

  // Initial recalculation on mount to guarantee fresh numbers
  useEffect(() => {
    const freshlyCalculated = recalculateProject(project, resourcesMap);
    setProject(freshlyCalculated);
  }, []);

  // IndexedDB permite recuperar plantillas grandes que superan la cuota de
  // localStorage, sin cambiar el arranque rápido de proyectos pequeños.
  useEffect(() => {
    let cancelled = false;
    void loadPersistedProject().then((persisted) => {
      if (!cancelled && persisted && persisted.lastModified !== project.lastModified) {
        setProject(recalculateProject(persisted, resourcesMap));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // ScheduleCPMView emits normalized activities without coupling the view to the app state.
  useEffect(() => {
    const handleScheduleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ schedule: ScheduleTask[]; startDate?: string; calendarMode?: 'natural' | 'working' }>).detail;
      const schedule = Array.isArray(detail) ? detail : detail?.schedule;
      if (!Array.isArray(schedule)) return;
      setProject((current) => {
        const updated = {
          ...current,
          schedule,
          scheduleStartDate: Array.isArray(detail) ? current.scheduleStartDate : detail.startDate,
          scheduleCalendarMode: Array.isArray(detail) ? current.scheduleCalendarMode : detail.calendarMode,
          lastModified: new Date().toISOString(),
        };
        void saveProject(updated);
        return updated;
      });
    };
    window.addEventListener('ezapu:schedule-updated', handleScheduleUpdate);
    return () => window.removeEventListener('ezapu:schedule-updated', handleScheduleUpdate);
  }, []);

  // Keyboard shortcut: Alt+C to toggle catalog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && (e.key === 'c' || e.key === 'C')) || (e.ctrlKey && e.key === 'b')) {
        e.preventDefault();
        setIsCatalogOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Save resources to localStorage when updated
  const handleAddNewResource = (newRes: Resource) => {
    const updated = [newRes, ...resources];
    setResources(updated);
    try {
      localStorage.setItem('ezapu_master_resources', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save resources to localStorage:', e);
    }
  };

  // Full resources list update
  const handleUpdateResources = (updatedResources: Resource[]) => {
    setResources(updatedResources);
    try {
      localStorage.setItem('ezapu_master_resources', JSON.stringify(updatedResources));
    } catch (e) {
      console.warn('Failed to save resources to localStorage:', e);
    }
  };

  // Load template base project
  const handleSelectProjectTemplate = (templateProject: Project, newResources: Resource[]) => {
    if (newResources.length > 0) {
      const existingCodes = new Set(resources.map((r) => r.code));
      const filtered = newResources.filter((r) => !existingCodes.has(r.code));
      const combined = [...resources, ...filtered];
      handleUpdateResources(combined);
    }
    handleUpdateProject(templateProject);
    if (templateProject.wbs.length > 0) {
      const firstChapter = templateProject.wbs[0];
      if (firstChapter.children && firstChapter.children.length > 0) {
        setSelectedConceptId(firstChapter.children[0].conceptId || '');
      }
    }
    setActiveTab('wbs');
  };

  // Transfer from honorarios to create or adapt project
  const handleTransferFromHonorarios = (data: {
    client: string;
    projectName: string;
    surfaceArea: number;
    estimatedCost: number;
    genreName: string;
    honorarium?: number;
    regionalFactor?: number;
    scopePercent?: number;
    serviceType?: 'arquitectura' | 'urbanismo' | 'dro';
    professionalName?: string;
    professionalLicense?: string;
  }) => {
    const newProj: Project = {
      ...project,
      name: data.projectName,
      client: data.client,
      location: 'México',
      professionalFees: {
        professionalName: data.professionalName,
        professionalLicense: data.professionalLicense,
        serviceType: data.serviceType || 'arquitectura',
        genreName: data.genreName,
        surfaceArea: data.surfaceArea,
        baseConstructionCost: data.estimatedCost,
        regionalFactor: data.regionalFactor || 0,
        honorarium: data.honorarium || 0,
        scopePercent: data.scopePercent || 0,
        createdAt: new Date().toISOString(),
      },
      lastModified: new Date().toISOString(),
    };
    handleUpdateProject(newProj);
    setActiveTab('wbs');
  };

  // Open specific concept in APU inspector
  const handleSelectConcept = (conceptId: string) => {
    setSelectedConceptId(conceptId);
    setActiveTab('apu');
  };

  // Update a single concept matrix
  const handleUpdateConcept = (updatedConcept: MatrixConcept) => {
    const updatedConcepts = {
      ...project.concepts,
      [updatedConcept.id]: updatedConcept,
    };
    handleUpdateProject({
      ...project,
      concepts: updatedConcepts,
    });
  };

  // Add concept directly into a chapter
  const handleAddConceptToChapter = (chapterId: string, resourceOrConcept?: Resource) => {
    const newConceptId = `con_${Date.now()}`;
    const codeNum = Object.keys(project.concepts).length + 1;
    const newCode = resourceOrConcept ? `${resourceOrConcept.code}-APU` : `CON-${codeNum.toString().padStart(2, '0')}`;
    const newDesc = resourceOrConcept
      ? `Suministro y colocación de ${resourceOrConcept.description}`
      : 'Nuevo concepto de obra y matriz de precios unitarios';
    const newUnit = resourceOrConcept ? resourceOrConcept.unit : 'm2';

    // Initial items in this concept
    const initialItems: MatrixItem[] = resourceOrConcept
      ? [
          {
            id: `item_${Date.now()}`,
            resourceId: resourceOrConcept.id,
            code: resourceOrConcept.code,
            description: resourceOrConcept.description,
            unit: resourceOrConcept.unit,
            type: resourceOrConcept.type,
            quantity: 1.0,
            unitCost: resourceOrConcept.baseCost,
            totalCost: resourceOrConcept.baseCost,
          },
        ]
      : [];

    const newConcept: MatrixConcept = {
      id: newConceptId,
      code: newCode,
      description: newDesc,
      unit: newUnit,
      quantity: 10.0,
      directCost: 0,
      indirectPercent: project.markupConfig.indirectOffice + project.markupConfig.indirectField,
      financingPercent: project.markupConfig.financing,
      profitPercent: project.markupConfig.profit,
      extraChargesPercent: project.markupConfig.extraCharges,
      unitPrice: 0,
      totalPrice: 0,
      minorToolsPercent: 3.0,
      safetyEquipmentPercent: 2.0,
      items: initialItems,
    };

    const newWBSNode: WBSNode = {
      id: `wbs_${Date.now()}`,
      code: `${codeNum.toString().padStart(2, '0')}`,
      name: newDesc,
      type: 'concept',
      conceptId: newConceptId,
      unit: newUnit,
      quantity: 10.0,
    };

    function appendToChapter(nodes: WBSNode[]): WBSNode[] {
      return nodes.map((node) => {
        if (node.id === chapterId) {
          return {
            ...node,
            isExpanded: true,
            children: [...(node.children || []), newWBSNode],
          };
        }
        if (node.children) {
          return { ...node, children: appendToChapter(node.children) };
        }
        return node;
      });
    }

    const updatedWBS = appendToChapter(project.wbs);
    handleUpdateProject({
      ...project,
      concepts: { ...project.concepts, [newConceptId]: newConcept },
      wbs: updatedWBS,
    });

    setSelectedConceptId(newConceptId);
    setActiveTab('apu');
  };

  // Insert resource from catalog
  const handleInsertResourceFromCatalog = (res: Resource, qty: number) => {
    // If we have an active concept in APU view or selected
    if (selectedConceptId && project.concepts[selectedConceptId]) {
      const activeConcept = project.concepts[selectedConceptId];
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

      handleUpdateConcept({
        ...activeConcept,
        items: [...activeConcept.items, newItem],
      });
    } else {
      // If no concept selected, append as a concept to the first chapter
      if (project.wbs.length > 0) {
        handleAddConceptToChapter(project.wbs[0].id, res);
      }
    }
  };

  // Active concept name for the catalog drawer header
  const activeConcept = project.concepts[selectedConceptId];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navbar */}
      <TopNavbar
        project={project}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isCatalogOpen={isCatalogOpen}
        onToggleCatalog={() => setIsCatalogOpen((prev) => !prev)}
        onOpenMarkupModal={() => setShowMarkupModal(true)}
        onOpenProjectsModal={() => setShowProjectsModal(true)}
        onOpenTemplatesModal={() => setShowTemplatesModal(true)}
        onExportExcel={() => exportBudgetToExcelHTML(project)}
        onExportCSV={() => exportBudgetToCSV(project)}
        hasSelectedConcept={Boolean(selectedConceptId && project.concepts[selectedConceptId])}
      />

      {/* Main Content Area */}
      <main
        className={`flex-1 transition-all duration-200 ease-out ${
          isCatalogOpen && isCatalogPinned ? 'mr-96' : 'mr-0'
        } lg:pl-52`}
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
          {activeTab === 'honorarios' && (
            <HonorariosView onTransferToProject={handleTransferFromHonorarios} />
          )}

          {activeTab === 'wbs' && (
            <WBSTreeView
              project={project}
              onSelectConcept={handleSelectConcept}
              selectedConceptId={selectedConceptId}
              onUpdateProject={handleUpdateProject}
              onAddConceptToChapter={handleAddConceptToChapter}
              currency={project.currency}
            />
          )}

          {activeTab === 'apu' && (
            <APUInspector
              conceptId={selectedConceptId}
              project={project}
              resourcesMap={resourcesMap}
              onUpdateConcept={handleUpdateConcept}
              onBackToWBS={() => setActiveTab('wbs')}
              onOpenCatalog={() => setIsCatalogOpen(true)}
              currency={project.currency}
            />
          )}

          {activeTab === 'generators' && (
            <GeneratorsView
              project={project}
              onUpdateProject={handleUpdateProject}
              selectedConceptId={selectedConceptId}
              onSelectConcept={handleSelectConcept}
            />
          )}

          {activeTab === 'resources' && (
            <ResourcesView
              resources={resources}
              currency={project.currency}
              project={project}
              onUpdateResources={handleUpdateResources}
              onAddNewResource={handleAddNewResource}
            />
          )}

          {activeTab === 'explosion' && (
            <ResourceExplosionModal
              project={project}
              resourcesMap={resourcesMap}
              currency={project.currency}
              onBackToWBS={() => setActiveTab('wbs')}
            />
          )}

          {activeTab === 'schedule' && (
            <ScheduleCPMView project={project} />
          )}

          {activeTab === 'estimates' && (
            <EstimatesView project={project} onUpdateProject={handleUpdateProject} onExport={() => exportEstimatesToCSV(project)} />
          )}

          {activeTab === 'operations' && (
            <OperationsView project={project} resources={resources} onUpdateProject={handleUpdateProject} onExport={() => exportOperationsToCSV(project, resources)} />
          )}

          {activeTab === 'earned' && <EarnedValueView project={project} />}
        </div>
      </main>

      {/* Always-Accessible Catalog Drawer */}
      <CatalogDrawer
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        isPinned={isCatalogPinned}
        onTogglePin={() => setIsCatalogPinned((prev) => !prev)}
        resources={resources}
        currency={project.currency}
        onInsertResource={handleInsertResourceFromCatalog}
        onAddNewResource={handleAddNewResource}
        activeConceptName={activeConcept ? `${activeConcept.code} - ${activeConcept.description}` : undefined}
      />

      {/* Modals */}
      <MarkupModal
        isOpen={showMarkupModal}
        onClose={() => setShowMarkupModal(false)}
        project={project}
        onSave={(newMarkup, newFSR) => {
          handleUpdateProject({
            ...project,
            markupConfig: newMarkup,
            fsrConfig: newFSR,
          });
        }}
      />

      <ProjectManagerModal
        isOpen={showProjectsModal}
        onClose={() => setShowProjectsModal(false)}
        currentProject={project}
        onUpdateProject={handleUpdateProject}
      />

      <TemplateSelectorModal
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        resources={resources}
        onSelectProjectTemplate={handleSelectProjectTemplate}
      />
    </div>
  );
}
