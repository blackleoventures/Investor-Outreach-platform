// instrumentation.ts
let schedulerInitialized = false;

export async function register() {
  // Prevent multiple initializations
  if (schedulerInitialized) {
    console.log('[Instrumentation] Scheduler already initialized, skipping');
    return;
  }

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const isVercel = process.env.VERCEL === '1';
    
    if (isVercel) {
      console.log('[Instrumentation] Vercel environment detected');
      console.log('[Instrumentation] Cron jobs will be managed by Vercel Cron system');
      console.log('[Instrumentation] Jobs configured in vercel.json');
      schedulerInitialized = true;
      return;
    }
    
    console.log('[Instrumentation] Local development environment detected');
    console.log('[Instrumentation] Initializing node-cron scheduler');
    
    const { startAutoCronScheduler } = await import("@/lib/cron/auto-cron-scheduler");
    startAutoCronScheduler();
    
    schedulerInitialized = true;
    console.log('[Instrumentation] Node-cron scheduler initialized successfully');
  }
}
