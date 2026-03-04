import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HorizonteAg | Dashboard',
  description: 'Dashboard Estratégico para Gestión de Recría',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${dmSans.className} bg-background text-foreground antialiased`}>
        {children}
      </body>
    </html>
  );
}
