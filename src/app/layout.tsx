import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rainie Beauty | Front Desk",
  description: "AI-powered front desk assistant for Rainie Beauty salon",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
