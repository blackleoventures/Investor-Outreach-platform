// lib/cron/auth.ts
import { NextRequest, NextResponse } from "next/server";

export function verifyCronRequest(request: NextRequest): { authorized: boolean; source: string; error?: string } {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    console.error('[Cron Auth] CRITICAL: CRON_SECRET not configured in environment');
    return {
      authorized: false,
      source: 'unknown',
      error: 'Server configuration error',
    };
  }

  const isVercelCron = request.headers.get("user-agent")?.includes("vercel-cron");
  const cronSource = request.headers.get("x-cron-source");
  const hasValidAuth = authHeader === `Bearer ${cronSecret}`;

  if (isVercelCron && hasValidAuth) {
    console.log('[Cron Auth] Request authorized: Vercel Cron Job');
    return {
      authorized: true,
      source: 'vercel-cron',
    };
  }

  if (cronSource === 'node-cron-local' && hasValidAuth) {
    console.log('[Cron Auth] Request authorized: Local node-cron');
    return {
      authorized: true,
      source: 'node-cron-local',
    };
  }

  if (hasValidAuth) {
    console.log('[Cron Auth] Request authorized: Valid secret provided');
    return {
      authorized: true,
      source: 'manual-with-secret',
    };
  }

  console.warn('[Cron Auth] Unauthorized request attempt');
  console.warn('[Cron Auth] User-Agent:', request.headers.get("user-agent"));
  console.warn('[Cron Auth] Has Auth Header:', !!authHeader);
  
  return {
    authorized: false,
    source: 'unauthorized',
    error: 'Invalid or missing authentication credentials',
  };
}

export function createCronErrorResponse(error: string): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error,
      timestamp: new Date().toISOString(),
    },
    { status: 401 }
  );
}
