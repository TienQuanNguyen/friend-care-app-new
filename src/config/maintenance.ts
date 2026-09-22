/**
 * Maintenance mode is intentionally on by default.
 * Set VITE_MAINTENANCE_MODE=false and redeploy to restore the application.
 */
export const MAINTENANCE_MODE = import.meta.env.VITE_MAINTENANCE_MODE !== 'false';
