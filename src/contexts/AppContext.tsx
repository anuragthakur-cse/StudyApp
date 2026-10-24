import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { db, seedSampleData, Semester, Subject, Unit } from '../db/database';

interface AppContextType {
  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Navigation state
  activeSemesterId: number | null;
  setActiveSemesterId: (id: number | null) => void;
  activeSubjectId: number | null;
  setActiveSubjectId: (id: number | null) => void;
  activeUnitId: number | null;
  setActiveUnitId: (id: number | null) => void;
  activeQuestionId: number | null;
  setActiveQuestionId: (id: number | null) => void;

  // Sidebar
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;

  // Quick access data
  semesters: Semester[];
  setSemesters: React.Dispatch<React.SetStateAction<Semester[]>>;
  activeSubjects: Subject[];
  setActiveSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;

  // Loading
  isLoading: boolean;

  // Refresh trigger
  refreshTrigger: number;
  triggerRefresh: () => void;

  // Last visited
  lastVisited: { semesterId?: number; subjectId?: number; unitId?: number; questionId?: number };
  setLastVisited: (v: { semesterId?: number; subjectId?: number; unitId?: number; questionId?: number }) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeSemesterId, setActiveSemesterId] = useState<number | null>(null);
  const [activeSubjectId, setActiveSubjectId] = useState<number | null>(null);
  const [activeUnitId, setActiveUnitId] = useState<number | null>(null);
  const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [activeSubjects, setActiveSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lastVisited, setLastVisited] = useState<AppContextType['lastVisited']>({});

  const triggerRefresh = () => setRefreshTrigger(t => t + 1);

  useEffect(() => {
    async function init() {
      try {
        await seedSampleData();

        const allSemesters = await db.semesters.orderBy('number').toArray();
        setSemesters(allSemesters);

        // Restore theme
        const themeSetting = await db.settings.where('key').equals('theme').first();
        if (themeSetting) {
          const t = themeSetting.value as 'light' | 'dark';
          setTheme(t);
          document.documentElement.classList.toggle('dark', t === 'dark');
        }

        // Restore active semester
        const semSetting = await db.settings.where('key').equals('activeSemesterId').first();
        if (semSetting && semSetting.value) {
          const semId = parseInt(semSetting.value);
          setActiveSemesterId(semId);
          const subs = await db.subjects.where('semesterId').equals(semId).toArray();
          setActiveSubjects(subs);
        } else if (allSemesters.length > 0) {
          const firstSem = allSemesters[0];
          setActiveSemesterId(firstSem.id!);
          const subs = await db.subjects.where('semesterId').equals(firstSem.id!).toArray();
          setActiveSubjects(subs);
        }
      } catch (err) {
        console.error('DB init error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // Load subjects when active semester changes
  useEffect(() => {
    if (activeSemesterId) {
      db.subjects.where('semesterId').equals(activeSemesterId).toArray().then(subs => {
        setActiveSubjects(subs);
      });
    }
  }, [activeSemesterId, refreshTrigger]);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    const setting = await db.settings.where('key').equals('theme').first();
    if (setting?.id) {
      await db.settings.update(setting.id, { value: newTheme });
    }
  };

  const handleSetActiveSemesterId = async (id: number | null) => {
    setActiveSemesterId(id);
    setActiveSubjectId(null);
    setActiveUnitId(null);
    setActiveQuestionId(null);
    if (id) {
      const setting = await db.settings.where('key').equals('activeSemesterId').first();
      if (setting?.id) {
        await db.settings.update(setting.id, { value: String(id) });
      }
      const subs = await db.subjects.where('semesterId').equals(id).toArray();
      setActiveSubjects(subs);
    }
  };

  return (
    <AppContext.Provider value={{
      theme,
      toggleTheme,
      activeSemesterId,
      setActiveSemesterId: handleSetActiveSemesterId,
      activeSubjectId,
      setActiveSubjectId,
      activeUnitId,
      setActiveUnitId,
      activeQuestionId,
      setActiveQuestionId,
      sidebarCollapsed,
      setSidebarCollapsed,
      semesters,
      setSemesters,
      activeSubjects,
      setActiveSubjects,
      isLoading,
      refreshTrigger,
      triggerRefresh,
      lastVisited,
      setLastVisited,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
