import type { Metadata } from "next";
import "./globals.css";

// Configure page metadata for SEO best practices.
export const metadata: Metadata = {
  title: "Vessify Transaction Extractor - Personal Finance Isolation",
  description: "Secure, fee-only, multi-tenant transaction parse and save ledger tool.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Import premium font Outfit or Inter from Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <style>{`
          body {
            font-family: 'Outfit', sans-serif;
          }
        `}</style>
      </head>
      <body className="gradient-bg min-h-screen text-foreground antialiased selection:bg-primary/20">
        <main className="relative flex min-h-screen flex-col overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
