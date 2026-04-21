export async function sendTelegram(text: string, opts?: { disablePreview?: boolean }) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    return { ok: false, error: "telegram env vars missing" }
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: opts?.disablePreview ?? true,
      }),
      cache: "no-store",
    })
    if (!res.ok) {
      const body = await res.text()
      return { ok: false, error: `telegram ${res.status}: ${body.slice(0, 200)}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export function formatStrongAlpha(opts: {
  symbol: string | null
  name: string | null
  mint: string
  score: number
  reason: string
  liquidity_usd: number | null
  holders: number | null
  pct_1h: number | null
}) {
  const sym = opts.symbol || opts.name || opts.mint.slice(0, 6)
  const liq = opts.liquidity_usd ? `$${Math.round(opts.liquidity_usd).toLocaleString()}` : "—"
  const pct = opts.pct_1h == null ? "—" : `${opts.pct_1h > 0 ? "+" : ""}${opts.pct_1h.toFixed(1)}%`
  return [
    `<b>STRONG ALPHA</b> ${sym}`,
    `Score: <b>${opts.score.toFixed(1)}</b> — ${opts.reason}`,
    `Liquidity: ${liq}  Holders: ${opts.holders ?? "—"}  1h: ${pct}`,
    `<code>${opts.mint}</code>`,
    `https://dexscreener.com/solana/${opts.mint}`,
  ].join("\n")
}
