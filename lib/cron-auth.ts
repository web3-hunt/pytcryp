import { NextResponse } from "next/server"

// Accepts either Vercel Cron's automatic header or a shared CRON_SECRET.
export function verifyCron(req: Request): NextResponse | null {
  // Vercel Cron invocations include a specific user-agent and secret header.
  const secret = process.env.CRON_SECRET
  const authHeader = req.headers.get("authorization") || ""
  const providedSecret = authHeader.replace(/^Bearer\s+/i, "")
  const urlSecret = new URL(req.url).searchParams.get("secret")

  // In production, Vercel sets x-vercel-cron=1 automatically for scheduled invocations.
  const isVercelCron =
    req.headers.get("x-vercel-cron") === "1" ||
    req.headers.get("user-agent")?.includes("vercel-cron")

  if (isVercelCron) return null
  if (secret && (providedSecret === secret || urlSecret === secret)) return null

  return NextResponse.json({ error: "unauthorized" }, { status: 401 })
}
