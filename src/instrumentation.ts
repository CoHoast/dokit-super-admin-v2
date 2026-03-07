/**
 * Next.js Instrumentation
 * 
 * This file runs once when the server starts.
 * Used to initialize the cron scheduler for auto-processing bills.
 */

export async function register() {
  // Only run on the server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startCronScheduler } = await import('./lib/cron-scheduler');
    startCronScheduler();
  }
}
