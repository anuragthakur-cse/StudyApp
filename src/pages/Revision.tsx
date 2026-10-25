import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Star, CheckCircle, Eye, ChevronRight,
  Bot, RotateCcw, Shuffle
} from 'lucide-react';
import { db, Question, Subject } from '../db/database';
import { useApp } from '../contexts/AppContext';
import { format } from 'date-fns';

export default function RevisionPage() {
  const { activeSemesterId } = useApp();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'flashcard' | 'practice'>('list');
  const [filterMode, setFilterMode] = useState<'all' | 'favorites' | 'revised' | 'unanswered'>('all');
  const [flashIdx, setFlashIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [flashCards, setFlashCards] = useState<Question[]>([]);

  useEffect(() => { loadData(); }, [activeSemesterId]);

  async function loadData() {
    setLoading(true);
    try {
      let qs: Question[];
      if (activeSemesterId) {
        qs = await db.questions.where('semesterId').equals(activeSemesterId).toArray();
        const subs = await db.subjects.where('semesterId').equals(activeSemesterId).toArray();
        setSubjects(subs);
      } else {
        qs = await db.questions.toArray();
      }
      setQuestions(qs);
      setFlashCards([...qs].sort(() => Math.random() - 0.5));
    } finally {
      setLoading(false);
    }
  }

  const filtered = questions.filter(q => {
    if (filterMode === 'favorites') return q.isFavorite;
    if (filterMode === 'revised') return q.isRevised;
    if (filterMode === 'unanswered') return !q.finalAnswer;
    return q.isFavorite || q.isRevised;
  });

  const currentCards = flashCards.filter(q => {
    if (filterMode === 'favorites') return q.isFavorite;
    if (filterMode === 'revised') return q.isRevised;
    if (filterMode === 'unanswered') return !q.finalAnswer;
    return true;
  });

  const toggleRevised = async (q: Question) => {
    await db.questions.update(q.id!, {
      isRevised: !q.isRevised,
      lastRevisedAt: !q.isRevised ? new Date() : undefined,
      prepStatus: !q.isRevised ? 'revised' : q.prepStatus,
      updatedAt: new Date(),
    });
    await loadData();
  };

  const toggleFavorite = async (q: Question) => {
    await db.questions.update(q.id!, { isFavorite: !q.isFavorite, updatedAt: new Date() });
    await loadData();
  };

  const getSubjectName = (id: number) => subjects.find(s => s.id === id)?.name || '?';
  const currentCard = currentCards[flashIdx];

  const shuffle = () => {
    setFlashCards(prev => [...prev].sort(() => Math.random() - 0.5));
    setFlashIdx(0);
    setShowAnswer(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full spinner" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Star size={24} className="text-yellow-500" />
            Revision & Favorites
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {questions.filter(q => q.isFavorite).length} favorites · {questions.filter(q => q.isRevised).length} revised
          </p>
        </div>
        <div className="flex items-center gap-2">
          {['list', 'flashcard', 'practice'].map(m => (
            <button
              key={m}
              onClick={() => { setView(m as any); setFlashIdx(0); setShowAnswer(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${
                view === m ? 'bg-blue-600 text-white' : 'btn-secondary'
              }`}
            >
              {m === 'list' ? 'List' : m === 'flashcard' ? '🃏 Flashcards' : '🙈 Practice'}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: '⭐ All (Fav + Revised)' },
          { key: 'favorites', label: `★ Favorites (${questions.filter(q => q.isFavorite).length})` },
          { key: 'revised', label: `✓ Revised (${questions.filter(q => q.isRevised).length})` },
          { key: 'unanswered', label: `○ Without Answer (${questions.filter(q => !q.finalAnswer).length})` },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilterMode(f.key as any)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filterMode === f.key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Flashcard / Practice View */}
      {(view === 'flashcard' || view === 'practice') && (
        <div className="max-w-2xl mx-auto">
          {currentCards.length === 0 ? (
            <div className="card p-12 text-center">
              <Star size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No questions in this filter. Add favorites or mark questions as revised.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{flashIdx + 1} / {currentCards.length}</span>
                <div className="flex gap-2">
                  <button onClick={shuffle} className="btn-ghost text-xs"><Shuffle size={13} /> Shuffle</button>
                  <button onClick={() => setShowAnswer(false)} className="btn-ghost text-xs"><RotateCcw size={13} /> Reset</button>
                </div>
              </div>

              {/* Progress */}
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${((flashIdx + 1) / currentCards.length) * 100}%` }} />
              </div>

              {/* Card */}
              <div className="card p-8 text-center min-h-64 flex flex-col items-center justify-center gap-6">
                <div className="w-full">
                  <div className="flex justify-center gap-2 mb-4">
                    <span className="badge bg-blue-100 text-blue-700">{getSubjectName(currentCard.subjectId)}</span>
                    <span className="badge bg-gray-100 text-gray-600">{currentCard.marks}M</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 leading-relaxed">
                    {currentCard.text}
                  </h3>
                </div>

                {view === 'practice' && !showAnswer && (
                  <button onClick={() => setShowAnswer(true)} className="btn-primary px-8">
                    <Eye size={16} /> Reveal Answer
                  </button>
                )}

                {(view === 'flashcard' || showAnswer) && (currentCard.finalAnswer || currentCard.aiDraftAnswer) && (
                  <div className="w-full mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-left">
                    <p className="text-xs font-medium text-gray-400 mb-2">ANSWER:</p>
                    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                      {currentCard.finalAnswer || currentCard.aiDraftAnswer}
                    </div>
                  </div>
                )}

                {view === 'practice' && !currentCard.finalAnswer && !currentCard.aiDraftAnswer && (
                  <div className="text-sm text-gray-400 mt-2">
                    No saved answer. <button onClick={() => navigate(`/ai-assistant?questionId=${currentCard.id}`)} className="text-blue-500 underline">Generate with AI →</button>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex gap-3 justify-center">
                <button
                  disabled={flashIdx === 0}
                  onClick={() => { setFlashIdx(i => i - 1); setShowAnswer(false); }}
                  className="btn-secondary disabled:opacity-40"
                >
                  ← Previous
                </button>
                <button
                  disabled={flashIdx >= currentCards.length - 1}
                  onClick={() => { setFlashIdx(i => i + 1); setShowAnswer(false); }}
                  className="btn-primary disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <>
          {filtered.length === 0 ? (
            <div className="card p-12 text-center">
              <Star size={40} className="text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                {filterMode === 'unanswered' ? 'All Questions Have Answers!' : 'No Questions Here'}
              </h3>
              <p className="text-sm text-gray-400">
                {filterMode === 'unanswered'
                  ? 'Great job! You have saved answers for all questions.'
                  : 'Star questions as favorites or mark them as revised to see them here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(q => (
                <div key={q.id} className="card p-4 flex items-start gap-3">
                  <div className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${q.finalAnswer ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{q.text}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <span className="text-xs text-gray-400">{getSubjectName(q.subjectId)}</span>
                      <span className={`badge text-xs ${q.priority === 'high' ? 'badge-high' : q.priority === 'medium' ? 'badge-medium' : 'badge-low'}`}>{q.priority}</span>
                      <span className="badge bg-blue-100 text-blue-600 text-xs">{q.marks}M</span>
                      {q.lastRevisedAt && (
                        <span className="text-xs text-gray-400">Revised: {format(new Date(q.lastRevisedAt), 'dd MMM')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => navigate(`/ai-assistant?questionId=${q.id}`)}
                      className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg"
                      title="AI Assistant"
                    >
                      <Bot size={14} />
                    </button>
                    <button
                      onClick={() => toggleFavorite(q)}
                      className={`p-1.5 rounded-lg ${q.isFavorite ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`}
                    >
                      <Star size={14} fill={q.isFavorite ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={() => toggleRevised(q)}
                      className={`p-1.5 rounded-lg ${q.isRevised ? 'text-green-500' : 'text-gray-300 hover:text-green-400'}`}
                    >
                      <CheckCircle size={14} fill={q.isRevised ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={() => navigate(`/questions?id=${q.id}`)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
