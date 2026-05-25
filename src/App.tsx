import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CareSpaceProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="mood" element={<MoodJournal />} />
              <Route path="foods" element={<FoodPlaces />} />
              <Route path="schedules" element={<Schedules />} />
              <Route path="love-notes" element={<LoveNotes />} />
              <Route path="memories" element={<Memories />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </CareSpaceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
