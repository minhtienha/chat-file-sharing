import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/navigation/SideBar';
import BottomNav from '../components/navigation/BottomNav';

const KEYBOARD_THRESHOLD = 80;

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [viewportHeight, setViewportHeight] = useState(() => window.innerHeight);
  const [viewportOffset, setViewportOffset] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // Xử lý đồng bộ chiều cao layout để input không bị che bởi bàn phím ảo trên mobile
  useEffect(() => {
    const updateViewport = () => {
      const visual = window.visualViewport;
      const height = visual?.height ?? window.innerHeight;
      const offsetTop = visual?.offsetTop ?? 0;
      
      setViewportHeight(height);
      setViewportOffset(offsetTop);
      setIsKeyboardOpen(window.innerHeight - height > KEYBOARD_THRESHOLD);
    };

    updateViewport();
    window.visualViewport?.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);

    return () => {
      window.visualViewport?.removeEventListener('resize', updateViewport);
      window.visualViewport?.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
    };
  }, []);

  return (
    <div
      className="flex flex-col w-full bg-slate-50 overflow-hidden"
      style={{
        height: viewportHeight,
        transform: viewportOffset ? `translateY(${viewportOffset}px)` : undefined,
      }}
    >
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        {/* Sidebar chỉ hiện trên Desktop (lg) */}
        <Sidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen((prev) => !prev)}
        />

        {/* Khu vực nội dung chính */}
        <main className="flex-1 flex min-w-0 overflow-hidden">
          <Outlet />
        </main>
      </div>

      {/* Bottom bar chỉ hiện trên Mobile/Tablet (< lg); ẩn khi bàn phím mở */}
      <BottomNav hidden={isKeyboardOpen} />
    </div>
  );
};

export default MainLayout;
