import { useContext } from 'react';
import { StreakContext } from '../contexts/streakContextValue';

export const useStreak = () => {
  const context = useContext(StreakContext);
  if (!context) {
    throw new Error('useStreak must be used within a StreakProvider');
  }
  return context;
};
