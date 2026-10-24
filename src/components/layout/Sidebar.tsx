import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  BookMarked,
  HelpCircle,
  FileText,
  Bot,
  Star,
  Settings,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Menu,
  X,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/semesters', label: 'My Semesters', icon: GraduationCap },
  { path: '/subjects', label: 'All Subjects', icon: BookOpen },
  { path: '/questions', label: 'Important Questions', icon: HelpCircle },
  { path: '/notes', label: 'My Notes', icon: FileText },
  { path: '/ai-assistant', label: 'AI Study Assistant', icon: Bot },
  { path: '/revision', label: 'Revision / Favorites', icon: Star },
  { path: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

export default function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarCollapsed, setSidebarCollapsed, semesters, activeSemesterId } = useApp();

  const activeSemester = semesters.find(s => s.id === activeSemesterId);

  const handleNav = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-50 sidebar flex flex-col transition-all duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
          ${sidebarCollapsed ? 'w-16' : 'w-64'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <BookMarked size={16} className="text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-white text-sm font-bold truncate">StudyVault AI</h1>
                <p className="text-blue-300 text-xs truncate">
                  {activeSemester ? activeSemester.name : 'Notebook'}
                </p>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mx-auto">
              <BookMarked size={16} className="text-white" />
            </div>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1 text-gray-400 hover:text-white"
            >
              <X size={16} />
            </button>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                className={`sidebar-link w-full ${isActive ? 'active' : ''} ${
                  sidebarCollapsed ? 'justify-center px-2' : ''
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        {!sidebarCollapsed && (
          <div className="px-4 py-3 border-t border-white/10">
            <p className="text-xs text-blue-300/60 text-center">
              RGPV CSE • StudyVault AI
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
