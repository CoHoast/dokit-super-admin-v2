/**
 * Internal Cron Scheduler for Bill Negotiator Auto-Processing
 * 
 * Runs inside the Next.js app on Railway — no external service needed.
 * Processes new bills and counter responses every 5 minutes.
 */

import cron from 'node-cron';

let isSchedulerRunning = false;

// Process bills function (calls our API internally)
async function runAutoProcessor() {
  const startTime = Date.now();
  console.log(`[CRON] Running auto-processor at ${new Date().toISOString()}`);
  
  try {
    // Use internal fetch to our own API
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    process.env.RAILWAY_PUBLIC_DOMAIN ? 
                    `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 
                    'http://localhost:3000';
    
    const response = await fetch(
      `${baseUrl}/api/bill-negotiator/auto-process?secret=dokit-auto-process-2026&action=process_all`,
      { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    const result = await response.json();
    const duration = Date.now() - startTime;
    
    if (result.success) {
      if (result.processed > 0 || result.errors?.length > 0) {
        console.log(`[CRON] Completed in ${duration}ms: ${result.processed} processed, ${result.errors?.length || 0} errors`);
        if (result.errors?.length > 0) {
          console.log(`[CRON] Errors:`, result.errors);
        }
      }
      // Silent if nothing to process
    } else {
      console.error(`[CRON] Failed:`, result.error);
    }
  } catch (error) {
    console.error(`[CRON] Error running auto-processor:`, error);
  }
}

/**
 * Start the cron scheduler
 * Should be called once on app startup
 */
export function startCronScheduler() {
  if (isSchedulerRunning) {
    console.log('[CRON] Scheduler already running');
    return;
  }
  
  // Only run in production or if explicitly enabled
  const shouldRun = process.env.NODE_ENV === 'production' || 
                    process.env.ENABLE_CRON === 'true';
  
  if (!shouldRun) {
    console.log('[CRON] Scheduler disabled in development (set ENABLE_CRON=true to enable)');
    return;
  }
  
  console.log('[CRON] Starting Bill Negotiator auto-processor scheduler');
  
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    runAutoProcessor();
  });
  
  isSchedulerRunning = true;
  console.log('[CRON] Scheduler started — running every 5 minutes');
  
  // Run once immediately on startup (after 10 second delay to let app initialize)
  setTimeout(() => {
    console.log('[CRON] Running initial processor check...');
    runAutoProcessor();
  }, 10000);
}

/**
 * Check if scheduler is running
 */
export function isCronRunning(): boolean {
  return isSchedulerRunning;
}
