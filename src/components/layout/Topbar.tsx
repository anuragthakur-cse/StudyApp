import { Menu, Sun, Moon, Search, Plus } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useNavigate } from 'react-router-dom';

interface TopbarProps {
  onMobileMenuOpen: () => void;
  title?: string;
}

export default function Topbar({ onMobileMenuOpen, title }: TopbarProps) {
  const { theme, toggleTheme, semesters, activeSemesterId, setActiveSemesterId } = useApp();
  const navigate = useNavigate();

  return (
    <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3 px-4 flex-shrink-0">
      {/* Mobile menu button */}
      <button
        onClick={onMobileMenuOpen}
        className="lg:hidden p-1.5 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
      >
        <Menu size={20} />
      </button>

      {/* Title */}
      <div className="flex-1">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {title || 'StudyVault AI'}
        </h2>
      </div>

      {/* Semester selector */}
      <div className="hidden sm:flex items-center gap-2">
        <label className="text-xs text-gray-500 dark:text-gray-400">Semester:</label>
        <select
          value={activeSemesterId || ''}
          onChange={e => setActiveSemesterId(Number(e.target.value) || null)}
          className="text-xs border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {semesters.map(sem => (
            <option key={sem.id} value={sem.id}>{sem.name}</option>
          ))}
        </select>
      </div>

      {/* Search */}
      <button
        onClick={() => navigate('/questions?search=1')}
        className="btn-ghost text-gray-500"
        title="Global Search"
      >
        <Search size={16} />
        <span className="hidden md:inline text-xs">Search</span>
      </button>

      {/* Quick add question */}
      <button
        onClick={() => navigate('/questions?new=1')}
        className="btn-primary text-xs py-1.5"
        title="Add Question"
      >
        <Plus size={14} />
        <span className="hidden sm:inline">Add Question</span>
      </button>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
      </button>
    </header>
  );
}
