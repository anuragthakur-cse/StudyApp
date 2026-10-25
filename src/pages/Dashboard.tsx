import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen, HelpCircle, FileText, CheckCircle, Clock,
  Star, TrendingUp, Plus, ArrowRight, BookMarked, Bot,
  BarChart2, Zap
} from 'lucide-react';
import { db, Question, Subject, Semester } from '../db/database';
import { useApp } from '../contexts/AppContext';
import { format } from 'date-fns';

interface Stats {
  totalSubjects: number;
  totalQuestions: number;
  answeredQuestions: number;
  pendingQuestions: number;
  favoriteQuestions: number;
  revisedQuestions: number;
  recentQuestions: Question[];
  subjectProgress: Array<{ subject: Subject; total: number; answered: number }>;
  notes: number;
}

function StatCard({ icon: Icon, label, value, color, onClick }: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`card p-5 flex items-center gap-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { activeSemesterId, semesters, refreshTrigger } = useApp();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalSubjects: 0,
    totalQuestions: 0,
    answeredQuestions: 0,
    pendingQuestions: 0,
    favoriteQuestions: 0,
    revisedQuestions: 0,
    recentQuestions: [],
    subjectProgress: [],
    notes: 0,
  });
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        const sem = semesters.find(s => s.id === activeSemesterId);
        setActiveSemester(sem || null);

        if (!activeSemesterId) {
          setLoading(false);
          return;
        }

        const subjects = await db.subjects.where('semesterId').equals(activeSemesterId).toArray();
        const questions = await db.questions.where('semesterId').equals(activeSemesterId).toArray();
        const notes = await db.notes.where('semesterId').equals(activeSemesterId).count();

        const answered = questions.filter(q => q.finalAnswer && q.finalAnswer.length > 10);
        const favorites = questions.filter(q => q.isFavorite);
        const revised = questions.filter(q => q.isRevised);

        const recent = [...questions]
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 5);

        const subjectProgress = await Promise.all(
          subjects.map(async (sub) => {
            const sq = questions.filter(q => q.subjectId === sub.id);
            const sa = sq.filter(q => q.finalAnswer && q.finalAnswer.length > 10);
            return { subject: sub, total: sq.length, answered: sa.length };
          })
        );

        setStats({
          totalSubjects: subjects.length,
          totalQuestions: questions.length,
          answeredQuestions: answered.length,
          pendingQuestions: questions.length - answered.length,
          favoriteQuestions: favorites.length,
          revisedQuestions: revised.length,
          recentQuestions: recent,
          subjectProgress,
          notes,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [activeSemesterId, semesters, refreshTrigger]);

  const overallProgress = stats.totalQuestions > 0
    ? Math.round((stats.answeredQuestions / stats.totalQuestions) * 100)
    : 0;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full spinner" />
          <p className="text-gray-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {activeSemester ? `${activeSemester.name} Dashboard` : 'Dashboard'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            {activeSemester?.academicYear ? `Academic Year: ${activeSemester.academicYear}` : 'RGPV CSE — StudyVault AI'}
          </p>
        </div>
        <button
          onClick={() => navigate('/questions?new=1')}
          className="btn-primary"
        >
          <Plus size={16} />
          Add Question
        </button>
      </div>

      {/* Overall Progress */}
      {stats.totalQuestions > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-500" />
              <span className="font-semibold text-gray-800 dark:text-gray-200">Overall Preparation</span>
            </div>
            <span className="text-2xl font-bold text-blue-600">{overallProgress}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${overallProgress}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {stats.answeredQuestions} of {stats.totalQuestions} questions answered
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BookOpen}
          label="Subjects"
          value={stats.totalSubjects}
          color="bg-indigo-500"
          onClick={() => navigate('/subjects')}
        />
        <StatCard
          icon={HelpCircle}
          label="Questions"
          value={stats.totalQuestions}
          color="bg-blue-500"
          onClick={() => navigate('/questions')}
        />
        <StatCard
          icon={CheckCircle}
          label="Answered"
          value={stats.answeredQuestions}
          color="bg-green-500"
          onClick={() => navigate('/questions?status=answer_saved')}
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={stats.pendingQuestions}
          color="bg-orange-500"
          onClick={() => navigate('/questions?status=not_started')}
        />
        <StatCard
          icon={Star}
          label="Favorites"
          value={stats.favoriteQuestions}
          color="bg-yellow-500"
          onClick={() => navigate('/revision')}
        />
        <StatCard
          icon={CheckCircle}
          label="Revised"
          value={stats.revisedQuestions}
          color="bg-teal-500"
          onClick={() => navigate('/revision')}
        />
        <StatCard
          icon={FileText}
          label="Notes"
          value={stats.notes}
          color="bg-purple-500"
          onClick={() => navigate('/notes')}
        />
        <StatCard
          icon={BarChart2}
          label="Progress"
          value={`${overallProgress}%`}
          color="bg-pink-500"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Subject Progress */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <BarChart2 size={16} className="text-blue-500" />
              Subject Progress
            </h3>
            <Link to="/subjects" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
              View All <ArrowRight size={12} />
            </Link>
          </div>
          {stats.subjectProgress.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No subjects yet</p>
              <Link to="/subjects" className="text-blue-500 text-xs hover:underline mt-1 inline-block">
                Add subjects →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.subjectProgress.map(({ subject, total, answered }) => {
                const pct = total > 0 ? Math.round((answered / total) * 100) : 0;
                return (
                  <div key={subject.id} className="cursor-pointer" onClick={() => navigate(`/questions?subjectId=${subject.id}`)}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate pr-2">
                        {subject.code ? `${subject.code} · ` : ''}{subject.name}
                      </span>
                      <span className="text-xs text-gray-500 flex-shrink-0">{answered}/{total}</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: subject.color || '#3b82f6'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Clock size={16} className="text-blue-500" />
              Recent Questions
            </h3>
            <Link to="/questions" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
              View All <ArrowRight size={12} />
            </Link>
          </div>
          {stats.recentQuestions.length === 0 ? (
            <div className="text-center py-8">
              <HelpCircle size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No questions yet</p>
              <button
                onClick={() => navigate('/questions?new=1')}
                className="text-blue-500 text-xs hover:underline mt-1"
              >
                Add your first question →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.recentQuestions.map(q => (
                <div
                  key={q.id}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  onClick={() => navigate(`/questions?id=${q.id}`)}
                >
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    q.finalAnswer ? 'bg-green-500' : q.aiDraftAnswer ? 'bg-yellow-500' : 'bg-gray-300'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{q.text}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {format(new Date(q.updatedAt), 'dd MMM · HH:mm')} ·{' '}
                      <span className={`${
                        q.priority === 'high' ? 'text-red-500' :
                        q.priority === 'medium' ? 'text-yellow-500' : 'text-green-500'
                      }`}>{q.priority}</span>
                    </p>
                  </div>
                  {q.isFavorite && <Star size={12} className="text-yellow-400 flex-shrink-0 mt-1" fill="currentColor" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
          <Zap size={16} className="text-blue-500" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Add Question', icon: Plus, path: '/questions?new=1', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300' },
            { label: 'AI Assistant', icon: Bot, path: '/ai-assistant', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300' },
            { label: 'New Note', icon: FileText, path: '/notes?new=1', color: 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300' },
            { label: 'Revision', icon: Star, path: '/revision', color: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300' },
          ].map(action => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border border-transparent transition-colors text-sm font-medium ${action.color}`}
              >
                <Icon size={20} />
                {action.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty state if no semester */}
      {!activeSemesterId && (
        <div className="card p-10 text-center">
          <BookMarked size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
            No Semester Selected
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            Create your first semester to start organizing your study material.
          </p>
          <button onClick={() => navigate('/semesters')} className="btn-primary">
            <Plus size={16} />
            Create Semester
          </button>
        </div>
      )}
    </div>
  );
}
