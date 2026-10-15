import React, { useMemo, useState } from 'react';
import { ClipboardList, Plus, Trash2 } from 'lucide-react';
import { Estimate, Project } from '../types/apu';

interface EstimatesViewProps {
  project: Project;
  onUpdateProject: (project: Project) => void;
  onExport: () => void;
}

export const EstimatesView: React.FC<EstimatesViewProps> = ({ project, onUpdateProject, onExport }) => {
  const estimates = project.estimates || [];
  const concepts = Object.values(project.concepts);
  const [number, setNumber] = useState(String(estimates.length + 1).padStart(3, '0'));
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [conceptId, setConceptId] = useState(concepts[0]?.id || '');
  const [quantity, setQuantity] = useState('1');

  const accumulated = useMemo(() => estimates.reduce((sum, estimate) => sum + estimate.total, 0), [estimates]);
  const addEstimate = (event: React.FormEvent) => {
    event.preventDefault();
    const concept = project.concepts[conceptId];
    const qty = Math.max(0, Number(quantity) || 0);
    if (!concept || !qty) return;
    const amount = Number((qty * concept.unitPrice).toFixed(2));
    const estimate: Estimate = {
      id: `est_${Date.now()}`,
      number,
      date,
      status: 'borrador',
      items: [{ conceptId, quantity: qty, amount }],
      subtotal: amount,
      total: amount,
    };
    onUpdateProject({ ...project, estimates: [...estimates, estimate], lastModified: new Date().toISOString() });
    setNumber(String(estimates.length + 2).padStart(3, '0'));
    setQuantity('1');
  };

  return (
    <section className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <div><h1 className="text-base font-bold flex items-center gap-2"><ClipboardList className="w-5 h-5 text-emerald-600" />Estimaciones de obra</h1><p className="text-xs text-slate-500 mt-1">Control M2 vinculado con conceptos y precios del presupuesto.</p></div>
          <div className="text-right text-xs text-slate-500">Acumulado estimado<strong className="block text-base text-slate-900">{accumulated.toLocaleString('es-MX', { style: 'currency', currency: project.currency })}</strong><button onClick={onExport} className="mt-1 px-2 py-1 border rounded text-xs">Exportar CSV</button></div>
        </div>
        <form onSubmit={addEstimate} className="grid grid-cols-1 md:grid-cols-[90px_140px_2fr_100px_auto] gap-2 items-end mb-5">
          <label className="text-xs text-slate-600">Núm.<input value={number} onChange={(e) => setNumber(e.target.value)} className="mt-1 w-full px-2 py-1.5 border rounded-md" /></label>
          <label className="text-xs text-slate-600">Fecha<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full px-2 py-1.5 border rounded-md" /></label>
          <label className="text-xs text-slate-600">Concepto<select value={conceptId} onChange={(e) => setConceptId(e.target.value)} className="mt-1 w-full px-2 py-1.5 border rounded-md"><option value="">Seleccionar concepto</option>{concepts.map((concept) => <option key={concept.id} value={concept.id}>{concept.code} · {concept.description} · {concept.unitPrice.toFixed(2)}</option>)}</select></label>
          <label className="text-xs text-slate-600">Cantidad<input type="number" min="0" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="mt-1 w-full px-2 py-1.5 border rounded-md" /></label>
          <button className="px-3 py-2 bg-emerald-600 text-white rounded-md text-xs font-semibold flex items-center justify-center gap-1"><Plus className="w-3.5 h-3.5" />Agregar</button>
        </form>
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-[80px_120px_1fr_130px_110px_40px] px-3 py-2 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase"><span>Núm.</span><span>Fecha</span><span>Conceptos</span><span>Estado</span><span>Total</span><span /></div>
          {estimates.length === 0 && <div className="p-6 text-center text-sm text-slate-400">Aún no hay estimaciones.</div>}
          {estimates.map((estimate) => <div key={estimate.id} className="grid grid-cols-[80px_120px_1fr_130px_110px_40px] items-center gap-2 px-3 py-2 border-t border-slate-100 text-xs"><span className="font-mono">{estimate.number}</span><span>{estimate.date}</span><span>{estimate.items.map((item) => project.concepts[item.conceptId]?.description || item.conceptId).join(', ')}</span><select value={estimate.status} onChange={(e) => onUpdateProject({ ...project, estimates: estimates.map((item) => item.id === estimate.id ? { ...item, status: e.target.value as Estimate['status'] } : item) })} className="px-1 py-1 border rounded"><option value="borrador">Borrador</option><option value="presentada">Presentada</option><option value="pagada">Pagada</option></select><span className="font-mono">{estimate.total.toLocaleString('es-MX', { style: 'currency', currency: project.currency })}</span><button title="Eliminar" onClick={() => onUpdateProject({ ...project, estimates: estimates.filter((item) => item.id !== estimate.id) })} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></div>)}
        </div>
      </div>
    </section>
  );
};
