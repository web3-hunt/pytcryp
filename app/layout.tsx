import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "sonner"
import "./globals.css"
import { AppShell } from "@/components/app-shell"

const _geist = Geist({ subsets: ["latin"], variable: "--font-geist" })
const _geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })
const _jetMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jet" })

export const metadata: Metadata = {
  title: "Alpha Scanner — Solana Launches",
  description: "Realtime Solana launch intelligence: DNA classification, wallet forensics, predictions.",
  generator: "v0.app",
}

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark bg-background">
      <body className="font-sans antialiased">
        <AppShell>{children}</AppShell>
        <Toaster theme="dark" position="top-right" />
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
