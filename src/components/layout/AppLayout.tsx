import React, { useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { useAuth } from '../../contexts/AuthContext';
import { useCareSpace } from '../../contexts/CareSpaceContext';
import { cn } from '../../lib/utils';
import { useActivityLog } from '../../hooks/useActivityLog';
import { MaintenanceLockScreen } from '../MaintenanceLockScreen';
import { MAINTENANCE_MODE } from '../../config/maintenance';
import { isAdminEmail } from '../../types';

/** Routes that should fill the viewport without the default padded container. */
const FULL_HEIGHT_ROUTES = ['/chat'];

export const AppLayout = () => {
  const { user, loading: authLoading } = useAuth();
  const { careSpace, loading: spaceLoading } = useCareSpace();
  const location = useLocation();
  const { log } = useActivityLog();

  const PAGE_LABELS: Record<string, string> = {
    '/': 'Dashboard',
    '/mood': 'Nhật ký cảm xúc',
    '/foods': 'Địa điểm ăn uống',
    '/schedules': 'Lịch trình',
    '/love-notes': 'Giữ ngọn lửa nhỏ',
    '/memories': 'Album kỷ niệm',
    '/settings': 'Cài đặt',
    '/chat': 'Chat',
  };

  useEffect(() => {
    if (!user || !careSpace) return;
    const label = PAGE_LABELS[location.pathname] ?? location.pathname;
    log('page_visit', label);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  if (authLoading || spaceLoading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-canvas">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (MAINTENANCE_MODE && !isAdminEmail(user.email)) {
    return <MaintenanceLockScreen />;
  }

  if (!careSpace) {
    return <Navigate to="/onboarding" replace />;
  }

  const isFullHeight = FULL_HEIGHT_ROUTES.some((r) => location.pathname.startsWith(r));

  return (
    // h-dvh = actual visible viewport height on iOS (excludes address bar)
    <div className="relative flex h-dvh overflow-hidden bg-canvas">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Ocean blue glow – top left */}
        <div className="absolute -left-20 -top-32 h-[32rem] w-[32rem] rounded-full bg-[#A8D9EE]/45 blur-3xl" />
        {/* Cactus green glow – bottom right */}
        <div className="absolute bottom-[-16rem] right-[-8rem] h-[30rem] w-[30rem] rounded-full bg-[#A8D5C0]/35 blur-3xl" />
        {/* Sand warm glow – center right subtle */}
        <div className="absolute right-[20%] top-[30%] h-[20rem] w-[20rem] rounded-full bg-[#EDD9B8]/20 blur-3xl" />
        <div className="ocean-dots absolute inset-y-0 right-0 w-[40%] opacity-40" />
      </div>
      <Sidebar />
      {!isFullHeight && <MobileNav />}
      <main
        className={cn('z-10 flex-1 overflow-hidden relative flex flex-col')}
        style={
          !isFullHeight
            ? {
                // Mobile: top padding = nav bar height (3.25rem) + gap (0.75rem each side = 1.5rem total) + safe-area-top
                // Desktop (md+): no top offset needed (sidebar is side-mounted)
                paddingTop: 'calc(3.25rem + 1.5rem + env(safe-area-inset-top, 0px))',
              }
            : undefined
        }
      >
        {/* Override for md+ screens: no top padding */}
        <style>{`@media (min-width: 768px) { main { padding-top: 0 !important; } }`}</style>
        {isFullHeight ? (
          // Full-height routes: no wrapper padding, no inner scroll
          <div className="flex-1 flex flex-col overflow-hidden">
            <Outlet />
          </div>
        ) : (
          // pt-20 accounts for the fixed MobileNav top bar
          // pb-safe-offset adds padding for iOS home indicator at bottom
          <div className="flex-1 overflow-y-auto pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-0">
            <div className="mx-auto max-w-6xl p-4 md:px-8 md:py-10 xl:px-12">
              <Outlet />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
