import type { Metadata, Viewport } from 'next';
import { Bebas_Neue, Syne } from 'next/font/google';
import './globals.css';
import { ChatProvider } from '@/context/ChatContext';
import { GlobalChatDrawer } from '@/components/chat/GlobalChatDrawer';
import { FloatingChatButton } from '@/components/chat/FloatingChatButton';
import { ModelDownloadDialogWrapper } from '@/components/ModelDownloadDialogWrapper';

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['400', '600', '700', '800'],
  display: 'swap',
});

const bebas = Bebas_Neue({
  subsets: ['latin'],
  variable: '--font-bebas',
  weight: '400',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Score Counter',
  description: 'Track round-game scores with AI chat assistance',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#100c08',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${bebas.variable}`}>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <ChatProvider>
          {children}
          <GlobalChatDrawer />
          <FloatingChatButton />
          <ModelDownloadDialogWrapper />
        </ChatProvider>
      </body>
    </html>
  );
}
