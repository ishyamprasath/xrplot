'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import Sidebar from './Sidebar';

export default function SidebarWrapper({ children }) {
  const pathname = usePathname();
  const { isLoaded, userId } = useAuth();
  
  const isAuthPage = pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up');
  const isChatPage = pathname?.startsWith('/chat');
  const isPublicPage = pathname === '/';

  // Prevent flicker: if we are not on an auth page but the user is signed out,
  // we should show a loading state while the redirect happens.
  if (isLoaded && !userId && !isAuthPage && !isPublicPage) {
    return (
      <div className="chat-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  if (isAuthPage || isChatPage) {
    return <>{children}</>;
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}
