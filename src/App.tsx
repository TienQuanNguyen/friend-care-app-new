import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CareSpaceProvider } from './contexts/CareSpaceContext';
import { AppLayout } from './components/layout/AppLayout';

import { Auth } from './pages/Auth';
import { Onboarding } from './pages/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { MoodJournal } from './pages/MoodJournal';
import { FoodPlaces } from './pages/FoodPlaces';
import { Schedules } from './pages/Schedules';
import { LoveNotes } from './pages/LoveNotes';
import { Memories } from './pages/Memories';
import { Settings } from './pages/Settings';
import { UpdatePassword } from './pages/UpdatePassword';
import { SpotifyCallback } from './pages/SpotifyCallback';
import { AnnouncementModal } from './components/AnnouncementModal';
import { ChatRoom } from './components/chat/ChatRoom';
import { StreakProvider } from './contexts/StreakContext';
import { MAINTENANCE_MODE } from './config/maintenance';
import { useAuth } from './contexts/AuthContext';
import { isAdminEmail } from './types';

const AdminAccessDuringMaintenance: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  if (MAINTENANCE_MODE && !isAdminEmail(user?.email)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const MaintenanceAwareAnnouncement = () => {
  const { user } = useAuth();

  if (MAINTENANCE_MODE && !isAdminEmail(user?.email)) {
    return null;
  }

  return <AnnouncementModal />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CareSpaceProvider>
          <StreakProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/onboarding"
                element={(
                  <AdminAccessDuringMaintenance>
                    <Onboarding />
                  </AdminAccessDuringMaintenance>
                )}
              />
              <Route path="/update-password" element={<UpdatePassword />} />
              <Route
                path="/spotify/callback"
                element={(
                  <AdminAccessDuringMaintenance>
                    <SpotifyCallback />
                  </AdminAccessDuringMaintenance>
                )}
              />

              <Route path="/" element={<AppLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="mood" element={<MoodJournal />} />
                <Route path="foods" element={<FoodPlaces />} />
                <Route path="schedules" element={<Schedules />} />
                <Route path="love-notes" element={<LoveNotes />} />
                <Route path="memories" element={<Memories />} />
                <Route path="settings" element={<Settings />} />
                <Route path="chat" element={<ChatRoom />} />
              </Route>
            </Routes>
            <MaintenanceAwareAnnouncement />
          </StreakProvider>
        </CareSpaceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
