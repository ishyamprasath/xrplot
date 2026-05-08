'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function SidebarWrapper({ children }) {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up');
  const isChatPage = pathname?.startsWith('/chat');

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
