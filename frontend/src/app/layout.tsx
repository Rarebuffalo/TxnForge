import type { Metadata } from "next";
import "./globals.css";

// SEO metadata for the application.
export const metadata: Metadata = {
  title: "TxnForge - Secure Transaction Extractor",
  description:
    "Multi-tenant transaction parser and ledger tool with workspace isolation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Google Fonts - Outfit for a clean modern feel */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="gradient-bg min-h-screen text-zinc-100 antialiased"
        style={{ fontFamily: "'Outfit', sans-serif" }}
      >
        <main className="relative flex min-h-screen flex-col">{children}</main>
      </body>
    </html>
  );
}
