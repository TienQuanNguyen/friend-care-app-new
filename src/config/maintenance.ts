/**
 * The application is open by default.
 * Set VITE_MAINTENANCE_MODE=true and redeploy whenever the lock screen is needed.
 */
export const MAINTENANCE_MODE = import.meta.env.VITE_MAINTENANCE_MODE === 'true';
