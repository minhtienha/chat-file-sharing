import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/navagation/SideBar';

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen((prev) => !prev)}
      />

      <main className="flex-1 flex overflow-hidden">
        <Outlet
          context={{ isSidebarOpen, openSidebar: () => setIsSidebarOpen(true) }}
        />
      </main>
    </div>
  );
};

export default MainLayout;
