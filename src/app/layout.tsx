import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voice Customer Service Agent",
  description: "AI-powered voice customer service agent",
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
