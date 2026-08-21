import './globals.css';
import { Suspense } from 'react';
import ClerkThemeProvider from '@/components/ClerkThemeProvider';
import SidebarWrapper from '@/components/SidebarWrapper';

export const metadata = {
  title: 'TerraPlot — Earth Lens 2036 | AI 4 Earth Hackathon',
  description: '🌍 See your street in a +2°C world. XRPlot Earth Lens uses GEE satellites (NDVI/NDBI/LST), Gemini AI & 360° panoramas to visualize dystopia vs regenerative future for any location on Earth.',
  keywords: ['AI 4 Earth', 'climate', 'NDVI', 'heat island', 'hackathon', 'earth engine', '360 panorama', 'gemini', 'sustainability', 'miyawaki'],
};

export default function RootLayout({ children }) {
  return (
    <ClerkThemeProvider>
      <html lang="en">
        <body>
          <Suspense fallback={null}>
            <SidebarWrapper>
              {children}
            </SidebarWrapper>
          </Suspense>
        </body>
      </html>
    </ClerkThemeProvider>
  );
}
