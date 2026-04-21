import { Outlet } from 'react-router-dom';
import TopNavbar from '@/components/layout/TopNavbar';

export default function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col w-full">
      <TopNavbar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 max-w-[1920px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
