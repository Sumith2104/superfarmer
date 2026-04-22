// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import VoiceAssistant from '@/components/VoiceAssistant';

export const metadata: Metadata = {
  title: 'SuperFarmer — AI Agricultural Intelligence',
  description: 'AI-powered crop recommendations, disease diagnosis, and farming intelligence for Indian farmers.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SuperFarmer',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#060d08',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main>{children}</main>
        <BottomNav />
        <VoiceAssistant />
      </body>
    </html>
  );
}
