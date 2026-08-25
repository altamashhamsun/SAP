import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAP - Full Stack App",
  description: "Full stack application with Next.js and Supabase",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}