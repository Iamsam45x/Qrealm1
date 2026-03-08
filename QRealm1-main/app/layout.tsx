import React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Cormorant_Garamond, Noto_Sans_Devanagari } from "next/font/google"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { AuthProvider } from "@/components/auth/auth-provider"

import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-cormorant",
})

const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600"],
  variable: "--font-devanagari",
})

export const metadata: Metadata = {
  title: "Battle of Interpretations – Tattva Vimarsha",
  description:
    "A high-intellectual philosophical debate platform blending ancient Vedantic wisdom with modern scientific discourse. Where interpretations shape civilizations.",
}

export const viewport: Viewport = {
  themeColor: "#111111",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable} ${devanagari.variable}`}>
      <body className="font-sans antialiased bg-[#111111] text-[hsl(36,10%,88%)]">
        <AuthProvider>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  )
}
