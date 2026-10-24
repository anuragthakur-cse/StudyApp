import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useApp } from '../../contexts/AppContext';

export default function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { sidebarCollapsed } = useApp();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar onMobileMenuOpen={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-auto">
          <div className="h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
