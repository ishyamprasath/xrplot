import './globals.css';
import ClerkThemeProvider from '@/components/ClerkThemeProvider';
import SidebarWrapper from '@/components/SidebarWrapper';

export const metadata = {
  title: 'XRPlot',
  description: 'Create immersive 360° virtual worlds from your photos. Upload room images, stitch panoramas with AI, and navigate connected spaces.',
  keywords: ['360', 'virtual tour', 'panorama', 'world builder', 'VR'],
};

export default function RootLayout({ children }) {
  return (
    <ClerkThemeProvider>
      <html lang="en">
        <body>
          <SidebarWrapper>
            {children}
          </SidebarWrapper>
        </body>
      </html>
    </ClerkThemeProvider>
  );
}
