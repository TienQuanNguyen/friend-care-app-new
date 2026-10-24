import { createContext } from 'react';
import type { PushState } from '../lib/webPushClient';

export interface WebPushContextValue extends PushState {
  requestPermissionAndSubscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  sendTest: () => Promise<void>;
}

export const WebPushContext = createContext<WebPushContextValue | null>(null);
