/**
 * Next.js Instrumentation
 * 
 * This file runs once when the server starts.
 * Used to initialize the cron scheduler for auto-processing bills.
 */

export async function register() {
  console.log('[INSTRUMENTATION] register() called');
  console.log('[INSTRUMENTATION] NEXT_RUNTIME:', process.env.NEXT_RUNTIME);
  console.log('[INSTRUMENTATION] NODE_ENV:', process.env.NODE_ENV);
  
  // Only run on the server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[INSTRUMENTATION] Loading cron scheduler...');
    const { startCronScheduler } = await import('./lib/cron-scheduler');
    startCronScheduler();
    console.log('[INSTRUMENTATION] Cron scheduler initialized');
  } else {
    console.log('[INSTRUMENTATION] Skipping cron (not nodejs runtime)');
  }
}
