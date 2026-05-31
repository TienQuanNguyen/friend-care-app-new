import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { useAuth } from '../../contexts/AuthContext';
import { useCareSpace } from '../../contexts/CareSpaceContext';
import { AnnouncementModal } from '../AnnouncementModal';

export const AppLayout = () => {
  const { user, loading: authLoading } = useAuth();
  const { careSpace, loading: spaceLoading } = useCareSpace();

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

  return (
    <div className="flex h-screen bg-canvas overflow-hidden">
      <Sidebar />
      <MobileNav />
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0 pb-24 md:pb-0 relative">
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
      <AnnouncementModal />
    </div>
  );
};

