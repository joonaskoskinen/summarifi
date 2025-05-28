import type React from "react"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Summari - Älykkäät yhteenvedot suomeksi",
  description: "Muuta pitkät tekstit toimintasuunnitelmiksi AI:n avulla",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fi">
      <body>{children}</body>
    </html>
  )
}
