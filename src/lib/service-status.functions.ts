import { createServerFn } from '@tanstack/react-start';
export const getServiceStatus = createServerFn({ method: 'GET' }).handler(async () => {
  const { readServiceStatus } = await import('./service-status.server');
  return readServiceStatus(process.env['SUPABASE_URL'] ?? process.env['VITE_SUPABASE_URL'], process.env['SUPABASE_PUBLISHABLE_KEY'] ?? process.env['VITE_SUPABASE_PUBLISHABLE_KEY']);
});