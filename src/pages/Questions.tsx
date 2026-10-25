import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Plus, Search, Pencil, Trash2, Star, CheckCircle,
  X, Save, AlertTriangle, Eye, EyeOff, Bot,
  HelpCircle, SlidersHorizontal
} from 'lucide-react';
import { db, Question, Subject, Unit, Priority, PrepStatus, QuestionType } from '../db/database';
import { useApp } from '../contexts/AppContext';

// ── Constants ────────────────────────────────────────────────────
const MARKS_OPTIONS = [2, 3, 5, 7, 10];
const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'high', label: 'High', color: 'text-red-600' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
  { value: 'low', label: 'Low', color: 'text-green-600' },
];
const STATUS_OPTIONS: { value: PrepStatus; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'learning', label: 'Learning' },
  { value: 'answer_saved', label: 'Answer Saved' },
  { value: 'revised', label: 'Revised' },
];
const TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: 'definition', label: 'Definition' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'long_answer', label: 'Long Answer' },
  { value: 'comparison', label: 'Comparison' },
  { value: 'diagram', label: 'Diagram-Based' },
  { value: 'numerical', label: 'Numerical' },
  { value: 'other', label: 'Other' },
];

function getPriorityBadge(priority: Priority) {
  if (priority === 'high') return 'badge-high';
  if (priority === 'medium') return 'badge-medium';
  return 'badge-low';
}

function getStatusColor(status: PrepStatus) {
  switch (status) {
    case 'revised': return 'bg-teal-100 text-teal-700';
    case 'answer_saved': return 'bg-green-100 text-green-700';
    case 'learning': return 'bg-blue-100 text-blue-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

// ── Modal ────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div
        className={`bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full mt-8 mb-8 fade-in ${wide ? 'max-w-2xl' : 'max-w-lg'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 rounded-t-2xl z-10">
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18} /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── Question Form ────────────────────────────────────────────────
function QuestionForm({
  initial,
  subjects,
  units,
  onSave,
  onClose,
  defaultSubjectId,
  defaultUnitId,
  semesterId,
}: {
  initial?: Partial<Question>;
  subjects: Subject[];
  units: Unit[];
  onSave: (q: Partial<Question>) => Promise<void>;
  onClose: () => void;
  defaultSubjectId?: number;
  defaultUnitId?: number;
  semesterId: number;
}) {
  const [form, setForm] = useState<Partial<Question>>(
    initial || {
      text: '', topic: '', marks: 7, priority: 'high',
      questionType: 'long_answer', prepStatus: 'not_started',
      isFavorite: false, isRevised: false, remarks: '',
      semesterId,
      subjectId: defaultSubjectId,
      unitId: defaultUnitId,
    }
  );
  const [saving, setSaving] = useState(false);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);

  useEffect(() => {
    if (form.subjectId) {
      setFilteredUnits(units.filter(u => u.subjectId === form.subjectId));
    }
  }, [form.subjectId, units]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.text?.trim() || !form.subjectId || !form.unitId) return;
    setSaving(true);
    try {
      await onSave({ ...form, semesterId });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Question *</label>
        <textarea
          className="input resize-none"
          rows={3}
          value={form.text || ''}
          onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
          placeholder="Enter your question here..."
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Subject *</label>
          <select
            className="input"
            value={form.subjectId || ''}
            onChange={e => setForm(f => ({ ...f, subjectId: Number(e.target.value), unitId: undefined }))}
            required
          >
            <option value="">Select Subject</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Unit *</label>
          <select
            className="input"
            value={form.unitId || ''}
            onChange={e => setForm(f => ({ ...f, unitId: Number(e.target.value) }))}
            required
          >
            <option value="">Select Unit</option>
            {filteredUnits.map(u => <option key={u.id} value={u.id}>{u.title}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Marks</label>
          <select className="input" value={form.marks || 7} onChange={e => setForm(f => ({ ...f, marks: Number(e.target.value) }))}>
            {MARKS_OPTIONS.map(m => <option key={m} value={m}>{m} Marks</option>)}
            <option value="0">Custom</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Priority</label>
          <select className="input" value={form.priority || 'high'} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}>
            {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Status</label>
          <select className="input" value={form.prepStatus || 'not_started'} onChange={e => setForm(f => ({ ...f, prepStatus: e.target.value as PrepStatus }))}>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Question Type</label>
          <select className="input" value={form.questionType || 'long_answer'} onChange={e => setForm(f => ({ ...f, questionType: e.target.value as QuestionType }))}>
            {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Topic</label>
          <input
            className="input"
            value={form.topic || ''}
            onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
            placeholder="e.g. Finite Automata"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Personal Remarks</label>
        <input
          className="input"
          value={form.remarks || ''}
          onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
          placeholder="Optional notes..."
        />
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isFavorite || false} onChange={e => setForm(f => ({ ...f, isFavorite: e.target.checked }))} />
          <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1"><Star size={12} className="text-yellow-500" /> Favorite</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isRevised || false} onChange={e => setForm(f => ({ ...f, isRevised: e.target.checked }))} />
          <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1"><CheckCircle size={12} className="text-green-500" /> Revised</span>
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1" disabled={saving}>
          {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spinner" /> : <Save size={15} />}
          {initial?.id ? 'Update' : 'Add'} Question
        </button>
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}

// ── Answer Viewer/Editor ──────────────────────────────────────────
function AnswerModal({ question, onClose, onSave, onGenerateAI }: {
  question: Question;
  onClose: () => void;
  onSave: (q: Question) => Promise<void>;
  onGenerateAI: (q: Question) => void;
}) {
  const [finalAnswer, setFinalAnswer] = useState(question.finalAnswer || question.aiDraftAnswer || '');
  const [saving, setSaving] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        ...question,
        finalAnswer,
        prepStatus: 'answer_saved',
        updatedAt: new Date(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => {
      if (isDirty && !confirm('You have unsaved changes. Leave anyway?')) return;
      onClose();
    }}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{question.text}</h3>
            <div className="flex gap-2 mt-1">
              <span className={`badge ${getPriorityBadge(question.priority)}`}>{question.priority}</span>
              <span className="badge bg-blue-100 text-blue-700">{question.marks} Marks</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            {isDirty && <span className="text-xs text-orange-500 font-medium">Unsaved changes</span>}
            <button onClick={() => setShowDiff(!showDiff)} className="btn-ghost text-xs" title="Compare versions">
              {showDiff ? <EyeOff size={14} /> : <Eye size={14} />}
              {showDiff ? 'Hide' : 'Compare'}
            </button>
            <button onClick={() => onGenerateAI(question)} className="btn-secondary text-xs py-1.5 px-3">
              <Bot size={14} /> AI Generate
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-xs py-1.5 px-3">
              {saving ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full spinner" /> : <Save size={14} />}
              Save Answer
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {showDiff && question.aiDraftAnswer ? (
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-700 h-full">
              <div className="p-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">AI Draft</h4>
                <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {question.aiDraftAnswer}
                </div>
              </div>
              <div className="p-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Your Final Answer</h4>
                <textarea
                  className="w-full h-full min-h-64 text-sm text-gray-800 dark:text-gray-200 bg-transparent resize-none focus:outline-none leading-relaxed"
                  value={finalAnswer}
                  onChange={e => { setFinalAnswer(e.target.value); setIsDirty(true); }}
                  placeholder="Edit the answer here..."
                />
              </div>
            </div>
          ) : (
            <div className="p-4 h-full">
              <textarea
                className="w-full h-full min-h-80 text-sm text-gray-800 dark:text-gray-200 bg-transparent resize-none focus:outline-none leading-relaxed font-mono"
                value={finalAnswer}
                onChange={e => { setFinalAnswer(e.target.value); setIsDirty(true); }}
                placeholder="Write or paste your answer here, or use AI to generate one..."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Questions Page ──────────────────────────────────────────
export default function QuestionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeSemesterId, refreshTrigger, triggerRefresh } = useApp();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState(searchParams.get('subjectId') || '');
  const [filterUnit, setFilterUnit] = useState('');
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterFavorite, setFilterFavorite] = useState(false);
  const [sortBy, setSortBy] = useState<'updatedAt' | 'priority' | 'unit'>('updatedAt');
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [showForm, setShowForm] = useState(searchParams.has('new'));
  const [editQuestion, setEditQuestion] = useState<Question | null>(null);
  const [viewQuestion, setViewQuestion] = useState<Question | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);

  useEffect(() => {
    loadData();
  }, [activeSemesterId, refreshTrigger]);

  // Auto-open question from URL param
  useEffect(() => {
    const id = searchParams.get('id');
    if (id && questions.length > 0) {
      const q = questions.find(q => q.id === Number(id));
      if (q) setViewQuestion(q);
    }
  }, [searchParams, questions]);

  async function loadData() {
    setLoading(true);
    try {
      let qs: Question[];
      if (activeSemesterId) {
        qs = await db.questions.where('semesterId').equals(activeSemesterId).toArray();
        const subs = await db.subjects.where('semesterId').equals(activeSemesterId).toArray();
        const uns = await db.units.where('semesterId').equals(activeSemesterId).toArray();
        setSubjects(subs);
        setUnits(uns);
      } else {
        qs = await db.questions.toArray();
        const subs = await db.subjects.toArray();
        const uns = await db.units.toArray();
        setSubjects(subs);
        setUnits(uns);
      }
      setQuestions(qs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Filter + sort
  const filtered = questions.filter(q => {
    if (search && !q.text.toLowerCase().includes(search.toLowerCase()) && !q.topic?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterSubject && q.subjectId !== Number(filterSubject)) return false;
    if (filterUnit && q.unitId !== Number(filterUnit)) return false;
    if (filterStatus && q.prepStatus !== filterStatus) return false;
    if (filterPriority && q.priority !== filterPriority) return false;
    if (filterFavorite && !q.isFavorite) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'priority') {
      const p = { high: 0, medium: 1, low: 2 };
      return p[a.priority] - p[b.priority];
    }
    if (sortBy === 'unit') return (a.unitId || 0) - (b.unitId || 0);
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const saveQuestion = async (form: Partial<Question>) => {
    const now = new Date();
    if (editQuestion?.id) {
      await db.questions.update(editQuestion.id, { ...form, updatedAt: now });
    } else {
      await db.questions.add({ ...form, createdAt: now, updatedAt: now } as Question);
    }
    await loadData();
    triggerRefresh();
    setEditQuestion(null);
    setShowForm(false);
  };

  const saveAnswer = async (q: Question) => {
    await db.questions.update(q.id!, { finalAnswer: q.finalAnswer, prepStatus: q.prepStatus, updatedAt: new Date() });
    await loadData();
    triggerRefresh();
    setViewQuestion(q);
  };

  const doDelete = async () => {
    if (!deleteTarget?.id) return;
    await db.questions.delete(deleteTarget.id);
    await loadData();
    triggerRefresh();
    setDeleteTarget(null);
  };

  const toggleFavorite = async (q: Question) => {
    await db.questions.update(q.id!, { isFavorite: !q.isFavorite, updatedAt: new Date() });
    await loadData();
  };

  const getSubjectName = (id: number) => subjects.find(s => s.id === id)?.name || '?';
  const getUnitTitle = (id: number) => units.find(u => u.id === id)?.title || '?';

  const filteredUnitsForFilter = filterSubject
    ? units.filter(u => u.subjectId === Number(filterSubject))
    : units;

  return (
    <div className="p-4 md:p-6 space-y-4 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <HelpCircle size={24} className="text-blue-500" />
            Important Questions
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {filtered.length} question{filtered.length !== 1 ? 's' : ''}
            {questions.length !== filtered.length && ` (filtered from ${questions.length})`}
          </p>
        </div>
        <button className="btn-primary" onClick={() => { setEditQuestion(null); setShowForm(true); }}>
          <Plus size={16} /> Add Question
        </button>
      </div>

      {/* Search + Filters */}
      <div className="card p-3 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Search questions or topics..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className={`btn-secondary flex items-center gap-2 ${showFilters ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300' : ''}`}
            onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal size={15} />
            Filters
          </button>
          <select className="input w-auto" value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
            <option value="updatedAt">Recent</option>
            <option value="priority">Priority</option>
            <option value="unit">Unit</option>
          </select>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Subject</label>
              <select className="input text-xs" value={filterSubject} onChange={e => { setFilterSubject(e.target.value); setFilterUnit(''); }}>
                <option value="">All Subjects</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Unit</label>
              <select className="input text-xs" value={filterUnit} onChange={e => setFilterUnit(e.target.value)}>
                <option value="">All Units</option>
                {filteredUnitsForFilter.map(u => <option key={u.id} value={u.id}>{u.title}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Status</label>
              <select className="input text-xs" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Priority</label>
              <select className="input text-xs" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                <option value="">All Priorities</option>
                {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer col-span-2 md:col-span-4">
              <input type="checkbox" checked={filterFavorite} onChange={e => setFilterFavorite(e.target.checked)} />
              <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <Star size={12} className="text-yellow-500" /> Favorites only
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Question List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <HelpCircle size={48} className="text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
            {questions.length === 0 ? 'No Questions Yet' : 'No Matching Questions'}
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            {questions.length === 0
              ? 'Add important questions from your syllabus to get started.'
              : 'Try adjusting your search or filters.'}
          </p>
          {questions.length === 0 && (
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={16} /> Add First Question
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(q => (
            <div
              key={q.id}
              className="card p-4 flex items-start gap-3 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setViewQuestion(q)}
            >
              <div className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                q.finalAnswer ? 'bg-green-500' : q.aiDraftAnswer ? 'bg-yellow-500' : 'bg-gray-300'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-snug">{q.text}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className="text-xs text-gray-400">{getSubjectName(q.subjectId)} · {getUnitTitle(q.unitId)}</span>
                  <span className={`badge ${getPriorityBadge(q.priority)}`}>{q.priority}</span>
                  <span className="badge bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{q.marks}M</span>
                  <span className={`badge ${getStatusColor(q.prepStatus)}`}>
                    {STATUS_OPTIONS.find(s => s.value === q.prepStatus)?.label}
                  </span>
                  {q.topic && <span className="text-xs text-gray-400">{q.topic}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => toggleFavorite(q)}
                  className={`p-1.5 rounded-lg transition-colors ${q.isFavorite ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`}
                >
                  <Star size={14} fill={q.isFavorite ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={() => navigate(`/ai-assistant?questionId=${q.id}`)}
                  className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg transition-colors"
                  title="Open in AI Assistant"
                >
                  <Bot size={14} />
                </button>
                <button
                  onClick={() => { setEditQuestion(q); setShowForm(true); }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setDeleteTarget(q)}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <Modal title={editQuestion ? 'Edit Question' : 'Add Question'} onClose={() => { setShowForm(false); setEditQuestion(null); }} wide>
          <QuestionForm
            initial={editQuestion || undefined}
            subjects={subjects}
            units={units}
            onSave={saveQuestion}
            onClose={() => { setShowForm(false); setEditQuestion(null); }}
            semesterId={activeSemesterId!}
            defaultSubjectId={filterSubject ? Number(filterSubject) : undefined}
            defaultUnitId={filterUnit ? Number(filterUnit) : undefined}
          />
        </Modal>
      )}

      {viewQuestion && (
        <AnswerModal
          question={viewQuestion}
          onClose={() => { setViewQuestion(null); setSearchParams({}); }}
          onSave={saveAnswer}
          onGenerateAI={q => navigate(`/ai-assistant?questionId=${q.id}`)}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6 fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Delete Question?</h3>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{deleteTarget.text}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={doDelete} className="btn-danger flex-1">Delete</button>
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
