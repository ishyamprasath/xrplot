import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import './globals.css';
import SidebarWrapper from '@/components/SidebarWrapper';

export const metadata = {
  title: 'XRPlot — 360° Virtual World Builder',
  description: 'Create immersive 360° virtual worlds from your photos. Upload room images, stitch panoramas with AI, and navigate connected spaces.',
  keywords: ['360', 'virtual tour', 'panorama', 'world builder', 'VR'],
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#7c3aed',
          colorBackground: '#0d0d1a',
          colorInputBackground: '#141428',
          colorInputText: '#f1f1f7',
          borderRadius: '12px',
        },
      }}
      signInForceRedirectUrl={true}
      signUpForceRedirectUrl={true}
      afterSignInUrl="/dashboard"
      afterSignUpUrl="/dashboard"
      signInMode="modal"
      signUpMode="modal"
    >
      <html lang="en">
        <body>
          <SidebarWrapper>
            {children}
          </SidebarWrapper>
        </body>
      </html>
    </ClerkProvider>
  );
}
