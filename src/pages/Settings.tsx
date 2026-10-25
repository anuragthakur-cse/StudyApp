import { useState, useEffect } from 'react';
import { Settings, Sun, Moon, Database, Download, Upload, Trash2, AlertTriangle } from 'lucide-react';
import { db, seedSampleData } from '../db/database';
import { useApp } from '../contexts/AppContext';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export default function SettingsPage() {
  const { theme, toggleTheme, activeSemesterId, triggerRefresh } = useApp();
  const [stats, setStats] = useState({ questions: 0, notes: 0, subjects: 0 });
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importStatus, setImportStatus] = useState('');

  useEffect(() => {
    async function loadStats() {
      const questions = await db.questions.count();
      const notes = await db.notes.count();
      const subjects = await db.subjects.count();
      setStats({ questions, notes, subjects });
    }
    loadStats();
  }, []);

  const exportBackup = async () => {
    const [semesters, subjects, units, questions, notes] = await Promise.all([
      db.semesters.toArray(),
      db.subjects.toArray(),
      db.units.toArray(),
      db.questions.toArray(),
      db.notes.toArray(),
    ]);
    const backup = { version: 1, exportedAt: new Date().toISOString(), semesters, subjects, units, questions, notes };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studyvault-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImportStatus('Reading file...');
      const text = await file.text();
      const data = JSON.parse(text);
      if (
        data.version !== 1
        || !Array.isArray(data.semesters)
        || !Array.isArray(data.subjects)
        || !Array.isArray(data.units)
        || !Array.isArray(data.questions)
        || !Array.isArray(data.notes)
      ) {
        throw new Error('Invalid backup file format');
      }

      if (!confirm(`Import backup from ${data.exportedAt}? This will ADD data to existing records (won't delete current data).`)) {
        setImportStatus('');
        return;
      }

      setImportStatus('Importing...');
      await db.transaction('rw', db.semesters, db.subjects, db.units, db.questions, db.notes, async () => {
        const semesterIds = new Map<number, number>();
        const subjectIds = new Map<number, number>();
        const unitIds = new Map<number, number>();
        const questionIds = new Map<number, number>();

        for (const sem of data.semesters) {
          const { id, ...rest } = sem;
          const newId = await db.semesters.add({
            ...rest,
            createdAt: new Date(rest.createdAt),
            updatedAt: new Date(rest.updatedAt),
          });
          if (typeof id === 'number') semesterIds.set(id, newId as number);
        }

        for (const subject of data.subjects) {
          const { id, semesterId, ...rest } = subject;
          const newSemesterId = semesterIds.get(semesterId);
          if (!newSemesterId) continue;
          const newId = await db.subjects.add({
            ...rest,
            semesterId: newSemesterId,
            createdAt: new Date(rest.createdAt),
            updatedAt: new Date(rest.updatedAt),
          });
          if (typeof id === 'number') subjectIds.set(id, newId as number);
        }

        for (const unit of data.units) {
          const { id, subjectId, semesterId, ...rest } = unit;
          const newSubjectId = subjectIds.get(subjectId);
          const newSemesterId = semesterIds.get(semesterId);
          if (!newSubjectId || !newSemesterId) continue;
          const newId = await db.units.add({
            ...rest,
            subjectId: newSubjectId,
            semesterId: newSemesterId,
            createdAt: new Date(rest.createdAt),
            updatedAt: new Date(rest.updatedAt),
          });
          if (typeof id === 'number') unitIds.set(id, newId as number);
        }

        for (const question of data.questions) {
          const { id, semesterId, subjectId, unitId, ...rest } = question;
          const newSemesterId = semesterIds.get(semesterId);
          const newSubjectId = subjectIds.get(subjectId);
          const newUnitId = unitIds.get(unitId);
          if (!newSemesterId || !newSubjectId || !newUnitId) continue;
          const newId = await db.questions.add({
            ...rest,
            semesterId: newSemesterId,
            subjectId: newSubjectId,
            unitId: newUnitId,
            createdAt: new Date(rest.createdAt),
            updatedAt: new Date(rest.updatedAt),
            ...(rest.lastRevisedAt ? { lastRevisedAt: new Date(rest.lastRevisedAt) } : {}),
          });
          if (typeof id === 'number') questionIds.set(id, newId as number);
        }

        for (const note of data.notes) {
          const { id: _noteId, semesterId, subjectId, unitId, questionId, ...rest } = note;
          const newSemesterId = semesterId ? semesterIds.get(semesterId) : undefined;
          const newSubjectId = subjectId ? subjectIds.get(subjectId) : undefined;
          const newUnitId = unitId ? unitIds.get(unitId) : undefined;
          const newQuestionId = questionId ? questionIds.get(questionId) : undefined;
          await db.notes.add({
            ...rest,
            ...(newSemesterId ? { semesterId: newSemesterId } : {}),
            ...(newSubjectId ? { subjectId: newSubjectId } : {}),
            ...(newUnitId ? { unitId: newUnitId } : {}),
            ...(newQuestionId ? { questionId: newQuestionId } : {}),
            createdAt: new Date(rest.createdAt),
            updatedAt: new Date(rest.updatedAt),
          });
        }
      });
      setImportStatus('✓ Import complete!');
      triggerRefresh();
      setTimeout(() => setImportStatus(''), 3000);
    } catch (err: any) {
      setImportStatus(`Error: ${err.message}`);
    }
    e.target.value = '';
  };

  const importCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImportStatus('Reading CSV...');
      const text = await file.text();
      const lines = text.split('\n').filter(Boolean);
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

      if (!headers.includes('question')) throw new Error('CSV must have a "question" column');

      let imported = 0;
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',');
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = (vals[idx] || '').trim().replace(/^"|"$/g, ''); });

        if (!row.question || !activeSemesterId) continue;

        // Try to find subject and unit by name
        let subjectId = 0;
        let unitId = 0;
        if (row.subject) {
          const sub = await db.subjects.where('semesterId').equals(activeSemesterId)
            .filter(s => s.name.toLowerCase().includes(row.subject.toLowerCase())).first();
          if (sub) {
            subjectId = sub.id!;
            const unit = await db.units.where('subjectId').equals(subjectId).first();
            if (unit) unitId = unit.id!;
          }
        }

        if (!subjectId || !unitId) continue;

        await db.questions.add({
          text: row.question,
          semesterId: activeSemesterId,
          subjectId,
          unitId,
          marks: Number(row.marks) || 7,
          priority: (row.priority as any) || 'medium',
          questionType: 'long_answer',
          prepStatus: 'not_started',
          isFavorite: false,
          isRevised: false,
          topic: row.topic || '',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        imported++;
      }
      setImportStatus(`✓ Imported ${imported} questions`);
      triggerRefresh();
      setTimeout(() => setImportStatus(''), 3000);
    } catch (err: any) {
      setImportStatus(`Error: ${err.message}`);
    }
    e.target.value = '';
  };

  const clearAllData = async () => {
    await db.questions.clear();
    await db.notes.clear();
    await db.units.clear();
    await db.subjects.clear();
    await db.semesters.clear();
    await db.settings.clear();
    await seedSampleData();
    triggerRefresh();
    setShowClearConfirm(false);
    setStats({ questions: 0, notes: 0, subjects: 0 });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Settings size={24} className="text-blue-500" /> Settings
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Configure your StudyVault AI preferences</p>
      </div>

      {/* Theme */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
          {theme === 'light' ? <Sun size={16} /> : <Moon size={16} />} Appearance
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300">Theme</p>
            <p className="text-xs text-gray-400">Switch between light and dark mode</p>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative w-12 h-6 rounded-full transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${theme === 'dark' ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Data Stats */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
          <Database size={16} /> Database Stats
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Subjects', value: stats.subjects },
            { label: 'Questions', value: stats.questions },
            { label: 'Notes', value: stats.notes },
          ].map(s => (
            <div key={s.label} className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Data is stored locally in your browser using IndexedDB. Clear browser data to reset.
        </p>
      </div>

      {/* Backup & Restore */}
      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 flex items-center gap-2">
          <Download size={16} /> Backup & Restore
        </h3>
        {importStatus && (
          <div className={`p-3 rounded-lg text-sm ${importStatus.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {importStatus}
          </div>
        )}
        <div className="space-y-2">
          <button onClick={exportBackup} className="btn-secondary w-full justify-center">
            <Download size={15} /> Export Full Backup (JSON)
          </button>
          <label className="btn-secondary w-full justify-center cursor-pointer">
            <Upload size={15} /> Import Backup (JSON)
            <input type="file" accept=".json" className="hidden" onChange={importBackup} />
          </label>
          <label className="btn-secondary w-full justify-center cursor-pointer">
            <Upload size={15} /> Import Questions (CSV)
            <input type="file" accept=".csv" className="hidden" onChange={importCSV} />
          </label>
          <p className="text-xs text-gray-400 mt-2">
            CSV format: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">question,subject,marks,priority,topic</code>
          </p>
        </div>
      </div>

      {/* AI Settings */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">🤖 AI Configuration</h3>
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-3">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            <strong>Note:</strong> API keys must be configured in the backend server's <code>.env</code> file. 
            Do not enter API keys here. See the README for backend setup instructions.
          </p>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          The AI assistant connects to <code>{API_BASE_URL ? `${API_BASE_URL}/api/ai/answer` : '/api/ai/answer'}</code>.
          Configure <code>VITE_API_URL</code> for a separately deployed backend, or use the local Vite proxy during development.
        </p>
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            🎭 <strong>Mock Mode:</strong> If no API key is set, the server returns clearly labeled mock responses so you can test the UI.
          </p>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card p-5 border-red-200 dark:border-red-900">
        <h3 className="font-semibold text-red-600 mb-3 flex items-center gap-2">
          <AlertTriangle size={16} /> Danger Zone
        </h3>
        <p className="text-sm text-gray-500 mb-3">Reset all data and restore the sample semester 5 setup.</p>
        <button
          onClick={() => setShowClearConfirm(true)}
          className="btn-danger"
        >
          <Trash2 size={15} /> Reset All Data
        </button>
      </div>

      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6 fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Reset All Data?</h3>
                <p className="text-xs text-gray-500 mt-0.5">This will delete ALL your questions, notes, and answers. This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={clearAllData} className="btn-danger flex-1">Yes, Reset</button>
              <button onClick={() => setShowClearConfirm(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
