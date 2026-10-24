import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import SemestersPage from './pages/Semesters';
import SubjectsPage from './pages/Subjects';
import QuestionsPage from './pages/Questions';
import NotesPage from './pages/Notes';
import AIAssistantPage from './pages/AIAssistant';
import RevisionPage from './pages/Revision';
import SettingsPage from './pages/Settings';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="semesters" element={<SemestersPage />} />
            <Route path="subjects" element={<SubjectsPage />} />
            <Route path="questions" element={<QuestionsPage />} />
            <Route path="notes" element={<NotesPage />} />
            <Route path="ai-assistant" element={<AIAssistantPage />} />
            <Route path="revision" element={<RevisionPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
