import type { Metadata } from 'next';
import './globals.css';
import AppShell from '../components/AppShell';

export const metadata: Metadata = {
  title: 'Project Silver Phoenix',
  description: 'Persoonlijk portefeuille-dashboard voor goud- en zilvermijnaandelen',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
