import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, HelpCircle, ChevronRight, Pencil, Trash2, AlertTriangle, X, Save } from 'lucide-react';
import { db, Subject, Unit } from '../db/database';
import { useApp } from '../contexts/AppContext';

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export default function SubjectsPage() {
  const { activeSemesterId, refreshTrigger, triggerRefresh } = useApp();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [units, setUnits] = useState<Record<number, Unit[]>>({});
  const [questionCounts, setQuestionCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'unit'; id: number; name: string } | null>(null);

  useEffect(() => { loadData(); }, [activeSemesterId, refreshTrigger]);

  async function loadData() {
    setLoading(true);
    try {
      let subs: Subject[];
      if (activeSemesterId) {
        subs = await db.subjects.where('semesterId').equals(activeSemesterId).toArray();
      } else {
        subs = await db.subjects.toArray();
      }
      setSubjects(subs);

      const unitMap: Record<number, Unit[]> = {};
      const qMap: Record<number, number> = {};
      for (const sub of subs) {
        const uns = (await db.units.where('subjectId').equals(sub.id!).toArray()).sort((a, b) => a.number - b.number);
        unitMap[sub.id!] = uns;
        for (const un of uns) {
          qMap[un.id!] = await db.questions.where('unitId').equals(un.id!).count();
        }
      }
      setUnits(unitMap);
      setQuestionCounts(qMap);
    } finally {
      setLoading(false);
    }
  }

  const saveUnit = async (form: Partial<Unit>) => {
    const now = new Date();
    if (editUnit?.id) {
      await db.units.update(editUnit.id, { ...form, updatedAt: now });
    } else if (form.subjectId) {
      await db.units.add({ ...form, createdAt: now, updatedAt: now } as Unit);
    }
    await loadData();
    triggerRefresh();
    setEditUnit(null);
    setShowUnitForm(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full spinner" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen size={24} className="text-blue-500" /> All Subjects
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{subjects.length} subjects</p>
        </div>
        <button className="btn-secondary" onClick={() => navigate('/semesters')}>
          Manage Semesters →
        </button>
      </div>

      {subjects.length === 0 ? (
        <div className="card p-12 text-center">
          <BookOpen size={48} className="text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">No Subjects</h3>
          <p className="text-sm text-gray-400 mb-4">Go to Semesters to add subjects.</p>
          <button className="btn-primary" onClick={() => navigate('/semesters')}>
            <Plus size={16} /> Add Subjects
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {subjects.map(sub => {
            const subUnits = units[sub.id!] || [];
            const totalQ = subUnits.reduce((sum, u) => sum + (questionCounts[u.id!] || 0), 0);
            return (
              <div key={sub.id} className="card overflow-hidden">
                {/* Subject Header */}
                <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-800">
                  <div className="w-4 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: sub.color || '#3b82f6' }} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{sub.name}</h3>
                    <p className="text-xs text-gray-500">{sub.code} · {totalQ} questions · {subUnits.length} units</p>
                  </div>
                  <button
                    className="btn-primary text-xs py-1.5 px-3"
                    onClick={() => navigate(`/questions?subjectId=${sub.id}`)}
                  >
                    <HelpCircle size={13} /> Questions
                  </button>
                </div>

                {/* Units */}
                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                  {subUnits.map(unit => {
                    const qCount = questionCounts[unit.id!] || 0;
                    return (
                      <div key={unit.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: `${sub.color}20`, color: sub.color }}>
                          {unit.number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{unit.title}</p>
                          {unit.topics && <p className="text-xs text-gray-400 truncate">{unit.topics}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-400">{qCount} Q</span>
                          <button
                            onClick={() => navigate(`/questions?subjectId=${sub.id}&unitId=${unit.id}`)}
                            className="btn-ghost text-xs py-1 px-2"
                          >
                            <ChevronRight size={13} />
                          </button>
                          <button
                            onClick={() => { setEditUnit(unit); setShowUnitForm(true); }}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <Pencil size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {/* Add unit button */}
                  <button
                    onClick={() => {
                      setEditUnit({ subjectId: sub.id!, semesterId: sub.semesterId, number: subUnits.length + 1, title: `Unit ${subUnits.length + 1}`, topics: '', createdAt: new Date(), updatedAt: new Date() } as Unit);
                      setShowUnitForm(true);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-gray-400 hover:text-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors"
                  >
                    <Plus size={13} /> Add Unit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Unit Edit Modal */}
      {showUnitForm && editUnit && (
        <Modal title={editUnit.id ? 'Edit Unit' : 'Add Unit'} onClose={() => { setShowUnitForm(false); setEditUnit(null); }}>
          <form onSubmit={async (e) => {
            e.preventDefault();
            await saveUnit(editUnit);
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Unit Number</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={editUnit.number}
                  onChange={e => setEditUnit(u => u ? { ...u, number: Number(e.target.value) } : u)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Unit Title *</label>
                <input
                  className="input"
                  value={editUnit.title}
                  onChange={e => setEditUnit(u => u ? { ...u, title: e.target.value } : u)}
                  placeholder="e.g. Finite Automata"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Topics (optional)</label>
              <textarea
                className="input resize-none"
                rows={3}
                value={editUnit.topics || ''}
                onChange={e => setEditUnit(u => u ? { ...u, topics: e.target.value } : u)}
                placeholder="DFA, NFA, Regular Expressions, CFG..."
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary flex-1">
                <Save size={15} /> {editUnit.id ? 'Update' : 'Add'} Unit
              </button>
              <button type="button" className="btn-secondary" onClick={() => { setShowUnitForm(false); setEditUnit(null); }}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
