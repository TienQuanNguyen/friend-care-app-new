import { createContext } from 'react';
import { StreakStatus } from '../types';

export interface StreakContextValue {
  status: StreakStatus;
  loading: boolean;
  refresh: () => Promise<void>;
}

export const StreakContext = createContext<StreakContextValue | undefined>(undefined);
