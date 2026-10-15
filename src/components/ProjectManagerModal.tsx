/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { X, FolderKanban, Plus, Download, Upload, RotateCcw, Check, Sparkles, Building2 } from 'lucide-react';
import { Project } from '../types/apu';
import { INITIAL_PROJECT } from '../data/seedData';
import { downloadFile } from '../utils/exportUtils';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: Project;
  onUpdateProject: (project: Project) => void;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  onClose,
  currentProject,
  onUpdateProject,
}) => {
  const [name, setName] = useState(currentProject.name);
  const [code, setCode] = useState(currentProject.code);
  const [client, setClient] = useState(currentProject.client);
  const [location, setLocation] = useState(currentProject.location);
  const [currency, setCurrency] = useState(currentProject.currency || 'MXN');

  // Keep the configuration form synchronized with the active project.
  // Without this, the form retained the values from the project that was
  // active when the modal was first mounted.
  useEffect(() => {
    setName(currentProject.name);
    setCode(currentProject.code);
    setClient(currentProject.client);
    setLocation(currentProject.location);
    setCurrency(currentProject.currency || 'MXN');
  }, [currentProject]);

  if (!isOpen) return null;

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProject({
      ...currentProject,
      name,
      code,
      client,
      location,
      currency,
      lastModified: new Date().toISOString(),
    });
    onClose();
  };

  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(currentProject, null, 2);
    downloadFile(jsonStr, `EZAPU_Proyecto_${currentProject.code}_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string) as Project;
        if (imported.wbs && imported.concepts) {
          onUpdateProject(imported);
          alert('¡Proyecto importado con éxito!');
          onClose();
        } else {
          alert('El archivo JSON no tiene la estructura de un proyecto EZ-APU válido.');
        }
      } catch (err) {
        alert('Error al leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetDemo = () => {
    if (confirm('¿Restablecer el proyecto de demostración "Residencia Campestre Los Encinos"? Los cambios no guardados se perderán.')) {
      onUpdateProject(INITIAL_PROJECT);
      onClose();
    }
  };

  const handleCreateBlank = () => {
    if (confirm('¿Crear un nuevo presupuesto en blanco?')) {
      const blank: Project = {
        id: `proj_${Date.now()}`,
        name: 'Nuevo Presupuesto de Obra',
        code: `OBRA-${new Date().getFullYear()}-001`,
        client: 'Cliente General',
        location: 'México',
        date: new Date().toISOString().slice(0, 10),
        currency: 'MXN',
        markupConfig: { ...currentProject.markupConfig },
        fsrConfig: { ...currentProject.fsrConfig },
        wbs: [
          {
            id: `chap_${Date.now()}`,
            code: '01',
            name: '01. PRELIMINARES',
            type: 'chapter',
            isExpanded: true,
            children: [],
            totalPrice: 0,
          },
        ],
        concepts: {}, schedule: [], estimates: [], supplies: [], warehouseMovements: [],
        lastModified: new Date().toISOString(),
      };
      onUpdateProject(blank);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full p-5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-900">Configuración del Proyecto y Datos</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">
            ✕
          </button>
        </div>

        {/* Project Details Form */}
        <form onSubmit={handleSaveDetails} className="mt-4 space-y-3 text-xs">
          <div>
            <label className="block text-slate-700 font-medium mb-1">Nombre de la Obra o Proyecto</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md font-medium text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Código de Proyecto</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Moneda</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md"
              >
                <option value="MXN">Pesos Mexicanos (MXN)</option>
                <option value="USD">Dólares Americanos (USD)</option>
                <option value="EUR">Euros (EUR)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Cliente / Dependencia</label>
              <input
                type="text"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Ubicación de la Obra</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-4 py-1.5 font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Guardar Datos de Carátula
            </button>
          </div>
        </form>

        {/* Backup & Actions Strip */}
        <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Acciones de Respaldo y Nuevos Proyectos
          </span>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={handleExportJSON}
              className="px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-md text-slate-700 flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              Exportar Respaldo JSON
            </button>

            <label className="px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-md text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-purple-600" />
              <span>Importar Respaldo JSON</span>
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>

            <button
              type="button"
              onClick={handleCreateBlank}
              className="px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-md text-slate-700 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              Nuevo Proyecto en Blanco
            </button>

            <button
              type="button"
              onClick={handleResetDemo}
              className="px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-md text-slate-700 flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              Restablecer Proyecto Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
