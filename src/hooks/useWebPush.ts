import { useContext } from 'react';
import { WebPushContext } from '../contexts/WebPushContext';

export function useWebPush() {
  const context = useContext(WebPushContext);
  if (!context) throw new Error('useWebPush must be used within WebPushProvider');
  return context;
}
