'use client';

import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header style={{padding: '1rem', borderBottom: '1px solid #eaeaea'}}>
          <nav style={{display: 'flex', gap: '1rem'}}>
            <Link href="/">Home</Link>
            <Link href="/about">About</Link>
            <Link href="/login" style={{cursor: 'pointer', color: 'blue', textDecoration: 'underline'}}>Login</Link>
          </nav>
        </header>
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
