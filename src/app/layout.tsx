import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QAC - Quality Assurance & Compliance",
  description: "Quality Assurance and Compliance Department - Audit Management System",
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