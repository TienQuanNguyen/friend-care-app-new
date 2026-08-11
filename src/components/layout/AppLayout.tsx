import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { useAuth } from '../../contexts/AuthContext';
import { useCareSpace } from '../../contexts/CareSpaceContext';

/** Routes that should fill the viewport without the default padded container. */
const FULL_HEIGHT_ROUTES = ['/chat'];

export const AppLayout = () => {
  const { user, loading: authLoading } = useAuth();
  const { careSpace, loading: spaceLoading } = useCareSpace();
  const location = useLocation();

  if (authLoading || spaceLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-canvas">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!careSpace) {
    return <Navigate to="/onboarding" replace />;
  }

  const isFullHeight = FULL_HEIGHT_ROUTES.some((r) => location.pathname.startsWith(r));

  return (
    <div className="flex h-screen bg-canvas overflow-hidden">
      <Sidebar />
      <MobileNav />
      <main className="flex-1 overflow-hidden pt-16 md:pt-0 relative flex flex-col">
        {isFullHeight ? (
          // Full-height routes: no wrapper padding, no inner scroll
          <div className="flex-1 flex flex-col overflow-hidden">
            <Outlet />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pb-24 md:pb-0">
            <div className="max-w-4xl mx-auto p-4 md:p-8">
              <Outlet />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
