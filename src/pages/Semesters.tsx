import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronRight,
  GraduationCap, HelpCircle,
  X, Save, AlertTriangle
} from 'lucide-react';
import { db, Semester, Subject } from '../db/database';
import { useApp } from '../contexts/AppContext';

// ── Modal component ──────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── Semester Form ────────────────────────────────────────────────
function SemesterForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Partial<Semester>;
  onSave: (sem: Partial<Semester>) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Semester>>(
    initial || { name: '', number: 1, academicYear: '', description: '', isActive: false }
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) return;
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Semester Name *</label>
        <input
          className="input"
          value={form.name || ''}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Semester 5"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Number</label>
          <input
            className="input"
            type="number"
            min={1}
            max={8}
            value={form.number || ''}
            onChange={e => setForm(f => ({ ...f, number: Number(e.target.value) }))}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Academic Year</label>
          <input
            className="input"
            value={form.academicYear || ''}
            onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))}
            placeholder="2024-25"
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Description</label>
        <textarea
          className="input resize-none"
          rows={2}
          value={form.description || ''}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Optional description"
        />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isActive || false}
          onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
          className="rounded"
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">Set as active semester</span>
      </label>
      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1" disabled={saving}>
          {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spinner" /> : <Save size={15} />}
          {initial?.id ? 'Update' : 'Create'} Semester
        </button>
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}

// ── Subject Form ─────────────────────────────────────────────────
const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

function SubjectForm({
  semesterId,
  initial,
  onSave,
  onClose,
}: {
  semesterId: number;
  initial?: Partial<Subject>;
  onSave: (sub: Partial<Subject>) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Subject>>(
    initial || { name: '', code: '', syllabus: '', color: COLORS[0], semesterId }
  );
  const [saving, setSaving] = useState(false);
  const [unitCount, setUnitCount] = useState(5);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) return;
    setSaving(true);
    try {
      await onSave({ ...form, semesterId, unitCount } as any);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Subject Name *</label>
        <input
          className="input"
          value={form.name || ''}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Theory of Computation"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Subject Code</label>
          <input
            className="input"
            value={form.code || ''}
            onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
            placeholder="e.g. CS-501"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Units</label>
          <input
            className="input"
            type="number"
            min={1}
            max={10}
            value={unitCount}
            onChange={e => setUnitCount(Number(e.target.value))}
            disabled={!!initial?.id}
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Color</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setForm(f => ({ ...f, color: c }))}
              className={`w-7 h-7 rounded-full transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Syllabus (optional)</label>
        <textarea
          className="input resize-none"
          rows={3}
          value={form.syllabus || ''}
          onChange={e => setForm(f => ({ ...f, syllabus: e.target.value }))}
          placeholder="Paste syllabus or course description here..."
        />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1" disabled={saving}>
          {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spinner" /> : <Save size={15} />}
          {initial?.id ? 'Update' : 'Add'} Subject
        </button>
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}

// ── Delete Confirm ───────────────────────────────────────────────
function DeleteConfirm({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6 fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Confirm Delete</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{message}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onConfirm} className="btn-danger flex-1">Delete</button>
          <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Semesters Page ──────────────────────────────────────────
export default function SemestersPage() {
  const { semesters, setSemesters, activeSemesterId, setActiveSemesterId, triggerRefresh } = useApp();
  const [expandedSem, setExpandedSem] = useState<number | null>(null);
  const [subjects, setSubjects] = useState<Record<number, Subject[]>>({});
  const [showSemForm, setShowSemForm] = useState(false);
  const [editSem, setEditSem] = useState<Semester | null>(null);
  const [showSubForm, setShowSubForm] = useState<number | null>(null);
  const [editSub, setEditSub] = useState<Subject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'semester' | 'subject'; id: number; name: string } | null>(null);
  const [questionCounts, setQuestionCounts] = useState<Record<number, number>>({});
  const navigate = useNavigate();

  // Load subjects for all semesters
  useEffect(() => {
    async function load() {
      const allSems = await db.semesters.orderBy('number').toArray();
      setSemesters(allSems);
      const subMap: Record<number, Subject[]> = {};
      const qMap: Record<number, number> = {};
      for (const sem of allSems) {
        const subs = await db.subjects.where('semesterId').equals(sem.id!).toArray();
        subMap[sem.id!] = subs;
        for (const sub of subs) {
          qMap[sub.id!] = await db.questions.where('subjectId').equals(sub.id!).count();
        }
      }
      setSubjects(subMap);
      setQuestionCounts(qMap);
    }
    load();
  }, []);

  const saveSemester = async (form: Partial<Semester>) => {
    const now = new Date();
    if (editSem?.id) {
      await db.semesters.update(editSem.id, { ...form, updatedAt: now });
    } else {
      await db.semesters.add({ ...form, createdAt: now, updatedAt: now } as Semester);
    }
    const allSems = await db.semesters.orderBy('number').toArray();
    setSemesters(allSems);
    triggerRefresh();
    setEditSem(null);
  };

  const saveSubject = async (form: Partial<Subject> & { unitCount?: number }) => {
    const now = new Date();
    const semId = form.semesterId!;
    const { unitCount, ...subData } = form;
    if (editSub?.id) {
      await db.subjects.update(editSub.id, { ...subData, updatedAt: now });
    } else {
      const subId = await db.subjects.add({ ...subData, semesterId: semId, createdAt: now, updatedAt: now } as Subject);
      // Create units
      const count = unitCount || 5;
      for (let u = 1; u <= count; u++) {
        await db.units.add({
          subjectId: subId as number,
          semesterId: semId,
          number: u,
          title: `Unit ${u}`,
          topics: '',
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    const subs = await db.subjects.where('semesterId').equals(semId).toArray();
    setSubjects(prev => ({ ...prev, [semId]: subs }));
    triggerRefresh();
    setEditSub(null);
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'semester') {
      const subs = await db.subjects.where('semesterId').equals(deleteTarget.id).toArray();
      for (const sub of subs) {
        await db.units.where('subjectId').equals(sub.id!).delete();
        await db.questions.where('subjectId').equals(sub.id!).delete();
        await db.notes.where('subjectId').equals(sub.id!).delete();
      }
      await db.notes.where('semesterId').equals(deleteTarget.id).delete();
      await db.subjects.where('semesterId').equals(deleteTarget.id).delete();
      await db.semesters.delete(deleteTarget.id);
      const allSems = await db.semesters.orderBy('number').toArray();
      setSemesters(allSems);
    } else {
      await db.units.where('subjectId').equals(deleteTarget.id).delete();
      await db.questions.where('subjectId').equals(deleteTarget.id).delete();
      await db.notes.where('subjectId').equals(deleteTarget.id).delete();
      await db.subjects.delete(deleteTarget.id);
    }
    triggerRefresh();
    setDeleteTarget(null);
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <GraduationCap size={24} className="text-blue-500" />
            My Semesters
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage semesters and subjects</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditSem(null); setShowSemForm(true); }}>
          <Plus size={16} /> Add Semester
        </button>
      </div>

      {semesters.length === 0 ? (
        <div className="card p-12 text-center">
          <GraduationCap size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">No semesters yet</h3>
          <p className="text-sm text-gray-400 mb-4">Create your first semester to start organizing your study material.</p>
          <button className="btn-primary" onClick={() => setShowSemForm(true)}>
            <Plus size={16} /> Create Semester
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {semesters.map(sem => {
            const subs = subjects[sem.id!] || [];
            const isExpanded = expandedSem === sem.id;
            const isActive = activeSemesterId === sem.id;
            return (
              <div key={sem.id} className="card overflow-hidden">
                {/* Semester Header */}
                <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  onClick={() => setExpandedSem(isExpanded ? null : sem.id!)}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    <GraduationCap size={18} className={isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{sem.name}</h3>
                      {isActive && <span className="badge bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">Active</span>}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {sem.academicYear && `${sem.academicYear} · `}{subs.length} subjects
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isActive && (
                      <button
                        className="btn-ghost text-xs py-1 px-2"
                        onClick={e => { e.stopPropagation(); setActiveSemesterId(sem.id!); }}
                      >
                        Set Active
                      </button>
                    )}
                    <button className="btn-ghost" onClick={e => { e.stopPropagation(); setEditSem(sem); setShowSemForm(true); }}>
                      <Pencil size={14} />
                    </button>
                    <button className="btn-ghost text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={e => { e.stopPropagation(); setDeleteTarget({ type: 'semester', id: sem.id!, name: sem.name }); }}>
                      <Trash2 size={14} />
                    </button>
                    {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                  </div>
                </div>

                {/* Subjects */}
                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <div className="p-4 space-y-2">
                      {subs.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">No subjects yet</p>
                      ) : (
                        subs.map(sub => (
                          <div key={sub.id} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                            <div className="w-3 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: sub.color || '#3b82f6' }} />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-gray-800 dark:text-gray-200">{sub.name}</p>
                              <p className="text-xs text-gray-500">{sub.code} · {questionCounts[sub.id!] || 0} questions</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button className="btn-ghost text-xs" onClick={() => navigate(`/questions?subjectId=${sub.id}`)}>
                                <HelpCircle size={13} /> Questions
                              </button>
                              <button className="btn-ghost" onClick={() => { setEditSub(sub); setShowSubForm(sem.id!); }}>
                                <Pencil size={13} />
                              </button>
                              <button className="btn-ghost text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={() => setDeleteTarget({ type: 'subject', id: sub.id!, name: sub.name })}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                      <button
                        className="w-full mt-2 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
                        onClick={() => { setEditSub(null); setShowSubForm(sem.id!); }}
                      >
                        <Plus size={16} /> Add Subject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showSemForm && (
        <Modal title={editSem ? 'Edit Semester' : 'Create Semester'} onClose={() => { setShowSemForm(false); setEditSem(null); }}>
          <SemesterForm initial={editSem || undefined} onSave={saveSemester} onClose={() => { setShowSemForm(false); setEditSem(null); }} />
        </Modal>
      )}

      {showSubForm !== null && (
        <Modal title={editSub ? 'Edit Subject' : 'Add Subject'} onClose={() => { setShowSubForm(null); setEditSub(null); }}>
          <SubjectForm semesterId={showSubForm} initial={editSub || undefined} onSave={saveSubject} onClose={() => { setShowSubForm(null); setEditSub(null); }} />
        </Modal>
      )}

      {deleteTarget && (
        <DeleteConfirm
          message={`Delete "${deleteTarget.name}"? This will also delete all related data.`}
          onConfirm={doDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
