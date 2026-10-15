/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Layers, Check, Sparkles, Building, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import { Project, Resource } from '../types/apu';
import { TEMPLATE_CATEGORIES, TemplateCategory, buildProjectFromTemplate } from '../utils/templateLoader';

interface TemplateSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  resources: Resource[];
  onSelectProjectTemplate: (project: Project, newResources: Resource[]) => void;
}

export const TemplateSelectorModal: React.FC<TemplateSelectorModalProps> = ({
  isOpen,
  onClose,
  resources,
  onSelectProjectTemplate,
}) => {
  const [selectedSlug, setSelectedSlug] = useState<string>(TEMPLATE_CATEGORIES[0]?.slug || 'vivienda-de-interes-social');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const currentCategory = TEMPLATE_CATEGORIES.find((c) => c.slug === selectedSlug) || TEMPLATE_CATEGORIES[0];

  const handleApplyTemplate = async () => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      // Dynamic imports for the chosen category files
      const structureModule = await import(`../data/plantillas-apu/${selectedSlug}/structure.json`);
      const matricesModule = await import(`../data/plantillas-apu/${selectedSlug}/matrices.json`);

      const { project, newResources } = buildProjectFromTemplate(
        currentCategory.name,
        structureModule.default || structureModule,
        matricesModule.default || matricesModule,
        resources
      );

      onSelectProjectTemplate(project, newResources);
      onClose();
    } catch (err: any) {
      console.error('Error loading template:', err);
      setErrorMsg(`No se pudo cargar la plantilla seleccionada (${selectedSlug}): ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-3xl w-full flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Catálogo de Obras & Plantillas Base 2022</h2>
              <p className="text-xs text-slate-500">
                Selecciona una tipología arquitectónica preconfigurada con matrices y conceptos de obra reales.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Body: Left column list, Right column details */}
        <div className="flex-1 flex overflow-hidden">
          {/* Categories list */}
          <div className="w-1/2 border-r border-slate-100 overflow-y-auto p-4 space-y-1.5 bg-slate-50/50">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 mb-2">
              Tipologías de Edificación
            </span>
            {TEMPLATE_CATEGORIES.map((cat) => {
              const isSelected = cat.slug === selectedSlug;
              return (
                <button
                  key={cat.slug}
                  onClick={() => setSelectedSlug(cat.slug)}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs transition-colors flex items-center justify-between ${
                    isSelected
                      ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold shadow-2xs'
                      : 'bg-white border-slate-200 hover:bg-slate-100/70 text-slate-700'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="truncate">{cat.name}</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      {cat.conceptCount} conceptos · {cat.chapterCount} capítulos
                    </div>
                  </div>
                  {isSelected && <ChevronRight className="w-4 h-4 text-blue-600 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Details Preview */}
          <div className="w-1/2 p-6 flex flex-col justify-between overflow-y-auto">
            {currentCategory && (
              <div className="space-y-4">
                <div>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 uppercase tracking-wider mb-1">
                    Plantilla Seleccionada
                  </span>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">{currentCategory.name}</h3>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Conceptos con Matriz</span>
                    <span className="text-lg font-bold font-mono text-slate-800 mt-0.5 block">
                      {currentCategory.matrixCount}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Capítulos WBS</span>
                    <span className="text-lg font-bold font-mono text-slate-800 mt-0.5 block">
                      {currentCategory.chapterCount}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 leading-relaxed bg-blue-50/50 border border-blue-100 p-3 rounded-lg space-y-2">
                  <div className="font-semibold text-blue-950 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-blue-600" />
                    ¿Qué incluye esta plantilla base?
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
                    <li>Árbol WBS estructurado por partidas y capítulos de obra.</li>
                    <li>Precios unitarios desglosados (materiales, cuadrillas, maquinaria).</li>
                    <li>Incorporación automática de insumos al Catálogo Maestro.</li>
                    <li>Cantidades y volúmenes de obra orientativos de referencia 2022.</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleApplyTemplate}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center gap-2 transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Cargando Plantilla...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Cargar en Nuevo Presupuesto</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
