import { NextResponse } from 'next/server'

// Container / compose healthcheck target. Returns 200 with a zero-dependency
// payload so the frontend image can be liveness-checked without touching the
// backend or any external service.
export function GET() {
  return NextResponse.json({ success: true, data: { status: 'ok' } })
}