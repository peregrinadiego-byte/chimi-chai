/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Calculator,
  ArrowRight,
  CheckSquare,
  Square,
  Download,
  Copy,
  Info,
  Building2,
  MapPin,
  TrendingUp,
  Percent,
  Compass
} from 'lucide-react';
import { Project } from '../types/apu';
import honorariosJson from '../data/honorarios-data.json';

interface HonorariosViewProps {
  onTransferToProject: (data: {
    client: string;
    projectName: string;
    surfaceArea: number;
    estimatedCost: number;
    genreName: string;
    honorarium: number;
    regionalFactor: number;
    scopePercent: number;
    serviceType: 'arquitectura' | 'urbanismo' | 'dro';
    professionalName: string;
    professionalLicense: string;
  }) => void;
}

const CATEGORY_NAMES: Record<string, string> = {
  A: 'Asistencia y cuidado',
  B: 'Comercio',
  C: 'Comunicaciones',
  D: 'Transporte',
  E: 'Cultura',
  F: 'Deporte',
  G: 'Educación',
  H: 'Finanzas',
  I: 'Gobierno y administración',
  J: 'Habitación',
  K: 'Industria',
  L: 'Seguridad pública',
  M: 'Recreación',
  N: 'Religión',
  O: 'Salud',
  P: 'Turismo y hospedaje',
  Q: 'Alimentos y bebidas',
  R: 'Servicios y estacionamiento',
};

const FR_DATA: Record<string, [string, number][]> = {
  I: [
    ['Colegio de Arquitectos de la Cd. de México, A.C.', 1.05],
    ['Colegio de Arquitectos del Estado de México, A.C.', 1.0],
    ['Colegio de Arquitectos de Hidalgo, A.C.', 0.95],
    ['Colegio de Arquitectos de Morelos, A.C.', 0.95],
    ['Colegio de Arquitectos de Guerrero, A.C.', 0.95],
    ['Colegio de Arquitectos de Oaxaca, A.C.', 0.95],
    ['Colegio de Arquitectos de Puebla, A.C.', 0.95],
    ['Colegio de Arquitectos de Tlaxcala, A.C.', 0.95],
  ],
  II: [
    ['Colegio de Arquitectos de Aguascalientes, A.C.', 0.95],
    ['Colegio de Arquitectos de Guanajuato, A.C.', 0.95],
    ['Colegio de Arquitectos de León, A.C.', 0.95],
    ['Colegio de Arquitectos de Querétaro, A.C.', 0.95],
    ['Colegio de Arquitectos de San Luis Potosí, A.C.', 0.95],
    ['Colegio de Arquitectos de Michoacán, A.C.', 0.95],
    ['Colegio de Arquitectos de Zacatecas, A.C.', 0.95],
  ],
  III: [
    ['Colegio de Arquitectos de Puerto de Veracruz, A.C.', 0.95],
    ['Colegio de Arquitectos de Chiapas, A.C.', 0.95],
    ['Colegio de Arquitectos de Tabasqueños, A.C.', 0.95],
    ['Colegio de Arquitectos de Yucatecos, A.C.', 0.95],
    ['Colegio de Arquitectos de Cancún, A.C.', 0.95],
    ['Colegio de Arquitectos de Rivera Maya, A.C.', 0.95],
  ],
  IV: [
    ['Colegio de Arquitectos de Nuevo León, A.C.', 1.05],
    ['Colegio de Arquitectos de Saltillo, A.C.', 0.95],
    ['Colegio de Arquitectos de Chihuahua, A.C.', 0.95],
    ['Colegio de Arquitectos de Ciudad Juárez, A.C.', 1.1],
    ['Colegio de Arquitectos de Durango, A.C.', 0.95],
    ['Colegio de Arquitectos de Reynosa, A.C.', 1.05],
  ],
  V: [
    ['Colegio de Arquitectos de Sinaloa, A.C.', 0.95],
    ['Colegio de Arquitectos de Estado de Jalisco, A.C.', 1.0],
    ['Colegio de Arquitectos de Puerto Vallarta, A.C.', 0.95],
    ['Colegio de Arquitectos de Mazatlán, A.C.', 0.95],
    ['Colegio de Arquitectos de Nayarit, A.C.', 0.95],
    ['Colegio de Arquitectos de Baja California Sur, A.C.', 1.05],
  ],
  VI: [
    ['Colegio de Arquitectos de Hermosillo, A.C.', 1.0],
    ['Colegio de Arquitectos de Cd. Obregón, A.C.', 1.0],
    ['Colegio de Arquitectos de Nogales, A.C.', 1.05],
  ],
  VII: [
    ['Colegio de Arquitectos de Tijuana, A.C.', 1.05],
    ['Colegio de Arquitectos de Mexicali, A.C.', 1.05],
    ['Colegio de Arquitectos de Ensenada, A.C.', 1.05],
  ],
};

const formatMXN = (val: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(
    Number.isFinite(val) ? val : 0
  );

export const HonorariosView: React.FC<HonorariosViewProps> = ({ onTransferToProject }) => {
  const [activeSubTab, setActiveSubTab] = useState<'arch' | 'urban' | 'dro'>('arch');

  // General details
  const [profName, setProfName] = useState('Arq. Luis Diego Peregrina');
  const [profLicense, setProfLicense] = useState('');
  const [clientName, setClientName] = useState('Cliente Particular');
  const [projectTitle, setProjectTitle] = useState('Residencia Unifamiliar');

  // Architectural Calculation Inputs
  const [surfaceM2, setSurfaceM2] = useState<number>(350);
  const [cbm, setCbm] = useState<number>(8025); // Costo Base por m2
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string>('J');
  const [selectedFactorCode, setSelectedFactorCode] = useState<string>('J-8'); // Casa-Habitacion Residencial
  const [selectedRegion, setSelectedRegion] = useState<string>('V');
  const [selectedCollege, setSelectedCollege] = useState<string>('Colegio de Arquitectos de Sinaloa, A.C.');
  const [customFR, setCustomFR] = useState<number>(0.95);

  // Scopes checked
  const rawArchScopes = (honorariosJson as any).data?.arch || [];
  const rawArchExtras = (honorariosJson as any).data?.archExtra || [];
  const allFactors = (honorariosJson as any).data?.factors || [];

  const [selectedScopes, setSelectedScopes] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    rawArchScopes.forEach((s: any) => (init[s.name] = true));
    return init;
  });

  const [selectedExtras, setSelectedExtras] = useState<Record<string, boolean>>({});

  // Filter factors for selected category
  const availableFactors = useMemo(() => {
    return allFactors.filter((f: any) => f.code.toUpperCase().startsWith(selectedCategoryKey));
  }, [allFactors, selectedCategoryKey]);

  // Current Factor
  const currentFactorObj = useMemo(() => {
    return allFactors.find((f: any) => f.code === selectedFactorCode) || availableFactors[0] || { factor: 1.0, name: '' };
  }, [allFactors, selectedFactorCode, availableFactors]);

  // Colleges for region
  const availableColleges = useMemo(() => {
    return FR_DATA[selectedRegion] || [];
  }, [selectedRegion]);

  const handleRegionChange = (reg: string) => {
    setSelectedRegion(reg);
    const colleges = FR_DATA[reg] || [];
    if (colleges.length > 0) {
      setSelectedCollege(colleges[0][0]);
      setCustomFR(colleges[0][1]);
    }
  };

  const handleCollegeChange = (collName: string) => {
    setSelectedCollege(collName);
    const found = availableColleges.find((c) => c[0] === collName);
    if (found) {
      setCustomFR(found[1]);
    }
  };

  // Calculations: Architectural
  // CO = S * CBM * FC
  // FS = 15 - 2.5 * log10(S)
  // H = CO * FS * FR / 100
  // HC = H * (selectedScopesPct) / 100
  const CO = surfaceM2 * cbm * currentFactorObj.factor;
  const FS = Math.max(1, 15 - 2.5 * Math.log10(Math.max(1, surfaceM2)));
  const H = (CO * FS * customFR) / 100;

  const totalScopePct = useMemo(() => {
    let sum = 0;
    rawArchScopes.forEach((s: any) => {
      if (selectedScopes[s.name]) sum += s.pct;
    });
    rawArchExtras.forEach((s: any) => {
      if (selectedExtras[s.name]) sum += s.pct;
    });
    return sum;
  }, [selectedScopes, selectedExtras, rawArchScopes, rawArchExtras]);

  const HC = (H * totalScopePct) / 100;

  // Toggle scope
  const toggleScope = (name: string) => {
    setSelectedScopes((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const toggleExtra = (name: string) => {
    setSelectedExtras((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  // Handler to transfer data directly to APU / Project
  const handleStartProject = () => {
    onTransferToProject({
      client: clientName,
      projectName: `${projectTitle} (${currentFactorObj.name})`,
      surfaceArea: surfaceM2,
      estimatedCost: CO,
      genreName: currentFactorObj.name,
      honorarium: HC,
      regionalFactor: customFR,
      scopePercent: totalScopePct,
      serviceType: activeSubTab === 'urban' ? 'urbanismo' : activeSubTab === 'dro' ? 'dro' : 'arquitectura',
      professionalName: profName,
      professionalLicense: profLicense,
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-auto">
      {/* Top Banner */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                <Compass className="w-4 h-4" />
              </span>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Calculadora de Honorarios FCARM 2022
              </h1>
              <span className="text-xs bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded">
                Arancel Oficial
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Fórmula arancelaria para diseño arquitectónico, urbanismo y consultoría/DRO con vinculación directa al presupuesto de obra.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleStartProject}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors"
            >
              <span>Generar Presupuesto con estos Datos</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="flex items-center gap-1 mt-4 pt-3 border-t border-slate-100 text-xs font-medium">
          <button
            onClick={() => setActiveSubTab('arch')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeSubTab === 'arch' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            01. Diseño Arquitectónico
          </button>
          <button
            onClick={() => setActiveSubTab('urban')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeSubTab === 'urban' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            02. Diseño Urbano
          </button>
          <button
            onClick={() => setActiveSubTab('dro')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeSubTab === 'dro' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            03. Consultoría / DRO
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Professional & Client Data Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            Identificación de la Encomienda y Profesionista
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Arquitecto Responsable</label>
              <input
                type="text"
                value={profName}
                onChange={(e) => setProfName(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Cédula Profesional</label>
              <input
                type="text"
                value={profLicense}
                placeholder="Opcional"
                onChange={(e) => setProfLicense(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Nombre del Cliente</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Título del Proyecto</label>
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {activeSubTab === 'arch' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Parameters */}
            <div className="lg:col-span-7 space-y-6">
              {/* Parameters Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-blue-600" />
                  Parámetros de Cálculo
                </h2>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Superficie a Construir (m²)</label>
                    <input
                      type="number"
                      min="1"
                      value={surfaceM2}
                      onChange={(e) => setSurfaceM2(Math.max(1, parseFloat(e.target.value) || 0))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono text-slate-900 font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Costo Base por m² (CBM)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-slate-400 font-mono">$</span>
                      <input
                        type="number"
                        min="1"
                        value={cbm}
                        onChange={(e) => setCbm(parseFloat(e.target.value) || 0)}
                        className="w-full pl-6 pr-3 py-2 border border-slate-200 rounded-md font-mono text-slate-900 font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Categoría del Género</label>
                    <select
                      value={selectedCategoryKey}
                      onChange={(e) => {
                        setSelectedCategoryKey(e.target.value);
                        const first = allFactors.find((f: any) =>
                          f.code.toUpperCase().startsWith(e.target.value)
                        );
                        if (first) setSelectedFactorCode(first.code);
                      }}
                      className="w-full px-2.5 py-2 border border-slate-200 rounded-md bg-white text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    >
                      {Object.keys(CATEGORY_NAMES).map((key) => (
                        <option key={key} value={key}>
                          {key} · {CATEGORY_NAMES[key]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Tipo de Proyecto (FC)</label>
                    <select
                      value={selectedFactorCode}
                      onChange={(e) => setSelectedFactorCode(e.target.value)}
                      className="w-full px-2.5 py-2 border border-slate-200 rounded-md bg-white text-slate-800 font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    >
                      {availableFactors.map((f: any) => (
                        <option key={f.code} value={f.code}>
                          {f.code} · {f.name} (FC: {f.factor})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Regional Factor */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      Factor Regional (FR)
                    </span>
                    <span className="text-xs font-bold font-mono px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                      FR: {customFR.toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-500 mb-1">Región FCARM</label>
                      <select
                        value={selectedRegion}
                        onChange={(e) => handleRegionChange(e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white"
                      >
                        {Object.keys(FR_DATA).map((r) => (
                          <option key={r} value={r}>
                            Región {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-500 mb-1">Colegio / Zona</label>
                      <select
                        value={selectedCollege}
                        onChange={(e) => handleCollegeChange(e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white text-[11px]"
                      >
                        {availableColleges.map(([name, val]) => (
                          <option key={name} value={name}>
                            {name} ({val.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Formula box */}
                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-[11px] font-mono text-slate-700 space-y-1">
                  <div>• CO (Costo Directo Obra) = Superficie ({surfaceM2} m²) × CBM (${cbm}) × FC ({currentFactorObj.factor})</div>
                  <div>• FS (Factor Superficie) = 15 − 2.5 × log₁₀({surfaceM2}) = {FS.toFixed(3)}</div>
                  <div>• H (Honorario Base) = CO × FS × FR ({customFR.toFixed(2)}) / 100</div>
                </div>
              </div>

              {/* Scope of services */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Alcance del Servicio y Etapas
                  </h2>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    Alcance total: {totalScopePct}%
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {rawArchScopes.map((scope: any) => (
                    <label
                      key={scope.name}
                      className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={!!selectedScopes[scope.name]}
                        onChange={() => toggleScope(scope.name)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span className="flex-1 text-slate-700 font-medium">{scope.name}</span>
                      <span className="font-mono text-slate-500">{scope.pct}%</span>
                    </label>
                  ))}
                </div>

                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pt-2 border-t border-slate-100">
                  Servicios e Ingenierías Adicionales
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {rawArchExtras.map((extra: any) => (
                    <label
                      key={extra.name}
                      className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={!!selectedExtras[extra.name]}
                        onChange={() => toggleExtra(extra.name)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span className="flex-1 text-slate-700 font-medium">{extra.name}</span>
                      <span className="font-mono text-slate-500">{extra.pct}%</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Results & Transfer Card */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6 sticky top-20">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Resumen de la Cotización
                </h2>

                <div className="space-y-4">
                  <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Costo Directo Estimado de la Obra (CO)
                    </span>
                    <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
                      {formatMXN(CO)}
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      {surfaceM2} m² @ {formatMXN(cbm * currentFactorObj.factor)}/m²
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Factor Superficie (FS)
                      </span>
                      <span className="text-base font-bold font-mono text-slate-800 mt-0.5 block">
                        {FS.toFixed(3)}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Honorario Base (100%)
                      </span>
                      <span className="text-base font-bold font-mono text-slate-800 mt-0.5 block">
                        {formatMXN(H)}
                      </span>
                    </div>
                  </div>

                  {/* Main Highlight Metric */}
                  <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl text-white shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-blue-100 uppercase tracking-wider">
                        Honorario Contratado ({totalScopePct}%)
                      </span>
                      <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-mono">
                        {customFR.toFixed(2)} FR
                      </span>
                    </div>
                    <div className="text-3xl font-extrabold font-mono tracking-tight mt-1">
                      {formatMXN(HC)}
                    </div>
                    <div className="text-xs text-blue-100/90 mt-2">
                      Equivalente al <strong>{((HC / (CO || 1)) * 100).toFixed(2)}%</strong> del costo total de obra.
                    </div>
                  </div>
                </div>

                {/* Transfer Call to action */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="text-xs text-slate-600 leading-relaxed">
                    ¿Aprobada la propuesta? Inicia directamente la etapa de <strong>Costos y Precios Unitarios</strong> con estos parámetros prellenados.
                  </div>
                  <button
                    onClick={handleStartProject}
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <span>Vincular y Crear Proyecto en Presupuesto</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'urban' && (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <div className="font-semibold text-slate-800 text-sm mb-1">Módulo de Arancel Urbano FCARM</div>
            <p className="max-w-md mx-auto text-slate-500">
              Cálculo para conjuntos habitacionales, parques industriales y plazas abiertas en hectáreas por densidad.
            </p>
          </div>
        )}

        {activeSubTab === 'dro' && (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <div className="font-semibold text-slate-800 text-sm mb-1">Dirección Responsable de Obra (DRO)</div>
            <p className="max-w-md mx-auto text-slate-500">
              Cálculo proporcional a semanas de ejecución, visitas programadas y salario mínimo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
