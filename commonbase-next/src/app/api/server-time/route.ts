import { NextResponse } from 'next/server'

export async function GET() {
  const now = new Date()

  // Force recompilation
  return NextResponse.json({
    serverTime: now.toISOString(),
    serverTimeMs: now.getTime(),
    serverLocal: now.toLocaleString(),
    serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    nodeEnv: process.env.NODE_ENV,
    dateNow: Date.now(),
    actualCurrentTime: new Date(Date.now()).toISOString(),
    processEnvTZ: process.env.TZ || 'undefined',
    comparison: {
      'new Date()': now.toISOString(),
      'new Date(Date.now())': new Date(Date.now()).toISOString(),
      'Date.now()': Date.now(),
      difference_ms: Date.now() - now.getTime()
    }
  })
}