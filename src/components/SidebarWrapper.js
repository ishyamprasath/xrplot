'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import Sidebar from './Sidebar';

export default function SidebarWrapper({ children }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isLoaded, userId } = useAuth();

  const isAuthPage = pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up');
  const isChatPage = pathname?.startsWith('/chat');
  const isVoiceChatPage = pathname?.startsWith('/voice-chat');
  const isPublicPage = pathname === '/';
  const isWorldPage = pathname?.startsWith('/worlds/');
  const isWorldPreviewPage = pathname?.startsWith('/worlds/') && pathname?.includes('/preview');
  const isWorldFullscreen = isWorldPage && searchParams?.get('fullscreen') === '1';

  // Prevent flicker: if we are not on an auth page but the user is signed out,
  // we should show a loading state while the redirect happens.
  if (isLoaded && !userId && !isAuthPage && !isPublicPage) {
    return (
      <div className="chat-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  // Auth pages don't need sidebar or footer
  if (isAuthPage) {
    return <>{children}</>;
  }

  // Chat page has its own full layout (chat sidebar + mobile menu handled internally)
  if (isChatPage) {
    return <>{children}</>;
  }

  // Voice-chat page needs full layout with sidebar
  if (isVoiceChatPage) {
    return (
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">{children}</main>
      </div>
    );
  }

  if (isWorldFullscreen || isWorldPreviewPage) {
    return (
      <div className="app-layout fullscreen-mode">
        <main className="main-content">{children}</main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}
