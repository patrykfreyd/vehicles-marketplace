import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ThemeProvider, Toaster } from '@vehicles-marketplace/ui-web';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vehicles Marketplace',
  description: 'Vehicles marketplace — buyer + seller web app.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: next-themes sets the `dark` class on <html>
    // before React hydrates (reading localStorage/system preference), so
    // the server-rendered class attribute legitimately differs from the
    // client's first paint — see next-themes' own docs on this exact line.
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
