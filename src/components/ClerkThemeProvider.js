'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useEffect, useState } from 'react';

export default function ClerkThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const html = document.documentElement;
    const observer = new MutationObserver(() => {
      const current = html.getAttribute('data-theme') || 'dark';
      setTheme(current);
    });
    observer.observe(html, { attributes: true, attributeFilter: ['data-theme'] });
    setTheme(html.getAttribute('data-theme') || 'dark');
    return () => observer.disconnect();
  }, []);

  const isDark = theme === 'dark';

  return (
    <ClerkProvider
      appearance={{
        baseTheme: isDark ? dark : undefined,
        variables: {
          colorPrimary: '#7c3aed',
          colorBackground: isDark ? '#0d0d1a' : '#ffffff',
          colorInputBackground: isDark ? '#141428' : '#f4f4f7',
          colorInputText: isDark ? '#f1f1f7' : '#0f172a',
          borderRadius: '12px',
        },
      }}
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
      afterSignOutUrl="/sign-in"
    >
      {children}
    </ClerkProvider>
  );
}
