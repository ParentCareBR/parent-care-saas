import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Parent Care — Admin Panel',
  description: 'Painel de Gestão e CRM Parent Care',
};

export const dynamic = 'force-dynamic';

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full dark">
      <body className={`${inter.className} h-full bg-[#060d1a] text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
