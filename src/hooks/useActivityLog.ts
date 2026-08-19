import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCareSpace } from '../contexts/CareSpaceContext';
import { activityLogService, ActivityEventType } from '../services/activityLogService';

const ADMIN_EMAIL = 'tienquan0807@gmail.com';

/**
 * Hook that provides a `log` helper pre-filled with current user + care space.
 * Admin actions are never logged.
 */
export const useActivityLog = () => {
  const { user } = useAuth();
  const { careSpace } = useCareSpace();

  const log = useCallback(
    (eventType: ActivityEventType, label?: string) => {
      if (!user) return;
      // Skip logging admin's own actions
      if (user.email === ADMIN_EMAIL) return;
      void activityLogService.logEvent(
        careSpace?.id ?? null,
        user.id,
        eventType,
        label
      );
    },
    [user, careSpace]
  );

  return { log };
};
